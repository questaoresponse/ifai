import { getAuth } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { getDatabase, ref as dbRef, get, set, remove, onValue, update, query, orderByChild, limitToLast } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
import { getStorage, ref as storageRef } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-storage.js"

window.initializeFirebase(firebase=>{

window.usuarioLogado = null;
const respa = document.getElementById("resultadoPA");
if (!respa) {
  console.error("Elemento resultadoPA não encontrado");
}

window.carregarUsuarioAtual = () => {
  const user = getAuth().currentUser;
  if (user) {
    return get(dbRef(getDatabase(), "usuarios/" + user.uid)).then((snapshot) => {
        window.usuarioLogado = {
          uid: user.uid,
          ...snapshot.val()
        };
      });
  }
  return Promise.resolve();
}

function buscarAlunos() {
  if (!window.usuarioLogado) {
    window.location.href = "login.html";
    return;
  }

  const termo = document
    .getElementById("searchInput")
    .value.toLowerCase()
    .trim();
  const resultadosContainer = document.getElementById("searchResults");

  if (!resultadosContainer) {
    console.error("Elemento searchResults não encontrado");
    return;
  }

  resultadosContainer.innerHTML = "";

  if (termo === "") {
    return;
  }

get(dbRef(getDatabase(),"usuarios")).then((snapshot) => {
      let encontrados = false;

      snapshot.forEach((childSnapshot) => {
        const user = childSnapshot.val();
        const uid = childSnapshot.key;

        if (
          uid !== window.usuarioLogado.uid &&
          user.nome.toLowerCase().includes(termo)
        ) {
          encontrados = true;

          const div = document.createElement("div");
          div.style.display = "flex";
          div.style.alignItems = "center";
          div.style.marginBottom = "10px";

          const img = document.createElement("img");
          img.src = user.fotoPerfil ? user.fotoPerfil : "static/avatar.png";
          img.alt = `Foto de ${user.nome}`;
          img.style.width = "40px";
          img.style.height = "40px";
          img.style.borderRadius = "50%";
          img.style.marginRight = "10px";

          const nome = document.createElement("strong");
          nome.innerText = user.nome;

          div.appendChild(img);
          div.appendChild(nome);

          const verPerfilBtn = document.createElement("button");
          verPerfilBtn.innerText = "Ver Perfil";
          verPerfilBtn.onclick = () =>
            (window.location.href = `perfil.html?id=${uid}`);
          div.appendChild(verPerfilBtn);

          get(dbRef(getDatabase(), `friends/${window.usuarioLogado.uid}/${uid}`)).then((friendSnapshot) => {
              if (friendSnapshot.exists()) {
                const span = document.createElement("span");
                span.innerHTML = "<b> (Amigos)</b>";
                div.appendChild(span);
              } else {
                get(dbRef(getDatabase(), `friendRequests/${uid}/${window.usuarioLogado.uid}`)).then((requestSnapshot) => {
                    const btn = document.createElement("button");
                    btn.setAttribute("data-uid", uid);

                    if (requestSnapshot.exists()) {
                      btn.innerText = "Retirar solicitação";
                      btn.onclick = () => retirarPedido(uid);
                    } else {
                      get(dbRef(getDatabase(), `friendRequests/${window.usuarioLogado.uid}/${uid}`)).then((receivedRequestSnapshot) => {
                          if (receivedRequestSnapshot.exists()) {
                            const btnAceitar = document.createElement("button");
                            btnAceitar.textContent = "Aceitar";
                            btnAceitar.classList.add("aceitar");
                            btnAceitar.onclick = () => aceitarPedido(uid, div);

                            const btnRejeitar =
                              document.createElement("button");
                            btnRejeitar.textContent = "Rejeitar";
                            btnRejeitar.classList.add("rejeitar");
                            btnRejeitar.onclick = () => rejeitarPedido(uid);

                            div.appendChild(btnAceitar);
                            div.appendChild(btnRejeitar);
                          } else {
                            btn.innerText = "Adicionar";
                            btn.onclick = () => enviarPedido(uid);
                            div.appendChild(btn);
                          }
                        });
                    }
                  });
              }
              resultadosContainer.appendChild(div);
            });
        }
      });

      if (!encontrados) {
        resultadosContainer.textContent = "Nenhum aluno encontrado.";
      }
    });
}

function buscarAmigos() {
  const termo = document
    .getElementById("searchFriendsInput")
    .value.toLowerCase()
    .trim();
  const friendsListContainer = document.getElementById("friendsList");

  if (!friendsListContainer) {
    console.error("Elemento friendsList não encontrado");
    return;
  }

  friendsListContainer.innerHTML = "";

  if (termo === "") {
    carregarAmigos();
    return;
  }

get(dbRef(getDatabase(),`friends/${window.usuarioLogado.uid}`)).then((snapshot) => {
      snapshot.forEach((childSnapshot) => {
        const uidAmigo = childSnapshot.key;
        get(dbRef(getDatabase(), "usuarios/" + uidAmigo)).then((snap) => {
            const userAmigo = snap.val();

            if (userAmigo.nome.toLowerCase().includes(termo)) {
              const div = document.createElement("div");
              div.style.display = "flex";
              div.style.alignItems = "center";
              div.style.marginBottom = "10px";

              const img = document.createElement("img");
              img.src = userAmigo.fotoPerfil ?
                userAmigo.fotoPerfil :
                "static/avatar.png";
              img.alt = `Foto de ${userAmigo.nome}`;
              img.style.width = "40px";
              img.style.height = "40px";
              img.style.borderRadius = "50%";
              img.style.marginRight = "10px";

              const nome = document.createElement("strong");
              nome.innerText = userAmigo.nome;

              div.appendChild(img);
              div.appendChild(nome);

              const verPerfilBtn = document.createElement("button");
              verPerfilBtn.innerText = "Ver Perfil";
              verPerfilBtn.onclick = () =>
                (window.location.href = `perfil.html?id=${uidAmigo}`);
              div.appendChild(verPerfilBtn);

              const btnRemover = document.createElement("button");
              btnRemover.textContent = "Remover";
              btnRemover.onclick = () => removerAmigo(uidAmigo);
              div.appendChild(btnRemover);

              friendsListContainer.appendChild(div);
            }
          });
      });
    });
}

function enviarPedido(uidDestino) {
    if (!window.usuarioLogado) return;
    get(dbRef(getDatabase(),`friendRequests/${uidDestino}/${window.usuarioLogado.uid}`)).then((snapshot) => {
      if (snapshot.exists()) {
        if (respa) {
          respa.classList.add("erro");
          respa.classList.remove("hidden");
          respa.innerText = "Pedido já enviado.";
        }
      } else {
        set(dbRef(getDatabase(), `friendRequests/${uidDestino}/${window.usuarioLogado.uid}`), true).then(() => {
            if (respa) {
              respa.classList.add("sucesso");
              respa.classList.remove("hidden");
              respa.innerText = "Pedido enviado!";
              setTimeout(3000, function() {
                respa.classList.add("hidden");
                respa.classList.remove("sucesso");
                respa.innerText = "";
              });
            }

            const btn = document.querySelector(
              `button[data-uid="${uidDestino}"]`,
            );
            if (btn) {
              btn.innerText = "Retirar solicitação";
              btn.onclick = () => retirarPedido(uidDestino);
            }
            carregarPedidos();
          });
      }
    });
}

function retirarPedido(uidDestino) {
  if (!window.usuarioLogado) return;
dbRef(getDatabase(),`friendRequests/${uidDestino}/${window.usuarioLogado.uid}`)
    .remove()
    .then(() => {
      const btn = document.querySelector(`button[data-uid="${uidDestino}"]`);
      if (btn) {
        btn.innerText = "Adicionar";
        btn.onclick = () => enviarPedido(uidDestino);
      }
      carregarPedidos();
    });
}

function carregarAmigos() {
  const friendsListContainer = document.getElementById("friendsList");

  if (!friendsListContainer) {
    console.error("Elemento friendsList não encontrado");
    return;
  }

  friendsListContainer.innerHTML = "";

get(dbRef(getDatabase(),`friends/${window.usuarioLogado.uid}`)).then((snapshot) => {
      snapshot.forEach((childSnapshot) => {
        const uidAmigo = childSnapshot.key;
        get(dbRef(getDatabase(), "usuarios/" + uidAmigo)).then((snap) => {
            const userAmigo = snap.val();

            const div = document.createElement("div");
            div.style.display = "flex";
            div.style.alignItems = "center";
            div.style.marginBottom = "10px";

            const img = document.createElement("img");
            img.src = userAmigo.fotoPerfil ?
              userAmigo.fotoPerfil :
              "static/avatar.png";
            img.alt = `Foto de ${userAmigo.nome}`;
            img.style.width = "40px";
            img.style.height = "40px";
            img.style.borderRadius = "50%";
            img.style.marginRight = "10px";

            const nome = document.createElement("strong");
            nome.innerText = userAmigo.nome;

            div.appendChild(img);
            div.appendChild(nome);

            const verPerfilBtn = document.createElement("button");
            verPerfilBtn.innerText = "Ver Perfil";
            verPerfilBtn.onclick = () =>
              (window.location.href = `perfil.html?id=${uidAmigo}`);
            div.appendChild(verPerfilBtn);

            const btnRemover = document.createElement("button");
            btnRemover.textContent = "Remover";
            btnRemover.onclick = () => removerAmigo(uidAmigo);
            div.appendChild(btnRemover);

            friendsListContainer.appendChild(div);
          });
      });
    });
}

function carregarPedidos() {
  if (!window.usuarioLogado) return;
  const pedidosContainer = document.getElementById("friendRequests");

  if (!pedidosContainer) {
    console.error("Elemento friendRequests não encontrado");
    return;
  }

onValue(dbRef(getDatabase(),`friendRequests/${window.usuarioLogado.uid}`), (snapshot) => {
      pedidosContainer.innerHTML = "";

      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const uidSolicitante = childSnapshot.key;

          firebase
            get(dbRef(getDatabase(), "usuarios/" + uidSolicitante)).then((snap) => {
              const userSolicitante = snap.val();

              if (userSolicitante) {
                const div = document.createElement("div");
                div.style.display = "flex";
                div.style.alignItems = "center";
                div.style.marginBottom = "10px";

                const img = document.createElement("img");
                img.src = userSolicitante.fotoPerfil ?
                  userSolicitante.fotoPerfil :
                  "static/avatar.png";
                img.alt = `Foto de ${userSolicitante.nome}`;
                img.style.width = "40px";
                img.style.height = "40px";
                img.style.borderRadius = "50%";
                img.style.marginRight = "10px";

                const nome = document.createElement("strong");
                nome.innerText = userSolicitante.nome;

                div.appendChild(img);
                div.appendChild(nome);

                const btnAceitar = document.createElement("button");
                btnAceitar.textContent = "Aceitar";
                btnAceitar.classList.add("aceitar");
                btnAceitar.onclick = () => aceitarPedido(uidSolicitante);

                const btnRejeitar = document.createElement("button");
                btnRejeitar.textContent = "Rejeitar";
                btnRejeitar.classList.add("rejeitar");
                btnRejeitar.onclick = () => rejeitarPedido(uidSolicitante);

                div.appendChild(btnAceitar);
                div.appendChild(btnRejeitar);
                pedidosContainer.appendChild(div);
              }
            });
        });
      } else {
        pedidosContainer.textContent = "Sem pedidos de amizade no momento.";
      }
    });
}

function aceitarPedido(uidSolicitante, div = null) {
  if (!window.usuarioLogado) return;
dbRef(getDatabase(),`friends/${window.usuarioLogado.uid}/${uidSolicitante}`)
    .set(true);
dbRef(getDatabase(),`friends/${uidSolicitante}/${window.usuarioLogado.uid}`)
    .set(true);
dbRef(getDatabase(),`friendRequests/${window.usuarioLogado.uid}/${uidSolicitante}`)
    .remove()
    .then(() => {
      window.atualizarFriendSelect();
      carregarPedidos();
      carregarAmigos();
      if (div) {
        div.innerHTML = `<strong>${div.querySelector("strong").textContent}</strong> <span><b>(Amigos)</b></span>`;
      }
    });
}

function rejeitarPedido(uidSolicitante) {
  if (!window.usuarioLogado) return;
    remove(dbRef(getDatabase(),`friendRequests/${window.usuarioLogado.uid}/${uidSolicitante}`)).then(() => {
      carregarPedidos();
      carregarAmigos();
    });
}

window.atualizarFriendSelect = () => {
  if (!window.usuarioLogado) return;
  const friendList = document.getElementById("friendList");
  if (!friendList) {
    console.error("Elemento friendList não encontrado");
    return;
  }
  friendList.innerHTML = "";

get(dbRef(getDatabase(),`friends/${window.usuarioLogado.uid}`)).then((snapshot) => {
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const uidAmigo = childSnapshot.key;
          get(dbRef(getDatabase(), "usuarios/" + uidAmigo)).then((snap) => {
              const userAmigo = snap.val();
              const div = document.createElement("div");
              div.classList.add("friend-item");
              div.setAttribute("data-uid", uidAmigo);
              div.onclick = () => selecionarChat(uidAmigo);

              const imgSrc = userAmigo.fotoPerfil || "static/avatar.png";
              const chatId = [window.usuarioLogado.uid, uidAmigo].sort().join("_");

              function atualizarUltimaMensagem(snapshot) {
                let lastMessage = "";
                let lastTimestamp = "";
                snapshot.forEach((messageSnapshot) => {
                  const message = messageSnapshot.val();
                  lastMessage =
                    message.texto.length > 10 ?
                    message.texto.substring(0, 10) + "..." :
                    message.texto;
                  lastTimestamp = formatTime(new Date(message.timestamp));
                });

                const badgeId = `badge-${uidAmigo}`;
                let badgeHTML = `<span id="${badgeId}" class="notification-badge" style="display: none;"></span>`;

                div.innerHTML = `
              <img src="${imgSrc}" class="friend-avatar">
              <div class="friend-text">
                <strong>${userAmigo.nome} ${badgeHTML}</strong>
                <p>${lastMessage} <span>${lastTimestamp}</span></p>
              </div>
            `;

                atualizarbadge(uidAmigo, badgeId);
              }

                get(query(
                    dbRef(getDatabase(), `chats/${chatId}`),
                    orderByChild("timestamp"),
                    limitToLast(1)
                 )).then((chatSnapshot) => {
                  atualizarUltimaMensagem(chatSnapshot);
                  friendList.appendChild(div);
                });

            get(query(
                dbRef(getDatabase(), `chats/${chatId}`),
                orderByChild("timestamp"),
                limitToLast(1)
            )).then((snapshot) => {
                  atualizarUltimaMensagem(snapshot);
                });
            });
        });
      }
    });
}

function atualizarbadge(uidAmigo, badgeId) {
  const chatId = [window.usuarioLogado.uid, uidAmigo].sort().join("_");

onValue(dbRef(getDatabase(),`chats/${chatId}`), (snapshot) => {
      let totalNaoLidas = 0;

      snapshot.forEach((messageSnap) => {
        const mensagem = messageSnap.val();
        if (mensagem.remetente === uidAmigo && mensagem.lida === false) {
          totalNaoLidas++;
        }
      });

      const badge = document.getElementById(badgeId);
      if (badge) {
        if (totalNaoLidas > 0) {
          badge.textContent = totalNaoLidas > 99 ? "99+" : totalNaoLidas;
          badge.style.display = "inline-block";
        } else {
          badge.style.display = "none";
        }
      }
    });
}

let chatAtivo = null;
let modoSelecao = false;
let mensagensSelecionadas = [];
let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let audioTimer;
let audioSeconds = 0;

window.enviarMensagem = () => {
  if (!window.usuarioLogado || !chatAtivo) return;
  const messageInput = document.getElementById("messageInput");
  if (!messageInput) {
    console.error("Elemento messageInput não encontrado");
    return;
  }
  const message = messageInput.value;
  if (message.trim() === "") {
    return;
  }

  if (messageInput) {
    messageInput.addEventListener("keydown", (event) => {
      if (!chatAtivo) return;
      const chatId = [window.usuarioLogado.uid, chatAtivo].sort().join("_");

      if (event.key === "Enter") {
        if (event.shiftKey) {} else {
          event.preventDefault();
        }
      }

        set(dbRef(getDatabase(), `chats/${chatId}/typing/${window.usuarioLogado.uid}`), true);

        clearTimeout(window.typingTimeout);
        window.typingTimeout = setTimeout(() => {
            set(dbRef(getDatabase(), `chats/${chatId}/typing/${window.usuarioLogado.uid}`), false);
        }, 2000);
        });

    messageInput.addEventListener("blur", () => {
        if (!chatAtivo) return;
        const chatId = [window.usuarioLogado.uid, chatAtivo].sort().join("_");

        set(dbRef(getDatabase(), `chats/${chatId}/typing/${window.usuarioLogado.uid}`), false);
    });
  }

  const novaMensagem = {
    remetente: window.usuarioLogado.uid,
    texto: message,
    timestamp: Date.now(),
    lida: false,
  };
  const chatId = [window.usuarioLogado.uid, chatAtivo].sort().join("_");
dbRef(getDatabase(),`chats/${chatId}`)
    .push(novaMensagem)
    .then(() => {
      messageInput.value = "";
      setTimeout(() => {
        const chatMessagesContainer = document.getElementById("chat-messages");
        if (chatMessagesContainer) {
          chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
        }
      }, 100);
    });

  marcarMensagensComoLidas(chatId);
}

function excluirMensagem(chatId, messageId) {
  if (confirm("Tem certeza que deseja excluir esta mensagem?")) {
    firebase
      .database()
      .dbRef(getDatabase(), `chats/${chatId}/${messageId}`)
      .remove()
      .then(() => {
        console.log("Mensagem excluída com sucesso");
      })
      .catch((error) => {
        console.error("Erro ao excluir mensagem:", error);
      });
  }
}

function adicionarBotaoGravacaoAudio() {
  const inputContainer = document.getElementById("chat-input");

  if (!inputContainer) {
    console.error("Container de input não encontrado");
    return;
  }

  const audioButton = document.createElement("button");
  audioButton.id = "audio-record-btn";
  audioButton.type = "button";
  audioButton.className = "attachment-btn";
  audioButton.innerHTML = '<i class="fa-solid fa-microphone"></i>';
  audioButton.title = "Gravar mensagem de voz";
  audioButton.style.background = "none";
  audioButton.style.border = "none";
  audioButton.style.color = "#248232";
  audioButton.style.fontSize = "20px";
  audioButton.style.cursor = "pointer";
  audioButton.style.padding = "5px 10px";
  audioButton.style.transition = "all 0.2s ease";

  const style = document.createElement("style");
  style.textContent = `
    #audio-record-btn.recording {
      color: #e53935 !important;
      animation: pulse 1.5s infinite ease-in-out;
    }
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.4; }
      100% { opacity: 1; }
    }
  `;
  document.head.appendChild(style);

  audioButton.addEventListener("click", iniciarGravacaoAudio);

  const sendButton = inputContainer.querySelector('button[type="submit"]') ||
    inputContainer.querySelector(".send-btn");

  if (sendButton) {
    inputContainer.insertBefore(audioButton, sendButton);
  } else {
    inputContainer.appendChild(audioButton);
  }
}

function iniciarGravacaoAudio() {
  if (!window.usuarioLogado || !chatAtivo) return;

  if (!navigator.mediaDevices || !window.MediaRecorder) {
    alert("Seu navegador não suporta gravação de áudio.");
    return;
  }

  if (isRecording) {
    pararGravacaoAudio();
    return;
  }

  navigator.mediaDevices.getUserMedia({
      audio: true
    })
    .then(stream => {
      const gravadorContainer = document.getElementById("gravador-container");
      if (gravadorContainer) {
        gravadorContainer.style.display = "flex";
      } else {
        criarGravadorContainer();
      }

      audioSeconds = 0;
      atualizarTempoGravacao();
      audioTimer = setInterval(atualizarTempoGravacao, 1000);

      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, {
          type: "audio/wav"
        });
        enviarAudioMensagem(audioBlob);
      };

      mediaRecorder.start();
      isRecording = true;

      const gravacaoBtn = document.getElementById("audio-record-btn");
      if (gravacaoBtn) {
        gravacaoBtn.innerHTML = '<i class="fa-solid fa-stop"></i>';
        gravacaoBtn.classList.add("recording");
        gravacaoBtn.title = "Parar gravação";
      }
    })
    .catch(error => {
      console.error("Erro ao acessar o microfone:", error);
      alert("Não foi possível acessar o microfone.");
    });
}

function pararGravacaoAudio() {
  if (!mediaRecorder || mediaRecorder.state === "inactive") return;

  clearInterval(audioTimer);

  mediaRecorder.stop();
  isRecording = false;

  if (mediaRecorder.stream) {
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
  }

  const gravadorContainer = document.getElementById("gravador-container");
  if (gravadorContainer) {
    gravadorContainer.style.display = "none";
  }

  const gravacaoBtn = document.getElementById("audio-record-btn");
  if (gravacaoBtn) {
    gravacaoBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
    gravacaoBtn.classList.remove("recording");
    gravacaoBtn.title = "Gravar mensagem de voz";
  }
}

function cancelarGravacaoAudio() {
  if (!mediaRecorder || mediaRecorder.state === "inactive") return;

  mediaRecorder.onstop = null;

  clearInterval(audioTimer);

  mediaRecorder.stop();
  isRecording = false;
  audioChunks = [];

  if (mediaRecorder.stream) {
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
  }

  const gravadorContainer = document.getElementById("gravador-container");
  if (gravadorContainer) {
    gravadorContainer.style.display = "none";
  }

  const gravacaoBtn = document.getElementById("audio-record-btn");
  if (gravacaoBtn) {
    gravacaoBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
    gravacaoBtn.classList.remove("recording");
    gravacaoBtn.title = "Gravar mensagem de voz";
  }
}

function atualizarTempoGravacao() {
  audioSeconds++;
  const minutos = Math.floor(audioSeconds / 60);
  const segundos = audioSeconds % 60;

  const tempoFormatado = `${minutos.toString().padStart(2, "0")}:${segundos.toString().padStart(2, "0")}`;
  const tempoElement = document.getElementById("tempo-gravacao");

  if (tempoElement) {
    tempoElement.textContent = tempoFormatado;
  }

  if (audioSeconds >= 180) {
    pararGravacaoAudio();
  }
}

function criarGravadorContainer() {
  const chatContainer = document.getElementById("chat-container") || document.body;

  const gravadorContainer = document.createElement("div");
  gravadorContainer.id = "gravador-container";
  gravadorContainer.style.display = "flex";
  gravadorContainer.style.alignItems = "center";
  gravadorContainer.style.justifyContent = "space-between";
  gravadorContainer.style.backgroundColor = "#f0f0f0";
  gravadorContainer.style.padding = "10px 15px";
  gravadorContainer.style.borderRadius = "10px";
  gravadorContainer.style.margin = "10px 0";
  gravadorContainer.style.gap = "10px";
  gravadorContainer.style.position = "fixed";
  gravadorContainer.style.bottom = "70px";
  gravadorContainer.style.left = "50%";
  gravadorContainer.style.transform = "translateX(-50%)";
  gravadorContainer.style.width = "80%";
  gravadorContainer.style.maxWidth = "400px";
  gravadorContainer.style.zIndex = "100";

  const recordingIcon = document.createElement("div");
  recordingIcon.innerHTML = '<i class="fa-solid fa-circle"></i>';
  recordingIcon.style.color = "red";
  recordingIcon.style.fontSize = "14px";
  recordingIcon.style.animation = "pulse 1.5s infinite ease-in-out";

  const tempoGravacao = document.createElement("div");
  tempoGravacao.id = "tempo-gravacao";
  tempoGravacao.textContent = "00:00";
  tempoGravacao.style.fontFamily = "monospace";
  tempoGravacao.style.fontSize = "16px";
  tempoGravacao.style.fontWeight = "bold";

  const lembrete = document.createElement("div");
  lembrete.textContent = "Áudios podem ter no máximo 3 minutos.";
  lembrete.style.fontSize = "12px";
  lembrete.style.color = "#666";
  lembrete.style.marginTop = "5px";
  lembrete.style.textAlign = "center";
  lembrete.style.width = "100%";

  const botoesContainer = document.createElement("div");
  botoesContainer.style.display = "flex";
  botoesContainer.style.gap = "15px";

  const enviarBtn = document.createElement("button");
  enviarBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
  enviarBtn.style.border = "none";
  enviarBtn.style.backgroundColor = "#248232";
  enviarBtn.style.color = "white";
  enviarBtn.style.borderRadius = "50%";
  enviarBtn.style.width = "35px";
  enviarBtn.style.height = "35px";
  enviarBtn.style.display = "flex";
  enviarBtn.style.alignItems = "center";
  enviarBtn.style.justifyContent = "center";
  enviarBtn.style.cursor = "pointer";
  enviarBtn.title = "Enviar";
  enviarBtn.onclick = pararGravacaoAudio;

  const cancelarBtn = document.createElement("button");
  cancelarBtn.innerHTML = '<i class="fa-solid fa-times"></i>';
  cancelarBtn.style.border = "none";
  cancelarBtn.style.backgroundColor = "#e53935";
  cancelarBtn.style.color = "white";
  cancelarBtn.style.borderRadius = "50%";
  cancelarBtn.style.width = "35px";
  cancelarBtn.style.height = "35px";
  cancelarBtn.style.display = "flex";
  cancelarBtn.style.alignItems = "center";
  cancelarBtn.style.justifyContent = "center";
  cancelarBtn.style.cursor = "pointer";
  cancelarBtn.title = "Cancelar";
  cancelarBtn.onclick = cancelarGravacaoAudio;

  botoesContainer.appendChild(enviarBtn);
  botoesContainer.appendChild(cancelarBtn);

  gravadorContainer.appendChild(recordingIcon);
  gravadorContainer.appendChild(tempoGravacao);
  gravadorContainer.appendChild(lembrete);
  gravadorContainer.appendChild(botoesContainer);

  chatContainer.appendChild(gravadorContainer);
}

function enviarAudioMensagem(audioBlob) {
  if (!window.usuarioLogado || !chatAtivo || !audioBlob) return;

  const chatId = [window.usuarioLogado.uid, chatAtivo].sort().join("_");
  const audioFileName = `audio_${window.usuarioLogado.uid}_${Date.now()}.wav`;

  const audioRef = storageRef(getStorage(), `chat_audios/${chatId}/${audioFileName}`);

  const progressBar = document.createElement("div");
  progressBar.style.width = "0%";
  progressBar.style.height = "4px";
  progressBar.style.backgroundColor = "#4CAF50";
  progressBar.style.position = "fixed";
  progressBar.style.top = "0";
  progressBar.style.left = "0";
  progressBar.style.zIndex = "1000";
  document.body.appendChild(progressBar);

  const uploadTask = audioRef.put(audioBlob);

  uploadTask.on("state_changed",
    (snapshot) => {
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      progressBar.style.width = `${progress}%`;
    },
    (error) => {
      console.error("Erro ao fazer upload do áudio:", error);
      alert("Não foi possível enviar a mensagem de voz.");
      document.body.removeChild(progressBar);
    },
    () => {
      uploadTask.snapshot.ref.getDownloadURL()
        .then((audioUrl) => {
          const messageInput = document.getElementById("messageInput");
          const messageText = messageInput ? messageInput.value.trim() : "";

          const novaMensagem = {
            remetente: window.usuarioLogado.uid,
            texto: messageText,
            audio: {
              url: audioUrl,
              duracao: audioSeconds
            },
            timestamp: Date.now(),
            lida: false
          };

          return dbRef(getDatabase(),`chats/${chatId}`).push(novaMensagem);
        })
        .then(() => {
          if (document.getElementById("messageInput")) {
            document.getElementById("messageInput").value = "";
          }
          document.body.removeChild(progressBar);
          marcarMensagensComoLidas(chatId);
        })
        .catch((error) => {
          console.error("Erro ao salvar mensagem de áudio:", error);
          alert("Não foi possível enviar a mensagem de voz.");
          if (document.body.contains(progressBar)) {
            document.body.removeChild(progressBar);
          }
        });
    }
  );
}

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const allowedFileTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats.officedocument.spreadsheetml.sheet",
    "text/plain",
    "application/zip",
    "application/x-rar-compressed"
  ];

  const imageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  const videoTypes = ["video/mp4", "video/webm", "video/ogg"];

  const maxFileSize = 20 * 1024 * 1024;

  if (imageTypes.includes(file.type)) {
    handleImageUpload(event);
    return;
  } else if (videoTypes.includes(file.type)) {
    handleVideoUpload(event);
    return;
  }

  if (!allowedFileTypes.includes(file.type)) {
    alert("Tipo de arquivo não suportado. Por favor, envie apenas documentos, PDFs ou arquivos compactados.");
    return;
  }

  if (file.size > maxFileSize) {
    alert("O tamanho do arquivo não pode ser maior que 20MB.");
    return;
  }

  const chatId = [window.usuarioLogado.uid, chatAtivo].sort().join("_");
  const messageInput = document.getElementById("messageInput");
  const messageText = messageInput ? messageInput.value.trim() : "";

  const fileRef = storageRef(getStorage(), `chat_files/${chatId}/${window.usuarioLogado.uid}_${Date.now()}_${file.name}`);

  const progressBar = document.createElement("div");
  progressBar.style.width = "0%";
  progressBar.style.height = "4px";
  progressBar.style.backgroundColor = "#4CAF50";
  progressBar.style.position = "fixed";
  progressBar.style.top = "0";
  progressBar.style.left = "0";
  progressBar.style.zIndex = "1000";
  document.body.appendChild(progressBar);

  fileRef.put(file)
    .then(snapshot => {
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      progressBar.style.width = `${progress}%`;
      return snapshot.ref.getDownloadURL();
    })
    .then(fileUrl => {
      const novaMensagem = {
        remetente: window.usuarioLogado.uid,
        texto: messageText,
        arquivo: {
          url: fileUrl,
          nome: file.name,
          tipo: file.type,
          tamanho: file.size
        },
        timestamp: Date.now(),
        lida: false
      };

      return dbRef(getDatabase(),`chats/${chatId}`).push(novaMensagem);
    })
    .then(() => {
      event.target.value = "";
      if (messageInput) {
        messageInput.value = "";
      }
      document.body.removeChild(progressBar);
      marcarMensagensComoLidas(chatId);
    })
    .catch(error => {
      console.error("Erro no upload do arquivo:", error);
      alert("Não foi possível enviar o arquivo.");
      if (document.body.contains(progressBar)) {
        document.body.removeChild(progressBar);
      }
    });
}

function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  const maxFileSize = 5 * 1024 * 1024;

  if (!allowedTypes.includes(file.type)) {
    alert("Apenas suportamos imagens JPEG, PNG, GIF e WebP.");
    return;
  }

  if (file.size > maxFileSize) {
    alert("A imagem não pode ser maior que 5MB.");
    return;
  }

  const chatId = [window.usuarioLogado.uid, chatAtivo].sort().join("_");
  const messageInput = document.getElementById("messageInput");
  const messageText = messageInput ? messageInput.value.trim() : "";

  const imageRef = storageRef(getStorage(), `chat_images/${chatId}/${window.usuarioLogado.uid}_${Date.now()}_${file.name}`);

  const progressBar = document.createElement("div");
  progressBar.style.width = "0%";
  progressBar.style.height = "4px";
  progressBar.style.backgroundColor = "#4CAF50";
  progressBar.style.position = "fixed";
  progressBar.style.top = "0";
  progressBar.style.left = "0";
  progressBar.style.zIndex = "1000";
  document.body.appendChild(progressBar);

  imageRef.put(file)
    .then(snapshot => {
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      progressBar.style.width = `${progress}%`;
      return snapshot.ref.getDownloadURL();
    })
    .then(imageUrl => {
      const novaMensagem = {
        remetente: window.usuarioLogado.uid,
        texto: messageText,
        imagem: imageUrl,
        timestamp: Date.now(),
        lida: false
      };

      return dbRef(getDatabase(),`chats/${chatId}`).push(novaMensagem);
    })
    .then(() => {
      event.target.value = "";
      if (messageInput) {
        messageInput.value = "";
      }
      document.body.removeChild(progressBar);
      marcarMensagensComoLidas(chatId);
    })
    .catch(error => {
      console.error("Erro no upload da imagem:", error);
      alert("Não foi possível enviar a imagem.");
      if (document.body.contains(progressBar)) {
        document.body.removeChild(progressBar);
      }
    });
}

function handleVideoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const maxFileSize = 20 * 1024 * 1024;
  const allowedTypes = ["video/mp4", "video/webm", "video/ogg"];

  if (!allowedTypes.includes(file.type)) {
    alert("Apenas suportamos vídeos MP4, WebM ou OGG.");
    return;
  }

  if (file.size > maxFileSize) {
    alert("O tamanho do vídeo não pode ser maior que 20MB.");
    return;
  }

  const chatId = [window.usuarioLogado.uid, chatAtivo].sort().join("_");
  const messageInput = document.getElementById("messageInput");
  const messageText = messageInput ? messageInput.value.trim() : "";

  const videoRef = storageRef(getStorage(), `chat_videos/${chatId}/${window.usuarioLogado.uid}_${Date.now()}_${file.name}`);

  const progressBar = document.createElement("div");
  progressBar.style.width = "0%";
  progressBar.style.height = "4px";
  progressBar.style.backgroundColor = "#4CAF50";
  progressBar.style.position = "fixed";
  progressBar.style.top = "0";
  progressBar.style.left = "0";
  progressBar.style.zIndex = "1000";
  document.body.appendChild(progressBar);

  videoRef.put(file)
    .then(snapshot => {
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      progressBar.style.width = `${progress}%`;
      return snapshot.ref.getDownloadURL();
    })
    .then(videoUrl => {
      const novaMensagem = {
        remetente: window.usuarioLogado.uid,
        texto: messageText,
        video: videoUrl,
        timestamp: Date.now(),
        lida: false
      };

      return dbRef(getDatabase(),`chats/${chatId}`).push(novaMensagem);
    })
    .then(() => {
      event.target.value = "";
      if (messageInput) {
        messageInput.value = "";
      }
      document.body.removeChild(progressBar);
      marcarMensagensComoLidas(chatId);
    })
    .catch(error => {
      console.error("Erro no upload do vídeo:", error);
      alert("Não foi possível enviar o vídeo.");
      if (document.body.contains(progressBar)) {
        document.body.removeChild(progressBar);
      }
    });
}

function excluirAudio(chatId, messageId, audioUrl) {
  if (!window.usuarioLogado || !chatAtivo) return;

  if (confirm("Tem certeza que deseja excluir esta mensagem de áudio?")) {
    const storageRef = firebase.storage().refFromURL(audioUrl);
    storageRef.delete()
      .then(() => {
        return dbRef(getDatabase(),`chats/${chatId}/${messageId}`).remove();
      })
      .then(() => {
        console.log("Mensagem de áudio excluída com sucesso");
      })
      .catch(error => {
        console.error("Erro ao excluir mensagem de áudio:", error);
        alert("Não foi possível excluir a mensagem.");
      });
  }
}

function excluirImagem(chatId, messageId, imageUrl) {
  if (!window.usuarioLogado || !chatAtivo) return;

  if (confirm("Tem certeza que deseja excluir esta mensagem com imagem?")) {
    const storageRef = firebase.storage().refFromURL(imageUrl);
    storageRef.delete()
      .then(() => {
        return dbRef(getDatabase(),`chats/${chatId}/${messageId}`).remove();
      })
      .then(() => {
        console.log("Mensagem e imagem excluídas com sucesso");
      })
      .catch(error => {
        console.error("Erro ao excluir mensagem com imagem:", error);
        alert("Não foi possível excluir a mensagem.");
      });
  }
}

function excluirVideo(chatId, messageId, videoUrl) {
  if (!window.usuarioLogado || !chatAtivo) return;

  if (confirm("Tem certeza que deseja excluir esta mensagem com vídeo?")) {
    const storageRef = firebase.storage().refFromURL(videoUrl);
    storageRef.delete()
      .then(() => {
        return dbRef(getDatabase(),`chats/${chatId}/${messageId}`).remove();
      })
      .then(() => {
        console.log("Mensagem e vídeo excluídos com sucesso");
      })
      .catch(error => {
        console.error("Erro ao excluir mensagem com vídeo:", error);
        alert("Não foi possível excluir a mensagem.");
      });
  }
}

function excluirArquivo(chatId, messageId, fileUrl) {
  if (!window.usuarioLogado || !chatAtivo) return;

  if (confirm("Tem certeza que deseja excluir esta mensagem com arquivo?")) {
    const storageRef = firebase.storage().refFromURL(fileUrl);
    storageRef.delete()
      .then(() => {
        return dbRef(getDatabase(),`chats/${chatId}/${messageId}`).remove();
      })
      .then(() => {
        console.log("Mensagem e arquivo excluídos com sucesso");
      })
      .catch(error => {
        console.error("Erro ao excluir mensagem com arquivo:", error);
        alert("Não foi possível excluir a mensagem.");
      });
  }
}

function carregarMensagens() {
  const chatMessagesContainer = document.getElementById("chat-messages");
  if (!chatMessagesContainer) {
    console.error("Elemento chat-messages não encontrado");
    return;
  }
  const chatId = [window.usuarioLogado.uid, chatAtivo].sort().join("_");

  let barraOpcoes = document.getElementById("barra-opcoes-selecao");
  if (!barraOpcoes) {
    barraOpcoes = document.createElement("div");
    barraOpcoes.id = "barra-opcoes-selecao";
    barraOpcoes.style.position = "fixed";

    barraOpcoes.style.left = "0";
    barraOpcoes.style.right = "0";
    barraOpcoes.style.backgroundColor = "#333";
    barraOpcoes.style.color = "white";
    barraOpcoes.style.padding = "10px";
    barraOpcoes.style.display = "none";
    barraOpcoes.style.justifyContent = "space-between";
    barraOpcoes.style.alignItems = "center";

    const contadorSelecionadas = document.createElement("span");
    contadorSelecionadas.id = "contador-selecionadas";
    contadorSelecionadas.textContent = "0 selecionadas";

    const btnExcluir = document.createElement("button");
    btnExcluir.textContent = "Excluir";
    btnExcluir.style.backgroundColor = "red";
    btnExcluir.style.color = "white";
    btnExcluir.style.border = "none";
    btnExcluir.style.padding = "5px 10px";
    btnExcluir.style.borderRadius = "5px";
    btnExcluir.style.cursor = "pointer";
    btnExcluir.onclick = excluirMensagensSelecionadas;

    const btnCancelar = document.createElement("button");
    btnCancelar.textContent = "Cancelar";
    btnCancelar.style.backgroundColor = "gray";
    btnCancelar.style.color = "white";
    btnCancelar.style.border = "none";
    btnCancelar.style.padding = "5px 10px";
    btnCancelar.style.borderRadius = "5px";
    btnCancelar.style.cursor = "pointer";
    btnCancelar.onclick = cancelarSelecao;

    barraOpcoes.appendChild(contadorSelecionadas);
    barraOpcoes.appendChild(btnExcluir);
    barraOpcoes.appendChild(btnCancelar);

    document.body.appendChild(barraOpcoes);
  }

dbRef(getDatabase(),`chats/${chatId}`)
    .orderByChild("timestamp")
    .on("value", (snapshot) => {
      chatMessagesContainer.innerHTML = "";
      let lastTimestamp = 0;
      snapshot.forEach((childSnapshot) => {
        const messageId = childSnapshot.key;
        const mensagem = childSnapshot.val();
        const mensagemContainer = document.createElement("div");
        mensagemContainer.setAttribute("data-message-id", messageId);
        mensagemContainer.style.display = "flex";
        mensagemContainer.style.alignItems = "center";
        mensagemContainer.style.margin = "10px 0";

        const img = document.createElement("img");
        img.style.width = "40px";
        img.style.height = "40px";
        img.style.borderRadius = "50%";
        img.style.objectFit = "cover";
        img.style.marginRight = "10px";

        const div = document.createElement("div");
        div.classList.add("message-bubble");
        div.style.padding = "8px";
        div.style.borderRadius = "15px";
        div.style.maxWidth = "fit-content";
        div.style.position = "relative";

        const timestamp = mensagem.timestamp;
        const date = new Date(timestamp);
        if (timestamp - lastTimestamp > 600000) {
          const timeDiv = document.createElement("div");
          timeDiv.style.textAlign = "center";
          timeDiv.style.fontWeight = "bold";
          timeDiv.textContent = formatTimestamp(date);
          chatMessagesContainer.appendChild(timeDiv);
        }
        lastTimestamp = timestamp;

        if (mensagem.remetente === window.usuarioLogado.uid) {
          const messageWrapper = document.createElement("div");
          messageWrapper.style.position = "relative";
          messageWrapper.style.display = "inline-block";
          messageWrapper.style.marginLeft = "auto";
          messageWrapper.classList.add("mensagem-usuario");
          messageWrapper.setAttribute("data-message-id", messageId);

          div.style.backgroundColor = "green";
          div.style.color = "white";
          div.style.marginLeft = "auto";
          const timeString = formatTime(date);

          let messageContent = `<div style="font-weight:bold;">Você</div>`;

          if (mensagem.imagem) {
            messageContent += `
              <div style="margin: 5px 0;">
                <img src="${mensagem.imagem}" style="max-width: 250px; max-height: 250px; border-radius: 10px; cursor: pointer;" 
                  onclick="abrirImagemModal('${mensagem.imagem}')">
              </div>
            `;
          }

          if (mensagem.video) {
            messageContent += `
              <div style="margin: 5px 0;">
                <video src="${mensagem.video}" controls style="max-width: 250px; max-height: 250px; border-radius: 10px;"></video>
              </div>
            `;
          }

          if (mensagem.audio && mensagem.audio.url) {
            const duracao = mensagem.audio.duracao || 0;
            const minutos = Math.floor(duracao / 60);
            const segundos = duracao % 60;
            const duracaoFormatada = `${minutos.toString().padStart(2, "0")}:${segundos.toString().padStart(2, "0")}`;

            messageContent += `
              <div style="margin: 5px 0; display: flex; align-items: center; background-color: #1b5c2438; border-radius: 10px; padding: 8px;">
                <audio id="audio-${messageId}" src="${mensagem.audio.url}" preload="auto"></audio>
                <button onclick="togglePlayPause('audio-${messageId}', 'play-btn-${messageId}')" 
                  id="play-btn-${messageId}" style="background: none; border: none; font-size: 20px; color: green; cursor: pointer;">
                  <i class="fa-solid fa-play"></i>
                </button>
                <div style="flex-grow: 1; height: 4px; background-color: #e0e0e0; border-radius: 2px; margin: 0 10px; cursor: pointer;" 
                  onclick="seekAudio('audio-${messageId}', this)">
                  <div style="height: 100%; width: 0%; background-color: #248232;"></div>
                </div>
                <div style="font-size: 12px; color: white;">${duracaoFormatada}</div>
              </div>
            `;
          }

          if (mensagem.arquivo) {
            messageContent += `
              <div style="margin: 5px 0; display: flex; align-items: center; background-color: #1b5c2438; border-radius: 10px; padding: 8px; cursor: pointer;">
                <div style="margin-right: 10px; font-size: 24px;">
                  ${getFileIcon(mensagem.arquivo.tipo)}
                </div>
                <div>
                  <strong>${mensagem.arquivo.nome}</strong>
                  <div style="font-size: 12px; color: white;">
                    ${formatFileSize(mensagem.arquivo.tamanho || 0)}
                  </div>
                </div>
                <a href="${mensagem.arquivo.url}" target="_blank" download="${mensagem.arquivo.nome}" 
                  style="margin-left: auto; color: white; text-decoration: none;">
                  <i class="fa-solid fa-download"></i> Baixar
                </a>
              </div>
            `;
          }

          if (mensagem.texto) {
            messageContent += `<div style="white-space: pre-wrap;">${mensagem.texto}</div>`;
          }

          messageContent += `<div style="text-align:right; font-size:small;">${timeString}</div>`;
          div.innerHTML = messageContent;

          const optionsButton = document.createElement("div");
          optionsButton.innerHTML = "⋮";
          optionsButton.style.cursor = "pointer";
          optionsButton.style.fontSize = "16px";
          optionsButton.style.padding = "3px";
          optionsButton.style.position = "absolute";
          optionsButton.style.right = "0";
          optionsButton.style.bottom = "-18px";

          const menuId = `menu-${messageId}`;
          const menuOpcoes = document.createElement("div");
          menuOpcoes.id = menuId;
          menuOpcoes.className = "menu-opcoes";
          menuOpcoes.style.position = "absolute";
          menuOpcoes.style.right = "0";
          menuOpcoes.style.bottom = "-40px";
          menuOpcoes.style.backgroundColor = "white";
          menuOpcoes.style.boxShadow = "0 2px 5px rgba(0,0,0,0.2)";
          menuOpcoes.style.padding = "5px";
          menuOpcoes.style.borderRadius = "3px";
          menuOpcoes.style.zIndex = "1000";
          menuOpcoes.style.display = "none";

          const excluirOpcao = document.createElement("div");
          excluirOpcao.textContent = "Excluir";
          excluirOpcao.style.padding = "5px 10px";
          excluirOpcao.style.cursor = "pointer";
          excluirOpcao.style.color = "red";
          excluirOpcao.style.margin = "0 auto";

          excluirOpcao.onclick = (e) => {
            e.stopPropagation();
            if (mensagem.audio && mensagem.audio.url) {
              excluirAudio(chatId, messageId, mensagem.audio.url);
            } else if (mensagem.arquivo) {
              excluirArquivo(chatId, messageId, mensagem.arquivo.url);
            } else if (mensagem.video) {
              excluirVideo(chatId, messageId, mensagem.video);
            } else if (mensagem.imagem) {
              excluirImagem(chatId, messageId, mensagem.imagem);
            } else {
              excluirMensagem(chatId, messageId);
            }
          };

          optionsButton.onclick = () => toggleMenuOpcoes(menuId);

          menuOpcoes.appendChild(excluirOpcao);
          messageWrapper.appendChild(div);
          messageWrapper.appendChild(optionsButton);
          messageWrapper.appendChild(menuOpcoes);
          mensagemContainer.appendChild(messageWrapper);

          messageWrapper.addEventListener("dblclick", function(e) {
            iniciarSelecao(this, chatId, messageId);
            e.stopPropagation();
          });

          messageWrapper.addEventListener("click", function(e) {
            if (modoSelecao) {
              toggleSelecaoMensagem(this, chatId, messageId);
              e.stopPropagation();
            }
          });
        } else {

          div.style.backgroundColor = "gray";
          div.style.color = "white";
          div.style.marginRight = "auto";

          get(dbRef(getDatabase(), "usuarios/" + chatAtivo)).then((snap) => {
              const userAmigo = snap.val();
              img.src = userAmigo.fotoPerfil ? userAmigo.fotoPerfil : "static/avatar.png";
              const timeString = formatTime(date);

              let messageContent = `<div style="font-weight:bold;">${userAmigo.nome}</div>`;

              if (mensagem.imagem) {
                messageContent += `
                  <div style="margin: 5px 0;">
                    <img src="${mensagem.imagem}" style="max-width: 250px; max-height: 250px; border-radius: 10px; cursor: pointer;" 
                      onclick="abrirImagemModal('${mensagem.imagem}')">
                  </div>
                `;
              }

              if (mensagem.video) {
                messageContent += `
                  <div style="margin: 5px 0;">
                    <video src="${mensagem.video}" controls style="max-width: 250px; max-height: 250px; border-radius: 10px;"></video>
                  </div>
                `;
              }

              if (mensagem.audio && mensagem.audio.url) {
                const duracao = mensagem.audio.duracao || 0;
                const minutos = Math.floor(duracao / 60);
                const segundos = duracao % 60;
                const duracaoFormatada = `${minutos.toString().padStart(2, "0")}:${segundos.toString().padStart(2, "0")}`;

                messageContent += `
                  <div style="margin: 5px 0; display: flex; align-items: center; background-color: #1b5c2438; border-radius: 10px; padding: 8px;">
                    <audio id="audio-${messageId}" src="${mensagem.audio.url}" preload="auto"></audio>
                    <button onclick="togglePlayPause('audio-${messageId}', 'play-btn-${messageId}')" 
                      id="play-btn-${messageId}" style="background: none; border: none; font-size: 20px; color: green; cursor: pointer;">
                      <i class="fa-solid fa-play"></i>
                    </button>
                    <div style="flex-grow: 1; height: 4px; background-color: #e0e0e0; border-radius: 2px; margin: 0 10px; cursor: pointer;" 
                      onclick="seekAudio('audio-${messageId}', this)">
                      <div style="height: 100%; width: 0%; background-color: #248232;"></div>
                    </div>
                    <div style="font-size: 12px; color: white;">${duracaoFormatada}</div>
                  </div>
                `;
              }

              if (mensagem.arquivo) {
                messageContent += `
                  <div style="margin: 5px 0; display: flex; align-items: center; background-color: #1b5c2438; border-radius: 10px; padding: 8px; cursor: pointer;">
                    <div style="margin-right: 10px; font-size: 24px;">
                      ${getFileIcon(mensagem.arquivo.tipo)}
                    </div>
                    <div>
                      <strong>${mensagem.arquivo.nome}</strong>
                      <div style="font-size: 12px; color: white;">
                        ${formatFileSize(mensagem.arquivo.tamanho || 0)}
                      </div>
                    </div>
                    <a href="${mensagem.arquivo.url}" target="_blank" download="${mensagem.arquivo.nome}" 
                      style="margin-left: auto; color: white; text-decoration: none;">
                      <i class="fa-solid fa-download"></i> Baixar
                    </a>
                  </div>
                `;
              }

              if (mensagem.texto) {
                messageContent += `<div>${mensagem.texto}</div>`;
              }

              messageContent += `<div style="text-align:right; font-size:small;">${timeString}</div>`;
              div.innerHTML = messageContent;
            });

          mensagemContainer.appendChild(img);
          mensagemContainer.appendChild(div);
        }
        chatMessagesContainer.appendChild(mensagemContainer);
      });

      chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    });
}

function abrirImagemModal(imageUrl) {
  const modalImagem = document.createElement("div");
  modalImagem.style.position = "fixed";
  modalImagem.style.top = "0";
  modalImagem.style.left = "0";
  modalImagem.style.width = "100%";
  modalImagem.style.height = "100%";
  modalImagem.style.backgroundColor = "rgba(0,0,0,0.8)";
  modalImagem.style.display = "flex";
  modalImagem.style.justifyContent = "center";
  modalImagem.style.alignItems = "center";
  modalImagem.style.zIndex = "1000";

  const imagemModal = document.createElement("img");
  imagemModal.src = imageUrl;
  imagemModal.style.maxWidth = "90%";
  imagemModal.style.maxHeight = "90%";
  imagemModal.style.objectFit = "contain";

  modalImagem.onclick = () => document.body.removeChild(modalImagem);
  modalImagem.appendChild(imagemModal);
  document.body.appendChild(modalImagem);
}

function togglePlayPause(audioId, buttonId) {
  const audio = document.getElementById(audioId);
  const button = document.getElementById(buttonId);

  if (audio.paused) {
    audio.play();
    button.innerHTML = '<i class="fa-solid fa-pause"></i>';
  } else {
    audio.pause();
    button.innerHTML = '<i class="fa-solid fa-play"></i>';
  }
}

function seekAudio(audioId, progressContainer) {
  const audio = document.getElementById(audioId);
  const rect = progressContainer.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const newTime = (clickX / rect.width) * audio.duration;
  audio.currentTime = newTime;
}

function getFileIcon(fileType) {
  if (!fileType) return '<i class="fa-solid fa-file"></i>';

  if (fileType.includes("pdf")) return '<i class="fa-solid fa-file-pdf"></i>';
  if (fileType.includes("word")) return '<i class="fa-solid fa-file-word"></i>';
  if (fileType.includes("excel") || fileType.includes("spreadsheet")) return '<i class="fa-solid fa-file-excel"></i>';
  if (fileType.includes("zip") || fileType.includes("rar")) return '<i class="fa-solid fa-file-zipper"></i>';
  if (fileType.includes("text")) return '<i class="fa-solid fa-file-lines"></i>';

  return '<i class="fa-solid fa-file"></i>';
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "Tamanho inválido";
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

document.addEventListener("DOMContentLoaded", function() {
  adicionarBotaoGravacaoAudio();

  const inputContainer = document.getElementById("chat-input");
  if (inputContainer) {
    const fileUploadBtn = document.createElement("button");
    fileUploadBtn.type = "button";
    fileUploadBtn.className = "attachment-btn";
    fileUploadBtn.innerHTML = '<i class="fa-solid fa-paperclip"></i>';
    fileUploadBtn.title = "Enviar arquivo";
    fileUploadBtn.style.background = "none";
    fileUploadBtn.style.border = "none";
    fileUploadBtn.style.color = "#248232";
    fileUploadBtn.style.fontSize = "20px";
    fileUploadBtn.style.cursor = "pointer";
    fileUploadBtn.style.padding = "5px 10px";

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.id = "fileUpload";
    fileInput.style.display = "none";
    fileInput.accept = ".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar,image/*,video/*";
    fileInput.onchange = handleFileUpload;

    fileUploadBtn.onclick = () => fileInput.click();

    const audioBtn = document.getElementById("audio-record-btn");
    if (audioBtn) {
      inputContainer.insertBefore(fileUploadBtn, audioBtn);
    } else {
      inputContainer.insertBefore(fileUploadBtn, inputContainer.querySelector('button[type="submit"]'));
    }

    inputContainer.appendChild(fileInput);
  }
});

function monitorarDigitacao(chatId) {
  const typingRef = dbRef(getDatabase(),`chats/${chatId}/typing`);

  function atualizarIndicador(snapshot) {
    let outroDigitando = false;
    snapshot.forEach((childSnap) => {
      if (childSnap.key !== window.usuarioLogado.uid && childSnap.val() === true) {
        outroDigitando = true;
      }
    });

    const chatMessagesContainer = document.getElementById("chat-messages");
    let typingBubble = document.getElementById("typing-indicator");

    if (outroDigitando) {
      if (!typingBubble) {
        typingBubble = document.createElement("div");
        typingBubble.id = "typing-indicator";
        typingBubble.classList.add("message-bubble");
        typingBubble.style.backgroundColor = "gray";
        typingBubble.style.color = "white";
        typingBubble.style.marginRight = "auto";
        typingBubble.style.padding = "0px 0px 0px 0px";
        typingBubble.style.borderRadius = "15px";
        typingBubble.style.maxWidth = "fit-content";
        typingBubble.style.position = "relative";
        typingBubble.style.fontStyle = "italic";
        typingBubble.innerHTML = `<img src="static/TD.gif" alt="Digitando..." style="width:40px; height:30px;">`;

        let mensagemContainer = document.createElement("div");
        mensagemContainer.id = "typing-container";
        mensagemContainer.style.display = "flex";
        mensagemContainer.style.alignItems = "center";
        mensagemContainer.style.margin = "10px 0";

        get(dbRef(getDatabase(), "usuarios/" + chatAtivo)).then((snap) => {
            const userAmigo = snap.val();
            let img = document.createElement("img");
            img.src = userAmigo.fotoPerfil ?
              userAmigo.fotoPerfil :
              "static/avatar.png";
            img.style.width = "40px";
            img.style.height = "40px";
            img.style.borderRadius = "50%";
            img.style.objectFit = "cover";
            img.style.marginRight = "10px";

            mensagemContainer.appendChild(img);
            mensagemContainer.appendChild(typingBubble);
            chatMessagesContainer.appendChild(mensagemContainer);
            chatMessagesContainer.scrollTop =
              chatMessagesContainer.scrollHeight;
          });
      }
    } else {
      if (typingBubble) {
        typingBubble.parentElement.remove();
      }
    }
  }

  typingRef.on("value", atualizarIndicador);
}

function toggleMenuOpcoes(menuId) {
  const menu = document.getElementById(menuId);
  if (menu.style.display === "block") {
    menu.style.display = "none";
  } else {
    document.querySelectorAll(".menu-opcoes").forEach((m) => {
      m.style.display = "none";
    });
    menu.style.display = "block";
  }
}

function iniciarSelecao(elemento, chatId, messageId) {
  if (!modoSelecao) {
    modoSelecao = true;
    mensagensSelecionadas = [];
    toggleSelecaoMensagem(elemento, chatId, messageId);

    const barraOpcoes = document.getElementById("barra-opcoes-selecao");
    if (barraOpcoes) {
      barraOpcoes.style.display = "flex";
    }
  }
}

function toggleSelecaoMensagem(elemento, chatId, messageId) {
  if (!modoSelecao) return;

  if (!elemento.classList.contains("mensagem-usuario")) return;

  const index = mensagensSelecionadas.findIndex(
    (m) => m.messageId === messageId,
  );

  if (index === -1) {
    mensagensSelecionadas.push({
      chatId,
      messageId
    });
    elemento.style.opacity = "0.7";
    elemento.querySelector(".message-bubble").style.borderWidth = "2px";
    elemento.querySelector(".message-bubble").style.borderStyle = "solid";
    elemento.querySelector(".message-bubble").style.borderColor = "yellow";
  } else {
    mensagensSelecionadas.splice(index, 1);
    elemento.style.opacity = "1";
    elemento.querySelector(".message-bubble").style.border = "none";

    if (mensagensSelecionadas.length === 0) {
      cancelarSelecao();
    }
  }

  const contador = document.getElementById("contador-selecionadas");
  if (contador) {
    contador.textContent = `${mensagensSelecionadas.length} selecionada${mensagensSelecionadas.length !== 1 ? "s" : ""}`;
  }
}

function cancelarSelecao() {
  modoSelecao = false;

  document.querySelectorAll(".mensagem-usuario").forEach((elem) => {
    elem.style.opacity = "1";
    elem.querySelector(".message-bubble").style.border = "none";
  });

  mensagensSelecionadas = [];

  const barraOpcoes = document.getElementById("barra-opcoes-selecao");
  if (barraOpcoes) {
    barraOpcoes.style.display = "none";
  }
}

function excluirMensagensSelecionadas() {
  if (mensagensSelecionadas.length === 0) return;

  if (
    confirm(
      `Tem certeza que deseja excluir ${mensagensSelecionadas.length} mensagem(ns)?`,
    )
  ) {
    mensagensSelecionadas.forEach(({
      chatId,
      messageId
    }) => {
      firebase
        .database()
        .dbRef(getDatabase(), `chats/${chatId}/${messageId}`)
        .remove()
        .catch((error) => {
          console.error("Erro ao excluir mensagem:", error);
        });
    });

    cancelarSelecao();
  }
}

document.addEventListener("click", function(e) {
  if (modoSelecao && !e.target.closest(".mensagem-usuario")) {
    cancelarSelecao();
  }
});

function marcarMensagensComoLidas(chatId) {
  if (!window.usuarioLogado || !chatId) return;

get(dbRef(getDatabase(),`chats/${chatId}`)).then((snapshot) => {
      let updates = {};
      snapshot.forEach((childSnapshot) => {
        const mensagem = childSnapshot.val();
        if (
          mensagem.lida === false &&
          mensagem.remetente !== window.usuarioLogado.uid
        ) {
          updates[childSnapshot.key + "/lida"] = true;
        }
      });
        if (Object.keys(updates).length > 0) {
            update(dbRef(getDatabase(), `chats/${chatId}`), updates).then(() => {
                atualizarNotificacoesChat();
            });
        }
    });
}

function atualizarNotificacoesParaAmigo(uidAmigo) {
  const chatId = [window.usuarioLogado.uid, uidAmigo].sort().join("_");

onValue(dbRef(getDatabase(),`chats/${chatId}`), (snapshot) => {
      let totalNaoLidas = 0;
      snapshot.forEach((messageSnap) => {
        const mensagem = messageSnap.val();

        if (mensagem.remetente === uidAmigo && mensagem.lida === false) {
          totalNaoLidas++;
        }
      });

      const badge = document.getElementById("badge-" + uidAmigo);
      if (badge) {
        if (totalNaoLidas > 0) {
          badge.textContent = totalNaoLidas > 99 ? "99+" : totalNaoLidas;
          badge.style.display = "inline-block";
        } else {
          badge.style.display = "none";
        }
      }
    });
}

function selecionarChat(uidAmigo) {
  chatAtivo = uidAmigo;
  const chatBox = document.getElementById("chat-box");

  if (!chatBox) {
    console.error("Elemento chat-box não encontrado");
    return;
  }

  if (!uidAmigo) {
    chatBox.style.display = "none";
    return;
  }

  chatBox.style.display = "block";
  carregarMensagens();

  const chatId = [window.usuarioLogado.uid, chatAtivo].sort().join("_");

  marcarMensagensComoLidas(chatId);

  monitorarDigitacao(chatId);
}

document.addEventListener("click", (event) => {
  if (
    !event.target.closest(".menu-opcoes") &&
    !event.target.innerHTML.includes("⋮")
  ) {
    document.querySelectorAll(".menu-opcoes").forEach((menu) => {
      menu.style.display = "none";
    });
  }
});

function formatTimestamp(date) {
  const now = new Date();
  const diff = now - date;
  const oneDay = 24 * 60 * 60 * 1000;
  const oneMinute = 60 * 1000;

  if (diff < oneMinute) {
    return "Agora";
  } else if (diff < oneDay && date.getDate() === now.getDate()) {
    return `Hoje às ${date.getHours()}:${date.getMinutes().toString().padStart(2, "0")}`;
  } else if (diff < oneDay * 2 && date.getDate() === now.getDate() - 1) {
    return `Ontem às ${date.getHours()}:${date.getMinutes().toString().padStart(2, "0")}`;
  } else {
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} às ${date.getHours()}:${date.getMinutes().toString().padStart(2, "0")}`;
  }
}

function formatTime(date) {
  return `${date.getHours()}:${date.getMinutes().toString().padStart(2, "0")}`;
}

function removerAmigo(uidAmigo) {
  if (!window.usuarioLogado) return;
  dbRef(getDatabase(),`friends/${window.usuarioLogado.uid}/${uidAmigo}`).remove();
  dbRef(getDatabase(),`friends/${uidAmigo}/${window.usuarioLogado.uid}`)
    .remove()
    .then(() => {
      carregarAmigos();
    });
}

getAuth().onAuthStateChanged(function(user) {
  if (user) {
    carregarUsuarioAtual().then(() => {
      carregarPedidos();
    });
  }
});

document.addEventListener("DOMContentLoaded", function() {
  let usuarioAtual = null;
  const avatar = document.getElementById("avatar");
  const fileInput = document.getElementById("fileInput");
  const editIcon = document.getElementById("editIcon");

  function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  }

  function carregarPerfil(uid) {
    get(dbRef(getDatabase(), "usuarios/" + uid)).then((snapshot) => {
        if (snapshot.exists()) {
          let userData = snapshot.val();
          document.getElementById("profileName").textContent =
            userData.nome || "Usuário";
          document.getElementById("displayName").textContent =
            userData.nome || "Usuário";
          document.getElementById("displayEmail").textContent =
            userData.email || "Desconhecido";
          document.getElementById("displayId").textContent = uid;

          if (userData.fotoPerfil) {
            avatar.src = userData.fotoPerfil;
          }

          if (usuarioAtual && usuarioAtual.uid === uid) {
            editIcon.style.display = "flex";
            avatar.addEventListener("click", () => fileInput.click());
          } else {
            editIcon.style.display = "none";
          }
        } else {
          document.getElementById("profileName").textContent =
            "Usuário não encontrado";
        }
      })
      .catch((error) => {
        console.error("Erro ao buscar dados do usuário:", error);
      });
  }

  const userIdFromURL = getQueryParam("id");

  getAuth().onAuthStateChanged((user) => {
    if (user) {
      usuarioAtual = user;
      if (userIdFromURL) {
        carregarPerfil(userIdFromURL);
      } else {
        carregarPerfil(user.uid);
      }
    } else {
      window.location.href = "login.html";
    }
  });
});

const messageInput = document.getElementById("messageInput");

if (messageInput) {
  messageInput.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
      if (event.shiftKey) {} else {
        event.preventDefault();
      }
    }
  });
} else {
  console.error("Elemento messageInput não encontrado.");
}

document.querySelector(".header_logo").addEventListener('click', function(){
  window.location.href = "index.html";
})

});