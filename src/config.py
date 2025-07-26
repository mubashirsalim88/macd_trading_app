# config.py

CRYPTO_TICKERS = [
    "BTC-USD", "ETH-USD", "BNB-USD", "SOL-USD", "XRP-USD", "DOGE-USD",
    "ADA-USD", "AVAX-USD", "SHIB-USD", "DOT-USD", "LINK-USD", "MATIC-USD",
    "TRX-USD", "LTC-USD", "BCH-USD", "ICP-USD", "ATOM-USD", "XLM-USD",
    "ETC-USD", "FIL-USD", "HBAR-USD", "APT-USD", "IMX-USD", "ARB-USD",
    "CRO-USD", "NEAR-USD", "QNT-USD", "OP-USD", "VET-USD", "RUNE-USD",
    "AAVE-USD", "GRT-USD", "EGLD-USD", "MKR-USD", "ALGO-USD", "XTZ-USD",
    "SAND-USD", "THETA-USD", "AXS-USD", "CHZ-USD", "ZEC-USD", "LDO-USD",
    "FTM-USD"
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
