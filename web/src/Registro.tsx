import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./Sign.scss";
import logo_src from "./assets/static/ifai2.png";
import { useGlobal } from "./Global";
import Alert from "./Alert";
import auth from "./Auth";

const cursos: { [key: string]: number } = {
  ISINF: 140,
  ISSEG: 50,
  ISADM: 50,
  ISMEC: 50,
  ISL: 50,
  TADS: 50,
  TSEG: 50,
  ISDEV: 50,
};

function Registro() {
  const showPopup = useRef<(msg: string) => void>(null);
  const { worker_server, usuarioLogado, setUsuarioLogado } = useGlobal();

  const [incorrectMatricula, setIncorrectMatricula] = useState(false);
  const refs = { matricula: useRef<HTMLInputElement>(null) };

  const submit = (e: any) => {
    e.preventDefault();
    if (usuarioLogado) return;

    const name = (document.getElementById("regNome") as HTMLInputElement).value;
    const email = (document.getElementById("regEmail") as HTMLInputElement).value;
    const senha = (document.getElementById("regSenha") as HTMLInputElement).value;
    const id = "ID-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    const matricula = refs.matricula.current!.value.trim();

    if (!/^20[0-9]{2}(1|2)(1|2)(1|2)[A-Z]+0(140|1[0-3][0-9]|0[0-9]{2})$/.test(matricula)) {
    const regex = matricula.match(/11([A-Z]+)0(\d+)$/)!;
        if (!(regex[1] in cursos) || Number(regex[2]) > cursos[regex[1]]){
            setIncorrectMatricula(true);
            showPopup.current?.("Matrícula inválida.");
            return;
        }
    }


    auth.post(worker_server + "/registro", {
            email,
            id,
            matricula,
            name,
            password: senha,
          })
    .then((result) => {
        if (result.data.result){
        setUsuarioLogado(result.data.user);
        } else {
            switch (result.data.reason) {
                case "email-already-in-use":
                    showPopup.current!("E-mail já está em uso.");
                break;

                // case "auth/weak-password":
                //     showPopup.current!("A senha é muito fraca.");
                // break;

                // case "auth/invalid-email":
                //     showPopup.current!("E-mail inválido.");
                // break;
            }
        }
    })
    // createUserWithEmailAndPassword(getAuth(), email, senha)
    //   .then((uc) => {
    //     const user = uc.user as User;
    //     setUsuarioLogado(user);
    //     const timestamp = Date.now();
    //     addDoc(collection(db.current!, "usuarios"), {
    //       email,
    //       id,
    //       matricula,
    //       nFriends: 0,
    //       name_lower: nome.toLowerCase(),
    //       nome,
    //       password: senha,
    //       timestamp,
    //       uid: user.uid,
    //       tokens:  JSON.stringify({})
    //     });
    //   })
    //   .catch((err) => {
    //     if (!showPopup.current) return;
    //     switch (err.code) {
    //       case "auth/email-already-in-use":
    //         showPopup.current("E-mail já está em uso.");
    //         break;
    //       case "auth/weak-password":
    //         showPopup.current("A senha é muito fraca.");
    //         break;
    //       case "auth/invalid-email":
    //         showPopup.current("E-mail inválido.");
    //         break;
    //       default:
    //         showPopup.current("Erro ao registrar: " + err.message);
    //     }
    //   });
  };

  return !usuarioLogado ? (
    <>
      <div id="signup" className="page">
        <form onSubmit={submit} id="sign-container">
          <img id="logo" src={logo_src} width="150px" />
          <div className="input-group">
            <label>Nome:</label>
            <input type="text" id="regNome" required />
          </div>

          <div className="input-group">
            <label>E-mail:</label>
            <input type="email" id="regEmail" required />
          </div>

          <div className="input-group">
            <label>Matrícula:</label>
            <input
              ref={refs.matricula}
              type="text"
              id="regMatricula"
              required
               style={{
                border: incorrectMatricula ? "1px solid red" : undefined,
                outlineColor: incorrectMatricula ? "red" : undefined
            }}
            onChange={() => setIncorrectMatricula(false)}
            />
            {incorrectMatricula && (
              <p style={{ color: "red", fontSize: "13px" }}>Matrícula inválida</p>
            )}
          </div>

          <div className="input-group">
            <label>Senha:</label>
            <input type="password" id="regSenha" required />
          </div>

          <p>
            Já possui conta? <Link to="/login">Fazer login</Link>
          </p>

          <button id="btn-submit" type="submit">
            Registrar
          </button>
        </form>
      </div>

      {}
      <Alert showPopup={showPopup} />
    </>
  ) : null;
}

export default Registro;
