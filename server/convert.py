import pickle
import base64
import os

# Caminhos dos arquivos
PICKLE_FILE = 'token.pkl'
BASE64_FILE = 'token_base64.txt'
RESTORED_FILE = 'token.pkl'

# 🔄 Converte .pickle → Base64 (texto)
def pickle_to_base64(pickle_path, output_txt):
    with open(pickle_path, 'rb') as f:
        binary_data = f.read()
        base64_text = base64.b64encode(binary_data).decode('utf-8')
    with open(output_txt, 'w') as f:
        f.write(base64_text)
    print(f'Arquivo Base64 salvo em: {output_txt}')

# 🔄 Converte Base64 (texto) → .pickle
def base64_to_pickle(base64_txt, output_pickle):
    with open(base64_txt, 'r') as f:
        base64_text = f.read()
        binary_data = base64.b64decode(base64_text.encode('utf-8'))
    with open(output_pickle, 'wb') as f:
        f.write(binary_data)
    print(f'Arquivo .pickle restaurado em: {output_pickle}')


if (os.path.exists("server/token.pkl")):
    pickle_to_base64(PICKLE_FILE, BASE64_FILE)

else:
    base64_to_pickle(BASE64_FILE, RESTORED_FILE)
