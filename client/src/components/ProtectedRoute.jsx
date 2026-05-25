import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    console.log('[ProtectedRoute] Auth is loading, showing spinner...');
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800" />
      </div>
    );
  }

  if (!user) {
    console.warn('[ProtectedRoute] No user found in context. Redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    console.warn(`[ProtectedRoute] User role ${user.role} not in allowed roles ${roles}. Redirecting to /`);
    return <Navigate to="/" replace />;
  }

  console.log('[ProtectedRoute] Access granted for user:', user.email);
  return children;
};

export default ProtectedRoute;
