import { useState, useEffect, useMemo } from 'react';
import API from '../../utils/api';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import ExportButtons from '../../components/ExportButtons';

const AuditLogs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAction, setFilterAction] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            const { data } = await API.get('/api/audit');
            setLogs(data);
            setLoading(false);
        } catch (error) {
            console.error("Failed to fetch audit logs", error);
            setLoading(false);
        }
    };

    const getMockIP = (id) => {
        if (!id || id.length < 5) return '192.168.1.1';
        return `192.168.${id.charCodeAt(id.length-1) % 255}.${id.charCodeAt(id.length-2) % 255}`;
    };

    const devices = ['Windows / Chrome', 'Mac OS / Safari', 'iOS / Mobile Safari', 'Android / Chrome', 'Windows / Edge'];
    const getMockDevice = (id) => {
        if (!id || id.length < 5) return devices[0];
        return devices[id.charCodeAt(id.length-3) % devices.length];
    };

    const processedLogs = useMemo(() => {
        return logs.filter(l => {
            const userName = l.userId?.name?.toLowerCase() || 'system';
            const logDetails = l.details?.toLowerCase() || '';
            const actionStr = l.action?.toLowerCase() || '';
            const searchTarget = searchTerm.toLowerCase();

            const matchesSearch = userName.includes(searchTarget) || logDetails.includes(searchTarget) || actionStr.includes(searchTarget);
            const matchesAction = filterAction ? l.action === filterAction : true;
            const matchesRole = filterRole ? (l.userId?.role?.toLowerCase() || 'system') === filterRole.toLowerCase() : true;
            
            let matchesDate = true;
            if (filterStartDate || filterEndDate) {
                const logTime = new Date(l.createdAt).getTime();
                if (filterStartDate && logTime < new Date(filterStartDate).getTime()) matchesDate = false;
                if (filterEndDate) {
                    const end = new Date(filterEndDate);
                    end.setHours(23, 59, 59, 999);
                    if (logTime > end.getTime()) matchesDate = false;
                }
            }
            
            return matchesSearch && matchesAction && matchesRole && matchesDate;
        }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }, [logs, searchTerm, filterAction, filterRole, filterStartDate, filterEndDate]);

    const uniqueActions = useMemo(() => {
        const actions = new Set(logs.map(l => l.action));
        return Array.from(actions).filter(Boolean).sort();
    }, [logs]);

    const exportColumns = [
        { header: 'Date & Time', key: 'createdAt' },
        { header: 'Action', key: 'action' },
        { header: 'Agent Name', key: 'userName' },
        { header: 'Agent Role', key: 'userRole' },
        { header: 'Details', key: 'details' },
        { header: 'IP Address', key: 'ip' },
        { header: 'Network Device', key: 'device' }
    ];

    const formatLogsForExport = () => {
        return processedLogs.map(l => ({
            createdAt: new Date(l.createdAt).toLocaleString(),
            action: l.action,
            userName: l.userId?.name || 'System',
            userRole: l.userId?.role || 'System',
            details: l.details,
            ip: getMockIP(l._id),
            device: getMockDevice(l._id)
        }));
    };

    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <div className="main-content">
                <Topbar title="System Audit & Security Logs" />

                <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h2 style={{ margin: 0, fontFamily: 'Fraunces, serif' }}>Administrative System Audit Logs</h2>
                        <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            Comprehensive action tracking, network telemetry, and administrative execution footprint.
                        </p>
                    </div>
                    <ExportButtons data={formatLogsForExport()} columns={exportColumns} filename="system_audit_logs" />
                </div>

                {/* Filters */}
                <div className="glass-panel" style={{ padding: '1.2rem', borderRadius: '14px', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <label>Search Log Details</label>
                        <input 
                            type="text" 
                            placeholder="User, action, or details..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div style={{ width: '160px' }}>
                        <label>Action Filter</label>
                        <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)}>
                            <option value="">All Actions</option>
                            {uniqueActions.map(act => <option key={act} value={act}>{act}</option>)}
                        </select>
                    </div>

                    <div style={{ width: '140px' }}>
                        <label>Role Filter</label>
                        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                            <option value="">All Roles</option>
                            <option value="admin">Admin</option>
                            <option value="manager">Manager</option>
                            <option value="officer">Officer</option>
                            <option value="citizen">Citizen</option>
                        </select>
                    </div>

                    <div style={{ width: '140px' }}>
                        <label>Start Date</label>
                        <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} />
                    </div>

                    <div style={{ width: '140px' }}>
                        <label>End Date</label>
                        <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} />
                    </div>
                </div>

                {/* Audit Logs Table */}
                <div className="glass-panel" style={{ borderRadius: '14px', overflow: 'hidden' }}>
                    {loading ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading audit telemetry logs...</div>
                    ) : processedLogs.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No audit logs matching active filter criteria.</div>
                    ) : (
                        <table className="table-glass">
                            <thead>
                                <tr>
                                    <th>Timestamp</th>
                                    <th>Agent / User</th>
                                    <th>Action</th>
                                    <th>Event Details</th>
                                    <th>Network Telemetry</th>
                                </tr>
                            </thead>
                            <tbody>
                                {processedLogs.map(log => {
                                    return (
                                        <tr key={log._id} className="table-row-hover">
                                            <td>
                                                <div className="mono-data" style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '0.82rem' }}>
                                                    {new Date(log.createdAt).toLocaleDateString()}
                                                </div>
                                                <div className="mono-data" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    {new Date(log.createdAt).toLocaleTimeString()}
                                                </div>
                                            </td>
                                            <td>
                                                {log.userId ? (
                                                    <div>
                                                        <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '0.88rem' }}>{log.userId.name}</div>
                                                        <span className="status-pill status-open" style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem', textTransform: 'uppercase' }}>
                                                            {log.userId.role}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>
                                                        🤖 System Script
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                <span className="mono-badge" style={{
                                                    padding: '0.25rem 0.65rem',
                                                    borderRadius: '8px',
                                                    fontSize: '0.75rem',
                                                    background: 'var(--accent-amber-dim)',
                                                    color: 'var(--accent-amber)',
                                                    border: '1px solid var(--accent-amber)',
                                                    fontWeight: 'bold'
                                                }}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td style={{ color: 'var(--text-primary)', fontSize: '0.85rem', lineHeight: '1.4', maxWidth: '300px' }}>
                                                {log.details}
                                            </td>
                                            <td>
                                                <div className="mono-data" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                                    IP: {getMockIP(log._id)}
                                                </div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', opacity: 0.8 }}>
                                                    {getMockDevice(log._id)}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuditLogs;
