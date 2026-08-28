import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import API from '../../utils/api';

const SmartInsight = () => {
    const [insights, setInsights] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [showExplainer, setShowExplainer] = useState(false);

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
        if (score === 'Critical' || score === 'High') return { border: 'var(--signal-red)', bg: 'rgba(192, 67, 59, 0.15)', text: 'var(--signal-red)', label: `${score.toUpperCase()} RISK` };
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <h2 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.4rem' }}>
                                <span>⚡</span> Heuristic SLA Escalation Risk Engine
                            </h2>
                            <button
                                onClick={() => setShowExplainer(!showExplainer)}
                                className="btn-municipal-glass"
                                style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', borderRadius: '12px', marginBottom: '0.4rem', cursor: 'pointer' }}
                            >
                                ℹ️ How this works
                            </button>
                        </div>
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '700px', lineHeight: '1.5' }}>
                            Evaluates ticket priority weights, SLA overdue hours, category factors, and active complaint volume to calculate an explainable numerical risk score. Surfaces automated supervisor dispatch recommendations.
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
                        {generating ? 'Scanning Citizen Dataset...' : '⚡ Run Risk Analysis Engine'}
                    </button>
                </div>

                {/* Explainer Modal / Tooltip Drawer */}
                {showExplainer && (
                    <div className="glass-panel" style={{
                        padding: '1.4rem 1.8rem',
                        borderRadius: '12px',
                        marginBottom: '1.5rem',
                        background: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid var(--accent-amber)',
                        fontSize: '0.88rem',
                        lineHeight: '1.6'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                            <h4 style={{ margin: 0, color: 'var(--accent-amber)', fontSize: '1rem', fontFamily: 'Fraunces, serif' }}>
                                📐 Explainable Heuristic Formula & Inputs
                            </h4>
                            <button onClick={() => setShowExplainer(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
                        </div>

                        <p style={{ margin: '0 0 0.8rem 0', color: 'var(--text-primary)' }}>
                            The Escalation Engine evaluates every active citizen account using a transparent, rule-based scoring formula:
                        </p>

                        <div className="mono-data" style={{ background: 'rgba(0,0,0,0.4)', padding: '0.8rem 1rem', borderRadius: '8px', marginBottom: '1rem', borderLeft: '3px solid var(--accent-amber)' }}>
                            <strong>RiskScore</strong> = PriorityWeight (Critical=40, High=30, Medium=15, Low=5) <br/>
                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ (SLAOverdueHours × 2) <br/>
                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ CategoryWeight (+10 for Water, Sanitation & Public Safety) <br/>
                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ (ActiveComplaintsCount × 5)
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.8rem', fontSize: '0.8rem' }}>
                            <div style={{ padding: '0.6rem', borderRadius: '6px', background: 'rgba(192, 67, 59, 0.15)', border: '1px solid var(--signal-red)' }}>
                                <strong style={{ color: 'var(--signal-red)' }}>Critical Risk (Score ≥ 60):</strong> Immediate senior officer dispatch & supervisor intervention.
                            </div>
                            <div style={{ padding: '0.6rem', borderRadius: '6px', background: 'rgba(192, 67, 59, 0.1)', border: '1px solid #e11d48' }}>
                                <strong style={{ color: '#e11d48' }}>High Risk (Score 35–59):</strong> SLA breach imminent or active. Dispatch field inspection.
                            </div>
                            <div style={{ padding: '0.6rem', borderRadius: '6px', background: 'var(--accent-amber-dim)', border: '1px solid var(--accent-amber)' }}>
                                <strong style={{ color: 'var(--accent-amber)' }}>Medium Risk (Score 15–34):</strong> Monitor progress. Follow up on pending citizen ticket.
                            </div>
                            <div style={{ padding: '0.6rem', borderRadius: '6px', background: 'rgba(79, 157, 110, 0.15)', border: '1px solid var(--signal-green)' }}>
                                <strong style={{ color: 'var(--signal-green)' }}>Low Risk (Score &lt; 15):</strong> Complaint within standard SLA target window.
                            </div>
                        </div>
                    </div>
                )}

                {/* Glass Rod Progress Indicator */}
                {generating && (
                    <div className="glass-rod-loader" style={{ marginBottom: '1.5rem', position: 'relative', height: '4rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="mono-data" style={{ fontSize: '0.85rem', color: 'var(--accent-amber)', zIndex: 2 }}>
                            TRANSMITTING DATASET THROUGH HEURISTIC RISK MATRIX...
                        </span>
                    </div>
                )}

                {/* Grid Container */}
                <div className="risk-scan-container" style={{ position: 'relative', minHeight: '300px' }}>
                    {isScanning && <div className="risk-scan-overlay" />}

                    {loading ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            Loading municipal risk records...
                        </div>
                    ) : insights.length === 0 ? (
                        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No generated insights available. Click "Run Risk Analysis Engine" above to trigger initial analysis.
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
                                                    Recommended Action
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
