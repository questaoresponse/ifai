import { SocketServer } from "./SocketServer";

function setFeedApp(app: SocketServer){
app.on("/feed", async (c) => {
    const { perfil_uid } = c.body;
    try {
        if (perfil_uid){
            const results = await c.env.DB.prepare("SELECT posts.*, users.logo, users.name  FROM posts JOIN users ON posts.userUid=users.uid WHERE users.uid=? ORDER BY timestamp DESC")
                .bind(perfil_uid)    
                .all();
            return { result: true, posts: results.results };
        } else {
            const results = await c.env.DB.prepare("SELECT posts.*, users.logo, users.name  FROM posts JOIN users ON posts.userUid=users.uid ORDER BY timestamp DESC")
                .all();
            return { result: true, posts: results.results };
        }

    } catch (e: any){
        return { result: false, error: e.message};
    }

});
}

export default setFeedApp;