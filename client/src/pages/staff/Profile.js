import { useContext, useState } from 'react';
import API from '../../utils/api';
import AuthContext from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';

const Profile = () => {
    const { user } = useContext(AuthContext);
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        address: user?.address || '',
        notifications: true
    });
    
    // Calculate simple completion %
    const calculateCompletion = () => {
        let score = 50; 
        if (formData.name) score += 15;
        if (formData.email) score += 15;
        if (formData.phone) score += 10;
        if (formData.address) score += 10;
        return score;
    };

    const handleSave = async () => {
        try {
            await API.put('/api/auth/profile', formData);
            alert('Profile details saved successfully!');
            setEditMode(false);
        } catch (error) {
            console.error('Failed to update profile', error);
            alert('Failed to update profile.');
        }
    };

    return (
        <div className="dashboard-container">
            <Sidebar />
            <div className="main-content">
                <Topbar title="My Profile" />

                <div className="glass-card" style={{ maxWidth: '900px', display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden', margin: '0 auto' }}>
                    {/* Header Banner */}
                    <div style={{ 
                        height: '150px', 
                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.4), rgba(59, 130, 246, 0.2))',
                        position: 'relative'
                    }}>
                        <div style={{
                            width: '100px',
                            height: '100px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
                            position: 'absolute',
                            bottom: '-50px',
                            left: '30px',
                            border: '4px solid #0f172a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '2.5rem',
                            fontWeight: 'bold',
                            color: 'white',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                        }}>
                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                    </div>

                    {/* Profile Body */}
                    <div style={{ padding: '60px 30px 30px 30px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                {editMode ? (
                                    <input 
                                        type="text" 
                                        value={formData.name} 
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                        style={{ fontSize: '2rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '4px', marginBottom: '10px' }} 
                                    />
                                ) : (
                                    <h2 style={{ margin: '0 0 10px 0', fontSize: '2rem', color: 'var(--text-primary)' }}>{formData.name}</h2>
                                )}
                                
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <span className="badge" style={{ 
                                        background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', padding: '0.4rem 0.8rem', 
                                        borderRadius: '12px', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 'bold'
                                    }}>
                                        {user?.role} Access {user?.scope && user.scope !== 'All' ? `(${user.scope})` : ''}
                                    </span>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        Profile {calculateCompletion()}% Complete
                                    </span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {editMode ? (
                                    <button className="btn" style={{ padding: '0.6rem 1.5rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }} onClick={handleSave}>Save Changes</button>
                                ) : (
                                    <button className="btn btn-primary" style={{ padding: '0.6rem 1.5rem', width: 'auto', borderRadius: '8px', fontWeight: 'bold' }} onClick={() => setEditMode(true)}>✎ Edit Profile</button>
                                )}
                            </div>
                        </div>

                        {/* Content Split: Details & Settings */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '2rem' }}>
                            {/* Left Column: Personal Info */}
                            <div>
                                <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}><span>📝</span> Personal Information</h3>
                                
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px', textTransform: 'uppercase' }}>Email Address</h4>
                                    {editMode ? (
                                        <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={{ width: '100%', padding: '0.6rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px' }} />
                                    ) : (
                                        <p style={{ color: 'var(--text-primary)', fontSize: '1rem', margin: 0 }}>{formData.email}</p>
                                    )}
                                </div>

                                <div style={{ marginBottom: '1.5rem' }}>
                                    <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px', textTransform: 'uppercase' }}>Contact Phone</h4>
                                    {editMode ? (
                                        <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="Add phone number" style={{ width: '100%', padding: '0.6rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px' }} />
                                    ) : (
                                        <p style={{ color: formData.phone ? 'var(--text-primary)' : 'var(--text-secondary)', fontSize: '1rem', margin: 0 }}>{formData.phone || 'Not provided'}</p>
                                    )}
                                </div>

                                <div style={{ marginBottom: '1.5rem' }}>
                                    <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px', textTransform: 'uppercase' }}>Residential Address</h4>
                                    {editMode ? (
                                        <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Add residential address" style={{ width: '100%', padding: '0.6rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px' }} />
                                    ) : (
                                        <p style={{ color: formData.address ? 'var(--text-primary)' : 'var(--text-secondary)', fontSize: '1rem', margin: 0 }}>{formData.address || 'Not provided'}</p>
                                    )}
                                </div>
                            </div>

                            {/* Right Column: Settings & Security */}
                            <div>
                                <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}><span>🔒</span> Security & Preferences</h3>

                                <div style={{ marginBottom: '1.5rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <h4 style={{ color: 'var(--text-primary)', margin: 0 }}>Change Password</h4>
                                        <button className="btn btn-sm" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '0.3rem 0.8rem', borderRadius: '4px', cursor: 'pointer' }} onClick={() => alert("Password reset link sent to email.")}>Request Reset</button>
                                    </div>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>Last changed 3 months ago</p>
                                </div>

                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
                                    <h4 style={{ color: 'var(--text-primary)', margin: '0 0 1rem 0' }}>Notification Preferences</h4>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={formData.notifications} onChange={e => setFormData({...formData, notifications: e.target.checked})} disabled={!editMode} />
                                        Receive email alerts for overdue reports
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
