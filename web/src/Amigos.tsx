import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getDriveURL } from "./Functions";
import avatar_src from "./assets/static/avatar.png";
import { useGlobal } from "./Global";
import "./Amigos.scss";

declare global {
  interface Window {
    usuarioLogado: any,
    typingTimeout: any
  }
}

enum Request {
    UNSOLICITED = 2,         // Without request
    SENDED_REQUEST = 3,      // Request sended by me
    RECEIVED_REQUEST = 4,    // Request for me
    FRIENDS = 5              // Friends
}

interface friendInterface{
    name: string,
    logo: string,
    uid: string,
    mode: Request
}

function Amigos(){
    const { socket, usuarioLogado } = useGlobal();

    const navigate = useNavigate();

    const [ friends, setFriends ] = useState<friendInterface[]>([]);
    const [ senders, setSenders ] = useState<friendInterface[]>([]);
    const [ currentPage, setCurrentPage ] = useState<number>(0);
    const [ users, setUsers ] = useState<friendInterface[] | null>(null);
    const searchUsersInfo = useRef<{ timeout: any, time: number }>({ timeout: null, time: 0 });
    const searchFriendsInfo = useRef<{ timeout: any, time: number }>({ timeout: null, time: 0 });

    const refs = {
        searchFriends: useRef<HTMLInputElement>(null),
        searchUsers: useRef<HTMLInputElement>(null),
    }
    
    const loadFriends = () => {
        socket.send("/friends", { operation: "get" }).then(result=>{
            if (result.result){
                const friends_uids: any = {};
                var updated_users: any[] = [];
                var users_changed = false;

                setFriends(result.results.map((friend: friendInterface)=>{
                    friends_uids[friend.uid] = true;

                    return {...friend, logo: friend.logo ? getDriveURL(friend.logo) : avatar_src };
                    
                }).sort((a: any, b: any) => a.name.localeCompare(b.name)));

                for (const user of [...(users || [])]){
                    if (user.uid in friends_uids){
                        user.mode = Request.FRIENDS;
                        users_changed = true;
                    }
                    updated_users.push(user)
                }

                if (users_changed){
                    setUsers(updated_users.sort((a, b) => a.name.localeCompare(b.name)));
                }
            }
        });
    }
    
    const loadSenders = () => {
        socket.send("/friends", { operation: "get_senders" }).then(result=>{
            if (result.result){
                const senders_uids: any = {};
                var updated_friends: any[] = [];
                var friends_changed = false;

                setSenders(result.results.map((sender: friendInterface)=>{
                    senders_uids[sender.uid] = true;

                    return {...sender, logo: sender.logo ? getDriveURL(sender.logo) : avatar_src };
                    
                }).sort((a: any, b: any) => a.name.localeCompare(b.name)));

                for (const user of [...(users || [])]){
                    if (user.uid in senders_uids){
                        user.mode = Request.RECEIVED_REQUEST;
                        friends_changed = true;
                    }
                    updated_friends.push(user)
                }

                if (friends_changed){
                    setFriends(updated_friends.sort((a, b) => a.name.localeCompare(b.name)));
                }
            }
        });
    }

    const searchFriends = async () => {
        if (!usuarioLogado) return;

        if (Date.now() - searchFriendsInfo.current.time < 300){
            clearTimeout(searchFriendsInfo.current.timeout);
            searchFriendsInfo.current.time = Date.now();
        }

        searchFriendsInfo.current = { timeout: setTimeout(()=>{
            const termo = refs.searchFriends.current!.value.toLowerCase().trim();
    
            if (termo === "") {
                loadFriends();
                return;
            }

            socket.send("/friends", { operation: "search_friends", term: termo }).then(async result=>{
                const friends: any[] = [];
                for (const user of result.results){
                    
                    // modes:
                    // 1: amigos
                    // 0: sended_request
                    // -1 not_requested

                    const [ uid1, mode_number ] = user.friend_info ? JSON.parse(user.friend_info) : [ "", -1];
                    const uid = user.uid;
                    if ( uid != usuarioLogado.uid ){
                        var mode;
                        if (mode_number == -1){
                            mode = Request.UNSOLICITED;
                        } else {
                            mode = mode_number == 1 ? Request.FRIENDS : uid1 == usuarioLogado!.uid ? Request.SENDED_REQUEST : Request.RECEIVED_REQUEST;
                        }

                        friends.push({ logo: user.logo ? getDriveURL(user.logo) : avatar_src, name: user.name, mode, uid });
                    }
                }
                setFriends(friends.sort((a, b) => a.name.localeCompare(b.name)));
            });
        },300), time: Date.now() };
    }

    const searchUsers = () => {
        if (!usuarioLogado) {
            navigate("/login");
            return;
        }
    
        if (Date.now() - searchUsersInfo.current.time < 300){
            clearTimeout(searchUsersInfo.current.timeout);
            searchUsersInfo.current.time = Date.now();
        }

        searchUsersInfo.current = { timeout: setTimeout(()=>{
            const termo = refs.searchUsers.current!.value.toLowerCase().trim();
    
            if (termo === "") {
                setUsers(null);
                return;
            }

            socket.send("/friends", { operation: "search_users", term: termo }).then(async result=>{
                const users: any[] = [];
                for (const user of result.results){
                    const [ uid1, mode_number ] = user.friend_info ? JSON.parse(user.friend_info) : [ "", -1];
                    const uid = user.uid;
                    if ( uid != usuarioLogado.uid ){
                        var mode;
                        if (mode_number == -1){
                            mode = Request.UNSOLICITED;
                        } else {
                            mode = mode_number == 1 ? Request.FRIENDS : uid1 == usuarioLogado!.uid ? Request.SENDED_REQUEST : Request.RECEIVED_REQUEST;
                        }

                        users.push({ logo: user.logo ? getDriveURL(user.logo) : avatar_src, name: user.name, mode, uid });
                    }
                }
                setUsers(users.sort((a, b) => a.name.localeCompare(b.name)));
            });
        },300), time: Date.now() };
    }

    function removeFriend(userUid: string) {
        if (!usuarioLogado) return;
        socket.send("/friends", { operation: "remove_friend", uid_to_remove_friend: userUid }).then(result=>{
            if (result.result){
                setFriends(friends=>[...friends.filter(friend=>userUid!=friend.uid).sort((a, b) => a.name.localeCompare(b.name))]);
                setUsers(users=>[...(users || []).map(user=>{ return {...user, mode: userUid == user.uid ? Request.UNSOLICITED : user.mode }}).sort((a, b) => a.name.localeCompare(b.name))]);
            }
        });
    }

    function sendRequest(userUid: any) {
        if (!usuarioLogado) return;
        if (userUid == "") return;
        socket.send("/friends", { operation: "send_request", uid_to_send_request:  userUid }).then(result=>{
            if (result.result){
                setSenders(senders=>[...senders.map(sender=>{ return {...sender, mode: userUid == sender.uid ? Request.SENDED_REQUEST : sender.mode }}).sort((a, b) => a.name.localeCompare(b.name))]);
                setUsers(users=>[...(users || []).map(user=>{ return {...user, mode: userUid == user.uid ? Request.SENDED_REQUEST : user.mode }}).sort((a, b) => a.name.localeCompare(b.name))]);
            } else {
                setUsers(users=>[...(users || []).map(user=>{ return {...user, mode: userUid == user.uid ? result.mode == 1 ? Request.FRIENDS : Request.RECEIVED_REQUEST : user.mode }}).sort((a, b) => a.name.localeCompare(b.name))]);
            }
        });
    }

    function removeSendRequest(userUid: any) {
        if (!usuarioLogado) return;
        socket.send("/friends", { operation: "remove_send_request", uid_to_remove_send_request: userUid }).then(result=>{
            if (result.result){
                setUsers(users=>[...(users || []).map(user=>{ return {...user, mode: userUid == user.uid ? Request.UNSOLICITED : user.mode }}).sort((a, b) => a.name.localeCompare(b.name))]);
            
            } else {
                // If other user accept the request, changed to friend. Update Users and Friends lists.
                if (result.mode == 1){
                    setUsers(users=>[...(users || []).map(user=>{
                        user = {...user, mode: userUid == user.uid ? Request.FRIENDS : user.mode }
                        
                        if (userUid == user.uid){
                            setFriends(friends=>[...friends, user].sort((a, b) => a.name.localeCompare(b.name)));
                        }

                        return user; 
                    }).sort((a, b) => a.name.localeCompare(b.name))]);

                // If other user declined the request, update Users list.
                } else {
                    setUsers(users=>[...(users || []).map(user=>{ return {...user, mode: userUid == user.uid ? Request.UNSOLICITED : user.mode }}).sort((a, b) => a.name.localeCompare(b.name))]);
                }
            }
        })
    }

    function acceptRequest(userUid: string) {
        if (!usuarioLogado) return;
        socket.send("/friends", { operation: "accept_request", uid_to_accept_request: userUid }).then(result=>{
            if (result.result){
                setSenders(senders=>[...senders.filter(sender=>{
                    // If the current user of iterator is the user to accept request, remove to Requests, add to Friends and update Users lists.
                    if (sender.uid == userUid){
                        setFriends([...friends, {...sender, mode: Request.FRIENDS}].sort((a, b) => a.name.localeCompare(b.name)));
                        setUsers(users=>[...(users || []).map(user=>{ return {...user, mode: userUid == user.uid ? Request.FRIENDS : user.mode }}).sort((a, b) => a.name.localeCompare(b.name))]);
                        return false;

                    // If isn't the current user, maintain in Requests
                    } else {
                        return true;
                    }
                }).sort((a, b) => a.name.localeCompare(b.name))]);
            }
        })
    }

    function declineRequest(userUid: any) {
        if (!usuarioLogado) return;
        socket.send("/friends", { operation: "decline_request", uid_to_decline_request:  userUid }).then(result=>{
            if (result.result){
                setSenders(senders=>[...senders.filter(sender=>sender.uid != userUid)]);
                setUsers(users=>[...(users || []).map(user=>{ return {...user, mode: userUid == user.uid ? Request.UNSOLICITED : user.mode }}).sort((a, b) => a.name.localeCompare(b.name))]);
            }
        });
    }

    useEffect(()=>{
        if (currentPage == 0){
            loadFriends();
        } else if (currentPage == 1){
            loadSenders();
        }
    },[currentPage]);

    useEffect(()=>{
        const query = new URLSearchParams(location.search);
        const page = query.get("page");
        if (usuarioLogado && page && ["0","1","2"].includes(page)){
            setCurrentPage(Number(page));
        } else if (!page){
            navigate("/amigos?page=0");
        }
    },[usuarioLogado, location.search]);
    return  <>
      <main id="amigos-page" className="page">
            <div id="btns">
                <div
                    className="btn-type"
                    onClick={() => navigate("/amigos?page=0")}
                    style={{
                        color: currentPage === 0 ? "#000" : "#777",
                        borderBottom: currentPage === 0 ? "3px solid green" : "none"
                    }}
                >
                    Amigos
                </div>
                <div
                    className="btn-type"
                    onClick={() => navigate("/amigos?page=1")}
                    style={{
                        color: currentPage === 1 ? "#000" : "#777",
                        borderBottom: currentPage === 1 ? "3px solid green" : "none"
                    }}
                >
                    Pedidos
                </div>
                <div
                    className="btn-type"
                    onClick={() => navigate("/amigos?page=2")}
                    style={{
                        color: currentPage === 2 ? "#000" : "#777",
                        borderBottom: currentPage === 2 ? "3px solid green" : "none"
                    }}
                >
                    Pesquisar
                </div>
            </div>



            <div id="amigos-division"></div>
            <div id="mainlists">
                <section id="lista-amigos" style={{ display: currentPage === 0 ? "block" : "none" }}>
                    <h2>Meus Amigos</h2>
                    <div className="search-box" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input ref={refs.searchFriends} onInput={searchFriends} type="text" id="searchFriendsInput" placeholder="Pesquisar amigo" style={{ padding: "5px", flex: 1 }}></input>
                    </div>

                    <br />
                    <br />
                    <div id="friendsList" style={{ minHeight: "100px" }}>{friends.map((friend, index: number)=>{
                        return <div className="friend-item" style={{ display: "flex", alignItems: "center", marginBottom: "10px "}} key={index}>
                            <Link to={`/perfil?id=${friend.uid}`}>
                                <img src={friend.logo} alt={"Foto de " + friend.name} style={{ width: "40px", height: "40px", borderRadius: "50%", marginRight: "10px "}}></img>
                            </Link>
                            <Link className="name-friend" to={`/perfil?id=${friend.uid}`}>{friend.name}</Link>
                            <button id="remove-friend" className="friends-btn" onClick={()=>removeFriend(friend.uid)}>Remover</button>
                        </div>
                    })}</div>
                </section>
                <section id="pedidos" style={{ display: currentPage === 1 ? "block" : "none" }}>
                    <div className="fqtop" style={{ padding: "10px 0" }}>
                        <h2>Pedidos de Amizade</h2>
                    </div>
                    <div id="friendRequests" className="PA" style={{ minHeight: "50px" }}>{senders.map((friend, index: number)=>{
                        return <div className="friend-item" style={{ display: "flex", alignItems: "center", marginBottom: "10px "}} key={index}>
                            <img src={friend.logo} alt={"Foto de " + friend.name} style={{ width: "40px", height: "40px", borderRadius: "50%", marginRight: "10px "}}></img>
                            <strong>{friend.name}</strong>
                            <button
                                id="aceitar-pedido"
                                className="friends-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    acceptRequest(friend.uid);
                                }}
                            >
                                Aceitar
                            </button>
                            <button
                                id="rejeitar-pedido"
                                className="friends-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    declineRequest(friend.uid);
                                }}
                            >
                                Recusar
                            </button>

                        </div>
                    })}
                    </div>
                </section>
                <section id="search-users" style={{ display: currentPage === 2 ? "block" : "none" }}>
                    <h2>Usuários</h2>
                    <div className="search-box" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input ref={refs.searchUsers} onInput={searchUsers} placeholder="Pesquisar usuário" style={{ padding: "5px", flex: 1 }}></input>
                    </div>
                    <div id="searchResults">{users ? users.length == 0 ? <div>Nenhum usuário encontrado.</div> : users.map((user, index: number)=>{
                        return <div className="friends-item" key={index}>
                            <Link className="friends-link" to={ "/perfil?id=" + user.uid }>
                                <img src={user.logo} alt={"Foto de " + user.name}></img>
                                <strong>{user.name}</strong>
                            </Link>
                            { user.mode == Request.FRIENDS ? 
                                <span>(Amigos)</span>
                            : user.mode == Request.SENDED_REQUEST ?
                                <button className="retirar friends-btn" onClick={()=>removeSendRequest(user.uid)}>Cancelar</button>
                            : user.mode == Request.RECEIVED_REQUEST ?
                                <>
                                    <button className="aceitar friends-btn" onClick={()=>acceptRequest(user.uid)}>Aceitar</button>
                                    <button className="rejeitar friends-btn" onClick={()=>declineRequest(user.uid)}>Rejeitar</button>
                                </>
                            : <i className="fa-solid fa-user-plus" onClick={()=>sendRequest(user.uid)}></i>
                            }
                        </div>
                        }) : <></> }
                    </div>
                </section>
          </div>
      </main>
    </>
}

export default Amigos;