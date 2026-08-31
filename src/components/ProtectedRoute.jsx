import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children, allowedRoles, requiredPermission }) => {
  const { user, loading, role } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <Loader2 className="spinner" size={48} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const effectiveRole = user?.role || role || 'doctor';
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(effectiveRole)) {
    // Role unauthorized — redirect to dashboard
    return <Navigate to="/" replace />;
  }

  if (requiredPermission && !hasPermission(user, requiredPermission)) {
    // Missing permission — redirect to dashboard
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
