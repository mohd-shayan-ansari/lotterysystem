(function(global) {
    const SUPABASE_URL = 'https://cdjhnkpzyefdsslbtnof.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_Z6-LzeuJcuuL7MvFZCzUJg_mcXOiT_T';
    
    // Create Supabase client
    const supabase = global.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    const SHARED_KEYS = new Set([
        'lotteryResults',
        'lotteryConfirmedResults',
        'lotteryAdminPassword',
    ]);
    const SHARED_PREFIXES = [];

    let initialized = false;
    let hooksInstalled = false;
    let originalSetItem = null;
    let originalRemoveItem = null;

    function isSharedKey(key) {
        if (SHARED_KEYS.has(key)) return true;
        return SHARED_PREFIXES.some(prefix => key.startsWith(prefix));
    }

    async function sendSet(key, value) {
        try {
            const { error } = await supabase
                .from('shared_state')
                .upsert({ key, value, updated_at: new Date().toISOString() });
            if (error) console.warn('Supabase set error:', error);
        } catch (e) {
            console.warn('Supabase set exception:', e);
        }
    }

    async function sendDelete(key) {
        try {
            const { error } = await supabase
                .from('shared_state')
                .delete()
                .eq('key', key);
            if (error) console.warn('Supabase delete error:', error);
        } catch (e) {
            console.warn('Supabase delete exception:', e);
        }
    }

    function installHooks() {
        if (hooksInstalled) return;
        
        originalSetItem = localStorage.setItem.bind(localStorage);
        originalRemoveItem = localStorage.removeItem.bind(localStorage);

        localStorage.setItem = function patchedSetItem(key, value) {
            originalSetItem(key, value);
            if (!initialized || !isSharedKey(key)) return;
            void sendSet(key, String(value));
        };

        localStorage.removeItem = function patchedRemoveItem(key) {
            originalRemoveItem(key);
            if (!initialized || !isSharedKey(key)) return;
            void sendDelete(key);
        };
        hooksInstalled = true;
    }

    async function preloadFromServer() {
        const { data, error } = await supabase
            .from('shared_state')
            .select('key, value');
        
        if (error) {
            throw new Error(error.message);
        }
        
        if (data) {
            data.forEach(row => {
                if (isSharedKey(row.key)) {
                    originalSetItem(row.key, row.value);
                }
            });
        }
    }

    function subscribeToRealtime() {
        supabase
            .channel('shared_state_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_state' }, payload => {
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    const row = payload.new;
                    if (isSharedKey(row.key)) {
                        originalSetItem(row.key, row.value);
                    }
                } else if (payload.eventType === 'DELETE') {
                    const row = payload.old;
                    if (isSharedKey(row.key)) {
                        originalRemoveItem(row.key);
                    }
                }
                
                // Trigger view update in frontend to reflect the newly received data
                if (typeof window.filterResults === 'function') {
                    window.filterResults();
                }
            })
            .subscribe((status) => {
                console.log('Supabase realtime status:', status);
            });
    }

    async function init() {
        if (initialized) return;
        
        installHooks();

        try {
            await preloadFromServer();
            console.log('Supabase state sync: Initial preload complete');
            
            // Subscribe to real-time changes
            subscribeToRealtime();
        } catch (error) {
            console.warn('Supabase preload failed:', error);
        }

        initialized = true;
    }

    global.SharedStateSync = {
        init,
    };
})(window);