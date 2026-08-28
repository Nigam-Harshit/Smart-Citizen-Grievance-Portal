import { Link } from 'react-router-dom';

const Landing = () => {
    return (
        <div className="landing-container" style={{
            minHeight: '100vh',
            background: 'var(--bg-base)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '3rem 1.5rem',
            color: 'var(--text-primary)'
        }}>
            {/* Header / Hero Section */}
            <header className="landing-header stagger-in" style={{ textAlign: 'center', marginBottom: '4rem', maxWidth: '850px' }}>
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '0.5rem 1.2rem',
                    background: 'var(--accent-amber-dim)',
                    borderRadius: '25px',
                    color: 'var(--accent-amber)',
                    marginBottom: '1.5rem',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    border: '1px solid var(--accent-amber)',
                    letterSpacing: '0.5px'
                }}>
                    <span>🏛️</span> MUNICIPAL CIVIC GOVERNANCE PORTAL
                </div>

                <h1 style={{
                    fontSize: '3.4rem',
                    fontFamily: 'Fraunces, serif',
                    fontWeight: '700',
                    margin: '0 0 1.5rem 0',
                    color: 'var(--text-primary)',
                    lineHeight: '1.18'
                }}>
                    Smart Citizen Grievance Management & Analytics Portal
                </h1>

                <p style={{ fontSize: '1.15rem', color: 'var(--text-muted)', lineHeight: '1.6', margin: '0 auto', maxWidth: '750px' }}>
                    Streamlined public complaint submission, transparent 4-step resolution lifecycles, field officer dispatch, priority SLA tracking, and explainable SLA escalation risk analytics.
                </p>

                {/* CTAs */}
                <div className="landing-buttons" style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Link to="/register" className="btn-municipal" style={{
                        padding: '0.9rem 2.2rem',
                        fontSize: '1rem',
                        textDecoration: 'none'
                    }}>
                        <span>📝</span> Lodge Grievance / Register
                    </Link>

                    <Link to="/login" className="btn-municipal-glass" style={{
                        padding: '0.9rem 2.2rem',
                        fontSize: '1rem',
                        textDecoration: 'none',
                        borderRadius: '10px'
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
                <div className="glass-panel glass-card-interactive stagger-in" style={{ padding: '2rem', borderRadius: '16px' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🧹</div>
                    <h3 style={{ marginBottom: '0.5rem', fontSize: '1.15rem' }}>Citizen Complaint Submission</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: '1.55' }}>
                        Fast reporting across categories (Sanitation, Water Supply, Electricity, Roads, Safety) with location landmarks and automated SLA target calculations.
                    </p>
                </div>

                <div className="glass-panel glass-card-interactive stagger-in" style={{ padding: '2rem', borderRadius: '16px', borderLeft: '4px solid var(--accent-amber)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📌</div>
                    <h3 style={{ color: 'var(--accent-amber)', marginBottom: '0.5rem', fontSize: '1.15rem' }}>Field Officer Dispatch</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: '1.55' }}>
                        Interactive 3-column Kanban workspace (<strong style={{ color: 'var(--text-primary)' }}>Open → In Progress → Resolved</strong>) enabling field officers to log timeline inspection updates and resolve tickets.
                    </p>
                </div>

                <div className="glass-panel glass-card-interactive stagger-in" style={{ padding: '2rem', borderRadius: '16px' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⏰</div>
                    <h3 style={{ marginBottom: '0.5rem', fontSize: '1.15rem' }}>SLA Target Monitoring</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: '1.55' }}>
                        Priority-based resolution windows (Critical=24h, High=3d, Medium=7d, Low=14d) with automated daily SLA breach scanning and escalation alerts.
                    </p>
                </div>

                <div className="glass-panel glass-card-interactive stagger-in" style={{ padding: '2rem', borderRadius: '16px' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✨</div>
                    <h3 style={{ marginBottom: '0.5rem', fontSize: '1.15rem' }}>Explainable SLA Risk Matrix</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: '1.55' }}>
                        Transparent heuristic scoring combining ticket priority, overdue breach hours, category weighting, and unresolved volume to generate supervisor dispatch recommendations.
                    </p>
                </div>
            </section>

            {/* Quick Demo Accounts Banner */}
            <div className="glass-panel stagger-in" style={{
                maxWidth: '900px',
                width: '100%',
                padding: '1.8rem',
                borderRadius: '16px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--glass-border)'
            }}>
                <h4 style={{ margin: '0 0 1rem 0', color: 'var(--accent-amber)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center' }}>
                    🔑 Demo Access Credentials
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.85rem' }}>
                    <div style={{ background: 'rgba(148, 163, 184, 0.04)', padding: '0.8rem', borderRadius: '8px', borderLeft: '3px solid var(--signal-red)' }}>
                        <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>🛡️ Admin Command Center</div>
                        <div className="mono-data" style={{ color: 'var(--text-muted)' }}>admin@grievance.gov.in</div>
                        <div className="mono-data" style={{ color: 'var(--accent-amber)', fontWeight: 'bold' }}>Password123!</div>
                    </div>
                    <div style={{ background: 'rgba(148, 163, 184, 0.04)', padding: '0.8rem', borderRadius: '8px', borderLeft: '3px solid var(--accent-amber)' }}>
                        <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>📊 Civic Manager</div>
                        <div className="mono-data" style={{ color: 'var(--text-muted)' }}>manager@grievance.gov.in</div>
                        <div className="mono-data" style={{ color: 'var(--accent-amber)', fontWeight: 'bold' }}>Password123!</div>
                    </div>
                    <div style={{ background: 'rgba(148, 163, 184, 0.04)', padding: '0.8rem', borderRadius: '8px', borderLeft: '3px solid var(--signal-blue)' }}>
                        <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>👮 Field Officer</div>
                        <div className="mono-data" style={{ color: 'var(--text-muted)' }}>officer.sharma@grievance.gov.in</div>
                        <div className="mono-data" style={{ color: 'var(--accent-amber)', fontWeight: 'bold' }}>Password123!</div>
                    </div>
                    <div style={{ background: 'rgba(148, 163, 184, 0.04)', padding: '0.8rem', borderRadius: '8px', borderLeft: '3px solid var(--signal-green)' }}>
                        <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>🏡 Citizen Portal</div>
                        <div className="mono-data" style={{ color: 'var(--text-muted)' }}>citizen.rajesh@gmail.com</div>
                        <div className="mono-data" style={{ color: 'var(--accent-amber)', fontWeight: 'bold' }}>Password123!</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Landing;
