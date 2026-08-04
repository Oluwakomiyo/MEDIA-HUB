const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

async function setupDatabase() {
    // Connect to the database file
    const db = await open({
        filename: './database.db',
        driver: sqlite3.Database
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'admin',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 1. CREATE PROJECTS TABLE
    await db.exec(`
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            category TEXT,
            location TEXT,
            client_name TEXT,
            completion_date DATE,
            is_featured INTEGER DEFAULT 0,
            is_award_winning INTEGER DEFAULT 0,
            is_landmark INTEGER DEFAULT 0,
            is_recently_completed INTEGER DEFAULT 0,
            is_premium INTEGER DEFAULT 0,
            project_manager TEXT,
            project_value TEXT,
            partner TEXT,
            tags TEXT -- For our new search feature
        )
    `);

    // 2. CREATE IMAGES TABLE (The missing piece!)
    await db.exec(`
        CREATE TABLE IF NOT EXISTS images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            file_path TEXT NOT NULL,
            is_cover INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
        )
    `);

    const adminExists = await db.get('SELECT * FROM users WHERE username = ?', ['admin']);
    if (!adminExists) {
        const bcrypt = require('bcryptjs');
        const hash = await bcrypt.hash('admin123', 10); // Default password: admin123
        await db.run('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', ['admin', hash, 'admin']);
        console.log("Seed: Created default admin user (admin / admin123) ✅");
    }

    // 3. CREATE ACTIVITY LOGS TABLE
    await db.exec(`
        CREATE TABLE IF NOT EXISTS activity_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action_type TEXT NOT NULL,
            project_name TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // --- MIGRATION LOGIC ---
    // This part ensures that if your database already exists, 
    // it adds the new columns without deleting your old data.
    const newColumns = [
        { name: 'project_manager', type: 'TEXT' },
        { name: 'project_value', type: 'TEXT' },
        { name: 'partner', type: 'TEXT' },
        { name: 'tags', type: 'TEXT' },
        { name: 'is_award_winning', type: 'INTEGER DEFAULT 0' },
        { name: 'is_landmark', type: 'INTEGER DEFAULT 0' },
        { name: 'is_recently_completed', type: 'INTEGER DEFAULT 0' },
        { name: 'is_premium', type: 'INTEGER DEFAULT 0' }
    ];

    for (const col of newColumns) {
        try {
            await db.exec(`ALTER TABLE projects ADD COLUMN ${col.name} ${col.type}`);
            console.log(`Migration: Added column ${col.name} to projects.`);
        } catch (err) {
            // Error usually means column already exists, which is fine!
        }
    }

    console.log("Database Schema Verified & Tables Ready ✅");
    return db;
}

module.exports = setupDatabase;