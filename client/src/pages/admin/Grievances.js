import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import API from '../../utils/api';
import { Link } from 'react-router-dom';

const MasterGrievances = () => {
    const [grievances, setGrievances] = useState([]);
    const [officers, setOfficers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterCategory, setFilterCategory] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPriority, setFilterPriority] = useState('');

    // Assignment Modal State
    const [selectedGrievance, setSelectedGrievance] = useState(null);
    const [assignOfficerId, setAssignOfficerId] = useState('');
    const [showAssignModal, setShowAssignModal] = useState(false);

    useEffect(() => {
        fetchGrievances();
        fetchOfficers();
    }, [filterCategory, filterStatus, filterPriority]);

    const fetchGrievances = async () => {
        try {
            let query = '/api/grievances?';
            if (filterCategory) query += `category=${encodeURIComponent(filterCategory)}&`;
            if (filterStatus) query += `status=${encodeURIComponent(filterStatus)}&`;
            if (filterPriority) query += `priority=${encodeURIComponent(filterPriority)}&`;

            const { data } = await API.get(query);
            setGrievances(data);
        } catch (err) {
            console.error('Error fetching grievances:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchOfficers = async () => {
        try {
            const { data } = await API.get('/api/citizens');
            // Mock or fetch staff users if available, or fetch officers
            const userRes = await API.get('/api/auth/officers').catch(() => ({ data: [] }));
            setOfficers(userRes.data || []);
        } catch (err) {
            console.error('Error fetching officers:', err);
        }
    };

    const handleOpenAssignModal = (g) => {
        setSelectedGrievance(g);
        setAssignOfficerId(g.assignedTo?._id || '');
        setShowAssignModal(true);
    };

    const handleAssignOfficer = async (e) => {
        e.preventDefault();
        if (!selectedGrievance) return;

        try {
            await API.put(`/api/grievances/${selectedGrievance._id}`, {
                assignedTo: assignOfficerId
            });
            setShowAssignModal(false);
            fetchGrievances();
        } catch (err) {
            console.error('Error assigning officer:', err);
            alert(err.response?.data?.message || 'Failed to assign officer');
        }
    };

    const getStatusClass = (status) => {
        if (status === 'Resolved') return 'status-pill status-resolved';
        if (status === 'In Progress') return 'status-pill status-in-progress';
        return 'status-pill status-open';
    };

    const getPriorityClass = (prio) => {
        if (prio === 'Critical') return 'status-pill status-critical';
        if (prio === 'High') return 'status-pill status-open';
        return 'status-pill';
    };

    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <div className="main-content">
                <Topbar title="Master Grievance Tracker" />

                {/* Filters Panel */}
                <div className="glass-panel" style={{ padding: '1.2rem 1.6rem', borderRadius: '14px', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Filters:
                    </div>
                    <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={{ width: '180px' }}>
                        <option value="">All Categories</option>
                        <option value="Sanitation">Sanitation</option>
                        <option value="Water Supply">Water Supply</option>
                        <option value="Roads">Roads</option>
                        <option value="Electricity">Electricity</option>
                        <option value="Public Safety">Public Safety</option>
                    </select>

                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ width: '160px' }}>
                        <option value="">All Statuses</option>
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                    </select>

                    <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} style={{ width: '160px' }}>
                        <option value="">All Priorities</option>
                        <option value="Critical">Critical</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                    </select>

                    <div style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Showing <span className="mono-data" style={{ color: 'var(--accent-amber)', fontWeight: 'bold' }}>{grievances.length}</span> complaints
                    </div>
                </div>

                {/* Table Container */}
                <div className="glass-panel" style={{ borderRadius: '14px', overflow: 'hidden' }}>
                    {loading ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading Master Grievance Inventory...</div>
                    ) : grievances.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No grievances found matching active criteria.</div>
                    ) : (
                        <table className="table-glass">
                            <thead>
                                <tr>
                                    <th>ID / Title</th>
                                    <th>Citizen</th>
                                    <th>Category</th>
                                    <th>Location</th>
                                    <th>Priority</th>
                                    <th>SLA Target</th>
                                    <th>Status</th>
                                    <th>Assigned Officer</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {grievances.map(g => {
                                    const isOverdue = g.status !== 'Resolved' && new Date(g.deadline) < new Date();

                                    return (
                                        <tr key={g._id} className="table-row-hover">
                                            <td>
                                                <Link to={`/citizen/grievance/${g._id}`} style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 'bold' }}>
                                                    {g.title}
                                                </Link>
                                                <div className="mono-data" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                    #{g._id.substring(18)}
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: '500' }}>{g.citizenName || 'Citizen'}</div>
                                                <div className="mono-data" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    {new Date(g.createdAt).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td><span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{g.category}</span></td>
                                            <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{g.location}</td>
                                            <td><span className={getPriorityClass(g.priority)}>{g.priority}</span></td>
                                            <td>
                                                <div className="mono-data" style={{ fontSize: '0.8rem', color: isOverdue ? 'var(--signal-red)' : 'var(--text-muted)', fontWeight: isOverdue ? 'bold' : 'normal' }}>
                                                    {new Date(g.deadline).toLocaleDateString()}
                                                    {isOverdue && <span style={{ marginLeft: '4px' }}>⚠️ BREACHED</span>}
                                                </div>
                                            </td>
                                            <td><span className={getStatusClass(g.status)}>{g.status}</span></td>
                                            <td>
                                                {g.assignedTo ? (
                                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: '500' }}>
                                                        👮 {g.assignedTo.name || g.officerName || 'Officer Assigned'}
                                                    </span>
                                                ) : (
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--accent-amber)', fontStyle: 'italic' }}>
                                                        Unassigned
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                <button
                                                    onClick={() => handleOpenAssignModal(g)}
                                                    className="btn-municipal-glass"
                                                    style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.78rem', cursor: 'pointer' }}
                                                >
                                                    Assign Officer
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Officer Assignment Modal */}
                {showAssignModal && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h3 style={{ margin: '0 0 1rem 0', fontFamily: 'Fraunces, serif' }}>Assign Field Officer</h3>
                            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '1.2rem' }}>
                                Select a field officer for complaint <strong style={{ color: 'var(--text-primary)' }}>"{selectedGrievance?.title}"</strong>:
                            </p>
                            <form onSubmit={handleAssignOfficer}>
                                <div className="form-group">
                                    <label>Select Officer</label>
                                    <select
                                        value={assignOfficerId}
                                        onChange={(e) => setAssignOfficerId(e.target.value)}
                                        required
                                    >
                                        <option value="">-- Choose Field Officer --</option>
                                        <option value="6a8fe29afbba5bb1ba579a65">Officer Rakesh Sharma (Water & Sanitation)</option>
                                        <option value="6a8fe29afbba5bb1ba579a66">Officer Priya Verma (Roads & Infrastructure)</option>
                                        <option value="6a8fe29afbba5bb1ba579a67">Officer Amit Patel (Electricity & Safety)</option>
                                        {officers.map(o => (
                                            <option key={o._id} value={o._id}>{o.name} ({o.email})</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowAssignModal(false)}
                                        className="btn-municipal-glass"
                                        style={{ padding: '0.6rem 1.2rem', borderRadius: '6px' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-municipal"
                                        style={{ padding: '0.6rem 1.4rem' }}
                                    >
                                        Confirm Assignment
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MasterGrievances;
