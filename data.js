/**
 * DATA.JS — Gestión de datos en localStorage
 * Inmuebles Sist · Gestión de Inversiones Inmobiliarias
 */

const DB = (() => {
  const KEY = 'inmuebles_sist_v1';

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || { investments: [] };
    } catch {
      return { investments: [] };
    }
  }

  function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
    // Sincronizar en la nube si el usuario está logueado
    if (window.Auth && typeof Auth.syncToCloud === 'function') Auth.syncToCloud();
  }

  // ---------- INVESTMENTS ----------

  function getAll() {
    return load().investments;
  }

  function getById(id) {
    return load().investments.find(inv => inv.id === id) || null;
  }

  function create(invData) {
    const db = load();
    const id = 'inv_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    const cuotas = generateCuotas(invData);
    const investment = {
      id,
      nombre:          invData.nombre,
      ubicacion:       invData.ubicacion,
      m2:              parseFloat(invData.m2) || null,
      valorTotal:      parseFloat(invData.valorTotal) || 0,
      anticipo:        parseFloat(invData.anticipo) || 0,
      cantCuotas:      parseInt(invData.cantCuotas) || 0,
      valorCuota:      parseFloat(invData.valorCuota) || 0,
      valorVentaPotencial: parseFloat(invData.valorVentaPotencial) || null,
      direccionExacta: invData.direccionExacta || null,
      fechaInicio:     invData.fechaInicio || null,
      fechaFin:        invData.fechaFin || null,
      estado:          invData.estado || 'activa',
      notas:           invData.notas || '',
      cuotas,
      createdAt:  new Date().toISOString(),
      updatedAt:  new Date().toISOString(),
    };
    db.investments.push(investment);
    save(db);
    return investment;
  }

  function update(id, invData) {
    const db = load();
    const idx = db.investments.findIndex(i => i.id === id);
    if (idx === -1) return null;

    const existing = db.investments[idx];
    const newCant   = parseInt(invData.cantCuotas)   || existing.cantCuotas;
    const newValor  = parseFloat(invData.valorCuota) || existing.valorCuota;
    const newInicio = invData.fechaInicio             || existing.fechaInicio;

    let cuotas = existing.cuotas;
    if (newCant !== existing.cantCuotas || newValor !== existing.valorCuota || newInicio !== existing.fechaInicio) {
      cuotas = regenerateCuotas(existing.cuotas, { cantCuotas: newCant, valorCuota: newValor, fechaInicio: newInicio });
    }

    db.investments[idx] = {
      ...existing,
      nombre:          invData.nombre,
      ubicacion:       invData.ubicacion,
      m2:              parseFloat(invData.m2) || null,
      valorTotal:      parseFloat(invData.valorTotal) || 0,
      anticipo:        parseFloat(invData.anticipo) || 0,
      cantCuotas:      newCant,
      valorCuota:      newValor,
      valorVentaPotencial: invData.valorVentaPotencial ? parseFloat(invData.valorVentaPotencial) : null,
      direccionExacta: invData.direccionExacta !== undefined ? (invData.direccionExacta || null) : existing.direccionExacta,
      fechaInicio:     newInicio,
      fechaFin:        invData.fechaFin || existing.fechaFin,
      estado:          invData.estado   || existing.estado,
      notas:           invData.notas    || '',
      cuotas,
      updatedAt: new Date().toISOString(),
    };

    save(db);
    return db.investments[idx];
  }

  function remove(id) {
    const db = load();
    db.investments = db.investments.filter(i => i.id !== id);
    save(db);
  }

  // ---------- CUOTAS ----------

  function generateCuotas(invData) {
    const cuotas = [];
    const cant   = parseInt(invData.cantCuotas) || 0;
    const valor  = parseFloat(invData.valorCuota) || 0;
    const inicio = invData.fechaInicio ? new Date(invData.fechaInicio + 'T12:00:00') : null;

    for (let i = 1; i <= cant; i++) {
      let fechaProgramada = null;
      if (inicio) {
        const d = new Date(inicio);
        d.setMonth(d.getMonth() + (i - 1));
        fechaProgramada = d.toISOString().split('T')[0];
      }
      cuotas.push({
        numero: i,
        fechaProgramada,
        monto:       valor,
        estado:      'pendiente',
        fechaPago:   null,
        montoPagado: null,
        nota:        '',
      });
    }
    return cuotas;
  }

  function regenerateCuotas(existingCuotas, opts) {
    const cuotas = [];
    const inicio = opts.fechaInicio ? new Date(opts.fechaInicio + 'T12:00:00') : null;

    for (let i = 1; i <= opts.cantCuotas; i++) {
      const existing = existingCuotas.find(c => c.numero === i);
      let fechaProgramada = null;
      if (inicio) {
        const d = new Date(inicio);
        d.setMonth(d.getMonth() + (i - 1));
        fechaProgramada = d.toISOString().split('T')[0];
      }
      if (existing && existing.estado === 'pagada') {
        cuotas.push({ ...existing, fechaProgramada, monto: opts.valorCuota });
      } else {
        cuotas.push({ numero: i, fechaProgramada, monto: opts.valorCuota, estado: 'pendiente', fechaPago: null, montoPagado: null, nota: '' });
      }
    }
    return cuotas;
  }

  function pagarCuota(invId, numeroCuota, pagoData) {
    const db = load();
    const inv = db.investments.find(i => i.id === invId);
    if (!inv) return null;
    const cuota = inv.cuotas.find(c => c.numero === numeroCuota);
    if (!cuota) return null;

    cuota.estado      = 'pagada';
    cuota.fechaPago   = pagoData.fechaPago;
    cuota.montoPagado = parseFloat(pagoData.montoPagado) || cuota.monto;
    cuota.nota        = pagoData.nota || '';

    if (inv.cuotas.every(c => c.estado === 'pagada')) inv.estado = 'finalizada';
    inv.updatedAt = new Date().toISOString();
    save(db);
    return inv;
  }

  // ---------- STATS ----------

  function getStats(inv) {
    const cuotasPagadas    = inv.cuotas.filter(c => c.estado === 'pagada');
    const cuotasPendientes = inv.cuotas.filter(c => c.estado === 'pendiente');
    const totalPagadoCuotas = cuotasPagadas.reduce((s, c) => s + (c.montoPagado || c.monto), 0);
    const totalPagado   = inv.anticipo + totalPagadoCuotas;
    const saldoRestante = Math.max(0, inv.valorTotal - totalPagado);
    const porcentaje    = inv.valorTotal > 0 ? Math.min(100, (totalPagado / inv.valorTotal) * 100) : 0;
    const proximaCuota  = cuotasPendientes.length > 0 ? cuotasPendientes[0] : null;

    // Rentabilidad
    let roi              = null;
    let gananciaEstimada = null;
    let roiPct           = null;
    if (inv.valorVentaPotencial) {
      gananciaEstimada = inv.valorVentaPotencial - inv.valorTotal;
      roiPct = inv.valorTotal > 0 ? (gananciaEstimada / inv.valorTotal) * 100 : 0;
      roi = { gananciaEstimada, roiPct, valorVenta: inv.valorVentaPotencial };
    }

    return {
      cuotasPagadas: cuotasPagadas.length,
      cuotasPendientes: cuotasPendientes.length,
      totalPagadoCuotas,
      totalPagado,
      saldoRestante,
      porcentaje: Math.round(porcentaje * 10) / 10,
      proximaCuota,
      roi,
    };
  }

  function getGlobalStats() {
    const investments  = getAll();
    const totalValor   = investments.reduce((s, i) => s + i.valorTotal, 0);
    const allStats     = investments.map(i => getStats(i));
    const totalPagado  = allStats.reduce((s, st) => s + st.totalPagado, 0);
    const totalRestante = allStats.reduce((s, st) => s + st.saldoRestante, 0);
    const activas      = investments.filter(i => i.estado === 'activa').length;

    // ROI global: sólo inversiones con valor de venta cargado
    const invConVenta  = investments.filter(i => i.valorVentaPotencial);
    const totalVenta   = invConVenta.reduce((s, i) => s + i.valorVentaPotencial, 0);
    const totalBaseVenta = invConVenta.reduce((s, i) => s + i.valorTotal, 0);
    const gananciaTotal = totalVenta - totalBaseVenta;
    const roiGlobal = totalBaseVenta > 0 ? (gananciaTotal / totalBaseVenta) * 100 : null;

    return { totalValor, totalPagado, totalRestante, activas, total: investments.length, gananciaTotal, roiGlobal, invConVenta: invConVenta.length };
  }

  return { getAll, getById, create, update, remove, pagarCuota, getStats, getGlobalStats };
})();
