import { Hono } from "hono";
import { cors } from 'hono/cors';
import { AuthMiddleware } from "./middleware";
import { HonoInterface, MyContext } from "./types";
import { setCookie } from "hono/cookie";
import { encrypt } from "./cryptography";
import { ChatRoom } from "./ChatRoom";

const app = new Hono<HonoInterface>();
app.use('*', cors({ origin: (origin) => origin || "*", credentials: true}), AuthMiddleware );

// setWebsocketApp(app);

app.get("/is_loged", async (c: MyContext) => {
    const user = c.get("user");

    const results = await c.env.DB.prepare("SELECT uid FROM users WHERE uid=?")
            .bind(user.uid)
            .run();

    if (results.results.length == 1){
        return c.json({ user });
    } else {
        return c.json({ error: "401" });
    }
});

app.post("/registro", async (c: MyContext) => {
    try {
        function encodeToBase64(timestamp: number) {
            const buffer = new ArrayBuffer(4);
            new DataView(buffer).setUint32(0, timestamp);
            return btoa(String.fromCharCode(...new Uint8Array(buffer)))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');
        }

        const body = await c.req.json();

        const { email, id, matricula, name, password } = body;

        const results = await c.env.DB.prepare("SELECT email FROM users WHERE email=?")
            .bind(email)
            .all();

        // Trata registros inválidos.
        if (results.results.length == 1){
            return c.json({ result: false, reason: "email-already-in-use" });
        }

        const name_ascii = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const nFriends = 0;
        const timestamp = Math.floor(Date.now() / 1000);
        const tokens = JSON.stringify({});
        const uid = encodeToBase64(timestamp * 1000 + Math.floor(Math.random() * 999));

        await c.env.DB.prepare("INSERT INTO users(email,id,matricula,name,name_ascii,password,nFriends,timestamp,tokens,uid) VALUES(?,?,?,?,?,?,?,?,?,?)")
            .bind(email,id,matricula,name,name_ascii,password,nFriends,timestamp,tokens,uid)
            .run();

        setCookie(c, "token", await encrypt(JSON.stringify([name,uid])), {
            domain: (c.req.header('X-Forwarded-Host') || c.req.header("host"))!.split(":")[0],
            httpOnly: true,
            secure: true,
            sameSite: "None",
            maxAge: 60 * 60 * 24 * 365
        });

        return c.json({ result: true, user: { name, uid } });
    } catch (e: any) {
        return c.json({ result: false, error: e.message });
    }
});

app.post("/login", async (c) => {
    try {
        const body = await c.req.json();

        const { name_email, password } = body;


        const results = await c.env.DB.prepare("SELECT name, uid FROM users WHERE (name=? OR email=?) AND password=?")
            .bind(name_email, name_email, password)
            .all();
        
        if (results.results.length > 0){
            const { name, uid } = results.results[0] as { name: string, uid: string };
            setCookie(c, "token", await encrypt(JSON.stringify([name,uid])), {
                domain: (c.req.header('X-Forwarded-Host') || c.req.header("host"))!.split(":")[0],
                httpOnly: true,
                secure: true,
                sameSite: "None",
                maxAge: 60 * 60 * 24 * 365
            });

            return c.json({ "result": true, user: { name, uid } });
        } else {
            return c.json({ "result": false });
        }
    } catch (e: any) {
        return c.json({ error: e.message });
    }
});

app.get('/ws', async (c: MyContext) => {
    function jsonToBase64(obj: { [key: string]: any }) {
        const jsonString = JSON.stringify(obj);
        const encoder = new TextEncoder();
        const bytes = encoder.encode(jsonString);
        
        let binary = "";
        for (const byte of bytes) {
            binary += String.fromCharCode(byte);
        }
        
        return btoa(binary);
    }
    const headers = new Headers(c.req.raw.headers);
    headers.set('X-Variables', jsonToBase64({ user: c.get("user") }));

    const req = new Request(c.req.raw.url, {
        method: c.req.raw.method,
        headers,
        body: c.req.raw.body,
        // duplex: 'half', // necessário se tiver body e streaming
    });
    // const room = c.req.param('room');
    const room="app";
    const id = c.env.CHAT_ROOM.idFromName(room);
    const obj = c.env.CHAT_ROOM.get(id);
    return obj.fetch(req);
});

app.get("/logout", async (c) => {
    setCookie(c,"token","", {
        domain: (c.req.header('X-Forwarded-Host') || c.req.header("host"))!.split(":")[0],
        httpOnly: true,
        secure: true,
        sameSite: "None",
        maxAge: 0
    });

    return c.json({ result: true });
});

app.get("/images", async (c) => {
                  // const results = await env.DB.prepare(query)
                  //   .bind(...(params || []))
                  //   .all();
  const results = await c.env.DB.prepare("SELECT * FROM posts").all();
  return c.json(results)
});

export default app;

export {
    ChatRoom
}