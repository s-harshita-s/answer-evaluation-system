import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Save, Send } from 'lucide-react';

export default function ExamView() {
  const { id } = useParams(); // This is now examId
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchExamAndQuestions();
    // Load drafts if exists
    const draft = localStorage.getItem(`draft_exam_${id}`);
    if (draft) {
      try {
        setAnswers(JSON.parse(draft));
      } catch(e) {}
    }
  }, [id]);

  // Auto-save draft on answers change
  useEffect(() => {
    if (Object.keys(answers).length > 0) {
      localStorage.setItem(`draft_exam_${id}`, JSON.stringify(answers));
    }
  }, [answers, id]);

  // Warn before leaving page if answering
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      const hasContent = Object.values(answers).some(a => a && a.trim().length > 0);
      if (hasContent && !isSubmitting) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [answers, isSubmitting]);

  const fetchExamAndQuestions = async () => {
    const token = localStorage.getItem('token');
    try {
      const eRes = await axios.get('http://localhost:5000/api/exams', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const currentExam = eRes.data.find(item => item.id === parseInt(id));
      setExam(currentExam);

      const qRes = await axios.get(`http://localhost:5000/api/exams/${id}/questions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQuestions(qRes.data);
    } catch (err) {
      console.error("Error fetching exam questions:", err);
    }
  };

  const handleAnswerChange = (qId, text) => {
    setAnswers(prev => ({ ...prev, [qId]: text }));
  };

  const handleSaveDraft = () => {
    setIsSaving(true);
    localStorage.setItem(`draft_exam_${id}`, JSON.stringify(answers));
    setTimeout(() => setIsSaving(false), 800);
  };

  const handleBackToDashboard = () => {
    const hasContent = Object.values(answers).some(a => a && a.trim().length > 0);
    if (hasContent) {
      if (window.confirm("Are you sure you want to go back to Dashboard? Your answers are saved as draft.")) {
        navigate('/student');
      }
    } else {
      navigate('/student');
    }
  };

  const handleSubmit = async () => {
    // Basic validation
    for (const q of questions) {
      if (!answers[q.id]?.trim()) {
        return alert("Please answer all questions before submitting.");
      }
    }
    
    setIsSubmitting(true);
    const token = localStorage.getItem('token');
    
    const formattedAnswers = questions.map(q => ({
      question_id: q.id,
      student_answer: answers[q.id]
    }));

    try {
      await axios.post(`http://localhost:5000/api/exams/${id}/submit`, {
        answers: formattedAnswers
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Clear draft
      localStorage.removeItem(`draft_exam_${id}`);
      
      // Navigate to results for this exam
      navigate(`/result/${id}`);
    } catch (err) {
      console.error("Submit error:", err);
      alert("Failed to submit: " + (err.response?.data?.error || err.message));
      setIsSubmitting(false);
    }
  };

  if (!exam || questions.length === 0) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading exam...</div>;

  return (
    <div style={{ padding: '40px 5%', maxWidth: '900px', margin: '0 auto' }}>
      <button 
        type="button"
        onClick={handleBackToDashboard} 
        style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: '30px' }}
      >
        <ArrowLeft size={18} /> Back to Dashboard
      </button>

      <div className="glass-panel" style={{ padding: '30px', marginBottom: '30px' }}>
        <h2 style={{ fontSize: '1.2rem', color: 'var(--accent-blue)', marginBottom: '10px' }}>Exam:</h2>
        <h3 style={{ fontSize: '2rem', margin: 0 }}>{exam.title}</h3>
      </div>

      {questions.map((q, index) => (
        <div key={q.id} className="glass-panel" style={{ padding: '30px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.4rem', marginBottom: '15px' }}>{index + 1}. {q.question_text}</h3>
          <textarea 
            className="input-field"
            rows={6}
            value={answers[q.id] || ''}
            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
            placeholder="Type your comprehensive answer here..."
            style={{ resize: 'vertical', minHeight: '150px' }}
          />
        </div>
      ))}

      <div className="glass-panel action-bar-mobile" style={{ padding: '20px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', bottom: '20px', zIndex: 100 }}>
        <button 
          type="button"
          onClick={handleSaveDraft}
          className="btn-secondary" 
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Save size={18} /> {isSaving ? 'Saved!' : 'Save Drafts'}
        </button>

        <button 
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: isSubmitting ? 0.7 : 1 }}
        >
          <Send size={18} /> {isSubmitting ? 'Evaluating...' : 'Submit Exam'}
        </button>
      </div>
    </div>
  );
}
