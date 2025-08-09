import { Hono } from "hono";
import { HonoInterface, MyContext } from "./types";
import { BlankSchema } from "hono/types";
import { SocketServer } from "./SocketServer";

// Definindo uma interface que extende Context para incluir a propriedade `uid`


function setChatsApp(app: SocketServer){
app.on("/chats", async (c) => {
    const { variables, body } = c;
    const uid = variables.user.uid;
    const results = await c.env.DB.prepare("SELECT u.*, c.uid AS id FROM users u INNER JOIN chats c ON ((u.uid = chats.uid1 OR u.uid = chats.uid2) AND (? = chats.uid1 OR ? = chats.uid2)) WHERE u.uid!=?")
        .bind(uid, uid, uid)
        .all()
    return { result: true, results: results.results }
    
});
app.on("/chat", async (c) => {
    const { variables, body } = c;
    const uid = variables.user.uid;
    const operation = body.operation;
    try {
    switch (operation){
        case "create_chat":
            var user_to_create_chat = body.id;

            var results = await c.env.DB.prepare("INSERT INTO chats(uid1,uid2,id) VALUES(?,?,?)")
                .bind(uid, user_to_create_chat, chat_id)
                .all()
        case "get_messages":
            var chat_id = body.id;
            var results = await c.env.DB.prepare(`SELECT chats.*, (SELECT json_group_object(
                uid,
                json_object(
                    'name', name,
                    'logo', logo
                )
            ) FROM users WHERE uid = chats.uid1 OR uid = chats.uid2) AS users FROM chats WHERE id=? AND (?=chats.uid1 OR ?=chats.uid2)`)
                .bind(chat_id, uid, uid)
                .all()
            
            if (results.results.length > 0){
                return  { result: true, results: results.results };

            } else {
                return  { result: false };
            }

    }
    return { result: false };
} catch (e: any){
    console.log(e.message);
}
});
}

export default setChatsApp