import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';

const Login = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const user = await login(formData.email, formData.password);
            if (user.role === 'admin' || user.role === 'manager') {
                navigate('/admin');
            } else if (user.role === 'officer') {
                navigate('/officer');
            } else {
                navigate('/citizen');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid email or password');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-form glass-panel stagger-in">
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ color: 'var(--text-primary)', margin: '0 0 0.5rem 0', fontSize: '1.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                        <span>🏛️</span> <span style={{ fontFamily: 'Fraunces, serif' }}>Civic Portal</span>
                    </h1>
                    <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.88rem' }}>
                        Sign in to access your portal account
                    </p>
                </div>

                {error && (
                    <div style={{ padding: '0.8rem', background: 'rgba(192, 67, 59, 0.15)', color: 'var(--signal-red)', border: '1px solid rgba(192, 67, 59, 0.3)', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    <div className="form-group">
                        <label>Email Address</label>
                        <input
                            type="email"
                            placeholder="name@example.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                        />
                    </div>

                    <button type="submit" disabled={isLoading} className="btn-municipal" style={{ width: '100%', marginTop: '0.5rem' }}>
                        {isLoading ? 'Signing In...' : '🔑 Sign In'}
                    </button>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', textAlign: 'center', marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        <Link to="/forgot-password" style={{ color: 'var(--accent-amber)', textDecoration: 'none' }}>Forgot Password?</Link>
                        <div>New Citizen? <Link to="/register" style={{ color: 'var(--accent-amber)', textDecoration: 'none', fontWeight: 'bold' }}>Create Account</Link></div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;
