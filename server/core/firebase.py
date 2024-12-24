import json
import os
import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from dotenv import load_dotenv

load_dotenv()

security = HTTPBearer()

# Initialize Firebase Admin
cred_json = os.getenv('FIREBASE_SERVICE_ACCOUNT_KEY')
if not cred_json:
    raise ValueError(
        "FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set")

cred_dict = json.loads(cred_json)
cred = credentials.Certificate(cred_dict)
firebase_admin.initialize_app(cred)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> dict:
    """
    Verify Firebase ID token and return user info
    """
    try:
        token = credentials.credentials
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid authentication credentials. {str(e)}"
        )
