import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js"

window.initializeFirebase(_=>{
    document.getElementById('registerForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const nome = document.getElementById('regNome').value;
        const email = document.getElementById('regEmail').value;
        const senha = document.getElementById('regSenha').value;
        const identificador = 'ID-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

        createUserWithEmailAndPassword(getAuth(), email, senha)
        .then((userCredential) => {
            const user = userCredential.user;

            db = getFirestore();

            const docRef = doc(db, "usuarios", user);

            setDoc(docRef, {
                identificador,
                nome,
                email
            }).then(() => {
                window.location.href = "login.html";
            });
        });
    });
});