import os
from google.cloud import firestore

# Set the path to your JSON key
key_path = os.path.join(os.path.dirname(__file__), '..', 'firestore_key.json')
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = key_path

# Initialize Firestore
db = firestore.Client()

# Optional: test access
def test_firestore():
    print("[Firestore] Connected to project:", db.project)
