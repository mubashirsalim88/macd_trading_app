# 📄 api/notifications.py

import requests
import os

def send_telegram_message(message: str):
    """Sends a message to the Telegram channel configured in the .env file."""
    
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")
    
    if not token or not chat_id:
        print("[TELEGRAM ERROR] Bot Token or Chat ID is not configured in .env file.")
        return

    # Using MarkdownV2 for better formatting
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": message,
        "parse_mode": "MarkdownV2" 
    }
    
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status() # Will raise an exception for 4xx/5xx errors
        print(f"[TELEGRAM] Sent message: {message.splitlines()[0]}...")
    except requests.exceptions.RequestException as e:
        print(f"[TELEGRAM ERROR] Failed to send message: {e}")
