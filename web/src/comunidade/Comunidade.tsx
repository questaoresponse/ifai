import { useRef } from "react";
import Alert from "../Alert";
import Messages from "./Messages";
import "./Comunidade.scss";
import "../Conversations.scss";

function Chats(){
    const showPopup = useRef<any>(null);

    return <div id="community-page" className="page">
        <section id="chat" style={{display: "block"}}>{ 
           <Messages showPopup={showPopup}></Messages>
        }</section>
        <Alert showPopup={showPopup}></Alert>
    </div>
}

export default Chats;