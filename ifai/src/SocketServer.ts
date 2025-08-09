import { ExtendedBindings, Variables } from "./types";

export class SocketServer{
    socket: WebSocket;
    env: ExtendedBindings;
    variables: Variables;
    events: { [key: string]: (data: { body: any, env: ExtendedBindings, variables: Variables }) => Promise<{ [key: string]: any }> | { [key: string]: any } } = {};

    constructor (socket: WebSocket, env: ExtendedBindings, variables: Variables){
        this.socket = socket;
        this.env = env;
        this.variables = variables;
        this.register_events();
    }
    register_events(){
        this.socket.addEventListener("open",()=>{
            console.log("aberto");
        });
        // Evento quando receber mensagem do servidor
        this.socket.addEventListener("message", async (message) => {
            const data = JSON.parse(message.data);
            const event = data.event;
            const id = data.id;
            
            if (event in this.events){
                const response = await this.events[event]({ body: data.data, env: this.env, variables: this.variables });
                this.socket.send(JSON.stringify({ event, id, response }));
            } else {
                this.socket.send(JSON.stringify({ event, id, error: true }));
            }
        });

        // Evento de erro
        this.socket.addEventListener("error", (event) => {
            console.error("Erro no WebSocket:", event);
        });
    }
    on(event: string, fn: (data: { body: any, env: ExtendedBindings, variables: Variables }) => Promise<{ [key: string]: any }> | { [key: string]: any }){
        this.events[event] = fn;
    }
}