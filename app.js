/**
 * APP.JS — Lógica principal de la aplicación
 * Inmuebles Sist · Gestión de Inversiones Inmobiliarias
 */

const App = (() => {

  // ==================== ESTADO ====================
  let state = {
    currentView:   'resumen',
    currentInvId:  null,
    editMode:      false,
    pagoTarget:    null,
    eliminarTarget: null,
    cuotaFilter:   'all',
    dashFilter:    'all',
  };

  // ==================== FORMATEO ====================
  function fmt$(val) {
    if (val == null || isNaN(val)) return '—';
    return '$' + Number(val).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
  function fmtPct(val) { return (val || 0).toFixed(1) + '%'; }
  function fmtDate(dateStr) {
    if (!dateStr) return '—';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }
  function todayISO() { return new Date().toISOString().split('T')[0]; }

  // ==================== TOAST ====================
  function toast(msg, type = 'success', duration = 3200) {
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
    document.getElementById('toastContainer').appendChild(el);
    setTimeout(() => el.remove(), duration);
  }

  // ==================== SIDEBAR ====================
  function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const layout  = document.getElementById('layout');
    const toggle  = document.getElementById('sidebarToggle');
    const menuBtn = document.getElementById('menuBtn');
    const isSmall = () => window.innerWidth <= 900;

    toggle.addEventListener('click', () => {
      if (isSmall()) sidebar.classList.remove('open');
      else { sidebar.classList.toggle('collapsed'); layout.classList.toggle('expanded'); }
    });
    menuBtn.addEventListener('click', () => {
      if (isSmall()) sidebar.classList.toggle('open');
      else { sidebar.classList.remove('collapsed'); layout.classList.remove('expanded'); }
    });
    document.addEventListener('click', (e) => {
      if (isSmall() && sidebar.classList.contains('open')) {
        if (!sidebar.contains(e.target) && e.target !== menuBtn) sidebar.classList.remove('open');
      }
    });
  }

  function renderSidebar() {
    const investments = DB.getAll();
    const list = document.getElementById('sidebarList');
    list.innerHTML = '';

    if (investments.length === 0) {
      list.innerHTML = `<div style="padding:8px 12px;font-size:12px;color:var(--text-muted)">No hay inversiones</div>`;
      return;
    }
    investments.forEach(inv => {
      const stats = DB.getStats(inv);
      const color = inv.estado === 'activa' ? 'var(--green)' : inv.estado === 'vendida' ? 'var(--purple)' : 'var(--text-muted)';
      const item  = document.createElement('div');
      item.className = 'sidebar-inv-item' + (state.currentInvId === inv.id ? ' active' : '');
      item.innerHTML = `
        <div class="sidebar-inv-dot" style="background:${color}"></div>
        <div class="sidebar-inv-name" title="${inv.nombre}">${inv.nombre}</div>
        <div class="sidebar-inv-pct">${fmtPct(stats.porcentaje)}</div>
      `;
      item.addEventListener('click', () => showDetalle(inv.id));
      list.appendChild(item);
    });
  }

  // ==================== VIEWS ====================
  function showView(viewName, invId = null) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    state.currentView = viewName;
    state.currentInvId = invId;

    if (viewName === 'resumen') {
      document.getElementById('viewResumen').style.display = '';
      document.getElementById('navResumen').classList.add('active');
      document.getElementById('topbarTitle').textContent = 'Resumen';
      renderResumen();
      state.editMode = false;
    } else if (viewName === 'nueva') {
      document.getElementById('viewNueva').style.display = '';
      document.getElementById('navNueva').classList.add('active');
      document.getElementById('topbarTitle').textContent   = state.editMode ? 'Editar Inversión' : 'Nueva Inversión';
      document.getElementById('formTitle').textContent     = state.editMode ? 'Editar Inversión' : 'Nueva Inversión';
      document.getElementById('btnGuardar').innerHTML      = state.editMode ? '<span>💾</span> Guardar Cambios' : '<span>💾</span> Guardar Inversión';
    } else if (viewName === 'detalle' && invId) {
      document.getElementById('viewDetalle').style.display = '';
      document.getElementById('topbarTitle').textContent = 'Detalle de Inversión';
      renderDetalle(invId);
    }
    renderSidebar();
  }

  function showDetalle(invId) {
    state.editMode = false;
    showView('detalle', invId);
    if (window.innerWidth <= 900) document.getElementById('sidebar').classList.remove('open');
  }

  // ==================== RESUMEN ====================
  function renderResumen() {
    const investments = DB.getAll();
    const gs = DB.getGlobalStats();

    // KPIs
    const kpiGrid = document.getElementById('kpiGrid');
    let roiKpi = '';
    if (gs.invConVenta > 0) {
      const roiColor  = gs.gananciaTotal >= 0 ? 'var(--green-light)' : 'var(--red-light)';
      const roiIcon   = gs.gananciaTotal >= 0 ? '📈' : '📉';
      const roiBgIcon = gs.gananciaTotal >= 0 ? 'var(--green-glow)' : 'var(--red-glow)';
      roiKpi += `
        <div class="kpi-card">
          <div class="kpi-icon" style="background:${roiBgIcon}">${roiIcon}</div>
          <div class="kpi-label">Ganancia Estimada</div>
          <div class="kpi-value" style="font-size:20px;color:${roiColor}">${fmt$(gs.gananciaTotal)}</div>
          <div class="kpi-sub">ROI: ${gs.roiGlobal != null ? fmtPct(gs.roiGlobal) : '—'} · ${gs.invConVenta} inv.</div>
        </div>
      `;
    }
    if (gs.invVendidas > 0) {
      const roiColor  = gs.gananciaObtenida >= 0 ? 'var(--green-light)' : 'var(--red-light)';
      const roiBgIcon = gs.gananciaObtenida >= 0 ? 'var(--green-glow)' : 'var(--red-glow)';
      roiKpi += `
        <div class="kpi-card">
          <div class="kpi-icon" style="background:${roiBgIcon}">🏷️</div>
          <div class="kpi-label">Ganancia Obtenida</div>
          <div class="kpi-value" style="font-size:20px;color:${roiColor}">${fmt$(gs.gananciaObtenida)}</div>
          <div class="kpi-sub">ROI: ${gs.roiVendidas != null ? fmtPct(gs.roiVendidas) : '—'} · ${gs.invVendidas} vendida${gs.invVendidas !== 1 ? 's' : ''}</div>
        </div>
      `;
    }

    kpiGrid.innerHTML = `
      <div class="kpi-card">
        <div class="kpi-icon" style="background:var(--accent-ghost)">🏢</div>
        <div class="kpi-label">Total Inversiones</div>
        <div class="kpi-value">${gs.total}</div>
        <div class="kpi-sub">${gs.activas} activa${gs.activas !== 1 ? 's' : ''}${gs.vendidas > 0 ? ' · ' + gs.vendidas + ' vendida' + (gs.vendidas !== 1 ? 's' : '') : ''}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:var(--purple-glow)">💎</div>
        <div class="kpi-label">Valor Total Portafolio</div>
        <div class="kpi-value">${fmt$(gs.totalValor)}</div>
        <div class="kpi-sub">Valor total de propiedades</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:var(--green-glow)">✅</div>
        <div class="kpi-label">Total Pagado</div>
        <div class="kpi-value">${fmt$(gs.totalPagado)}</div>
        <div class="kpi-sub">Anticipo + cuotas pagadas</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:var(--red-glow)">⏳</div>
        <div class="kpi-label">Saldo Restante</div>
        <div class="kpi-value">${fmt$(gs.totalRestante)}</div>
        <div class="kpi-sub">Total pendiente de pago</div>
      </div>
      ${roiKpi}
    `;

    document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn[data-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.dashFilter = btn.dataset.filter;
        renderInvestmentsGrid(investments);
      });
    });

    renderInvestmentsGrid(investments);
  }

  // Helpers de URL de Maps
  function mapsUrl(direccionExacta) {
    if (!direccionExacta) return null;
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(direccionExacta);
  }

  function renderInvestmentsGrid(allInvestments) {
    const grid  = document.getElementById('investmentsGrid');
    const empty = document.getElementById('emptyState');

    let filtered = state.dashFilter === 'all' ? allInvestments : allInvestments.filter(i => i.estado === state.dashFilter);

    if (allInvestments.length === 0) { grid.style.display = 'none'; empty.style.display = ''; return; }
    grid.style.display = ''; empty.style.display = 'none';

    if (filtered.length === 0) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted)">No hay inversiones con este filtro</div>`;
      return;
    }

    grid.innerHTML = filtered.map(inv => {
      const stats = DB.getStats(inv);
      const next  = stats.proximaCuota;

      // ROI row para la tarjeta
      let roiRow = '';
      if (stats.roi) {
        const isPos   = stats.roi.gananciaEstimada >= 0;
        const roiCls  = isPos ? 'roi-pos' : 'roi-neg';
        const roiSign = isPos ? '+' : '';
        roiRow = `
          <div class="inv-roi-row">
            <span class="inv-roi-label">💹 Rentabilidad potencial</span>
            <span class="inv-roi-value ${roiCls}">${roiSign}${fmt$(stats.roi.gananciaEstimada)} (${roiSign}${fmtPct(stats.roi.roiPct)})</span>
          </div>
        `;
      } else if (inv.valorVentaPotencial === null) {
        roiRow = `
          <div class="inv-roi-row">
            <span class="inv-roi-label">💹 Rentabilidad potencial</span>
            <span class="inv-roi-value roi-neutral">Sin valor de venta cargado</span>
          </div>
        `;
      }

      return `
        <div class="inv-card" onclick="App.showDetalle('${inv.id}')">
          <div class="inv-card-header">
            <div>
              <div class="inv-card-title">${inv.nombre}</div>
              <div class="inv-card-location">
                📍 ${inv.ubicacion}${inv.m2 ? ` · ${inv.m2} m²` : ''}
                ${mapsUrl(inv.direccionExacta) ? `<a href="${mapsUrl(inv.direccionExacta)}" target="_blank" rel="noopener" class="maps-link" onclick="event.stopPropagation()">🗺️ Maps</a>` : ''}
              </div>
            </div>
            <span class="badge badge-${inv.estado}">${inv.estado}</span>
          </div>

          <div class="inv-card-stats">
            <div>
              <div class="inv-stat-label">Valor total</div>
              <div class="inv-stat-value">${fmt$(inv.valorTotal)}</div>
            </div>
            <div>
              <div class="inv-stat-label">Total pagado</div>
              <div class="inv-stat-value green">${fmt$(stats.totalPagado)}</div>
            </div>
            <div>
              <div class="inv-stat-label">Saldo restante</div>
              <div class="inv-stat-value red">${fmt$(stats.saldoRestante)}</div>
            </div>
            <div>
              <div class="inv-stat-label">Cuotas</div>
              <div class="inv-stat-value accent">${stats.cuotasPagadas} / ${inv.cantCuotas}</div>
            </div>
          </div>

          ${roiRow}

          <div class="inv-progress-bar-wrap">
            <div class="inv-progress-label">
              <span>Progreso de pago</span>
              <span>${fmtPct(stats.porcentaje)}</span>
            </div>
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" data-pct="${stats.porcentaje}" style="width:0"></div>
            </div>
          </div>

          <div class="inv-card-footer">
            <div class="inv-next-cuota">
              ${next
                ? `Próxima: <strong>Cuota ${next.numero}</strong>${next.fechaProgramada ? ' · ' + fmtDate(next.fechaProgramada) : ''}`
                : `<strong>✅ Todas las cuotas pagadas</strong>`}
            </div>
            <div class="inv-card-actions" onclick="event.stopPropagation()">
              <button class="btn btn-icon btn-sm" title="Editar" onclick="App.editInvestmentById('${inv.id}')">✏️</button>
              <button class="btn btn-icon btn-sm" title="Eliminar" onclick="App.promptEliminar('${inv.id}')">🗑️</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Animar barras de progreso (arrancan en 0, luego se expanden con CSS transition)
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.querySelectorAll('#investmentsGrid .progress-bar-fill[data-pct]').forEach(el => {
        el.style.width = el.dataset.pct + '%';
      });
    }));
  }

  // ==================== DETALLE ====================
  function renderDetalle(invId) {
    const inv = DB.getById(invId);
    if (!inv) { showView('resumen'); return; }
    const stats = DB.getStats(inv);

    document.getElementById('detNombre').textContent = inv.nombre;
    const _mapsUrl = mapsUrl(inv.direccionExacta);
    document.getElementById('detUbicacion').innerHTML =
      `📍 ${inv.ubicacion}${inv.m2 ? ` · ${inv.m2} m²` : ''}` +
      (_mapsUrl ? ` <a href="${_mapsUrl}" target="_blank" rel="noopener" class="maps-link-detail">🗺️ Ver en Maps</a>` : '');

    // KPIs
    document.getElementById('detKpi').innerHTML = `
      <div class="kpi-card">
        <div class="kpi-icon" style="background:var(--green-glow)">💰</div>
        <div class="kpi-label">Total Pagado</div>
        <div class="kpi-value" style="font-size:20px;color:var(--green-light)">${fmt$(stats.totalPagado)}</div>
        <div class="kpi-sub">Anticipo + cuotas</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:var(--red-glow)">⏳</div>
        <div class="kpi-label">Saldo Restante</div>
        <div class="kpi-value" style="font-size:20px;color:var(--red-light)">${fmt$(stats.saldoRestante)}</div>
        <div class="kpi-sub">Pendiente de pago</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:var(--accent-ghost)">📋</div>
        <div class="kpi-label">Cuotas Pagadas</div>
        <div class="kpi-value" style="font-size:20px">${stats.cuotasPagadas} <span style="font-size:14px;color:var(--text-secondary)">/ ${inv.cantCuotas}</span></div>
        <div class="kpi-sub">${stats.cuotasPendientes} pendiente${stats.cuotasPendientes !== 1 ? 's' : ''}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:var(--purple-glow)">📈</div>
        <div class="kpi-label">Progreso de Pago</div>
        <div class="kpi-value" style="font-size:20px;color:var(--accent-light)">${fmtPct(stats.porcentaje)}</div>
        <div class="kpi-sub">del total pagado</div>
      </div>
    `;

    // Barra de progreso
    document.getElementById('detProgress').innerHTML = `
      <div class="progress-title">
        <h3>🚀 Progreso de Pago</h3>
        <span class="badge badge-${inv.estado}">${inv.estado}</span>
      </div>
      <div class="progress-big-bar">
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" data-pct="${stats.porcentaje}" style="width:0"></div>
        </div>
        <div class="progress-labels">
          <span>Pagado: <strong>${fmt$(stats.totalPagado)}</strong></span>
          <span style="color:var(--accent-light);font-weight:700">${fmtPct(stats.porcentaje)}</span>
          <span>Total: <strong>${fmt$(inv.valorTotal)}</strong></span>
        </div>
      </div>
    `;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const fill = document.querySelector('#detProgress .progress-bar-fill[data-pct]');
      if (fill) fill.style.width = fill.dataset.pct + '%';
    }));

    // Rentabilidad — siempre visible
    let roiSection;
    if (stats.roi) {
      const isPos    = stats.roi.gananciaEstimada >= 0;
      const roiSign  = isPos ? '+' : '';
      const roiBadge = isPos ? 'positive' : 'negative';
      const roiLabel = isPos ? '📈 Inversión rentable' : '📉 Pérdida estimada';
      roiSection = `
        <div class="roi-card">
          <div class="roi-card-title">
            💹 Rentabilidad Potencial
            <button class="btn btn-ghost btn-sm" style="margin-left:auto;font-size:11px;padding:4px 10px" onclick="App.showSaleValueForm()">✏️ Modificar</button>
          </div>
          <div class="roi-grid">
            <div>
              <div class="roi-item-label">Valor de venta potencial</div>
              <div class="roi-item-value purple">${fmt$(stats.roi.valorVenta)}</div>
            </div>
            <div>
              <div class="roi-item-label">Ganancia estimada</div>
              <div class="roi-item-value ${isPos ? 'positive' : 'negative'}">${roiSign}${fmt$(stats.roi.gananciaEstimada)}</div>
              <div class="roi-badge ${roiBadge}">${roiLabel}</div>
            </div>
            <div>
              <div class="roi-item-label">ROI</div>
              <div class="roi-item-value ${isPos ? 'positive' : 'negative'}">${roiSign}${fmtPct(stats.roi.roiPct)}</div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:4px">sobre valor total</div>
            </div>
          </div>
          <div class="roi-edit-inline" id="roiEditInline" style="display:none">
            <div class="roi-quick-label">Actualizar valor de venta potencial</div>
            <div class="roi-form-row">
              <div class="input-prefix" style="flex:1">
                <span>$</span>
                <input type="number" id="quickSaleInput" value="${stats.roi.valorVenta}" min="0" step="0.01" />
              </div>
              <button class="btn btn-primary btn-sm" onclick="App.setSaleValue('${inv.id}')">Actualizar</button>
              <button class="btn btn-ghost btn-sm" onclick="document.getElementById('roiEditInline').style.display='none'">✕</button>
            </div>
          </div>
        </div>
      `;
    } else {
      roiSection = `
        <div class="roi-card">
          <div class="roi-card-title">💹 Rentabilidad Potencial</div>
          <div class="roi-no-venta">
            <p>Ingresá un valor de venta estimado para ver cuánto ganás con esta inversión.</p>
            <div class="roi-quick-label">Valor de venta potencial</div>
            <div class="roi-form-row">
              <div class="input-prefix" style="flex:1">
                <span>$</span>
                <input type="number" id="quickSaleInput" placeholder="Ej: 180000" min="0" step="0.01" />
              </div>
              <button class="btn btn-primary btn-sm" onclick="App.setSaleValue('${inv.id}')">💹 Ver rentabilidad</button>
            </div>
          </div>
        </div>
      `;
    }

    // Info general
    document.getElementById('detInfo').innerHTML = `
      <h3>📁 Información General</h3>
      <div class="info-row"><span class="info-label">Proyecto</span><span class="info-value">${inv.nombre}</span></div>
      <div class="info-row"><span class="info-label">Ubicación</span><span class="info-value">${inv.ubicacion}</span></div>
      ${inv.m2 ? `<div class="info-row"><span class="info-label">Metros cuadrados</span><span class="info-value">${inv.m2} m²</span></div>` : ''}
      ${inv.direccionExacta ? `<div class="info-row"><span class="info-label">Dirección exacta</span><span class="info-value"><a href="${mapsUrl(inv.direccionExacta)}" target="_blank" rel="noopener" class="maps-link-inline">🗺️ ${inv.direccionExacta}</a></span></div>` : ''}
      <div class="info-row"><span class="info-label">Valor total</span><span class="info-value">${fmt$(inv.valorTotal)}</span></div>
      <div class="info-row"><span class="info-label">Anticipo</span><span class="info-value">${fmt$(inv.anticipo)}</span></div>
      <div class="info-row"><span class="info-label">Cuotas</span><span class="info-value">${inv.cantCuotas} cuotas de ${fmt$(inv.valorCuota)}</span></div>
      ${inv.valorVentaPotencial ? `<div class="info-row"><span class="info-label">Valor de venta potencial</span><span class="info-value" style="color:var(--purple)">${fmt$(inv.valorVentaPotencial)}</span></div>` : ''}
      <div class="info-row"><span class="info-label">Fecha inicio</span><span class="info-value">${fmtDate(inv.fechaInicio)}</span></div>
      <div class="info-row"><span class="info-label">Fecha fin estimada</span><span class="info-value">${fmtDate(inv.fechaFin)}</span></div>
      ${inv.notas ? `<div class="info-row" style="flex-direction:column;align-items:flex-start;gap:6px"><span class="info-label">Notas</span><span style="font-size:12px;color:var(--text-secondary)">${inv.notas}</span></div>` : ''}
      <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-outline btn-sm" onclick="App.editInvestment()">✏️ Editar</button>
        <button class="btn btn-danger btn-sm" onclick="App.promptEliminar('${inv.id}')">🗑️ Eliminar</button>
      </div>
    `;

    // Próximo pago — insertar rentabilidad antes del cuadro de pago
    const next = stats.proximaCuota;
    const actionEl = document.getElementById('detAction');
    let payHtml = '';
    if (next) {
      const nextEsCancelacion = next.tipo === 'cancelacion';
      const nextLabel = nextEsCancelacion ? 'Pago de Cancelación' : `Cuota ${next.numero} de ${inv.cantCuotas}`;
      const nextBtnLabel = nextEsCancelacion ? '💲 Registrar Pago de Cancelación' : `💳 Registrar Pago de Cuota ${next.numero}`;
      payHtml = `
        <h3>💳 Próximo Pago</h3>
        <div class="next-payment-box">
          <div class="next-payment-label">${nextLabel}</div>
          <div class="next-payment-cuota">${fmt$(next.monto)}</div>
          <div class="next-payment-date">${next.fechaProgramada ? 'Programada: ' + fmtDate(next.fechaProgramada) : 'Sin fecha programada'}</div>
        </div>
        <button class="btn btn-primary btn-pagar" onclick="App.openPago('${inv.id}', ${next.numero})">
          ${nextBtnLabel}
        </button>
        <div style="margin-top:12px;font-size:12px;color:var(--text-secondary);text-align:center">
          También podés pagar cualquier cuota desde el cronograma
        </div>
      `;
    } else {
      payHtml = `
        <h3>💳 Estado de Pagos</h3>
        <div class="paid-all-box">
          <div class="paid-all-icon">🎉</div>
          <div class="paid-all-title">¡Inversión completada!</div>
          <div class="paid-all-sub">Todas las cuotas han sido pagadas</div>
        </div>
      `;
    }
    actionEl.innerHTML = payHtml;

    // Inyectar sección de rentabilidad DESPUÉS del progress-card (siempre visible)
    const progressCard = document.getElementById('detProgress');
    let existingRoi = document.getElementById('roiSection');
    if (!existingRoi) {
      existingRoi = document.createElement('div');
      existingRoi.id = 'roiSection';
      progressCard.parentNode.insertBefore(existingRoi, progressCard.nextSibling);
    }
    existingRoi.innerHTML = roiSection;

    renderCuotasTable(inv);

    // Filtros de cuotas
    document.querySelectorAll('.filter-btn[data-cuota-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn[data-cuota-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.cuotaFilter = btn.dataset.cuotaFilter;
        renderCuotasTable(inv);
      });
    });
  }

  function renderCuotasTable(inv) {
    let cuotas = inv.cuotas;
    if (state.cuotaFilter !== 'all') cuotas = cuotas.filter(c => c.estado === state.cuotaFilter);

    if (cuotas.length === 0) {
      document.getElementById('cuotasTable').innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)">No hay cuotas con este filtro</div>`;
      return;
    }

    const rows = cuotas.map(c => {
      const esCancelacion = c.tipo === 'cancelacion';
      const label = esCancelacion ? '💲 Cancelación' : c.numero;
      const rowClass = esCancelacion ? `${c.estado} cancelacion-row` : c.estado;
      return `
      <tr class="${rowClass}">
        <td><div class="cuota-num ${c.estado}" style="${esCancelacion ? 'background:var(--purple);color:#fff;font-size:11px;padding:2px 6px' : ''}">${label}</div></td>
        <td>${fmtDate(c.fechaProgramada)}</td>
        <td><strong>${fmt$(c.monto)}</strong></td>
        <td><span class="status-pill status-${c.estado}">${c.estado === 'pagada' ? '✅ Pagada' : '⏳ Pendiente'}</span></td>
        <td>${fmtDate(c.fechaPago)}</td>
        <td>${c.montoPagado != null ? fmt$(c.montoPagado) : '—'}</td>
        <td>${c.nota || '—'}</td>
        <td>
          ${c.estado === 'pendiente'
            ? `<button class="btn btn-primary btn-sm" onclick="App.openPago('${inv.id}', ${c.numero})">${esCancelacion ? 'Pagar Cancelación' : 'Pagar'}</button>`
            : `<button class="btn btn-ghost btn-sm" style="color:var(--red-light)" onclick="App.despagarCuota('${inv.id}', ${c.numero})">↩ Revertir</button>`}
        </td>
      </tr>
    `;}).join('');

    document.getElementById('cuotasTable').innerHTML = `
      <table class="cuota-table">
        <thead>
          <tr>
            <th>N°</th><th>Fecha programada</th><th>Monto</th><th>Estado</th>
            <th>Fecha de pago</th><th>Monto pagado</th><th>Nota</th><th>Acción</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  // ==================== FORMULARIO ====================
  function saveInvestment(e) {
    e.preventDefault();
    const tieneCancelacion = document.getElementById('fTieneCancelacion').checked;
    const data = {
      nombre:              document.getElementById('fNombre').value.trim(),
      ubicacion:           document.getElementById('fUbicacion').value.trim(),
      m2:                  document.getElementById('fM2').value,
      valorTotal:          document.getElementById('fValorTotal').value,
      anticipo:            document.getElementById('fAnticipo').value,
      cantCuotas:          document.getElementById('fCantCuotas').value,
      valorCuota:          document.getElementById('fValorCuota').value,
      valorVentaPotencial: document.getElementById('fValorVenta').value || null,
      direccionExacta:     document.getElementById('fDireccionExacta').value.trim() || null,
      fechaInicio:         document.getElementById('fFechaInicio').value,
      fechaFin:            document.getElementById('fFechaFin').value,
      estado:              document.getElementById('fEstado').value,
      notas:               document.getElementById('fNotas').value.trim(),
      cancelacionMonto:    tieneCancelacion ? document.getElementById('fCancelacionMonto').value : null,
      cancelacionFecha:    tieneCancelacion ? document.getElementById('fCancelacionFecha').value : null,
      cancelacionDespues:  tieneCancelacion ? document.getElementById('fCancelacionDespues').value : null,
    };

    const editId = document.getElementById('editId').value;
    if (editId) {
      DB.update(editId, data);
      toast('Inversión actualizada correctamente');
      state.editMode = false;
      showDetalle(editId);
    } else {
      const inv = DB.create(data);
      toast('¡Inversión creada exitosamente! 🏢');
      showDetalle(inv.id);
    }
  }

  function editInvestment() {
    const inv = DB.getById(state.currentInvId);
    if (inv) editInvestmentObj(inv);
  }
  function editInvestmentById(id) {
    const inv = DB.getById(id);
    if (inv) editInvestmentObj(inv);
  }
  function editInvestmentObj(inv) {
    state.editMode = true;
    document.getElementById('editId').value           = inv.id;
    document.getElementById('fNombre').value          = inv.nombre;
    document.getElementById('fUbicacion').value       = inv.ubicacion;
    document.getElementById('fM2').value              = inv.m2 || '';
    document.getElementById('fValorTotal').value      = inv.valorTotal;
    document.getElementById('fAnticipo').value        = inv.anticipo;
    document.getElementById('fCantCuotas').value      = inv.cantCuotas;
    document.getElementById('fValorCuota').value      = inv.valorCuota;
    document.getElementById('fValorVenta').value      = inv.valorVentaPotencial || '';
    document.getElementById('fDireccionExacta').value = inv.direccionExacta || '';
    document.getElementById('fFechaInicio').value     = inv.fechaInicio || '';
    document.getElementById('fFechaFin').value        = inv.fechaFin || '';
    document.getElementById('fEstado').value          = inv.estado;
    document.getElementById('fNotas').value           = inv.notas || '';
    const tieneCancelacion = !!inv.cancelacionMonto;
    document.getElementById('fTieneCancelacion').checked          = tieneCancelacion;
    document.getElementById('cancelacionFields').style.display    = tieneCancelacion ? '' : 'none';
    document.getElementById('fCancelacionMonto').value            = inv.cancelacionMonto || '';
    document.getElementById('fCancelacionFecha').value            = inv.cancelacionFecha || '';
    document.getElementById('fCancelacionDespues').value          = inv.cancelacionDespues || '';
    state.currentInvId = inv.id;
    showView('nueva');
  }

  function toggleCancelacion() {
    const checked = document.getElementById('fTieneCancelacion').checked;
    document.getElementById('cancelacionFields').style.display = checked ? '' : 'none';
  }

  function resetForm() {
    document.getElementById('investmentForm').reset();
    document.getElementById('editId').value = '';
    document.getElementById('cancelacionFields').style.display = 'none';
    state.editMode = false;
  }

  // ==================== PAGOS ====================
  function openPago(invId, numeroCuota) {
    const inv = DB.getById(invId);
    if (!inv) return;
    const cuota = inv.cuotas.find(c => c.numero === numeroCuota);
    if (!cuota) return;

    state.pagoTarget = { invId, numeroCuota };
    document.getElementById('mFechaPago').value = cuota.fechaProgramada || todayISO();
    document.getElementById('mMontoPago').value = cuota.monto;
    document.getElementById('mNotaPago').value  = '';
    const esCancelacion = cuota.tipo === 'cancelacion';
    document.getElementById('modalCuotaInfo').innerHTML = `
      <strong>${inv.nombre}</strong><br/>
      ${esCancelacion
        ? `Pago de <strong>Cancelación</strong>`
        : `Cuota <strong>${cuota.numero}</strong> de ${inv.cantCuotas}`}
      · Monto original: <strong>${fmt$(cuota.monto)}</strong>
      ${cuota.fechaProgramada ? `· Programada: <strong>${fmtDate(cuota.fechaProgramada)}</strong>` : ''}
    `;
    document.getElementById('modalPago').style.display = 'flex';
  }

  function confirmPago() {
    if (!state.pagoTarget) return;
    const { invId, numeroCuota } = state.pagoTarget;
    const fechaPago   = document.getElementById('mFechaPago').value;
    const montoPagado = document.getElementById('mMontoPago').value;
    const nota        = document.getElementById('mNotaPago').value.trim();

    if (!montoPagado || isNaN(montoPagado) || parseFloat(montoPagado) <= 0) {
      toast('Ingresá un monto válido', 'error'); return;
    }

    const invActualizado = DB.pagarCuota(invId, numeroCuota, { fechaPago, montoPagado, nota });
    closeModal();
    toast(`✅ Cuota ${numeroCuota} registrada como pagada`);

    if (invActualizado && invActualizado.estado === 'finalizada') {
      setTimeout(() => {
        document.getElementById('modalFelicitacionesTitulo').textContent = `¡Felicitaciones, Capitán! 🎉`;
        document.getElementById('modalFelicitacionesMsg').textContent =
          `Terminaste de pagar "${invActualizado.nombre}". ¡Una inversión más conquistada! A seguir construyendo el futuro. 💪`;
        document.getElementById('modalFelicitaciones').style.display = 'flex';
      }, 600);
    }


    if (state.currentView === 'detalle' && state.currentInvId === invId) {
      state.cuotaFilter = 'all';
      document.querySelectorAll('.filter-btn[data-cuota-filter]').forEach(b => b.classList.remove('active'));
      document.querySelector('.filter-btn[data-cuota-filter="all"]')?.classList.add('active');
      renderDetalle(invId);
    } else {
      renderResumen();
    }
    renderSidebar();
  }

  function despagarCuota(invId, numeroCuota) {
    const raw = JSON.parse(localStorage.getItem('inmuebles_sist_v1'));
    const inv = raw.investments.find(i => i.id === invId);
    if (!inv) return;
    const cuota = inv.cuotas.find(c => c.numero === numeroCuota);
    if (!cuota) return;
    cuota.estado = 'pendiente'; cuota.fechaPago = null; cuota.montoPagado = null; cuota.nota = '';
    inv.estado   = 'activa'; inv.updatedAt = new Date().toISOString();
    localStorage.setItem('inmuebles_sist_v1', JSON.stringify(raw));
    toast(`↩ Cuota ${numeroCuota} revertida a pendiente`, 'info');
    renderDetalle(invId); renderSidebar();
  }

  // ==================== ELIMINAR ====================
  function promptEliminar(invId) {
    state.eliminarTarget = invId;
    document.getElementById('modalEliminar').style.display = 'flex';
  }
  function confirmEliminar() {
    if (!state.eliminarTarget) return;
    DB.remove(state.eliminarTarget);
    state.eliminarTarget = null;
    closeModal();
    toast('Inversión eliminada', 'info');
    showView('resumen');
  }

  // ==================== MODAL ====================
  function closeModal() {
    document.getElementById('modalPago').style.display = 'none';
    document.getElementById('modalEliminar').style.display = 'none';
    state.pagoTarget = null; state.eliminarTarget = null;
  }

  // ==================== VALOR DE VENTA RÁPIDO ====================
  function setSaleValue(invId) {
    const input = document.getElementById('quickSaleInput');
    if (!input) return;
    const val = parseFloat(input.value);
    if (!val || isNaN(val) || val <= 0) { toast('Ingresá un valor de venta válido', 'error'); return; }

    const raw = JSON.parse(localStorage.getItem('inmuebles_sist_v1') || '{}');
    if (!raw.investments) return;
    const inv = raw.investments.find(i => i.id === invId);
    if (!inv) return;
    inv.valorVentaPotencial = val;
    inv.updatedAt = new Date().toISOString();
    localStorage.setItem('inmuebles_sist_v1', JSON.stringify(raw));

    toast('✅ Valor de venta actualizado');
    renderDetalle(invId);
    renderSidebar();
  }

  function showSaleValueForm() {
    const form = document.getElementById('roiEditInline');
    if (form) form.style.display = form.style.display === 'none' ? '' : 'none';
  }

  // ==================== EXCEL ====================
  function exportExcel() {
    try {
      const filename = ExcelExporter.export();
      if (!filename) { toast('No hay inversiones para exportar', 'error'); return; }
      toast(`📥 ${filename} descargado`, 'success', 4000);
    } catch (err) {
      toast('Error al exportar el archivo Excel', 'error');
      console.error(err);
    }
  }

  // ==================== NAV ====================
  function initNavItems() {
    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const view = item.dataset.view;
        if (view === 'nueva') resetForm();
        showView(view);
      });
    });
  }

  // ==================== INIT ====================
  function init() {
    initSidebar();
    initNavItems();
    showView('resumen');
  }

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
  document.getElementById('modalPago').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModal(); });
  document.getElementById('modalEliminar').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModal(); });
  document.getElementById('navNueva').addEventListener('click', resetForm);

  return {
    init, showView, showDetalle, saveInvestment,
    editInvestment, editInvestmentById,
    openPago, confirmPago, despagarCuota,
    closeModal, promptEliminar, confirmEliminar,
    exportExcel, setSaleValue, showSaleValueForm, toggleCancelacion,
  };
})();

// App.init() es llamado por auth.js una vez que se determina el estado de autenticación
