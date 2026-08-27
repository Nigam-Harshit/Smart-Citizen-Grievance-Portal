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
                <div className="main-content" style={{ flex: 1, padding: '2rem', color: 'white' }}>
                    <Topbar title="Loading Citizen Profile..." />
                    <p style={{ textAlign: 'center', marginTop: '4rem' }}>Loading 360 profile...</p>
                </div>
            </div>
        );
    }

    if (!citizen) {
        return (
            <div style={{ display: 'flex' }}>
                <Sidebar />
                <div className="main-content" style={{ flex: 1, padding: '2rem', color: 'white' }}>
                    <Topbar title="Citizen Not Found" />
                    <p style={{ textAlign: 'center', marginTop: '4rem' }}>Citizen record not found.</p>
                </div>
            </div>
        );
    }

    const openGrievances = grievances.filter(g => g.status !== 'Resolved');
    const resolvedGrievances = grievances.filter(g => g.status === 'Resolved');

    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <div className="main-content" style={{ flex: 1, padding: '2rem', minHeight: '100vh', background: 'var(--bg-primary)' }}>
                <Topbar title={`Citizen Profile: ${citizen.name}`} />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
                    {/* Left Column: Personal Info Card */}
                    <div>
                        <div className="glass-card" style={{ padding: '2rem', borderRadius: '16px', marginBottom: '1.5rem' }}>
                            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                                <div style={{
                                    width: '64px',
                                    height: '64px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontSize: '1.8rem',
                                    fontWeight: 'bold',
                                    margin: '0 auto 1rem auto'
                                }}>
                                    {citizen.name?.charAt(0).toUpperCase()}
                                </div>
                                <h2 style={{ margin: '0 0 0.3rem 0', color: 'white' }}>{citizen.name}</h2>
                                <span style={{
                                    padding: '0.2rem 0.8rem',
                                    borderRadius: '12px',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                    background: citizen.escalationRisk === 'High' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                                    color: citizen.escalationRisk === 'High' ? '#ef4444' : '#22c55e'
                                }}>
                                    {citizen.escalationRisk || 'Low'} Escalation Risk
                                </span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.2rem', fontSize: '0.9rem' }}>
                                <div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>EMAIL ADDRESS</div>
                                    <div style={{ color: 'white' }}>{citizen.email}</div>
                                </div>
                                <div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>CONTACT PHONE</div>
                                    <div style={{ color: 'white' }}>{citizen.contact}</div>
                                </div>
                                <div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>RESIDENTIAL ADDRESS</div>
                                    <div style={{ color: 'white' }}>{citizen.address || 'N/A'}</div>
                                </div>
                                <div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>ASSIGNED OFFICER</div>
                                    <div style={{ color: '#818cf8', fontWeight: 'bold' }}>{citizen.assignedTo?.name || 'Unassigned'}</div>
                                </div>
                            </div>
                        </div>

                        <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
                            <h4 style={{ margin: '0 0 1rem 0', color: 'white' }}>Grievance Summary</h4>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Total Filed</span>
                                <span style={{ fontWeight: 'bold', color: 'white' }}>{grievances.length}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Active Unresolved</span>
                                <span style={{ fontWeight: 'bold', color: '#f59e0b' }}>{openGrievances.length}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem 0' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Resolved</span>
                                <span style={{ fontWeight: 'bold', color: '#22c55e' }}>{resolvedGrievances.length}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Grievance History */}
                    <div>
                        <div className="glass-card" style={{ padding: '2rem', borderRadius: '16px' }}>
                            <h3 style={{ margin: '0 0 1.5rem 0', color: 'white' }}>Citizen Grievance History</h3>

                            {grievances.length === 0 ? (
                                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', margin: '2rem 0' }}>No grievances recorded for this citizen.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {grievances.map(g => (
                                        <div key={g._id} style={{
                                            padding: '1.2rem',
                                            background: 'rgba(255,255,255,0.02)',
                                            border: '1px solid rgba(255,255,255,0.06)',
                                            borderRadius: '12px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.3rem' }}>
                                                    <h4 style={{ margin: 0, color: 'white' }}>{g.title}</h4>
                                                    <span style={{ padding: '0.15rem 0.5rem', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 'bold', background: g.status === 'Resolved' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: g.status === 'Resolved' ? '#22c55e' : '#f59e0b' }}>
                                                        {g.status}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                    🏷️ {g.category} • 📍 {g.location} • 📅 {new Date(g.createdAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <Link to={`/citizen/grievance/${g._id}`} style={{ padding: '0.4rem 0.8rem', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.8rem' }}>
                                                View Timeline
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
