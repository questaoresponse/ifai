import { useEffect, useState } from "react";
import { useGlobal } from "./Global";
import { getDriveURL } from "./Functions";
import "./Feed.scss";
import { collection, getDocs, query, where } from "firebase/firestore";
import avatar_src from "./assets/static/avatar.png";

interface postsInterface{
    description: string
    image: string,
    logo: string,
    timestamp: number,
    type: number,
    user: string,
    userUid: string
}

function Feed({ userPerfilUid }: { userPerfilUid: string |null }){
    const { db, usuarioLogado } = useGlobal();
    const [ posts, setPosts ] = useState<postsInterface[]>([]);

    useEffect(()=>{
        if (!usuarioLogado) return;
        if (userPerfilUid == "") return;

        (userPerfilUid ? getDocs(query(collection(db.current!, "posts"), where("userUid", "==", userPerfilUid))) : getDocs(collection(db.current!, "posts"))).then(results=>{
            const users = results.docs.map(doc=>doc.data().userUid);
            getDocs(query(collection(db.current!, "usuarios"), where("uid", "in", users))).then(userResults=>{
                const infos: { [key: string]: any } = {};
                for (const result of userResults.docs){
                    const doc = result.data();
                    infos[doc.uid] = { logo: doc.fotoPerfil? getDriveURL(doc.fotoPerfil) : avatar_src, name: doc.nome  };
                }
                setPosts(results.docs.map(doc=>{const data = doc.data(); return {...data, image: getDriveURL(data.image), logo: infos[data.userUid].logo, user: infos[data.userUid].name }}) as postsInterface[]);
            });
        });
    },[usuarioLogado, userPerfilUid]);

    return <div id="feed">{posts.map((post, index: number)=>{
        return <div className="post" key={index}>
            <div className="infos">
                <img className="logo" src={post.logo}></img>
                <div className="user">{post.user}</div>
            </div>
            <img className="image" src={post.image}/>
            <div className="text">{post.description}</div>
        </div>
    })}</div>
}

export default Feed;