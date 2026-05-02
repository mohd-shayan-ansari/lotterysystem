# Day Visibility Toggle Setup

## Overview
The admin panel now includes an on/off toggle button that allows admins to hide or show lottery results for entire days.

**Features:**
- 🟢 **ON** (green): Day's results are visible to all users
- 🔴 **OFF** (red): Day's results are hidden from all users
- Toggle persists in the database
- Status updates in real-time across all viewers

## Installation Steps

### Step 1: Run Supabase SQL Setup

1. Go to your Supabase Dashboard: https://app.supabase.com/
2. Open the **SQL Editor** from the left menu
3. Create a new query and paste the SQL from [SUPABASE_SETUP.sql](./SUPABASE_SETUP.sql)
4. Click **Run** to execute the commands

This will:
- Add the `is_day_visible` column to the `lottery_results` table (defaults to `true`)
- Create the `set_day_visibility()` RPC function for secure visibility toggling

### Step 2: Reload Your Application

After the SQL executes successfully:
1. Refresh your browser (F5)
2. Open the admin panel
3. Select a date - you should see the visibility toggle button next to the date selector

### Step 3: Test the Feature

**To toggle a day's visibility:**
1. Open the Admin Panel (click the copyright year at the bottom)
2. Enter your admin password (default: `admin123`)
3. Select a date from the "Stored Data Date" field
4. Click the toggle button (🟢 ON / 🔴 OFF)
5. The button will change color and the database will be updated
6. Open the main results view in another tab - you should see the selected date's results appear/disappear

**Expected Behavior:**
- When a date is toggled **OFF**: Results for that date don't appear in the main table
- When a date is toggled **ON**: Results for that date are visible again
- All viewers see the changes immediately (real-time sync)

## Technical Details

### Database Changes
- **Column Added**: `is_day_visible` (BOOLEAN, DEFAULT: true) to `lottery_results` table
- **RPC Function**: `set_day_visibility(p_date, p_is_visible, p_password)`
  - Requires admin password for security
  - Updates all slots for the selected date

### Code Changes
- **app.js**:
  - `toggleDayVisibility()` - Main toggle function
  - `fetchDayVisibilityFromDB()` - Fetches visibility settings on load
  - `updateVisibilityButtonUI()` - Updates button display (color & text)
  - `renderTable()` - Filters hidden days from results display
  - `dayVisibilityCache` - Local cache of visibility settings

- **index.html**:
  - New toggle button in admin panel between date selector and load button
  - Shows current state: 🟢 ON (green) or 🔴 OFF (red)

## Troubleshooting

### Toggle button not appearing
- Make sure `is_day_visible` column was created successfully in Supabase
- Refresh the browser (clear cache if needed)
- Check browser console for errors (F12 → Console)

### "RPC error" when toggling
- Ensure admin password is correct
- Verify the `set_day_visibility` function exists in Supabase SQL Editor
- Check that RPC function has correct permissions (GRANT EXECUTE)

### Results still show even when toggled OFF
- Reload the page (F5)
- Check that `dayVisibilityCache` is populated (browser console: `console.log(dayVisibilityCache)`)
- Verify that the RPC updated the database (check Supabase dashboard → lottery_results table)

## Admin Workflow

1. **Hide results for a day**: 
   - Admin Panel → Select Date → Click 🟢 (turns to 🔴 OFF)
   - All users immediately see those results removed

2. **Show results again**: 
   - Admin Panel → Select same Date → Click 🔴 (turns to 🟢 ON)
   - All users immediately see those results restored

3. **Use case examples**:
   - Hide results if lottery is cancelled for that day
   - Hide results temporarily during dispute/audit
   - Hide future dates until official results are released
