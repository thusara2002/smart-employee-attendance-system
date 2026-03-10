import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Kiosk from './pages/Kiosk';
import DashboardLayout from './components/DashboardLayout';
import AdminDashboard from './pages/AdminDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import EmployeeManagement from './pages/EmployeeManagement';
import AttendanceView from './pages/AttendanceView';
import LeaveManagement from './pages/LeaveManagement';
import ShiftManagement from './pages/ShiftManagement';
import MyAttendance from './pages/MyAttendance';
import MyLeaves from './pages/MyLeaves';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import Reports from './pages/Reports';
import FaceAutoKiosk from './pages/FaceAutoKiosk';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Protected Route
function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Role-based dashboard redirect
function DashboardRedirect() {
  const { user } = useAuth();

  if (user?.role === 'SUPER_ADMIN') return <Navigate to="/admin" replace />;
  if (user?.role === 'ADMIN' || user?.role === 'STAFF_ADMIN') return <Navigate to="/hr" replace />;
  return <Navigate to="/employee" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/kiosk" element={<Kiosk />} />
      <Route path="/auto-kiosk" element={<FaceAutoKiosk />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />

      {/* Dashboard Redirect */}
      <Route path="/" element={
        <ProtectedRoute><DashboardRedirect /></ProtectedRoute>
      } />

      {/* Super Admin Routes */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
          <DashboardLayout />
        </ProtectedRoute>
      }>
        <Route index element={<AdminDashboard />} />
        <Route path="employees" element={<EmployeeManagement />} />
        <Route path="attendance" element={<AttendanceView />} />
        <Route path="leaves" element={<LeaveManagement />} />
        <Route path="shifts" element={<ShiftManagement />} />
        <Route path="reports" element={<Reports />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      {/* HR/Admin Routes */}
      <Route path="/hr" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN', 'STAFF_ADMIN']}>
          <DashboardLayout />
        </ProtectedRoute>
      }>
        <Route index element={<AdminDashboard />} />
        <Route path="employees" element={<EmployeeManagement />} />
        <Route path="attendance" element={<AttendanceView />} />
        <Route path="leaves" element={<LeaveManagement />} />
        <Route path="shifts" element={<ShiftManagement />} />
        <Route path="reports" element={<Reports />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      {/* Employee Routes */}
      <Route path="/employee" element={
        <ProtectedRoute allowedRoles={['EMPLOYEE', 'ADMIN', 'SUPER_ADMIN']}>
          <DashboardLayout />
        </ProtectedRoute>
      }>
        <Route index element={<EmployeeDashboard />} />
        <Route path="attendance" element={<MyAttendance />} />
        <Route path="leaves" element={<MyLeaves />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <ErrorBoundary>
              <AppRoutes />
            </ErrorBoundary>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
