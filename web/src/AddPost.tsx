import { useRef, useState } from "react";
import { useGlobal } from "./Global";
import "./AddPost.scss";
import no_image from "./assets/static/no-image.jpg";
import auth from "./Auth";
import { useNavigate } from "react-router-dom";

function AddPost(){
    const { worker_server, usuarioLogado } = useGlobal();
    const navigate = useNavigate();

    const [ srcImage, setSrcImage ] = useState<string>(no_image);
    const [ waitingSend, setWaitingSend ] = useState(false);

    const refs = {
        file: useRef<HTMLInputElement>(null),
        description: useRef<HTMLDivElement>(null)
    }

    const onFileChange = () => {
        const file = refs.file.current!.files![0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
            if (typeof e.target!.result !== "string") return;

            setSrcImage(e.target!.result);
        }

        reader.readAsDataURL(file);
    }

    const submit = () => {
        if (waitingSend) return;
        if (!usuarioLogado) return;

        const file = refs.file.current!.files![0];
        const description = refs.description.current!.innerText;

        // "https://drive.google.com/uc?export=view&id="
        const formData = new FormData();
        formData.append("description", description);
        formData.append("file", file);
        setWaitingSend(true);
        auth.post(worker_server + "/posts", formData).then(result=>{
            if (result.data.result){
                navigate("/perfil");
            }
            setWaitingSend(false);
        });
        // uploadBytes(storageRef(getStorage(), `${postUid}/${file.name}`), file)
        //     .then(snapshot=>getDownloadURL(snapshot.ref))
        //     .then(image=>{
        //         const post = {
        //             type: 0,
        //             userUid: usuarioLogado.uid,
        //             user: usuarioLogado.displayName || "",
        //             image,
        //             description,
        //             date,
        //         }
        //         const updates = { postUid: post };
        //         update(dbRef(getDatabase()), updates);
        //     });
    }

    return <div id="add-post" className="page">
        <div id="post-container">
            <div id="img-container">
                <img id="img-view" src={srcImage}></img>
                <i onClick={()=>refs.file.current!.click()} className="fas fa-pencil-alt"></i>
            </div>
            <div aria-multiline={true} ref={refs.description} id="description" contentEditable={true}></div>
            <input id="input-file" ref={refs.file} onChange={onFileChange} type="file" accept="image/jpeg"></input>
        </div>
        <div id="btn-submit" onClick={submit}  style={{opacity: waitingSend ? 0.5 : 1}}>Enviar</div>
    </div>
}

export default AddPost;