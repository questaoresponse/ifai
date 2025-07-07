import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js"

window.initializeFirebase(rebase=>{
    document.getElementById('loginForm').addEventListener('submit', function(e) {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value;
      const senha = document.getElementById('loginSenha').value;

      signInWithEmailAndPassword(getAuth(), email, senha)
      .then(() => {
        window.location.href = "index.html";
      })
      .catch((error) => {
        alert('Erro no login: ' + error.message);
      });
    });

});