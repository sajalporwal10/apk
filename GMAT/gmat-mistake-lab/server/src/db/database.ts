// Database connection and initialization for GMAT Mistake Lab
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database file path
const DB_PATH = join(__dirname, '../../data/gmat_lab.db');

// Create database instance
let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
    if (!db) {
        db = new Database(DB_PATH);
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
    }
    return db;
}

export function initializeDatabase(): void {
    const database = getDatabase();

    // Read and execute schema
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');

    // Execute schema (SQLite can handle multiple statements with exec)
    database.exec(schema);

    console.log('✅ Database initialized successfully');
}

export function closeDatabase(): void {
    if (db) {
        db.close();
        db = null;
    }
}

// Export for type inference
export type DatabaseType = Database.Database;
