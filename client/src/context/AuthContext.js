import { createContext, useState, useEffect } from 'react';
import API from '../utils/api';
import { normalizeRole } from '../utils/roleHelper';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        checkUserLoggedIn();
    }, []);

    const checkUserLoggedIn = async () => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const config = {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                };
                const { data } = await API.get('/api/auth/me', config);
                if (data && data.role) data.role = normalizeRole(data.role);
                setUser(data);
            } catch (err) {
                localStorage.removeItem('token');
                setUser(null);
            }
        }
        setLoading(false);
    };

    const login = async (email, password) => {
        try {
            const { data } = await API.post('/api/auth/login', { email, password });
            if (data && data.role) data.role = normalizeRole(data.role);
            localStorage.setItem('token', data.token);
            setUser(data);
            setError(null);
            return data;
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
            throw err;
        }
    };

    const register = async (userData) => {
        try {
            const { data } = await API.post('/api/auth/register', userData);
            if (data && data.role) data.role = normalizeRole(data.role);
            localStorage.setItem('token', data.token);
            setUser(data);
            setError(null);
            return data;
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
            throw err;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading, error }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;