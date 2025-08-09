import React, { useEffect, memo } from "react";
import { formatMessageTime, formatTimeBetweenMessages } from "../Functions";

interface messageInterface {
    arquivo?: {
        url: string;
        tipo: string;
        nome: string;
        tamanho: number;
    };
    audio?: {
        url: string;
        duracao: number;
    };
    date: Date;
    id: string;
    imagem?: string;
    isTime: boolean;
    remetente?: string;
    texto?: string;
    video?: string;
}

interface Props {
  messages: messageInterface[];
  scrollToBottom: () => void;
  onExcluir: (id: string, tipo: "audio" | "arquivo" | "imagem" | "video" | "texto", url?: string) => void;
}

const Messages: React.FC<Props> = ({ messages, scrollToBottom, onExcluir }) => {
    const handleExcluir = (message: messageInterface) => {
        if (message.audio) return onExcluir(message.id, "audio", message.audio.url);
        if (message.arquivo) return onExcluir(message.id, "arquivo", message.arquivo.url);
        if (message.video) return onExcluir(message.id, "video", message.video);
        if (message.imagem) return onExcluir(message.id, "imagem", message.imagem);
        return onExcluir(message.id!, "texto");
    };

    const togglePlayPause = (_: string, __: any) => {

    }

    const abrirImagemModal = (_: string) => {

    }
    
    const seekAudio = (_: string, __: any) => {

    }

    const getFileIcon = (_: string) => {
        return "";
    }

    const formatFileSize = (_: number) => {
        return "";
    }

    useEffect(()=>{
        scrollToBottom();
    },[messages]);

    return <div id="chat-messages">{messages.map((message)=>{
        const duracaoFormatada = message.audio
            ? `${String(Math.floor(message.audio.duracao / 60)).padStart(2, "0")}:${String(message.audio.duracao % 60).padStart(2, "0")}`
            : "";

        return message.isTime ? <div className="message-time">{formatTimeBetweenMessages(message.date)}</div> 
        : <div style={{ display: "flex", alignItems: "center", margin: "10px 0", justifyContent: "flex-end" }} className="message-usuario" key={message.id}>
            <div style={{ position: "relative", display: "inline-block" }}>
                <div
                    className="message-bubble"
                    style={{
                        backgroundColor: "green",
                        color: "white",
                        padding: "8px",
                        borderRadius: "15px",
                        maxWidth: "fit-content",
                    }}
                >
                <div style={{ fontWeight: "bold" }}>Você</div>

                {message.imagem && (
                    <div style={{ margin: "5px 0" }}>
                    <img
                        src={message.imagem}
                        style={{ maxWidth: "250px", maxHeight: "250px", borderRadius: "10px", cursor: "pointer" }}
                        onClick={() => abrirImagemModal(message.imagem!)}
                    />
                    </div>
                )}

                {message.video && (
                    <div style={{ margin: "5px 0" }}>
                    <video
                        src={message.video}
                        controls
                        style={{ maxWidth: "250px", maxHeight: "250px", borderRadius: "10px" }}
                    />
                    </div>
                )}

                {message.audio && (
                    <div
                    style={{
                        margin: "5px 0",
                        display: "flex",
                        alignItems: "center",
                        backgroundColor: "#1b5c2438",
                        borderRadius: "10px",
                        padding: "8px",
                    }}
                    >
                    <audio id={`audio-${message.id}`} src={message.audio.url} preload="auto" />
                    <button
                        onClick={() => togglePlayPause(`audio-${message.id}`, `play-btn-${message.id}`)}
                        id={`play-btn-${message.id}`}
                        style={{ background: "none", border: "none", fontSize: "20px", color: "green", cursor: "pointer" }}
                    >
                        <i className="fa-solid fa-play" />
                    </button>
                    <div
                        style={{
                        flexGrow: 1,
                        height: "4px",
                        backgroundColor: "#e0e0e0",
                        borderRadius: "2px",
                        margin: "0 10px",
                        cursor: "pointer",
                        }}
                        onClick={(e) => seekAudio(`audio-${message.id}`, e.currentTarget)}
                    >
                        <div style={{ height: "100%", width: "0%", backgroundColor: "#248232" }} />
                    </div>
                    <div style={{ fontSize: "12px", color: "white" }}>{duracaoFormatada}</div>
                    </div>
                )}

                {message.arquivo && (
                    <div
                    style={{
                        margin: "5px 0",
                        display: "flex",
                        alignItems: "center",
                        backgroundColor: "#1b5c2438",
                        borderRadius: "10px",
                        padding: "8px",
                        cursor: "pointer",
                    }}
                    >
                    <div style={{ marginRight: "10px", fontSize: "24px" }}>
                        {getFileIcon(message.arquivo.tipo)}
                    </div>
                    <div>
                        <strong>{message.arquivo.nome}</strong>
                        <div style={{ fontSize: "12px", color: "white" }}>{formatFileSize(message.arquivo.tamanho || 0)}</div>
                    </div>
                    <a
                        href={message.arquivo.url}
                        target="_blank"
                        download={message.arquivo.nome}
                        style={{ marginLeft: "auto", color: "white", textDecoration: "none" }}
                    >
                        <i className="fa-solid fa-download" /> Baixar
                    </a>
                    </div>
                )}

                {message.texto && <div style={{ whiteSpace: "pre-wrap" }}>{message.texto}</div>}

                <div style={{ textAlign: "right", fontSize: "small" }}>{formatMessageTime(message.date)}</div>
                </div>

                <div
                    style={{
                        cursor: "pointer",
                        fontSize: "16px",
                        padding: "3px",
                        position: "absolute",
                        right: 0,
                        bottom: "-18px",
                    }}
                    onClick={()=>handleExcluir(message)}
                >
                </div>
            </div> 
        </div>
    })}</div>
};

export default memo(Messages);
export type {
    messageInterface
}
