import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import Topbar from '../../components/Topbar';
import Sidebar from '../../components/Sidebar';
import API from '../../utils/api';
import { getRoleTheme } from '../../theme/roleTheme';

const OfficerDashboard = () => {
    const { user } = useContext(AuthContext);
    const roleTheme = getRoleTheme('officer');
    const [dutyQueue, setDutyQueue] = useState([]);
    const [myQueueCount, setMyQueueCount] = useState(0);
    const [resolvedCount, setResolvedCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDutyQueue();
    }, []);

    const fetchDutyQueue = async () => {
        try {
            const { data } = await API.get('/api/dashboard/duty-queue');
            setDutyQueue(data.myQueue || []);
            setMyQueueCount(data.myQueueCount || 0);
            setResolvedCount(data.resolvedCount ?? 0);
        } catch (err) {
            console.error('Error fetching officer duty queue:', err);
        } finally {
            setLoading(false);
        }
    };

    const overdueCount = dutyQueue.filter(g => new Date(g.deadline) < new Date()).length;
    const criticalCount = dutyQueue.filter(g => g.priority === 'Critical').length;

    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <div className="main-content">
                <Topbar title="Field Officer Workspace" />

                {/* Hero Banner with Subtle Officer Role Accent */}
                <div className="glass-panel" style={{
                    padding: '2rem',
                    borderRadius: '16px',
                    marginBottom: '2rem',
                    background: roleTheme.surfaceGradient,
                    border: `1px solid ${roleTheme.cardBorder}`,
                    borderLeft: `4px solid ${roleTheme.primary}`,
                    boxShadow: `0 10px 30px -5px ${roleTheme.glow}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1.5rem',
                    flexWrap: 'wrap'
                }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                            <h2 style={{ margin: 0, fontSize: '1.35rem' }}>
                                Welcome, {user?.name || 'Officer'}
                            </h2>
                            <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: roleTheme.badgeBg,
                                border: `1px solid ${roleTheme.badgeBorder}`,
                                color: roleTheme.badgeText,
                                borderRadius: '12px',
                                padding: '2px 8px',
                                fontSize: '0.72rem',
                                fontWeight: '700',
                                letterSpacing: '0.04em'
                            }}>
                                {roleTheme.icon} {roleTheme.roleLabel}
                            </span>
                        </div>
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '650px' }}>
                            You have <strong style={{ color: roleTheme.secondary }}>{myQueueCount} active ticket(s)</strong> in your assigned duty queue, ordered by SLA urgency.
                        </p>
                    </div>
                    <Link to="/officer/grievances" style={{
                        textDecoration: 'none',
                        padding: '0.75rem 1.6rem',
                        background: roleTheme.primary,
                        color: roleTheme.primaryBtnText,
                        borderRadius: '10px',
                        fontWeight: '600',
                        fontSize: '0.92rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        border: '1px solid rgba(255,255,255,0.2)',
                        boxShadow: `0 4px 14px ${roleTheme.glow}`,
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                    }}>
                        📌 Open Field Kanban Board
                    </Link>
                </div>

                {/* Duty Panel KPI Widgets (Assigned, Critical, Overdue, Resolved) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div className="glass-card stagger-in" style={{
                        padding: '1.5rem',
                        borderRadius: '14px',
                        background: roleTheme.surfaceGradient,
                        border: `1px solid ${roleTheme.cardBorder}`,
                        borderLeft: `3px solid ${roleTheme.primary}`
                    }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            MY ASSIGNED QUEUE
                        </div>
                        <div className="mono-number" style={{ fontSize: '2.4rem', color: roleTheme.secondary, marginTop: '0.2rem' }}>
                            {myQueueCount}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                            Unresolved assigned complaints
                        </div>
                    </div>

                    <div className="glass-card stagger-in" style={{ padding: '1.5rem', borderRadius: '14px', borderLeft: '3px solid var(--signal-red)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            CRITICAL PRIORITY
                        </div>
                        <div className="mono-number" style={{ fontSize: '2.4rem', color: 'var(--signal-red)', marginTop: '0.2rem' }}>
                            {criticalCount}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                            Emergency 24h SLA targets
                        </div>
                    </div>

                    <div className="glass-card stagger-in" style={{ padding: '1.5rem', borderRadius: '14px', borderLeft: '3px solid var(--accent-amber)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            SLA BREACHED / OVERDUE
                        </div>
                        <div className="mono-number" style={{ fontSize: '2.4rem', color: 'var(--accent-amber)', marginTop: '0.2rem' }}>
                            {overdueCount}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                            Overdue deadline breach
                        </div>
                    </div>

                    <div className="glass-card stagger-in" style={{ padding: '1.5rem', borderRadius: '14px', borderLeft: '3px solid var(--signal-green)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            RESOLVED TICKETS
                        </div>
                        <div className="mono-number" style={{ fontSize: '2.4rem', color: 'var(--signal-green)', marginTop: '0.2rem' }}>
                            {resolvedCount}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                            Successfully verified & closed
                        </div>
                    </div>
                </div>

                {/* My Duty Queue Widget Panel */}
                <div className="glass-panel" style={{ padding: '1.8rem', borderRadius: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.8rem' }}>
                        <div>
                            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontFamily: 'Fraunces, serif' }}>
                                📋 My Duty Queue (Sorted by SLA Target Deadline)
                            </h3>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                Real-time server-scoped ticket list assigned specifically to {user?.name}
                            </div>
                        </div>
                        <span className="mono-badge" style={{ padding: '0.3rem 0.8rem', background: 'var(--accent-amber-dim)', color: 'var(--accent-amber)', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.8rem' }}>
                            {myQueueCount} Pending Action
                        </span>
                    </div>

                    {loading ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading officer duty queue...</div>
                    ) : dutyQueue.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>🎉 No active unresolved tickets in your queue!</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            {dutyQueue.map(g => {
                                const isOverdue = new Date(g.deadline) < new Date();

                                return (
                                    <div key={g._id} className="glass-card glass-card-interactive" style={{
                                        padding: '1.1rem 1.4rem',
                                        borderRadius: '10px',
                                        display: 'flex',
                                        justify: 'space-between',
                                        alignItems: 'center',
                                        borderLeft: isOverdue ? '4px solid var(--signal-red)' : '4px solid var(--signal-blue)'
                                    }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.4rem' }}>
                                                <h4 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--text-primary)' }}>{g.title}</h4>
                                                <span className={`status-pill ${g.priority === 'Critical' ? 'status-critical' : 'status-open'}`}>
                                                    {g.priority}
                                                </span>
                                                <span className={`status-pill ${g.status === 'Resolved' ? 'status-resolved' : 'status-in-progress'}`}>
                                                    {g.status}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
                                                <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '4px', flexWrap: 'wrap' }}>
                                                    <span>👤 {g.citizenName || 'Citizen'}</span>
                                                    {(g.citizenId?.email || g.citizenEmail) && (
                                                        <span style={{ fontSize: '0.74rem', opacity: 0.85, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                                                            ({g.citizenId?.email || g.citizenEmail})
                                                        </span>
                                                    )}
                                                </span>
                                                <span>📍 {g.location}</span>
                                                <span>🏷️ {g.category}</span>
                                                <span className="mono-data" style={{ color: isOverdue ? 'var(--signal-red)' : 'var(--accent-amber)', fontWeight: 'bold' }}>
                                                    ⏰ Target: {new Date(g.deadline).toLocaleString()} {isOverdue ? '⚠️ OVERDUE' : ''}
                                                </span>
                                            </div>
                                        </div>

                                        <Link to={`/citizen/grievance/${g._id}`} className="btn-municipal-glass" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                                            Inspect Ticket →
                                        </Link>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OfficerDashboard;
