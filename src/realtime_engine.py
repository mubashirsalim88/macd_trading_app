# src/realtime_engine.py

from binance import ThreadedWebsocketManager
import pandas as pd
from typing import Dict
from src.config import CRYPTO_TICKERS, MACD_PARAMS
from src.redis_client import r
from src.indicator_calculator import update_macd_incremental
from api.logic_evaluator import evaluate_single_ticker
import json
import logging

class RealtimeEngine:
    def __init__(self):
        self.twm = ThreadedWebsocketManager()
        self.twm.start()
        self.streams = self._get_all_streams()

    def _get_all_streams(self):
        streams = []
        for ticker in CRYPTO_TICKERS:
            # Binance stream symbols are lowercase
            symbol = ticker.lower()
            for interval in MACD_PARAMS.keys():
                streams.append(f'{symbol}@kline_{interval}')
        return streams

    def _handle_socket_message(self, msg):
        try:
            kline = msg['k']
            is_candle_closed = kline['x']
            if not is_candle_closed:
                return

            symbol = kline['s'] # e.g., 'BTCUSDT'
            interval = kline['i'] # e.g., '1m'
            close_price = float(kline['c'])

            # ✅ FIX: Use the symbol directly from the kline message
            ticker = symbol.upper()
            
            # Retrieve the relevant MACD parameters for this interval
            macd_params_list = MACD_PARAMS.get(interval, [])

            for fast, slow, signal in macd_params_list:
                new_macd_data = update_macd_incremental(
                    ticker,
                    interval,
                    (fast, slow, signal),
                    close_price
                )
                
            evaluate_single_ticker(ticker, send_notifications=True)
            
            logging.info(f"Processed closed candle for {ticker} on interval {interval}. Rules evaluated.")

        except KeyError:
            return
        except Exception as e:
            logging.error(f"[WEBSOCKET ERROR] Failed to process message: {e}")

    def start(self):
        self.twm.start_multiplex_socket(callback=self._handle_socket_message, streams=self.streams)
        self.twm.join()