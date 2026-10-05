const test = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./helpers/load");

// Data local (o código agrupa por dia local, então os testes também)
const at = (y, m, d, h = 12, mi = 0, s = 0, ms = 0) => new Date(y, m - 1, d, h, mi, s, ms).getTime();
const order = (o) => ({
  id: "1", email: "a@x.com", recipient: "Ana", date: at(2026, 3, 10), items: [{ id: 1, name: "X", size: "M", qty: 1, price: 100 }],
  subtotal: 100, discount: 0, pixDiscount: 0, shipping: { name: "PAC", price: 18.9 }, total: 118.9, methodLabel: "Boleto bancário", status: "Pago", ...o,
});
const call = (get, fn, ...args) => get(`${fn}(${args.map((a) => JSON.stringify(a)).join(", ")})`);

test("storeKpis: faturamento, pagos, ticket médio, aguardando e tamanhos esgotados", () => {
  const { get } = load();
  const list = [
    order({ id: "1", total: 100, status: "Pago" }),
    order({ id: "2", total: 200, status: "Entregue" }),
    order({ id: "3", total: 999, status: "Cancelado" }),
    order({ id: "4", total: 50, status: "Aguardando pagamento" }),
    order({ id: "5", total: 300, status: "Enviado" }),
  ];
  const out = get("PRODUCTS.flatMap((p) => p.sizes.map((s) => stock.get(p.id, s))).filter((n) => n === 0).length");
  const total = get("PRODUCTS.reduce((n, p) => n + p.sizes.length, 0)");
  assert.deepEqual(call(get, "storeKpis", list), { revenue: 600, paid: 3, avgTicket: 200, awaiting: 1, outSkus: out, totalSkus: total });
  const empty = call(get, "storeKpis", []);
  assert.equal(empty.revenue, 0);
  assert.equal(empty.avgTicket, 0);
  assert.equal(empty.paid, 0);
});

test("revenueByDay: um item por dia, do mais antigo para hoje, só pedidos pagos", () => {
  const { get } = load();
  const now = at(2026, 3, 10, 23, 30);
  const list = [
    order({ date: at(2026, 3, 10, 0, 0, 0, 0), total: 100 }),            // hoje, 00:00 exato
    order({ date: at(2026, 3, 9, 23, 59, 59, 999), total: 50 }),         // ontem, último instante
    order({ date: at(2026, 3, 9, 8), total: 25, status: "Entregue" }),
    order({ date: at(2026, 3, 9, 9), total: 900, status: "Cancelado" }),
    order({ date: at(2026, 3, 9, 10), total: 900, status: "Aguardando pagamento" }),
    order({ date: at(2026, 3, 7, 10), total: 10 }),
    order({ date: at(2026, 3, 1, 10), total: 777 }),                      // fora da janela
  ];
  const r = call(get, "revenueByDay", list, 4, now);
  assert.deepEqual(r, [
    { date: "2026-03-07", label: "07/03", total: 10, count: 1 },
    { date: "2026-03-08", label: "08/03", total: 0, count: 0 },
    { date: "2026-03-09", label: "09/03", total: 75, count: 2 },
    { date: "2026-03-10", label: "10/03", total: 100, count: 1 },
  ]);
});

test("revenueByDay: atravessa a virada de mês e aceita Date em now", () => {
  const { get } = load();
  const r = get(`revenueByDay([], 4, new Date(${at(2026, 3, 2, 0, 5)}))`);
  assert.deepEqual(r.map((d) => d.date), ["2026-02-27", "2026-02-28", "2026-03-01", "2026-03-02"]);
  assert.deepEqual(call(get, "revenueByDay", [], 14, at(2026, 3, 10)).length, 14);
});

test("lowStock: produtos visíveis com estoque até o limite, do menor para o maior", () => {
  const { get } = load();
  get("PRODUCTS.forEach((p) => p.sizes.forEach((s) => stock.set(p.id, s, 9)))");
  assert.deepEqual(get("lowStock()"), []);
  get("stock.set(1, 'M', 2); stock.set(2, 'P', 0); stock.set(3, 'G', 1); stock.set(4, 'P', 3)");
  const low = get("lowStock()");
  assert.deepEqual(low.map((l) => [l.product.id, l.size, l.qty]), [[2, "P", 0], [3, "G", 1], [1, "M", 2]]);
  assert.deepEqual(get("lowStock(3).map((l) => l.qty)"), [0, 1, 2, 3]);
  assert.deepEqual(get("lowStock(0).map((l) => l.qty)"), [0]);
  // ocultos não aparecem
  get("catalog.set(2, { price: 189.9, hidden: true })");
  assert.deepEqual(get("lowStock().map((l) => l.product.id)"), [3, 1]);
});

test("ordersToCsv: BOM, separador ;, CRLF, cabeçalho, números em pt-BR", () => {
  const { get } = load();
  const o = order({
    id: "12345678", date: at(2026, 3, 5, 14, 7), items: [{ qty: 2 }, { qty: 1 }], subtotal: 1234.5, discount: 10, pixDiscount: 5.25,
    shipping: { name: "PAC", price: 18.9 }, total: 1237.65, methodLabel: "Pix (5% off)", status: "Pago",
  });
  const csv = call(get, "ordersToCsv", [o]);
  assert.ok(csv.startsWith("﻿"));
  const lines = csv.slice(1).split("\r\n");
  assert.equal(lines[0], "Pedido;Data;Cliente;E-mail;Itens;Subtotal;Desconto;Frete;Total;Pagamento;Status");
  assert.equal(lines[1], '"12345678";"05/03/2026 14:07";"Ana";"a@x.com";3;1234,50;15,25;18,90;1237,65;"Pix (5% off)";"Pago"');
  assert.equal(lines.length, 2);
  // frete em pedidos antigos é um número solto
  const old = call(get, "ordersToCsv", [order({ shipping: 22 })]);
  assert.ok(old.includes(";22,00;"));
  // sem pedidos: só o cabeçalho
  assert.equal(call(get, "ordersToCsv", []), "﻿Pedido;Data;Cliente;E-mail;Itens;Subtotal;Desconto;Frete;Total;Pagamento;Status");
});

test("ordersToCsv: aspas, ponto e vírgula e fórmulas no texto", () => {
  const { get } = load();
  const nasty = order({ recipient: 'Ana "Bia"; Souza', email: "x@y.com", methodLabel: "=HYPERLINK(\"http://x\")" });
  const text = call(get, "ordersToCsv", [nasty]);
  assert.ok(text.includes('"Ana ""Bia""; Souza"'));
  assert.ok(text.includes(`"'=HYPERLINK(""http://x"")"`));
  for (const v of ["+1", "-2", "@soma", "=1+1"]) {
    assert.ok(call(get, "ordersToCsv", [order({ recipient: v })]).includes(`"'${v}"`), `${v} deve ganhar apóstrofo`);
  }
  // texto normal não ganha apóstrofo
  assert.ok(call(get, "ordersToCsv", [order({ recipient: "Ana" })]).includes(';"Ana";'));
});
