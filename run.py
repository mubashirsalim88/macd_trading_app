# run.py

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
