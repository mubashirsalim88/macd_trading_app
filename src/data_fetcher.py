import yfinance as yf
import pandas as pd
import logging

logging.basicConfig(level=logging.INFO, format='[%(asctime)s] %(levelname)s: %(message)s', datefmt='%Y-%m-%d %H:%M:%S')

def get_historical_data(ticker, period='6mo', interval='1d'):
    try:
        df = yf.download(ticker, period=period, interval=interval, auto_adjust=False)
        if df is None or df.empty:
            logging.warning(f"[Warning] No data returned for {ticker}.")
            return pd.DataFrame()
        return df
    except Exception as e:
        logging.error(f"[Error] Failed to fetch data for {ticker}: {e}")
        return pd.DataFrame()