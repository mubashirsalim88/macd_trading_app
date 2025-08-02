# api/app.py

import sys
import os
import traceback
from flask import Flask, jsonify, request
from flask_cors import CORS
from src.redis_client import r
from api.logic_evaluator import get_signals_from_redis, debug_single_rule
from api.firestore_client import save_rule, get_all_rules, update_rule, delete_rule
import json
from dotenv import load_dotenv
from typing import List, Optional, cast
from src.config import MACD_PARAMS

# Ensure project root is on path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load API key from environment
load_dotenv()
API_KEY = os.getenv("API_KEY")

app = Flask(__name__)
CORS(app)

def require_api_key():
    client_key = request.headers.get('X-API-KEY')
    if not API_KEY or client_key != API_KEY:
        return jsonify({"error": "Unauthorized"}), 401
    return None

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "message": "API is running"})

@app.route('/api/config', methods=['GET'])
def get_app_config():
    CANDLES_IN_7_DAYS = {
        '1m': 60 * 24 * 7,
        '5m': 12 * 24 * 7,
        '15m': 4 * 24 * 7
    }
    valid_params = {}
    for timeframe, params_list in MACD_PARAMS.items():
        max_candles = CANDLES_IN_7_DAYS.get(timeframe, 0)
        valid_params[timeframe] = [p for p in params_list if p[1] < max_candles]
    frontend_config = {
        'timeframes': list(MACD_PARAMS.keys()),
        'operators': ['>', '<', '>=', '<='],
        'macdValues': ['macd_line', 'signal_line', 'histogram'],
        'macdParamsByTimeframe': valid_params
    }
    return jsonify(frontend_config)

@app.route('/api/rules', methods=['POST'])
def create_rule():
    auth_error = require_api_key()
    if auth_error:
        return auth_error
    rule_data = request.get_json()
    if not rule_data or 'name' not in rule_data:
        return jsonify({"error": "Invalid rule data"}), 400
    saved_rule = save_rule(rule_data)
    return jsonify(saved_rule), 201

@app.route('/api/rules', methods=['GET'])
def list_rules():
    auth_error = require_api_key()
    if auth_error:
        return auth_error
    all_rules = get_all_rules()
    return jsonify(all_rules), 200

@app.route('/api/rules/<string:rule_id>', methods=['PUT'])
def update_rule_endpoint(rule_id):
    auth_error = require_api_key()
    if auth_error:
        return auth_error
    rule_data = request.get_json()
    if not rule_data:
        return jsonify({"error": "Invalid data"}), 400
    updated_rule = update_rule(rule_id, rule_data)
    return jsonify(updated_rule), 200

@app.route('/api/rules/<string:rule_id>', methods=['DELETE'])
def delete_rule_endpoint(rule_id):
    auth_error = require_api_key()
    if auth_error:
        return auth_error
    try:
        delete_rule(rule_id)
        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/data/<string:ticker>', methods=['GET'])
def get_data(ticker: str):
    auth_error = require_api_key()
    if auth_error:
        return auth_error
    try:
        # Cast to List[bytes] so Pylance knows it's iterable
        raw_keys = cast(List[bytes], r.keys(f"{ticker}:*"))
        if not raw_keys:
            return jsonify({"error": f"No data found for {ticker}"}), 404

        result = {ticker: {}}
        for key in raw_keys:
            key_str = key.decode('utf-8')
            _, interval, params = key_str.split(':')
            data_raw = cast(Optional[bytes], r.get(key))
            if not data_raw:
                continue

            data_list = json.loads(data_raw.decode('utf-8'))
            if isinstance(data_list, list) and len(data_list) == 3:
                result[ticker][f"{interval}:{params}"] = data_list

        if not result[ticker]:
            return jsonify({"error": f"No valid data found for {ticker}"}), 404

        return jsonify(result)
    except Exception as e:
        return jsonify({"error": f"Failed to fetch data for {ticker}: {str(e)}"}), 500

@app.route('/api/signals', methods=['GET'])
def get_signals():
    auth_error = require_api_key()
    if auth_error:
        return auth_error
    try:
        signals = get_signals_from_redis()
        return jsonify(signals), 200
    except Exception:
        error_trace = traceback.format_exc()
        print(error_trace)
        return jsonify({"error": "An internal error occurred", "traceback": error_trace}), 500

@app.route('/api/debug/rule/<string:ticker>', methods=['GET'])
def debug_rule(ticker):
    auth_error = require_api_key()
    if auth_error:
        return auth_error
    all_rules = get_all_rules()
    if not all_rules:
        return jsonify({"error": "No rules found in the database to debug."}), 404
    first_rule = all_rules[0]
    debug_result = debug_single_rule(first_rule, ticker)
    return jsonify(debug_result)

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000)