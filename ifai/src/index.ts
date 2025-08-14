import { Hono } from "hono";
import { cors } from 'hono/cors';
import { AuthMiddleware } from "./middleware";
import { HonoInterface, MyContext } from "./types";
import { getCookie, setCookie } from "hono/cookie";
import { encrypt } from "./cryptography";
import { ChatRoom } from "./ChatRoom";
import setHandleWithFilesApp from "./handle_with_files";
import { get_server_url } from "./utils";

const app = new Hono<HonoInterface>();
app.use('*', cors({ origin: (origin) => origin || "*", allowHeaders: ["Content-Length", "Content-Type"], credentials: true}), AuthMiddleware );

setHandleWithFilesApp(app);

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

    const user = c.get("user");
    const f_token = getCookie(c, "f_token");
    const origin = c.get("origin");

    headers.set('X-Variables', jsonToBase64({ f_token, user, origin }));

    const req = new Request(c.req.raw.url, {
        method: c.req.raw.method,
        headers,
        body: c.req.raw.body,
        // duplex: 'half', // necessário se tiver body e streaming
    });
    // const room = c.req.param('room');
    const room=user.uid;
    const id = c.env.CHAT_ROOM.idFromName(room);
    const obj = c.env.CHAT_ROOM.get(id);
    return obj.fetch(req);
});

app.get("/logout", async (c: MyContext) => {
    const uid = c.get("user").uid;
    const f_token = c.get("f_token");
    const results = await c.env.DB.prepare("SELECT tokens FROM users WHERE uid=?")
        .bind(uid)
        .all();

    const tokens = JSON.parse(results.results[0].tokens as string);

    if (f_token in tokens){
        delete tokens[f_token];
    }

    await c.env.DB.prepare("UPDATE users SET tokens=? WHERE uid=?")
        .bind(JSON.stringify(tokens), uid)
        .run();

    setCookie(c,"token","", {
        domain: (c.req.header('X-Forwarded-Host') || c.req.header("host"))!.split(":")[0],
        httpOnly: true,
        secure: true,
        sameSite: "None",
        maxAge: 0
    });

    setCookie(c,"f_token","", {
        domain: (c.req.header('X-Forwarded-Host') || c.req.header("host"))!.split(":")[0],
        httpOnly: true,
        secure: true,
        sameSite: "None",
        maxAge: 0
    });

    return c.json({ result: true });
});

app.post("/token",async (c: MyContext) => {
    const { token: newToken } = await c.req.json();
    const currentToken = c.get("f_token");
    const uid = c.get("user").uid;

    if (currentToken == newToken){
        return c.json({ result: true });
    }

    var results = await c.env.DB.prepare("SELECT tokens FROM users WHERE uid=?")
        .bind(uid)
        .all()

    const tokens_str = results.results[0].tokens as string;

    let tokens: Record<string, number> = {};
    try {
        tokens = JSON.parse(tokens_str || '{}');
    } catch {
        tokens = {};
    }

    if (currentToken) {
        delete tokens[currentToken]
    }

    tokens[newToken] = Date.now()

    await c.env.DB.prepare("UPDATE users SET tokens=? WHERE uid=?")
        .bind(JSON.stringify(tokens), uid)
        .run()

    setCookie(c, "f_token", newToken, {
        domain: (c.req.header('X-Forwarded-Host') || c.req.header("host"))!.split(":")[0],
        httpOnly: true,
        secure: true,
        sameSite: "None",
        maxAge: 60 * 60 * 24 * 365
    });

    return c.json({ result: true, needs_restart: true });
});

app.get('/get_file/:file_id', async (c: MyContext) => {
    const origin = c.get("origin");
    const file_id = c.req.param("file_id");
    const cache = caches.default;
    const request = c.req.raw; // Request original do fetch event

    // 1 - Tenta pegar do cache
    let response = await cache.match(request);
    if (response) {
        return new Response(response.body, response);
    }

    // 2 - Busca no servidor externo
    const url = get_server_url(origin) + "/get_file/" + file_id;
    
    response = await fetch(url);

    // 3 - Clona para poder armazenar no cache
    const cachedResponse = new Response(response.body, response);
    cachedResponse.headers.set('Cache-Control', 'public, max-age=2678400');

    // 4 - Salva no cache da borda
    c.executionCtx.waitUntil(cache.put(request, cachedResponse.clone()));

    // 5 - Retorna resposta
    return cachedResponse;
});

export default app;

export {
    ChatRoom
}