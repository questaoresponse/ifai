from flask import Flask, send_file, send_from_directory, request, jsonify
from flask_cors import CORS
from google.oauth2 import service_account
from googleapiclient.discovery import build
import io
from googleapiclient.http import MediaIoBaseUpload, MediaIoBaseDownload, MediaFileUpload
import os
import time
# import requests
# import smtplib
# import dns.resolver
from validate_email_address import validate_email

app = Flask(__name__)
CORS(app)

app.config["UPLOAD_FOLDER"] = "uploads"

# CONFIGURAÇÃO
SERVICE_ACCOUNT_FILE = 'service_account.json'
SCOPES = ['https://www.googleapis.com/auth/drive']
FOLDER_ID = '1ZCCRGYliF8_02KTDlr1zlOBRhaETjED4'

# Autenticação
credentials = service_account.Credentials.from_service_account_file(
    SERVICE_ACCOUNT_FILE, scopes=SCOPES)

service = build('drive', 'v3', credentials=credentials)

# ➕ Criar arquivo
def upload_file(file_path):
    file_name = os.path.basename(file_path)
    file_metadata = {
        'name': file_name,
        'parents': [FOLDER_ID]
    }
    media = MediaIoBaseUpload(open(file_path, 'rb'), mimetype='application/octet-stream')
    file = service.files().create(body=file_metadata, media_body=media, fields='id, name').execute()
    print(f"Enviado: {file['name']} (ID: {file['id']})")

# 📄 Listar arquivos
def list_files(FOLDER_ID):
    query = f"'{FOLDER_ID}' in parents"
    result = service.files().list(q=query, fields="files(id, name)").execute()
    files = result.get('files', [])
    for f in files:
        print(f"{f['name']} ({f['id']})")
    return files

# 🗑️ Deletar arquivo
def delete_file(file_id):
    service.files().delete(fileId=file_id).execute()
    print(f"Arquivo {file_id} deletado.")

# ✏️ Atualizar arquivo
def update_file(file_id, new_file_path):
    media = MediaIoBaseUpload(open(new_file_path, 'rb'), mimetype='application/octet-stream')
    updated = service.files().update(fileId=file_id, media_body=media).execute()
    print(f"Arquivo {updated['name']} atualizado.")

# ⬇️ Baixar arquivo
def download_file(file_id, destination_path):
    request = service.files().get_media(fileId=file_id)
    fh = io.FileIO(destination_path, 'wb')
    downloader = MediaIoBaseDownload(fh, request)
    done = False
    while not done:
        status, done = downloader.next_chunk()
    print(f"Arquivo salvo em {destination_path}")

    # upload_file('exemplo.txt')
    # delete_file('FILE_ID')
    # update_file('FILE_ID', 'novo_arquivo.txt')
    # download_file('FILE_ID', 'saida.txt')

async def remove_file(filename):
    time.sleep(1)
    temp_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    os.remove(temp_path)


def receive_and_upload_file(FOLDER_ID, filename):
    if 'file' not in request.files:
        return jsonify({'result': False, 'error': 'Nenhum arquivo enviado'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'result': False, 'error': 'Arquivo sem nome'}), 400

    # Salvar temporariamente
    temp_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(temp_path)

    # Enviar para o Google Drive
    file_metadata = {
        'name': filename,
        'parents': [FOLDER_ID]
    }
    uploaded_file = None
    with open(temp_path, 'rb') as f:
        media = MediaFileUpload(temp_path, resumable=True)
        uploaded_file = service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id, name'
        ).execute()

    remove_file(filename)

    return jsonify({
        'result': 'true',
        'file_id': uploaded_file['id'],
        'file_name': uploaded_file['name']
    })

def verify_email(matricula: str):
    email = f"catce.{matricula.lower()}@aluno.ifpi.edu.br"
    return validate_email(email, verify=True)  # verify=True tenta contato via SMTP
    # try:
    #     email = f"catce.{matricula.lower()}@aluno.ifpi.edu.br"
    #     domain = email.split('@')[1]

    #     # Obter servidor MX (Mail Exchange) do domínio
    #     records = dns.resolver.resolve(domain, 'MX')
    #     mx_record = str(records[0].exchange).rstrip('.')

    #     # Conectar ao servidor SMTP
    #     server = smtplib.SMTP()
    #     server.set_debuglevel(0)
    #     server.connect(mx_record)
    #     server.helo('example.com')
    #     server.mail('test@example.com')  # remetente fake (pode ser qualquer um)
    #     code, message = server.rcpt(email)  # faz a verificação
    #     server.quit()

    #     if code == 250:
    #         return True  # endereço de e-mail provavelmente existe
    #     else:
    #         return False

    # except Exception as e:
    #     print("Erro:", e)
    #     return False

@app.route("/posts", methods=["POST"])
def posts():
    FOLDER_ID = "1WzDR-2mhxFKS5ydLcUeroZXeNwxe-uks"
    content_type = request.content_type or ''
    if 'application/json' in content_type:
        return list_files(FOLDER_ID), 200
    else:
        timestamp = request.form.get("timestamp")
        filename = request.files["file"].filename
        return receive_and_upload_file(FOLDER_ID, f"p_{timestamp}_{filename}"), 200


@app.route("/comunidades", methods=["POST"])
def comunidades():
    FOLDER_ID = "1WzDR-2mhxFKS5ydLcUeroZXeNwxe-uks"
    content_type = request.content_type or ''
    if 'application/json' in content_type:
        return list_files(FOLDER_ID), 200
    else:
        timestamp = request.form.get("timestamp")
        filename = request.files["file"].filename
        return receive_and_upload_file(FOLDER_ID, f"comunity_{timestamp}_{filename}"), 200

@app.route("/perfil", methods=["POST"])
def perfil():
    FOLDER_ID = "1n4NyCacEBgb-jhnKpCic8aJSciDnNNn4"
    content_type = request.content_type or ''
    if 'application/json' in content_type:
        return list_files(FOLDER_ID), 200
    else:
        timestamp = request.form.get("timestamp")
        filename = request.files["file"].filename
        return receive_and_upload_file(FOLDER_ID, f"pf_{timestamp}_{filename}"), 200

@app.route("/email_check", methods=["POST"])
def email_check():
    data = request.get_json()
    if "matricula" in data:
        matricula = data["matricula"]
        # response = requests.get(f"http://apilayer.net/api/check?access_key=bcfec72ad8bc26b5f8cedf7c337a9b9d&email=catce.{matricula}@aluno.ifpi.edu.br&smtp=1&format=1").json()
        return jsonify({ "result": True, "is_valid": verify_email(matricula) })
    else:
        return jsonify({ "result": False })
# def 

@app.route("/")
def home():
    return send_file("public/index.html")

@app.route("/<route>")
def route(route):
    return send_file("public/index.html")

@app.route("/favicon.ico")
def favicon():
    return send_file("public/favicon.ico")

@app.route("/assets/<filename>")
def assets_files(filename):
    return send_from_directory("public/assets", filename)

@app.route("/static/<filename>")
def static_files(filename):
    return send_from_directory("public/static", filename)

if __name__ == "__main__":
    app.run("0.0.0.0", 5170)
