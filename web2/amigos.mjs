import { getAuth } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";

window.initializeFirebase(_=>{ 

getAuth().onAuthStateChanged(function(user) {
        if (user) {
                window.carregarUsuarioAtual().then(() => {
                window.atualizarFriendSelect();
                window.carregarAmigos();
            });
        } else {
                window.location.href = "login.html";
        }
});

document.getElementById('logoutBtn').addEventListener('click', function(e) {
    e.preventDefault();
    getAuth().signOut().then(() => {
        window.location.href = "login.html";
    });
});

});