import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Public pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Citizen pages
import CitizenDashboard from './pages/citizen/CitizenDashboard';
import SubmitGrievance from './pages/citizen/SubmitGrievance';
import MyGrievances from './pages/citizen/MyGrievances';
import GrievanceDetail from './pages/citizen/GrievanceDetail';

// Officer pages
import OfficerDashboard from './pages/officer/OfficerDashboard';
import OfficerGrievances from './pages/officer/OfficerGrievances';
import AssignedCitizens from './pages/officer/AssignedCitizens';
import Profile from './pages/staff/Profile';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import CitizenManagement from './pages/admin/CitizenManagement';
import Grievances from './pages/admin/Grievances';
import SmartInsight from './pages/admin/SmartInsight';
import AuditLogs from './pages/admin/AuditLogs';
import CitizenProfile from './pages/CitizenProfile';

import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:resetToken" element={<ResetPassword />} />

          {/* Citizen Routes */}
          <Route path="/citizen" element={<ProtectedRoute role="citizen"><CitizenDashboard /></ProtectedRoute>} />
          <Route path="/citizen/submit" element={<ProtectedRoute role="citizen"><SubmitGrievance /></ProtectedRoute>} />
          <Route path="/citizen/grievances" element={<ProtectedRoute role="citizen"><MyGrievances /></ProtectedRoute>} />
          <Route path="/citizen/grievance/:id" element={<ProtectedRoute role={['citizen', 'officer', 'admin', 'manager']}><GrievanceDetail /></ProtectedRoute>} />

          {/* Officer / Staff Routes */}
          <Route path="/officer" element={<ProtectedRoute role={['officer', 'staff']}><OfficerDashboard /></ProtectedRoute>} />
          <Route path="/officer/grievances" element={<ProtectedRoute role={['officer', 'staff']}><OfficerGrievances /></ProtectedRoute>} />
          <Route path="/officer/citizens" element={<ProtectedRoute role={['officer', 'staff']}><AssignedCitizens /></ProtectedRoute>} />
          <Route path="/staff" element={<ProtectedRoute role={['officer', 'staff']}><OfficerDashboard /></ProtectedRoute>} />
          <Route path="/staff/reports" element={<ProtectedRoute role={['officer', 'staff']}><OfficerGrievances /></ProtectedRoute>} />
          <Route path="/staff/customers" element={<ProtectedRoute role={['officer', 'staff']}><AssignedCitizens /></ProtectedRoute>} />

          {/* Admin / Manager Routes */}
          <Route path="/admin" element={<ProtectedRoute role={['admin', 'manager']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/citizens" element={<ProtectedRoute role={['admin', 'manager']}><CitizenManagement /></ProtectedRoute>} />
          <Route path="/admin/customers" element={<ProtectedRoute role={['admin', 'manager']}><CitizenManagement /></ProtectedRoute>} />
          <Route path="/admin/grievances" element={<ProtectedRoute role={['admin', 'manager']}><Grievances /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute role={['admin', 'manager']}><Grievances /></ProtectedRoute>} />
          <Route path="/admin/insights" element={<ProtectedRoute role={['admin', 'manager']}><SmartInsight /></ProtectedRoute>} />
          <Route path="/admin/audit" element={<ProtectedRoute role="admin"><AuditLogs /></ProtectedRoute>} />

          {/* Shared Profile & Detail Routes */}
          <Route path="/citizen-profile/:id" element={<ProtectedRoute role={['admin', 'manager', 'officer', 'citizen']}><CitizenProfile /></ProtectedRoute>} />
          <Route path="/customer/:id" element={<ProtectedRoute role={['admin', 'manager', 'officer', 'citizen']}><CitizenProfile /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute role={['admin', 'manager', 'officer', 'citizen']}><Profile /></ProtectedRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
