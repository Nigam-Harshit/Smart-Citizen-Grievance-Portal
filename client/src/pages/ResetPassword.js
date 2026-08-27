import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import API from '../utils/api';

const ResetPassword = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [msg, setMsg] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { resetToken } = useParams();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        setMsg('');
        setError('');

        try {
            await API.put(`/api/auth/resetpassword/${resetToken}`, { password });
            setMsg('Password Reset Successful! Redirecting to login...');
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid or expired token');
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-form glass-card">
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ color: 'var(--accent-primary)', margin: 0 }}>MMSolutions</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Set New Password</p>
                </div>

                {msg && <div style={{ color: 'var(--success)', marginBottom: '1rem', background: 'rgba(34, 197, 94, 0.1)', padding: '0.5rem', borderRadius: '4px' }}>{msg}</div>}
                {error && <div className="error-msg">{error}</div>}

                {!msg && (
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label style={{ color: 'var(--text-primary)' }}>New Password</label>
                            <input
                                type="password"
                                placeholder="Min 6 characters"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                minLength="6"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label style={{ color: 'var(--text-primary)' }}>Confirm Password</label>
                            <input
                                type="password"
                                placeholder="Confirm new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                minLength="6"
                                required
                            />
                        </div>

                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Updating...' : 'Update Password'}
                        </button>
                    </form>
                )}

                <div className="auth-footer">
                    <p><Link to="/login">Back to Login</Link></p>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
