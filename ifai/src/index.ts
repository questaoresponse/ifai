import { Hono } from "hono";
import { cors } from 'hono/cors';
import setUserApp from "./user";
import { AuthMiddleware } from "./middleware";
import { HonoInterface, MyContext, Variables } from "./types";
import { setCookie } from "hono/cookie";
import { encrypt } from "./cryptography";
import setWebsocketApp from "./websocket";
import { ChatRoom } from "./ChatRoom";

const app = new Hono<HonoInterface>();
app.use('*', cors({ origin: (origin) => origin || "*", credentials: true}), AuthMiddleware );

// setWebsocketApp(app);

app.get("/is_loged", (c: MyContext) => {
    const user = c.get("user");
    return c.json({ user });
});

app.post("/registro", async (c) => {
    try {
        function encodeToBase64(timestamp: number) {
            const buffer = new ArrayBuffer(8)
            const view = new DataView(buffer)
            view.setBigUint64(0, BigInt(timestamp))
            const bytes = new Uint8Array(buffer)
            const binary = String.fromCharCode(...bytes)
            return btoa(binary).replace(/=+$/, '') // base64 sem padding
        }

        const body = await c.req.json();

        const { email, id, matricula, name, password } = body;

        const name_ascii = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const nFriends = 0;
        const timestamp = Date.now();
        const tokens = JSON.stringify({});
        const uid = encodeToBase64(timestamp * 1000 + Math.floor(Math.random() * 999));

        await c.env.DB.prepare("INSERT INTO users(email,id,matricula,name,name_ascii,password,nFriends,timestamp,tokens,uid) VALUES(?,?,?,?,?,?,?,?,?,?)")
            .bind(email,id,matricula,name,name_ascii,password,nFriends,timestamp,tokens,uid)
            .run();

        setCookie(c, "token", await encrypt(JSON.stringify([name,uid])), {
            domain: c.req.header('host')!.split(":")[0],
            httpOnly: true,
            secure: true,
            maxAge: 60 * 60 * 24 * 365
        });

        return c.json({ user: { name, uid } });
    } catch (e: any) {
        return c.json({ error: e.message });
    }
});

app.post("/login", async (c) => {
    try {
        const body = await c.req.json();

        const { email, password } = body;


        const results = await c.env.DB.prepare("SELECT name, uid FROM users WHERE email=? AND password=?")
            .bind(email, password)
            .all();
        
        if (results.results.length > 0){
            const { name, uid } = results.results[0] as { name: string, uid: string };
            setCookie(c, "token", await encrypt(JSON.stringify([name,uid])), {
                domain: c.req.header('host')!.split(":")[0],
                httpOnly: true,
                secure: true,
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

    const headers = new Headers(c.req.raw.headers);
    headers.set('X-Variables', JSON.stringify({ user: c.get("user") }));

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
        domain: c.req.header('host')!.split(":")[0],
        httpOnly: true,
        secure: true,
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
app.get("/feed", async (c) => {
                  // const results = await env.DB.prepare(query)
                  //   .bind(...(params || []))
                  //   .all();
    try {
        const results = await c.env.DB.prepare("SELECT posts.*, users.logo, users.name  FROM posts JOIN users ON posts.userUid=users.uid").all();
        return c.json(results)

    } catch (e: any){
        return c.json({error: e.message});
    }

});

app.post("/query", async (c) => {
    const body = await c.req.json()
    try {
        const results = await c.env.DB.prepare(body.query)
            .bind(...(body.params || []))
            .all();
            
        return c.json(results)

    } catch (e: any){
        return c.json({error: e.message});
    }
//   const results = await c.env.DB.prepare(que).all();
});

export default app;

export {
    ChatRoom
}