import React from 'react';
import { useStore, UserRole } from '../../store/useStore';

interface PermissionGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({ 
  allowedRoles, 
  children, 
  fallback = null 
}) => {
  const { currentUser } = useStore();

  if (!currentUser || !allowedRoles.includes(currentUser.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
