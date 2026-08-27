import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Topbar from '../../components/Topbar';
import Sidebar from '../../components/Sidebar';
import ExportButtons from '../../components/ExportButtons';
import API from '../../utils/api';

const Grievances = () => {
    const [searchParams] = useSearchParams();
    const [grievances, setGrievances] = useState([]);
    const [officers, setOfficers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterPriority, setFilterPriority] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [updatingId, setUpdatingId] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [gRes, oRes] = await Promise.all([
                API.get('/api/grievances'),
                API.get('/api/auth/staff')
            ]);
            setGrievances(gRes.data);
            setOfficers(oRes.data);
        } catch (err) {
            console.error('Error loading admin grievances:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAssignOfficer = async (grievanceId, officerId) => {
        setUpdatingId(grievanceId);
        try {
            await API.put(`/api/grievances/${grievanceId}`, { assignedTo: officerId });
            fetchData();
        } catch (err) {
            console.error('Error assigning officer:', err);
        } finally {
            setUpdatingId(null);
        }
    };

    const handleStatusChange = async (grievanceId, status) => {
        setUpdatingId(grievanceId);
        try {
            await API.put(`/api/grievances/${grievanceId}`, { status });
            fetchData();
        } catch (err) {
            console.error('Error updating status:', err);
        } finally {
            setUpdatingId(null);
        }
    };

    const filtered = grievances.filter(g => {
        const matchesSearch = !searchTerm ||
            g.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            g.citizenName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            g.location?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCat = !filterCategory || g.category === filterCategory;
        const matchesPrio = !filterPriority || g.priority === filterPriority;
        const matchesStatus = !filterStatus || g.status === filterStatus;
        return matchesSearch && matchesCat && matchesPrio && matchesStatus;
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
                <Topbar title="Master Grievance Tracker" />

                <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                        <h2 style={{ margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span>📑</span> All Civic Complaints ({filtered.length})
                        </h2>
                        <ExportButtons data={filtered} filename="Master_Grievances_Report" />
                    </div>

                    {/* Filter Bar */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                        <input
                            type="text"
                            placeholder="Filter by title, citizen, location..."
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
                    </div>

                    {/* Table View */}
                    {loading ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading master tickets...</div>
                    ) : filtered.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No matching grievances.</div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                        <th style={{ padding: '1rem' }}>Grievance Details</th>
                                        <th style={{ padding: '1rem' }}>Citizen</th>
                                        <th style={{ padding: '1rem' }}>Category & Location</th>
                                        <th style={{ padding: '1rem' }}>Priority</th>
                                        <th style={{ padding: '1rem' }}>Status</th>
                                        <th style={{ padding: '1rem' }}>Assigned Officer</th>
                                        <th style={{ padding: '1rem' }}>SLA Target</th>
                                        <th style={{ padding: '1rem' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(g => {
                                        const statusStyle = getStatusStyle(g.status);
                                        const priorityStyle = getPriorityStyle(g.priority);
                                        const isOverdue = g.status !== 'Resolved' && new Date(g.deadline) < new Date();

                                        return (
                                            <tr key={g._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                <td style={{ padding: '1rem', maxWidth: '240px' }}>
                                                    <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>{g.title}</div>
                                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {g.description}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1rem', fontSize: '0.9rem' }}>👤 {g.citizenName}</td>
                                                <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                                                    <div style={{ fontWeight: 'bold', color: '#818cf8' }}>🏷️ {g.category}</div>
                                                    <div style={{ color: 'var(--text-secondary)' }}>📍 {g.location}</div>
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', background: priorityStyle.bg, color: priorityStyle.color }}>
                                                        {g.priority}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <select
                                                        value={g.status}
                                                        onChange={(e) => handleStatusChange(g._id, e.target.value)}
                                                        disabled={updatingId === g._id}
                                                        style={{
                                                            padding: '0.3rem 0.6rem',
                                                            background: statusStyle.bg,
                                                            color: statusStyle.color,
                                                            border: 'none',
                                                            borderRadius: '8px',
                                                            fontWeight: 'bold',
                                                            fontSize: '0.75rem',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <option value="Open" style={{ background: '#1e293b', color: '#f59e0b' }}>Open</option>
                                                        <option value="In Progress" style={{ background: '#1e293b', color: '#3b82f6' }}>In Progress</option>
                                                        <option value="Resolved" style={{ background: '#1e293b', color: '#22c55e' }}>Resolved</option>
                                                    </select>
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <select
                                                        value={g.assignedTo?._id || g.assignedTo || ''}
                                                        onChange={(e) => handleAssignOfficer(g._id, e.target.value)}
                                                        disabled={updatingId === g._id}
                                                        style={{
                                                            padding: '0.3rem 0.6rem',
                                                            background: 'rgba(30, 41, 59, 0.95)',
                                                            color: 'white',
                                                            border: '1px solid rgba(255,255,255,0.1)',
                                                            borderRadius: '6px',
                                                            fontSize: '0.8rem',
                                                            outline: 'none',
                                                            maxWidth: '150px'
                                                        }}
                                                    >
                                                        <option value="">Unassigned</option>
                                                        {officers.map(o => (
                                                            <option key={o._id} value={o._id}>{o.name}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                                                    {isOverdue ? (
                                                        <span style={{ color: '#ef4444', fontWeight: 'bold' }}>⚠️ Breached</span>
                                                    ) : (
                                                        <span style={{ color: 'var(--text-secondary)' }}>{new Date(g.deadline).toLocaleDateString()}</span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <Link to={`/citizen/grievance/${g._id}`} style={{ color: '#818cf8', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.85rem' }}>
                                                        Timeline →
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

export default Grievances;
