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

    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <div className="main-content">
                <Topbar title="Master Citizen Directory" />

                <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                        <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span>👥</span> Registered Citizens ({filteredCitizens.length})
                        </h2>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <ExportButtons data={filteredCitizens} filename="Master_Citizens_Directory" />
                            <button
                                onClick={handleOpenCreateModal}
                                className="btn-municipal"
                                style={{ padding: '0.6rem 1.2rem' }}
                            >
                                + Add Citizen Profile
                            </button>
                        </div>
                    </div>

                    <input
                        type="text"
                        placeholder="Search citizens by name, email, phone, or address..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ marginBottom: '1.5rem' }}
                    />

                    {loading ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading directory...</div>
                    ) : filteredCitizens.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No matching citizen records found.</div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="table-glass">
                                <thead>
                                    <tr>
                                        <th>Citizen Name & Email</th>
                                        <th>Contact Phone</th>
                                        <th>Residential Address</th>
                                        <th>Assigned Field Officer</th>
                                        <th>Escalation Risk</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCitizens.map(c => (
                                        <tr key={c._id} className="table-row-hover">
                                            <td>
                                                <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{c.name}</div>
                                                <div className="mono-data" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.email}</div>
                                            </td>
                                            <td className="mono-data" style={{ fontSize: '0.85rem' }}>📞 {c.contact}</td>
                                            <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '220px' }}>🏠 {c.address || 'N/A'}</td>
                                            <td style={{ fontSize: '0.85rem' }}>
                                                {c.assignedTo?.name ? (
                                                    <span style={{ color: 'var(--accent-amber)', fontWeight: 'bold' }}>👮 {c.assignedTo.name}</span>
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>
                                                )}
                                            </td>
                                            <td>
                                                <span className={`status-pill ${c.escalationRisk === 'High' ? 'status-critical' : 'status-resolved'}`}>
                                                    {c.escalationRisk || 'Low'}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                                                    <Link to={`/citizen-profile/${c._id}`} style={{ color: 'var(--accent-amber)', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.82rem' }}>
                                                        360 Profile
                                                    </Link>
                                                    <button onClick={() => handleOpenEditModal(c)} style={{ background: 'transparent', border: 'none', color: 'var(--signal-blue)', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.82rem' }}>
                                                        Edit
                                                    </button>
                                                    <button onClick={() => handleDeleteCitizen(c._id, c.name)} style={{ background: 'transparent', border: 'none', color: 'var(--signal-red)', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.82rem' }}>
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Modal Form for Create / Edit */}
                {showModal && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h3 style={{ margin: '0 0 1.2rem 0', fontFamily: 'Fraunces, serif' }}>
                                {editingCitizen ? 'Edit Citizen Record' : 'Register New Citizen'}
                            </h3>
                            <form onSubmit={handleSubmitForm}>
                                <div className="form-group">
                                    <label>Full Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Email Address *</label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Contact Phone *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.contact}
                                        onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Residential Address</label>
                                    <input
                                        type="text"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Assign Officer</label>
                                    <select
                                        value={formData.assignedTo}
                                        onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                                    >
                                        <option value="">Unassigned</option>
                                        {officers.map(o => (
                                            <option key={o._id} value={o._id}>{o.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                                    <button type="button" onClick={() => setShowModal(false)} className="btn-municipal-glass" style={{ padding: '0.6rem 1.2rem' }}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn-municipal" style={{ padding: '0.6rem 1.5rem' }}>
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
