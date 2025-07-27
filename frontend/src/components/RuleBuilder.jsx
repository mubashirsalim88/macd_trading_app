import { useState, useEffect } from 'react';
import { getRules, saveRule, updateRule, deleteRule, getConfig } from '../apiService';

// A small helper for the "X" icon
const CloseIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
);

const defaultLiteral = { type: 'literal', value: 0 };

const AdvancedOperandSelector = ({ value, onChange, config }) => {
    if (!value || !config) {
        return <div className="p-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-dark-primary)] animate-pulse h-52"></div>;
    }

    const isIndicator = value.type === 'indicator';

    const handleTypeChange = (e) => {
        const newType = e.target.value;
        if (newType === 'indicator') {
            const defaultTimeframe = config.timeframes[0];
            const defaultParams = config.macdParamsByTimeframe[defaultTimeframe][0];
            onChange({ type: 'indicator', source: 'macd', timeframe: defaultTimeframe, params: defaultParams, value: 'macd_line', offset: 0 });
        } else {
            onChange(defaultLiteral);
        }
    };

    const handleTimeframeChange = (e) => {
        const newTimeframe = e.target.value;
        const newParams = config.macdParamsByTimeframe[newTimeframe][0];
        onChange({ ...value, timeframe: newTimeframe, params: newParams });
    };

    const currentParams = config.macdParamsByTimeframe[value.timeframe] || [];
    const baseInputStyle = "w-full p-2 bg-[var(--bg-dark-primary)] border border-[var(--border-color)] rounded-md focus:ring-2 focus:ring-[var(--accent-primary)]";

    return (
        <div className="flex flex-col space-y-3 p-3 border border-[var(--border-color)] rounded-lg bg-[var(--bg-dark-primary)]">
            <select value={value.type} onChange={handleTypeChange} className={`${baseInputStyle} font-semibold`}>
                <option value="indicator">Indicator</option>
                <option value="literal">Number</option>
            </select>
            {isIndicator ? (
                <>
                    <select value={value.timeframe} onChange={handleTimeframeChange} className={baseInputStyle}>
                        {config.timeframes.map(tf => <option key={tf} value={tf}>{tf}</option>)}
                    </select>
                    <select value={value.params.join(',')} onChange={e => onChange({ ...value, params: e.target.value.split(',').map(Number) })} className={baseInputStyle}>
                        {currentParams.map(p => <option key={p.join(',')} value={p.join(',')}>{p.join(',')}</option>)}
                    </select>
                    <select value={value.value} onChange={e => onChange({ ...value, value: e.target.value })} className={baseInputStyle}>
                        {config.macdValues.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <select value={value.offset} onChange={e => onChange({ ...value, offset: parseInt(e.target.value, 10) })} className={baseInputStyle}>
                        <option value={0}>Current Candle</option>
                        <option value={-1}>Previous Candle (PAST1)</option>
                        <option value={-2}>2 Candles Ago (PAST2)</option>
                    </select>
                </>
            ) : (
                <input type="number" step="any" value={value.value} onChange={e => onChange({ ...value, value: parseFloat(e.target.value) || 0 })} className={baseInputStyle} placeholder="Enter a number" />
            )}
        </div>
    );
};

function RuleBuilder() {
    const [rules, setRules] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [appConfig, setAppConfig] = useState(null);

    // ✅ State to control the visibility of the create/edit form
    const [isFormVisible, setIsFormVisible] = useState(false);

    const [ruleName, setRuleName] = useState('');
    const [signal, setSignal] = useState('');
    const [conditions, setConditions] = useState([]);
    const [editingRuleId, setEditingRuleId] = useState(null);

    const resetForm = (config) => {
        const targetConfig = config || appConfig;
        setRuleName('');
        setSignal('');
        setEditingRuleId(null);
        if (targetConfig) {
            const defaultTimeframe = targetConfig.timeframes[0];
            const defaultParams = targetConfig.macdParamsByTimeframe[defaultTimeframe][0];
            const defaultIndicator = { type: 'indicator', source: 'macd', timeframe: defaultTimeframe, params: defaultParams, value: 'macd_line', offset: 0 };
            setConditions([{
                operand1: { ...defaultIndicator },
                operator: targetConfig.operators[0],
                operand2: { ...defaultIndicator, value: 'signal_line' }
            }]);
        }
    };

    const handleAddNewClick = () => {
        resetForm(appConfig);
        setIsFormVisible(true);
    };
    
    const handleEditClick = (rule) => {
        setEditingRuleId(rule.id);
        setRuleName(rule.name);
        setSignal(rule.signal);
        setConditions(rule.conditions);
        setIsFormVisible(true);
    };

    const handleCancel = () => {
        resetForm(appConfig);
        setIsFormVisible(false);
    };

    const fetchInitialData = async () => {
        setIsLoading(true);
        try {
            const [configRes, rulesRes] = await Promise.all([getConfig(), getRules()]);
            setAppConfig(configRes.data);
            setRules(rulesRes.data);
            resetForm(configRes.data);
        } catch (error) {
            console.error("Failed to fetch initial data:", error);
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchRules = async () => {
        try {
            const response = await getRules();
            setRules(response.data);
        } catch (error) { console.error("Failed to fetch rules:", error); }
    };
    
    const handleTelegramToggle = async (ruleToUpdate) => {
        const updatedRule = { ...ruleToUpdate, telegram_enabled: !ruleToUpdate.telegram_enabled };
        setRules(currentRules => currentRules.map(r => r.id === updatedRule.id ? updatedRule : r));
        try {
            await updateRule(ruleToUpdate.id, updatedRule);
        } catch (error) {
            console.error("Failed to update Telegram toggle:", error);
            setRules(currentRules => currentRules.map(r => r.id === ruleToUpdate.id ? ruleToUpdate : r));
            alert("Error updating rule. Please try again.");
        }
    };

    const handleConditionChange = (index, part, newValue) => {
        setConditions(conditions.map((c, i) => i === index ? { ...c, [part]: newValue } : c));
    };

    const addCondition = () => {
        const defaultTimeframe = appConfig.timeframes[0];
        const defaultParams = appConfig.macdParamsByTimeframe[defaultTimeframe][0];
        const defaultIndicator = { type: 'indicator', source: 'macd', timeframe: defaultTimeframe, params: defaultParams, value: 'macd_line', offset: 0 };
        setConditions([...conditions, { operand1: defaultIndicator, operator: appConfig.operators[0], operand2: defaultLiteral }]);
    };
    
    const removeCondition = (index) => setConditions(conditions.filter((_, i) => i !== index));

    const handleDelete = async (ruleId) => {
        if (window.confirm("Are you sure you want to permanently delete this rule?")) {
            try {
                await deleteRule(ruleId);
                fetchRules();
            } catch (error) { console.error("Failed to delete rule:", error); }
        }
    };

    const handleSaveOrUpdateRule = async (e) => {
        e.preventDefault();
        const ruleJSON = {
            name: ruleName,
            signal: signal,
            conditions: conditions,
            telegram_enabled: rules.find(r => r.id === editingRuleId)?.telegram_enabled || false
        };

        try {
            if (editingRuleId) {
                await updateRule(editingRuleId, ruleJSON);
            } else {
                await saveRule(ruleJSON);
            }
            await fetchRules(); // Re-fetch all rules to ensure UI is in sync
            setIsFormVisible(false); // Hide form on successful save/update
        } catch (error) {
            console.error("Failed to save/update rule:", error);
            alert("Failed to save rule. Check console for errors.");
        }
    };

    if (isLoading || !appConfig) {
        return <div className="container mx-auto p-4 text-center text-[var(--text-secondary)]">Loading Logic Engine...</div>;
    }

    return (
        <div className="container mx-auto p-4 md:p-6">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-extrabold text-white">Logic Engine</h1>
                {!isFormVisible && (
                    <button onClick={handleAddNewClick} className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white font-bold py-2 px-4 rounded-lg shadow-lg transition-colors">
                        + Create New Logic
                    </button>
                )}
            </div>

            {isFormVisible && (
                <div className="bg-[var(--bg-dark-secondary)] border border-[var(--border-color)] rounded-xl p-6 mb-8 shadow-2xl">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold">{editingRuleId ? 'Edit Logic' : 'Create New Logic'}</h2>
                        <button onClick={handleCancel} className="text-[var(--text-secondary)] hover:text-white"><CloseIcon /></button>
                    </div>
                    
                    <form onSubmit={handleSaveOrUpdateRule}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <input type="text" placeholder="Rule Name (e.g., L33BC Rule)" value={ruleName} onChange={e => setRuleName(e.target.value)} required className="p-3 bg-[var(--bg-dark-primary)] border border-[var(--border-color)] rounded-md focus:ring-2 focus:ring-[var(--accent-primary)]" />
                            <input type="text" placeholder="Signal on Trigger (e.g., L33BC_BUY)" value={signal} onChange={e => setSignal(e.target.value)} required className="p-3 bg-[var(--bg-dark-primary)] border border-[var(--border-color)] rounded-md focus:ring-2 focus:ring-[var(--accent-primary)]" />
                        </div>

                        <h3 className="text-lg font-semibold mb-2 text-gray-300">Conditions (All must be TRUE)</h3>
                        <div className="space-y-4">
                            {conditions.map((cond, index) => (
                                <div key={index} className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr_auto] gap-4 items-center bg-[var(--bg-dark-secondary)] p-4 rounded-lg border border-[var(--border-color)]">
                                    <AdvancedOperandSelector value={cond.operand1} onChange={(val) => handleConditionChange(index, 'operand1', val)} config={appConfig} />
                                    <select value={cond.operator} onChange={(e) => handleConditionChange(index, 'operator', e.target.value)} className="w-full lg:w-auto p-3 bg-[var(--bg-dark-primary)] border border-[var(--border-color)] rounded-md focus:ring-2 focus:ring-[var(--accent-primary)] font-mono text-lg">
                                        {appConfig.operators.map(op => <option key={op} value={op}>{op}</option>)}
                                    </select>
                                    <AdvancedOperandSelector value={cond.operand2} onChange={(val) => handleConditionChange(index, 'operand2', val)} config={appConfig} />
                                    <button type="button" onClick={() => removeCondition(index)} className="bg-red-600/20 text-red-400 p-2 rounded-full hover:bg-red-500 hover:text-white transition-colors self-center">
                                        <CloseIcon />
                                    </button>
                                </div>
                            ))}
                        </div>
                        
                        <button type="button" onClick={addCondition} className="mt-4 text-sm text-[var(--accent-primary)] hover:underline">
                            + Add Condition
                        </button>

                        <div className="flex items-center mt-6 border-t border-[var(--border-color)] pt-6 space-x-4">
                            <button type="submit" className="flex-grow bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white font-bold py-3 px-4 rounded-lg shadow-lg transition-colors">
                                {editingRuleId ? 'Update Rule' : 'Save New Rule'}
                            </button>
                            <button type="button" onClick={handleCancel} className="flex-grow bg-[var(--bg-dark-secondary)] border border-[var(--border-color)] hover:bg-[var(--border-color)] text-[var(--text-secondary)] hover:text-white font-bold py-3 px-4 rounded-lg transition-colors">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}
            
            <div className="bg-[var(--bg-dark-secondary)] border border-[var(--border-color)] rounded-xl shadow-lg">
                <h3 className="text-xl font-bold p-4 border-b border-[var(--border-color)]">Saved Logic Library</h3>
                {rules.length === 0 ? <p className="p-4 text-[var(--text-secondary)]">No logic saved yet. Click 'Create New Logic' to begin.</p> :
                    <ul>
                        {rules.map(rule => (
                            <li key={rule.id} className="border-b border-[var(--border-color)] p-4 flex justify-between items-center hover:bg-[var(--bg-dark-primary)] transition-colors">
                                <div>
                                    <span className="font-bold text-lg text-white">{rule.name}</span>
                                    <span className="ml-2 text-sm font-mono bg-gray-700/50 text-gray-300 px-2 py-1 rounded">{rule.signal}</span>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <label htmlFor={`telegram-${rule.id}`} className="flex items-center cursor-pointer">
                                        <span className="mr-3 text-sm text-[var(--text-secondary)]">Telegram Alert</span>
                                        <div className="relative">
                                            <input type="checkbox" id={`telegram-${rule.id}`} className="sr-only" checked={!!rule.telegram_enabled} onChange={() => handleTelegramToggle(rule)}/>
                                            <div className="block bg-gray-600 w-10 h-6 rounded-full"></div>
                                            <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full"></div>
                                        </div>
                                    </label>
                                    <button onClick={() => handleEditClick(rule)} className="text-blue-400 hover:text-blue-300 font-semibold">Edit</button>
                                    <button onClick={() => handleDelete(rule.id)} className="text-red-500 hover:text-red-400 font-semibold">Delete</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                }
            </div>
        </div>
    );
}

export default RuleBuilder;