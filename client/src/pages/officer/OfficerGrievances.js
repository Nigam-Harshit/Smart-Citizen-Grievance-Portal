import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import API from '../../utils/api';
import { Link } from 'react-router-dom';

const OfficerGrievances = () => {
    const [grievances, setGrievances] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Status Modal
    const [selectedItem, setSelectedItem] = useState(null);
    const [targetStatus, setTargetStatus] = useState('');
    const [fieldNotes, setFieldNotes] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [morphedId, setMorphedId] = useState(null);

    useEffect(() => {
        fetchAssignedGrievances();
    }, []);

    const fetchAssignedGrievances = async () => {
        try {
            const { data } = await API.get('/api/grievances');
            setGrievances(data);
        } catch (err) {
            console.error('Error fetching assigned grievances:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenStatusModal = (item, newStatus) => {
        setSelectedItem(item);
        setTargetStatus(newStatus);
        setFieldNotes('');
        setShowModal(true);
    };

    const handleUpdateStatus = async (e) => {
        e.preventDefault();
        if (!selectedItem) return;

        try {
            // Trigger status morph animation on target item
            setMorphedId(selectedItem._id);
            setTimeout(() => setMorphedId(null), 400);

            // Update grievance status
            await API.put(`/api/grievances/${selectedItem._id}`, { status: targetStatus });

            // Post timeline update field note
            await API.post(`/api/grievance-updates/${selectedItem._id}`, {
                type: 'Officer Field Note',
                notes: fieldNotes || `Officer changed status to ${targetStatus}.`,
                statusChange: targetStatus
            });

            setShowModal(false);
            fetchAssignedGrievances();
        } catch (err) {
            console.error('Error updating status:', err);
            alert(err.response?.data?.message || 'Failed to update grievance status');
        }
    };

    const openItems = grievances.filter(g => g.status === 'Open');
    const inProgressItems = grievances.filter(g => g.status === 'In Progress');
    const resolvedItems = grievances.filter(g => g.status === 'Resolved');

    const renderKanbanCard = (item) => {
        const isOverdue = item.status !== 'Resolved' && new Date(item.deadline) < new Date();
        const isMorphed = morphedId === item._id;

        return (
            <div
                key={item._id}
                className={`glass-card glass-card-interactive stagger-in ${isMorphed ? 'status-pill-morph' : ''}`}
                style={{
                    padding: '1.2rem',
                    borderRadius: '12px',
                    marginBottom: '1rem',
                    background: 'rgba(16, 24, 38, 0.7)',
                    borderLeft: item.priority === 'Critical' ? '4px solid var(--signal-red)' : '1px solid var(--glass-border)'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                    <span className="mono-data" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        #{item._id.substring(18)}
                    </span>
                    <span className={`status-pill ${item.priority === 'Critical' ? 'status-critical' : 'status-open'}`}>
                        {item.priority}
                    </span>
                </div>

                <Link to={`/citizen/grievance/${item._id}`} style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.95rem', display: 'block', marginBottom: '0.4rem' }}>
                    {item.title}
                </Link>

                <p style={{ margin: '0 0 0.8rem 0', color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: '1.4' }}>
                    {item.description?.substring(0, 80)}...
                </p>

                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.8rem' }}>
                    📍 {item.location} • <span style={{ color: 'var(--text-primary)' }}>{item.citizenName}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.6rem', borderTop: '1px solid var(--glass-border)' }}>
                    <div className="mono-data" style={{ fontSize: '0.72rem', color: isOverdue ? 'var(--signal-red)' : 'var(--text-muted)' }}>
                        SLA: {new Date(item.deadline).toLocaleDateString()}
                    </div>

                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                        {item.status === 'Open' && (
                            <button
                                onClick={() => handleOpenStatusModal(item, 'In Progress')}
                                className="btn-municipal-glass"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem', color: 'var(--signal-blue)', borderColor: 'var(--signal-blue)' }}
                            >
                                Start Work →
                            </button>
                        )}
                        {item.status === 'In Progress' && (
                            <button
                                onClick={() => handleOpenStatusModal(item, 'Resolved')}
                                className="btn-municipal"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem', background: 'var(--signal-green)', color: 'white' }}
                            >
                                Resolve ✓
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <div className="main-content">
                <Topbar title="Field Officer Kanban Workspace" />

                <div className="glass-panel" style={{ padding: '1.2rem 1.6rem', borderRadius: '14px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Interactive Field Kanban Board</h3>
                        <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            Manage assigned jurisdiction complaints through the 3-step field resolution pipeline.
                        </p>
                    </div>
                    <div className="mono-data" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Assigned Tickets: <span style={{ color: 'var(--accent-amber)', fontWeight: 'bold' }}>{grievances.length}</span>
                    </div>
                </div>

                {loading ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading Field Kanban Workspace...</div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', minHeight: '500px' }}>
                        {/* Column 1: Open */}
                        <div className="glass-panel" style={{ padding: '1.2rem', borderRadius: '14px', background: 'rgba(11, 18, 32, 0.4)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.6rem', borderBottom: '1px solid var(--glass-border)' }}>
                                <h4 style={{ margin: 0, color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>⏳</span> OPEN ({openItems.length})
                                </h4>
                            </div>
                            {openItems.length === 0 ? (
                                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                                    No open tickets
                                </div>
                            ) : (
                                openItems.map(renderKanbanCard)
                            )}
                        </div>

                        {/* Column 2: In Progress */}
                        <div className="glass-panel" style={{ padding: '1.2rem', borderRadius: '14px', background: 'rgba(11, 18, 32, 0.4)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.6rem', borderBottom: '1px solid var(--glass-border)' }}>
                                <h4 style={{ margin: 0, color: 'var(--signal-blue)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>⚙️</span> IN PROGRESS ({inProgressItems.length})
                                </h4>
                            </div>
                            {inProgressItems.length === 0 ? (
                                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                                    No tickets in progress
                                </div>
                            ) : (
                                inProgressItems.map(renderKanbanCard)
                            )}
                        </div>

                        {/* Column 3: Resolved */}
                        <div className="glass-panel" style={{ padding: '1.2rem', borderRadius: '14px', background: 'rgba(11, 18, 32, 0.4)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.6rem', borderBottom: '1px solid var(--glass-border)' }}>
                                <h4 style={{ margin: 0, color: 'var(--signal-green)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>✅</span> RESOLVED ({resolvedItems.length})
                                </h4>
                            </div>
                            {resolvedItems.length === 0 ? (
                                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                                    No resolved tickets
                                </div>
                            ) : (
                                resolvedItems.map(renderKanbanCard)
                            )}
                        </div>
                    </div>
                )}

                {/* Field Notes Modal */}
                {showModal && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h3 style={{ margin: '0 0 0.8rem 0', fontFamily: 'Fraunces, serif' }}>
                                Log Field Inspection Note
                            </h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                                Transitioning ticket <strong style={{ color: 'var(--text-primary)' }}>"{selectedItem?.title}"</strong> to <span style={{ color: 'var(--accent-amber)', fontWeight: 'bold' }}>{targetStatus}</span>.
                            </p>
                            <form onSubmit={handleUpdateStatus}>
                                <div className="form-group">
                                    <label>Inspection Notes & Action Taken</label>
                                    <textarea
                                        value={fieldNotes}
                                        onChange={(e) => setFieldNotes(e.target.value)}
                                        placeholder="Enter details of field inspection, dispatched repair teams, or resolution verification..."
                                        required
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
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
                                        Save Field Log & Update Status
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

export default OfficerGrievances;
