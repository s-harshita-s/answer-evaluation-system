import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import ExamView from './pages/ExamView';
import ResultView from './pages/ResultView';
import ExamManagement from './pages/ExamManagement';

// Simple PrivateRoute wrapper
const PrivateRoute = ({ children, role }) => {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');

  if (!token) {
    return <Navigate to="/auth" />;
  }

  if (role && userRole !== role) {
    return <Navigate to="/" />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        
        {/* Student Routes */}
        <Route 
          path="/student" 
          element={
            <PrivateRoute role="student">
              <StudentDashboard />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/exam/:id" 
          element={
            <PrivateRoute role="student">
              <ExamView />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/result/:examId" 
          element={
            <PrivateRoute role="student">
              <ResultView />
            </PrivateRoute>
          } 
        />

        {/* Teacher Routes */}
        <Route 
          path="/teacher" 
          element={
            <PrivateRoute role="teacher">
              <TeacherDashboard />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/teacher/exams" 
          element={
            <PrivateRoute role="teacher">
              <ExamManagement />
            </PrivateRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;
