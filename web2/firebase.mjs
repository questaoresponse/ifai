// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-analytics.js";
// Assuming 'db' is your initialized Firestore instance (from Step 4)


// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyAvNNK-q7THqR4lYo81Zxocfj-HvHRUvpU",
    authDomain: "ifai-f3877.firebaseapp.com",
    projectId: "ifai-f3877",
    storageBucket: "ifai-f3877.firebasestorage.app",
    messagingSenderId: "878877878697",
    appId: "1:878877878697:web:f0c1432c1c68fae90cfcb8",
    measurementId: "G-33K9QP3ZZ3"
};

const functions = [];
// Initialize Firebase
window.initializeFirebase = (fn) => {
    if(window.firebase){
        fn(window.firebase);
    } else {
        functions.push(fn);
    }
}
(async ()=>{
    window.firebase = await initializeApp(firebaseConfig);
    const analytics = getAnalytics(window.firebase);
    for (const fn of functions){
        fn(window.firebase);
    }
})();