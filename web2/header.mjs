import { getAuth } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

window.initializeFirebase(firebase=>{

document.addEventListener("DOMContentLoaded", function () {
    fetch("header.html")
        .then(response => response.text())
        .then(data => {
            document.body.insertAdjacentHTML("afterbegin", data);

            const sidebar = document.getElementById('sidebar');
            const toggleButton = document.getElementById('toggleSidebar');
            const mainContent = document.querySelector('body');

            toggleButton.addEventListener('click', function() {

                sidebar.classList.toggle('collapsed');
                const btnTexts = document.querySelectorAll('#sidebar .btn-text');
                const buscarDiv = document.getElementById('buscar');

                if (sidebar.classList.contains('collapsed')) {

                    sidebar.style.width = '50px';
                    toggleButton.style.left = '60px';
                    mainContent.style.marginLeft = '60px';
                    btnTexts.forEach(el => el.style.display = 'none');
                    if (buscarDiv) {
                        buscarDiv.style.display = 'none';
                    }
                } else {

                    sidebar.style.width = '250px';
                    toggleButton.style.left = '260px';
                    mainContent.style.marginLeft = '260px';
                    btnTexts.forEach(el => el.style.display = 'inline');
                    if (buscarDiv) {
                        buscarDiv.style.display = 'flex';
                    }
                }
            });

            document.getElementById('logoutBtn').addEventListener('click', function(e) {
                e.preventDefault();
                getAuth().signOut().then(() => {
                    window.location.href = "login.html";
                });
            });
        })
        .catch(error => console.error("Erro ao carregar a barra lateral:", error));
});

function atualizarNotificacoesChat() {
    if (!window.usuarioLogado) return;

    const notificationBadge = document.getElementById("chatNotification");

    if (!notificationBadge) {
        console.error("Elemento chatNotification não encontrado!");
        return;
    }

    onValue(ref(getDatabase(), "chats"), snapshot => {
        let totalNaoLidas = 0;
        snapshot.forEach(chatSnap => {
            chatSnap.forEach(messageSnap => {
                const mensagem = messageSnap.val();
                if (mensagem.remetente !== window.usuarioLogado.uid && mensagem.lida === false) {
                    totalNaoLidas++;
                }
            });
        });

        if (totalNaoLidas > 0) {
            notificationBadge.textContent = totalNaoLidas > 99 ? "99+" : totalNaoLidas;
            notificationBadge.style.display = "inline";
        } else {
            notificationBadge.style.display = "none";
        }
    });
}

getAuth().onAuthStateChanged(function(user) {
    if (user) {
        window.usuarioLogado = user;
        window.carregarUsuarioAtual().then(() => {
            atualizarNotificacoesChat();
        });
    }
});

document.addEventListener("DOMContentLoaded", function() {
    setTimeout(atualizarNotificacoesChat, 2000); 
});

document.addEventListener("DOMContentLoaded", function(){
    const all = document.querySelector('body');
    all.style.marginLeft = '60px';
})

});