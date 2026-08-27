import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../../components/Topbar';
import Sidebar from '../../components/Sidebar';
import API from '../../utils/api';

const SubmitGrievance = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        title: '',
        category: 'Sanitation',
        priority: 'Medium',
        location: '',
        description: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const getEstimatedSLA = (priority) => {
        if (priority === 'Critical') return '24 Hours (Urgent Officer Dispatch)';
        if (priority === 'High') return '3 Days (72 Hours)';
        if (priority === 'Medium') return '7 Days';
        return '14 Days';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            await API.post('/api/grievances', formData);
            navigate('/citizen/grievances');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to submit grievance');
            setSubmitting(false);
        }
    };

    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <div className="main-content" style={{ flex: 1, padding: '2rem', minHeight: '100vh', background: 'var(--bg-primary)' }}>
                <Topbar title="Lodge Public Grievance" />

                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <div className="glass-card" style={{ padding: '2.5rem', borderRadius: '16px' }}>
                        <h2 style={{ margin: '0 0 0.5rem 0', color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span>📝</span> Submit a Civic Complaint
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.95rem' }}>
                            Please provide detailed information about the issue to ensure rapid officer dispatch and SLA enforcement.
                        </p>

                        {error && (
                            <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', marginBottom: '1.5rem' }}>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 'bold' }}>Grievance Title *</label>
                                <input
                                    type="text"
                                    name="title"
                                    required
                                    placeholder="e.g. Broken Water Pipeline leaking into street"
                                    value={formData.title}
                                    onChange={handleChange}
                                    style={{
                                        width: '100%',
                                        padding: '0.8rem 1rem',
                                        background: 'rgba(0,0,0,0.3)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        color: 'white',
                                        fontSize: '0.95rem',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 'bold' }}>Category *</label>
                                    <select
                                        name="category"
                                        value={formData.category}
                                        onChange={handleChange}
                                        style={{
                                            width: '100%',
                                            padding: '0.8rem 1rem',
                                            background: 'rgba(30, 41, 59, 0.95)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '8px',
                                            color: 'white',
                                            fontSize: '0.95rem',
                                            outline: 'none'
                                        }}
                                    >
                                        <option value="Sanitation">Sanitation & Garbage</option>
                                        <option value="Roads & Traffic">Roads, Potholes & Traffic</option>
                                        <option value="Water Supply">Water Supply & Leakage</option>
                                        <option value="Electricity">Electricity & Street Lights</option>
                                        <option value="Public Safety">Public Safety & Noise</option>
                                        <option value="Other">Other Civic Issues</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 'bold' }}>Priority Level *</label>
                                    <select
                                        name="priority"
                                        value={formData.priority}
                                        onChange={handleChange}
                                        style={{
                                            width: '100%',
                                            padding: '0.8rem 1rem',
                                            background: 'rgba(30, 41, 59, 0.95)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '8px',
                                            color: 'white',
                                            fontSize: '0.95rem',
                                            outline: 'none'
                                        }}
                                    >
                                        <option value="Low">Low (General Inquiry / Minor issue)</option>
                                        <option value="Medium">Medium (Standard resolution needed)</option>
                                        <option value="High">High (Significant public inconvenience)</option>
                                        <option value="Critical">Critical (Hazardous / Emergency)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Estimated SLA Window Info Banner */}
                            <div style={{
                                padding: '0.8rem 1rem',
                                background: 'rgba(99, 102, 241, 0.1)',
                                border: '1px solid rgba(99, 102, 241, 0.25)',
                                borderRadius: '8px',
                                fontSize: '0.88rem',
                                color: '#818cf8',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <span>⏱️</span>
                                <span><strong>Estimated Resolution Target (SLA):</strong> {getEstimatedSLA(formData.priority)}</span>
                            </div>

                            <div>
                                <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 'bold' }}>Location / Landmark Address *</label>
                                <input
                                    type="text"
                                    name="location"
                                    required
                                    placeholder="e.g. Near Community Center Gate 2, Sector 62, Noida"
                                    value={formData.location}
                                    onChange={handleChange}
                                    style={{
                                        width: '100%',
                                        padding: '0.8rem 1rem',
                                        background: 'rgba(0,0,0,0.3)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        color: 'white',
                                        fontSize: '0.95rem',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 'bold' }}>Detailed Description *</label>
                                <textarea
                                    name="description"
                                    rows="5"
                                    required
                                    placeholder="Describe the problem, duration, severity, and any hazards involved..."
                                    value={formData.description}
                                    onChange={handleChange}
                                    style={{
                                        width: '100%',
                                        padding: '0.8rem 1rem',
                                        background: 'rgba(0,0,0,0.3)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        color: 'white',
                                        fontSize: '0.95rem',
                                        outline: 'none',
                                        resize: 'vertical'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                                <button
                                    type="button"
                                    onClick={() => navigate('/citizen')}
                                    style={{
                                        padding: '0.8rem 1.5rem',
                                        background: 'transparent',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        borderRadius: '8px',
                                        color: 'white',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    style={{
                                        padding: '0.8rem 2rem',
                                        background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
                                        border: 'none',
                                        borderRadius: '8px',
                                        color: 'white',
                                        fontWeight: 'bold',
                                        cursor: submitting ? 'not-allowed' : 'pointer',
                                        boxShadow: '0 8px 20px rgba(99, 102, 241, 0.3)'
                                    }}
                                >
                                    {submitting ? 'Submitting...' : 'Submit Grievance Ticket'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubmitGrievance;
