import { Hono } from "hono";
import { HonoInterface, MyContext } from "./types";
import { BlankSchema } from "hono/types";

// Definindo uma interface que extende Context para incluir a propriedade `uid`


function setWebsocketApp(app:Hono<HonoInterface, BlankSchema, "/">){

}

export default setWebsocketApp;