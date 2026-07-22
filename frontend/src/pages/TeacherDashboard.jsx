import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LogOut, Plus, Users, BookOpen, Trash2, Upload, FileText } from 'lucide-react';

export default function TeacherDashboard() {
  const [exams, setExams] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  
  // Deletion UI states
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  
  // Notes and multiple questions creation states
  const [examTitle, setExamTitle] = useState('');
  const [notesFile, setNotesFile] = useState(null);
  const [questionsList, setQuestionsList] = useState(['']);

  const [uploadData, setUploadData] = useState({ title: '', questions: '', answers: '' });
  const [bulkNotesFile, setBulkNotesFile] = useState(null);
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

  const handleDelete = async (id) => {
    setConfirmDeleteId(null);
    setDeletingId(id);
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`http://localhost:5000/api/submissions/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Update local React state to remove submission immediately
      setSubmissions(prev => prev.filter(sub => sub.id !== id));
      // Show success toast
      setToastMessage('Submission deleted successfully.');
      setTimeout(() => setToastMessage(''), 3000);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Failed to delete submission.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const handleQuestionChange = (index, value) => {
    const list = [...questionsList];
    list[index] = value;
    setQuestionsList(list);
  };

  const addQuestionField = () => {
    setQuestionsList([...questionsList, '']);
  };

  const removeQuestionField = (index) => {
    if (questionsList.length <= 1) return;
    const list = [...questionsList];
    list.splice(index, 1);
    setQuestionsList(list);
  };

  const handleCreateExamWithNotes = async (e) => {
    e.preventDefault();
    if (!examTitle.trim()) return alert("Please enter an Exam Title.");
    if (!notesFile) return alert("Please select a Unit Notes file.");
    if (questionsList.some(q => !q.trim())) return alert("Please fill out or remove all empty questions.");

    const token = localStorage.getItem('token');
    const formattedQuestions = questionsList.map(q => ({ question_text: q }));

    const formData = new FormData();
    formData.append('title', examTitle);
    formData.append('notes', notesFile);
    formData.append('questions', JSON.stringify(formattedQuestions));

    try {
      const res = await axios.post('http://localhost:5000/api/exams/create-with-notes', formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setShowAdd(false);
      setExamTitle('');
      setNotesFile(null);
      setQuestionsList(['']);
      navigate('/teacher/exams', { state: { openExamId: res.data?.examId } });
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Failed to create exam.");
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadData.title.trim()) return alert("Please enter an Exam Title.");
    
    const qLines = uploadData.questions.split('\n').filter(l => l.trim());
    const aLines = uploadData.answers ? uploadData.answers.split('\n').filter(l => l.trim()) : [];
    
    const parsedQuestions = [];
    
    if (aLines.length > 0) {
      const qMap = {};
      qLines.forEach(l => {
        const match = l.match(/^(\d+),\s*(.*)$/);
        if (match) qMap[match[1]] = match[2];
      });

      aLines.forEach(l => {
        const match = l.match(/^(\d+),\s*(.*)$/);
        if (match && qMap[match[1]]) {
          parsedQuestions.push({
            question_text: qMap[match[1]],
            model_answer: match[2]
          });
        }
      });
    } else {
      qLines.forEach(l => {
        const match = l.match(/^(\d+),\s*(.*)$/);
        if (match) {
          parsedQuestions.push({
            question_text: match[2],
            model_answer: ''
          });
        } else {
          parsedQuestions.push({
            question_text: l,
            model_answer: ''
          });
        }
      });
    }

    if (parsedQuestions.length === 0) {
      alert("Could not parse any questions. Ensure they are listed correctly.");
      return;
    }

    if (!bulkNotesFile && aLines.length === 0) {
      alert("You must upload a Unit Notes file if no model answers are provided.");
      return;
    }

    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('title', uploadData.title);
    formData.append('questions', JSON.stringify(parsedQuestions));
    if (bulkNotesFile) {
      formData.append('notes', bulkNotesFile);
    }

    try {
      const res = await axios.post('http://localhost:5000/api/questions/upload', formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setShowUpload(false);
      setUploadData({ title: '', questions: '', answers: '' });
      setBulkNotesFile(null);
      navigate('/teacher/exams', { state: { openExamId: res.data?.examId } });
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Error uploading exams.");
    }
  };

  return (
    <div className="teacher-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
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

      <div className="flex-col-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '15px' }}>
        <h3 style={{ fontSize: '1.5rem', margin: 0 }}>Exam Management</h3>
        <div className="flex-col-mobile" style={{ display: 'flex', gap: '10px', width: '100%' }}>
          <button onClick={() => { setShowUpload(false); setShowAdd(!showAdd); }} className="btn-secondary" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} /> Create Exam
          </button>
          <button onClick={() => { setShowAdd(false); setShowUpload(!showUpload); }} className="btn-primary" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Upload Exams
          </button>
        </div>
      </div>

      {showAdd && (
        <form onSubmit={handleCreateExamWithNotes} className="glass-panel" style={{ padding: '28px', marginBottom: '30px', border: '1px solid rgba(0,0,0,0.05)' }}>
          <h4 style={{ marginBottom: '20px', fontSize: '1.4rem', fontWeight: '600' }}>Create Exam with Unit Notes</h4>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.95rem' }}>Exam Title</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Physics Unit 2 Midterm"
              value={examTitle}
              onChange={(e) => setExamTitle(e.target.value)}
              required
              style={{ padding: '12px' }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.95rem' }}>Upload Unit Notes (PDF, DOCX, TXT)</label>
            <div style={{ position: 'relative', border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '20px', textAlign: 'center', cursor: 'pointer', background: 'rgba(0,0,0,0.01)' }}>
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(e) => setNotesFile(e.target.files[0])}
                required
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
              />
              <Upload size={32} color="#3b82f6" style={{ margin: '0 auto 10px auto', display: 'block' }} />
              {notesFile ? (
                <p style={{ margin: 0, color: '#1e293b', fontWeight: '500' }}>{notesFile.name} ({(notesFile.size / 1024 / 1024).toFixed(2)} MB)</p>
              ) : (
                <p style={{ margin: 0, color: '#64748b' }}>Drag & drop or click to upload PDF, DOCX or TXT file</p>
              )}
            </div>
          </div>

          <div style={{ marginBottom: '25px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <label style={{ fontWeight: 600, fontSize: '0.95rem' }}>Exam Questions</label>
              <button type="button" onClick={addQuestionField} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                <Plus size={14} /> Add Question
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {questionsList.map((q, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ fontWeight: '600', color: '#64748b', width: '25px' }}>Q{idx + 1}:</span>
                  <input
                    type="text"
                    className="input-field"
                    placeholder={`Enter question ${idx + 1}`}
                    value={q}
                    onChange={(e) => handleQuestionChange(idx, e.target.value)}
                    required
                    style={{ flex: 1, padding: '10px' }}
                  />
                  {questionsList.length > 1 && (
                    <button type="button" onClick={() => removeQuestionField(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '5px' }}>
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="submit" className="btn-primary" style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              Create & Index Notes
            </button>
            <button type="button" onClick={() => { setShowAdd(false); setQuestionsList(['']); setExamTitle(''); setNotesFile(null); }} className="btn-secondary" style={{ padding: '10px 24px', cursor: 'pointer' }}>
              Cancel
            </button>
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
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Upload Unit Notes (Required if no model answers are provided)</label>
            <input 
              type="file" 
              accept=".pdf,.docx,.txt"
              onChange={(e) => setBulkNotesFile(e.target.files[0])}
              style={{ fontSize: '0.9rem' }}
            />
          </div>
          <p style={{ color: 'var(--text-muted)', marginBottom: '15px', fontSize: '0.9rem' }}>Format: <code>1, question text</code> in the first box and optional matching numbers <code>1, answer text</code> in the second box.</p>
          <div className="flex-col-mobile" style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
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
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Model Answers (Optional if unit notes are uploaded)</label>
              <textarea
                className="input-field"
                placeholder="1, Inheritance is when child class inherits...&#10;2, Branch of AI..."
                value={uploadData.answers}
                onChange={(e) => setUploadData({...uploadData, answers: e.target.value})}
                rows={6}
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>
          <div className="flex-col-mobile" style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="btn-primary" style={{ padding: '10px 20px' }}>Upload</button>
            <button type="button" onClick={() => setShowUpload(false)} className="btn-secondary" style={{ padding: '10px 20px' }}>Cancel</button>
          </div>
        </form>
      )}

      <h3 id="submissions-table" style={{ fontSize: '1.5rem', marginTop: '40px', marginBottom: '20px' }}>Recent Student Submissions</h3>
      <div className="glass-panel" style={{ overflow: 'hidden', padding: 0 }}>
        <div className="table-wrapper">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid #eaeaea' }}>
                <th style={{ padding: '15px 20px' }}>Student</th>
                <th style={{ padding: '15px 20px' }}>Roll No.</th>
                <th style={{ padding: '15px 20px' }}>Semester</th>
                <th style={{ padding: '15px 20px' }}>Exam / Question</th>
                <th style={{ padding: '15px 20px' }}>Score</th>
                <th style={{ padding: '15px 20px' }}>Result</th>
                <th style={{ padding: '15px 20px', textAlign: 'center' }}>Action</th>
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
                  <td style={{ padding: '15px 20px', textAlign: 'center' }}>
                    <button
                      onClick={() => setConfirmDeleteId(sub.id)}
                      disabled={deletingId !== null}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: deletingId === sub.id ? '#9ca3af' : '#ef4444',
                        cursor: deletingId !== null ? 'not-allowed' : 'pointer',
                        padding: '5px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'color 0.2s, transform 0.1s'
                      }}
                      onMouseEnter={(e) => {
                        if (deletingId === null) e.currentTarget.style.transform = 'scale(1.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                      title="Delete Submission"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {submissions.length === 0 && (
                <tr><td colSpan="7" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No submissions yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Custom Confirmation Modal */}
      {confirmDeleteId !== null && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.3)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="glass-panel" style={{
            padding: '30px',
            maxWidth: '450px',
            width: '95%',
            textAlign: 'center',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            animation: 'scaleUp 0.2s ease-out'
          }}>
            <div style={{
              background: '#fee2e2',
              color: '#ef4444',
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px auto'
            }}>
              <Trash2 size={24} />
            </div>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '1.25rem', fontWeight: 600, color: '#1e293b' }}>Delete Submission</h4>
            <p style={{ margin: '0 0 25px 0', color: '#64748b', fontSize: '0.95rem', lineHeight: '1.5' }}>
              Are you sure you want to delete this submission? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                onClick={() => setConfirmDeleteId(null)}
                className="btn-secondary" 
                style={{ padding: '10px 20px', minWidth: '100px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDelete(confirmDeleteId)}
                className="btn-primary" 
                style={{ 
                  padding: '10px 20px', 
                  minWidth: '100px', 
                  background: '#ef4444', 
                  borderColor: '#ef4444',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Success Toast */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          background: '#10b981',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: 600,
          zIndex: 9999,
          animation: 'slideIn 0.3s ease-out'
        }}>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
