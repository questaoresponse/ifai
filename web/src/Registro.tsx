import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getAuth, createUserWithEmailAndPassword, type User } from "firebase/auth";
import { collection, addDoc } from "firebase/firestore";
import "./Sign.scss";
import logo_src from "./assets/static/ifai2.png";
import { useGlobal } from "./Global";
import auth from "./Auth";

function Registro(){
    const { db, server, usuarioLogado, setUsuarioLogado } = useGlobal();

    const [ incorrectMatricula, setIncorrectMatricula ] = useState(false);

    const refs = {
        matricula: useRef<HTMLInputElement>(null)
    }


    const submit = async () => {
        if (usuarioLogado !== undefined ) return;

        const nome = (document.getElementById('regNome')! as any).value;
        const email = (document.getElementById('regEmail')! as any).value;
        const senha = (document.getElementById('regSenha')! as any).value;
        const id = 'ID-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        const matricula = refs.matricula.current!.value;

        if (!/^20[0-9]{2}(1|2)(1|2)(1|2)[A-Z]+0(120|1[0-1][0-9]|0[0-9]{2})$/.test(matricula)) return setIncorrectMatricula(true);

        const response = await auth.post(server + "/email_check", { matricula });
        
        if (response.data.result && response.data.is_valid){
            createUserWithEmailAndPassword(getAuth(), email, senha)
            .then((userCredential) => {
                const user = userCredential.user as User;
                setUsuarioLogado(user);

                const timestamp = new Date().getTime();
                addDoc(collection(db.current!, "usuarios"),{
                    email,
                    id,
                    matricula,
                    nFriends: 0,
                    name_lower: nome.toLowerCase(),
                    nome,
                    password: senha,
                    timestamp,
                    uid: user.uid
                });
            });
        } else {
            setIncorrectMatricula(true);
        }
    }

    return !usuarioLogado ? <>
         <div id="signup" className="page">
            <main id="sign-container">
                <img id="logo" src={logo_src} width="150px"/>
                <div className="input-group">
                    <label>Nome:</label>
                    <input type="text" id="regNome" required/>
                </div>

                <div className="input-group">
                    <label>Email:</label>
                    <input type="email" id="regEmail" required/>
                </div>
                <div className="input-group">
                    <label>Matricula:</label>
                    <input ref={refs.matricula} type="text" id="regMatricula" required/>
                    <div style={{ display: incorrectMatricula ? "block" : "none", color: "red" }}>matricula incorreta</div>
                </div>
                <div className="input-group">
                    <label>Senha:</label>
                    <input type="password" id="regSenha" required/>
                </div>

                <p>Já possui conta? <Link to="/login">Fazer login</Link></p>

                <button onClick={submit} id="btn-submit" type="submit">Entrar</button>
            </main>
        </div>
  </> : <></>
}

export default Registro;