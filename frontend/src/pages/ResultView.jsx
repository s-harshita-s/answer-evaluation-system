import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, CheckCircle, AlertTriangle, BookOpen } from 'lucide-react';

export default function ResultView() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [exam, setExam] = useState(null);

  useEffect(() => {
    fetchData();
  }, [examId]);

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    try {
      const eRes = await axios.get('http://localhost:5000/api/exams', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const currentExam = eRes.data.find(item => item.id === parseInt(examId));
      setExam(currentExam);

      const sRes = await axios.get('http://localhost:5000/api/submissions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const subs = sRes.data.filter(item => item.exam_id === parseInt(examId));
      
      subs.forEach(sub => {
        try {
          sub.parsedFeedback = JSON.parse(sub.feedback);
        } catch(e) {
          sub.parsedFeedback = [sub.feedback];
        }
      });
      
      setSubmissions(subs);
    } catch (err) {
      console.error(err);
    }
  };

  if (!exam || submissions.length === 0) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading result...</div>;

  const totalPercentage = submissions.reduce((acc, sub) => acc + sub.percentage, 0) / submissions.length;
  const isExcellent = totalPercentage > 75;
  const isPass = totalPercentage > 40;

  return (
    <div style={{ padding: '40px 5%', maxWidth: '900px', margin: '0 auto' }}>
      <button 
        onClick={() => navigate('/student')} 
        style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: '30px' }}
      >
        <ArrowLeft size={18} /> Back to Dashboard
      </button>

      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>Exam Evaluation Result</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>{exam.title}</p>
      </div>

      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', marginBottom: '30px' }}>
        <div style={{ 
          width: '150px', 
          height: '150px', 
          borderRadius: '50%', 
          background: isExcellent ? '#dcfce7' : isPass ? '#fef08a' : '#fee2e2',
          border: `8px solid ${isExcellent ? '#22c55e' : isPass ? '#eab308' : '#ef4444'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px auto',
          boxShadow: '0 10px 25px rgba(0,0,0,0.05)'
        }}>
          <h2 style={{ fontSize: '3rem', margin: 0, color: isExcellent ? '#166534' : isPass ? '#854d0e' : '#991b1b' }}>
            {Math.round(totalPercentage)}%
          </h2>
        </div>
        <h3 style={{ fontSize: '1.8rem', color: isExcellent ? '#166534' : isPass ? '#854d0e' : '#991b1b' }}>
          {isExcellent ? 'Excellent Work' : isPass ? 'Partially Correct' : 'Needs Improvement'}
        </h3>
        <p style={{ color: 'var(--text-muted)', marginTop: '10px', fontSize: '1.1rem' }}>
          Overall average score for this exam
        </p>
      </div>

      <h3 style={{ fontSize: '1.6rem', marginBottom: '20px' }}>Detailed Question Breakdown</h3>

      {submissions.map((sub, index) => {
        const qExcellent = sub.percentage > 75;
        const qPass = sub.percentage > 40;
        
        return (
        <div key={sub.id} className="glass-panel" style={{ padding: '30px', marginBottom: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <h4 style={{ fontSize: '1.2rem', margin: 0, flex: 1, paddingRight: '20px' }}>Q{index + 1}: {sub.question_text}</h4>
            <span style={{ 
              background: qExcellent ? '#dcfce7' : qPass ? '#fef08a' : '#fee2e2',
              color: qExcellent ? '#166534' : qPass ? '#854d0e' : '#991b1b',
              padding: '6px 14px',
              borderRadius: '20px',
              fontWeight: 600,
              fontSize: '1.1rem'
            }}>
              {sub.percentage}%
            </span>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.02)', padding: '15px', borderRadius: '12px', border: '1px solid #eaeaea', marginBottom: '20px' }}>
            <p style={{ margin: 0, color: '#444', fontStyle: 'italic' }}>"{sub.student_answer}"</p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
            <div>
              <h5 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '0.95rem' }}>
                <BookOpen size={16} color="var(--accent-blue)" /> Semantic Meaning: {sub.semantic_score || 0}%
              </h5>
              <div style={{ background: '#f3f4f6', height: '6px', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ width: `${sub.semantic_score || 0}%`, background: 'var(--accent-blue)', height: '100%' }}></div>
              </div>
            </div>

            <div>
              <h5 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '0.95rem' }}>
                <CheckCircle size={16} color="var(--accent-pink)" /> Keyword Coverage: {sub.keyword_score || 0}%
              </h5>
              <div style={{ background: '#f3f4f6', height: '6px', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ width: `${sub.keyword_score || 0}%`, background: 'var(--accent-pink)', height: '100%' }}></div>
              </div>
            </div>
          </div>

          <div>
            <h5 style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
              <AlertTriangle size={16} color="var(--accent-orange)" /> AI Feedback
            </h5>
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.95rem' }}>
              {sub.parsedFeedback && Array.isArray(sub.parsedFeedback) ? (
                sub.parsedFeedback.map((f, i) => (
                  <li key={i} style={{ color: 'var(--text-dark)' }}>{f}</li>
                ))
              ) : (
                <li>{sub.feedback}</li>
              )}
            </ul>
          </div>
        </div>
      )})}

    </div>
  );
}
