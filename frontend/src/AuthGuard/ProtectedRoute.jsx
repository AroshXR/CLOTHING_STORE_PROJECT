import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './authGuard';

const normalizeTypes = (types) => {
    if (!types) {
        return null;
    }

    const list = Array.isArray(types) ? types : [types];
    return list.map((type) => type?.toLowerCase()).filter(Boolean);
};

const ProtectedRoute = ({ children, allowedUserTypes = null }) => {
    const { isAuthenticated, currentUser, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                fontSize: '18px'
            }}>
                Loading...
            </div>
        );
    }

    if (!isAuthenticated()) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    const allowedTypes = normalizeTypes(allowedUserTypes);

    const accountRoles = [currentUser?.type, ...(['owner', 'admin'].includes(currentUser?.role) ? [currentUser.role] : [])].filter(Boolean).map(value => value.toLowerCase());
    if (allowedTypes && !allowedTypes.some(type => accountRoles.includes(type))) {
        return <Navigate to="/unauthorized" replace />;
    }

    return children;
};

export default ProtectedRoute;
