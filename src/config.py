# config.py

CRYPTO_TICKERS = [
    "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "DOGEUSDT",
    "ADAUSDT", "AVAXUSDT", "SHIBUSDT", "DOTUSDT", "LINKUSDT", "MATICUSDT",
    "TRXUSDT", "LTCUSDT", "BCHUSDT", "ICPUSDT", "ATOMUSDT", "XLMUSDT",
    "ETCUSDT", "FILUSDT", "HBARUSDT", "APTUSDT", "IMXUSDT", "ARBUSDT",
    "CROUSDT", "NEARUSDT", "QNTUSDT", "OPUSDT", "VETUSDT", "RUNEUSDT",
    "AAVEUSDT", "GRTUSDT", "EGLDUSDT", "MKRUSDT", "ALGOUSDT", "XTZUSDT",
    "SANDUSDT", "THETAUSDT", "AXSUSDT", "CHZUSDT", "ZECUSDT", "LDOUSDT",
    "FTMUSDT"
]

MACD_PARAMS = {
    '1m': [
        (12, 26, 9),
        (36, 78, 27),
        (60, 130, 45),
        (180, 390, 135),
        (360, 780, 270),
        (720, 1560, 540),
        (2160, 4680, 1620)
    ],
    '5m': [
        (12, 26, 9),
        (36, 78, 27),
        (72, 156, 54),
        (144, 312, 108),
        (432, 936, 324),
        (900, 1950, 675),
        (4500, 9750, 3375)
    ],
    '15m': [
        (12, 26, 9),
        (24, 52, 18),
        (48, 104, 36),
        (144, 312, 108),
        (300, 650, 225),
        (1500, 3250, 1125),
        (3000, 6500, 2250)
    ]
}