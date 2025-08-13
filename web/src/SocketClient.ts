export class SocketClient{
    socket: WebSocket;
    events: { [key: string]: (value: { [key: string]: any }) => void } = {};
    not_awaited_events: { [key: string]: (value: { [key: string]: any }) => void } = {};

    constructor (url: string){
        this.socket = new WebSocket(url);
        this.register_events();
    }
    register_events(){
        this.socket.addEventListener("open",()=>{
            console.log("aberto");
        });
        
        // Evento quando receber mensagem do servidor
        this.socket.addEventListener("message", (message) => {
            const data = JSON.parse(message.data);
            const event = data.event;
            const response = data.response;
            const id = data.id;
            const not_awaited = data.not_awaited;
            
            if (not_awaited){
                if (event in this.not_awaited_events){
                    this.not_awaited_events[event](response);
                }
            } else if (id in this.events){
                if (data.error){
                    console.error(`event "${event}" not found`);
                } else {
                    this.events[id](response);
                }
                delete this.events[id];
            }
        });

        // Evento quando conexão fechar
        this.socket.addEventListener("close", () => {
            console.log("Conexão fechada");
        });

        // Evento de erro
        this.socket.addEventListener("error", (event) => {
            console.error("Erro no WebSocket:", event);
        });
    }
    async send(event: string, data: any){
        const id = Math.floor(Math.random() * 0x100000000);
        this.socket.send(JSON.stringify({ event, data, id }));

        var resolve: ((value: { [key: string]: any }) => void) | null;
        const promise = new Promise<{ [key: string]: any }>((r, _)=>{
            resolve = r;
        });
        
        this.events[id] = resolve!;

        return promise;
    }

    async on(event: string, fn: any){
        this.not_awaited_events[event] = fn;
    }
}