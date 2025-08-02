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
            # Normalize ticker for Binance streams (e.g., BTC-USD -> btcusdt)
            symbol = ticker.lower().replace('-', '')
            for interval in MACD_PARAMS.keys():
                streams.append(f'{symbol}@kline_{interval}')
        return streams

    def _handle_socket_message(self, msg):
        """
        Processes a new kline message from the WebSocket.
        This function will be the core of our real-time processing.
        """
        try:
            kline = msg['k']
            is_candle_closed = kline['x']
            if not is_candle_closed:
                # We only want to process closed candles to avoid false signals
                return

            symbol = kline['s'] # e.g., 'BTCUSDT'
            interval = kline['i'] # e.g., '1m'
            close_price = float(kline['c'])

            ticker = symbol.upper().replace('USDT', '-USD') # e.g., 'BTC-USD'
            
            # Retrieve the relevant MACD parameters for this interval
            macd_params_list = MACD_PARAMS.get(interval, [])

            for fast, slow, signal in macd_params_list:
                # Update MACD values for a single parameter set
                new_macd_data = update_macd_incremental(
                    ticker,
                    interval,
                    (fast, slow, signal),
                    close_price
                )
                
            # After all MACD indicators are updated for this ticker, evaluate the rules
            evaluate_single_ticker(ticker, send_notifications=True)
            
            logging.info(f"Processed closed candle for {ticker} on interval {interval}. Rules evaluated.")

        except KeyError:
            # Sometimes the first message can be malformed
            return
        except Exception as e:
            logging.error(f"[WEBSOCKET ERROR] Failed to process message: {e}")

    def start(self):
        """
        Starts the WebSocket streams and enters a blocking state.
        This replaces the role of the scheduler in the old setup.
        """
        # Subscribe to all streams and register a single handler
        self.twm.start_multiplex_socket(callback=self._handle_socket_message, streams=self.streams)
        
        # This blocks forever, but the twm runs in separate threads
        self.twm.join()