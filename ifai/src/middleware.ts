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
                return c.json({"error": 401});
            }
        }

        const token = await decrypt(encryptedToken!);

        // Armazena o token no contexto para a rota acessar depois
        const arr = JSON.parse(token);
        c.set('user', { name: arr[0], uid: arr[1] });

        // Continua para o handler
        await next();
    } catch (err) {
        if (is_login_page(c.req.path)){
            await next();
        } else {
            return c.json({"error": 401})
        }
    }
}