import { SocketServer } from "./SocketServer";
import { send_to_server } from "./utils";

function setPostsApp(app: SocketServer){
app.on("/posts", async (c) => {
    const origin = c.variables.origin;
    const uid = c.variables.user.uid;
    try {
        const { id, operation } = c.body;
        if (operation == "revert_deleted_status"){
            // Realize a efficient inversion (if deleted = 1 -> 1 - 1 = 0; if deleted = 0 -> 1 - 0 = 1)
            await c.env.DB.prepare("UPDATE posts SET deleted = 1 - deleted WHERE posts.id=? AND posts.userUid=?")
                .bind(id, uid) 
                .run();

            return { result: true };
        } else if (operation == "delete_from_trash"){
            const results = await c.env.DB.prepare("SELECT image FROM posts WHERE posts.id=? AND posts.userUid=? AND posts.deleted=1")
                .bind(id, uid) 
                .all();

            const formData = new FormData();
            formData.append("file_to_remove", results.results[0].image as string);
            
            const response = await send_to_server(origin, "/posts", formData, false);

            const response_json = await response.json() as { [key:string]: any };

            if (response_json.result != "true"){
                return { result: false };
            }

            await c.env.DB.prepare("DELETE FROM posts WHERE posts.id=? AND posts.userUid=? AND posts.deleted=1")
                .bind(id, uid) 
                .run();

            return { result: true };
        } else {
            return { result: false };
        }

    } catch (e: any){
        return { result: false, error: e.message};
    }

});
}

export default setPostsApp;