// ===== Números do painel, faturamento por dia e exportação =====
const isPaidOrder = (o) => !["Aguardando pagamento", "Cancelado"].includes(o.status);

function storeKpis(list) {
  const paid = list.filter(isPaidOrder);
  const revenue = paid.reduce((s, o) => s + o.total, 0);
  const skus = PRODUCTS.flatMap((p) => p.sizes.map((s) => stock.get(p.id, s)));
  return {
    revenue,
    paid: paid.length,
    avgTicket: paid.length ? revenue / paid.length : 0,
    awaiting: list.filter((o) => o.status === "Aguardando pagamento").length,
    outSkus: skus.filter((n) => n === 0).length,
    totalSkus: skus.length,
  };
}

const pad2 = (n) => String(n).padStart(2, "0");
const localDayKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

// Um item por dia local, do mais antigo até o dia de `now`; só pedidos pagos
function revenueByDay(list, days, now = Date.now()) {
  const end = new Date(now);
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end.getFullYear(), end.getMonth(), end.getDate() - i);
    out.push({ date: localDayKey(d), label: `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`, total: 0, count: 0 });
  }
  const byDate = Object.fromEntries(out.map((d) => [d.date, d]));
  list.filter(isPaidOrder).forEach((o) => {
    const day = byDate[localDayKey(new Date(o.date))];
    if (day) { day.total += o.total; day.count++; }
  });
  return out;
}

function lowStock(limit = 2) {
  return visibleProducts()
    .flatMap((product) => product.sizes.map((size) => ({ product, size, qty: stock.get(product.id, size) })))
    .filter((r) => r.qty <= limit)
    .sort((a, b) => a.qty - b.qty);
}

// CSV para o Excel em português: BOM, separador ";", CRLF, vírgula decimal
function ordersToCsv(list) {
  const text = (v) => {
    let s = String(v ?? "");
    if (/^[=+\-@]/.test(s)) s = "'" + s; // evita execução de fórmula
    return `"${s.replace(/"/g, '""')}"`;
  };
  const num = (n) => (Number(n) || 0).toFixed(2).replace(".", ",");
  const when = (ts) => {
    const d = new Date(ts);
    return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  };
  const rows = list.map((o) => [
    text(o.id), text(when(o.date)), text(o.recipient), text(o.email),
    o.items.reduce((n, i) => n + i.qty, 0),
    num(o.subtotal), num((o.discount || 0) + (o.pixDiscount || 0)), num(orderShipping(o).price), num(o.total),
    text(o.methodLabel), text(o.status),
  ].join(";"));
  const header = "Pedido;Data;Cliente;E-mail;Itens;Subtotal;Desconto;Frete;Total;Pagamento;Status";
  return "\uFEFF" + [header, ...rows].join("\r\n");
}
