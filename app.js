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
    const startHour = 9;
    const startMinute = 0;
    const endHour = 21;
    const endMinute = 0;
    const interval = 20; // 20 minutes interval

    let currentHour = startHour;
    let currentMinute = startMinute;

    while (currentHour < endHour || (currentHour === endHour && currentMinute <= endMinute)) {
        const timeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
        slots.push(timeStr);

        currentMinute += interval;
        if (currentMinute >= 60) {
            currentHour += 1;
            currentMinute -= 60;
        }
    }

    return slots;
}

// Helper function to generate random number
function generateRandomNumber() {
    return String(Math.floor(Math.random() * 100)).padStart(2, '0');
}

function loadConfirmedNumbers() {
    const stored = localStorage.getItem('lotteryConfirmedResults');
    return stored ? JSON.parse(stored) : {};
}

function saveConfirmedNumbers() {
    localStorage.setItem('lotteryConfirmedResults', JSON.stringify(confirmedNumbers));
}

function loadRecordUsers() {
    const stored = localStorage.getItem('lotteryRecordUsers');
    if (!stored) {
        return {
            counter1: 'counter1',
            counter2: 'counter2',
            counter3: 'counter3',
        };
    }

    try {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
            return parsed;
        }
    } catch (error) {
        console.error('Failed to parse lotteryRecordUsers, resetting defaults.', error);
    }

    return {
        counter1: 'counter1',
        counter2: 'counter2',
        counter3: 'counter3',
    };
}

function saveRecordUsers() {
    localStorage.setItem('lotteryRecordUsers', JSON.stringify(recordUsers));
}

const ADMIN_PASSWORD = 'admin123';
let isAdminAuthenticated = false;
const recordUsers = loadRecordUsers();

// Initialize today's date with random numbers for all time slots
function initializeDateWithRandomNumbers(dataStore, date) {
    if (!dataStore[date]) {
        dataStore[date] = {};
    }
}

function hasSlotPassed(date, time) {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

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

function getStoredNumber(dataStore, date, time) {
    if (!dataStore[date] || !dataStore[date][time]) {
        return null;
    }

    const slotValue = dataStore[date][time];
    if (typeof slotValue === 'string') {
        return {
            andar: '--',
            result: slotValue,
            bahar: '--',
        };
    }

    return {
        andar: slotValue.andar || '--',
        result: slotValue.result || '--',
        bahar: slotValue.bahar || '--',
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
    const saveButton = document.getElementById('adminSaveBtn');
    if (!resultInput || !saveButton) {
        return;
    }

    const isLocked = Boolean(date && time && hasSlotPassed(date, time));
    resultInput.disabled = isLocked;
    saveButton.disabled = isLocked;

    if (isLocked) {
        resultInput.title = 'Past slot is locked and cannot be edited';
        saveButton.title = 'Past slot is locked and cannot be edited';
    } else {
        resultInput.title = '';
        saveButton.title = '';
    }
}

function renderUsersList() {
    const userList = document.getElementById('userList');
    if (!userList) {
        return;
    }

    const userEntries = Object.keys(recordUsers).sort();
    if (userEntries.length === 0) {
        userList.innerHTML = '<p style="color:#999;">No users configured.</p>';
        return;
    }

    const rows = userEntries.map((username) => {
        return `<div style="display:flex; justify-content:space-between; gap:8px; padding:4px 0; border-bottom:1px solid #444;">` +
            `<span>${username}</span>` +
            `<button class="btn-secondary" style="padding:2px 8px; font-size:11px;" onclick="deleteUserCredentials('${username}')">Delete</button>` +
            `</div>`;
    });

    userList.innerHTML = rows.join('');
}

function saveUserCredentials() {
    const usernameInput = document.getElementById('userNameInput');
    const passwordInput = document.getElementById('userPasswordInput');
    if (!usernameInput || !passwordInput) {
        return;
    }

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        alert('Username must be 3-20 characters and only letters, numbers, or underscore.');
        return;
    }

    if (!/^[a-zA-Z0-9@#_$!%*?&]{4,20}$/.test(password)) {
        alert('Password must be 4-20 characters and can include letters, numbers, and common symbols.');
        return;
    }

    recordUsers[username] = password;
    saveRecordUsers();
    renderUsersList();

    usernameInput.value = '';
    passwordInput.value = '';
}

function deleteUserCredentials(usernameFromList) {
    const usernameInput = document.getElementById('userNameInput');
    const username = (usernameFromList || (usernameInput ? usernameInput.value.trim() : '')).trim();

    if (!username) {
        alert('Enter username to delete.');
        return;
    }

    if (!recordUsers[username]) {
        alert('User not found.');
        return;
    }

    delete recordUsers[username];
    saveRecordUsers();
    renderUsersList();

    if (usernameInput) {
        usernameInput.value = '';
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

function toggleUserManagementSection() {
    const section = document.getElementById('userManagementSection');
    if (!section) {
        return;
    }
    section.classList.toggle('hidden');
    if (!section.classList.contains('hidden')) {
        renderUsersList();
    }
}

function toggleTopMenu() {
    const dropdown = document.getElementById('topMenuDropdown');
    if (!dropdown) {
        return;
    }
    dropdown.classList.toggle('active');
}

function closeTopMenu() {
    const dropdown = document.getElementById('topMenuDropdown');
    if (!dropdown) {
        return;
    }
    dropdown.classList.remove('active');
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
        initializeDateWithRandomNumbers(this.data, date);
        this.saveToStorage();
    }

    ensureDateRange(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const current = new Date(start);
        const todayStr = new Date().toISOString().split('T')[0];

        while (current <= end) {
            const dateStr = current.toISOString().split('T')[0];
            if (dateStr <= todayStr) {
                initializeDateWithRandomNumbers(this.data, dateStr);
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
        const start = new Date(startDate);
        const end = new Date(endDate);

        const current = new Date(start);
        while (current <= end) {
            const date = current.toISOString().split('T')[0];
            TIME_SLOTS.forEach((time) => {
                const isUpcoming = !hasSlotPassed(date, time);
                const storedSlot = getStoredNumber(this.data, date, time);
                const andarToShow = isUpcoming ? 'Pending' : (storedSlot ? .andar || '--');
                const resultToShow = isUpcoming ? 'Pending' : (storedSlot ? .result || '--');
                const baharToShow = isUpcoming ? 'Pending' : (storedSlot ? .bahar || '--');

                results.push({
                    date,
                    time,
                    andar: andarToShow,
                    result: resultToShow,
                    bahar: baharToShow,
                    isUpcoming,
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
const confirmedNumbers = loadConfirmedNumbers();
// ================================
// TABLE RENDERING
// ================================

function renderTable(results) {
    const tbody = document.getElementById('resultsTable');
    tbody.innerHTML = '';

    if (results.length === 0) {
        tbody.innerHTML = '<tr class="table-row-odd"><td colspan="5" style="text-align: center; padding: 20px;">No results found for the selected date range.</td></tr>';
        updateRecordCount(0);
        return;
    }

    results.forEach((result, index) => {
        const row = document.createElement('tr');
        const rowClass = index % 2 === 0 ? 'table-row-odd' : 'table-row-even';
        row.className = rowClass;

        const dateCell = document.createElement('td');
        dateCell.textContent = formatDateDisplay(result.date);
        row.appendChild(dateCell);

        const timeCell = document.createElement('td');
        timeCell.textContent = formatTimeDisplay(result.time);
        row.appendChild(timeCell);

        const andarCell = document.createElement('td');
        andarCell.textContent = result.andar;
        row.appendChild(andarCell);

        const numberCell = document.createElement('td');
        numberCell.textContent = result.result;
        const key = `${result.date}|${result.time}`;
        const isConfirmed = confirmedNumbers[key] === true;
        if (result.isUpcoming) {
            numberCell.className = 'table-cell-pending';
            numberCell.title = 'Upcoming result slot';
        } else {
            numberCell.className = isConfirmed ? 'table-cell-confirmed' : 'table-cell-pending';
            numberCell.title = isConfirmed ? 'Confirmed by admin' : 'Auto-generated (pending admin confirmation)';
        }
        row.appendChild(numberCell);

        const baharCell = document.createElement('td');
        baharCell.textContent = result.bahar;
        row.appendChild(baharCell);

        tbody.appendChild(row);
    });

    updateRecordCount(results.length);
}

function updateRecordCount(count) {
    const recordCount = document.getElementById('recordCount');
    recordCount.textContent = `Records: ${count}`;
}

// ================================
// FILTERING LOGIC
// ================================

function filterResults() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (!startDate || !endDate) {
        alert('Please select both Start Date and End Date');
        return;
    }

    if (startDate > endDate) {
        alert('Start Date cannot be after End Date');
        return;
    }

    const results = lotteryData.getByDateRange(startDate, endDate);
    renderTable(results);
}

function resetFilter() {
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    renderTable([]);
    updateRecordCount(0);
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
        renderUsersList();
        closeAdminMenu();
        populateTimeSlots();
        populateStoredDataPreview();
        setDefaultAdminDate();
    } else {
        isAdminAuthenticated = false;
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
    if (enteredPassword !== ADMIN_PASSWORD) {
        alert('Incorrect password. Access denied.');
        passwordInput.focus();
        passwordInput.select();
        return;
    }

    isAdminAuthenticated = true;
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
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('adminDate');
    if (dateInput) {
        dateInput.value = today;
    }
    updateAdminEditLock(today, '');
}

function populateTimeSlots() {
    const select = document.getElementById('adminTime');
    if (!select) {
        console.error('Admin time select element not found!');
        return;
    }
    select.innerHTML = '<option value="">Select Time</option>';
    TIME_SLOTS.forEach(time => {
        const option = document.createElement('option');
        option.value = time;
        option.textContent = formatTimeDisplay(time);
        select.appendChild(option);
    });
}

function loadAdminData() {
    const date = document.getElementById('adminDate').value;
    const time = document.getElementById('adminTime').value;

    if (!date || !time) {
        alert('Please select both Date and Time');
        return;
    }

    const slot = lotteryData.getResult(date, time);

    updateAdminEditLock(date, time);

    if (slot) {
        document.getElementById('result').value = slot.result === '--' ? '' : slot.result;
    } else {
        document.getElementById('result').value = '';
    }
}

function saveAdminData() {
    const date = document.getElementById('adminDate').value;
    const time = document.getElementById('adminTime').value;

    if (!date || !time) {
        alert('Please select both Date and Time');
        return;
    }

    if (hasSlotPassed(date, time)) {
        alert('This time slot is locked after time has passed and cannot be changed.');
        updateAdminEditLock(date, time);
        return;
    }

    const resultValue = document.getElementById('result').value.trim();

    if (!/^[0-9]{2}$/.test(resultValue)) {
        alert('Enter exactly 2 digits from 00 to 99.');
        return;
    }

    const andarValue = resultValue.charAt(0);
    const baharValue = resultValue.charAt(1);

    lotteryData.saveResult(date, time, {
        andar: andarValue || '--',
        result: resultValue,
        bahar: baharValue || '--',
    });
    alert(`Result saved for ${date} at ${time}`);
    populateStoredDataPreview();

    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    if (startDate && endDate) {
        filterResults();
    }

    document.getElementById('result').value = '';
}

function populateStoredDataPreview() {
    const preview = document.getElementById('storedDataPreview');
    if (!preview) return;

    const allDates = lotteryData.getAllDates();

    if (allDates.length === 0) {
        preview.innerHTML = '<p style="color: #999;">No data stored yet.</p>';
        return;
    }

    let html = '<table style="width: 100%; border-collapse: collapse; font-size: 11px;">';
    html += '<tr style="background-color: #444; border: 1px solid #FFFF00;"><td style="padding: 4px; border: 1px solid #FFFF00;">Date</td><td style="padding: 4px; border: 1px solid #FFFF00;">Time</td><td style="padding: 4px; border: 1px solid #FFFF00;">Andar</td><td style="padding: 4px; border: 1px solid #FFFF00;">Result</td><td style="padding: 4px; border: 1px solid #FFFF00;">Bahar</td><td style="padding: 4px; border: 1px solid #FFFF00;">Status</td><td style="padding: 4px; border: 1px solid #FFFF00;">Action</td></tr>';

    allDates.forEach(date => {
        const timeSlots = lotteryData.getAll()[date];
        Object.entries(timeSlots).forEach(([time, slotValue]) => {
            const slot = typeof slotValue === 'string' ? { andar: '--', result: slotValue, bahar: '--' } : {
                andar: slotValue.andar || '--',
                result: slotValue.result || '--',
                bahar: slotValue.bahar || '--',
            };
            const key = `${date}|${time}`;
            const status = confirmedNumbers[key] ? '✓ Confirmed' : '⏳ Pending';
            html += `<tr style="background-color: #333; border: 1px solid #666;">`;
            html += `<td style="padding: 4px; border: 1px solid #666;">${formatDateDisplay(date)}</td>`;
            html += `<td style="padding: 4px; border: 1px solid #666;">${formatTimeDisplay(time)}</td>`;
            html += `<td style="padding: 4px; border: 1px solid #666;">${slot.andar}</td>`;
            html += `<td style="padding: 4px; border: 1px solid #666;">${slot.result}</td>`;
            html += `<td style="padding: 4px; border: 1px solid #666;">${slot.bahar}</td>`;
            html += `<td style="padding: 4px; border: 1px solid #666; color: ${confirmedNumbers[key] ? '#00FF00' : '#FFAA00'};">${status}</td>`;
            html += `<td style="padding: 4px; border: 1px solid #666;"><button onclick="deleteStoredResult('${date}', '${time}')" class="btn-secondary" style="padding: 2px 4px; font-size: 10px;">Delete</button></td>`;
            html += `</tr>`;
        });
    });

    html += '</table>';
    preview.innerHTML = html;
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

document.addEventListener('DOMContentLoaded', function() {
    document.addEventListener('click', function(event) {
        const dropdown = document.getElementById('topMenuDropdown');
        const menuBtn = document.getElementById('topMenuBtn');
        if (!dropdown || !menuBtn) {
            return;
        }

        if (!dropdown.contains(event.target) && !menuBtn.contains(event.target)) {
            closeTopMenu();
        }
    });

    // Set default date range to today
    const today = new Date().toISOString().split('T')[0];
    lotteryData.ensureDate(today);
    document.getElementById('startDate').value = today;
    document.getElementById('endDate').value = today;

    // Initial render with today's data (skeleton table)
    filterResults();

    // Start live real-time clock
    updateRealTimeClock();
    setInterval(() => {
        updateRealTimeClock();
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        if (startDate && endDate) {
            filterResults();
        }
    }, 1000);

    console.log('🎰 Play Bhag Laxmi Dashboard Initialized');
    console.log('Available time slots:', TIME_SLOTS);
    console.log('Today\'s skeleton data generated with random numbers');
});