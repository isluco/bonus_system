const Payment = require('../models/Payment');
const Local = require('../models/Local');

/**
 * Generar pagos de servicios para el mes actual
 * Este job debe ejecutarse el día 1 de cada mes
 */
const generateMonthlyPayments = async () => {
  try {
    const now = new Date();
    const month = now.getMonth() + 1; // JavaScript months are 0-indexed
    const year = now.getFullYear();

    console.log(`[CRON] Generando pagos para ${month}/${year}...`);

    const locales = await Local.find({ status: 'active' });
    let paymentsCreated = 0;
    let errors = 0;

    for (const local of locales) {
      for (const [serviceType, serviceConfig] of Object.entries(local.services)) {
        if (!serviceConfig.active || !serviceConfig.amount || serviceConfig.amount <= 0) {
          continue;
        }

        // Verificar si ya existe un pago para este período
        const existingPayment = await Payment.findOne({
          local_id: local._id,
          service_type: serviceType,
          'period.month': month,
          'period.year': year
        });

        if (existingPayment) {
          continue;
        }

        // Calcular fecha de vencimiento
        let dueDate = new Date(year, month - 1, 1);

        if (serviceType === 'renta' && serviceConfig.payment_date) {
          dueDate.setDate(serviceConfig.payment_date);
        } else if (serviceConfig.cutoff_date) {
          dueDate.setDate(serviceConfig.cutoff_date);
        }

        try {
          const payment = new Payment({
            type: 'service',
            local_id: local._id,
            service_type: serviceType,
            amount: serviceConfig.amount,
            due_date: dueDate,
            period: { month, year },
            service_details: {
              account: serviceConfig.account || '',
              provider: serviceConfig.provider || '',
              cutoff_date: serviceConfig.cutoff_date || serviceConfig.payment_date
            },
            status: 'pending'
          });

          await payment.save();
          paymentsCreated++;
        } catch (error) {
          console.error(`[CRON] Error creando pago para ${local.name} - ${serviceType}:`, error.message);
          errors++;
        }
      }
    }

    console.log(`[CRON] Pagos generados: ${paymentsCreated}, Errores: ${errors}`);
    return { paymentsCreated, errors };
  } catch (error) {
    console.error('[CRON] Error en generateMonthlyPayments:', error);
    throw error;
  }
};

/**
 * Actualizar el estado de pagos vencidos
 * Este job debe ejecutarse diariamente
 */
const updateOverduePayments = async () => {
  try {
    console.log('[CRON] Actualizando pagos vencidos...');

    const result = await Payment.updateOverduePayments();

    console.log(`[CRON] Pagos actualizados a vencidos: ${result.modifiedCount}`);
    return result;
  } catch (error) {
    console.error('[CRON] Error en updateOverduePayments:', error);
    throw error;
  }
};

/**
 * Enviar recordatorios de pagos próximos a vencer
 * Este job debe ejecutarse diariamente
 */
const sendPaymentReminders = async () => {
  try {
    console.log('[CRON] Buscando pagos próximos a vencer...');

    const today = new Date();
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const upcomingPayments = await Payment.find({
      status: 'pending',
      due_date: {
        $gte: today,
        $lte: threeDaysFromNow
      }
    })
    .populate('local_id', 'name assigned_user_id')
    .populate({
      path: 'local_id',
      populate: {
        path: 'assigned_user_id',
        select: 'full_name email phone'
      }
    });

    console.log(`[CRON] Pagos próximos a vencer: ${upcomingPayments.length}`);

    // TODO: Implementar envío de notificaciones
    // Por ahora solo registramos en consola
    for (const payment of upcomingPayments) {
      const daysUntilDue = Math.ceil((payment.due_date - today) / (1000 * 60 * 60 * 24));
      console.log(`[CRON] Recordatorio: ${payment.local_id?.name} - ${payment.service_type} - Vence en ${daysUntilDue} días`);
    }

    return { reminders: upcomingPayments.length };
  } catch (error) {
    console.error('[CRON] Error en sendPaymentReminders:', error);
    throw error;
  }
};

module.exports = {
  generateMonthlyPayments,
  updateOverduePayments,
  sendPaymentReminders
};
