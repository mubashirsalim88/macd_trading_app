// frontend/src/components/RuleBuilder.jsx
import { useState, useEffect } from 'react';
import { getRules, saveRule } from '../apiService';
import { TIME_FRAMES, OPERATORS, MACD_VALUES, MACD_PARAMS_OPTIONS } from '../config';

// Reusable component for selecting an indicator
const OperandSelector = ({ value, onChange }) => (
  <div className="flex flex-col space-y-2 p-2 border rounded bg-gray-50">
    <select value={value.timeframe} onChange={e => onChange({ ...value, timeframe: e.target.value })} className="p-2 border rounded">
      {TIME_FRAMES.map(tf => <option key={tf} value={tf}>{tf}</option>)}
    </select>
    <select value={value.params.join(',')} onChange={e => onChange({ ...value, params: e.target.value.split(',').map(Number) })} className="p-2 border rounded">
      {MACD_PARAMS_OPTIONS.map(p => <option key={p.join(',')} value={p.join(',')}>{p.join(',')}</option>)}
    </select>
    <select value={value.value} onChange={e => onChange({ ...value, value: e.target.value })} className="p-2 border rounded">
      {MACD_VALUES.map(v => <option key={v} value={v}>{v}</option>)}
    </select>
  </div>
);

// The Main Rule Builder Component
function RuleBuilder() {
  const [rules, setRules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [ruleName, setRuleName] = useState('');
  const [signal, setSignal] = useState('');
  const [op1, setOp1] = useState({ type: 'indicator', source: 'macd', timeframe: '1m', params: [12, 26, 9], value: 'macd_line', offset: 0 });
  const [operator, setOperator] = useState('>');
  const [op2, setOp2] = useState({ type: 'indicator', source: 'macd', timeframe: '1m', params: [12, 26, 9], value: 'signal_line', offset: 0 });

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

  const handleSaveRule = async (e) => {
    e.preventDefault();
    const ruleJSON = {
      name: ruleName,
      signal: signal,
      groups: [{
        group_operator: "AND",
        conditions: [{ operand1: op1, operator: operator, operand2: op2 }]
      }]
    };

    try {
      await saveRule(ruleJSON);
      alert('Rule saved successfully!');
      setRuleName('');
      setSignal('');
      fetchRules(); // Refresh the list
    } catch (error) {
      console.error("Failed to save rule:", error);
      alert('Failed to save rule.');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Logic Rule Builder</h1>
      <form onSubmit={handleSaveRule} className="bg-white shadow-md rounded-lg p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <input type="text" placeholder="Rule Name (e.g., My BTC Rule)" value={ruleName} onChange={e => setRuleName(e.target.value)} required className="p-2 border rounded" />
          <input type="text" placeholder="Signal on Trigger (e.g., BTC_CROSS_BUY)" value={signal} onChange={e => setSignal(e.target.value)} required className="p-2 border rounded" />
        </div>

        <h3 className="text-lg font-semibold mb-2">Condition:</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          <OperandSelector value={op1} onChange={setOp1} />
          <select value={operator} onChange={e => setOperator(e.target.value)} className="p-2 border rounded self-center">
            {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
          </select>
          <OperandSelector value={op2} onChange={setOp2} />
        </div>

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