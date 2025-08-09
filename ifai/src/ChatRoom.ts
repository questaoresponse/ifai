import setChatsApp from "./chats";
import setFriendsApp from "./friends";
import { SocketServer } from "./SocketServer";
import { ExtendedBindings, Variables } from "./types";
import setUserApp from "./user";
import setWebsocketApp from "./websocket";

export class ChatRoom {
    sockets = new Map<WebSocket, Variables>();
    state: any;
    env: ExtendedBindings;

    constructor(state: any, env: ExtendedBindings) {
            this.state = state;
            this.env = env;
    }

  fetch(request: Request) {
    if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('Expected websocket', { status: 400 });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    const variables = request.headers.get('X-Variables');
    const variablesObj = variables ? JSON.parse(variables) : null;

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
