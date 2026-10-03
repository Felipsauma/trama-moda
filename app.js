// ===== Armazenamento (localStorage) =====
const store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* armazenamento indisponível */ }
  },
};

const KEYS = {
  users: "trama_users", session: "trama_session", cart: "trama_cart", orders: "trama_orders",
  stock: "trama_stock", favs: "trama_favs", recent: "trama_recent", reviews: "trama_reviews",
  ship: "trama_ship", coupon: "trama_coupon",
};

// ===== Utilitários =====
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const brl = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const findProduct = (id) => PRODUCTS.find((p) => p.id === Number(id));
const onlyDigits = (s) => String(s ?? "").replace(/\D/g, "");
const stripAccents = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const norm = (s) => stripAccents(String(s).toLowerCase());
const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const fmtDate = (ts) => new Date(ts).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
const fmtDay = (d) => new Date(d).toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" });

const HEART = `<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>`;

function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove("show"), 2800);
}

async function hashPassword(pass) {
  if (window.crypto?.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("trama:" + pass));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Fallback simples para contextos sem crypto.subtle
  let h = 0;
  for (const c of "trama:" + pass) h = (h * 31 + c.charCodeAt(0)) | 0;
  return "f" + h;
}

// ===== Máscaras e validações =====
const maskCep = (v) => onlyDigits(v).slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");
const maskCard = (v) => onlyDigits(v).slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ");
const maskExp = (v) => onlyDigits(v).slice(0, 4).replace(/^(\d{2})(\d)/, "$1/$2");
const maskCpf = (v) => onlyDigits(v).slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
function maskInput(input, fn) { input?.addEventListener("input", () => (input.value = fn(input.value))); }

function luhn(num) {
  let sum = 0, alt = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let d = Number(num[i]);
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d; alt = !alt;
  }
  return num.length >= 13 && sum % 10 === 0;
}

function cardBrand(num) {
  if (/^(4011|4312|4389|4514|4576|5041|5066|5067|509|6277|6362|6363|650|6516|6550)/.test(num)) return "Elo";
  if (/^4/.test(num)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(num)) return "Mastercard";
  if (/^3[47]/.test(num)) return "Amex";
  return "Cartão";
}

function validCpf(cpf) {
  cpf = onlyDigits(cpf);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  for (const len of [9, 10]) {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    if (((sum * 10) % 11) % 10 !== Number(cpf[len])) return false;
  }
  return true;
}

function showErrors(form, errors) {
  $$(".field", form).forEach((field) => {
    const input = $("input, select, textarea", field);
    const err = $(".err", field);
    if (input && err) err.textContent = errors[input.name] || "";
    input?.classList.toggle("invalid", !!errors[input?.name]);
  });
}

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
  },
  async login(email, password) {
    email = email.trim().toLowerCase();
    const user = this.users().find((u) => u.email === email);
    if (!user || user.pass !== (await hashPassword(password))) throw new Error("E-mail ou senha incorretos.");
    store.set(KEYS.session, email);
  },
  logout() { store.set(KEYS.session, null); },
  update(changes) {
    const users = this.users();
    const user = users.find((u) => u.email === store.get(KEYS.session, null));
    if (!user) return;
    Object.assign(user, changes);
    store.set(KEYS.users, users);
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
    updateHeader();
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

// ===== Sacola =====
const cart = {
  items: () => store.get(KEYS.cart, []).filter((i) => findProduct(i.id)),
  save(items) { store.set(KEYS.cart, items); updateHeader(); },
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
  setQty(index, qty) {
    const items = this.items();
    const it = items[index];
    if (!it) return;
    if (qty <= 0) items.splice(index, 1);
    else {
      const max = stock.get(it.id, it.size);
      if (qty > max) toast(`Só temos ${max} unidade(s) deste tamanho.`);
      it.qty = Math.min(qty, max);
    }
    this.save(items);
  },
  clear() { this.save([]); },
  count() { return this.items().reduce((n, i) => n + i.qty, 0); },
  totals() {
    const items = this.items();
    const subtotal = items.reduce((s, i) => s + findProduct(i.id).price * i.qty, 0);
    const code = coupon.active();
    const discount = code ? subtotal * CONFIG.coupons[code].off : 0;
    const ship = shipping.get();
    const quote = shipping.quotes(ship, subtotal - discount).find((q) => q.id === (ship?.option || "pac")) || null;
    const shippingCost = !items.length ? 0 : quote ? quote.price : null;
    return { subtotal, discount, code, quote, shipping: shippingCost, total: subtotal - discount + (shippingCost || 0) };
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

// ===== Componentes =====
const thumb = (p) => `<div class="thumb"><img class="main" src="${p.images[0]}" alt="${esc(p.name)}" loading="lazy"></div>`;
const stars = (r) => `<span class="stars" style="--r:${r.toFixed(2)}" aria-label="${r.toFixed(1)} de 5 estrelas">★★★★★</span>`;
const sortSizes = (list) => {
  const order = ["PP", "P", "M", "G", "GG"];
  return [...list].sort((a, b) => {
    const ia = order.indexOf(a), ib = order.indexOf(b);
    if (ia >= 0 || ib >= 0) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    return (Number(a) - Number(b)) || a.localeCompare(b);
  });
};

function productCard(p) {
  const off = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
  const avail = stock.total(p) > 0;
  const single = p.sizes.length === 1;
  const n = reviews.of(p.id).length;
  return `
    <a class="product ${avail ? "" : "soldout"}" href="#/produto/${p.id}">
      <div class="thumb">
        <div class="tags">
          ${!avail ? `<span class="tag dark">Esgotado</span>` : p.tag ? `<span class="tag">${p.tag}</span>` : ""}
          ${off && avail ? `<span class="tag sale">-${off}%</span>` : ""}
        </div>
        <button class="fav-btn ${favs.has(p.id) ? "on" : ""}" data-fav="${p.id}" aria-label="Favoritar" title="Favoritar">${HEART}</button>
        <img class="main" src="${p.images[0]}" alt="${esc(p.name)}" loading="lazy">
        <img class="alt" src="${p.images[1] || p.images[0]}" alt="" loading="lazy">
        ${avail ? `<button class="btn light small block quick-add" ${single ? `data-quick="${p.id}"` : ""}>${single ? "Adicionar à sacola" : "Escolher tamanho"}</button>` : ""}
      </div>
      <div class="product-info">
        <span class="cat">${CATEGORIES[p.cat]}</span>
        <span class="name">${esc(p.name)}</span>
        ${n ? `<span class="rating">${stars(reviews.avg(p.id))} <small class="muted">(${n})</small></span>` : ""}
        <span><span class="price ${off ? "sale" : ""}">${brl(p.price)}</span>${p.oldPrice ? `<span class="old">${brl(p.oldPrice)}</span>` : ""}</span>
        <span class="installments">3x de ${brl(p.price / 3)} sem juros</span>
      </div>
    </a>`;
}

function freeShipHTML(t) {
  const base = t.subtotal - t.discount;
  const missing = CONFIG.freeShippingFrom - base;
  return `
    <p class="small" style="margin:0">${missing > 0
      ? `Faltam <strong>${brl(missing)}</strong> para o frete grátis (PAC)`
      : `<strong style="color:var(--ok)">Você ganhou frete grátis no PAC!</strong>`}</p>
    <div class="progress"><div style="width:${Math.min(100, (base / CONFIG.freeShippingFrom) * 100)}%"></div></div>`;
}

function shipOptionsHTML(quotes, selected) {
  return `<div class="ship-options">${quotes.map((q) => `
    <label class="ship-opt">
      <input type="radio" name="ship-opt" value="${q.id}" ${q.id === (selected || "pac") ? "checked" : ""}>
      <span><strong>${q.name}</strong><br><small class="muted">Chega até ${fmtDay(addBusinessDays(q.days))}</small></span>
      <strong>${q.price ? brl(q.price) : "Grátis"}</strong>
    </label>`).join("")}</div>`;
}

function summaryHTML({ button = false, calc = false } = {}) {
  const t = cart.totals();
  const ship = shipping.get();
  return `
    <h3>Resumo do pedido</h3>
    ${freeShipHTML(t)}
    <div class="summary-line"><span>Subtotal</span><span>${brl(t.subtotal)}</span></div>
    ${t.discount ? `<div class="summary-line" style="color:var(--ok)"><span>Cupom ${t.code}</span><span>- ${brl(t.discount)}</span></div>` : ""}
    <div class="summary-line"><span>Frete${t.quote ? ` <small class="muted">· ${t.quote.name.split(" ")[0]}</small>` : ""}</span><span>${t.shipping === null ? "—" : t.shipping === 0 ? "Grátis" : brl(t.shipping)}</span></div>
    ${calc ? `
      <form class="inline-form" id="ship-form">
        <input name="cep" inputmode="numeric" placeholder="Seu CEP" value="${esc(ship?.cep || "")}" aria-label="CEP">
        <button class="btn ghost small">Calcular</button>
      </form>
      ${ship?.cep ? `<p class="muted small" style="margin:6px 0">${ship.city ? `Entrega em ${esc(ship.city)} - ${esc(ship.uf)}` : "Estimativa pela região do CEP"}</p>
        ${shipOptionsHTML(shipping.quotes(ship, t.subtotal - t.discount), ship.option)}` : ""}` : ""}
    <form class="inline-form" id="coupon-form">
      <input name="code" placeholder="Cupom de desconto" value="${t.code || ""}" aria-label="Cupom">
      <button class="btn ghost small">Aplicar</button>
    </form>
    <div class="summary-line total"><span>Total</span><span>${brl(t.total)}</span></div>
    ${t.shipping === null && t.subtotal ? `<p class="muted small" style="margin:-4px 0 12px">+ frete, calculado ${calc ? "pelo CEP acima" : "no checkout"}</p>` : ""}
    ${button ? `<a href="#/checkout" class="btn accent block">Finalizar compra</a><div class="secure">🔒 Compra 100% segura</div>` : ""}`;
}

function bindSummary(el, onChange) {
  $("#coupon-form", el)?.addEventListener("submit", (e) => {
    e.preventDefault();
    try {
      const c = coupon.apply(e.target.code.value);
      toast(c ? `Cupom ${c} aplicado!` : "Cupom removido.");
    } catch (err) { toast(err.message); }
    onChange();
  });
  const sf = $("#ship-form", el);
  if (sf) {
    maskInput(sf.cep, maskCep);
    sf.addEventListener("submit", async (e) => {
      e.preventDefault();
      $("button", sf).disabled = true;
      try { await shipping.lookup(sf.cep.value); } catch (err) { toast(err.message); }
      onChange();
    });
  }
  $$('input[name="ship-opt"]', el).forEach((r) => r.addEventListener("change", () => {
    shipping.set({ ...shipping.get(), option: r.value });
    onChange();
  }));
}

// ===== Sacola lateral (drawer) =====
function renderDrawer() {
  const items = cart.items();
  const t = cart.totals();
  $("#drawer-body").innerHTML = items.length
    ? items.map((i, idx) => {
      const p = findProduct(i.id);
      return `
        <div class="drawer-item">
          <a href="#/produto/${p.id}">${thumb(p)}</a>
          <div>
            <a href="#/produto/${p.id}" class="name">${esc(p.name)}</a>
            <div class="muted small">Tam. ${i.size} · ${brl(p.price)}</div>
            <div class="drawer-row">
              <div class="qty sm"><button data-act="minus" data-i="${idx}" aria-label="Diminuir">−</button><span>${i.qty}</span><button data-act="plus" data-i="${idx}" aria-label="Aumentar">+</button></div>
              <button class="link" data-act="remove" data-i="${idx}">Remover</button>
            </div>
          </div>
          <strong>${brl(p.price * i.qty)}</strong>
        </div>`;
    }).join("")
    : `<div class="empty"><p>Sua sacola está vazia.</p><a href="#/catalogo" class="btn">Ver catálogo</a></div>`;
  $("#drawer-foot").innerHTML = items.length ? `
    ${freeShipHTML(t)}
    <div class="summary-line total" style="margin-top:0;border:0;padding-top:0"><span>Subtotal</span><span>${brl(t.subtotal - t.discount)}</span></div>
    <a href="#/checkout" class="btn accent block">Finalizar compra</a>
    <a href="#/carrinho" class="btn ghost block" style="margin-top:8px">Ver sacola</a>` : "";
}

function openDrawer() {
  renderDrawer();
  $("#drawer").classList.add("open");
  $("#drawer").setAttribute("aria-hidden", "false");
  $("#overlay").hidden = false;
  document.body.classList.add("lock");
}

function closeDrawer() {
  $("#drawer").classList.remove("open");
  $("#drawer").setAttribute("aria-hidden", "true");
  $("#overlay").hidden = true;
  document.body.classList.remove("lock");
}

function cartAction(act, idx) {
  const it = cart.items()[idx];
  if (!it) return;
  if (act === "plus") cart.setQty(idx, it.qty + 1);
  if (act === "minus") cart.setQty(idx, it.qty - 1);
  if (act === "remove") cart.setQty(idx, 0);
}

// ===== Modal =====
function openModal(html) {
  $("#modal-content").innerHTML = html;
  $("#modal").hidden = false;
  document.body.classList.add("lock");
}
function closeModal() {
  $("#modal").hidden = true;
  document.body.classList.remove("lock");
}

function sizeGuide(p) {
  if (p.cat === "calcados") {
    return `<h2>Guia de medidas · Calçados</h2><p class="muted">Meça o pé do calcanhar até a ponta do dedo maior.</p>
      <table class="table"><tr><th>Número</th><th>Comprimento do pé</th></tr>
      ${[[34, 22.5], [35, 23], [36, 23.5], [37, 24.5], [38, 25], [39, 25.5], [40, 26.5], [41, 27], [42, 27.5], [43, 28.5]].map(([n, c]) => `<tr><td>${n}</td><td>${c} cm</td></tr>`).join("")}</table>`;
  }
  return `<h2>Guia de medidas · Roupas</h2><p class="muted">Medidas do corpo, em centímetros.</p>
    <table class="table"><tr><th>Tamanho</th><th>Busto/Tórax</th><th>Cintura</th><th>Quadril</th></tr>
    ${[["PP", "80–84", "62–66", "86–90"], ["P", "85–89", "67–71", "91–95"], ["M", "90–95", "72–77", "96–101"], ["G", "96–102", "78–84", "102–108"], ["GG", "103–110", "85–92", "109–116"]].map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</table>`;
}

// ===== Cabeçalho e busca =====
function updateHeader() {
  $("#cart-count").textContent = cart.count();
  const nFav = favs.list().length;
  $("#fav-count").hidden = !nFav;
  $("#fav-count").textContent = nFav;
  const user = auth.current();
  $("#account-label").textContent = user ? user.name.split(" ")[0] : "Entrar";
  if ($("#drawer").classList.contains("open")) renderDrawer();
}

function searchProducts(q) {
  const terms = norm(q).split(/\s+/).filter(Boolean);
  if (!terms.length) return PRODUCTS;
  return PRODUCTS.filter((p) => {
    const text = norm(`${p.name} ${p.desc} ${CATEGORIES[p.cat]}`);
    return terms.every((t) => text.includes(t));
  });
}

function toggleSearch(force) {
  const panel = $("#search-panel");
  panel.hidden = force === undefined ? !panel.hidden : !force;
  if (!panel.hidden) { $("#search-input").value = ""; $("#suggestions").innerHTML = ""; $("#search-input").focus(); }
}

// ===== Páginas =====
const main = $("#app");
let app = main;

function pageHome() {
  const bestSellers = PRODUCTS.filter((p) => p.tag === "Mais vendido").slice(0, 4);
  const news = PRODUCTS.filter((p) => p.tag === "Novo").slice(0, 4);
  const seen = recent.list().slice(0, 4).map(findProduct);
  const img = (id, n = 1) => `img/p${id}-${n}.webp`;
  app.innerHTML = `
    <section class="hero">
      <div class="hero-text">
        <span class="eyebrow">Coleção Primavera 2026</span>
        <h1>Vista o que é <em>atemporal</em></h1>
        <p>Peças leves, cortes precisos e cores que combinam com tudo. Feitas para acompanhar você em todas as estações.</p>
        <div class="hero-cta">
          <a href="#/catalogo?cat=feminino" class="btn">Comprar feminino</a>
          <a href="#/catalogo?cat=masculino" class="btn ghost">Comprar masculino</a>
        </div>
      </div>
      <div class="hero-art">
        <figure><img src="${img(8)}" alt="Vestido Poá Rodado"></figure>
        <figure><img src="${img(15)}" alt="Tênis cano alto"></figure>
        <figure><img src="${img(22)}" alt="Bolsa de couro"></figure>
      </div>
    </section>

    <div class="perks">
      <div class="perk"><span>🚚</span><div><strong>Frete grátis</strong>acima de ${brl(CONFIG.freeShippingFrom)}</div></div>
      <div class="perk"><span>💳</span><div><strong>Até ${CONFIG.maxInstallments}x sem juros</strong>no cartão de crédito</div></div>
      <div class="perk"><span>⚡</span><div><strong>${CONFIG.pixDiscount * 100}% off no Pix</strong>aprovação imediata</div></div>
      <div class="perk"><span>🔄</span><div><strong>Troca grátis</strong>em até 30 dias</div></div>
    </div>

    <div class="container">
      <section class="section">
        <div class="section-head"><div><span class="eyebrow">Categorias</span><h2>Compre por estilo</h2></div></div>
        <div class="cat-tiles">
          <a class="cat-tile" href="#/catalogo?cat=feminino"><img src="${img(5)}" alt=""><span>Feminino</span></a>
          <a class="cat-tile" href="#/catalogo?cat=masculino"><img src="${img(1)}" alt=""><span>Masculino</span></a>
          <a class="cat-tile" href="#/catalogo?cat=calcados"><img src="${img(18)}" alt=""><span>Calçados</span></a>
          <a class="cat-tile" href="#/catalogo?cat=acessorios"><img src="${img(21)}" alt=""><span>Acessórios</span></a>
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <div><span class="eyebrow">Os favoritos</span><h2>Mais vendidos</h2></div>
          <a href="#/catalogo" class="link">Ver tudo</a>
        </div>
        <div class="grid">${bestSellers.map(productCard).join("")}</div>
      </section>

      <section class="banner">
        <div class="banner-text">
          <span class="eyebrow">Sale de meia estação</span>
          <h2>Até 20% off em peças selecionadas</h2>
          <p>Aproveite descontos em vestidos, calçados e acessórios. Use também o cupom <strong style="color:#fff">TRAMA20</strong> na sacola.</p>
          <a href="#/catalogo?sort=promo" class="btn light">Ver promoções</a>
        </div>
        <div class="banner-img">
          <img src="${img(14)}" alt=""><img src="${img(19)}" alt="">
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <div><span class="eyebrow">Acabou de chegar</span><h2>Novidades</h2></div>
          <a href="#/catalogo" class="link">Ver tudo</a>
        </div>
        <div class="grid">${news.map(productCard).join("")}</div>
      </section>

      ${seen.length ? `
      <section class="section">
        <div class="section-head"><div><span class="eyebrow">Seu histórico</span><h2>Vistos recentemente</h2></div></div>
        <div class="grid">${seen.map(productCard).join("")}</div>
      </section>` : ""}
    </div>`;
}

function pageCatalog(params) {
  const maxPrice = Math.ceil(Math.max(...PRODUCTS.map((p) => p.price)) / 50) * 50;
  const state = {
    cat: params.get("cat") || "",
    q: params.get("q") || "",
    sort: params.get("sort") || "relevancia",
    sizes: new Set((params.get("tam") || "").split(",").filter(Boolean)),
    max: Number(params.get("max")) || maxPrice,
    avail: params.get("disp") === "1",
  };

  app.innerHTML = `
    <div class="catalog-head">
      <div><span class="eyebrow">Trama</span><h1 id="cat-title">Catálogo</h1></div>
      <span class="muted" id="result-count"></span>
    </div>
    <div class="catalog">
      <details class="filters" id="filters" open>
        <summary>Filtros</summary>
        <div class="filter-group">
          <h4>Categoria</h4>
          <div class="chips" id="chips">
            <button class="chip" data-cat="">Todos</button>
            ${Object.entries(CATEGORIES).map(([k, v]) => `<button class="chip" data-cat="${k}">${v}</button>`).join("")}
          </div>
        </div>
        <div class="filter-group">
          <h4>Tamanho</h4>
          <div class="size-filter" id="size-filter"></div>
        </div>
        <div class="filter-group">
          <h4>Preço máximo: <span id="max-label"></span></h4>
          <input type="range" id="max" min="50" max="${maxPrice}" step="10" value="${state.max}" aria-label="Preço máximo">
        </div>
        <label class="check"><input type="checkbox" id="avail" ${state.avail ? "checked" : ""}> Somente disponíveis</label>
        <button class="link" id="clear" style="margin-top:12px">Limpar filtros</button>
      </details>
      <div>
        <div class="toolbar">
          <input class="search" id="q" type="search" placeholder="Buscar no catálogo..." value="${esc(state.q)}" aria-label="Buscar">
          <select class="select" id="sort" aria-label="Ordenar">
            <option value="relevancia">Relevância</option>
            <option value="menor">Menor preço</option>
            <option value="maior">Maior preço</option>
            <option value="nome">Nome A–Z</option>
            <option value="avaliacao">Mais bem avaliados</option>
            <option value="promo">Promoções</option>
          </select>
        </div>
        <div class="grid grid-3" id="grid"></div>
      </div>
    </div>`;

  $("#sort").value = state.sort;
  if (window.innerWidth < 860) $("#filters").open = false;

  const render = () => {
    const inCat = PRODUCTS.filter((p) => !state.cat || p.cat === state.cat);
    const allSizes = sortSizes(new Set(inCat.flatMap((p) => p.sizes)));
    $("#size-filter").innerHTML = allSizes.map((s) => `<button class="size sm ${state.sizes.has(s) ? "active" : ""}" data-size="${s}">${s}</button>`).join("");

    let list = searchProducts(state.q).filter((p) =>
      (!state.cat || p.cat === state.cat) &&
      p.price <= state.max &&
      (!state.sizes.size || p.sizes.some((s) => state.sizes.has(s) && stock.get(p.id, s) > 0)) &&
      (!state.avail || stock.total(p) > 0));
    if (state.sort === "menor") list.sort((a, b) => a.price - b.price);
    if (state.sort === "maior") list.sort((a, b) => b.price - a.price);
    if (state.sort === "nome") list.sort((a, b) => a.name.localeCompare(b.name));
    if (state.sort === "avaliacao") list.sort((a, b) => reviews.avg(b.id) - reviews.avg(a.id));
    if (state.sort === "promo") list = list.filter((p) => p.oldPrice);

    $$(".chip").forEach((c) => c.classList.toggle("active", c.dataset.cat === state.cat));
    $("#max-label").textContent = brl(state.max);
    $("#cat-title").textContent = state.q ? `Busca: "${state.q}"` : state.sort === "promo" ? "Promoções" : CATEGORIES[state.cat] || "Catálogo";
    $("#result-count").textContent = `${list.length} produto${list.length === 1 ? "" : "s"}`;
    $("#grid").innerHTML = list.length ? list.map(productCard).join("") : `<div class="empty" style="grid-column:1/-1"><h2>Nada encontrado</h2><p>Tente remover alguns filtros.</p></div>`;

    const qs = new URLSearchParams();
    if (state.cat) qs.set("cat", state.cat);
    if (state.q) qs.set("q", state.q);
    if (state.sort !== "relevancia") qs.set("sort", state.sort);
    if (state.sizes.size) qs.set("tam", [...state.sizes].join(","));
    if (state.max < maxPrice) qs.set("max", state.max);
    if (state.avail) qs.set("disp", "1");
    history.replaceState(null, "", "#/catalogo" + (qs.toString() ? "?" + qs : ""));
    $$("#nav [data-nav]").forEach((a) => a.classList.toggle("active", a.dataset.nav === state.cat && !state.q));
  };

  $("#q").addEventListener("input", debounce((e) => { state.q = e.target.value.trim(); render(); }));
  $("#sort").addEventListener("change", (e) => { state.sort = e.target.value; render(); });
  $("#max").addEventListener("input", (e) => { state.max = Number(e.target.value); render(); });
  $("#avail").addEventListener("change", (e) => { state.avail = e.target.checked; render(); });
  $("#chips").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (chip) { state.cat = chip.dataset.cat; state.sizes.clear(); render(); }
  });
  $("#size-filter").addEventListener("click", (e) => {
    const b = e.target.closest(".size");
    if (!b) return;
    const s = b.dataset.size;
    state.sizes.has(s) ? state.sizes.delete(s) : state.sizes.add(s);
    render();
  });
  $("#clear").addEventListener("click", () => {
    Object.assign(state, { cat: "", q: "", sort: "relevancia", max: maxPrice, avail: false });
    state.sizes.clear();
    $("#q").value = ""; $("#sort").value = "relevancia"; $("#max").value = maxPrice; $("#avail").checked = false;
    render();
  });
  render();
}

function pageProduct(id) {
  const p = findProduct(id);
  if (!p) return pageNotFound();
  recent.add(p.id);

  const firstAvailable = p.sizes.find((s) => stock.get(p.id, s) > 0);
  let size = p.sizes.length === 1 ? firstAvailable || null : null;
  let qty = 1;
  const off = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
  const user = auth.current();

  const renderReviews = () => {
    const list = reviews.of(p.id);
    const avg = reviews.avg(p.id);
    const mine = user && list.some((r) => r.email === user.email);
    $("#reviews").innerHTML = `
      <div class="reviews-head">
        <div>
          <span class="eyebrow">Opinião de quem comprou</span>
          <h2>Avaliações</h2>
          ${list.length ? `<div class="rating big">${stars(avg)} <strong>${avg.toFixed(1)}</strong> <span class="muted">· ${list.length} avaliaç${list.length === 1 ? "ão" : "ões"}</span></div>` : `<p class="muted">Este produto ainda não tem avaliações. Seja o primeiro!</p>`}
        </div>
      </div>
      <div class="reviews-grid">
        <div>${list.map((r) => `
          <div class="review">
            <div class="review-head">${stars(r.rating)} <strong>${esc(r.name)}</strong>${r.verified ? `<span class="verified">✓ Compra verificada</span>` : ""}</div>
            <p>${esc(r.text)}</p>
            <small class="muted">${new Date(r.date).toLocaleDateString("pt-BR")}</small>
          </div>`).join("") || ""}</div>
        <div class="card">
          ${!user ? `<p style="margin:0">Quer avaliar este produto? <a class="link" href="#/conta?next=produto/${p.id}">Entre na sua conta</a></p>`
            : mine ? `<p style="margin:0">Obrigado! Você já avaliou este produto.</p>`
            : `<form id="review-form">
                <h3>Escreva sua avaliação</h3>
                <div class="star-input" id="star-input">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-r="${n}" aria-label="${n} estrela(s)">★</button>`).join("")}</div>
                <div class="field"><textarea name="text" rows="3" placeholder="O que você achou do produto? Tamanho, tecido, caimento..." maxlength="500"></textarea><span class="err"></span></div>
                <button class="btn block">Enviar avaliação</button>
              </form>`}
        </div>
      </div>`;

    const form = $("#review-form");
    if (!form) return;
    let rating = 0;
    $("#star-input").addEventListener("click", (e) => {
      const b = e.target.closest("[data-r]");
      if (!b) return;
      rating = Number(b.dataset.r);
      $$("#star-input button").forEach((x) => x.classList.toggle("on", Number(x.dataset.r) <= rating));
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = form.text.value.trim();
      if (!rating) return toast("Escolha de 1 a 5 estrelas.");
      if (text.length < 10) return showErrors(form, { text: "Escreva pelo menos 10 caracteres." });
      reviews.add(p.id, { name: user.name.split(" ")[0], email: user.email, rating, text, date: Date.now(), verified: hasPurchased(user.email, p.id) });
      toast("Avaliação publicada. Obrigado!");
      renderReviews();
    });
  };

  const stockMsg = () => {
    if (!size) return "";
    const n = stock.get(p.id, size);
    if (n === 0) return `<span style="color:var(--error)">Esgotado neste tamanho</span>`;
    if (n <= 2) return `<span style="color:var(--accent)">Últimas ${n} unidade${n > 1 ? "s" : ""}!</span>`;
    return `<span style="color:var(--ok)">Em estoque</span>`;
  };

  app.innerHTML = `
    <div class="breadcrumb"><a href="#/">Início</a> / <a href="#/catalogo?cat=${p.cat}">${CATEGORIES[p.cat]}</a> / ${esc(p.name)}</div>
    <div class="detail">
      <div class="gallery">
        <div class="gallery-thumbs" id="thumbs">
          ${p.images.map((src, i) => `<button class="${i === 0 ? "active" : ""}" data-src="${src}" aria-label="Foto ${i + 1}"><img src="${src}" alt=""></button>`).join("")}
        </div>
        <div class="gallery-main" id="zoom"><img id="main-img" src="${p.images[0]}" alt="${esc(p.name)}"></div>
      </div>
      <div class="detail-info">
        <span class="eyebrow">${CATEGORIES[p.cat]}${p.tag ? ` · ${p.tag}` : ""}</span>
        <h1>${esc(p.name)}</h1>
        ${reviews.of(p.id).length ? `<a href="#reviews" class="rating" id="goto-reviews">${stars(reviews.avg(p.id))} <small class="muted">${reviews.of(p.id).length} avaliações</small></a>` : ""}
        <div style="margin-top:10px">
          <span class="price ${off ? "sale" : ""}">${brl(p.price)}</span>
          ${p.oldPrice ? `<span class="old">${brl(p.oldPrice)}</span> <span class="tag sale inline">-${off}%</span>` : ""}
        </div>
        <p class="muted small" style="margin:6px 0 0">3x de ${brl(p.price / 3)} sem juros · ou <strong>${brl(p.price * (1 - CONFIG.pixDiscount))}</strong> no Pix</p>
        <hr>
        <div class="label-row"><span id="size-label">Tamanho${size ? `: ${size}` : ""}</span>${p.cat !== "acessorios" ? `<button class="link" id="guide">Guia de medidas</button>` : ""}</div>
        <div class="sizes" id="sizes">
          ${p.sizes.map((s) => {
            const out = stock.get(p.id, s) === 0;
            return `<button class="size ${s === size ? "active" : ""} ${out ? "out" : ""}" data-size="${s}" ${out ? 'title="Esgotado"' : ""}>${s}</button>`;
          }).join("")}
        </div>
        <p class="small" id="stock-msg" style="margin:-12px 0 16px;min-height:1.2em">${stockMsg()}</p>
        ${stock.total(p) ? `
          <div class="buy-row">
            <div class="qty"><button id="minus" aria-label="Diminuir">−</button><span id="qty">1</span><button id="plus" aria-label="Aumentar">+</button></div>
            <button class="btn" id="add">Adicionar à sacola</button>
            <button class="btn ghost fav-big ${favs.has(p.id) ? "on" : ""}" data-fav="${p.id}" aria-label="Favoritar">${HEART}</button>
          </div>` : `
          <div class="notice">Produto esgotado no momento.</div>
          <button class="btn ghost block fav-big ${favs.has(p.id) ? "on" : ""}" data-fav="${p.id}">${HEART} Salvar nos favoritos</button>`}
        <hr>
        <form class="ship-calc" id="pship">
          <label class="small" for="pcep"><strong>Calcular frete e prazo</strong></label>
          <div class="inline-form" style="margin:8px 0 0">
            <input id="pcep" name="cep" inputmode="numeric" placeholder="00000-000" value="${esc(shipping.get()?.cep || "")}">
            <button class="btn ghost small">Calcular</button>
          </div>
          <a class="small muted" href="https://buscacepinter.correios.com.br/" target="_blank" rel="noopener">Não sei meu CEP</a>
          <div id="pship-result"></div>
        </form>
        <hr>
        <p style="margin:0 0 20px">${esc(p.desc)}</p>
        <ul class="features">
          <li>🚚 <span>Frete grátis no PAC em compras acima de ${brl(CONFIG.freeShippingFrom)}</span></li>
          <li>🔄 <span>Primeira troca grátis em até 30 dias</span></li>
          <li>🔒 <span>Pagamento seguro com cartão, Pix ou boleto</span></li>
        </ul>
      </div>
    </div>

    <section class="section" id="reviews"></section>

    <section class="section">
      <div class="section-head"><div><span class="eyebrow">Combine com</span><h2>Você também pode gostar</h2></div></div>
      <div class="grid">${PRODUCTS.filter((x) => x.cat === p.cat && x.id !== p.id).slice(0, 4).map(productCard).join("")}</div>
    </section>`;

  renderReviews();

  // Galeria com zoom ao passar o mouse
  $("#thumbs").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    $("#main-img").src = b.dataset.src;
    $$("#thumbs button").forEach((x) => x.classList.toggle("active", x === b));
  });
  const zoom = $("#zoom");
  zoom.addEventListener("mousemove", (e) => {
    const r = zoom.getBoundingClientRect();
    $("#main-img").style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
    zoom.classList.add("zooming");
  });
  zoom.addEventListener("mouseleave", () => zoom.classList.remove("zooming"));

  $("#goto-reviews")?.addEventListener("click", (e) => { e.preventDefault(); $("#reviews").scrollIntoView({ behavior: "smooth" }); });
  $("#guide")?.addEventListener("click", () => openModal(sizeGuide(p)));

  $("#sizes").addEventListener("click", (e) => {
    const b = e.target.closest(".size");
    if (!b) return;
    size = b.dataset.size;
    $$(".size", $("#sizes")).forEach((x) => x.classList.toggle("active", x === b));
    $("#size-label").textContent = `Tamanho: ${size}`;
    $("#stock-msg").innerHTML = stockMsg();
    qty = 1;
    if ($("#qty")) $("#qty").textContent = qty;
  });
  if ($("#add")) {
    $("#minus").onclick = () => { qty = Math.max(1, qty - 1); $("#qty").textContent = qty; };
    $("#plus").onclick = () => {
      const max = size ? stock.get(p.id, size) : 10;
      if (qty >= max) return toast(`Só temos ${max} unidade(s) deste tamanho.`);
      qty++; $("#qty").textContent = qty;
    };
    $("#add").onclick = () => {
      if (!size) { toast("Selecione um tamanho."); $("#sizes").classList.add("shake"); setTimeout(() => $("#sizes")?.classList.remove("shake"), 500); return; }
      if (stock.get(p.id, size) === 0) return toast("Este tamanho está esgotado.");
      try {
        const added = cart.add(p.id, size, qty);
        if (added < qty) toast(`Adicionamos ${added} unidade(s): é o que temos em estoque.`);
        openDrawer();
      } catch (err) { toast(err.message); }
    };
  }

  const pship = $("#pship");
  maskInput(pship.cep, maskCep);
  const showQuotes = () => {
    const s = shipping.get();
    if (!s?.cep) return;
    $("#pship-result").innerHTML = `
      <p class="muted small" style="margin:10px 0 6px">${s.city ? `Entrega em ${esc(s.city)} - ${esc(s.uf)}` : "Estimativa pela região do CEP"}</p>
      ${shipping.quotes(s, p.price).map((q) => `<div class="summary-line small"><span>${q.name} · até ${fmtDay(addBusinessDays(q.days))}</span><strong>${q.price ? brl(q.price) : "Grátis"}</strong></div>`).join("")}`;
  };
  pship.addEventListener("submit", async (e) => {
    e.preventDefault();
    $("#pship-result").innerHTML = `<p class="muted small">Consultando CEP...</p>`;
    try { await shipping.lookup(pship.cep.value); showQuotes(); } catch (err) { $("#pship-result").innerHTML = `<p class="small" style="color:var(--error)">${err.message}</p>`; }
  });
  showQuotes();
}

function pageCart() {
  const items = cart.items();
  if (!items.length) {
    app.innerHTML = `<div class="empty"><div class="success-icon pending">🛍️</div><h2>Sua sacola está vazia</h2><p>Explore o catálogo e encontre algo que combine com você.</p><a href="#/catalogo" class="btn">Ver catálogo</a></div>`;
    return;
  }
  app.innerHTML = `
    <h1>Sacola <span class="muted" style="font-size:1rem;font-family:var(--sans)">(${cart.count()} ${cart.count() === 1 ? "item" : "itens"})</span></h1>
    <div class="layout-2">
      <div class="card" id="cart-list">
        ${items.map((i, idx) => {
          const p = findProduct(i.id);
          const left = stock.get(p.id, i.size);
          return `
            <div class="cart-item">
              <a href="#/produto/${p.id}">${thumb(p)}</a>
              <div>
                <a href="#/produto/${p.id}"><strong style="font-weight:500">${esc(p.name)}</strong></a>
                <div class="muted small">Tamanho: ${i.size} · ${brl(p.price)} cada</div>
                ${left <= 2 ? `<div class="small" style="color:var(--accent)">Restam apenas ${left} em estoque</div>` : ""}
                <div style="display:flex;gap:14px;align-items:center;margin-top:10px;flex-wrap:wrap">
                  <div class="qty sm"><button data-act="minus" data-i="${idx}" aria-label="Diminuir">−</button><span>${i.qty}</span><button data-act="plus" data-i="${idx}" aria-label="Aumentar">+</button></div>
                  <button class="link" data-act="remove" data-i="${idx}">Remover</button>
                  <button class="link" data-act="save" data-i="${idx}">Mover para favoritos</button>
                </div>
              </div>
              <strong>${brl(p.price * i.qty)}</strong>
            </div>`;
        }).join("")}
      </div>
      <div class="card sticky" id="summary">${summaryHTML({ button: true, calc: true })}</div>
    </div>`;

  $("#cart-list").addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const idx = Number(b.dataset.i);
    if (b.dataset.act === "save") {
      const it = cart.items()[idx];
      if (!favs.has(it.id)) favs.toggle(it.id);
      cart.setQty(idx, 0);
      toast("Movido para os favoritos.");
    } else cartAction(b.dataset.act, idx);
    pageCart();
  });
  bindSummary($("#summary"), pageCart);
}

function pageFavorites() {
  const list = favs.list().map(findProduct);
  app.innerHTML = `
    <div class="catalog-head"><div><span class="eyebrow">Sua lista</span><h1>Favoritos</h1></div><span class="muted">${list.length} produto${list.length === 1 ? "" : "s"}</span></div>
    ${list.length ? `<div class="grid">${list.map(productCard).join("")}</div>`
      : `<div class="empty"><div class="success-icon pending">♡</div><h2>Nenhum favorito ainda</h2><p>Toque no coração dos produtos para salvá-los aqui.</p><a href="#/catalogo" class="btn">Ver catálogo</a></div>`}`;
}

function pageAccount(params) {
  const user = auth.current();
  if (!user) return pageAuth(params);

  const tab = params.get("aba") || "pedidos";
  const list = orders.ofUser(user.email);
  const a = user.address || {};
  app.innerHTML = `
    <div class="account-head">
      <div><span class="eyebrow">Minha conta</span><h1 style="margin:4px 0 0">Olá, ${esc(user.name.split(" ")[0])}!</h1><span class="muted">${esc(user.email)}</span></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${user.role === "admin" ? `<a href="#/admin" class="btn accent">Painel admin</a>` : ""}
        <button class="btn ghost" id="logout">Sair</button>
      </div>
    </div>
    <div class="tabs">
      <a href="#/conta?aba=pedidos" class="${tab === "pedidos" ? "active" : ""}">Pedidos (${list.length})</a>
      <a href="#/conta?aba=dados" class="${tab === "dados" ? "active" : ""}">Dados e endereço</a>
      <a href="#/conta?aba=senha" class="${tab === "senha" ? "active" : ""}">Senha</a>
    </div>
    <div id="tab-content"></div>`;

  const content = $("#tab-content");

  if (tab === "pedidos") {
    content.innerHTML = list.length ? list.map((o) => `
      <a class="order" href="#/pedido/${o.id}">
        <div class="order-head">
          <strong>Pedido #${o.id}</strong>
          <span class="status ${statusClass(o.status)}">${o.status}</span>
        </div>
        <div class="muted small">${fmtDate(o.date)} · ${esc(o.methodLabel)}${o.tracking ? ` · Rastreio ${o.tracking}` : ""}</div>
        <div class="order-thumbs">${o.items.map((i) => { const p = findProduct(i.id); return p ? thumb(p) : ""; }).join("")}</div>
        <div class="order-head" style="margin:0"><span class="small">${o.items.reduce((n, i) => n + i.qty, 0)} item(ns)</span><strong>${brl(o.total)}</strong></div>
      </a>`).join("") : `<div class="empty"><p>Você ainda não fez nenhum pedido.</p><a class="btn" href="#/catalogo">Começar a comprar</a></div>`;
  }

  if (tab === "dados") {
    content.innerHTML = `
      <form class="card narrow" id="profile" novalidate>
        <h3>Dados pessoais</h3>
        <div class="field"><label>Nome completo</label><input name="name" value="${esc(user.name)}"><span class="err"></span></div>
        <h3 style="margin-top:24px">Endereço principal</h3>
        <div class="row">
          <div class="field"><label>CEP</label><input name="cep" inputmode="numeric" placeholder="00000-000" value="${esc(a.cep || "")}"><span class="err"></span></div>
          <div class="field"><label>&nbsp;</label><span class="muted small" id="cep-status" style="padding-top:12px"></span></div>
        </div>
        <div class="row-addr">
          <div class="field"><label>Rua</label><input name="street" value="${esc(a.street || "")}"><span class="err"></span></div>
          <div class="field"><label>Número</label><input name="number" value="${esc(a.number || "")}"><span class="err"></span></div>
        </div>
        <div class="row">
          <div class="field"><label>Complemento</label><input name="extra" value="${esc(a.extra || "")}"></div>
          <div class="field"><label>Bairro</label><input name="district" value="${esc(a.district || "")}"></div>
        </div>
        <div class="row">
          <div class="field"><label>Cidade</label><input name="city" value="${esc(a.city || "")}"></div>
          <div class="field"><label>UF</label><input name="uf" maxlength="2" value="${esc(a.uf || "")}"></div>
        </div>
        <button class="btn block">Salvar alterações</button>
      </form>`;
    const f = $("#profile");
    bindCepAutofill(f);
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      if (f.name.value.trim().split(/\s+/).length < 2) return showErrors(f, { name: "Informe nome e sobrenome." });
      showErrors(f, {});
      auth.update({ name: f.name.value.trim(), address: readAddress(f) });
      updateHeader();
      toast("Dados salvos!");
    });
  }

  if (tab === "senha") {
    content.innerHTML = `
      <form class="card narrow" id="pass-form" novalidate>
        <h3>Alterar senha</h3>
        <div class="field"><label>Senha atual</label><input name="current" type="password" autocomplete="current-password"><span class="err"></span></div>
        <div class="field"><label>Nova senha</label><input name="next" type="password" autocomplete="new-password"><span class="err"></span></div>
        <div class="field"><label>Confirmar nova senha</label><input name="confirm" type="password" autocomplete="new-password"><span class="err"></span></div>
        <button class="btn block">Alterar senha</button>
      </form>`;
    const f = $("#pass-form");
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const errors = {};
      if (f.next.value.length < 6) errors.next = "A senha precisa ter ao menos 6 caracteres.";
      if (f.confirm.value !== f.next.value) errors.confirm = "As senhas não coincidem.";
      showErrors(f, errors);
      if (Object.keys(errors).length) return;
      try {
        await auth.changePassword(f.current.value, f.next.value);
        f.reset();
        toast("Senha alterada com sucesso!");
      } catch (err) { showErrors(f, { current: err.message }); }
    });
  }

  $("#logout").onclick = () => { auth.logout(); updateHeader(); toast("Você saiu da sua conta."); location.hash = "#/"; };
}

function readAddress(f) {
  return {
    cep: f.cep.value, street: f.street.value.trim(), number: f.number.value.trim(), extra: f.extra.value.trim(),
    district: f.district.value.trim(), city: f.city.value.trim(), uf: f.uf.value.trim().toUpperCase(),
  };
}

// Preenche o endereço automaticamente ao digitar o CEP (ViaCEP)
function bindCepAutofill(f, onDone) {
  let last = onlyDigits(f.cep.value);
  maskInput(f.cep, maskCep);
  f.cep.addEventListener("input", async () => {
    const cep = onlyDigits(f.cep.value);
    if (cep.length !== 8 || cep === last) return;
    last = cep;
    const status = $("#cep-status");
    if (status) status.textContent = "Buscando endereço...";
    try {
      const addr = await shipping.lookup(cep);
      if (!addr.offline) {
        f.street.value = addr.street || "";
        f.district.value = addr.district || "";
        f.city.value = addr.city || "";
        f.uf.value = addr.uf || "";
        (addr.street ? f.number : f.street).focus();
      }
      if (status) status.textContent = addr.offline ? "Sem conexão: preencha o endereço manualmente." : "✓ Endereço encontrado";
      showErrors(f, {});
    } catch (err) {
      if (status) status.textContent = "";
      showErrors(f, { cep: err.message });
    }
    onDone?.();
  });
}

function pageAuth(params) {
  const next = params.get("next");
  let mode = params.get("modo") === "cadastro" ? "register" : "login";

  const render = () => {
    app.innerHTML = `
      <div class="auth">
        <h1>${mode === "login" ? "Entrar" : "Criar conta"}</h1>
        <div class="card">
          ${next ? `<p class="notice">Entre ou crie uma conta para continuar.</p>` : ""}
          <div class="tabs">
            <button data-mode="login" class="${mode === "login" ? "active" : ""}">Entrar</button>
            <button data-mode="register" class="${mode === "register" ? "active" : ""}">Criar conta</button>
          </div>
          <form id="auth-form" novalidate>
            ${mode === "register" ? `<div class="field"><label>Nome completo</label><input name="name" autocomplete="name"><span class="err"></span></div>` : ""}
            <div class="field"><label>E-mail</label><input name="email" type="email" autocomplete="email"><span class="err"></span></div>
            <div class="field"><label>Senha</label>
              <div class="pass-wrap"><input name="password" type="password" autocomplete="${mode === "login" ? "current-password" : "new-password"}"><button type="button" class="link" id="show-pass">Mostrar</button></div>
              <span class="err"></span>
            </div>
            ${mode === "register" ? `<div class="field"><label>Confirmar senha</label><input name="confirm" type="password" autocomplete="new-password"><span class="err"></span></div>
              <label class="check small" style="margin-bottom:14px"><input type="checkbox" name="news" checked> Quero receber novidades e ofertas por e-mail</label>` : ""}
            <p class="err" id="form-err" style="color:var(--error);min-height:1em"></p>
            <button class="btn accent block">${mode === "login" ? "Entrar" : "Criar conta"}</button>
          </form>
        </div>
      </div>`;

    $$(".tabs button").forEach((b) => (b.onclick = () => { mode = b.dataset.mode; render(); }));
    $("#show-pass").onclick = (e) => {
      const input = $("#auth-form").password;
      input.type = input.type === "password" ? "text" : "password";
      e.target.textContent = input.type === "password" ? "Mostrar" : "Ocultar";
    };
    $("#auth-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target;
      const errors = {};
      if (mode === "register" && f.name.value.trim().split(/\s+/).length < 2) errors.name = "Informe nome e sobrenome.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.value.trim())) errors.email = "E-mail inválido.";
      if (f.password.value.length < 6) errors.password = "A senha precisa ter ao menos 6 caracteres.";
      if (mode === "register" && f.confirm.value !== f.password.value) errors.confirm = "As senhas não coincidem.";
      showErrors(f, errors);
      if (Object.keys(errors).length) return;

      try {
        if (mode === "login") await auth.login(f.email.value, f.password.value);
        else await auth.register({ name: f.name.value, email: f.email.value, password: f.password.value });
        updateHeader();
        toast(mode === "login" ? "Bem-vindo(a) de volta!" : "Conta criada com sucesso!");
        location.hash = next ? `#/${next}` : "#/conta";
      } catch (err) {
        $("#form-err").textContent = err.message;
      }
    });
  };
  render();
}

// ===== Checkout =====
function pageCheckout() {
  const user = auth.current();
  if (!user) { location.hash = "#/conta?next=checkout"; return; }
  if (!cart.items().length) { location.hash = "#/carrinho"; return; }

  // Endereço inicial: o salvo na conta ou o CEP usado no cálculo de frete
  const ship = shipping.get();
  let a = user.address || {};
  if (ship?.cep && onlyDigits(ship.cep) !== onlyDigits(a.cep)) a = { cep: ship.cep, street: ship.street, district: ship.district, city: ship.city, uf: ship.uf };
  let method = "card";

  app.innerHTML = `
    <h1>Finalizar compra</h1>
    <div class="layout-2">
      <form id="checkout" novalidate>
        <div class="card mb">
          <div class="step-title"><b>1</b><h3 style="margin:0">Entrega</h3></div>
          <div class="row">
            <div class="field"><label>Nome de quem recebe</label><input name="recipient" autocomplete="name" value="${esc(user.name)}"><span class="err"></span></div>
            <div class="field"><label>CPF</label><input name="cpf" inputmode="numeric" placeholder="000.000.000-00"><span class="err"></span></div>
          </div>
          <div class="row">
            <div class="field"><label>CEP</label><input name="cep" inputmode="numeric" autocomplete="postal-code" placeholder="00000-000" value="${esc(a.cep || "")}"><span class="err"></span></div>
            <div class="field"><label>&nbsp;</label><span class="muted small" id="cep-status" style="padding-top:12px"></span></div>
          </div>
          <div class="row-addr">
            <div class="field"><label>Rua</label><input name="street" autocomplete="address-line1" value="${esc(a.street || "")}"><span class="err"></span></div>
            <div class="field"><label>Número</label><input name="number" value="${esc(a.number || "")}"><span class="err"></span></div>
          </div>
          <div class="row">
            <div class="field"><label>Complemento</label><input name="extra" value="${esc(a.extra || "")}"></div>
            <div class="field"><label>Bairro</label><input name="district" value="${esc(a.district || "")}"><span class="err"></span></div>
          </div>
          <div class="row">
            <div class="field"><label>Cidade</label><input name="city" value="${esc(a.city || "")}"><span class="err"></span></div>
            <div class="field"><label>UF</label><input name="uf" maxlength="2" value="${esc(a.uf || "")}"><span class="err"></span></div>
          </div>
          <div id="ship-area"></div>
        </div>

        <div class="card">
          <div class="step-title"><b>2</b><h3 style="margin:0">Pagamento</h3></div>
          <div class="pay-tabs">
            <button type="button" class="pay-tab active" data-m="card">💳 Cartão</button>
            <button type="button" class="pay-tab" data-m="pix">⚡ Pix</button>
            <button type="button" class="pay-tab" data-m="boleto">📄 Boleto</button>
          </div>
          <div id="pay-area"></div>
          <p class="err" id="pay-err" style="color:var(--error);min-height:1em"></p>
          <button class="btn accent block" id="pay-btn"></button>
          <div class="secure">🔒 Seus dados são protegidos</div>
        </div>
      </form>
      <div class="sticky">
        <div class="card mb">
          ${cart.items().map((i) => { const p = findProduct(i.id); return `<div class="mini-item">${thumb(p)}<span>${esc(p.name)}<br><span class="muted">${i.qty}× · Tam. ${i.size}</span></span><span>${brl(p.price * i.qty)}</span></div>`; }).join("")}
          <a href="#/carrinho" class="link">Editar sacola</a>
        </div>
        <div class="card" id="summary"></div>
      </div>
    </div>`;

  const f = $("#checkout");
  maskInput(f.cpf, maskCpf);

  const payAreaHTML = () => {
    if (method === "card") return `
      <p class="notice">Pagamento com cartão <strong>simulado</strong>: nenhum valor é cobrado e os dados não são salvos.
      Aprovado: <code>4111 1111 1111 1111</code> · Recusado: <code>4000 0000 0000 0002</code></p>
      <div class="field"><label>Número do cartão</label><div class="card-input"><input name="cardNumber" inputmode="numeric" autocomplete="cc-number" placeholder="0000 0000 0000 0000"><span id="brand"></span></div><span class="err"></span></div>
      <div class="field"><label>Nome impresso no cartão</label><input name="cardName" autocomplete="cc-name"><span class="err"></span></div>
      <div class="row">
        <div class="field"><label>Validade</label><input name="cardExp" inputmode="numeric" autocomplete="cc-exp" placeholder="MM/AA"><span class="err"></span></div>
        <div class="field"><label>CVV</label><input name="cardCvv" inputmode="numeric" autocomplete="cc-csc" maxlength="4" placeholder="123"><span class="err"></span></div>
      </div>
      <div class="field"><label>Parcelas</label><select name="installments" id="installments"></select></div>`;
    if (method === "pix") return `
      <div class="pix-box">
        <p>Pagando com Pix você ganha <strong>${CONFIG.pixDiscount * 100}% de desconto</strong>.</p>
        <p style="font-size:1.4rem;font-weight:700;margin:4px 0" id="pix-amount"></p>
        <p class="muted small" style="margin:0">O QR Code é gerado após confirmar o pedido. Aprovação imediata.</p>
      </div>`;
    return `
      <div class="pix-box">
        <p>O boleto vence em <strong>3 dias úteis</strong>. O pedido é enviado após a compensação (até 2 dias úteis).</p>
        <p style="font-size:1.4rem;font-weight:700;margin:4px 0" id="boleto-amount"></p>
      </div>`;
  };

  const refresh = () => {
    const t = cart.totals();
    $("#summary").innerHTML = summaryHTML();
    bindSummary($("#summary"), refresh);

    const s = shipping.get();
    const cepOk = s?.cep && onlyDigits(s.cep) === onlyDigits(f.cep.value);
    $("#ship-area").innerHTML = cepOk
      ? `<h4 class="sub">Forma de entrega</h4>${shipOptionsHTML(shipping.quotes(s, t.subtotal - t.discount), s.option)}`
      : `<p class="muted small" style="margin:4px 0 0">Informe o CEP para ver as opções de entrega.</p>`;
    $$('#ship-area input[name="ship-opt"]').forEach((r) => r.addEventListener("change", () => { shipping.set({ ...shipping.get(), option: r.value }); refresh(); }));

    const total = method === "pix" ? t.total * (1 - CONFIG.pixDiscount) : t.total;
    $("#pay-btn").textContent = `${method === "card" ? "Pagar" : "Confirmar pedido"} ${brl(total)}`;
    if ($("#pix-amount")) $("#pix-amount").textContent = brl(total);
    if ($("#boleto-amount")) $("#boleto-amount").textContent = brl(total);
    const sel = $("#installments");
    if (sel) {
      const prev = sel.value || "1";
      // Parcela mínima de R$ 20
      const max = Math.max(1, Math.min(CONFIG.maxInstallments, Math.floor(t.total / 20)));
      sel.innerHTML = Array.from({ length: max }, (_, k) => k + 1).map((n) => `<option value="${n}">${n}x de ${brl(t.total / n)} sem juros</option>`).join("");
      sel.value = Number(prev) <= max ? prev : "1";
    }
  };

  const renderPay = () => {
    $("#pay-area").innerHTML = payAreaHTML();
    maskInput(f.cardNumber, maskCard);
    maskInput(f.cardExp, maskExp);
    maskInput(f.cardCvv, onlyDigits);
    f.cardNumber?.addEventListener("input", () => {
      const n = onlyDigits(f.cardNumber.value);
      $("#brand").textContent = n.length >= 2 ? cardBrand(n) : "";
    });
    refresh();
  };

  $$(".pay-tab").forEach((b) => (b.onclick = () => {
    method = b.dataset.m;
    $$(".pay-tab").forEach((x) => x.classList.toggle("active", x === b));
    $("#pay-err").textContent = "";
    renderPay();
  }));

  bindCepAutofill(f, refresh);
  renderPay();
  // Se o CEP salvo ainda não tem frete calculado, calcula agora
  if (onlyDigits(a.cep).length === 8 && onlyDigits(shipping.get()?.cep) !== onlyDigits(a.cep)) {
    shipping.lookup(a.cep).then(refresh).catch(() => {});
  }

  f.addEventListener("submit", (e) => { e.preventDefault(); submitOrder(f, method); });
}

function submitOrder(f, method) {
  const errors = {};
  if (f.recipient.value.trim().split(/\s+/).length < 2) errors.recipient = "Informe nome e sobrenome.";
  if (!validCpf(f.cpf.value)) errors.cpf = "CPF inválido.";
  if (onlyDigits(f.cep.value).length !== 8) errors.cep = "CEP inválido.";
  if (f.street.value.trim().length < 3) errors.street = "Informe a rua.";
  if (!f.number.value.trim()) errors.number = "Informe o número.";
  if (!f.district.value.trim()) errors.district = "Informe o bairro.";
  if (!f.city.value.trim()) errors.city = "Informe a cidade.";
  if (!UF_REGION[f.uf.value.trim().toUpperCase()]) errors.uf = "UF inválida.";

  let cardInfo = null;
  if (method === "card") {
    const num = onlyDigits(f.cardNumber.value);
    const [mm, yy] = f.cardExp.value.split("/").map(Number);
    const expEnd = new Date(2000 + yy, mm, 1); // primeiro dia do mês seguinte
    if (!luhn(num)) errors.cardNumber = "Número de cartão inválido.";
    if (f.cardName.value.trim().split(/\s+/).length < 2) errors.cardName = "Informe o nome como está no cartão.";
    if (!mm || mm > 12 || !yy || expEnd <= new Date()) errors.cardExp = "Validade inválida.";
    if (!/^\d{3,4}$/.test(f.cardCvv.value)) errors.cardCvv = "CVV inválido.";
    cardInfo = { brand: cardBrand(num), last4: num.slice(-4), installments: Number(f.installments.value), declined: num === "4000000000000002" };
  }

  showErrors(f, errors);
  const err = (msg) => { $("#pay-err").textContent = msg; };
  if (Object.keys(errors).length) {
    err("Revise os campos destacados.");
    $(".invalid", f)?.focus();
    return;
  }

  const t = cart.totals();
  const s = shipping.get();
  if (!t.quote || onlyDigits(s?.cep) !== onlyDigits(f.cep.value)) return err("Aguarde o cálculo do frete para o seu CEP.");
  for (const i of cart.items()) {
    const left = stock.get(i.id, i.size);
    if (i.qty > left) return err(`${findProduct(i.id).name} (${i.size}): só temos ${left} em estoque. Ajuste sua sacola.`);
  }
  err("");

  const btn = $("#pay-btn");
  btn.disabled = true;
  btn.textContent = method === "card" ? "Processando pagamento..." : "Gerando pedido...";

  // Simula a comunicação com o gateway de pagamento
  setTimeout(() => {
    if (cardInfo?.declined) {
      btn.disabled = false;
      btn.textContent = `Pagar ${brl(t.total)}`;
      return err("Pagamento recusado pelo emissor do cartão. Tente outro cartão ou pague com Pix.");
    }
    const now = Date.now();
    const pixOff = method === "pix" ? t.total * CONFIG.pixDiscount : 0;
    const labels = {
      card: cardInfo && `${cardInfo.brand} final ${cardInfo.last4} · ${cardInfo.installments}x`,
      pix: `Pix (${CONFIG.pixDiscount * 100}% off)`,
      boleto: "Boleto bancário",
    };
    const address = readAddress(f);
    const order = {
      id: String(now).slice(-8),
      email: auth.current().email,
      date: now,
      items: cart.items().map((i) => { const p = findProduct(i.id); return { id: p.id, name: p.name, size: i.size, qty: i.qty, price: p.price }; }),
      subtotal: t.subtotal,
      discount: t.discount,
      coupon: t.code,
      pixDiscount: pixOff,
      shipping: { name: t.quote.name, price: t.quote.price, days: t.quote.days, eta: addBusinessDays(t.quote.days).getTime() },
      total: t.total - pixOff,
      method,
      methodLabel: labels[method],
      status: method === "card" ? "Pago" : "Aguardando pagamento",
      history: [{ status: "Aguardando pagamento", date: now }, ...(method === "card" ? [{ status: "Pago", date: now }] : [])],
      recipient: f.recipient.value.trim(),
      address,
    };

    order.items.forEach((i) => stock.change(i.id, i.size, -i.qty));
    orders.save([...orders.all(), order]);
    auth.update({ address });
    store.set(KEYS.coupon, null);
    cart.clear();
    location.hash = `#/pedido/${order.id}`;
  }, 1400);
}

// ===== Pedido (confirmação e acompanhamento) =====
function pageOrder(id) {
  const user = auth.current();
  const order = orders.find(id);
  if (!order || !user || (order.email !== user.email && user.role !== "admin")) return pageNotFound();

  const ship = orderShipping(order);
  const paid = !["Aguardando pagamento", "Cancelado"].includes(order.status);
  const cancelled = order.status === "Cancelado";
  const stepIdx = STATUS_FLOW.indexOf(order.status);
  const when = (s) => (order.history || []).filter((h) => h.status === s).pop()?.date;
  const pix = pixPayload(order.total, `TRAMA${order.id}`);
  const boletoLine = `23793.38128 60000.${order.id.slice(0, 6)} 00000.${order.id.slice(2, 8)} 1 9${String(Math.round(order.total * 100)).padStart(10, "0")}`;
  const a = order.address;
  const awaitingPay = order.status === "Aguardando pagamento";

  app.innerHTML = `
    <div class="order-page">
      <div class="center">
        <div class="success-icon ${cancelled ? "cancel" : paid ? "" : "pending"}">${cancelled ? "✕" : paid ? "✓" : "⏳"}</div>
        <h1>${cancelled ? "Pedido cancelado" : paid ? "Pedido confirmado!" : "Pedido recebido!"}</h1>
        <p class="muted">Pedido <strong>#${order.id}</strong> · ${fmtDate(order.date)}</p>
      </div>

      ${!cancelled ? `
      <div class="card mb">
        <h3>Acompanhe seu pedido</h3>
        <ol class="timeline">
          ${STATUS_FLOW.map((s, i) => `
            <li class="${i < stepIdx ? "done" : i === stepIdx ? "current" : ""}">
              <span class="dot"></span>
              <div><strong>${s}</strong>${when(s) ? `<br><small class="muted">${fmtDate(when(s))}</small>` : ""}</div>
            </li>`).join("")}
        </ol>
        ${order.tracking ? `<p class="small" style="margin:16px 0 0">Código de rastreio: <strong>${order.tracking}</strong> · <a class="link" href="https://rastreamento.correios.com.br/app/index.php" target="_blank" rel="noopener">Rastrear nos Correios</a></p>` : ""}
        ${ship.eta && order.status !== "Entregue" ? `<p class="small muted" style="margin:8px 0 0">Previsão de entrega: <strong>${fmtDay(ship.eta)}</strong> (${esc(ship.name)})</p>` : ""}
      </div>` : ""}

      ${order.method === "pix" && awaitingPay ? `
        <div class="card mb center">
          <h3>Pague com Pix</h3>
          <p class="muted small">Abra o app do seu banco, escolha Pix › Ler QR Code, ou use o Pix Copia e Cola.</p>
          <div id="qr" class="qr"></div>
          <p style="font-size:1.3rem;font-weight:700;margin:8px 0">${brl(order.total)}</p>
          <div class="pix-code" id="pay-code">${pix}</div>
          <button class="btn small" id="copy">Copiar código Pix</button>
          ${CONFIG.pixKey ? `<p class="muted small" style="margin-top:12px">Assim que o pagamento for identificado, o status do pedido será atualizado.</p>`
            : `<p class="notice" style="margin-top:16px;text-align:left">Modo demonstração: configure sua chave Pix em <code>config.js</code> para receber pagamentos reais.</p>
               <button class="btn ghost small" id="simulate">Simular pagamento</button>`}
        </div>` : ""}

      ${order.method === "boleto" && awaitingPay ? `
        <div class="card mb center">
          <h3>Boleto bancário</h3>
          <p class="muted small">Vencimento em 3 dias úteis: ${fmtDay(addBusinessDays(3))}</p>
          <div class="pix-code" id="pay-code">${boletoLine}</div>
          <button class="btn small" id="copy">Copiar linha digitável</button>
          <button class="btn ghost small" id="simulate">Simular pagamento</button>
        </div>` : ""}

      <div class="card mb">
        <h3>Itens</h3>
        ${order.items.map((i) => { const p = findProduct(i.id); return `<div class="mini-item">${p ? thumb(p) : "<span></span>"}<span>${esc(i.name)}<br><span class="muted">${i.qty}× · Tam. ${i.size}</span></span><span>${brl(i.price * i.qty)}</span></div>`; }).join("")}
        <div class="summary-line" style="margin-top:12px"><span>Subtotal</span><span>${brl(order.subtotal)}</span></div>
        ${order.discount ? `<div class="summary-line" style="color:var(--ok)"><span>Cupom ${esc(order.coupon || "")}</span><span>- ${brl(order.discount)}</span></div>` : ""}
        ${order.pixDiscount ? `<div class="summary-line" style="color:var(--ok)"><span>Desconto Pix</span><span>- ${brl(order.pixDiscount)}</span></div>` : ""}
        <div class="summary-line"><span>Frete · ${esc(ship.name)}</span><span>${ship.price ? brl(ship.price) : "Grátis"}</span></div>
        <div class="summary-line total"><span>Total</span><span>${brl(order.total)}</span></div>
      </div>

      <div class="row mb">
        <div class="card">
          <h3>Entrega</h3>
          <p class="muted small" style="margin:0">${esc(order.recipient)}<br>${esc(a.street)}${a.number ? ", " + esc(a.number) : ""}${a.extra ? " - " + esc(a.extra) : ""}<br>${a.district ? esc(a.district) + " · " : ""}${esc(a.city)} - ${esc(a.uf)}<br>CEP ${esc(a.cep)}</p>
        </div>
        <div class="card">
          <h3>Pagamento</h3>
          <p class="muted small" style="margin:0">${esc(order.methodLabel)}<br>Status: <span class="status ${statusClass(order.status)}">${order.status}</span></p>
        </div>
      </div>

      <div class="order-actions no-print">
        <a href="#/catalogo" class="btn accent">Continuar comprando</a>
        <a href="#/conta" class="btn ghost">Meus pedidos</a>
        <button class="btn ghost" id="print">Imprimir comprovante</button>
        ${canCancel(order) && order.email === user.email ? `<button class="btn ghost danger" id="cancel">Cancelar pedido</button>` : ""}
      </div>
    </div>`;

  if ($("#qr") && window.QRCode) new QRCode($("#qr"), { text: pix, width: 200, height: 200, correctLevel: QRCode.CorrectLevel.M });
  $("#copy")?.addEventListener("click", () => {
    navigator.clipboard?.writeText($("#pay-code").textContent).then(() => toast("Copiado!"), () => toast("Não foi possível copiar."));
  });
  $("#simulate")?.addEventListener("click", () => {
    orders.setStatus(id, "Pago");
    toast("Pagamento confirmado!");
    pageOrder(id);
  });
  $("#print").addEventListener("click", () => window.print());
  $("#cancel")?.addEventListener("click", () => {
    if (!confirm("Tem certeza que deseja cancelar este pedido?")) return;
    orders.setStatus(id, "Cancelado");
    toast(order.status === "Pago" ? "Pedido cancelado. O estorno será feito em até 7 dias úteis." : "Pedido cancelado.");
    pageOrder(id);
  });
}

// ===== Painel administrativo =====
function pageAdmin(params) {
  if (!auth.isAdmin()) {
    app.innerHTML = `<div class="empty"><h2>Acesso restrito</h2><p>Entre com uma conta de administrador.</p><a href="#/conta?next=admin" class="btn">Entrar</a></div>`;
    return;
  }
  const tab = params.get("aba") || "pedidos";
  const all = orders.all().slice().reverse();
  const valid = all.filter((o) => !["Aguardando pagamento", "Cancelado"].includes(o.status));
  const revenue = valid.reduce((s, o) => s + o.total, 0);
  const outSkus = PRODUCTS.flatMap((p) => p.sizes.map((s) => stock.get(p.id, s))).filter((n) => n === 0).length;

  app.innerHTML = `
    <div class="account-head">
      <div><span class="eyebrow">Administração</span><h1 style="margin:4px 0 0">Painel da loja</h1></div>
      <a href="#/conta" class="btn ghost">Voltar à conta</a>
    </div>
    <div class="kpis">
      <div class="kpi"><span>Faturamento</span><strong>${brl(revenue)}</strong><small>${valid.length} pedido(s) pago(s)</small></div>
      <div class="kpi"><span>Ticket médio</span><strong>${brl(valid.length ? revenue / valid.length : 0)}</strong><small>por pedido pago</small></div>
      <div class="kpi"><span>Aguardando pagamento</span><strong>${all.filter((o) => o.status === "Aguardando pagamento").length}</strong><small>Pix e boleto</small></div>
      <div class="kpi"><span>Tamanhos esgotados</span><strong>${outSkus}</strong><small>de ${PRODUCTS.reduce((n, p) => n + p.sizes.length, 0)} no total</small></div>
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

function pageNotFound() {
  app.innerHTML = `<div class="empty"><div class="success-icon pending">?</div><h2>Página não encontrada</h2><a href="#/" class="btn">Voltar ao início</a></div>`;
}

// ===== Roteador =====
function router() {
  const [path, query] = location.hash.slice(1).split("?");
  const params = new URLSearchParams(query || "");
  const parts = (path || "/").split("/").filter(Boolean);
  window.scrollTo(0, 0);
  closeDrawer();
  closeModal();
  toggleSearch(false);
  $("#nav").classList.remove("open");
  $$("#nav [data-nav]").forEach((a) => a.classList.toggle("active", parts[0] === "catalogo" && a.dataset.nav === (params.get("cat") || "")));

  // A home ocupa a largura toda; as demais páginas ficam dentro do container
  if (parts[0]) {
    main.innerHTML = `<div class="container page"></div>`;
    app = main.firstElementChild;
  } else {
    app = main;
  }

  switch (parts[0]) {
    case undefined: return pageHome();
    case "catalogo": return pageCatalog(params);
    case "produto": return pageProduct(parts[1]);
    case "carrinho": return pageCart();
    case "favoritos": return pageFavorites();
    case "checkout": return pageCheckout();
    case "conta": return pageAccount(params);
    case "pedido": return pageOrder(parts[1]);
    case "admin": return pageAdmin(params);
    default: return pageNotFound();
  }
}

// ===== Eventos globais =====
document.addEventListener("click", (e) => {
  // Favoritar (coração nos cards e na página do produto)
  const fav = e.target.closest("[data-fav]");
  if (fav) {
    e.preventDefault();
    const added = favs.toggle(Number(fav.dataset.fav));
    $$(`[data-fav="${fav.dataset.fav}"]`).forEach((b) => b.classList.toggle("on", added));
    toast(added ? "Adicionado aos favoritos ♥" : "Removido dos favoritos");
    if (location.hash.startsWith("#/favoritos")) router();
    return;
  }
  // "Adicionar à sacola" direto do card (produtos de tamanho único)
  const quick = e.target.closest("[data-quick]");
  if (quick) {
    e.preventDefault();
    const p = findProduct(quick.dataset.quick);
    try { cart.add(p.id, p.sizes[0], 1); openDrawer(); } catch (err) { toast(err.message); }
  }
});

$("#drawer").addEventListener("click", (e) => {
  const b = e.target.closest("[data-act]");
  if (b) { cartAction(b.dataset.act, Number(b.dataset.i)); renderDrawer(); return; }
  if (e.target.closest("a")) closeDrawer();
});
$("#cart-btn").addEventListener("click", openDrawer);
$("#drawer-close").addEventListener("click", closeDrawer);
$("#overlay").addEventListener("click", closeDrawer);
$("#modal-close").addEventListener("click", closeModal);
$("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { closeDrawer(); closeModal(); toggleSearch(false); }
});

$("#search-btn").addEventListener("click", () => toggleSearch());
$("#search-input").addEventListener("input", debounce((e) => {
  const q = e.target.value.trim();
  const results = q ? searchProducts(q).slice(0, 6) : [];
  $("#suggestions").innerHTML = q
    ? results.length
      ? results.map((p) => `<a href="#/produto/${p.id}" class="suggestion">${thumb(p)}<span>${esc(p.name)}<br><small class="muted">${CATEGORIES[p.cat]}</small></span><strong>${brl(p.price)}</strong></a>`).join("") +
        `<a class="link" href="#/catalogo?q=${encodeURIComponent(q)}">Ver todos os resultados para "${esc(q)}"</a>`
      : `<p class="muted">Nenhum produto encontrado para "${esc(q)}".</p>`
    : "";
}, 150));
$("#search-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const q = $("#search-input").value.trim();
  if (q) location.hash = `#/catalogo?q=${encodeURIComponent(q)}`;
});

$("#menu-btn").addEventListener("click", () => $("#nav").classList.toggle("open"));
$("#newsletter").addEventListener("submit", (e) => {
  e.preventDefault();
  e.target.reset();
  toast("Inscrição confirmada! Fique de olho no seu e-mail.");
});

window.addEventListener("hashchange", router);
// Mantém várias abas sincronizadas
window.addEventListener("storage", () => { updateHeader(); });

auth.ensureAdmin();
updateHeader();
router();
