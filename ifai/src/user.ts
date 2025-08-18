import { SocketServer } from "./SocketServer";

// Definindo uma interface que extende Context para incluir a propriedade `uid`


function setUserApp(app: SocketServer){
app.on("/perfil", async (c) => {
    const { uid } = c.body;

    const results = await c.env.DB.prepare("SELECT description, matricula, name, nFriends, logo, uid FROM users WHERE uid=?")
        .bind(uid)
        .all();

    if (results.results.length == 1){
        return { result: true, perfil: results.results[0] };
    } else {
        return { result: false };
        
    }
});
}

export default setUserApp;