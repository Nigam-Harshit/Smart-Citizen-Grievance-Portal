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
            // Use canonical risk-analysis endpoint with fallback to legacy alias
            let res;
            try {
                res = await API.get('/api/grievances/risk-analysis');
            } catch (fallbackErr) {
                res = await API.get('/api/grievances/insights');
            }
            setInsights(res.data);
        } catch (err) {
            console.error('Error fetching complaint risk analysis:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRunAnalysis = async () => {
        setGenerating(true);
        setIsScanning(true);
        try {
            let res;
            try {
                res = await API.post('/api/grievances/risk-analysis/generate');
            } catch (fallbackErr) {
                res = await API.post('/api/grievances/insights/generate');
            }
            setTimeout(() => {
                setInsights(res.data);
                setGenerating(false);
                setTimeout(() => setIsScanning(false), 1200);
            }, 600);
        } catch (err) {
            console.error('Error generating risk analysis:', err);
            alert(err.response?.data?.message || 'Error generating complaint risk analysis');
            setGenerating(false);
            setIsScanning(false);
        }
    };

    const getRiskBadge = (numericScore, riskLabel) => {
        const score = typeof numericScore === 'number' ? numericScore : null;
        const label = riskLabel || (score >= 80 ? 'Critical' : score >= 60 ? 'High' : score >= 35 ? 'Medium' : 'Low');

        if (label === 'Critical' || (score !== null && score >= 80)) {
            return {
                border: 'var(--signal-red)',
                bg: 'rgba(192, 67, 59, 0.15)',
                text: 'var(--signal-red)',
                label: `CRITICAL (${score !== null ? `${score}/100` : 'HIGH RISK'})`
            };
        }
        if (label === 'High' || (score !== null && score >= 60)) {
            return {
                border: '#e11d48',
                bg: 'rgba(225, 29, 72, 0.15)',
                text: '#e11d48',
                label: `HIGH (${score !== null ? `${score}/100` : 'HIGH RISK'})`
            };
        }
        if (label === 'Medium' || (score !== null && score >= 35)) {
            return {
                border: 'var(--accent-amber)',
                bg: 'var(--accent-amber-dim)',
                text: 'var(--accent-amber)',
                label: `MEDIUM (${score !== null ? `${score}/100` : 'MODERATE'})`
            };
        }
        return {
            border: 'var(--signal-green)',
            bg: 'rgba(79, 157, 110, 0.15)',
            text: 'var(--signal-green)',
            label: `LOW (${score !== null ? `${score}/100` : 'NORMAL'})`
        };
    };

    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <div className="main-content">
                <Topbar title="Complaint Risk Analysis Engine" />

                {/* Hero Panel */}
                <div className="glass-panel" style={{
                    padding: '2rem',
                    borderRadius: '16px',
                    marginBottom: '2rem',
                    background: 'var(--glass-tint)',
                    border: '1px solid var(--glass-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1.5rem',
                    flexWrap: 'wrap'
                }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <h2 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.4rem' }}>
                                <span>⚖️</span> Complaint Risk Analysis Engine
                            </h2>
                            <button
                                onClick={() => setShowExplainer(!showExplainer)}
                                className="btn-municipal-glass"
                                style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', borderRadius: '12px', marginBottom: '0.4rem', cursor: 'pointer' }}
                            >
                                ℹ️ Deterministic Scoring Methodology
                            </button>
                        </div>
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '720px', lineHeight: '1.5' }}>
                            Transparent rule-based heuristic scoring engine combining 6 operational complaint indicators: Complaint Age, Priority Level, Municipal Category, Assignment Status, Citizen Follow-ups, and Expected Resolution Target Proximity.
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
                        {generating ? 'Calculating Heuristic Risk...' : '⚖️ Run Risk Analysis Engine'}
                    </button>
                </div>

                {/* Explainer Modal / Methodology Drawer */}
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
                                📐 6 Deterministic Heuristic Indicators (Rule-Based, Non-ML)
                            </h4>
                            <button onClick={() => setShowExplainer(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
                        </div>

                        <p style={{ margin: '0 0 0.8rem 0', color: 'var(--text-primary)' }}>
                            Every active complaint profile is scored deterministically on a <strong>0–100 numerical scale</strong> across 6 weighted operational parameters:
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.8rem', marginBottom: '1rem' }}>
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.7rem 0.9rem', borderRadius: '8px', borderLeft: '3px solid var(--accent-amber)' }}>
                                <strong>1. Complaint Age:</strong> +5 to +25 pts based on open aging window (24h/48h/72h thresholds).
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.7rem 0.9rem', borderRadius: '8px', borderLeft: '3px solid var(--signal-blue)' }}>
                                <strong>2. Priority Level:</strong> Critical (+30), High (+20), Medium (+10), Low (+0).
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.7rem 0.9rem', borderRadius: '8px', borderLeft: '3px solid var(--signal-green)' }}>
                                <strong>3. Municipal Category:</strong> Essential services (+15), Infrastructure (+10), Standard (+5).
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.7rem 0.9rem', borderRadius: '8px', borderLeft: '3px solid #e11d48' }}>
                                <strong>4. Assignment Status:</strong> Unassigned officer &gt; 12h (+15), awaiting assignment (+5).
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.7rem 0.9rem', borderRadius: '8px', borderLeft: '3px solid #9333ea' }}>
                                <strong>5. Citizen Follow-ups:</strong> +5 pts per citizen timeline inquiry (capped at +20).
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.7rem 0.9rem', borderRadius: '8px', borderLeft: '3px solid var(--signal-red)' }}>
                                <strong>6. Expected Resolution:</strong> Past expected resolution time (+25), deadline imminent (+15).
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.8rem', fontSize: '0.8rem' }}>
                            <div style={{ padding: '0.6rem', borderRadius: '6px', background: 'rgba(192, 67, 59, 0.15)', border: '1px solid var(--signal-red)' }}>
                                <strong style={{ color: 'var(--signal-red)' }}>Critical (80–100):</strong> Immediate emergency dispatch and direct citizen contact.
                            </div>
                            <div style={{ padding: '0.6rem', borderRadius: '6px', background: 'rgba(225, 29, 72, 0.15)', border: '1px solid #e11d48' }}>
                                <strong style={{ color: '#e11d48' }}>High (60–79):</strong> Expected resolution window imminent or delayed. Reassign senior officer.
                            </div>
                            <div style={{ padding: '0.6rem', borderRadius: '6px', background: 'var(--accent-amber-dim)', border: '1px solid var(--accent-amber)' }}>
                                <strong style={{ color: 'var(--accent-amber)' }}>Medium (35–59):</strong> Active inspection pending. Supervise field progress.
                            </div>
                            <div style={{ padding: '0.6rem', borderRadius: '6px', background: 'rgba(79, 157, 110, 0.15)', border: '1px solid var(--signal-green)' }}>
                                <strong style={{ color: 'var(--signal-green)' }}>Low (0–34):</strong> Progressing normally within expected resolution timeframe.
                            </div>
                        </div>
                    </div>
                )}

                {/* Progress Indicator */}
                {generating && (
                    <div className="glass-rod-loader" style={{ marginBottom: '1.5rem', position: 'relative', height: '4rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="mono-data" style={{ fontSize: '0.85rem', color: 'var(--accent-amber)', zIndex: 2 }}>
                            EVALUATING 6 HEURISTIC RISK PARAMETERS ACROSS COMPLAINTS...
                        </span>
                    </div>
                )}

                {/* Grid Container */}
                <div className="risk-scan-container" style={{ position: 'relative', minHeight: '300px' }}>
                    {isScanning && <div className="risk-scan-overlay" />}

                    {loading ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            Loading complaint risk analysis records...
                        </div>
                    ) : insights.length === 0 ? (
                        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No generated risk analyses available. Click "Run Risk Analysis Engine" above to trigger initial evaluation.
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                            {insights.map((item, idx) => {
                                const citizen = item.citizenId || {};
                                const badge = getRiskBadge(item.numericScore, item.riskScore);
                                const reasonsList = item.reasons && item.reasons.length > 0 ? item.reasons : (item.riskFactors || []);

                                return (
                                    <div key={item._id || idx} className="glass-card glass-card-interactive stagger-in" style={{
                                        padding: '1.5rem',
                                        borderRadius: '14px',
                                        borderLeft: `4px solid ${badge.border}`,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between'
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

                                            {/* Recommended Action */}
                                            <div style={{ marginBottom: '1.2rem', padding: '0.75rem', borderRadius: '8px', background: 'rgba(11, 18, 32, 0.4)', border: '1px solid var(--glass-border)' }}>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--accent-amber)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.3rem', letterSpacing: '0.5px' }}>
                                                    Recommended Action
                                                </div>
                                                <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.85rem', lineHeight: '1.5' }}>
                                                    {item.recommendation}
                                                </p>
                                            </div>

                                            {/* Heuristic Reasons Breakdown */}
                                            <div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.5px' }}>
                                                    Contributing Heuristic Factors
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                    {reasonsList.map((reason, rIdx) => (
                                                        <span key={rIdx} style={{
                                                            padding: '0.2rem 0.5rem',
                                                            borderRadius: '6px',
                                                            fontSize: '0.72rem',
                                                            background: 'rgba(148, 163, 184, 0.08)',
                                                            color: 'var(--text-muted)',
                                                            border: '1px solid var(--glass-border)',
                                                            lineHeight: '1.3'
                                                        }}>
                                                            • {reason}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card Footer */}
                                        <div style={{ marginTop: '1.2rem', paddingTop: '0.75rem', borderTop: '1px solid var(--glass-border)', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                                            <span className="mono-data">Computed: {new Date(item.generatedAt || item.updatedAt).toLocaleTimeString()}</span>
                                            <span className="mono-data" style={{ color: 'var(--accent-amber)' }}>
                                                {typeof item.numericScore === 'number' ? `Score: ${item.numericScore}/100` : 'Deterministic'}
                                            </span>
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
