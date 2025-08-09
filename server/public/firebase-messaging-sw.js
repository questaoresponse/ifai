// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');
firebase.initializeApp({
  apiKey: "AIzaSyAJPSCYXRziedHYjHQVky6cE1E_WRdFZsw",
  authDomain: "script-39a43.firebaseapp.com",
  projectId: "script-39a43",
  storageBucket: "script-39a43.firebasestorage.app",
  messagingSenderId: "29280693831",
  appId: "1:29280693831:web:3f8184059b57e783c1cb62",
  measurementId: "G-DXK7GQWZQF"
});

const messaging = firebase.messaging();

// Receber notificações em segundo plano
messaging.onBackgroundMessage(payload => {
  console.log('[firebase-messaging-sw.js] Background message:', payload);
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: '/icon.png',
    data: {
        url: payload.data.url
    }
  });
});

self.addEventListener('notificationclick', event => {
  event.notification.close(); // fecha a notificação

  // Abre uma janela/aba com a URL desejada
  console.log(event.notification.data)
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || 'https://ifai-phwn.onrender.com') // substitua pela URL que quiser
  );
});