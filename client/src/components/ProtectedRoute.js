import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';

const ProtectedRoute = ({ children, role }) => {
    const { user, loading } = useContext(AuthContext);

    if (loading) return <div className="loading-spinner" style={{ padding: '2rem', textAlign: 'center', color: 'white' }}>Loading Portal...</div>;

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (role) {
        const allowedRoles = Array.isArray(role) ? role : [role];
        if (!allowedRoles.includes(user.role)) {
            // Redirect to role-appropriate dashboard
            if (user.role === 'admin' || user.role === 'manager') {
                return <Navigate to="/admin" replace />;
            } else if (user.role === 'officer') {
                return <Navigate to="/officer" replace />;
            } else {
                return <Navigate to="/citizen" replace />;
            }
        }
    }

    return children;
};

export default ProtectedRoute;
