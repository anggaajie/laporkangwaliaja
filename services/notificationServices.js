// services/notificationServices.js
import * as Notifications from 'expo-notifications';
import { collection, doc, getDoc, setDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebaseConfig';
import axios from 'axios';

export async function registerForPushNotificationsAsync(userId) {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    alert('Failed to get push token for push notification!');
    return;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  await setDoc(doc(db, 'tokens', userId), { token: tokenData.data });
}

export async function sendPushNotification(messageText) {
  const q = query(collection(db, 'users'), where('role', '==', 'admin'));
  const snapshot = await getDocs(q);

  for (const docSnap of snapshot.docs) {
    const adminId = docSnap.id;
    const tokenDoc = await getDoc(doc(db, 'tokens', adminId));
    const token = tokenDoc.exists() ? tokenDoc.data().token : null;

    if (token) {
      await axios.post('https://exp.host/--/api/v2/push/send', {
        to: token,
        sound: 'default',
        title: 'Pesan Baru Masuk',
        body: messageText,
      }, {
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
      });
    }
  }
}