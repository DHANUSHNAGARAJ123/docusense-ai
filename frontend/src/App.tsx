// frontend/src/App.tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UploadPage from './pages/UploadPage';
import ProcessingPage from './pages/ProcessingPage';
import ResultsPage from './pages/ResultsPage';
import ReviewQueuePage from './pages/ReviewQueuePage';
import AuditLogPage from './pages/AuditLogPage';
import InsightsPage from './pages/InsightsPage';
import { getSession } from './services/firebase';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!getSession()) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Router>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid rgba(14,165,233,0.2)',
            borderRadius: '12px',
            fontFamily: 'Space Grotesk, sans-serif',
          },
          success: { iconTheme: { primary: '#34d399', secondary: '#1e293b' } },
          error:   { iconTheme: { primary: '#fb7185', secondary: '#1e293b' } },
        }}
      />
      <Routes>
        {/* Public */}
        <Route path="/login" element={
          getSession() ? <Navigate to="/dashboard" replace /> : <LoginPage />
        } />

        {/* Protected */}
        <Route path="/" element={
          <ProtectedRoute><AppLayout /></ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"      element={<DashboardPage />} />
          <Route path="upload"         element={<UploadPage />} />
          <Route path="processing/:id" element={<ProcessingPage />} />
          <Route path="results/:id"    element={<ResultsPage />} />
          <Route path="review"         element={<ReviewQueuePage />} />
          <Route path="audit"          element={<AuditLogPage />} />
          <Route path="insights"       element={<InsightsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}