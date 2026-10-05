const sortSizes = (list) => {
  const order = ["PP", "P", "M", "G", "GG"];
  return [...list].sort((a, b) => {
    const ia = order.indexOf(a), ib = order.indexOf(b);
    if (ia >= 0 || ib >= 0) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    return (Number(a) - Number(b)) || a.localeCompare(b);
  });
};

// ===== Ajustes de preço e visibilidade feitos pelo admin =====
// Guarda { [id]: { price?, oldPrice?, hidden? } } e reaplica sobre os valores originais de products.js.
const ORIGINAL_PRICES = {};

const catalog = {
  all: () => store.get(KEYS.catalog, {}),
  apply() {
    const adjust = this.all();
    PRODUCTS.forEach((p) => {
      ORIGINAL_PRICES[p.id] ||= { price: p.price, oldPrice: p.oldPrice ?? null };
      const base = ORIGINAL_PRICES[p.id], a = adjust[p.id] || {};
      p.price = a.price ?? base.price;
      p.oldPrice = "oldPrice" in a ? a.oldPrice : base.oldPrice;
      p.hidden = !!a.hidden;
    });
  },
  set(id, { price, oldPrice = null, hidden = false }) {
    price = Number(price);
    if (!Number.isFinite(price) || price <= 0) throw new Error("Informe um preço maior que zero.");
    if (oldPrice !== null && oldPrice !== undefined && oldPrice !== "") {
      oldPrice = Number(oldPrice);
      if (!(oldPrice > price)) throw new Error("O preço original precisa ser maior que o preço atual.");
    } else oldPrice = null;
    const all = this.all();
    all[id] = { price, oldPrice, hidden: !!hidden };
    store.set(KEYS.catalog, all);
    this.apply();
    bus.emit("catalog");
  },
  reset(id) {
    const all = this.all();
    delete all[id];
    store.set(KEYS.catalog, all);
    this.apply();
    bus.emit("catalog");
  },
};
catalog.apply();

const visibleProducts = () => PRODUCTS.filter((p) => !p.hidden);
const discountPct = (p) => (p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0);

// ===== Busca =====
function editDistance(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = row;
  }
  return prev[b.length];
}

// Pontuação de um termo: 3 nome, 2 categoria, 1 descrição, 0,5 só por aproximação; 0 = não bateu
function termScore(t, name, cat, desc) {
  if (name.includes(t)) return 3;
  if (cat.includes(t)) return 2;
  if (desc.includes(t)) return 1;
  const max = t.length >= 8 ? 2 : t.length >= 4 ? 1 : 0;
  if (!max) return 0;
  const words = `${name} ${cat} ${desc}`.split(/[^a-z0-9]+/).filter(Boolean);
  return words.some((w) => Math.abs(w.length - t.length) <= max && editDistance(t, w) <= max) ? 0.5 : 0;
}

function searchProducts(q) {
  const terms = norm(q).split(/\s+/).filter(Boolean);
  const list = visibleProducts();
  if (!terms.length) return list;
  return list
    .map((p, i) => {
      const name = norm(p.name), cat = norm(CATEGORIES[p.cat]), desc = norm(p.desc);
      const scores = terms.map((t) => termScore(t, name, cat, desc));
      return { p, i, score: scores.every(Boolean) ? scores.reduce((a, b) => a + b, 0) : 0 };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map((r) => r.p);
}

const searches = {
  list: () => store.get(KEYS.searches, []),
  add(q) {
    q = String(q).trim();
    if (q.length < 2) return;
    store.set(KEYS.searches, [q, ...this.list().filter((x) => norm(x) !== norm(q))].slice(0, 5));
  },
  clear() { store.set(KEYS.searches, []); },
};

// ===== Filtros e ordenação =====
const CATALOG_SORTS = ["relevancia", "menor", "maior", "desconto", "avaliacao", "novidades"];

function filterProducts(f = {}) {
  const sizes = f.sizes || [];
  const list = searchProducts(f.q || "").filter((p) =>
    (!f.cat || p.cat === f.cat) &&
    (f.min == null || p.price >= f.min) &&
    (f.max == null || p.price <= f.max) &&
    (!sizes.length || p.sizes.some((s) => sizes.includes(s) && stock.get(p.id, s) > 0)) &&
    (!f.avail || stock.total(p) > 0) &&
    (!f.promo || p.oldPrice));
  const by = {
    menor: (a, b) => a.price - b.price,
    maior: (a, b) => b.price - a.price,
    desconto: (a, b) => discountPct(b) - discountPct(a),
    avaliacao: (a, b) => reviews.avg(b.id) - reviews.avg(a.id),
    novidades: (a, b) => (b.tag === "Novo") - (a.tag === "Novo"),
  }[f.sort];
  return by ? list.sort(by) : list; // sort é estável: o empate mantém a ordem da busca
}

function parseCatalogParams(params) {
  const num = (k) => { const v = params.get(k); return v !== null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : null; };
  let sort = params.get("sort") || "relevancia";
  let promo = params.get("promo") === "1";
  if (sort === "promo") { promo = true; sort = "desconto"; } // endereço antigo
  return {
    cat: CATEGORIES[params.get("cat")] ? params.get("cat") : "",
    q: (params.get("q") || "").trim(),
    sizes: (params.get("tam") || "").split(",").filter(Boolean),
    min: num("min"),
    max: num("max"),
    avail: params.get("disp") === "1",
    promo,
    sort: CATALOG_SORTS.includes(sort) ? sort : "relevancia",
  };
}

function catalogQuery(f = {}) {
  const qs = new URLSearchParams();
  if (f.cat) qs.set("cat", f.cat);
  if (f.q) qs.set("q", f.q);
  if (f.sizes?.length) qs.set("tam", f.sizes.join(","));
  if (f.min != null) qs.set("min", f.min);
  if (f.max != null) qs.set("max", f.max);
  if (f.avail) qs.set("disp", "1");
  if (f.promo) qs.set("promo", "1");
  if (f.sort && f.sort !== "relevancia") qs.set("sort", f.sort);
  return qs.toString().replace(/%2C/g, ",");
}

// ===== Guia de medidas =====
const SIZE_TABLES = {
  roupas: [
    { size: "PP", bust: [80, 84], waist: [62, 66], hip: [86, 90] },
    { size: "P", bust: [85, 89], waist: [67, 71], hip: [91, 95] },
    { size: "M", bust: [90, 95], waist: [72, 77], hip: [96, 101] },
    { size: "G", bust: [96, 102], waist: [78, 84], hip: [102, 108] },
    { size: "GG", bust: [103, 110], waist: [85, 92], hip: [109, 116] },
  ],
  calcados: [
    { size: 34, foot: 22.5 }, { size: 35, foot: 23 }, { size: 36, foot: 23.5 }, { size: 37, foot: 24.5 }, { size: 38, foot: 25 },
    { size: 39, foot: 25.5 }, { size: 40, foot: 26.5 }, { size: 41, foot: 27 }, { size: 42, foot: 27.5 }, { size: 43, foot: 28.5 },
  ],
};

const measures = {
  get: () => store.get(KEYS.measures, null),
  set(m) { store.set(KEYS.measures, m); },
};

// Tamanho provável para as medidas m ({ bust, waist, hip } ou { foot }, em cm); null se não der para calcular
function recommendSize(p, m = {}) {
  const val = (k) => (m[k] === "" || m[k] == null ? NaN : Number(m[k]));
  let table, index;
  if (p.cat === "calcados") {
    const foot = val("foot");
    if (!(foot > 0)) return null;
    table = SIZE_TABLES.calcados;
    index = table.findIndex((r) => r.foot >= foot);
    if (index < 0) index = table.length - 1;
  } else if (p.cat === "acessorios") {
    return null;
  } else {
    table = SIZE_TABLES.roupas;
    const picks = ["bust", "waist", "hip"].filter((k) => val(k) > 0).map((k) => {
      const i = table.findIndex((r) => val(k) <= r[k][1]); // vão entre faixas cai no tamanho de cima
      return i < 0 ? table.length - 1 : i;
    });
    if (!picks.length) return null;
    index = Math.max(...picks);
  }
  // Tamanho que o produto não tem: o mais próximo, preferindo o maior no empate
  let best = null;
  p.sizes.forEach((s) => {
    const i = table.findIndex((r) => String(r.size) === s);
    if (i < 0) return;
    const d = Math.abs(i - index);
    if (!best || d < best.d || (d === best.d && i > best.i)) best = { s, i, d };
  });
  return best ? { size: best.s, inStock: stock.get(p.id, best.s) > 0 } : null;
}

// ===== Recomendações =====
const LOOK_CATS = {
  feminino: ["calcados", "acessorios"],
  masculino: ["calcados", "acessorios"],
  calcados: ["acessorios", "feminino", "masculino"],
  acessorios: ["feminino", "masculino", "calcados"],
};

function completeLook(p, n = 4) {
  const lists = (LOOK_CATS[p.cat] || []).map((cat) => {
    const l = visibleProducts().filter((x) => x.cat === cat && x.id !== p.id && stock.total(x) > 0);
    const shift = l.length ? p.id % l.length : 0;
    return [...l.slice(shift), ...l.slice(0, shift)];
  });
  const out = [];
  for (let i = 0; out.length < n && lists.some((l) => i < l.length); i++) {
    for (const l of lists) if (i < l.length && out.length < n) out.push(l[i]);
  }
  return out;
}
