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
