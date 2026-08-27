import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import API from '../../utils/api';

const SmartInsight = () => {
    const [insights, setInsights] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [isScanning, setIsScanning] = useState(false);

    useEffect(() => {
        fetchInsights();
    }, []);

    const fetchInsights = async () => {
        try {
            const { data } = await API.get('/api/grievances/insights');
            setInsights(data);
        } catch (err) {
            console.error('Error fetching escalation insights:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRunAnalysis = async () => {
        setGenerating(true);
        setIsScanning(true);
        try {
            const { data } = await API.post('/api/grievances/insights/generate');
            setTimeout(() => {
                setInsights(data);
                setGenerating(false);
                setTimeout(() => setIsScanning(false), 1200);
            }, 600);
        } catch (err) {
            console.error('Error generating escalation insights:', err);
            alert(err.response?.data?.message || 'Error generating insights');
            setGenerating(false);
            setIsScanning(false);
        }
    };

    const getRiskBadge = (score) => {
        if (score === 'High') return { border: 'var(--signal-red)', bg: 'rgba(192, 67, 59, 0.15)', text: 'var(--signal-red)', label: 'HIGH RISK' };
        if (score === 'Medium') return { border: 'var(--accent-amber)', bg: 'var(--accent-amber-dim)', text: 'var(--accent-amber)', label: 'MEDIUM RISK' };
        return { border: 'var(--signal-green)', bg: 'rgba(79, 157, 110, 0.15)', text: 'var(--signal-green)', label: 'LOW RISK' };
    };

    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <div className="main-content">
                <Topbar title="AI Escalation Risk Engine" />

                {/* Hero Panel */}
                <div className="glass-panel" style={{
                    padding: '2rem',
                    borderRadius: '16px',
                    marginBottom: '2rem',
                    background: 'var(--glass-tint)',
                    border: '1px solid var(--glass-border)',
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center',
                    gap: '1.5rem',
                    flexWrap: 'wrap'
                }}>
                    <div>
                        <h2 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.4rem' }}>
                            <span>✨</span> Predictive Civic Escalation Risk Engine
                        </h2>
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '700px', lineHeight: '1.5' }}>
                            Scans citizen complaint histories, unresolved critical issues, and SLA breach durations to generate zonal supervisor dispatch recommendations.
                        </p>
                    </div>
                    <button
                        onClick={handleRunAnalysis}
                        disabled={generating}
                        className="btn-municipal"
                        style={{
                            padding: '0.8rem 1.8rem',
                            fontSize: '0.92rem',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {generating ? 'Scanning Citizen Dataset...' : '⚡ Run Risk Analysis Model'}
                    </button>
                </div>

                {/* Glass Rod Progress Indicator */}
                {generating && (
                    <div className="glass-rod-loader" style={{ marginBottom: '1.5rem', position: 'relative', height: '4rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="mono-data" style={{ fontSize: '0.85rem', color: 'var(--accent-amber)', zIndex: 2 }}>
                            TRANSMITTING DATASET THROUGH MUNICIPAL RISK MATRIX...
                        </span>
                    </div>
                )}

                {/* Grid Container with Signature Light-Sweep Scan Overlay */}
                <div className="risk-scan-container" style={{ position: 'relative', minHeight: '300px' }}>
                    {isScanning && <div className="risk-scan-overlay" />}

                    {loading ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            Loading municipal risk records...
                        </div>
                    ) : insights.length === 0 ? (
                        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No generated insights available. Click "Run Risk Analysis Model" above to trigger initial analysis.
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                            {insights.map((item, idx) => {
                                const citizen = item.citizenId || {};
                                const badge = getRiskBadge(item.riskScore);

                                return (
                                    <div key={item._id || idx} className="glass-card glass-card-interactive stagger-in" style={{
                                        padding: '1.5rem',
                                        borderRadius: '14px',
                                        borderLeft: `4px solid ${badge.border}`,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justify: 'space-between'
                                    }}>
                                        <div>
                                            {/* Card Top */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                                <div>
                                                    <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                                                        {citizen.name || 'Citizen Record'}
                                                    </h3>
                                                    <div className="mono-data" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                        {citizen.email || 'N/A'}
                                                    </div>
                                                </div>
                                                <span className="mono-badge" style={{
                                                    padding: '0.25rem 0.65rem',
                                                    borderRadius: '12px',
                                                    fontSize: '0.72rem',
                                                    fontWeight: '700',
                                                    background: badge.bg,
                                                    color: badge.text,
                                                    border: `1px solid ${badge.border}`
                                                }}>
                                                    {badge.label}
                                                </span>
                                            </div>

                                            {/* AI Recommendation */}
                                            <div style={{ marginBottom: '1.2rem', padding: '0.75rem', borderRadius: '8px', background: 'rgba(11, 18, 32, 0.4)', border: '1px solid var(--glass-border)' }}>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--accent-amber)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.3rem', letterSpacing: '0.5px' }}>
                                                    AI Recommended Action
                                                </div>
                                                <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.85rem', lineHeight: '1.5' }}>
                                                    {item.recommendation}
                                                </p>
                                            </div>

                                            {/* Risk Triggers */}
                                            <div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.5px' }}>
                                                    Risk Factors Evaluated
                                                </div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                                    {item.riskFactors?.map((rf, fIdx) => (
                                                        <span key={fIdx} style={{
                                                            padding: '0.15rem 0.5rem',
                                                            borderRadius: '6px',
                                                            fontSize: '0.72rem',
                                                            background: 'rgba(148, 163, 184, 0.08)',
                                                            color: 'var(--text-muted)',
                                                            border: '1px solid var(--glass-border)'
                                                        }}>
                                                            • {rf}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card Footer */}
                                        <div style={{ marginTop: '1.2rem', paddingTop: '0.75rem', borderTop: '1px solid var(--glass-border)', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                                            <span className="mono-data">Generated: {new Date(item.generatedAt || item.updatedAt).toLocaleTimeString()}</span>
                                            <span className="mono-data">Status: Active</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SmartInsight;
