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
        <div className="auth-container">
            <div className="auth-form glass-panel stagger-in" style={{ maxWidth: '480px' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ color: 'var(--text-primary)', margin: '0 0 0.5rem 0', fontSize: '1.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                        <span>🏛️</span> <span style={{ fontFamily: 'Fraunces, serif' }}>Citizen Portal</span>
                    </h1>
                    <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.88rem' }}>
                        Register for a Citizen Grievance & Tracking Account
                    </p>
                </div>

                {error && (
                    <div style={{ padding: '0.8rem', background: 'rgba(192, 67, 59, 0.15)', color: 'var(--signal-red)', border: '1px solid rgba(192, 67, 59, 0.3)', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                    <div className="form-group">
                        <label>Full Name *</label>
                        <input
                            type="text"
                            placeholder="Rajesh Kumar"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Email Address *</label>
                        <input
                            type="email"
                            placeholder="rajesh@example.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Contact Phone *</label>
                        <input
                            type="text"
                            placeholder="+91 98100 12345"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Residential Address</label>
                        <input
                            type="text"
                            placeholder="Flat 402, Sector 62, Noida"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>Password *</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                            minLength="6"
                        />
                    </div>

                    <button type="submit" disabled={isLoading} className="btn-municipal" style={{ width: '100%', marginTop: '0.5rem' }}>
                        {isLoading ? 'Creating Account...' : '📝 Register Citizen Account'}
                    </button>

                    <div style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                        Already registered? <Link to="/login" style={{ color: 'var(--accent-amber)', textDecoration: 'none', fontWeight: 'bold' }}>Sign In</Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Register;
