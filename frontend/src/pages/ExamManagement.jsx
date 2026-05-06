import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

export default function ExamManagement() {
  const [exams, setExams] = useState([]);
  const [expandedExam, setExpandedExam] = useState(null);
  const [examQuestions, setExamQuestions] = useState({});
  const [editingExam, setEditingExam] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/exams', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExams(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchQuestions = async (examId) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/exams/${examId}/questions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExamQuestions(prev => ({ ...prev, [examId]: res.data }));
    } catch (err) {
      console.error(err);
    }
  };

  const toggleExam = (examId) => {
    if (expandedExam === examId) {
      setExpandedExam(null);
    } else {
      setExpandedExam(examId);
      if (!examQuestions[examId]) {
        fetchQuestions(examId);
      }
    }
  };

  // --- Delete Handlers ---

  const handleDeleteExam = async (e, examId) => {
    e.stopPropagation(); // prevent accordion toggle
    if (!window.confirm("Are you sure you want to delete this exam? It will be hidden from students, but previous results are kept.")) return;
    try {
      await axios.delete(`http://localhost:5000/api/exams/${examId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchExams();
    } catch (err) {
      console.error(err);
      alert("Failed to delete exam.");
    }
  };

  const handleDeleteQuestion = async (questionId, examId) => {
    if (!window.confirm("Are you sure you want to delete this question?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/questions/${questionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchQuestions(examId); // Refresh questions
    } catch (err) {
      console.error(err);
      alert("Failed to delete question.");
    }
  };

  // --- Edit Handlers ---

  const handleUpdateExam = async (examId) => {
    if (!editingExam.title.trim()) return alert("Title cannot be empty.");
    try {
      await axios.put(`http://localhost:5000/api/exams/${examId}`, { title: editingExam.title }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditingExam(null);
      fetchExams();
    } catch (err) {
      console.error(err);
      alert("Failed to update exam.");
    }
  };

  const handleUpdateQuestion = async (questionId, examId) => {
    if (!editingQuestion.question_text.trim() || !editingQuestion.model_answer.trim()) {
      return alert("Fields cannot be empty.");
    }
    try {
      await axios.put(`http://localhost:5000/api/questions/${questionId}`, { 
        question_text: editingQuestion.question_text,
        model_answer: editingQuestion.model_answer
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditingQuestion(null);
      fetchQuestions(examId);
    } catch (err) {
      console.error(err);
      alert("Failed to update question.");
    }
  };

  return (
    <div style={{ padding: '40px 5%', maxWidth: '1000px', margin: '0 auto' }}>
      <button 
        onClick={() => navigate('/teacher')} 
        style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: '30px' }}
      >
        <ArrowLeft size={18} /> Back to Dashboard
      </button>

      <h2 style={{ fontSize: '2rem', marginBottom: '30px' }}>Manage Exams</h2>

      {exams.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No active exams found.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {exams.map(exam => (
            <div key={exam.id} className="glass-panel" style={{ overflow: 'hidden' }}>
              {/* Exam Header (Click to expand) */}
              <div 
                onClick={() => toggleExam(exam.id)}
                style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: expandedExam === exam.id ? 'rgba(0,0,0,0.02)' : 'transparent' }}
              >
                <div style={{ flex: 1, marginRight: '20px' }}>
                  {editingExam?.id === exam.id ? (
                    <div onClick={e => e.stopPropagation()} className="flex-col-mobile" style={{ display: 'flex', gap: '10px' }}>
                      <input 
                        type="text" 
                        className="input-field" 
                        value={editingExam.title} 
                        onChange={(e) => setEditingExam({...editingExam, title: e.target.value})}
                        style={{ padding: '8px', flex: 1 }}
                      />
                      <button className="btn-primary" onClick={() => handleUpdateExam(exam.id)}>Save</button>
                      <button className="btn-secondary" onClick={() => setEditingExam(null)}>Cancel</button>
                    </div>
                  ) : (
                    <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {exam.title}
                    </h3>
                  )}
                </div>
                
                {/* Actions */}
                {editingExam?.id !== exam.id && (
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <button onClick={(e) => { e.stopPropagation(); setEditingExam({ id: exam.id, title: exam.title }); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-blue)' }}>
                      <Edit2 size={18} />
                    </button>
                    <button onClick={(e) => handleDeleteExam(e, exam.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-orange)' }}>
                      <Trash2 size={18} />
                    </button>
                    <div style={{ color: 'var(--text-muted)' }}>
                      {expandedExam === exam.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                )}
              </div>

              {/* Questions List */}
              {expandedExam === exam.id && (
                <div style={{ padding: '0 20px 20px 20px', borderTop: '1px solid #eaeaea', marginTop: '10px' }}>
                  <h4 style={{ margin: '15px 0', color: 'var(--text-muted)' }}>Questions inside this exam:</h4>
                  
                  {!examQuestions[exam.id] ? (
                    <p>Loading questions...</p>
                  ) : examQuestions[exam.id].length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No questions in this exam.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      {examQuestions[exam.id].map((q, idx) => (
                        <div key={q.id} style={{ padding: '15px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #eaeaea' }}>
                          
                          {editingQuestion?.id === q.id ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              <textarea 
                                className="input-field" 
                                value={editingQuestion.question_text} 
                                onChange={(e) => setEditingQuestion({...editingQuestion, question_text: e.target.value})}
                                rows={2}
                              />
                              <textarea 
                                className="input-field" 
                                value={editingQuestion.model_answer} 
                                onChange={(e) => setEditingQuestion({...editingQuestion, model_answer: e.target.value})}
                                rows={3}
                              />
                              <div className="flex-col-mobile" style={{ display: 'flex', gap: '10px' }}>
                                <button className="btn-primary" onClick={() => handleUpdateQuestion(q.id, exam.id)}>Save</button>
                                <button className="btn-secondary" onClick={() => setEditingQuestion(null)}>Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div style={{ flex: 1, paddingRight: '20px' }}>
                                <p style={{ fontWeight: 600, margin: '0 0 10px 0' }}>Q{idx + 1}. {q.question_text}</p>
                                <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}><strong>Model Answer:</strong> {q.model_answer}</p>
                              </div>
                              <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={() => setEditingQuestion({ id: q.id, question_text: q.question_text, model_answer: q.model_answer })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-blue)' }}>
                                  <Edit2 size={16} />
                                </button>
                                <button onClick={() => handleDeleteQuestion(q.id, exam.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-orange)' }}>
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          )}

                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
