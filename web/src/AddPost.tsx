import { useRef, useState } from "react";
import { useGlobal } from "./Global";
import "./AddPost.scss";
import no_image from "./assets/static/no-image.jpg";
import auth from "./Auth";
import { addDoc, collection } from "firebase/firestore";

function AddPost(){
    const { db, server, usuarioLogado } = useGlobal();

    const [ srcImage, setSrcImage ] = useState<string>(no_image);

    const refs = {
        file: useRef<HTMLInputElement>(null),
        description: useRef<HTMLInputElement>(null)
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
        if (!usuarioLogado) return;

        const file = refs.file.current!.files![0];
        const description = refs.description.current!.value;

        const timestamp = new Date().getTime();
        // "https://drive.google.com/uc?export=view&id="
        const formData = new FormData();
        formData.append("type", "upload");
        formData.append("timestamp", timestamp.toString());
        formData.append("file", file);
        auth.post(server + "/posts", formData).then(result=>{
            const post = {
                type: 0,
                userUid: usuarioLogado.uid,
                user: usuarioLogado.displayName || "",
                image: result.data.file_id,
                description,
                description_lower: description.toLowerCase(),
                timestamp,
            }
            addDoc(collection(db.current!, "posts"), post);
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
        <img id="img-view" src={srcImage}></img>
        <div id="label-description">Descrição:</div>
        <input ref={refs.description} id="description"></input>
        <div id="add-image" onClick={()=>refs.file.current!.click()}>Adicionar imagem</div>
        <input id="input-file" ref={refs.file} onChange={onFileChange} type="file" accept="image/jpeg"></input>
        <div id="btn-submit" onClick={submit}>Enviar</div>
    </div>
}

export default AddPost;