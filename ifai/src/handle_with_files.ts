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


    // Repasse o corpo da requisição recebida para o fetch de upload

    const response = await send_to_server(origin, "/perfil", formData, false);

    const response_json = await response.json() as { [key:string]: any };

    const file_id = response_json.file_id;
    
    await c.env.DB.prepare("UPDATE users SET logo=? WHERE uid=?")
        .bind(file_id, uid)
        .run()

    return c.json({ result: true, file_id });

  } catch (err) {
    return c.text('Erro no proxy de upload: ' + String(err), 500)
  }
});
}

export default setHandleWithFilesApp;