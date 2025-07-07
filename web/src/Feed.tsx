import { useEffect, useState } from "react";
import { useGlobal } from "./Global";
import { getDriveURL } from "./Functions";
import "./Feed.scss";
import { collection, getDocs, query, where } from "firebase/firestore";

interface postsInterface{
    type: number,
    userUid: string,
    user: string,
    image: string,
    description: string
    timestamp: number,
}

function Feed({ userPerfilUid }: { userPerfilUid: string |null }){
    const { db, usuarioLogado } = useGlobal();
    const [ posts, setPosts ] = useState<postsInterface[]>([]);

    useEffect(()=>{
        if (!usuarioLogado) return;
        if (userPerfilUid == "") return;

        (userPerfilUid ? getDocs(query(collection(db.current!, "posts"), where("userUid", "==", userPerfilUid))) : getDocs(collection(db.current!, "posts"))).then(results=>{
            setPosts(results.docs.map(doc=>{const data = doc.data(); return {...data, image: getDriveURL(data.image)}}) as postsInterface[]);
        });
    },[usuarioLogado, userPerfilUid]);

    return <div id="feed">{posts.map((post, index: number)=>{
        return <div className="post" key={index}>
            <img className="image" src={post.image}/>
            <div className="text">{post.description}</div>
        </div>
    })}</div>
}

export default Feed;