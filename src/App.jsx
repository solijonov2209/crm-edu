import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Layout } from './components/layout';
import { Loading } from './components/common';

// Auth Pages
import { Login } from './pages/auth';

// Admin Pages
import {
  Dashboard as AdminDashboard,
  Teams,
  Players as AdminPlayers,
  Coaches,
  Trainings as AdminTrainings,
  TrainingDetail,
  Matches as AdminMatches,
  MatchDetail,
  Tactics as AdminTactics,
  Statistics,
  Calendar,
  Settings as AdminSettings,
} from './pages/admin';

// Coach Pages
import {
  Dashboard as CoachDashboard,
  Players as CoachPlayers,
  Trainings as CoachTrainings,
  Matches as CoachMatches,
  Tactics as CoachTactics,
  Settings as CoachSettings,
} from './pages/coach';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    // Redirect to appropriate dashboard based on role
    if (user?.role === 'super_admin') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/coach/dashboard" replace />;
  }

  return children;
};

// Public Route - Redirect if authenticated
const PublicRoute = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (isAuthenticated) {
    if (user?.role === 'super_admin') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/coach/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="teams" element={<Teams />} />
        <Route path="players" element={<AdminPlayers />} />
        <Route path="coaches" element={<Coaches />} />
        <Route path="trainings" element={<AdminTrainings />} />
        <Route path="trainings/:id" element={<TrainingDetail />} />
        <Route path="matches" element={<AdminMatches />} />
        <Route path="matches/:id" element={<MatchDetail />} />
        <Route path="tactics" element={<AdminTactics />} />
        <Route path="statistics" element={<Statistics />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      {/* Coach Routes */}
      <Route
        path="/coach"
        element={
          <ProtectedRoute allowedRoles={['coach']}>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<CoachDashboard />} />
        <Route path="players" element={<CoachPlayers />} />
        <Route path="trainings" element={<CoachTrainings />} />
        <Route path="trainings/:id" element={<TrainingDetail />} />
        <Route path="matches" element={<CoachMatches />} />
        <Route path="matches/:id" element={<MatchDetail />} />
        <Route path="tactics" element={<CoachTactics />} />
        <Route path="statistics" element={<Statistics />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="settings" element={<CoachSettings />} />
      </Route>

      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* 404 - Redirect to login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
