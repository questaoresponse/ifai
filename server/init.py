from googleapiclient.discovery import build
from google.auth.transport.requests import Request
import firebase_admin
from firebase_admin import credentials, firestore

def load_creds():
    import os
    import pickle
    if os.path.exists('token.pkl'):
        with open('token.pkl', 'rb') as token:
            creds = pickle.load(token)
        if creds and creds.valid:
            return creds
        elif creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
            return creds

def get_drive_service():
    return build('drive', 'v3', credentials=load_creds())

def get_firebase_db():
    cred = credentials.Certificate('service_account.json')
    firebase_admin.initialize_app(cred)

    return firestore.client()