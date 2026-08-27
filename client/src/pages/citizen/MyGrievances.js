import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Topbar from '../../components/Topbar';
import Sidebar from '../../components/Sidebar';
import ExportButtons from '../../components/ExportButtons';
import API from '../../utils/api';

const MyGrievances = () => {
    const [searchParams] = useSearchParams();
    const [grievances, setGrievances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPriority, setFilterPriority] = useState('');

    useEffect(() => {
        fetchGrievances();
    }, []);

    const fetchGrievances = async () => {
        try {
            const { data } = await API.get('/api/grievances');
            setGrievances(data);
        } catch (err) {
            console.error('Error fetching grievances:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredGrievances = grievances.filter(g => {
        const matchesSearch = !searchTerm ||
            g.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            g.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            g.location?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCat = !filterCategory || g.category === filterCategory;
        const matchesStatus = !filterStatus || g.status === filterStatus;
        const matchesPrio = !filterPriority || g.priority === filterPriority;

        return matchesSearch && matchesCat && matchesStatus && matchesPrio;
    });

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
                <Topbar title="My Grievance History" />

                <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                        <h2 style={{ margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span>📋</span> My Filed Complaints ({filteredGrievances.length})
                        </h2>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <ExportButtons data={filteredGrievances} filename="My_Grievances" />
                            <Link to="/citizen/submit" style={{
                                padding: '0.6rem 1.2rem',
                                background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
                                color: 'white',
                                borderRadius: '8px',
                                textDecoration: 'none',
                                fontWeight: 'bold'
                            }}>
                                + Lodge New
                            </Link>
                        </div>
                    </div>

                    {/* Search & Filters */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                        <input
                            type="text"
                            placeholder="Filter by title or location..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                padding: '0.6rem 1rem',
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                color: 'white',
                                outline: 'none'
                            }}
                        />

                        <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            style={{
                                padding: '0.6rem 1rem',
                                background: 'rgba(30, 41, 59, 0.95)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                color: 'white',
                                outline: 'none'
                            }}
                        >
                            <option value="">All Categories</option>
                            <option value="Sanitation">Sanitation</option>
                            <option value="Roads & Traffic">Roads & Traffic</option>
                            <option value="Water Supply">Water Supply</option>
                            <option value="Electricity">Electricity</option>
                            <option value="Public Safety">Public Safety</option>
                            <option value="Other">Other</option>
                        </select>

                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            style={{
                                padding: '0.6rem 1rem',
                                background: 'rgba(30, 41, 59, 0.95)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                color: 'white',
                                outline: 'none'
                            }}
                        >
                            <option value="">All Statuses</option>
                            <option value="Open">Open</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Resolved">Resolved</option>
                        </select>

                        <select
                            value={filterPriority}
                            onChange={(e) => setFilterPriority(e.target.value)}
                            style={{
                                padding: '0.6rem 1rem',
                                background: 'rgba(30, 41, 59, 0.95)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                color: 'white',
                                outline: 'none'
                            }}
                        >
                            <option value="">All Priorities</option>
                            <option value="Critical">Critical</option>
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                        </select>
                    </div>

                    {/* Table View */}
                    {loading ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading grievances...</div>
                    ) : filteredGrievances.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No matching complaints found.</div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', color: 'var(--text-primary)' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                        <th style={{ padding: '1rem' }}>Title & Description</th>
                                        <th style={{ padding: '1rem' }}>Category</th>
                                        <th style={{ padding: '1rem' }}>Location</th>
                                        <th style={{ padding: '1rem' }}>Priority</th>
                                        <th style={{ padding: '1rem' }}>Status</th>
                                        <th style={{ padding: '1rem' }}>SLA Target</th>
                                        <th style={{ padding: '1rem' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredGrievances.map(g => {
                                        const statusStyle = getStatusStyle(g.status);
                                        const priorityStyle = getPriorityStyle(g.priority);
                                        const isOverdue = g.status !== 'Resolved' && new Date(g.deadline) < new Date();

                                        return (
                                            <tr key={g._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                <td style={{ padding: '1rem', maxWidth: '260px' }}>
                                                    <div style={{ fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>{g.title}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {g.description}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1rem', fontSize: '0.9rem' }}>🏷️ {g.category}</td>
                                                <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>📍 {g.location}</td>
                                                <td style={{ padding: '1rem' }}>
                                                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', background: priorityStyle.bg, color: priorityStyle.color }}>
                                                        {g.priority}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', background: statusStyle.bg, color: statusStyle.color }}>
                                                        {g.status}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                                                    {isOverdue ? (
                                                        <span style={{ color: '#ef4444', fontWeight: 'bold' }}>⚠️ Breached</span>
                                                    ) : (
                                                        <span style={{ color: 'var(--text-secondary)' }}>{new Date(g.deadline).toLocaleDateString()}</span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <Link to={`/citizen/grievance/${g._id}`} style={{
                                                        padding: '0.4rem 0.8rem',
                                                        borderRadius: '6px',
                                                        background: 'rgba(99, 102, 241, 0.15)',
                                                        color: '#818cf8',
                                                        textDecoration: 'none',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        View Timeline
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MyGrievances;
