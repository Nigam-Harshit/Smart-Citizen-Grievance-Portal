import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import API from '../../utils/api';

const SmartInsight = () => {
    const [insights, setInsights] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

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
        try {
            const { data } = await API.post('/api/grievances/insights/generate');
            setInsights(data);
        } catch (err) {
            console.error('Error generating escalation insights:', err);
            alert(err.response?.data?.message || 'Error generating insights');
        } finally {
            setGenerating(false);
        }
    };

    const getRiskColor = (score) => {
        if (score === 'High') return { border: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', badge: '#ef4444' };
        if (score === 'Medium') return { border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', badge: '#f59e0b' };
        return { border: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)', badge: '#22c55e' };
    };

    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <div className="main-content" style={{ flex: 1, padding: '2rem', minHeight: '100vh', background: 'var(--bg-primary)' }}>
                <Topbar title="AI Escalation Risk Engine" />

                <div className="glass-card" style={{
                    padding: '2rem',
                    borderRadius: '16px',
                    marginBottom: '2rem',
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(99, 102, 241, 0.08))',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <h2 style={{ margin: '0 0 0.5rem 0', color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span>✨</span> Predictive Civic Escalation Risk Engine
                        </h2>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                            Automatically scans citizen ticket histories, unresolved critical issues, and SLA breach ages to evaluate escalation risk.
                        </p>
                    </div>
                    <button
                        onClick={handleRunAnalysis}
                        disabled={generating}
                        style={{
                            padding: '0.8rem 1.8rem',
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg, #f59e0b, #6366f1)',
                            border: 'none',
                            color: 'white',
                            fontWeight: 'bold',
                            cursor: generating ? 'not-allowed' : 'pointer',
                            boxShadow: '0 8px 20px rgba(245, 158, 11, 0.3)',
                            fontSize: '0.95rem'
                        }}
                    >
                        {generating ? 'Running Model Analysis...' : '⚡ Run Risk Analysis Model'}
                    </button>
                </div>

                {loading ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Analyzing citizen escalation patterns...</div>
                ) : insights.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No generated insights available. Click "Run Risk Analysis Model" above to trigger initial analysis.
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
                        {insights.map(item => {
                            const citizen = item.citizenId || {};
                            const color = getRiskColor(item.riskScore);

                            return (
                                <div key={item._id} className="glass-card" style={{
                                    padding: '1.5rem',
                                    borderRadius: '14px',
                                    borderLeft: `4px solid ${color.border}`,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between'
                                }}>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                            <div>
                                                <h3 style={{ margin: 0, color: 'white', fontSize: '1.1rem' }}>{citizen.name || 'Citizen Record'}</h3>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{citizen.email || 'N/A'}</div>
                                            </div>
                                            <span style={{
                                                padding: '0.25rem 0.7rem',
                                                borderRadius: '12px',
                                                fontSize: '0.75rem',
                                                fontWeight: 'bold',
                                                background: color.bg,
                                                color: color.badge,
                                                textTransform: 'uppercase'
                                            }}>
                                                {item.riskScore} Risk
                                            </span>
                                        </div>

                                        <div style={{ marginBottom: '1rem' }}>
                                            <div style={{ fontSize: '0.75rem', color: '#818cf8', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                                                AI Recommended Action
                                            </div>
                                            <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.88rem', lineHeight: '1.5' }}>
                                                {item.recommendation}
                                            </p>
                                        </div>

                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                                                Identified Risk Triggers
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                                {item.riskFactors?.map((rf, idx) => (
                                                    <span key={idx} style={{
                                                        padding: '0.15rem 0.5rem',
                                                        borderRadius: '6px',
                                                        fontSize: '0.75rem',
                                                        background: 'rgba(255,255,255,0.06)',
                                                        color: 'var(--text-secondary)',
                                                        border: '1px solid rgba(255,255,255,0.1)'
                                                    }}>
                                                        • {rf}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '1.2rem', paddingTop: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Generated: {new Date(item.generatedAt || item.updatedAt).toLocaleTimeString()}</span>
                                        <span>Jurisdiction: Active</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SmartInsight;
