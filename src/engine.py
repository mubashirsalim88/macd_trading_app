# src/engine.py

from src.data_fetcher import get_historical_data
from src.indicator_calculator import add_macd
from src.config import CRYPTO_TICKERS, MACD_PARAMS
from src.redis_client import save_macd_to_redis
import pandas as pd

def main():
    print("[INFO] Starting full scan of all tickers and MACD parameter sets...\n")

    for ticker in CRYPTO_TICKERS:
        for interval, param_list in MACD_PARAMS.items():
            # This print statement is optional but helpful for seeing progress
            # print(f"--- {ticker} @ {interval} ---")

            df = get_historical_data(ticker, period="7d", interval=interval)
            if df.empty:
                print(f"[WARNING] No data for {ticker} ({interval}) — skipping.")
                continue

            for params in param_list:
                fast, slow, signal = params

                df_macd = add_macd(df.copy(), fast=fast, slow=slow, signal=signal)
                if df_macd.empty:
                    continue

                last_three_rows = df_macd.tail(3)
                if len(last_three_rows) < 3:
                    continue

                # ✅ FINAL CORRECTED VERSION
                data_to_save = [
                    {
                        "macd_line": float(row.macd_line.iloc[0]),
                        "signal_line": float(row.signal_line.iloc[0]),
                        "histogram": float(row.histogram.iloc[0]),
                        "date": str(index.date())
                    }
                    for index, row in last_three_rows.iterrows()
                ]

                save_macd_to_redis(
                    ticker,
                    interval,
                    {"fast": fast, "slow": slow, "signal": signal},
                    data_to_save
                )

    print("\n✅ [INFO] Full scan complete.\n")

if __name__ == "__main__":
    main()
