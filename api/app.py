# api/app.py

from flask import Flask, jsonify
from src.redis_client import r
import json
from typing import List, Optional

app = Flask(__name__)

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "message": "API is running"})

@app.route('/api/data/<string:ticker>', methods=['GET'])
def get_data(ticker: str):
    try:
        # Fetch all keys matching the ticker pattern (e.g., BTC-USD:*:*)
        keys = r.keys(f"{ticker}:*")  # type: ignore
        keys: List[bytes] = keys
        
        if not keys:
            return jsonify({"error": f"No data found for ticker {ticker}"}), 404
        
        # Initialize the response dictionary
        result = {ticker: {}}
        
        # Process each key
        for key in keys:
            key_str = key.decode('utf-8')  # Convert bytes to string
            # Split key into parts (e.g., BTC-USD:1m:36-78-27 -> [BTC-USD, 1m, 36-78-27])
            _, interval, params = key_str.split(':')
            # Fetch the MACD data for this key
            data = r.get(key)  # type: ignore
            data: Optional[bytes] = data
            if data:
                data_list = json.loads(data.decode('utf-8'))
                if isinstance(data_list, list) and len(data_list) == 3:
                    # Store all three candles under interval:param
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

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000)