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
import { Bar } from 'react-chartjs-2';
import { Link } from 'react-router-dom';
import { getRoleTheme } from '../../theme/roleTheme';

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
    const roleTheme = getRoleTheme(user?.role);
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

    // Real Complaint Status Distribution Aggregation
    const statusMap = {
        'Open': 0,
        'Assigned': 0,
        'In Progress': 0,
        'Resolved': 0,
        'Delayed': 0
    };

    if (stats?.statusDistribution && Array.isArray(stats.statusDistribution)) {
        stats.statusDistribution.forEach(item => {
            if (statusMap[item.status] !== undefined) {
                statusMap[item.status] = item.count;
            }
        });
    } else {
        statusMap['Open'] = stats?.healthSummary?.open || 0;
        statusMap['In Progress'] = stats?.activeGrievances || 0;
        statusMap['Resolved'] = stats?.resolvedGrievances || 0;
        statusMap['Delayed'] = stats?.overdueCount || 0;
    }

    const statusChartData = {
        labels: ['Open', 'Assigned', 'In Progress', 'Resolved', 'Delayed'],
        datasets: [
            {
                label: 'Complaints',
                data: [
                    statusMap['Open'],
                    statusMap['Assigned'],
                    statusMap['In Progress'],
                    statusMap['Resolved'],
                    statusMap['Delayed']
                ],
                backgroundColor: [
                    'rgba(201, 150, 44, 0.65)',
                    'rgba(74, 127, 191, 0.65)',
                    'rgba(147, 51, 234, 0.65)',
                    'rgba(79, 157, 110, 0.65)',
                    'rgba(192, 67, 59, 0.65)'
                ],
                borderColor: [
                    '#C9962C',
                    '#4A7FBF',
                    '#9333EA',
                    '#4F9D6E',
                    '#C0433B'
                ],
                borderWidth: 1,
                borderRadius: 6
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

                {/* Hero Scope Welcome Banner with Subtle Role Accent */}
                <div className="glass-panel" style={{
                    padding: '1.6rem 2rem',
                    borderRadius: '16px',
                    marginBottom: '1.8rem',
                    background: roleTheme.surfaceGradient,
                    border: `1px solid ${roleTheme.cardBorder}`,
                    borderLeft: `4px solid ${roleTheme.primary}`,
                    boxShadow: `0 10px 30px -5px ${roleTheme.glow}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem'
                }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                            <h2 style={{ margin: 0, fontSize: '1.3rem' }}>
                                Welcome, {user?.name || (isManager ? 'Civic Manager' : 'Administrator')}
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
                        <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                            Role: <strong style={{ color: roleTheme.secondary }}>{user?.role?.toUpperCase()}</strong> • Scope Jurisdiction: <strong style={{ color: roleTheme.secondary }}>{userScope}</strong>
                        </div>
                    </div>

                    <Link to="/admin/grievances" style={{
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
                        📋 View Master Grievance Tracker →
                    </Link>
                </div>

                {/* Task 5: Role-Scoped Duty Panel Widget */}
                {isManager ? (
                    /* Manager Duty Panel Widget */
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                        {/* Unassigned Tickets in Scope */}
                        <div className="glass-panel" style={{
                            padding: '1.6rem',
                            borderRadius: '14px',
                            background: roleTheme.surfaceGradient,
                            border: `1px solid ${roleTheme.cardBorder}`,
                            borderLeft: `4px solid ${roleTheme.primary}`,
                            boxShadow: `0 8px 24px -4px ${roleTheme.glow}`
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1.05rem', fontFamily: 'Fraunces, serif' }}>
                                    📥 Unassigned Tickets in Scope ({dutyQueue?.unassignedCount || 0})
                                </h3>
                                <span style={{ fontSize: '0.75rem', color: roleTheme.secondary, fontWeight: 'bold' }}>Scope: {userScope}</span>
                            </div>

                            {dutyQueue?.unassignedInScope?.length === 0 ? (
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', padding: '1rem 0' }}>
                                    No unassigned tickets in your scope!
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', maxHeight: '280px', overflowY: 'auto' }}>
                                    {dutyQueue?.unassignedInScope?.map(g => (
                                        <div key={g._id} style={{ background: 'rgba(11, 18, 32, 0.5)', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ minWidth: 0, flex: 1 }}>
                                                <div style={{ fontWeight: 'bold', fontSize: '0.88rem', color: 'var(--text-primary)' }}>{g.title}</div>
                                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                    <span>👤 {g.citizenName || 'Citizen'}</span>
                                                    {(g.citizenId?.email || g.citizenEmail) && (
                                                        <span style={{ fontSize: '0.73rem', opacity: 0.85, marginLeft: '4px', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                                                            ({g.citizenId?.email || g.citizenEmail})
                                                        </span>
                                                    )}
                                                    <span> • 📍 {g.location} • Priority: </span>
                                                    <span style={{ color: 'var(--accent-amber)' }}>{g.priority}</span>
                                                </div>
                                            </div>
                                            <Link to="/admin/grievances" className="btn-municipal-glass" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                                                Assign Officer
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Delayed Complaints & Overdue Tickets in Scope */}
                        <div className="glass-panel" style={{ padding: '1.6rem', borderRadius: '14px', borderLeft: '4px solid var(--signal-red)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1.05rem', fontFamily: 'Fraunces, serif' }}>
                                    ⚠️ Delayed Complaints & Overdue ({dutyQueue?.breachingCount || 0})
                                </h3>
                                <span style={{ fontSize: '0.75rem', color: 'var(--signal-red)', fontWeight: 'bold' }}>Attention Required</span>
                            </div>

                            {dutyQueue?.breachingOrOverdueInScope?.length === 0 ? (
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', padding: '1rem 0' }}>
                                    No delayed complaints or warnings in your scope!
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', maxHeight: '280px', overflowY: 'auto' }}>
                                    {dutyQueue?.breachingOrOverdueInScope?.map(g => (
                                        <div key={g._id} style={{ background: 'rgba(11, 18, 32, 0.5)', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ minWidth: 0, flex: 1 }}>
                                                <div style={{ fontWeight: 'bold', fontSize: '0.88rem', color: 'var(--text-primary)' }}>{g.title}</div>
                                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                    <span>👤 {g.citizenName || 'Citizen'}</span>
                                                    {(g.citizenId?.email || g.citizenEmail) && (
                                                        <span style={{ fontSize: '0.73rem', opacity: 0.85, marginLeft: '4px', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                                                            ({g.citizenId?.email || g.citizenEmail})
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="mono-data" style={{ fontSize: '0.75rem', color: 'var(--signal-red)', marginTop: '2px' }}>
                                                    Expected: {new Date(g.deadline).toLocaleString()}
                                                </div>
                                            </div>
                                            <Link to={`/citizen/grievance/${g._id}`} className="btn-municipal-glass" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', textDecoration: 'none', whiteSpace: 'nowrap' }}>
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
                                🚨 System-Wide Delayed Complaints Queue ({dutyQueue?.breachedCount || 0})
                            </h3>
                            <span className="mono-badge" style={{ background: 'rgba(192, 67, 59, 0.15)', color: 'var(--signal-red)', padding: '0.3rem 0.8rem', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.8rem' }}>
                                System Health Monitor
                            </span>
                        </div>

                        {dutyQueue?.systemBreached?.length === 0 ? (
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', padding: '1rem 0', textAlign: 'center' }}>
                                🎉 All grievances system-wide are within expected resolution timeframes!
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.8rem' }}>
                                {dutyQueue?.systemBreached?.map(g => (
                                    <div key={g._id} style={{ background: 'rgba(11, 18, 32, 0.5)', padding: '0.9rem 1rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--text-primary)' }}>{g.title}</div>
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                            <span>👤 {g.citizenName || 'Citizen'}</span>
                                            {(g.citizenId?.email || g.citizenEmail) && (
                                                <span style={{ fontSize: '0.73rem', opacity: 0.85, marginLeft: '4px', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                                                    ({g.citizenId?.email || g.citizenEmail})
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                            Category: <span style={{ color: 'var(--text-primary)' }}>{g.category}</span> • Assigned: {g.assignedTo?.name || 'Unassigned'}
                                        </div>
                                        <div className="mono-data" style={{ fontSize: '0.75rem', color: 'var(--signal-red)', marginTop: '4px', fontWeight: 'bold' }}>
                                            ⚠️ Delayed: {new Date(g.deadline).toLocaleDateString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Minimalist Stat Tiles */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div className="glass-card stagger-in" style={{
                        padding: '1.5rem',
                        borderRadius: '14px',
                        ...(!isManager ? {
                            background: roleTheme.surfaceGradient,
                            border: `1px solid ${roleTheme.cardBorder}`,
                            borderLeft: `3px solid ${roleTheme.primary}`
                        } : {})
                    }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            REGISTERED CITIZENS
                        </div>
                        <div className="mono-number" style={{ fontSize: '2.4rem', color: !isManager ? roleTheme.secondary : 'var(--text-primary)', marginTop: '0.2rem' }}>
                            {stats?.totalCitizens || 0}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                            Active civic accounts
                        </div>
                    </div>

                    <div className="glass-card stagger-in" style={{
                        padding: '1.5rem',
                        borderRadius: '14px',
                        ...(isManager ? {
                            background: roleTheme.surfaceGradient,
                            border: `1px solid ${roleTheme.cardBorder}`,
                            borderLeft: `3px solid ${roleTheme.primary}`
                        } : {})
                    }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {isManager ? `COMPLAINTS IN ${userScope.toUpperCase()}` : 'TOTAL COMPLAINTS'}
                        </div>
                        <div className="mono-number" style={{ fontSize: '2.4rem', color: isManager ? roleTheme.secondary : 'var(--text-primary)', marginTop: '0.2rem' }}>
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
                            {isManager ? `RESOLVED IN ${userScope.toUpperCase()}` : 'RESOLVED COMPLAINTS'}
                        </div>
                        <div className="mono-number" style={{ fontSize: '2.4rem', color: 'var(--signal-green)', marginTop: '0.2rem' }}>
                            {dutyQueue?.resolvedCount ?? stats?.healthSummary?.resolved ?? 0}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                            {isManager ? 'Scope tickets resolved' : 'System-wide resolved'}
                        </div>
                    </div>

                    <div className="glass-card stagger-in" style={{ padding: '1.5rem', borderRadius: '14px', borderLeft: '3px solid var(--signal-blue)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            AVG RESOLUTION TIME
                        </div>
                        <div className="mono-number" style={{ fontSize: '2.4rem', color: 'var(--signal-blue)', marginTop: '0.2rem' }}>
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
                        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>Complaint Status Distribution</h3>
                        <Bar data={statusChartData} options={chartOptions} />
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
                    <Link to="/admin/grievances" style={{
                        textDecoration: 'none',
                        padding: '0.65rem 1.4rem',
                        background: roleTheme.primary,
                        color: roleTheme.primaryBtnText,
                        borderRadius: '10px',
                        fontWeight: '600',
                        fontSize: '0.88rem',
                        border: '1px solid rgba(255,255,255,0.2)',
                        boxShadow: `0 4px 14px ${roleTheme.glow}`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                        View Master Tracker →
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
