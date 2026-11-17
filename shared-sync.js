(function(global) {
    // Supabase configuration - Add your project details when rehosting
    const SUPABASE_URL = 'https://tvvctmtwrszckdyshwio.supabase.co';
    const SUPABASE_KEY = '';

    // Create Supabase client only if configured
    const supabase = (global.supabase && SUPABASE_URL && SUPABASE_KEY)
        ? global.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
        : null;

    // Keep shared sync limited to true shared settings only.
    // Lottery results now live in Supabase rows and should not be mirrored through localStorage hooks.
    const SHARED_KEYS = new Set([]);
    const SHARED_PREFIXES = [];

    let initialized = false;
    let hooksInstalled = false;
    let originalSetItem = null;
    let originalRemoveItem = null;

    // Keep track of the current valid admin password to authorize RPC calls
    let currentAuthPassword = 'matka123ratan'; // default fallback

    function isSharedKey(key) {
        if (SHARED_KEYS.has(key)) return true;
        return SHARED_PREFIXES.some(prefix => key.startsWith(prefix));
    }

    async function sendSet(key, value) {
        if (!supabase) return;
        try {
            const { error } = await supabase.rpc('update_state', {
                p_key: key,
                p_value: value,
                p_password: currentAuthPassword
            });

            if (error) {
                console.warn('Supabase set error (RLS/Auth):', error.message);
                // Silently fail for viewers who are correctly blocked by the database
            } else {
                if (key === 'lotteryAdminPassword') {
                    currentAuthPassword = value;
                }
            }
        } catch (e) {
            console.warn('Supabase set exception:', e);
        }
    }

    async function sendDelete(key) {
        if (!supabase) return;
        try {
            const { error } = await supabase.rpc('delete_state', {
                p_key: key,
                p_password: currentAuthPassword
            });

            if (error) {
                console.warn('Supabase delete error:', error);
            }
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
        if (!supabase) return;
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
                    if (row.key === 'lotteryAdminPassword') {
                        currentAuthPassword = row.value;
                    }
                }
            });
        }
    }

    function subscribeToRealtime() {
        if (!supabase) return;
        // Subscribe to shared_state changes
        supabase
            .channel('shared_state_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_state' }, payload => {
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    const row = payload.new;
                    if (isSharedKey(row.key)) {
                        originalSetItem(row.key, row.value);
                        if (row.key === 'lotteryAdminPassword') {
                            currentAuthPassword = row.value;
                        }
                    }
                } else if (payload.eventType === 'DELETE') {
                    const row = payload.old;
                    if (isSharedKey(row.key)) {
                        originalRemoveItem(row.key);
                    }
                }

                // Trigger view update in frontend to reflect the newly received data
                if (typeof window.reloadSharedData === 'function') {
                    window.reloadSharedData();
                }
            })
            .subscribe((status) => {
                console.log('Supabase shared_state realtime status:', status);
            });

        // Subscribe to lottery_results changes
        supabase
            .channel('lottery_results_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'lottery_results' }, payload => {
                // Trigger view update when lottery results change
                if (typeof window.reloadLotteryResults === 'function') {
                    window.reloadLotteryResults();
                }
            })
            .subscribe((status) => {
                console.log('Supabase lottery_results realtime status:', status);
            });
    }

    async function init() {
        if (initialized) return;

        // Temporarily intercept before preloading to catch initial password if present
        const savedPass = localStorage.getItem('lotteryAdminPassword');
        if (savedPass) {
            currentAuthPassword = savedPass;
        }

        installHooks();

        if (supabase) {
            try {
                await preloadFromServer();
                console.log('Supabase state sync: Initial preload complete');

                // Subscribe to real-time changes
                subscribeToRealtime();
            } catch (error) {
                console.warn('Supabase preload failed:', error);
            }
        }

        initialized = true;
    }

    global.SharedStateSync = {
        init,
    };
})(window);