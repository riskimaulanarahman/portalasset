import React from 'react';
import { Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import { hasAnyStoredPermission } from '../lib/access';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredPermissions }) => {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPermissions?.length && !hasAnyStoredPermission(requiredPermissions)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <MainLayout>{children}</MainLayout>;
};

export default ProtectedRoute;
