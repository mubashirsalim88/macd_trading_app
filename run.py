# run.py
import sys
import os
from dotenv import load_dotenv

# Add the project root to the Python path and load environment variables
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
load_dotenv()

from src.realtime_engine import RealtimeEngine

if __name__ == "__main__":
    print("[INIT] Starting real-time MACD engine...")
    engine = RealtimeEngine()
    engine.start()