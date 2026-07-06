// ================================
// MOCK DATA - Sample Winning Numbers
// ================================

const mockData = {
    "2026-04-14": {
        "09:00": "45",
        "09:20": "23",
        "09:40": "78",
        "10:00": "12",
        "10:20": "89",
        "10:40": "56",
        "11:00": "34",
        "11:20": "67",
        "11:40": "01",
        "12:00": "98",
        "12:20": "34",
        "12:40": "12",
        "13:00": "67",
        "13:20": "89",
        "13:40": "23",
        "14:00": "45",
        "14:20": "78",
        "14:40": "56",
    },
    "2026-04-15": {
        "09:00": "56",
        "09:20": "78",
        "09:40": "34",
        "10:00": "12",
        "10:20": "67",
        "10:40": "89",
        "11:00": "45",
        "11:20": "23",
        "11:40": "19",
        "12:00": "91",
        "12:20": "23",
        "12:40": "67",
        "13:00": "89",
        "13:20": "45",
        "13:40": "78",
        "14:00": "34",
        "14:20": "12",
        "14:40": "56",
    },
};

// ================================
// TIME SLOTS CONFIGURATION
// ================================

const TIME_SLOTS = generateTimeSlots();

function generateTimeSlots() {
    const slots = [];
    const endMinutes = 21 * 60;
    let currentMinutes = 9 * 60;

    while (currentMinutes <= endMinutes) {
        const hour = Math.floor(currentMinutes / 60);
        const minute = currentMinutes % 60;
        const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        slots.push(timeStr);

        currentMinutes += 30;
    }

    return slots;
}

// Helper function to generate deterministic number based on date and time
function generateSeededNumber(date, time) {
    // Create a seed from date string (YYYY-MM-DD) and time string (HH:MM)
    const seedStr = (date || '2026-01-01').replace(/-/g, '') + (time || '00:00').replace(/:/g, '');
    let seed = parseInt(seedStr);

    // Simple Linear Congruential Generator
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    seed = (seed * 1664525 + 1013904223) % 4294967296; // Second pass for better distribution

    const result = seed % 100;
    return String(result).padStart(2, '0');
}

function generateRandomNumber() {
    // Deprecated, but keeping for compatibility if needed elsewhere
    return String(Math.floor(Math.random() * 100)).padStart(2, '0');
}

function loadConfirmedNumbers() {
    const stored = localStorage.getItem('lotteryConfirmedResults');
    return stored ? JSON.parse(stored) : {};
}

function getAdminPassword() {
    if (window.SharedStateSync && typeof window.SharedStateSync.getPassword === 'function') {
        const syncPwd = window.SharedStateSync.getPassword();
        if (syncPwd) return syncPwd;
    }
    const stored = localStorage.getItem('lotteryAdminPassword');
    return stored && stored.trim() ? stored : '';
}

function setAdminPassword(password) {
    localStorage.setItem('lotteryAdminPassword', password);
}

let isAdminAuthenticated = false;

// Day visibility cache (stores which dates have results visible)
let dayVisibilityCache = {}; // Format: { 'YYYY-MM-DD': true/false }

// ================================
// DATABASE FUNCTIONS (SUPABASE)
// ================================

let supabaseClient = null;
let lotteryResultsCache = {}; // Cache for lottery results
// Supabase REST fallback config (used when client/session has auth issues)
const SUPABASE_REST_URL = 'https://trgbzycoifdprfixkgai.supabase.co/rest/v1';
const SUPABASE_PROJECT_URL = 'https://trgbzycoifdprfixkgai.supabase.co';
const SUPABASE_PUBLIC_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyZ2J6eWNvaWZkcHJmaXhrZ2FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNTQ2MDUsImV4cCI6MjA5ODkzMDYwNX0.8XyK0pOkvNrF216kLgUPg1_5ejkQzx1fXyJatARLG-A';
// Inline editing state for admin table cells
const inlineEditState = {}; // key => { isEditing, currentValue, originalValue }

// Initialize Supabase client
function initSupabaseClient() {
    if (supabaseClient) return;

    // Check if Supabase was loaded by shared-sync.js
    if (window.supabase) {
        const SUPABASE_URL = 'https://trgbzycoifdprfixkgai.supabase.co';
        const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyZ2J6eWNvaWZkcHJmaXhrZ2FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNTQ2MDUsImV4cCI6MjA5ODkzMDYwNX0.8XyK0pOkvNrF216kLgUPg1_5ejkQzx1fXyJatARLG-A';
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
}

// Fetch all lottery results from database
async function fetchLotteryResultsFromDB() {
    try {
        initSupabaseClient();

        // Prefer supabase-js client when available
        if (supabaseClient) {
            try {
                const { data, error } = await supabaseClient
                    .from('lottery_results')
                    .select('date,time,andar,result,bahar,is_confirmed,is_day_visible');

                if (error) {
                    console.warn('supabase-js select error, falling back to REST:', error.message || error);
                } else if (data) {
                    const cache = {};
                    const visibility = {};
                    data.forEach(row => {
                        if (!cache[row.date]) cache[row.date] = {};
                        cache[row.date][row.time] = {
                            andar: row.andar,
                            result: row.result,
                            bahar: row.bahar,
                            is_confirmed: row.is_confirmed,
                            is_day_visible: row.is_day_visible !== false
                        };
                        visibility[row.date] = row.is_day_visible !== false;
                    });
                    lotteryResultsCache = cache;
                    dayVisibilityCache = visibility;
                    return cache;
                }
            } catch (e) {
                console.warn('supabase-js fetch failed, will try REST fallback', e);
            }
        }

        // Fallback: call Supabase REST endpoint directly with public key headers to avoid 401
        try {
            const url = `${SUPABASE_REST_URL}/lottery_results?select=date,time,andar,result,bahar,is_confirmed,is_day_visible`;
            const res = await fetch(url, {
                headers: {
                    'apikey': SUPABASE_PUBLIC_KEY,
                    'Authorization': `Bearer ${SUPABASE_PUBLIC_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!res.ok) {
                console.error('REST fetch failed', res.status, await res.text());
                return lotteryResultsCache;
            }

            const data = await res.json();
            const cache = {};
            const visibility = {};
            data.forEach(row => {
                if (!cache[row.date]) cache[row.date] = {};
                cache[row.date][row.time] = {
                    andar: row.andar,
                    result: row.result,
                    bahar: row.bahar,
                    is_confirmed: row.is_confirmed,
                    is_day_visible: row.is_day_visible !== false
                };
                visibility[row.date] = row.is_day_visible !== false;
            });
            lotteryResultsCache = cache;
            dayVisibilityCache = visibility;
            return cache;
        } catch (e) {
            console.error('REST fetch exception:', e);
            return lotteryResultsCache;
        }
    } catch (e) {
        console.error('Exception fetching results:', e);
        return lotteryResultsCache;
    }
}

// Auto-generate and save results for a date if not exists
async function autoGenerateResultsForDate(date) {
    try {
        initSupabaseClient();
        if (!supabaseClient) return;

        // Check if any results exist for this date
        const { data, error } = await supabaseClient
            .from('lottery_results')
            .select('date')
            .eq('date', date)
            .limit(1);

        if (error) {
            console.error('Error checking date:', error);
            return;
        }

        // If results exist, don't regenerate
        if (data && data.length > 0) {
            return;
        }

        // Generate each slot via the secure RPC so it bypasses row-level insert restrictions.
        const adminPassword = getAdminPassword();
        for (const time of TIME_SLOTS) {
            const resultNum = generateSeededNumber(date, time);
            const { error: rpcError } = await supabaseClient.rpc('update_lottery_result', {
                p_date: date,
                p_time: time,
                p_andar: resultNum.charAt(0),
                p_result: resultNum,
                p_bahar: resultNum.charAt(1),
                p_password: adminPassword,
            });

            if (rpcError) {
                console.error('Error auto-generating slot:', date, time, rpcError);
                return;
            }
        }

        console.log(`✅ Auto-generated results for ${date}`);
        await fetchLotteryResultsFromDB();
    } catch (e) {
        console.error('Exception auto-generating:', e);
    }
}

// Auto-generate results for today and next 7 days on first load
async function autoGenerateInitialResults() {
    try {
        const today = getLocalDateKey();

        // Generate for today + next 7 days
        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            const dateKey = getLocalDateKey(date);
            await autoGenerateResultsForDate(dateKey);
        }

        console.log('✅ Initial results generation complete');
    } catch (e) {
        console.error('Exception in auto-generation:', e);
    }
}

// Update a lottery result via RPC (admin only)
async function updateLotteryResultInDB(date, time, andar, result, bahar) {
    try {
        initSupabaseClient();
        if (!supabaseClient) {
            console.error('Supabase not initialized');
            return false;
        }

        const adminPassword = getAdminPassword();

        const { error } = await supabaseClient.rpc('update_lottery_result', {
            p_date: date,
            p_time: time,
            p_andar: andar,
            p_result: result,
            p_bahar: bahar,
            p_password: adminPassword
        });

        if (error) {
            alert('Error updating result: ' + error.message);
            console.error('RPC error:', error);
            return false;
        }

        // Update local cache
        if (!lotteryResultsCache[date]) {
            lotteryResultsCache[date] = {};
        }
        lotteryResultsCache[date][time] = {
            andar,
            result,
            bahar,
            is_confirmed: true,
            is_day_visible: dayVisibilityCache[date] !== false
        };

        console.log(`✅ Updated result for ${date} ${time}: ${result}`);
        return true;
    } catch (e) {
        console.error('Exception updating result:', e);
        return false;
    }
}

// Fetch day visibility status from database
async function fetchDayVisibilityFromDB() {
    try {
        initSupabaseClient();

        if (supabaseClient) {
            try {
                const { data, error } = await supabaseClient
                    .from('lottery_results')
                    .select('date,is_day_visible')
                    .neq('is_day_visible', null);

                if (error) {
                    console.warn('Error fetching visibility:', error.message);
                } else if (data) {
                    const visibility = {};
                    data.forEach(row => {
                        visibility[row.date] = row.is_day_visible !== false;
                    });
                    dayVisibilityCache = visibility;
                    return visibility;
                }
            } catch (e) {
                console.warn('Fetch visibility failed:', e);
            }
        }
        return dayVisibilityCache;
    } catch (e) {
        console.error('Exception fetching visibility:', e);
        return dayVisibilityCache;
    }
}

// Toggle day visibility via RPC
async function toggleDayVisibility() {
    try {
        initSupabaseClient();
        if (!supabaseClient) {
            alert('Supabase not initialized');
            return false;
        }

        const selectedDate = getSelectedAdminDate();
        if (!selectedDate) {
            alert('Please select a date first');
            return false;
        }

        const adminPassword = getAdminPassword();
        const currentVisibility = dayVisibilityCache[selectedDate] !== false;
        const newVisibility = !currentVisibility;

        const { error } = await supabaseClient.rpc('set_day_visibility', {
            p_date: selectedDate,
            p_is_visible: newVisibility,
            p_password: adminPassword
        });

        if (error) {
            alert('Error toggling visibility: ' + error.message);
            console.error('RPC error:', error);
            return false;
        }

        // Update local cache
        dayVisibilityCache[selectedDate] = newVisibility;
        if (lotteryResultsCache[selectedDate]) {
            Object.keys(lotteryResultsCache[selectedDate]).forEach((time) => {
                lotteryResultsCache[selectedDate][time].is_day_visible = newVisibility;
            });
        }
        updateVisibilityButtonUI(selectedDate);
        if (typeof filterResults === 'function') {
            filterResults();
        }
        if (typeof populateStoredDataPreview === 'function') {
            populateStoredDataPreview();
        }
        console.log(`✅ Day ${selectedDate} visibility set to: ${newVisibility}`);
        return true;
    } catch (e) {
        console.error('Exception toggling visibility:', e);
        alert('Error: ' + e.message);
        return false;
    }
}

// Update visibility button UI based on current state
function updateVisibilityButtonUI(date) {
    const btn = document.getElementById('dayVisibilityToggle');
    if (!btn) return;

    const isVisible = dayVisibilityCache[date] !== false;
    btn.textContent = isVisible ? '🟢 ON' : '🔴 OFF';
    btn.style.backgroundColor = isVisible ? '#57e06d' : '#d35858';
}

// Initialize/update visibility for a selected admin date
async function updateVisibilityUIForDate(date) {
    // If not in cache yet, load from DB
    if (!(date in dayVisibilityCache)) {
        await fetchDayVisibilityFromDB();
    }
    updateVisibilityButtonUI(date);
}

// Initialize today's date with random numbers for all time slots
function initializeDateWithRandomNumbers(dataStore, date) {
    if (!dataStore[date]) {
        dataStore[date] = {};
    }

    TIME_SLOTS.forEach((time) => {
        const existing = getStoredNumber(dataStore, date, time);
        const key = `${date}|${time}`;

        // If this slot is already confirmed by an admin, we MUST NOT overwrite it.
        if (confirmedNumbers[key] === true) {
            return;
        }

        // Generate the deterministic seeded value for this slot.
        const seededValue = generateSeededNumber(date, time);

        // If the current value is already the seeded value, no need to update.
        if (existing && existing.result === seededValue) {
            return;
        }

        // Otherwise, force the seeded value to ensure all sites are consistent.
        dataStore[date][time] = {
            andar: seededValue.charAt(0),
            result: seededValue,
            bahar: seededValue.charAt(1),
        };
    });
}

function hasSlotPassed(date, time) {
    const now = new Date();
    const todayStr = getLocalDateKey(now);

    if (date < todayStr) {
        return true;
    }

    if (date > todayStr) {
        return false;
    }

    const [hours, minutes] = time.split(':').map(Number);
    const slotDateTime = new Date(now);
    slotDateTime.setHours(hours, minutes, 0, 0);

    return slotDateTime <= now;
}

function formatDateDisplay(dateString) {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}

function formatTimeDisplay(time24) {
    const [hourStr, minuteStr] = time24.split(':');
    let hour = Number(hourStr);
    const minute = minuteStr;
    const ampm = hour >= 12 ? 'PM' : 'AM';

    hour = hour % 12;
    if (hour === 0) {
        hour = 12;
    }

    return `${String(hour).padStart(2, '0')}:${minute} ${ampm}`;
}

function getLocalDateKey(date = new Date()) {
    // Force IST (Asia/Kolkata) to ensure consistency across different sites/timezones
    try {
        const istDateStr = date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
        const istDate = new Date(istDateStr);
        const year = istDate.getFullYear();
        const month = String(istDate.getMonth() + 1).padStart(2, '0');
        const day = String(istDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) {
        // Fallback if Intl/timezone is not supported (unlikely in modern browsers)
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}

function parseDateKey(dateKey) {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, month - 1, day);
}

function applyTodayDateDefaults() {
    const startInput = document.getElementById('startDate');
    const endInput = document.getElementById('endDate');
    if (!startInput || !endInput) {
        return '';
    }

    const today = getLocalDateKey();
    if (!startInput.value) {
        startInput.value = today;
    }
    if (!endInput.value) {
        endInput.value = today;
    }

    return today;
}

function getNextUpcomingTimeForDate(date) {
    const todayStr = getLocalDateKey();
    if (date > todayStr) {
        return TIME_SLOTS[0] || '';
    }

    const now = new Date();
    for (const time of TIME_SLOTS) {
        if (date < todayStr) {
            return time;
        }

        const [hours, minutes] = time.split(':').map(Number);
        const slotDateTime = new Date(now);
        slotDateTime.setHours(hours, minutes, 0, 0);
        if (slotDateTime > now) {
            return time;
        }
    }

    return TIME_SLOTS[TIME_SLOTS.length - 1] || '';
}

function syncAdminTimeToDate() {
    const dateInput = document.getElementById('adminDate');
    const timeInput = document.getElementById('adminTime');
    if (!dateInput || !timeInput) {
        return;
    }

    const date = dateInput.value;
    if (!date) {
        timeInput.value = '';
        return;
    }

    timeInput.value = getNextUpcomingTimeForDate(date);
}

function handleAdminDateChange() {
    const selectedDate = getSelectedAdminDate();
    updateVisibilityUIForDate(selectedDate);
    populateStoredDataPreview();
}

function getStoredNumber(dataStore, date, time) {
    // First try database cache
    if (lotteryResultsCache[date] && lotteryResultsCache[date][time]) {
        const cached = lotteryResultsCache[date][time];
        return {
            andar: cached.andar || '--',
            result: cached.result || '--',
            bahar: cached.bahar || '--',
            is_day_visible: cached.is_day_visible !== false,
        };
    }

    // Fallback to passed dataStore
    if (!dataStore[date] || !dataStore[date][time]) {
        return null;
    }

    const slotValue = dataStore[date][time];
    if (typeof slotValue === 'string') {
        return {
            andar: '--',
            result: slotValue,
            bahar: '--',
            is_day_visible: dayVisibilityCache[date] !== false,
        };
    }

    return {
        andar: slotValue.andar || '--',
        result: slotValue.result || '--',
        bahar: slotValue.bahar || '--',
        is_day_visible: slotValue.is_day_visible !== false,
    };
}

function autoConfirmPassedSlots() {
    let hasChanges = false;
    const allData = lotteryData.getAll();

    Object.entries(allData).forEach(([date, timeSlots]) => {
        Object.entries(timeSlots).forEach(([time, slotValue]) => {
            const slot = typeof slotValue === 'string' ? { andar: '--', result: slotValue, bahar: '--' } : {
                andar: slotValue.andar || '--',
                result: slotValue.result || '--',
                bahar: slotValue.bahar || '--',
            };

            if (slot.andar === '--' && slot.result === '--' && slot.bahar === '--') {
                return;
            }

            const key = `${date}|${time}`;
            if (hasSlotPassed(date, time) && confirmedNumbers[key] !== true) {
                confirmedNumbers[key] = true;
                hasChanges = true;
            }
        });
    });

    if (hasChanges) {
        saveConfirmedNumbers();
    }

    return hasChanges;
}

function updateAdminEditLock(date, time) {
    const resultInput = document.getElementById('result');
    if (!resultInput) {
        return;
    }

    const isLocked = Boolean(date && time && hasSlotPassed(date, time));
    resultInput.disabled = false;
    if (isLocked) {
        resultInput.title = 'Past slot is locked but editable by admin';
    } else {
        resultInput.title = '';
    }
}



function toggleAdminMenu() {
    const dropdown = document.getElementById('adminMenuDropdown');
    if (!dropdown) {
        return;
    }
    dropdown.classList.toggle('active');
}

function closeAdminMenu() {
    const dropdown = document.getElementById('adminMenuDropdown');
    if (!dropdown) {
        return;
    }
    dropdown.classList.remove('active');
}

function toggleAdminPasswordSection() {
    const section = document.getElementById('adminPasswordSection');
    if (!section) {
        return;
    }

    section.classList.toggle('hidden');

    if (!section.classList.contains('hidden')) {
        const currentPasswordInput = document.getElementById('currentAdminPasswordInput');
        if (currentPasswordInput) {
            currentPasswordInput.focus();
        }
    }
}

function resetAdminPasswordForm() {
    const section = document.getElementById('adminPasswordSection');
    const currentInput = document.getElementById('currentAdminPasswordInput');
    const newInput = document.getElementById('newAdminPasswordInput');
    const confirmInput = document.getElementById('confirmAdminPasswordInput');

    if (section) {
        section.classList.add('hidden');
    }
    if (currentInput) currentInput.value = '';
    if (newInput) newInput.value = '';
    if (confirmInput) confirmInput.value = '';
}

function updateAdminPassword() {
    const currentInput = document.getElementById('currentAdminPasswordInput');
    const newInput = document.getElementById('newAdminPasswordInput');
    const confirmInput = document.getElementById('confirmAdminPasswordInput');

    if (!currentInput || !newInput || !confirmInput) {
        return;
    }

    const currentPassword = currentInput.value.trim();
    const newPassword = newInput.value.trim();
    const confirmPassword = confirmInput.value.trim();

    if (currentPassword !== getAdminPassword()) {
        alert('Current password is incorrect.');
        currentInput.focus();
        currentInput.select();
        return;
    }

    if (newPassword.length < 4 || newPassword.length > 30) {
        alert('New password must be between 4 and 30 characters.');
        newInput.focus();
        return;
    }

    if (newPassword !== confirmPassword) {
        alert('New password and confirm password do not match.');
        confirmInput.focus();
        return;
    }

    if (newPassword === currentPassword) {
        alert('New password must be different from current password.');
        newInput.focus();
        return;
    }

    setAdminPassword(newPassword);
    alert('Admin password updated successfully.');
    resetAdminPasswordForm();
}

// ================================
// DATA MANAGEMENT
// ================================

class LotteryData {
    constructor() {
        this.loadFromStorage();
    }

    loadFromStorage() {
        const stored = localStorage.getItem('lotteryResults');
        this.data = stored ? JSON.parse(stored) : {...mockData };
    }

    ensureDate(date) {
        // Ensure the date object exists
        if (!this.data[date]) {
            this.data[date] = {};
        }

        let changed = false;
        TIME_SLOTS.forEach((time) => {
            const key = `${date}|${time}`;
            // Preserve admin-confirmed results
            if (confirmedNumbers[key] === true) {
                return;
            }
            // If slot is missing, generate a seeded value and store it
            if (!this.data[date][time]) {
                const seededValue = generateSeededNumber(date, time);
                this.data[date][time] = {
                    andar: seededValue.charAt(0),
                    result: seededValue,
                    bahar: seededValue.charAt(1),
                };
                changed = true;
            }
        });

        if (changed) {
            // Persist the entire data object to localStorage, which will sync via shared-sync to Supabase
            this.saveToStorage();
        }
    }

    ensureDateRange(startDate, endDate) {
        const start = parseDateKey(startDate);
        const end = parseDateKey(endDate);
        const current = new Date(start);
        const todayStr = getLocalDateKey();

        while (current <= end) {
            const dateStr = getLocalDateKey(current);
            if (dateStr <= todayStr) {
                this.ensureDate(dateStr);
            }
            current.setDate(current.getDate() + 1);
        }

        this.saveToStorage();
    }

    saveToStorage() {
        localStorage.setItem('lotteryResults', JSON.stringify(this.data));
    }

    getAll() {
        return this.data;
    }

    getByDateRange(startDate, endDate) {
        const results = [];
        const start = parseDateKey(startDate);
        const end = parseDateKey(endDate);

        const current = new Date(start);
        while (current <= end) {
            const date = getLocalDateKey(current);
            TIME_SLOTS.forEach((time) => {
                const isUpcoming = !hasSlotPassed(date, time);
                const storedSlot = getStoredNumber(this.data, date, time);
                const andarToShow = isUpcoming ? 'Pending' : ((storedSlot && storedSlot.andar) || '--');
                const resultToShow = isUpcoming ? 'Pending' : ((storedSlot && storedSlot.result) || '--');
                const baharToShow = isUpcoming ? 'Pending' : ((storedSlot && storedSlot.bahar) || '--');

                results.push({
                    date,
                    time,
                    andar: andarToShow,
                    result: resultToShow,
                    bahar: baharToShow,
                    isUpcoming,
                    is_day_visible: (storedSlot && storedSlot.is_day_visible !== false) && dayVisibilityCache[date] !== false,
                });
            });
            current.setDate(current.getDate() + 1);
        }

        return results.sort((a, b) => {
            const dateCompare = a.date.localeCompare(b.date);
            if (dateCompare !== 0) return dateCompare;
            return a.time.localeCompare(b.time);
        });
    }

    saveResult(date, time, slotData) {
        if (!this.data[date]) {
            this.data[date] = {};
        }

        const existing = getStoredNumber(this.data, date, time) || {
            andar: '--',
            result: '--',
            bahar: '--',
        };

        this.data[date][time] = {
            andar: slotData.andar || existing.andar || '--',
            result: slotData.result || existing.result || '--',
            bahar: slotData.bahar || existing.bahar || '--',
        };
        confirmedNumbers[`${date}|${time}`] = true;
        saveConfirmedNumbers();
        this.saveToStorage();
    }

    getResult(date, time) {
        return getStoredNumber(this.data, date, time);
    }

    deleteResult(date, time) {
        if (this.data[date]) {
            delete this.data[date][time];
            if (Object.keys(this.data[date]).length === 0) {
                delete this.data[date];
            }
            this.saveToStorage();
        }
    }

    getAllDates() {
        return Object.keys(this.data).sort();
    }
}

const lotteryData = new LotteryData();

// Separate storage for confirmed vs pending
let confirmedNumbers = loadConfirmedNumbers();

window.reloadSharedData = function() {
    lotteryData.loadFromStorage();
    confirmedNumbers = loadConfirmedNumbers();
    if (typeof filterResults === 'function') {
        filterResults();
    }
    if (typeof populateStoredDataPreview === 'function') {
        populateStoredDataPreview();
    }
};
// ================================
// TABLE RENDERING
// ================================

function renderTable(results) {
    const tbody = document.getElementById('resultsTable');
    tbody.innerHTML = '';

    // Filter out results from hidden days
    const visibleResults = results.filter(result => {
        return result.is_day_visible !== false;
    });

    if (visibleResults.length === 0) {
        tbody.innerHTML = '<tr class="table-row-odd"><td colspan="4" style="text-align: center; padding: 20px;">No results found for the selected date range.</td></tr>';
        return;
    }

    visibleResults.forEach((result, index) => {
        const row = document.createElement('tr');
        const rowClass = index % 2 === 0 ? 'table-row-odd' : 'table-row-even';

        const timeCell = document.createElement('td');
        timeCell.setAttribute('data-label', 'Time');
        timeCell.textContent = formatTimeDisplay(result.time);
        timeCell.className = 'table-cell-date-time';
        row.appendChild(timeCell);

        const andarCell = document.createElement('td');
        andarCell.setAttribute('data-label', 'Andar');
        andarCell.textContent = result.andar;
        row.appendChild(andarCell);

        const numberCell = document.createElement('td');
        numberCell.setAttribute('data-label', 'Result');
        numberCell.textContent = result.result;

        const baharCell = document.createElement('td');
        baharCell.setAttribute('data-label', 'Bahar');
        baharCell.textContent = result.bahar;

        if (result.isUpcoming) {
            andarCell.className = 'table-cell-pending';
            numberCell.className = 'table-cell-pending';
            baharCell.className = 'table-cell-pending';
            numberCell.title = 'Upcoming result slot';
        } else {
            andarCell.className = 'table-cell-andar-bahar';
            numberCell.className = 'table-cell-result';
            baharCell.className = 'table-cell-andar-bahar';
        }
        row.appendChild(numberCell);
        row.appendChild(baharCell);

        row.className = rowClass;
        tbody.appendChild(row);
    });
}

// ================================
// FILTERING LOGIC
// ================================

function filterResults() {
    applyTodayDateDefaults();

    let startDate = document.getElementById('startDate').value;
    let endDate = document.getElementById('endDate').value;

    if (!startDate || !endDate) {
        const today = getLocalDateKey();
        if (!startDate) {
            startDate = today;
            document.getElementById('startDate').value = today;
        }
        if (!endDate) {
            endDate = today;
            document.getElementById('endDate').value = today;
        }
    }

    if (startDate > endDate) {
        alert('Start Date cannot be after End Date');
        return;
    }

    lotteryData.ensureDateRange(startDate, endDate);

    const results = lotteryData.getByDateRange(startDate, endDate);
    renderTable(results);

    const titleElem = document.getElementById('resultsTableTitle');
    if (titleElem) {
        const fmt = (d) => { const p = d.split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d; };
        titleElem.textContent = startDate === endDate ? fmt(startDate) : `${fmt(startDate)} to ${fmt(endDate)}`;
    }
}

function resetFilter() {
    const today = getLocalDateKey();
    document.getElementById('startDate').value = today;
    document.getElementById('endDate').value = today;
    filterResults();
}

// ================================
// ADMIN PANEL FUNCTIONS
// ================================

function toggleAdminPanel() {
    const modal = document.getElementById('adminModal');
    if (!modal) {
        console.error('Admin modal element not found!');
        return;
    }

    const isOpening = !modal.classList.contains('active');
    if (isOpening && !requestAdminAccess()) {
        return;
    }

    modal.classList.toggle('active');
    if (modal.classList.contains('active')) {
        resetAdminPasswordForm();
        closeAdminMenu();
        setDefaultAdminDate();
        populateStoredDataPreview();
    } else {
        isAdminAuthenticated = false;
        window.isAdminAuthenticated = false;
    }
}

function requestAdminAccess() {
    if (isAdminAuthenticated) {
        return true;
    }

    openAdminAuthModal();
    return false;
}

function openAdminAuthModal() {
    if (isAdminAuthenticated) {
        toggleAdminPanel();
        return;
    }

    const authModal = document.getElementById('adminAuthModal');
    const passwordInput = document.getElementById('adminPasswordInput');
    if (!authModal || !passwordInput) {
        return;
    }

    passwordInput.value = '';
    authModal.classList.add('active');
    setTimeout(() => passwordInput.focus(), 0);
}

function closeAdminAuthModal() {
    const authModal = document.getElementById('adminAuthModal');
    if (!authModal) {
        return;
    }
    authModal.classList.remove('active');
}

function submitAdminPassword(event) {
    if (event) {
        event.preventDefault();
    }

    const passwordInput = document.getElementById('adminPasswordInput');
    if (!passwordInput) {
        return;
    }

    const enteredPassword = passwordInput.value;
    if (enteredPassword !== getAdminPassword()) {
        alert('Incorrect code.');
        passwordInput.focus();
        passwordInput.select();
        return;
    }

    isAdminAuthenticated = true;
    window.isAdminAuthenticated = true;
    closeAdminAuthModal();
    toggleAdminPanel();
}

function updateRealTimeClock() {
    const dateElement = document.getElementById('liveDate');
    const timeElement = document.getElementById('liveTime');
    if (!dateElement || !timeElement) {
        return;
    }

    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();

    let hour = now.getHours();
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    const ampm = hour >= 12 ? 'PM' : 'AM';

    hour = hour % 12;
    if (hour === 0) {
        hour = 12;
    }

    const dateText = `${day}/${month}/${year}`;
    const timeText = `${String(hour).padStart(2, '0')}:${minute}:${second} ${ampm}`;

    dateElement.textContent = dateText;
    timeElement.textContent = timeText;
}

function setDefaultAdminDate() {
    const today = getLocalDateKey();
    const dateInput = document.getElementById('adminDate');
    if (dateInput) {
        dateInput.value = today;
    }
}

function saveAdminData() {
    alert('Use the stored data table below to edit and save results slot-by-slot.');
}

function getSelectedAdminDate() {
    const dateInput = document.getElementById('adminDate');
    return dateInput ? dateInput.value : '';
}

function ensureDateHasRandomSlots(date) {
    if (!date) {
        return;
    }

    lotteryData.ensureDate(date);
    const allData = lotteryData.getAll();
    if (!allData[date]) {
        allData[date] = {};
    }

    let changed = false;
    TIME_SLOTS.forEach((time) => {
        const existing = getStoredNumber(allData, date, time);
        const key = `${date}|${time}`;

        // Preserve admin-confirmed results
        if (confirmedNumbers[key] === true) {
            return;
        }

        const seededValue = generateSeededNumber(date, time);
        if (existing && existing.result === seededValue) {
            return;
        }

        allData[date][time] = {
            andar: seededValue.charAt(0),
            result: seededValue,
            bahar: seededValue.charAt(1),
        };
        changed = true;
    });

    if (changed && window.isAdminAuthenticated) {
        lotteryData.saveToStorage();
    }
}

function saveInlineAdminResult(date, time, inputId) {
    console.log('saveInlineAdminResult called', date, time, inputId);
    if (hasSlotPassed(date, time)) {
        alert('This timeslot is locked after its scheduled time.');
        return;
    }

    const input = document.getElementById(inputId);
    let resultValue = '';
    if (input) {
        resultValue = String(input.value || '');
    } else {
        const display = document.getElementById(`display_${inputId}`);
        if (display) {
            resultValue = String(display.textContent || '');
        } else {
            console.warn('No input or display found for', inputId);
            return;
        }
    }

    resultValue = resultValue.trim();
    if (!/^[0-9]{1,2}$/.test(resultValue)) {
        alert('Enter exactly 1 or 2 digits from 0 to 99.');
        if (input) input.focus();
        return;
    }
    // Normalize to two digits
    if (resultValue.length === 1) resultValue = '0' + resultValue;

    // Save to database via RPC
    updateLotteryResultInDB(date, time, resultValue.charAt(0), resultValue, resultValue.charAt(1))
        .then(success => {
            if (success) {
                // Also keep localStorage in sync for backward compatibility
                lotteryData.saveResult(date, time, {
                    andar: resultValue.charAt(0),
                    result: resultValue,
                    bahar: resultValue.charAt(1),
                });

                populateStoredDataPreview();

                const startDate = document.getElementById('startDate').value;
                const endDate = document.getElementById('endDate').value;
                if (startDate && endDate) {
                    filterResults();
                }
            }
        });
}

function populateStoredDataPreview() {
    const preview = document.getElementById('storedDataPreview');
    if (!preview) return;

    const selectedDate = getSelectedAdminDate();
    if (!selectedDate) {
        preview.innerHTML = '<p style="color: #999;">Select a date to load slots.</p>';
        return;
    }

    ensureDateHasRandomSlots(selectedDate);
    const dayData = lotteryResultsCache[selectedDate] || {};

    let html = '<table style="width: 100%; border-collapse: collapse; font-size: 11px; table-layout: fixed;">';
    html += '<tr style="background-color: #444; border: 1px solid #FFFF00;"><td style="padding: 4px; border: 1px solid #FFFF00;">Date</td><td style="padding: 4px; border: 1px solid #FFFF00;">Time</td><td style="padding: 4px; border: 1px solid #FFFF00;">Andar</td><td style="padding: 4px; border: 1px solid #FFFF00;">Result</td><td style="padding: 4px; border: 1px solid #FFFF00;">Bahar</td><td style="padding: 4px; border: 1px solid #FFFF00;">Status</td><td style="padding: 4px; border: 1px solid #FFFF00;">Action</td></tr>';

    TIME_SLOTS.forEach((time) => {
                const slot = getStoredNumber({
                    [selectedDate]: lotteryData.getAll()[selectedDate] || {}
                }, selectedDate, time) || { andar: '--', result: '--', bahar: '--' };
                const key = `${selectedDate}|${time}`;
                const isLocked = hasSlotPassed(selectedDate, time);
                const value = /^[0-9]{2}$/.test(slot.result || '') ? slot.result : generateRandomNumber();
                const isFromDB = lotteryResultsCache[selectedDate] && lotteryResultsCache[selectedDate][time];
                const status = isFromDB ?
                    (lotteryResultsCache[selectedDate][time].is_confirmed ? '✅ DB (Editable)' : '📊 Generated') :
                    (confirmedNumbers[key] ? '✅ Confirmed (Editable)' : 'Editable');
                const inputId = `slot_${selectedDate}_${time}`.replace(/[^a-zA-Z0-9_]/g, '_');
                const safeDate = selectedDate.replace(/'/g, "\\'");
                const safeTime = time.replace(/'/g, "\\'");

                html += `<tr style="background-color: #333; border: 1px solid #666;">`;
                html += `<td style="padding: 4px; border: 1px solid #666; word-break: break-word;">${formatDateDisplay(selectedDate)}</td>`;
                html += `<td style="padding: 4px; border: 1px solid #666; word-break: break-word;">${formatTimeDisplay(time)}</td>`;
                html += `<td style="padding: 4px; border: 1px solid #666; word-break: break-word;">${value.charAt(0)}</td>`;
                // Render display box; input will be created on demand when editing
                const displayId = `display_${inputId}`;
                html += `<td style="padding: 4px; border: 1px solid #666; user-select: none;">`;
                html += `<div id="${displayId}" class="editable-display${isLocked ? ' locked-cell' : ''}" data-inputid="${inputId}" data-date="${selectedDate}" data-time="${time}" data-locked="${isLocked ? 'true' : 'false'}" style="background:${isLocked ? '#2b2b2b' : '#121212'}; border:2px solid ${isLocked ? '#666' : '#FFD700'}; padding:6px 8px; border-radius:6px; color:${isLocked ? '#8d8d8d' : '#f5df21'}; font-weight:700; cursor:${isLocked ? 'not-allowed' : 'pointer'}; text-align:center; ${isLocked ? 'opacity:0.92;' : ''}">${isLocked ? `${value} 🔒` : value}</div>`;
        html += `</td>`;
        html += `<td style="padding: 4px; border: 1px solid #666; word-break: break-word;">${value.charAt(1)}</td>`;
        html += `<td style="padding: 4px; border: 1px solid #666; color: #00FF00; word-break: break-word;">${status}</td>`;
        html += `<td style="padding: 4px; border: 1px solid #666;"><button type="button" class="btn-secondary" style="padding: 4px 8px; font-size: 10px; cursor: pointer; white-space: nowrap;" onclick="saveInlineAdminResult('${safeDate}', '${safeTime}', '${inputId}')">Save</button></td>`;
        html += `</tr>`;
    });

    html += '</table>';
    preview.innerHTML = html;

    // Ensure display elements are interactive after rendering
    setTimeout(() => {
        TIME_SLOTS.forEach((time) => {
            const inputId = `slot_${selectedDate}_${time}`.replace(/[^a-zA-Z0-9_]/g, '_');
            const displayId = `display_${inputId}`;
            const display = document.getElementById(displayId);
            if (display) {
                if (display.dataset.locked === 'true') {
                    return;
                }
                display.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const d = this.dataset;
                    startInlineEdit(d.date, d.time, d.inputid);
                });
            }
        });
    }, 0);
}

// Start inline editing for a cell
function startInlineEdit(date, time, inputId) {
    const key = `${date}|${time}`;
    const displayId = `display_${inputId}`;
    const displayEl = document.getElementById(displayId);
    if (!displayEl) return;
    // Prevent duplicate
    if (inlineEditState[key] && inlineEditState[key].isEditing) return;

    const original = displayEl.textContent.trim();
    inlineEditState[key] = { isEditing: true, currentValue: original, originalValue: original };

    // Create input element
    const input = document.createElement('input');
    input.type = 'number';
    input.inputMode = 'numeric';
    input.min = 0;
    input.max = 99;
    input.step = 1;
    input.id = inputId;
    input.value = original;
    input.style.cssText = 'background-color: #222; color: #f5df21; border: 2px solid #FFD700; border-radius: 4px; padding: 6px; width: 100%; text-align: center; font-size: 12px; font-weight: bold; cursor: text;';

    // Handlers
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            commitInlineEdit(date, time, inputId, true);
        } else if (e.key === 'Escape') {
            cancelInlineEdit(date, time, inputId);
        }
    });
    input.addEventListener('blur', (e) => {
        // commit on blur but don't trigger immediate save to DB; mark modified
        commitInlineEdit(date, time, inputId, false);
    });

    // Replace display element with input
    displayEl.parentNode.replaceChild(input, displayEl);
    setTimeout(() => {
        input.focus();
        input.select();
    }, 0);
}

function commitInlineEdit(date, time, inputId, saveImmediately) {
    const key = `${date}|${time}`;
    const input = document.getElementById(inputId);
    const displayId = `display_${inputId}`;
    let newVal = '';
    if (input) {
        newVal = String(input.value || '').padStart(2, '0');
        // Basic validation
        if (!/^[0-9]{1,2}$/.test(newVal)) {
            newVal = inlineEditState[key] ? inlineEditState[key].originalValue : '00';
        }
    } else {
        // fallback: nothing to commit
        return;
    }

    // Update state
    inlineEditState[key] = inlineEditState[key] || {};
    inlineEditState[key].isEditing = false;
    inlineEditState[key].currentValue = newVal;

    // Recreate display element
    const displayEl = document.createElement('div');
    displayEl.id = displayId;
    displayEl.className = 'editable-display';
    displayEl.dataset.inputid = inputId;
    displayEl.dataset.date = date;
    displayEl.dataset.time = time;
    displayEl.style.cssText = 'background:#121212; border:2px solid #FFD700; padding:6px 8px; border-radius:6px; color:#f5df21; font-weight:700; cursor:pointer; text-align:center;';
    displayEl.textContent = newVal;

    const inputEl = document.getElementById(inputId);
    if (inputEl && inputEl.parentNode) {
        inputEl.parentNode.replaceChild(displayEl, inputEl);
    }

    // Mark row modified visually
    try {
        const row = displayEl.closest('tr');
        if (row) row.style.outline = '2px solid rgba(255,215,0,0.12)';
    } catch (e) {}

    if (saveImmediately) {
        // call save function which will use inputId to read value (input no longer exists), so call RPC directly
        updateLotteryResultInDB(date, time, newVal.charAt(0), newVal, newVal.charAt(1)).then(success => {
            if (success) {
                // refresh preview
                populateStoredDataPreview();
            }
        });
    }
}

function cancelInlineEdit(date, time, inputId) {
    const key = `${date}|${time}`;
    const displayId = `display_${inputId}`;
    const state = inlineEditState[key];
    const current = state ? state.originalValue : '00';

    const displayEl = document.createElement('div');
    displayEl.id = displayId;
    displayEl.className = 'editable-display';
    displayEl.dataset.inputid = inputId;
    displayEl.dataset.date = date;
    displayEl.dataset.time = time;
    displayEl.style.cssText = 'background:#121212; border:2px solid #FFD700; padding:6px 8px; border-radius:6px; color:#f5df21; font-weight:700; cursor:pointer; text-align:center;';
    displayEl.textContent = current;

    const inputEl = document.getElementById(inputId);
    if (inputEl && inputEl.parentNode) {
        inputEl.parentNode.replaceChild(displayEl, inputEl);
    }
    if (inlineEditState[key]) inlineEditState[key].isEditing = false;
}

function deleteStoredResult(date, time) {
    if (confirm(`Delete results for ${date} at ${time}?`)) {
        lotteryData.deleteResult(date, time);
        delete confirmedNumbers[`${date}|${time}`];
        saveConfirmedNumbers();
        populateStoredDataPreview();

        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        if (startDate && endDate) {
            filterResults();
        }
    }
}

// ================================
// INITIALIZATION
// ================================

function initializeDashboard() {
    // Set default date range to today
    const today = applyTodayDateDefaults() || getLocalDateKey();
    lotteryData.ensureDate(today);
    document.getElementById('startDate').value = today;
    document.getElementById('endDate').value = today;

    // Fetch lottery results and visibility from database on initialization
    (async() => {
        console.log('📥 Loading lottery results from database...');

        // Fetch existing results
        await fetchLotteryResultsFromDB();

        // Fetch day visibility settings
        await fetchDayVisibilityFromDB();

        // Auto-generate results for today and next 7 days if they don't exist
        await autoGenerateInitialResults();

        // Reload to display database results
        window.reloadLotteryResults();
    })();

    // Initial render with today's data (skeleton table)
    filterResults();

    // Start live real-time clock
    updateRealTimeClock();
    setInterval(() => {
        updateRealTimeClock();
    }, 1000);

    console.log('🎰 Play Bhag Laxmi Dashboard Initialized');
    console.log('Available time slots:', TIME_SLOTS);
    console.log('Today\'s results loaded from database');
}

// Reload lottery results from database
window.reloadLotteryResults = function() {
    // Fetch from database
    (async() => {
        await fetchLotteryResultsFromDB();
        await fetchDayVisibilityFromDB();

        // Refresh the UI
        if (typeof filterResults === 'function') {
            filterResults();
        }
        if (typeof populateStoredDataPreview === 'function') {
            populateStoredDataPreview();
        }
    })();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDashboard);
} else {
    initializeDashboard();
}