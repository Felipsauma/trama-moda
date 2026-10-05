const test = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./helpers/load");

// Produto com vários tamanhos e estoque conhecido no primeiro tamanho
const withStock = (get, qty = 5) => {
  const p = get("PRODUCTS.find((x) => x.sizes.length > 1)");
  get(`stock.set(${p.id}, "${p.sizes[0]}", ${qty})`);
  return { id: p.id, size: p.sizes[0], price: p.price };
};

test("crc16 confere com o valor de referência", () => {
  const { get } = load();
  assert.equal(get('crc16("123456789")'), "29B1");
});

test("pixPayload tem o valor e o CRC corretos", () => {
  const { get } = load();
  const payload = get('pixPayload(10, "PED123")');
  assert.ok(payload.includes("540510.00"));
  assert.match(payload, /6304[0-9A-F]{4}$/);
  const body = payload.slice(0, -4);
  assert.equal(payload.slice(-4), get(`crc16(${JSON.stringify(body)})`));
});

test("estoque: fórmula inicial, set, change e total", () => {
  const { get } = load();
  const p = get("findProduct(1)");
  const initial = p.sizes.map((s, i) => (p.sizes.length === 1 ? 3 + (p.id % 6) : (p.id * 7 + i * 5) % 11));
  p.sizes.forEach((s, i) => assert.equal(get(`stock.get(1, "${s}")`), initial[i]));
  assert.equal(get("stock.total(findProduct(1))"), initial.reduce((a, b) => a + b, 0));
  assert.equal(get("stock.get(99999, 'M')"), 0);
  get(`stock.set(1, "${p.sizes[0]}", -4)`);
  assert.equal(get(`stock.get(1, "${p.sizes[0]}")`), 0);
  get(`stock.set(1, "${p.sizes[0]}", 7)`);
  get(`stock.change(1, "${p.sizes[0]}", -3)`);
  assert.equal(get(`stock.get(1, "${p.sizes[0]}")`), 4);
});

test("cart.add soma no mesmo item, limita ao estoque e lança sem estoque", () => {
  const { get } = load();
  const { id, size } = withStock(get, 3);
  assert.equal(get(`cart.add(${id}, "${size}", 2)`), 2);
  assert.equal(get(`cart.add(${id}, "${size}", 5)`), 1);
  assert.deepEqual(get("cart.items().map((i) => i.qty)"), [3]);
  assert.equal(get("cart.count()"), 3);
  assert.throws(() => get(`cart.add(${id}, "${size}", 1)`), /Não há mais unidades/);
});

test("cart.setQty devolve { qty, capped } e zero remove", () => {
  const { get } = load();
  const { id, size } = withStock(get, 3);
  get(`cart.add(${id}, "${size}", 1)`);
  assert.deepEqual(get("cart.setQty(0, 2)"), { qty: 2, capped: null });
  assert.deepEqual(get("cart.setQty(0, 9)"), { qty: 3, capped: 3 });
  assert.equal(get("cart.items()[0].qty"), 3);
  assert.equal(get("cart.setQty(0, 0).qty"), 0);
  assert.equal(get("cart.items().length"), 0);
});

test("cart.save e favs.toggle avisam o barramento", () => {
  const { get } = load();
  const { id, size } = withStock(get);
  get("globalThis.seen = []; bus.on((t) => seen.push(t));");
  get(`cart.add(${id}, "${size}", 1)`);
  get(`favs.toggle(${id})`);
  assert.deepEqual(get("seen"), ["cart", "favs"]);
});

test("cart.totals: subtotal, cupom, frete e frete grátis", () => {
  const { get } = load();
  const { id, size, price } = withStock(get, 10);
  get(`cart.add(${id}, "${size}", 1)`);
  let t = get("cart.totals()");
  assert.equal(t.subtotal, price);
  assert.equal(t.shipping, null);
  assert.equal(t.total, price);

  get('coupon.apply("trama20")');
  t = get("cart.totals()");
  assert.equal(t.code, "TRAMA20");
  assert.ok(Math.abs(t.discount - price * 0.2) < 1e-9);

  get('shipping.set({ cep: "01310-100", uf: "SP", option: "pac" })');
  t = get("cart.totals()");
  assert.equal(t.quote.id, "pac");
  assert.equal(t.shipping, 18.9);

  // Frete grátis no PAC a partir do valor configurado, já com o desconto
  const from = get("CONFIG.freeShippingFrom");
  const qty = Math.ceil(from / 0.8 / price) + 1;
  get(`stock.set(${id}, "${size}", 999)`);
  get(`cart.setQty(0, ${qty})`);
  t = get("cart.totals()");
  assert.ok(t.subtotal - t.discount >= from);
  assert.equal(t.shipping, 0);
});

test("cupom: primeira compra e código inexistente", () => {
  const { get } = load();
  assert.equal(get('coupon.check("BEMVINDO10")'), null);
  assert.equal(get('coupon.check("NADA")'), "Cupom inválido.");
  assert.throws(() => get('coupon.apply("NADA")'), /Cupom inválido/);
  get('store.set(KEYS.users, [{ email: "a@a.com", name: "A", role: "customer" }]); store.set(KEYS.session, "a@a.com");');
  get('store.set(KEYS.orders, [{ id: "1", email: "a@a.com", status: "Pago", items: [] }])');
  assert.match(get('coupon.check("BEMVINDO10")'), /primeira compra/);
  assert.equal(get('coupon.check("TRAMA20")'), null);
  get('store.set(KEYS.orders, [{ id: "1", email: "a@a.com", status: "Cancelado", items: [] }])');
  assert.equal(get('coupon.check("BEMVINDO10")'), null);
});

test("shipping.quotes usa a UF e, sem UF, a faixa do CEP", () => {
  const { get } = load();
  assert.deepEqual(get("shipping.quotes(null, 100)"), []);
  const sp = get('shipping.quotes({ cep: "01310-100", uf: "SP" }, 100)');
  assert.deepEqual(sp.map((q) => [q.id, q.price, q.days]), [["pac", 18.9, 5], ["sedex", 29.9, 2]]);
  // A UF vence a faixa do CEP (CEP de SP, UF do Amazonas)
  const am = get('shipping.quotes({ cep: "01310-100", uf: "AM" }, 100)');
  assert.equal(am[0].price, 34.9);
  // Sem UF, vale a faixa do CEP (80 = Sul)
  const s = get('shipping.quotes({ cep: "80000-000" }, 100)');
  assert.equal(s[0].price, 22.9);
});

test("regionFromCep por faixa", () => {
  const { get } = load();
  assert.equal(get('regionFromCep("01310100")'), "SE");
  assert.equal(get('regionFromCep("40000000")'), "NE");
  assert.equal(get('regionFromCep("66000000")'), "N");
  assert.equal(get('regionFromCep("77000000")'), "N");
  assert.equal(get('regionFromCep("70000000")'), "CO");
  assert.equal(get('regionFromCep("90000000")'), "S");
});

test("addBusinessDays nunca cai em fim de semana", () => {
  const { get } = load();
  for (let n = 1; n <= 15; n++) {
    const day = get(`addBusinessDays(${n}).getDay()`);
    assert.ok(day !== 0 && day !== 6, `${n} dias úteis caiu no dia ${day}`);
  }
});

test("orders.setStatus: estoque, rastreio e histórico", () => {
  const { get } = load();
  const { id, size } = withStock(get, 5);
  get(`orders.save([{ id: "A1", email: "a@a.com", status: "Pago", items: [{ id: ${id}, size: "${size}", qty: 2 }] }])`);
  get('orders.setStatus("A1", "Cancelado")');
  assert.equal(get(`stock.get(${id}, "${size}")`), 7);
  get('orders.setStatus("A1", "Pago")');
  assert.equal(get(`stock.get(${id}, "${size}")`), 5);
  get('orders.setStatus("A1", "Enviado")');
  const o = get('orders.find("A1")');
  assert.match(o.tracking, /^TR\d{9}BR$/);
  assert.deepEqual(o.history.map((h) => h.status), ["Cancelado", "Pago", "Enviado"]);
  get('orders.setStatus("A1", "Enviado")');
  assert.equal(get('orders.find("A1").history.length'), 3);
});

test("auth: cadastro, e-mail duplicado, login, troca de senha e aviso", async () => {
  const { get } = load();
  get("globalThis.seen = []; bus.on((t) => seen.push(t));");
  await get('auth.register({ name: " Ana ", email: " Ana@Teste.com ", password: "segredo1" })');
  assert.equal(get("auth.current().email"), "ana@teste.com");
  assert.equal(get("auth.current().name"), "Ana");
  await assert.rejects(() => get('auth.register({ name: "B", email: "ana@teste.com", password: "x" })'), /Já existe uma conta/);
  get("auth.logout()");
  assert.equal(get("auth.current()"), null);
  await assert.rejects(() => get('auth.login("ana@teste.com", "errada")'), /incorretos/);
  await get('auth.login("ana@teste.com", "segredo1")');
  assert.equal(get("auth.current().email"), "ana@teste.com");
  await assert.rejects(() => get('auth.changePassword("errada", "nova123")'), /incorreta/);
  await get('auth.changePassword("segredo1", "nova123")');
  get("auth.logout()");
  await get('auth.login("ana@teste.com", "nova123")');
  assert.equal(get("auth.isAdmin()"), false);
  assert.ok(get("seen").length >= 6);
  assert.ok(get("seen").every((t) => t === "auth"));
});

test("favs e recent", () => {
  const { get } = load();
  assert.equal(get("favs.toggle(1)"), true);
  assert.equal(get("favs.toggle(2)"), true);
  assert.deepEqual(get("favs.list()"), [2, 1]);
  assert.equal(get("favs.has(1)"), true);
  assert.equal(get("favs.toggle(1)"), false);
  assert.deepEqual(get("favs.list()"), [2]);
  get("store.set(KEYS.favs, [2, 99999])");
  assert.deepEqual(get("favs.list()"), [2]);

  get("[1, 2, 3, 1].forEach((i) => recent.add(i))");
  assert.deepEqual(get("recent.list()"), [1, 3, 2]);
  get("for (let i = 1; i <= 12; i++) recent.add(i)");
  assert.equal(get("recent.list().length"), 8);
  assert.equal(get("recent.list()[0]"), 12);
});

test("searchProducts ignora acentos e maiúsculas e exige todos os termos", () => {
  const { get } = load();
  assert.equal(get('searchProducts("").length'), get("PRODUCTS.length"));
  const cal = get('searchProducts("CALCADOS").length');
  assert.equal(cal, get('searchProducts("calçados").length'));
  assert.ok(cal > 0);
  assert.ok(cal > get('searchProducts("calcados xyzinexistente").length'));
  assert.equal(get('searchProducts("calcados xyzinexistente").length'), 0);
});

// ===== Novas regras (redesenho) =====
const soldOut = (get) => {
  const p = get("PRODUCTS.find((x) => x.sizes.length > 1)");
  get(`stock.set(${p.id}, "${p.sizes[0]}", 0)`);
  return { id: p.id, size: p.sizes[0] };
};
const errOf = (get, expr) => { try { get(expr); } catch (e) { return e.message; } return null; };
const other = (get, ...ids) => get(`PRODUCTS.find((x) => x.sizes.length > 1 && ![${ids}].includes(x.id))`);

test("waitlist: valida, não duplica, lista por usuário e marca o que voltou ao estoque", () => {
  const { get, localStorage } = load();
  const { id, size } = soldOut(get);
  assert.equal(errOf(get, `waitlist.add(${id}, "${size}", "sem-arroba")`), "Informe um e-mail válido.");
  assert.equal(errOf(get, `waitlist.add(${id}, "${size}", "")`), "Informe um e-mail válido.");
  get(`stock.set(${id}, "${size}", 2)`);
  assert.equal(errOf(get, `waitlist.add(${id}, "${size}", "ana@x.com")`), "Este tamanho está disponível.");
  assert.ok(errOf(get, `waitlist.add(99999, "M", "ana@x.com")`));
  assert.ok(errOf(get, `waitlist.add(${id}, "XXL", "ana@x.com")`));
  get(`stock.set(${id}, "${size}", 0)`);

  get(`waitlist.add(${id}, "${size}", "Ana@X.com")`);
  get(`waitlist.add(${id}, "${size}", "ana@x.com")`); // duplicata
  assert.equal(get("waitlist.all().length"), 1);
  const saved = JSON.parse(localStorage.getItem("trama_waitlist"));
  assert.equal(saved[0].email, "ana@x.com");
  assert.equal(typeof saved[0].date, "number");
  assert.equal(get(`waitlist.has(${id}, "${size}", "ANA@x.com")`), true);
  assert.equal(get(`waitlist.has(${id}, "${size}", "b@x.com")`), false);

  const p2 = other(get, id);
  get(`stock.set(${p2.id}, "${p2.sizes[0]}", 0)`);
  get(`waitlist.add(${p2.id}, "${p2.sizes[0]}", "ana@x.com")`);
  get(`waitlist.add(${p2.id}, "${p2.sizes[0]}", "bia@x.com")`);
  let mine = get(`waitlist.ofUser("ANA@x.com")`);
  assert.deepEqual(mine.map((e) => [e.id, e.available]), [[p2.id, false], [id, false]]); // mais recente primeiro
  get(`stock.set(${id}, "${size}", 3)`);
  mine = get(`waitlist.ofUser("ana@x.com")`);
  assert.equal(mine.find((e) => e.id === id).available, true);
  assert.equal(get("waitlist.all().length"), 3);

  get(`waitlist.remove(${id}, "${size}", "ana@x.com")`);
  assert.equal(get(`waitlist.has(${id}, "${size}", "ana@x.com")`), false);
  assert.equal(get("waitlist.all().length"), 2);
});

test("gift: padrão, corte em 200 caracteres e aviso", () => {
  const { get } = load();
  get("var seen = []; bus.on((t) => seen.push(t));");
  assert.deepEqual(get("gift.get()"), { on: false, message: "" });
  get(`gift.set({ on: true, message: "  ${"a".repeat(250)}  " })`);
  const g = get("gift.get()");
  assert.equal(g.on, true);
  assert.equal(g.message.length, 200);
  assert.deepEqual(get("seen"), ["cart"]);
});

test("cart.totals: embalagem para presente entra no total e não recebe desconto de cupom", () => {
  const { get } = load();
  const { id, size, price } = withStock(get);
  assert.equal(get("CONFIG.giftWrapPrice"), 9.9);
  assert.equal(get("cart.totals().gift"), 0);
  get(`gift.set({ on: true, message: "" })`);
  assert.equal(get("cart.totals().gift"), 0); // sem itens
  get(`cart.add(${id}, "${size}", 1)`);
  const t = get("cart.totals()");
  assert.equal(t.gift, 9.9);
  assert.equal(t.total, price + 9.9);
  // cupom não incide sobre a embalagem
  get("store.set(KEYS.coupon, 'TRAMA20')");
  const c = get("cart.totals()");
  assert.ok(Math.abs(c.discount - price * 0.2) < 1e-9);
  assert.ok(Math.abs(c.total - (price * 0.8 + 9.9)) < 1e-9);
  // limpar a sacola desliga a embalagem
  get("cart.clear()");
  assert.deepEqual(get("gift.get()"), { on: false, message: "" });
  assert.equal(get("cart.totals().gift"), 0);
});

test("cart.remove devolve o item e cart.restore o recoloca na posição, limitado ao estoque", () => {
  const { get } = load();
  const a = withStock(get, 5);
  const b = other(get, a.id);
  get(`stock.set(${b.id}, "${b.sizes[0]}", 5)`);
  get(`cart.add(${a.id}, "${a.size}", 2)`);
  get(`cart.add(${b.id}, "${b.sizes[0]}", 3)`);
  assert.equal(get("cart.remove(9)"), null);
  assert.deepEqual(get("cart.remove(0)"), { id: a.id, size: a.size, qty: 2 });
  assert.deepEqual(get("cart.items().map((i) => i.id)"), [b.id]);
  get(`cart.restore({ id: ${a.id}, size: "${a.size}", qty: 2 }, 0)`);
  assert.deepEqual(get("cart.items().map((i) => [i.id, i.qty])"), [[a.id, 2], [b.id, 3]]);
  // estoque caiu enquanto o aviso estava aberto
  get("cart.remove(0)");
  get(`stock.set(${a.id}, "${a.size}", 1)`);
  get(`cart.restore({ id: ${a.id}, size: "${a.size}", qty: 2 }, 0)`);
  assert.equal(get("cart.items()[0].qty"), 1);
  // mesmo item já voltou para a sacola: soma, respeitando o estoque
  get(`cart.restore({ id: ${a.id}, size: "${a.size}", qty: 2 }, 0)`);
  assert.equal(get(`cart.items().filter((i) => i.id === ${a.id}).length`), 1);
  assert.equal(get("cart.items()[0].qty"), 1);
  // índice além do fim vai para o final
  get("cart.remove(0)");
  get(`stock.set(${a.id}, "${a.size}", 5)`);
  get(`cart.restore({ id: ${a.id}, size: "${a.size}", qty: 1 }, 7)`);
  assert.deepEqual(get("cart.items().map((i) => i.id)"), [b.id, a.id]);
  // sem estoque: não volta
  get("cart.remove(1)");
  get(`stock.set(${a.id}, "${a.size}", 0)`);
  get(`cart.restore({ id: ${a.id}, size: "${a.size}", qty: 1 }, 0)`);
  assert.deepEqual(get("cart.items().map((i) => i.id)"), [b.id]);
});

test("orders.reorder põe na sacola o que há em estoque e lista o que faltou", () => {
  const { get } = load();
  const a = withStock(get, 5);
  const b = other(get, a.id);
  const c = other(get, a.id, b.id);
  get(`stock.set(${b.id}, "${b.sizes[0]}", 0)`);
  get(`stock.set(${c.id}, "${c.sizes[0]}", 2)`);
  const order = {
    id: "R1", email: "a@x.com", date: 1, status: "Entregue", total: 1,
    items: [
      { id: a.id, name: "Peça A", size: a.size, qty: 2, price: 1 },
      { id: b.id, name: "Peça B", size: b.sizes[0], qty: 1, price: 1 },
      { id: c.id, name: "Peça C", size: c.sizes[0], qty: 5, price: 1 },
      { id: 99999, name: "Peça fantasma", size: "M", qty: 1, price: 1 },
    ],
  };
  get(`orders.save([${JSON.stringify(order)}])`);
  const r = get(`orders.reorder("R1")`);
  assert.deepEqual(r.added, [{ id: a.id, size: a.size, qty: 2 }, { id: c.id, size: c.sizes[0], qty: 2 }]);
  assert.deepEqual(r.missing, [{ name: b.name, size: b.sizes[0] }, { name: "Peça fantasma", size: "M" }]);
  assert.deepEqual(get("cart.items().map((i) => [i.id, i.qty])"), [[a.id, 2], [c.id, 2]]);
  assert.deepEqual(get(`orders.reorder("nao-existe")`), { added: [], missing: [] });
});

test("reviews.summary e reviews.sorted", () => {
  const { get } = load();
  assert.deepEqual(get("reviews.summary(1)"), { count: 0, avg: 0, dist: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } });
  [[5, 1], [3, 2], [5, 3], [1, 4]].forEach(([rating, date]) => get(`reviews.add(1, { rating: ${rating}, text: "texto de teste ${date}", date: ${date} })`));
  const s = get("reviews.summary(1)");
  assert.equal(s.count, 4);
  assert.equal(s.avg, 3.5);
  assert.deepEqual(s.dist, { 5: 2, 4: 0, 3: 1, 2: 0, 1: 1 });
  assert.deepEqual(get("reviews.sorted(1).map((r) => r.date)"), [4, 3, 2, 1]);
  assert.deepEqual(get("reviews.sorted(1, 'recentes').map((r) => r.date)"), [4, 3, 2, 1]);
  assert.deepEqual(get("reviews.sorted(1, 'melhores').map((r) => r.rating)"), [5, 5, 3, 1]);
  assert.deepEqual(get("reviews.sorted(1, 'piores').map((r) => r.rating)"), [1, 3, 5, 5]);
  // empate de nota: o mais recente primeiro
  assert.deepEqual(get("reviews.sorted(1, 'melhores').map((r) => r.date)").slice(0, 2), [3, 1]);
});

// ===== Correções da revisão =====

test("cart.restore sobre uma linha existente sem estoque remove a linha em vez de deixar quantidade zero", () => {
  const { get } = load();
  const a = withStock(get, 5);
  get(`cart.add(${a.id}, "${a.size}", 1)`);
  get(`stock.set(${a.id}, "${a.size}", 0)`); // esgotou enquanto o aviso "Desfazer" estava aberto
  get(`cart.restore({ id: ${a.id}, size: "${a.size}", qty: 1 }, 0)`);
  assert.deepEqual(get("cart.items()"), []);
  assert.equal(get("cart.count()"), 0);
  // outras linhas ficam como estavam
  const b = other(get, a.id);
  get(`stock.set(${a.id}, "${a.size}", 4)`);
  get(`stock.set(${b.id}, "${b.sizes[0]}", 5)`);
  get(`cart.add(${a.id}, "${a.size}", 1)`);
  get(`cart.add(${b.id}, "${b.sizes[0]}", 2)`);
  get(`stock.set(${a.id}, "${a.size}", 0)`);
  get(`cart.restore({ id: ${a.id}, size: "${a.size}", qty: 3 }, 0)`);
  assert.deepEqual(get("cart.items().map((i) => [i.id, i.qty])"), [[b.id, 2]]);
  assert.equal(get("cart.count()"), 2);
});

test("cart.totals: a embalagem não conta para o frete grátis", () => {
  const { get } = load();
  const from = get("CONFIG.freeShippingFrom");
  const wrap = get("CONFIG.giftWrapPrice");
  // peça que fica abaixo do mínimo sozinha, mas passaria dele se a embalagem entrasse na conta
  const p = get(`PRODUCTS.find((x) => x.price < ${from} && x.price + ${wrap} >= ${from})`);
  assert.ok(p, "o catálogo precisa ter uma peça nessa faixa para o teste valer");
  const size = p.sizes[0];
  get(`stock.set(${p.id}, "${size}", 5)`);
  get('shipping.set({ cep: "01310-100", uf: "SP", option: "pac" })');
  get(`cart.add(${p.id}, "${size}", 1)`);
  get(`gift.set({ on: true, message: "" })`);
  const t = get("cart.totals()");
  assert.equal(t.gift, wrap);
  assert.equal(t.quote.id, "pac");
  assert.equal(t.quote.price, 18.9); // o PAC para SP continua pago
  assert.equal(t.shipping, 18.9);
  assert.ok(Math.abs(t.total - (p.price + 18.9 + wrap)) < 1e-9);
  // contraste: passando do mínimo só com as peças, o frete zera, com a embalagem ligada
  get(`cart.add(${p.id}, "${size}", 1)`);
  const t2 = get("cart.totals()");
  assert.equal(t2.shipping, 0);
  assert.ok(Math.abs(t2.total - (p.price * 2 + wrap)) < 1e-9);
});

test("orders.reorder não engole erro inesperado de cart.add", () => {
  const { get } = load();
  const a = withStock(get, 5);
  const order = { id: "R3", email: "a@x.com", date: 1, status: "Entregue", total: 1, items: [{ id: a.id, name: "Peça A", size: a.size, qty: 1, price: 1 }] };
  get(`orders.save([${JSON.stringify(order)}])`);
  get("cart.add = () => { throw new Error('falha inesperada'); }");
  assert.throws(() => get('orders.reorder("R3")'), /falha inesperada/);
});

test("orders.reorder manda para missing o tamanho que o produto não tem e o que a sacola já esgotou", () => {
  const { get } = load();
  const p = get("findProduct(1)");
  assert.ok(!p.sizes.includes("XXL"));
  get(`stock.set(1, "${p.sizes[0]}", 2)`);
  get(`stock.set(1, "${p.sizes[1]}", 3)`);
  get(`cart.add(1, "${p.sizes[0]}", 2)`); // a sacola já tem todo o estoque desse tamanho
  const order = {
    id: "R4", email: "a@x.com", date: 1, status: "Entregue", total: 1,
    items: [
      { id: 1, name: p.name, size: "XXL", qty: 1, price: 1 },
      { id: 1, name: p.name, size: p.sizes[0], qty: 1, price: 1 },
      { id: 1, name: p.name, size: p.sizes[1], qty: 1, price: 1 },
    ],
  };
  get(`orders.save([${JSON.stringify(order)}])`);
  const r = get('orders.reorder("R4")');
  assert.deepEqual(r.added, [{ id: 1, size: p.sizes[1], qty: 1 }]);
  assert.deepEqual(r.missing, [{ name: p.name, size: "XXL" }, { name: p.name, size: p.sizes[0] }]);
  assert.deepEqual(get("cart.items().map((i) => [i.size, i.qty])"), [[p.sizes[0], 2], [p.sizes[1], 1]]);
});
