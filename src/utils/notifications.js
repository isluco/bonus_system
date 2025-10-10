const Notification = require('../models/Notification');

const createNotification = async (userId, type, title, message, relatedEntity = {}, priority = 'normal') => {
  try {
    await Notification.create({
      user_id: userId,
      type,
      title,
      message,
      related_entity_type: relatedEntity.type,
      related_entity_id: relatedEntity.id,
      priority
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

const notifyPanicButton = async (localId, location, photoUrl) => {
  const User = require('../models/User');
  const admins = await User.find({ role: 'admin', is_active: true });
  
  for (const admin of admins) {
    await createNotification(
      admin._id,
      'panic',
      '🚨 BOTÓN DE PÁNICO ACTIVADO',
      `Alerta de pánico en local. Ubicación: ${location}`,
      { type: 'local', id: localId },
      'urgent'
    );
  }
};

const notifyTaskAssigned = async (motoUserId, taskId, taskType) => {
  await createNotification(
    motoUserId,
    'task',
    'Nueva tarea asignada',
    `Se te ha asignado una tarea de tipo: ${taskType}`,
    { type: 'task', id: taskId },
    'high'
  );
};

const notifyPaymentDue = async (userId, paymentType, amount, daysLeft) => {
  await createNotification(
    userId,
    'payment',
    'Pago próximo a vencer',
    `El pago de ${paymentType} por ${amount} vence en ${daysLeft} días`,
    { type: 'payment', id: null },
    'normal'
  );
};

const notifyLowFund = async (adminUserId, localId, currentFund, minimumFund) => {
  await createNotification(
    adminUserId,
    'alert',
    'Fondo bajo en local',
    `El local tiene un fondo de ${currentFund}, debajo del mínimo de ${minimumFund}`,
    { type: 'local', id: localId },
    'high'
  );
};

module.exports = {
  createNotification,
  notifyPanicButton,
  notifyTaskAssigned,
  notifyPaymentDue,
  notifyLowFund
};