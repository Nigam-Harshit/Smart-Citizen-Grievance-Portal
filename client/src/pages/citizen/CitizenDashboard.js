import React, { useState, useEffect, useContext } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import API from '../../utils/api';
import AuthContext from '../../context/AuthContext';
import { Link } from 'react-router-dom';

const CitizenDashboard = () => {
    const { user } = useContext(AuthContext);
    const [grievances, setGrievances] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCitizenGrievances = async () => {
            try {
                const { data } = await API.get('/api/grievances');
                setGrievances(data);
            } catch (err) {
                console.error('Error fetching citizen grievances:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchCitizenGrievances();
    }, []);

    const openCount = grievances.filter(g => g.status === 'Open').length;
    const inProgressCount = grievances.filter(g => g.status === 'In Progress').length;
    const resolvedCount = grievances.filter(g => g.status === 'Resolved').length;

    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <div className="main-content">
                <Topbar title="Citizen Public Portal" />

                {/* Welcome Glass Banner */}
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
                        <h2 style={{ margin: '0 0 0.4rem 0', fontSize: '1.4rem' }}>
                            Welcome back, {user?.name || 'Citizen'}
                        </h2>
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '650px' }}>
                            Lodge public grievances, track real-time resolution timelines, and view field officer assignment updates.
                        </p>
                    </div>
                    <Link to="/citizen/submit" className="btn-municipal" style={{ textDecoration: 'none', padding: '0.8rem 1.6rem' }}>
                        📝 Lodge New Grievance
                    </Link>
                </div>

                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div className="glass-card stagger-in" style={{ padding: '1.5rem', borderRadius: '14px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            TOTAL FILED
                        </div>
                        <div className="mono-number" style={{ fontSize: '2.4rem', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                            {grievances.length}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                            My complaint records
                        </div>
                    </div>

                    <div className="glass-card stagger-in" style={{ padding: '1.5rem', borderRadius: '14px', borderLeft: '3px solid var(--accent-amber)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            OPEN COMPLAINTS
                        </div>
                        <div className="mono-number" style={{ fontSize: '2.4rem', color: 'var(--accent-amber)', marginTop: '0.2rem' }}>
                            {openCount}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                            Pending officer assignment
                        </div>
                    </div>

                    <div className="glass-card stagger-in" style={{ padding: '1.5rem', borderRadius: '14px', borderLeft: '3px solid var(--signal-blue)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            IN FIELD WORKFLOW
                        </div>
                        <div className="mono-number" style={{ fontSize: '2.4rem', color: 'var(--signal-blue)', marginTop: '0.2rem' }}>
                            {inProgressCount}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                            Officer inspecting ticket
                        </div>
                    </div>

                    <div className="glass-card stagger-in" style={{ padding: '1.5rem', borderRadius: '14px', borderLeft: '3px solid var(--signal-green)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            RESOLVED ISSUES
                        </div>
                        <div className="mono-number" style={{ fontSize: '2.4rem', color: 'var(--signal-green)', marginTop: '0.2rem' }}>
                            {resolvedCount}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                            Successfully completed
                        </div>
                    </div>
                </div>

                {/* Recent Grievances List */}
                <div className="glass-panel" style={{ padding: '1.8rem', borderRadius: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>My Recent Complaint Filings</h3>
                        <Link to="/citizen/grievances" style={{ color: 'var(--accent-amber)', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 'bold' }}>
                            View All →
                        </Link>
                    </div>

                    {loading ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading recent complaints...</div>
                    ) : grievances.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No complaints lodged yet. Click "Lodge New Grievance" above to submit a municipal request.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            {grievances.slice(0, 4).map(g => (
                                <div key={g._id} className="glass-card glass-card-interactive" style={{
                                    padding: '1rem 1.4rem',
                                    borderRadius: '10px',
                                    display: 'flex',
                                    justify: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div>
                                        <Link to={`/citizen/grievance/${g._id}`} style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.95rem' }}>
                                            {g.title}
                                        </Link>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                            {g.category} • 📍 {g.location} • <span className="mono-data">{new Date(g.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                                        <span className={`status-pill ${g.status === 'Resolved' ? 'status-resolved' : g.status === 'In Progress' ? 'status-in-progress' : 'status-open'}`}>
                                            {g.status}
                                        </span>
                                        <Link to={`/citizen/grievance/${g._id}`} className="btn-municipal-glass" style={{ padding: '0.35rem 0.7rem', fontSize: '0.78rem', textDecoration: 'none' }}>
                                            View Details →
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CitizenDashboard;
