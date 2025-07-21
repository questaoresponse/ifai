import { useState, useEffect, useRef } from 'react';
import { getDriveURL } from './Functions';
import { getDatabase, ref as dbRef, update } from 'firebase/database';
import Header from './Header';
import { Link } from 'react-router-dom';
import { useGlobal } from './Global';
import "./Perfil.scss";
import avatar_src from "./assets/static/avatar.png";
import auth from './Auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import Feed from './Feed';

const cursos: { [key: string]: any } = {
    ISINF: "Integrado em Informática",
    ISSEG: "Integrado em Segurança do Trabalho",
    ISADM: "Integrado em Administração",
    ISMEC: "Integrado em mecânica",
    TADS: "Técnico em ADS",
    TSEG: "Técnico em Segurança do Trabalho",
    ISDEV: "Desenvolvedor",
    LOAD: ""
}

interface Perfil {
    email: string,
    id: string,
    matricula: string,
    nFriends: number,
    nome: string,
    password: string,
    timestamp: number,
    uid: string,
    fotoPerfil: string
    tipoUsuario: 'aluno' | 'professor'  
}

const Perfil = () => {
    const { db, server, usuarioLogado } = useGlobal();
    const [displayName, setDisplayName] = useState<string>('Carregando...');
    const [nFriends, setNFriends] = useState(0);
    const [avatarSrc, setAvatarSrc] = useState<string>(avatar_src);
    const [showRemovePhotoButton, setShowRemovePhotoButton] = useState<boolean>(false);
    const [currentUser, setCurrentUser] = useState<Perfil | null>(null);

    const refs = {
        avatar: useRef<HTMLImageElement>(null),
        fileInput: useRef<HTMLInputElement>(null),
        removePhotoBtn: useRef<HTMLButtonElement>(null)
    }

    function atualizarFotoPerfil(file: any) {
        const formData = new FormData();
        const timestamp =  new Date().getTime().toString();
        formData.append("type", "update");
        formData.append("timestamp", timestamp.toString());
        formData.append("file", file);
        formData.append("user_uid", usuarioLogado!.uid);

        auth.post(server + "/perfil", formData).then(result=>{
            // update(dbRef(getDatabase(), "usuarios/" + usuarioLogado!.uid), { fotoPerfil: result.data.file_id })
            //     .then(() => {
                    refs.avatar.current!.src = getDriveURL(result.data.file_id);
                    refs.removePhotoBtn.current!.style.display = "block"; 
            //     })
            //     .catch((error: any) => {
            //         console.error("Erro ao atualizar foto de perfil:", error);
            //     });
        });
    }

    useEffect(()=>{
        if (usuarioLogado){
            function getQueryParam(param: any) {
                const urlParams = new URLSearchParams(window.location.search);
                return urlParams.get(param);
            }

            function carregarPerfil(uid: string) {
                getDocs(query(collection(db.current!, "usuarios"), where("uid", "==", uid))).then(results=>{
                    if (results.size > 0){
                        const userData = results.docs[0].data() as Perfil;
                        setDisplayName(userData.nome || "Usuário");
                        setNFriends(userData.nFriends);
                        setCurrentUser({ ...userData, uid });

                        if (userData.fotoPerfil) {
                            setAvatarSrc(getDriveURL(userData.fotoPerfil));
                        } else {
                            setAvatarSrc(avatar_src);
                        }

                        if (usuarioLogado && usuarioLogado!.uid === uid) {
                            refs.avatar.current!.style.cursor = "pointer";

                            refs.removePhotoBtn.current!.addEventListener("click", removerFotoPerfil);

                            refs.removePhotoBtn.current!.style.display = userData.fotoPerfil ? "block" : "none"; 
                        } else {
                            refs.removePhotoBtn.current!.style.display = "none"; 
                        }
                    } else {
                        document.getElementById("profileName")!.textContent = "Usuário não encontrado";
                    }
                })
                .catch((error: any) => {
                    console.error("Erro ao buscar dados do usuário:", error);
                });
            }

            function removerFotoPerfil() {
                update(dbRef(getDatabase(), "usuarios/" + usuarioLogado!.uid), { fotoPerfil: null })
                .then(() => {
                    refs.avatar.current!.src = avatar_src;
                    refs.removePhotoBtn.current!.style.display = "none"; 
                })
                .catch((error: any) => {
                    console.error("Erro ao remover foto de perfil:", error);
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

    const handleEditIconClick = (): void => {
        const fileInput = document.getElementById('fileInput') as HTMLInputElement;
        if (fileInput) {
            fileInput.click();
        }
    };

    const handleFileChange = (event: any): void => {
        if (event.target.files && event.target.files[0] && usuarioLogado && usuarioLogado.uid === currentUser!.uid) {
            const file = event.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarSrc(reader.result as string);
                setShowRemovePhotoButton(true);
                atualizarFotoPerfil(file);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemovePhotoClick = (event: any): void => {
        event.preventDefault(); // Prevent any default button action
        setAvatarSrc(avatar_src); // Reset to default avatar
        setShowRemovePhotoButton(false); // Hide remove button
        const fileInput = document.getElementById('fileInput') as HTMLInputElement;
        if (fileInput) {
            fileInput.value = ""; // Clear the file input
        }
    };

    return <>
        <main id="perfil-page" className='page'>
            <section id="perfil">
                <div id="profile-content">
                    <div className="avatar-container">
                        <div className="avatar-wrapper">
                            <img 
                                onClick={() => usuarioLogado && currentUser && usuarioLogado.uid === currentUser.uid && refs.fileInput.current!.click()} 
                                src={avatarSrc} 
                                alt="Avatar do usuário" 
                                id="avatar" 
                                style={{ cursor: usuarioLogado && currentUser && usuarioLogado.uid === currentUser.uid ? 'pointer' : 'default' }}
                            />
                            {usuarioLogado && currentUser && usuarioLogado.uid === currentUser.uid && (
                                <div className="edit-icon" id="editIcon" onClick={handleEditIconClick} style={{ cursor: 'pointer' }}>
                                    <i className="fas fa-pencil-alt"></i>
                                </div>
                            )}
                            <div className="user-type-indicator">
                                {currentUser && (
                                    <>
                                        <div className="aluno-tag alunotag">
                                            <i className="fa-solid fa-user-graduate"></i>
                                            &nbsp;Aluno
                                        </div>
                                        <div className="aluno-tag">
                                            <i className="fa-solid fa-user"></i>
                                            &nbsp;{cursos[currentUser.matricula.split("111")[1].split("0")[0]]}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <div id="profile-info">
                        <span id="displayName">{displayName}</span>
                        <div id="n-divs">
                            <div id="n-friends">
                                <div className='value'>{nFriends}</div>
                                <div className='label'>Amigos</div>
                            </div>
                            <div id="n-comunitys">
                                <div className='value'>0</div>
                                <div className='label'>Comunidades</div>
                            </div>
                        </div>
                    </div>
                </div>

                {showRemovePhotoButton && (
                    <button
                        id="removePhotoBtn"
                        onClick={handleRemovePhotoClick}
                        style={{
                            marginTop: '10px',
                            backgroundColor: 'red',
                            color: 'white',
                            border: 'none',
                            padding: '5px 10px',
                            borderRadius: '5px',
                            cursor: 'pointer',
                        }}
                    >
                        Remover Foto
                    </button>
                )}
                <input
                    ref = {refs.fileInput}
                    type="file"
                    id="fileInput"
                    style={{ display: 'none' }}
                    accept="image/*"
                    onChange={handleFileChange}
                />
                <br />
                <Link to="/settings">
                    <i id="btn-menu" className="fa-solid fa-ellipsis-vertical"></i>
                </Link>
            </section>
            <Feed userPerfilUid={currentUser ? currentUser.uid : ""}></Feed>
        </main>
        <Header></Header>
    </>
};

export default Perfil;
