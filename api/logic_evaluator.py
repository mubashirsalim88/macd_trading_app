# api/logic_evaluator.py
from src.redis_client import get_macd_from_redis
from src.config import CRYPTO_TICKERS
from api.firestore_client import get_all_rules

def get_operand_value(operand, ticker):
    """Recursively resolves the value of an operand."""
    if operand['type'] == 'literal':
        return operand['value']

    if operand['type'] == 'indicator':
        params_dict = {'fast': operand['params'][0], 'slow': operand['params'][1], 'signal': operand['params'][2]}
        redis_data = get_macd_from_redis(ticker, operand['timeframe'], params_dict)
        if not redis_data or len(redis_data) < 3:
            return None
        # offset: 0=CUR, -1=PAST1, -2=PAST2
        return redis_data[operand['offset'] - 1][operand['value']]

    if operand['type'] == 'expression':
        op = operand['operation']
        values = [get_operand_value(op_arg, ticker) for op_arg in operand['operands']]
        
        if any(v is None for v in values):
            return None
        
        try:
            if op == 'abs': return abs(values[0])
            if op == 'divide': return values[0] / values[1] if values[1] != 0 else None
        except Exception:
            return None
    return None

def evaluate_single_rule(rule, ticker):
    """Evaluates a full rule with all its conditions for a given ticker."""
    
    # ✅ THIS SAFETY CHECK PREVENTS CRASHES FROM BAD DATA
    if 'conditions' not in rule or not isinstance(rule['conditions'], list):
        return False

    for condition in rule['conditions']:
        val1 = get_operand_value(condition['operand1'], ticker)
        val2 = get_operand_value(condition['operand2'], ticker)

        if val1 is None or val2 is None:
            return False # Cannot evaluate if data is missing

        op = condition['operator']
        
        is_met = False
        if op == '>': is_met = val1 > val2
        elif op == '<': is_met = val1 < val2
        elif op == '>=': is_met = val1 >= val2
        elif op == '<=': is_met = val1 <= val2
        
        if not is_met:
            return False # If any condition fails, the whole rule fails
            
    return True # All conditions were met

def evaluate_all_tickers():
    """Loads all rules from Firestore and evaluates them against all tickers."""
    all_rules = get_all_rules()
    signals = {ticker: "NO_SIGNAL" for ticker in CRYPTO_TICKERS}

    if not all_rules:
        return signals

    for ticker in CRYPTO_TICKERS:
        for rule in all_rules:
            if evaluate_single_rule(rule, ticker):
                signals[ticker] = rule['signal']
                break # Move to the next ticker once a signal is found
    
    return signals

def debug_single_rule(rule, ticker):
    """Provides a detailed step-by-step evaluation of a rule for debugging."""
    if 'id' not in rule:
        return {"error": "Rule has no ID"}
        
    debug_log = {
        "rule_name": rule.get('name', 'N/A'),
        "ticker": ticker,
        "evaluation_trace": [],
        "final_result": "FAIL"
    }

    if 'conditions' not in rule or not isinstance(rule['conditions'], list):
        debug_log['error'] = "Rule has no 'conditions' or it is not a list."
        return debug_log

    all_conditions_met = True
    for i, condition in enumerate(rule['conditions']):
        trace_step = {}
        val1 = get_operand_value(condition.get('operand1'), ticker)
        val2 = get_operand_value(condition.get('operand2'), ticker)
        op = condition.get('operator')

        trace_step['step'] = i + 1
        trace_step['operand1_value'] = val1
        trace_step['operator'] = op
        trace_step['operand2_value'] = val2

        if val1 is None or val2 is None or op is None:
            trace_step['result'] = "FAIL (Missing Data)"
            all_conditions_met = False
        else:
            is_met = False
            if op == '>': is_met = val1 > val2
            elif op == '<': is_met = val1 < val2
            elif op == '>=': is_met = val1 >= val2
            elif op == '<=': is_met = val1 <= val2
            
            trace_step['result'] = "PASS" if is_met else "FAIL"
            if not is_met:
                all_conditions_met = False
        
        debug_log['evaluation_trace'].append(trace_step)

    if all_conditions_met:
        debug_log['final_result'] = "PASS"
        
    return debug_log
