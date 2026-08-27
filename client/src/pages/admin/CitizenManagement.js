import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Topbar from '../../components/Topbar';
import Sidebar from '../../components/Sidebar';
import ExportButtons from '../../components/ExportButtons';
import API from '../../utils/api';

const CitizenManagement = () => {
    const [searchParams] = useSearchParams();
    const [citizens, setCitizens] = useState([]);
    const [officers, setOfficers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
    const [showModal, setShowModal] = useState(false);
    const [editingCitizen, setEditingCitizen] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        contact: '',
        address: '',
        assignedTo: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [cRes, oRes] = await Promise.all([
                API.get('/api/citizens'),
                API.get('/api/auth/staff')
            ]);
            setCitizens(cRes.data);
            setOfficers(oRes.data);
        } catch (err) {
            console.error('Error fetching citizens data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreateModal = () => {
        setEditingCitizen(null);
        setFormData({ name: '', email: '', contact: '', address: '', assignedTo: '' });
        setShowModal(true);
    };

    const handleOpenEditModal = (citizen) => {
        setEditingCitizen(citizen);
        setFormData({
            name: citizen.name || '',
            email: citizen.email || '',
            contact: citizen.contact || '',
            address: citizen.address || '',
            assignedTo: citizen.assignedTo?._id || citizen.assignedTo || ''
        });
        setShowModal(true);
    };

    const handleSubmitForm = async (e) => {
        e.preventDefault();
        try {
            if (editingCitizen) {
                await API.put(`/api/citizens/${editingCitizen._id}`, formData);
            } else {
                await API.post('/api/citizens', formData);
            }
            setShowModal(false);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.message || 'Error saving citizen profile');
        }
    };

    const handleDeleteCitizen = async (id, name) => {
        if (window.confirm(`Are you sure you want to delete citizen profile for "${name}"? All associated grievances will be cascade deleted.`)) {
            try {
                await API.delete(`/api/citizens/${id}`);
                fetchData();
            } catch (err) {
                alert(err.response?.data?.message || 'Failed to delete citizen');
            }
        }
    };

    const filteredCitizens = citizens.filter(c =>
        !searchTerm ||
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.contact?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.address?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getRiskStyle = (risk) => {
        if (risk === 'High') return { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' };
        if (risk === 'Medium') return { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' };
        return { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' };
    };

    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <div className="main-content" style={{ flex: 1, padding: '2rem', minHeight: '100vh', background: 'var(--bg-primary)' }}>
                <Topbar title="Master Citizen Directory" />

                <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                        <h2 style={{ margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span>👥</span> Registered Citizens ({filteredCitizens.length})
                        </h2>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <ExportButtons data={filteredCitizens} filename="Master_Citizens_Directory" />
                            <button
                                onClick={handleOpenCreateModal}
                                style={{
                                    padding: '0.6rem 1.2rem',
                                    background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                + Add Citizen
                            </button>
                        </div>
                    </div>

                    <input
                        type="text"
                        placeholder="Search citizens by name, email, phone, or address..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.7rem 1rem',
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            color: 'white',
                            outline: 'none',
                            marginBottom: '1.5rem'
                        }}
                    />

                    {loading ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading directory...</div>
                    ) : filteredCitizens.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No matching citizen records found.</div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                        <th style={{ padding: '1rem' }}>Citizen Name</th>
                                        <th style={{ padding: '1rem' }}>Contact Info</th>
                                        <th style={{ padding: '1rem' }}>Address</th>
                                        <th style={{ padding: '1rem' }}>Assigned Officer</th>
                                        <th style={{ padding: '1rem' }}>Escalation Risk</th>
                                        <th style={{ padding: '1rem' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCitizens.map(c => {
                                        const riskStyle = getRiskStyle(c.escalationRisk);
                                        return (
                                            <tr key={c._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                <td style={{ padding: '1rem' }}>
                                                    <div style={{ fontWeight: 'bold' }}>{c.name}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{c.email}</div>
                                                </td>
                                                <td style={{ padding: '1rem', fontSize: '0.9rem' }}>📞 {c.contact}</td>
                                                <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '220px' }}>🏠 {c.address || 'N/A'}</td>
                                                <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                                                    {c.assignedTo?.name ? (
                                                        <span style={{ color: '#818cf8', fontWeight: 'bold' }}>👮 {c.assignedTo.name}</span>
                                                    ) : (
                                                        <span style={{ color: 'var(--text-secondary)' }}>Unassigned</span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', background: riskStyle.bg, color: riskStyle.color }}>
                                                        {c.escalationRisk || 'Low'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                                                        <Link to={`/citizen-profile/${c._id}`} style={{ color: '#818cf8', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.85rem' }}>
                                                            360 Profile
                                                        </Link>
                                                        <button onClick={() => handleOpenEditModal(c)} style={{ background: 'transparent', border: 'none', color: '#f59e0b', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>
                                                            Edit
                                                        </button>
                                                        <button onClick={() => handleDeleteCitizen(c._id, c.name)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Modal Form for Create / Edit */}
                {showModal && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.7)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 1000
                    }}>
                        <div className="glass-card" style={{ width: '500px', padding: '2rem', borderRadius: '16px', background: '#1e293b' }}>
                            <h3 style={{ margin: '0 0 1.5rem 0', color: 'white' }}>
                                {editingCitizen ? 'Edit Citizen Record' : 'Register New Citizen'}
                            </h3>
                            <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '0.3rem', fontSize: '0.85rem' }}>Full Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        style={{ width: '100%', padding: '0.6rem 0.8rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '0.3rem', fontSize: '0.85rem' }}>Email Address *</label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        style={{ width: '100%', padding: '0.6rem 0.8rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '0.3rem', fontSize: '0.85rem' }}>Contact Phone *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.contact}
                                        onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                                        style={{ width: '100%', padding: '0.6rem 0.8rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '0.3rem', fontSize: '0.85rem' }}>Residential Address</label>
                                    <input
                                        type="text"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        style={{ width: '100%', padding: '0.6rem 0.8rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '0.3rem', fontSize: '0.85rem' }}>Assign Officer</label>
                                    <select
                                        value={formData.assignedTo}
                                        onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                                        style={{ width: '100%', padding: '0.6rem 0.8rem', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white' }}
                                    >
                                        <option value="">Unassigned</option>
                                        {officers.map(o => (
                                            <option key={o._id} value={o._id}>{o.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                                    <button type="button" onClick={() => setShowModal(false)} style={{ padding: '0.6rem 1.2rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '6px', cursor: 'pointer' }}>
                                        Cancel
                                    </button>
                                    <button type="submit" style={{ padding: '0.6rem 1.5rem', background: '#6366f1', border: 'none', color: 'white', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer' }}>
                                        Save Record
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

export default CitizenManagement;
