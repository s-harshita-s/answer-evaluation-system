import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LogOut, Plus, Users, BookOpen } from 'lucide-react';

export default function TeacherDashboard() {
  const [exams, setExams] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [newQ, setNewQ] = useState({ question_text: '', model_answer: '' });
  const [uploadData, setUploadData] = useState({ title: '', questions: '', answers: '' });
  const navigate = useNavigate();
  const userName = localStorage.getItem('name');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    try {
      const eRes = await axios.get('http://localhost:5000/api/exams', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExams(eRes.data);

      const sRes = await axios.get('http://localhost:5000/api/submissions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubmissions(sRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      await axios.post('http://localhost:5000/api/questions', newQ, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowAdd(false);
      setNewQ({ question_text: '', model_answer: '' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    try {
      const qLines = uploadData.questions.split('\n').filter(l => l.trim());
      const aLines = uploadData.answers.split('\n').filter(l => l.trim());
      
      const qMap = {};
      qLines.forEach(l => {
        const match = l.match(/^(\d+),\s*(.*)$/);
        if (match) qMap[match[1]] = match[2];
      });

      const parsedQuestions = [];
      aLines.forEach(l => {
        const match = l.match(/^(\d+),\s*(.*)$/);
        if (match && qMap[match[1]]) {
          parsedQuestions.push({
            question_text: qMap[match[1]],
            model_answer: match[2]
          });
        }
      });

      if (parsedQuestions.length === 0) {
        alert("Could not parse any matching questions and answers. Ensure they start with numbers like '1, question'.");
        return;
      }

      if (!uploadData.title.trim()) {
        alert("Please enter an Exam Title.");
        return;
      }

      await axios.post('http://localhost:5000/api/questions/upload', { title: uploadData.title, questions: parsedQuestions }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowUpload(false);
      setUploadData({ title: '', questions: '', answers: '' });
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Error uploading exams.");
    }
  };

  return (
    <div style={{ padding: '40px 5%', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <h2>Teacher Portal <span style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>| {userName}</span></h2>
        <button onClick={handleLogout} className="btn-secondary" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LogOut size={18} /> Logout
        </button>
      </header>

      {/* Analytics Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <div 
          className="glass-panel" 
          onClick={() => navigate('/teacher/exams')}
          style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', transition: 'transform 0.2s' }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <div style={{ background: '#e0f2fe', padding: '15px', borderRadius: '12px', color: 'var(--accent-blue)' }}><BookOpen /></div>
          <div>
            <h3 style={{ fontSize: '1.8rem', margin: 0 }}>{exams.length}</h3>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>Active Exams (Manage)</p>
          </div>
        </div>
        <div 
          className="glass-panel" 
          onClick={() => {
            const el = document.getElementById('submissions-table');
            if (el) {
              const y = el.getBoundingClientRect().top + window.pageYOffset - 20;
              window.scrollTo({ top: y, behavior: 'smooth' });
            }
          }}
          style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', transition: 'transform 0.2s' }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <div style={{ background: '#fce7f3', padding: '15px', borderRadius: '12px', color: 'var(--accent-pink)' }}><Users /></div>
          <div>
            <h3 style={{ fontSize: '1.8rem', margin: 0 }}>{submissions.length}</h3>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>Total Submissions</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.5rem' }}>Exam Management</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => { setShowUpload(false); setShowAdd(!showAdd); }} className="btn-secondary" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} /> Create Exam
          </button>
          <button onClick={() => { setShowAdd(false); setShowUpload(!showUpload); }} className="btn-primary" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Upload Exams
          </button>
        </div>
      </div>

      {showAdd && (
        <form onSubmit={handleCreateQuestion} className="glass-panel" style={{ padding: '24px', marginBottom: '30px' }}>
          <h4 style={{ marginBottom: '15px' }}>New Question / Exam</h4>
          <textarea
            className="input-field"
            placeholder="Enter Question Text"
            value={newQ.question_text}
            onChange={(e) => setNewQ({...newQ, question_text: e.target.value})}
            required
            rows={3}
            style={{ marginBottom: '15px', resize: 'vertical' }}
          />
          <textarea
            className="input-field"
            placeholder="Enter Model Answer (used by AI for grading)"
            value={newQ.model_answer}
            onChange={(e) => setNewQ({...newQ, model_answer: e.target.value})}
            required
            rows={4}
            style={{ marginBottom: '15px', resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="btn-primary" style={{ padding: '10px 20px' }}>Save Exam</button>
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary" style={{ padding: '10px 20px' }}>Cancel</button>
          </div>
        </form>
      )}

      {showUpload && (
        <form onSubmit={handleUpload} className="glass-panel" style={{ padding: '24px', marginBottom: '30px' }}>
          <h4 style={{ marginBottom: '15px' }}>Upload Exams (Bulk)</h4>
          <input
            type="text"
            className="input-field"
            placeholder="Exam Title (e.g. Midterm Computer Science)"
            value={uploadData.title}
            onChange={(e) => setUploadData({...uploadData, title: e.target.value})}
            required
            style={{ marginBottom: '15px' }}
          />
          <p style={{ color: 'var(--text-muted)', marginBottom: '15px', fontSize: '0.9rem' }}>Format: <code>1, question text</code> in the first box and <code>1, answer text</code> in the second box.</p>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Questions</label>
              <textarea
                className="input-field"
                placeholder="1, What is inheritance?&#10;2, What is data science?"
                value={uploadData.questions}
                onChange={(e) => setUploadData({...uploadData, questions: e.target.value})}
                required
                rows={6}
                style={{ resize: 'vertical' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Model Answers</label>
              <textarea
                className="input-field"
                placeholder="1, Inheritance is when child class inherits...&#10;2, Branch of AI..."
                value={uploadData.answers}
                onChange={(e) => setUploadData({...uploadData, answers: e.target.value})}
                required
                rows={6}
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="btn-primary" style={{ padding: '10px 20px' }}>Upload</button>
            <button type="button" onClick={() => setShowUpload(false)} className="btn-secondary" style={{ padding: '10px 20px' }}>Cancel</button>
          </div>
        </form>
      )}

      <h3 id="submissions-table" style={{ fontSize: '1.5rem', marginTop: '40px', marginBottom: '20px' }}>Recent Student Submissions</h3>
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid #eaeaea' }}>
              <th style={{ padding: '15px 20px' }}>Student</th>
              <th style={{ padding: '15px 20px' }}>Roll No.</th>
              <th style={{ padding: '15px 20px' }}>Semester</th>
              <th style={{ padding: '15px 20px' }}>Exam / Question</th>
              <th style={{ padding: '15px 20px' }}>Score</th>
              <th style={{ padding: '15px 20px' }}>Result</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map(sub => (
              <tr key={sub.id} style={{ borderBottom: '1px solid #eaeaea' }}>
                <td style={{ padding: '15px 20px', fontWeight: 600 }}>{sub.student_name}</td>
                <td style={{ padding: '15px 20px', color: 'var(--text-muted)' }}>{sub.roll_number || 'N/A'}</td>
                <td style={{ padding: '15px 20px', color: 'var(--text-muted)' }}>{sub.semester || 'N/A'}</td>
                <td style={{ padding: '15px 20px', color: 'var(--text-muted)' }}>
                  <div style={{ fontWeight: 600, color: '#444' }}>{sub.exam_title}</div>
                  <div style={{ fontSize: '0.9rem' }}>{sub.question_text.substring(0, 50)}...</div>
                </td>
                <td style={{ padding: '15px 20px' }}>
                  <span style={{ 
                    background: sub.percentage > 75 ? '#dcfce7' : sub.percentage > 40 ? '#fef08a' : '#fee2e2',
                    color: sub.percentage > 75 ? '#166534' : sub.percentage > 40 ? '#854d0e' : '#991b1b',
                    padding: '4px 12px',
                    borderRadius: '100px',
                    fontWeight: 600
                  }}>
                    {sub.percentage}%
                  </span>
                </td>
                <td style={{ padding: '15px 20px' }}>{sub.result}</td>
              </tr>
            ))}
            {submissions.length === 0 && (
              <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No submissions yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
