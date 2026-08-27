import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Topbar from '../../components/Topbar';
import Sidebar from '../../components/Sidebar';
import ExportButtons from '../../components/ExportButtons';
import API from '../../utils/api';

const OfficerGrievances = () => {
    const [grievances, setGrievances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [updatingId, setUpdatingId] = useState(null);

    useEffect(() => {
        fetchGrievances();
    }, []);

    const fetchGrievances = async () => {
        try {
            const { data } = await API.get('/api/grievances');
            setGrievances(data);
        } catch (err) {
            console.error('Error fetching officer grievances:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (id, newStatus) => {
        setUpdatingId(id);
        try {
            await API.put(`/api/grievances/${id}`, { status: newStatus });
            fetchGrievances();
        } catch (err) {
            console.error('Failed to update status:', err);
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
        return matchesSearch && matchesCat;
    });

    const openList = filtered.filter(g => g.status === 'Open');
    const inProgressList = filtered.filter(g => g.status === 'In Progress');
    const resolvedList = filtered.filter(g => g.status === 'Resolved');

    const renderColumn = (title, items, statusKey, color) => (
        <div className="glass-card" style={{ flex: 1, padding: '1.2rem', borderRadius: '14px', minWidth: '280px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: `2px solid ${color}`, paddingBottom: '0.5rem' }}>
                <h3 style={{ margin: 0, color: 'white', fontSize: '1rem' }}>{title}</h3>
                <span style={{ background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.6rem', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 'bold', color }}>
                    {items.length}
                </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '70vh', overflowY: 'auto' }}>
                {items.length === 0 ? (
                    <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        No tickets in {title}
                    </div>
                ) : (
                    items.map(g => {
                        const isOverdue = g.status !== 'Resolved' && new Date(g.deadline) < new Date();
                        return (
                            <div key={g._id} style={{
                                padding: '1rem',
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '10px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                    <span style={{ fontSize: '0.7rem', color: '#818cf8', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                        {g.category}
                                    </span>
                                    <span style={{
                                        padding: '0.15rem 0.5rem',
                                        borderRadius: '10px',
                                        fontSize: '0.65rem',
                                        fontWeight: 'bold',
                                        background: g.priority === 'Critical' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                        color: g.priority === 'Critical' ? '#ef4444' : '#f59e0b'
                                    }}>
                                        {g.priority}
                                    </span>
                                </div>

                                <h4 style={{ margin: '0 0 0.4rem 0', color: 'white', fontSize: '0.95rem' }}>{g.title}</h4>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.8rem' }}>
                                    <div>👤 {g.citizenName}</div>
                                    <div>📍 {g.location}</div>
                                    {isOverdue && <div style={{ color: '#ef4444', fontWeight: 'bold', marginTop: '2px' }}>⚠️ SLA Overdue</div>}
                                </div>

                                {/* Status Transitions */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.6rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                    <Link to={`/citizen/grievance/${g._id}`} style={{ color: '#818cf8', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 'bold' }}>
                                        View Details
                                    </Link>
                                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                                        {statusKey !== 'In Progress' && statusKey !== 'Resolved' && (
                                            <button
                                                onClick={() => handleStatusChange(g._id, 'In Progress')}
                                                disabled={updatingId === g._id}
                                                style={{ padding: '0.25rem 0.5rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 'bold' }}
                                            >
                                                Start →
                                            </button>
                                        )}
                                        {statusKey !== 'Resolved' && (
                                            <button
                                                onClick={() => handleStatusChange(g._id, 'Resolved')}
                                                disabled={updatingId === g._id}
                                                style={{ padding: '0.25rem 0.5rem', background: '#22c55e', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 'bold' }}
                                            >
                                                Resolve ✓
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );

    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <div className="main-content" style={{ flex: 1, padding: '2rem', minHeight: '100vh', background: 'var(--bg-primary)' }}>
                <Topbar title="Assigned Field Kanban Board" />

                <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                        <h2 style={{ margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span>📌</span> Grievance Workflow Kanban
                        </h2>
                        <ExportButtons data={filtered} filename="Assigned_Grievances_Kanban" />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <input
                            type="text"
                            placeholder="Filter by title, citizen, location..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                padding: '0.5rem 1rem',
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                color: 'white',
                                outline: 'none',
                                flex: 1,
                                minWidth: '200px'
                            }}
                        />
                        <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            style={{
                                padding: '0.5rem 1rem',
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
                    </div>
                </div>

                {loading ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading Kanban Board...</div>
                ) : (
                    <div style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', paddingBottom: '1rem' }}>
                        {renderColumn('Open Issues', openList, 'Open', '#f59e0b')}
                        {renderColumn('In Progress (Field)', inProgressList, 'In Progress', '#3b82f6')}
                        {renderColumn('Resolved', resolvedList, 'Resolved', '#22c55e')}
                    </div>
                )}
            </div>
        </div>
    );
};

export default OfficerGrievances;
