import { Link } from 'react-router-dom';

const Landing = () => {
    return (
        <div className="landing-container" style={{
            minHeight: '100vh',
            background: 'radial-gradient(circle at top right, rgba(99, 102, 241, 0.25), transparent 50%), radial-gradient(circle at bottom left, rgba(245, 158, 11, 0.15), transparent 50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '3rem 1.5rem',
            color: 'white'
        }}>
            {/* Header / Hero Section */}
            <header className="landing-header" style={{ textAlign: 'center', marginBottom: '4rem', maxWidth: '850px' }}>
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '0.5rem 1.2rem',
                    background: 'rgba(99, 102, 241, 0.15)',
                    borderRadius: '25px',
                    color: '#818cf8',
                    marginBottom: '1.5rem',
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    letterSpacing: '0.5px'
                }}>
                    <span>🏛️</span> MUNICIPAL CIVIC GOVERNANCE PORTAL
                </div>

                <h1 style={{
                    fontSize: '3.2rem',
                    fontWeight: '800',
                    margin: '0 0 1.5rem 0',
                    background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    lineHeight: '1.2'
                }}>
                    Smart Citizen Grievance Management & Analytics Portal
                </h1>

                <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', lineHeight: '1.6', margin: '0 auto', maxWidth: '750px' }}>
                    Streamlined public complaint submission, transparent 4-step resolution lifecycles, field officer dispatch, priority SLA tracking, and AI-driven municipal escalation insights.
                </p>

                {/* CTAs */}
                <div className="landing-buttons" style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Link to="/register" style={{
                        padding: '0.9rem 2.2rem',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
                        color: 'white',
                        textDecoration: 'none',
                        boxShadow: '0 10px 25px rgba(99, 102, 241, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <span>📝</span> Lodge Grievance / Register
                    </Link>

                    <Link to="/login" style={{
                        padding: '0.9rem 2.2rem',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        borderRadius: '10px',
                        background: 'rgba(255,255,255,0.06)',
                        color: 'white',
                        textDecoration: 'none',
                        border: '1px solid rgba(255,255,255,0.15)',
                        backdropFilter: 'blur(10px)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <span>🔑</span> Portal Sign In
                    </Link>
                </div>
            </header>

            {/* Feature Cards Grid */}
            <section className="features" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '1.5rem',
                width: '100%',
                maxWidth: '1200px',
                marginBottom: '3rem'
            }}>
                <div className="glass-card" style={{ padding: '2rem', borderRadius: '16px' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🧹</div>
                    <h3 style={{ color: 'white', marginBottom: '0.5rem', fontSize: '1.2rem' }}>Citizen Complaint Submission</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                        Fast reporting across categories (Sanitation, Water Supply, Electricity, Roads, Safety) with location landmarks and automated SLA target calculations.
                    </p>
                </div>

                <div className="glass-card" style={{ padding: '2rem', borderRadius: '16px', border: '1px solid rgba(99, 102, 241, 0.3)', background: 'rgba(99, 102, 241, 0.05)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📌</div>
                    <h3 style={{ color: '#818cf8', marginBottom: '0.5rem', fontSize: '1.2rem' }}>Field Officer Dispatch</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                        Interactive 3-column Kanban workspace (<strong style={{ color: 'white' }}>Open → In Progress → Resolved</strong>) enabling field officers to log timeline inspection updates and resolve tickets.
                    </p>
                </div>

                <div className="glass-card" style={{ padding: '2rem', borderRadius: '16px' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⏰</div>
                    <h3 style={{ color: 'white', marginBottom: '0.5rem', fontSize: '1.2rem' }}>SLA Target Monitoring</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                        Priority-based resolution windows (Critical=24h, High=3d, Medium=7d, Low=14d) with automated daily SLA breach scanning and escalation alerts.
                    </p>
                </div>

                <div className="glass-card" style={{ padding: '2rem', borderRadius: '16px' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✨</div>
                    <h3 style={{ color: 'white', marginBottom: '0.5rem', fontSize: '1.2rem' }}>AI Escalation Risk Matrix</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                        Predictive machine learning models flagging unresolved critical complaints, breach ages, and generating actionable supervisor dispatch recommendations.
                    </p>
                </div>
            </section>

            {/* Quick Demo Accounts Banner */}
            <div className="glass-card" style={{
                maxWidth: '900px',
                width: '100%',
                padding: '1.8rem',
                borderRadius: '16px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <h4 style={{ margin: '0 0 1rem 0', color: 'white', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center' }}>
                    🔑 Demo Access Credentials
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.85rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.8rem', borderRadius: '8px', borderLeft: '3px solid #ef4444' }}>
                        <div style={{ fontWeight: 'bold', color: 'white' }}>🛡️ Admin Command Center</div>
                        <div style={{ color: 'var(--text-secondary)' }}>admin@grievance.gov.in</div>
                        <div style={{ color: '#818cf8', fontWeight: 'bold' }}>Password123!</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.8rem', borderRadius: '8px', borderLeft: '3px solid #f59e0b' }}>
                        <div style={{ fontWeight: 'bold', color: 'white' }}>📊 Civic Manager</div>
                        <div style={{ color: 'var(--text-secondary)' }}>manager@grievance.gov.in</div>
                        <div style={{ color: '#818cf8', fontWeight: 'bold' }}>Password123!</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.8rem', borderRadius: '8px', borderLeft: '3px solid #3b82f6' }}>
                        <div style={{ fontWeight: 'bold', color: 'white' }}>👮 Field Officer</div>
                        <div style={{ color: 'var(--text-secondary)' }}>officer.sharma@grievance.gov.in</div>
                        <div style={{ color: '#818cf8', fontWeight: 'bold' }}>Password123!</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.8rem', borderRadius: '8px', borderLeft: '3px solid #22c55e' }}>
                        <div style={{ fontWeight: 'bold', color: 'white' }}>🏡 Citizen Portal</div>
                        <div style={{ color: 'var(--text-secondary)' }}>citizen.rajesh@gmail.com</div>
                        <div style={{ color: '#818cf8', fontWeight: 'bold' }}>Password123!</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Landing;
