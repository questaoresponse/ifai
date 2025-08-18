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

let isPageVisible = false;

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'PAGE_VISIBILITY') {
    isPageVisible = event.data.visible;
  }
});

messaging.onBackgroundMessage(payload => {
  self.registration.getNotifications({ tag: payload.data.title }).then(notifications => {
    for (const notification of notifications) {
      console.log(notification);
      // notification.close();
    }
  });

  if (isPageVisible) return;

  self.registration.showNotification(payload.data.title, {
    body: payload.data.body,
    icon: '/icon.png',
    data: {
        url: payload.data.url
    },
    tag: payload.data.title,
    renotify: true
  });
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data?.url || 'https://ifai.eneagonlosamigos.workers.dev')
  );
});