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

interface friendInterface{
    name: string,
    logo: string,
    uid: string,
    mode: string
}

function Amigos(){
    const { socket, usuarioLogado } = useGlobal();

    const navigate = useNavigate();

    const [ friends, setFriends ] = useState<friendInterface[]>([]);
    const [ solicitantes, setSolicitantes ] = useState<friendInterface[]>([]);
    const [ currentPage, setCurrentPage ] = useState<number>(0);
    const [ alunos, setAlunos ] = useState<friendInterface[] | null>(null);
    const searchUsersInfo = useRef<{ timeout: any, time: number }>({ timeout: null, time: 0 });
    const searchFriendsInfo = useRef<{ timeout: any, time: number }>({ timeout: null, time: 0 });

    const refs = {
        searchFriends: useRef<HTMLInputElement>(null),
        searchAlunos: useRef<HTMLInputElement>(null),
    }
    
    const carregarAmigos = () => {
        socket.send("/friends", { operation: "get" }).then(result=>{
            if (result.result){
                setFriends(result.results.map((friend: friendInterface)=>{ return {...friend, logo: friend.logo ? getDriveURL(friend.logo) : avatar_src }}))
            }
        });
        // get(dbRef(getDatabase(),`friends/${usuarioLogado!.uid}`)).then( async (snapshot) => {
        //     const friends: friendsInterface[] = [];
        //     for (const uidAmigo in snapshot.val()){
        //         const results = await getDocs(query(collection(db.current!, "usuarios"), where("uid", "==", uidAmigo)));
        //         const userAmigo = results.docs[0].data();
        //         friends.push({ fotoPerfil: userAmigo.fotoPerfil ? getDriveURL(userAmigo.fotoPerfil) : avatar_src, nome: userAmigo.nome, id: uidAmigo });
        //     };
        //     setFriends(friends);
        // });
        // onValue(dbRef(getDatabase(),`friendRequests/${usuarioLogado!.uid}`), async (snapshot) => {
    
        //     if (snapshot.exists()) {
        //         const newSolicitantes: any[] = [];
        //         for (const uidSolicitante in snapshot.val()){
        //             const results = await getDocs(query(collection(db.current!, "usuarios"), where("uid", "==", uidSolicitante)));
        //             const userAmigo = results.docs[0].data();
        //             newSolicitantes.push({ ...userAmigo, fotoPerfil: getDriveURL(userAmigo.fotoPerfil) });
        //         }
        //         setSolicitantes(newSolicitantes);
        //     }
        // });
    }
    
    const carregarRequests = () => {
        socket.send("/friends", { operation: "get_requests" }).then(result=>{
            if (result.result){
                setSolicitantes(result.results.map((friend: friendInterface)=>{ return {...friend, logo: friend.logo ? getDriveURL(friend.logo) : avatar_src }}))
            }
        });
    }

    const buscarAmigos = async () => {
        if (!usuarioLogado) return;

        if (Date.now() - searchFriendsInfo.current.time < 300){
            clearTimeout(searchFriendsInfo.current.timeout);
            searchFriendsInfo.current.time = Date.now();
        }

        searchFriendsInfo.current = { timeout: setTimeout(()=>{
            const termo = refs.searchFriends.current!.value.toLowerCase().trim();
    
            if (termo === "") {
                carregarAmigos();
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
                            mode = "unsolicited";
                        } else {
                            mode = mode_number == 1 ? "friend" : uid1 == usuarioLogado!.uid ? "sended_request" : "received_request";
                        }

                        friends.push({ logo: user.logo ? getDriveURL(user.logo) : avatar_src, name: user.name, mode, uid });
                    }
                }
                setFriends(friends);
            });
        },300), time: Date.now() };
    }

    function removerAmigo(uidAmigo: string) {
        if (!usuarioLogado) return;
        socket.send("/friends", { operation: "remove_friend", uid_to_remove_friend: uidAmigo }).then(result=>{
            if (result.result){
                setFriends(friends=>[...friends.filter(friend=>uidAmigo!=friend.uid)]);
                setAlunos(alunos=>[...(alunos || []).map(aluno=>{ return {...aluno, mode: uidAmigo == aluno.uid ? "unsolicited" : aluno.mode }})]);
            }
        });
    }

    const buscarAlunos = () => {
        if (!usuarioLogado) {
            navigate("/login");
            return;
        }
    
        if (Date.now() - searchUsersInfo.current.time < 300){
            clearTimeout(searchUsersInfo.current.timeout);
            searchUsersInfo.current.time = Date.now();
        }

        searchUsersInfo.current = { timeout: setTimeout(()=>{
            const termo = refs.searchAlunos.current!.value.toLowerCase().trim();
    
            if (termo === "") {
                setAlunos(null);
                return;
            }

            socket.send("/friends", { operation: "search_users", term: termo }).then(async result=>{
                const alunos: any[] = [];
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
                            mode = "unsolicited";
                        } else {
                            mode = mode_number == 1 ? "friend" : uid1 == usuarioLogado!.uid ? "sended_request" : "received_request";
                        }

                        alunos.push({ logo: user.logo ? getDriveURL(user.logo) : avatar_src, name: user.name, mode, uid });
                    }
                }
                setAlunos(alunos);
            });
        },300), time: Date.now() };
    }

    function enviarPedido(uidDestino:any) {
        if (!usuarioLogado) return;
        if (uidDestino == "") return;
        socket.send("/friends", { operation: "send_request", uid_to_send_request:  uidDestino }).then(result=>{
            if (result.result){
                setSolicitantes(solicitantes=>[...solicitantes.map(solicitante=>{ return {...solicitante, mode: uidDestino == solicitante.uid ? "sended_request" : solicitante.mode }})]);
                setAlunos(alunos=>[...(alunos || []).map(aluno=>{ return {...aluno, mode: uidDestino == aluno.uid ? "sended_request" : aluno.mode }})]);
            }
        });
    }

    function retirarPedido(uidDestino: any) {
        if (!usuarioLogado) return;
        socket.send("/friends", { operation: "remove_send_request", uid_to_remove_send_request: uidDestino }).then(result=>{
            if (result.result){
                setAlunos(alunos=>[...(alunos || []).map(aluno=>{ return {...aluno, mode: uidDestino == aluno.uid ? "unsolicited" : aluno.mode }})]);
            }
        })
    }

    function aceitarPedido(uidSolicitante: string) {
        if (!usuarioLogado) return;
        socket.send("/friends", { operation: "accept_request", uid_to_accept_request: uidSolicitante }).then(result=>{
            if (result.result){
                setSolicitantes(solicitantes=>[...solicitantes.filter(solicitante=>{
                    if (solicitante.uid == uidSolicitante){
                        setFriends([...friends, {...solicitante, mode: "friends"}]);
                        setAlunos(alunos=>[...(alunos || []).map(aluno=>{ return {...aluno, mode: uidSolicitante == aluno.uid ? "friends" : aluno.mode }})]);
                        return false;
                    } else {
                        return true;
                    }
                })]);
            }
        })
    }

    function rejeitarPedido(uidSolicitante: any) {
        if (!usuarioLogado) return;
        socket.send("/friends", { operation: "decline_request", uid_to_decline_request:  uidSolicitante }).then(result=>{
            if (result.result){
                setAlunos(alunos=>[...(alunos || []).map(aluno=>{ return {...aluno, mode: uidSolicitante == aluno.uid ? "unsolicited" : aluno.mode }})]);
            }
        });
    }

    useEffect(()=>{
        if (currentPage == 0){
            carregarAmigos();
        } else if (currentPage == 1){
            carregarRequests();
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
                        <input ref={refs.searchFriends} onInput={buscarAmigos} type="text" id="searchFriendsInput" placeholder="Pesquisar amigo" style={{ padding: "5px", flex: 1 }}></input>
                    </div>

                    <br />
                    <br />
                    <div id="friendsList" style={{ minHeight: "100px" }}>{friends.map((friend, index: number)=>{
                        return <div className="friend-item" style={{ display: "flex", alignItems: "center", marginBottom: "10px "}} key={index}>
                            <Link to={`/perfil?id=${friend.uid}`}>
                                <img src={friend.logo} alt={"Foto de " + friend.name} style={{ width: "40px", height: "40px", borderRadius: "50%", marginRight: "10px "}}></img>
                            </Link>
                            <Link className="name-friend" to={`/perfil?id=${friend.uid}`}>{friend.name}</Link>
                            <button id="remove-friend" onClick={()=>removerAmigo(friend.uid)}>Remover</button>
                        </div>
                    })}</div>
                </section>
                <section id="pedidos" style={{ display: currentPage === 1 ? "block" : "none" }}>
                    <div className="fqtop" style={{ padding: "10px 0" }}>
                        <h2>Pedidos de Amizade</h2>
                    </div>
                    <div id="friendRequests" className="PA" style={{ minHeight: "50px" }}>{solicitantes.map((friend, index: number)=>{
                        return <div className="friend-item" style={{ display: "flex", alignItems: "center", marginBottom: "10px "}} key={index}>
                            <img src={friend.logo} alt={"Foto de " + friend.name} style={{ width: "40px", height: "40px", borderRadius: "50%", marginRight: "10px "}}></img>
                            <strong>{friend.name}</strong>
                            <button
                                id="aceitar-pedido"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    aceitarPedido(friend.uid);
                                }}
                            >
                                Aceitar
                            </button>
                            <button
                                id="rejeitar-pedido"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    rejeitarPedido(friend.uid);
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
                        <input ref={refs.searchAlunos} onInput={buscarAlunos} placeholder="Pesquisar usuário" style={{ padding: "5px", flex: 1 }}></input>
                    </div>
                    <div id="searchResults">{alunos ? alunos.length == 0 ? <div>Nenhum usuário encontrado.</div> : alunos.map((aluno, index: number)=>{
                        return <div className="friends-item" key={index}>
                            <Link className="friends-link" to={ "/perfil?id=" + aluno.uid }>
                                <img src={aluno.logo} alt={"Foto de " + aluno.name}></img>
                                <strong>{aluno.name}</strong>
                            </Link>
                            { aluno.mode == "friend" ? 
                                <span>(Amigos)</span>
                            : aluno.mode == "sended_request" ?
                                <button className="retirar" onClick={()=>retirarPedido(aluno.uid)}>Cancelar</button>
                            : aluno.mode == "received_request" ?
                                <>
                                    <button className="aceitar" onClick={()=>aceitarPedido(aluno.uid)}>Aceitar</button>
                                    <button className="rejeitar"onClick={()=>rejeitarPedido(aluno.uid)}>Rejeitar</button>
                                </>
                            : <i className="fa-solid fa-user-plus" onClick={()=>enviarPedido(aluno.uid)}></i>
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