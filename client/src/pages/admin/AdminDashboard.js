import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import API from '../../utils/api';
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
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const { data } = await API.get('/api/dashboard/stats');
                setStats(data);
            } catch (err) {
                console.error('Error fetching dashboard stats:', err);
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
                        Loading municipal command analytics...
                    </div>
                </div>
            </div>
        );
    }

    const categories = Object.keys(stats?.byCategory || {});
    const categoryCounts = Object.values(stats?.byCategory || {});

    const categoryData = {
        labels: categories.length > 0 ? categories : ['Sanitation', 'Water Supply', 'Roads', 'Electricity', 'Safety'],
        datasets: [
            {
                label: 'Grievances Count',
                data: categoryCounts.length > 0 ? categoryCounts : [12, 19, 8, 15, 6],
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
                <Topbar title="Command Center Dashboard" />

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
                            TOTAL COMPLAINTS
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
                        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>Grievances by Municipal Category</h3>
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
                            Access complete jurisdiction complaint inventory, filter by category, or assign field officers.
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
