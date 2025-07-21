import { useEffect, useState } from "react";
import { useGlobal } from "./Global";
import { getDriveURL } from "./Functions";
import "./Feed.scss";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import avatar_src from "./assets/static/avatar.png";
import { Link } from "react-router-dom";

interface postsInterface{
    data: string,
    description: string
    image: string,
    logo: string,
    timestamp: number,
    type: number,
    user: string,
    userUid: string
}

const getPlural = (number: number) => {
    return number > 1 ? "s" : "";
}
function Feed({ userPerfilUid }: { userPerfilUid: string |null }){
    const { db, usuarioLogado } = useGlobal();
    const [ posts, setPosts ] = useState<postsInterface[]>([]);

    const processData = (timestamp: number) => {
        const months = [
            "Janeiro",
            "Fevereiro",
            "Março",
            "Abril",
            "Maio",
            "Junho",
            "Julho",
            "Agosto",
            "Setembro",
            "Outubro",
            "Novembro",
            "Dezembro"
        ]

        const currentTimestamp = new Date().getTime();
        const diff = currentTimestamp - timestamp;
        const date = new Date(timestamp);

        if (diff < 60 * 1000){
            const number = Math.floor(diff / 1000);
            return `Há ${String(number)} segundo${getPlural(number)}`;
        } else if (diff < 60 * 60 * 1000){
            const number = Math.floor(diff / (60 * 1000));
            return `Há ${String(number)} minuto${getPlural(number)}`;
        } else if (diff < 24 * 60 * 60 * 1000){
            const number = Math.floor(diff / (60 * 60 * 1000));
            return `Há ${String(number)} hora${getPlural(number)}`;
        } else if (diff < 7 * 24 * 60 * 60 * 1000){
            const number = Math.floor(diff / (24 * 60 * 60 * 1000));
            return `Há ${String(number)} dia${getPlural(number)}`;
        } else if (diff < 30 * 24 * 60 * 60 * 1000){
            const number = Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
            return `Há ${String(number)} semana${getPlural(number)}`;
        }
        
        return `${date.getDay() + 1} de ${months[date.getMonth()]} de ${date.getFullYear()}`
    }
    useEffect(()=>{
        if (!usuarioLogado) return;
        if (userPerfilUid == "") return;

        (userPerfilUid ? getDocs(query(collection(db.current!, "posts"), where("userUid", "==", userPerfilUid), orderBy("timestamp", "desc"), limit(5))) : getDocs(query(collection(db.current!, "posts"), orderBy("timestamp", "desc"), limit(5)))).then(results=>{
            const users = results.docs.map(doc=>doc.data().userUid);
            getDocs(query(collection(db.current!, "usuarios"), where("uid", "in", users))).then(userResults=>{
                const infos: { [key: string]: any } = {};
                for (const result of userResults.docs){
                    const doc = result.data();
                    infos[doc.uid] = { logo: doc.fotoPerfil? getDriveURL(doc.fotoPerfil) : avatar_src, name: doc.nome  };
                }
                setPosts(results.docs.map(doc=>{const data = doc.data(); console.log(data.timestamp); return {...data, data: processData(data.timestamp), image: getDriveURL(data.image), logo: infos[data.userUid].logo, user: infos[data.userUid].name }}) as postsInterface[]);
            });
        });
    },[usuarioLogado, userPerfilUid]);

    return <div id="feed">{posts.map((post, index: number)=>{
        return <div className="post" key={index}>
            <div className="header-post">
                <Link to={"/perfil?id="+post.userUid}><img className="logo" src={post.logo}></img></Link>
                <Link to={"/perfil?id="+post.userUid} className="user">{post.user}</Link>
            </div>
            <img className="image" src={post.image}/>
            <div className="footer-post">
                <div className="post-info">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="bi bi-heart post-info-icon like" viewBox="0 0 16 16">
                        <path d="m8 2.748-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01zM8 15C-7.333 4.868 3.279-3.04 7.824 1.143q.09.083.176.171a3 3 0 0 1 .176-.17C12.72-3.042 23.333 4.867 8 15"/>
                    </svg>
                    <div className="post-info-value">0</div>
                </div>
            </div>
            <div className="text">{post.description}</div>
            <div className="data">{post.data}</div>
        </div>
    })}</div>
}

export default Feed;