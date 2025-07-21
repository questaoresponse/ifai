import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Home.scss";
import Feed from "./Feed";
import { useGlobal } from "./Global";
import logo_src from "./assets/static/ifai2.png";


function Home(){
    const { mobile } = useGlobal();

    const navigate = useNavigate();

    useEffect(()=>{
        window.navigate = navigate;
    },[]);



    // carregarUsuarioAtual().then(() => {
    //                         atualizarFriendSelect();
    //                         carregarAmigos();
    //                     });

    return <>
        <main id="home" className="page">
            {mobile ? <div id="home-header">
                 <div className="header_logo">
                    <Link to="/"><img src={logo_src} width="60px" alt="Logo" /></Link>
                </div>
                <Link to="/chats" className="defbtn" id="chatButton">
                    <i className="fa-solid fa-comment-dots"></i>
                    <span id="chatNotification"></span>
                </Link>
            </div> : <></>}
            <Feed userPerfilUid={null}></Feed>
        </main>
    </>
}

export default Home;