import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { normalizeRole } from '../utils/roleHelper';

const ProtectedRoute = ({ children, role }) => {
    const { user, loading } = useContext(AuthContext);

    if (loading) return <div className="loading-spinner" style={{ padding: '2rem', textAlign: 'center', color: 'white' }}>Loading Portal...</div>;

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (role) {
        const allowedRoles = (Array.isArray(role) ? role : [role]).map(r => normalizeRole(r));
        const userRole = normalizeRole(user.role);

        if (!allowedRoles.includes(userRole)) {
            // Redirect to role-appropriate dashboard
            if (userRole === 'admin' || userRole === 'manager') {
                return <Navigate to="/admin" replace />;
            } else if (userRole === 'officer') {
                return <Navigate to="/officer" replace />;
            } else {
                return <Navigate to="/citizen" replace />;
            }
        }
    }

    return children;
};

export default ProtectedRoute;
