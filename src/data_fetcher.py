# data_fetcher.py

import yfinance as yf
import pandas as pd

def get_historical_data(ticker, period='6mo', interval='1d'):
    try:
        df = yf.download(ticker, period=period, interval=interval)

        if df is None or df.empty:
            print(f"[Warning] No data returned for {ticker}.")
            return pd.DataFrame()

        return df

    except Exception as e:
        print(f"[Error] Failed to fetch data for {ticker}: {e}")
        return pd.DataFrame()
