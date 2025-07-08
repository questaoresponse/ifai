import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { atualizarNotificacoesChat } from "./Functions";
import { getAuth } from "firebase/auth";
import "./Header.css";
import { useGlobal } from "./Global";
import { ref as dbRef, get, getDatabase, onValue, remove, set } from "firebase/database";
import avatar_src from "./assets/static/avatar.png";
import logo_src from "./assets/static/ifai2.png";

interface friendsInterface{
    nome: string,
    fotoPerfil: string,
    id: string
}

function Header(){
    const { refs, mobile, usuarioLogado, setNavigate, logout } = useGlobal();

    const navigate = useNavigate();
    const location = useLocation();

    const [ friends, setFriends ] = useState<friendsInterface[]>([]);
    const [ alunos, setAlunos ] = useState<any[] | null>(null);

    function carregarAmigos() {   
        get(dbRef(getDatabase(),`friends/${usuarioLogado!.uid}`)).then((snapshot) => {
            const friends: any = [];
            snapshot.forEach((childSnapshot) => {
                const uidAmigo = childSnapshot.key;
                get(dbRef(getDatabase(), "usuarios/" + uidAmigo)).then((snap) => {
                    const userAmigo = snap.val();
                    friends.push(userAmigo);
                });
            });
            setFriends(friends);
        });
    }

    const buscarAlunos = () => {
        if (!usuarioLogado) {
            navigate("/login");
            return;
        }
    
        const termo = (document.getElementById("searchInput")! as any).value.toLowerCase().trim();
    
        if (termo === "") {
            setAlunos(null);
            return;
        }
    
        get(dbRef(getDatabase(), "usuarios")).then(async (snapshot) => {
            var snapshotValue: {[key: string]: any} = snapshot.val() || {};

            const alunos: any[] = [];
            for (const uid in snapshotValue){
                const user = snapshotValue[uid];
                var mode = "";
        
                if ( uid !== usuarioLogado!.uid && user.nome.toLowerCase().includes(termo) ) {
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
                    alunos.push({ fotoPerfil: user.fotoPerfil ? user.fotoPerfil : avatar_src, nome: user.nome, mode, id: uid });
                }
            }
            setAlunos(alunos);
            // "Nenhum aluno encontrado."
        });
    }

    function rejeitarPedido(uidSolicitante: any) {
        if (!usuarioLogado) return;
        remove(dbRef(getDatabase(),`friendRequests/${usuarioLogado!.uid}/${uidSolicitante}`)).then(() => {
            carregarPedidos();
            carregarAmigos();
        });
    }

    function enviarPedido(uidDestino:any) {
        if (!usuarioLogado) return;
        get(dbRef(getDatabase(),`friendRequests/${uidDestino}/${usuarioLogado!.uid}`)).then((snapshot:any) => {
            if (snapshot.exists()) {
                refs.respa.current!.classList.add("erro");
                refs.respa.current!.classList.remove("hidden");
                refs.respa.current!.innerText = "Pedido já enviado.";
            } else {
                set(dbRef(getDatabase(), `friendRequests/${uidDestino}/${usuarioLogado!.uid}`), true).then(() => {
                    refs.respa.current!.classList.add("sucesso");
                    refs.respa.current!.classList.remove("hidden");
                    refs.respa.current!.innerText = "Pedido enviado!";
                    setTimeout(function() {
                        refs.respa.current!.classList.add("hidden");
                        refs.respa.current!.classList.remove("sucesso");
                        refs.respa.current!.innerText = "";
                    }, 3000);

                    const btn = document.querySelector(
                    `button[data-uid="${uidDestino}"]`,
                    ) as any;
                    if (btn) {
                    btn.innerText = "Retirar solicitação";
                    btn.onclick = () => retirarPedido(uidDestino);
                    }
                    carregarPedidos();
                });
            }
        });
    }

    function retirarPedido(uidDestino: any) {
        if (!usuarioLogado) return;
        remove(dbRef(getDatabase(),`friendRequests/${uidDestino}/${usuarioLogado!.uid}`)).then(() => {
            const btn = document.querySelector(`button[data-uid="${uidDestino}"]`) as any;
            if (btn) {
                btn.innerText = "Adicionar";
                btn.onclick = () => enviarPedido(uidDestino);
            }
            carregarPedidos();
        });
    }

    function aceitarPedido(uidSolicitante: any, div: any = null) {
        if (!usuarioLogado) return;
        set(dbRef(getDatabase(),`friends/${usuarioLogado!.uid}/${uidSolicitante}`), true);
        set(dbRef(getDatabase(),`friends/${uidSolicitante}/${usuarioLogado!.uid}`), true);
        remove(dbRef(getDatabase(),`friendRequests/${usuarioLogado!.uid}/${uidSolicitante}`)).then(() => {
            carregarPedidos();
            carregarAmigos();
            if (div) {
                div.innerHTML = `<strong>${div.querySelector("strong").textContent}</strong> <span><b>(Amigos)</b></span>`;
            }
        });
    }

    function carregarPedidos() {
        if (!usuarioLogado) return;
        const pedidosContainer = document.getElementById("friendRequests");

        if (!pedidosContainer) {
            console.error("Elemento friendRequests não encontrado");
            return;
        }

        onValue(dbRef(getDatabase(),`friendRequests/${usuarioLogado!.uid}`), (snapshot: any) => {
        pedidosContainer.innerHTML = "";

        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot: any) => {
            const uidSolicitante = childSnapshot.key;

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
                    avatar_src;
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
                    btnAceitar.onclick = () => aceitarPedido(uidSolicitante, div);

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

    function removerAmigo(uidAmigo: string) {
            if (!usuarioLogado) return;
            remove(dbRef(getDatabase(),`friends/${usuarioLogado.uid}/${uidAmigo}`));
            remove(dbRef(getDatabase(),`friends/${uidAmigo}/${usuarioLogado.uid}`)).then(() => {
                carregarAmigos();
            });
    }

    useEffect(()=>{
        window.navigate = navigate;
        setNavigate((location: any)=>navigate(location));

    },[]);

    useEffect(()=>{
        if (usuarioLogado) {
            atualizarNotificacoesChat();

            const sidebar = document.getElementById('sidebar') as any;
            const toggleButton = document.getElementById('toggleSidebar') as any;
            const mainContent = document.querySelector('body') as any;

            toggleButton.addEventListener('click', function() {

                sidebar.classList.toggle('collapsed');
                const btnTexts = document.querySelectorAll('#sidebar .btn-text');
                const buscarDiv = document.getElementById('buscar');

                if (sidebar.classList.contains('collapsed')) {

                    sidebar.style.width = '50px';
                    toggleButton.style.left = '60px';
                    mainContent.style.marginLeft = '60px';
                    btnTexts.forEach((el: any) => el.style.display = 'none');
                    if (buscarDiv) {
                        buscarDiv.style.display = 'none';
                    }
                } else {

                    sidebar.style.width = '250px';
                    toggleButton.style.left = '260px';
                    mainContent.style.marginLeft = '260px';
                    btnTexts.forEach((el: any) => el.style.display = 'inline');
                    if (buscarDiv) {
                        buscarDiv.style.display = 'flex';
                    }
                }
            });
            
            document.addEventListener("DOMContentLoaded", function() {
                setTimeout(atualizarNotificacoesChat, 2000); 
            });
            
            document.addEventListener("DOMContentLoaded", function(){
                const all = document.querySelector('body');
                all!.style.marginLeft = '60px';
            });
        }
    }, [usuarioLogado]);

    return usuarioLogado ? <>
        <aside id="sidebar" className="collapsed">
            <div id="sidebar-content" style={{ overflowY: "auto", flexGrow: 1 }}>
            <div id="buscar" style={{ display: "none" }}>
                <input type="text" id="searchInput" placeholder="Pesquisar aluno"/>
                <button onClick={buscarAlunos}>
                <i className="fa-solid fa-magnifying-glass" aria-hidden="true" style={{ color: "#9ecc9e" }}></i>
                </button>
            </div>
            <br />
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
            {friends.map((friend, index: number)=>{
                    return <div className="friend-item" style={{ display: "flex", alignItems: "center", marginBottom: "10px "}} key={index}>
                        <img src={friend.fotoPerfil} alt={"Foto de " + friend.nome} style={{ width: "40px", height: "40px", borderRadius: "50%", marginRight: "10px "}}></img>
                        <strong>{friend.nome}</strong>
                        <button id="go-to-friend-perfil" onClick={()=>navigate(`/perfil?id=${friend.id}`)}>Ver Perfil</button>
                        <button id="remove-friend" onClick={()=>removerAmigo(friend.id)}>Remover</button>
                    </div>
            })}</div>

            <nav id="mainnav">
                {!mobile ? <div className="header_logo">
                    <Link to="/"><img src={logo_src} width="40px" alt="Logo" /></Link>
                </div> : <></>}

                <Link to="/" className={"defbtn" + (location.pathname === "/" ? " selected" : "")}>
                    <i className="fa-solid fa-house"></i>
                </Link>

                <Link to="/search" className={"defbtn" + (location.pathname === "/search" ? " selected" : "")}>
                    <i className="fa-solid fa-magnifying-glass" aria-hidden="true" style={{ color: "#9ecc9e" }}></i>
                </Link>

                <Link to="/amigos" className={"defbtn" + (location.pathname === "/amigos" ? " selected" : "")}>
                    <i className="fa-solid fa-user-group"></i>
                </Link>

                { !mobile ? <Link to="/chats" className={"defbtn" + (location.pathname === "/chats" ? " selected" : "")} id="chatButton">
                    <i className="fa-solid fa-comment-dots"></i>
                    <span id="chatNotification"></span>
                </Link> : <></>}

                <Link to="/perfil"className={"defbtn" + (location.pathname === "/perfil" ? " selected" : "")}>
                    <i className="fas fa-user" aria-hidden="true"></i>
                </Link>
                <Link to="/ferramentas" className={"defbtn" + (["/ferramentas", "/flashcards", "/add-posts"].includes(location.pathname) ? " selected" : "")}>
                    <i className="fa-solid fa-plus"></i>
                </Link>
            </nav>
            </div>

        </aside>
        <button id="toggleSidebar">☰</button>
    </> : <></>
}
export default Header;