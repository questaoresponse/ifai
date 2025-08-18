import { useEffect, memo, useState, useRef } from "react";
import { getDriveURL, formatTimeHistory } from "../Functions";
import { useGlobal } from "../Global";
import { Link, useLocation } from "react-router-dom";
import avatar_src from "../assets/static/avatar.png";

function get_chat_id(pathname: string): number | null {
    if (pathname === "/chats") return null;

    return Number(pathname.split("/")[2]);

}
interface Message {
    date: Date,
    mode: number,
    new_messages_number: number,
    text: string,
    type: number,
    uid: string,
}
interface chatsInterface {
    id: number,
    logo: string,
    name: string,
    message: Message | null

}
function History(){
    const { socket, mobile, usuarioLogado } = useGlobal();
    const location = useLocation();
    const [ chats, setChats ] = useState<chatsInterface[]>([]);
    const previousTypeLocation = useRef<"chats" | "chat" | null>(null);

    const updateChats = () => {
        if (!usuarioLogado) return;
        socket.send("/chats",{}).then(result=>{
            if (result.result){
                const chats: any[] = result.results;

                setChats(chats.map(chat=>{
                    const message = chat.last_message ? JSON.parse(chat.last_message) : null;
                    const chat_id = get_chat_id(location.pathname);
                    return {  
                        id: chat.id,
                        logo: chat.logo ? getDriveURL(chat.logo) : avatar_src,
                        name: chat.name,
                        message: message ? { date: new Date(message.time * 1000),
                            mode: Number(message.visualized > 0) + 1,
                            new_messages_number: chat.id == chat_id ? 0 : message.new_messages_number,
                            text: message.text,
                            type: message.type,
                            uid: message.uid
                        } : null 
                    }
                }));

                    // function atualizarUltimaMensagem(message: any) {

                    //     const lastMessage =
                    //         message.texto.length > 10 ?
                    //         message.texto.substring(0, 10) + "..." :
                    //         message.texto;
                    //     const lastTimestamp = formatMessageTime(new Date(message.timestamp));

                    //     const badgeId = `badge-${otherUid}`;
                    //     let badgeHTML = `<span id="${badgeId}" class="notification-badge" style="display: none;"></span>`;
        
                    //     div.innerHTML = `
                    //         <img src="${imgSrc}" class="friend-avatar">
                    //         <div class="friend-text">
                    //             <strong>${chat.name} ${badgeHTML}</strong>
                    //             <p>${lastMessage} <span>${lastTimestamp}</span></p>
                    //         </div>
                    //     `;
        
                    //     // atualizarbadge(otherUid, badgeId);


                    //     // atualizarUltimaMensagem(chat.last_message);
                    //     friendList!.appendChild(div);
                    // };
            }
        });

    }
    
    // function atualizarbadge(uidAmigo: string, badgeId: string) {

    //     onValue(dbRef(getDatabase(),`chats/${chatId.current}`), (snapshot: any) => {
    //         let totalNaoLidas = 0;

    //         snapshot.forEach((messageSnap: any) => {
    //             const mensagem = messageSnap.val();
    //             if (mensagem.remetente === uidAmigo && mensagem.lida === false) {
    //                 totalNaoLidas++;
    //             }
    //         });

    //         const badge = document.getElementById(badgeId);
    //         if (badge) {
    //             if (totalNaoLidas > 0) {
    //                 badge.textContent = totalNaoLidas > 99 ? "99+" : String(totalNaoLidas);
    //                 badge.style.display = "inline-block";
    //             } else {
    //                 badge.style.display = "none";
    //             }
    //         }
    //     });
    // }

    // function selecionarChat(uidAmigo: any) {
    //     const NewChatId = [usuarioLogado!.uid, uidAmigo].sort().join("_");
    //     navigate("/chat?id=" + NewChatId);
    // }

    useEffect(()=>{
        const newTypeLocation = location.pathname === "/chats" ? "chats" : "chat";
        // if ((mobile && newTypeLocation != previousTypeLocation.current && newTypeLocation == "chats") || !mobile){
        //     updateChats();
        // }
        if (newTypeLocation === "chats" || !previousTypeLocation.current){
            updateChats();
        }
        if (!mobile && newTypeLocation === "chat"){
            const chat_id = get_chat_id(location.pathname);
            setChats(chats=>[...chats.map(chat=>{ return {...chat, message: chat.message ? {...chat.message, new_messages_number: chat.id == chat_id ? 0 : chat.message.new_messages_number } : null }})]);
        }
        previousTypeLocation.current = newTypeLocation;
    }, [mobile, location.pathname, usuarioLogado]);

    return <>
        <div id="top-chats">
            <span className="icone" aria-hidden="true">
                <i
                className="fa-solid fa-comment-dots"
                aria-hidden="true"
                style={{ margin: '0 auto' }}
                ></i>
            </span>
            <h2 id="label-chats">Conversas</h2>
        </div>
        <div id="friendList">{chats.map((chat, index: number)=>{
            return <Link className="chat-item-link" to={`/chat/${chat.id}`} key={index}>
                <img className="chat-logo" src={chat.logo}></img>
                <div className="chat-right">
                    <div className="chat-right-top">
                        <div className="chat-name">{chat.name}</div>
                        {chat.message ? <div className="chat-message-time">{formatTimeHistory(chat.message!.date)}</div> : <></>}
                    </div>
                    {chat.message ? <div className="chat-right-bottom">
                        <div className="chat-message-text">{chat.message!.text}</div>
                        {
                            chat.message!.uid == usuarioLogado!.uid ? <i className={"chat-message-check fa-solid "+(["", "fa-check", "fa-check-double green"][chat.message!.mode])}></i>:
                            chat.message.new_messages_number > 0 ? <div className="chat-new-message-number">{chat.message.new_messages_number}</div> :
                            <></>
                        }
                    </div>: <></>}
                </div>
            </Link>
        })}</div>
    </>
}

export default memo(History);