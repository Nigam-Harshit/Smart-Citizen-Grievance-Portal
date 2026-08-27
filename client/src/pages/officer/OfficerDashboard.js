import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import Topbar from '../../components/Topbar';
import Sidebar from '../../components/Sidebar';
import API from '../../utils/api';

const OfficerDashboard = () => {
    const { user } = useContext(AuthContext);
    const [grievances, setGrievances] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAssignedGrievances();
    }, []);

    const fetchAssignedGrievances = async () => {
        try {
            const { data } = await API.get('/api/grievances');
            setGrievances(data);
        } catch (err) {
            console.error('Error fetching officer grievances:', err);
        } finally {
            setLoading(false);
        }
    };

    const openGrievances = grievances.filter(g => g.status === 'Open');
    const inProgressGrievances = grievances.filter(g => g.status === 'In Progress');
    const overdueGrievances = grievances.filter(g => g.status !== 'Resolved' && new Date(g.deadline) < new Date());

    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <div className="main-content">
                <Topbar title="Field Officer Workspace" />

                {/* Banner */}
                <div className="glass-panel" style={{
                    padding: '2rem',
                    borderRadius: '16px',
                    marginBottom: '2rem',
                    background: 'var(--glass-tint)',
                    border: '1px solid var(--glass-border)',
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center',
                    gap: '1.5rem',
                    flexWrap: 'wrap'
                }}>
                    <div>
                        <h2 style={{ margin: '0 0 0.4rem 0', fontSize: '1.35rem' }}>
                            Welcome, {user?.name || 'Officer'}
                        </h2>
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '650px' }}>
                            You have <strong style={{ color: 'var(--accent-amber)' }}>{openGrievances.length + inProgressGrievances.length} active complaint ticket(s)</strong> assigned to your field jurisdiction.
                        </p>
                    </div>
                    <Link to="/officer/grievances" className="btn-municipal" style={{ textDecoration: 'none', padding: '0.8rem 1.6rem' }}>
                        📌 Open Field Kanban Board
                    </Link>
                </div>

                {/* KPI Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div className="glass-card stagger-in" style={{ padding: '1.5rem', borderRadius: '14px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            ASSIGNED TICKETS
                        </div>
                        <div className="mono-number" style={{ fontSize: '2.4rem', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                            {grievances.length}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                            Jurisdiction total
                        </div>
                    </div>

                    <div className="glass-card stagger-in" style={{ padding: '1.5rem', borderRadius: '14px', borderLeft: '3px solid var(--accent-amber)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            ACTION PENDING
                        </div>
                        <div className="mono-number" style={{ fontSize: '2.4rem', color: 'var(--accent-amber)', marginTop: '0.2rem' }}>
                            {openGrievances.length}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                            Open complaints
                        </div>
                    </div>

                    <div className="glass-card stagger-in" style={{ padding: '1.5rem', borderRadius: '14px', borderLeft: '3px solid var(--signal-blue)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            FIELD INSPECTION
                        </div>
                        <div className="mono-number" style={{ fontSize: '2.4rem', color: 'var(--signal-blue)', marginTop: '0.2rem' }}>
                            {inProgressGrievances.length}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                            In Progress tickets
                        </div>
                    </div>

                    <div className="glass-card stagger-in" style={{ padding: '1.5rem', borderRadius: '14px', borderLeft: '3px solid var(--signal-red)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            SLA OVERDUE BREACH
                        </div>
                        <div className="mono-number" style={{ fontSize: '2.4rem', color: 'var(--signal-red)', marginTop: '0.2rem' }}>
                            {overdueGrievances.length}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                            Action required immediately
                        </div>
                    </div>
                </div>

                {/* Priority Action Items */}
                <div className="glass-panel" style={{ padding: '1.8rem', borderRadius: '14px' }}>
                    <h3 style={{ margin: '0 0 1.2rem 0', fontSize: '1.1rem' }}>Priority Field Complaints</h3>
                    {loading ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading field tickets...</div>
                    ) : grievances.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No assigned grievances currently.</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            {grievances.slice(0, 5).map(g => (
                                <div key={g._id} className="glass-card glass-card-interactive" style={{
                                    padding: '1rem 1.4rem',
                                    borderRadius: '10px',
                                    display: 'flex',
                                    justify: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.3rem' }}>
                                            <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{g.title}</h4>
                                            <span className={`status-pill ${g.priority === 'Critical' ? 'status-critical' : 'status-open'}`}>
                                                {g.priority}
                                            </span>
                                            <span className={`status-pill ${g.status === 'Resolved' ? 'status-resolved' : 'status-in-progress'}`}>
                                                {g.status}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            👤 {g.citizenName} • 📍 {g.location} • 🏷️ {g.category}
                                        </div>
                                    </div>

                                    <Link to={`/citizen/grievance/${g._id}`} className="btn-municipal-glass" style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem', textDecoration: 'none' }}>
                                        Inspect Ticket →
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OfficerDashboard;
