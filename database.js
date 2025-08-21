const sqlite3 = require('sqlite3').verbose();
const path = require('node:path');
const { app } = require('electron');

// Get the user data path and ensure the database is stored there.
const dbPath = path.join(app.getPath('userData'), 'browser_data.db');

let db = null;

function initDb() {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('[DB Error]', err.message);
                reject(err);
            } else {
                console.log('[DB Info] Connected to the SQLite database.');
                createTables().then(resolve).catch(reject);
            }
        });
    });
}

function createTables() {
    const historySql = `
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT NOT NULL,
            title TEXT,
            timestamp INTEGER
        )`;

    const favoritesSql = `
        CREATE TABLE IF NOT EXISTS favorites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT NOT NULL UNIQUE,
            title TEXT
        )`;
    
    const downloadsSql = `
        CREATE TABLE IF NOT EXISTS downloads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            url TEXT NOT NULL,
            save_path TEXT NOT NULL,
            total_bytes INTEGER,
            state TEXT,
            timestamp INTEGER
        )`;

    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run(historySql, (err) => {
                if (err) return reject(err);
                console.log('[DB Info] "history" table is ready.');
            });
            db.run(favoritesSql, (err) => {
                if (err) return reject(err);
                console.log('[DB Info] "favorites" table is ready.');
            });
            db.run(downloadsSql, (err) => {
                if (err) return reject(err);
                console.log('[DB Info] "downloads" table is ready.');
                resolve();
            });
        });
    });
}

function addHistory(url, title) {
    if (!db || !url.startsWith('http')) return;
    const sql = `INSERT INTO history (url, title, timestamp) VALUES (?, ?, ?)`;
    db.run(sql, [url, title, Date.now()], function(err) {
        if (err) {
            return console.error('[DB Error]', err.message);
        }
    });
}

function addFavorite(url, title) {
    if (!db || !url.startsWith('http')) return;
    const sql = `INSERT OR IGNORE INTO favorites (url, title) VALUES (?, ?)`;
     db.run(sql, [url, title], function(err) {
        if (err) {
            return console.error('[DB Error]', err.message);
        }
    });
}

function getHistory() {
    return new Promise((resolve, reject) => {
        if (!db) return reject("Database not initialized.");
        const sql = `SELECT * FROM history ORDER BY timestamp DESC`;
        db.all(sql, [], (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

function getFavorites() {
    return new Promise((resolve, reject) => {
        if (!db) return reject("Database not initialized.");
        const sql = `SELECT * FROM favorites ORDER BY title ASC`;
        db.all(sql, [], (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

function deleteHistory(id) {
    if (!db) return;
    const sql = `DELETE FROM history WHERE id = ?`;
    db.run(sql, id, function(err) {
        if (err) {
            return console.error('[DB Error]', err.message);
        }
    });
}

function deleteFavorite(id) {
    if (!db) return;
    const sql = `DELETE FROM favorites WHERE id = ?`;
    db.run(sql, id, function(err) {
        if (err) {
            return console.error('[DB Error]', err.message);
        }
    });
}

function addDownload(details) {
    if (!db) return;
    const { filename, url, save_path, total_bytes, state } = details;
    const sql = `INSERT INTO downloads (filename, url, save_path, total_bytes, state, timestamp) VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(sql, [filename, url, save_path, total_bytes, state, Date.now()], function(err) {
        if (err) {
            return console.error('[DB Error] Failed to add download:', err.message);
        }
        console.log(`[DB Info] Download added with ID: ${this.lastID}`);
    });
}

function updateDownloadState(filename, state) {
    if (!db) return;
    const sql = `UPDATE downloads SET state = ? WHERE filename = ?`;
    db.run(sql, [state, filename], function(err) {
        if (err) {
            return console.error('[DB Error] Failed to update download state:', err.message);
        }
    });
}

function getDownloads() {
    return new Promise((resolve, reject) => {
        if (!db) return reject("Database not initialized.");
        const sql = `SELECT * FROM downloads ORDER BY timestamp DESC`;
        db.all(sql, [], (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

function deleteDownload(id) {
    if (!db) return;
    const sql = `DELETE FROM downloads WHERE id = ?`;
    db.run(sql, id, function(err) {
        if (err) {
            return console.error('[DB Error]', err.message);
        }
    });
}

module.exports = {
    initDb,
    addHistory,
    addFavorite,
    getHistory,
    getFavorites,
    deleteHistory,
    deleteFavorite,
    addDownload,
    getDownloads,
    updateDownloadState,
    deleteDownload
};
