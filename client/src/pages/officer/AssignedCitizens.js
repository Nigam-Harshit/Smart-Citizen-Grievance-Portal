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

    const getRiskStyle = (risk) => {
        if (risk === 'High') return { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' };
        if (risk === 'Medium') return { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' };
        return { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' };
    };

    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <div className="main-content" style={{ flex: 1, padding: '2rem', minHeight: '100vh', background: 'var(--bg-primary)' }}>
                <Topbar title="Assigned Citizens Portfolio" />

                <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                        <h2 style={{ margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span>👥</span> Assigned Citizens ({filteredCitizens.length})
                        </h2>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <ExportButtons data={filteredCitizens} filename="Assigned_Citizens" />
                            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '2px' }}>
                                <button
                                    onClick={() => setViewMode('grid')}
                                    style={{
                                        padding: '0.4rem 0.8rem',
                                        background: viewMode === 'grid' ? '#6366f1' : 'transparent',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    ▦ Grid
                                </button>
                                <button
                                    onClick={() => setViewMode('table')}
                                    style={{
                                        padding: '0.4rem 0.8rem',
                                        background: viewMode === 'table' ? '#6366f1' : 'transparent',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer'
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
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading citizen directory...</div>
                    ) : filteredCitizens.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No assigned citizens match your search.</div>
                    ) : viewMode === 'grid' ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                            {filteredCitizens.map(c => {
                                const riskStyle = getRiskStyle(c.escalationRisk);
                                return (
                                    <div key={c._id} className="glass-card" style={{ padding: '1.5rem', borderRadius: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{
                                                    width: '42px',
                                                    height: '42px',
                                                    borderRadius: '50%',
                                                    background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'white',
                                                    fontWeight: 'bold',
                                                    fontSize: '1.1rem'
                                                }}>
                                                    {c.name?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h3 style={{ margin: 0, color: 'white', fontSize: '1.05rem' }}>{c.name}</h3>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{c.email}</div>
                                                </div>
                                            </div>
                                            <span style={{
                                                padding: '0.2rem 0.6rem',
                                                borderRadius: '12px',
                                                fontSize: '0.7rem',
                                                fontWeight: 'bold',
                                                background: riskStyle.bg,
                                                color: riskStyle.color
                                            }}>
                                                {c.escalationRisk || 'Low'} Risk
                                            </span>
                                        </div>

                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                            <div>📞 <strong>Contact:</strong> {c.contact}</div>
                                            <div>🏠 <strong>Address:</strong> {c.address || 'N/A'}</div>
                                        </div>

                                        <Link to={`/citizen-profile/${c._id}`} style={{
                                            display: 'block',
                                            padding: '0.6rem',
                                            textAlign: 'center',
                                            background: 'rgba(99, 102, 241, 0.15)',
                                            color: '#818cf8',
                                            borderRadius: '8px',
                                            textDecoration: 'none',
                                            fontWeight: 'bold',
                                            fontSize: '0.85rem'
                                        }}>
                                            View 360 Profile →
                                        </Link>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                        <th style={{ padding: '1rem' }}>Citizen Name</th>
                                        <th style={{ padding: '1rem' }}>Contact</th>
                                        <th style={{ padding: '1rem' }}>Address</th>
                                        <th style={{ padding: '1rem' }}>Escalation Risk</th>
                                        <th style={{ padding: '1rem' }}>Action</th>
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
                                                <td style={{ padding: '1rem', fontSize: '0.9rem' }}>{c.contact}</td>
                                                <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{c.address || 'N/A'}</td>
                                                <td style={{ padding: '1rem' }}>
                                                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', background: riskStyle.bg, color: riskStyle.color }}>
                                                        {c.escalationRisk || 'Low'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <Link to={`/citizen-profile/${c._id}`} style={{ color: '#818cf8', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.85rem' }}>
                                                        View Profile →
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })}
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
