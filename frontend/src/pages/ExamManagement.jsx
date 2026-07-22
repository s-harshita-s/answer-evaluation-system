import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

export default function ExamManagement() {
  const [exams, setExams] = useState([]);
  const [expandedExam, setExpandedExam] = useState(null);
  const [examQuestions, setExamQuestions] = useState({});
  const [editingExam, setEditingExam] = useState(null);
  const [editingExamNotes, setEditingExamNotes] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  
  const [addingQuestionToExam, setAddingQuestionToExam] = useState(null);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newModelAnswer, setNewModelAnswer] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchExams();
    if (location.state?.openExamId) {
      const openId = parseInt(location.state.openExamId);
      setExpandedExam(openId);
      fetchQuestions(openId);
    }
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
    
    const formData = new FormData();
    formData.append('title', editingExam.title);
    if (editingExamNotes) {
      formData.append('notes', editingExamNotes);
    }

    try {
      await axios.put(`http://localhost:5000/api/exams/${examId}`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setEditingExam(null);
      setEditingExamNotes(null);
      fetchExams();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Failed to update exam.");
    }
  };

  const handleUpdateQuestion = async (questionId, examId) => {
    if (!editingQuestion.question_text.trim()) {
      return alert("Question text cannot be empty.");
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

  const handleAddQuestion = async (examId) => {
    if (!newQuestionText.trim()) {
      return alert("Question text cannot be empty.");
    }
    try {
      await axios.post(`http://localhost:5000/api/exams/${examId}/questions`, {
        question_text: newQuestionText,
        model_answer: newModelAnswer
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAddingQuestionToExam(null);
      setNewQuestionText('');
      setNewModelAnswer('');
      fetchQuestions(examId);
    } catch (err) {
      console.error(err);
      alert("Failed to add question.");
    }
  };

  const handleReindexExamNotes = async (e, examId) => {
    e.stopPropagation();
    try {
      const res = await axios.post(`http://localhost:5000/api/exams/${examId}/reindex`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(`Success: ${res.data.message} (${res.data.chunks} chunks indexed)`);
    } catch (err) {
      console.error(err);
      alert("Re-indexing failed: " + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="exam-management-container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
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
                        style={{ padding: '10px', width: '100%' }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Update Notes:</span>
                        <input 
                          type="file" 
                          accept=".pdf,.docx,.txt"
                          onChange={(e) => setEditingExamNotes(e.target.files[0])}
                          style={{ fontSize: '0.85rem' }}
                        />
                      </div>
                      <div className="flex-col-mobile" style={{ display: 'flex', gap: '10px' }}>
                        <button className="btn-primary" style={{ padding: '8px 20px', fontSize: '0.95rem' }} onClick={() => handleUpdateExam(exam.id)}>Save</button>
                        <button className="btn-secondary" style={{ padding: '8px 20px', fontSize: '0.95rem' }} onClick={() => { setEditingExam(null); setEditingExamNotes(null); }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {exam.title}
                      </h3>
                      {exam.notes_file ? (
                        <div style={{ fontSize: '0.85rem', color: '#0369a1', background: '#e0f2fe', padding: '4px 10px', borderRadius: '100px', display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                          <span style={{ fontWeight: '600' }}>📄 Notes:</span> {exam.notes_file.split('-').slice(1).join('-')}
                          <a 
                            href={"http://localhost:5000/uploads/" + exam.notes_file} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            style={{ textDecoration: 'underline', marginLeft: '2px', fontWeight: 'bold', color: '#0284c7' }}
                            onClick={e => e.stopPropagation()}
                          >
                            View
                          </a>
                          <span>|</span>
                          <button
                            onClick={(e) => handleReindexExamNotes(e, exam.id)}
                            style={{ background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer', fontWeight: '600', padding: 0, textDecoration: 'underline', fontSize: '0.85rem' }}
                          >
                            Re-index AI
                          </button>
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.85rem', color: '#b45309', background: '#fef3c7', padding: '4px 10px', borderRadius: '100px', display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '6px' }}>
                          <span>⚠️ No Notes Uploaded</span>
                        </div>
                      )}
                    </div>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '15px 0' }}>
                    <h4 style={{ margin: 0, color: 'var(--text-muted)' }}>Questions inside this exam:</h4>
                    {addingQuestionToExam !== exam.id && (
                      <button 
                        className="btn-primary" 
                        style={{ padding: '6px 15px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                        onClick={() => {
                          setAddingQuestionToExam(exam.id);
                          setNewQuestionText('');
                          setNewModelAnswer('');
                        }}
                      >
                        + Add Question
                      </button>
                    )}
                  </div>

                  {addingQuestionToExam === exam.id && (
                    <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
                      <h5 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', fontWeight: 600 }}>Add New Question</h5>
                      <textarea
                        className="input-field"
                        placeholder="Question Text"
                        value={newQuestionText}
                        onChange={(e) => setNewQuestionText(e.target.value)}
                        rows={2}
                        style={{ marginBottom: '10px', width: '100%', padding: '10px' }}
                      />
                      <textarea
                        className="input-field"
                        placeholder="Model Answer (Optional if unit notes are uploaded)"
                        value={newModelAnswer}
                        onChange={(e) => setNewModelAnswer(e.target.value)}
                        rows={3}
                        style={{ marginBottom: '10px', width: '100%', padding: '10px' }}
                      />
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button 
                          className="btn-primary" 
                          style={{ padding: '6px 15px', fontSize: '0.85rem' }}
                          onClick={() => handleAddQuestion(exam.id)}
                        >
                          Save Question
                        </button>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: '6px 15px', fontSize: '0.85rem' }}
                          onClick={() => setAddingQuestionToExam(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  
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
                                placeholder="Question Text"
                              />
                              <textarea 
                                className="input-field" 
                                value={editingQuestion.model_answer} 
                                onChange={(e) => setEditingQuestion({...editingQuestion, model_answer: e.target.value})}
                                rows={3}
                                placeholder="Model Answer (Optional if unit notes are uploaded)"
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
                                {q.model_answer ? (
                                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}><strong>Model Answer:</strong> {q.model_answer}</p>
                                ) : (
                                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#0284c7', fontStyle: 'italic', fontWeight: 500 }}>Graded using uploaded unit notes</p>
                                )}
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
