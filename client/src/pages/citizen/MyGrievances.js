import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import API from '../../utils/api';
import { Link } from 'react-router-dom';

const MyGrievances = () => {
    const [grievances, setGrievances] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchGrievances = async () => {
            try {
                const { data } = await API.get('/api/grievances');
                setGrievances(data);
            } catch (err) {
                console.error('Error fetching grievances:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchGrievances();
    }, []);

    const getStatusClass = (status) => {
        if (status === 'Resolved') return 'status-pill status-resolved';
        if (status === 'In Progress') return 'status-pill status-in-progress';
        return 'status-pill status-open';
    };

    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <div className="main-content">
                <Topbar title="My Grievance History" />

                <div className="glass-panel" style={{ padding: '1.2rem 1.6rem', borderRadius: '14px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>My Lodged Complaints History</h3>
                        <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            Track resolution statuses and officer progress on your submitted municipal requests.
                        </p>
                    </div>
                    <Link to="/citizen/submit" className="btn-municipal" style={{ textDecoration: 'none', padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}>
                        + Lodge New Complaint
                    </Link>
                </div>

                <div className="glass-panel" style={{ borderRadius: '14px', overflow: 'hidden' }}>
                    {loading ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading grievance history...</div>
                    ) : grievances.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No complaints lodged yet. Click "+ Lodge New Complaint" to get started.
                        </div>
                    ) : (
                        <table className="table-glass">
                            <thead>
                                <tr>
                                    <th>Ticket ID & Title</th>
                                    <th>Category</th>
                                    <th>Location</th>
                                    <th>Filed On</th>
                                    <th>Target SLA</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {grievances.map(g => (
                                    <tr key={g._id} className="table-row-hover">
                                        <td>
                                            <Link to={`/citizen/grievance/${g._id}`} style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 'bold' }}>
                                                {g.title}
                                            </Link>
                                            <div className="mono-data" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                #{g._id.substring(18)}
                                            </div>
                                        </td>
                                        <td><span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{g.category}</span></td>
                                        <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{g.location}</td>
                                        <td>
                                            <div className="mono-data" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                {new Date(g.createdAt).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="mono-data" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                {new Date(g.deadline).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td><span className={getStatusClass(g.status)}>{g.status}</span></td>
                                        <td>
                                            <Link to={`/citizen/grievance/${g._id}`} className="btn-municipal-glass" style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem', textDecoration: 'none' }}>
                                                View Timeline →
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MyGrievances;
