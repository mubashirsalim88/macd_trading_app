# src/engine.py

from src.data_fetcher import get_historical_data
from src.indicator_calculator import add_macd
from src.config import CRYPTO_TICKERS, MACD_PARAMS
from src.redis_client import save_macd_to_redis

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

                last_row = {
                    "macd_line": float(df_macd["macd_line"].iloc[-1]),
                    "signal_line": float(df_macd["signal_line"].iloc[-1]),
                    "histogram": float(df_macd["histogram"].iloc[-1]),
                    "date": str(df_macd.index[-1].date())
                }

                save_macd_to_redis(
                    ticker,
                    interval,
                    {"fast": fast, "slow": slow, "signal": signal},
                    last_row
                )

    print("\n✅ [INFO] Full scan complete.\n")

if __name__ == "__main__":
    main()
