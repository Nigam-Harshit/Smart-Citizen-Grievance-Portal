import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Topbar from '../../components/Topbar';
import Sidebar from '../../components/Sidebar';
import ExportButtons from '../../components/ExportButtons';
import API from '../../utils/api';

const AssignedCitizens = () => {
    const [searchParams] = useSearchParams();
    const [citizens, setCitizens] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
    const [viewMode, setViewMode] = useState('grid');

    useEffect(() => {
        fetchCitizens();
    }, []);

    const fetchCitizens = async () => {
        try {
            const { data } = await API.get('/api/citizens');
            setCitizens(data);
        } catch (err) {
            console.error('Error fetching assigned citizens:', err);
        } finally {
            setLoading(false);
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
                <Topbar title="Assigned Citizens Portfolio" />

                <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                        <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span>👥</span> Assigned Citizens ({filteredCitizens.length})
                        </h2>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <ExportButtons data={filteredCitizens} filename="Assigned_Citizens" />
                            <div style={{ display: 'flex', background: 'rgba(11, 18, 32, 0.6)', borderRadius: '8px', padding: '2px', border: '1px solid var(--glass-border)' }}>
                                <button
                                    onClick={() => setViewMode('grid')}
                                    style={{
                                        padding: '0.4rem 0.8rem',
                                        background: viewMode === 'grid' ? 'var(--accent-amber)' : 'transparent',
                                        color: viewMode === 'grid' ? '#0B1220' : 'var(--text-muted)',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                        fontSize: '0.8rem'
                                    }}
                                >
                                    ▦ Grid
                                </button>
                                <button
                                    onClick={() => setViewMode('table')}
                                    style={{
                                        padding: '0.4rem 0.8rem',
                                        background: viewMode === 'table' ? 'var(--accent-amber)' : 'transparent',
                                        color: viewMode === 'table' ? '#0B1220' : 'var(--text-muted)',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                        fontSize: '0.8rem'
                                    }}
                                >
                                    ≡ Table
                                </button>
                            </div>
                        </div>
                    </div>

                    <input
                        type="text"
                        placeholder="Search citizens by name, contact, address..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ marginBottom: '1.5rem' }}
                    />

                    {loading ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading citizen portfolio...</div>
                    ) : filteredCitizens.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No assigned citizens match your search.</div>
                    ) : viewMode === 'grid' ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                            {filteredCitizens.map(c => (
                                <div key={c._id} className="glass-card glass-card-interactive stagger-in" style={{ padding: '1.5rem', borderRadius: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{
                                                width: '42px',
                                                height: '42px',
                                                borderRadius: '50%',
                                                background: 'var(--accent-amber)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#0B1220',
                                                fontWeight: 'bold',
                                                fontSize: '1.1rem'
                                            }}>
                                                {c.name?.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{c.name}</h3>
                                                <div className="mono-data" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{c.email}</div>
                                            </div>
                                        </div>
                                        <span className={`status-pill ${c.escalationRisk === 'High' ? 'status-critical' : 'status-resolved'}`}>
                                            {c.escalationRisk || 'Low'} Risk
                                        </span>
                                    </div>

                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                        <div>📞 <strong>Contact:</strong> <span className="mono-data">{c.contact}</span></div>
                                        <div>🏠 <strong>Address:</strong> {c.address || 'N/A'}</div>
                                    </div>

                                    <Link to={`/citizen-profile/${c._id}`} className="btn-municipal-glass" style={{
                                        display: 'block',
                                        padding: '0.5rem',
                                        textAlign: 'center',
                                        borderRadius: '8px',
                                        textDecoration: 'none',
                                        fontWeight: 'bold',
                                        fontSize: '0.82rem'
                                    }}>
                                        View 360 Profile →
                                    </Link>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="table-glass">
                                <thead>
                                    <tr>
                                        <th>Citizen Name & Email</th>
                                        <th>Contact Phone</th>
                                        <th>Residential Address</th>
                                        <th>Escalation Risk</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCitizens.map(c => (
                                        <tr key={c._id} className="table-row-hover">
                                            <td>
                                                <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{c.name}</div>
                                                <div className="mono-data" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{c.email}</div>
                                            </td>
                                            <td className="mono-data" style={{ fontSize: '0.85rem' }}>{c.contact}</td>
                                            <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{c.address || 'N/A'}</td>
                                            <td>
                                                <span className={`status-pill ${c.escalationRisk === 'High' ? 'status-critical' : 'status-resolved'}`}>
                                                    {c.escalationRisk || 'Low'}
                                                </span>
                                            </td>
                                            <td>
                                                <Link to={`/citizen-profile/${c._id}`} style={{ color: 'var(--accent-amber)', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.82rem' }}>
                                                    View 360 Profile →
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AssignedCitizens;
