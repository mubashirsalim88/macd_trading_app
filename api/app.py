# api/app.py

from flask import Flask, jsonify, request
from flask_cors import CORS
from src.redis_client import r
from api.logic_evaluator import evaluate_all_tickers
import json
import os
from dotenv import load_dotenv
from typing import List, Optional

# Load API key from environment
load_dotenv()
API_KEY = os.getenv("API_KEY")

app = Flask(__name__)
CORS(app)

def require_api_key():
    client_key = request.headers.get('X-API-KEY')
    if client_key != API_KEY:
        return jsonify({"error": "Unauthorized"}), 401
    return None

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "message": "API is running"})

@app.route('/api/data/<string:ticker>', methods=['GET'])
def get_data(ticker: str):
    auth_error = require_api_key()
    if auth_error:
        return auth_error

    try:
        keys = r.keys(f"{ticker}:*")  # type: ignore
        keys: List[bytes] = keys
        
        if not keys:
            return jsonify({"error": f"No data found for ticker {ticker}"}), 404
        
        result = {ticker: {}}
        for key in keys:
            key_str = key.decode('utf-8')
            _, interval, params = key_str.split(':')
            data = r.get(key)  # type: ignore
            data: Optional[bytes] = data
            if data:
                data_list = json.loads(data.decode('utf-8'))
                if isinstance(data_list, list) and len(data_list) == 3:
                    result[ticker][f"{interval}:{params}"] = [
                        {
                            "macd_line": item["macd_line"],
                            "signal_line": item["signal_line"],
                            "histogram": item["histogram"],
                            "date": item["date"]
                        }
                        for item in data_list
                    ]
        
        if not result[ticker]:
            return jsonify({"error": f"No valid data found for ticker {ticker}"}), 404
            
        return jsonify(result)
    
    except Exception as e:
        return jsonify({"error": f"Failed to fetch data for {ticker}: {str(e)}"}), 500

@app.route('/api/signals', methods=['GET'])
def get_signals():
    auth_error = require_api_key()
    if auth_error:
        return auth_error
    try:
        signals = evaluate_all_tickers()
        return jsonify(signals), 200
    except Exception as e:
        return jsonify({"error": f"Failed to evaluate signals: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000)
