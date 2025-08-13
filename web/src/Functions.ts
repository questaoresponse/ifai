import { type User } from "firebase/auth";
import {  getDatabase, ref as dbRef, get, onValue, update, } from "firebase/database"
import { initializeApp } from "firebase/app"
import { type Messaging, getMessaging, getToken, onMessage } from "firebase/messaging";
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
let messaging: Messaging | null = null;
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
    messaging = getMessaging();
    navigator.serviceWorker.ready.then(registration => {
        function sendVisibilityStatus() {
            if (registration.active) {
            registration.active.postMessage({
                type: 'PAGE_VISIBILITY',
                visible: !document.hidden
            });
            }
        }

        sendVisibilityStatus();

        document.addEventListener('visibilitychange', () => {
            sendVisibilityStatus();
        });
    });

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

function formatTimeSegment(time: number): string {
    return time < 10 ? `0${String(time)}` : String(time);
}

function formatTimeBetweenMessages(date: Date) {
    const now = new Date();
    const diff = (now as any) - (date as any);
    const oneDay = 24 * 60 * 60 * 1000;

    const months = [
        "Janeiro",
        "Fevereiro",
        "Março",
        "Abril",
        "Maio",
        "Junho",
        "Julho",
        "Agosto",
        "Setembro",
        "Outubro",
        "Novembro",
        "Dezembro"
    ]
    
    const days = [
        "Segunda",
        "Terça",
        "Quarta",
        "Quinta",
        "Sexta",
        "Sábado",
        "Domingo",
    ];

    if (diff < oneDay && date.getDate() === now.getDate()) {
        return `Hoje`;
    } else if (diff < oneDay * 2 && date.getDate() === now.getDate() - 1) {
        return `Ontem`;
    } else if (diff < 7 * 24 * 60 * 60 * 1000) {
        return days[date.getDay()];
    } else {
        return `${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
    }
}

function formatMessageTime(date: Date) {
  return `${formatTimeSegment(date.getHours())}:${date.getMinutes().toString().padStart(2, "0")}`;
}

const setUser = (user: any) => {
    usuarioLogado = user;
}

const getDriveURL = (file_id: string) => {

  return `https://lh3.googleusercontent.com/u/0/d/${file_id}=w1366-h607-iv1?auditContext=forDisplay`;
}

export {
    messaging,
    getToken,
    onMessage,
    atualizarNotificacoesChat,
    initializeFirebase,
    marcarMensagensComoLidas,
    setUser,
    formatMessageTime,
    formatTimeBetweenMessages,
    getDriveURL
};