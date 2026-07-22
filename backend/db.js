const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        
        // Create tables
        db.serialize(() => {
            // Users table
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL,
                roll_number TEXT,
                semester TEXT
            )`);
            
            // Alter table just in case it already exists without these columns
            db.run(`ALTER TABLE users ADD COLUMN roll_number TEXT`, (err) => { /* ignore if exists */ });
            db.run(`ALTER TABLE users ADD COLUMN semester TEXT`, (err) => { /* ignore if exists */ });
            // Exams table
            db.run(`CREATE TABLE IF NOT EXISTS exams (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                teacher_id INTEGER,
                title TEXT NOT NULL,
                notes_file TEXT,
                FOREIGN KEY (teacher_id) REFERENCES users (id)
            )`);

            // Questions table
            db.run(`CREATE TABLE IF NOT EXISTS questions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                exam_id INTEGER,
                teacher_id INTEGER,
                question_text TEXT NOT NULL,
                model_answer TEXT,
                FOREIGN KEY (teacher_id) REFERENCES users (id),
                FOREIGN KEY (exam_id) REFERENCES exams (id)
            )`);

            // Add exam_id to existing questions and migrate
            db.run(`ALTER TABLE questions ADD COLUMN exam_id INTEGER`, (err) => {
                // Always check for unmigrated questions, regardless of whether ALTER succeeded (it fails if column already exists)
                db.all(`SELECT * FROM questions WHERE exam_id IS NULL`, [], (err, rows) => {
                    if (!err && rows && rows.length > 0) {
                        console.log("Migrating existing questions to exams...");
                        const migrateNext = (index) => {
                            if (index >= rows.length) return;
                            const q = rows[index];
                            const title = q.question_text.length > 40 ? q.question_text.substring(0, 40) + "..." : q.question_text;
                            db.run(`INSERT INTO exams (teacher_id, title) VALUES (?, ?)`, [q.teacher_id, title], function(err) {
                                if (!err) {
                                    db.run(`UPDATE questions SET exam_id = ? WHERE id = ?`, [this.lastID, q.id], () => {
                                        migrateNext(index + 1);
                                    });
                                } else {
                                    migrateNext(index + 1);
                                }
                            });
                        };
                        migrateNext(0);
                    }
                });
            });

            // Add soft delete columns
            db.run(`ALTER TABLE exams ADD COLUMN is_deleted INTEGER DEFAULT 0`, (err) => {});
            db.run(`ALTER TABLE questions ADD COLUMN is_deleted INTEGER DEFAULT 0`, (err) => {});
            
            // Add notes_file column to exams (for existing databases)
            db.run(`ALTER TABLE exams ADD COLUMN notes_file TEXT`, (err) => {});

            // Submissions table
            db.run(`CREATE TABLE IF NOT EXISTS submissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER,
                question_id INTEGER,
                student_answer TEXT NOT NULL,
                percentage REAL,
                marks REAL,
                result TEXT,
                semantic_score REAL,
                keyword_score REAL,
                grammar_score REAL,
                feedback TEXT,
                reference_answer TEXT,
                FOREIGN KEY (student_id) REFERENCES users (id),
                FOREIGN KEY (question_id) REFERENCES questions (id)
            )`);
            
            // Add reference_answer column to submissions (for existing databases)
            db.run(`ALTER TABLE submissions ADD COLUMN reference_answer TEXT`, (err) => {});
        });
    }
});

module.exports = db;
