import { getCookie } from 'hono/cookie'
import type { Context, Next } from 'hono'
import { decrypt } from './cryptography'

function is_login_page(pathname: string){
    return pathname == "/login" || pathname == "/registro";
}

export async function AuthMiddleware(c: Context, next: Next) {
    try {
        const encryptedToken = getCookie(c, 'token')
        if (!encryptedToken) {
            if (is_login_page(c.req.path)){
                await next();
                return;
            } else {
                return c.json({ error: 401 });
            }
        }

        const token = await decrypt(encryptedToken!);

        // Armazena o token no contexto para a rota acessar depois
        const arr = JSON.parse(token);
        c.set('user', { name: arr[0], uid: arr[1] });
        c.set('f_token', getCookie(c, 'f_token'));

        var origin = (c.req.header('X-Forwarded-Host') || c.req.header("host"))!;

        if (origin.startsWith("localhost")){
            origin = "https://6v9s4f5f-8787.brs.devtunnels.ms";
        } else {
            origin = "https://" + origin;
        }

        c.set("origin", origin);

        // Continua para o handler
        await next();
    } catch (err) {
        if (is_login_page(c.req.path)){
            await next();
        } else {
            return c.json({ error: 401 })
        }
    }
}