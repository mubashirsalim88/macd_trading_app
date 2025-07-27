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
        # Resolve nested operands
        values = [get_operand_value(op_arg, ticker) for op_arg in operand['operands']]
        
        if any(v is None for v in values):
            return None
        
        try:
            if op == 'abs': return abs(values[0])
            if op == 'divide': return values[0] / values[1] if values[1] != 0 else None
            # Add other operations like 'add', 'subtract' here if needed
        except Exception:
            return None
    return None

def evaluate_single_rule(rule, ticker):
    """Evaluates a full rule with all its conditions for a given ticker."""
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
