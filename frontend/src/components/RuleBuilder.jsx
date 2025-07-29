// frontend/src/components/RuleBuilder.jsx

import { useState, useEffect, useCallback } from 'react';
import { getRules, saveRule, updateRule, deleteRule, getConfig } from '../apiService';

// --- Helper Icons ---
const CloseIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
);
const Spinner = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

// --- Reusable Components ---
const defaultLiteral = { type: 'literal', value: 0 };

const AdvancedOperandSelector = ({ value, onChange, config }) => {
    if (!value || !config) {
        // IMPROVEMENT: More prominent loading state for operands
        return <div className="p-4 border border-[var(--border-color)] rounded-lg bg-[var(--bg-dark-primary)] animate-pulse h-52 flex items-center justify-center text-[var(--text-secondary)]">
            Loading operand options...
        </div>;
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
                    <select value={value.timeframe} onChange={handleTimeframeChange} className={baseInputStyle}>{config.timeframes.map(tf => <option key={tf} value={tf}>{tf}</option>)}</select>
                    <select value={value.params.join(',')} onChange={e => onChange({ ...value, params: e.target.value.split(',').map(Number) })} className={baseInputStyle}>{currentParams.map(p => <option key={p.join(',')} value={p.join(',')}>{p.join(',')}</option>)}</select>
                    <select value={value.value} onChange={e => onChange({ ...value, value: e.target.value })} className={baseInputStyle}>{config.macdValues.map(v => <option key={v} value={v}>{v}</option>)}</select>
                    <select value={value.offset} onChange={e => onChange({ ...value, offset: parseInt(e.target.value, 10) })} className={baseInputStyle}>
                        <option value={0}>Current Candle</option><option value={-1}>Previous Candle (PAST1)</option><option value={-2}>2 Candles Ago (PAST2)</option>
                    </select>
                </>
            ) : (
                <input type="number" step="any" value={value.value} onChange={e => onChange({ ...value, value: parseFloat(e.target.value) || 0 })} className={baseInputStyle} placeholder="Enter a number" />
            )}
        </div>
    );
};

const Toast = ({ message, show }) => {
    if (!show) return null;
    return (
        <div className="fixed bottom-5 right-5 bg-green-600 text-white py-2 px-4 rounded-lg shadow-lg animate-bounce">
            {message}
        </div>
    );
};

// --- Main Component ---
function RuleBuilder() {
    const [rules, setRules] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [appConfig, setAppConfig] = useState(null);
    const [isFormVisible, setIsFormVisible] = useState(false);

    const [isSaving, setIsSaving] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [deletingId, setDeletingId] = useState(null);

    const [ruleName, setRuleName] = useState('');
    const [signal, setSignal] = useState('');
    const [conditions, setConditions] = useState([]);
    const [editingRuleId, setEditingRuleId] = useState(null);

    const showToast = (message) => {
        setToastMessage(message);
        setTimeout(() => setToastMessage(''), 3000);
    };

    const resetForm = useCallback((config) => {
        const targetConfig = config || appConfig;
        setRuleName('');
        setSignal('');
        setEditingRuleId(null);
        if (targetConfig) {
            const defaultTimeframe = targetConfig.timeframes[0];
            const defaultParams = targetConfig.macdParamsByTimeframe[defaultTimeframe][0];
            const defaultIndicator = { type: 'indicator', source: 'macd', timeframe: defaultTimeframe, params: defaultParams, value: 'macd_line', offset: 0 };
            setConditions([{ operand1: { ...defaultIndicator }, operator: targetConfig.operators[0], operand2: { ...defaultIndicator, value: 'signal_line' } }]);
        }
    }, [appConfig]);

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
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top to see form on mobile
    };

    const handleCancel = () => {
        resetForm(appConfig);
        setIsFormVisible(false);
    };

    useEffect(() => {
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
        fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        }
    };

    const handleConditionChange = (index, part, newValue) => setConditions(conditions.map((c, i) => i === index ? { ...c, [part]: newValue } : c));
    const addCondition = () => {
        const defaultTimeframe = appConfig.timeframes[0];
        const defaultParams = appConfig.macdParamsByTimeframe[defaultTimeframe][0];
        const defaultIndicator = { type: 'indicator', source: 'macd', timeframe: defaultTimeframe, params: defaultParams, value: 'macd_line', offset: 0 };
        setConditions([...conditions, { operand1: defaultIndicator, operator: appConfig.operators[0], operand2: defaultLiteral }]);
    };
    const removeCondition = (index) => setConditions(conditions.filter((_, i) => i !== index));

    const handleDelete = async (ruleId) => {
        if (window.confirm("Are you sure you want to permanently delete this rule?")) {
            setDeletingId(ruleId);
            try {
                await deleteRule(ruleId);
                showToast('Logic deleted successfully!');
                await fetchRules();
            } catch (error) {
                console.error("Failed to delete rule:", error);
                alert("Could not delete rule. Please try again.");
            } finally {
                setDeletingId(null);
            }
        }
    };

    const handleSaveOrUpdateRule = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        const ruleJSON = {
            name: ruleName,
            signal: signal,
            conditions: conditions,
            telegram_enabled: rules.find(r => r.id === editingRuleId)?.telegram_enabled || false
        };
        try {
            if (editingRuleId) {
                await updateRule(editingRuleId, ruleJSON);
                showToast('Logic updated successfully!');
            } else {
                await saveRule(ruleJSON);
                showToast('New logic saved successfully!');
            }
            await fetchRules();
            setIsFormVisible(false);
        } catch (error) {
            console.error("Failed to save/update rule:", error);
            alert("Failed to save rule. Check console for errors.");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading || !appConfig) {
        return <div className="container mx-auto p-4 text-center text-[var(--text-secondary)]">Loading Logic Engine...</div>;
    }

    return (
        <div className="container mx-auto p-4 md:p-6">
            <Toast message={toastMessage} show={!!toastMessage} />
            <div className="flex justify-between items-center mb-8">
                {/* ✅ CHANGED: Responsive text size */}
                <h1 className="text-3xl md:text-4xl font-extrabold text-white">Logic Engine</h1>
                {/* IMPROVEMENT: Hide "Create New Logic" button when form is visible */}
                {!isFormVisible && (
                    <button onClick={handleAddNewClick} className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white font-bold py-2 px-4 rounded-lg shadow-lg transition-colors whitespace-nowrap">
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
                        {/* IMPROVEMENT: Ensure input fields stack nicely on mobile */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <input type="text" placeholder="Rule Name (e.g., L33BC Rule)" value={ruleName} onChange={e => setRuleName(e.target.value)} required className="p-3 bg-[var(--bg-dark-primary)] border border-[var(--border-color)] rounded-md focus:ring-2 focus:ring-[var(--accent-primary)]" />
                            <input type="text" placeholder="Signal on Trigger (e.g., L33BC_BUY)" value={signal} onChange={e => setSignal(e.target.value)} required className="p-3 bg-[var(--bg-dark-primary)] border border-[var(--border-color)] rounded-md focus:ring-2 focus:ring-[var(--accent-primary)]" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2 text-gray-300">Conditions (All must be TRUE)</h3>
                        <div className="space-y-4">{conditions.map((cond, index) => (
                            // ✅ CHANGED: From a complex grid to a responsive flex layout
                            // IMPROVEMENT: Ensure operands and operator stack on mobile, then go horizontal on larger screens
                            <div key={index} className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center bg-[var(--bg-dark-secondary)] p-4 rounded-lg border border-[var(--border-color)]">
                                <AdvancedOperandSelector value={cond.operand1} onChange={(val) => handleConditionChange(index, 'operand1', val)} config={appConfig} />
                                {/* IMPROVEMENT: Operator takes full width on mobile, then auto-width on larger screens */}
                                <select value={cond.operator} onChange={(e) => handleConditionChange(index, 'operator', e.target.value)} className="w-full lg:w-auto p-3 bg-[var(--bg-dark-primary)] border border-[var(--border-color)] rounded-md focus:ring-2 focus:ring-[var(--accent-primary)] font-mono text-lg text-center">
                                    {appConfig.operators.map(op => <option key={op} value={op}>{op}</option>)}
                                </select>
                                <AdvancedOperandSelector value={cond.operand2} onChange={(val) => handleConditionChange(index, 'operand2', val)} config={appConfig} />
                                <button type="button" onClick={() => removeCondition(index)} className="bg-red-600/20 text-red-400 p-2 rounded-full hover:bg-red-500 hover:text-white transition-colors self-center flex-shrink-0"><CloseIcon /></button>
                            </div>
                        ))}</div>
                        <button type="button" onClick={addCondition} className="mt-4 text-sm text-[var(--accent-primary)] hover:underline">+ Add Condition</button>
                        {/* IMPROVEMENT: Buttons stack on mobile, then go side-by-side on small screens+ */}
                        <div className="flex flex-col sm:flex-row items-stretch gap-4 mt-6 border-t border-[var(--border-color)] pt-6">
                            <button type="submit" disabled={isSaving} className="flex-grow bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white font-bold py-3 px-4 rounded-lg shadow-lg transition-colors flex items-center justify-center disabled:opacity-50">
                                {isSaving ? <><Spinner /><span>Saving...</span></> : (editingRuleId ? 'Update Rule' : 'Save New Rule')}
                            </button>
                            <button type="button" onClick={handleCancel} className="flex-grow bg-[var(--bg-dark-secondary)] border border-[var(--border-color)] hover:bg-[var(--border-color)] text-[var(--text-secondary)] hover:text-white font-bold py-3 px-4 rounded-lg transition-colors">Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-[var(--bg-dark-secondary)] border border-[var(--border-color)] rounded-xl shadow-lg">
                <h3 className="text-xl font-bold p-4 border-b border-[var(--border-color)]">Saved Logic Library</h3>
                {rules.length === 0 ? <p className="p-4 text-[var(--text-secondary)]">No logic saved yet. Click 'Create New Logic' to begin.</p> :
                    <ul>{rules.map(rule => (
                        // ✅ CHANGED: Main list item now stacks vertically on mobile
                        <li key={rule.id} className={`border-b border-[var(--border-color)] p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center hover:bg-[var(--bg-dark-primary)] transition-colors ${deletingId === rule.id ? 'opacity-50' : ''}`}>
                            {/* IMPROVEMENT: Ensure rule name and signal stack on mobile */}
                            <div className="mb-2 sm:mb-0 flex flex-col items-start sm:flex-row sm:items-baseline sm:gap-2">
                                <span className="font-bold text-lg text-white break-words">{rule.name}</span>
                                <span className="text-sm font-mono bg-gray-700/50 text-gray-300 px-2 py-1 rounded whitespace-nowrap block sm:inline-block">{rule.signal}</span>
                            </div>
                            {/* IMPROVEMENT: Telegram toggle and action buttons stack on mobile */}
                            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4 mt-4 sm:mt-0">
                                <label htmlFor={`telegram-${rule.id}`} className="flex items-center justify-between cursor-pointer w-full sm:w-auto">
                                    <span className="mr-3 text-sm text-[var(--text-secondary)] whitespace-nowrap">Telegram Alert</span>
                                    <div className="relative">
                                        <input type="checkbox" id={`telegram-${rule.id}`} className="sr-only" checked={!!rule.telegram_enabled} onChange={() => handleTelegramToggle(rule)} disabled={deletingId === rule.id}/>
                                        <div className="block bg-gray-600 w-10 h-6 rounded-full"></div>
                                        <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full"></div>
                                    </div>
                                </label>
                                <button onClick={() => handleEditClick(rule)} className="text-blue-400 hover:text-blue-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap w-full sm:w-auto">Edit</button>
                                <button onClick={() => handleDelete(rule.id)} className="text-red-500 hover:text-red-400 font-semibold disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap w-full sm:w-auto">
                                    {deletingId === rule.id ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </li>
                    ))}</ul>
                }
            </div>
        </div>
    );
}

export default RuleBuilder;