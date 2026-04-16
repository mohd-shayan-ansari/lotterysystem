# 🎰 Play Bhag Laxmi - Results Dashboard

A modern, responsive web-based result dashboard for lottery-style games with admin panel functionality.

## 📋 Features

### 1. **User Results Dashboard**
- 🎨 Bold high-contrast design with yellow and dark theme
- 📊 Responsive data table with date and time columns
- 10 lottery categories (XA through XJ)
- Zebra striping for improved readability
- Date range filtering capability
- Record count display
- Horizontal scrolling on mobile devices

### 2. **Time Slot System**
- Pre-generated time slots from 09:00 AM to 09:40 PM
- 20-minute intervals between slots
- Generates 42+ time slots daily
- Easy to modify interval in code if needed

### 3. **Date Filtering**
- Select start and end dates
- Click "Go" to filter results
- Reset button to clear filters
- Default shows last 7 days of results
- Validates date range (start date ≤ end date)

### 4. **Admin Panel**
- Protected via modal (simple toggle for demo)
- Enter winning numbers for specific date/time combinations
- Input validation for all fields
- Preview of all stored data in admin panel
- Delete functionality for individual records
- localStorage integration for persistent storage

### 5. **Data Management**
- Mock data included for 2 sample days (2026-04-14 and 2026-04-15)
- localStorage saves all custom data
- Data persists across browser sessions
- Easy to extend to Firebase/Supabase

### 6. **Mobile Optimization**
- Responsive table with horizontal scroll on mobile
- Touch-friendly buttons
- Optimized font sizes and padding for small screens
- Grid layout adapts to screen size

## 🚀 Quick Start

### Installation
1. Clone or download the project
2. Place files in a web-accessible directory:
   - `index.html` - Main HTML file
   - `app.js` - JavaScript logic

3. Open `index.html` in your browser

### No Build Process Required
- Uses CDN Tailwind CSS (included in HTML)
- Pure vanilla JavaScript (no frameworks)
- localStorage API (built-in to browsers)

## 📂 File Structure

```
lottery/
├── index.html          # Main HTML file with structure and styling
├── app.js              # JavaScript logic and data management
└── README.md           # This file
```

## 🎮 How to Use

### Viewing Results
1. **Default View**: Dashboard loads with last 7 days of results
2. **Filter by Date Range**:
   - Select "Start Date" and "End Date"
   - Click "Go" button
   - Table updates to show matching records
3. **Reset**: Click "Reset" to clear filters

### Admin Panel

#### Accessing Admin Panel
- Click "Admin Panel" button in top-right corner
- Modal overlay opens with admin options

#### Entering Results
1. **Select Date and Time**:
   - Choose date from calendar
   - Select time from dropdown (automatically populated with all slots)
   - Click "Load" to load existing data (if any)

2. **Enter Numbers** (0-99 for each category):
   - XA through XJ: 10 input fields
   - Enter 1-2 digit numbers
   - Fields auto-pad with leading zeros

3. **Save Results**:
   - Click "Save Results"
   - Data saved to localStorage
   - Confirmation message displays
   - Form clears for next entry

4. **Preview Stored Data**:
   - Bottom of admin panel shows all stored results
   - Click "Delete" to remove individual entries
   - Shows date, time, numbers for each record

## 💾 Data Structure

### Mock Data Format
```javascript
{
    "2026-04-14": {
        "09:00": ["45", "23", "78", "12", "89", "56", "34", "67", "01", "98"],
        "09:20": ["34", "12", "67", "89", "23", "45", "78", "56", "90", "11"],
        // ... more time slots
    },
    "2026-04-15": {
        // ... time slots for next day
    }
}
```

### localStorage Key
- Key: `lotteryResults`
- Value: JSON string of all results

## 🔧 Customization

### Change Time Interval
In `app.js`, modify the interval variable in `generateTimeSlots()`:
```javascript
const interval = 20; // Change to 15, 30, etc.
```

### Adjust Start/End Time
In `app.js`, modify these constants:
```javascript
const startHour = 9;    // 9 AM
const startMinute = 0;  // Start of hour
const endHour = 21;     // 9 PM
const endMinute = 40;   // 40 minutes
```

### Change Colors/Theme
Edit CSS in `index.html`:
- Yellow background: `background-color: #FFFF00;`
- Dark header: `background-color: #1a1a1a;`
- Text color: `color: #FFFF00;`

### Add More Mock Data
Edit the `mockData` object in `app.js`:
```javascript
const mockData = {
    "2026-04-16": {
        "09:00": ["00", "11", "22", "33", "44", "55", "66", "77", "88", "99"],
        // ... add more time slots
    },
    // ... add more dates
};
```

## 🔐 Security Notes

### Current Implementation
- Admin panel uses simple modal toggle (demo mode)
- No actual authentication implemented
- Data stored in browser's localStorage (client-side)

### For Production
- Implement proper authentication (OAuth, JWT, etc.)
- Secure API backend (Never expose admin functions to client)
- Use HTTPS for all communications
- Validate and sanitize all inputs server-side

## 📱 Browser Support

- ✅ Chrome/Chromium (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## 🔌 Firebase/Supabase Integration

### Migration Steps

#### Firebase Realtime Database
```javascript
// Replace localStorage with Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

const firebaseApp = initializeApp(firebaseConfig);
const database = getDatabase(firebaseApp);

// Save to Firebase instead of localStorage
async function saveResult(date, time, numbers) {
    await set(ref(database, `results/${date}/${time}`), numbers);
}

// Fetch from Firebase
async function getResults(date) {
    const snapshot = await get(ref(database, `results/${date}`));
    return snapshot.val();
}
```

#### Supabase
```javascript
// Similar approach with Supabase PostgreSQL integration
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Insert results
await supabase
  .from('lottery_results')
  .insert([{ date, time, numbers: JSON.stringify(numbers) }])

// Fetch results
const { data, error } = await supabase
  .from('lottery_results')
  .select('*')
  .gte('date', startDate)
```

## 🐛 Troubleshooting

### Results Not Showing
- Check browser console for errors (F12)
- Verify date range is correct
- Ensure mock data exists for selected dates

### Admin Panel Not Opening
- Check browser console for JavaScript errors
- Clear browser cache (Ctrl+Shift+Delete)
- Try in Private/Incognito window

### Data Not Persisting
- Verify localStorage is enabled
- Check browser's storage quota
- Look for error messages in console

### Mobile Table Too Wide
- This is by design - table is horizontally scrollable
- Use horizontal scroll to view all columns
- Adjust font sizes in CSS if needed

## 📊 Sample Queries

### All results for a specific date:
```javascript
lotteryData.getByDateRange('2026-04-14', '2026-04-14')
```

### Results for week of April 14:
```javascript
lotteryData.getByDateRange('2026-04-14', '2026-04-20')
```

### Get specific result:
```javascript
lotteryData.getResult('2026-04-14', '09:00')
```

## 🔄 API Reference

### LotteryData Class

#### loadFromStorage()
Loads data from localStorage on initialization

#### getAll()
Returns all stored data object

#### getByDateRange(startDate, endDate)
Returns array of results within date range (sorted)

#### getResult(date, time)
Returns number array for specific date/time

#### saveResult(date, time, numbers)
Saves result and persists to localStorage

#### deleteResult(date, time)
Deletes specific result entry

#### getAllDates()
Returns sorted array of all available dates

## 📝 License

This project is provided as-is for demonstration purposes.

## 🤝 Contributing

To extend this dashboard:
1. Modify time slots as needed
2. Add more category columns (beyond XJ)
3. Implement additional filters
4. Connect to backend API
5. Add user authentication

## 📞 Support

For questions or issues:
1. Check browser console for error messages
2. Review the FAQ section above
3. Verify all files are in correct locations
4. Check that JavaScript is enabled

---

**Version**: 1.0.0  
**Last Updated**: April 2026  
**Built with**: HTML5, Tailwind CSS, Vanilla JavaScript
