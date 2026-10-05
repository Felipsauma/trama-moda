// ===== Painel administrativo =====
function pageAdmin(params) {
  setTitle("Painel da loja");

  if (!auth.isAdmin()) {
    app.innerHTML = `
      <div class="empty">
        ${icon("trancar")}
        <h1>Acesso restrito</h1>
        <p>Entre com uma conta de administrador para acessar o painel.</p>
        <a href="#/conta?next=admin" class="btn">Entrar</a>
      </div>
    `;
    return;
  }

  const tab = params.get("aba") || "pedidos";
  const allOrders = orders.all().slice().reverse();
  const kpis = storeKpis(allOrders);
  const now = Date.now();
  const revDays = revenueByDay(allOrders, 14, now);
  const maxDayRevenue = Math.max(...revDays.map((d) => d.total), 0);
  const hasRevenue = maxDayRevenue > 0;

  app.innerHTML = `
    <div class="admin-view">
      <div class="admin-head">
        <div>
          <h1>Painel da loja</h1>
          <span class="muted small">Visão geral do negócio e controle de operações</span>
        </div>
        <a href="#/conta" class="btn ghost sm">Voltar à conta</a>
      </div>

      <!-- Fita de fatos (sem cartões, linha contínua com divisões de 1px) -->
      <div class="kpi-strip" role="region" aria-label="Indicadores da loja">
        <div class="kpi-fact">
          <span class="kpi-label">Faturamento</span>
          <span class="kpi-value">${brl(kpis.revenue)}</span>
          <span class="kpi-sub">${kpis.paid} pedido(s) pago(s)</span>
        </div>
        <div class="kpi-fact">
          <span class="kpi-label">Pedidos pagos</span>
          <span class="kpi-value">${kpis.paid}</span>
          <span class="kpi-sub">de ${allOrders.length} pedido(s)</span>
        </div>
        <div class="kpi-fact">
          <span class="kpi-label">Ticket médio</span>
          <span class="kpi-value">${brl(kpis.avgTicket)}</span>
          <span class="kpi-sub">por pedido pago</span>
        </div>
        <div class="kpi-fact">
          <span class="kpi-label">Aguardando pagamento</span>
          <span class="kpi-value">${kpis.awaiting}</span>
          <span class="kpi-sub">Pix e boleto</span>
        </div>
        <div class="kpi-fact">
          <span class="kpi-label">Tamanhos esgotados</span>
          <span class="kpi-value">${kpis.outSkus}</span>
          <span class="kpi-sub">de ${kpis.totalSkus} variações</span>
        </div>
      </div>

      <!-- Gráfico de barras de faturamento dos últimos 14 dias -->
      <section class="admin-chart-section" aria-labelledby="chart-title">
        <div class="admin-chart-head">
          <h2 id="chart-title">Faturamento dos últimos 14 dias</h2>
          <span class="muted small">${hasRevenue ? "Barras proporcionais ao maior dia" : ""}</span>
        </div>

        ${!hasRevenue ? `
          <div class="admin-chart-empty">Ainda não há vendas neste período.</div>
        ` : `
          <div class="chart-bars-wrap" aria-hidden="true">
            ${revDays.map((d, idx) => {
              const isToday = idx === revDays.length - 1;
              const heightPct = maxDayRevenue > 0 && d.total > 0 ? Math.max(Math.round((d.total / maxDayRevenue) * 100), 4) : 0;
              const titleText = `${d.label}: ${brl(d.total)} (${d.count} pedido${d.count === 1 ? "" : "s"})`;
              return `
                <div class="chart-col ${isToday ? "is-today" : ""}" title="${titleText}">
                  <div class="chart-bar-slot">
                    <div class="chart-bar" style="height: ${heightPct}%;"></div>
                  </div>
                  <span class="chart-col-label">${d.label}</span>
                </div>
              `;
            }).join("")}
          </div>
        `}

        <!-- Tabela equivalente visualmente oculta para leitores de tela -->
        <table class="sr-only">
          <caption>Faturamento por dia nos últimos 14 dias</caption>
          <thead>
            <tr>
              <th scope="col">Data</th>
              <th scope="col">Pedidos</th>
              <th scope="col">Total</th>
            </tr>
          </thead>
          <tbody>
            ${revDays.map((d) => `
              <tr>
                <td>${d.label}</td>
                <td>${d.count}</td>
                <td>${brl(d.total)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </section>

      <!-- Abas de navegação -->
      <div class="tabs" role="tablist">
        <a href="#/admin?aba=pedidos" class="${tab === "pedidos" ? "active" : ""}" role="tab" aria-selected="${tab === "pedidos"}">
          Pedidos (${allOrders.length})
        </a>
        <a href="#/admin?aba=produtos" class="${tab === "produtos" ? "active" : ""}" role="tab" aria-selected="${tab === "produtos"}">
          Produtos
        </a>
        <a href="#/admin?aba=clientes" class="${tab === "clientes" ? "active" : ""}" role="tab" aria-selected="${tab === "clientes"}">
          Clientes
        </a>
        <a href="#/admin?aba=aviseme" class="${tab === "aviseme" ? "active" : ""}" role="tab" aria-selected="${tab === "aviseme"}">
          Avise-me
        </a>
      </div>

      <div id="admin-tab-content"></div>
    </div>
  `;

  const content = $("#admin-tab-content");

  // ==================== ABA PEDIDOS ====================
  if (tab === "pedidos") {
    let currentFilter = "";
    let currentSearch = "";

    const getFilteredOrders = () => {
      let list = allOrders;
      if (currentFilter) list = list.filter((o) => o.status === currentFilter);
      if (currentSearch) {
        const q = norm(currentSearch);
        list = list.filter((o) =>
          String(o.id).toLowerCase().includes(q) ||
          norm(o.recipient || "").includes(q) ||
          norm(o.email || "").includes(q)
        );
      }
      return list;
    };

    const renderOrdersTable = () => {
      const list = getFilteredOrders();
      const wrap = $("#admin-orders-table-wrap");
      if (!wrap) return;

      if (!list.length) {
        wrap.innerHTML = `<p class="muted admin-empty-msg">Nenhum pedido encontrado com esses filtros.</p>`;
        return;
      }

      wrap.innerHTML = `
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Data</th>
                <th>Cliente</th>
                <th>Itens</th>
                <th>Total</th>
                <th>Pagamento</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${list.map((o) => `
                <tr>
                  <td>
                    <a class="link" href="#/pedido/${o.id}"><strong>#${o.id}</strong></a>
                    ${o.gift ? `<br><span class="tag-gift" title="${esc(o.gift.message || "Embalagem para presente")}">${icon("presente")} Presente</span>` : ""}
                  </td>
                  <td class="small muted">${fmtDate(o.date)}</td>
                  <td>
                    <strong>${esc(o.recipient)}</strong><br>
                    <span class="muted small">${esc(o.email)}</span>
                  </td>
                  <td>${o.items.reduce((acc, i) => acc + i.qty, 0)}</td>
                  <td><strong>${brl(o.total)}</strong></td>
                  <td class="small">${esc(o.methodLabel)}</td>
                  <td>
                    <select class="select sm" data-order-status="${o.id}">
                      ${[...STATUS_FLOW, "Cancelado"].map((st) => `
                        <option value="${st}" ${st === o.status ? "selected" : ""}>${st}</option>
                      `).join("")}
                    </select>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `;
    };

    content.innerHTML = `
      <div class="admin-toolbar">
        <div class="admin-toolbar-group">
          <select class="select sm" id="admin-order-status-filter">
            <option value="">Todos os status</option>
            ${[...STATUS_FLOW, "Cancelado"].map((st) => `<option value="${st}">${st}</option>`).join("")}
          </select>
          <input class="input sm" id="admin-order-search" type="search" placeholder="Buscar número, nome ou e-mail...">
        </div>
        <button class="btn secondary sm" id="admin-export-csv" type="button">
          ${icon("sacola")} Exportar CSV
        </button>
      </div>
      <div id="admin-orders-table-wrap"></div>
    `;

    renderOrdersTable();

    $("#admin-order-status-filter").addEventListener("change", (e) => {
      currentFilter = e.target.value;
      renderOrdersTable();
    });

    $("#admin-order-search").addEventListener("input", (e) => {
      currentSearch = e.target.value;
      renderOrdersTable();
    });

    $("#admin-export-csv").addEventListener("click", () => {
      const list = getFilteredOrders();
      const csvData = ordersToCsv(list);
      const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const nowD = new Date();
      const y = nowD.getFullYear();
      const m = String(nowD.getMonth() + 1).padStart(2, "0");
      const d = String(nowD.getDate()).padStart(2, "0");
      const a = document.createElement("a");
      a.href = url;
      a.download = `pedidos-trama-${y}-${m}-${d}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast("Arquivo CSV exportado com sucesso");
    });

    content.addEventListener("change", (e) => {
      const sel = e.target.closest("[data-order-status]");
      if (!sel) return;
      const orderId = sel.dataset.orderStatus;
      orders.setStatus(orderId, sel.value);
      toast(`Pedido #${orderId}: ${sel.value}`);
      pageAdmin(params);
    });
  }

  // ==================== ABA PRODUTOS ====================
  if (tab === "produtos") {
    let filterQuery = "";
    let onlyLowStock = false;

    const renderProductsList = () => {
      const wrap = $("#admin-products-table-wrap");
      if (!wrap) return;

      let list = PRODUCTS;
      if (filterQuery) {
        const q = norm(filterQuery);
        list = list.filter((p) => norm(p.name).includes(q) || norm(CATEGORIES[p.cat] || "").includes(q));
      }

      const lowStockEntries = lowStock();
      const lowStockProductIds = new Set(lowStockEntries.map((e) => e.product.id));

      if (onlyLowStock) {
        list = list.filter((p) => lowStockProductIds.has(p.id));
      }

      if (!list.length) {
        wrap.innerHTML = `<p class="muted admin-empty-msg">Nenhum produto encontrado.</p>`;
        return;
      }

      wrap.innerHTML = `
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Preço e promoção</th>
                <th>Estoque por tamanho</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${list.map((p) => `
                <tr data-pid="${p.id}">
                  <td>
                    <div class="admin-prod-info">
                      ${thumb(p, "sm")}
                      <div>
                        <strong>${esc(p.name)}</strong>
                        <div class="muted small">${CATEGORIES[p.cat]}, ID ${p.id}</div>
                        ${p.hidden ? `<span class="tag out">Oculto na loja</span>` : ""}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div class="prod-edit-cell">
                      <div class="prod-field-row">
                        <label for="p-price-${p.id}">Preço</label>
                        <input type="number" step="0.01" min="0.01" id="p-price-${p.id}" class="input sm" value="${p.price}" data-field="price">
                      </div>
                      <div class="prod-field-row">
                        <label for="p-old-${p.id}">Original</label>
                        <input type="number" step="0.01" id="p-old-${p.id}" class="input sm" value="${p.oldPrice ?? ""}" placeholder="Opcional" data-field="oldPrice">
                      </div>
                      <div class="prod-field-row">
                        <label class="check small">
                          <input type="checkbox" data-field="hidden" ${p.hidden ? "checked" : ""}>
                          <span>Oculto</span>
                        </label>
                      </div>
                      <div class="prod-actions-row">
                        <button class="btn secondary sm" data-action="save-prod" data-id="${p.id}" type="button">Salvar</button>
                        <button class="btn ghost sm" data-action="reset-prod" data-id="${p.id}" type="button">Restaurar original</button>
                      </div>
                      <p class="prod-err" id="prod-err-${p.id}" hidden></p>
                    </div>
                  </td>
                  <td>
                    <div class="stock-grid">
                      ${p.sizes.map((s) => {
                        const q = stock.get(p.id, s);
                        return `
                          <div class="stock-box ${q === 0 ? "is-zero" : ""}">
                            <span class="muted">${s}</span>
                            <input type="number" min="0" value="${q}" class="input sm" data-stock-pid="${p.id}" data-stock-size="${s}">
                          </div>
                        `;
                      }).join("")}
                    </div>
                  </td>
                  <td>
                    <strong class="nums" id="prod-total-stock-${p.id}">${stock.total(p)}</strong>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `;
    };

    content.innerHTML = `
      <div class="admin-toolbar">
        <div class="admin-toolbar-group">
          <input class="input sm" id="admin-prod-search" type="search" placeholder="Filtrar por nome ou categoria...">
          <label class="toggle">
            <input type="checkbox" id="admin-prod-low-stock" role="switch">
            <span class="toggle-track"></span>
            <span>Só estoque baixo (≤ 2 peças)</span>
          </label>
        </div>
      </div>
      <div id="admin-products-table-wrap"></div>
    `;

    renderProductsList();

    $("#admin-prod-search").addEventListener("input", (e) => {
      filterQuery = e.target.value;
      renderProductsList();
    });

    $("#admin-prod-low-stock").addEventListener("change", (e) => {
      onlyLowStock = e.target.checked;
      renderProductsList();
    });

    // Salvar e resetar produto
    content.addEventListener("click", (e) => {
      const saveBtn = e.target.closest("[data-action='save-prod']");
      if (saveBtn) {
        const pid = Number(saveBtn.dataset.id);
        const errEl = $(`#prod-err-${pid}`);
        if (errEl) errEl.hidden = true;

        const priceVal = $(`#p-price-${pid}`).value;
        const oldVal = $(`#p-old-${pid}`).value.trim();
        const hiddenVal = $(`tr[data-pid="${pid}"] input[data-field="hidden"]`).checked;

        try {
          catalog.set(pid, {
            price: priceVal,
            oldPrice: oldVal ? oldVal : null,
            hidden: hiddenVal,
          });
          toast("Produto atualizado com sucesso");
          renderProductsList();
        } catch (err) {
          if (errEl) {
            errEl.textContent = err.message;
            errEl.hidden = false;
          }
        }
        return;
      }

      const resetBtn = e.target.closest("[data-action='reset-prod']");
      if (resetBtn) {
        const pid = Number(resetBtn.dataset.id);
        catalog.reset(pid);
        toast("Produto restaurado aos valores padrão");
        renderProductsList();
      }
    });

    // Alteração de estoque
    content.addEventListener("change", (e) => {
      const stockInput = e.target.closest("[data-stock-pid]");
      if (!stockInput) return;
      const pid = Number(stockInput.dataset.stockPid);
      const size = stockInput.dataset.stockSize;
      const val = stockInput.value;
      stock.set(pid, size, val);
      const p = findProduct(pid);
      stockInput.value = stock.get(pid, size);
      stockInput.closest(".stock-box")?.classList.toggle("is-zero", Number(stockInput.value) === 0);
      const totalEl = $(`#prod-total-stock-${pid}`);
      if (totalEl) totalEl.textContent = stock.total(p);
      toast(`Estoque atualizado: ${p.name} (${size})`);
    });
  }

  // ==================== ABA CLIENTES ====================
  if (tab === "clientes") {
    const users = auth.users().filter((u) => u.role !== "admin");
    content.innerHTML = users.length ? `
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Cadastro</th>
              <th>Localização</th>
              <th>Pedidos</th>
              <th>Total gasto</th>
            </tr>
          </thead>
          <tbody>
            ${users.map((u) => {
              const uOrders = orders.ofUser(u.email).filter((o) => o.status !== "Cancelado");
              const totalSpent = uOrders.reduce((acc, o) => acc + o.total, 0);
              return `
                <tr>
                  <td>
                    <strong>${esc(u.name)}</strong><br>
                    <span class="muted small">${esc(u.email)}</span>
                    ${u.cpf ? `<br><span class="muted small">CPF: ${esc(u.cpf)}</span>` : ""}
                  </td>
                  <td class="small muted">${u.createdAt ? new Date(u.createdAt).toLocaleDateString("pt-BR") : "—"}</td>
                  <td class="small">${u.address?.city ? `${esc(u.address.city)} - ${esc(u.address.uf)}` : "—"}</td>
                  <td>${uOrders.length}</td>
                  <td><strong>${brl(totalSpent)}</strong></td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    ` : `<p class="muted admin-empty-msg">Nenhum cliente cadastrado ainda.</p>`;
  }

  // ==================== ABA AVISE-ME ====================
  if (tab === "aviseme") {
    const rawWaitlist = waitlist.all();

    // Agrupa por produto e tamanho: chave `${id}:${size}`
    const grouped = {};
    rawWaitlist.forEach((w) => {
      const key = `${w.id}:${w.size}`;
      if (!grouped[key]) {
        grouped[key] = {
          id: w.id,
          size: w.size,
          count: 0,
          emails: [],
        };
      }
      grouped[key].count++;
      grouped[key].emails.push(w.email);
    });

    const list = Object.values(grouped).map((g) => {
      const p = findProduct(g.id);
      const currentStock = stock.get(g.id, g.size);
      return { ...g, product: p, stock: currentStock };
    });

    content.innerHTML = list.length ? `
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Tamanho</th>
              <th>Interessados</th>
              <th>Estoque atual</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            ${list.map((row) => `
              <tr>
                <td>
                  <div class="admin-prod-info">
                    ${row.product ? thumb(row.product, "sm") : ""}
                    <div>
                      <strong>${esc(row.product?.name || `Produto #${row.id}`)}</strong><br>
                      <span class="muted small">${row.product ? CATEGORIES[row.product.cat] : ""}</span>
                    </div>
                  </div>
                </td>
                <td><strong class="tag">${esc(row.size)}</strong></td>
                <td>
                  <strong>${row.count} pessoa(s)</strong><br>
                  <span class="muted small">${row.emails.map(esc).join(", ")}</span>
                </td>
                <td>
                  <span class="nums ${row.stock === 0 ? "tag out" : "tag ok"}">
                    ${row.stock === 0 ? "Esgotado (0)" : `${row.stock} em estoque`}
                  </span>
                </td>
                <td>
                  <a href="#/admin?aba=produtos" class="btn secondary sm">Repor estoque</a>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    ` : `<p class="muted admin-empty-msg">Nenhum pedido de aviso na fila.</p>`;
  }
}
