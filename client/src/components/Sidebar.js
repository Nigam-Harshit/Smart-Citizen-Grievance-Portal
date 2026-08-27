import { Link, useLocation } from 'react-router-dom';
import { useContext, useState, useEffect } from 'react';
import AuthContext from '../context/AuthContext';

const Sidebar = () => {
    const { user, logout } = useContext(AuthContext);
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('sidebar_collapsed');
        if (stored === 'true') setCollapsed(true);
    }, []);

    const toggleSidebar = () => {
        const newVal = !collapsed;
        setCollapsed(newVal);
        localStorage.setItem('sidebar_collapsed', newVal);
    };

    const sidebarWidth = collapsed ? '74px' : '230px';

    const isActive = (path) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path + '/'));

    const getLinkStyle = (path) => {
        const active = isActive(path);
        return {
            display: 'flex',
            alignItems: 'center',
            padding: collapsed ? '0.75rem 0' : '0.75rem 1rem',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: collapsed ? '0' : '10px',
            color: active ? 'var(--accent-amber)' : 'var(--text-muted)',
            background: active ? 'var(--accent-amber-dim)' : 'transparent',
            textDecoration: 'none',
            borderRadius: active ? '0 8px 8px 0' : '6px',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            borderLeft: active ? '3px solid var(--accent-amber)' : '3px solid transparent',
            fontWeight: active ? '700' : '500',
            fontSize: '0.88rem'
        };
    };

    return (
        <>
            <style>{`
                .main-content { 
                    margin-left: ${collapsed ? '94px' : '250px'} !important; 
                    transition: margin-left 0.3s cubic-bezier(0.16, 1, 0.3, 1); 
                }
            `}</style>
            <div className="sidebar glass-panel sidebar-glass" style={{
                width: sidebarWidth,
                height: 'calc(100vh - 32px)',
                position: 'fixed',
                left: '16px',
                top: '16px',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 100,
                transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                borderRadius: '16px',
                border: '1px solid var(--glass-border)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
            }}>
                {/* Header */}
                <div style={{
                    padding: collapsed ? '1.2rem 0' : '1.4rem 1.4rem',
                    borderBottom: '1px solid var(--glass-border)',
                    textAlign: collapsed ? 'center' : 'left',
                    position: 'relative'
                }}>
                    <h2 style={{
                        color: 'var(--text-primary)',
                        margin: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        gap: '10px',
                        fontSize: '1.15rem'
                    }}>
                        <span style={{ fontSize: '1.4rem' }}>🏛️</span> {!collapsed && <span style={{ fontFamily: 'Fraunces, serif' }}>Civic Portal</span>}
                    </h2>
                    {!collapsed && (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '4px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {user?.name?.split(' ')[0]} <span style={{ color: 'var(--accent-amber)', textTransform: 'uppercase', fontWeight: 'bold' }}>• {user?.role}</span>
                        </p>
                    )}

                    <button onClick={toggleSidebar} style={{
                        position: 'absolute',
                        right: collapsed ? '50%' : '-12px',
                        transform: collapsed ? 'translateX(50%)' : 'none',
                        bottom: collapsed ? '-12px' : 'auto',
                        top: collapsed ? 'auto' : '50%',
                        marginTop: collapsed ? '0' : '-12px',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--glass-border)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 101,
                        fontSize: '0.7rem'
                    }}>
                        {collapsed ? '▶' : '◀'}
                    </button>
                </div>

                {/* Nav Items */}
                <ul style={{ listStyle: 'none', padding: collapsed ? '0.8rem 0.2rem' : '0.8rem 0.5rem 0.8rem 0', flex: 1, margin: 0, overflowY: 'auto' }}>
                    {(user?.role === 'admin' || user?.role === 'manager') && (
                        <>
                            <li style={{ marginBottom: '0.3rem' }}><Link title="Command Center" to="/admin" style={getLinkStyle('/admin')}><span>📊</span> {!collapsed && "Command Center"}</Link></li>
                            <li style={{ marginBottom: '0.3rem' }}><Link title="Master Grievances" to="/admin/grievances" style={getLinkStyle('/admin/grievances')}><span>📑</span> {!collapsed && "Master Grievances"}</Link></li>
                            <li style={{ marginBottom: '0.3rem' }}><Link title="Citizens Directory" to="/admin/citizens" style={getLinkStyle('/admin/citizens')}><span>👥</span> {!collapsed && "Citizens Directory"}</Link></li>
                            <li style={{ marginBottom: '0.3rem' }}><Link title="Escalation Insights" to="/admin/insights" style={getLinkStyle('/admin/insights')}><span>✨</span> {!collapsed && "Escalation Engine"}</Link></li>
                            {user.role === 'admin' && (
                                <li style={{ marginBottom: '0.3rem' }}><Link title="Audit Logs" to="/admin/audit" style={getLinkStyle('/admin/audit')}><span>🛡️</span> {!collapsed && "System Audit Logs"}</Link></li>
                            )}
                        </>
                    )}

                    {user?.role === 'officer' && (
                        <>
                            <li style={{ marginBottom: '0.3rem' }}><Link title="Officer Workspace" to="/officer" style={getLinkStyle('/officer')}><span>📊</span> {!collapsed && "Officer Workspace"}</Link></li>
                            <li style={{ marginBottom: '0.3rem' }}><Link title="Assigned Kanban" to="/officer/grievances" style={getLinkStyle('/officer/grievances')}><span>📌</span> {!collapsed && "Field Kanban Board"}</Link></li>
                            <li style={{ marginBottom: '0.3rem' }}><Link title="Assigned Citizens" to="/officer/citizens" style={getLinkStyle('/officer/citizens')}><span>👥</span> {!collapsed && "Assigned Citizens"}</Link></li>
                        </>
                    )}

                    {user?.role === 'citizen' && (
                        <>
                            <li style={{ marginBottom: '0.3rem' }}><Link title="My Dashboard" to="/citizen" style={getLinkStyle('/citizen')}><span>🏡</span> {!collapsed && "Citizen Portal"}</Link></li>
                            <li style={{ marginBottom: '0.3rem' }}><Link title="Lodge Grievance" to="/citizen/submit" style={getLinkStyle('/citizen/submit')}><span>📝</span> {!collapsed && "Lodge Grievance"}</Link></li>
                            <li style={{ marginBottom: '0.3rem' }}><Link title="My Grievances" to="/citizen/grievances" style={getLinkStyle('/citizen/grievances')}><span>📋</span> {!collapsed && "My Complaints"}</Link></li>
                        </>
                    )}
                </ul>

                {/* Footer Account Link & Logout */}
                <div style={{ padding: collapsed ? '0.8rem 0.2rem' : '0.8rem 0.8rem 0.8rem 0', borderTop: '1px solid var(--glass-border)' }}>
                    <div style={{ marginBottom: '0.4rem' }}>
                        <Link title="Account Profile" to="/profile" style={getLinkStyle('/profile')}>
                            <span>👤</span> {!collapsed && "Account Settings"}
                        </Link>
                    </div>
                    <button title="Logout" onClick={logout} style={{
                        width: '100%',
                        padding: collapsed ? '0.6rem 0' : '0.6rem 0.8rem',
                        background: 'rgba(192, 67, 59, 0.12)',
                        color: 'var(--signal-red)',
                        border: '1px solid rgba(192, 67, 59, 0.25)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: collapsed ? '0' : '0.5rem',
                        fontSize: '0.85rem',
                        fontWeight: '600'
                    }}>
                        <span>🚪</span> {!collapsed && "Sign Out"}
                    </button>
                </div>
            </div>
        </>
    );
};

export default Sidebar;
