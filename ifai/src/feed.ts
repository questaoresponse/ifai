import { SocketServer } from "./SocketServer";

function setFeedApp(app: SocketServer){
app.on("/feed", async (c) => {
    const uid = c.variables.user.uid;
    const { perfil_uid } = c.body;
    try {
        if (perfil_uid){
            const aditional_query = perfil_uid == uid ? "" : "AND posts.deleted=0";
            const results = await c.env.DB.prepare(`SELECT posts.timestamp, posts.description, posts.deleted, posts.image, posts.id, posts.userUid, users.logo, users.name FROM posts JOIN users ON posts.userUid=users.uid WHERE users.uid=?${aditional_query} ORDER BY posts.timestamp DESC`)
                .bind(perfil_uid)    
                .all();
            return { result: true, posts: results.results };
        } else {
            const results = await c.env.DB.prepare("SELECT posts.timestamp, posts.description, posts.image, posts.id, posts.userUid, users.logo, users.name FROM posts JOIN users ON posts.userUid=users.uid WHERE posts.deleted=0 ORDER BY posts.timestamp DESC")
                .all();
            return { result: true, posts: results.results };
        }

    } catch (e: any){
        return { result: false, error: e.message};
    }

});
}

export default setFeedApp;