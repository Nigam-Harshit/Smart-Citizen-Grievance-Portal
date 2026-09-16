import React, { useState, useContext, useRef, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import API from '../../utils/api';
import AuthContext from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { optimizeImageFile } from '../../utils/imageOptimizer';

const generateIdempotencyKey = () => {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
        return window.crypto.randomUUID();
    }
    return 'idem-' + Date.now() + '-' + Math.random().toString(36).substring(2, 15);
};

const SubmitGrievance = () => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('Sanitation');
    const [location, setLocation] = useState('');
    const [priority, setPriority] = useState('Medium');
    const [phone, setPhone] = useState(user?.phone || '');
    const [photo, setPhoto] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [fileError, setFileError] = useState('');
    const [submitError, setSubmitError] = useState('');
    const [optimizing, setOptimizing] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(null);
    const [loading, setLoading] = useState(false);
    const [idempotencyKey, setIdempotencyKey] = useState(() => generateIdempotencyKey());
    const fileInputRef = useRef(null);

    // Clean up temporary object URL on unmount or replacement
    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate format
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type.toLowerCase())) {
            setFileError('Invalid format. Only JPEG, PNG, and WebP images are allowed.');
            return;
        }

        // Validate size: 8 MB ceiling
        if (file.size > 8 * 1024 * 1024) {
            setFileError(`File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the 8 MB maximum limit.`);
            return;
        }

        setFileError('');
        setPhoto(file);
        setOptimizing(true);

        try {
            // Apply client-side optimization if useful (downscales large images)
            const processedFile = await optimizeImageFile(file);
            setPhoto(processedFile);

            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
            setPreviewUrl(URL.createObjectURL(processedFile));
        } catch (err) {
            console.warn('Image optimization fallback:', err);
            setPhoto(file);
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
            setPreviewUrl(URL.createObjectURL(file));
        } finally {
            setOptimizing(false);
        }
    };

    const handleRemovePhoto = () => {
        setPhoto(null);
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }
        setFileError('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Double-submit protection
        if (loading || optimizing) return;

        setSubmitError('');

        if (!title.trim() || !description.trim() || !category || !location.trim()) {
            setSubmitError('Please fill out all required fields.');
            alert('Please fill out all required fields.');
            return;
        }

        if (!user?.phone && !phone.trim()) {
            alert('Please enter your contact phone number for field officer dispatch.');
            setSubmitError('Please enter your contact phone number for field officer dispatch.');
            return;
        }

        setLoading(true);
        setUploadProgress(photo ? 0 : null);

        try {
            // Save phone to profile if user phone was empty
            if (!user?.phone && phone.trim()) {
                await API.put('/api/auth/profile', { phone });
            }

            let responseData;
            if (photo) {
                const formData = new FormData();
                formData.append('title', title.trim());
                formData.append('description', description.trim());
                formData.append('category', category);
                formData.append('location', location.trim());
                formData.append('priority', priority);
                formData.append('idempotencyKey', idempotencyKey);
                formData.append('photo', photo);

                const res = await API.post('/api/grievances', formData, {
                    onUploadProgress: (progressEvent) => {
                        if (progressEvent.total) {
                            const percent = Math.min(100, Math.round((progressEvent.loaded * 100) / progressEvent.total));
                            setUploadProgress(percent);
                        }
                    }
                });
                responseData = res.data;
            } else {
                const res = await API.post('/api/grievances', {
                    title: title.trim(),
                    description: description.trim(),
                    category,
                    location: location.trim(),
                    priority,
                    idempotencyKey
                });
                responseData = res.data;
            }

            alert('Grievance lodged successfully!');
            setIdempotencyKey(generateIdempotencyKey());
            navigate(`/citizen/grievance/${responseData._id}`);
        } catch (err) {
            console.error('Error submitting grievance:', err);
            alert(err.response?.data?.message || 'Error submitting grievance');
            setSubmitError(err.response?.data?.message || 'Error submitting grievance. Please try again.');
        } finally {
            setLoading(false);
            setUploadProgress(null);
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

                            {/* Photographic Evidence Attachment (Optional) */}
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>Photographic Evidence <span style={{ color: 'var(--text-muted)', fontWeight: 'normal', fontSize: '0.82rem' }}>(Optional)</span></span>
                                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>JPEG, PNG, WebP • Max 8 MB</span>
                                </label>

                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={handleFileChange}
                                    style={{ display: 'none' }}
                                    aria-label="Upload photographic evidence"
                                />

                                {fileError && (
                                    <div role="alert" aria-live="polite" style={{ padding: '0.8rem 1rem', background: 'rgba(192, 67, 59, 0.15)', border: '1px solid var(--signal-red)', borderRadius: '8px', marginBottom: '1rem', color: 'var(--signal-red)', fontSize: '0.85rem' }}>
                                        ⚠️ {fileError}
                                    </div>
                                )}

                                {optimizing && (
                                    <div style={{ padding: '0.8rem 1rem', background: 'var(--accent-amber-dim)', border: '1px solid var(--accent-amber)', borderRadius: '8px', marginBottom: '1rem', color: 'var(--accent-amber)', fontSize: '0.85rem' }}>
                                        🔄 Optimizing photo dimensions for swift upload...
                                    </div>
                                )}

                                {!photo ? (
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        aria-label="Click or press Enter to attach on-site photographic evidence"
                                        onClick={() => fileInputRef.current?.click()}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                fileInputRef.current?.click();
                                            }
                                        }}
                                        style={{
                                            border: '2px dashed var(--glass-border)',
                                            borderRadius: '12px',
                                            padding: '1.8rem',
                                            textAlign: 'center',
                                            cursor: 'pointer',
                                            background: 'rgba(16, 24, 38, 0.4)',
                                            transition: 'all 0.2s ease',
                                            outline: 'none'
                                        }}
                                        onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent-amber)'}
                                        onBlur={(e) => e.currentTarget.style.borderColor = 'var(--glass-border)'}
                                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-amber)'}
                                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--glass-border)'}
                                    >
                                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📸</div>
                                        <div style={{ fontWeight: '500', color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
                                            Click or press Enter to attach on-site photo evidence
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            Provides clear visual proof for zonal field inspection teams
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{
                                        border: '1px solid var(--accent-amber)',
                                        borderRadius: '12px',
                                        padding: '1rem',
                                        background: 'rgba(201, 150, 44, 0.08)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1.2rem'
                                    }}>
                                        <img
                                            src={previewUrl}
                                            alt="Evidence Preview"
                                            style={{
                                                width: '90px',
                                                height: '90px',
                                                objectFit: 'cover',
                                                borderRadius: '8px',
                                                border: '1px solid var(--glass-border)'
                                            }}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.9rem', marginBottom: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '320px' }}>
                                                {photo.name}
                                            </div>
                                            <div className="mono-data" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
                                                {(photo.size / (1024 * 1024)).toFixed(2)} MB • {photo.type}
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.8rem' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="btn-municipal-glass"
                                                    aria-label="Change attached photo"
                                                    style={{ padding: '0.3rem 0.8rem', fontSize: '0.78rem' }}
                                                >
                                                    Change Photo
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleRemovePhoto}
                                                    aria-label="Remove attached photo"
                                                    style={{
                                                        padding: '0.3rem 0.8rem',
                                                        fontSize: '0.78rem',
                                                        background: 'rgba(192, 67, 59, 0.15)',
                                                        border: '1px solid var(--signal-red)',
                                                        color: 'var(--signal-red)',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Real-time Upload Progress Feedback */}
                                {loading && uploadProgress !== null && (
                                    <div
                                        role="progressbar"
                                        aria-valuenow={uploadProgress}
                                        aria-valuemin="0"
                                        aria-valuemax="100"
                                        aria-label="Upload progress"
                                        style={{ marginTop: '1.2rem' }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                                            <span>{uploadProgress < 100 ? 'Uploading photographic evidence...' : 'Verifying and saving on municipal portal...'}</span>
                                            <span className="mono-data" style={{ color: 'var(--accent-amber)', fontWeight: 'bold' }}>{uploadProgress}%</span>
                                        </div>
                                        <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'var(--accent-amber)', transition: 'width 0.2s ease' }} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {submitError && (
                                <div role="alert" aria-live="polite" style={{ padding: '0.9rem 1.2rem', background: 'rgba(192, 67, 59, 0.15)', border: '1px solid var(--signal-red)', borderRadius: '10px', marginBottom: '1.2rem', color: 'var(--signal-red)', fontSize: '0.88rem' }}>
                                    ⚠️ <strong>Submission Failed:</strong> {submitError}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={() => navigate('/citizen')}
                                    className="btn-municipal-glass"
                                    disabled={loading}
                                    style={{ padding: '0.75rem 1.6rem', borderRadius: '8px' }}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={loading || optimizing}
                                    className="btn-municipal"
                                    style={{ padding: '0.75rem 2rem', borderRadius: '8px' }}
                                >
                                    {loading
                                        ? (photo ? `Uploading... ${uploadProgress !== null ? uploadProgress + '%' : ''}` : 'Submitting Request...')
                                        : '📝 Lodge Official Grievance'}
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
