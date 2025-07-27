# api/firestore_client.py
from google.cloud import firestore

# The library will now automatically use the VM's service account permissions
db = firestore.Client()
rules_collection = db.collection('rules')

def get_all_rules():
    """Fetches all documents from the 'rules' collection."""
    return [doc.to_dict() for doc in rules_collection.stream()]

def save_rule(rule_data: dict):
    """Saves a new rule to Firestore, letting Firestore auto-generate the ID."""
    doc_ref = rules_collection.document()
    rule_data['id'] = doc_ref.id
    doc_ref.set(rule_data)
    return rule_data
