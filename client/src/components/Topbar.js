import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import API from '../utils/api';

const Topbar = ({ title }) => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [searchTerm, setSearchTerm] = useState('');
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loadingNotifications, setLoadingNotifications] = useState(false);
    const [notificationError, setNotificationError] = useState(null);
    const [showResults, setShowResults] = useState(false);
    const [searchResults, setSearchResults] = useState({ citizens: [], grievances: [] });
    const searchRef = useRef(null);
    const notificationRef = useRef(null);
    const debounceRef = useRef(null);

    const isAdmin = user?.role === 'admin' || user?.role === 'manager';
    const isOfficer = user?.role === 'officer';

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        try {
            setLoadingNotifications(true);
            setNotificationError(null);
            const res = await API.get('/api/notifications?limit=20');
            if (res.data?.success) {
                setNotifications(res.data.notifications || []);
                setUnreadCount(res.data.unreadCount || 0);
            }
        } catch (err) {
            console.warn('Failed to fetch notifications:', err.message);
            setNotificationError('Unable to load alerts');
        } finally {
            setLoadingNotifications(false);
        }
    }, [user]);

    useEffect(() => {
        fetchNotifications();
        const timer = setInterval(fetchNotifications, 30000);
        return () => clearInterval(timer);
    }, [fetchNotifications]);

    const handleMarkAsRead = async (id) => {
        try {
            await API.put(`/api/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.warn('Failed to mark notification read:', err.message);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await API.put('/api/notifications/mark-all-read');
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (err) {
            console.warn('Failed to mark all notifications read:', err.message);
        }
    };

    const handleNotificationClick = async (notif) => {
        if (!notif.isRead) {
            await handleMarkAsRead(notif._id);
        }
        setShowNotifications(false);
        if (notif.grievanceId) {
            if (user?.role === 'citizen') {
                navigate(`/citizen/grievance/${notif.grievanceId}`);
            } else if (user?.role === 'officer') {
                navigate(`/officer/grievance/${notif.grievanceId}`);
            } else {
                navigate(`/admin/grievances`);
            }
        }
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setShowResults(false);
            }
            if (notificationRef.current && !notificationRef.current.contains(e.target)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const performSearch = useCallback(async (term) => {
        if (!term.trim()) {
            setSearchResults({ citizens: [], grievances: [] });
            setShowResults(false);
            return;
        }

        try {
            const [citRes, griRes] = await Promise.all([
                API.get('/api/citizens'),
                API.get('/api/grievances')
            ]);

            const lowerTerm = term.toLowerCase();

            const matchedCitizens = (citRes.data || [])
                .filter(c =>
                    c.name?.toLowerCase().includes(lowerTerm) ||
                    c.email?.toLowerCase().includes(lowerTerm) ||
                    c.contact?.toLowerCase().includes(lowerTerm) ||
                    c.address?.toLowerCase().includes(lowerTerm)
                )
                .slice(0, 5);

            const matchedGrievances = (griRes.data || [])
                .filter(g =>
                    g.title?.toLowerCase().includes(lowerTerm) ||
                    g.description?.toLowerCase().includes(lowerTerm) ||
                    g.category?.toLowerCase().includes(lowerTerm) ||
                    g.location?.toLowerCase().includes(lowerTerm) ||
                    g.citizenName?.toLowerCase().includes(lowerTerm)
                )
                .slice(0, 5);

            setSearchResults({ citizens: matchedCitizens, grievances: matchedGrievances });
            setShowResults(true);
        } catch (error) {
            console.error('Search failed', error);
        }
    }, []);

    const handleInputChange = (e) => {
        const val = e.target.value;
        setSearchTerm(val);

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            performSearch(val);
        }, 300);
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            setShowResults(false);
            if (isAdmin) {
                navigate(`/admin/citizens?search=${encodeURIComponent(searchTerm)}`);
            } else if (isOfficer) {
                navigate(`/officer/citizens?search=${encodeURIComponent(searchTerm)}`);
            } else {
                navigate(`/citizen/grievances?search=${encodeURIComponent(searchTerm)}`);
            }
        }
    };

    const totalResults = searchResults.citizens.length + searchResults.grievances.length;

    return (
        <div className="glass-panel" style={{
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center',
            padding: '0.9rem 1.6rem',
            borderRadius: '14px',
            marginBottom: '2rem',
            background: 'var(--glass-tint)',
            border: '1px solid var(--glass-border)'
        }}>
            <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontFamily: 'Fraunces, serif', color: 'var(--text-primary)' }}>
                    {title || 'Municipal Workspace'}
                </h2>
            </div>
            
            <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center' }}>
                {/* Search Bar */}
                <div ref={searchRef} style={{ position: 'relative' }}>
                    <form onSubmit={handleSearch} style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, fontSize: '0.85rem' }}>🔍</span>
                        <input 
                            type="text" 
                            placeholder="Search records, complaints..." 
                            value={searchTerm}
                            onChange={handleInputChange}
                            onFocus={() => { if (searchTerm.trim() && totalResults > 0) setShowResults(true); }}
                            style={{
                                width: '280px',
                                padding: '0.5rem 1rem 0.5rem 2.2rem',
                                borderRadius: '20px',
                                fontSize: '0.85rem'
                            }}
                        />
                    </form>

                    {/* Search Results Dropdown */}
                    {showResults && (
                        <div className="glass-panel" style={{
                            position: 'absolute',
                            top: 'calc(100% + 8px)',
                            right: 0,
                            width: '360px',
                            maxHeight: '380px',
                            overflowY: 'auto',
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '12px',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
                            zIndex: 1001
                        }}>
                            {totalResults === 0 ? (
                                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                    No records matching "{searchTerm}"
                                </div>
                            ) : (
                                <>
                                    {searchResults.citizens.length > 0 && (
                                        <div>
                                            <div style={{ padding: '0.5rem 0.8rem', fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--accent-amber)', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid var(--glass-border)', background: 'var(--accent-amber-dim)' }}>
                                                👥 Citizens ({searchResults.citizens.length})
                                            </div>
                                            {searchResults.citizens.map(c => (
                                                <div
                                                    key={c._id}
                                                    onClick={() => { setShowResults(false); navigate(`/citizen-profile/${c._id}`); }}
                                                    style={{ padding: '0.7rem 0.8rem', cursor: 'pointer', borderBottom: '1px solid rgba(203, 213, 225, 0.06)', fontSize: '0.85rem' }}
                                                >
                                                    <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{c.name}</div>
                                                    <div className="mono-data" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.email}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {searchResults.grievances.length > 0 && (
                                        <div>
                                            <div style={{ padding: '0.5rem 0.8rem', fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--signal-blue)', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid var(--glass-border)', background: 'rgba(74, 127, 191, 0.15)' }}>
                                                📋 Grievances ({searchResults.grievances.length})
                                            </div>
                                            {searchResults.grievances.map(g => (
                                                <div
                                                    key={g._id}
                                                    onClick={() => { setShowResults(false); navigate(`/citizen/grievance/${g._id}`); }}
                                                    style={{ padding: '0.7rem 0.8rem', cursor: 'pointer', borderBottom: '1px solid rgba(203, 213, 225, 0.06)', fontSize: '0.85rem' }}
                                                >
                                                    <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{g.title}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                        {g.category} • <span className="mono-data">{g.status}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Notifications Bell */}
                <div ref={notificationRef} style={{ position: 'relative' }}>
                    <button 
                        onClick={() => {
                            const next = !showNotifications;
                            setShowNotifications(next);
                            if (next) fetchNotifications();
                        }}
                        aria-label={`Notifications (${unreadCount} unread)`}
                        style={{ 
                            background: 'var(--glass-tint)', 
                            border: '1px solid var(--glass-border)', 
                            width: '38px', 
                            height: '38px', 
                            borderRadius: '50%', 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative'
                        }}
                    >
                        <span style={{ fontSize: '1.1rem' }}>🔔</span>
                        {unreadCount > 0 && (
                            <span style={{
                                position: 'absolute',
                                top: '-2px',
                                right: '-2px',
                                background: 'var(--signal-red)',
                                color: '#FFFFFF',
                                fontSize: '0.68rem',
                                fontWeight: 'bold',
                                minWidth: '16px',
                                height: '16px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '0 3px'
                            }}>
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {showNotifications && (
                        <div className="glass-panel" style={{
                            position: 'absolute',
                            top: '46px',
                            right: '0',
                            width: '340px',
                            maxHeight: '420px',
                            overflowY: 'auto',
                            padding: '1rem',
                            zIndex: 1000,
                            background: 'var(--bg-elevated)',
                            boxShadow: '0 15px 35px rgba(0,0,0,0.6)',
                            borderRadius: '12px',
                            border: '1px solid var(--glass-border)'
                        }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                margin: '0 0 0.8rem 0',
                                borderBottom: '1px solid var(--glass-border)',
                                paddingBottom: '0.5rem'
                            }}>
                                <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                                    Notifications {unreadCount > 0 && <span style={{ fontSize: '0.75rem', color: 'var(--accent-amber)' }}>({unreadCount} unread)</span>}
                                </h4>
                                {unreadCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleMarkAllAsRead}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--accent-amber)',
                                            cursor: 'pointer',
                                            fontSize: '0.75rem',
                                            padding: 0,
                                            textDecoration: 'underline'
                                        }}
                                    >
                                        Mark all read
                                    </button>
                                )}
                            </div>

                            {loadingNotifications && notifications.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '1.2rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                                    Loading notifications...
                                </div>
                            ) : notificationError ? (
                                <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--signal-red)', fontSize: '0.82rem' }}>
                                    ⚠️ {notificationError}
                                </div>
                            ) : notifications.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                    No new notifications
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {notifications.map(n => (
                                        <div
                                            key={n._id}
                                            onClick={() => handleNotificationClick(n)}
                                            style={{
                                                padding: '0.65rem 0.8rem',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                transition: 'background 0.2s ease',
                                                background: n.isRead ? 'rgba(255, 255, 255, 0.02)' : 'rgba(201, 150, 44, 0.1)',
                                                borderLeft: n.isRead ? '3px solid transparent' : '3px solid var(--accent-amber)',
                                                border: '1px solid rgba(255, 255, 255, 0.05)'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.2rem' }}>
                                                <strong style={{
                                                    fontSize: '0.82rem',
                                                    color: n.isRead ? 'var(--text-primary)' : 'var(--accent-amber)',
                                                    fontWeight: n.isRead ? '500' : '600'
                                                }}>
                                                    {n.title}
                                                </strong>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                    {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>
                                                {n.message}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Topbar;
