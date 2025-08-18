import { Hono } from "hono";
import { HonoInterface, MyContext } from "./types";
import { BlankSchema } from "hono/types";
import { SocketServer } from "./SocketServer";

// Definindo uma interface que extende Context para incluir a propriedade `uid`


function setFriendsApp(app: SocketServer){
app.on("/friends", async (c) => {
    const { variables, body } = c;
    const uid = variables.user.uid;
    const operation = body.operation;

    switch (operation){
        case "get":
            var results = await c.env.DB.prepare("SELECT u.*, json_array(uid1, uid2) FROM users u INNER JOIN friends f ON ((u.uid=f.uid1 OR u.uid=f.uid2) AND (?=f.uid1 OR ?=f.uid2)) WHERE f.mode=1 AND u.uid!=?")
            .bind(uid, uid, uid)
            .all()
            return  { result: true, results: results.results };

        case "search_friends":
            var { term } = body;
            var results = await c.env.DB.prepare("SELECT u.*, json_array(uid1, uid2) FROM users u INNER JOIN friends f ON ((u.uid=f.uid1 OR u.uid=f.uid2) AND (?=f.uid1 OR ?=f.uid2)) WHERE LOWER(name_ascii) LIKE ? AND f.mode=1 AND u.uid!=?")
                .bind(uid, uid, `%${term}%`, uid)
                .all()
            return { result: true, results: results.results };

        case "search_users":
            var { term } = body;
            var results = await c.env.DB.prepare("SELECT u.*, (SELECT json_array(uid1, mode) FROM friends f WHERE (u.uid=f.uid1 OR u.uid=f.uid2) AND (?=f.uid1 OR ?=f.uid2)) as friend_info FROM users u WHERE LOWER(name_ascii) LIKE ? AND u.uid!=?")
                .bind(uid, uid, `%${term}%`, uid)
                .all()
            return { result: true, results: results.results };

        case "get_senders":
            var results = await c.env.DB.prepare("SELECT u.*, json_array(uid1, uid2)  FROM users u INNER JOIN friends f ON (u.uid=f.uid1 AND ?=f.uid2) WHERE f.mode=0 AND u.uid!=?")
                .bind(uid, uid)
                .all()
            return { result: true, results: results.results };

        case "remove_friend":
            const { uid_to_remove_friend } = body;
            await c.env.DB.prepare("DELETE FROM friends WHERE ( uid1 = ? OR uid2 = ?) AND (uid1 = ? OR uid2 = ?)")
                .bind(uid, uid, uid_to_remove_friend, uid_to_remove_friend)
                .run()
            await c.env.DB.prepare("UPDATE users SET nFriends = MIN(nFriends - 1,0) WHERE uid = ? OR uid = ?")
                .bind(uid, uid_to_remove_friend)
                .run()
            return { result: true };
        
        case "send_request":
            const { uid_to_send_request } = body;
            var results = await c.env.DB.prepare("SELECT mode FROM friends WHERE ( uid1 = ? OR uid2 = ?) AND (uid1 = ? OR uid2 = ?)")
                .bind(uid, uid, uid_to_send_request, uid_to_send_request)
                .all()

            if (results.results.length > 0){
                return { result: false, mode: results.results[0].modde }
            }

            var time = Math.floor(Date.now() / 1000);
            await c.env.DB.prepare("INSERT INTO friends(uid1,uid2,mode,time) VALUES(?,?,?,?)")
                .bind(uid, uid_to_send_request, 0, time)
                .run()
            return { result: true };

        case "remove_send_request":
            const { uid_to_remove_send_request } = body;
            var results = await c.env.DB.prepare("SELECT mode FROM friends WHERE uid1 = ? AND uid2 = ?")
                .bind(uid, uid_to_send_request)
                .all()

            if (results.results.length > 0){
                const mode = results.results[0].mode;

                if (mode == 0){
                    await c.env.DB.prepare("DELETE FROM friends WHERE uid1 = ? AND uid2 = ?")
                        .bind(uid, uid_to_remove_send_request)
                        .run()

                    return { result: true }
                }

                return { result: true, mode: 1 }
            }

            return { result: false, mode: -1 }

        case "accept_request":
            const { uid_to_accept_request } = body;

            var results = await c.env.DB.prepare("SELECT mode FROM friends WHERE ( uid1 = ? OR uid2 = ?) AND (uid1 = ? OR uid2 = ?)")
                .bind(uid, uid, uid_to_accept_request, uid_to_accept_request)
                .all()

            if (results.results.length == 0){
                return { result: false, mode: -1 }
            } else if (results.results[0].uid1!=uid_to_accept_request){
                return { result: false, mode: results.results[0].mode }
            }

            var time = Math.floor(Date.now() / 1000);
            await c.env.DB.prepare("UPDATE friends SET mode = 1, time = ? WHERE uid1 = ? AND uid2 = ?")
                .bind(time, uid_to_accept_request, uid)
                .run()
            await c.env.DB.prepare("UPDATE users SET nFriends = nFriends + 1 WHERE uid = ? OR uid = ?")
                .bind(uid, uid_to_accept_request)
                .run()
            return { result: true };

        case "decline_request":
            const { uid_to_decline_request } = body;
            await c.env.DB.prepare("DELETE FROM friends WHERE ( uid1 = ? OR uid2 = ?) AND (uid1 = ? OR uid2 = ?)")
                .bind(uid, uid, uid_to_decline_request, uid_to_decline_request)
                .run()
            return { result: true };
    }
    return { result: false };
});
}

export default setFriendsApp