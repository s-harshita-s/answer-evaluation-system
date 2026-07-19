import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { 
  LogOut, 
  FileText, 
  CheckCircle, 
  LayoutDashboard, 
  FileSpreadsheet, 
  Edit3, 
  Check, 
  User, 
  BookOpen, 
  Sparkles, 
  Menu, 
  Bell, 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  Info,
  Award,
  BookOpenCheck
} from 'lucide-react';

export default function StudentDashboard() {
  const [exams, setExams] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  // Profile states
  const [isEditing, setIsEditing] = useState(false);
  const [userName, setUserName] = useState(localStorage.getItem('name') || 'Harshita');
  const [department, setDepartment] = useState(localStorage.getItem('department') || 'Computer Science & Engineering');
  const [rollNumber, setRollNumber] = useState(localStorage.getItem('roll_number') || '2022CS105');
  const [semester, setSemester] = useState(localStorage.getItem('semester') || '6th Semester');
  
  // Avatar states
  const [avatar, setAvatar] = useState(localStorage.getItem('avatar') || '/avatars/avatar_img1.jpeg');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  
  // Avatars array updated to use the new JPEG files
  const avatars = [
    '/avatars/avatar_img1.jpeg',
    '/avatars/avatar_img2.jpeg',
    '/avatars/avatar_img3.jpeg',
    '/avatars/avatar_img4.jpeg',
    '/avatars/avatar_img5.jpeg'
  ];

  // Sidebar and Section state
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    try {
      // 1. Fetch Exams
      const eRes = await axios.get('http://localhost:5000/api/exams', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExams(eRes.data);

      // 2. Fetch Submissions
      const sRes = await axios.get('http://localhost:5000/api/submissions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubmissions(sRes.data);

      // 3. Fetch Profile from Database
      const pRes = await axios.get('http://localhost:5000/api/users/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (pRes.data) {
        setUserName(pRes.data.name || 'Harshita');
        setRollNumber(pRes.data.roll_number || '2022CS105');
        setSemester(pRes.data.semester || '6th Semester');
        setDepartment(pRes.data.department || 'Computer Science & Engineering');
        setAvatar(pRes.data.avatar || '/avatars/avatar_img1.jpeg');
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const saveProfile = async () => {
    const token = localStorage.getItem('token');
    try {
      // Save profile to database
      await axios.put('http://localhost:5000/api/users/profile', {
        name: userName,
        roll_number: rollNumber,
        semester: semester,
        department: department,
        avatar: avatar
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update localStorage fallback
      localStorage.setItem('name', userName);
      localStorage.setItem('department', department);
      localStorage.setItem('roll_number', rollNumber);
      localStorage.setItem('semester', semester);
      localStorage.setItem('avatar', avatar);
      setIsEditing(false);
    } catch (err) {
      console.error("Error saving profile:", err);
      alert("Failed to save profile. Please try again.");
    }
  };

  const getSubmissionsForExam = (examId) => {
    return submissions.filter(s => s.exam_id === examId);
  };

  // Helper lists for rendering sections
  const pendingExams = exams.filter(e => getSubmissionsForExam(e.id).length === 0);
  const completedExams = exams.filter(e => getSubmissionsForExam(e.id).length > 0);

  // Performance calculations
  const totalScore = submissions.reduce((acc, s) => acc + s.percentage, 0);
  const avgScore = submissions.length > 0 ? Math.round(totalScore / submissions.length) : 0;
  
  let grade = 'N/A';
  if (submissions.length > 0) {
    if (avgScore >= 85) grade = 'A+';
    else if (avgScore >= 75) grade = 'A';
    else if (avgScore >= 60) grade = 'B';
    else if (avgScore >= 50) grade = 'C';
    else if (avgScore >= 40) grade = 'D';
    else grade = 'F';
  }

  let rank = 'N/A';
  if (submissions.length > 0) {
    if (avgScore >= 90) rank = '2nd / 45';
    else if (avgScore >= 80) rank = '5th / 45';
    else if (avgScore >= 70) rank = '11th / 45';
    else if (avgScore >= 60) rank = '18th / 45';
    else if (avgScore >= 50) rank = '25th / 45';
    else rank = '34th / 45';
  }

  // Section Header Map
  const sectionHeaders = {
    dashboard: { title: 'Dashboard', desc: 'Welcome back to your evaluation environment.' },
    profile: { title: 'My Profile', desc: 'View and update your student account settings.' },
    exams: { title: 'Available Exams', desc: 'List of all assigned tests and exams.' },
    results: { title: 'My Results', desc: 'Access your scores, evaluations, and smart AI feedback.' },
    analysis: { title: 'Performance Analysis', desc: 'In-depth metric breakdown of your exam progress.' }
  };

  return (
    <div className={`dashboard-container ${isMobileMenuOpen ? 'mobile-sidebar-open' : ''}`} style={{ 
      display: 'flex', 
      height: '100vh', 
      width: '100vw', 
      backgroundColor: 'transparent', // Let parent grid background show
      fontFamily: "'Poppins', 'Inter', sans-serif", 
      overflow: 'hidden',
      position: 'relative'
    }}>
      
      {/* Dynamic Font Styling Injected Locally */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap');
        
        .dashboard-container {
          font-family: 'Poppins', 'Inter', sans-serif !important;
        }

        .dashboard-container input, .dashboard-container button {
          font-family: 'Poppins', 'Inter', sans-serif !important;
        }

        /* Hover elevation effect */
        .premium-hover-lift {
          transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .premium-hover-lift:hover {
          transform: translateY(-3px) !important;
          box-shadow: 0 8px 24px rgba(231, 84, 166, 0.06) !important;
        }

        /* Nav link hover styling */
        .sidebar-nav-link {
          transition: all 0.2s ease-in-out;
        }
        .sidebar-nav-link:hover {
          background-color: #FFF1F7 !important;
          color: #E754A6 !important;
        }
        .sidebar-nav-link:hover svg {
          color: #E754A6 !important;
        }

        /* Standard custom scrollbar */
        .scrollable-content::-webkit-scrollbar {
          width: 5px;
        }
        .scrollable-content::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollable-content::-webkit-scrollbar-thumb {
          background: #ECECEC;
          border-radius: 4px;
        }
        .scrollable-content::-webkit-scrollbar-thumb:hover {
          background: #B87BFF;
        }

        /* Avatar Hover Effects */
        .avatar-option {
          transition: all 0.2s ease;
        }
        .avatar-option:hover {
          transform: scale(1.1);
          border-color: #E754A6 !important;
        }

        /* Mobile Responsive Overrides */
        @media (max-width: 768px) {
          .dashboard-container {
            flex-direction: column !important;
            height: 100vh !important;
            overflow: hidden !important;
          }

          /* sidebar becomes a mobile overlay drawer */
          aside {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            bottom: 0 !important;
            height: 100vh !important;
            width: 280px !important;
            z-index: 2000 !important;
            box-shadow: 8px 0 25px rgba(0,0,0,0.15) !important;
            transform: translateX(-100%) !important;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
          }

          .mobile-sidebar-open aside {
            transform: translateX(0) !important;
          }

          /* Main panel gets scrollable */
          main {
            width: 100% !important;
            padding: 20px 16px 80px 16px !important;
            height: 100vh !important;
            overflow-y: auto !important;
          }

          .mobile-hamburger-btn {
            display: flex !important;
          }

          .header-desc-desktop {
            display: none !important;
          }

          /* Card & Grid resets to vertical stacks */
          .stats-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
          
          .exams-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }

          /* Re-styling welcome card inside Dashboard on mobile */
          .dashboard-welcome-card {
            height: auto !important;
            padding: 20px !important;
            margin-bottom: 16px !important;
          }
          .dashboard-welcome-img {
            display: none !important; /* Hide image on mobile to save space */
          }
          .dashboard-welcome-text {
            max-width: 100% !important;
          }

          /* Profile grid stacks on mobile */
          .profile-grid {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
          }
        }
      `}</style>

      {/* Left Sidebar */}
      <aside style={{ 
        width: isSidebarCollapsed ? '88px' : '280px', 
        background: '#FFFFFF', 
        borderRight: '1px solid #ECECEC',
        boxShadow: '4px 0 20px rgba(0, 0, 0, 0.01)',
        display: 'flex', 
        flexDirection: 'column', 
        height: '100vh', 
        flexShrink: 0,
        zIndex: 100,
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden'
      }}>
        {/* Brand Header & Toggle */}
        <div style={{ 
          padding: '24px 20px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: isSidebarCollapsed ? 'center' : 'space-between',
          borderBottom: '1px solid #ECECEC',
          minHeight: '80px'
        }}>
          {!isSidebarCollapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                background: 'linear-gradient(135deg, #E754A6, #B87BFF)',
                padding: '6px',
                borderRadius: '8px',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Sparkles size={20} />
              </div>
              <span style={{ fontSize: '1.3rem', fontWeight: '700', color: '#262626', letterSpacing: '-0.3px' }}>
                EvalAI
              </span>
            </div>
          )}
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            style={{
              background: 'none',
              border: 'none',
              color: '#888888',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
              borderRadius: '8px',
              transition: 'background 0.2s',
              backgroundColor: '#FFF9FC'
            }}
          >
            {isSidebarCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {/* Navigation Items */}
        <div style={{ 
          padding: '30px 16px', 
          flexGrow: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '8px',
          overflowY: 'auto'
        }} className="scrollable-content">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'exams', label: 'Exams', icon: BookOpen },
            { id: 'results', label: 'My Results', icon: FileSpreadsheet },
            { id: 'analysis', label: 'Analysis / Performance', icon: TrendingUp }
          ].map((item) => {
            const IconComponent = item.icon;
            const isActive = activeSection === item.id;
            
            return (
              <button 
                key={item.id}
                onClick={() => { setActiveSection(item.id); setIsMobileMenuOpen(false); }}
                className="sidebar-nav-link"
                style={{ 
                  width: '100%', 
                  height: '48px', 
                  padding: isSidebarCollapsed ? '0' : '0 16px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
                  gap: '14px', 
                  background: isActive ? '#FFF1F7' : 'transparent', 
                  border: 'none',
                  color: isActive ? '#E754A6' : '#606060', 
                  cursor: 'pointer', 
                  textAlign: 'left', 
                  fontSize: '0.95rem', 
                  fontWeight: isActive ? '700' : '500', 
                  borderRadius: '12px',
                  boxShadow: 'none'
                }}
                title={isSidebarCollapsed ? item.label : ''}
              >
                <IconComponent 
                  size={20} 
                  color={isActive ? '#E754A6' : '#888888'} 
                  style={{ transition: 'color 0.2s' }}
                /> 
                {!isSidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            zIndex: 1999
          }}
        />
      )}

      {/* Right Main Content Panel */}
      <main style={{ 
        flexGrow: 1, 
        padding: '32px', 
        display: 'flex', 
        flexDirection: 'column', 
        minWidth: '0',
        height: '100vh',
        overflowY: 'auto',
        position: 'relative',
        backgroundColor: 'rgba(255, 249, 252, 0.35)' // extremely soft pink overlay to let grid background shine through
      }} className="scrollable-content">
        
        {/* Main Content Header */}
        <header style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '24px',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="mobile-hamburger-btn"
              style={{
                display: 'none',
                background: 'none',
                border: 'none',
                color: '#888888',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '8px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #ECECEC',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: '700', color: '#262626', margin: 0 }}>
                {sectionHeaders[activeSection].title}
              </h1>
              <p className="header-desc-desktop" style={{ color: '#888888', fontSize: '0.9rem', marginTop: '2px', fontWeight: '400' }}>
                {sectionHeaders[activeSection].desc}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Notification Bell */}
            <button 
              onClick={() => alert("You have no new notifications.")}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                border: '1px solid #ECECEC',
                background: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#606060',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#E754A6'; e.currentTarget.style.color = '#E754A6'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#ECECEC'; e.currentTarget.style.color = '#606060'; }}
            >
              <Bell size={18} />
            </button>
            
            {/* Profile Avatar Button */}
            <button 
              onClick={() => setActiveSection('profile')}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                border: '1px solid #ECECEC',
                background: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                overflow: 'hidden',
                padding: 0,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#E754A6'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#ECECEC'; }}
            >
              {avatar ? (
                <img src={avatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <User size={18} color="#E754A6" />
              )}
            </button>
          </div>
        </header>

        {/* Dynamic Panels */}
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* SECTION 1: DASHBOARD TAB */}
          {activeSection === 'dashboard' && (
            <>
              {/* Greeting Card - styled so image overflows beautifully */}
              <div className="dashboard-welcome-card" style={{ 
                background: 'linear-gradient(135deg, #F4EDFF 0%, #E7D7FF 100%)',
                borderRadius: '14px',
                padding: '24px 28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 4px 15px rgba(184, 123, 255, 0.05)',
                position: 'relative',
                overflow: 'visible', // allows student character to exceed boundaries
                height: '160px',
                marginBottom: '24px'
              }}>
                <div className="dashboard-welcome-text" style={{ maxWidth: '65%', zIndex: 1 }}>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: '700', color: '#262626', margin: 0 }}>
                    Hi, {userName} 👋
                  </h2>
                  <p style={{ color: '#606060', fontSize: '1.05rem', marginTop: '8px', fontWeight: '500', lineHeight: 1.4 }}>
                    Welcome back. Ready to continue your exams today?
                  </p>
                </div>
                <div className="dashboard-welcome-img" style={{ 
                  position: 'absolute',
                  right: '24px', 
                  bottom: '-15px', 
                  height: '195px', 
                  zIndex: 2, 
                  display: 'flex', 
                  alignItems: 'flex-end',
                  overflow: 'visible'
                }}>
                  <img 
                    src="/student_study1.png" 
                    alt="Student Studying" 
                    style={{ 
                      height: '100%', 
                      width: 'auto', 
                      objectFit: 'contain',
                      display: 'block',
                      filter: 'drop-shadow(0 10px 15px rgba(184, 123, 255, 0.2))'
                    }} 
                  />
                </div>
              </div>

              {/* Statistics Cards - Clickable Tab Redirection added */}
              <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
                {/* Available Exams Stat Card */}
                <div 
                  onClick={() => setActiveSection('exams')}
                  className="premium-hover-lift"
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #ECECEC',
                    padding: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.01)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: '#FFF1F7',
                    color: '#E754A6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <BookOpen size={24} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.8rem', fontWeight: '700', color: '#262626', margin: 0 }}>
                      {pendingExams.length}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: '#888888', margin: 0, fontWeight: '600' }}>
                      Available Exams
                    </p>
                  </div>
                </div>

                {/* Completed Exams Stat Card */}
                <div 
                  onClick={() => setActiveSection('results')}
                  className="premium-hover-lift"
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #ECECEC',
                    padding: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.01)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: '#EBFDF2',
                    color: '#34C759',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <CheckCircle size={24} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.8rem', fontWeight: '700', color: '#262626', margin: 0 }}>
                      {completedExams.length}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: '#888888', margin: 0, fontWeight: '600' }}>
                      Completed Exams
                    </p>
                  </div>
                </div>
              </div>

              {/* Available Exams Section (Inside Dashboard Tab) */}
              <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '4px', height: '18px', background: '#E754A6', borderRadius: '2px' }}></div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#262626', margin: 0 }}>
                    My Assigned Exams
                  </h3>
                </div>

                {exams.length === 0 ? (
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    padding: '48px', 
                    background: '#FFFFFF', 
                    borderRadius: '12px', 
                    border: '1px solid #ECECEC',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.01)',
                    textAlign: 'center'
                  }}>
                    <FileText size={48} style={{ opacity: 0.25, color: '#E754A6', marginBottom: '16px' }} />
                    <h4 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#606060', marginBottom: '6px' }}>No Assigned Exams</h4>
                    <p style={{ fontSize: '0.9rem', color: '#888888', maxWidth: '380px', margin: 0 }}>Check back later. When your instructor assigns an exam, it will appear here.</p>
                  </div>
                ) : (
                  <div className="exams-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                    {exams.slice(0, 4).map((exam) => {
                      const examSubs = getSubmissionsForExam(exam.id);
                      const isEvaluated = examSubs.length > 0;
                      const avgPercentage = isEvaluated 
                        ? Math.round(examSubs.reduce((acc, sub) => acc + sub.percentage, 0) / examSubs.length) 
                        : 0;

                      return (
                        <div 
                          key={exam.id} 
                          className="card-hover-lift"
                          style={{ 
                            padding: '24px', 
                            background: '#FFFFFF', 
                            borderRadius: '12px', 
                            border: '1px solid #ECECEC', 
                            boxShadow: '0 4px 20px rgba(0,0,0,0.01)', 
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            height: '200px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                            <h4 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#262626', margin: 0, lineHeight: 1.4 }}>
                              {exam.title}
                            </h4>
                            {isEvaluated ? (
                              <span style={{ 
                                background: '#EBFDF2', 
                                color: '#1E8538', 
                                padding: '4px 10px', 
                                borderRadius: '8px', 
                                fontSize: '0.8rem', 
                                fontWeight: '700',
                                whiteSpace: 'nowrap'
                              }}>
                                Completed
                              </span>
                            ) : (
                              <span style={{ 
                                background: '#FFF8EB', 
                                color: '#B25E00', 
                                padding: '4px 10px', 
                                borderRadius: '8px', 
                                fontSize: '0.8rem', 
                                fontWeight: '700',
                                whiteSpace: 'nowrap'
                              }}>
                                Pending
                              </span>
                            )}
                          </div>
                          
                          <div style={{ marginTop: '20px' }}>
                            {isEvaluated ? (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                                <span style={{ fontSize: '0.85rem', color: '#888888', fontWeight: '500' }}>
                                  Score: <strong style={{ color: '#262626' }}>{avgPercentage}%</strong>
                                </span>
                                <button 
                                  onClick={() => navigate(`/result/${exam.id}`)}
                                  className="btn-hover-lift"
                                  style={{ 
                                    padding: '8px 16px', 
                                    fontSize: '0.85rem', 
                                    fontWeight: '600', 
                                    borderRadius: '10px', 
                                    background: 'transparent', 
                                    color: '#E754A6', 
                                    border: '1.5px solid #E754A6', 
                                    cursor: 'pointer', 
                                    transition: 'all 0.2s' 
                                  }}
                                >
                                  Feedback
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                <button 
                                  onClick={() => navigate(`/exam/${exam.id}`)}
                                  className="btn-hover-lift"
                                  style={{ 
                                    width: '100%',
                                    padding: '10px 16px', 
                                    fontSize: '0.9rem', 
                                    fontWeight: '600', 
                                    borderRadius: '10px', 
                                    border: 'none', 
                                    background: 'linear-gradient(135deg, #E754A6, #FF7EB3)', 
                                    color: '#FFFFFF',
                                    cursor: 'pointer', 
                                    transition: 'all 0.2s',
                                    boxShadow: '0 4px 12px rgba(231, 84, 166, 0.2)'
                                  }}
                                >
                                  Attempt Exam
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}

          {/* SECTION 2: PROFILE TAB - Layout updated to be extremely attractive (ID card overlap style) */}
          {activeSection === 'profile' && (
            <div className="profile-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '24px',
              alignItems: 'start'
            }}>
              
              {/* Profile Preview Card (Interactive ID Card) */}
              <div style={{
                background: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #ECECEC',
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.01)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}>
                {/* Header graphic cover */}
                <div style={{
                  background: 'linear-gradient(135deg, #FFF1F7 0%, #F4EDFF 100%)',
                  height: '110px',
                  width: '100%',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: '#FFFFFF',
                    padding: '4px 12px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    color: '#B87BFF',
                    boxShadow: '0 2px 8px rgba(184,123,255,0.1)'
                  }}>
                    Student Pass
                  </div>
                </div>

                {/* Avatar positioning */}
                <div style={{
                  marginTop: '-55px',
                  position: 'relative',
                  zIndex: 2,
                  marginBottom: '16px'
                }}>
                  <div style={{ 
                    width: '100px', 
                    height: '100px', 
                    borderRadius: '12px', // less round squircle
                    background: '#FFFFFF', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    overflow: 'hidden',
                    border: '4px solid #FFFFFF',
                    boxShadow: '0 6px 20px rgba(0,0,0,0.06)'
                  }}>
                    {avatar ? (
                      <img src={avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '2rem', fontWeight: '700', color: '#E754A6' }}>
                        {userName ? userName.charAt(0).toUpperCase() : 'H'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Student Details Info */}
                <div style={{ padding: '0 24px 28px', textAlign: 'center', width: '100%' }}>
                  <h4 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#262626', margin: 0 }}>
                    {userName}
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: '#B87BFF', fontWeight: '600', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {department}
                  </p>
                  
                  <div style={{
                    background: '#FFF9FC',
                    borderRadius: '10px',
                    border: '1px solid #ECECEC',
                    padding: '16px',
                    marginTop: '20px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    textAlign: 'left'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#888888', display: 'block', textTransform: 'uppercase', fontWeight: '700' }}>Roll Number</span>
                      <span style={{ fontSize: '0.9rem', color: '#262626', fontWeight: '600' }}>{rollNumber}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#888888', display: 'block', textTransform: 'uppercase', fontWeight: '700' }}>Semester</span>
                      <span style={{ fontSize: '0.9rem', color: '#262626', fontWeight: '600' }}>{semester}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profile Config Card */}
              <div style={{
                background: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #ECECEC',
                padding: '32px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.01)',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#262626', margin: 0 }}>
                    Update Information
                  </h3>
                  <button 
                    onClick={() => {
                      if (isEditing) {
                        saveProfile();
                      } else {
                        setIsEditing(true);
                      }
                    }} 
                    style={{ 
                      background: '#FFF1F7', 
                      border: 'none', 
                      color: '#E754A6', 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      fontSize: '0.85rem', 
                      padding: '8px 16px', 
                      borderRadius: '10px', 
                      transition: 'all 0.2s', 
                      fontWeight: '700' 
                    }}
                  >
                    {isEditing ? <><Check size={16} /> Save Changes</> : <><Edit3 size={16} /> Edit Info</>}
                  </button>
                </div>

                {/* Edit Form */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Name field */}
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#888888', fontWeight: '700', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Full Name
                    </label>
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={userName} 
                        onChange={(e) => setUserName(e.target.value)}
                        style={{ 
                          width: '100%', 
                          fontSize: '0.9rem', 
                          fontWeight: '600', 
                          background: '#FFFFFF', 
                          border: '1px solid #ECECEC', 
                          color: '#262626', 
                          borderRadius: '12px', 
                          padding: '12px 16px', 
                          outline: 'none',
                          transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#E754A6'}
                        onBlur={(e) => e.target.style.borderColor = '#ECECEC'}
                      />
                    ) : (
                      <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#262626', background: '#FFF9FC', border: '1px solid #ECECEC', padding: '12px 16px', borderRadius: '12px' }}>
                        {userName}
                      </div>
                    )}
                  </div>

                  {/* Department field */}
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#888888', fontWeight: '700', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Department Name
                    </label>
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={department} 
                        onChange={(e) => setDepartment(e.target.value)}
                        style={{ 
                          width: '100%', 
                          fontSize: '0.9rem', 
                          fontWeight: '600', 
                          background: '#FFFFFF', 
                          border: '1px solid #ECECEC', 
                          color: '#262626', 
                          borderRadius: '12px', 
                          padding: '12px 16px', 
                          outline: 'none',
                          transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#E754A6'}
                        onBlur={(e) => e.target.style.borderColor = '#ECECEC'}
                      />
                    ) : (
                      <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#262626', background: '#FFF9FC', border: '1px solid #ECECEC', padding: '12px 16px', borderRadius: '12px' }}>
                        {department}
                      </div>
                    )}
                  </div>

                  {/* Roll Number field */}
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#888888', fontWeight: '700', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Roll Number
                    </label>
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={rollNumber} 
                        onChange={(e) => setRollNumber(e.target.value)}
                        style={{ 
                          width: '100%', 
                          fontSize: '0.9rem', 
                          fontWeight: '600', 
                          background: '#FFFFFF', 
                          border: '1px solid #ECECEC', 
                          color: '#262626', 
                          borderRadius: '12px', 
                          padding: '12px 16px', 
                          outline: 'none',
                          transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#E754A6'}
                        onBlur={(e) => e.target.style.borderColor = '#ECECEC'}
                      />
                    ) : (
                      <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#262626', background: '#FFF9FC', border: '1px solid #ECECEC', padding: '12px 16px', borderRadius: '12px' }}>
                        {rollNumber}
                      </div>
                    )}
                  </div>

                  {/* Semester field */}
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#888888', fontWeight: '700', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Semester
                    </label>
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={semester} 
                        onChange={(e) => setSemester(e.target.value)}
                        style={{ 
                          width: '100%', 
                          fontSize: '0.9rem', 
                          fontWeight: '600', 
                          background: '#FFFFFF', 
                          border: '1px solid #ECECEC', 
                          color: '#262626', 
                          borderRadius: '12px', 
                          padding: '12px 16px', 
                          outline: 'none',
                          transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#E754A6'}
                        onBlur={(e) => e.target.style.borderColor = '#ECECEC'}
                      />
                    ) : (
                      <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#262626', background: '#FFF9FC', border: '1px solid #ECECEC', padding: '12px 16px', borderRadius: '12px' }}>
                        {semester}
                      </div>
                    )}
                  </div>
                </div>

                {/* Avatar Selection Picker inside edit tab */}
                {isEditing && (
                  <div style={{ borderTop: '1px solid #ECECEC', paddingTop: '20px' }}>
                    <label style={{ fontSize: '0.75rem', color: '#888888', fontWeight: '700', display: 'block', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Select Profile Picture
                    </label>
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}>
                      {avatars.map((av, idx) => (
                        <img 
                          key={idx} 
                          src={av} 
                          alt={`Avatar Option ${idx}`} 
                          onClick={() => setAvatar(av)}
                          className="avatar-option"
                          style={{ 
                            width: '48px', 
                            height: '48px', 
                            borderRadius: '10px', 
                            cursor: 'pointer', 
                            border: avatar === av ? '2.5px solid #E754A6' : '2px solid #ECECEC', 
                            objectFit: 'cover'
                          }} 
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION 3: EXAMS TAB */}
          {activeSection === 'exams' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {exams.length === 0 ? (
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  padding: '64px', 
                  background: '#FFFFFF', 
                  borderRadius: '12px', 
                  border: '1px solid #ECECEC',
                  textAlign: 'center'
                }}>
                  <BookOpen size={64} style={{ opacity: 0.2, color: '#E754A6', marginBottom: '20px' }} />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#262626', marginBottom: '8px' }}>No Available Exams</h3>
                  <p style={{ fontSize: '0.95rem', color: '#888888', maxWidth: '400px', margin: 0 }}>There are currently no exams scheduled for you. Please check back later.</p>
                </div>
              ) : (
                <div className="exams-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                  {exams.map((exam) => {
                    const examSubs = getSubmissionsForExam(exam.id);
                    const isEvaluated = examSubs.length > 0;
                    const avgPercentage = isEvaluated 
                      ? Math.round(examSubs.reduce((acc, sub) => acc + sub.percentage, 0) / examSubs.length) 
                      : 0;

                    return (
                      <div 
                        key={exam.id} 
                        className="card-hover-lift"
                        style={{ 
                          padding: '28px', 
                          background: '#FFFFFF', 
                          borderRadius: '12px', 
                          border: '1px solid #ECECEC', 
                          boxShadow: '0 4px 20px rgba(0,0,0,0.01)', 
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          minHeight: '220px'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
                            <h4 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#262626', margin: 0, lineHeight: 1.4 }}>
                              {exam.title}
                            </h4>
                            {isEvaluated ? (
                              <span style={{ 
                                background: '#EBFDF2', 
                                color: '#1E8538', 
                                padding: '6px 12px', 
                                borderRadius: '8px', 
                                fontSize: '0.8rem', 
                                fontWeight: '700',
                                whiteSpace: 'nowrap'
                              }}>
                                Completed
                              </span>
                            ) : (
                              <span style={{ 
                                background: '#FFF8EB', 
                                color: '#B25E00', 
                                padding: '6px 12px', 
                                borderRadius: '8px', 
                                fontSize: '0.8rem', 
                                fontWeight: '700',
                                whiteSpace: 'nowrap'
                              }}>
                                Pending
                              </span>
                            )}
                          </div>
                          
                          <p style={{ color: '#888888', fontSize: '0.85rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Info size={14} color="#B87BFF" />
                            {isEvaluated ? 'Evaluated by AI Engine' : 'Unattempted'}
                          </p>
                        </div>
                        
                        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #ECECEC' }}>
                          {isEvaluated ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: '0.9rem', color: '#606060', fontWeight: '500' }}>
                                Score: <strong style={{ color: '#262626', fontSize: '1.05rem' }}>{avgPercentage}%</strong>
                              </span>
                              <button 
                                onClick={() => navigate(`/result/${exam.id}`)}
                                className="btn-hover-lift"
                                style={{ 
                                  padding: '8px 20px', 
                                  fontSize: '0.85rem', 
                                  fontWeight: '600', 
                                  borderRadius: '10px', 
                                  background: 'transparent', 
                                  color: '#E754A6', 
                                  border: '1.5px solid #E754A6', 
                                  cursor: 'pointer', 
                                  transition: 'all 0.2s' 
                                }}
                              >
                                View Results
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => navigate(`/exam/${exam.id}`)}
                              className="btn-hover-lift"
                              style={{ 
                                width: '100%',
                                padding: '12px 20px', 
                                fontSize: '0.9rem', 
                                fontWeight: '700', 
                                borderRadius: '10px', 
                                border: 'none', 
                                background: 'linear-gradient(135deg, #E754A6, #FF7EB3)', 
                                color: '#FFFFFF',
                                cursor: 'pointer', 
                                transition: 'all 0.2s',
                                boxShadow: '0 4px 15px rgba(231, 84, 166, 0.25)'
                              }}
                            >
                              Attempt Exam
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SECTION 4: MY RESULTS TAB */}
          {activeSection === 'results' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {completedExams.length === 0 ? (
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  padding: '64px', 
                  background: '#FFFFFF', 
                  borderRadius: '12px', 
                  border: '1px solid #ECECEC',
                  textAlign: 'center'
                }}>
                  <FileSpreadsheet size={64} style={{ opacity: 0.2, color: '#E754A6', marginBottom: '20px' }} />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#262626', marginBottom: '8px' }}>No Results Yet</h3>
                  <p style={{ fontSize: '0.95rem', color: '#888888', maxWidth: '400px', margin: 0 }}>You have not completed any exams. Complete your pending tests to view detailed AI breakdown results.</p>
                </div>
              ) : (
                <div className="exams-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                  {completedExams.map((exam) => {
                    const examSubs = getSubmissionsForExam(exam.id);
                    const avgPercentage = Math.round(examSubs.reduce((acc, sub) => acc + sub.percentage, 0) / examSubs.length);

                    return (
                      <div 
                        key={exam.id} 
                        className="card-hover-lift"
                        style={{ 
                          padding: '28px', 
                          background: '#FFFFFF', 
                          borderRadius: '12px', 
                          border: '1px solid #ECECEC', 
                          boxShadow: '0 4px 20px rgba(0,0,0,0.01)', 
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          minHeight: '220px'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
                            <h4 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#262626', margin: 0, lineHeight: 1.4 }}>
                              {exam.title}
                            </h4>
                            <span style={{ 
                              background: '#EBFDF2', 
                              color: '#1E8538', 
                              padding: '6px 12px', 
                              borderRadius: '8px', 
                              fontSize: '0.8rem', 
                              fontWeight: '700'
                            }}>
                              {avgPercentage}%
                            </span>
                          </div>
                          
                          <p style={{ color: '#888888', fontSize: '0.85rem', fontWeight: '500' }}>
                            Submitted Answers: <strong style={{ color: '#606060' }}>{examSubs.length}</strong>
                          </p>
                        </div>
                        
                        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #ECECEC' }}>
                          <button 
                            onClick={() => navigate(`/result/${exam.id}`)}
                            className="btn-hover-lift"
                            style={{ 
                              width: '100%',
                              padding: '12px 20px', 
                              fontSize: '0.9rem', 
                              fontWeight: '700', 
                              borderRadius: '10px', 
                              background: '#FFFFFF', 
                              color: '#E754A6', 
                              border: '1.5px solid #E754A6', 
                              cursor: 'pointer', 
                              transition: 'all 0.2s'
                            }}
                          >
                            View Exam Feedback
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SECTION 5: ANALYSIS / PERFORMANCE TAB */}
          {activeSection === 'analysis' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {submissions.length === 0 ? (
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  padding: '64px', 
                  background: '#FFFFFF', 
                  borderRadius: '12px', 
                  border: '1px solid #ECECEC',
                  textAlign: 'center'
                }}>
                  <TrendingUp size={64} style={{ opacity: 0.2, color: '#E754A6', marginBottom: '20px' }} />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#262626', marginBottom: '8px' }}>No Analytical Data</h3>
                  <p style={{ fontSize: '0.95rem', color: '#888888', maxWidth: '400px', margin: 0 }}>You need to submit at least one exam to load progress curves, grades, class ranking, and correct breakdowns.</p>
                </div>
              ) : (
                <>
                  {/* Overall Performance Card */}
                  <div style={{
                    background: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #ECECEC',
                    padding: '28px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.01)'
                  }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#262626', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Award size={20} color="#B87BFF" />
                      Academic Summary
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                      {/* Metric 1 */}
                      <div style={{ background: '#F4EDFF', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                        <span style={{ fontSize: '2.2rem', fontWeight: '800', color: '#B87BFF', display: 'block' }}>
                          {avgScore}%
                        </span>
                        <span style={{ fontSize: '0.8rem', color: '#606060', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Average Score
                        </span>
                      </div>
                      
                      {/* Metric 2 */}
                      <div style={{ background: '#FFF1F7', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                        <span style={{ fontSize: '2.2rem', fontWeight: '800', color: '#E754A6', display: 'block' }}>
                          {grade}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: '#606060', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Academic Grade
                        </span>
                      </div>

                      {/* Metric 3 */}
                      <div style={{ background: '#EEF7FF', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                        <span style={{ fontSize: '1.9rem', fontWeight: '800', color: '#5b9dff', display: 'block', margin: '6px 0' }}>
                          {rank}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: '#606060', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Class Rank
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Performance chart - Scaled, responsive, and cleaned up to prevent messiness */}
                  <div style={{
                    background: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #ECECEC',
                    padding: '28px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.01)'
                  }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#262626', marginBottom: '24px' }}>
                      Exam Score Progression
                    </h3>
                    {(() => {
                      const scoreData = submissions.map((sub, idx) => ({
                        idx,
                        score: sub.percentage,
                        title: sub.exam_title || `Exam ${idx + 1}`
                      }));

                      // If there is only 1 submission point, render a clean dot with placeholder text
                      if (scoreData.length === 1) {
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center' }}>
                            <div style={{ position: 'relative', width: '80px', height: '80px', marginBottom: '16px' }}>
                              <div style={{
                                position: 'absolute',
                                top: '50%', left: '50%',
                                transform: 'translate(-50%, -50%)',
                                width: '24px', height: '24px',
                                borderRadius: '50%',
                                background: '#B87BFF',
                                zIndex: 2
                              }} />
                              <div style={{
                                position: 'absolute',
                                top: '50%', left: '50%',
                                transform: 'translate(-50%, -50%)',
                                width: '48px', height: '48px',
                                borderRadius: '50%',
                                border: '2px dashed #B87BFF',
                                animation: 'spin 8s linear infinite',
                                opacity: 0.6
                              }} />
                            </div>
                            <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#262626', marginBottom: '4px' }}>
                              First Score: {scoreData[0].score}% ({scoreData[0].title})
                            </h4>
                            <p style={{ fontSize: '0.85rem', color: '#888888', margin: 0 }}>
                              Attempt more exams to plot a progression curve!
                            </p>
                          </div>
                        );
                      }

                      // Define scalable view parameters
                      const chartWidth = 600;
                      const chartHeight = 200;
                      const paddingLeft = 50;
                      const paddingRight = 40;
                      const paddingTop = 25;
                      const paddingBottom = 35;
                      
                      const graphWidth = chartWidth - paddingLeft - paddingRight;
                      const graphHeight = chartHeight - paddingTop - paddingBottom;
                      
                      const points = scoreData.map((d, i) => {
                        const x = paddingLeft + (i * (graphWidth / (scoreData.length - 1 || 1)));
                        const y = paddingTop + graphHeight - (d.score * (graphHeight / 100));
                        return { x, y, score: d.score, title: d.title, idx: d.idx };
                      });
                      
                      // Draw line path
                      const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                      
                      // Area gradient fill
                      const areaPath = points.length > 0 
                        ? `${linePath} L ${points[points.length - 1].x} ${paddingTop + graphHeight} L ${points[0].x} ${paddingTop + graphHeight} Z`
                        : '';
                        
                      return (
                        <div style={{ width: '100%', position: 'relative', overflow: 'visible' }}>
                          <svg 
                            width="100%" 
                            height="100%" 
                            viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
                            style={{ 
                              width: '100%', 
                              height: 'auto',
                              display: 'block',
                              overflow: 'visible'
                            }}
                          >
                            <defs>
                              <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#B87BFF" stopOpacity="0.18" />
                                <stop offset="100%" stopColor="#B87BFF" stopOpacity="0" />
                              </linearGradient>
                            </defs>
                            
                            {/* Horizontal gridlines with small percentiles */}
                            {[0, 50, 100].map((val) => {
                              const y = paddingTop + graphHeight - (val * (graphHeight / 100));
                              return (
                                <g key={val}>
                                  <line x1={paddingLeft} y1={y} x2={chartWidth - paddingRight} y2={y} stroke="#F5F5F5" strokeWidth={1} />
                                  <text x={paddingLeft - 10} y={y + 3} textAnchor="end" style={{ fontSize: '0.62rem', fill: '#888888', fontWeight: '700' }}>{val}%</text>
                                </g>
                              );
                            })}
                            
                            {/* Area fill */}
                            {areaPath && <path d={areaPath} fill="url(#chart-area-grad)" />}
                            
                            {/* The score line */}
                            {linePath && (
                              <path 
                                d={linePath} 
                                fill="none" 
                                stroke="#B87BFF" 
                                strokeWidth={3} 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                              />
                            )}
                            
                            {/* Data Dots & Invisible Overlays for Hovering */}
                            {points.map((p, idx) => (
                              <g key={idx}>
                                <circle cx={p.x} cy={p.y} r={4.5} fill="#FFFFFF" stroke="#B87BFF" strokeWidth={2.5} />
                                
                                {/* X-axis labels: E1, E2, E3 format */}
                                <text 
                                  x={p.x} 
                                  y={chartHeight - 10} 
                                  textAnchor="middle" 
                                  style={{ fontSize: '0.68rem', fill: '#888888', fontWeight: '600' }}
                                >
                                  {`E${idx + 1}`}
                                </text>

                                {/* Invisible larger overlay for smooth hover detection */}
                                <circle 
                                  cx={p.x} 
                                  cy={p.y} 
                                  r={12} 
                                  fill="transparent" 
                                  style={{ cursor: 'pointer' }}
                                  onMouseEnter={() => setHoveredPoint(p)}
                                  onMouseLeave={() => setHoveredPoint(null)}
                                />
                              </g>
                            ))}
                          </svg>

                          {/* Float Custom Hover Comment Box */}
                          {hoveredPoint && (
                            <div style={{
                              position: 'absolute',
                              left: `${(hoveredPoint.x / chartWidth) * 100}%`,
                              top: `${(hoveredPoint.y / chartHeight) * 100}%`,
                              transform: 'translate(-50%, -120%)',
                              background: '#FFFFFF',
                              border: '1px solid #ECECEC',
                              borderRadius: '10px',
                              padding: '8px 12px',
                              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)',
                              zIndex: 100,
                              pointerEvents: 'none',
                              whiteSpace: 'nowrap',
                              textAlign: 'left',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px',
                              transition: 'all 0.1s ease'
                            }}>
                              <span style={{ fontSize: '0.72rem', color: '#888888', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {hoveredPoint.title}
                              </span>
                              <span style={{ fontSize: '0.85rem', color: '#E754A6', fontWeight: '700' }}>
                                Score: {hoveredPoint.score}%
                              </span>
                              {/* Small tooltip arrow */}
                              <div style={{
                                position: 'absolute',
                                bottom: '-5px',
                                left: '50%',
                                transform: 'translateX(-50%) rotate(45deg)',
                                width: '8px',
                                height: '8px',
                                background: '#FFFFFF',
                                borderRight: '1px solid #ECECEC',
                                borderBottom: '1px solid #ECECEC'
                              }} />
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Question Accuracy Chart */}
                  <div style={{
                    background: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #ECECEC',
                    padding: '28px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.01)'
                  }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#262626', marginBottom: '24px' }}>
                      Question Accuracy Breakdown
                    </h3>
                    
                    {(() => {
                      const correctCount = submissions.filter(s => s.percentage > 75).length;
                      const partialCount = submissions.filter(s => s.percentage > 40 && s.percentage <= 75).length;
                      const incorrectCount = submissions.filter(s => s.percentage <= 40).length;
                      const totalAnswers = submissions.length;
                      
                      const correctPct = totalAnswers > 0 ? Math.round((correctCount / totalAnswers) * 100) : 0;
                      const partialPct = totalAnswers > 0 ? Math.round((partialCount / totalAnswers) * 100) : 0;
                      const incorrectPct = totalAnswers > 0 ? (100 - correctPct - partialPct) : 0;

                      // Circumference is 251.2 for radius 40
                      const radius = 40;
                      const strokeWidth = 10;
                      const circumference = 2 * Math.PI * radius; // 251.3
                      
                      const correctStroke = (correctPct / 100) * circumference;
                      const partialStroke = (partialPct / 100) * circumference;
                      const incorrectStroke = (incorrectPct / 100) * circumference;
                      
                      const correctOffset = 0;
                      const partialOffset = -correctStroke;
                      const incorrectOffset = -(correctStroke + partialStroke);
                      
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '48px', flexWrap: 'wrap' }}>
                          {/* Left Donut */}
                          <div style={{ position: 'relative', width: '130px', height: '130px' }}>
                            <svg width="130" height="130" viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r={radius} fill="none" stroke="#ECECEC" strokeWidth={strokeWidth} />
                              
                              {/* Correct (pastel green) */}
                              {correctPct > 0 && (
                                <circle 
                                  cx="50" 
                                  cy="50" 
                                  r={radius} 
                                  fill="none" 
                                  stroke="#34C759" 
                                  strokeWidth={strokeWidth} 
                                  strokeDasharray={`${correctStroke} ${circumference}`}
                                  strokeDashoffset={correctOffset}
                                  strokeLinecap="round"
                                  transform="rotate(-90 50 50)"
                                />
                              )}
                              
                              {/* Partially Correct (pastel orange/yellow) */}
                              {partialPct > 0 && (
                                <circle 
                                  cx="50" 
                                  cy="50" 
                                  r={radius} 
                                  fill="none" 
                                  stroke="#F59E0B" 
                                  strokeWidth={strokeWidth} 
                                  strokeDasharray={`${partialStroke} ${circumference}`}
                                  strokeDashoffset={partialOffset}
                                  strokeLinecap="round"
                                  transform="rotate(-90 50 50)"
                                />
                              )}
                              
                              {/* Incorrect (pastel red) */}
                              {incorrectPct > 0 && (
                                <circle 
                                  cx="50" 
                                  cy="50" 
                                  r={radius} 
                                  fill="none" 
                                  stroke="#EF4444" 
                                  strokeWidth={strokeWidth} 
                                  strokeDasharray={`${incorrectStroke} ${circumference}`}
                                  strokeDashoffset={incorrectOffset}
                                  transform="rotate(-90 50 50)"
                                />
                              )}
                            </svg>
                            
                            {/* Center text */}
                            <div style={{
                              position: 'absolute',
                              top: 0, left: 0, right: 0, bottom: 0,
                              display: 'flex', flexDirection: 'column',
                              alignItems: 'center', justifyContent: 'center'
                            }}>
                              <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#262626' }}>{correctPct}%</span>
                              <span style={{ fontSize: '0.65rem', color: '#888888', fontWeight: '700', textTransform: 'uppercase' }}>Correct</span>
                            </div>
                          </div>
                          
                          {/* Right Legends */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, minWidth: '220px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: '#34C759' }} />
                              <span style={{ fontSize: '0.9rem', color: '#606060', fontWeight: '500' }}>
                                Excellent Answer (&gt;75%): <strong style={{ color: '#262626' }}>{correctPct}%</strong> ({correctCount} Qs)
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: '#F59E0B' }} />
                              <span style={{ fontSize: '0.9rem', color: '#606060', fontWeight: '500' }}>
                                Partially Correct (40%-75%): <strong style={{ color: '#262626' }}>{partialPct}%</strong> ({partialCount} Qs)
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: '#EF4444' }} />
                              <span style={{ fontSize: '0.9rem', color: '#606060', fontWeight: '500' }}>
                                Incorrect Answer (&lt;40%): <strong style={{ color: '#262626' }}>{incorrectPct}%</strong> ({incorrectCount} Qs)
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </>
              )}
            </div>
          )}

        </div>

        {/* Clean Squircle Floating Logout Button (icon-only, bottom-right) */}
        <button 
          onClick={handleLogout}
          className="premium-hover-lift"
          style={{
            position: 'fixed',
            bottom: '32px',
            right: '32px',
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: '#FFFFFF',
            border: '1px solid #ECECEC',
            boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#888888',
            zIndex: 1000
          }}
          title="Logout"
          onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.borderColor = '#EF4444'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#888888'; e.currentTarget.style.borderColor = '#ECECEC'; }}
        >
          <LogOut size={20} />
        </button>

      </main>
    </div>
  );
}
