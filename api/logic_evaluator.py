from src.redis_client import get_macd_from_redis
from src.config import CRYPTO_TICKERS
from typing import Dict, Optional, List

def jgd_L33bc(ticker: str) -> str:
    """
    Evaluates the 'L33BC' trading logic for a given ticker using 1m interval data.
    Returns 'L33BC(BUY)', 'L33BC(SELL)', or 'NO_SIGNAL'.
    """
    try:
        # Define the parameters needed for this specific logic
        params_36_78_27 = {'fast': 36, 'slow': 78, 'signal': 27}
        params_60_130_45 = {'fast': 60, 'slow': 130, 'signal': 45}
        params_180_390_135 = {'fast': 180, 'slow': 390, 'signal': 135}
        params_360_780_270 = {'fast': 360, 'slow': 780, 'signal': 270}
        params_720_1560_540 = {'fast': 720, 'slow': 1560, 'signal': 540}

        # Fetch the required data from Redis (list of 3 candles)
        data_36 = get_macd_from_redis(ticker, '1m', params_36_78_27)
        data_60 = get_macd_from_redis(ticker, '1m', params_60_130_45)
        data_180 = get_macd_from_redis(ticker, '1m', params_180_390_135)
        data_360 = get_macd_from_redis(ticker, '1m', params_360_780_270)
        data_720 = get_macd_from_redis(ticker, '1m', params_720_1560_540)
        
        # If any data is missing or not a list of 3 candles, return NO_SIGNAL
        if not all([data_36, data_60, data_180, data_360, data_720]) or \
           not all(isinstance(d, list) and len(d) == 3 for d in [data_36, data_60, data_180, data_360, data_720]):
            return "NO_SIGNAL"

        # Assign CUR, PAST1, PAST2 values from the list of 3 candles
        # Candle -1 is CUR, -2 is PAST1, -3 is PAST2
        # Use type: ignore to suppress Pylance warnings, as checks above ensure data is valid
        fl_36_cur = data_36[-1]['macd_line']  # type: ignore
        fl_36_past1 = data_36[-2]['macd_line']  # type: ignore
        fl_36_past2 = data_36[-3]['macd_line']  # type: ignore
        sl_36_cur = data_36[-1]['signal_line']  # type: ignore
        sl_36_past1 = data_36[-2]['signal_line']  # type: ignore
        sl_36_past2 = data_36[-3]['signal_line']  # type: ignore

        fl_60_cur = data_60[-1]['macd_line']  # type: ignore
        fl_60_past1 = data_60[-2]['macd_line']  # type: ignore
        fl_60_past2 = data_60[-3]['macd_line']  # type: ignore
        sl_60_cur = data_60[-1]['signal_line']  # type: ignore

        fl_180_cur = data_180[-1]['macd_line']  # type: ignore
        fl_180_past1 = data_180[-2]['macd_line']  # type: ignore
        fl_180_past2 = data_180[-3]['macd_line']  # type: ignore
        sl_180_cur = data_180[-1]['signal_line']  # type: ignore
        sl_180_past1 = data_180[-2]['signal_line']  # type: ignore
        sl_180_past2 = data_180[-3]['signal_line']  # type: ignore
        
        fl_360_cur = data_360[-1]['macd_line']  # type: ignore
        fl_360_past1 = data_360[-2]['macd_line']  # type: ignore
        fl_360_past2 = data_360[-3]['macd_line']  # type: ignore
        
        fl_720_cur = data_720[-1]['macd_line']  # type: ignore
        fl_720_past1 = data_720[-2]['macd_line']  # type: ignore
        fl_720_past2 = data_720[-3]['macd_line']  # type: ignore

        # --- Logic Conditions ---
        # Condition set 1: Based on MACD(36,78,27)
        cond1 = (fl_36_cur > fl_36_past1 > fl_36_past2 and
                 sl_36_cur > sl_36_past1 > sl_36_past2 and
                 fl_36_cur < 0 and
                 sl_36_cur < 0 and
                 fl_36_cur > sl_36_cur)
        
        # Condition set 2 (#3BC): Based on MACD(60,130,45)
        cond2 = (fl_36_cur != 0 and fl_60_cur / abs(fl_36_cur) >= 3 and
                 fl_60_cur < sl_60_cur and
                 fl_60_cur > fl_60_past1 > fl_60_past2)

        # Condition set 3 (#4DOM): Based on MACD(180,390,135)
        cond3 = (fl_180_cur > fl_180_past1 > fl_180_past2 and
                 sl_180_cur > sl_180_past1 > sl_180_past2)

        # Condition set 4 (#SUPP): Supportive conditions
        cond4 = (fl_360_cur > fl_360_past1 > fl_360_past2 and
                 fl_720_cur > fl_720_past1 > fl_720_past2)

        # Return BUY if all conditions are met, else NO_SIGNAL
        # Note: SELL signal not implemented as per provided logic
        if all([cond1, cond2, cond3, cond4]):
            return "L33BC(BUY)"
        return "NO_SIGNAL"

    except (KeyError, IndexError, TypeError, ZeroDivisionError) as e:
        print(f"[LOGIC ERROR] Could not evaluate 'jgd_L33bc' for {ticker}: {e}")
        return "NO_SIGNAL"

def evaluate_all_tickers() -> Dict[str, str]:
    """
    Runs jgd_L33bc for all tickers using 1m interval.
    Returns a dictionary of ticker:signal pairs.
    """
    results = {}
    for ticker in CRYPTO_TICKERS:
        signal = jgd_L33bc(ticker)
        results[ticker] = signal
    return results

if __name__ == "__main__":
    signals = evaluate_all_tickers()
    print(signals)