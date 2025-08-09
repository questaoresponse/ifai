import { useRef } from "react";
import { Link } from "react-router-dom";
import { getAuth, signInWithEmailAndPassword, type UserCredential } from "firebase/auth";
import logo_src from "./assets/static/ifai2.png";
import { useGlobal } from "./Global";
import "./Sign.scss";
import Alert from "./Alert";
import auth from "./Auth";

function Login(){
    const { worker_server, usuarioLogado, setUsuarioLogado } = useGlobal();


    const showPopup = useRef<any>(null);

    
    const submit = (e: any) => {
        e.preventDefault();
        const email = (document.getElementById('loginEmail') as any).value;
        const password = (document.getElementById('loginSenha') as any).value;

        auth.post(worker_server + "/login", { email, password }).then(result=>{
            if (result.data.result){
                setUsuarioLogado(result.data.user);
            }
        })
        // signInWithEmailAndPassword(getAuth(), email, senha)
        // .then((user: UserCredential) => {
        //     setUsuarioLogado(user.user);
        // })
        // .catch(() => {
        //     showPopup.current("E-mail ou senha incorreto.");
        // });
    };

    return !usuarioLogado ? <>
        <div id="signin" className="page">
            <form onSubmit={submit} id="sign-container">
                <img id="logo" src={logo_src} width="150px"/>
                <div className="input-group">
                    <label>Email:</label>
                    <input type="email" id="loginEmail" required/>
                </div>
                <div className="input-group">
                    <label>Senha:</label>
                    <input type="password" id="loginSenha" required/>
                </div>

                <p>Não possui conta? <Link to="/registro">Registre-se</Link></p>

                <button id="btn-submit" type="submit">Entrar</button>
            </form>
        </div>
        <Alert showPopup={showPopup}></Alert>
    </> : <></>
}

export default Login;