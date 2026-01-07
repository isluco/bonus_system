const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const Task = require('../models/Task');
const Expense = require('../models/Expense');
const Attendance = require('../models/Attendance');
const Payment = require('../models/Payment');
const Local = require('../models/Local');
const { auth, adminOnly } = require('../middlewares/auth');

// Reporte de asistencias (Excel)
router.get('/attendances', auth, adminOnly, async (req, res) => {
  try {
    const { start_date, end_date, user_id } = req.query;
    
    let query = {
      date: {
        $gte: new Date(start_date),
        $lte: new Date(end_date)
      }
    };

    if (user_id) query.user_id = user_id;

    const attendances = await Attendance.find(query)
      .populate('user_id', 'full_name employee_id')
      .sort({ date: -1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Asistencias');

    // Encabezados
    worksheet.columns = [
      { header: 'Fecha', key: 'date', width: 15 },
      { header: 'Empleado', key: 'employee', width: 30 },
      { header: 'ID Empleado', key: 'employee_id', width: 15 },
      { header: 'Tipo', key: 'type', width: 15 },
      { header: 'Entrada', key: 'check_in', width: 20 },
      { header: 'Salida', key: 'check_out', width: 20 },
      { header: 'Minutos tarde', key: 'minutes_late', width: 15 }
    ];

    // Datos
    attendances.forEach(att => {
      worksheet.addRow({
        date: att.date.toLocaleDateString(),
        employee: att.user_id.full_name,
        employee_id: att.user_id.employee_id,
        type: att.type,
        check_in: att.check_in ? att.check_in.toLocaleTimeString() : '-',
        check_out: att.check_out ? att.check_out.toLocaleTimeString() : '-',
        minutes_late: att.minutes_late || 0
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=asistencias.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reporte de cambios por local (Excel)
router.get('/changes-by-local', auth, adminOnly, async (req, res) => {
  try {
    const { start_date, end_date, local_id } = req.query;
    
    let query = {
      type: 'change',
      created_at: {
        $gte: new Date(start_date),
        $lte: new Date(end_date)
      }
    };

    if (local_id) query.local_id = local_id;

    const changes = await Task.find(query)
      .populate('local_id', 'name')
      .populate('assigned_to', 'full_name')
      .sort({ created_at: -1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Cambios por Local');

    worksheet.columns = [
      { header: 'Fecha', key: 'date', width: 20 },
      { header: 'Local', key: 'local', width: 25 },
      { header: 'Moto', key: 'moto', width: 25 },
      { header: 'Monedas $5', key: 'coins_5', width: 15 },
      { header: 'Monedas $10', key: 'coins_10', width: 15 },
      { header: 'Total', key: 'total', width: 15 },
      { header: 'Estado', key: 'status', width: 15 }
    ];

    changes.forEach(change => {
      worksheet.addRow({
        date: change.created_at.toLocaleString(),
        local: change.local_id.name,
        moto: change.assigned_to?.full_name || '-',
        coins_5: change.change_details?.coins_5 || 0,
        coins_10: change.change_details?.coins_10 || 0,
        total: change.change_details?.total || 0,
        status: change.status
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=cambios-por-local.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reporte de fallas (Excel)
router.get('/failures', auth, adminOnly, async (req, res) => {
  try {
    const { start_date, end_date, local_id } = req.query;
    
    let query = {
      type: 'failure',
      created_at: {
        $gte: new Date(start_date),
        $lte: new Date(end_date)
      }
    };

    if (local_id) query.local_id = local_id;

    const failures = await Task.find(query)
      .populate('local_id', 'name')
      .populate('machine_id', 'type folio')
      .populate('assigned_to', 'full_name')
      .sort({ created_at: -1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Fallas');

    worksheet.columns = [
      { header: 'Fecha', key: 'date', width: 20 },
      { header: 'Folio', key: 'folio', width: 15 },
      { header: 'Tipo Máquina', key: 'machine_type', width: 20 },
      { header: 'Local', key: 'local', width: 25 },
      { header: 'Código Error', key: 'error_code', width: 15 },
      { header: 'Descripción', key: 'description', width: 40 },
      { header: 'Estado', key: 'status', width: 15 }
    ];

    failures.forEach(failure => {
      worksheet.addRow({
        date: failure.created_at.toLocaleString(),
        folio: failure.machine_id?.folio || '-',
        machine_type: failure.machine_id?.type || '-',
        local: failure.local_id.name,
        error_code: failure.error_code,
        description: failure.error_description,
        status: failure.status
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=historial-fallas.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reporte de premios (Excel)
router.get('/prizes', auth, adminOnly, async (req, res) => {
  try {
    const { start_date, end_date, local_id } = req.query;
    
    let query = {
      type: 'prize',
      created_at: {
        $gte: new Date(start_date),
        $lte: new Date(end_date)
      }
    };

    if (local_id) query.local_id = local_id;

    const prizes = await Task.find(query)
      .populate('local_id', 'name')
      .populate('machine_id', 'type folio')
      .sort({ created_at: -1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Premios');

    worksheet.columns = [
      { header: 'Fecha', key: 'date', width: 20 },
      { header: 'Local', key: 'local', width: 25 },
      { header: 'Máquina', key: 'machine', width: 20 },
      { header: 'Cliente', key: 'client', width: 25 },
      { header: 'Monto', key: 'amount', width: 15 },
      { header: 'Fondo Inicial', key: 'initial_fund', width: 15 },
      { header: 'Fondo Final', key: 'final_fund', width: 15 }
    ];

    prizes.forEach(prize => {
      worksheet.addRow({
        date: prize.created_at.toLocaleString(),
        local: prize.local_id.name,
        machine: prize.machine_id ? `${prize.machine_id.type} - ${prize.machine_id.folio}` : '-',
        client: prize.client_name,
        amount: prize.amount,
        initial_fund: prize.initial_fund,
        final_fund: prize.final_fund
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=historial-premios.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reporte de gastos de moto (Excel)
router.get('/moto-expenses', auth, async (req, res) => {
  try {
    const { start_date, end_date, user_id } = req.query;
    
    let query = {
      created_at: {
        $gte: new Date(start_date),
        $lte: new Date(end_date)
      }
    };

    if (user_id) {
      query.user_id = user_id;
    } else if (req.user.role === 'moto') {
      query.user_id = req.userId;
    }

    const expenses = await Expense.find(query)
      .populate('user_id', 'full_name')
      .populate('local_id', 'name')
      .populate('approved_by', 'full_name')
      .sort({ created_at: -1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Gastos de Moto');

    worksheet.columns = [
      { header: 'Fecha', key: 'date', width: 20 },
      { header: 'Moto', key: 'moto', width: 25 },
      { header: 'Tipo', key: 'type', width: 15 },
      { header: 'Descripción', key: 'description', width: 30 },
      { header: 'Monto', key: 'amount', width: 15 },
      { header: 'Estado', key: 'status', width: 15 },
      { header: 'Validado por', key: 'approved_by', width: 25 }
    ];

    expenses.forEach(exp => {
      worksheet.addRow({
        date: exp.created_at.toLocaleString(),
        moto: exp.user_id.full_name,
        type: exp.type,
        description: exp.description,
        amount: exp.amount,
        status: exp.status,
        approved_by: exp.approved_by?.full_name || '-'
      });
    });

    // Total
    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    worksheet.addRow({});
    worksheet.addRow({
      date: 'TOTAL:',
      amount: total
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=gastos-moto.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reporte de resultados por local con periodos
router.get('/local-results/:localId', auth, async (req, res) => {
  try {
    const { localId } = req.params;
    const { period } = req.query; // 'week', 'month', 'year'

    const local = await Local.findById(localId);
    if (!local) {
      return res.status(404).json({ error: 'Local no encontrado' });
    }

    // Calcular fechas según el periodo
    const now = new Date();
    let startDate, endDate;

    switch (period) {
      case 'week':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        endDate = now;
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        endDate = now;
    }

    const dateQuery = {
      created_at: {
        $gte: startDate,
        $lte: endDate
      },
      local_id: localId
    };

    // INGRESOS - Corte bruto (suma de reportes de salida del local)
    const ExitReport = require('../models/ExitReport');
    const exitReports = await ExitReport.find({
      ...dateQuery,
      status: 'approved'
    });
    const corteBruto = exitReports.reduce((sum, r) => sum + (r.grand_total || 0), 0);

    // GASTOS - Premios
    const premios = await Task.find({
      ...dateQuery,
      type: 'prize'
    });
    const totalPremios = premios.reduce((sum, p) => sum + (p.amount || 0), 0);

    // GASTOS - Gastos de moto relacionados al local
    const gastosMoto = await Expense.find({
      ...dateQuery,
      type: { $in: ['gasoline', 'parts', 'wash', 'other'] },
      status: 'approved'
    });
    const totalGastosMoto = gastosMoto.reduce((sum, e) => sum + e.amount, 0);

    // GASTOS - Servicios fijos (Luz, Internet, Agua, Renta)
    const ServicePayment = require('../models/ServicePayment');
    const serviciosPagados = await ServicePayment.find({
      local_id: localId,
      paid_date: {
        $gte: startDate,
        $lte: endDate
      },
      status: 'paid'
    });
    const totalServicios = serviciosPagados.reduce((sum, s) => sum + s.amount, 0);

    // GASTOS - Limpieza y otros gastos del local
    const gastosLimpieza = await Expense.find({
      ...dateQuery,
      type: 'cleaning',
      status: 'approved'
    });
    const totalLimpieza = gastosLimpieza.reduce((sum, e) => sum + e.amount, 0);

    // Total de gastos
    const totalGastos = totalPremios + totalGastosMoto + totalServicios + totalLimpieza;

    // Resultado final
    const resultadoFinal = corteBruto - totalGastos;

    res.json({
      local: {
        id: local._id,
        name: local.name
      },
      periodo: {
        type: period || 'week',
        inicio: startDate.toISOString(),
        fin: endDate.toISOString()
      },
      corte_bruto: corteBruto,
      gastos: {
        premios: totalPremios,
        moto: totalGastosMoto,
        limpieza: totalLimpieza,
        servicios_fijos: totalServicios,
        total: totalGastos
      },
      resultado_final: resultadoFinal
    });
  } catch (error) {
    console.error('Error getting local results:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reporte consolidado
router.get('/consolidated', auth, adminOnly, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    const dateQuery = {
      created_at: {
        $gte: new Date(start_date),
        $lte: new Date(end_date)
      }
    };

    // Obtener todos los locales
    const locales = await Local.find({ status: 'active' });
    
    const results = [];
    let totalIngresos = 0;
    let totalGastos = 0;

    for (const local of locales) {
      // Corte bruto (simulado - debería venir de otra fuente)
      const corteBruto = local.current_fund - local.initial_fund;

      // Gastos
      const premios = await Task.find({
        ...dateQuery,
        local_id: local._id,
        type: 'prize'
      });
      const totalPremios = premios.reduce((sum, p) => sum + (p.amount || 0), 0);

      const gastosMoto = await Expense.find({
        ...dateQuery,
        local_id: local._id,
        status: 'approved'
      });
      const totalGastosMoto = gastosMoto.reduce((sum, e) => sum + e.amount, 0);

      // Servicios pagados
      const serviciosPagados = await Payment.find({
        ...dateQuery,
        local_id: local._id,
        type: 'service',
        status: 'paid'
      });
      const totalServicios = serviciosPagados.reduce((sum, p) => sum + p.amount, 0);

      const resultado = corteBruto - totalPremios - totalGastosMoto - totalServicios;

      results.push({
        local: local.name,
        corte_bruto: corteBruto,
        premios: totalPremios,
        gastos_moto: totalGastosMoto,
        servicios: totalServicios,
        resultado
      });

      totalIngresos += corteBruto;
      totalGastos += (totalPremios + totalGastosMoto + totalServicios);
    }

    res.json({
      periodo: `${new Date(start_date).toLocaleDateString()} - ${new Date(end_date).toLocaleDateString()}`,
      ingresos: totalIngresos,
      gastos: totalGastos,
      utilidad: totalIngresos - totalGastos,
      detalle_por_local: results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;