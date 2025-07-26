# indicator_calculator.py

import pandas as pd

def add_macd(df, fast=12, slow=26, signal=9):
    if 'Close' not in df.columns:
        print("[Error] 'Close' column not found in DataFrame.")
        return df

    # Calculate EMAs
    df['fast_ema'] = df['Close'].ewm(span=fast, adjust=False).mean()
    df['slow_ema'] = df['Close'].ewm(span=slow, adjust=False).mean()

    # MACD and Signal
    df['macd_line'] = df['fast_ema'] - df['slow_ema']
    df['signal_line'] = df['macd_line'].ewm(span=signal, adjust=False).mean()

    # Histogram
    df['histogram'] = df['macd_line'] - df['signal_line']

    return df
