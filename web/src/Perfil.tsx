import { useState, useEffect, useRef } from 'react';
import { getDriveURL } from './Functions';
import Header from './Header';
import { Link, useNavigate } from 'react-router-dom';
import { useGlobal } from './Global';
import "./Perfil.scss";
import avatar_src from "./assets/static/avatar.png";
import auth from './Auth';
import Feed from './Feed';

enum Cursos {
    ISINF = "Integrado em Informática",
    ISSEG = "Integrado em Segurança do Trabalho",
    ISADM = "Integrado em Administração",
    ISMEC = "Integrado em Mecânica",
    ISL = "Técnico em Logística",
    TADS = "Técnico em ADS",
    TSEG = "Técnico em Segurança do Trabalho",
    ISDEV = "Desenvolvedor",
    LOAD = ""
}

enum TypeUser {
    aluno = 0,
    professor = 1
}

interface Description {
    text?: string
}

interface Perfil {
    curso: Cursos,
    description: Description,
    matricula: string,
    name: string,
    nFriends: number,
    logo: string,
    typeUser: TypeUser,
    uid: string,
}

const Perfil = () => {
    const { socket, worker_server, usuarioLogado } = useGlobal();
    const [perfil, setPerfil ] = useState<Perfil>({ curso: Cursos.LOAD, description: {}, name: "", nFriends: 0, logo: avatar_src, typeUser: TypeUser.aluno, uid: "", matricula: "" });
    const [editingPerfil, setEditingPerfil] = useState(false);
    const previousLogoContent = useRef<string>(avatar_src);
    const previousDescriptionValue = useRef<Description>({});

    const navigate = useNavigate();

    const refs = {
        avatar: useRef<HTMLImageElement>(null),
        fileInput: useRef<HTMLInputElement>(null),
        removePhotoBtn: useRef<HTMLButtonElement>(null),
        description: useRef<HTMLDivElement>(null),
    }

    const goToChat = () => {
        if (usuarioLogado!.uid != perfil!.uid){
            socket.send("/chat", { operation: "go_to_chat", user_to_navigate_chat: perfil!.uid }).then(result=>{
                if (result.result){
                    navigate(`/chat/${result.chat_id}`);
                }
            });
        } else {
            navigate("/chats");
        }
    }

    const handleEditIconClick = (): void => {
        const fileInput = document.getElementById('fileInput') as HTMLInputElement;
        if (fileInput) {
            fileInput.click();
        }
    };

    const handleFileChange = (event: any): void => {
        if (event.target.files && event.target.files[0] && usuarioLogado && usuarioLogado.uid === perfil!.uid) {
            const file = event.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                if (!editingPerfil){
                    previousLogoContent.current = reader.result as string;
                }

                setPerfil(perfil=>{ return {...perfil, logo: reader.result as string}});
            };
            reader.readAsDataURL(file);
            
        }
    };

    const savePerfilChanges = () => {
        const formData = new FormData();
        
        if (previousLogoContent.current != perfil.logo){
            if (refs.fileInput.current!.files!.length > 0){
                formData.append("file", refs.fileInput.current!.files![0]);
                formData.append("operation", "add-file");
            } else {
                formData.append("operation", "remove-file");
            }
        } else {
            formData.append("operation", "update-only-description");
        }
        const description = {
            text: refs.description.current!.innerText
        }
        formData.append("description", description.text || "");

        previousLogoContent.current = perfil.logo;
        previousDescriptionValue.current = description;

        auth.post(worker_server + "/perfil", formData).then(result=>{
            if (result.data.result){
                setEditingPerfil(false);
                
                if (result.data.file_id){
                    refs.avatar.current!.src = getDriveURL(result.data.file_id);
                }
            }
        });
    }

    const cancelEditingPerfil = () => {
        setEditingPerfil(false);
        refs.description.current!.innerText = perfil.description.text || "";
        // if (previousLogoContent.currentFile.){
        //     const dataTransfer = new DataTransfer()
        //     dataTransfer.items.add(previousFile.current! as File)

        //     refs.fileInput.current!.files = dataTransfer.files;
        // } else {
        // }
        setPerfil(perfil=>{ return {...perfil, description: previousDescriptionValue.current, logo: previousLogoContent.current! }});
    }

    const removerFotoPerfil = () => {
        setPerfil(perfil=>{ return {...perfil, logo: avatar_src}});
        const fileInput = document.getElementById('fileInput') as HTMLInputElement;
        if (fileInput) {
            fileInput.value = ""; // Clear the file input
        }

    }

    useEffect(()=>{
        if (usuarioLogado){
            function getQueryParam(param: any) {
                const urlParams = new URLSearchParams(window.location.search);
                return urlParams.get(param);
            }

            function carregarPerfil(uid: string) {
                socket.send("/perfil", { uid }).then(result=>{
                    if (result.result){
                        const userData = result.perfil;
                        const description =  JSON.parse(userData.description);
                        description.text = "";
                        const perfil = {
                            curso: Cursos[userData.matricula.split("111")[1].split("0")[0] as keyof typeof Cursos],
                            description: description,
                            matricula: userData.matricula,
                            name: userData.name || "Usuário",
                            nFriends: userData.nFriends,
                            logo: userData.logo ? getDriveURL(userData.logo) : avatar_src,
                            typeUser: TypeUser.aluno,
                            uid: userData.uid
                        }
                        setPerfil(perfil);
                        refs.description.current!.innerText = perfil.description.text;
                        previousLogoContent.current = perfil.logo;
                        previousDescriptionValue.current = perfil.description;
                    }
                })
                .catch((error: any) => {
                    console.error("Erro ao buscar dados do usuário:", error);
                });
            }

            const userIdFromURL = getQueryParam("id");
            if (userIdFromURL) {
                carregarPerfil(userIdFromURL);
            } else {
                carregarPerfil(usuarioLogado.uid);
            }
        }
    }, [usuarioLogado]);

    return <>
        <main id="perfil-page" className='page'>
            <section id="perfil">
                <Link to="/settings">
                    <i id="btn-menu" className="fa-solid fa-ellipsis-vertical"></i>
                </Link>
                <div id="profile-content">
                    <div className="avatar-container">
                        <div className="avatar-wrapper">
                            <img 
                                onClick={() => usuarioLogado && perfil && usuarioLogado.uid === perfil.uid && refs.fileInput.current!.click()} 
                                src={perfil.logo} 
                                alt="Avatar do usuário" 
                                id="avatar" 
                            />
                            {editingPerfil && usuarioLogado!.uid === perfil.uid && <div id="edit-logo-btns-div">
                                <div className="edit-icon" id="editIcon" onClick={handleEditIconClick} style={{ cursor: 'pointer' }}>
                                    <i className="fas fa-pencil-alt"></i>
                                </div>
                                { perfil.logo != avatar_src ? <i id="removeLogoBtn" onClick={removerFotoPerfil} className="fa-solid fa-xmark" aria-hidden="true"></i> : <></> }
                            </div>}
                        </div>
                    </div>
                    <div id="profile-info">
                        <span id="displayName">{perfil.name}</span>
                        <div id="n-divs">
                            <div id="n-friends">
                                <div className='value'>{perfil.nFriends}</div>
                                <div className='label'>Amigos</div>
                            </div>
                            <div id="n-comunitys">
                                <div className='value'>0</div>
                                <div className='label'>Comunidades</div>
                            </div>
                        </div>
                    </div>
                </div>
                <input
                    ref = {refs.fileInput}
                    type="file"
                    id="fileInput"
                    style={{ display: 'none' }}
                    accept="image/*"
                    onChange={handleFileChange}
                />
                <div ref={refs.description} id="description" className={editingPerfil ? "editable" : ""} contentEditable={editingPerfil}></div>
                <div className="user-type-indicator">
                    {perfil && (
                        <>
                            <div className="aluno-tag alunotag">
                                <i className="fa-solid fa-user-graduate"></i>
                                &nbsp;Aluno
                            </div>
                            <div className="aluno-tag">
                                <i className="fa-solid fa-user"></i>
                                <div>&nbsp;{perfil.curso}</div>
                            </div>
                            <div id="go-to-chat" className='aluno-tag' onClick={goToChat}>
                                <i className="fa-solid fa-message"></i>
                                &nbsp;Mensagem
                            </div>
                        </>
                    )}
                </div>
                { usuarioLogado!.uid == perfil.uid ? editingPerfil ? <div id='edit-perfil-btns-div'>
                    <div id='save-edit-perfil' className='edit-perfil-btns' onClick={savePerfilChanges}>Salvar</div>
                    <div id='cancel-edit-perfil' className='edit-perfil-btns' onClick={cancelEditingPerfil}>Cancelar</div>
                </div>:
                <div id='edit-perfil' className='edit-perfil-btns' onClick={()=>setEditingPerfil(true)}>Editar perfil</div>:
                <></> }
            </section>
            <Feed userPerfilUid={perfil ? perfil.uid : ""}></Feed>
        </main>
        <Header></Header>
    </>
};

export default Perfil;
