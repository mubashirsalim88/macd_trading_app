// frontend/src/components/Dashboard.jsx

import { useState, useEffect } from 'react';
import { getSignals, getRules } from '../apiService';

// A small SVG component for the refresh spinner
const RefreshSpinner = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

function Dashboard() {
    const [signals, setSignals] = useState([]);
    const [rules, setRules] = useState([]);
    const [initialLoading, setInitialLoading] = useState(true);
    // ✅ NEW: State for the silent refresh indicator
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    const [activeRuleFilter, setActiveRuleFilter] = useState('all');
    const [showNoSignal, setShowNoSignal] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    useEffect(() => {
        const fetchAllData = async () => {
            // Only use the main loading state on the very first run
            if (!initialLoading) {
                setIsRefreshing(true);
            }

            try {
                const [signalsResponse, rulesResponse] = await Promise.all([getSignals(), getRules()]);
                const signalsArray = Object.entries(signalsResponse.data).map(([symbol, data]) => ({
                    symbol,
                    signal: data.signal,
                    rule_name: data.rule_name,
                }));
                setSignals(signalsArray);
                setRules(rulesResponse.data);
                setLastUpdated(new Date());
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                if (initialLoading) setInitialLoading(false);
                setIsRefreshing(false);
            }
        };

        fetchAllData();
        const interval = setInterval(fetchAllData, 15000);
        return () => clearInterval(interval);
    }, []); // This dependency array is intentionally empty to control loading states manually

    const filteredSignals = signals.filter(s => {
        const ruleMatch = activeRuleFilter === 'all' || s.rule_name === activeRuleFilter;
        const signalMatch = showNoSignal || s.signal !== 'NO_SIGNAL';
        return ruleMatch && signalMatch;
    });

    if (initialLoading) {
        return <p className="text-center text-[var(--text-secondary)] mt-20 text-lg">Initializing Signal Matrix...</p>;
    }

    return (
        <div className="container mx-auto p-4 md:p-6">
            <div className="text-center mb-6">
                <h1 className="text-4xl font-extrabold text-white">Signal Dashboard</h1>
                <div className="flex items-center justify-center mt-2 text-[var(--text-secondary)]">
                    {isRefreshing && <RefreshSpinner />}
                    <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
                </div>
            </div>

            {/* ✅ REDESIGNED FILTER BAR */}
            <div className="bg-[var(--bg-dark-secondary)] border border-[var(--border-color)] p-4 rounded-xl shadow-lg mb-8">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center flex-wrap gap-2">
                        <span className="font-semibold text-gray-300 mr-2">Filter by Logic:</span>
                        <button 
                            onClick={() => setActiveRuleFilter('all')}
                            className={`px-3 py-1 text-sm font-medium rounded-full transition-colors ${activeRuleFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-[var(--bg-dark-primary)] hover:bg-gray-700'}`}>
                            All Signals
                        </button>
                        {rules.map(rule => (
                            <button 
                                key={rule.id}
                                onClick={() => setActiveRuleFilter(rule.name)}
                                className={`px-3 py-1 text-sm font-medium rounded-full transition-colors ${activeRuleFilter === rule.name ? 'bg-blue-600 text-white' : 'bg-[var(--bg-dark-primary)] hover:bg-gray-700'}`}>
                                {rule.name}
                            </button>
                        ))}
                    </div>

                    <label htmlFor="showNoSignal" className="flex items-center cursor-pointer">
                        <span className="mr-3 text-sm text-[var(--text-secondary)]">Show 'NO_SIGNAL'</span>
                        <div className="relative">
                            <input type="checkbox" id="showNoSignal" className="sr-only" checked={showNoSignal} onChange={e => setShowNoSignal(e.target.checked)} />
                            <div className="block bg-gray-600 w-10 h-6 rounded-full"></div>
                            <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full"></div>
                        </div>
                    </label>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                {filteredSignals.map(({ symbol, signal, rule_name }) => {
                    const isBuy = signal.includes('BUY');
                    const isSell = signal.includes('SELL');
                    const signalColorClass = isBuy ? 'text-[var(--accent-buy)]' : isSell ? 'text-[var(--accent-sell)]' : 'text-[var(--text-secondary)]';
                    const signalBgClass = isBuy ? 'bg-[var(--accent-buy-bg)]' : isSell ? 'bg-[var(--accent-sell-bg)]' : 'bg-gray-700/20';
                    const borderColorClass = isBuy ? 'border-[var(--accent-buy)]' : isSell ? 'border-[var(--accent-sell)]' : 'border-[var(--border-color)]';
                    
                    return (
                        <div key={symbol} className={`bg-[var(--bg-dark-secondary)] rounded-lg shadow-xl border-l-4 ${borderColorClass} p-5 flex flex-col justify-between transition-transform transform hover:scale-105`}>
                            <div>
                                <div className="font-bold text-2xl text-white mb-2">{symbol}</div>
                                <div className={`font-semibold text-lg ${signalColorClass} mb-3`}>{signal}</div>
                            </div>
                            <div className={`text-xs text-right text-[var(--text-secondary)] italic p-2 rounded-md ${signalBgClass}`}>
                                {rule_name || 'N/A'}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default Dashboard;