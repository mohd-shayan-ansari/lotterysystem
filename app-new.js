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

// Initialize today's date with random numbers for all time slots
function initializeTodayWithRandomNumbers() {
    const today = new Date().toISOString().split('T')[0];

    // Only initialize if not already present
    if (!mockData[today]) {
        mockData[today] = {};
        TIME_SLOTS.forEach(time => {
            mockData[today][time] = generateRandomNumber();
        });
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

        for (const [date, timeSlots] of Object.entries(this.data)) {
            const currentDate = new Date(date);
            if (currentDate >= start && currentDate <= end) {
                for (const [time, number] of Object.entries(timeSlots)) {
                    results.push({
                        date,
                        time,
                        number,
                    });
                }
            }
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
        // Mark as confirmed by admin
        confirmedNumbers[`${date}|${time}`] = true;
        this.saveToStorage();
    }

    getResult(date, time) {
        return this.data[date] ? .[time] || null;
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

// Initialize with skeleton data first
initializeTodayWithRandomNumbers();
const lotteryData = new LotteryData();

// Storage for confirmed vs pending numbers
const confirmedNumbers = {};

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

        // Date cell
        const dateCell = document.createElement('td');
        dateCell.textContent = result.date;
        row.appendChild(dateCell);

        // Time cell
        const timeCell = document.createElement('td');
        timeCell.textContent = result.time;
        row.appendChild(timeCell);

        // Number cell with status indication
        const numberCell = document.createElement('td');
        numberCell.textContent = result.number;
        const key = `${result.date}|${result.time}`;
        const isConfirmed = confirmedNumbers[key] === true;
        numberCell.className = isConfirmed ? 'table-cell-confirmed' : 'table-cell-pending';
        numberCell.title = isConfirmed ? '✓ Confirmed by admin' : '⏳ Auto-generated (pending admin confirmation)';
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
        console.error('Admin modal not found!');
        return;
    }
    modal.classList.toggle('active');
    if (modal.classList.contains('active')) {
        populateTimeSlots();
        populateStoredDataPreview();
        setDefaultAdminDate();
    }
}

function setDefaultAdminDate() {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('adminDate');
    if (dateInput) {
        dateInput.value = today;
    }
}

function populateTimeSlots() {
    const select = document.getElementById('adminTime');
    if (!select) {
        console.error('Admin time select not found!');
        return;
    }
    select.innerHTML = '<option value="">Select Time</option>';
    TIME_SLOTS.forEach(time => {
        const option = document.createElement('option');
        option.value = time;
        option.textContent = time;
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

    // Refresh the main table to show updated confirmed state
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    if (startDate && endDate) {
        filterResults();
    }

    // Clear form
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
            html += `<td style="padding: 4px; border: 1px solid #666;">${date}</td>`;
            html += `<td style="padding: 4px; border: 1px solid #666;">${time}</td>`;
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
        populateStoredDataPreview();

        // Refresh the main table
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
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');

    if (startDateInput) startDateInput.value = today;
    if (endDateInput) endDateInput.value = today;

    // Initial render with today's data (skeleton table)
    filterResults();

    console.log('🎰 Play Bhag Laxmi Dashboard Initialized');
    console.log('Available time slots:', TIME_SLOTS);
    console.log('Today\'s skeleton data generated with random numbers');
    console.log('All time slots populated - admin can confirm/override numbers');
});