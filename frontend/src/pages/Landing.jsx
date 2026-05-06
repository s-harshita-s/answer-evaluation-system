import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';

export default function Landing() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav className="nav-bar">
        <div className="logo">evalAI</div>
        <div>
          <Link to="/auth" className="btn-primary" style={{ marginRight: '15px' }}>Login</Link>
          <Link to="/auth" state={{ mode: 'register' }} className="btn-primary">Sign Up</Link>
        </div>
      </nav>

      <main style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '0 5%',
        gap: '5%'
      }}>
        
        {/* Left Side: Content */}
        <div style={{ flex: 1, maxWidth: '600px' }}>
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px',
            background: 'var(--glass-bg)',
            padding: '8px 16px',
            borderRadius: '100px',
            border: '1px solid var(--glass-border)',
            color: 'var(--accent-pink)',
            fontWeight: 600,
            marginBottom: '20px'
          }}>
            <Sparkles size={18} />
            <span>AI-Powered Grading</span>
          </div>

          <h1 style={{ 
            fontSize: '4.5rem', 
            marginBottom: '20px',
            background: 'linear-gradient(45deg, var(--text-dark), var(--text-muted))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-1px'
          }}>
            Evaluate answers <br/>
            <span style={{ 
              background: 'linear-gradient(135deg, var(--accent-pink), var(--accent-orange))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: 'inline-block',
              transform: 'rotate(-2deg)'
            }}>in seconds.</span>
          </h1>

          <p style={{ 
            fontSize: '1.2rem', 
            color: 'var(--text-muted)', 
            marginBottom: '40px',
            maxWidth: '480px'
          }}>
            Upload exams, let students submit answers, and our AI instantly grades them based on semantic meaning, keywords, and grammar.
          </p>

          <Link to="/auth" state={{ mode: 'register' }} className="btn-primary" style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '10px',
            fontSize: '1.2rem',
            padding: '16px 32px'
          }}>
            Get Started <ArrowRight size={20} />
          </Link>
        </div>

        {/* Right Side: Illustration */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <div className="floating glass-panel" style={{ padding: '20px' }}>
            <img 
              src="/hero.png" 
              alt="AI Evaluation Illustration" 
              style={{ 
                width: '100%', 
                maxWidth: '500px', 
                borderRadius: '16px',
                display: 'block'
              }} 
            />
          </div>
        </div>
      </main>
    </div>
  );
}
