import { Link } from 'react-router-dom';

const Landing = () => {
    return (
        <div className="landing-container" style={{
            minHeight: '100vh',
            background: 'radial-gradient(circle at top right, rgba(99, 102, 241, 0.2), transparent 40%), radial-gradient(circle at bottom left, rgba(239, 68, 68, 0.1), transparent 40%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
        }}>
            <header className="landing-header" style={{ textAlign: 'center', marginBottom: '4rem', maxWidth: '800px' }}>
                <div style={{
                    display: 'inline-block',
                    padding: '0.5rem 1rem',
                    background: 'rgba(99, 102, 241, 0.1)',
                    borderRadius: '20px',
                    color: 'var(--accent-primary)',
                    marginBottom: '1.5rem',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    border: '1px solid rgba(99, 102, 241, 0.3)'
                }}>
                    ✨ NEXT-GEN CRM PLATFORM
                </div>
                <h1 style={{
                    fontSize: '4rem',
                    margin: '0 0 1.5rem 0',
                    background: 'linear-gradient(to right, #fff, #94a3b8)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    letterSpacing: '-1px'
                }}>
                    MMSolutions
                </h1>
                <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    Transform your customer relationships with AI-powered insights, predictive risk scoring, and intelligent reporting.
                </p>
                <div className="landing-buttons" style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <Link to="/login" className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem' }}>
                        Launch Console
                    </Link>
                    <Link to="/register" className="glass-card" style={{
                        padding: '1rem 2.5rem',
                        textDecoration: 'none',
                        color: 'var(--text-primary)',
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        Request Access
                    </Link>
                </div>
            </header>

            <section className="features" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '2rem',
                width: '100%',
                maxWidth: '1200px'
            }}>
                <div className="glass-card" style={{ padding: '2rem' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>👥</div>
                    <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Client Management</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>Centralized hub for all your customer data, interaction history, and contact details.</p>
                </div>
                <div className="glass-card" style={{ padding: '2rem', border: '1px solid rgba(99, 102, 241, 0.3)', background: 'rgba(99, 102, 241, 0.05)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🧠</div>
                    <h3 style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>Predictive AI</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>Advanced machine learning models that predict churn risk and identify upsell opportunities.</p>
                </div>
                <div className="glass-card" style={{ padding: '2rem' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📊</div>
                    <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Visual Analytics</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>Interactive dashboards with real-time charts, financial metrics, and performance tracking.</p>
                </div>
            </section>
        </div>
    );
};

export default Landing;
