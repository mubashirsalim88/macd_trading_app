# run.py
import sys
import os
from dotenv import load_dotenv # <-- CHANGE #1: ADD THIS IMPORT

# Add the project root to the Python path and load environment variables
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
load_dotenv() # <-- CHANGE #2: ADD THIS LINE

from apscheduler.schedulers.blocking import BlockingScheduler
from src.engine import main

def job():
    print("[SCHEDULER] Running scheduled MACD job...\n")
    main()

if __name__ == "__main__":
    scheduler = BlockingScheduler()
    scheduler.add_job(job, 'interval', minutes=1)
    print("[INIT] Starting scheduler to run MACD engine every minute...")
    scheduler.start()
