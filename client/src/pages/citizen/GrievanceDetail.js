import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import Topbar from '../../components/Topbar';
import Sidebar from '../../components/Sidebar';
import API from '../../utils/api';

const GrievanceDetail = () => {
    const { id } = useParams();
    const { user } = useContext(AuthContext);
    const [grievance, setGrievance] = useState(null);
    const [updates, setUpdates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [noteText, setNoteText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchGrievanceDetails = useCallback(async () => {
        try {
            const [gRes, uRes] = await Promise.all([
                API.get(`/api/grievances/${id}`),
                API.get(`/api/grievance-updates/${id}`)
            ]);
            setGrievance(gRes.data);
            setUpdates(uRes.data);
        } catch (err) {
            console.error('Error loading grievance timeline:', err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchGrievanceDetails();
    }, [fetchGrievanceDetails]);

    const handleAddUpdate = async (e) => {
        e.preventDefault();
        if (!noteText.trim()) return;

        setSubmitting(true);
        try {
            const updateType = user?.role === 'citizen' ? 'Citizen Response' : 'Officer Note';
            await API.post(`/api/grievance-updates/${id}`, {
                type: updateType,
                notes: noteText
            });
            setNoteText('');
            fetchGrievanceDetails();
        } catch (err) {
            console.error('Error posting update:', err);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex' }}>
                <Sidebar />
                <div className="main-content" style={{ flex: 1, padding: '2rem', color: 'white' }}>
                    <Topbar title="Loading Grievance Timeline..." />
                    <p style={{ textAlign: 'center', marginTop: '4rem' }}>Loading grievance lifecycle...</p>
                </div>
            </div>
        );
    }

    if (!grievance) {
        return (
            <div style={{ display: 'flex' }}>
                <Sidebar />
                <div className="main-content" style={{ flex: 1, padding: '2rem', color: 'white' }}>
                    <Topbar title="Grievance Not Found" />
                    <p style={{ textAlign: 'center', marginTop: '4rem' }}>Grievance record not found.</p>
                </div>
            </div>
        );
    }

    const isOverdue = grievance.status !== 'Resolved' && new Date(grievance.deadline) < new Date();

    const getCategoryIcon = (category) => {
        if (category === 'Sanitation') return '🧹';
        if (category === 'Roads & Traffic') return '🚦';
        if (category === 'Water Supply') return '💧';
        if (category === 'Electricity') return '⚡';
        if (category === 'Public Safety') return '🛡️';
        return '🏢';
    };

    const getUpdateTypeBadge = (type) => {
        if (type === 'Resolution') return { icon: '✅', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)' };
        if (type === 'Officer Note') return { icon: '🛠️', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' };
        if (type === 'Escalation') return { icon: '⚠️', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' };
        if (type === 'Status Update') return { icon: '🔄', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' };
        return { icon: '💬', color: '#818cf8', bg: 'rgba(99, 102, 241, 0.15)' };
    };

    // Calculate current lifecycle step (1 to 4)
    const getLifecycleStep = () => {
        if (grievance.status === 'Resolved') return 4;
        if (grievance.status === 'In Progress') return 3;
        if (grievance.assignedTo || grievance.officerName) return 2;
        return 1;
    };

    const currentStep = getLifecycleStep();

    const steps = [
        { num: 1, label: 'Complaint Submitted', desc: new Date(grievance.createdAt).toLocaleDateString() },
        { num: 2, label: 'Officer Assigned', desc: grievance.officerName || 'Pending Officer' },
        { num: 3, label: 'Field Investigation', desc: grievance.status === 'In Progress' ? 'In Progress' : grievance.status === 'Resolved' ? 'Completed' : 'Awaiting Inspection' },
        { num: 4, label: 'Resolution & Verification', desc: grievance.resolvedAt ? new Date(grievance.resolvedAt).toLocaleDateString() : 'Target: ' + new Date(grievance.deadline).toLocaleDateString() }
    ];

    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <div className="main-content" style={{ flex: 1, padding: '2rem', minHeight: '100vh', background: 'var(--bg-primary)' }}>
                <Topbar title={`Grievance Lifecycle #${id.substring(id.length - 6).toUpperCase()}`} />

                <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Link to={user?.role === 'citizen' ? '/citizen/grievances' : user?.role === 'officer' ? '/officer/grievances' : '/admin/grievances'} style={{ color: '#818cf8', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 'bold' }}>
                        ← Back to Grievance Dashboard
                    </Link>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Ticket ID: <strong style={{ color: 'white', fontFamily: 'monospace' }}>{id}</strong>
                    </span>
                </div>

                {/* Civic Grievance Resolution Lifecycle Stepper */}
                <div className="glass-card" style={{ padding: '2rem', borderRadius: '16px', marginBottom: '2rem' }}>
                    <h3 style={{ margin: '0 0 1.5rem 0', color: 'white', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>📍</span> Grievance Resolution Lifecycle Progress
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', position: 'relative' }}>
                        {steps.map((step) => {
                            const isCompleted = currentStep > step.num;
                            const isCurrent = currentStep === step.num;

                            return (
                                <div key={step.num} style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    textAlign: 'center',
                                    position: 'relative',
                                    zIndex: 2
                                }}>
                                    <div style={{
                                        width: '44px',
                                        height: '44px',
                                        borderRadius: '50%',
                                        background: isCompleted ? '#22c55e' : isCurrent ? 'linear-gradient(135deg, #6366f1, #3b82f6)' : 'rgba(255,255,255,0.08)',
                                        color: isCompleted || isCurrent ? 'white' : 'var(--text-secondary)',
                                        border: isCurrent ? '3px solid rgba(99, 102, 241, 0.4)' : '1px solid rgba(255,255,255,0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 'bold',
                                        fontSize: '1.1rem',
                                        marginBottom: '0.8rem',
                                        boxShadow: isCurrent ? '0 0 20px rgba(99, 102, 241, 0.4)' : 'none',
                                        transition: 'all 0.3s'
                                    }}>
                                        {isCompleted ? '✓' : step.num}
                                    </div>
                                    <div style={{
                                        fontWeight: 'bold',
                                        fontSize: '0.9rem',
                                        color: isCurrent || isCompleted ? 'white' : 'var(--text-secondary)',
                                        marginBottom: '4px'
                                    }}>
                                        {step.label}
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                        {step.desc}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Grievance Details & Timeline split */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                    {/* Left Column: Complaint Details & Timeline */}
                    <div>
                        <div className="glass-card" style={{ padding: '2rem', borderRadius: '16px', marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <div>
                                    <span style={{ fontSize: '0.8rem', color: '#818cf8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span>{getCategoryIcon(grievance.category)}</span> {grievance.category}
                                    </span>
                                    <h2 style={{ margin: '0.4rem 0 0.5rem 0', color: 'white', fontSize: '1.4rem' }}>{grievance.title}</h2>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                        📍 <strong>Location / Landmark:</strong> {grievance.location}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                                    <span style={{
                                        padding: '0.4rem 0.9rem',
                                        borderRadius: '12px',
                                        fontSize: '0.85rem',
                                        fontWeight: 'bold',
                                        background: grievance.status === 'Resolved' ? 'rgba(34, 197, 94, 0.15)' : grievance.status === 'In Progress' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                        color: grievance.status === 'Resolved' ? '#22c55e' : grievance.status === 'In Progress' ? '#3b82f6' : '#f59e0b'
                                    }}>
                                        {grievance.status}
                                    </span>
                                    <span style={{
                                        padding: '0.2rem 0.6rem',
                                        borderRadius: '8px',
                                        fontSize: '0.72rem',
                                        fontWeight: 'bold',
                                        background: grievance.priority === 'Critical' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                        color: grievance.priority === 'Critical' ? '#ef4444' : '#f59e0b'
                                    }}>
                                        {grievance.priority} Priority
                                    </span>
                                </div>
                            </div>

                            <div style={{ padding: '1.2rem', background: 'rgba(0,0,0,0.25)', borderRadius: '12px', color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <strong>Description of Issue:</strong>
                                <p style={{ margin: '0.5rem 0 0 0' }}>{grievance.description}</p>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px' }}>
                                <div><strong>Complainant:</strong> <span style={{ color: 'white' }}>{grievance.citizenName}</span></div>
                                <div><strong>Assigned Officer:</strong> <span style={{ color: '#818cf8', fontWeight: 'bold' }}>{grievance.officerName || 'Pending'}</span></div>
                                <div><strong>Filed Date:</strong> <span style={{ color: 'white' }}>{new Date(grievance.createdAt).toLocaleDateString()}</span></div>
                                <div><strong>SLA Target:</strong> <span style={{ color: isOverdue ? '#ef4444' : '#22c55e', fontWeight: 'bold' }}>{new Date(grievance.deadline).toLocaleDateString()}</span></div>
                            </div>
                        </div>

                        {/* Interactive Timeline Log */}
                        <div className="glass-card" style={{ padding: '2rem', borderRadius: '16px' }}>
                            <h3 style={{ margin: '0 0 1.5rem 0', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>💬</span> Official Action & Communication Timeline
                            </h3>

                            {/* Response Form */}
                            <form onSubmit={handleAddUpdate} style={{ marginBottom: '2rem' }}>
                                <textarea
                                    rows="3"
                                    placeholder={user?.role === 'citizen' ? "Add a message or additional photo evidence detail for the assigned officer..." : "Add official field note, inspection update, or resolution remarks..."}
                                    value={noteText}
                                    onChange={(e) => setNoteText(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.8rem 1rem',
                                        background: 'rgba(0,0,0,0.3)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '10px',
                                        color: 'white',
                                        fontSize: '0.9rem',
                                        outline: 'none',
                                        marginBottom: '0.8rem'
                                    }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <button
                                        type="submit"
                                        disabled={submitting || !noteText.trim()}
                                        style={{
                                            padding: '0.6rem 1.5rem',
                                            background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
                                            border: 'none',
                                            borderRadius: '8px',
                                            color: 'white',
                                            fontWeight: 'bold',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {submitting ? 'Posting Update...' : 'Post Timeline Update'}
                                    </button>
                                </div>
                            </form>

                            {/* Timeline Items */}
                            {updates.length === 0 ? (
                                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', margin: '2rem 0' }}>No timeline updates logged yet.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                    {updates.map(u => {
                                        const typeBadge = getUpdateTypeBadge(u.type);
                                        return (
                                            <div key={u._id} style={{
                                                padding: '1.2rem',
                                                background: 'rgba(255,255,255,0.02)',
                                                borderLeft: `4px solid ${typeBadge.color}`,
                                                borderRadius: '10px',
                                                border: '1px solid rgba(255,255,255,0.04)',
                                                borderLeftWidth: '4px'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ fontSize: '1.1rem' }}>{typeBadge.icon}</span>
                                                        <span style={{ fontWeight: 'bold', color: 'white', fontSize: '0.95rem' }}>
                                                            {u.userId?.name || 'Portal User'}
                                                        </span>
                                                        <span style={{
                                                            padding: '0.15rem 0.5rem',
                                                            borderRadius: '8px',
                                                            fontSize: '0.7rem',
                                                            fontWeight: 'bold',
                                                            background: typeBadge.bg,
                                                            color: typeBadge.color
                                                        }}>
                                                            {u.type}
                                                        </span>
                                                    </div>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                        {new Date(u.createdAt).toLocaleString()}
                                                    </span>
                                                </div>
                                                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                                                    {u.notes}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Status Card & SLA Target */}
                    <div>
                        <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px', marginBottom: '1.5rem' }}>
                            <h4 style={{ margin: '0 0 1rem 0', color: 'white' }}>SLA & Dispatch Card</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
                                <div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Current Pipeline Status</div>
                                    <div style={{ fontWeight: 'bold', color: 'white', marginTop: '3px', fontSize: '1.1rem' }}>{grievance.status}</div>
                                </div>
                                <div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 'bold', textTransform: 'uppercase' }}>SLA Compliance Health</div>
                                    <div style={{ fontWeight: 'bold', color: isOverdue ? '#ef4444' : '#22c55e', marginTop: '3px', fontSize: '0.95rem' }}>
                                        {isOverdue ? '⚠️ Overdue SLA Breached' : '✅ Within SLA Target Window'}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Resolution Deadline</div>
                                    <div style={{ color: 'white', marginTop: '3px' }}>{new Date(grievance.deadline).toLocaleString()}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GrievanceDetail;
