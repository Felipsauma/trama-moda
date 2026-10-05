const test = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./helpers/load");

const names = (get, expr) => get(`${expr}.map((p) => p.name)`);

test("catalog.set grava o ajuste, aplica nos produtos e emite o aviso", () => {
  const { get, localStorage } = load();
  const orig = get("({ price: findProduct(2).price, oldPrice: findProduct(2).oldPrice })");
  get("var seen = []; bus.on((t) => seen.push(t));");
  get("catalog.set(2, { price: 100, oldPrice: 150 })");
  assert.equal(get("findProduct(2).price"), 100);
  assert.equal(get("findProduct(2).oldPrice"), 150);
  assert.deepEqual(JSON.parse(localStorage.getItem("trama_catalog")), { 2: { price: 100, oldPrice: 150, hidden: false } });
  assert.ok(get("seen").includes("catalog"));
  get("catalog.reset(2)");
  assert.equal(get("findProduct(2).price"), orig.price);
  assert.equal(get("findProduct(2).oldPrice"), orig.oldPrice);
  assert.equal(localStorage.getItem("trama_catalog"), "{}");
  assert.ok(get("seen.filter((t) => t === 'catalog').length") >= 2);
});

test("catalog.set valida preço e preço original", () => {
  const { get } = load();
  const err = (expr) => { try { get(expr); } catch (e) { return e.message; } return null; };
  assert.equal(err("catalog.set(1, { price: 0 })"), "Informe um preço maior que zero.");
  assert.equal(err("catalog.set(1, { price: -5 })"), "Informe um preço maior que zero.");
  assert.equal(err("catalog.set(1, { price: 'abc' })"), "Informe um preço maior que zero.");
  assert.equal(err("catalog.set(1, { price: 100, oldPrice: 100 })"), "O preço original precisa ser maior que o preço atual.");
  assert.equal(err("catalog.set(1, { price: 100, oldPrice: 90 })"), "O preço original precisa ser maior que o preço atual.");
  assert.equal(err("catalog.set(1, { price: 100, oldPrice: null })"), null);
  assert.equal(get("findProduct(1).oldPrice"), null);
});

test("catalog.apply restaura os valores originais e lê os ajustes salvos", () => {
  const { get } = load();
  get("catalog.set(1, { price: 50, oldPrice: 80 })");
  get("store.set(KEYS.catalog, { 3: { price: 10 } })");
  get("catalog.apply()");
  assert.equal(get("findProduct(1).price"), 169.9);
  assert.equal(get("findProduct(1).oldPrice"), 199.9);
  assert.equal(get("findProduct(3).price"), 10);
  assert.equal(get("findProduct(3).oldPrice"), null);
});

test("produto oculto sai das listagens e da busca, mas findProduct ainda o acha", () => {
  const { get } = load();
  const all = get("PRODUCTS.length");
  assert.equal(get("visibleProducts().length"), all);
  get("catalog.set(8, { price: 219.9, oldPrice: 259.9, hidden: true })");
  assert.equal(get("findProduct(8).hidden"), true);
  assert.equal(get("visibleProducts().length"), all - 1);
  assert.ok(!get("searchProducts('poa').map((p) => p.id)").includes(8));
  assert.ok(!get("searchProducts('').map((p) => p.id)").includes(8));
  assert.ok(!get("filterProducts({}).map((p) => p.id)").includes(8));
  assert.equal(get("findProduct(8).name"), "Vestido Poá Rodado");
  get("catalog.reset(8)");
  assert.equal(get("visibleProducts().length"), all);
});

test("discountPct devolve o percentual inteiro ou 0", () => {
  const { get } = load();
  assert.equal(get("discountPct({ price: 80, oldPrice: 100 })"), 20);
  assert.equal(get("discountPct({ price: 169.9, oldPrice: 199.9 })"), 15);
  assert.equal(get("discountPct({ price: 80, oldPrice: null })"), 0);
});

test("searchProducts tolera erro de digitação", () => {
  const { get } = load();
  const poa = get("searchProducts('vestdo').map((p) => p.cat === 'feminino' && /Vestido/.test(p.name))");
  assert.ok(poa.length >= 8 && poa.every(Boolean), "vestdo deve achar só vestidos");
  assert.ok(names(get, "searchProducts('tenis')").includes("Tênis Retrô Runner"));
  assert.deepEqual(get("searchProducts('xyzabc')"), []);
  // termo curto não ganha tolerância
  assert.deepEqual(get("searchProducts('vez')"), []);
  // termos longos aceitam distância 2
  assert.ok(names(get, "searchProducts('scarpinn douradoo')").some((n) => n.includes("Dourado")));
});

test("searchProducts ordena por pontuação (nome, categoria, descrição) e mantém a ordem do catálogo no empate", () => {
  const { get } = load();
  // "preto" aparece no nome de uns e só na descrição de outros: nome vem primeiro
  const ids = get("searchProducts('preto').map((p) => p.id)");
  const inName = get("PRODUCTS.filter((p) => norm(p.name).includes('preto')).map((p) => p.id)");
  assert.deepEqual(ids.slice(0, inName.length), inName);
  // empate: ordem original
  const eq = get("searchProducts('camisa').map((p) => p.id)");
  assert.deepEqual(eq, [...eq].sort((a, b) => a - b));
  // busca vazia devolve todos os visíveis na ordem do catálogo
  assert.deepEqual(get("searchProducts('  ').map((p) => p.id)"), get("visibleProducts().map((p) => p.id)"));
});

test("searches guarda até 5 buscas, sem duplicata e sem textos curtos", () => {
  const { get } = load();
  get("searches.add('a')");
  assert.deepEqual(get("searches.list()"), []);
  get("['vestido', 'tênis', 'bolsa']").forEach((q) => get(`searches.add(${JSON.stringify("  " + q + " ")})`));
  assert.deepEqual(get("searches.list()"), ["bolsa", "tênis", "vestido"]);
  get("searches.add('TENIS')");
  assert.deepEqual(get("searches.list()"), ["TENIS", "bolsa", "vestido"]);
  ["a1", "b2", "c3", "d4"].forEach((q) => get(`searches.add('${q}')`));
  assert.equal(get("searches.list().length"), 5);
  assert.equal(get("searches.list()[0]"), "d4");
  get("searches.clear()");
  assert.deepEqual(get("searches.list()"), []);
});

test("filterProducts: categoria, preço, tamanho em estoque, disponibilidade e promoção", () => {
  const { get } = load();
  assert.ok(get("filterProducts({ cat: 'calcados' }).every((p) => p.cat === 'calcados')"));
  assert.equal(get("filterProducts({ cat: 'calcados' }).length"), 6);
  const mid = get("filterProducts({ min: 200, max: 300 }).map((p) => p.price)");
  assert.ok(mid.length > 0 && mid.every((v) => v >= 200 && v <= 300));
  assert.equal(get("filterProducts({ max: 129.9 }).some((p) => p.price === 129.9)"), true);
  assert.equal(get("filterProducts({ min: 699.9 }).some((p) => p.price === 699.9)"), true);
  assert.ok(get("filterProducts({ promo: true }).every((p) => p.oldPrice)"));
  // tamanho: só conta se tiver estoque
  const p = get("PRODUCTS.find((x) => x.cat === 'feminino' && x.sizes.includes('PP'))");
  get(`PRODUCTS.forEach((x) => x.sizes.forEach((s) => stock.set(x.id, s, 0)))`);
  assert.deepEqual(get("filterProducts({ sizes: ['PP'] })"), []);
  assert.deepEqual(get("filterProducts({ avail: true })"), []);
  get(`stock.set(${p.id}, 'PP', 2)`);
  assert.deepEqual(get("filterProducts({ sizes: ['PP'] }).map((x) => x.id)"), [p.id]);
  assert.deepEqual(get("filterProducts({ sizes: ['GG', 'PP'] }).map((x) => x.id)"), [p.id]);
  assert.deepEqual(get("filterProducts({ avail: true }).map((x) => x.id)"), [p.id]);
});

test("filterProducts: ordenações e que PRODUCTS não é alterado", () => {
  const { get } = load();
  const before = get("PRODUCTS.map((p) => p.id)");
  const menor = get("filterProducts({ sort: 'menor' }).map((p) => p.price)");
  assert.deepEqual(menor, [...menor].sort((a, b) => a - b));
  const maior = get("filterProducts({ sort: 'maior' }).map((p) => p.price)");
  assert.deepEqual(maior, [...maior].sort((a, b) => b - a));
  const desc = get("filterProducts({ sort: 'desconto' }).map((p) => discountPct(p))");
  assert.deepEqual(desc, [...desc].sort((a, b) => b - a));
  assert.ok(desc[0] > 0);
  const novos = get("filterProducts({ sort: 'novidades' }).map((p) => p.tag === 'Novo')");
  assert.deepEqual(novos, [...novos].sort((a, b) => b - a));
  assert.ok(novos[0]);
  get("reviews.add(3, { rating: 5, text: 'otimo produto mesmo', date: 1 })");
  assert.equal(get("filterProducts({ sort: 'avaliacao' })[0].id"), 3);
  assert.deepEqual(get("filterProducts({ sort: 'relevancia' }).map((p) => p.id)"), before);
  assert.deepEqual(get("PRODUCTS.map((p) => p.id)"), before);
  // a busca define a ordem de relevância
  assert.deepEqual(get("filterProducts({ q: 'bolsa' }).map((p) => p.id)"), get("searchProducts('bolsa').map((p) => p.id)"));
});

test("parseCatalogParams e catalogQuery", () => {
  const { get } = load();
  const defaults = { cat: "", q: "", sizes: [], min: null, max: null, avail: false, promo: false, sort: "relevancia" };
  assert.deepEqual(get("parseCatalogParams(new URLSearchParams(''))"), defaults);
  assert.equal(get("catalogQuery(parseCatalogParams(new URLSearchParams('')))"), "");
  const f = get("parseCatalogParams(new URLSearchParams('cat=feminino&q=vestido+azul&tam=P,M&min=100&max=250&disp=1&promo=1&sort=menor'))");
  assert.deepEqual(f, { cat: "feminino", q: "vestido azul", sizes: ["P", "M"], min: 100, max: 250, avail: true, promo: true, sort: "menor" });
  // ida e volta
  const qs = get("catalogQuery(" + JSON.stringify(f) + ")");
  assert.equal(qs, "cat=feminino&q=vestido+azul&tam=P,M&min=100&max=250&disp=1&promo=1&sort=menor");
  assert.deepEqual(get(`parseCatalogParams(new URLSearchParams(${JSON.stringify(qs)}))`), f);
  // acentos e símbolos sobrevivem
  const g = { ...defaults, q: "calçado & cia" };
  assert.deepEqual(get(`parseCatalogParams(new URLSearchParams(catalogQuery(${JSON.stringify(g)})))`), g);
  // valores padrão são omitidos
  assert.equal(get("catalogQuery({ sort: 'relevancia', cat: '', sizes: [] })"), "");
});

test("sort=promo legado vira promo + desconto", () => {
  const { get } = load();
  const f = get("parseCatalogParams(new URLSearchParams('sort=promo'))");
  assert.equal(f.promo, true);
  assert.equal(f.sort, "desconto");
  assert.equal(get("catalogQuery(parseCatalogParams(new URLSearchParams('sort=promo')))"), "promo=1&sort=desconto");
  // ordenação inválida cai no padrão
  assert.equal(get("parseCatalogParams(new URLSearchParams('sort=xyz')).sort"), "relevancia");
});

test("SIZE_TABLES guarda as tabelas do guia", () => {
  const { get } = load();
  assert.deepEqual(get("SIZE_TABLES.roupas.map((r) => r.size)"), ["PP", "P", "M", "G", "GG"]);
  assert.deepEqual(get("SIZE_TABLES.roupas[0]"), { size: "PP", bust: [80, 84], waist: [62, 66], hip: [86, 90] });
  assert.equal(get("SIZE_TABLES.calcados.length"), 10);
  assert.deepEqual(get("SIZE_TABLES.calcados[0]"), { size: 34, foot: 22.5 });
});

test("recommendSize: limites das faixas de roupas", () => {
  const { get } = load();
  const rec = (m) => get(`recommendSize(findProduct(8), ${JSON.stringify(m)})`);
  assert.equal(rec({ bust: 84 }).size, "PP");
  assert.equal(rec({ bust: 84.5 }).size, "P");
  assert.equal(rec({ bust: 85 }).size, "P");
  assert.equal(rec({ bust: 60 }).size, "PP");
  assert.equal(get("recommendSize(findProduct(2), { bust: 200 })").size, "GG");
  // o maior entre as medidas manda
  assert.equal(rec({ bust: 82, waist: 75, hip: 90 }).size, "M");
  assert.equal(rec({ bust: 82, waist: 0 }).size, "PP");
  assert.deepEqual(rec({ bust: 90 }), { size: "M", inStock: get("stock.get(8, 'M') > 0") });
});

test("recommendSize: tamanho que o produto não tem usa o mais próximo, preferindo o maior", () => {
  const { get } = load();
  // produto 4 tem P, M, G
  assert.equal(get("recommendSize(findProduct(4), { bust: 81 })").size, "P"); // PP -> P
  assert.equal(get("recommendSize(findProduct(4), { bust: 120 })").size, "G"); // GG -> G
  // produto com só PP e M: P fica entre os dois, empata e prefere o maior
  get("PRODUCTS.push({ id: 900, name: 'T', cat: 'feminino', price: 10, oldPrice: null, sizes: ['PP', 'M'], desc: '', images: [] })");
  assert.equal(get("recommendSize(findProduct(900), { bust: 87 })").size, "M");
});

test("recommendSize: calçados, acessórios e sem medidas", () => {
  const { get } = load();
  const rec = (id, m) => get(`recommendSize(findProduct(${id}), ${JSON.stringify(m)})`);
  assert.equal(rec(18, { foot: 24.5 }).size, "37"); // 34..39
  assert.equal(rec(18, { foot: 24.6 }).size, "38");
  assert.equal(rec(18, { foot: 30 }).size, "39"); // acima de todos: o maior que o produto tem
  assert.equal(rec(18, { foot: 20 }).size, "34");
  assert.equal(rec(15, { foot: 22.5 }).size, "37"); // 34 não existe: mais próximo
  assert.equal(rec(21, { bust: 90 }), null);
  assert.equal(rec(8, {}), null);
  assert.equal(rec(8, { bust: "" }), null);
  assert.equal(rec(18, { bust: 90 }), null);
});

test("measures guarda as medidas", () => {
  const { get } = load();
  assert.equal(get("measures.get()"), null);
  get("measures.set({ bust: 90, waist: 70, hip: 95 })");
  assert.deepEqual(get("measures.get()"), { bust: 90, waist: 70, hip: 95 });
});

test("completeLook mistura categorias complementares, só com estoque, sem repetir a categoria", () => {
  const { get } = load();
  const look = get("completeLook(findProduct(8))");
  assert.equal(look.length, 4);
  assert.ok(look.every((p) => p.cat !== "feminino"));
  assert.ok(look.every((p) => get(`stock.total(findProduct(${p.id}))`) > 0));
  assert.deepEqual(new Set(look.map((p) => p.cat)), new Set(["calcados", "acessorios"]));
  assert.equal(look[0].cat !== look[1].cat, true); // alterna
  // determinístico
  assert.deepEqual(get("completeLook(findProduct(8)).map((p) => p.id)"), look.map((p) => p.id));
  // muda conforme o id
  assert.notDeepEqual(get("completeLook(findProduct(9)).map((p) => p.id)"), look.map((p) => p.id));
  // calçados: acessórios, feminino, masculino
  const cats = get("completeLook(findProduct(15), 6).map((p) => p.cat)");
  assert.deepEqual(cats.slice(0, 3), ["acessorios", "feminino", "masculino"]);
  assert.equal(get("completeLook(findProduct(8), 2).length"), 2);
  // oculto e esgotado ficam de fora
  get("PRODUCTS.forEach((x) => x.cat === 'calcados' && x.sizes.forEach((s) => stock.set(x.id, s, 0)))");
  get("catalog.set(21, { price: 229.9, hidden: true })");
  assert.ok(get("completeLook(findProduct(8), 10)").every((p) => p.cat === "acessorios" ? p.id !== 21 : true));
  assert.ok(!get("completeLook(findProduct(8), 10).map((p) => p.cat)").includes("calcados"));
});
