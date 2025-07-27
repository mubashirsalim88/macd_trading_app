// 📄 frontend/src/components/Dashboard.jsx

import { useState, useEffect } from 'react';
// ✅ UPDATED: Import getRules to populate the filter dropdown
import { getSignals, getRules } from '../apiService';

function Dashboard() {
    const [signals, setSignals] = useState([]);
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);

    // ✅ NEW STATE: For managing the filters
    const [activeRuleFilter, setActiveRuleFilter] = useState('all');
    const [showNoSignal, setShowNoSignal] = useState(false);

    useEffect(() => {
        const fetchAllData = async () => {
            // Set loading to true only on the very first fetch
            if (loading) setLoading(true);

            try {
                // Fetch both signals and the list of rules simultaneously
                const [signalsResponse, rulesResponse] = await Promise.all([
                    getSignals(),
                    getRules()
                ]);

                // Transform the signals object into a usable array
                const signalsArray = Object.entries(signalsResponse.data).map(([symbol, data]) => ({
                    symbol,
                    signal: data.signal,
                    rule_name: data.rule_name,
                }));

                setSignals(signalsArray);
                setRules(rulesResponse.data);

            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                if (loading) setLoading(false);
            }
        };

        fetchAllData(); // Initial fetch
        const interval = setInterval(fetchAllData, 15000); // Refresh every 15 seconds

        return () => clearInterval(interval); // Cleanup on component unmount
    }, []); // Run only once on mount

    // ✅ Filter the signals based on the active filters before rendering
    const filteredSignals = signals.filter(s => {
        const ruleMatch = activeRuleFilter === 'all' || s.rule_name === activeRuleFilter;
        const signalMatch = showNoSignal || s.signal !== 'NO_SIGNAL';
        return ruleMatch && signalMatch;
    });

    if (loading) {
        return <p className="text-center text-gray-600 mt-10">Loading signals...</p>;
    }

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
                Real-Time Crypto Signals 📊
            </h1>

            {/* ✅ FILTER CONTROLS */}
            <div className="flex flex-col md:flex-row justify-center items-center space-y-4 md:space-y-0 md:space-x-6 bg-white p-4 rounded-lg shadow-sm mb-6">
                <div className="flex items-center space-x-2">
                    <label htmlFor="ruleFilter" className="font-semibold text-gray-700">Filter by Rule:</label>
                    <select
                        id="ruleFilter"
                        value={activeRuleFilter}
                        onChange={e => setActiveRuleFilter(e.target.value)}
                        className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="all">All Triggered Signals</option>
                        {rules.map(rule => (
                            <option key={rule.id} value={rule.name}>{rule.name}</option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center">
                    <input
                        type="checkbox"
                        id="showNoSignal"
                        checked={showNoSignal}
                        onChange={e => setShowNoSignal(e.target.checked)}
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <label htmlFor="showNoSignal" className="ml-2 block text-sm text-gray-900">
                        Show 'NO_SIGNAL' Tickers
                    </label>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full bg-white shadow-md rounded-lg">
                    <thead>
                        <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
                            <th className="py-3 px-6 text-left">Symbol</th>
                            <th className="py-3 px-6 text-left">Signal</th>
                            {/* ✅ NEW COLUMN: To show which rule was triggered */}
                            <th className="py-3 px-6 text-left">Triggered By</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-600 text-sm font-light">
                        {filteredSignals.map(({ symbol, signal, rule_name }, index) => (
                            <tr
                                key={symbol}
                                className={`border-b border-gray-200 hover:bg-gray-100 ${index % 2 === 0 ? 'bg-gray-50' : ''}`}
                            >
                                <td className="py-3 px-6 text-left whitespace-nowrap font-medium">{symbol}</td>
                                <td className="py-3 px-6 text-left">
                                    <span className={`py-1 px-3 rounded-full text-xs font-semibold ${
                                        signal.includes('BUY') ? 'bg-green-200 text-green-800' :
                                        signal.includes('SELL') ? 'bg-red-200 text-red-800' :
                                        'bg-gray-200 text-gray-800'
                                    }`}>
                                        {signal}
                                    </span>
                                </td>
                                {/* ✅ Render the rule name */}
                                <td className="py-3 px-6 text-left italic text-gray-500">
                                    {rule_name || 'N/A'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default Dashboard;