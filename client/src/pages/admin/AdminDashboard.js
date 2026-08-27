import { useState, useEffect } from 'react';
import API from '../../utils/api';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement } from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement);

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalCitizens: 0,
        totalGrievances: 0,
        activeGrievances: 0,
        resolvedGrievances: 0,
        overdueCount: 0,
        highRiskCitizens: 0,
        avgResolutionTimeHours: 0,
        categoryDistribution: [],
        grievanceStatusDistribution: [],
        riskDistribution: [],
        monthlyGrievanceTrend: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const { data } = await API.get('/api/dashboard/stats');
                setStats(data);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching dashboard stats:", error);
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: { labels: { color: '#94a3b8' } },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                titleColor: '#fff',
                bodyColor: '#cbd5e1',
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
                padding: 10
            }
        },
        scales: {
            y: {
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: { color: '#94a3b8' }
            },
            x: {
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: { color: '#94a3b8' }
            }
        }
    };

    const pieOptions = {
        responsive: true,
        plugins: {
            legend: { labels: { color: '#94a3b8' } }
        },
        borderColor: 'rgba(0,0,0,0)'
    };

    // Category distribution bar chart
    const categoryBarData = {
        labels: stats.categoryDistribution?.length > 0 ? stats.categoryDistribution.map(d => d._id) : ['Sanitation', 'Roads', 'Water', 'Electricity', 'Safety'],
        datasets: [{
            label: 'Grievances by Category',
            data: stats.categoryDistribution?.length > 0 ? stats.categoryDistribution.map(d => d.count) : [12, 18, 9, 14, 5],
            backgroundColor: 'rgba(99, 102, 241, 0.8)',
            borderRadius: 6,
            hoverBackgroundColor: '#818cf8'
        }]
    };

    // Escalation Risk Pie Chart
    const pieData = {
        labels: stats.riskDistribution?.length > 0 ? stats.riskDistribution.map(d => d._id + ' Escalation Risk') : ['Low Risk', 'Medium Risk', 'High Risk'],
        datasets: [{
            data: stats.riskDistribution?.length > 0 ? stats.riskDistribution.map(d => d.count) : [75, 20, 5],
            backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'],
            borderWidth: 0
        }]
    };

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const lineData = {
        labels: stats.monthlyGrievanceTrend?.length > 0 
            ? stats.monthlyGrievanceTrend.map(d => `${monthNames[d._id.month - 1]}`) 
            : ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
        datasets: [
            {
                label: 'Grievances Filed',
                data: stats.monthlyGrievanceTrend?.length > 0 ? stats.monthlyGrievanceTrend.map(d => d.filedCount) : [15, 22, 18, 30, 25, 35],
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true
            },
            {
                label: 'Grievances Resolved',
                data: stats.monthlyGrievanceTrend?.length > 0 ? stats.monthlyGrievanceTrend.map(d => d.resolvedCount) : [10, 18, 15, 25, 22, 30],
                borderColor: '#22c55e',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true
            }
        ]
    };

    if (loading) return (
        <div className="dashboard-container" style={{ display: 'flex' }}>
            <Sidebar />
            <div className="main-content" style={{ flex: 1, padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ color: 'var(--text-primary)', fontSize: '1.5rem' }}>
                    Loading Civic Analytics...
                </div>
            </div>
        </div>
    );

    return (
        <div className="dashboard-container" style={{ display: 'flex' }}>
            <Sidebar />
            <div className="main-content" style={{ flex: 1, padding: '2rem', minHeight: '100vh', background: 'var(--bg-primary)' }}>
                <Topbar title="Admin Analytics & Command Center" />

                {/* Primary Metric KPIs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                    <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '14px', cursor: 'pointer' }} onClick={() => navigate('/admin/citizens')}>
                        <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Registered Citizens</h3>
                        <p style={{ margin: '0.2rem 0', fontSize: '2rem', fontWeight: 'bold', color: 'white' }}>{stats.totalCitizens}</p>
                        <span style={{ color: '#22c55e', fontSize: '0.8rem', fontWeight: 'bold' }}>Active Civic Profiles</span>
                    </div>

                    <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '14px', cursor: 'pointer' }} onClick={() => navigate('/admin/grievances')}>
                        <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Active Open Complaints</h3>
                        <p style={{ margin: '0.2rem 0', fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b' }}>{stats.activeGrievances}</p>
                        <span style={{ color: '#f59e0b', fontSize: '0.8rem', fontWeight: 'bold' }}>Open / In Progress</span>
                    </div>

                    <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '14px', cursor: 'pointer', borderBottom: '3px solid #ef4444' }} onClick={() => navigate('/admin/grievances')}>
                        <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '1px' }}>SLA Overdue Breaches</h3>
                        <p style={{ margin: '0.2rem 0', fontSize: '2rem', fontWeight: 'bold', color: '#ef4444' }}>{stats.overdueCount}</p>
                        <span style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 'bold' }}>Requires Immediate Dispatch</span>
                    </div>

                    <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '14px', cursor: 'pointer' }} onClick={() => navigate('/admin/insights')}>
                        <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '1px' }}>High Escalation Risk Citizens</h3>
                        <p style={{ margin: '0.2rem 0', fontSize: '2rem', fontWeight: 'bold', color: '#ef4444' }}>{stats.highRiskCitizens}</p>
                        <span style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 'bold' }}>AI Escalation Matrix</span>
                    </div>

                    <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '14px' }}>
                        <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Avg SLA Resolution Time</h3>
                        <p style={{ margin: '0.2rem 0', fontSize: '2rem', fontWeight: 'bold', color: '#22c55e' }}>{stats.avgResolutionTimeHours} hrs</p>
                        <span style={{ color: '#22c55e', fontSize: '0.8rem', fontWeight: 'bold' }}>Turnaround Performance</span>
                    </div>
                </div>

                {/* Main Charts Area */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
                    {/* Grievances Filing vs Resolution Trend */}
                    <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
                        <h3 style={{ color: 'var(--text-primary)', margin: '0 0 1.5rem 0' }}>Grievance Filing vs. Resolution Rate</h3>
                        <div style={{ height: '300px' }}>
                            <Line data={lineData} options={{ ...chartOptions, maintainAspectRatio: false }} />
                        </div>
                    </div>

                    {/* Category Breakdown Bar Chart */}
                    <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
                        <h3 style={{ color: 'var(--text-primary)', margin: '0 0 1.5rem 0' }}>Issues by Category</h3>
                        <div style={{ height: '300px' }}>
                            <Bar data={categoryBarData} options={{ ...chartOptions, maintainAspectRatio: false }} />
                        </div>
                    </div>
                </div>

                {/* Bottom Row: AI Escalation Risk Distribution & Action Center */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    {/* Escalation Risk Pie Chart */}
                    <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
                        <h3 style={{ color: 'var(--text-primary)', marginBottom: '1.5rem' }}>Civic Escalation Risk Matrix</h3>
                        <div style={{ height: '240px', display: 'flex', justifyContent: 'center' }}>
                            <Pie data={pieData} options={{ ...pieOptions, maintainAspectRatio: false }} />
                        </div>
                    </div>

                    {/* Operational Shortcuts */}
                    <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                            <h3 style={{ color: 'var(--text-primary)', margin: '0 0 1rem 0' }}>Quick Administrative Actions</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                                Manage officer workload assignments, inspect SLA compliance, or run the AI escalation engine.
                            </p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <button onClick={() => navigate('/admin/grievances')} style={{ padding: '0.8rem', background: 'linear-gradient(135deg, #6366f1, #3b82f6)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                                Master Grievance Tracker →
                            </button>
                            <button onClick={() => navigate('/admin/insights')} style={{ padding: '0.8rem', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                                Run Escalation Model →
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
