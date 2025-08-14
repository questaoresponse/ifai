import { ExtendedBindings, Variables } from "./types";

interface ContextInterface {
    body: any;
    env: ExtendedBindings;
    variables: Variables;
}

function get_app_url(origin: string){
    const domain = origin.split("//")[1];
    if (domain.endsWith(".ms")){
        return "https://6v9s4f5f-5173.brs.devtunnels.ms"
    } else if (domain.includes("localhost")){
        return "http://localhost:5173";
    }
    
    return "https://ifai-phwn.onrender.com"
}

function send_to_room(c: ContextInterface, room: string, event: string, message: { [key:string]: any }){
    const req = new Request(c.variables.origin + "/ws", {
        method: "POST",
        body: JSON.stringify({ not_awaited: true, event, response: message}),
        // duplex: 'half', // necessário se tiver body e streaming
    });

    const id = c.env.CHAT_ROOM.idFromName(room);
    const obj = c.env.CHAT_ROOM.get(id);
    return obj.fetch(req);
}

function get_server_url(origin: string){
    const domain = origin.split("//")[1];
    if (domain.endsWith(".ms")){
        return "https://6v9s4f5f-5174.brs.devtunnels.ms"
    } else if (domain.includes("localhost")){
        return "http://localhost:5174";
    }
    
    return "https://ifai-phwn.onrender.com"
}

function send_to_server(origin: string, pathname: string, body: any, is_json = true){
    const server = get_server_url(origin);

    const opts: any = {
        method: 'POST',
        body 
    }
    if (is_json){
        opts.headers = {
            "Content-Type": "application/json",
        }
    }
    return fetch(server + pathname, opts);
}

export {
    get_app_url,
    get_server_url,
    send_to_room,
    send_to_server
}