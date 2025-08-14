import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { atualizarNotificacoesChat } from "./Functions";
import "./Header.css";
import { useGlobal } from "./Global";
import logo_src from "./assets/static/ifai2.png";

function Header(){
    const { mobile, usuarioLogado, setNavigate } = useGlobal();

    const navigate = useNavigate();
    const location = useLocation();

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
        <aside id="header" className="collapsed">
            <div id="sidebar-content" style={{ overflowY: "auto", flexGrow: 1 }}>
            {/* <div id="buscar" style={{ display: "none" }}>
                <input type="text" id="searchInput" placeholder="Pesquisar aluno"/>
                <button onClick={buscarAlunos}>
                <i className="fa-solid fa-magnifying-glass" aria-hidden="true" style={{ color: "#9ecc9e" }}></i>
                </button>
            </div> */}
            <br />

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
                <Link to="/add-posts" className={"defbtn" + (location.pathname === "/add-posts" ? " selected" : "")}>
                    <i className="fa-solid fa-plus"></i>
                </Link>

                { !mobile ? <Link to="/chats" className={"defbtn" + (location.pathname === "/chats" || location.pathname.startsWith("/chat") ? " selected" : "")} id="chatButton">
                    <i className="fa-solid fa-comment-dots"></i>
                    <span id="chatNotification"></span>
                </Link> : <></>}

                <Link to="/perfil"className={"defbtn" + (location.pathname === "/perfil" ? " selected" : "")}>
                    <i className="fas fa-user" aria-hidden="true"></i>
                </Link>
                
                <Link to="/ferramentas" className={"defbtn" + (["/ferramentas", "/flashcards"].includes(location.pathname) ? " selected" : "")}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="bi bi-book" viewBox="0 0 16 16">
                        <path d="M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783"/>
                    </svg>
                </Link>
            </nav>
            </div>

        </aside>
        <button id="toggleSidebar">☰</button>
    </> : <></>
}
export default Header;