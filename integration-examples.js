// ================================
// FIREBASE INTEGRATION EXAMPLE
// ================================
// This is a reference file showing how to integrate Firebase
// Replace the LotteryData class in app.js with this Firebase version

/*
// 1. First, add Firebase to your HTML (in index.html):
<script type="module">
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
  import { getDatabase, ref, set, get, query, orderByChild, startAt, endAt, onValue } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";
  
  // Your Firebase configuration
  const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "your-app.firebaseapp.com",
    databaseURL: "https://your-app.firebaseio.com",
    projectId: "your-app-id",
    storageBucket: "your-app.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcdef123456"
  };

  const app = initializeApp(firebaseConfig);
  const database = getDatabase(app);
  
  // Make it globally available
  window.firebaseDB = database;
  window.firebaseRef = ref;
  window.firebaseSet = set;
  window.firebaseGet = get;
  window.firebaseOnValue = onValue;
</script>

// 2. Replace the LotteryData class with this Firebase version:

class LotteryDataFirebase {
    constructor() {
        this.db = window.firebaseDB;
        this.ref = window.firebaseRef;
        this.setFunc = window.firebaseSet;
        this.getFunc = window.firebaseGet;
        this.onValueFunc = window.firebaseOnValue;
        this.data = {};
        this.loadFromFirebase();
    }

    async loadFromFirebase() {
        try {
            const dbRef = this.ref(this.db, 'lotteryResults');
            const snapshot = await this.getFunc(dbRef);
            if (snapshot.exists()) {
                this.data = snapshot.val();
            } else {
                this.data = {};
            }
            // Trigger table refresh
            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;
            if (startDate && endDate) {
                filterResults();
            }
        } catch (error) {
            console.error('Error loading from Firebase:', error);
        }
    }

    async saveToFirebase() {
        try {
            const dbRef = this.ref(this.db, 'lotteryResults');
            await this.setFunc(dbRef, this.data);
        } catch (error) {
            console.error('Error saving to Firebase:', error);
        }
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
                for (const [time, numbers] of Object.entries(timeSlots)) {
                    results.push({
                        date,
                        time,
                        numbers,
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

    async saveResult(date, time, number) {
        if (!this.data[date]) {
            this.data[date] = {};
        }
        this.data[date][time] = number;
        await this.saveToFirebase();
    }

    getResult(date, time) {
        return this.data[date]?.[time] || null;
    }

    async deleteResult(date, time) {
        if (this.data[date]) {
            delete this.data[date][time];
            if (Object.keys(this.data[date]).length === 0) {
                delete this.data[date];
            }
            await this.saveToFirebase();
        }
    }

    getAllDates() {
        return Object.keys(this.data).sort();
    }

    // Real-time listener (optional)
    subscribeToUpdates(callback) {
        const dbRef = this.ref(this.db, 'lotteryResults');
        this.onValueFunc(dbRef, (snapshot) => {
            if (snapshot.exists()) {
                this.data = snapshot.val();
                callback(this.data);
            }
        });
    }
}

// Usage:
// const lotteryData = new LotteryDataFirebase();

*/

// ================================
// SUPABASE INTEGRATION EXAMPLE
// ================================
/*
// 1. Add Supabase to your HTML:
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

// 2. Initialize Supabase:
<script>
  const SUPABASE_URL = 'https://your-project.supabase.co';
  const SUPABASE_KEY = 'your-anon-key';
  
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  window.supabaseClient = supabase;
</script>

// 3. Create table in Supabase (SQL):
CREATE TABLE lottery_results (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  result TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date, time)
);

CREATE INDEX idx_lottery_date ON lottery_results(date);

// 4. Replace LotteryData class with Supabase version:

class LotteryDataSupabase {
    constructor() {
        this.supabase = window.supabaseClient;
        this.data = {};
        this.loadFromSupabase();
    }

    async loadFromSupabase() {
        try {
            const { data, error } = await this.supabase
                .from('lottery_results')
                .select('*')
                .order('date', { ascending: true })
                .order('time', { ascending: true });

            if (error) throw error;

            // Convert to internal format
            this.data = {};
            data.forEach(record => {
                if (!this.data[record.date]) {
                    this.data[record.date] = {};
                }
                this.data[record.date][record.time] = record.result;
            });

            console.log('Data loaded from Supabase');
        } catch (error) {
            console.error('Error loading from Supabase:', error);
        }
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
                for (const [time, result] of Object.entries(timeSlots)) {
                    results.push({
                        date,
                        time,
                        result,
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

    async saveResult(date, time, result) {
        try {
            const { data, error } = await this.supabase
                .from('lottery_results')
                .upsert(
                    {
                        date,
                        time,
                        result,
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: 'date,time' }
                );

            if (error) throw error;

            // Update local data
            if (!this.data[date]) {
                this.data[date] = {};
            }
            this.data[date][time] = result;

            console.log('Result saved to Supabase');
        } catch (error) {
            console.error('Error saving result:', error);
            throw error;
        }
    }

    getResult(date, time) {
        return this.data[date]?.[time] || null;
    }

    async deleteResult(date, time) {
        try {
            const { error } = await this.supabase
                .from('lottery_results')
                .delete()
                .eq('date', date)
                .eq('time', time);

            if (error) throw error;

            // Update local data
            if (this.data[date]) {
                delete this.data[date][time];
                if (Object.keys(this.data[date]).length === 0) {
                    delete this.data[date];
                }
            }

            console.log('Result deleted from Supabase');
        } catch (error) {
            console.error('Error deleting result:', error);
            throw error;
        }
    }

    getAllDates() {
        return Object.keys(this.data).sort();
    }

    // Real-time subscription
    subscribeToUpdates(callback) {
        this.supabase
            .channel('public:lottery_results')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'lottery_results' },
                (payload) => {
                    console.log('Real-time update:', payload);
                    this.loadFromSupabase().then(() => callback(this.data));
                }
            )
            .subscribe();
    }
}

// Usage:
// const lotteryData = new LotteryDataSupabase();

*/

// ================================
// BACKEND API INTEGRATION EXAMPLE
// ================================
/*
// This shows how to use a custom backend API instead of localStorage

class LotteryDataAPI {
    constructor(apiBaseUrl = 'https://api.example.com/lottery') {
        this.apiUrl = apiBaseUrl;
        this.data = {};
        this.loadFromAPI();
    }

    async loadFromAPI() {
        try {
            const response = await fetch(`${this.apiUrl}/results`);
            if (!response.ok) throw new Error('Failed to fetch results');
            
            const data = await response.json();
            
            // Convert array format to internal format if needed
            this.data = data.reduce((acc, record) => {
                if (!acc[record.date]) {
                    acc[record.date] = {};
                }
                acc[record.date][record.time] = record.result;
                return acc;
            }, {});

            console.log('Data loaded from API');
        } catch (error) {
            console.error('Error loading from API:', error);
        }
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
                for (const [time, result] of Object.entries(timeSlots)) {
                    results.push({
                        date,
                        time,
                        result,
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

    async saveResult(date, time, result) {
        try {
            const response = await fetch(`${this.apiUrl}/results`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                },
                body: JSON.stringify({
                    date,
                    time,
                    result,
                }),
            });

            if (!response.ok) throw new Error('Failed to save result');

            // Update local cache
            if (!this.data[date]) {
                this.data[date] = {};
            }
            this.data[date][time] = result;

            console.log('Result saved via API');
        } catch (error) {
            console.error('Error saving result:', error);
            throw error;
        }
    }

    getResult(date, time) {
        return this.data[date]?.[time] || null;
    }

    async deleteResult(date, time) {
        try {
            const response = await fetch(
                `${this.apiUrl}/results/${date}/${time}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    },
                }
            );

            if (!response.ok) throw new Error('Failed to delete result');

            // Update local cache
            if (this.data[date]) {
                delete this.data[date][time];
                if (Object.keys(this.data[date]).length === 0) {
                    delete this.data[date];
                }
            }

            console.log('Result deleted via API');
        } catch (error) {
            console.error('Error deleting result:', error);
            throw error;
        }
    }

    getAllDates() {
        return Object.keys(this.data).sort();
    }
}

// Usage:
// const lotteryData = new LotteryDataAPI('https://api.example.com/lottery');

*/

// ================================
// MIGRATION CHECKLIST
// ================================
/*

When migrating from localStorage to a backend service:

1. CHOOSE YOUR BACKEND:
   - [ ] Firebase Realtime Database (easiest, real-time sync)
   - [ ] Supabase PostgreSQL (more control, SQL-based)
   - [ ] Custom Node.js/Python API (most flexible)

2. SET UP AUTHENTICATION:
   - [ ] Create user accounts / authentication system
   - [ ] Implement JWT tokens or OAuth
   - [ ] Secure admin routes / endpoints
   - [ ] Add role-based access control (RBAC)

3. PREPARE DATABASE:
   - [ ] Design schema for lottery results
   - [ ] Create indexes for fast queries
   - [ ] Set up backup strategy
   - [ ] Configure replication/redundancy

4. UPDATE CODE:
   - [ ] Replace LotteryData class with backend version
   - [ ] Add error handling for network issues
   - [ ] Implement retry logic for failed requests
   - [ ] Add loading states to UI
   - [ ] Implement offline mode if needed

5. SECURITY:
   - [ ] Validate all inputs server-side
   - [ ] Implement rate limiting
   - [ ] Add CORS configuration
   - [ ] Use HTTPS only
   - [ ] Sanitize all outputs
   - [ ] Add admin authentication checks
   - [ ] Log all admin actions

6. TESTING:
   - [ ] Test with various network conditions
   - [ ] Test concurrent updates
   - [ ] Test error scenarios
   - [ ] Penetration test admin panel
   - [ ] Load test with expected users

7. DEPLOYMENT:
   - [ ] Set up CI/CD pipeline
   - [ ] Configure environment variables
   - [ ] Set up monitoring/logging
   - [ ] Create deployment documentation
   - [ ] Plan rollback strategy

8. DOCUMENTATION:
   - [ ] Update README with new architecture
   - [ ] Document API endpoints
   - [ ] Create admin user guide
   - [ ] Document database schema

*/