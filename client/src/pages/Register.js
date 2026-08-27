import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';

const Register = () => {
    const [formData, setFormData] = useState({ name: '', email: '', password: '', phone: '', address: '' });
    const { register } = useContext(AuthContext);
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            await register(formData);
            navigate('/citizen');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed. Try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '2rem' }}>
            <div className="auth-form glass-card" style={{ maxWidth: '480px', width: '100%', padding: '2.5rem', borderRadius: '16px' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ color: 'var(--accent-primary)', margin: '0 0 0.5rem 0', fontSize: '1.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                        <span>🏛️</span> Citizen Portal
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>
                        Register for a Citizen Grievance & Tracking Account
                    </p>
                </div>

                {error && (
                    <div style={{ padding: '0.8rem', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    <div className="form-group">
                        <label style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.4rem', fontSize: '0.88rem' }}>Full Name *</label>
                        <input
                            type="text"
                            placeholder="Rajesh Kumar"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            style={{ width: '100%', padding: '0.7rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', outline: 'none' }}
                        />
                    </div>

                    <div className="form-group">
                        <label style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.4rem', fontSize: '0.88rem' }}>Email Address *</label>
                        <input
                            type="email"
                            placeholder="rajesh@example.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                            style={{ width: '100%', padding: '0.7rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', outline: 'none' }}
                        />
                    </div>

                    <div className="form-group">
                        <label style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.4rem', fontSize: '0.88rem' }}>Contact Phone *</label>
                        <input
                            type="text"
                            placeholder="+91 98100 12345"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            required
                            style={{ width: '100%', padding: '0.7rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', outline: 'none' }}
                        />
                    </div>

                    <div className="form-group">
                        <label style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.4rem', fontSize: '0.88rem' }}>Residential Address</label>
                        <input
                            type="text"
                            placeholder="Flat 402, Sector 62, Noida"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            style={{ width: '100%', padding: '0.7rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', outline: 'none' }}
                        />
                    </div>

                    <div className="form-group">
                        <label style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.4rem', fontSize: '0.88rem' }}>Password *</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                            minLength="6"
                            style={{ width: '100%', padding: '0.7rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', outline: 'none' }}
                        />
                    </div>

                    <button type="submit" disabled={isLoading} style={{
                        width: '100%',
                        padding: '0.8rem',
                        background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
                        border: 'none',
                        borderRadius: '8px',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '1rem',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        marginTop: '0.5rem'
                    }}>
                        {isLoading ? 'Creating Account...' : 'Register Citizen Account'}
                    </button>

                    <div style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        Already registered? <Link to="/login" style={{ color: '#818cf8', textDecoration: 'none', fontWeight: 'bold' }}>Sign In</Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Register;
