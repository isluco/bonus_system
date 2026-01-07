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

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'Se requieren start_date y end_date' });
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    endDate.setHours(23, 59, 59, 999); // Incluir todo el día final

    // Obtener todos los locales activos
    const locales = await Local.find({ status: 'active' });

    const ExitReport = require('../models/ExitReport');
    const ServicePayment = require('../models/ServicePayment');

    const results = [];
    let totalIngresos = 0;
    let totalGastos = 0;

    for (const local of locales) {
      // INGRESOS - Corte bruto desde ExitReport (reportes de salida aprobados)
      const exitReports = await ExitReport.find({
        local_id: local._id,
        created_at: { $gte: startDate, $lte: endDate },
        status: 'approved'
      });
      const corteBruto = exitReports.reduce((sum, r) => sum + (r.grand_total || 0), 0);

      // GASTOS - Premios
      const premios = await Task.find({
        local_id: local._id,
        created_at: { $gte: startDate, $lte: endDate },
        type: 'prize'
      });
      const totalPremios = premios.reduce((sum, p) => sum + (p.amount || 0), 0);

      // GASTOS - Gastos de moto relacionados al local
      const gastosMoto = await Expense.find({
        local_id: local._id,
        created_at: { $gte: startDate, $lte: endDate },
        status: 'approved'
      });
      const totalGastosMoto = gastosMoto.reduce((sum, e) => sum + (e.amount || 0), 0);

      // GASTOS - Servicios fijos (Luz, Internet, Agua, Renta)
      const serviciosPagados = await ServicePayment.find({
        local_id: local._id,
        paid_date: { $gte: startDate, $lte: endDate },
        status: 'paid'
      });
      const totalServicios = serviciosPagados.reduce((sum, s) => sum + (s.amount || 0), 0);

      // GASTOS - Limpieza
      const gastosLimpieza = await Expense.find({
        local_id: local._id,
        created_at: { $gte: startDate, $lte: endDate },
        type: 'cleaning',
        status: 'approved'
      });
      const totalLimpieza = gastosLimpieza.reduce((sum, e) => sum + (e.amount || 0), 0);

      const gastosLocal = totalPremios + totalGastosMoto + totalServicios + totalLimpieza;
      const resultado = corteBruto - gastosLocal;

      results.push({
        local: local.name,
        corte_bruto: corteBruto,
        premios: totalPremios,
        gastos_moto: totalGastosMoto,
        servicios: totalServicios,
        limpieza: totalLimpieza,
        resultado
      });

      totalIngresos += corteBruto;
      totalGastos += gastosLocal;
    }

    res.json({
      periodo: {
        inicio: startDate.toISOString(),
        fin: endDate.toISOString()
      },
      ingresos: totalIngresos,
      gastos: totalGastos,
      utilidad: totalIngresos - totalGastos,
      detalle_por_local: results
    });
  } catch (error) {
    console.error('Error in consolidated report:', error);
    res.status(500).json({ error: error.message });
  }
});

// Exportar reporte consolidado a Excel
router.get('/consolidated/export', auth, adminOnly, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'Se requieren start_date y end_date' });
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    endDate.setHours(23, 59, 59, 999);

    const locales = await Local.find({ status: 'active' });

    const ExitReport = require('../models/ExitReport');
    const ServicePayment = require('../models/ServicePayment');

    const results = [];
    let totalIngresos = 0;
    let totalGastos = 0;

    for (const local of locales) {
      const exitReports = await ExitReport.find({
        local_id: local._id,
        created_at: { $gte: startDate, $lte: endDate },
        status: 'approved'
      });
      const corteBruto = exitReports.reduce((sum, r) => sum + (r.grand_total || 0), 0);

      const premios = await Task.find({
        local_id: local._id,
        created_at: { $gte: startDate, $lte: endDate },
        type: 'prize'
      });
      const totalPremios = premios.reduce((sum, p) => sum + (p.amount || 0), 0);

      const gastosMoto = await Expense.find({
        local_id: local._id,
        created_at: { $gte: startDate, $lte: endDate },
        status: 'approved'
      });
      const totalGastosMoto = gastosMoto.reduce((sum, e) => sum + (e.amount || 0), 0);

      const serviciosPagados = await ServicePayment.find({
        local_id: local._id,
        paid_date: { $gte: startDate, $lte: endDate },
        status: 'paid'
      });
      const totalServicios = serviciosPagados.reduce((sum, s) => sum + (s.amount || 0), 0);

      const gastosLimpieza = await Expense.find({
        local_id: local._id,
        created_at: { $gte: startDate, $lte: endDate },
        type: 'cleaning',
        status: 'approved'
      });
      const totalLimpieza = gastosLimpieza.reduce((sum, e) => sum + (e.amount || 0), 0);

      const gastosLocal = totalPremios + totalGastosMoto + totalServicios + totalLimpieza;
      const resultado = corteBruto - gastosLocal;

      results.push({
        local: local.name,
        corte_bruto: corteBruto,
        premios: totalPremios,
        gastos_moto: totalGastosMoto,
        servicios: totalServicios,
        limpieza: totalLimpieza,
        total_gastos: gastosLocal,
        resultado
      });

      totalIngresos += corteBruto;
      totalGastos += gastosLocal;
    }

    // Crear Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Bonus System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Reporte Consolidado');

    // Título
    worksheet.mergeCells('A1:H1');
    worksheet.getCell('A1').value = 'REPORTE CONSOLIDADO';
    worksheet.getCell('A1').font = { bold: true, size: 16 };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    // Período
    worksheet.mergeCells('A2:H2');
    const periodoStr = `Período: ${startDate.toLocaleDateString('es-MX')} - ${endDate.toLocaleDateString('es-MX')}`;
    worksheet.getCell('A2').value = periodoStr;
    worksheet.getCell('A2').alignment = { horizontal: 'center' };

    // Espacio
    worksheet.addRow([]);

    // Resumen general
    worksheet.addRow(['RESUMEN GENERAL']);
    worksheet.getRow(4).font = { bold: true };

    worksheet.addRow(['Total Ingresos:', totalIngresos]);
    worksheet.addRow(['Total Gastos:', totalGastos]);
    worksheet.addRow(['Utilidad:', totalIngresos - totalGastos]);

    // Formato de moneda para resumen
    ['B5', 'B6', 'B7'].forEach(cell => {
      worksheet.getCell(cell).numFmt = '"$"#,##0.00';
    });

    // Color para utilidad
    if (totalIngresos - totalGastos >= 0) {
      worksheet.getCell('B7').font = { color: { argb: 'FF008000' }, bold: true };
    } else {
      worksheet.getCell('B7').font = { color: { argb: 'FFFF0000' }, bold: true };
    }

    // Espacio
    worksheet.addRow([]);
    worksheet.addRow([]);

    // Detalle por local
    worksheet.addRow(['DETALLE POR LOCAL']);
    worksheet.getRow(10).font = { bold: true };

    // Encabezados de tabla
    const headerRow = worksheet.addRow([
      'Local',
      'Corte Bruto',
      'Premios',
      'Gastos Moto',
      'Servicios',
      'Limpieza',
      'Total Gastos',
      'Resultado'
    ]);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Datos por local
    results.forEach(item => {
      const row = worksheet.addRow([
        item.local,
        item.corte_bruto,
        item.premios,
        item.gastos_moto,
        item.servicios,
        item.limpieza,
        item.total_gastos,
        item.resultado
      ]);

      // Formato de moneda
      for (let i = 2; i <= 8; i++) {
        row.getCell(i).numFmt = '"$"#,##0.00';
      }

      // Color para resultado
      if (item.resultado >= 0) {
        row.getCell(8).font = { color: { argb: 'FF008000' } };
      } else {
        row.getCell(8).font = { color: { argb: 'FFFF0000' } };
      }
    });

    // Fila de totales
    const totalRow = worksheet.addRow([
      'TOTAL',
      totalIngresos,
      results.reduce((sum, r) => sum + r.premios, 0),
      results.reduce((sum, r) => sum + r.gastos_moto, 0),
      results.reduce((sum, r) => sum + r.servicios, 0),
      results.reduce((sum, r) => sum + r.limpieza, 0),
      totalGastos,
      totalIngresos - totalGastos
    ]);
    totalRow.font = { bold: true };
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFD700' }
    };
    for (let i = 2; i <= 8; i++) {
      totalRow.getCell(i).numFmt = '"$"#,##0.00';
    }

    // Ajustar anchos de columna
    worksheet.columns = [
      { width: 25 },
      { width: 15 },
      { width: 12 },
      { width: 14 },
      { width: 12 },
      { width: 12 },
      { width: 14 },
      { width: 14 }
    ];

    // Enviar archivo
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=reporte_consolidado_${start_date}_${end_date}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting consolidated report:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;