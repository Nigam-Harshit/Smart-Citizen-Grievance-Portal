import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import API from '../utils/api';

const Topbar = ({ title }) => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [searchTerm, setSearchTerm] = useState('');
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadCount, setUnreadCount] = useState(2);
    const [showResults, setShowResults] = useState(false);
    const [searchResults, setSearchResults] = useState({ citizens: [], grievances: [] });
    const [isSearching, setIsSearching] = useState(false);
    const searchRef = useRef(null);
    const notificationRef = useRef(null);
    const debounceRef = useRef(null);

    const isAdmin = user?.role === 'admin' || user?.role === 'manager';
    const isOfficer = user?.role === 'officer';

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

        setIsSearching(true);
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
        } finally {
            setIsSearching(false);
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
                        onClick={() => setShowNotifications(!showNotifications)}
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
                            <span style={{ position: 'absolute', top: '-2px', right: '-2px', background: 'var(--signal-red)', width: '10px', height: '10px', borderRadius: '50%' }}></span>
                        )}
                    </button>

                    {showNotifications && (
                        <div className="glass-panel" style={{
                            position: 'absolute',
                            top: '46px',
                            right: '0',
                            width: '300px',
                            padding: '1rem',
                            zIndex: 1000,
                            background: 'var(--bg-elevated)',
                            boxShadow: '0 15px 35px rgba(0,0,0,0.6)'
                        }}>
                            <h4 style={{ margin: '0 0 0.8rem 0', color: 'var(--text-primary)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.4rem', fontSize: '0.9rem' }}>
                                System Alerts
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.82rem' }}>
                                <div style={{ background: 'rgba(192, 67, 59, 0.12)', padding: '0.6rem 0.8rem', borderRadius: '6px', borderLeft: '3px solid var(--signal-red)' }}>
                                    <strong style={{ color: 'var(--signal-red)' }}>SLA Alert:</strong> Resolution deadline breached for 2 critical complaints.
                                </div>
                                <div style={{ background: 'var(--accent-amber-dim)', padding: '0.6rem 0.8rem', borderRadius: '6px', borderLeft: '3px solid var(--accent-amber)' }}>
                                    <strong style={{ color: 'var(--accent-amber)' }}>Task:</strong> 3 Field inspections scheduled today.
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Topbar;
