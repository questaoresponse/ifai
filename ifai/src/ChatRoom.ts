import setChatsApp from "./chats";
import setFriendsApp from "./friends";
import { SocketServer } from "./SocketServer";
import { ExtendedBindings, Variables } from "./types";
import setUserApp from "./user";
import setWebsocketApp from "./websocket";

function base64ToJson(base64: string) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    
    const decoder = new TextDecoder();
    const jsonString = decoder.decode(bytes);
    
    return JSON.parse(jsonString);
}

export class ChatRoom {
    sockets = new Map<WebSocket, Variables>();
    state: any;
    env: ExtendedBindings;

    constructor(state: any, env: ExtendedBindings) {
        this.state = state;
        this.env = env;
    }

    async fetch(request: Request) {
        if (request.method === "POST"){
            const json_str = await request.text();
            
            for (const socket of this.sockets.keys()) {
                socket.send(json_str);
            }
            return new Response('');
        }

        if (request.headers.get('Upgrade') !== 'websocket') {
            return new Response('Expected websocket', { status: 400 });
        }

        const pair = new WebSocketPair();
        const client = pair[0];
        const server = pair[1];

        const variables = request.headers.get('X-Variables');
        const variablesObj = variables ? base64ToJson(variables) : null;

        server.accept();
        
        // Armazena a conexão
        this.sockets.set(server, variablesObj);

        const socketServer = new SocketServer(server, this.env, variablesObj);
        setFriendsApp(socketServer);
        setChatsApp(socketServer);
        setUserApp(socketServer);
        setWebsocketApp(socketServer);

        server.addEventListener('close', () => {
            // Remove da lista quando desconectar
            this.sockets.delete(server);
        });

        return new Response(null, { status: 101, webSocket: client });
    }
}
