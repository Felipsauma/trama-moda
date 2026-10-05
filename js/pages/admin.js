// ===== Painel administrativo =====
function pageAdmin(params) {
  if (!auth.isAdmin()) {
    app.innerHTML = `<div class="empty"><h2>Acesso restrito</h2><p>Entre com uma conta de administrador.</p><a href="#/conta?next=admin" class="btn">Entrar</a></div>`;
    return;
  }
  const tab = params.get("aba") || "pedidos";
  const all = orders.all().slice().reverse();
  const kpi = storeKpis(all);

  app.innerHTML = `
    <div class="account-head">
      <div><span class="eyebrow">Administração</span><h1 style="margin:4px 0 0">Painel da loja</h1></div>
      <a href="#/conta" class="btn ghost">Voltar à conta</a>
    </div>
    <div class="kpis">
      <div class="kpi"><span>Faturamento</span><strong>${brl(kpi.revenue)}</strong><small>${kpi.paid} pedido(s) pago(s)</small></div>
      <div class="kpi"><span>Ticket médio</span><strong>${brl(kpi.avgTicket)}</strong><small>por pedido pago</small></div>
      <div class="kpi"><span>Aguardando pagamento</span><strong>${kpi.awaiting}</strong><small>Pix e boleto</small></div>
      <div class="kpi"><span>Tamanhos esgotados</span><strong>${kpi.outSkus}</strong><small>de ${kpi.totalSkus} no total</small></div>
    </div>
    <div class="tabs">
      <a href="#/admin?aba=pedidos" class="${tab === "pedidos" ? "active" : ""}">Pedidos (${all.length})</a>
      <a href="#/admin?aba=estoque" class="${tab === "estoque" ? "active" : ""}">Estoque</a>
      <a href="#/admin?aba=clientes" class="${tab === "clientes" ? "active" : ""}">Clientes</a>
    </div>
    <div id="admin-content"></div>`;

  const content = $("#admin-content");

  if (tab === "pedidos") {
    const renderOrders = (filter = "") => {
      const list = filter ? all.filter((o) => o.status === filter) : all;
      $("#orders-table").innerHTML = list.length ? `
        <table class="table">
          <thead><tr><th>Pedido</th><th>Data</th><th>Cliente</th><th>Itens</th><th>Total</th><th>Pagamento</th><th>Status</th></tr></thead>
          <tbody>${list.map((o) => `
            <tr>
              <td><a class="link" href="#/pedido/${o.id}">#${o.id}</a></td>
              <td>${fmtDate(o.date)}</td>
              <td>${esc(o.recipient)}<br><small class="muted">${esc(o.email)}</small></td>
              <td>${o.items.reduce((n, i) => n + i.qty, 0)}</td>
              <td><strong>${brl(o.total)}</strong></td>
              <td><small>${esc(o.methodLabel)}</small></td>
              <td><select class="select sm" data-order="${o.id}">${[...STATUS_FLOW, "Cancelado"].map((s) => `<option ${s === o.status ? "selected" : ""}>${s}</option>`).join("")}</select></td>
            </tr>`).join("")}</tbody>
        </table>` : `<p class="muted">Nenhum pedido encontrado.</p>`;
    };
    content.innerHTML = `
      <div class="toolbar" style="border:0;padding-top:0">
        <select class="select" id="status-filter"><option value="">Todos os status</option>${[...STATUS_FLOW, "Cancelado"].map((s) => `<option>${s}</option>`).join("")}</select>
      </div>
      <div class="table-wrap" id="orders-table"></div>`;
    renderOrders();
    $("#status-filter").addEventListener("change", (e) => renderOrders(e.target.value));
    content.addEventListener("change", (e) => {
      const sel = e.target.closest("[data-order]");
      if (!sel) return;
      orders.setStatus(sel.dataset.order, sel.value);
      toast(`Pedido #${sel.dataset.order}: ${sel.value}`);
      pageAdmin(params);
    });
  }

  if (tab === "estoque") {
    content.innerHTML = `
      <div class="toolbar" style="border:0;padding-top:0">
        <input class="search" id="stock-q" type="search" placeholder="Filtrar produtos...">
      </div>
      <div class="table-wrap">
        <table class="table stock-table">
          <thead><tr><th>Produto</th><th>Preço</th><th>Estoque por tamanho</th><th>Total</th></tr></thead>
          <tbody>${PRODUCTS.map((p) => `
            <tr data-name="${esc(norm(p.name))}">
              <td><div class="mini-item" style="margin:0;grid-template-columns:44px 1fr">${thumb(p)}<span>${esc(p.name)}<br><small class="muted">${CATEGORIES[p.cat]}</small></span></div></td>
              <td>${brl(p.price)}</td>
              <td><div class="stock-inputs">${p.sizes.map((s) => `<label><span>${s}</span><input type="number" min="0" value="${stock.get(p.id, s)}" data-id="${p.id}" data-size="${s}" class="${stock.get(p.id, s) === 0 ? "zero" : ""}"></label>`).join("")}</div></td>
              <td><strong id="total-${p.id}">${stock.total(p)}</strong></td>
            </tr>`).join("")}</tbody>
        </table>
      </div>`;
    $("#stock-q").addEventListener("input", (e) => {
      const q = norm(e.target.value);
      $$(".stock-table tbody tr").forEach((tr) => (tr.hidden = !tr.dataset.name.includes(q)));
    });
    content.addEventListener("change", (e) => {
      const input = e.target.closest("[data-id]");
      if (!input) return;
      stock.set(input.dataset.id, input.dataset.size, input.value);
      const p = findProduct(input.dataset.id);
      input.value = stock.get(p.id, input.dataset.size);
      input.classList.toggle("zero", Number(input.value) === 0);
      $(`#total-${p.id}`).textContent = stock.total(p);
      toast(`Estoque atualizado: ${p.name} (${input.dataset.size})`);
    });
  }

  if (tab === "clientes") {
    const users = auth.users().filter((u) => u.role !== "admin");
    content.innerHTML = users.length ? `
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Cliente</th><th>Cadastro</th><th>Cidade</th><th>Pedidos</th><th>Total gasto</th></tr></thead>
          <tbody>${users.map((u) => {
            const os = orders.ofUser(u.email).filter((o) => o.status !== "Cancelado");
            return `<tr>
              <td>${esc(u.name)}<br><small class="muted">${esc(u.email)}</small></td>
              <td>${u.createdAt ? new Date(u.createdAt).toLocaleDateString("pt-BR") : "—"}</td>
              <td>${u.address?.city ? `${esc(u.address.city)} - ${esc(u.address.uf)}` : "—"}</td>
              <td>${os.length}</td>
              <td>${brl(os.reduce((s, o) => s + o.total, 0))}</td>
            </tr>`;
          }).join("")}</tbody>
        </table>
      </div>` : `<p class="muted">Nenhum cliente cadastrado ainda.</p>`;
  }
}

