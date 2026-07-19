import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Sparkles } from 'lucide-react';

export default function Auth() {
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(location.state?.mode === 'register' ? false : true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    roll_number: '',
    semester: ''
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (location.state?.mode === 'register') {
      setIsLogin(false);
    }
  }, [location.state]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (isLogin) {
        const res = await axios.post('http://localhost:5000/api/auth/login', {
          email: formData.email,
          password: formData.password
        });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('role', res.data.user.role);
        localStorage.setItem('name', res.data.user.name);
        if (res.data.user.roll_number) localStorage.setItem('roll_number', res.data.user.roll_number);
        if (res.data.user.semester) localStorage.setItem('semester', res.data.user.semester);
        if (res.data.user.department) localStorage.setItem('department', res.data.user.department);
        if (res.data.user.avatar) localStorage.setItem('avatar', res.data.user.avatar);
        
        if (res.data.user.role === 'student') navigate('/student');
        else navigate('/teacher');
      } else {
        await axios.post('http://localhost:5000/api/auth/register', formData);
        // Switch to login after successful register
        setIsLogin(true);
        setError('Registration successful! Please login.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong.');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '450px',
        padding: '40px',
        textAlign: 'center'
      }}>
        <div style={{ display: 'inline-flex', marginBottom: '20px', color: 'var(--accent-blue)' }}>
          <Sparkles size={32} />
        </div>
        <h2 style={{ fontSize: '2rem', marginBottom: '30px' }}>
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>
        
        {error && <p style={{ color: error.includes('success') ? 'green' : 'var(--accent-red)', marginBottom: '15px' }}>{error}</p>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {!isLogin && (
            <>
              <input
                className="input-field"
                type="text"
                name="name"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleChange}
                required
              />
              <select
                className="input-field"
                name="role"
                value={formData.role}
                onChange={handleChange}
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </select>
              
              {formData.role === 'student' && (
                <>
                  <input
                    className="input-field"
                    type="text"
                    name="roll_number"
                    placeholder="Roll Number (e.g. 2024CS0192)"
                    value={formData.roll_number}
                    onChange={handleChange}
                    required
                  />
                  <input
                    className="input-field"
                    type="text"
                    name="semester"
                    placeholder="Semester (e.g. 6th Semester)"
                    value={formData.semester}
                    onChange={handleChange}
                    required
                  />
                </>
              )}
            </>
          )}

          <input
            className="input-field"
            type="email"
            name="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <input
            className="input-field"
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
          />

          <button type="submit" className="btn-primary" style={{ marginTop: '10px' }}>
            {isLogin ? 'Login' : 'Register'}
          </button>
        </form>

        <p style={{ marginTop: '20px', color: 'var(--text-muted)' }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <span 
            onClick={() => setIsLogin(!isLogin)} 
            style={{ color: 'var(--accent-blue)', cursor: 'pointer', fontWeight: 600 }}
          >
            {isLogin ? 'Sign up' : 'Log in'}
          </span>
        </p>
      </div>
    </div>
  );
}
