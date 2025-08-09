import { Hono } from "hono";
import { HonoInterface, MyContext } from "./types";
import { BlankSchema } from "hono/types";
import { SocketServer } from "./SocketServer";

// Definindo uma interface que extende Context para incluir a propriedade `uid`


function setWebsocketApp(app: SocketServer){
app.on("/feed", async (c) => {
    try {
        const results = await c.env.DB.prepare("SELECT posts.*, users.logo, users.name  FROM posts JOIN users ON posts.userUid=users.uid")
            .all();
        return { result: true, posts: results.results };

    } catch (e: any){
        return { result: false, error: e.message};
    }

});
}

export default setWebsocketApp;