const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// Ensure uploads folder exists in workspace
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded notes files statically
app.use('/uploads', express.static(uploadsDir));

// Multer storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

const JWT_SECRET = 'your_jwt_secret_here';

// --- AUTH ROUTES ---

app.post('/api/auth/register', async (req, res) => {
    const { name, email, password, role, roll_number, semester } = req.body;
    if (!name || !email || !password || !role) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run(`INSERT INTO users (name, email, password, role, roll_number, semester) VALUES (?, ?, ?, ?, ?, ?)`,
            [name, email, hashedPassword, role, roll_number || null, semester || null],
            function (err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) {
                        return res.status(400).json({ error: 'Email already exists' });
                    }
                    return res.status(500).json({ error: 'Database error' });
                }
                res.status(201).json({ message: 'User registered successfully', userId: this.lastID });
            }
        );
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!user) return res.status(401).json({ error: 'Invalid email or password' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid email or password' });

        const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ 
            token, 
            user: { 
                id: user.id, 
                name: user.name, 
                role: user.role, 
                email: user.email, 
                roll_number: user.roll_number, 
                semester: user.semester,
                department: user.department || null,
                avatar: user.avatar || null
            } 
        });
    });
});

// Middleware to verify token
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Invalid token' });
        req.user = decoded;
        next();
    });
};

// --- USER PROFILE ROUTES ---

app.get('/api/users/profile', authenticate, (req, res) => {
    db.get(`SELECT name, roll_number, semester, department, avatar FROM users WHERE id = ?`, [req.user.id], (err, user) => {
        if (err || !user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    });
});

app.put('/api/users/profile', authenticate, (req, res) => {
    const { name, roll_number, semester, department, avatar } = req.body;
    db.run(
        `UPDATE users SET name = ?, roll_number = ?, semester = ?, department = ?, avatar = ? WHERE id = ?`,
        [name, roll_number, semester, department, avatar || null, req.user.id],
        function(err) {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ message: 'Profile updated successfully' });
        }
    );
});

// --- QUESTION ROUTES ---

app.post('/api/questions', authenticate, (req, res) => {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Forbidden' });
    
    const { question_text, model_answer } = req.body;
    const title = question_text.length > 40 ? question_text.substring(0, 40) + "..." : question_text;
    
    db.run(`INSERT INTO exams (teacher_id, title) VALUES (?, ?)`, [req.user.id, title], function(err) {
        if (err) return res.status(500).json({ error: 'Database error creating exam' });
        
        const examId = this.lastID;
        db.run(`INSERT INTO questions (exam_id, teacher_id, question_text, model_answer) VALUES (?, ?, ?, ?)`,
            [examId, req.user.id, question_text, model_answer],
            function (err) {
                if (err) return res.status(500).json({ error: 'Database error' });
                res.status(201).json({ message: 'Question created successfully', questionId: this.lastID, examId });
            }
        );
    });
});

app.post('/api/exams/:id/questions', authenticate, (req, res) => {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Forbidden' });
    
    const examId = req.params.id;
    const { question_text, model_answer } = req.body;
    if (!question_text) {
        return res.status(400).json({ error: 'Question text is required' });
    }

    db.run(
        `INSERT INTO questions (exam_id, teacher_id, question_text, model_answer) VALUES (?, ?, ?, ?)`,
        [examId, req.user.id, question_text, model_answer || ''],
        function(err) {
            if (err) return res.status(500).json({ error: 'Database error adding question' });
            res.status(201).json({ message: 'Question added successfully', questionId: this.lastID });
        }
    );
});

app.post('/api/questions/upload', authenticate, upload.single('notes'), (req, res) => {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Forbidden' });
    
    const { title, questions } = req.body;
    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }

    let parsedQuestions = [];
    try {
        parsedQuestions = typeof questions === 'string' ? JSON.parse(questions) : questions;
    } catch (e) {
        return res.status(400).json({ error: 'Invalid questions JSON format' });
    }

    if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
        return res.status(400).json({ error: 'Questions list is empty' });
    }

    const notesFilename = req.file ? req.file.filename : null;
    const notesPath = req.file ? req.file.path : null;

    db.run(`INSERT INTO exams (teacher_id, title, notes_file) VALUES (?, ?, ?)`, [req.user.id, title, notesFilename], function(err) {
        if (err) return res.status(500).json({ error: 'Database error creating exam' });
        
        const examId = this.lastID;
        let completed = 0;
        let dbErrors = false;

        db.serialize(() => {
            const stmt = db.prepare(`INSERT INTO questions (exam_id, teacher_id, question_text, model_answer) VALUES (?, ?, ?, ?)`);
            
            for (const q of parsedQuestions) {
                stmt.run([examId, req.user.id, q.question_text, q.model_answer || ''], (err) => {
                    if (err) dbErrors = true;
                    completed++;
                    
                    if (completed === parsedQuestions.length) {
                        if (dbErrors) {
                            return res.status(500).json({ error: 'Database error inserting questions' });
                        }
                        
                        if (notesPath) {
                            // Notify AI service to index notes
                            fetch('http://127.0.0.1:8000/index-notes', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                signal: AbortSignal.timeout(300000),
                                body: JSON.stringify({
                                    exam_id: examId,
                                    notes_path: notesPath
                                })
                            })
                            .then(async (aiRes) => {
                                const errText = await aiRes.text();
                                let data;
                                try {
                                    data = JSON.parse(errText);
                                } catch (e) {}
                                if (!aiRes.ok) {
                                    throw new Error(data?.error || 'AI Service indexing failed');
                                }
                                return data;
                            })
                            .then(() => {
                                res.status(201).json({ message: 'Exam created and notes indexed successfully', examId });
                            })
                            .catch((aiErr) => {
                                console.error(aiErr);
                                res.status(400).json({ error: aiErr.message || 'Exam created, but AI failed to index notes.' });
                            });
                        } else {
                            res.status(201).json({ message: 'Exams uploaded successfully', examId });
                        }
                    }
                });
            }
            stmt.finalize();
        });
    });
});

app.post('/api/exams/create-with-notes', authenticate, upload.single('notes'), (req, res) => {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Forbidden' });
    
    const { title, questions } = req.body;
    if (!title || !req.file) {
        return res.status(400).json({ error: 'Title and Unit Notes file are required' });
    }

    let parsedQuestions = [];
    try {
        parsedQuestions = JSON.parse(questions || '[]');
    } catch (e) {
        return res.status(400).json({ error: 'Invalid questions JSON format' });
    }

    if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
        return res.status(400).json({ error: 'At least one question is required' });
    }

    const notesFilename = req.file.filename;
    const notesPath = req.file.path;

    db.run(`INSERT INTO exams (teacher_id, title, notes_file) VALUES (?, ?, ?)`, [req.user.id, title, notesFilename], function(err) {
        if (err) return res.status(500).json({ error: 'Database error creating exam' });
        
        const examId = this.lastID;
        let completed = 0;
        let dbErrors = false;
        
        db.serialize(() => {
            const stmt = db.prepare(`INSERT INTO questions (exam_id, teacher_id, question_text, model_answer) VALUES (?, ?, ?, ?)`);
            
            for (const q of parsedQuestions) {
                stmt.run([examId, req.user.id, q.question_text, ''], (err) => {
                    if (err) dbErrors = true;
                    completed++;
                    
                    if (completed === parsedQuestions.length) {
                        if (dbErrors) {
                            return res.status(500).json({ error: 'Database error inserting questions' });
                        }
                        
                        // Notify Python AI service to clean, chunk, embed, and index notes
                        fetch('http://127.0.0.1:8000/index-notes', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            signal: AbortSignal.timeout(300000),
                            body: JSON.stringify({
                                exam_id: examId,
                                notes_path: notesPath
                            })
                        })
                        .then(async (aiRes) => {
                            const errText = await aiRes.text();
                            let data;
                            try {
                                data = JSON.parse(errText);
                            } catch (e) {}
                            if (!aiRes.ok) {
                                throw new Error(data?.error || 'AI Service indexing failed');
                            }
                            return data;
                        })
                        .then((aiData) => {
                            res.status(201).json({ message: 'Exam created and unit notes indexed successfully', examId });
                        })
                        .catch((aiErr) => {
                            console.error("AI Service Indexing Error:", aiErr.message);
                            res.status(400).json({ error: aiErr.message || 'Exam created, but AI failed to index unit notes.' });
                        });
                    }
                });
            }
            stmt.finalize();
        });
    });
});

app.get('/api/exams', authenticate, (req, res) => {
    db.all(`SELECT * FROM exams WHERE IFNULL(is_deleted, 0) = 0`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

app.get('/api/exams/:id/questions', authenticate, (req, res) => {
    const examId = req.params.id;
    db.all(`SELECT id, question_text, exam_id, teacher_id ${req.user.role === 'teacher' ? ', model_answer' : ''} FROM questions WHERE exam_id = ? AND IFNULL(is_deleted, 0) = 0`, [examId], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

app.get('/api/questions', authenticate, (req, res) => {
    // If student, don't send model answers. If teacher, send everything.
    db.all(`SELECT id, question_text, exam_id, teacher_id ${req.user.role === 'teacher' ? ', model_answer' : ''} FROM questions WHERE IFNULL(is_deleted, 0) = 0`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

app.delete('/api/exams/:id', authenticate, (req, res) => {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Forbidden' });
    db.run(`UPDATE exams SET is_deleted = 1 WHERE id = ? AND teacher_id = ?`, [req.params.id, req.user.id], function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        db.run(`UPDATE questions SET is_deleted = 1 WHERE exam_id = ?`, [req.params.id]);
        res.json({ message: 'Exam deleted successfully' });
    });
});

app.put('/api/exams/:id', authenticate, upload.single('notes'), (req, res) => {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Forbidden' });
    const { title } = req.body;
    const examId = req.params.id;

    if (req.file) {
        const notesFilename = req.file.filename;
        const notesPath = req.file.path;

        db.run(`UPDATE exams SET title = ?, notes_file = ? WHERE id = ? AND teacher_id = ?`, 
            [title, notesFilename, examId, req.user.id], 
            function(err) {
                if (err) return res.status(500).json({ error: 'Database error updating exam notes' });

                // Notify AI service to clean, chunk, embed and index notes
                fetch('http://127.0.0.1:8000/index-notes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        exam_id: parseInt(examId),
                        notes_path: notesPath
                    })
                })
                .then(async (aiRes) => {
                    const errText = await aiRes.text();
                    let data;
                    try {
                        data = JSON.parse(errText);
                    } catch (e) {}
                    if (!aiRes.ok) {
                        throw new Error(data?.error || 'AI Service indexing failed');
                    }
                    return data;
                })
                .then((aiData) => {
                    res.json({ message: 'Exam and notes updated and indexed successfully' });
                })
                .catch((aiErr) => {
                    console.error("AI Service Indexing Error during edit:", aiErr.message);
                    res.status(400).json({ error: aiErr.message || 'Exam updated, but AI failed to index new notes.' });
                });
            }
        );
    } else {
        db.run(`UPDATE exams SET title = ? WHERE id = ? AND teacher_id = ?`, [title, examId, req.user.id], function(err) {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ message: 'Exam updated successfully' });
        });
    }
});

app.post('/api/exams/:id/reindex', authenticate, (req, res) => {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Forbidden' });
    
    const examId = req.params.id;
    db.get(`SELECT * FROM exams WHERE id = ? AND IFNULL(is_deleted, 0) = 0`, [examId], (err, exam) => {
        if (err || !exam) return res.status(404).json({ error: 'Exam not found' });
        if (!exam.notes_file) return res.status(400).json({ error: 'No unit notes file associated with this exam' });
        
        const notesPath = path.join(uploadsDir, exam.notes_file);
        
        fetch('http://127.0.0.1:8000/index-notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                exam_id: parseInt(examId),
                notes_path: notesPath
            })
        })
        .then(async (aiRes) => {
            const errText = await aiRes.text();
            let data;
            try { data = JSON.parse(errText); } catch (e) {}
            if (!aiRes.ok) {
                throw new Error(data?.error || 'AI Service indexing failed');
            }
            return data;
        })
        .then((aiData) => {
            res.json({ message: 'Exam notes re-indexed successfully', chunks: aiData.chunks_count });
        })
        .catch((aiErr) => {
            console.error(aiErr);
            res.status(400).json({ error: aiErr.message || 'AI failed to index unit notes.' });
        });
    });
});

app.delete('/api/questions/:id', authenticate, (req, res) => {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Forbidden' });
    db.run(`UPDATE questions SET is_deleted = 1 WHERE id = ? AND teacher_id = ?`, [req.params.id, req.user.id], function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ message: 'Question deleted successfully' });
    });
});

app.put('/api/questions/:id', authenticate, (req, res) => {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Forbidden' });
    const { question_text, model_answer } = req.body;
    db.run(`UPDATE questions SET question_text = ?, model_answer = ? WHERE id = ? AND teacher_id = ?`, [question_text, model_answer, req.params.id, req.user.id], function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ message: 'Question updated successfully' });
    });
});

// --- SUBMISSION ROUTES ---

app.post('/api/exams/:id/submit', authenticate, async (req, res) => {
    if (req.user.role !== 'student') return res.status(403).json({ error: 'Forbidden' });

    const examId = req.params.id;
    const { answers } = req.body; // Array of { question_id, student_answer }

    if (!Array.isArray(answers) || answers.length === 0) {
        return res.status(400).json({ error: 'Answers array is required' });
    }

    db.get(`SELECT * FROM exams WHERE id = ?`, [examId], (err, exam) => {
        if (err || !exam) return res.status(404).json({ error: 'Exam not found' });

        const notesPath = exam.notes_file ? path.join(uploadsDir, exam.notes_file) : null;

        db.all(`SELECT * FROM questions WHERE exam_id = ?`, [examId], async (err, questions) => {
            if (err || !questions.length) return res.status(404).json({ error: 'Exam or questions not found' });

            const results = [];
            let errorsOccurred = false;

            for (const answerData of answers) {
                const question = questions.find(q => q.id === answerData.question_id);
                if (!question) continue;

                try {
                    const aiResponse = await fetch('http://127.0.0.1:8000/evaluate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        signal: AbortSignal.timeout(300000),
                        body: JSON.stringify({
                            exam_id: parseInt(examId),
                            question: question.question_text,
                            student_answer: answerData.student_answer,
                            model_answer: question.model_answer,
                            notes_path: notesPath
                        })
                    });
                    const evaluation = await aiResponse.json();
                    const referenceAnswer = evaluation.reference_answer || '';

                    await new Promise((resolve, reject) => {
                        db.run(`INSERT INTO submissions (student_id, question_id, student_answer, percentage, marks, result, semantic_score, keyword_score, grammar_score, feedback, reference_answer)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [
                                req.user.id, question.id, answerData.student_answer,
                                evaluation.percentage, evaluation.marks, evaluation.result,
                                evaluation.semantic_score, evaluation.keyword_score, evaluation.grammar_score,
                                JSON.stringify(evaluation.feedback), referenceAnswer
                            ],
                            function (err) {
                                if (err) {
                                    errorsOccurred = true;
                                    reject(err);
                                } else {
                                    results.push({ question_id: question.id, submission_id: this.lastID, evaluation });
                                    resolve();
                                }
                            }
                        );
                    }).catch(e => console.error(e));
                } catch (error) {
                    console.error("AI Service Error:", error);
                    errorsOccurred = true;
                }
            }

            if (results.length === 0 && errorsOccurred) {
                 return res.status(500).json({ error: 'Failed to evaluate any answers. Ensure AI service is running.' });
            }
            
            res.status(201).json({ message: 'Exam submitted successfully', results });
        });
    });
});

app.get('/api/submissions', authenticate, (req, res) => {
    if (req.user.role === 'teacher') {
        const query = `
            SELECT s.*, u.name as student_name, u.roll_number, u.semester, q.question_text, e.title as exam_title, e.id as exam_id
            FROM submissions s 
            JOIN users u ON s.student_id = u.id 
            JOIN questions q ON s.question_id = q.id
            JOIN exams e ON q.exam_id = e.id
        `;
        db.all(query, [], (err, rows) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json(rows);
        });
    } else {
        const query = `
            SELECT s.*, q.question_text, e.title as exam_title, e.id as exam_id
            FROM submissions s 
            JOIN questions q ON s.question_id = q.id
            JOIN exams e ON q.exam_id = e.id
            WHERE s.student_id = ?
        `;
        db.all(query, [req.user.id], (err, rows) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json(rows);
        });
    }
});

app.delete('/api/submissions/:id', authenticate, (req, res) => {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Forbidden' });

    const submissionId = parseInt(req.params.id, 10);
    if (isNaN(submissionId)) {
        return res.status(400).json({ error: 'Invalid submission ID' });
    }

    // Check if submission exists
    db.get('SELECT * FROM submissions WHERE id = ?', [submissionId], (err, row) => {
        if (err) {
            console.error('Database error checking submission:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (!row) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        // Delete the submission
        db.run('DELETE FROM submissions WHERE id = ?', [submissionId], function(err) {
            if (err) {
                console.error('Database error deleting submission:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ message: 'Submission deleted successfully' });
        });
    });
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
    
    // Trigger auto-indexing of unit notes on startup
    console.log("Triggering auto-indexing of all existing unit notes...");
    fetch('http://127.0.0.1:8000/auto-index-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(300000)
    })
    .then(res => res.json())
    .then(data => {
        console.log("Startup Auto-Indexing Response:", data);
    })
    .catch(err => {
        console.error("Startup Auto-Indexing Error:", err.message);
    });
});
