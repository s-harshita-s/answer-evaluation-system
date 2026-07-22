import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { LogOut, FileText, CheckCircle, LayoutDashboard, FileSpreadsheet, Edit3, Check, User, BookOpen, Sparkles } from 'lucide-react';

export default function StudentDashboard() {
  const [exams, setExams] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  // Profile states
  const [isEditing, setIsEditing] = useState(false);
  const [userName, setUserName] = useState(localStorage.getItem('name') || 'Student');
  const [rollNumber, setRollNumber] = useState(localStorage.getItem('roll_number') || 'N/A');
  const [semester, setSemester] = useState(localStorage.getItem('semester') || 'N/A');
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Avatar states
  const [avatar, setAvatar] = useState(localStorage.getItem('avatar') || '');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const avatars = [
    '/avatars/avatar_1.png',
    '/avatars/avatar_2.png',
    '/avatars/avatar_3.png',
    '/avatars/avatar_4.png',
    '/avatars/avatar_5.png'
  ];

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

  const saveProfile = () => {
    localStorage.setItem('name', userName);
    localStorage.setItem('roll_number', rollNumber);
    localStorage.setItem('semester', semester);
    localStorage.setItem('avatar', avatar);
    setIsEditing(false);
  };

  const getSubmissionsForExam = (examId) => {
    return submissions.filter(s => s.exam_id === examId);
  };

  const displayedExams = activeTab === 'dashboard' 
    ? exams 
    : exams.filter(exam => getSubmissionsForExam(exam.id).length > 0);

  return (
    <div className="dashboard-layout" style={{ display: 'flex', height: '100vh', width: '100%', backgroundColor: 'transparent', fontFamily: "'Inter', 'Poppins', sans-serif", overflow: 'hidden' }}>
      
      {/* Left Sidebar - Light Theme */}
      <aside className="sidebar-mobile" style={{ 
        width: '320px', 
        background: '#ffffff', 
        boxShadow: '4px 0 20px rgba(0, 0, 0, 0.05)',
        display: 'flex', 
        flexDirection: 'column', 
        height: '100vh', 
        flexShrink: 0,
        zIndex: 10
      }}>
        <div style={{ padding: '40px 24px', flexGrow: 1, overflowY: 'auto' }}>
          
          {/* Profile Section */}
          <div style={{ position: 'relative', textAlign: 'center', marginBottom: '40px' }}>
            
            {/* Animated Glow Container */}
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: '16px' }}>
              <div style={{
                position: 'absolute',
                top: '-5px', left: '-5px', right: '-5px', bottom: '-5px',
                background: 'linear-gradient(135deg, var(--accent-pink), var(--accent-orange))',
                borderRadius: '50%',
                zIndex: 0,
                filter: 'blur(12px)',
                opacity: 0.6
              }}></div>
              
              <Sparkles size={24} color="var(--accent-yellow)" style={{ position: 'absolute', top: '-10px', right: '-10px', zIndex: 2 }} className="floating" />
              
              <div 
                onClick={() => isEditing && setShowAvatarPicker(!showAvatarPicker)}
                style={{ 
                  position: 'relative',
                  zIndex: 1,
                  width: '110px', 
                  height: '110px', 
                  borderRadius: '50%', 
                  background: '#fff', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: '#d81b60', 
                  fontSize: '2.5rem', 
                  fontWeight: '600', 
                  boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                  cursor: isEditing ? 'pointer' : 'default',
                  overflow: 'hidden',
                  border: '3px solid white',
                  transition: 'all 0.2s'
                }}
                title={isEditing ? "Click to change avatar" : ""}
              >
                {avatar ? (
                  <img src={avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  userName ? userName.charAt(0).toUpperCase() : 'S'
                )}
              </div>
            </div>

            {/* Avatar Picker Dropdown */}
            {showAvatarPicker && isEditing && (
              <div style={{
                position: 'absolute',
                top: '120px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#ffffff',
                padding: '12px',
                borderRadius: '16px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                zIndex: 10,
                border: '1px solid #fce4ec'
              }}>
                {avatars.map((av, idx) => (
                  <img 
                    key={idx} 
                    src={av} 
                    alt={`Avatar ${idx}`} 
                    onClick={() => { setAvatar(av); setShowAvatarPicker(false); }}
                    style={{ width: '50px', height: '50px', borderRadius: '50%', cursor: 'pointer', border: avatar === av ? '2px solid var(--accent-pink)' : '2px solid transparent', objectFit: 'cover' }} 
                  />
                ))}
                <div 
                  onClick={() => { setAvatar(''); setShowAvatarPicker(false); }}
                  style={{ width: '50px', height: '50px', borderRadius: '50%', cursor: 'pointer', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: '0.8rem', fontWeight: 500 }}
                >
                  Clear
                </div>
              </div>
            )}

            {isEditing ? (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
                <input 
                  type="text" 
                  value={userName} 
                  onChange={(e) => setUserName(e.target.value)}
                  style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: '600', background: '#fcfcfc', border: '1px solid var(--accent-pink)', color: '#222', borderRadius: '8px', padding: '6px', width: '90%', outline: 'none' }}
                />
              </div>
            ) : (
              <div style={{ display: 'inline-block' }}>
                <h2 style={{ color: '#222', fontSize: '1.5rem', fontWeight: '700', margin: '0', borderBottom: '3px solid var(--accent-pink)', paddingBottom: '4px', display: 'inline-block' }}>{userName}</h2>
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ color: '#888', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600', margin: 0 }}>Profile Info</h3>
            <button onClick={() => isEditing ? saveProfile() : setIsEditing(true)} style={{ background: '#fdf3f6', border: '1px solid #fce4ec', color: 'var(--accent-pink)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '6px 14px', borderRadius: '20px', transition: 'all 0.2s', fontWeight: '600' }}>
              {isEditing ? <><Check size={14} /> Save</> : <><Edit3 size={14} /> Edit</>}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: '#fff', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid #f0f0f0', marginBottom: '16px' }}>
            <div style={{ padding: '12px', background: 'rgba(91, 157, 255, 0.1)', borderRadius: '12px', color: 'var(--accent-blue)' }}>
              <User size={20} />
            </div>
            <div style={{ flexGrow: 1 }}>
              <p style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', margin: 0, fontWeight: '600' }}>Roll Number</p>
              {isEditing ? (
                <input 
                  type="text" 
                  value={rollNumber} 
                  onChange={(e) => setRollNumber(e.target.value)}
                  style={{ width: '100%', background: '#f9f9f9', border: 'none', borderBottom: '2px solid var(--accent-blue)', color: '#333', padding: '4px 0', fontSize: '1.1rem', outline: 'none', fontWeight: '600' }}
                />
              ) : (
                <p style={{ fontSize: '1.1rem', color: '#333', fontWeight: '700', margin: 0 }}>{rollNumber}</p>
              )}
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: '#fff', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid #f0f0f0', marginBottom: '40px' }}>
            <div style={{ padding: '12px', background: 'rgba(255, 126, 179, 0.1)', borderRadius: '12px', color: 'var(--accent-pink)' }}>
              <BookOpen size={20} />
            </div>
            <div style={{ flexGrow: 1 }}>
              <p style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', margin: 0, fontWeight: '600' }}>Semester</p>
              {isEditing ? (
                <input 
                  type="text" 
                  value={semester} 
                  onChange={(e) => setSemester(e.target.value)}
                  style={{ width: '100%', background: '#f9f9f9', border: 'none', borderBottom: '2px solid var(--accent-pink)', color: '#333', padding: '4px 0', fontSize: '1.1rem', outline: 'none', fontWeight: '600' }}
                />
              ) : (
                <p style={{ fontSize: '1.1rem', color: '#333', fontWeight: '700', margin: 0 }}>{semester}</p>
              )}
            </div>
          </div>

          <div>
            <h3 style={{ color: '#888', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600', marginBottom: '16px' }}>Navigation</h3>
            
            <button 
              onClick={() => setActiveTab('dashboard')}
              style={{ 
                width: '100%', 
                padding: '16px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '14px', 
                background: activeTab === 'dashboard' ? 'linear-gradient(90deg, rgba(255,126,179,0.1), transparent)' : 'transparent', 
                border: 'none', 
                borderLeft: activeTab === 'dashboard' ? '4px solid var(--accent-pink)' : '4px solid transparent', 
                color: activeTab === 'dashboard' ? 'var(--accent-pink)' : '#555', 
                marginBottom: '8px', 
                cursor: 'pointer', 
                textAlign: 'left', 
                transition: 'all 0.2s', 
                fontSize: '1.05rem', 
                fontWeight: activeTab === 'dashboard' ? '700' : '500', 
                borderRadius: '0 12px 12px 0' 
              }}
              onMouseEnter={(e) => { 
                if (activeTab !== 'dashboard') {
                  e.currentTarget.style.background = 'linear-gradient(90deg, rgba(255,126,179,0.05), transparent)'; 
                  e.currentTarget.style.color = 'var(--accent-pink)'; 
                  e.currentTarget.style.borderLeft = '4px solid rgba(255,126,179,0.5)'; 
                }
              }}
              onMouseLeave={(e) => { 
                if (activeTab !== 'dashboard') {
                  e.currentTarget.style.background = 'transparent'; 
                  e.currentTarget.style.color = '#555'; 
                  e.currentTarget.style.borderLeft = '4px solid transparent'; 
                }
              }}
            >
              <LayoutDashboard size={22} color={activeTab === 'dashboard' ? 'var(--accent-pink)' : '#888'} /> 
              Dashboard
            </button>

            <button 
              onClick={() => setActiveTab('results')} 
              style={{ 
                width: '100%', 
                padding: '16px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '14px', 
                background: activeTab === 'results' ? 'linear-gradient(90deg, rgba(255,126,179,0.1), transparent)' : 'transparent', 
                border: 'none', 
                borderLeft: activeTab === 'results' ? '4px solid var(--accent-pink)' : '4px solid transparent', 
                color: activeTab === 'results' ? 'var(--accent-pink)' : '#555', 
                marginBottom: '8px', 
                cursor: 'pointer', 
                textAlign: 'left', 
                transition: 'all 0.2s', 
                fontSize: '1.05rem', 
                fontWeight: activeTab === 'results' ? '700' : '500', 
                borderRadius: '0 12px 12px 0' 
              }}
              onMouseEnter={(e) => { 
                if (activeTab !== 'results') {
                  e.currentTarget.style.background = 'linear-gradient(90deg, rgba(255,126,179,0.05), transparent)'; 
                  e.currentTarget.style.color = 'var(--accent-pink)'; 
                  e.currentTarget.style.borderLeft = '4px solid rgba(255,126,179,0.5)'; 
                }
              }}
              onMouseLeave={(e) => { 
                if (activeTab !== 'results') {
                  e.currentTarget.style.background = 'transparent'; 
                  e.currentTarget.style.color = '#555'; 
                  e.currentTarget.style.borderLeft = '4px solid transparent'; 
                }
              }}
            >
              <FileSpreadsheet size={22} color={activeTab === 'results' ? 'var(--accent-pink)' : '#888'} /> 
              My Results
            </button>
          </div>
        </div>

        <div style={{ padding: '24px', borderTop: '1px solid #f0f0f0' }}>
          <button onClick={handleLogout} className="btn-primary" style={{ width: '100%', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderRadius: '12px', fontSize: '1rem' }}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* Right Main Section - Now floating with darker light pink background over the grid */}
      <main className="main-content-mobile" style={{ 
        flexGrow: 1, 
        padding: '48px 6%', 
        margin: '20px', 
        borderRadius: '24px',
        backgroundColor: 'rgba(255, 218, 230, 0.75)', // Darker pink that is semi-transparent to show grid
        display: 'flex', 
        flexDirection: 'column', 
        minWidth: '0',
        height: 'calc(100vh - 40px)',
        overflowY: 'auto',
        boxShadow: '0 10px 40px rgba(0,0,0,0.05)',
        border: '1px solid rgba(255, 255, 255, 0.6)'
      }}>
        <header style={{ marginBottom: '48px' }}>
          {/* Fixed Gradient Text */}
          <h2 style={{ fontSize: '2.4rem', fontWeight: '700', marginBottom: '8px', color: '#555' }}>Welcome back, <span className="logo" style={{ backgroundImage: 'linear-gradient(135deg, var(--accent-pink), var(--accent-orange))', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' }}>{userName}</span>!</h2>
          <p style={{ color: '#888', fontSize: '1.1rem', fontWeight: '400' }}>View and attempt your available exams below.</p>
        </header>

        <section style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
            <div style={{ width: '6px', height: '24px', background: 'linear-gradient(135deg, var(--accent-pink), var(--accent-orange))', borderRadius: '4px' }}></div>
            <h3 style={{ fontSize: '1.6rem', fontWeight: '600', margin: 0, color: '#333' }}>
              {activeTab === 'dashboard' ? 'Available Exams' : 'My Completed Exams'}
            </h3>
          </div>
          
          {displayedExams.length === 0 ? (
            <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', background: 'rgba(255,255,255,0.8)', borderRadius: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.02)' }}>
              <div style={{ textAlign: 'center', color: '#999' }}>
                <FileText size={72} style={{ margin: '0 auto 24px', opacity: 0.4, color: 'var(--accent-pink)' }} />
                <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '12px', color: '#444' }}>
                  {activeTab === 'dashboard' ? 'No Current Exam Available' : 'No Completed Exams'}
                </h3>
                <p style={{ fontSize: '1.1rem', color: '#888' }}>
                  {activeTab === 'dashboard' 
                    ? 'Check back later when your teacher creates a new exam.' 
                    : 'Attempt exams from your dashboard to see your results here.'}
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '32px' }}>
              {displayedExams.map((exam) => {
                const examSubs = getSubmissionsForExam(exam.id);
                const isEvaluated = examSubs.length > 0;
                const avgPercentage = isEvaluated 
                  ? Math.round(examSubs.reduce((acc, sub) => acc + sub.percentage, 0) / examSubs.length) 
                  : 0;

                return (
                  <div key={exam.id} style={{ padding: '32px', background: '#ffffff', borderRadius: '20px', position: 'relative', overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.04)', transition: 'transform 0.2s ease', border: '1px solid #f9f9f9' }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,0.08)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.04)'; }}
                  >
                    {/* Top Accent Line matching primary login button color */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '6px', background: 'linear-gradient(135deg, var(--accent-pink), var(--accent-orange))' }}></div>
                    
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
                      <div style={{ padding: '14px', background: '#fdf3f6', borderRadius: '16px', color: 'var(--accent-pink)' }}>
                        <FileText size={28} />
                      </div>
                      <div>
                        <h4 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0, lineHeight: 1.5, color: '#222' }}>{exam.title}</h4>
                        {exam.notes_file ? (
                          <div style={{ fontSize: '0.8rem', color: '#0369a1', background: '#e0f2fe', padding: '3px 8px', borderRadius: '100px', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                            <span style={{ fontWeight: '500' }}>📄 Notes:</span> {exam.notes_file.split('-').slice(1).join('-')}
                            <a 
                              href={"http://localhost:5000/uploads/" + exam.notes_file} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              style={{ textDecoration: 'underline', marginLeft: '4px', fontWeight: 'bold', color: '#0284c7' }}
                              onClick={e => e.stopPropagation()}
                            >
                              View
                            </a>
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.8rem', color: '#b45309', background: '#fef3c7', padding: '3px 8px', borderRadius: '100px', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                            <span>⚠️ No Notes Attached</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {isEvaluated ? (
                      <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #f0f0f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                          <span style={{ color: '#777', fontSize: '0.95rem', fontWeight: '500' }}>Status</span>
                          {/* Light blue / blue combo for Evaluated */}
                          <span style={{ background: 'rgba(91, 157, 255, 0.15)', color: 'var(--accent-blue)', padding: '6px 14px', borderRadius: '20px', fontSize: '0.9rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <CheckCircle size={16} /> Evaluated: {avgPercentage}%
                          </span>
                        </div>
                        <button 
                          onClick={() => navigate(`/result/${exam.id}`)}
                          style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: '600', borderRadius: '12px', background: 'transparent', color: 'var(--accent-blue)', border: '2px solid rgba(91, 157, 255, 0.3)', cursor: 'pointer', transition: 'all 0.2s' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(91, 157, 255, 0.1)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                          View Exam Feedback
                        </button>
                      </div>
                    ) : (
                      <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #f0f0f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                          <span style={{ color: '#777', fontSize: '0.95rem', fontWeight: '500' }}>Status</span>
                          <span style={{ background: '#fff3e0', color: '#e65100', padding: '6px 14px', borderRadius: '20px', fontSize: '0.9rem', fontWeight: '600' }}>
                            Pending
                          </span>
                        </div>
                        <button 
                          onClick={() => navigate(`/exam/${exam.id}`)}
                          className="btn-primary"
                          style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: '600', borderRadius: '12px', border: 'none', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(255, 126, 179, 0.4)' }}
                        >
                          Attempt Exam
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

