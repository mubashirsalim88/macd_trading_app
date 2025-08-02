# api/firestore_client.py

from google.cloud import firestore

# The library will now automatically use the VM's service account permissions
db = firestore.Client()
rules_collection = db.collection('rules')

# <-- CHANGE #1: ADD THIS NEW FUNCTION -->
def get_rule_by_id(rule_id: str):
    """Fetches a single rule document by its ID."""
    doc_ref = rules_collection.document(rule_id)
    doc = doc_ref.get()
    if doc.exists:
        return doc.to_dict()
    return None

def get_all_rules():
    """Fetches all documents from the 'rules' collection."""
    return [doc.to_dict() for doc in rules_collection.stream()]

def save_rule(rule_data: dict):
    """Saves a new rule to Firestore, letting Firestore auto-generate the ID."""
    doc_ref = rules_collection.document()
    rule_data['id'] = doc_ref.id
    doc_ref.set(rule_data)
    return rule_data

def update_rule(rule_id: str, rule_data: dict):
    """Updates an existing rule in Firestore."""
    doc_ref = rules_collection.document(rule_id)
    # Ensure the ID from the URL is used and saved in the document
    rule_data['id'] = rule_id
    doc_ref.set(rule_data) # set() with an existing doc ID overwrites it
    return rule_data

def delete_rule(rule_id: str):
    """Deletes a rule from Firestore."""
    rules_collection.document(rule_id).delete()