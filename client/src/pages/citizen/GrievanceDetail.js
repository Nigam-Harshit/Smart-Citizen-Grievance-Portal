import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import API from '../../utils/api';

const GrievanceDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [grievance, setGrievance] = useState(null);
    const [updates, setUpdates] = useState([]);
    const [loading, setLoading] = useState(true);

    // Photographic Evidence State
    const [photoUrl, setPhotoUrl] = useState(null);
    const [photoLoading, setPhotoLoading] = useState(false);
    const [photoError, setPhotoError] = useState(null);
    const [photoMetadata, setPhotoMetadata] = useState(null);
    const [lightboxOpen, setLightboxOpen] = useState(false);

    // Timeline Post Form State
    const [newNote, setNewNote] = useState('');
    const [noteType, setNoteType] = useState('Citizen Response');
    const [submitting, setSubmitting] = useState(false);

    const fetchDetails = useCallback(async () => {
        try {
            const [gRes, uRes] = await Promise.all([
                API.get(`/api/grievances/${id}`),
                API.get(`/api/grievance-updates/${id}`)
            ]);
            setGrievance(gRes.data);
            setUpdates(uRes.data);
        } catch (err) {
            console.error('Error fetching grievance details:', err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    const fetchPhoto = useCallback(async () => {
        if (!id) return;
        setPhotoLoading(true);
        setPhotoError(null);
        try {
            const { data } = await API.get(`/api/grievances/${id}/photo`);
            setPhotoUrl(data.photoUrl);
            setPhotoMetadata(data.attachment);
        } catch (err) {
            console.error('Error fetching grievance photo:', err);
            setPhotoError(err.response?.data?.message || 'Evidence photo currently unavailable');
            setPhotoUrl(null);
        } finally {
            setPhotoLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchDetails();
    }, [fetchDetails]);

    useEffect(() => {
        if (grievance?.attachment) {
            fetchPhoto();
        } else {
            setPhotoUrl(null);
            setPhotoMetadata(null);
            setPhotoError(null);
        }
    }, [grievance?.attachment, fetchPhoto]);

    // Handle Escape key to dismiss full-resolution photo lightbox
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && lightboxOpen) {
                setLightboxOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [lightboxOpen]);

    const handleAddUpdate = async (e) => {
        e.preventDefault();
        if (!newNote.trim()) return;

        setSubmitting(true);
        try {
            await API.post(`/api/grievance-updates/${id}`, {
                type: noteType,
                notes: newNote
            });
            setNewNote('');
            fetchDetails();
        } catch (err) {
            console.error('Error posting update:', err);
            alert(err.response?.data?.message || 'Error posting update');
        } finally {
            setSubmitting(false);
        }
    };

    const getCategoryIcon = (cat) => {
        switch (cat) {
            case 'Sanitation': return '🧹';
            case 'Water Supply': return '💧';
            case 'Roads': return '🚦';
            case 'Electricity': return '⚡';
            case 'Public Safety': return '🛡️';
            default: return '📋';
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex' }}>
                <Sidebar />
                <div className="main-content">
                    <Topbar title="Grievance Details" />
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Loading complaint timeline & resolution lifecycle...
                    </div>
                </div>
            </div>
        );
    }

    if (!grievance) {
        return (
            <div style={{ display: 'flex' }}>
                <Sidebar />
                <div className="main-content">
                    <Topbar title="Grievance Details" />
                    <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Grievance record not found or access restricted.
                    </div>
                </div>
            </div>
        );
    }

    // 4-Step Resolution Lifecycle Stepper
    const steps = [
        { step: 1, label: 'Complaint Submitted', done: true },
        { step: 2, label: 'Officer Assigned', done: !!grievance.assignedTo },
        { step: 3, label: 'Field Investigation', done: grievance.status === 'In Progress' || grievance.status === 'Resolved' },
        { step: 4, label: 'Resolution & Verification', done: grievance.status === 'Resolved' }
    ];

    const isOverdue = grievance.status !== 'Resolved' && new Date(grievance.deadline) < new Date();

    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <div className="main-content">
                <Topbar title={`Grievance #${id.substring(18)}`} />

                {/* Back button */}
                <button
                    onClick={() => navigate(-1)}
                    className="btn-municipal-glass"
                    style={{ padding: '0.4rem 0.9rem', marginBottom: '1.2rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                    ← Back to List
                </button>

                {/* Main Header Glass Panel */}
                <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.2rem' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
                                <span style={{ fontSize: '1.8rem' }}>{getCategoryIcon(grievance.category)}</span>
                                <h1 style={{ margin: 0, fontSize: '1.6rem', color: 'var(--text-primary)' }}>{grievance.title}</h1>
                            </div>
                            <div className="mono-data" style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                Ticket ID: #{grievance._id} • Category: <span style={{ color: 'var(--text-primary)' }}>{grievance.category}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                            <span className={`status-pill ${grievance.status === 'Resolved' ? 'status-resolved' : grievance.status === 'In Progress' ? 'status-in-progress' : 'status-open'}`}>
                                {grievance.status}
                            </span>
                            <span className={`status-pill ${grievance.priority === 'Critical' ? 'status-critical' : 'status-open'}`}>
                                {grievance.priority} Priority
                            </span>
                        </div>
                    </div>

                    {/* 4-Step Stepper Progress Bar */}
                    <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)' }}>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.5px' }}>
                            Resolution Lifecycle Progress
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', position: 'relative' }}>
                            {steps.map(s => (
                                <div key={s.step} style={{
                                    padding: '0.9rem',
                                    borderRadius: '10px',
                                    background: s.done ? 'var(--accent-amber-dim)' : 'rgba(148, 163, 184, 0.04)',
                                    border: `1px solid ${s.done ? 'var(--accent-amber)' : 'var(--glass-border)'}`,
                                    textAlign: 'center',
                                    transition: 'all 0.3s ease'
                                }}>
                                    <div className="mono-number" style={{ fontSize: '1rem', color: s.done ? 'var(--accent-amber)' : 'var(--text-muted)', fontWeight: 'bold' }}>
                                        {s.done ? '✓ Step ' + s.step : 'Step ' + s.step}
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: s.done ? 'var(--text-primary)' : 'var(--text-muted)', marginTop: '4px', fontWeight: '500' }}>
                                        {s.label}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Grid Content: Left Details / Right Timeline */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
                    {/* Left: Complaint Metadata */}
                    <div className="glass-panel" style={{ padding: '1.8rem', borderRadius: '14px', height: 'fit-content' }}>
                        <h3 style={{ margin: '0 0 1.2rem 0', fontSize: '1.1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.6rem' }}>
                            Complaint Specifications
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', fontSize: '0.88rem' }}>
                            <div>
                                <label style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 'bold' }}>DESCRIPTION</label>
                                <p style={{ margin: '4px 0 0 0', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                                    {grievance.description}
                                </p>
                            </div>

                            <div>
                                <label style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 'bold' }}>LOCATION LANDMARK</label>
                                <div style={{ color: 'var(--text-primary)', marginTop: '4px' }}>
                                    📍 {grievance.location}
                                </div>
                            </div>

                            <div>
                                <label style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 'bold' }}>CITIZEN APPLICANT</label>
                                <div style={{ color: 'var(--text-primary)', marginTop: '4px', fontWeight: '500' }}>
                                    👤 {grievance.citizenName || 'Registered Citizen'}
                                </div>
                                {(grievance.citizenId?.email || grievance.citizenEmail) && (
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '2px', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                                        {grievance.citizenId?.email || grievance.citizenEmail}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 'bold' }}>ASSIGNED FIELD OFFICER</label>
                                <div style={{ color: 'var(--text-primary)', marginTop: '4px', fontWeight: '500' }}>
                                    {grievance.assignedTo ? `👮 ${grievance.assignedTo.name}` : <span style={{ color: 'var(--accent-amber)', fontStyle: 'italic' }}>Unassigned (Pending Dispatch)</span>}
                                </div>
                            </div>

                            <div>
                                <label style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 'bold' }}>SLA RESOLUTION TARGET</label>
                                <div className="mono-data" style={{ color: isOverdue ? 'var(--signal-red)' : 'var(--signal-green)', marginTop: '4px', fontWeight: 'bold' }}>
                                    {new Date(grievance.deadline).toLocaleString()}
                                    {isOverdue && <span style={{ marginLeft: '6px' }}>⚠️ OVERDUE BREACH</span>}
                                </div>
                            </div>

                            {/* Photographic Evidence Attachment Card */}
                            {grievance.attachment && (
                                <div style={{ marginTop: '0.8rem', paddingTop: '1.2rem', borderTop: '1px solid var(--glass-border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                                        <label style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                                            PHOTOGRAPHIC EVIDENCE
                                        </label>
                                        <span className="mono-data" style={{ fontSize: '0.72rem', color: 'var(--accent-amber)' }}>
                                            🔒 Verified Attachment
                                        </span>
                                    </div>

                                    {photoLoading && (
                                        <div style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(11, 18, 32, 0.4)', borderRadius: '10px', border: '1px solid var(--glass-border)', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                                            Retrieving secure evidence photo...
                                        </div>
                                    )}

                                    {photoError && !photoLoading && (
                                        <div style={{ padding: '1rem', background: 'rgba(192, 67, 59, 0.15)', border: '1px solid var(--signal-red)', borderRadius: '10px', color: 'var(--signal-red)', fontSize: '0.82rem' }}>
                                            <div style={{ marginBottom: '0.5rem' }}>⚠️ {photoError}</div>
                                            <button
                                                type="button"
                                                onClick={fetchPhoto}
                                                className="btn-municipal-glass"
                                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                                            >
                                                ↻ Retry Loading Photo
                                            </button>
                                        </div>
                                    )}

                                    {photoUrl && !photoLoading && (
                                        <div style={{ background: 'rgba(11, 18, 32, 0.4)', borderRadius: '10px', padding: '0.8rem', border: '1px solid var(--glass-border)' }}>
                                            <div
                                                style={{ position: 'relative', overflow: 'hidden', borderRadius: '8px', cursor: 'pointer' }}
                                                role="button"
                                                tabIndex={0}
                                                aria-label="Inspect evidence photo in full resolution"
                                                style={{ position: 'relative', overflow: 'hidden', borderRadius: '8px', cursor: 'pointer', outline: 'none' }}
                                                onClick={() => setLightboxOpen(true)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        setLightboxOpen(true);
                                                    }
                                                }}
                                                title="Click to inspect full resolution"
                                            >
                                                <img
                                                    src={photoUrl}
                                                    alt={`On-site photographic evidence for ${grievance.title}`}
                                                    onError={() => {
                                                        setPhotoError('Evidence photo currently unavailable or expired');
                                                        setPhotoUrl(null);
                                                    }}
                                                    style={{
                                                        width: '100%',
                                                        maxHeight: '260px',
                                                        objectFit: 'cover',
                                                        display: 'block',
                                                        borderRadius: '8px',
                                                        transition: 'transform 0.2s ease'
                                                    }}
                                                />
                                                <div style={{
                                                    position: 'absolute',
                                                    bottom: '8px',
                                                    right: '8px',
                                                    background: 'rgba(15, 23, 42, 0.85)',
                                                    backdropFilter: 'blur(4px)',
                                                    padding: '4px 8px',
                                                    borderRadius: '6px',
                                                    fontSize: '0.75rem',
                                                    color: 'var(--text-primary)',
                                                    border: '1px solid var(--glass-border)'
                                                }}>
                                                    🔍 Click to enlarge
                                                </div>
                                            </div>

                                            {photoMetadata && (
                                                <div style={{ marginTop: '0.6rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                                                        {photoMetadata.originalName || 'evidence.jpg'}
                                                    </span>
                                                    {photoMetadata.size && (
                                                        <span className="mono-data">
                                                            {(photoMetadata.size / (1024 * 1024)).toFixed(2)} MB
                                                            {photoMetadata.dimensions?.width && ` • ${photoMetadata.dimensions.width}×${photoMetadata.dimensions.height}`}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Chronological Timeline Logs */}
                    <div className="glass-panel" style={{ padding: '1.8rem', borderRadius: '14px' }}>
                        <h3 style={{ margin: '0 0 1.2rem 0', fontSize: '1.1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.6rem' }}>
                            Chronological Field Timeline Logs
                        </h3>

                        {/* Add Timeline Entry Form */}
                        <form onSubmit={handleAddUpdate} style={{ marginBottom: '1.5rem', background: 'rgba(11, 18, 32, 0.4)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
                            <div className="form-group" style={{ marginBottom: '0.8rem' }}>
                                <label>Post Update / Response</label>
                                <textarea
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    placeholder="Add inspection notes, citizen updates, or resolution responses..."
                                    rows="2"
                                    required
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <select
                                    value={noteType}
                                    onChange={(e) => setNoteType(e.target.value)}
                                    style={{ width: '180px', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                                >
                                    <option value="Citizen Response">Citizen Response</option>
                                    <option value="Officer Field Note">Officer Field Note</option>
                                    <option value="Status Update">Status Update</option>
                                    <option value="Escalation">Escalation</option>
                                </select>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="btn-municipal"
                                    style={{ padding: '0.5rem 1.2rem', fontSize: '0.82rem' }}
                                >
                                    {submitting ? 'Posting...' : 'Post Timeline Note'}
                                </button>
                            </div>
                        </form>

                        {/* Timeline List */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {updates.length === 0 ? (
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', textAlign: 'center', padding: '1rem' }}>
                                    No timeline logs posted yet.
                                </div>
                            ) : (
                                updates.map(u => (
                                    <div key={u._id} style={{
                                        padding: '1rem',
                                        borderRadius: '10px',
                                        background: 'rgba(16, 24, 38, 0.6)',
                                        border: '1px solid var(--glass-border)',
                                        borderLeft: u.type === 'Officer Field Note' ? '3px solid var(--signal-blue)' : u.type === 'Escalation' ? '3px solid var(--signal-red)' : '3px solid var(--accent-amber)'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                                            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                                                {u.userId?.name || 'User'} <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>({u.type})</span>
                                            </span>
                                            <span className="mono-data" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                                {new Date(u.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p style={{ margin: '0', color: 'var(--text-primary)', fontSize: '0.85rem', lineHeight: '1.4' }}>
                                            {u.notes}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Evidence Photo Full Resolution Lightbox Modal */}
            {lightboxOpen && photoUrl && (
                <div
                    onClick={() => setLightboxOpen(false)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.88)',
                        backdropFilter: 'blur(6px)',
                        zIndex: 9999,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: '2rem'
                    }}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Enlarged evidence photo"
                >
                    <div style={{ position: 'relative', maxWidth: '92vw', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
                        <img
                            src={photoUrl}
                            alt="Full resolution evidence"
                            onError={() => {
                                setPhotoError('Evidence photo currently unavailable or expired');
                                setPhotoUrl(null);
                                setLightboxOpen(false);
                            }}
                            style={{
                                maxWidth: '100%',
                                maxHeight: '85vh',
                                objectFit: 'contain',
                                borderRadius: '12px',
                                border: '1px solid var(--accent-amber)',
                                display: 'block'
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => setLightboxOpen(false)}
                            aria-label="Close photo preview"
                            style={{
                                position: 'absolute',
                                top: '-14px',
                                right: '-14px',
                                background: 'var(--accent-amber)',
                                color: '#0F172A',
                                border: 'none',
                                borderRadius: '50%',
                                width: '30px',
                                height: '30px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
                            }}
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GrievanceDetail;
