# src/engine.py

from src.data_fetcher import get_historical_data
from src.indicator_calculator import add_macd
from src.config import CRYPTO_TICKERS, MACD_PARAMS
from src.redis_client import save_macd_to_redis
import pandas as pd
from api.logic_evaluator import evaluate_all_tickers
from typing import cast


def main():
    print("[INFO] Starting full scan of all tickers and MACD parameter sets...\n")

    for ticker in CRYPTO_TICKERS:
        for interval, param_list in MACD_PARAMS.items():
            df = get_historical_data(ticker, period="7d", interval=interval)
            if df.empty:
                print(f"[WARNING] No data for {ticker} ({interval}) — skipping.")
                continue

            for fast, slow, signal in param_list:
                df_macd = add_macd(df.copy(), fast=fast, slow=slow, signal=signal)
                if df_macd.empty:
                    continue

                last_three = df_macd.tail(3)
                if len(last_three) < 3:
                    continue

                data_to_save = []
                for idx, row in last_three.iterrows():
                    # Cast idx to Timestamp so .date() is recognized
                    ts = cast(pd.Timestamp, idx)
                    date_str = str(ts.date())
                    data_to_save.append({
                        # ✅ FIX: Use .item() to safely get the scalar value from the Series
                        "macd_line": float(row.macd_line.item()),
                        "signal_line": float(row.signal_line.item()),
                        "histogram": float(row.histogram.item()),
                        "date": date_str
                    })

                save_macd_to_redis(
                    ticker,
                    interval,
                    {"fast": fast, "slow": slow, "signal": signal},
                    data_to_save
                )

    print("\n✅ [INFO] Full scan complete.\n")
    evaluate_all_tickers(send_notifications=True)


if __name__ == "__main__":
    main()