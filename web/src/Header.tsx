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
        <aside id="sidebar" className="collapsed">
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

                { !mobile ? <Link to="/chats" className={"defbtn" + (location.pathname === "/chats" || location.pathname.startsWith("/chat") ? " selected" : "")} id="chatButton">
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