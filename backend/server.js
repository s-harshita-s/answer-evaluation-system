const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

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
        res.json({ token, user: { id: user.id, name: user.name, role: user.role, email: user.email, roll_number: user.roll_number, semester: user.semester } });
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

app.post('/api/questions/upload', authenticate, (req, res) => {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Forbidden' });
    
    const { title, questions } = req.body;
    if (!title || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ error: 'Title and Questions array are required' });
    }

    db.run(`INSERT INTO exams (teacher_id, title) VALUES (?, ?)`, [req.user.id, title], function(err) {
        if (err) return res.status(500).json({ error: 'Database error creating exam' });
        
        const examId = this.lastID;
        let completed = 0;
        let errors = false;

        db.serialize(() => {
            const stmt = db.prepare(`INSERT INTO questions (exam_id, teacher_id, question_text, model_answer) VALUES (?, ?, ?, ?)`);
            
            for (const q of questions) {
                stmt.run([examId, req.user.id, q.question_text, q.model_answer], (err) => {
                    if (err) errors = true;
                    completed++;
                    if (completed === questions.length) {
                        if (errors) {
                            res.status(500).json({ error: 'Partial success or database error' });
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

app.put('/api/exams/:id', authenticate, (req, res) => {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Forbidden' });
    const { title } = req.body;
    db.run(`UPDATE exams SET title = ? WHERE id = ? AND teacher_id = ?`, [title, req.params.id, req.user.id], function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ message: 'Exam updated successfully' });
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
                    body: JSON.stringify({
                        question: question.question_text,
                        model_answer: question.model_answer,
                        student_answer: answerData.student_answer
                    })
                });
                const evaluation = await aiResponse.json();

                await new Promise((resolve, reject) => {
                    db.run(`INSERT INTO submissions (student_id, question_id, student_answer, percentage, marks, result, semantic_score, keyword_score, grammar_score, feedback)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            req.user.id, question.id, answerData.student_answer,
                            evaluation.percentage, evaluation.marks, evaluation.result,
                            evaluation.semantic_score, evaluation.keyword_score, evaluation.grammar_score,
                            JSON.stringify(evaluation.feedback)
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

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
