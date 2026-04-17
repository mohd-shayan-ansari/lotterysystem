(function(global) {
    const SHARED_KEYS = new Set([
        'lotteryResults',
        'lotteryConfirmedResults',
        'lotteryRecordUsers',
    ]);

    const SHARED_PREFIXES = ['lotteryRecordData_'];
    const API_BASE = 'https://lottery-backend-0myl.onrender.com/api/state';

    let initialized = false;
    let hooksInstalled = false;
    let originalSetItem = null;
    let originalRemoveItem = null;

    function isSharedKey(key) {
        if (SHARED_KEYS.has(key)) {
            return true;
        }

        return SHARED_PREFIXES.some((prefix) => key.startsWith(prefix));
    }

    async function sendSet(key, value) {
        try {
            await fetch(`${API_BASE}/${encodeURIComponent(key)}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ value }),
            });
        } catch (error) {
            console.warn('Shared sync set failed for key:', key, error);
        }
    }

    async function sendDelete(key) {
        try {
            await fetch(`${API_BASE}/${encodeURIComponent(key)}`, {
                method: 'DELETE',
            });
        } catch (error) {
            console.warn('Shared sync delete failed for key:', key, error);
        }
    }

    function installHooks() {
        if (hooksInstalled) {
            return;
        }

        originalSetItem = localStorage.setItem.bind(localStorage);
        originalRemoveItem = localStorage.removeItem.bind(localStorage);

        localStorage.setItem = function patchedSetItem(key, value) {
            originalSetItem(key, value);

            if (!initialized || !isSharedKey(key)) {
                return;
            }

            void sendSet(key, String(value));
        };

        localStorage.removeItem = function patchedRemoveItem(key) {
            originalRemoveItem(key);

            if (!initialized || !isSharedKey(key)) {
                return;
            }

            void sendDelete(key);
        };

        hooksInstalled = true;
    }

    async function preloadFromServer() {
        const response = await fetch(API_BASE, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`Shared state preload failed (${response.status})`);
        }

        const state = await response.json();

        Object.entries(state).forEach(([key, value]) => {
            if (typeof value === 'string' && isSharedKey(key)) {
                originalSetItem(key, value);
            }
        });
    }

    async function init() {
        if (initialized) {
            return;
        }

        installHooks();

        try {
            await preloadFromServer();
        } catch (error) {
            console.warn('Shared sync preload skipped:', error);
        }

        initialized = true;
    }

    global.SharedStateSync = {
        init,
    };
})(window);