# api/firestore_client.py
from google.cloud import firestore
import os

# This assumes your 'firestore_key.json' is in the project's root directory
key_path = os.path.join(os.path.dirname(__file__), '..', 'firestore_key.json')
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = key_path

db = firestore.Client()
rules_collection = db.collection('rules')

def get_all_rules():
    """Fetches all documents from the 'rules' collection."""
    return [doc.to_dict() for doc in rules_collection.stream()]

def save_rule(rule_data: dict):
    """Saves a new rule to Firestore, letting Firestore auto-generate the ID."""
    doc_ref = rules_collection.document()
    rule_data['id'] = doc_ref.id  # Add the auto-generated ID to the dict
    doc_ref.set(rule_data)
    return rule_data