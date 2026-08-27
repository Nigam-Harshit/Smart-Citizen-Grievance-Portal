import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import API from '../utils/api';

const CitizenProfile = () => {
    const { id } = useParams();
    const [citizen, setCitizen] = useState(null);
    const [grievances, setGrievances] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCitizen360 = async () => {
            try {
                const [cRes, gRes] = await Promise.all([
                    API.get(`/api/citizens/${id}`),
                    API.get(`/api/grievances?citizenId=${id}`)
                ]);
                setCitizen(cRes.data);
                setGrievances(gRes.data);
            } catch (err) {
                console.error('Error fetching citizen 360 profile:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchCitizen360();
    }, [id]);

    if (loading) {
        return (
            <div style={{ display: 'flex' }}>
                <Sidebar />
                <div className="main-content">
                    <Topbar title="Loading Citizen Profile..." />
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Loading 360 citizen record...
                    </div>
                </div>
            </div>
        );
    }

    if (!citizen) {
        return (
            <div style={{ display: 'flex' }}>
                <Sidebar />
                <div className="main-content">
                    <Topbar title="Citizen Not Found" />
                    <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Citizen record not found.
                    </div>
                </div>
            </div>
        );
    }

    const openGrievances = grievances.filter(g => g.status !== 'Resolved');
    const resolvedGrievances = grievances.filter(g => g.status === 'Resolved');

    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <div className="main-content">
                <Topbar title={`Citizen Profile: ${citizen.name}`} />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
                    {/* Left Column: Citizen Identity Card */}
                    <div>
                        <div className="glass-panel" style={{ padding: '1.8rem', borderRadius: '16px', marginBottom: '1.5rem' }}>
                            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                                <div style={{
                                    width: '60px',
                                    height: '60px',
                                    borderRadius: '50%',
                                    background: 'var(--accent-amber)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#0B1220',
                                    fontSize: '1.6rem',
                                    fontWeight: 'bold',
                                    margin: '0 auto 0.8rem auto'
                                }}>
                                    {citizen.name?.charAt(0).toUpperCase()}
                                </div>
                                <h2 style={{ margin: '0 0 0.3rem 0', fontSize: '1.25rem' }}>{citizen.name}</h2>
                                <span className={`status-pill ${citizen.escalationRisk === 'High' ? 'status-critical' : 'status-resolved'}`}>
                                    {citizen.escalationRisk || 'Low'} Escalation Risk
                                </span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.2rem', fontSize: '0.88rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>EMAIL ADDRESS</label>
                                    <div className="mono-data" style={{ color: 'var(--text-primary)', marginTop: '2px' }}>{citizen.email}</div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>CONTACT PHONE</label>
                                    <div className="mono-data" style={{ color: 'var(--text-primary)', marginTop: '2px' }}>{citizen.contact}</div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>RESIDENTIAL ADDRESS</label>
                                    <div style={{ color: 'var(--text-primary)', marginTop: '2px' }}>{citizen.address || 'N/A'}</div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ASSIGNED OFFICER</label>
                                    <div style={{ color: 'var(--accent-amber)', fontWeight: 'bold', marginTop: '2px' }}>
                                        👮 {citizen.assignedTo?.name || 'Unassigned'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px' }}>
                            <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem' }}>Complaint Metrics Summary</h4>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--glass-border)', fontSize: '0.88rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Total Filed</span>
                                <span className="mono-data" style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{grievances.length}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--glass-border)', fontSize: '0.88rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Active Unresolved</span>
                                <span className="mono-data" style={{ fontWeight: 'bold', color: 'var(--accent-amber)' }}>{openGrievances.length}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', fontSize: '0.88rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Resolved</span>
                                <span className="mono-data" style={{ fontWeight: 'bold', color: 'var(--signal-green)' }}>{resolvedGrievances.length}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Grievances History */}
                    <div>
                        <div className="glass-panel" style={{ padding: '1.8rem', borderRadius: '16px' }}>
                            <h3 style={{ margin: '0 0 1.2rem 0', fontSize: '1.15rem' }}>Citizen Complaint History</h3>

                            {grievances.length === 0 ? (
                                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No grievances recorded for this citizen.</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                    {grievances.map(g => (
                                        <div key={g._id} className="glass-card glass-card-interactive" style={{
                                            padding: '1rem 1.2rem',
                                            borderRadius: '10px',
                                            display: 'flex',
                                            justify: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.3rem' }}>
                                                    <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{g.title}</h4>
                                                    <span className={`status-pill ${g.status === 'Resolved' ? 'status-resolved' : 'status-open'}`}>
                                                        {g.status}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                    {g.category} • 📍 {g.location} • <span className="mono-data">{new Date(g.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>

                                            <Link to={`/citizen/grievance/${g._id}`} className="btn-municipal-glass" style={{ padding: '0.35rem 0.7rem', fontSize: '0.78rem', textDecoration: 'none' }}>
                                                View Timeline →
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CitizenProfile;
