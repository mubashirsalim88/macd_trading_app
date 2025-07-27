import { useState, useEffect } from 'react';
import { getRules, saveRule, updateRule, deleteRule, getConfig } from '../apiService';

const defaultLiteral = { type: 'literal', value: 0 };

const AdvancedOperandSelector = ({ value, onChange, config }) => {
    if (!value || !config) {
        return <div className="p-2 border rounded bg-gray-200 animate-pulse h-48"></div>;
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

    return (
        <div className="flex flex-col space-y-2 p-2 border rounded bg-gray-50">
            <select value={value.type} onChange={handleTypeChange} className="p-2 border rounded font-semibold">
                <option value="indicator">Indicator</option>
                <option value="literal">Number</option>
            </select>
            {isIndicator ? (
                <>
                    <select value={value.timeframe} onChange={handleTimeframeChange} className="p-2 border rounded">
                        {config.timeframes.map(tf => <option key={tf} value={tf}>{tf}</option>)}
                    </select>
                    <select value={value.params.join(',')} onChange={e => onChange({ ...value, params: e.target.value.split(',').map(Number) })} className="p-2 border rounded">
                        {currentParams.map(p => <option key={p.join(',')} value={p.join(',')}>{p.join(',')}</option>)}
                    </select>
                    <select value={value.value} onChange={e => onChange({ ...value, value: e.target.value })} className="p-2 border rounded">
                        {config.macdValues.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <select value={value.offset} onChange={e => onChange({ ...value, offset: parseInt(e.target.value, 10) })} className="p-2 border rounded">
                        <option value={0}>Current Candle</option>
                        <option value={-1}>Previous Candle (PAST1)</option>
                        <option value={-2}>2 Candles Ago (PAST2)</option>
                    </select>
                </>
            ) : (
                <input type="number" step="any" value={value.value} onChange={e => onChange({ ...value, value: parseFloat(e.target.value) || 0 })} className="p-2 border rounded" placeholder="Enter a number" />
            )}
        </div>
    );
};

function RuleBuilder() {
    const [rules, setRules] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [appConfig, setAppConfig] = useState(null);

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

    const fetchInitialData = async () => {
        setIsLoading(true);
        try {
            const configRes = await getConfig();
            setAppConfig(configRes.data);
            const rulesRes = await getRules();
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
        } catch (error) {
            console.error("Failed to fetch rules:", error);
        }
    };

    const handleTelegramToggle = async (ruleToUpdate) => {
        const updatedRule = {
            ...ruleToUpdate,
            telegram_enabled: !ruleToUpdate.telegram_enabled
        };

        setRules(currentRules =>
            currentRules.map(r => r.id === updatedRule.id ? updatedRule : r)
        );

        try {
            await updateRule(ruleToUpdate.id, updatedRule);
        } catch (error) {
            console.error("Failed to update Telegram toggle:", error);
            setRules(currentRules =>
                currentRules.map(r => r.id === ruleToUpdate.id ? ruleToUpdate : r)
            );
            alert("Error updating rule. Please try again.");
        }
    };

    const handleConditionChange = (index, part, newValue) => {
        const newConditions = [...conditions];
        newConditions[index][part] = newValue;
        setConditions(newConditions);
    };

    const addCondition = () => {
        const defaultTimeframe = appConfig.timeframes[0];
        const defaultParams = appConfig.macdParamsByTimeframe[defaultTimeframe][0];
        const defaultIndicator = { type: 'indicator', source: 'macd', timeframe: defaultTimeframe, params: defaultParams, value: 'macd_line', offset: 0 };
        setConditions([...conditions, { operand1: defaultIndicator, operator: appConfig.operators[0], operand2: defaultLiteral }]);
    };

    const removeCondition = (index) => {
        setConditions(conditions.filter((_, i) => i !== index));
    };

    const handleEdit = (rule) => {
        setEditingRuleId(rule.id);
        setRuleName(rule.name);
        setSignal(rule.signal);
        setConditions(rule.conditions);
    };

    const handleDelete = async (ruleId) => {
        if (window.confirm("Are you sure you want to delete this rule?")) {
            try {
                await deleteRule(ruleId);
                fetchRules();
            } catch (error) {
                console.error("Failed to delete rule:", error);
            }
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
                alert('Rule updated successfully!');
            } else {
                await saveRule(ruleJSON);
                alert('Rule saved successfully!');
            }
            resetForm();
            fetchRules();
        } catch (error) {
            console.error("Failed to save/update rule:", error);
        }
    };

    if (isLoading || !appConfig) {
        return <div className="container mx-auto p-4 text-center">Loading configuration and rules...</div>;
    }

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">{editingRuleId ? 'Edit Logic Rule' : 'Create Logic Rule'}</h1>
            <form onSubmit={handleSaveOrUpdateRule} className="bg-white shadow-md rounded-lg p-6 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <input type="text" placeholder="Rule Name" value={ruleName} onChange={e => setRuleName(e.target.value)} required className="p-2 border rounded" />
                    <input type="text" placeholder="Signal (e.g. BUY)" value={signal} onChange={e => setSignal(e.target.value)} required className="p-2 border rounded" />
                </div>

                <h3 className="text-lg font-semibold mb-2">Conditions</h3>
                {conditions.map((cond, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start border-t pt-4 mt-4">
                        <AdvancedOperandSelector value={cond.operand1} onChange={(val) => handleConditionChange(index, 'operand1', val)} config={appConfig} />
                        <select value={cond.operator} onChange={(e) => handleConditionChange(index, 'operator', e.target.value)} className="p-2 border rounded self-center">
                            {appConfig.operators.map(op => <option key={op} value={op}>{op}</option>)}
                        </select>
                        <AdvancedOperandSelector value={cond.operand2} onChange={(val) => handleConditionChange(index, 'operand2', val)} config={appConfig} />
                        <button type="button" onClick={() => removeCondition(index)} className="bg-red-500 text-white p-2 rounded self-center hover:bg-red-600">Remove</button>
                    </div>
                ))}

                <button type="button" onClick={addCondition} className="mt-4 bg-gray-200 text-gray-800 p-2 rounded hover:bg-gray-300">+ Add Condition</button>

                <div className="flex items-center mt-6 space-x-4">
                    <button type="submit" className="w-full bg-blue-500 text-white p-3 rounded font-semibold hover:bg-blue-600">
                        {editingRuleId ? 'Update Rule' : 'Save New Rule'}
                    </button>
                    {editingRuleId && (
                        <button type="button" onClick={() => resetForm()} className="w-full bg-gray-500 text-white p-3 rounded font-semibold hover:bg-gray-600">Cancel</button>
                    )}
                </div>
            </form>

            <h2 className="text-xl font-bold mb-4">Saved Rules</h2>
            <div className="bg-white shadow-md rounded-lg p-4">
                {rules.length === 0 ? <p>No rules saved yet.</p> :
                    <ul>
                        {rules.map(rule => (
                            <li key={rule.id} className="border-b p-3 flex justify-between items-center">
                                <span className="font-semibold">{rule.name} <span className="font-normal text-gray-600">({rule.signal})</span></span>
                                <div className="flex items-center space-x-4">
                                    <label htmlFor={`telegram-${rule.id}`} className="flex items-center cursor-pointer">
                                        <span className="mr-2 text-sm text-gray-700">Telegram Alert</span>
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                id={`telegram-${rule.id}`}
                                                className="sr-only"
                                                checked={!!rule.telegram_enabled}
                                                onChange={() => handleTelegramToggle(rule)}
                                            />
                                            <div className="block bg-gray-300 w-10 h-6 rounded-full"></div>
                                            <div className={`dot absolute left-1 top-1 w-4 h-4 rounded-full transition-transform ${rule.telegram_enabled ? 'translate-x-full bg-green-500' : 'bg-white'}`}></div>
                                        </div>
                                    </label>
                                    <button onClick={() => handleEdit(rule)} className="bg-yellow-500 text-white py-1 px-3 rounded text-sm hover:bg-yellow-600">Edit</button>
                                    <button onClick={() => handleDelete(rule.id)} className="bg-red-500 text-white py-1 px-3 rounded text-sm hover:bg-red-600">Delete</button>
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
