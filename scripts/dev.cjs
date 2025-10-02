// gerenciador.js
const { exec } = require("child_process");

// Inicia os dois processos
const s1 = exec("cd ifai && npx wrangler dev");
const s2 = exec("cd web && npm run dev");
const s3 = exec(`cd server && ${process.platform == "linux" ? "python3" : "python"} main.py`)

s1.stdout.pipe(process.stdout);
s2.stdout.pipe(process.stdout);
s3.stdout.pipe(process.stdout);

console.log("Servidores iniciados. Pressione CTRL+C para cancelar.");

process.on("SIGINT", () => {
  console.log("\nCancelando...");
  s1.kill("SIGINT");
  s2.kill("SIGINT");
  s3.kill("SIGINT");
  process.exit();
});