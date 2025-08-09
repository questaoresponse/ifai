
import asyncio
import json
import os
import time
import io
from googleapiclient.http import MediaIoBaseUpload, MediaIoBaseDownload, MediaFileUpload
import httpx
from quart import Quart, send_file, send_from_directory, request, jsonify, make_response
from quart_cors import cors
import socketio
import uvicorn
from init import get_drive_service, get_firebase_db, get_messaging

# import smtplib
# import dns.resolver

io = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    ping_interval = 10,
    ping_timeout = 5
)
app = Quart(__name__)
app = cors(app, allow_origin="http://localhost:5173", allow_credentials=True)  # ou use um domínio específico
asgi_app = socketio.ASGIApp(io, app)

app.config["UPLOAD_FOLDER"] = "uploads"
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

# CONFIGURAÇÃO
# SERVICE_ACCOUNT_FILE = 'service_account.json'
SCOPES = ['https://www.googleapis.com/auth/drive']
FOLDER_ID = '1ZCCRGYliF8_02KTDlr1zlOBRhaETjED4'

# Autenticação
# credentials = service_account.Credentials.from_service_account_file(
#     SERVICE_ACCOUNT_FILE, scopes=SCOPES)

service = get_drive_service()
db = get_firebase_db()
messaging = get_messaging()

# ➕ Criar arquivo
def upload_file(file_path):
    file_name = os.path.basename(file_path)
    file_metadata = {
        'name': file_name,
        'parents': [FOLDER_ID]
    }
    media = MediaIoBaseUpload(open(file_path, 'rb'), mimetype='application/octet-stream')
    file = service.files().create(
        body=file_metadata,
        media_body=media,
        fields='id, name',
        supportsAllDrives=True
    ).execute()
    print(f"Enviado: {file['name']} (ID: {file['id']})")

# 📄 Listar arquivos
def list_files(FOLDER_ID):
    query = f"'{FOLDER_ID}' in parents"
    result = service.files().list(
        q=query,
        fields="files(id, name)",
        supportsAllDrives=True
    ).execute()
    files = result.get('files', [])
    for f in files:
        print(f"{f['name']} ({f['id']})")
    return files

# 🗑️ Deletar arquivo
def delete_file(file_id):
    service.files().delete(
        fileId=file_id,
        supportsAllDrives=True
    ).execute()
    print(f"Arquivo {file_id} deletado.")

# ✏️ Atualizar arquivo
def update_file(file_id, new_file_path):
    media = MediaIoBaseUpload(open(new_file_path, 'rb'), mimetype='application/octet-stream')
    updated = service.files().update(
        fileId=file_id,
        media_body=media,
        supportsAllDrives=True
        ).execute()
    print(f"Arquivo {updated['name']} atualizado.")

# ⬇️ Baixar arquivo
def download_file(file_id, destination_path):
    request = service.files().get_media(
        fileId=file_id,
        supportsAllDrives=True
    )
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
            fields='id, name',
            supportsAllDrives=True
        ).execute()

    remove_file(filename)

    return {
        'result': 'true',
        'file_id': uploaded_file['id'],
        'file_name': uploaded_file['name']
    }

def verify_email(matricula: str):
    return True
#     email = f"catce.{matricula.lower()}@aluno.ifpi.edu.br"
#     return validate_email(email, verify=True)  # verify=True tenta contato via SMTP
#     # try:
#     #     email = f"catce.{matricula.lower()}@aluno.ifpi.edu.br"
#     #     domain = email.split('@')[1]

#     #     # Obter servidor MX (Mail Exchange) do domínio
#     #     records = dns.resolver.resolve(domain, 'MX')
#     #     mx_record = str(records[0].exchange).rstrip('.')

#     #     # Conectar ao servidor SMTP
#     #     server = smtplib.SMTP()
#     #     server.set_debuglevel(0)
#     #     server.connect(mx_record)
#     #     server.helo('example.com')
#     #     server.mail('test@example.com')  # remetente fake (pode ser qualquer um)
#     #     code, message = server.rcpt(email)  # faz a verificação
#     #     server.quit()

#     #     if code == 250:
#     #         return True  # endereço de e-mail provavelmente existe
#     #     else:
#     #         return False

#     # except Exception as e:
#     #     print("Erro:", e)
#     #     return False

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
    user_uid = request.form.get("user_uid")
    FOLDER_ID = "1n4NyCacEBgb-jhnKpCic8aJSciDnNNn4"
    content_type = request.content_type or ''
    if 'application/json' in content_type:
        return list_files(FOLDER_ID), 200
    else:
        timestamp = request.form.get("timestamp")
        filename = request.files["file"].filename

        data = receive_and_upload_file(FOLDER_ID, f"pf_{timestamp}_{filename}")

        for doc in db.collection("usuarios").where(filter=("uid", "==", user_uid)).stream():
            doc.reference.update({ 
                "fotoPerfil": data["file_id"]
            })

            return jsonify(data), 200

@app.route("/like_action", methods=["POST"])
def like_action():
    data = request.get_json()

    action = data["action"]
    post_id = data["post_id"]

    if action == "like":
        for doc in db.collection("posts").where(filter=("id", "==", post_id)).stream():
            doc.reference.update({ 
                "likes": data["file_id"]
            })

# email = "catce.2025111ISINF0063@aluno.ifpi.edu.br"
# url = "https://api.emailawesome.com/api/validations/email_validation"
# headers = {
#     "x-api-key": "SWW5LBHeDjaTstmNkQcnnUspcXQ6qhm9OSeu8pHb",
#     "Content-Type": "application/json"
# }
# payload = {
#     "email": email,
#     "results_callback": {
#         "url": "https://6v9s4f5f-5170.brs.devtunnels.ms/verification",
#         "method": "POST",
#     }
# }

# response = requests.post(url, headers=headers, json=payload)

# params = {
#     "email": email,
#     "email_adress_status": "VALID",
#     "status": "COMPLETE"
# }
# response = requests.get(url, headers=headers, params=params)
# if response.status_code == 200:
#     dados = response.json()
#     print(dados)
#     if dados["status"] == "deliverable":
#         print(f"O e-mail {email} é válido.")
#     else:
#         print(f"O e-mail {email} não é válido: {dados['reason']}")
# else:
#     print(f"Erro na verificação: {response.status_code}")

@app.route("/email_check", methods=["POST"])
def email_check():
    data = request.get_json()
    if "matricula" in data:
        matricula = data["matricula"]
        # response = requests.get(f"http://apilayer.net/api/check?access_key=bcfec72ad8bc26b5f8cedf7c337a9b9d&email=catce.{matricula}@aluno.ifpi.edu.br&smtp=1&format=1").json()
        return jsonify({ "result": True, "is_valid": verify_email(matricula) })
    else:
        return jsonify({ "result": False })

@app.route("/verification", methods=["POST"])
def verification():
    data = request.get_json()
    print(data)
    return "", 200

@app.route("/")
def home():
    return send_file("public/index.html")

@app.route("/message", methods=["POST"])
def message():
    data = request.get_json()

    title = data["title"]
    body = data["body"]
    user_uid = data["other_uid"]
    chat_id = data["chat_id"]
    origin = request.headers.get('Origin')
    for doc in db.collection("usuarios").where("uid", "==", user_uid).stream():
        doc_data = doc.to_dict()

        tokens = list(json.loads(doc_data["tokens"]).keys())
        # token = "dl0xtGwinBFfEq2IakqnUe:APA91bFJT8DedKvr9jiQt1889KOB0QFb3lTbGmkfXPOtFeYh1CF5CGdPYsE65OwjWt5yIu2yNWkWoCxAzBeALuGyCqpnWfrj35U7b8YK82ItcKCPyrDPwXc"
        # Monta a mensagem
        message = messaging.MulticastMessage(
            data={
                "url": f"{origin}/chat?id={chat_id}"
            },
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            tokens=tokens,
        )

        # Envia a mensagem
        messaging.send_each_for_multicast(message)
        return jsonify({ "result": True })
    
# for doc in db.collection("usuarios").stream():
#     doc_data = doc.to_dict()
#     doc_data["tokens"] = json.dumps({})
#     doc.reference.set(doc_data)

@app.route("/token", methods=["POST"])
def token():
    data = request.get_json()
    new_token = data["token"]
    user_uid = data["user_uid"]
    current_token = request.cookies.get("token")

    if (current_token!=new_token):
        for doc in db.collection("usuarios").where("uid", "==", user_uid).stream():
            doc_data = doc.to_dict()

            tokens = json.loads(doc_data["tokens"])
            if current_token:
                del tokens[current_token]
            
            tokens[new_token] = int(time.time() * 1000)

            tokens = json.dumps(tokens)

            doc.reference.update({ 
                "tokens": tokens 
            })

            response = make_response(json.dumps({ "result": True }))
            response.set_cookie('token', new_token, httponly=True, samesite=None, max_age=3600)
            
            return response
        
        return jsonify({ "result": False })
    else:
        return jsonify({ "result": True })

@app.route("/<route>")
def route(route):
    if route in [ "favicon.ico", "firebase-messaging-sw.js", "service-worker.js" ]:
        return send_file(f"public/{route}")

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

@app.route('/imagem/<file_id>')
def baixar_imagem(file_id):
    print(file_id)
    request = service.files().get_media(fileId=file_id)
    fh = io.BytesIO()
    downloader = MediaIoBaseDownload(fh, request)

    done = False
    while done is False:
        status, done = downloader.next_chunk()
        print(f"Download {int(status.progress() * 100)}%.")
    
    # Volta para o início do buffer
    fh.seek(0)
    return send_file(fh, mimetype='image/jpeg')

@app.route("/logout", methods=["POST"])
def logout():
    data = request.get_json()
    user_uid = data["user_uid"]
    current_token = request.cookies.get("token")

    if (current_token):
        for doc in db.collection("usuarios").where("uid", "==", user_uid).stream():
            doc_data = doc.to_dict()

            tokens = json.loads(doc_data["tokens"])
            del tokens[current_token]
            
            tokens = json.dumps(tokens)

            doc.reference.update({ 
                "tokens": tokens 
            })

            response = make_response(json.dumps({ "result": True }))
            response.set_cookie('token', "", httponly=True, samesite=None, max_age=0)
            
            return response
    else:
        return jsonify({ "result": True })

async def keep_alive_loop():
    while True:
        await asyncio.sleep(10)
        try:
            async with httpx.AsyncClient() as client:
                await client.get("https://ifai-phwn.onrender.com")
        except:
            pass

# Inicializa tudo no modo assíncrono
async def main():
    # Cria a tarefa do loop de keep-alive
    loop_task = asyncio.create_task(keep_alive_loop())

    # Configura e inicia o servidor Uvicorn
    config = uvicorn.Config(app=asgi_app, host="0.0.0.0", port=22222)
    server = uvicorn.Server(config)
    await server.serve()

# Entry point
if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        os._exit(0)