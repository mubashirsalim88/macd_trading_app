# api/logic_evaluator.py

from src.redis_client import get_macd_from_redis, r
from src.config import CRYPTO_TICKERS
from api.firestore_client import get_all_rules
from api.notifications import send_telegram_message
import json
import datetime
import logging
from typing import cast, List, Dict, Optional # <-- CHANGE: Added 'cast', 'List', 'Dict', 'Optional'

# Configure logging
logging.basicConfig(level=logging.INFO, format='[%(asctime)s] %(levelname)s: %(message)s', datefmt='%Y-%m-%d %H:%M:%S')

def save_signals_to_redis(signals):
    try:
        signals['last_updated'] = datetime.datetime.now().isoformat()
        r.set('latest_signals', json.dumps(signals))
        logging.info("Saved latest signals to Redis.")
    except Exception as e:
        logging.error(f"[REDIS ERROR] Failed to save latest signals: {e}")

def get_signals_from_redis():
    try:
        raw = r.get('latest_signals')
        if raw:
            # ✅ FIX: Explicitly cast the result to bytes before decoding.
            raw_bytes = cast(bytes, raw)
            return json.loads(raw_bytes.decode('utf-8'))
    except Exception as e:
        logging.error(f"[REDIS ERROR] Failed to get latest signals: {e}")
    return {
        'last_updated': datetime.datetime.now().isoformat(),
        'signals': {ticker: {"signal": "NO_SIGNAL", "rule_name": None} for ticker in CRYPTO_TICKERS}
    }

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

# --- CHANGE #1: THIS NEW FUNCTION REPLACES evaluate_all_tickers() ---
def evaluate_single_ticker(ticker, send_notifications=False):
    """
    Loads all rules and evaluates them for a single ticker.
    If a signal is generated, it will send a Telegram alert.
    """
    all_rules = get_all_rules()
    
    # Get the existing signals and update only the current ticker
    current_signals = get_signals_from_redis()
    
    # Initialize a new signal for the current ticker
    signal_for_ticker = {"signal": "NO_SIGNAL", "rule_name": None}

    if not all_rules:
        # Update and save if no rules exist
        current_signals['signals'][ticker] = signal_for_ticker
        save_signals_to_redis(current_signals)
        return current_signals

    for rule in all_rules:
        if evaluate_single_rule(rule, ticker):
            current_signal = rule['signal']
            current_rule_name = rule.get('name', 'Unnamed Rule')

            signal_for_ticker['signal'] = current_signal
            signal_for_ticker['rule_name'] = current_rule_name

            # Check if this is a NEW signal before sending an alert
            previous_ticker_signal = current_signals.get('signals', {}).get(ticker, {}).get('signal', 'NO_SIGNAL')
            
            if send_notifications and rule.get('telegram_enabled', False) and current_signal != previous_ticker_signal:
                logging.info(f"✅ SIGNAL DETECTED: Ticker={ticker}, Signal={current_signal}, Rule={current_rule_name}")
                logging.info("Triggering conditions:")
                for condition in rule['conditions']:
                    val1 = get_operand_value(condition.get('operand1'), ticker)
                    val2 = get_operand_value(condition.get('operand2'), ticker)
                    logging.info(f" -> {condition.get('operand1', {}).get('value')} {condition['operator']} {condition.get('operand2', {}).get('value')} -> {val1} {condition['operator']} {val2} is TRUE")

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
    
    current_signals['signals'][ticker] = signal_for_ticker
    save_signals_to_redis(current_signals)
    return current_signals

def debug_single_rule(rule, ticker):
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