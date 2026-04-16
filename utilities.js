// ================================
// UTILITY FUNCTIONS & TOOLS
// ================================
// This file contains helpful utility functions for development and testing
// Copy-paste these into the browser console or add to app.js as needed

// ================================
// 1. DATA GENERATION & TESTING
// ================================

/**
 * Generate mock data for testing
 * Usage: generateMockDataForDays(10)  // generates 10 days of data
 */
function generateMockDataForDays(days) {
    const data = {};
    const slots = TIME_SLOTS;

    for (let d = 0; d < days; d++) {
        const date = new Date();
        date.setDate(date.getDate() - d);
        const dateStr = date.toISOString().split('T')[0];

        data[dateStr] = {};

        slots.forEach((time, index) => {
            data[dateStr][time] = String(Math.floor(Math.random() * 100)).padStart(2, '0');
        });
    }

    lotteryData.data = data;
    lotteryData.saveToStorage();
    console.log(`✅ Generated ${days} days of mock data`);
    console.log(`Total slots: ${days * slots.length}`);
    renderTable(lotteryData.getAll());
}

/**
 * Add data for a specific date
/**
 * Add data for a specific date
 * Usage: addDataForDate('2026-04-20')
 */
function addDataForDate(dateStr) {
    const slots = TIME_SLOTS;

    if (!lotteryData.data[dateStr]) {
        lotteryData.data[dateStr] = {};
    }

    slots.forEach((time, index) => {
        lotteryData.data[dateStr][time] = String((index % 100)).padStart(2, '0');
    });

    lotteryData.saveToStorage();
    console.log(`✅ Added data for ${dateStr}`);
}

/**
 * Clear all data from localStorage
 */
function clearAllData() {
    if (confirm('Are you sure? This will delete ALL data!')) {
        localStorage.removeItem('lotteryResults');
        lotteryData.data = {};
        renderTable([]);
        console.log('✅ All data cleared');
    }
}

// ================================
// 2. DATA EXPORT & BACKUP
// ================================

/**
 * Export all data as JSON
 * Downloads as lottery-backup-TIMESTAMP.json
 */
function exportDataAsJSON() {
    const data = lotteryData.getAll();
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lottery-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    console.log('✅ Data exported');
}

/**
 * Export data as CSV
 * Downloads as lottery-export-TIMESTAMP.csv
 */
function exportDataAsCSV() {
    const data = lotteryData.getAll();
    let csv = 'Date,Time,Result\n';

    const allDates = Object.keys(data).sort();
    allDates.forEach(date => {
        const times = Object.keys(data[date]).sort();
        times.forEach(time => {
            const number = data[date][time];
            csv += `${date},${time},${number}\n`;
        });
    });

    const csvBlob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(csvBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lottery-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    console.log('✅ Data exported as CSV');
}

/**
 * Import data from JSON file
 * Call this and select a previously exported JSON file
 */
function importDataFromJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                lotteryData.data = importedData;
                lotteryData.saveToStorage();
                console.log('✅ Data imported successfully');
                console.log(`Total dates: ${Object.keys(importedData).length}`);
                renderTable([]);
            } catch (error) {
                console.error('❌ Error importing data:', error);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// ================================
// 3. DATA ANALYSIS & REPORTING
// ================================

/**
 * Get statistics about stored data
 */
function getDataStatistics() {
    const data = lotteryData.getAll();
    const dates = Object.keys(data);
    let totalSlots = 0;

    dates.forEach(date => {
        totalSlots += Object.keys(data[date]).length;
    });

    const stats = {
        totalDates: dates.length,
        totalSlots: totalSlots,
        dateRange: {
            earliest: dates.sort()[0],
            latest: dates.sort().reverse()[0]
        },
        averageSlotsPerDay: Math.round(totalSlots / (dates.length || 1)),
        storageSize: new Blob([JSON.stringify(data)]).size,
    };

    console.table(stats);
    return stats;
}

/**
 * Find most common numbers
 */
function findMostCommonNumbers() {
    const data = lotteryData.getAll();
    const frequency = {};

    Object.values(data).forEach(timeSlots => {
        Object.values(timeSlots).forEach(number => {
            frequency[number] = (frequency[number] || 0) + 1;
        });
    });

    const sorted = Object.entries(frequency)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);

    console.log('🔢 Top 10 Most Common Numbers:');
    console.table(Object.fromEntries(sorted));
    return sorted;
}

/**
 * Get data for specific date
 */
function getDateData(dateStr) {
    const data = lotteryData.data[dateStr];
    if (!data) {
        console.log(`❌ No data found for ${dateStr}`);
        return null;
    }

    console.table(data);
    return data;
}

// ================================
// 4. TESTING & DEBUG HELPERS
// ================================

/**
 * Simulate filter with specific dates
 */
function testFilter(startDate, endDate) {
    console.log(`🔍 Filtering from ${startDate} to ${endDate}`);
    const results = lotteryData.getByDateRange(startDate, endDate);
    console.log(`Found ${results.length} results`);
    return results;
}

/**
 * Performance test - measure filtering speed
 */
function testFilterPerformance() {
    const data = lotteryData.getAll();
    const dates = Object.keys(data).sort();

    if (dates.length < 2) {
        console.log('❌ Need at least 2 dates for performance test');
        return;
    }

    const start = performance.now();
    const results = lotteryData.getByDateRange(dates[0], dates[dates.length - 1]);
    const end = performance.now();

    console.log(`⏱️ Filter Performance Test`);
    console.log(`Date range: ${dates[0]} to ${dates[dates.length - 1]}`);
    console.log(`Results: ${results.length}`);
    console.log(`Time: ${(end - start).toFixed(2)}ms`);
}

/**
 * Validate data integrity
 */
function validateData() {
    const data = lotteryData.getAll();
    let errors = 0;

    Object.entries(data).forEach(([date, timeSlots]) => {
        // Check date format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            console.error(`❌ Invalid date format: ${date}`);
            errors++;
        }

        Object.entries(timeSlots).forEach(([time, numbers]) => {
            // Check time format
            if (!/^\d{2}:\d{2}$/.test(time)) {
                console.error(`❌ Invalid time format: ${time}`);
                errors++;
            }

            // Check numbers array
            if (!Array.isArray(numbers) || numbers.length !== 10) {
                console.error(`❌ Invalid numbers for ${date} ${time}`);
                errors++;
            }

            // Check each number
            numbers.forEach(num => {
                if (!/^\d{1,2}$/.test(num)) {
                    console.error(`❌ Invalid number: ${num}`);
                    errors++;
                }
            });
        });
    });

    if (errors === 0) {
        console.log('✅ Data validation passed!');
    } else {
        console.log(`❌ Found ${errors} validation errors`);
    }

    return errors === 0;
}

// ================================
// 5. BROWSER CONSOLE HELPERS
// ================================

/**
 * Print quick help
 */
function lotteryHelp() {
    console.clear();
    console.log(`
╔════════════════════════════════════════════════════════════╗
║     🎰 Play Bhag Laxmi - Developer Console Helpers        ║
╚════════════════════════════════════════════════════════════╝

📊 DATA GENERATION:
  • generateMockDataForDays(10)     - Generate 10 days of data
  • addDataForDate('2026-04-20')    - Add data for specific date
  • clearAllData()                  - Delete all data

💾 EXPORT & IMPORT:
  • exportDataAsJSON()              - Download JSON backup
  • exportDataAsCSV()               - Download CSV file
  • importDataFromJSON()            - Upload JSON file

📈 ANALYSIS:
  • getDataStatistics()             - Show storage stats
  • findMostCommonNumbers()         - Top 10 numbers
  • getDateData('2026-04-14')       - Get data for date

🧪 TESTING:
  • testFilter('2026-04-14', '2026-04-15')  - Test filtering
  • testFilterPerformance()         - Measure filter speed
  • validateData()                  - Check data integrity

ℹ️  UTILITIES:
  • lotteryHelp()                   - Show this help

📱 Direct Access:
  • lotteryData.getAll()            - Get all data
  • lotteryData.getAllDates()       - Get all dates
  • TIME_SLOTS                      - All time slots
    `);
}

// ================================
// 6. QUICK START COMMANDS
// ================================

/**
 * Call this in console when page loads to set up test data
 */
function setupTestData() {
    console.log('Setting up test data...');
    generateMockDataForDays(30);
    console.log('✅ Test data ready!');
    console.log('Type: lotteryHelp() for available commands');
}

// ================================
// 7. EXPORT UTILITIES OBJECT
// ================================

const LotteryUtils = {
    // Data Generation
    generateMockDataForDays,
    addDataForDate,
    clearAllData,

    // Export/Import
    exportDataAsJSON,
    exportDataAsCSV,
    importDataFromJSON,

    // Analysis
    getDataStatistics,
    findMostCommonNumbers,
    getDateData,

    // Testing
    testFilter,
    testFilterPerformance,
    validateData,

    // Help
    lotteryHelp,
    setupTestData,
};

// Make available globally
window.LotteryUtils = LotteryUtils;

console.log('🎰 Lottery Utils loaded! Type: lotteryHelp()');