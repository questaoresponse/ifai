import { type User } from "firebase/auth";
import {  getDatabase, ref as dbRef, get, onValue, update, } from "firebase/database"
import { initializeApp } from "firebase/app"
// import { getAnalytics } from "firebase/analytics";
import { Firestore, getFirestore } from "firebase/firestore";

declare global {
  interface Window {
    usuarioLogado: any,
    typingTimeout: any,
    navigate: any,
  }
}

let usuarioLogado: User | null = null;

// Assuming 'db' is your initialized Firestore instance (from Step 4)


// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

// const firebaseConfig = {
//     apiKey: "AIzaSyBuxQ5I2eYLq0VtYSItTv-I4C4wMQpGx3g",
//     authDomain: "hertsocial-8d76f.firebaseapp.com",
//     databaseURL: "https://hertsocial-8d76f-default-rtdb.firebaseio.com",
//     projectId: "hertsocial-8d76f",
//     storageBucket: "hertsocial-8d76f.appspot.com",
//     messagingSenderId: "211037763102",
//     appId: "1:211037763102:web:e2163a705f3b03b728200f",
// };

const firebaseConfig = {
  apiKey: "AIzaSyAJPSCYXRziedHYjHQVky6cE1E_WRdFZsw",
  authDomain: "script-39a43.firebaseapp.com",
  projectId: "script-39a43",
  storageBucket: "script-39a43.firebasestorage.app",
  messagingSenderId: "29280693831",
  appId: "1:29280693831:web:3f8184059b57e783c1cb62",
  measurementId: "G-DXK7GQWZQF"
};

const functions: any[] = [];
let firebase: any = null;
let db: Firestore | null = null;
// Initialize Firebase
const initializeFirebase = (fn: any) => {
    if(firebase){
        fn(db);
    } else {
        functions.push(fn);
    }
}
(async ()=>{
    firebase = await initializeApp(firebaseConfig);
    db = getFirestore();
    // const analytics = getAnalytics(firebase);
    for (const fn of functions){
        fn(db);
    }
})();

const atualizarNotificacoesChat = () => {
    if (!window.usuarioLogado) return;

    const notificationBadge = document.getElementById("chatNotification");

    if (!notificationBadge) {
        console.error("Elemento chatNotification não encontrado!");
        return;
    }

    onValue(dbRef(getDatabase(), "chats"), snapshot => {
        let totalNaoLidas = 0;
        snapshot.forEach(chatSnap => {
            chatSnap.forEach(messageSnap => {
                const mensagem = messageSnap.val();
                if (mensagem.remetente !== usuarioLogado!.uid && mensagem.lida === false) {
                    totalNaoLidas++;
                }
            });
        });

        if (totalNaoLidas > 0) {
            notificationBadge.textContent = totalNaoLidas > 99 ? "99+" : String(totalNaoLidas);
            notificationBadge.style.display = "inline";
        } else {
            notificationBadge.style.display = "none";
        }
    });
}

function marcarMensagensComoLidas(chatId: any) {
  if (!window.usuarioLogado || !chatId) return;

  get(dbRef(getDatabase(),`chats/${chatId}`)).then((snapshot) => {
      let updates: {[key: string]: any} = {};
      snapshot.forEach((childSnapshot) => {
        const mensagem = childSnapshot.val();
        if (
          mensagem.lida === false &&
          mensagem.remetente !== usuarioLogado!.uid
        ) {
          updates[childSnapshot.key + "/lida"] = true;
        }
      });
        if (Object.keys(updates).length > 0) {
            update(dbRef(getDatabase(), `chats/${chatId}`), updates).then(() => {
                atualizarNotificacoesChat();
            });
        }
    });
}

function formatTimestamp(date: Date) {
  const now = new Date();
  const diff = (now as any) - (date as any);
  const oneDay = 24 * 60 * 60 * 1000;
  const oneMinute = 60 * 1000;

  if (diff < oneMinute) {
    return "Agora";
  } else if (diff < oneDay && date.getDate() === now.getDate()) {
    return `Hoje às ${date.getHours()}:${date.getMinutes().toString().padStart(2, "0")}`;
  } else if (diff < oneDay * 2 && date.getDate() === now.getDate() - 1) {
    return `Ontem às ${date.getHours()}:${date.getMinutes().toString().padStart(2, "0")}`;
  } else {
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} às ${date.getHours()}:${date.getMinutes().toString().padStart(2, "0")}`;
  }
}

function formatTime(date: Date) {
  return `${date.getHours()}:${date.getMinutes().toString().padStart(2, "0")}`;
}

const setUser = (user: any) => {
    usuarioLogado = user;
}

const getDriveURL = (file_id: string) => {
  return `https://www.googleapis.com/drive/v3/files/${file_id}/export`;
}

export {
    atualizarNotificacoesChat,
    initializeFirebase,
    marcarMensagensComoLidas,
    setUser,
    formatTime,
    formatTimestamp,
    getDriveURL
};