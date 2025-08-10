import { Hono } from "hono";
import { HonoInterface, MyContext } from "./types";
import { BlankSchema } from "hono/types";
import { SocketServer } from "./SocketServer";

// Definindo uma interface que extende Context para incluir a propriedade `uid`


function setChatsApp(app: SocketServer){
app.on("/chats", async (c) => {
    const { variables, body } = c;
    const uid = variables.user.uid;
    try {
        const results = await c.env.DB.prepare("SELECT u.*, c.id AS id FROM users u INNER JOIN chats c ON ((u.uid = c.uid1 OR u.uid = c.uid2) AND (? = c.uid1 OR ? = c.uid2)) WHERE u.uid!=?")
            .bind(uid, uid, uid)
            .all()
        return { result: true, results: results.results }
    
    } catch (e: any){
        console.log(e.message);
    }
    
});
app.on("/chat", async (c) => {
    const { variables, body } = c;
    const uid = variables.user.uid;
    const operation = body.operation;
    try {
    switch (operation){
        case "go_to_chat":
            const { user_to_navigate_chat } = body;

            if (uid == user_to_navigate_chat){
                return { result: false };
            }

            var results = await c.env.DB.prepare("SELECT id FROM chats WHERE (?=chats.uid1 OR ?=chats.uid2) AND (?=chats.uid1 OR ?=chats.uid2)")
                .bind(uid, uid, user_to_navigate_chat, user_to_navigate_chat)
                .all()

            if (results.results.length > 0){
                return { result: true, chat_id: results.results[0].id };
            } else {
                const timestamp = Math.floor(Date.now() / 1000);
                const chat_id = (timestamp * 1000 + Math.floor(Math.random() * 999));

                var results = await c.env.DB.prepare("INSERT INTO chats(uid1,uid2,id,time) VALUES (?,?,?,?)")
                    .bind(uid, user_to_navigate_chat, chat_id, timestamp)
                    .run()
                
                return { result: true, chat_id };
            }

        case "get_messages":
            var chat_id = body.id;
            var chat = await c.env.DB.prepare(`SELECT chats.*, (SELECT json_group_object(
                uid,
                json_object(
                    'name', name,
                    'logo', logo
                )
            ) AS users FROM users WHERE uid = chats.uid1 OR uid = chats.uid2) AS users FROM chats WHERE id=? AND (?=chats.uid1 OR ?=chats.uid2)`)
                .bind(chat_id, uid, uid)
                .all()

            if (chat.results.length > 0){
                await c.env.DB.prepare(`UPDATE messages SET visualized=1 WHERE chat_id=? AND uid!=?`)
                    .bind(chat_id, uid)
                    .run()

                var messages = await c.env.DB.prepare(`SELECT * FROM messages WHERE chat_id=? ORDER BY id`)
                    .bind(chat_id)
                    .all()
            
                return  { result: true, chat: chat.results[0], messages: messages.results };

            } else {
                return  { result: false };
            }
        
        case "send_message":
            var { text, type, chat_id } = body;

            const timestamp = Date.now();
            const id = timestamp * 1000 + Math.floor(Math.random() * 999);
            const time = Math.floor(timestamp / 1000);

            if (chat_id / 1000 >= time){
                return { result: false };
            }

            var results = await c.env.DB.prepare(`INSERT INTO messages(text,uid,visualized,type,time,chat_id,id) VALUES(?,?,?,?,?,?,?)`)
                .bind(text, uid, 0, type, time, chat_id, id)
                .all()

            return { result: true, id: id };
    }
    return { result: false };
} catch (e: any){
    console.log(e.message);
}
});
}

export default setChatsApp