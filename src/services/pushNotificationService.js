const admin = require('firebase-admin');

let firebaseInitialized = false;

function initializeFirebase() {
  if (firebaseInitialized) return;

  try {
    // Para Vercel, usar variables de entorno
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        })
      });
      console.log('✅ Firebase Admin initialized with environment variables');
    } else {
      // Fallback: buscar archivo JSON local (solo para desarrollo)
      try {
        const serviceAccount = require('../../firebase-service-account.json');
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        console.log('✅ Firebase Admin initialized with service account file');
      } catch (err) {
        console.warn('⚠️ Firebase service account file not found. Push notifications will not work.');
        console.warn('⚠️ Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables.');
        return;
      }
    }

    firebaseInitialized = true;
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin:', error);
  }
}

// Inicializar al cargar el módulo
initializeFirebase();

async function sendToUser(userId, notification) {
  if (!firebaseInitialized) {
    console.warn('⚠️ Firebase not initialized. Cannot send notification.');
    return { success: false, message: 'Firebase not initialized' };
  }

  try {
    const User = require('../models/User');
    const user = await User.findById(userId);

    if (!user || !user.fcm_token) {
      console.log(`⚠️ User ${userId} has no FCM token`);
      return { success: false, message: 'User has no FCM token' };
    }

    const message = {
      token: user.fcm_token,
      notification: {
        title: notification.title,
        body: notification.body
      },
      data: notification.data || {},
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK'
        }
      }
    };

    const response = await admin.messaging().send(message);
    console.log(`✅ Notification sent to user ${userId}:`, response);
    return { success: true, response };

  } catch (error) {
    console.error(`❌ Error sending notification to user ${userId}:`, error);
    return { success: false, error: error.message };
  }
}

async function sendToTopic(topic, notification) {
  if (!firebaseInitialized) {
    console.warn('⚠️ Firebase not initialized. Cannot send notification.');
    return { success: false, message: 'Firebase not initialized' };
  }

  try {
    const message = {
      topic: topic,
      notification: {
        title: notification.title,
        body: notification.body
      },
      data: notification.data || {},
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK'
        }
      }
    };

    const response = await admin.messaging().send(message);
    console.log(`✅ Notification sent to topic "${topic}":`, response);
    return { success: true, response };

  } catch (error) {
    console.error(`❌ Error sending notification to topic "${topic}":`, error);
    return { success: false, error: error.message };
  }
}

async function sendToMultipleUsers(userIds, notification) {
  if (!firebaseInitialized) {
    console.warn('⚠️ Firebase not initialized. Cannot send notification.');
    return { success: false, message: 'Firebase not initialized' };
  }

  try {
    const User = require('../models/User');
    const users = await User.find({ _id: { $in: userIds } });

    const tokens = users
      .filter(user => user.fcm_token)
      .map(user => user.fcm_token);

    if (tokens.length === 0) {
      console.log('⚠️ No users with FCM tokens found');
      return { success: false, message: 'No users with FCM tokens' };
    }

    const message = {
      tokens: tokens,
      notification: {
        title: notification.title,
        body: notification.body
      },
      data: notification.data || {},
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK'
        }
      }
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`✅ Notifications sent to ${response.successCount} users`);

    if (response.failureCount > 0) {
      console.log(`⚠️ ${response.failureCount} notifications failed`);
    }

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount
    };

  } catch (error) {
    console.error('❌ Error sending notifications to multiple users:', error);
    return { success: false, error: error.message };
  }
}

async function sendToAll(notification) {
  return await sendToTopic('all', notification);
}

module.exports = {
  sendToUser,
  sendToTopic,
  sendToMultipleUsers,
  sendToAll
};
