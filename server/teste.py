from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build, HttpRequest
import pickle
import os

SCOPES = ['https://www.googleapis.com/auth/drive']



def authenticate():
    try:
        flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
        creds = flow.run_local_server(port=1111)  # abre navegador para login e autorização
        # Salva os tokens para usar depois (em modo headless)
        with open('token.pkl', 'wb') as token:
            pickle.dump(creds, token)
        return creds

    except BaseException:
        os._exit(0)

    except Exception:
        os._exit(0)

def load_creds():
    import os
    import pickle
    if os.path.exists('token.pkl'):
        with open('token.pkl', 'rb') as token:
            creds = pickle.load(token)
        if creds and creds.valid:
            return creds
        elif creds and creds.expired and creds.refresh_token:
            creds.refresh(HttpRequest())
            return creds
    return authenticate()

creds = load_creds()
service = build('drive', 'v3', credentials=creds)
# agora pode usar `service` normalmente
