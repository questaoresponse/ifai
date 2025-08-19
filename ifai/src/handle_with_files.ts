import { Hono } from "hono";
import { HonoInterface, MyContext } from "./types";
import { BlankSchema } from "hono/types";
import { send_to_server } from "./utils";

function setHandleWithFilesApp(app: Hono<HonoInterface, BlankSchema, "/">){
app.post("/perfil", async (c: MyContext) => {
  try {
    const uid = c.get("user").uid;
    const origin = c.get("origin");

    const formData = await c.req.raw.formData();

    const description_str = formData.get("description");
    const operation = formData.get("operation") as string | null;

    if (!operation) return c.json({ result: false });

    const description = {
        text: description_str
    };

    const description_json = JSON.stringify(description);

    // If has file object, then get the previous file_id to remove
    if (["add-file", "remove-file"].includes(operation)){
        const results = await c.env.DB.prepare("SELECT logo FROM users WHERE uid=?")
            .bind(uid)
            .run()

        if (results.results.length == 0){
            return c.json({ result: false });
        }

        const logo = results.results[0].logo as string | null;

        if (logo){
            formData.append("file_to_remove", logo);
        }

        const timestamp = Date.now();
        formData.append("timestamp", String(timestamp));

        const response = await send_to_server(origin, "/perfil", formData, false);

        const response_json = await response.json() as { [key:string]: any };

        const file_id = response_json.file_id;
        
        await c.env.DB.prepare("UPDATE users SET description=?, logo=? WHERE uid=?")
            .bind(description_json, file_id, uid)
            .run()

        return c.json({ result: true, file_id });
    } else {
        await c.env.DB.prepare("UPDATE users SET description=? WHERE uid=?")
            .bind(description_json, uid)
            .run()

        return c.json({ result: true });
    }
  } catch (err) {
    return c.text('Erro no proxy de upload: ' + String(err), 500)
  }
});

app.post("/posts", async (c: MyContext) => {
    try {
        const uid = c.get("user").uid;
        const origin = c.get("origin");

        const formData = await c.req.raw.formData();

        const deleted = 0;
        const description = formData.get("description");
        const type = 0;
        const timestamp = Date.now();
        const id = Math.floor(timestamp / 1000) * Math.floor(Math.random() * 999);

        formData.append("timestamp", String(timestamp));
        formData.append("operation", "add-file");

        // Repasse o corpo da requisição recebida para o fetch de upload

        const response = await send_to_server(origin, "/posts", formData, false);

        const response_json = await response.json() as { [key:string]: any };

        const file_id = response_json.file_id;
        
        await c.env.DB.prepare("INSERT INTO posts(deleted,description,id,image,timestamp,type,userUid) VALUES(?,?,?,?,?,?,?)")
            .bind(deleted,description,id,file_id,timestamp,type,uid,)
            .run()

        return c.json({ result: true, file_id });

    } catch (err) {
        return c.text('Erro no proxy de upload: ' + String(err), 500)
    }
});
}

export default setHandleWithFilesApp;