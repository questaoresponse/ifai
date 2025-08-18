import { SocketServer } from "./SocketServer";
import { get_app_url, send_to_room, send_to_server } from "./utils";

// Definindo uma interface que extende Context para incluir a propriedade `uid`


function setChatsApp(app: SocketServer){
app.on("/chats", async (c) => {
    const { variables, body } = c;
    const uid = variables.user.uid;
    try {
        const results = await c.env.DB.prepare(`WITH messages_ranked AS (
            SELECT 
                m.*,
                ROW_NUMBER() OVER (PARTITION BY chat_id ORDER BY time DESC) AS rn,
                SUM(CASE WHEN visualized = 0 THEN 1 ELSE 0 END) OVER (PARTITION BY chat_id, uid) AS new_messages_number
            FROM messages m
        )
        SELECT 
            u.name,
            u.logo,
            u.uid,
            c.id AS id,
            json_object(
                'uid', m.uid,
                'text', m.text,
                'type', m.type,
                'time', m.time,
                'visualized', m.visualized,
                'new_messages_number', m.new_messages_number
            ) AS last_message
        FROM users u
        INNER JOIN chats c ON ((u.uid = c.uid1 OR u.uid = c.uid2) AND (? = c.uid1 OR ? = c.uid2))
        LEFT JOIN messages_ranked m ON m.chat_id = c.id AND m.rn = 1
        WHERE u.uid != ?
        ORDER BY m.time DESC`)
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
                const time = Math.floor(Date.now() / 1000);
                await c.env.DB.prepare(`UPDATE messages SET visualized=? WHERE chat_id=? AND uid!=? AND visualized=0`)
                    .bind(time, chat_id, uid)
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
            const origin = c.variables.origin;

            const timestamp = Date.now();
            const id = timestamp * 1000 + Math.floor(Math.random() * 999);
            const time = Math.floor(timestamp / 1000);

            if (chat_id / 1000 >= time){
                return { result: false };
            }

            var results = await c.env.DB.prepare(`SELECT name, tokens, uid FROM users u INNER JOIN chats c ON (u.uid = c.uid1 OR u.uid = c.uid2) WHERE c.id=? AND (?=uid1 OR ?=uid2)`)
                .bind(chat_id, uid, uid)
                .all()

            const lines = results.results as { name: string, tokens: string, uid: string }[];
            const tokens = lines.filter(line=>line.uid!=uid).map(line=>Object.keys(JSON.parse(line.tokens)))[0];
            const title = lines.filter(line=>line.uid==uid)[0].name;
            const other_uid = lines[0].uid == uid ? lines[1].uid : lines[0].uid;
            const url_origin = get_app_url(origin);

            await send_to_room(c, other_uid, "message", { time: time, id, text, type });

            // Send notification only with tokens
            if (tokens.length > 0){
                await send_to_server(origin, "/notification", JSON.stringify({ body: text, title, tokens, url: `${url_origin}/chat/${chat_id}` }));
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