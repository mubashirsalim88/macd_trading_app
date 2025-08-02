import pandas as pd
from src.redis_client import get_macd_from_redis, save_macd_to_redis
import logging
from typing import List, Dict, cast, Tuple

# This function is now used to calculate the new MACD values incrementally
def update_macd_incremental(ticker: str, interval: str, params: Tuple[int, int, int], new_close: float) -> List[Dict]:
    fast, slow, signal = params
    
    key_params = {"fast": fast, "slow": slow, "signal": signal}
    
    existing_data = get_macd_from_redis(ticker, interval, key_params)
    
    if existing_data:
        from src.data_fetcher import get_historical_data
        df = get_historical_data(ticker, period="10m", interval=interval)
        if df.empty or len(df) <= slow:
            logging.warning(f"[INSUFFICIENT DATA] Skipping incremental MACD for {ticker} ({interval}).")
            return []
            
        df['close'] = df['Close']
        df['fast_ema'] = df['close'].ewm(span=fast, adjust=False).mean()
        df['slow_ema'] = df['close'].ewm(span=slow, adjust=False).mean()
        df['macd_line'] = df['fast_ema'] - df['slow_ema']
        df['signal_line'] = df['macd_line'].ewm(span=signal, adjust=False).mean()
        df['histogram'] = df['macd_line'] - df['signal_line']
        
        last_three = df.tail(3)
        if len(last_three) < 3:
            return []
        
        data_to_save = []
        # Explicitly cast idx to pd.Timestamp
        for idx, row in last_three.iterrows():
            ts = cast(pd.Timestamp, idx)
            date_str = str(ts.date())
            data_to_save.append({
                "macd_line": float(row.macd_line.item()),
                "signal_line": float(row.signal_line.item()),
                "histogram": float(row.histogram.item()),
                "date": date_str
            })
            
        save_macd_to_redis(ticker, interval, key_params, data_to_save)
        return data_to_save
        
    else:
        from src.data_fetcher import get_historical_data
        df = get_historical_data(ticker, period="7d", interval=interval)
        if df.empty or len(df) <= slow:
            logging.warning(f"[INSUFFICIENT DATA] Skipping initial MACD calculation for {ticker} ({interval}).")
            return []
            
        df_macd = add_macd(df.copy(), fast=fast, slow=slow, signal=signal)
        
        last_three = df_macd.tail(3)
        if len(last_three) < 3:
            return []

        data_to_save = []
        # Explicitly cast idx to pd.Timestamp
        for idx, row in last_three.iterrows():
            ts = cast(pd.Timestamp, idx)
            date_str = str(ts.date())
            data_to_save.append({
                "macd_line": float(row.macd_line.item()),
                "signal_line": float(row.signal_line.item()),
                "histogram": float(row.histogram.item()),
                "date": date_str
            })
            
        save_macd_to_redis(ticker, interval, key_params, data_to_save)
        return data_to_save

# The original add_macd function is still useful for initial historical calculations.
def add_macd(df, fast=12, slow=26, signal=9):
    if len(df) <= slow:
        logging.warning(f"[INSUFFICIENT DATA] SKIPPING MACD({fast},{slow},{signal}). Have {len(df)} candles, need > {slow}.")
        return pd.DataFrame()

    if 'Close' not in df.columns:
        logging.error("[Error] 'Close' column not found in DataFrame.")
        return df

    df['fast_ema'] = df['Close'].ewm(span=fast, adjust=False).mean()
    df['slow_ema'] = df['Close'].ewm(span=slow, adjust=False).mean()
    df['macd_line'] = df['fast_ema'] - df['slow_ema']
    df['signal_line'] = df['macd_line'].ewm(span=signal, adjust=False).mean()
    df['histogram'] = df['macd_line'] - df['signal_line']
    return df
