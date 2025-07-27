// frontend/src/components/RuleBuilder.jsx
import { useState, useEffect } from 'react';
import { getRules, saveRule } from '../apiService';
import { TIME_FRAMES, OPERATORS, MACD_VALUES, MACD_PARAMS_OPTIONS } from '../config';

const defaultIndicator = { type: 'indicator', source: 'macd', timeframe: '1m', params: [12, 26, 9], value: 'macd_line', offset: 0 };
const defaultLiteral = { type: 'literal', value: 0 };

const AdvancedOperandSelector = ({ value, onChange }) => {
  // This check prevents a crash if the value prop is temporarily undefined
  if (!value) {
    return <div className="p-2 border rounded bg-gray-200 animate-pulse"></div>;
  }

  const isIndicator = value.type === 'indicator';

  const handleTypeChange = (e) => {
    const newType = e.target.value;
    if (newType === 'indicator') {
      onChange(defaultIndicator);
    } else {
      onChange(defaultLiteral);
    }
  };

  return (
    <div className="flex flex-col space-y-2 p-2 border rounded bg-gray-50">
      <select value={value.type} onChange={handleTypeChange} className="p-2 border rounded font-semibold">
        <option value="indicator">Indicator</option>
        <option value="literal">Number</option>
      </select>

      {isIndicator ? (
        <>
          <select value={value.timeframe} onChange={e => onChange({ ...value, timeframe: e.target.value })} className="p-2 border rounded">
            {TIME_FRAMES.map(tf => <option key={tf} value={tf}>{tf}</option>)}
          </select>
          <select value={value.params.join(',')} onChange={e => onChange({ ...value, params: e.target.value.split(',').map(Number) })} className="p-2 border rounded">
            {MACD_PARAMS_OPTIONS.map(p => <option key={p.join(',')} value={p.join(',')}>{p.join(',')}</option>)}
          </select>
          <select value={value.value} onChange={e => onChange({ ...value, value: e.target.value })} className="p-2 border rounded">
            {MACD_VALUES.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={value.offset} onChange={e => onChange({ ...value, offset: parseInt(e.target.value, 10) })} className="p-2 border rounded">
            <option value={0}>Current Candle</option>
            <option value={-1}>Previous Candle (PAST1)</option>
            <option value={-2}>2 Candles Ago (PAST2)</option>
          </select>
        </>
      ) : (
        <input 
          type="number"
          step="any"
          value={value.value}
          onChange={e => onChange({ ...value, value: parseFloat(e.target.value) || 0 })}
          className="p-2 border rounded"
          placeholder="Enter a number"
        />
      )}
    </div>
  );
};

function RuleBuilder() {
  const [rules, setRules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [ruleName, setRuleName] = useState('');
  const [signal, setSignal] = useState('');
  
  // ✅ THIS LINE IS THE FIX for the crash
  const [conditions, setConditions] = useState([
    {
      operand1: { ...defaultIndicator },
      operator: '>',
      operand2: { ...defaultIndicator, value: 'signal_line' }
    }
  ]);

  const fetchRules = async () => {
    setIsLoading(true);
    try {
      const response = await getRules();
      setRules(response.data);
    } catch (error) {
      console.error("Failed to fetch rules:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleConditionChange = (index, part, newValue) => {
    const newConditions = [...conditions];
    newConditions[index][part] = newValue;
    setConditions(newConditions);
  };

  const addCondition = () => {
    setConditions([...conditions, {
      operand1: defaultIndicator,
      operator: '>',
      operand2: defaultLiteral
    }]);
  };
  
  const removeCondition = (index) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const handleSaveRule = async (e) => {
    e.preventDefault();
    const ruleJSON = {
      name: ruleName,
      signal: signal,
      conditions: conditions.map(c => ({
        operand1: c.operand1,
        operator: c.operator,
        operand2: c.operand2
      }))
    };

    try {
      await saveRule(ruleJSON);
      alert('Rule saved successfully!');
      setRuleName('');
      setSignal('');
      setConditions([ // Reset to a single, default condition
        {
          operand1: { ...defaultIndicator },
          operator: '>',
          operand2: { ...defaultIndicator, value: 'signal_line' }
        }
      ]);
      fetchRules();
    } catch (error) {
      console.error("Failed to save rule:", error);
      alert('Failed to save rule.');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Advanced Logic Builder</h1>
      <form onSubmit={handleSaveRule} className="bg-white shadow-md rounded-lg p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <input type="text" placeholder="Rule Name (e.g., L33BC Rule)" value={ruleName} onChange={e => setRuleName(e.target.value)} required className="p-2 border rounded" />
          <input type="text" placeholder="Signal on Trigger (e.g., L33BC(BUY))" value={signal} onChange={e => setSignal(e.target.value)} required className="p-2 border rounded" />
        </div>

        <h3 className="text-lg font-semibold mb-2">Conditions (All must be TRUE)</h3>
        {conditions.map((cond, index) => (
          <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start border-t pt-4 mt-4">
            <AdvancedOperandSelector value={cond.operand1} onChange={(val) => handleConditionChange(index, 'operand1', val)} />
            <select value={cond.operator} onChange={(e) => handleConditionChange(index, 'operator', e.target.value)} className="p-2 border rounded self-center">
              {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
            </select>
            <AdvancedOperandSelector value={cond.operand2} onChange={(val) => handleConditionChange(index, 'operand2', val)} />
            <button type="button" onClick={() => removeCondition(index)} className="bg-red-500 text-white p-2 rounded self-center hover:bg-red-600">Remove</button>
          </div>
        ))}
        
        <button type="button" onClick={addCondition} className="mt-4 bg-gray-200 text-gray-800 p-2 rounded hover:bg-gray-300">
          + Add Condition
        </button>

        <button type="submit" className="mt-6 w-full bg-blue-500 text-white p-3 rounded font-semibold hover:bg-blue-600">
          Save New Rule
        </button>
      </form>

      <h2 className="text-xl font-bold mb-4">Saved Rules</h2>
      <div className="bg-white shadow-md rounded-lg p-4">
        {isLoading ? <p>Loading rules...</p> :
          <ul>
            {rules.map(rule => <li key={rule.id} className="border-b p-2">{rule.name} ({rule.signal})</li>)}
          </ul>
        }
      </div>
    </div>
  );
}

export default RuleBuilder;