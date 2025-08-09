import { useEffect, memo, useState } from "react";
import { getDriveURL } from "../Functions";
import avatar_src from "../assets/static/avatar.png";
import { useGlobal } from "../Global";
import { Link } from "react-router-dom";

interface chatsInterface {
    id: string,
    logo: string,
    name: string,
    message_time: number,
    message_text: string

}
function History(){
    const { socket, mobile, usuarioLogado } = useGlobal();
    const [ chats, setChats ] = useState<chatsInterface[]>([]);

    const atualizarFriendSelect = () => {
        if (!usuarioLogado) return;
        socket.send("/chats",{}).then(result=>{
            if (result.result){    
                const chats: chatsInterface[] = result.results;

                setChats(chats.map(chat=>{ return {  id: chat.id, logo: chat.logo ? getDriveURL(chat.logo) : avatar_src, name: chat.name, message_time: chat.message_time, message_text: chat.message_text }}));

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
        if (!mobile){
            atualizarFriendSelect();
        }
    }, [mobile, usuarioLogado]);

    return <section id="history">
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
            return <Link className="chat-link" to={`/chat/${chat.id}`} key={index}>
                <div>
                    <img src={chat.logo}></img>
                    <div>{chat.name}</div>
                </div>
            </Link>
        })}</div>
    </section>
}

export default memo(History);