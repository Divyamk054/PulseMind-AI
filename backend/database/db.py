import os
import json
import logging
from typing import Dict, Any, List, Optional
import firebase_admin
from firebase_admin import credentials, firestore

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("database")

FIREBASE_ACTIVE = False
db_client = None

# Attempt Firebase Admin SDK setup
cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY")
if cred_path and not os.path.isabs(cred_path):
    backend_dir = os.path.dirname(os.path.dirname(__file__))
    cred_path = os.path.join(backend_dir, cred_path)

if cred_path and os.path.exists(cred_path):
    try:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        db_client = firestore.client()
        FIREBASE_ACTIVE = True
        logger.info("Connected to Cloud Firestore using Admin credentials.")
    except Exception as e:
        logger.error(f"Failed to connect to Firestore with certificate: {e}. Falling back to Local Mock DB.")
else:
    logger.warning("FIREBASE_SERVICE_ACCOUNT_KEY environment variable not configured or file not found. Running in Local Mock DB mode.")

# Local file database fallback path
LOCAL_DB_FILE = os.path.join(os.path.dirname(__file__), "local_db.json")

def _init_local_db():
    if not os.path.exists(LOCAL_DB_FILE):
        initial_data = {
            "users": {},
            "reports": {},
            "prescriptions": {},
            "medical_images": {},
            "analysis_results": {},
            "chat_history": {},
            "appointments": {},
            "risk_predictions": {},
            "symptoms": {},
            "mood_logs": {},
            "medications": {},
            "timeline": {},
            # V4.0 Collections
            "doctor_sessions": {},
            "health_forecasts": {},
            "disease_simulations": {},
            "family_history": {},
            "research_summaries": {},
            "emergency_events": {},
            "copilot_items": {},
            # V5.0 National Platform Collections
            "digital_twins": {},
            "prevention_results": {},
            "affordability_estimates": {},
            "outbreak_predictions": {},
            "education_sessions": {},
            "rural_triages": {},
            "impact_metrics": {},
            "voice_sessions": {},
            "population_analytics": {},
            "audit_logs": {},
        }
        with open(LOCAL_DB_FILE, 'w') as f:
            json.dump(initial_data, f, indent=4)
    else:
        # Migrate existing DB: add missing collections without overwriting
        try:
            db = _read_local_db()
            v5_collections = [
                "doctor_sessions", "health_forecasts", "disease_simulations",
                "family_history", "research_summaries", "emergency_events", "copilot_items",
                "symptoms", "mood_logs", "medications", "timeline",
                # V5.0
                "digital_twins", "prevention_results", "affordability_estimates",
                "outbreak_predictions", "education_sessions", "rural_triages",
                "impact_metrics", "voice_sessions", "population_analytics", "audit_logs",
            ]
            changed = False
            for col in v5_collections:
                if col not in db:
                    db[col] = {}
                    changed = True
            if changed:
                _write_local_db(db)
                logger.info("Migrated local_db.json to include V5.0 National Platform collections.")
        except Exception as e:
            logger.error(f"DB migration failed: {e}")


def _read_local_db() -> Dict[str, Any]:
    try:
        with open(LOCAL_DB_FILE, 'r') as f:
            return json.load(f)
    except Exception:
        return {}

def _write_local_db(data: Dict[str, Any]):
    try:
        with open(LOCAL_DB_FILE, 'w') as f:
            json.dump(data, f, indent=4)
    except Exception as e:
        logger.error(f"Failed to write local database: {e}")

_init_local_db()

class DatabaseManager:
    @staticmethod
    def insert(collection: str, doc_id: str, data: Dict[str, Any]) -> bool:
        if FIREBASE_ACTIVE and db_client:
            try:
                db_client.collection(collection).document(doc_id).set(data)
                return True
            except Exception as e:
                logger.error(f"Firestore insert error ({collection}/{doc_id}): {e}")

        # Mock Local DB
        db = _read_local_db()
        if collection not in db:
            db[collection] = {}
        db[collection][doc_id] = data
        _write_local_db(db)
        return True

    @staticmethod
    def get(collection: str, doc_id: str) -> Optional[Dict[str, Any]]:
        if FIREBASE_ACTIVE and db_client:
            try:
                doc = db_client.collection(collection).document(doc_id).get()
                if doc.exists:
                    return doc.to_dict()
                return None
            except Exception as e:
                logger.error(f"Firestore get error ({collection}/{doc_id}): {e}")

        # Mock Local DB
        db = _read_local_db()
        return db.get(collection, {}).get(doc_id)

    @staticmethod
    def get_all(collection: str, query_filter: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        if FIREBASE_ACTIVE and db_client:
            try:
                query = db_client.collection(collection)
                if query_filter:
                    for key, val in query_filter.items():
                        query = query.where(key, "==", val)
                docs = query.stream()
                return [doc.to_dict() for doc in docs]
            except Exception as e:
                logger.error(f"Firestore query error on {collection}: {e}")

        # Mock Local DB
        db = _read_local_db()
        items = list(db.get(collection, {}).values())
        if query_filter:
            filtered = []
            for item in items:
                matches = True
                for key, val in query_filter.items():
                    if item.get(key) != val:
                        matches = False
                        break
                if matches:
                    filtered.append(item)
            return filtered
        return items

    @staticmethod
    def delete(collection: str, doc_id: str) -> bool:
        if FIREBASE_ACTIVE and db_client:
            try:
                db_client.collection(collection).document(doc_id).delete()
                return True
            except Exception as e:
                logger.error(f"Firestore delete error ({collection}/{doc_id}): {e}")

        # Mock Local DB
        db = _read_local_db()
        if collection in db and doc_id in db[collection]:
            del db[collection][doc_id]
            _write_local_db(db)
            return True
        return False

    @staticmethod
    def update(collection: str, doc_id: str, data: Dict[str, Any]) -> bool:
        if FIREBASE_ACTIVE and db_client:
            try:
                db_client.collection(collection).document(doc_id).update(data)
                return True
            except Exception as e:
                logger.error(f"Firestore update error ({collection}/{doc_id}): {e}")

        # Mock Local DB
        db = _read_local_db()
        if collection in db and doc_id in db[collection]:
            db[collection][doc_id].update(data)
            _write_local_db(db)
            return True
        return False
