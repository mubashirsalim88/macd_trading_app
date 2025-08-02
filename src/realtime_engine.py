from binance.websocket.spot.websocket_client import SpotWebsocketClient  # type: ignore
import json
import logging
from src.config import CRYPTO_TICKERS, MACD_PARAMS
from src.indicator_calculator import update_macd_incremental
from api.logic_evaluator import evaluate_single_ticker

class RealtimeEngine:
    def __init__(self):
        # Prepare the list of Binance stream endpoints for each ticker/interval
        self.streams = self._get_all_streams()
        self.client = None

    def _get_all_streams(self):
        streams = []
        for ticker in CRYPTO_TICKERS:
            symbol = ticker.lower()
            for interval in MACD_PARAMS.keys():
                streams.append(f"{symbol}@kline_{interval}")
        return streams

    def _handle_socket_message(self, msg):
        """
        Handle incoming WebSocket messages, process closed kline events,
        update MACD values, and evaluate trade logic.
        """
        try:
            if 'stream' in msg and 'data' in msg:
                data = msg['data']
                # Only process kline events
                if data.get('e') == 'kline':
                    kline = data['k']
                    # Only on candle close
                    if not kline.get('x', False):
                        return

                    symbol = kline['s']  # e.g., 'BTCUSDT'
                    interval = kline['i']  # e.g., '1m'
                    close_price = float(kline['c'])
                    ticker = symbol.upper()

                    # Update MACD for each parameter set
                    for fast, slow, signal in MACD_PARAMS.get(interval, []):
                        update_macd_incremental(
                            ticker,
                            interval,
                            (fast, slow, signal),
                            close_price
                        )

                    # Evaluate trading rules and optionally notify
                    evaluate_single_ticker(ticker, send_notifications=True)
                    logging.info(f"Processed closed candle for {ticker} on {interval}. Rules evaluated.")
        except KeyError:
            logging.error(f"[WEBSOCKET ERROR] Malformed message: {msg}")
        except Exception as e:
            logging.error(f"[WEBSOCKET ERROR] Processing failed: {e}")

    def start(self):
        """
        Initialize and start the Binance WebSocket client with all kline streams.
        """
        # Initialize client, ignoring missing type stubs
        self.client = SpotWebsocketClient(on_message=self._handle_socket_message)  # type: ignore
        self.client.start()

        # Subscribe to kline streams for all symbols/intervals
        symbols = [t.lower() for t in CRYPTO_TICKERS]
        intervals = list(MACD_PARAMS.keys())
        # Using multiplex subscription
        self.client.kline_stream(symbols=symbols, interval=intervals)  # type: ignore

        try:
            input("Press Enter to stop the client...\n")
        finally:
            self.client.stop()  # type: ignore
