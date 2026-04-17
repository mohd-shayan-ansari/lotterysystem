const path = require('path');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();

const PORT = Number(process.env.PORT || 8000);
const DB_PATH = path.join(__dirname, 'lottery.db');

const app = express();
app.use(express.json({ limit: '1mb' }));

const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS shared_state (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);
});

function dbAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (error, rows) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(rows);
        });
    });
}

function dbGet(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (error, row) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(row);
        });
    });
}

function dbRun(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function onRun(error) {
            if (error) {
                reject(error);
                return;
            }
            resolve(this);
        });
    });
}

function isValidKey(key) {
    return typeof key === 'string' && key.length > 0 && key.length <= 200;
}

app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'lottery-shared-state' });
});

app.get('/api/state', async(_req, res) => {
    try {
        const rows = await dbAll('SELECT key, value FROM shared_state');
        const result = {};
        for (const row of rows) {
            result[row.key] = row.value;
        }
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load shared state' });
    }
});

app.get('/api/state/:key', async(req, res) => {
    const key = req.params.key;
    if (!isValidKey(key)) {
        res.status(400).json({ error: 'Invalid key' });
        return;
    }

    try {
        const row = await dbGet('SELECT value FROM shared_state WHERE key = ?', [key]);
        if (!row) {
            res.status(404).json({ error: 'Key not found' });
            return;
        }
        res.json({ key, value: row.value });
    } catch (error) {
        res.status(500).json({ error: 'Failed to read key' });
    }
});

app.put('/api/state/:key', async(req, res) => {
    const key = req.params.key;
    const value = req.body ? req.body.value : undefined;

    if (!isValidKey(key)) {
        res.status(400).json({ error: 'Invalid key' });
        return;
    }

    if (typeof value !== 'string') {
        res.status(400).json({ error: 'Value must be a string' });
        return;
    }

    try {
        await dbRun(
            `
            INSERT INTO shared_state (key, value, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(key) DO UPDATE SET
                value = excluded.value,
                updated_at = CURRENT_TIMESTAMP
            `, [key, value]
        );
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save key' });
    }
});

app.delete('/api/state/:key', async(req, res) => {
    const key = req.params.key;
    if (!isValidKey(key)) {
        res.status(400).json({ error: 'Invalid key' });
        return;
    }

    try {
        await dbRun('DELETE FROM shared_state WHERE key = ?', [key]);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete key' });
    }
});

app.use(express.static(__dirname));

app.listen(PORT, () => {
    console.log(`Lottery server running at http://localhost:${PORT}`);
});