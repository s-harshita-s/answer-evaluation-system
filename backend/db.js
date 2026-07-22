const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle pg client', err);
});

// Helper to convert SQLite '?' placeholders to PostgreSQL '$1, $2...'
// and standard SQL function translation.
function convertSql(sql) {
    let index = 1;
    let pgSql = sql.replace(/\?/g, () => `$${index++}`);
    
    // Replace IFNULL with COALESCE
    pgSql = pgSql.replace(/IFNULL/gi, 'COALESCE');
    
    // Append RETURNING id to INSERT statements if not present
    if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING')) {
        pgSql += ' RETURNING id';
    }
    
    return pgSql;
}

function standardizeError(err) {
    if (err && err.code === '23505') {
        err.message = 'UNIQUE constraint failed: ' + (err.detail || '');
    }
    return err;
}

const db = {
    run(sql, params, callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        if (!params) params = [];
        const pgSql = convertSql(sql);
        pool.query(pgSql, params, (err, res) => {
            if (callback) {
                const context = {
                    lastID: res && res.rows && res.rows[0] ? res.rows[0].id : null,
                    changes: res ? res.rowCount : 0
                };
                callback.call(context, standardizeError(err));
            }
        });
    },
    get(sql, params, callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        if (!params) params = [];
        const pgSql = convertSql(sql);
        pool.query(pgSql, params, (err, res) => {
            if (callback) {
                callback(standardizeError(err), res && res.rows && res.rows.length > 0 ? res.rows[0] : null);
            }
        });
    },
    all(sql, params, callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        if (!params) params = [];
        const pgSql = convertSql(sql);
        pool.query(pgSql, params, (err, res) => {
            if (callback) {
                callback(standardizeError(err), res && res.rows ? res.rows : []);
            }
        });
    },
    serialize(callback) {
        callback();
    },
    prepare(sql) {
        const pgSql = convertSql(sql);
        return {
            run(params, callback) {
                if (typeof params === 'function') {
                    callback = params;
                    params = [];
                }
                if (!params) params = [];
                pool.query(pgSql, params, (err, res) => {
                    if (callback) {
                        const context = {
                            lastID: res && res.rows && res.rows[0] ? res.rows[0].id : null,
                            changes: res ? res.rowCount : 0
                        };
                        callback.call(context, standardizeError(err));
                    }
                });
            },
            finalize(callback) {
                if (callback) callback();
            }
        };
    }
};

console.log('Connecting to PostgreSQL database...');
pool.connect((err, client, release) => {
    if (err) {
        console.error('Error connecting to PostgreSQL database:', err.message);
    } else {
        console.log('Connected to the PostgreSQL database.');
        release();
        
        // Initialize tables
        initializeTables();
    }
});

function initializeTables() {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        roll_number TEXT,
        semester TEXT,
        department TEXT,
        avatar TEXT
    )`, (err) => {
        if (err) console.error("Error creating users table:", err);
        
        db.run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS roll_number TEXT`);
        db.run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS semester TEXT`);
        db.run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS department TEXT`);
        db.run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT`);
        
        db.run(`CREATE TABLE IF NOT EXISTS exams (
            id SERIAL PRIMARY KEY,
            teacher_id INTEGER REFERENCES users(id),
            title TEXT NOT NULL,
            notes_file TEXT,
            is_deleted INTEGER DEFAULT 0
        )`, (err) => {
            if (err) console.error("Error creating exams table:", err);
            
            db.run(`ALTER TABLE exams ADD COLUMN IF NOT EXISTS notes_file TEXT`);
            
            db.run(`CREATE TABLE IF NOT EXISTS questions (
                id SERIAL PRIMARY KEY,
                exam_id INTEGER REFERENCES exams(id),
                teacher_id INTEGER REFERENCES users(id),
                question_text TEXT NOT NULL,
                model_answer TEXT NOT NULL,
                is_deleted INTEGER DEFAULT 0
            )`, (err) => {
                if (err) console.error("Error creating questions table:", err);
                
                db.run(`CREATE TABLE IF NOT EXISTS submissions (
                    id SERIAL PRIMARY KEY,
                    student_id INTEGER REFERENCES users(id),
                    question_id INTEGER REFERENCES questions(id),
                    student_answer TEXT NOT NULL,
                    percentage REAL,
                    marks REAL,
                    result TEXT,
                    semantic_score REAL,
                    keyword_score REAL,
                    grammar_score REAL,
                    feedback TEXT
                )`, (err) => {
                    if (err) console.error("Error creating submissions table:", err);
                    else console.log("PostgreSQL database tables initialized successfully.");
                });
            });
        });
    });
}

module.exports = db;
