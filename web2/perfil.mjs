document.addEventListener("DOMContentLoaded", function () {
    let usuarioAtual = null;
    const avatar = document.getElementById("avatar");
    const fileInput = document.getElementById("fileInput");
    const removePhotoBtn = document.getElementById("removePhotoBtn");
    const defaultAvatar = "static/avatar.png"; 

    function getQueryParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }

    function carregarPerfil(uid) {
    firebase.database().ref("usuarios/" + uid).once("value")
        .then(snapshot => {
    if (snapshot.exists()) {
    let userData = snapshot.val();
    document.getElementById("profileName").textContent = userData.nome || "Usuário";
    document.getElementById("displayName").textContent = userData.nome || "Usuário";
    document.getElementById("displayId").textContent = userData.identificador || "ID não disponível";
    document.getElementById("displayUID").textContent = uid || "UID não disponível";

    if (userData.fotoPerfil) {
        avatar.src = userData.fotoPerfil;
    } else {
        avatar.src = defaultAvatar;
    }

    if (usuarioAtual && usuarioAtual.uid === uid) {
        avatar.style.cursor = "pointer";
        avatar.addEventListener("click", () => fileInput.click());

        fileInput.addEventListener("change", function () {
        const file = fileInput.files[0];
        if (file) {
            atualizarFotoPerfil(file);
        }
        });

        removePhotoBtn.addEventListener("click", removerFotoPerfil);

        removePhotoBtn.style.display = userData.fotoPerfil ? "block" : "none"; 
    } else {
        removePhotoBtn.style.display = "none"; 
    }
    } else {
    document.getElementById("profileName").textContent = "Usuário não encontrado";
    }
        })
        .catch(error => {
    console.error("Erro ao buscar dados do usuário:", error);
        });
    }

    function atualizarFotoPerfil(file) {
        const storageRef = firebase.storage().ref("avatars/" + usuarioAtual.uid);
        const uploadTask = storageRef.put(file);

        uploadTask.on("state_changed",
        snapshot => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log("Upload em andamento: " + progress + "%");
        },
        error => {
            console.error("Erro no upload da imagem:", error);
        },
        () => {
            uploadTask.snapshot.ref.getDownloadURL().then(downloadURL => {

            firebase.database().ref("usuarios/" + usuarioAtual.uid).update({ fotoPerfil: downloadURL })
                .then(() => {
                avatar.src = downloadURL;
                removePhotoBtn.style.display = "block"; 
                })
                .catch(error => {
                console.error("Erro ao atualizar foto de perfil:", error);
                });
            });
        }
        );
    }

    function removerFotoPerfil() {
        firebase.database().ref("usuarios/" + usuarioAtual.uid).update({ fotoPerfil: null })
        .then(() => {
            avatar.src = defaultAvatar;
            removePhotoBtn.style.display = "none"; 
        })
        .catch(error => {
            console.error("Erro ao remover foto de perfil:", error);
        });
    }

    const userIdFromURL = getQueryParam("id");

    firebase.auth().onAuthStateChanged(user => {
        if (user) {
        usuarioAtual = user;
        if (userIdFromURL) {
            carregarPerfil(userIdFromURL);
        } else {
            carregarPerfil(user.uid);
        }
        } else {
        window.location.href = "login.html";
        }
    });
    });