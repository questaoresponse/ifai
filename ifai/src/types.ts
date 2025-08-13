import { Context } from "hono";
import { BlankInput } from "hono/types";

interface ExtendedBindings extends CloudflareBindings {
  DB: D1Database, // ou o tipo correto do seu DB
  CHAT_ROOM: DurableObjectNamespace
}

interface Variables {
    f_token: string,
    user: { name: string, uid: string },
    origin: string
}

interface MyContext extends Context<{
    Bindings: ExtendedBindings;
    Variables: Variables;
}, "*", BlankInput> {
}

interface HonoInterface {
    Bindings: ExtendedBindings 
}

export type {
    MyContext,
    HonoInterface,
    ExtendedBindings,
    Variables
}