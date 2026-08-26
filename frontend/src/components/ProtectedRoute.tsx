import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import { hasAnyStoredPermission } from '../lib/access';
import { isStoredAdmin } from '../lib/utils';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
  adminOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredPermissions, adminOnly = false }) => {
  const token = localStorage.getItem('token');
  const location = useLocation();
  const storedUser = localStorage.getItem('user');
  let user = null;

  try {
    user = storedUser ? JSON.parse(storedUser) : null;
  } catch {
    localStorage.removeItem('user');
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (user?.not_active && location.pathname !== '/dashboard') {
    return <Navigate to="/dashboard" replace />;
  }

  if (!isStoredAdmin() && !user?.not_active && !user?.estate_id && location.pathname !== '/dashboard') {
    return <Navigate to="/dashboard" replace />;
  }

  if (adminOnly && !isStoredAdmin()) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requiredPermissions?.length && !hasAnyStoredPermission(requiredPermissions)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <MainLayout>{children}</MainLayout>;
};

export default ProtectedRoute;
