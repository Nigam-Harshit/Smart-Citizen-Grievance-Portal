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
            <div className="main-content" style={{ flex: 1, padding: '2rem', minHeight: '100vh', background: 'var(--bg-primary)' }}>
                <Topbar title="Field Officer Command Workspace" />

                {/* Banner */}
                <div className="glass-card" style={{
                    padding: '2rem',
                    borderRadius: '16px',
                    marginBottom: '2rem',
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(99, 102, 241, 0.08))',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <h2 style={{ margin: '0 0 0.5rem 0', color: 'white' }}>
                            Welcome, {user?.name || 'Officer'}
                        </h2>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                            You have <strong>{openGrievances.length + inProgressGrievances.length} active grievance ticket(s)</strong> assigned to your field jurisdiction.
                        </p>
                    </div>
                    <Link to="/officer/grievances" className="btn-primary" style={{
                        padding: '0.8rem 1.5rem',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                        color: 'white',
                        textDecoration: 'none',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <span>📌</span> Open Kanban Board
                    </Link>
                </div>

                {/* KPI Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '12px' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Assigned Grievances</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white' }}>{grievances.length}</div>
                    </div>

                    <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '12px' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Action Pending (Open)</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b' }}>{openGrievances.length}</div>
                    </div>

                    <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '12px' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Field Investigation (In Progress)</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>{inProgressGrievances.length}</div>
                    </div>

                    <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '12px' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>SLA Overdue Escalations</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ef4444' }}>{overdueGrievances.length}</div>
                    </div>
                </div>

                {/* Action Items List */}
                <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
                    <h3 style={{ margin: '0 0 1.5rem 0', color: 'white' }}>Priority Field Tickets</h3>
                    {loading ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading field tickets...</div>
                    ) : grievances.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No assigned grievances currently.</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {grievances.slice(0, 6).map(g => (
                                <div key={g._id} style={{
                                    padding: '1.2rem',
                                    background: 'rgba(255,255,255,0.02)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    gap: '1rem'
                                }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.3rem' }}>
                                            <h4 style={{ margin: 0, color: 'white', fontSize: '1rem' }}>{g.title}</h4>
                                            <span style={{
                                                padding: '0.2rem 0.6rem',
                                                borderRadius: '12px',
                                                fontSize: '0.7rem',
                                                fontWeight: 'bold',
                                                background: g.priority === 'Critical' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                                color: g.priority === 'Critical' ? '#ef4444' : '#f59e0b'
                                            }}>
                                                {g.priority}
                                            </span>
                                            <span style={{
                                                padding: '0.2rem 0.6rem',
                                                borderRadius: '12px',
                                                fontSize: '0.7rem',
                                                fontWeight: 'bold',
                                                background: g.status === 'Resolved' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                                color: g.status === 'Resolved' ? '#22c55e' : '#3b82f6'
                                            }}>
                                                {g.status}
                                            </span>
                                        </div>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                            👤 {g.citizenName} • 📍 {g.location} • 🏷️ {g.category}
                                        </div>
                                    </div>
                                    <Link to={`/citizen/grievance/${g._id}`} style={{
                                        padding: '0.5rem 1rem',
                                        borderRadius: '8px',
                                        background: 'rgba(99, 102, 241, 0.15)',
                                        color: '#818cf8',
                                        textDecoration: 'none',
                                        fontWeight: 'bold',
                                        fontSize: '0.85rem'
                                    }}>
                                        Update Ticket →
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
