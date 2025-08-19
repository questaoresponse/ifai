import { useEffect, useState } from "react";
import { useGlobal } from "./Global";
import { getDriveURL } from "./Functions";
import "./Feed.scss";
import avatar_src from "./assets/static/avatar.png";
import { Link } from "react-router-dom";

interface postsInterface{
    data: string,
    description: string,
    deleted?: number,  // 1 for deleted and 0 for active
    id: number,
    image: string,
    logo: string,
    saved?: number,
    timestamp: number,
    type: number,
    user: string,
    userUid: string
}

const getPlural = (number: number) => {
    return number > 1 ? "s" : "";
}

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

function Feed({ userPerfilUid }: { userPerfilUid: string | null }){
    const { socket, usuarioLogado } = useGlobal();
    const [ posts, setPosts ] = useState<postsInterface[]>([]);
    const [ postToMenu, setPostToMenu ] = useState<postsInterface | null>(null);
    const [ pageFeed, setPageFeed ] = useState("list");

    const revertDeletedPostStatus = (id: number) => {
        socket.send("/posts", { operation: "revert_deleted_status", id }).then(result=>{
            if (result.result){
                setPostToMenu(null);
                setPosts(posts=>[...posts.map(post=>{ return {...post, deleted: post.id == id ? post.deleted! ^ 1 : post.deleted}})]);
            }
        });
    };

    const deletePostFromTrash = (id: number) => {
        socket.send("/posts", { operation: "delete_from_trash", id }).then(result=>{
            if (result.result){
                setPostToMenu(null);
                setPosts(posts=>[...posts.filter(post=>post.id != id)]);
            }
        });
    }

    useEffect(()=>{
        if (!usuarioLogado) return;
        if (userPerfilUid == "") return;

        async function teste(){
            const data = await socket.send("/feed", { perfil_uid: userPerfilUid, is_perfil_page: location.pathname.startsWith("/perfil") });
            setPosts(data.posts.map((doc:any)=>{const data = doc; return {...data, data: processData(data.timestamp), image: getDriveURL(data.image), logo: data.logo ? getDriveURL(data.logo) : avatar_src, user: data.name }}) as postsInterface[]);
        }
        teste();
    },[usuarioLogado, userPerfilUid]);

    return <div id="feed">
        {userPerfilUid && usuarioLogado!.uid == userPerfilUid ? <div id="feed-pages">
            <i onClick={()=>setPageFeed("list")} className={"fa-solid fa-table-cells" + (pageFeed == "list" ? " selected" : "")} style={{color: "#333"}}></i>
            <i onClick={()=>setPageFeed("trash")} className={"fa-solid fa-trash" + (pageFeed == "trash" ? " selected" : "")} style={{color: "red"}}></i>
            <i onClick={()=>setPageFeed("saveds")} className={"fa-regular fa-bookmark" + (pageFeed == "saveds" ? " selected" : "")} style={{color: "#333"}}></i>
        </div> : <></>}
        <div id="feed-list">{(pageFeed == "list" ? posts.filter(post=>!post.deleted || post.deleted == 0) : posts.filter(post=>post.deleted && post.deleted == 1)).map((post, index: number)=>{
            return <div className="post" key={index}>
                <div className="header-post">
                    <Link to={"/perfil?id="+post.userUid}><img className="logo" src={post.logo}></img></Link>
                    <Link to={"/perfil?id="+post.userUid} className="user">{post.user}</Link>
                    {userPerfilUid && usuarioLogado!.uid == userPerfilUid ? <i onClick={()=>setPostToMenu(post)} className="feed-menu-btn fa-solid fa-ellipsis-vertical"></i> : <></>}
                </div>
                <img className="image" src={post.image}/>
                <div className="footer-post">
                    <div className="post-info">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="bi bi-heart post-info-icon like" viewBox="0 0 16 16">
                            <path d="m8 2.748-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01zM8 15C-7.333 4.868 3.279-3.04 7.824 1.143q.09.083.176.171a3 3 0 0 1 .176-.17C12.72-3.042 23.333 4.867 8 15"/>
                        </svg>
                        <div className="post-info-value">0</div>
                        { post.saved ? <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="bi bi-bookmark-fill save-option" viewBox="0 0 16 16">
                            <path d="M2 2v13.5a.5.5 0 0 0 .74.439L8 13.069l5.26 2.87A.5.5 0 0 0 14 15.5V2a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2"/>
                        </svg>:
                        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="bi bi-bookmark save-option" viewBox="0 0 16 16" style={{color: "#333"}}>
                            <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1z"/>
                        </svg> }
                    </div>
                </div>
                <div className="text">{post.description}</div>
                <div className="data">{post.data}</div>
            </div>
        })}</div>
        { postToMenu ? <div id="feed-menu">
            <div id="feed-menu-container">
                <button
                    onClick={() => setPostToMenu(null)}
                    style={{
                        position: "relative",
                        fontSize: '20px',
                        width: '30px',
                        height: '30px',
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        marginLeft: "auto",
                        backgroundColor: '#15803d', // Adjusted to a darker green
                        color: '#fff',
                        fontWeight: '600',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s ease-in-out, transform 0.2s ease-in-out',
                        marginBottom:"10px"
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#166534'; // Darker on hover
                        e.currentTarget.style.transform = 'scale(1.02)'; // Slight scale on hover
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#15803d';
                        e.currentTarget.style.transform = 'scale(1)';
                    }}
                    onFocus={(e) => { // Added focus styles for accessibility
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(21, 128, 61, 0.5)'; // Ring on focus
                    }}
                    onBlur={(e) => {
                        e.currentTarget.style.boxShadow = 'none';
                    }}
                >
                    <i className="fa-solid fa-xmark" aria-hidden="true"></i>
                </button>
                <div onClick={() => revertDeletedPostStatus(postToMenu.id)}>{postToMenu.deleted == 1 ? "Recuperar post" : "Enviar para lixeira" }</div>
                {postToMenu.deleted == 1 ? <div onClick={() => deletePostFromTrash(postToMenu.id)}>Deletar post permanentemente</div> : <></> }
            </div>
        </div> : <></> }
    </div>
}

export default Feed;