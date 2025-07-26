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
            print(f"--- {ticker} @ {interval} ---")

            df = get_historical_data(ticker, period="7d", interval=interval)
            if df.empty:
                print(f"[WARNING] No data for {ticker} ({interval}) — skipping.")
                continue

            for params in param_list:
                fast, slow, signal = params

                df_macd = add_macd(df.copy(), fast=fast, slow=slow, signal=signal)
                if df_macd.empty:
                    continue

                # Get the last 3 rows of the DataFrame
                last_three_rows = df_macd.tail(3)
                if len(last_three_rows) < 3:
                    print(f"[WARNING] Not enough data for {ticker} {params} (found {len(last_three_rows)} rows), skipping.")
                    continue

                # Convert the last 3 rows to a list of dictionaries
                data_to_save = [
                    {
                        "macd_line": float(row.macd_line),
                        "signal_line": float(row.signal_line),
                        "histogram": float(row.histogram),
                        "date": str(index.date())  # type: ignore
                    }
                    for index, row in last_three_rows.iterrows()
                ]

                save_macd_to_redis(
                    ticker,
                    interval,
                    {"fast": fast, "slow": slow, "signal": signal},
                    data_to_save  # Save the list of 3 dicts
                )

    print("\n✅ [INFO] Full scan complete.\n")

if __name__ == "__main__":
    main()