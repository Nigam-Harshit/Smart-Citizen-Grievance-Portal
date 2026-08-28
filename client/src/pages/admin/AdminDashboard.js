import React, { useState, useEffect, useContext } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import API from '../../utils/api';
import AuthContext from '../../context/AuthContext';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { Link } from 'react-router-dom';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend
);

const AdminDashboard = () => {
    const { user } = useContext(AuthContext);
    const [stats, setStats] = useState(null);
    const [dutyQueue, setDutyQueue] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [statsRes, queueRes] = await Promise.all([
                    API.get('/api/dashboard/stats'),
                    API.get('/api/dashboard/duty-queue')
                ]);
                setStats(statsRes.data);
                setDutyQueue(queueRes.data);
            } catch (err) {
                console.error('Error fetching dashboard data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <div style={{ display: 'flex' }}>
                <Sidebar />
                <div className="main-content">
                    <Topbar title="Command Center Dashboard" />
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Loading municipal command analytics & duty queues...
                    </div>
                </div>
            </div>
        );
    }

    const isManager = user?.role === 'manager';
    const userScope = user?.scope || 'All';

    // Chart aggregations
    const categoryLabels = stats?.categoryDistribution?.map(c => c._id) || ['Sanitation', 'Water Supply', 'Roads', 'Electricity', 'Safety'];
    const categoryCounts = stats?.categoryDistribution?.map(c => c.count) || [0, 0, 0, 0, 0];

    const categoryData = {
        labels: categoryLabels,
        datasets: [
            {
                label: 'Grievances Count',
                data: categoryCounts,
                backgroundColor: 'rgba(201, 150, 44, 0.65)',
                borderColor: '#C9962C',
                borderWidth: 1,
                borderRadius: 6
            }
        ]
    };

    const trendData = {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
            {
                label: 'Filings',
                data: [12, 19, 15, 22, 18, 10, 8],
                borderColor: '#4A7FBF',
                backgroundColor: 'rgba(74, 127, 191, 0.15)',
                tension: 0.3,
                fill: true
            },
            {
                label: 'Resolutions',
                data: [8, 14, 12, 19, 16, 9, 7],
                borderColor: '#4F9D6E',
                backgroundColor: 'rgba(79, 157, 110, 0.15)',
                tension: 0.3,
                fill: true
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                labels: {
                    color: '#8B96A8',
                    font: { family: 'IBM Plex Sans', size: 12 }
                }
            }
        },
        scales: {
            x: {
                ticks: { color: '#8B96A8', font: { family: 'IBM Plex Sans' } },
                grid: { color: 'rgba(203, 213, 225, 0.08)' }
            },
            y: {
                ticks: { color: '#8B96A8', font: { family: 'IBM Plex Sans' } },
                grid: { color: 'rgba(203, 213, 225, 0.08)' }
            }
        }
    };

    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <div className="main-content">
                <Topbar title={isManager ? `Manager Workspace (${userScope})` : "Admin Command Center"} />

                {/* Hero Scope Welcome Banner */}
                <div className="glass-panel" style={{
                    padding: '1.6rem 2rem',
                    borderRadius: '16px',
                    marginBottom: '1.8rem',
                    background: 'var(--glass-tint)',
                    border: '1px solid var(--glass-border)',
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem'
                }}>
                    <div>
                        <h2 style={{ margin: '0 0 0.3rem 0', fontSize: '1.3rem' }}>
                            Welcome, {user?.name || 'Administrator'}
                        </h2>
                        <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                            Role: <strong style={{ color: 'var(--accent-amber)' }}>{user?.role?.toUpperCase()}</strong> • Scope Jurisdiction: <strong style={{ color: 'var(--signal-blue)' }}>{userScope}</strong>
                        </div>
                    </div>

                    <Link to="/admin/grievances" className="btn-municipal" style={{ textDecoration: 'none', padding: '0.7rem 1.4rem' }}>
                        📋 View Master Grievance Tracker →
                    </Link>
                </div>

                {/* Task 5: Role-Scoped Duty Panel Widget */}
                {isManager ? (
                    /* Manager Duty Panel Widget */
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                        {/* Unassigned Tickets in Scope */}
                        <div className="glass-panel" style={{ padding: '1.6rem', borderRadius: '14px', borderLeft: '4px solid var(--accent-amber)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1.05rem', fontFamily: 'Fraunces, serif' }}>
                                    📥 Unassigned Tickets in Scope ({dutyQueue?.unassignedCount || 0})
                                </h3>
                                <span style={{ fontSize: '0.75rem', color: 'var(--accent-amber)', fontWeight: 'bold' }}>Scope: {userScope}</span>
                            </div>

                            {dutyQueue?.unassignedInScope?.length === 0 ? (
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', padding: '1rem 0' }}>
                                    No unassigned tickets in your scope!
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', maxHeight: '280px', overflowY: 'auto' }}>
                                    {dutyQueue?.unassignedInScope?.map(g => (
                                        <div key={g._id} style={{ background: 'rgba(11, 18, 32, 0.5)', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontWeight: 'bold', fontSize: '0.88rem', color: 'var(--text-primary)' }}>{g.title}</div>
                                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                    📍 {g.location} • Priority: <span style={{ color: 'var(--accent-amber)' }}>{g.priority}</span>
                                                </div>
                                            </div>
                                            <Link to="/admin/grievances" className="btn-municipal-glass" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', textDecoration: 'none' }}>
                                                Assign Officer
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* SLA Breaching / Overdue Tickets in Scope */}
                        <div className="glass-panel" style={{ padding: '1.6rem', borderRadius: '14px', borderLeft: '4px solid var(--signal-red)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1.05rem', fontFamily: 'Fraunces, serif' }}>
                                    ⚠️ SLA Breaching & Overdue ({dutyQueue?.breachingCount || 0})
                                </h3>
                                <span style={{ fontSize: '0.75rem', color: 'var(--signal-red)', fontWeight: 'bold' }}>SLA Alerts</span>
                            </div>

                            {dutyQueue?.breachingOrOverdueInScope?.length === 0 ? (
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', padding: '1rem 0' }}>
                                    No SLA breaches or warnings in your scope!
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', maxHeight: '280px', overflowY: 'auto' }}>
                                    {dutyQueue?.breachingOrOverdueInScope?.map(g => (
                                        <div key={g._id} style={{ background: 'rgba(11, 18, 32, 0.5)', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontWeight: 'bold', fontSize: '0.88rem', color: 'var(--text-primary)' }}>{g.title}</div>
                                                <div className="mono-data" style={{ fontSize: '0.75rem', color: 'var(--signal-red)', marginTop: '2px' }}>
                                                    Target: {new Date(g.deadline).toLocaleString()}
                                                </div>
                                            </div>
                                            <Link to={`/citizen/grievance/${g._id}`} className="btn-municipal-glass" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', textDecoration: 'none' }}>
                                                Inspect
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Admin Duty Panel Widget */
                    <div className="glass-panel" style={{ padding: '1.6rem', borderRadius: '14px', marginBottom: '2rem', borderLeft: '4px solid var(--signal-red)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.6rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontFamily: 'Fraunces, serif' }}>
                                🚨 System-Wide SLA Breached Queue ({dutyQueue?.breachedCount || 0})
                            </h3>
                            <span className="mono-badge" style={{ background: 'rgba(192, 67, 59, 0.15)', color: 'var(--signal-red)', padding: '0.3rem 0.8rem', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.8rem' }}>
                                System Health Monitor
                            </span>
                        </div>

                        {dutyQueue?.systemBreached?.length === 0 ? (
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', padding: '1rem 0', textAlign: 'center' }}>
                                🎉 All grievances system-wide are within active SLA compliance windows!
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.8rem' }}>
                                {dutyQueue?.systemBreached?.map(g => (
                                    <div key={g._id} style={{ background: 'rgba(11, 18, 32, 0.5)', padding: '0.9rem 1rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--text-primary)' }}>{g.title}</div>
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                            Category: <span style={{ color: 'var(--text-primary)' }}>{g.category}</span> • Assigned: {g.assignedTo?.name || 'Unassigned'}
                                        </div>
                                        <div className="mono-data" style={{ fontSize: '0.75rem', color: 'var(--signal-red)', marginTop: '4px', fontWeight: 'bold' }}>
                                            ⚠️ SLA Breached: {new Date(g.deadline).toLocaleDateString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Minimalist Stat Tiles */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div className="glass-card stagger-in" style={{ padding: '1.5rem', borderRadius: '14px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            REGISTERED CITIZENS
                        </div>
                        <div className="mono-number" style={{ fontSize: '2.4rem', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                            {stats?.totalCitizens || 0}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                            Active civic accounts
                        </div>
                    </div>

                    <div className="glass-card stagger-in" style={{ padding: '1.5rem', borderRadius: '14px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {isManager ? `COMPLAINTS IN ${userScope.toUpperCase()}` : 'TOTAL COMPLAINTS'}
                        </div>
                        <div className="mono-number" style={{ fontSize: '2.4rem', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                            {stats?.totalGrievances || 0}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                            Lodged grievances
                        </div>
                    </div>

                    <div className="glass-card stagger-in" style={{ padding: '1.5rem', borderRadius: '14px', borderLeft: '3px solid var(--accent-amber)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            ACTIVE IN WORKFLOW
                        </div>
                        <div className="mono-number" style={{ fontSize: '2.4rem', color: 'var(--accent-amber)', marginTop: '0.2rem' }}>
                            {stats?.activeGrievances || 0}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                            Open & In Progress tickets
                        </div>
                    </div>

                    <div className="glass-card stagger-in" style={{ padding: '1.5rem', borderRadius: '14px', borderLeft: '3px solid var(--signal-green)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            AVG RESOLUTION TIME
                        </div>
                        <div className="mono-number" style={{ fontSize: '2.4rem', color: 'var(--signal-green)', marginTop: '0.2rem' }}>
                            {stats?.avgResolutionTimeHours || 0}<span style={{ fontSize: '1.2rem' }}>h</span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                            Standard turn-around
                        </div>
                    </div>
                </div>

                {/* Charts Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div className="glass-panel" style={{ padding: '1.8rem', borderRadius: '14px' }}>
                        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>
                            {isManager ? `Grievances Breakdown for ${userScope}` : 'Grievances by Municipal Category'}
                        </h3>
                        <Bar data={categoryData} options={chartOptions} />
                    </div>

                    <div className="glass-panel" style={{ padding: '1.8rem', borderRadius: '14px' }}>
                        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>Weekly Filing vs Resolution Velocity</h3>
                        <Line data={trendData} options={chartOptions} />
                    </div>
                </div>

                {/* Quick Master Tracker Action Footer */}
                <div className="glass-panel" style={{ padding: '1.5rem 2rem', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>Master Grievance Tracker</h4>
                        <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            {isManager ? `Browse all ${userScope} complaints or assign field officers.` : 'Access complete jurisdiction complaint inventory, filter by category, or assign field officers.'}
                        </p>
                    </div>
                    <Link to="/admin/grievances" className="btn-municipal" style={{ textDecoration: 'none' }}>
                        View Master Tracker →
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
