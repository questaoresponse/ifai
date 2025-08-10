import { useRef } from "react";
import { useLocation } from "react-router-dom";
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
            {!mobile || (mobile && location.pathname  == "/chats") ? <History></History> : <></>}

            <section id="chat">
                { location.pathname.startsWith("/chat/") ? <Messages showPopup={showPopup}></Messages> : <></> }
            </section>
        </div>
        <Alert showPopup={showPopup}></Alert>
    </div>
}

export default Chats;