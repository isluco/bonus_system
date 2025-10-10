const calculateNetSalary = (grossSalary, absences, lateArrivals, loanPayment = 0, bonuses = 0) => {
  const dailySalary = grossSalary / 30;
  const absencesDiscount = absences * dailySalary;
  
  // Después de 3 retardos se descuenta medio día
  const lateDiscount = Math.floor(lateArrivals / 3) * (dailySalary / 2);
  
  const netSalary = grossSalary - absencesDiscount - lateDiscount - loanPayment + bonuses;
  
  return {
    gross_salary: grossSalary,
    absences,
    absences_discount: absencesDiscount,
    late_arrivals: lateArrivals,
    late_discount: lateDiscount,
    loan_payment: loanPayment,
    bonuses,
    net_salary: Math.max(0, netSalary) // No puede ser negativo
  };
};

// Calcular ETA para tareas
const calculateETA = (tasks) => {
  const timePerTask = {
    change: 15, // minutos
    failure: 30,
    prize: 10,
    refill: 20,
    expense: 5
  };
  
  let totalMinutes = 0;
  tasks.forEach(task => {
    totalMinutes += timePerTask[task.type] || 15;
  });
  
  return totalMinutes;
};

// Calcular resultado final de local
const calculateLocalResult = (corteBruto, premios, gastosMoto, limpieza, servicios) => {
  return corteBruto - premios - gastosMoto - limpieza - servicios;
};

// Verificar si necesita servicio la moto
const needsService = (currentKm, lastServiceKm, serviceThresholdKm = 3000, warningKm = 100) => {
  const kmSinceService = currentKm - lastServiceKm;
  
  if (kmSinceService >= serviceThresholdKm + 200) {
    return { status: 'blocked', message: 'Servicio vencido. Bloqueo de tareas.' };
  } else if (kmSinceService >= serviceThresholdKm) {
    return { status: 'overdue', message: 'Servicio vencido' };
  } else if (kmSinceService >= (serviceThresholdKm - warningKm)) {
    return { status: 'warning', message: `Faltan ${serviceThresholdKm - kmSinceService} km para servicio` };
  }
  
  return { status: 'ok', message: 'Sin problemas' };
};

// Verificar tipo de asistencia según minutos de retraso
const checkAttendanceType = (minutesLate, lateToleranceMinutes = 15) => {
  if (minutesLate <= lateToleranceMinutes) {
    return 'present';
  } else if (minutesLate <= 30) {
    return 'late';
  } else {
    return 'absent';
  }
};

// Verificar si el fondo es suficiente
const isFundSufficient = (currentFund, minimumFund, requiredAmount) => {
  return (currentFund - requiredAmount) >= minimumFund;
};

module.exports = {
  calculateNetSalary,
  calculateETA,
  calculateLocalResult,
  needsService,
  checkAttendanceType,
  isFundSufficient
};