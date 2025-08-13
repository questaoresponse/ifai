import { useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useGlobal } from "../Global";
import Alert from "../Alert";
import Messages from "./Messages";
import History from "./History";
import "./Chats.scss";
import "../Conversations.scss";

function Chats(){
    const { mobile } = useGlobal();
    const location = useLocation();

    const showPopup = useRef<any>(null);

    return <div id="chats-page" className="page">
        {/* <div className="header_logo">
            <img src={logo_src} width="150px" alt="Logo" />
            <div className="vl"></div>
            <h1>Conversas</h1>
        </div> */}

        <div className="chatdiv">
            <section id="history" style={{display: mobile ? location.pathname === "/chats" ? "block" : "none": "block"}}>
                {!mobile || (mobile && location.pathname  == "/chats") ? <History></History> : <></>}
            </section>

            <section id="chat" style={{display: mobile ? location.pathname === "/chats" ? "none" : "block": "block"}}>{ 
                location.pathname.startsWith("/chat/") ? <Messages showPopup={showPopup}></Messages> :
                <div className="chat-no-messages">
                    <div>Envie mensagens para seus amigos</div>
                    <div>Encontre novos usuários em <Link to={"/amigos?page=2"} style={{textDecoration: "none"}}>Pesquisar usuários</Link></div>
                </div>
            }</section>
        </div>
        <Alert showPopup={showPopup}></Alert>
    </div>
}

export default Chats;