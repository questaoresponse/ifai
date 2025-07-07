import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {  getDatabase, ref as dbRef, get, remove, onValue, set } from "firebase/database"
import avatar_src from "./assets/static/avatar.png";
import { useGlobal } from "./Global";
import "./Amigos.scss";
import { query, collection, updateDoc, where, getDocs, startAt,  endAt, orderBy } from "firebase/firestore";
import { getDriveURL } from "./Functions";

declare global {
  interface Window {
    usuarioLogado: any,
    typingTimeout: any
  }
}

interface friendsInterface{
    nome: string,
    fotoPerfil: string,
    id: string
}

function Amigos(){
    const { db, usuarioLogado } = useGlobal();

    const navigate = useNavigate();

    const [ friends, setFriends ] = useState<friendsInterface[]>([]);
    const [ solicitantes, setSolicitantes ] = useState<any[]>([]);
    const [ currentPage, setCurrentPage ] = useState<number>(0);
    const [ alunos, setAlunos ] = useState<any[] | null>(null);

    const refs = {
        searchAlunos: useRef<HTMLInputElement>(null)
    }
    
    const carregarAmigos = () => {   
        get(dbRef(getDatabase(),`friends/${usuarioLogado!.uid}`)).then( async (snapshot) => {
            const friends: friendsInterface[] = [];
            for (const uidAmigo in snapshot.val()){
                const results = await getDocs(query(collection(db.current!, "usuarios"), where("uid", "==", uidAmigo)));
                const userAmigo = results.docs[0].data();
                friends.push({ fotoPerfil: userAmigo.fotoPerfil ? getDriveURL(userAmigo.fotoPerfil) : avatar_src, nome: userAmigo.nome, id: uidAmigo });
            };
            setFriends(friends);
        });
        onValue(dbRef(getDatabase(),`friendRequests/${usuarioLogado!.uid}`), async (snapshot) => {
    
            if (snapshot.exists()) {
                const newSolicitantes: any[] = [];
                for (const uidSolicitante in snapshot.val()){
                    const results = await getDocs(query(collection(db.current!, "usuarios"), where("uid", "==", uidSolicitante)));
                    const userAmigo = results.docs[0].data();
                    newSolicitantes.push({ ...userAmigo, fotoPerfil: getDriveURL(userAmigo.fotoPerfil) });
                }
                setSolicitantes(newSolicitantes);
            }
        });
    }

    const buscarAmigos = async () => {
        const termo = (document.getElementById("searchFriendsInput")! as any).value.toLowerCase().trim();
    
        if (termo === "") {
            carregarAmigos();
            return;
        }
        
        get(dbRef(getDatabase(),`friends/${usuarioLogado!.uid}`)).then(async (snapshot) => {
            const friends: friendsInterface[] = [];
            for (const uidAmigo in snapshot.val()){
                const response =  await new Promise((r,_)=>{
                    get(dbRef(getDatabase(), "usuarios/" + uidAmigo)).then((snap) => {
                        const userAmigo = snap.val();
                        if (userAmigo.nome.toLowerCase().includes(termo)) {
                            r({ fotoPerfil: userAmigo.fotoPerfil ? userAmigo.fotoPerfil : avatar_src, nome: userAmigo.nome, id: userAmigo.identificador });
                        }
                        r(null);
                    });
                });
                if (response) friends.push(response as friendsInterface);
            };
            setFriends(friends);
        });
    }

    function removerAmigo(uidAmigo: string) {
        if (!usuarioLogado) return;
        const userDbRef = collection(db.current!, 'usuarios');
        getDocs(query(userDbRef, where("uid", "in", [usuarioLogado!.uid, uidAmigo]))).then(results=>{
            results.forEach(result=>{
                updateDoc(result.ref, { nFriends: result.data().nFriends + 1 });
            })
        });
        remove(dbRef(getDatabase(),`friends/${usuarioLogado.uid}/${uidAmigo}`));
        remove(dbRef(getDatabase(),`friends/${uidAmigo}/${usuarioLogado.uid}`)).then(() => {
            carregarAmigos();
        });
    }

    const buscarAlunos = () => {
        if (!usuarioLogado) {
            navigate("/login");
            return;
        }
    
        const termo = refs.searchAlunos.current!.value.toLowerCase().trim();;
    
        if (termo === "") {
            setAlunos(null);
            return;
        }
    
        getDocs(query(
            collection(db.current!, "usuarios"),
            orderBy("name_lower"),
            startAt(termo),
            endAt(termo+"\uf8ff")
        )).then(async (results) => {

            const alunos: any[] = [];
            for (const aluno of results.docs){
                const user = aluno.data();
                const uid = user.uid;

                if ( uid != usuarioLogado.uid ){
                    var mode = "";
            
                    const friendSnapshot = await get(dbRef(getDatabase(), `friends/${usuarioLogado!.uid}/${uid}`));
                    if (friendSnapshot.exists()) {
                            mode = "friend";
                    } else {
                        const requestSnapshot = await get(dbRef(getDatabase(), `friendRequests/${uid}/${usuarioLogado!.uid}`));
                        if (requestSnapshot.exists()) {
                            mode = "sended_request";
                        } else {
                            const receivedRequestSnapshot = await get(dbRef(getDatabase(), `friendRequests/${usuarioLogado!.uid}/${uid}`));
                            mode = receivedRequestSnapshot.exists() ? "received_request" : "unsolicited";
                        }
                    }
                    alunos.push({ fotoPerfil: user.fotoPerfil ? getDriveURL(user.fotoPerfil) : avatar_src, nome: user.nome, mode, id: uid });
                }
            }
            setAlunos(alunos);
            // "Nenhum aluno encontrado."
        });
    }

    function rejeitarPedido(uidSolicitante: any) {
        if (!usuarioLogado) return;
        remove(dbRef(getDatabase(),`friendRequests/${usuarioLogado!.uid}/${uidSolicitante}`)).then(() => {
            carregarAmigos();
        });
    }

    function enviarPedido(uidDestino:any) {
        if (!usuarioLogado) return;
        get(dbRef(getDatabase(),`friendRequests/${uidDestino}/${usuarioLogado!.uid}`)).then((snapshot:any) => {
            if (snapshot.exists()) {
                // refs.respa.current!.classList.add("erro");
                // refs.respa.current!.classList.remove("hidden");
                // refs.respa.current!.innerText = "Pedido já enviado.";
            } else {
                set(dbRef(getDatabase(), `friendRequests/${uidDestino}/${usuarioLogado!.uid}`), true).then(() => {
                    // refs.respa.current!.classList.add("sucesso");
                    // refs.respa.current!.classList.remove("hidden");
                    // refs.respa.current!.innerText = "Pedido enviado!";
                    // setTimeout(function() {
                    //     refs.respa.current!.classList.add("hidden");
                    //     refs.respa.current!.classList.remove("sucesso");
                    //     refs.respa.current!.innerText = "";
                    // }, 3000);

                    // const btn = document.querySelector(
                    // `button[data-uid="${uidDestino}"]`,
                    // ) as any;
                    // if (btn) {
                    //     btn.innerText = "Retirar solicitação";
                    //     btn.onclick = () => retirarPedido(uidDestino);
                    // }
                    carregarAmigos();
                });
            }
        });
    }

    // function retirarPedido(uidDestino: any) {
    //     if (!usuarioLogado) return;
    //     remove(dbRef(getDatabase(),`friendRequests/${uidDestino}/${usuarioLogado!.uid}`)).then(() => {
    //         const btn = document.querySelector(`button[data-uid="${uidDestino}"]`) as any;
    //         if (btn) {
    //             btn.innerText = "Adicionar";
    //             btn.onclick = () => enviarPedido(uidDestino);
    //         }
    //     });
    // }

    function aceitarPedido(uidSolicitante: any, div: any = null) {
        if (!usuarioLogado) return;
        set(dbRef(getDatabase(),`friends/${usuarioLogado!.uid}/${uidSolicitante}`), true);
        set(dbRef(getDatabase(),`friends/${uidSolicitante}/${usuarioLogado!.uid}`), true);
        const userDbRef = collection(db.current!, 'usuarios');
        getDocs(query(userDbRef, where("uid", "in", [usuarioLogado!.uid, uidSolicitante]))).then(results=>{
            results.forEach(result=>{
                updateDoc(result.ref, { nFriends: result.data().nFriends + 1 });
            })
        });
        remove(dbRef(getDatabase(),`friendRequests/${usuarioLogado!.uid}/${uidSolicitante}`)).then(() => {
            carregarAmigos();
            if (div) {
                div.innerHTML = `<strong>${div.querySelector("strong").textContent}</strong> <span><b>(Amigos)</b></span>`;
            }
        });
    }

    useEffect(()=>{
        const query = new URLSearchParams(location.search);
        const page = query.get("page");
        if (usuarioLogado && page && ["0","1","2"].includes(page)){
            carregarAmigos();
            setCurrentPage(Number(page));
        } else if (!page){
            navigate("/amigos?page=0");
        }
    },[usuarioLogado, location.search]);
    return  <>
      <main id="amigos-page" className="page">
            <div id="btns">
                <div className="btn-type" onClick={()=>navigate("/amigos?page=0")}>amigos</div>
                <div className="btn-type" onClick={()=>navigate("/amigos?page=1")}>pedidos</div>
                <div className="btn-type" onClick={()=>navigate("/amigos?page=2")}>pesquisar</div>
            </div>
            <div id="amigos-division"></div>
            <div id="mainlists">
                <section id="lista-amigos" style={{ display: currentPage === 0 ? "block" : "none" }}>
                    <h2>Meus Amigos</h2>
                    <div className="search-box" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input type="text" id="searchFriendsInput" placeholder="Pesquisar amigo" style={{ padding: "5px", flex: 1 }}></input>
                        <button id="searchButton" onClick={buscarAmigos}>
                            <i className="fas fa-search" aria-hidden="true"></i>
                        </button>
                    </div>

                    <br />
                    <br />
                    <div id="friendsList" style={{ minHeight: "100px" }}>{friends.map((friend, index: number)=>{
                        return <div className="friend-item" style={{ display: "flex", alignItems: "center", marginBottom: "10px "}} key={index}>
                            <img src={friend.fotoPerfil} alt={"Foto de " + friend.nome} style={{ width: "40px", height: "40px", borderRadius: "50%", marginRight: "10px "}}></img>
                            <strong>{friend.nome}</strong>
                            <button id="go-to-friend-perfil" onClick={()=>navigate(`/perfil?id=${friend.id}`)}>Ver Perfil</button>
                            <button id="remove-friend" onClick={()=>removerAmigo(friend.id)}>Remover</button>
                        </div>
                    })}</div>
                </section>
                <section id="pedidos" style={{ display: currentPage === 1 ? "block" : "none" }}>
                    <div className="fqtop" style={{ padding: "10px 0" }}>
                        <h2>Pedidos de Amizade</h2>
                    </div>
                    <div id="friendRequests" className="PA" style={{ minHeight: "50px" }}>{solicitantes.map((friend, index: number)=>{
                        return <div className="friend-item" style={{ display: "flex", alignItems: "center", marginBottom: "10px "}} key={index}>
                            <img src={friend.fotoPerfil} alt={"Foto de " + friend.nome} style={{ width: "40px", height: "40px", borderRadius: "50%", marginRight: "10px "}}></img>
                            <strong>{friend.nome}</strong>
                            <button id="aceitar-pedido" onClick={()=>navigate(`/perfil?id=${friend.uid}`)}>aceitar</button>
                            <button id="rejeitar-pedido" onClick={()=>removerAmigo(friend.id)}>recusar</button>
                        </div>
                    })}
                    </div>
                </section>
                <section id="amigos" style={{ display: currentPage === 2 ? "block" : "none" }}>
                    <input ref={refs.searchAlunos} onInput={buscarAlunos}></input>
                    <div id="searchResults">{alunos ? alunos.length == 0 ? <div>Nenhum usuário encontrado.</div> : alunos.map((aluno, index: number)=>{
                        return <div className="friends-item" key={index}>
                            <Link className="friends-link" to={ "/perfil?id=" + aluno.id }>
                                <img src={aluno.fotoPerfil} alt={"Foto de " + aluno.nome}></img>
                                <strong>{aluno.nome}</strong>
                            </Link>
                            { aluno.mode == "friend" ? 
                                <span>(Amigos)</span>
                            : aluno.mode == "sended_request" ? 
                                <button className="retirar" onClick={()=>{rejeitarPedido(aluno.uid); setAlunos(alunos=>alunos!.map(alunoValue=>alunoValue.id == aluno.id ? { ...alunoValue, mode: "unsolicited" } : alunoValue))}}>cancelar</button>
                            : aluno.mode == "received_request" ?
                                <>
                                    <button className="aceitar" onClick={()=>{aceitarPedido(aluno.id); setAlunos(alunos=>alunos!.map(alunoValue=>alunoValue.id == aluno.id ? { ...alunoValue, mode: "friend" } : alunoValue))}}>aceitar</button>
                                    <button className="rejeitar"onClick={()=>rejeitarPedido(aluno.id)}>rejeitar</button>
                                </>
                            : <i className="fa-solid fa-user-plus" onClick={()=>{enviarPedido(aluno.id); setAlunos(alunos=>alunos!.map(alunoValue=>alunoValue.id == aluno.id ? { ...alunoValue, mode: "sended_request" } : alunoValue))}}></i>
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