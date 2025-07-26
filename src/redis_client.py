import redis
from redis import Redis
from typing import Optional, cast
import os
import json

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB = int(os.getenv("REDIS_DB", 0))

r: Redis = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=REDIS_DB)

def save_macd_to_redis(ticker: str, interval: str, params: dict, data: dict) -> None:
    key = f"{ticker}:{interval}:{params['fast']}-{params['slow']}-{params['signal']}"
    try:
        r.set(key, json.dumps(data))
        print(f"[REDIS] Saved MACD for {key}")
    except Exception as e:
        print(f"[REDIS ERROR] Failed to save {key}: {e}")

def get_macd_from_redis(ticker: str, interval: str, params: dict) -> Optional[dict]:
    key = f"{ticker}:{interval}:{params['fast']}-{params['slow']}-{params['signal']}"
    try:
        val = r.get(key)
        if val:
            val = cast(bytes, val)
            return json.loads(val.decode("utf-8"))
        return None
    except Exception as e:
        print(f"[REDIS ERROR] Failed to fetch {key}: {e}")
        return None
