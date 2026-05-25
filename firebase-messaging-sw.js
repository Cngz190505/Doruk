// firebase-messaging-sw.js
// Firebase Cloud Messaging Service Worker — Doruk App

importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCZk-OgjuuO8t4SNary0L2C8WyhyC8IWMA',
  authDomain: 'doruk-sohbet.firebaseapp.com',
  databaseURL: 'https://doruk-sohbet-default-rtdb.firebaseio.com',
  projectId: 'doruk-sohbet',
  storageBucket: 'doruk-sohbet.firebasestorage.app',
  messagingSenderId: '155992007314',
  appId: '1:155992007314:web:3d7f16edd31774f60f3c4b'
});

var messaging = firebase.messaging();

// Arka planda gelen push mesajlarını göster
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Arka plan mesajı alındı:', payload);

  var title = (payload.notification && payload.notification.title) || '🔔 Fiyat Alarmı';
  var body  = (payload.notification && payload.notification.body)  || '';
  var icon  = (payload.notification && payload.notification.icon)  || '/icons/icon-192.png';

  return self.registration.showNotification(title, {
    body:  body,
    icon:  icon,
    badge: '/icons/icon-72.png',
    vibrate: [200, 100, 200],
    tag: 'doruk-price-alarm',
    renotify: true,
    data: payload.data || {}
  });
});

// Bildirime tıklanınca uygulamayı aç / öne getir
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].url && 'focus' in list[i]) return list[i].focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});
