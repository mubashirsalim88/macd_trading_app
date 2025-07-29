# api/logic_evaluator.py

from src.redis_client import get_macd_from_redis
from src.config import CRYPTO_TICKERS
from api.firestore_client import get_all_rules
from api.notifications import send_telegram_message
import json
from src.redis_client import r # Import the redis client

# --- THIS IS A NEW FUNCTION ---
def save_signals_to_redis(signals):
    """Saves the latest evaluated signals to a single key in Redis."""
    try:
        r.set('latest_signals', json.dumps(signals))
    except Exception as e:
        print(f"[REDIS ERROR] Failed to save latest signals: {e}")

# --- THIS IS A NEW FUNCTION ---
def get_signals_from_redis():
    """Retrieves the latest signals from Redis."""
    try:
        signals = r.get('latest_signals')
        if signals:
            return json.loads(signals.decode('utf-8'))
    except Exception as e:
        print(f"[REDIS ERROR] Failed to get latest signals: {e}")
    return {ticker: {"signal": "NO_SIGNAL", "rule_name": None} for ticker in CRYPTO_TICKERS}


def get_operand_value(operand, ticker):
    """Recursively resolves the value of an operand."""
    if not operand:
        return None
    if operand['type'] == 'literal':
        return operand['value']

    if operand['type'] == 'indicator':
        params_dict = {'fast': operand['params'][0], 'slow': operand['params'][1], 'signal': operand['params'][2]}
        redis_data = get_macd_from_redis(ticker, operand['timeframe'], params_dict)
        if not redis_data or len(redis_data) < 3:
            return None
        return redis_data[operand['offset'] + 2][operand['value']]

    if operand['type'] == 'expression':
        op = operand['operation']
        values = [get_operand_value(op_arg, ticker) for op_arg in operand['operands']]

        if any(v is None for v in values):
            return None

        try:
            if op == 'abs':
                return abs(values[0])
            if op == 'divide':
                return values[0] / values[1] if values[1] != 0 else None
        except Exception:
            return None

    return None


def evaluate_single_rule(rule, ticker):
    """Evaluates a full rule with all its conditions for a given ticker."""
    if 'conditions' not in rule or not isinstance(rule['conditions'], list):
        return False

    for condition in rule['conditions']:
        val1 = get_operand_value(condition.get('operand1'), ticker)
        val2 = get_operand_value(condition.get('operand2'), ticker)

        if val1 is None or val2 is None:
            return False

        op = condition['operator']

        is_met = False
        if op == '>':
            is_met = val1 > val2
        elif op == '<':
            is_met = val1 < val2
        elif op == '>=':
            is_met = val1 >= val2
        elif op == '<=':
            is_met = val1 <= val2

        if not is_met:
            return False

    return True


# --- THIS FUNCTION IS MODIFIED ---
def evaluate_all_tickers(send_notifications=False):
    """
    Loads all rules and evaluates them.
    If send_notifications is True, it will send Telegram alerts.
    """
    all_rules = get_all_rules()
    signals = {ticker: {"signal": "NO_SIGNAL", "rule_name": None} for ticker in CRYPTO_TICKERS}
    
    # Get previous signals to avoid re-sending alerts
    previous_signals = get_signals_from_redis()

    if not all_rules:
        save_signals_to_redis(signals)
        return signals

    for ticker in CRYPTO_TICKERS:
        for rule in all_rules:
            if evaluate_single_rule(rule, ticker):
                current_signal = rule['signal']
                current_rule_name = rule.get('name', 'Unnamed Rule')

                signals[ticker]['signal'] = current_signal
                signals[ticker]['rule_name'] = current_rule_name

                # Check if this is a NEW signal before sending an alert
                previous_ticker_signal = previous_signals.get(ticker, {}).get('signal', 'NO_SIGNAL')
                
                if send_notifications and rule.get('telegram_enabled', False) and current_signal != previous_ticker_signal:
                    rule_name_safe = current_rule_name.replace('-', '\\-').replace('.', '\\.')
                    ticker_safe = ticker.replace('-', '\\-')
                    signal_safe = current_signal.replace('-', '\\-').replace('(', '\\(').replace(')', '\\)')

                    message = (
                        f"🚨 *NNTE Signal Alert* 🚨\n\n"
                        f"*Ticker:* `{ticker_safe}`\n"
                        f"*Signal:* `{signal_safe}`\n"
                        f"*Rule:* `{rule_name_safe}`"
                    )
                    send_telegram_message(message)
                
                break

    # Always save the latest signals after evaluation
    save_signals_to_redis(signals)
    return signals


def debug_single_rule(rule, ticker):
    # This function remains unchanged
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
            if op == '>':
                is_met = val1 > val2
            elif op == '<':
                is_met = val1 < val2
            elif op == '>=':
                is_met = val1 >= val2
            elif op == '<=':
                is_met = val1 <= val2

            trace_step['result'] = "PASS" if is_met else "FAIL"
            if not is_met:
                all_conditions_met = False

        debug_log['evaluation_trace'].append(trace_step)

    if all_conditions_met:
        debug_log['final_result'] = "PASS"

    return debug_log
