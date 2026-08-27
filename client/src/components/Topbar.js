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

    // Close dropdown when clicking outside
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

    // Debounced live search
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

    const navigateToCitizen = (id) => {
        setShowResults(false);
        setSearchTerm('');
        navigate(`/citizen-profile/${id}`);
    };

    const navigateToGrievances = () => {
        setShowResults(false);
        setSearchTerm('');
        if (isAdmin) {
            navigate('/admin/grievances');
        } else if (isOfficer) {
            navigate('/officer/grievances');
        } else {
            navigate('/citizen/grievances');
        }
    };

    const totalResults = searchResults.citizens.length + searchResults.grievances.length;

    const highlightMatch = (text, term) => {
        if (!term.trim() || !text) return text;
        const idx = text.toLowerCase().indexOf(term.toLowerCase());
        if (idx === -1) return text;
        return (
            <>
                {text.substring(0, idx)}
                <span style={{ color: '#818cf8', fontWeight: 'bold' }}>{text.substring(idx, idx + term.length)}</span>
                {text.substring(idx + term.length)}
            </>
        );
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.02)',
            padding: '1rem 2rem',
            borderRadius: '12px',
            marginBottom: '2rem',
            border: '1px solid rgba(255,255,255,0.05)'
        }}>
            <div>
                <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>{title || 'Portal Workspace'}</h2>
            </div>
            
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                {/* Global Search with Live Dropdown */}
                <div ref={searchRef} style={{ position: 'relative' }}>
                    <form onSubmit={handleSearch} style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, fontSize: '0.9rem', pointerEvents: 'none' }}>🔍</span>
                        <input 
                            type="text" 
                            placeholder="Search citizens, grievances..." 
                            value={searchTerm}
                            onChange={handleInputChange}
                            onFocus={() => { if (searchTerm.trim() && totalResults > 0) setShowResults(true); }}
                            style={{
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '20px',
                                padding: '0.5rem 1rem 0.5rem 2.4rem',
                                color: 'white',
                                width: '300px',
                                minWidth: '200px',
                                outline: 'none',
                                transition: 'all 0.3s',
                                fontSize: '0.9rem'
                            }}
                        />
                        {isSearching && (
                            <span style={{
                                position: 'absolute',
                                right: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                width: '16px',
                                height: '16px',
                                border: '2px solid rgba(99, 102, 241, 0.3)',
                                borderTop: '2px solid #818cf8',
                                borderRadius: '50%',
                                animation: 'spin 0.8s linear infinite',
                                display: 'inline-block'
                            }} />
                        )}
                    </form>

                    {/* Live Search Results Dropdown */}
                    {showResults && (
                        <div style={{
                            position: 'absolute',
                            top: 'calc(100% + 8px)',
                            left: 0,
                            right: 0,
                            width: '380px',
                            maxHeight: '420px',
                            overflowY: 'auto',
                            background: 'rgba(30, 41, 59, 0.97)',
                            backdropFilter: 'blur(16px)',
                            border: '1px solid rgba(99, 102, 241, 0.25)',
                            borderRadius: '12px',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.6), 0 0 30px rgba(99, 102, 241, 0.08)',
                            zIndex: 1001,
                            animation: 'slideUp 0.2s ease'
                        }}>
                            {totalResults === 0 ? (
                                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    <div style={{ fontSize: '1.8rem', marginBottom: '0.5rem', opacity: 0.4 }}>🔍</div>
                                    <p style={{ margin: 0, fontSize: '0.9rem' }}>No results for "<strong style={{ color: 'var(--text-primary)' }}>{searchTerm}</strong>"</p>
                                </div>
                            ) : (
                                <>
                                    {/* Citizens Section */}
                                    {searchResults.citizens.length > 0 && (
                                        <div>
                                            <div style={{ padding: '0.6rem 1rem', fontSize: '0.7rem', fontWeight: 'bold', color: '#818cf8', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(99, 102, 241, 0.05)' }}>
                                                👥 Citizens ({searchResults.citizens.length})
                                            </div>
                                            {searchResults.citizens.map(c => (
                                                <div
                                                    key={c._id}
                                                    onClick={() => navigateToCitizen(c._id)}
                                                    style={{
                                                        padding: '0.8rem 1rem',
                                                        cursor: 'pointer',
                                                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                                                        transition: 'background 0.15s',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '12px'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <div style={{
                                                        width: '36px',
                                                        height: '36px',
                                                        borderRadius: '50%',
                                                        background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontWeight: 'bold',
                                                        fontSize: '0.85rem',
                                                        color: 'white',
                                                        flexShrink: 0
                                                    }}>
                                                        {c.name?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                                        <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {highlightMatch(c.name, searchTerm)}
                                                        </div>
                                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {highlightMatch(c.email, searchTerm)}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Grievances Section */}
                                    {searchResults.grievances.length > 0 && (
                                        <div>
                                            <div style={{ padding: '0.6rem 1rem', fontSize: '0.7rem', fontWeight: 'bold', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(245, 158, 11, 0.05)' }}>
                                                📋 Grievances ({searchResults.grievances.length})
                                            </div>
                                            {searchResults.grievances.map(g => (
                                                <div
                                                    key={g._id}
                                                    onClick={navigateToGrievances}
                                                    style={{
                                                        padding: '0.8rem 1rem',
                                                        cursor: 'pointer',
                                                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                                                        transition: 'background 0.15s'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(245, 158, 11, 0.08)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                        <span style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                                                            {highlightMatch(g.title, searchTerm)}
                                                        </span>
                                                        <span style={{
                                                            padding: '0.15rem 0.5rem',
                                                            borderRadius: '4px',
                                                            fontSize: '0.65rem',
                                                            fontWeight: 'bold',
                                                            textTransform: 'uppercase',
                                                            background: g.priority === 'Critical' ? 'rgba(239, 68, 68, 0.15)' :
                                                                g.priority === 'High' ? 'rgba(245, 158, 11, 0.15)' :
                                                                'rgba(59, 130, 246, 0.15)',
                                                            color: g.priority === 'Critical' ? '#ef4444' :
                                                                g.priority === 'High' ? '#f59e0b' :
                                                                '#3b82f6'
                                                        }}>
                                                            {g.priority}
                                                        </span>
                                                    </div>
                                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                                        {g.citizenName || 'Citizen'} • {g.category} • {g.status}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Footer */}
                                    <div
                                        onClick={handleSearch}
                                        style={{
                                            padding: '0.7rem 1rem',
                                            textAlign: 'center',
                                            borderTop: '1px solid rgba(255,255,255,0.08)',
                                            cursor: 'pointer',
                                            color: '#818cf8',
                                            fontSize: '0.85rem',
                                            fontWeight: '600',
                                            transition: 'background 0.15s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        View all results for "{searchTerm}" →
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div ref={notificationRef} style={{ position: 'relative' }}>
                    <button 
                        onClick={() => setShowNotifications(!showNotifications)}
                        style={{ 
                            background: 'rgba(99, 102, 241, 0.1)', 
                            border: '1px solid rgba(99, 102, 241, 0.2)', 
                            width: '40px', 
                            height: '40px', 
                            borderRadius: '50%', 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            transition: 'background 0.2s'
                        }}
                    >
                        <span style={{ fontSize: '1.2rem' }}>🔔</span>
                        {unreadCount > 0 && (
                            <span style={{ position: 'absolute', top: '-2px', right: '-2px', background: '#ef4444', width: '12px', height: '12px', borderRadius: '50%', border: '2px solid var(--bg-primary)' }}></span>
                        )}
                    </button>

                    {showNotifications && (
                        <div className="glass-card" style={{
                            position: 'absolute',
                            top: '50px',
                            right: '0',
                            width: '320px',
                            padding: '1rem',
                            zIndex: 1000,
                            boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                        }}>
                            <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>System Alerts</h4>
                            
                            {unreadCount > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '0.8rem', borderRadius: '8px', borderLeft: '3px solid #ef4444' }}>
                                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)' }}><strong>SLA Alert:</strong> Resolution time exceeded for 2 grievances.</p>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Just now</span>
                                    </div>
                                    <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '0.8rem', borderRadius: '8px', borderLeft: '3px solid #f59e0b' }}>
                                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)' }}><strong>Task:</strong> 3 Officer inspections scheduled today.</p>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>2 hours ago</span>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem', opacity: 0.5 }}>📭</span>
                                    <p style={{ margin: 0, fontSize: '0.9rem' }}>You're caught up!</p>
                                </div>
                            )}

                            {unreadCount > 0 && (
                                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                                    <button 
                                        onClick={() => setUnreadCount(0)} 
                                        style={{ background: 'transparent', border: 'none', color: '#818cf8', cursor: 'pointer', fontSize: '0.8rem' }}
                                    >
                                        Mark all as read
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes spin { 100% { transform: rotate(360deg); } }
                @keyframes slideUp { from { transform: translateY(8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}</style>
        </div>
    );
};

export default Topbar;
