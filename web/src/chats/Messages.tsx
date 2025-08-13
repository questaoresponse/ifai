import React, { useEffect, memo, useRef, useState, type RefObject, useCallback } from "react";
import { formatMessageTime, formatTimeBetweenMessages } from "../Functions";
import { collection, getDocs, query, where } from "firebase/firestore";
import { atualizarNotificacoesChat, getDriveURL } from "../Functions";
import { getDatabase, ref as dbRef, set, query as queryDb, get, onValue, update, push, orderByChild, serverTimestamp } from "firebase/database"
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, uploadBytesResumable } from "firebase/storage";
import { useGlobal } from "../Global";
import { useNavigate } from "react-router-dom";
import avatar_src from "../assets/static/avatar.png";

function generate_id(){
    const timestamp = Date.now();
    return timestamp * 1000 + Math.floor(Math.random() * 999);
}

function isDifferentDay(date1: Date, date2: Date){
    return (date1.getFullYear() !== date2.getFullYear() ||
            date1.getMonth() !== date2!.getMonth() ||
            date1.getDate() !== date2!.getDate())
}

interface audioInterface{
    audioSeconds: number,
    audioTimer: any,
    mediaRecorder: MediaRecorder | null,
    audioChunks: any[]
}

interface chatUser{
    logo: string,
    name: string,
    uid: string
}

interface messageInterface {
    arquivo?: {
        url: string;
        tipo: string;
        nome: string;
        tamanho: number;
    };
    audio?: {
        url: string;
        duracao: number;
    };
    date: Date;
    id: number;
    imagem?: string;
    isTime: boolean;
    mode?:number;
    uid?: string;
    text?: string;
    time: number;
    video?: string;
}

interface Props {
    showPopup: RefObject<(message: string) => void>
//   messages: messageInterface[];
//   scrollToBottom: () => void;
//   onExcluir: (id: string, tipo: "audio" | "arquivo" | "imagem" | "video" | "texto", url?: string) => void;
}

const Messages: React.FC<Props> = ({showPopup}) => {
    const { db, mobile, usuarioLogado, socket } = useGlobal();

    const navigate = useNavigate();
    
    // const modoSelecao = useRef<boolean>(false);
    // const mensagensSelecionadas = useRef<any[]>([]);
    const [ messages, setMessages ] = useState<messageInterface[]>([]);
    const [ messageInputValue, setMessageInputValue ] = useState("");
    const myUser = useRef<chatUser>(null);
    const [ otherUser, setOtherUser ] = useState<chatUser | null>(null);

    const chatId = useRef<number>(-1);


    const audio = useRef<audioInterface>({
        audioSeconds: 0,
        audioTimer: null,
        mediaRecorder: null,
        audioChunks: []
    });
    
    const [ isRecording, setIsRecording ] = useState(false);

    const refs = {
        fileInput: useRef<HTMLInputElement>(null),
        messageInput: useRef<HTMLDivElement>(null)
    }

    // const handleExcluir = (_: messageInterface) => {
        // if (message.audio) return onExcluir(message.id, "audio", message.audio.url);
        // if (message.arquivo) return onExcluir(message.id, "arquivo", message.arquivo.url);
        // if (message.video) return onExcluir(message.id, "video", message.video);
        // if (message.imagem) return onExcluir(message.id, "imagem", message.imagem);
        // return onExcluir(message.id!, "texto");
    // };

    const togglePlayPause = (_: string, __: any) => {

    }

    const abrirImagemModal = (_: string) => {

    }
    
    const seekAudio = (_: string, __: any) => {

    }

    const getFileIcon = (_: string) => {
        return "";
    }

    const formatFileSize = (_: number) => {
        return "";
    }

    const onMessageInputKeyDown = (event: any) => {
        if (!otherUser) return;
    
        if (!mobile && event.key === "Enter") {
            if (event.shiftKey) {
                return;
            } else {
                enviarMensagem();
                setMessageInputValue("");
                event.preventDefault();
            }
        }
    
        set(dbRef(getDatabase(), `chats/${chatId.current}/typing/${usuarioLogado!.uid}`), true);

        clearTimeout(window.typingTimeout);
        window.typingTimeout = setTimeout(() => {
            set(dbRef(getDatabase(), `chats/${chatId.current}/typing/${usuarioLogado!.uid}`), false);
        }, 2000);
    }

    const onMessageInputBlur = () => {
        if (!otherUser) return;

        set(dbRef(getDatabase(), `chats/${chatId.current}/typing/${usuarioLogado!.uid}`), false);
    }

    const enviarMensagem = () => {
        if (!usuarioLogado || !otherUser) return;

        const message = refs.messageInput.current!.innerText;
        if (message.trim() === "") {
            return;
        }

        refs.messageInput.current!.textContent = "";

        const id = generate_id();
        const time = Math.floor(id / 1000000);

        socket.send("/chat", { operation: "send_message", text: message, type: 0, chat_id: chatId.current }).then(result=>{
            if (result.result){
                setMessages(messages=>[...messages.map(message=>{return {...message, mode: message.id == id ? 1 : message.mode, id: message.id == id ? result.id : message.id}})]);
            }
        });

   

        setMessages(messages=>{
            const new_messages = [...messages];

            const new_message_date = new Date(time * 1000);


            if (messages.length == 0 || isDifferentDay(messages[messages.length-1].date, new_message_date)){
                const id = generate_id();
                new_messages.push({ isTime: true, date: new_message_date, id, time });
            }
                
            new_messages.push({ date: new_message_date, text: message, mode: 0, uid: usuarioLogado!.uid, id, time, isTime: false });

            return new_messages;
        });

        // auth.post(server + "/message", { title: myUser.current!.name, body: message, other_uid: otherUser.uid, chat_id: new URLSearchParams(location.search).get("id") });
        
        // const novaMensagem = {
        //     remetente: usuarioLogado!.uid,
        //     texto: message,
        //     timestamp: Date.now(),
        //     lida: false,
        // };
        // push(dbRef(getDatabase(),`chats/${chatId.current}`), novaMensagem).then(() => {
        // });
        
        // marcarMensagensComoLidas();
    }

    function marcarMensagensComoLidas() {
        if (!usuarioLogado || !chatId.current) return;
    
        get(queryDb(
            dbRef(getDatabase(),`chats/${chatId.current}`),
            orderByChild("timestamp")
        )).then((snapshot) => {
            let updates: {[key:string]: any} = {};
            snapshot.forEach((childSnapshot) => {
                const mensagem = childSnapshot.val();
                if (
                    mensagem.lida === false &&
                    mensagem.remetente !== usuarioLogado!.uid
                ) {
                    updates[childSnapshot.key + "/lida"] = true;
                }
            });
            if (Object.keys(updates).length > 0) {
                update(dbRef(getDatabase(), `chats/${chatId.current}`), updates).then(() => {
                    atualizarNotificacoesChat();
                });
            }
        });
    }

    // function excluirAudio(messageId: any, audioUrl: string) {
    //   if (!usuarioLogado || !chatId.current) return;
    
    //   if (confirm("Tem certeza que deseja excluir esta mensagem de áudio?")) {
    //     deleteObject(storageRef(getStorage(), audioUrl)).then(() => {
    //         return remove(dbRef(getDatabase(),`chats/${chatId.current}/${messageId}`));
    //     }).then(() => {
    //         console.log("Mensagem de áudio excluída com sucesso");
    //       })
    //       .catch(error => {
    //         console.error("Erro ao excluir mensagem de áudio:", error);
    //         showPopup.current("Não foi possível excluir a mensagem.");
    //       });
    //   }
    // }
    
    // function excluirImagem(messageId: string, imageUrl: string) {
    //   if (!usuarioLogado || !otherUser.current) return;
    
    //   if (confirm("Tem certeza que deseja excluir esta mensagem com imagem?")) {
    //     deleteObject(storageRef(getStorage(), imageUrl)).then(() => {
    //         return remove(dbRef(getDatabase(),`chats/${chatId.current}/${messageId}`));
    //       })
    //       .then(() => {
    //         console.log("Mensagem e imagem excluídas com sucesso");
    //       })
    //       .catch((error: any) => {
    //         console.error("Erro ao excluir mensagem com imagem:", error);
    //         showPopup.current("Não foi possível excluir a mensagem.");
    //       });
    //   }
    // }
    
    // function excluirVideo(messageId: any, videoUrl: string) {
    //   if (!usuarioLogado || !chatId.current) return;
    
    //   if (confirm("Tem certeza que deseja excluir esta mensagem com vídeo?")) {
    //         deleteObject(storageRef(getStorage(), videoUrl)).then(() => {
    //             return remove(dbRef(getDatabase(),`chats/${chatId.current}/${messageId}`));
    //         })
    //         .then(() => {
    //             console.log("Mensagem e vídeo excluídos com sucesso");
    //         })
    //         .catch(error => {
    //             console.error("Erro ao excluir mensagem com vídeo:", error);
    //             showPopup.current("Não foi possível excluir a mensagem.");
    //         });
    //   }
    // }
    
    // function excluirArquivo(messageId: any, fileUrl: any) {
    //   if (!usuarioLogado || !chatId.current) return;
    
    //   if (confirm("Tem certeza que deseja excluir esta mensagem com arquivo?")) {
    //     deleteObject(storageRef(getStorage(), fileUrl)).then(() => {
    //         return remove(dbRef(getDatabase(),`chats/${chatId.current}/${messageId}`));
    //       })
    //       .then(() => {
    //         console.log("Mensagem e arquivo excluídos com sucesso");
    //       })
    //       .catch((error: any) => {
    //         console.error("Erro ao excluir mensagem com arquivo:", error);
    //         showPopup.current("Não foi possível excluir a mensagem.");
    //       });
    //   }
    // }

    function monitorarDigitacao() {
        if (!usuarioLogado || !otherUser) return;

        const typingRef = dbRef(getDatabase(),`chats/${chatId.current}/typing`);
        
        function atualizarIndicador(snapshot: any) {
            let outroDigitando = false;
            snapshot.forEach((childSnap: any) => {
                if (childSnap.key !== usuarioLogado!.uid && childSnap.val() === true) {
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
            
                    getDocs(query(collection(db.current!, "usuarios"), where("uid", "==", otherUser!.uid))).then(results=>{
                        const userAmigo = results.docs[0].data();
                        let img = document.createElement("img");
                        img.src = userAmigo.fotoPerfil ?
                        getDriveURL(userAmigo.fotoPerfil) :
                        "static/avatar.png";
                        img.style.width = "40px";
                        img.style.height = "40px";
                        img.style.borderRadius = "50%";
                        img.style.objectFit = "cover";
                        img.style.marginRight = "10px";
            
                        mensagemContainer.appendChild(img);
                        mensagemContainer.appendChild(typingBubble!);
                        chatMessagesContainer!.appendChild(mensagemContainer);
                        chatMessagesContainer!.scrollTop =
                        chatMessagesContainer!.scrollHeight;
                    });
                }
            } else {
                if (typingBubble) {
                    typingBubble.parentElement!.remove();
                }
            }
        }
        
        onValue(typingRef, atualizarIndicador);
    }

    // function carregarMensagens() {
    //     if (!usuarioLogado || !otherUser) return;

    //     const chatMessagesContainer = document.getElementById("chat-messages");
    //     if (!chatMessagesContainer) {
    //         console.error("Elemento chat-messages não encontrado");
    //         return;
    //     }
    
    //     let barraOpcoes = document.getElementById("barra-opcoes-selecao");
    //     if (!barraOpcoes) {
    //         barraOpcoes = document.createElement("div");
    //         barraOpcoes.id = "barra-opcoes-selecao";
    //         barraOpcoes.style.position = "fixed";
    
    //         barraOpcoes.style.left = "0";
    //         barraOpcoes.style.right = "0";
    //         barraOpcoes.style.backgroundColor = "#333";
    //         barraOpcoes.style.color = "white";
    //         barraOpcoes.style.padding = "10px";
    //         barraOpcoes.style.display = "none";
    //         barraOpcoes.style.justifyContent = "space-between";
    //         barraOpcoes.style.alignItems = "center";
    
    //         const contadorSelecionadas = document.createElement("span");
    //         contadorSelecionadas.id = "contador-selecionadas";
    //         contadorSelecionadas.textContent = "0 selecionadas";
    
    //         const btnExcluir = document.createElement("button");
    //         btnExcluir.textContent = "Excluir";
    //         btnExcluir.style.backgroundColor = "red";
    //         btnExcluir.style.color = "white";
    //         btnExcluir.style.border = "none";
    //         btnExcluir.style.padding = "5px 10px";
    //         btnExcluir.style.borderRadius = "5px";
    //         btnExcluir.style.cursor = "pointer";
    //         btnExcluir.onclick = excluirMensagensSelecionadas;
    
    //         const btnCancelar = document.createElement("button");
    //         btnCancelar.textContent = "Cancelar";
    //         btnCancelar.style.backgroundColor = "gray";
    //         btnCancelar.style.color = "white";
    //         btnCancelar.style.border = "none";
    //         btnCancelar.style.padding = "5px 10px";
    //         btnCancelar.style.borderRadius = "5px";
    //         btnCancelar.style.cursor = "pointer";
    //         btnCancelar.onclick = cancelarSelecao;
    
    //         barraOpcoes.appendChild(contadorSelecionadas);
    //         barraOpcoes.appendChild(btnExcluir);
    //         barraOpcoes.appendChild(btnCancelar);
    
    //         document.body.appendChild(barraOpcoes);
    //     }
    //     onValue(queryDb(
    //         dbRef(getDatabase(),`chats/${chatId.current}`),
    //         orderByChild("timestamp")
    //     ), (snapshot) => {
    //         const new_messages: messageInterface[] = [];

    //         snapshot.forEach((childSnapshot) => {
    //             const new_message = childSnapshot.val();
    //             new_message.date = new Date(new_message.time * 1000);

    //             const previous_message_date = new_messages.length > 0 ? new_messages[new_messages.length-1].date : null;

    //             if (!previous_message_date || isDifferentDay(new_message.date, previous_message_date)){
    //                 const id = generate_id();
    //                 new_messages.push({ isTime: true, date: new_message.date, id, time: new_message.time });
    //             }

    //             new_messages.push({ ...new_message, isTime: false, time: undefined });
    //             // if (mensagem.remetente){
    //             // if (false){
    //             //     const mensagemContainer = document.createElement("div");
    //             //     mensagemContainer.style.display = "flex";
    //             //     mensagemContainer.style.alignItems = "center";
    //             //     mensagemContainer.style.margin = "10px 0";
        
    //             //     const img = document.createElement("img");
    //             //     img.style.width = "40px";
    //             //     img.style.height = "40px";
    //             //     img.style.borderRadius = "50%";
    //             //     img.style.objectFit = "cover";
    //             //     img.style.marginRight = "10px";
        
    //             //     const div = document.createElement("div");
    //             //     div.classList.add("message-bubble");
    //             //     div.style.padding = "8px";
    //             //     div.style.borderRadius = "15px";
    //             //     div.style.maxWidth = "fit-content";
    //             //     div.style.position = "relative";
        
    //             //     const timestamp = mensagem.timestamp;
    //             //     const date = new Date(timestamp);
    //             //     if (timestamp - lastTimestamp > 600000) {
    //             //         const timeDiv = document.createElement("div");
    //             //         timeDiv.className = "time-div";
    //             //         // timeDiv.textContent = formatTimestamp(date);
    //             //         chatMessagesContainer!.appendChild(timeDiv);
    //             //     }
    //             //     lastTimestamp = timestamp;
    //             //     if (mensagem.remetente === usuarioLogado!.uid) {
    //             //     const messageWrapper = document.createElement("div");
    //             //     messageWrapper.style.position = "relative";
    //             //     messageWrapper.style.display = "inline-block";
    //             //     messageWrapper.style.marginLeft = "auto";
    //             //     messageWrapper.classList.add("mensagem-usuario");
        
    //             //     div.style.backgroundColor = "green";
    //             //     div.style.color = "white";
    //             //     div.style.marginLeft = "auto";
    //             //     // const timeString = formatTime(date);
        
    //             //     let messageContent = `<div style="font-weight:bold;">Você</div>`;
        
    //             //     if (mensagem.imagem) {
    //             //         messageContent += `
    //             //         <div style="margin: 5px 0;">
    //             //             <img src="${mensagem.imagem}" style="max-width: 250px; max-height: 250px; border-radius: 10px; cursor: pointer;" 
    //             //             onclick="abrirImagemModal('${mensagem.imagem}')">
    //             //         </div>
    //             //         `;
    //             //     }
        
    //             //     if (mensagem.video) {
    //             //         messageContent += `
    //             //         <div style="margin: 5px 0;">
    //             //             <video src="${mensagem.video}" controls style="max-width: 250px; max-height: 250px; border-radius: 10px;"></video>
    //             //         </div>
    //             //         `;
    //             //     }
        
    //             //     if (mensagem.audio && mensagem.audio.url) {
    //             //         const duracao = mensagem.audio.duracao || 0;
    //             //         const minutos = Math.floor(duracao / 60);
    //             //         const segundos = duracao % 60;
    //             //         const duracaoFormatada = `${minutos.toString().padStart(2, "0")}:${segundos.toString().padStart(2, "0")}`;
        
    //             //         messageContent += `
    //             //         <div style="margin: 5px 0; display: flex; align-items: center; background-color: #1b5c2438; border-radius: 10px; padding: 8px;">
    //             //             <audio id="audio-${messageId}" src="${mensagem.audio.url}" preload="auto"></audio>
    //             //             <button onclick="togglePlayPause('audio-${messageId}', 'play-btn-${messageId}')" 
    //             //             id="play-btn-${messageId}" style="background: none; border: none; font-size: 20px; color: green; cursor: pointer;">
    //             //             <i class="fa-solid fa-play"></i>
    //             //             </button>
    //             //             <div style="flex-grow: 1; height: 4px; background-color: #e0e0e0; border-radius: 2px; margin: 0 10px; cursor: pointer;" 
    //             //             onclick="seekAudio('audio-${messageId}', this)">
    //             //             <div style="height: 100%; width: 0%; background-color: #248232;"></div>
    //             //             </div>
    //             //             <div style="font-size: 12px; color: white;">${duracaoFormatada}</div>
    //             //         </div>
    //             //         `;
    //             //     }
        
    //             //     if (mensagem.arquivo) {
    //             //         messageContent += `
    //             //         <div style="margin: 5px 0; display: flex; align-items: center; background-color: #1b5c2438; border-radius: 10px; padding: 8px; cursor: pointer;">
    //             //             <div style="margin-right: 10px; font-size: 24px;">
    //             //             ${getFileIcon(mensagem.arquivo.tipo)}
    //             //             </div>
    //             //             <div>
    //             //             <strong>${mensagem.arquivo.nome}</strong>
    //             //             <div style="font-size: 12px; color: white;">
    //             //                 ${formatFileSize(mensagem.arquivo.tamanho || 0)}
    //             //             </div>
    //             //             </div>
    //             //             <a href="${mensagem.arquivo.url}" target="_blank" download="${mensagem.arquivo.nome}" 
    //             //             style="margin-left: auto; color: white; text-decoration: none;">
    //             //             <i class="fa-solid fa-download"></i> Baixar
    //             //             </a>
    //             //         </div>
    //             //         `;
    //             //     }
        
    //             //     if (mensagem.texto) {
    //             //         messageContent += `<div style="white-space: pre-wrap;">${mensagem.texto}</div>`;
    //             //     }
        
    //             //     // messageContent += `<div style="text-align:right; font-size:small;">${timeString}</div>`;
    //             //     div.innerHTML = messageContent;
        
    //             //     const optionsButton = document.createElement("div");
    //             //     optionsButton.innerHTML = "⋮";
    //             //     optionsButton.style.cursor = "pointer";
    //             //     optionsButton.style.fontSize = "16px";
    //             //     optionsButton.style.padding = "3px";
    //             //     optionsButton.style.position = "absolute";
    //             //     optionsButton.style.right = "0";
    //             //     optionsButton.style.bottom = "-18px";
        
    //             //     const menuId = `menu-${messageId}`;
    //             //     const menuOpcoes = document.createElement("div");
    //             //     menuOpcoes.id = menuId;
    //             //     menuOpcoes.className = "menu-opcoes";
    //             //     menuOpcoes.style.position = "absolute";
    //             //     menuOpcoes.style.right = "0";
    //             //     menuOpcoes.style.bottom = "-40px";
    //             //     menuOpcoes.style.backgroundColor = "white";
    //             //     menuOpcoes.style.boxShadow = "0 2px 5px rgba(0,0,0,0.2)";
    //             //     menuOpcoes.style.padding = "5px";
    //             //     menuOpcoes.style.borderRadius = "3px";
    //             //     menuOpcoes.style.zIndex = "1000";
    //             //     menuOpcoes.style.display = "none";
        
    //             //     const excluirOpcao = document.createElement("div");
    //             //     excluirOpcao.textContent = "Excluir";
    //             //     excluirOpcao.style.padding = "5px 10px";
    //             //     excluirOpcao.style.cursor = "pointer";
    //             //     excluirOpcao.style.color = "red";
    //             //     excluirOpcao.style.margin = "0 auto";
        
    //             //     excluirOpcao.onclick = (e) => {
    //             //         e.stopPropagation();
    //             //         if (mensagem.audio && mensagem.audio.url) {
    //             //             excluirAudio(messageId, mensagem.audio.url);
    //             //         } else if (mensagem.arquivo) {
    //             //             excluirArquivo(messageId, mensagem.arquivo.url);
    //             //         } else if (mensagem.video) {
    //             //             excluirVideo(messageId, mensagem.video);
    //             //         } else if (mensagem.imagem) {
    //             //             excluirImagem(messageId, mensagem.imagem);
    //             //         } else {
    //             //             excluirMensagem(messageId);
    //             //         }
    //             //     };
        
    //             //     optionsButton.onclick = () => toggleMenuOpcoes(menuId);
        
    //             //     menuOpcoes.appendChild(excluirOpcao);
    //             //     messageWrapper.appendChild(div);
    //             //     messageWrapper.appendChild(optionsButton);
    //             //     messageWrapper.appendChild(menuOpcoes);
    //             //     mensagemContainer.appendChild(messageWrapper);
        
    //             //     messageWrapper.addEventListener("dblclick", function(e) {
    //             //         iniciarSelecao(this, messageId);
    //             //         e.stopPropagation();
    //             //     });
        
    //             //     messageWrapper.addEventListener("click", function(e) {
    //             //         if (modoSelecao) {
    //             //         toggleSelecaoMensagem(this, messageId);
    //             //         e.stopPropagation();
    //             //         }
    //             //     });
    //             //     } else {
        
    //             //     div.style.backgroundColor = "gray";
    //             //     div.style.color = "white";
    //             //     div.style.marginRight = "auto";
                    
    //             //     getDocs(query(collection(db.current!, "usuarios"), where("uid", "==", otherUser.current!.uid))).then(results=>{
    //             //         const userAmigo = results.docs[0].data();
    //             //         img.src = userAmigo.fotoPerfil ? getDriveURL(userAmigo.fotoPerfil) : avatar_src;
    //             //         // const timeString = formatTime(date);
        
    //             //         let messageContent = "";
        
    //             //         if (mensagem.imagem) {
    //             //             messageContent += `
    //             //             <div style="margin: 5px 0;">
    //             //                 <img src="${mensagem.imagem}" style="max-width: 250px; max-height: 250px; border-radius: 10px; cursor: pointer;" 
    //             //                 onclick="abrirImagemModal('${mensagem.imagem}')">
    //             //             </div>
    //             //             `;
    //             //         }
        
    //             //         if (mensagem.video) {
    //             //             messageContent += `
    //             //             <div style="margin: 5px 0;">
    //             //                 <video src="${mensagem.video}" controls style="max-width: 250px; max-height: 250px; border-radius: 10px;"></video>
    //             //             </div>
    //             //             `;
    //             //         }
        
    //             //         if (mensagem.audio && mensagem.audio.url) {
    //             //             const duracao = mensagem.audio.duracao || 0;
    //             //             const minutos = Math.floor(duracao / 60);
    //             //             const segundos = duracao % 60;
    //             //             const duracaoFormatada = `${minutos.toString().padStart(2, "0")}:${segundos.toString().padStart(2, "0")}`;
        
    //             //             messageContent += `
    //             //             <div style="margin: 5px 0; display: flex; align-items: center; background-color: #1b5c2438; border-radius: 10px; padding: 8px;">
    //             //                 <audio id="audio-${messageId}" src="${mensagem.audio.url}" preload="auto"></audio>
    //             //                 <button onclick="togglePlayPause('audio-${messageId}', 'play-btn-${messageId}')" 
    //             //                 id="play-btn-${messageId}" style="background: none; border: none; font-size: 20px; color: green; cursor: pointer;">
    //             //                 <i class="fa-solid fa-play"></i>
    //             //                 </button>
    //             //                 <div style="flex-grow: 1; height: 4px; background-color: #e0e0e0; border-radius: 2px; margin: 0 10px; cursor: pointer;" 
    //             //                 onclick="seekAudio('audio-${messageId}', this)">
    //             //                 <div style="height: 100%; width: 0%; background-color: #248232;"></div>
    //             //                 </div>
    //             //                 <div style="font-size: 12px; color: white;">${duracaoFormatada}</div>
    //             //             </div>
    //             //             `;
    //             //         }
        
    //             //         if (mensagem.arquivo) {
    //             //             messageContent += `
    //             //             <div style="margin: 5px 0; display: flex; align-items: center; background-color: #1b5c2438; border-radius: 10px; padding: 8px; cursor: pointer;">
    //             //                 <div style="margin-right: 10px; font-size: 24px;">
    //             //                 ${getFileIcon(mensagem.arquivo.tipo)}
    //             //                 </div>
    //             //                 <div>
    //             //                 <strong>${mensagem.arquivo.nome}</strong>
    //             //                 <div style="font-size: 12px; color: white;">
    //             //                     ${formatFileSize(mensagem.arquivo.tamanho || 0)}
    //             //                 </div>
    //             //                 </div>
    //             //                 <a href="${mensagem.arquivo.url}" target="_blank" download="${mensagem.arquivo.nome}" 
    //             //                 style="margin-left: auto; color: white; text-decoration: none;">
    //             //                 <i class="fa-solid fa-download"></i> Baixar
    //             //                 </a>
    //             //             </div>
    //             //             `;
    //             //         }
        
    //             //         if (mensagem.texto) {
    //             //             messageContent += `<div>${mensagem.texto}</div>`;
    //             //         }
        
    //             //         // messageContent += `<div style="text-align:right; font-size:small;">${timeString}</div>`;
    //             //         div.innerHTML = messageContent;
    //             //         });
        
    //             //     mensagemContainer.appendChild(img);
    //             //     mensagemContainer.appendChild(div);
    //             //     }
    //             //     chatMessagesContainer!.appendChild(mensagemContainer);
    //             // }
    //         });

    //         setMessages(new_messages);
    
    //         chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    //     });
    // }

    // function excluirMensagem(messageId: string) {
    //     if (confirm("Tem certeza que deseja excluir esta mensagem?")) {
    //         remove(dbRef(getDatabase(), `chats/${chatId.current}/${messageId}`)).then(() => {
    //             console.log("Mensagem excluída com sucesso");
    //         })
    //         .catch((error) => {
    //             console.error("Erro ao excluir mensagem:", error);
    //         });
    //     }
    // }
    
    // function toggleMenuOpcoes(menuId: string) {
    //   const menu = document.getElementById(menuId);
    //   if (menu!.style.display === "block") {
    //     menu!.style.display = "none";
    //   } else {
    //     document.querySelectorAll(".menu-opcoes").forEach((m: any) => {
    //         m.style.display = "none";
    //     });
    //     menu!.style.display = "block";
    //   }
    // }
    
    // function iniciarSelecao(elemento: any, messageId: string) {
    //     if (!modoSelecao.current) {
    //         modoSelecao.current = true;
    //         mensagensSelecionadas.current = [];
    //         toggleSelecaoMensagem(elemento, messageId);
        
    //         const barraOpcoes = document.getElementById("barra-opcoes-selecao");
    //         if (barraOpcoes) {
    //             barraOpcoes.style.display = "flex";
    //         }
    //     }
    // }
    
    // function toggleSelecaoMensagem(elemento: any, messageId: string) {
    //     if (!modoSelecao) return;
        
    //     if (!elemento.classList.contains("mensagem-usuario")) return;
        
    //     const index = mensagensSelecionadas.current.findIndex(
    //         (m) => m.messageId === messageId,
    //     );
        
    //     if (index === -1) {
    //         mensagensSelecionadas.current.push({
    //             chatId,
    //             messageId
    //         });
    //         elemento.style.opacity = "0.7";
    //         elemento.querySelector(".message-bubble").style.borderWidth = "2px";
    //         elemento.querySelector(".message-bubble").style.borderStyle = "solid";
    //         elemento.querySelector(".message-bubble").style.borderColor = "yellow";
    //     } else {
    //         mensagensSelecionadas.current.splice(index, 1);
    //         elemento.style.opacity = "1";
    //         elemento.querySelector(".message-bubble").style.border = "none";
        
    //         if (mensagensSelecionadas.current.length === 0) {
    //             cancelarSelecao();
    //         }
    //     }
        
    //     const contador = document.getElementById("contador-selecionadas");
    //     if (contador) {
    //         contador.textContent = `${mensagensSelecionadas.current.length} selecionada${mensagensSelecionadas.current.length !== 1 ? "s" : ""}`;
    //     }
    // }
    
    // function cancelarSelecao() {
    //     modoSelecao.current = false;
    
    //     document.querySelectorAll(".mensagem-usuario").forEach((elem: any) => {
    //         elem.style.opacity = "1";
    //         elem.querySelector(".message-bubble").style.border = "none";
    //     });
    
    //     mensagensSelecionadas.current = [];
    
    //     const barraOpcoes = document.getElementById("barra-opcoes-selecao");
    //     if (barraOpcoes) {
    //         barraOpcoes.style.display = "none";
    //     }
    // }
    
    // function excluirMensagensSelecionadas() {
    //     if (mensagensSelecionadas.current.length === 0) return;
    
    //     if (
    //         confirm(`Tem certeza que deseja excluir ${mensagensSelecionadas.current.length} mensagem(ns)?`)
    //     ) {
    //         mensagensSelecionadas.current.forEach(({
    //             chatId,
    //             messageId
    //         }) => {
    //             remove(dbRef(getDatabase(), `chats/${chatId.current}/${messageId}`)).catch((error) => {
    //             console.error("Erro ao excluir mensagem:", error);
    //             });
    //         });
    
    //         cancelarSelecao();
    //     }
    // }
    
    // function getFileIcon(fileType: string | null) {
    //   if (!fileType) return '<i class="fa-solid fa-file"></i>';
    
    //   if (fileType.includes("pdf")) return '<i class="fa-solid fa-file-pdf"></i>';
    //   if (fileType.includes("word")) return '<i class="fa-solid fa-file-word"></i>';
    //   if (fileType.includes("excel") || fileType.includes("spreadsheet")) return '<i class="fa-solid fa-file-excel"></i>';
    //   if (fileType.includes("zip") || fileType.includes("rar")) return '<i class="fa-solid fa-file-zipper"></i>';
    //   if (fileType.includes("text")) return '<i class="fa-solid fa-file-lines"></i>';
    
    //   return '<i class="fa-solid fa-file"></i>';
    // }
    
    // function formatFileSize(bytes: number) {
    //   if (!Number.isFinite(bytes) || bytes < 0) return "Tamanho inválido";
    //   if (bytes === 0) return "0 Bytes";
    
    //   const k = 1024;
    //   const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    //   const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    //   return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
    // }

    function iniciarGravacaoAudio() {
        if (!usuarioLogado || !otherUser) return;
        
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
      if (!usuarioLogado || !otherUser || !audioBlob) return;
    
      const audioFileName = `audio_${usuarioLogado.uid}_${Date.now()}.wav`;
    
      const audioRef = storageRef(getStorage(), `chat_audios/${chatId.current}/${audioFileName}`);
    
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
                const messageText = refs.messageInput.current ? refs.messageInput.current!.textContent!.trim() : "";
        
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
    
              return push(dbRef(getDatabase(),`chats/${chatId.current}`), novaMensagem);
            })
            .then(() => {
                refs.messageInput.current!.textContent! = "";
                document.body.removeChild(progressBar);
                marcarMensagensComoLidas();
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
    
        const messageText = refs.messageInput.current ? refs.messageInput.current!.textContent!.trim() : '';
    
        const fileRef = storageRef(getStorage(), `chat_files/${chatId.current}/${usuarioLogado!.uid}_${Date.now()}_${file.name}`);
        
        uploadBytes(fileRef, file)
        .then(snapshot => getDownloadURL(snapshot.ref))
        .then(fileUrl => {
        // auth.post(server+"/posts");
        
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
        
            return push(dbRef(getDatabase(), `chats/${chatId.current}`), novaMensagem);
        })
        .then(() => {
        
            refs.fileInput.current!.value = '';
            if (refs.messageInput.current) {
            refs.messageInput.current.textContent! = '';
            }
        })
        .catch((error: any) => {
            console.error('Erro no upload do arquivo:', error);
            showPopup.current('Não foi possível enviar o arquivo.');
        });
    }

    function handleImageUpload(event: any) {
        const file = event.target.files[0];
        if (!file) return;
        
        const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
        const maxFileSize = 5 * 1024 * 1024;
        
        if (!allowedTypes.includes(file.type)) {
            showPopup.current("Apenas suportamos imagens JPEG, PNG, GIF e WebP.");
            return;
        }
        
        if (file.size > maxFileSize) {
            showPopup.current("A imagem não pode ser maior que 5MB.");
            return;
        }
        
        const messageText = refs.messageInput.current ? refs.messageInput.current!.textContent!.trim() : "";
        
        const imageRef = storageRef(getStorage(), `chat_images/${chatId.current}/${usuarioLogado!.uid}_${Date.now()}_${file.name}`);
        
        const progressBar = document.createElement("div");
        progressBar.style.width = "0%";
        progressBar.style.height = "4px";
        progressBar.style.backgroundColor = "#4CAF50";
        progressBar.style.position = "fixed";
        progressBar.style.top = "0";
        progressBar.style.left = "0";
        progressBar.style.zIndex = "1000";
        document.body.appendChild(progressBar);
        
        uploadBytesResumable(imageRef, file)
        .then(snapshot => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            progressBar.style.width = `${progress}%`;
            return getDownloadURL(snapshot.ref);
        })
        .then(imageUrl => {
            const novaMensagem = {
                remetente: usuarioLogado!.uid,
                texto: messageText,
                imagem: imageUrl,
                timestamp: Date.now(),
                lida: false
            };
        
            return push(dbRef(getDatabase(),`chats/${chatId.current}`), novaMensagem);
        })
        .then(() => {
            event.target.value = "";
            if (refs.messageInput.current) {
                refs.messageInput.current!.textContent! = "";
            }
            document.body.removeChild(progressBar);
            marcarMensagensComoLidas();
        })
        .catch(error => {
            console.error("Erro no upload da imagem:", error);
            showPopup.current("Não foi possível enviar a imagem.");
            if (document.body.contains(progressBar)) {
                document.body.removeChild(progressBar);
            }
        });
    }

    function handleVideoUpload(event: any) {
        const file = event.target.files[0];
        if (!file) return;
        
        const maxFileSize = 20 * 1024 * 1024;
        const allowedTypes = ["video/mp4", "video/webm", "video/ogg"];
        
        if (!allowedTypes.includes(file.type)) {
            showPopup.current("Apenas suportamos vídeos MP4, WebM ou OGG.");
            return;
        }
        
        if (file.size > maxFileSize) {
            showPopup.current("O tamanho do vídeo não pode ser maior que 20MB.");
            return;
        }
        
        const messageText = refs.messageInput.current ? refs.messageInput.current!.textContent!.trim() : "";
        
        const videoRef = storageRef(getStorage(), `chat_videos/${chatId.current}/${usuarioLogado!.uid}_${Date.now()}_${file.name}`);
        
        const progressBar = document.createElement("div");
        progressBar.style.width = "0%";
        progressBar.style.height = "4px";
        progressBar.style.backgroundColor = "#4CAF50";
        progressBar.style.position = "fixed";
        progressBar.style.top = "0";
        progressBar.style.left = "0";
        progressBar.style.zIndex = "1000";
        document.body.appendChild(progressBar);
        
        uploadBytesResumable(videoRef, file).then(snapshot => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            progressBar.style.width = `${progress}%`;
            return getDownloadURL(snapshot.ref);
        })
        .then((videoUrl: any) => {
            const novaMensagem = {
                remetente: usuarioLogado!.uid,
                texto: messageText,
                video: videoUrl,
                timestamp: Date.now(),
                lida: false
            };
        
            return push(dbRef(getDatabase(),`chats/${chatId.current}`), novaMensagem);
        })
        .then(() => {
            event.target.value = "";
            if (refs.messageInput.current) {
                refs.messageInput.current.textContent! = "";
            }
            document.body.removeChild(progressBar);
                marcarMensagensComoLidas();
            })
            .catch(error => {
            console.error("Erro no upload do vídeo:", error);
            showPopup.current("Não foi possível enviar o vídeo.");
            if (document.body.contains(progressBar)) {
                document.body.removeChild(progressBar);
            }
        });
    }

    const scrollToBottom = useCallback(() => {
        const chatMessagesContainer = document.getElementById("chat-messages");
        if (chatMessagesContainer) {
            chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
        }
    },[]);

    const onMessageInput = () => {
        setMessageInputValue(refs.messageInput.current!.innerText);
    }

    useEffect(()=>{
        scrollToBottom();
    },[messages, messageInputValue]);

    useEffect(()=>{
        if (!usuarioLogado) return;

        chatId.current = Number(location.pathname.split("/")[2]);
        socket.send("/chat", { operation: "get_messages", id: chatId.current }).then(result=>{
            if (result.result){
                const users = JSON.parse(result.chat.users);
                const uids = Object.keys(users);
                const otherUid = usuarioLogado!.uid == uids[0] ? uids[1] : uids[0];
                const otherUser = {...users[otherUid], uid: otherUid };
                otherUser.logo = otherUser.logo ? getDriveURL(otherUser.logo) : avatar_src;
                setOtherUser(otherUser);
                myUser.current = {...users[usuarioLogado.uid], uid: usuarioLogado.uid }
                
                chatId.current = result.chat.id;

                const new_messages: messageInterface[] = [];

                for (const new_message of result.messages){
                    new_message.date = new Date(new_message.time * 1000);

                    const previous_message_date = new_messages.length > 0 ? new_messages[new_messages.length-1].date : null;

                    if (!previous_message_date || isDifferentDay(new_message.date, previous_message_date)){
                        const id = generate_id();
                        new_messages.push({ isTime: true, date: new_message.date, id, time: new_message.time });
                    }
                    
                    new_messages.push({ ...new_message, mode: Number(new_message.visualized > 0) + 1, isTime: false, time: undefined });
                };

                setMessages(new_messages);
        
                const chatBox = document.getElementById("chat-box")!;

                chatBox.style.display = "flex";

                marcarMensagensComoLidas();

                monitorarDigitacao();
            } else {
                navigate("/chats");
            }
        });
    },[location.pathname, usuarioLogado]);

    useEffect(()=>{
        socket.on("message", (message: any)=>{
            const id = generate_id();
            const time = Math.floor(id / 1000000);

            setMessages(messages=>{
                const new_messages = [...messages];

                const new_message_date = new Date(message.time * 1000);


                if (messages.length == 0 || isDifferentDay(messages[messages.length-1].date, new_message_date)){
                    const id = generate_id();
                    new_messages.push({ isTime: true, date: new_message_date, id, time });
                }
                new_messages.push({ date: new_message_date, text: message.text, mode: 2, uid: otherUser!.uid, id, time, isTime: false });

                return new_messages;
            });
        })
    },[otherUser]);

    return <div id="chat-box" style={{display: "none"}}>
        <div id="user-info">{ otherUser ? <>
                <img src={otherUser!.logo} id="user-logo"></img>
                <div id="user-name">{otherUser.name}</div>
            </>
        : <></>}</div>
        <div id="chat-messages">{messages.map((message)=>{
            const duracaoFormatada = message.audio
                ? `${String(Math.floor(message.audio.duracao / 60)).padStart(2, "0")}:${String(message.audio.duracao % 60).padStart(2, "0")}`
                : "";

            return message.isTime ? <div className="message-time" key={message.id}>{formatTimeBetweenMessages(message.date)}</div> 
            : <div className={"message-item "+(message.uid == usuarioLogado!.uid ? "me" : "you")} style={{ display: "flex", alignItems: "center", margin: "10px 0"}} key={message.id}>
                <div className="message-bubble">
                    {message.imagem && (
                        <div style={{ margin: "5px 0" }}>
                        <img
                            src={message.imagem}
                            style={{ maxWidth: "250px", maxHeight: "250px", borderRadius: "10px", cursor: "pointer" }}
                            onClick={() => abrirImagemModal(message.imagem!)}
                        />
                        </div>
                    )}

                    {message.video && (
                        <div style={{ margin: "5px 0" }}>
                        <video
                            src={message.video}
                            controls
                            style={{ maxWidth: "250px", maxHeight: "250px", borderRadius: "10px" }}
                        />
                        </div>
                    )}

                    {message.audio && (
                        <div
                        style={{
                            margin: "5px 0",
                            display: "flex",
                            alignItems: "center",
                            backgroundColor: "#1b5c2438",
                            borderRadius: "10px",
                            padding: "8px",
                        }}
                        >
                        <audio id={`audio-${message.id}`} src={message.audio.url} preload="auto" />
                        <button
                            onClick={() => togglePlayPause(`audio-${message.id}`, `play-btn-${message.id}`)}
                            id={`play-btn-${message.id}`}
                            style={{ background: "none", border: "none", fontSize: "20px", color: "green", cursor: "pointer" }}
                        >
                            <i className="fa-solid fa-play" />
                        </button>
                        <div
                            style={{
                            flexGrow: 1,
                            height: "4px",
                            backgroundColor: "#e0e0e0",
                            borderRadius: "2px",
                            margin: "0 10px",
                            cursor: "pointer",
                            }}
                            onClick={(e) => seekAudio(`audio-${message.id}`, e.currentTarget)}
                        >
                            <div style={{ height: "100%", width: "0%", backgroundColor: "#248232" }} />
                        </div>
                        <div style={{ fontSize: "12px", color: "white" }}>{duracaoFormatada}</div>
                        </div>
                    )}

                    {message.arquivo && (
                        <div
                        style={{
                            margin: "5px 0",
                            display: "flex",
                            alignItems: "center",
                            backgroundColor: "#1b5c2438",
                            borderRadius: "10px",
                            padding: "8px",
                            cursor: "pointer",
                        }}
                        >
                        <div style={{ marginRight: "10px", fontSize: "24px" }}>
                            {getFileIcon(message.arquivo.tipo)}
                        </div>
                        <div>
                            <strong>{message.arquivo.nome}</strong>
                            <div style={{ fontSize: "12px", color: "white" }}>{formatFileSize(message.arquivo.tamanho || 0)}</div>
                        </div>
                        <a
                            href={message.arquivo.url}
                            target="_blank"
                            download={message.arquivo.nome}
                            style={{ marginLeft: "auto", color: "white", textDecoration: "none" }}
                        >
                            <i className="fa-solid fa-download" /> Baixar
                        </a>
                        </div>
                    )}

                    {message.text && <div className="message-text">{message.text}</div>}
                    <div className="message-bottom">
                        <div style={{ textAlign: "right", fontSize: "small" }}>{formatMessageTime(message.date)}</div>
                        {message.uid == usuarioLogado!.uid ? <i className={"message-check fa-solid "+(["", "fa-check", "fa-check-double green"][message.mode!])}></i> :  <></>}
                    </div>
                </div>
            </div>
        })}</div>
        <div id="typingIndicatorContainer" style={{ display: 'none' }}></div>
        <div id="chat-input" className={messages.length > 0 ? "loaded" : ""}>
            <input
                type="file"
                ref={refs.fileInput}
                id="fileUpload"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar,image/*,video/*"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
            />
            <div onInput={onMessageInput} onKeyDown={onMessageInputKeyDown} onBlur={onMessageInputBlur} contentEditable={true} ref={refs.messageInput} className="message-input"></div>
            {(messageInputValue == "" || messageInputValue=="\n") && <div className="message-input is-empty">Digite sua mensagem...</div>}
            <i onClick={enviarMensagem} className={"fa-solid fa-paper-plane send-item" + (messageInputValue.trim()=="" ? " disabled": "")} aria-hidden="true"></i>
            <i onClick={()=>refs.fileInput.current!.click()} className="fa-solid fa-paperclip send-item" aria-hidden="true"></i>
            <i onClick={iniciarGravacaoAudio} id="audio-record-btn" title="Gravar mensagem voz" className={"fa-solid  attachment-btn send-item " + ( isRecording ? "fa-stop recording" : "fa-microphone" ) }></i>
        </div>
    </div>
};

export default memo(Messages);
