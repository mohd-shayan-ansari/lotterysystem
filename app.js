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

const ADMIN_PASSWORD = 'admin123';
let isAdminAuthenticated = false;

// Initialize today's date with random numbers for all time slots
function initializeDateWithRandomNumbers(dataStore, date) {
    if (!dataStore[date]) {
        dataStore[date] = {};
    }

    TIME_SLOTS.forEach((time) => {
        if (!dataStore[date][time]) {
            dataStore[date][time] = generateRandomNumber();
        }
    });
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
    if (!dataStore[date]) {
        return null;
    }
    return dataStore[date][time] || null;
}

function autoConfirmPassedSlots() {
    let hasChanges = false;
    const allData = lotteryData.getAll();

    Object.entries(allData).forEach(([date, timeSlots]) => {
        Object.entries(timeSlots).forEach(([time, number]) => {
            if (!number) {
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
        this.ensureDateRange(startDate, endDate);

        const results = [];
        const start = new Date(startDate);
        const end = new Date(endDate);

        const current = new Date(start);
        while (current <= end) {
            const date = current.toISOString().split('T')[0];
            TIME_SLOTS.forEach((time) => {
                const isUpcoming = !hasSlotPassed(date, time);
                const storedNumber = getStoredNumber(this.data, date, time);
                const numberToShow = isUpcoming ? 'Pending' : (storedNumber || '--');

                results.push({
                    date,
                    time,
                    number: numberToShow,
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

    saveResult(date, time, number) {
        if (!this.data[date]) {
            this.data[date] = {};
        }
        this.data[date][time] = number;
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
        tbody.innerHTML = '<tr class="table-row-odd"><td colspan="3" style="text-align: center; padding: 20px;">No results found for the selected date range.</td></tr>';
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

        const numberCell = document.createElement('td');
        numberCell.textContent = result.number;
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

    const result = lotteryData.getResult(date, time);

    updateAdminEditLock(date, time);

    if (result) {
        document.getElementById('result').value = result;
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

    const value = document.getElementById('result').value.trim();

    if (!value) {
        alert('Please enter a result number');
        return;
    }

    if (!/^\d{1,2}$/.test(value)) {
        alert('Result must be a number between 0-99');
        return;
    }

    const number = value.padStart(2, '0');

    lotteryData.saveResult(date, time, number);
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
    html += '<tr style="background-color: #444; border: 1px solid #FFFF00;"><td style="padding: 4px; border: 1px solid #FFFF00;">Date</td><td style="padding: 4px; border: 1px solid #FFFF00;">Time</td><td style="padding: 4px; border: 1px solid #FFFF00;">Result</td><td style="padding: 4px; border: 1px solid #FFFF00;">Status</td><td style="padding: 4px; border: 1px solid #FFFF00;">Action</td></tr>';

    allDates.forEach(date => {
        const timeSlots = lotteryData.getAll()[date];
        Object.entries(timeSlots).forEach(([time, number]) => {
            const key = `${date}|${time}`;
            const status = confirmedNumbers[key] ? '✓ Confirmed' : '⏳ Pending';
            html += `<tr style="background-color: #333; border: 1px solid #666;">`;
            html += `<td style="padding: 4px; border: 1px solid #666;">${formatDateDisplay(date)}</td>`;
            html += `<td style="padding: 4px; border: 1px solid #666;">${formatTimeDisplay(time)}</td>`;
            html += `<td style="padding: 4px; border: 1px solid #666;">${number}</td>`;
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
    // Set default date range to today
    const today = new Date().toISOString().split('T')[0];
    lotteryData.ensureDate(today);
    document.getElementById('startDate').value = today;
    document.getElementById('endDate').value = today;

    // Initial render with today's data (skeleton table)
    autoConfirmPassedSlots();
    filterResults();

    // Start live real-time clock
    updateRealTimeClock();
    setInterval(() => {
        updateRealTimeClock();
        const hasNewConfirmations = autoConfirmPassedSlots();
        if (hasNewConfirmations) {
            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;
            if (startDate && endDate) {
                filterResults();
            }

            const adminModal = document.getElementById('adminModal');
            if (adminModal && adminModal.classList.contains('active')) {
                populateStoredDataPreview();

                const adminDate = document.getElementById('adminDate').value;
                const adminTime = document.getElementById('adminTime').value;
                updateAdminEditLock(adminDate, adminTime);
            }
        }
    }, 1000);

    console.log('🎰 Play Bhag Laxmi Dashboard Initialized');
    console.log('Available time slots:', TIME_SLOTS);
    console.log('Today\'s skeleton data generated with random numbers');
});