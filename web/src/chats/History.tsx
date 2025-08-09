import { useEffect, type RefObject, memo } from "react";
import { formatMessageTime, getDriveURL } from "../Functions";
import { getDatabase, ref as dbRef, query as queryDb, get, onValue } from "firebase/database"
import avatar_src from "../assets/static/avatar.png";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useGlobal } from "../Global";
import { useLocation, useNavigate } from "react-router-dom";

function History({chatId}:{chatId: RefObject<number>}){
    const { server, socket, db, mobile, usuarioLogado, refs: { respa } } = useGlobal();
    const navigate = useNavigate();
    const location = useLocation();
    const [ chats, setChats]

    const atualizarFriendSelect = () => {
        if (!usuarioLogado) return;
        
        const friendList = document.getElementById("friendList");
        if (!friendList) {
            console.error("Elemento friendList não encontrado");
            return;
        }
        friendList.innerHTML = "";
        socket.send("/chats",{}).then(result=>{
            if (result.result){                        
                const chats = result.results;

                setChats(chats.map(chat=>{ return { name: chat.name, logo: getDriveURL(chat.logo) || avatar_src, id: chat.id }}));

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
    
    function atualizarbadge(uidAmigo: string, badgeId: string) {

        onValue(dbRef(getDatabase(),`chats/${chatId.current}`), (snapshot: any) => {
            let totalNaoLidas = 0;

            snapshot.forEach((messageSnap: any) => {
                const mensagem = messageSnap.val();
                if (mensagem.remetente === uidAmigo && mensagem.lida === false) {
                    totalNaoLidas++;
                }
            });

            const badge = document.getElementById(badgeId);
            if (badge) {
                if (totalNaoLidas > 0) {
                    badge.textContent = totalNaoLidas > 99 ? "99+" : String(totalNaoLidas);
                    badge.style.display = "inline-block";
                } else {
                    badge.style.display = "none";
                }
            }
        });
    }

    function selecionarChat(uidAmigo: any) {
        const NewChatId = [usuarioLogado!.uid, uidAmigo].sort().join("_");
        navigate("/chat?id=" + NewChatId);
    }

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
        <div id="friendList"></div>
    </section>
}

export default memo(History);