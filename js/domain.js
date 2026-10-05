const findProduct = (id) => PRODUCTS.find((p) => p.id === Number(id));

// ===== Conta =====
const auth = {
  users: () => store.get(KEYS.users, []),
  current() {
    const email = store.get(KEYS.session, null);
    return email ? this.users().find((u) => u.email === email) || null : null;
  },
  isAdmin() { return this.current()?.role === "admin"; },
  async register({ name, email, password }) {
    const users = this.users();
    email = email.trim().toLowerCase();
    if (users.some((u) => u.email === email)) throw new Error("Já existe uma conta com este e-mail.");
    users.push({ name: name.trim(), email, pass: await hashPassword(password), role: "customer", address: null, createdAt: Date.now() });
    store.set(KEYS.users, users);
    store.set(KEYS.session, email);
    bus.emit("auth");
  },
  async login(email, password) {
    email = email.trim().toLowerCase();
    const user = this.users().find((u) => u.email === email);
    if (!user || user.pass !== (await hashPassword(password))) throw new Error("E-mail ou senha incorretos.");
    store.set(KEYS.session, email);
    bus.emit("auth");
  },
  logout() { store.set(KEYS.session, null); bus.emit("auth"); },
  update(changes) {
    const users = this.users();
    const user = users.find((u) => u.email === store.get(KEYS.session, null));
    if (!user) return;
    Object.assign(user, changes);
    store.set(KEYS.users, users);
    bus.emit("auth");
  },
  async changePassword(current, next) {
    const user = this.current();
    if (!user || user.pass !== (await hashPassword(current))) throw new Error("A senha atual está incorreta.");
    this.update({ pass: await hashPassword(next) });
  },
  async ensureAdmin() {
    const users = this.users();
    if (users.some((u) => u.email === CONFIG.admin.email)) return;
    users.push({ name: CONFIG.admin.name, email: CONFIG.admin.email, pass: await hashPassword(CONFIG.admin.password), role: "admin", address: null, createdAt: Date.now() });
    store.set(KEYS.users, users);
  },
};

// ===== Estoque (por produto e tamanho) =====
const stock = {
  all: () => store.get(KEYS.stock, {}),
  get(id, size) {
    const saved = this.all()[`${id}:${size}`];
    if (saved !== undefined) return saved;
    const p = findProduct(id);
    if (!p) return 0;
    // Estoque inicial de exemplo (alguns tamanhos começam esgotados)
    return p.sizes.length === 1 ? 3 + (p.id % 6) : (p.id * 7 + p.sizes.indexOf(size) * 5) % 11;
  },
  set(id, size, qty) {
    const all = this.all();
    all[`${id}:${size}`] = Math.max(0, Math.floor(Number(qty) || 0));
    store.set(KEYS.stock, all);
  },
  change(id, size, delta) { this.set(id, size, this.get(id, size) + delta); },
  total(p) { return p.sizes.reduce((n, s) => n + this.get(p.id, s), 0); },
};

// ===== Favoritos e vistos recentemente =====
const favs = {
  list: () => store.get(KEYS.favs, []).filter((id) => findProduct(id)),
  has(id) { return this.list().includes(id); },
  toggle(id) {
    const list = this.list();
    const i = list.indexOf(id);
    if (i >= 0) list.splice(i, 1); else list.unshift(id);
    store.set(KEYS.favs, list);
    bus.emit("favs");
    return i < 0;
  },
};

const recent = {
  list: () => store.get(KEYS.recent, []).filter((id) => findProduct(id)),
  add(id) { store.set(KEYS.recent, [id, ...this.list().filter((x) => x !== id)].slice(0, 8)); },
};

// ===== Avaliações =====
const reviews = {
  all: () => store.get(KEYS.reviews, {}),
  of(id) { return this.all()[id] || []; },
  avg(id) { const r = this.of(id); return r.length ? r.reduce((s, x) => s + x.rating, 0) / r.length : 0; },
  add(id, review) {
    const all = this.all();
    (all[id] ||= []).unshift(review);
    store.set(KEYS.reviews, all);
  },
  summary(id) {
    const list = this.of(id);
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    list.forEach((r) => { dist[r.rating]++; });
    return { count: list.length, avg: this.avg(id), dist };
  },
  sorted(id, order = "recentes") {
    const byDate = (a, b) => (b.date || 0) - (a.date || 0);
    const by = { melhores: (a, b) => b.rating - a.rating || byDate(a, b), piores: (a, b) => a.rating - b.rating || byDate(a, b) }[order] || byDate;
    return this.of(id).slice().sort(by);
  },
};

// ===== Pedidos =====
const STATUS_FLOW = ["Aguardando pagamento", "Pago", "Em separação", "Enviado", "Entregue"];
const orders = {
  all: () => store.get(KEYS.orders, []),
  save(list) { store.set(KEYS.orders, list); },
  find(id) { return this.all().find((o) => o.id === id); },
  ofUser(email) { return this.all().filter((o) => o.email === email).reverse(); },
  setStatus(id, status) {
    const list = this.all();
    const o = list.find((x) => x.id === id);
    if (!o || o.status === status) return;
    // Cancelar devolve os itens ao estoque; reativar retira de novo
    if (status === "Cancelado") o.items.forEach((i) => stock.change(i.id, i.size, i.qty));
    if (o.status === "Cancelado") o.items.forEach((i) => stock.change(i.id, i.size, -i.qty));
    o.status = status;
    (o.history ||= []).push({ status, date: Date.now() });
    if (status === "Enviado" && !o.tracking) o.tracking = "TR" + String(Math.floor(Math.random() * 1e9)).padStart(9, "0") + "BR";
    this.save(list);
  },
  // Recoloca na sacola o que o estoque permitir; o que faltou vai em missing
  reorder(id) {
    const result = { added: [], missing: [] };
    (this.find(id)?.items || []).forEach((i) => {
      const p = findProduct(i.id);
      let qty = 0;
      // cart.add lança quando não há unidade livre: confere antes, para não engolir outros erros
      const inCart = cart.items().find((x) => x.id === p?.id && x.size === i.size)?.qty || 0;
      if (p?.sizes.includes(i.size) && stock.get(p.id, i.size) > inCart) qty = cart.add(p.id, i.size, i.qty);
      if (qty > 0) result.added.push({ id: p.id, size: i.size, qty });
      else result.missing.push({ name: p?.name || i.name, size: i.size });
    });
    return result;
  },
};
const canCancel = (o) => ["Aguardando pagamento", "Pago"].includes(o.status);
const hasPurchased = (email, pid) => orders.ofUser(email).some((o) => o.status !== "Cancelado" && o.items.some((i) => i.id === pid));
const statusClass = (s) => (s === "Cancelado" ? "cancel" : s === "Aguardando pagamento" ? "pending" : s === "Entregue" ? "" : "info");
const orderShipping = (o) => (typeof o.shipping === "number" ? { name: "Padrão", price: o.shipping } : o.shipping);

// ===== Frete e CEP =====
const UF_REGION = {
  SP: "SE", RJ: "SE", MG: "SE", ES: "SE", PR: "S", SC: "S", RS: "S", DF: "CO", GO: "CO", MT: "CO", MS: "CO",
  BA: "NE", SE: "NE", AL: "NE", PE: "NE", PB: "NE", RN: "NE", CE: "NE", PI: "NE", MA: "NE",
  PA: "N", AP: "N", AM: "N", RR: "N", AC: "N", RO: "N", TO: "N",
};
// [preço, prazo em dias úteis]
const RATES = {
  SE: { pac: [18.9, 5], sedex: [29.9, 2] },
  S: { pac: [22.9, 6], sedex: [36.9, 3] },
  CO: { pac: [26.9, 7], sedex: [42.9, 3] },
  NE: { pac: [29.9, 8], sedex: [49.9, 4] },
  N: { pac: [34.9, 10], sedex: [59.9, 5] },
};

function regionFromCep(cep) {
  const n = Number(cep.slice(0, 2));
  if (n < 40) return "SE";
  if (n < 66) return "NE";
  if (n < 70 || n === 77) return "N";
  if (n < 80) return "CO";
  return "S";
}

function addBusinessDays(days) {
  const d = new Date();
  while (days > 0) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) days--;
  }
  return d;
}

async function lookupCep(cepRaw) {
  const cep = onlyDigits(cepRaw);
  if (cep.length !== 8) throw new Error("CEP inválido.");
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: ctrl.signal });
    clearTimeout(timer);
    const data = await res.json();
    if (data.erro) throw new Error("CEP não encontrado.");
    return { cep: maskCep(cep), street: data.logradouro, district: data.bairro, city: data.localidade, uf: data.uf };
  } catch (e) {
    if (e.message === "CEP não encontrado.") throw e;
    return { cep: maskCep(cep), offline: true }; // sem internet: estima o frete pela faixa do CEP
  }
}

const shipping = {
  get: () => store.get(KEYS.ship, null),
  set(v) { store.set(KEYS.ship, v); },
  async lookup(cep) {
    const addr = await lookupCep(cep);
    this.set({ ...addr, option: this.get()?.option || "pac" });
    return addr;
  },
  quotes(s, subtotal) {
    if (!s?.cep) return [];
    const r = RATES[(s.uf && UF_REGION[s.uf]) || regionFromCep(onlyDigits(s.cep))];
    return [
      { id: "pac", name: "Econômica (PAC)", price: subtotal >= CONFIG.freeShippingFrom ? 0 : r.pac[0], days: r.pac[1] },
      { id: "sedex", name: "Expressa (SEDEX)", price: r.sedex[0], days: r.sedex[1] },
    ];
  },
};

// ===== Cupom =====
const coupon = {
  check(code) {
    const c = CONFIG.coupons[code];
    if (!c) return "Cupom inválido.";
    const u = auth.current();
    if (c.firstPurchase && u && orders.ofUser(u.email).some((o) => o.status !== "Cancelado")) return "Este cupom vale apenas na primeira compra.";
    return null;
  },
  apply(code) {
    code = code.trim().toUpperCase();
    if (!code) { store.set(KEYS.coupon, null); return null; }
    const err = this.check(code);
    if (err) throw new Error(err);
    store.set(KEYS.coupon, code);
    return code;
  },
  active() {
    const c = store.get(KEYS.coupon, null);
    return c && !this.check(c) ? c : null;
  },
};

// ===== Aviso de reposição (avise-me) =====
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const waitlist = {
  all: () => store.get(KEYS.waitlist, []),
  has(id, size, email) {
    email = String(email).trim().toLowerCase();
    return this.all().some((w) => w.id === Number(id) && w.size === size && w.email === email);
  },
  add(id, size, email) {
    email = String(email ?? "").trim().toLowerCase();
    if (!EMAIL_RE.test(email)) throw new Error("Informe um e-mail válido.");
    const p = findProduct(id);
    if (!p || !p.sizes.includes(size)) throw new Error("Produto ou tamanho não encontrado.");
    if (stock.get(p.id, size) > 0) throw new Error("Este tamanho está disponível.");
    if (this.has(p.id, size, email)) return;
    store.set(KEYS.waitlist, [...this.all(), { id: p.id, size, email, date: Date.now() }]);
  },
  remove(id, size, email) {
    email = String(email).trim().toLowerCase();
    store.set(KEYS.waitlist, this.all().filter((w) => !(w.id === Number(id) && w.size === size && w.email === email)));
  },
  ofUser(email) {
    email = String(email).trim().toLowerCase();
    return this.all().filter((w) => w.email === email).reverse().map((w) => ({ ...w, available: stock.get(w.id, w.size) > 0 }));
  },
};

// ===== Embalagem para presente =====
const gift = {
  get: () => store.get(KEYS.gift, { on: false, message: "" }),
  set({ on, message }) {
    store.set(KEYS.gift, { on: !!on, message: String(message ?? "").trim().slice(0, 200) });
    bus.emit("cart");
  },
};

// ===== Sacola =====
const cart = {
  items: () => store.get(KEYS.cart, []).filter((i) => findProduct(i.id)),
  save(items) { store.set(KEYS.cart, items); bus.emit("cart"); },
  add(id, size, qty = 1) {
    const items = this.items();
    const existing = items.find((i) => i.id === id && i.size === size);
    const available = stock.get(id, size) - (existing?.qty || 0);
    if (available <= 0) throw new Error("Não há mais unidades disponíveis deste tamanho.");
    const added = Math.min(qty, available);
    if (existing) existing.qty += added; else items.push({ id, size, qty: added });
    this.save(items);
    return added;
  },
  // Devolve { qty, capped }: capped = estoque máximo quando o pedido passou do estoque, senão null
  setQty(index, qty) {
    const items = this.items();
    const it = items[index];
    if (!it) return { qty: 0, capped: null };
    let result = { qty: 0, capped: null };
    if (qty <= 0) items.splice(index, 1);
    else {
      const max = stock.get(it.id, it.size);
      if (qty > max) result.capped = max;
      it.qty = Math.min(qty, max);
      result.qty = it.qty;
    }
    this.save(items);
    return result;
  },
  remove(index) {
    const items = this.items();
    if (!items[index]) return null;
    const [{ id, size, qty }] = items.splice(index, 1);
    this.save(items);
    return { id, size, qty };
  },
  // Desfaz um remove: recoloca na posição (ou soma se já voltou), limitado ao estoque
  restore({ id, size, qty }, index) {
    const items = this.items();
    const existing = items.find((i) => i.id === id && i.size === size);
    const max = stock.get(id, size);
    if (existing) {
      existing.qty = Math.min(existing.qty + qty, max);
      if (existing.qty <= 0) items.splice(items.indexOf(existing), 1); // esgotou: não deixa linha vazia
    } else if (max > 0) items.splice(Math.min(index, items.length), 0, { id, size, qty: Math.min(qty, max) });
    this.save(items);
  },
  clear() { store.set(KEYS.gift, { on: false, message: "" }); this.save([]); },
  count() { return this.items().reduce((n, i) => n + i.qty, 0); },
  totals() {
    const items = this.items();
    const subtotal = items.reduce((s, i) => s + findProduct(i.id).price * i.qty, 0);
    const code = coupon.active();
    const discount = code ? subtotal * CONFIG.coupons[code].off : 0;
    const ship = shipping.get();
    const quote = shipping.quotes(ship, subtotal - discount).find((q) => q.id === (ship?.option || "pac")) || null;
    const shippingCost = !items.length ? 0 : quote ? quote.price : null;
    const giftWrap = gift.get().on && items.length ? CONFIG.giftWrapPrice : 0;
    return { subtotal, discount, code, quote, shipping: shippingCost, gift: giftWrap, total: subtotal - discount + (shippingCost || 0) + giftWrap };
  },
};

// ===== Pix (padrão BR Code do Banco Central) =====
function crc16(str) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function pixPayload(amount, txid) {
  const f = (id, v) => id + String(v.length).padStart(2, "0") + v;
  const clean = (s, n) => stripAccents(s).toUpperCase().replace(/[^A-Z0-9 ]/g, "").slice(0, n);
  const key = CONFIG.pixKey || "chave-pix-de-demonstracao";
  const body =
    f("00", "01") +
    f("26", f("00", "br.gov.bcb.pix") + f("01", key)) +
    f("52", "0000") + f("53", "986") + f("54", amount.toFixed(2)) + f("58", "BR") +
    f("59", clean(CONFIG.storeName, 25)) + f("60", clean(CONFIG.storeCity, 15)) +
    f("62", f("05", txid.replace(/[^A-Za-z0-9]/g, "").slice(0, 25))) + "6304";
  return body + crc16(body);
}
