/**
 * EXCEL.JS — Exportación a Excel con formato profesional (xlsx-js-style)
 * Inmuebles Sist · Gestión de Inversiones Inmobiliarias
 *
 * UN solo archivo "InmueblesSist_Portfolio.xlsx" con:
 *   - Hoja 1: Resumen General (todas las inversiones)
 *   - Una hoja por cada inversión con su detalle y cronograma
 */

const ExcelExporter = (() => {

  // ── Paleta profesional (tema claro) ──
  const C = {
    WHITE:      'FFFFFF',
    BG_PAGE:    'F8FAFC',   // fondo muy claro
    BG_ALT:     'F1F5F9',   // fila alternada
    BG_SECTION: 'EFF6FF',   // cabecera de sección

    HDR_BLUE:   '1E3A8A',   // azul oscuro — cabeceras principales
    HDR_GREEN:  '14532D',   // verde oscuro — pagado
    HDR_RED:    '7F1D1D',   // rojo oscuro — saldo
    HDR_PURPLE: '4C1D95',   // violeta oscuro — rentabilidad
    HDR_GRAY:   '374151',   // gris oscuro — info general

    BLUE:       '1D4ED8',
    GREEN:      '15803D',
    RED:        'B91C1C',
    PURPLE:     '6D28D9',
    AMBER:      '92400E',
    TEXT:       '111827',
    MUTED:      '6B7280',
    BORDER:     'CBD5E1',
    BORDER_DK:  '94A3B8',

    PAID_BG:    'DCFCE7',   // verde suave — cuota pagada
    PEND_BG:    'FEF9C3',   // amarillo suave — cuota pendiente
    TOTAL_BG:   'DBEAFE',   // azul suave — fila totales
  };

  // ── Helpers de estilo ──
  const font  = (sz, bold, color) => ({ name: 'Calibri', sz: sz || 11, bold: !!bold, color: { rgb: color || C.TEXT } });
  const fill  = (rgb)             => ({ fgColor: { rgb } });
  const border = (clr) => {
    const s = { style: 'thin', color: { rgb: clr || C.BORDER } };
    return { top: s, bottom: s, left: s, right: s };
  };
  const borderMed = () => {
    const s = { style: 'medium', color: { rgb: C.BORDER_DK } };
    return { top: s, bottom: s, left: s, right: s };
  };
  const align = (h, v, wrap) => ({ horizontal: h || 'left', vertical: v || 'center', wrapText: !!wrap });

  function cell(v, type, s)   { return { v, t: type || 's', s }; }
  function empty(bg)          { return cell('', 's', { fill: fill(bg || C.WHITE) }); }

  // Cabecera de tabla
  function hdr(v, bg, color) {
    return cell(v, 's', {
      font:      font(10, true, color || C.WHITE),
      fill:      fill(bg || C.HDR_BLUE),
      alignment: align('center', 'center'),
      border:    borderMed(),
    });
  }

  // Celda de título de sección (fila azul claro)
  function sectionTitle(v, ncols) {
    const row = [cell(v, 's', {
      font:      font(10, true, C.BLUE),
      fill:      fill(C.BG_SECTION),
      alignment: align('left', 'center'),
      border:    border(C.BLUE + '60'),
    })];
    for (let i = 1; i < ncols; i++) row.push(cell('', 's', { fill: fill(C.BG_SECTION), border: border(C.BLUE + '60') }));
    return row;
  }

  // Celda de etiqueta (columna izquierda)
  function lbl(v) {
    return cell(v, 's', {
      font:      font(10, true, C.MUTED),
      fill:      fill(C.BG_ALT),
      alignment: align('left', 'center'),
      border:    border(),
    });
  }

  // Celda de texto normal
  function txt(v, color, bg) {
    return cell(v, 's', {
      font:      font(10, false, color || C.TEXT),
      fill:      fill(bg || C.WHITE),
      alignment: align('left', 'center', true),
      border:    border(),
    });
  }

  // Celda de texto centrado
  function txtC(v, color, bg) {
    return cell(v, 's', {
      font:      font(10, false, color || C.TEXT),
      fill:      fill(bg || C.WHITE),
      alignment: align('center', 'center'),
      border:    border(),
    });
  }

  // Celda numérica — moneda ($)
  function cur(v, color, bg) {
    return cell(v, 'n', {
      font:      font(11, true, color || C.TEXT),
      fill:      fill(bg || C.WHITE),
      alignment: align('right', 'center'),
      border:    border(),
      numFmt:    '"$ "#,##0',
    });
  }

  // Celda numérica — entero simple (conteos, m²)
  function num(v, color, bg) {
    return cell(v, 'n', {
      font:      font(11, false, color || C.TEXT),
      fill:      fill(bg || C.WHITE),
      alignment: align('center', 'center'),
      border:    border(),
      numFmt:    '#,##0',
    });
  }

  // Celda de porcentaje
  function pct(v, color, bg) {
    return cell(v, 'n', {
      font:      font(11, true, color || C.BLUE),
      fill:      fill(bg || C.WHITE),
      alignment: align('center', 'center'),
      border:    border(),
      numFmt:    '0.0"%"',
    });
  }

  // Celda de KPI grande (valor + etiqueta debajo)
  function kpiVal(v, type, color, bg) {
    return cell(v, type || 'n', {
      font:      font(13, true, color || C.TEXT),
      fill:      fill(bg || C.WHITE),
      alignment: align('center', 'center'),
      border:    borderMed(),
      numFmt:    type === 'n' ? '"$ "#,##0' : undefined,
    });
  }

  function fmtDate(dateStr) {
    if (!dateStr) return '—';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }

  // ══════════════════════════════════════════════
  //  HOJA 1: RESUMEN GENERAL
  // ══════════════════════════════════════════════
  function buildResumenGeneral(investments) {
    const rows   = [];
    const merges = [];
    const COLS   = 11;
    let r = 0;

    const gs = DB.getGlobalStats();

    // ── Título ──
    rows.push([
      cell('INMUEBLES SIST  —  CARTERA DE INVERSIONES', 's', {
        font:      font(20, true, C.HDR_BLUE),
        fill:      fill(C.WHITE),
        alignment: align('left', 'center'),
      }),
      ...Array(COLS - 1).fill(empty()),
    ]);
    merges.push({ s: { r, c: 0 }, e: { r, c: COLS - 1 } }); r++;

    rows.push([
      cell(`Generado el ${new Date().toLocaleString('es-AR')}  ·  ${investments.length} inversión${investments.length !== 1 ? 'es' : ''}`, 's', {
        font:      font(9, false, C.MUTED),
        fill:      fill(C.WHITE),
        alignment: align('left', 'center'),
      }),
      ...Array(COLS - 1).fill(empty()),
    ]);
    merges.push({ s: { r, c: 0 }, e: { r, c: COLS - 1 } }); r++;

    rows.push(Array(COLS).fill(empty())); r++;

    // ── KPIs globales: etiquetas ──
    rows.push([
      hdr('TOTAL INVERSIONES',        C.HDR_BLUE),
      hdr('VALOR TOTAL PORTAFOLIO',   C.HDR_BLUE),
      hdr('TOTAL PAGADO',             C.HDR_GREEN),
      hdr('SALDO RESTANTE',           C.HDR_RED),
      hdr('ACTIVAS / TOTAL',          C.HDR_GRAY),
      gs.invConVenta > 0  ? hdr('GANANCIA ESTIMADA', gs.gananciaTotal >= 0 ? C.HDR_GREEN : C.HDR_RED)    : empty(C.BG_ALT),
      gs.invConVenta > 0  ? hdr('ROI ESTIMADO',      gs.gananciaTotal >= 0 ? C.HDR_GREEN : C.HDR_RED)    : empty(C.BG_ALT),
      gs.invVendidas > 0  ? hdr('GANANCIA OBTENIDA', gs.gananciaObtenida >= 0 ? C.HDR_GREEN : C.HDR_RED) : empty(C.BG_ALT),
      gs.invVendidas > 0  ? hdr('ROI VENDIDAS',      gs.gananciaObtenida >= 0 ? C.HDR_GREEN : C.HDR_RED) : empty(C.BG_ALT),
      empty(C.BG_ALT), empty(C.BG_ALT),
    ]);
    r++;

    // ── KPIs globales: valores ──
    rows.push([
      kpiVal(investments.length, 'n', C.BLUE, C.BG_SECTION),
      kpiVal(gs.totalValor,      'n', C.HDR_BLUE, C.BG_SECTION),
      kpiVal(gs.totalPagado,     'n', C.HDR_GREEN, C.PAID_BG),
      kpiVal(gs.totalRestante,   'n', C.HDR_RED,  '#FEE2E2'),
      cell(`${gs.activas} / ${investments.length}`, 's', {
        font:      font(13, true, C.MUTED),
        fill:      fill(C.BG_ALT),
        alignment: align('center', 'center'),
        border:    borderMed(),
      }),
      gs.invConVenta > 0
        ? kpiVal(gs.gananciaTotal, 'n', gs.gananciaTotal >= 0 ? C.HDR_GREEN : C.HDR_RED, gs.gananciaTotal >= 0 ? C.PAID_BG : '#FEE2E2')
        : empty(C.BG_ALT),
      gs.invConVenta > 0
        ? cell((gs.roiGlobal || 0).toFixed(1) + '%', 's', {
            font:      font(13, true, gs.gananciaTotal >= 0 ? C.HDR_GREEN : C.HDR_RED),
            fill:      fill(gs.gananciaTotal >= 0 ? C.PAID_BG : '#FEE2E2'),
            alignment: align('center', 'center'),
            border:    borderMed(),
          })
        : empty(C.BG_ALT),
      gs.invVendidas > 0
        ? kpiVal(gs.gananciaObtenida, 'n', gs.gananciaObtenida >= 0 ? C.HDR_GREEN : C.HDR_RED, gs.gananciaObtenida >= 0 ? C.PAID_BG : '#FEE2E2')
        : empty(C.BG_ALT),
      gs.invVendidas > 0
        ? cell((gs.roiVendidas || 0).toFixed(1) + '%', 's', {
            font:      font(13, true, gs.gananciaObtenida >= 0 ? C.HDR_GREEN : C.HDR_RED),
            fill:      fill(gs.gananciaObtenida >= 0 ? C.PAID_BG : '#FEE2E2'),
            alignment: align('center', 'center'),
            border:    borderMed(),
          })
        : empty(C.BG_ALT),
      empty(C.BG_ALT), empty(C.BG_ALT),
    ]);
    r++;

    rows.push(Array(COLS).fill(empty())); r++;

    // ── Tabla de inversiones: cabecera ──
    rows.push([
      hdr('PROYECTO',         C.HDR_GRAY),
      hdr('UBICACIÓN',        C.HDR_GRAY),
      hdr('m²',               C.HDR_GRAY),
      hdr('VALOR TOTAL',      C.HDR_BLUE),
      hdr('ANTICIPO',         C.HDR_BLUE),
      hdr('TOTAL PAGADO',     C.HDR_GREEN),
      hdr('SALDO RESTANTE',   C.HDR_RED),
      hdr('AVANCE %',         C.HDR_BLUE),
      hdr('VALOR DE VENTA',   C.HDR_PURPLE),
      hdr('ESTADO',           C.HDR_GRAY),
      empty(C.BG_ALT),
    ]);
    r++;

    // ── Filas de inversiones ──
    let totalValorSum  = 0;
    let totalPagadoSum = 0;
    let totalSaldoSum  = 0;

    investments.forEach((inv, idx) => {
      const stats = DB.getStats(inv);
      const bg    = idx % 2 === 0 ? C.WHITE : C.BG_ALT;
      const estadoLabel = inv.estado === 'finalizada' ? '✔ FINALIZADA' : inv.estado === 'vendida' ? '🏷️ VENDIDA' : '● ACTIVA';
      const estadoColor = inv.estado === 'finalizada' ? C.MUTED : inv.estado === 'vendida' ? C.PURPLE : C.GREEN;
      const estadoBg    = inv.estado === 'vendida' ? (idx % 2 === 0 ? '#FAF5FF' : '#EDE9FE') : inv.estado === 'finalizada' ? bg : (idx % 2 === 0 ? '#F0FDF4' : '#DCFCE7');
      totalValorSum  += inv.valorTotal;
      totalPagadoSum += stats.totalPagado;
      totalSaldoSum  += stats.saldoRestante;

      rows.push([
        cell(inv.nombre, 's', {
          font:      font(10, true, C.TEXT),
          fill:      fill(bg),
          alignment: align('left', 'center'),
          border:    border(),
        }),
        txt(inv.ubicacion, C.MUTED, bg),
        inv.m2 ? num(inv.m2, C.MUTED, bg) : txtC('—', C.MUTED, bg),
        cur(inv.valorTotal,       C.TEXT,  bg),
        cur(inv.anticipo,         C.MUTED, bg),
        cur(stats.totalPagado,    C.GREEN, idx % 2 === 0 ? '#F0FDF4' : '#DCFCE7'),
        cur(stats.saldoRestante,  C.RED,   idx % 2 === 0 ? '#FFF5F5' : '#FEE2E2'),
        pct(stats.porcentaje,     C.BLUE,  bg),
        inv.valorVentaPotencial
          ? cur(inv.valorVentaPotencial, C.PURPLE, idx % 2 === 0 ? '#FAF5FF' : '#EDE9FE')
          : txtC('—', C.MUTED, bg),
        cell(estadoLabel, 's', {
          font:      font(10, true, estadoColor),
          fill:      fill(estadoBg),
          alignment: align('center', 'center'),
          border:    border(),
        }),
        empty(bg),
      ]);
      r++;
    });

    // ── Fila de totales ──
    rows.push([
      cell('TOTALES', 's', { font: font(10, true, C.WHITE), fill: fill(C.HDR_BLUE), alignment: align('left', 'center'), border: borderMed() }),
      empty(C.HDR_BLUE), empty(C.HDR_BLUE),
      cur(totalValorSum,  C.WHITE, C.HDR_BLUE),
      empty(C.HDR_BLUE),
      cur(totalPagadoSum, C.WHITE, C.HDR_GREEN),
      cur(totalSaldoSum,  C.WHITE, C.HDR_RED),
      empty(C.HDR_BLUE), empty(C.HDR_BLUE), empty(C.HDR_BLUE), empty(C.HDR_BLUE),
    ]);
    r++;

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!merges'] = merges;
    ws['!cols'] = [
      { wch: 32 }, { wch: 22 }, { wch: 12 }, { wch: 18 }, { wch: 16 },
      { wch: 24 }, { wch: 18 }, { wch: 10 }, { wch: 18 }, { wch: 14 },
      { wch: 18 },
    ];
    ws['!rows'] = [
      { hpt: 44 }, { hpt: 14 }, { hpt: 8  },
      { hpt: 22 }, { hpt: 30 }, { hpt: 8  }, { hpt: 20 },
    ];
    return ws;
  }

  // ══════════════════════════════════════════════
  //  HOJA POR INVERSIÓN
  // ══════════════════════════════════════════════
  function buildInvSheet(inv) {
    const stats  = DB.getStats(inv);
    const rows   = [];
    const merges = [];
    const COLS   = 8;
    let r = 0;

    // ── Título ──
    rows.push([
      cell(inv.nombre, 's', {
        font:      font(16, true, C.HDR_BLUE),
        fill:      fill(C.WHITE),
        alignment: align('left', 'center'),
      }),
      ...Array(COLS - 1).fill(empty()),
    ]);
    merges.push({ s: { r, c: 0 }, e: { r, c: COLS - 1 } }); r++;

    rows.push([
      cell(`📍 ${inv.ubicacion}${inv.m2 ? '   ·   ' + inv.m2 + ' m²' : ''}`, 's', {
        font:      font(10, false, C.MUTED),
        fill:      fill(C.WHITE),
        alignment: align('left', 'center'),
      }),
      ...Array(COLS - 1).fill(empty()),
    ]);
    merges.push({ s: { r, c: 0 }, e: { r, c: COLS - 1 } }); r++;

    rows.push(Array(COLS).fill(empty())); r++;

    // ── Sección: Resumen financiero ──
    rows.push(sectionTitle('▸  RESUMEN FINANCIERO', COLS)); r++;

    rows.push([
      hdr('VALOR TOTAL',      C.HDR_BLUE),
      hdr('ANTICIPO',         C.HDR_BLUE),
      hdr('TOTAL PAGADO',     C.HDR_GREEN),
      hdr('SALDO RESTANTE',   C.HDR_RED),
      hdr('AVANCE',           C.HDR_BLUE),
      hdr('CUOTAS PAGADAS',   C.HDR_GREEN),
      hdr('CUOTAS PENDIENTES',C.HDR_GRAY),
      empty(C.BG_ALT),
    ]);
    r++;

    rows.push([
      cur(inv.valorTotal,           C.HDR_BLUE,  C.BG_SECTION),
      cur(inv.anticipo,             C.TEXT,       C.BG_ALT),
      cur(stats.totalPagado,        C.HDR_GREEN,  C.PAID_BG),
      cur(stats.saldoRestante,      C.HDR_RED,    '#FEE2E2'),
      pct(stats.porcentaje,         C.BLUE,       C.BG_SECTION),
      num(stats.cuotasPagadas,      C.GREEN,      C.PAID_BG),
      num(stats.cuotasPendientes,   C.AMBER,      C.PEND_BG),
      empty(C.BG_ALT),
    ]);
    r++;

    rows.push(Array(COLS).fill(empty())); r++;

    // ── Sección: Rentabilidad (si existe) ──
    if (stats.roi) {
      const roiPositivo = stats.roi.gananciaEstimada >= 0;
      const roiColor    = roiPositivo ? C.HDR_GREEN : C.HDR_RED;
      const roiBg       = roiPositivo ? C.PAID_BG   : '#FEE2E2';

      rows.push(sectionTitle('▸  RENTABILIDAD POTENCIAL', COLS)); r++;

      rows.push([
        hdr('VALOR DE VENTA POTENCIAL', C.HDR_PURPLE),
        hdr('GANANCIA ESTIMADA',        roiColor),
        hdr('ROI %',                    roiColor),
        hdr(roiPositivo ? '✔ INVERSIÓN RENTABLE' : '✖ PÉRDIDA ESTIMADA', roiColor),
        ...Array(COLS - 4).fill(empty(C.BG_ALT)),
      ]);
      r++;

      rows.push([
        cur(stats.roi.valorVenta,       C.PURPLE,    '#FAF5FF'),
        cur(stats.roi.gananciaEstimada, roiColor,    roiBg),
        pct(stats.roi.roiPct,           roiColor,    roiBg),
        cell((roiPositivo ? '+' : '') + stats.roi.roiPct.toFixed(1) + '% sobre el valor total', 's', {
          font:      font(10, false, roiColor),
          fill:      fill(roiBg),
          alignment: align('left', 'center'),
          border:    border(),
        }),
        ...Array(COLS - 4).fill(empty(C.BG_ALT)),
      ]);
      r++;

      rows.push(Array(COLS).fill(empty())); r++;
    }

    // ── Sección: Información general ──
    rows.push(sectionTitle('▸  INFORMACIÓN GENERAL', COLS)); r++;

    const infoRows = [
      ['Proyecto',           inv.nombre],
      ['Ubicación',          inv.ubicacion],
      inv.m2 ? ['Metros cuadrados', inv.m2 + ' m²'] : null,
      ['Valor total',        '$ ' + Number(inv.valorTotal).toLocaleString('es-AR')],
      ['Anticipo',           '$ ' + Number(inv.anticipo).toLocaleString('es-AR')],
      ['Cuotas',             `${inv.cantCuotas} cuotas de $ ${Number(inv.valorCuota).toLocaleString('es-AR')}`],
      inv.valorVentaPotencial ? ['Valor de venta potencial', '$ ' + Number(inv.valorVentaPotencial).toLocaleString('es-AR')] : null,
      ['Fecha de inicio',    fmtDate(inv.fechaInicio)],
      ['Fecha fin estimada', fmtDate(inv.fechaFin)],
      ['Estado',             inv.estado === 'activa' ? 'ACTIVA' : 'FINALIZADA'],
      inv.notas ? ['Notas', inv.notas] : null,
    ].filter(Boolean);

    infoRows.forEach(([label, value]) => {
      rows.push([
        lbl(label),
        cell(String(value), 's', {
          font:      font(10, false, C.TEXT),
          fill:      fill(C.WHITE),
          alignment: align('left', 'center', true),
          border:    border(),
        }),
        ...Array(COLS - 2).fill(empty()),
      ]);
      merges.push({ s: { r, c: 1 }, e: { r, c: COLS - 1 } });
      r++;
    });

    rows.push(Array(COLS).fill(empty())); r++;

    // ── Sección: Cronograma de cuotas ──
    rows.push(sectionTitle('▸  CRONOGRAMA DE CUOTAS', COLS)); r++;

    rows.push([
      hdr('N°',               C.HDR_GRAY),
      hdr('FECHA PROGRAMADA', C.HDR_GRAY),
      hdr('MONTO',            C.HDR_BLUE),
      hdr('ESTADO',           C.HDR_GRAY),
      hdr('FECHA DE PAGO',    C.HDR_GREEN),
      hdr('MONTO PAGADO',     C.HDR_GREEN),
      hdr('NOTA',             C.HDR_GRAY),
      empty(C.BG_ALT),
    ]);
    r++;

    let montoPagadoTotal = 0;

    inv.cuotas.forEach((c, idx) => {
      const isPaid  = c.estado === 'pagada';
      const bg      = isPaid ? C.PAID_BG : (idx % 2 === 0 ? C.WHITE : C.PEND_BG);
      const stColor = isPaid ? C.GREEN   : C.AMBER;
      if (c.montoPagado != null) montoPagadoTotal += c.montoPagado;

      rows.push([
        num(c.numero, isPaid ? C.GREEN : C.TEXT, bg),
        txtC(fmtDate(c.fechaProgramada), C.TEXT, bg),
        cur(c.monto, C.TEXT, bg),
        cell(isPaid ? '✔  PAGADA' : '⏳ PENDIENTE', 's', {
          font:      font(10, true, stColor),
          fill:      fill(bg),
          alignment: align('center', 'center'),
          border:    border(),
        }),
        txtC(fmtDate(c.fechaPago), isPaid ? C.GREEN : C.MUTED, bg),
        c.montoPagado != null ? cur(c.montoPagado, isPaid ? C.GREEN : C.TEXT, bg) : txtC('—', C.MUTED, bg),
        txt(c.nota || '—', C.MUTED, bg),
        empty(bg),
      ]);
      r++;
    });

    // Fila de totales de cuotas
    rows.push([
      cell('TOTAL', 's', { font: font(10, true, C.WHITE), fill: fill(C.HDR_BLUE), alignment: align('center', 'center'), border: borderMed() }),
      empty(C.HDR_BLUE),
      cur(inv.cantCuotas * inv.valorCuota, C.WHITE, C.HDR_BLUE),
      empty(C.HDR_BLUE),
      empty(C.HDR_BLUE),
      cur(montoPagadoTotal, C.WHITE, C.HDR_GREEN),
      empty(C.HDR_BLUE),
      empty(C.HDR_BLUE),
    ]);
    r++;

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!merges'] = merges;
    ws['!cols'] = [
      { wch: 9  }, { wch: 18 }, { wch: 17 }, { wch: 16 },
      { wch: 16 }, { wch: 17 }, { wch: 32 }, { wch: 4  },
    ];
    ws['!rows'] = [{ hpt: 36 }, { hpt: 14 }, { hpt: 8 }];
    return ws;
  }

  // ══════════════════════════════════════════════
  //  EXPORT PRINCIPAL (un solo archivo)
  // ══════════════════════════════════════════════
  function exportAll() {
    const investments = DB.getAll();
    if (investments.length === 0) return null;

    const wb = XLSX.utils.book_new();

    // Hoja 1: Resumen general
    XLSX.utils.book_append_sheet(wb, buildResumenGeneral(investments), 'Resumen General');

    // Una hoja por inversión
    investments.forEach(inv => {
      const sheetName = inv.nombre.replace(/[:\\\/\?\*\[\]]/g, '').substring(0, 31);
      XLSX.utils.book_append_sheet(wb, buildInvSheet(inv), sheetName);
    });

    const filename = 'InmueblesSist_Portfolio.xlsx';
    XLSX.writeFile(wb, filename);
    return filename;
  }

  return { export: exportAll };
})();
