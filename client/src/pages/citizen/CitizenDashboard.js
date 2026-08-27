import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import Topbar from '../../components/Topbar';
import Sidebar from '../../components/Sidebar';
import API from '../../utils/api';

const CitizenDashboard = () => {
    const { user } = useContext(AuthContext);
    const [grievances, setGrievances] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMyGrievances();
    }, []);

    const fetchMyGrievances = async () => {
        try {
            const { data } = await API.get('/api/grievances');
            setGrievances(data);
        } catch (err) {
            console.error('Error loading grievances:', err);
        } finally {
            setLoading(false);
        }
    };

    const openCount = grievances.filter(g => g.status === 'Open').length;
    const inProgressCount = grievances.filter(g => g.status === 'In Progress').length;
    const resolvedCount = grievances.filter(g => g.status === 'Resolved').length;

    const getStatusStyle = (status) => {
        if (status === 'Resolved') return { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' };
        if (status === 'In Progress') return { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' };
        return { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' };
    };

    const getPriorityStyle = (priority) => {
        if (priority === 'Critical') return { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' };
        if (priority === 'High') return { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' };
        return { bg: 'rgba(107, 114, 128, 0.15)', color: '#9ca3af' };
    };

    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <div className="main-content" style={{ flex: 1, padding: '2rem', minHeight: '100vh', background: 'var(--bg-primary)' }}>
                <Topbar title="Citizen Grievance Portal" />

                {/* Welcome Card */}
                <div className="glass-card" style={{
                    padding: '2rem',
                    borderRadius: '16px',
                    marginBottom: '2rem',
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(59, 130, 246, 0.08))',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <h2 style={{ margin: '0 0 0.5rem 0', color: 'white' }}>
                            Welcome back, {user?.name || 'Citizen'} 👋
                        </h2>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                            Track public service issues, view real-time officer updates, or lodge a new civic complaint.
                        </p>
                    </div>
                    <Link to="/citizen/submit" className="btn-primary" style={{
                        padding: '0.8rem 1.5rem',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
                        color: 'white',
                        textDecoration: 'none',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 8px 20px rgba(99, 102, 241, 0.3)'
                    }}>
                        <span>📝</span> Lodge New Grievance
                    </Link>
                </div>

                {/* KPI Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '12px' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Total Grievances Filed</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white' }}>{grievances.length}</div>
                    </div>

                    <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '12px' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Open Tickets</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b' }}>{openCount}</div>
                    </div>

                    <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '12px' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>In Progress</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>{inProgressCount}</div>
                    </div>

                    <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '12px' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Successfully Resolved</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#22c55e' }}>{resolvedCount}</div>
                    </div>
                </div>

                {/* Grievances List */}
                <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ margin: 0, color: 'white' }}>My Reported Grievances</h3>
                        <Link to="/citizen/grievances" style={{ color: '#818cf8', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 'bold' }}>
                            View All ({grievances.length}) →
                        </Link>
                    </div>

                    {loading ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading grievances...</div>
                    ) : grievances.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>📋</div>
                            <h4 style={{ color: 'white', margin: '0 0 0.5rem 0' }}>No Grievances Logged Yet</h4>
                            <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.9rem' }}>Report any municipal issues such as water supply, sanitation, or damaged roads.</p>
                            <Link to="/citizen/submit" style={{ padding: '0.6rem 1.2rem', background: '#6366f1', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' }}>
                                Lodge a Grievance
                            </Link>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {grievances.slice(0, 5).map(g => {
                                const statusStyle = getStatusStyle(g.status);
                                const priorityStyle = getPriorityStyle(g.priority);
                                const isOverdue = g.status !== 'Resolved' && new Date(g.deadline) < new Date();

                                return (
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
                                                <h4 style={{ margin: 0, color: 'white', fontSize: '1.05rem' }}>{g.title}</h4>
                                                <span style={{
                                                    padding: '0.2rem 0.6rem',
                                                    borderRadius: '12px',
                                                    fontSize: '0.7rem',
                                                    fontWeight: 'bold',
                                                    background: statusStyle.bg,
                                                    color: statusStyle.color
                                                }}>{g.status}</span>
                                                <span style={{
                                                    padding: '0.2rem 0.6rem',
                                                    borderRadius: '12px',
                                                    fontSize: '0.7rem',
                                                    fontWeight: 'bold',
                                                    background: priorityStyle.bg,
                                                    color: priorityStyle.color
                                                }}>{g.priority}</span>
                                                {isOverdue && (
                                                    <span style={{
                                                        padding: '0.2rem 0.6rem',
                                                        borderRadius: '12px',
                                                        fontSize: '0.7rem',
                                                        fontWeight: 'bold',
                                                        background: 'rgba(239, 68, 68, 0.2)',
                                                        color: '#ef4444'
                                                    }}>⚠️ SLA Overdue</span>
                                                )}
                                            </div>
                                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                                <span>🏷️ {g.category}</span> • <span>📍 {g.location}</span> • <span>📅 Filed on {new Date(g.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>

                                        <Link to={`/citizen/grievance/${g._id}`} style={{
                                            padding: '0.5rem 1rem',
                                            borderRadius: '8px',
                                            background: 'rgba(99, 102, 241, 0.1)',
                                            color: '#818cf8',
                                            border: '1px solid rgba(99, 102, 241, 0.2)',
                                            textDecoration: 'none',
                                            fontWeight: 'bold',
                                            fontSize: '0.85rem'
                                        }}>
                                            Track Timeline →
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

export default CitizenDashboard;
