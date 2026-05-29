import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { NotificationProvider } from './context/NotificationContext';
import PageTransition from './components/PageTransition';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import OTP from './pages/OTP';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword  from './pages/ResetPassword';
import Dashboard      from './pages/Dashboard';
import MyFiles        from './pages/MyFiles';
import AdminGlobal    from './pages/AdminGlobal';
import AdminPanel     from './pages/AdminPanel';
import SharedWithMe   from './pages/SharedWithMe';
import FileVersions   from './pages/FileVersions';
import History        from './pages/History';
import AdminEspace    from './pages/AdminEspace';
import MyEspaces     from './pages/MyEspaces';
import Logs           from './pages/Logs';
import AdminUsers     from './pages/AdminUsers';
import Settings       from './pages/Settings';
import EspaceDetail   from './pages/EspaceDetail';
import JoinEspace     from './pages/JoinEspace';
import AdminEspacesAll  from './pages/AdminEspacesAll';
import AdminFichiersAll from './pages/AdminFichiersAll';
import AdminQuotas          from './pages/AdminQuotas';
import AdminQuotaRequests   from './pages/AdminQuotaRequests';
import FileEditor            from './pages/FileEditor';
import ForceResetPassword    from './pages/ForceResetPassword';

function PrivateRoute({ children }) {
  const token     = localStorage.getItem('token');
  const mustReset = localStorage.getItem('must_reset_password') === 'true';
  const location  = useLocation();

  if (!token) return <Navigate to="/login" />;
  if (mustReset && location.pathname !== '/force-reset-password') {
    return <Navigate to="/force-reset-password" replace />;
  }
  return children;
}

function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', background: '#0f172a', color: '#94a3b8', fontFamily: 'sans-serif' }}>
      <span style={{ fontSize: '64px', fontWeight: 800, color: '#06b6d4' }}>404</span>
      <p style={{ fontSize: '18px', fontWeight: 600, color: '#e2e8f0' }}>Page introuvable</p>
      <p style={{ fontSize: '14px' }}>Cette page n'existe pas ou a été déplacée.</p>
      <Link to="/" style={{ marginTop: '8px', padding: '10px 24px', background: '#06b6d4', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '14px' }}>
        Retour à l'accueil
      </Link>
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/"         element={<PageTransition><Landing /></PageTransition>} />
        <Route path="/login"    element={<PageTransition><Login /></PageTransition>} />
        <Route path="/register" element={<PageTransition><Register /></PageTransition>} />
        <Route path="/otp"                   element={<PageTransition><OTP /></PageTransition>} />
        <Route path="/forgot-password"       element={<PageTransition><ForgotPassword /></PageTransition>} />
        <Route path="/reset-password/:token" element={<PageTransition><ResetPassword /></PageTransition>} />

        <Route path="/app" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard"            element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/files"                element={<PrivateRoute><MyFiles /></PrivateRoute>} />
        <Route path="/shared"               element={<PrivateRoute><SharedWithMe /></PrivateRoute>} />
        <Route path="/versions"             element={<PrivateRoute><History /></PrivateRoute>} />
        <Route path="/file-versions"        element={<PrivateRoute><FileVersions /></PrivateRoute>} />
        <Route path="/admin"                element={<PrivateRoute><AdminPanel /></PrivateRoute>} />
        <Route path="/admin-espace"         element={<PrivateRoute><MyEspaces /></PrivateRoute>} />
        <Route path="/acl"                  element={<PrivateRoute><AdminEspace /></PrivateRoute>} />
        <Route path="/logs"                 element={<PrivateRoute><Logs /></PrivateRoute>} />
        <Route path="/admin-users"          element={<PrivateRoute><AdminUsers /></PrivateRoute>} />
        <Route path="/settings"             element={<PrivateRoute><Settings /></PrivateRoute>} />
        <Route path="/espace/:espaceId"     element={<PrivateRoute><EspaceDetail /></PrivateRoute>} />
        <Route path="/join/:token"          element={<JoinEspace />} />
        <Route path="/admin-espaces-all"    element={<PrivateRoute><AdminEspacesAll /></PrivateRoute>} />
        <Route path="/admin-fichiers-all"   element={<PrivateRoute><AdminFichiersAll /></PrivateRoute>} />
        <Route path="/admin-quotas"           element={<PrivateRoute><AdminQuotas /></PrivateRoute>} />
        <Route path="/admin-quota-requests" element={<PrivateRoute><AdminQuotaRequests /></PrivateRoute>} />
        <Route path="/editor"               element={<PrivateRoute><FileEditor /></PrivateRoute>} />
        <Route path="/force-reset-password" element={<PrivateRoute><ForceResetPassword /></PrivateRoute>} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <AnimatedRoutes />
      </NotificationProvider>
    </BrowserRouter>
  );
}
