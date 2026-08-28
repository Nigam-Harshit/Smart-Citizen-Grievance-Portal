import React, { useState, useContext } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import API from '../../utils/api';
import AuthContext from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const SubmitGrievance = () => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('Sanitation');
    const [location, setLocation] = useState('');
    const [priority, setPriority] = useState('Medium');
    const [phone, setPhone] = useState(user?.phone || '');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title || !description || !category || !location) {
            alert('Please fill out all required fields.');
            return;
        }

        if (!user?.phone && !phone.trim()) {
            alert('Please enter your contact phone number for field officer dispatch.');
            return;
        }

        setLoading(true);
        try {
            // Save phone to profile if user phone was empty
            if (!user?.phone && phone.trim()) {
                await API.put('/api/auth/profile', { phone });
            }

            const { data } = await API.post('/api/grievances', {
                title,
                description,
                category,
                location,
                priority
            });
            alert('Grievance lodged successfully!');
            navigate(`/citizen/grievance/${data._id}`);
        } catch (err) {
            console.error('Error submitting grievance:', err);
            alert(err.response?.data?.message || 'Error submitting grievance');
        } finally {
            setLoading(false);
        }
    };

    const isPhoneMissing = !user?.phone && !phone;

    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <div className="main-content">
                <Topbar title="Lodge Public Grievance" />

                <div style={{ maxWidth: '750px', margin: '0 auto' }}>
                    <div className="glass-panel" style={{ padding: '2.2rem', borderRadius: '16px' }}>
                        <div style={{ marginBottom: '1.8rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
                            <h2 style={{ margin: '0 0 0.4rem 0', fontFamily: 'Fraunces, serif' }}>
                                Submit Municipal Complaint Ticket
                            </h2>
                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                                Provide accurate complaint details and landmark location to ensure priority SLA dispatch to Zonal field officers.
                            </p>
                        </div>

                        {isPhoneMissing && (
                            <div style={{ padding: '1rem', background: 'var(--accent-amber-dim)', border: '1px solid var(--accent-amber)', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                                📌 <strong>Contact Phone Required:</strong> Please provide your phone number below so field officers can contact you during site inspection.
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            {(!user?.phone || isPhoneMissing) && (
                                <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                                    <label>Contact Phone Number *</label>
                                    <input
                                        type="text"
                                        placeholder="+91 98100 12345"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        required
                                    />
                                </div>
                            )}

                            <div className="form-group">
                                <label>Grievance Title *</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Burst water pipeline flooding Sector 15 main road"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group">
                                    <label>Municipal Category *</label>
                                    <select value={category} onChange={(e) => setCategory(e.target.value)} required>
                                        <option value="Sanitation">🧹 Sanitation & Garbage</option>
                                        <option value="Water Supply">💧 Water Supply & Drainage</option>
                                        <option value="Roads & Traffic">🚦 Roads & Potholes</option>
                                        <option value="Electricity">⚡ Street Lighting & Power</option>
                                        <option value="Public Safety">🛡️ Public Safety & Nuisance</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Priority Level *</label>
                                    <select value={priority} onChange={(e) => setPriority(e.target.value)} required>
                                        <option value="Low">Low (14 Days Target SLA)</option>
                                        <option value="Medium">Medium (7 Days Target SLA)</option>
                                        <option value="High">High (3 Days Target SLA)</option>
                                        <option value="Critical">Critical (24 Hours Emergency SLA)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Specific Location Landmark *</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Opposite Sector 15 Market Gate 2, Main Avenue"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Full Problem Description *</label>
                                <textarea
                                    placeholder="Describe the grievance in detail, including time observed, severity, and any immediate hazards..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows="5"
                                    required
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={() => navigate('/citizen')}
                                    className="btn-municipal-glass"
                                    style={{ padding: '0.75rem 1.6rem', borderRadius: '8px' }}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn-municipal"
                                    style={{ padding: '0.75rem 2rem', borderRadius: '8px' }}
                                >
                                    {loading ? 'Submitting Request...' : '📝 Lodge Official Grievance'}
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
