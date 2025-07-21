import { useEffect, useRef, useState } from "react";
import { initializeFirebase, formatTime } from "./Functions";
import {  getDatabase, ref as dbRef, set, get, onValue, remove, update, push, serverTimestamp, query as queryDb, orderByChild } from "firebase/database"
import { getDownloadURL, deleteObject, getStorage, uploadBytes, uploadBytesResumable, ref as storageRef } from "firebase/storage";
import type { FirebaseApp } from "firebase/app";
import avatar_src from "./assets/static/avatar.png";
import default_comunidade_src from './assets/static/default_comunidade.png'
import { Link, useNavigate } from "react-router-dom";
import { useGlobal } from "./Global";
import "./Comunidade.scss";
import "./Conversations.scss";
import Alert from "./Alert";
import { collection, getDocs, query, where } from "firebase/firestore";

interface membersInterface{
    fotoPerfil: string,
    nome: string,
    id: string,
    isAdmin: boolean,
    isCreator: boolean
}

interface audioInterface{
    audioSeconds: number,
    audioTimer: any,
    mediaRecorder: MediaRecorder | null,
    audioChunks: any[]
}

function Comunidade(){
    const { db, usuarioLogado } = useGlobal();

    const navigate = useNavigate();

    const showPopup = useRef<any>(null);

    const communityCreator = useRef<string>(null);
    const adminMembers = useRef<{[key:string]: any}>({});
    const isSelfAdmin = useRef<boolean>(null);
    const allMembers = useRef<{[key:string]: any}>(null);
    const comunidadeId = useRef<string>(null);
    const firebase = useRef<FirebaseApp>(null);
    const modoSelecao = useRef<boolean>(false);
    const mensagensSelecionadas = useRef<any[]>([]);

    const [ members, setMembers ] = useState<membersInterface[]>([]);
    const [ membersCount, setMembersCount ] = useState<number>(0);
    const [ member, setMember ] = useState<any>({ show: false, fotoPerfil: avatar_src, nome: "", isUserCreator: false, targetIsAdmin: false, left: "0", top: "0"});

    const audio = useRef<audioInterface>({
        audioSeconds: 0,
        audioTimer: null,
        mediaRecorder: null,
        audioChunks: []
    });

    const [ isRecording, setIsRecording ] = useState<boolean>(false);

    const refs = {
        fileInput: useRef<HTMLInputElement>(null),
        menu: useRef<HTMLDivElement>(null),
        messageInput: useRef<HTMLTextAreaElement>(null)
    }

    const renderizarMembros = (members: any) => {
        setMembers(members.map((member: any)=>{
            return { fotoPerfil: member.fotoPerfil, nome: member.nome, isCreator: member.isCreator, id: member.id, isAdmin: member.isAdmin };
        }));
    }

    const muteMember = (memberId: any) => {
        if (memberId === communityCreator) {
            showPopup.current('Não é possível silenciar o líder da comunidade.');
            return;
            }
    
        if (usuarioLogado!.uid !== communityCreator.current && adminMembers.current![usuarioLogado!.uid]) {
    
        if (adminMembers.current![memberId]) {
            showPopup.current('Você não tem permissão para fazer isso.');
            return;
        }
        }
    
        const muteTime = prompt('Por quanto tempo deseja silenciar este membro? (em horas)');
    
        if (muteTime === null) return; 
    
        const hoursToMute = parseInt(muteTime);
        if (isNaN(hoursToMute) || hoursToMute <= 0) {
        showPopup.current('Insira um número válido de horas.');
        return;
        }
    
        const now = new Date();
        const muteEndTime = new Date(now.getTime() + (hoursToMute * 60 * 60 * 1000));
    
        initializeFirebase((_:any)=>{
            set(dbRef(getDatabase(), `comunidades/${comunidadeId.current}/membros/${memberId}/muted`), {
                until: muteEndTime.getTime(),
                by: usuarioLogado!.uid,
                reason: 'Silenciado por administrador',
                timestamp: serverTimestamp()
            })
            .then(() => {
            showPopup.current(`Membro silenciado por ${hoursToMute} hora(s).`);
            })
            .catch(error => {
            console.error('Erro ao silenciar membro:', error);
            showPopup.current('Não foi possível silenciar o membro.');
            });
        });
    }

    const carregarMembros = (comunidade: any) => {
        const membersListContainer = document.getElementById('membersList')!;
        membersListContainer.innerHTML = '';

        if (!comunidade.membros) {
            membersListContainer.innerHTML = '<div class="no-members">Nenhum membro encontrado</div>';
            return;
        }

        const memberIds = Object.keys(comunidade.membros);

        getDocs(query(collection(db.current!, "usuarios"), where("uid", "in", memberIds))).then(results=>{
            allMembers.current = results.docs.map(doc=>{
                const data = doc.data();
                return {
                    id: data.uid,
                    ...data
                    };
            })

            allMembers.current.sort((a: any, b: any) => {
                if (a.id === communityCreator) return -1;
                if (b.id === communityCreator) return 1;
                if (adminMembers.current![a.id] && !adminMembers.current![b.id]) return -1;
                if (!adminMembers.current![a.id] && adminMembers.current![b.id]) return 1;
                return (a.nome || '').localeCompare(b.nome || '');
            });

            renderizarMembros(allMembers.current);
            setMembersCount(allMembers.current.length);
        })
        .catch(error => {
            console.error('Erro ao carregar membros:', error);
            membersListContainer.innerHTML = '<div class="error-message">Erro ao carregar membros</div>';
        });
    }
    const carregarComunidade = () => {

        get(dbRef(getDatabase(), 'comunidades/' + comunidadeId.current)).then(snapshot => {
        if (snapshot.exists()) {
            const comunidade = snapshot.val();
    
            document.getElementById('comunidadeTitulo')!.innerText = comunidade.nome || 'Comunidade';
            document.getElementById('comunidadeDescricao')!.innerText = comunidade.descricao || 'Sem descrição';
    
            if (comunidade.tags) {
                document.getElementById('comunidadeTags')!.style.display = 'block';
                document.getElementById('comunidadeTags')!.querySelector('span')!.innerText = comunidade.tags;
            } else {
                document.getElementById('comunidadeTags')!.style.display = 'none';
            }
    
            if (comunidade.imagem) {
                (document.getElementById('comunidadeImagem') as HTMLImageElement).src = comunidade.imagem;
            } else {
                (document.getElementById('comunidadeImagem') as HTMLImageElement).src = 'static/default_comunidade.png';
            }
    
            communityCreator.current = comunidade.criador;
    
            if (comunidade.admins) {
                adminMembers.current = comunidade.admins;
            }
    
            isSelfAdmin.current = (usuarioLogado!.uid === communityCreator.current) || 
                        (adminMembers && adminMembers.current![String(usuarioLogado!.uid)]);
    
            carregarMembros(comunidade);
        } else {
            showPopup.current('Comunidade não encontrada.');
            window.location.href = 'index.html';
        }
        }).catch(error => {
        console.error('Erro ao carregar comunidade:', error);
        showPopup.current('Erro ao carregar dados da comunidade.');
        });
    }

    // function abrirModalBanner() {
    //     if (!isSelfAdmin) return; 
    //     document.getElementById('bannerModal')!.style.display = 'flex';
    // }
    
    function fecharModalBanner() {
        document.getElementById('bannerModal')!.style.display = 'none';
    }
    
    function salvarBanner() {
        if (!refs.fileInput.current!.files || refs.fileInput.current!.files.length === 0) {
        showPopup.current('Selecione uma imagem para o banner.');
        return;
        }
    
        const file = refs.fileInput.current!.files[0];
    
        uploadBytes(storageRef(getStorage(), `comunidades/${comunidadeId.current}/banner/${file.name}`), file)
            .then(snapshot => getDownloadURL(snapshot.ref))
            .then(downloadURL => update(dbRef(getDatabase(), `comunidades/${comunidadeId.current}`), { banner: downloadURL }))
            .then(() => {fecharModalBanner(); carregarBanner()})
            .catch(error => {
                console.error('Erro ao atualizar banner:', error);
                showPopup.current('Erro ao atualizar banner.');
            });
    }
    
    function carregarBanner() {
        get(dbRef(getDatabase(), `comunidades/${comunidadeId.current}/banner`)).then(snapshot => {
            const bannerUrl = snapshot.val() || 'https://via.placeholder.com/300x150';
            document.getElementById('communityBanner')!.style.backgroundImage = `url('${bannerUrl}')`;
        })
        .catch(error => {
            console.error('Erro ao carregar banner:', error);
        });
    }

    function iniciarGravacaoAudio() {
        if (!usuarioLogado || !comunidadeId.current) return;
        
        if (!navigator.mediaDevices || !window.MediaRecorder) {
            showPopup.current("Seu navegador não suporta gravação de áudio.");
            return;
        }
        
        if (isRecording) {
            pararGravacaoAudio();
            return;
        }
        
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            const gravadorContainer = document.getElementById("gravador-container");
            if (gravadorContainer) {
                gravadorContainer.style.display = "flex";
            } else {
                criarGravadorContainer();
            }
        
            audio.current.audioSeconds = 0;
            atualizarTempoGravacao();
            audio.current.audioTimer = setInterval(atualizarTempoGravacao, 1000);
        
            audio.current.mediaRecorder = new MediaRecorder(stream);
            audio.current.audioChunks = [];
        
            audio.current.mediaRecorder.ondataavailable = (event: any) => {
                if (event.data.size > 0) {
                audio.current.audioChunks.push(event.data);
                }
            };
        
            audio.current.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audio.current.audioChunks, { type: "audio/wav" });
                enviarAudioMensagem(audioBlob);
            };
        
            audio.current.mediaRecorder.start();
            setIsRecording(true);
        })
        .catch(error => {
            console.error("Erro ao acessar o microfone:", error);
            showPopup.current("Não foi possível acessar o microfone.");
        });
    }
    
    function pararGravacaoAudio() {
        if (!audio.current.mediaRecorder || audio.current.mediaRecorder.state === "inactive") return;
        
        clearInterval(audio.current.audioTimer);
        
        audio.current.mediaRecorder.stop();
        setIsRecording(false);
        
        if (audio.current.mediaRecorder.stream) {
            audio.current.mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
        
        const gravadorContainer = document.getElementById("gravador-container");
        if (gravadorContainer) {
            gravadorContainer.style.display = "none";
        }
    }
    
    function cancelarGravacaoAudio() {
      if (!audio.current.mediaRecorder || audio.current.mediaRecorder.state === "inactive") return;
    
      audio.current.mediaRecorder.onstop = null;
    
      clearInterval(audio.current.audioTimer);
    
      audio.current.mediaRecorder.stop();
      setIsRecording(false);
      audio.current.audioChunks = [];
    
      if (audio.current.mediaRecorder.stream) {
        audio.current.mediaRecorder.stream.getTracks().forEach(track => track.stop());
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
      audio.current.audioSeconds++;
      const minutos = Math.floor(audio.current.audioSeconds / 60);
      const segundos = audio.current.audioSeconds % 60;
    
      const tempoFormatado = `${minutos.toString().padStart(2, "0")}:${segundos.toString().padStart(2, "0")}`;
      const tempoElement = document.getElementById("tempo-gravacao");
    
      if (tempoElement) {
        tempoElement.textContent = tempoFormatado;
      }
    
      if (audio.current.audioSeconds >= 180) {
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
    
    function enviarAudioMensagem(audioBlob: any) {
      if (!usuarioLogado || !comunidadeId.current || !audioBlob) return;
    
      const audioFileName = `audio_${usuarioLogado.uid}_${Date.now()}.wav`;
    
      const audioRef = storageRef(getStorage(), `chat_audios/${comunidadeId.current}/${audioFileName}`);
    
      const progressBar = document.createElement("div");
      progressBar.style.width = "0%";
      progressBar.style.height = "4px";
      progressBar.style.backgroundColor = "#4CAF50";
      progressBar.style.position = "fixed";
      progressBar.style.top = "0";
      progressBar.style.left = "0";
      progressBar.style.zIndex = "1000";
      document.body.appendChild(progressBar);
    
      const uploadTask = uploadBytesResumable(audioRef, audioBlob);
    
      uploadTask.on("state_changed", snapshot => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            progressBar.style.width = `${progress}%`;

        },
        (error) => {
            console.error("Erro ao fazer upload do áudio:", error);
            showPopup.current("Não foi possível enviar a mensagem de voz.");
            document.body.removeChild(progressBar);
        },
        () => {
            getDownloadURL(uploadTask.snapshot.ref)
            .then((audioUrl) => {
                const messageText = refs.messageInput.current ? refs.messageInput.current!.value.trim() : "";
        
                const novaMensagem = {
                    remetente: usuarioLogado!.uid,
                    texto: messageText,
                    audio: {
                        url: audioUrl,
                        duracao: audio.current.audioSeconds
                    },
                    timestamp: Date.now(),
                    lida: false
                };
    
              return push(dbRef(getDatabase(),`comunidades/${comunidadeId.current}/mensagens`), novaMensagem);
            })
            .then(() => {
                refs.messageInput.current!.value = "";
                document.body.removeChild(progressBar);
            })
            .catch((error) => {
                console.error("Erro ao salvar mensagem de áudio:", error);
                showPopup.current("Não foi possível enviar a mensagem de voz.");
                if (document.body.contains(progressBar)) {
                    document.body.removeChild(progressBar);
                }
            });
        }
      );
    }

    const handleFileUpload = (event: any) => {
        const file = event.target.files[0];
        if (!file) return;
        
        // const allowedFileTypes = [
        //     'application/pdf',
        //     'application/msword', 
        //     'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        //     'application/vnd.ms-excel', 
        //     'application/vnd.openxmlformats.officedocument.spreadsheetml.sheet',
        //     'text/plain',
        //     'application/zip',
        //     'application/x-rar-compressed'
        // ];
        
          const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
          const videoTypes = ['video/mp4', 'video/webm', 'video/ogg'];
        
          const maxFileSize = 20 * 1024 * 1024; 
        
        if (imageTypes.includes(file.type)) {
            handleImageUpload(event);
            return;
        } else if (videoTypes.includes(file.type)) {
            handleVideoUpload(event);
            return;
        }
        
          if (file.size > maxFileSize) {
        showPopup.current('O tamanho do arquivo não pode ser maior que 20MB.');
        return;
          }
        
          const messageInput = document.getElementById('messageInput') as HTMLInputElement;
          const messageText = messageInput ? messageInput.value.trim() : '';
        
          const fileRef = storageRef(getStorage(), `chat_files/${comunidadeId.current}/${usuarioLogado!.uid}_${Date.now()}_${file.name}`);
        
        uploadBytes(fileRef, file)
        .then(snapshot => getDownloadURL(snapshot.ref))
        .then(fileUrl => {
        
          const novaMensagem = {
            remetente: usuarioLogado!.uid,
            texto: messageText, 
            arquivo: {
              url: fileUrl,
              nome: file.name,
              tipo: file.type,
              tamanho: file.size 
            },
            timestamp: serverTimestamp()
          };
        
          return push(dbRef(getDatabase(), `comunidades/${comunidadeId.current}/mensagens`), novaMensagem);
        })
        .then(() => {
        
          refs.fileInput.current!.value = '';
          if (messageInput) {
            messageInput.value = '';
          }
        })
        .catch(error => {
          console.error('Erro no upload do arquivo:', error);
          showPopup.current('Não foi possível enviar o arquivo.');
        });
    }

    function handleImageUpload(event:any) {

        const file = event.target.files[0];
        if (!file) return;
    
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        const maxFileSize = 5 * 1024 * 1024; 
    
        if (!allowedTypes.includes(file.type)) {
            showPopup.current('Apenas suportamos imagens JPEG, PNG, GIF e WebP.');
            return;
        }
        
        if (file.size > maxFileSize) {
            showPopup.current('A imagem não pode ser maior que 5MB.');
            return;
        }
        
        const messageInput = document.getElementById('messageInput') as HTMLInputElement;
        const messageText = messageInput ? messageInput.value.trim() : '';
    
        const imageRef = storageRef(getStorage(), `chat_images/${comunidadeId.current}/${usuarioLogado!.uid}_${Date.now()}_${file.name}`);
        
        uploadBytes(imageRef, file)
        .then(snapshot => getDownloadURL(snapshot.ref))
        .then(imageUrl => {
        
            const novaMensagem = {
                remetente: usuarioLogado!.uid,
                texto: messageText, 
                imagem: imageUrl,
                timestamp: serverTimestamp()
            };
            
            return push(dbRef(getDatabase(), `comunidades/${comunidadeId.current}/mensagens`), novaMensagem);
        })
        .then(() => {
            refs.fileInput.current!.value = '';
            if (messageInput) {
                messageInput.value = '';
            }
        })
        .catch(_ => {
        
        });
    }

    function handleVideoUpload(event: any) {
        const file = event.target.files[0];
        if (!file) return;
    
        const maxFileSize = 20 * 1024 * 1024; 
        const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg'];
    
        if (!allowedTypes.includes(file.type)) {
            showPopup.current('Apenas suportamos vídeos MP4, WebM ou OGG.');
            return;
        }
    
        if (file.size > maxFileSize) {
            showPopup.current('O tamanho do vídeo não pode ser maior que 20MB.');
            return;
        }
    
        const messageInput = document.getElementById('messageInput') as HTMLInputElement;
        const messageText = messageInput ? messageInput.value.trim() : '';
    
        const videoRef = storageRef(getStorage(), `chat_videos/${comunidadeId.current}/${usuarioLogado!.uid}_${Date.now()}_${file.name}`);
    
        const progressBar = document.createElement('div');
        progressBar.style.width = '0%';
        progressBar.style.height = '4px';
        progressBar.style.backgroundColor = '#4CAF50';
        progressBar.style.position = 'fixed';
        progressBar.style.top = '0';
        progressBar.style.left = '0';
        progressBar.style.zIndex = '1000';
        document.body.appendChild(progressBar);
        const uploadRef = uploadBytesResumable(videoRef, file);
        uploadRef.on("state_changed", snapshot => {
        
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          progressBar.style.width = `${progress}%`;
        
        }, error=>{
            console.error('Erro no upload do vídeo:', error);
            showPopup.current('Não foi possível enviar o vídeo.');
            
            if (document.body.contains(progressBar)) {
                document.body.removeChild(progressBar);
            }
        }, async () => {
            const videoUrl = await getDownloadURL(uploadRef.snapshot.ref);
            const novaMensagem = {
                remetente: usuarioLogado!.uid,
                texto: messageText,
                video: videoUrl,
                timestamp: serverTimestamp()
            };

            refs.fileInput.current!.value = '';
            if (messageInput) {
                messageInput.value = '';
            }
            
            document.body.removeChild(progressBar);

            return push(dbRef(getDatabase(), `comunidades/${comunidadeId.current}/mensagens`), novaMensagem);
        });
    }

    function enviarMensagem() {
        if (!usuarioLogado || !comunidadeId.current) return;

        const messageInput = document.getElementById('messageInput') as HTMLInputElement;
        if (!messageInput) {
        console.error('Elemento messageInput não encontrado');
        return;
        }

        const message = messageInput.value.trim();
        if (message === '') {
        return;
        }

        get(dbRef(getDatabase(), `comunidades/${comunidadeId.current}/membros/${usuarioLogado!.uid}/muted`)).then(snapshot => {
            if (snapshot.exists()) {
            const mutedData = snapshot.val();
            const now = new Date().getTime();

            if (mutedData.until > now) {

                const timeRemaining = new Date(mutedData.until - now) as any;
                const hours = Math.floor(timeRemaining / (60 * 60 * 1000));
                const minutes = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000));

                showPopup.current(`Você está silenciado e não pode enviar mensagens. Tempo restante: ${hours}h ${minutes}m`);
                return;
            } else {

                remove(dbRef(getDatabase(), `comunidades/${comunidadeId.current}/membros/${usuarioLogado!.uid}/muted`));
            }
            }

            const novaMensagem = {
                remetente: usuarioLogado!.uid,
                texto: message,
                timestamp: serverTimestamp()
            };


            push(dbRef(getDatabase(), `comunidades/${comunidadeId.current}/mensagens`), novaMensagem).then(() => {
                messageInput.value = '';
                const chatContainer = document.getElementById('chat-messages');
                if (chatContainer) {
                chatContainer.scrollTop = chatContainer.scrollHeight;
                }
            })
            .catch(error => {
                console.error('Erro ao enviar mensagem:', error);
                showPopup.current('Não foi possível enviar a mensagem.');
            });
        });
    }


    function verificarAcessoComunidade() {
        return get(dbRef(getDatabase(), 'comunidades/' + comunidadeId.current)).then(snapshot => {
        if (!snapshot.exists()) {
            return false;
        }
        
        const comunidade = snapshot.val();
        
        if (comunidade.privacidade === 'publica') {
            return true;
        }
        
        return (comunidade.criador === usuarioLogado!.uid || 
                (comunidade.membros && comunidade.membros[usuarioLogado!.uid]));
        })
        .catch(error => {
          console.error('Erro ao verificar acesso:', error);
          return false;
        });
    }

    function getQueryParam(param: string) {
        const params = new URLSearchParams(window.location.search);
        return params.get(param);
    }

    function habilitarChatInput(habilitar: any) {
        const messageInput = document.getElementById('messageInput') as HTMLInputElement;
        const sendButton = document.querySelector('#chat-input button') as HTMLButtonElement;
        
        if (messageInput) {
            if (habilitar) {
                messageInput.removeAttribute('disabled');
                messageInput.placeholder = 'Digite sua mensagem...';
            } else {
                messageInput.setAttribute('disabled', 'disabled');
                messageInput.placeholder = 'Entre na comunidade para enviar mensagens...';
            }
        }
        
        if (sendButton) {
            if (habilitar) {
                sendButton.removeAttribute('disabled');
                sendButton.style.opacity = '1';
            } else {
                sendButton.setAttribute('disabled', 'disabled');
                sendButton.style.opacity = '0.5';
            }
        }
    }

    function verificarStatusMembro() {
        if (!usuarioLogado || !comunidadeId.current) return;
        
        get(dbRef(getDatabase(), `comunidades/${comunidadeId.current}`)).then(snapshot => {
            if (!snapshot.exists()) return;
        
            const comunidade = snapshot.val();
            const isCreator = comunidade.criador === usuarioLogado!.uid;
        
            if (isCreator) {
                document.getElementById('botao-entrar-container')!.style.display = 'none';
        
                habilitarChatInput(true);
                return;
            }
        
            get(dbRef(getDatabase(), `comunidades/${comunidadeId.current}/membros/${usuarioLogado!.uid}`)).then(memberSnapshot => {
                if (memberSnapshot.exists()) {
        
                    document.getElementById('botao-entrar-container')!.style.display = 'none';
        
                    habilitarChatInput(true);
                } else {
        
                    document.getElementById('botao-entrar-container')!.style.display = 'block';
        
                    habilitarChatInput(false);
        
                    document.getElementById('botao-entrar')!.onclick = entrarNaComunidade;
                }
                });
            });
    }

    function entrarNaComunidade() {
        if (!usuarioLogado || !comunidadeId.current) return;
        
        set(dbRef(getDatabase(), `comunidades/${comunidadeId.current}/membros/${usuarioLogado!.uid}`), {
            entrou: serverTimestamp()
        }).then(() => {
            document.getElementById('botao-entrar-container')!.style.display = 'none';
            habilitarChatInput(true);
        }).catch(error => {
            console.error('Erro ao entrar na comunidade:', error);
            showPopup.current('Não foi possível entrar na comunidade.');
        });
    }

    function carregarMensagens() {
        const chatMessagesContainer = document.getElementById('chat-messages');
        if (!chatMessagesContainer) {
            console.error('Elemento chat-messages não encontrado');
            return;
        }
        
        let barraOpcoes = document.getElementById('barra-opcoes-selecao');
        if (!barraOpcoes) {
            barraOpcoes = document.createElement('div');
            barraOpcoes.id = 'barra-opcoes-selecao';
            barraOpcoes.style.position = 'fixed';
            barraOpcoes.style.bottom = '0';
            barraOpcoes.style.left = '0';
            barraOpcoes.style.right = '0';
            barraOpcoes.style.backgroundColor = '#333';
            barraOpcoes.style.color = 'white';
            barraOpcoes.style.padding = '10px';
            barraOpcoes.style.display = 'none';
            barraOpcoes.style.justifyContent = 'space-between';
            barraOpcoes.style.alignItems = 'center';
            barraOpcoes.style.zIndex = '1000';
            
            const contadorSelecionadas = document.createElement('span');
            contadorSelecionadas.id = 'contador-selecionadas';
            contadorSelecionadas.textContent = '0 selecionadas';
            
            const btnExcluir = document.createElement('button');
            btnExcluir.textContent = 'Excluir';
            btnExcluir.style.backgroundColor = 'red';
            btnExcluir.style.color = 'white';
            btnExcluir.style.border = 'none';
            btnExcluir.style.padding = '5px 10px';
            btnExcluir.style.borderRadius = '5px';
            btnExcluir.style.cursor = 'pointer';
            btnExcluir.onclick = excluirMensagensSelecionadas;
            
            const btnCancelar = document.createElement('button');
            btnCancelar.textContent = 'Cancelar';
            btnCancelar.style.backgroundColor = 'gray';
            btnCancelar.style.color = 'white';
            btnCancelar.style.border = 'none';
            btnCancelar.style.padding = '5px 10px';
            btnCancelar.style.borderRadius = '5px';
            btnCancelar.style.cursor = 'pointer';
            btnCancelar.onclick = cancelarSelecao;
            
            barraOpcoes.appendChild(contadorSelecionadas);
            barraOpcoes.appendChild(btnExcluir);
            barraOpcoes.appendChild(btnCancelar);
            
            document.body.appendChild(barraOpcoes);
        }
        
        const chatRef = dbRef(getDatabase(), `comunidades/${comunidadeId.current}/mensagens`);
        
          
        const chatQuery = queryDb(chatRef, orderByChild("timestamp"));
    
        onValue(chatQuery, (snapshot) => {
            chatMessagesContainer.innerHTML = '';
            
            if (!snapshot.exists()) {
                const emptyMessage = document.createElement('div');
                emptyMessage.style.textAlign = 'center';
                emptyMessage.style.padding = '20px';
                emptyMessage.style.color = '#666';
                emptyMessage.textContent = 'Nenhuma mensagem enviada ainda. Seja o primeiro a enviar!';
                chatMessagesContainer.appendChild(emptyMessage);
                return;
            }
            
            // let lastTimestamp = 0;
            const messages: any[] = [];
            
            snapshot.forEach(childSnapshot => {
                messages.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
            
            messages.sort((a, b) => a.timestamp - b.timestamp);
            
            messages.forEach(mensagem => {
                const messageId = mensagem.id;
                const mensagemContainer = document.createElement('div');
                mensagemContainer.style.display = 'flex';
                mensagemContainer.style.alignItems = 'flex-start';
                mensagemContainer.style.margin = '10px 0';
                mensagemContainer.setAttribute('data-message-id', messageId);
                
                const img = document.createElement('img');
                img.style.width = '40px';
                img.style.height = '40px';
                img.style.borderRadius = '50%';
                img.style.objectFit = 'cover';
                img.style.marginRight = '10px';
                
                const div = document.createElement('div');
                div.classList.add('message-bubble');
                div.style.padding = '8px';
                div.style.borderRadius = '15px';
                div.style.maxWidth = '70%';
                div.style.position = 'relative';
                div.style.wordBreak = 'break-word';
                
                const timestamp = mensagem.timestamp;
                const date = new Date(timestamp);
                
                if (mensagem.remetente === usuarioLogado!.uid) {
                
                    const messageWrapper = document.createElement('div');
                    messageWrapper.style.position = 'relative';
                    messageWrapper.style.display = 'flex';
                    messageWrapper.style.justifyContent = 'flex-end';
                    messageWrapper.style.width = '100%';
                    messageWrapper.classList.add('mensagem-usuario');
                    messageWrapper.setAttribute('data-message-id', messageId);
                
                    div.style.backgroundColor = '#248232';
                    div.style.color = 'white';
                
                    const timeString = formatTime(date);
                
                    if (mensagem.imagem) {
                        const imagemContainer = document.createElement('div');
                        imagemContainer.style.maxWidth = '250px';
                        imagemContainer.style.margin = '5px 0';
                    
                        const imagemElement = document.createElement('img');
                        imagemElement.src = mensagem.imagem;
                        imagemElement.style.maxWidth = '100%';
                        imagemElement.style.borderRadius = '10px';
                        imagemElement.style.cursor = 'pointer';
                    
                        imagemElement.onclick = () => {
                            const modalImagem = document.createElement('div');
                            modalImagem.style.position = 'fixed';
                            modalImagem.style.top = '0';
                            modalImagem.style.left = '0';
                            modalImagem.style.width = '100%';
                            modalImagem.style.height = '100%';
                            modalImagem.style.backgroundColor = 'rgba(0,0,0,0.8)';
                            modalImagem.style.display = 'flex';
                            modalImagem.style.justifyContent = 'center';
                            modalImagem.style.alignItems = 'center';
                            modalImagem.style.zIndex = '1000';
                    
                            const imagemModal = document.createElement('img');
                            imagemModal.src = mensagem.imagem;
                            imagemModal.style.maxWidth = '90%';
                            imagemModal.style.maxHeight = '90%';
                            imagemModal.style.objectFit = 'contain';
                    
                            modalImagem.onclick = () => document.body.removeChild(modalImagem);
                            modalImagem.appendChild(imagemModal);
                            document.body.appendChild(modalImagem);
                        };
                    
                        imagemContainer.appendChild(imagemElement);
                        div.appendChild(imagemContainer);
                    }
                
                    if (mensagem.video) {
                    const videoContainer = document.createElement('div');
                    videoContainer.style.maxWidth = '250px';
                    videoContainer.style.margin = '5px 0';
                    videoContainer.style.position = 'relative';
                
                    const videoElement = document.createElement('video');
                    videoElement.src = mensagem.video;
                    videoElement.style.maxWidth = '100%';
                    videoElement.style.borderRadius = '10px';
                    videoElement.controls = true;
                    videoElement.preload = 'metadata';
                
                    videoElement.onerror = (e) => {
                        console.error('Erro ao carregar vídeo:', e);
                        console.error('URL do vídeo:', mensagem.video);
                        videoContainer.innerHTML = `
                        <div style="color:red; text-align:center;">
                            Erro ao carregar vídeo
                            <br>
                            <small>${mensagem.video}</small>
                        </div>
                        `;
                    };
                
                    videoContainer.appendChild(videoElement);
                    div.appendChild(videoContainer);
                    }
                
                    if (mensagem.audio && mensagem.audio.url) {
                        const audioContainer = document.createElement('div');
                        audioContainer.style.display = 'flex';
                        audioContainer.style.alignItems = 'center';
                        audioContainer.style.backgroundColor = '#1b5c2438';
                        audioContainer.style.borderRadius = '10px';
                        audioContainer.style.padding = '8px';
                        audioContainer.style.marginTop = '5px';
                    
                        const audioPlayer = document.createElement('div');
                        audioPlayer.style.display = 'flex';
                        audioPlayer.style.alignItems = 'center';
                        audioPlayer.style.width = '40vh';
                        audioPlayer.style.backgroundColor = '#fff';
                        audioPlayer.style.borderRadius = '10px';
                        audioPlayer.style.padding = '5px';
                    
                        const progressBarContainer = document.createElement('div');
                        progressBarContainer.style.flexGrow = '1';
                        progressBarContainer.style.height = '4px';
                        progressBarContainer.style.backgroundColor = '#e0e0e0';
                        progressBarContainer.style.borderRadius = '2px';
                        progressBarContainer.style.marginRight = '10px';
                        progressBarContainer.style.cursor = 'pointer';
                    
                        const progressBar = document.createElement('div');
                        progressBar.style.height = '100%';
                        progressBar.style.width = '0%';
                        progressBar.style.backgroundColor = '#248232';
                        progressBarContainer.appendChild(progressBar);
                    
                        const playButton = document.createElement('button');
                        playButton.innerHTML = '<i class="fa-solid fa-play"></i>';
                        playButton.style.backgroundColor = 'transparent';
                        playButton.style.border = 'none';
                        playButton.style.fontSize = '20px';
                        playButton.style.color = 'green';
                        playButton.style.cursor = 'pointer';
                    
                        const volumeControl = document.createElement('input') as HTMLInputElement;
                        volumeControl.type = 'range';
                        volumeControl.value = "100";
                        volumeControl.min = "0";
                        volumeControl.max = "100";
                        volumeControl.style.width = '60px';
                        volumeControl.style.marginLeft = '10px';
                    
                        const audioElement = new Audio(mensagem.audio.url);
                        audioElement.preload = 'auto';
                    
                        audioElement.ontimeupdate = () => {
                            const progress = (audioElement.currentTime / audioElement.duration) * 100;
                            progressBar.style.width = `${progress}%`;
                        };
                    
                        audioElement.onended = () => {
                            playButton.innerHTML = '<i class="fa-solid fa-play"></i>';
                        };
                    
                        progressBarContainer.addEventListener('click', (e) => {
                            const rect = progressBarContainer.getBoundingClientRect();
                            const clickX = e.clientX - rect.left;
                            const newTime = (clickX / rect.width) * audioElement.duration;
                            audioElement.currentTime = newTime;
                        });
                    
                        playButton.onclick = () => {
                            if (audioElement.paused) {
                            audioElement.play();
                            playButton.innerHTML = '<i class="fa-solid fa-pause"></i>';
                            } else {
                            audioElement.pause();
                            playButton.innerHTML = '<i class="fa-solid fa-play"></i>';
                            }
                        };
                    
                        volumeControl.oninput = (e: any) => {
                            audioElement.volume = e.target.value / 100;
                        };
                    
                        audioPlayer.appendChild(playButton);
                        audioPlayer.appendChild(progressBarContainer);
                        audioPlayer.appendChild(volumeControl);
                        audioContainer.appendChild(audioPlayer);
                    
                        const duracao = mensagem.audio.duracao || 0;
                        const minutos = Math.floor(duracao / 60);
                        const segundos = duracao % 60;
                        const duracaoFormatada = `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
                    
                        const infoContainer = document.createElement('div');
                        infoContainer.style.marginLeft = '10px';
                        infoContainer.style.fontSize = '12px';
                        infoContainer.style.color = 'white';
                        infoContainer.textContent = `${duracaoFormatada}`;
                    
                        audioContainer.appendChild(infoContainer);
                        div.appendChild(audioContainer);
                    }
                
                    if (mensagem.arquivo) {
                        const arquivoContainer = document.createElement('div');
                        arquivoContainer.style.display = 'flex';
                        arquivoContainer.style.alignItems = 'center';
                        arquivoContainer.style.backgroundColor = '#1b5c2438';
                        arquivoContainer.style.borderRadius = '10px';
                        arquivoContainer.style.padding = '8px';
                        arquivoContainer.style.marginTop = '5px';
                        arquivoContainer.style.cursor = 'pointer';
                    
                        const iconeArquivo = document.createElement('div');
                        iconeArquivo.style.marginRight = '10px';
                        iconeArquivo.style.fontSize = '24px';
                    
                        switch(mensagem.arquivo.tipo) {
                            case 'application/pdf':
                            iconeArquivo.innerHTML = '<i class="fa-solid fa-file-pdf"></i>';
                            break;
                            case 'application/msword':
                            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                            iconeArquivo.innerHTML = '<i class="fa-solid fa-file-word"></i>';
                            break;
                            case 'application/vnd.ms-excel':
                            case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
                            iconeArquivo.innerHTML = '<i class="fa-solid fa-chart-simple"></i>';
                            break;
                            case 'text/plain':
                            iconeArquivo.innerHTML = '<i class="fa-solid fa-file-lines"></i>';
                            break;
                            case 'application/zip':
                            iconeArquivo.innerHTML = '<i class="fa-solid fa-file-zipper"></i>';
                            break;
                            case 'application/x-rar-compressed':
                            iconeArquivo.innerHTML = '<i class="fa-solid fa-file-zipper"></i>';
                            break;
                            default:
                            iconeArquivo.innerHTML = '<i class="fa-solid fa-file"></i>';
                        }
                    
                        const detalhesArquivo = document.createElement('div');
                        detalhesArquivo.innerHTML = `
                            <strong>${mensagem.arquivo.nome}</strong>
                            <div style="font-size: 12px; color: white;">
                            ${formatFileSize(mensagem.arquivo.tamanho || 0)}
                            </div>
                        `;
                    
                        const downloadBotao = document.createElement('a');
                        downloadBotao.href = mensagem.arquivo.url;
                        downloadBotao.target = '_blank';
                        downloadBotao.download = mensagem.arquivo.nome;
                        downloadBotao.style.marginLeft = 'auto';
                        downloadBotao.style.color = 'white';
                        downloadBotao.style.textDecoration = 'none';
                        downloadBotao.innerHTML = '<i class="fa-solid fa-download"></i>&nbsp; Baixar';
                    
                        arquivoContainer.appendChild(iconeArquivo);
                        arquivoContainer.appendChild(detalhesArquivo);
                        arquivoContainer.appendChild(downloadBotao);
                        div.appendChild(arquivoContainer);
                    }
                
                    if (mensagem.texto) {
                        const textoElement = document.createElement('div');
                        textoElement.textContent = mensagem.texto;
                        div.appendChild(textoElement);
                    }
                
                    const timeElement = document.createElement('div');
                    timeElement.textContent = timeString;
                    timeElement.style.textAlign = 'right';
                    timeElement.style.fontSize = 'small';
                    div.appendChild(timeElement);
                
                    const optionsButton = document.createElement('div');
                    optionsButton.innerHTML = '⋮';
                    optionsButton.style.cursor = 'pointer';
                    optionsButton.style.fontSize = '20px';
                    optionsButton.style.padding = '5px 8px';
                    optionsButton.style.marginLeft = '5px';
                    optionsButton.style.alignSelf = 'flex-start';
                    optionsButton.style.color = '#333';
                    optionsButton.style.borderRadius = '50%';
                    optionsButton.style.transition = 'background-color 0.2s';
                    optionsButton.style.position = 'relative';
                    optionsButton.title = 'Opções da mensagem';
                
                    optionsButton.onmouseover = () => {
                        optionsButton.style.backgroundColor = '#f0f0f0';
                    };
                    optionsButton.onmouseout = () => {
                        optionsButton.style.backgroundColor = 'transparent';
                    };
                
                    const menuId = `menu-${messageId}`;
                    const menuOpcoes = document.createElement('div');
                    menuOpcoes.id = menuId;
                    menuOpcoes.className = 'menu-opcoes';
                    menuOpcoes.style.position = 'absolute';
                    menuOpcoes.style.right = '0';
                    menuOpcoes.style.top = '25px';
                    menuOpcoes.style.backgroundColor = 'white';
                    menuOpcoes.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
                    menuOpcoes.style.padding = '5px 0';
                    menuOpcoes.style.borderRadius = '5px';
                    menuOpcoes.style.zIndex = '1000';
                    menuOpcoes.style.display = 'none';
                    menuOpcoes.style.minWidth = '120px';
                
                    const excluirOpcao = document.createElement('div');
                    excluirOpcao.textContent = 'Excluir mensagem';
                    excluirOpcao.style.padding = '8px 15px';
                    excluirOpcao.style.cursor = 'pointer';
                    excluirOpcao.style.color = '#E53935';
                    excluirOpcao.style.fontSize = '14px';
                    excluirOpcao.style.transition = 'background-color 0.2s';
                
                    excluirOpcao.onmouseover = () => {
                        excluirOpcao.style.backgroundColor = '#f5f5f5';
                    };
                    excluirOpcao.onmouseout = () => {
                        excluirOpcao.style.backgroundColor = 'transparent';
                    };
                
                    // excluirOpcao.onclick = (e) => {
                    //     e.stopPropagation();
                    //     if (mensagem.imagem || mensagem.video) {
                    //         excluirImagem(messageId, mensagem.imagem || mensagem.video);
                    //     } else {
                    //         excluirMensagem(messageId);
                    //     }
                    // };
                    excluirOpcao.onclick = (e) => {
                        e.stopPropagation();
                        if (mensagem.arquivo) {
                            excluirArquivo(messageId, mensagem.arquivo.url);
                        } else if (mensagem.imagem) {
                            excluirImagem(messageId, mensagem.imagem);
                        } else {
                            excluirMensagem(messageId);
                        }
                    };
                
                    optionsButton.onclick = (e) => {
                        e.stopPropagation();
                        toggleMenuOpcoes(menuId);
                    };
                
                    menuOpcoes.appendChild(excluirOpcao);
                    optionsButton.appendChild(menuOpcoes);
                
                    messageWrapper.appendChild(div);
                    messageWrapper.appendChild(optionsButton);
                    mensagemContainer.appendChild(messageWrapper);
                
                    messageWrapper.addEventListener('dblclick', function(e) {
                        iniciarSelecao(this, messageId);
                        e.stopPropagation();
                    });
                
                    messageWrapper.addEventListener('click', function(e) {
                    if (modoSelecao.current) {
                        toggleSelecaoMensagem(this, messageId);
                        e.stopPropagation();
                    }
                    });
                } else {
                
                    div.style.backgroundColor = '#E8E8E8';
                    div.style.color = '#333';
                    div.style.marginRight = 'auto';
                
                    getDocs(query(collection(db.current!, "usuarios"), where("uid", "==", mensagem.remetente))).then(results=>{
                        const userAmigo = results.docs.length > 0 ? results.docs[0].data() : { nome: 'Usuário' };
                        img.src = userAmigo.fotoPerfil ? userAmigo.fotoPerfil : avatar_src;
                        img.alt = userAmigo.nome || 'Usuário';
                
                        const timeString = formatTime(date);
                
                        if (mensagem.imagem) {
                            const imagemElement = document.createElement('img');
                            imagemElement.src = mensagem.imagem;
                            imagemElement.style.maxWidth = '100%';
                            imagemElement.style.borderRadius = '10px';
                            imagemElement.style.marginBottom = '8px';
                            imagemElement.style.cursor = 'pointer';
                    
                            imagemElement.onclick = () => {
                                const modalImagem = document.createElement('div');
                                modalImagem.style.position = 'fixed';
                                modalImagem.style.top = '0';
                                modalImagem.style.left = '0';
                                modalImagem.style.width = '100%';
                                modalImagem.style.height = '100%';
                                modalImagem.style.backgroundColor = 'rgba(0,0,0,0.8)';
                                modalImagem.style.display = 'flex';
                                modalImagem.style.justifyContent = 'center';
                                modalImagem.style.alignItems = 'center';
                                modalImagem.style.zIndex = '1000';
                    
                                const imagemModal = document.createElement('img');
                                imagemModal.src = mensagem.imagem;
                                imagemModal.style.maxWidth = '90%';
                                imagemModal.style.maxHeight = '90%';
                                imagemModal.style.objectFit = 'contain';
                    
                                modalImagem.onclick = () => document.body.removeChild(modalImagem);
                                modalImagem.appendChild(imagemModal);
                                document.body.appendChild(modalImagem);
                            };
                    
                            div.appendChild(imagemElement);
                        }
                
                        if (mensagem.video) {
                            const videoContainer = document.createElement('div');
                            videoContainer.style.maxWidth = '250px';
                            videoContainer.style.margin = '5px 0';
                            videoContainer.style.position = 'relative';
                    
                            const videoElement = document.createElement('video');
                            videoElement.src = mensagem.video;
                            videoElement.style.maxWidth = '100%';
                            videoElement.style.borderRadius = '10px';
                            videoElement.controls = true;
                            videoElement.preload = 'metadata';
                    
                            videoElement.onerror = (e) => {
                                console.error('Erro ao carregar vídeo:', e);
                                console.error('URL do vídeo:', mensagem.video);
                                videoContainer.innerHTML = `
                                <div style="color:red; text-align:center;">
                                    Erro ao carregar vídeo
                                    <br>
                                    <small>${mensagem.video}</small>
                                </div>
                                `;
                            };
                    
                            videoContainer.appendChild(videoElement);
                            div.appendChild(videoContainer);
                        }
                
                        if (mensagem.texto) {
                            const textoElement = document.createElement('div');
                            textoElement.textContent = mensagem.texto;
                            div.appendChild(textoElement);
                        }
                
                        const timeElement = document.createElement('div');
                        timeElement.textContent = timeString;
                        timeElement.style.textAlign = 'right';
                        timeElement.style.fontSize = 'small';
                        div.appendChild(timeElement);
                    })
                    .catch(error => {
                        console.error('Erro ao buscar informações do remetente:', error);
                        img.src = avatar_src;
                        img.alt = 'Usuário';
                    });
                
                    mensagemContainer.appendChild(img);
                    mensagemContainer.appendChild(div);
                }
                
                chatMessagesContainer.appendChild(mensagemContainer);
            });
            
            chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
        });
    }

    // function excluirAudio(messageId: any, audioUrl: string) {
    //     if (!usuarioLogado) return;

    //     if (confirm("Tem certeza que deseja excluir esta mensagem de áudio?")) {
    //         deleteObject(storageRef(getStorage(), audioUrl)).then(() => {
    //             return remove(dbRef(getDatabase(), `comunidades/${comunidadeId.current}/mensagens/${messageId}`));
    //         }).then(() => {
    //             console.log("Mensagem de áudio excluída com sucesso");
    //         })
    //         .catch((error: any) => {
    //             console.error("Erro ao excluir mensagem de áudio:", error);
    //             showPopup.current("Não foi possível excluir a mensagem.");
    //         });
    //     }
    // }

    function excluirImagem(messageId: string, imageUrl: string) {
        if (!usuarioLogado) return;

        if (confirm("Tem certeza que deseja excluir esta mensagem com imagem?")) {
            deleteObject(storageRef(getStorage(), imageUrl)).then(() => {
                return remove(dbRef(getDatabase(),`comunidades/${comunidadeId.current}/mensagens/${messageId}`));
            })
            .then(() => {
                console.log("Mensagem e imagem excluídas com sucesso");
            })
            .catch((error: any) => {
                console.error("Erro ao excluir mensagem com imagem:", error);
                showPopup.current("Não foi possível excluir a mensagem.");
            });
        }
    }

    // function excluirVideo(messageId: any, videoUrl: string) {
    //     if (!usuarioLogado) return;

    //     if (confirm("Tem certeza que deseja excluir esta mensagem com vídeo?")) {
    //             deleteObject(storageRef(getStorage(), videoUrl)).then(() => {
    //                 return remove(dbRef(getDatabase(), `comunidades/${comunidadeId.current}/mensagens/${messageId}`));
    //             })
    //             .then(() => {
    //                 console.log("Mensagem e vídeo excluídos com sucesso");
    //             })
    //             .catch(error => {
    //                 console.error("Erro ao excluir mensagem com vídeo:", error);
    //                 alert("Não foi possível excluir a mensagem.");
    //             });
    //     }
    // }

    function excluirArquivo(messageId: any, fileUrl: any) {
        if (!usuarioLogado) return;

        if (confirm("Tem certeza que deseja excluir esta mensagem com arquivo?")) {
            deleteObject(storageRef(getStorage(), fileUrl)).then(() => {
                return remove(dbRef(getDatabase(), `comunidades/${comunidadeId.current}/mensagens/${messageId}`));
            })
            .then(() => {
                console.log("Mensagem e arquivo excluídos com sucesso");
            })
            .catch((error: any) => {
                console.error("Erro ao excluir mensagem com arquivo:", error);
                alert("Não foi possível excluir a mensagem.");
            });
        }
        }

    function excluirMensagem(messageId: string) {
        if (confirm("Tem certeza que deseja excluir esta mensagem?")) {
            remove(dbRef(getDatabase(), `comunidades/${comunidadeId.current}/mensagens/${messageId}`)).then(() => {
                console.log("Mensagem excluída com sucesso");
            })
            .catch((error) => {
                console.error("Erro ao excluir mensagem:", error);
            });
        }
    }

    function toggleSelecaoMensagem(elemento: any, messageId: any) {
        if (!modoSelecao.current) return;

        if (!elemento.classList.contains('mensagem-usuario')) return;

        const index = mensagensSelecionadas.current.indexOf(messageId);

        if (index === -1) {
        
            mensagensSelecionadas.current.push(messageId);
            elemento.style.opacity = '0.7';
            elemento.querySelector('.message-bubble').style.borderWidth = '2px';
            elemento.querySelector('.message-bubble').style.borderStyle = 'solid';
            elemento.querySelector('.message-bubble').style.borderColor = 'yellow';
        } else {
        
            mensagensSelecionadas.current.splice(index, 1);
            elemento.style.opacity = '1';
            elemento.querySelector('.message-bubble').style.border = 'none';
            
            if (mensagensSelecionadas.current.length === 0) {
                cancelarSelecao();
            }
        }
        
            const contador = document.getElementById('contador-selecionadas');
            if (contador) {
                contador.textContent = `${mensagensSelecionadas.current.length} selecionada${mensagensSelecionadas.current.length !== 1 ? 's' : ''}`;
            }
        }
        
    function cancelarSelecao() {
        modoSelecao.current = false;
        
        document.querySelectorAll('.mensagem-usuario').forEach((elem: any) => {
            elem.style.opacity = '1';
            elem.querySelector('.message-bubble').style.border = 'none';
        });
        
        const barraOpcoes = document.getElementById('barra-opcoes-selecao');
        if (barraOpcoes) {
            barraOpcoes.style.display = 'none';
        }
    }

    function iniciarSelecao(elemento: any, messageId: string) {
        if (!modoSelecao.current) {
            modoSelecao.current = true;
            mensagensSelecionadas.current = [];
            toggleSelecaoMensagem(elemento, messageId);
            
            const barraOpcoes = document.getElementById('barra-opcoes-selecao');
            if (barraOpcoes) {
                barraOpcoes.style.display = 'flex';
            }
        }
    }

    function toggleMenuOpcoes(menuId: any) {
        const menu = document.getElementById(menuId) as HTMLDivElement;
        if (!menu) return;
        
        document.querySelectorAll('.menu-opcoes').forEach((m: any) => {
            if (m.id !== menuId) {
                m.style.display = 'none';
            }
        });
        
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
        
        function closeMenuOnClickOutside(e: any) {
            const clickedMenu = e.target.closest('.menu-opcoes');
            const clickedButton = e.target.closest('div[onclick*="toggleMenuOpcoes"]');
        
            if ((!clickedMenu || clickedMenu.id !== menuId) && (!clickedButton || !clickedButton.contains(document.getElementById(menuId)))) {
                menu.style.display = 'none';
                document.removeEventListener('click', closeMenuOnClickOutside);
            }
        }
        
        if (menu.style.display === 'block') {
        
        setTimeout(() => {
        document.addEventListener('click', closeMenuOnClickOutside);
        }, 10);
        } else {
        document.removeEventListener('click', closeMenuOnClickOutside);
        }
    }

    function excluirMensagensSelecionadas() {
        if (mensagensSelecionadas.current.length === 0) return;
        
        if (confirm(`Tem certeza que deseja excluir ${mensagensSelecionadas.current.length} mensagem(ns)?`)) {
        
            mensagensSelecionadas.current.forEach((messageId: any) => {
                remove(dbRef(getDatabase(), `comunidades/${comunidadeId}/mensagens/${messageId}`)).catch(error => {
                    console.error('Erro ao excluir mensagem:', error);
                });
            });
            
            cancelarSelecao();
        }
    }
    
    function formatFileSize(bytes: number) {
        if (!Number.isFinite(bytes) || bytes < 0) return 'Tamanho inválido';
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
    }

    // const carregarComunidades = (navigate: any) => {
    //     get(dbRef(getDatabase(), 'comunidades/' + comunidadeId)).then(snapshot => {
    //     if (snapshot.exists()) {
    //         const comunidade = snapshot.val();

    //         document.getElementById('comunidadeTitulo')!.innerText = comunidade.nome || 'Comunidade';
    //         document.getElementById('comunidadeDescricao')!.innerText = comunidade.descricao || 'Sem descrição';

    //         if (comunidade.tags) {
    //         document.getElementById('comunidadeTags')!.style.display = 'block';
    //         document.getElementById('comunidadeTags')!.querySelector('span')!.innerText = comunidade.tags;
    //         } else {
    //         document.getElementById('comunidadeTags')!.style.display = 'none';
    //         }

    //         if (comunidade.imagem) {
    //             (document.getElementById('comunidadeImagem') as any).src = comunidade.imagem;
    //         } else {
    //             (document.getElementById('comunidadeImagem') as any).src = default_comunidade_src;
    //         }

    //         communityCreator.current = comunidade.criador;

    //         if (comunidade.admins) {
    //             adminMembers.current = comunidade.admins;
    //         }

    //         isSelfAdmin.current = (usuarioLogado!.uid === communityCreator.current) || 
    //                     (adminMembers && adminMembers.current[usuarioLogado!.uid]);

    //         carregarMembros(comunidade);
    //     } else {
    //         alert('Comunidade não encontrada.');
    //         navigate("/");
    //     }
    //     }).catch(error => {
    //         console.error('Erro ao carregar comunidade:', error);
    //         alert('Erro ao carregar dados da comunidade.');
    //     });
    // }

    function abrirMenuMembro(event: any, member: any) {
        event.preventDefault();

        const targetIsCreator = member.id === communityCreator.current;


        const isUserCreator = usuarioLogado!.uid === communityCreator.current;
        if (targetIsCreator && !isUserCreator) {
            return; 
        }


        const targetIsAdmin = adminMembers.current[member.id];
        const canModifyAdmin = isUserCreator; 



        var left = `${event.clientX}px`;
        var top = `${event.clientY}px`;

        const rect = refs.menu.current!.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            left = `${window.innerWidth - rect.width - 10}px`;
        }
        if (rect.bottom > window.innerHeight) {
            top = `${window.innerHeight - rect.height - 10}px`;
        }

        setMember({ show: true, isUserCreator, targetIsAdmin, left, top, ...member });

        if (canModifyAdmin) {
            refs.menu.current!.querySelector('.toggle-admin')!.addEventListener('click', () => {
                toggleAdminStatus(member.id, targetIsAdmin);
                setMember((member: any)=>{ return {show: false, ...member}});
            });
        }

        refs.menu.current!.querySelector('.mute-member')!.addEventListener('click', () => {
            muteMember(member.id);
            setMember((member: any)=>{ return {show: false, ...member}});
        });

        refs.menu.current!.querySelector('.kick-member')!.addEventListener('click', () => {
            kickMember(member.id);
            setMember((member: any)=>{ return {show: false, ...member}});
        });

        refs.menu.current!.querySelector('.ban-member')!.addEventListener('click', () => {
            banMember(member.id);
            setMember((member: any)=>{ return {show: false, ...member}});
        });

        document.addEventListener('click', function closeMenu(e) {
        if (!refs.menu.current!.contains(e.target as any) && !(e.target as any)!.closest('.member-item')) {
            setMember((member: any)=>{ return {show: false, ...member}});
            document.removeEventListener('click', closeMenu);
        }
        });
    }

    function toggleAdminStatus(memberId: string, isCurrentlyAdmin: boolean) {

        if (memberId === communityCreator.current) {
            return;
        }

        if (!isCurrentlyAdmin) {
            set(dbRef(getDatabase(), `comunidades/${comunidadeId}/admins/${memberId}`), true).then(() => {
                adminMembers.current[memberId] = true;
                renderizarMembros(allMembers);
                })
                .catch(error => {
                console.error('Erro ao definir administrador:', error);
                alert('Não foi possível definir o administrador.');
            });
        } else {
            remove(dbRef(getDatabase(), `comunidades/${comunidadeId}/admins/${memberId}`)).then(() => {
                delete adminMembers.current[memberId];
                renderizarMembros(allMembers);
            })
            .catch(error => {
            console.error('Erro ao remover administrador:', error);
            alert('Não foi possível remover o administrador.');
            });
        }
    }

    function kickMember(memberId: string) {

        if (memberId === communityCreator.current) {
            alert('Não é possível expulsar o líder da comunidade.');
            return;
        }


        if (usuarioLogado!.uid !== communityCreator.current && adminMembers.current[usuarioLogado!.uid]) {

        if (adminMembers.current[memberId]) {
            alert('Você não tem permissão para fazer isso.');
            return;
        }
        }

        if (!confirm(`Tem certeza que deseja expulsar este membro da comunidade?`)) {
        return;
        }

        remove(dbRef(getDatabase(), `comunidades/${comunidadeId}/membros/${memberId}`)).then(() => {

            if (adminMembers.current[memberId]) {
                return remove(dbRef(getDatabase(), `comunidades/${comunidadeId}/admins/${memberId}`));
            }
            return Promise.resolve();
        })
        .then(() => { 
            allMembers.current = allMembers.current!.filter((m: any) => m.id !== memberId);
            document.getElementById('membersCount')!.textContent = `(${allMembers.current!.length})`;
            renderizarMembros(allMembers);
        })
        .catch(error => {
            console.error('Erro ao expulsar membro:', error);
            alert('Não foi possível expulsar o membro.');
        });
    }

    function banMember(memberId: string) {

        if (memberId === communityCreator.current) {
            alert('Não é possível banir o líder da comunidade.');
            return;
        }


        if (usuarioLogado!.uid !== communityCreator.current && adminMembers.current[usuarioLogado!.uid]) {

            if (adminMembers.current[memberId]) {
                alert('Você não tem permissão para fazer isso.');
                return;
            }
        }

        if (!confirm(`Tem certeza que deseja banir permanentemente este membro da comunidade?`)) {
        return;
        }

        set(dbRef(getDatabase(), `comunidades/${comunidadeId}/banidos/${memberId}`), {
            by: usuarioLogado!.uid,
            timestamp: serverTimestamp(),
            reason: 'Banido por administrador'
        }).then(() => {

        return remove(dbRef(getDatabase(), `comunidades/${comunidadeId}/membros/${memberId}`));
        })
        .then(() => {

        if (adminMembers.current[memberId]) {
            return remove(dbRef(getDatabase(), `comunidades/${comunidadeId}/admins/${memberId}`));
        }
        return Promise.resolve();
        })
        .then(() => {
        allMembers.current = allMembers.current!.filter((m: any) => m.id !== memberId);
        document.getElementById('membersCount')!.textContent = `(${allMembers.current!.length})`;
        renderizarMembros(allMembers);
        })
        .catch(error => {
        console.error('Erro ao banir membro:', error);
        alert('Não foi possível banir o membro.');
        });
    }

    useEffect(()=>{
        comunidadeId.current = getQueryParam('id');
    },[location]);

    useEffect(()=>{
        initializeFirebase((firebaseValue: FirebaseApp)=>{
            firebase.current = firebaseValue;

        });
        document.addEventListener('click', function(e: any) {
            if (modoSelecao && !e.target.closest('.mensagem-usuario')) {
                cancelarSelecao();
            }
        });

        const searchInput = document.getElementById('memberSearch') as HTMLInputElement;
        const searchButton = document.getElementById('searchButton') as HTMLButtonElement;

        if (searchInput && searchButton) {

            function buscarMembros() {
                const searchTerm = searchInput.value.toLowerCase().trim();

                if (searchTerm === '') {
                    renderizarMembros(allMembers.current);
                    return;
                }

                const filteredMembers = allMembers.current!.filter((member: membersInterface) => (member.nome || '').toLowerCase().includes(searchTerm));
                renderizarMembros(filteredMembers);
            }

            searchButton.addEventListener('click', buscarMembros);

            searchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    buscarMembros();
                }
            });

            searchInput.addEventListener('input', function() {
                buscarMembros();
            });
        }
    },[]);
    
    useEffect(()=>{
        if (usuarioLogado) {
            comunidadeId.current = getQueryParam('id');
        
            if (comunidadeId.current) {
            
                verificarAcessoComunidade().then((isAuthorized: boolean) => {
                    if (isAuthorized) {
                        carregarComunidade();
                        carregarMensagens();
                        verificarStatusMembro(); 
                    } else {
                        alert('Você não tem permissão para acessar esta comunidade.');
                        navigate("/");
                    }
                });
            } else {
                alert('ID da comunidade não encontrado.');
                navigate("/");
            }
        }
    }, [usuarioLogado]);

    return <div id="com-page" className="page">
        <div id="bannerOverlay" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0, 0, 0, 0.3)', display: 'none', justifyContent: 'center', alignItems: 'center', color: 'white', fontSize: 18 }}>Clique para editar o banner</div>

        <main>
            <div className="community-container">
                <div className="community-left">
                    <div className="comunidade-info">
                    <div
                        id="communityBanner"
                        style={{
                        width: '100%',
                        height: 200,
                        backgroundColor: '#f0f0f0',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        cursor: 'pointer',
                        borderTopRightRadius: 30,
                        borderTopLeftRadius: 30,
                        }}
                    ></div>
                    <img
                        id="comunidadeImagem"
                        src={default_comunidade_src}
                        alt="Imagem da comunidade"
                    />
                    <h2 id="comunidadeTitulo">Nome da Comunidade</h2>
                    <p id="comunidadeDescricao">Descrição da comunidade</p>
                    <p id="comunidadeTags">
                        Tags: <span></span>
                    </p>
                    </div>

                    <div
                    id="botao-entrar-container"
                    style={{ textAlign: 'center', margin: '15px 0', display: 'none' }}
                    >
                    <button
                        id="botao-entrar"
                        style={{
                        padding: '10px 20px',
                        fontSize: 16,
                        background: '#248232',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 5,
                        cursor: 'pointer',
                        }}
                    >
                        Entrar na Comunidade
                    </button>
                    </div>

                    <div id="chat-container">
                    <h3>Chat da Comunidade</h3>
                    <div id="chat-messages"></div>
                    <div id="chat-input">
                        <input
                        type="file"
                        ref={refs.fileInput}
                        id="fileUpload"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar,image/*,video/*"
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                        />
                        <textarea ref={refs.messageInput} id="messageInput" placeholder="Digite sua mensagem..."></textarea>
                        <i onClick={enviarMensagem} className="fa-solid fa-paper-plane send-item" aria-hidden="true"></i>
                        <i onClick={()=>refs.fileInput.current!.click()} className="fa-solid fa-paperclip send-item" aria-hidden="true"></i>
                        <i onClick={iniciarGravacaoAudio} id="audio-record-btn" title="Gravar mensagem voz" className={"fa-solid  attachment-btn send-item " + ( isRecording ? "fa-stop recording" : "fa-microphone" ) }></i>
                    </div>
                    </div>
                </div>

                <div className="community-right">
                    <div className="members-container">
                        <div className="members-header">
                            <h3>
                            Membros <span id="membersCount">({membersCount})</span>
                            </h3>
                            <div className="search-box">
                            <input
                                type="text"
                                id="memberSearch"
                                placeholder="Buscar membro..."
                            />
                            <button id="searchButton">
                                <i className="fas fa-search"></i>
                            </button>
                            </div>
                        </div>
                        <div id="membersList">{members.map((member, index:number)=>{
                                return <Link to={"/perfil?id="+member.id} className="member-item" key={index} onClick={(e: any)=>{
                                    const canManageMember = isSelfAdmin && member.id !== usuarioLogado!.uid;
                                    const isUserCreator = usuarioLogado!.uid === communityCreator.current;

                                    if (canManageMember && (isUserCreator || member.id !== communityCreator.current)) {
                                        abrirMenuMembro(e, member);
                                    }
                                }}>
                                    <img src={member.fotoPerfil || avatar_src} alt={member.nome} className="member-avatar"/>
                                    <div className="member-info">
                                        <div className="member-name">
                                            <div>{member.nome || 'Usuário'}</div>
                                            {member.isCreator ? <i className="fas fa-crown crown-icon" title="Líder da comunidade"></i> : <></>}
                                            {member.isAdmin && !member.isCreator ? <span className="admin-badge">Admin</span> : <></>}
                                        </div>
                                    </div>
                                </Link>
                        })}</div>
                    </div>
                </div>
            </div>
        </main>

        <div
            id="bannerModal"
            style={{
            display: 'none',
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            }}
        >
            <div
            style={{
                background: 'white',
                padding: 20,
                borderRadius: 10,
                width: '90%',
                maxWidth: 500,
            }}
            >
            <h3>Editar Banner da Comunidade</h3>
            <input
                type="file"
                id="bannerFileInput"
                accept="image/*"
                style={{ margin: '10px 0' }}
            />
            <div
                style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}
            >
                <button
                onClick={fecharModalBanner}
                style={{
                    padding: '10px 20px',
                    background: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: 5,
                    cursor: 'pointer',
                }}
                >
                Cancelar
                </button>
                <button
                onClick={salvarBanner}
                style={{
                    padding: '10px 20px',
                    background: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: 5,
                    cursor: 'pointer',
                }}
                >
                Salvar
                </button>
            </div>
            </div>
        </div>
        <div className="member-options" style={{ position: "absolute", display: member.show ? "block" :"none", left: member.left, top: member.top  }} ref={refs.menu}>
            <Link to={ "/perfil?id=" + member.id } className="member-options-header">
                <img src={member.fotoPerfil || avatar_src} alt={member.nome} />
                {member.nome || 'Usuário'}
            </Link>

            {member.isUserCreator && (
                <div className="option-item toggle-admin">
                {member.targetIsAdmin ? 'Remover administrador' : 'Definir como administrador'}
                </div>
            )}
            <div className="option-item mute-member">Silenciar membro</div>
            <div className="option-item danger kick-member">Expulsar da comunidade</div>
            <div className="option-item danger ban-member">Banir permanentemente</div>
        </div>
        <Alert showPopup={showPopup}></Alert>
    </div>
}

export default Comunidade;