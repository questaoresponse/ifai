import os
import pickle
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request

# Escopos que você precisa — exemplo para acesso ao Google Drive
SCOPES = ['https://www.googleapis.com/auth/drive']

def authenticate_and_save_token():
    creds = None
    if os.path.exists('token.pkl'):
        with open('token.pkl', 'rb') as token:
            creds = pickle.load(token)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                'credentials2.json', SCOPES)
            creds = flow.run_local_server(port=1111)

        # Salva credenciais para uso futuro
        with open('token.pkl', 'wb') as token:
            pickle.dump(creds, token)

    return creds

# Executar para obter o token
authenticate_and_save_token()
