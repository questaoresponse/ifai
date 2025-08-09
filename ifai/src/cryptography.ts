const secret = "meu_token_secreto";
async function encrypt(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const keyData = encoder.encode(secret.padEnd(32, "0")); // AES-256 precisa de 32 bytes

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  const iv = crypto.getRandomValues(new Uint8Array(12)); // vetor de inicialização

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );

  // Concatena IV + dados criptografados, tudo em base64
  const resultBytes = new Uint8Array(iv.length + encrypted.byteLength);
  resultBytes.set(iv, 0);
  resultBytes.set(new Uint8Array(encrypted), iv.length);

  return btoa(String.fromCharCode(...resultBytes));
}

async function decrypt(encryptedBase64: string): Promise<string> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const raw = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));

  const iv = raw.slice(0, 12); // primeiros 12 bytes são o IV
  const data = raw.slice(12);  // o resto é o conteúdo criptografado

  const keyData = encoder.encode(secret.padEnd(32, "0"));

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );

  return decoder.decode(decrypted);
}

export {
    encrypt,
    decrypt
}