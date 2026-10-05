// ===== Interface compartilhada da Trama =====
// Referência rápida (tudo global; scripts clássicos). Estilos em css/components.css e css/shell.css.
//
// Ícones
//   icon(nome) → string SVG (currentColor, traço 1,75px, aria-hidden). Nomes:
//     buscar, coracao, conta, sacola, inicio, grade, fechar, mais, menos, seta-esquerda,
//     seta-direita, chevron, filtro, compartilhar, check, lixeira, presente, caminhao, regua
//
// Avisos e título
//   toast(msg, { action, onAction })  aviso; com ação fica 6s (ex.: "Ver sacola", "Desfazer"), sem ação 3s
//   setTitle(texto)                   título da aba: "texto — Trama" (sem texto: "Trama")
//   showErrors(form, erros)           preenche os .err de cada .field ({ nomeDoCampo: "mensagem" })
//
// Sobreposições (prendem o foco, fecham com Esc e no clique do fundo, devolvem o foco)
//   openModal(html, { wide })  closeModal()     conteúdo em #modal-content; use <h2> como título
//   openSheet(html)            closeSheet()     folha inferior; conteúdo em #sheet-content
//   openDrawer()               closeDrawer()    gaveta da sacola
//   openSizeSheet(id)                           folha com os tamanhos de um produto (botões data-add)
//   trapFocus(el, fechar) → soltar()            utilitário usado pelas três; serve para outras camadas
//
// Peças de produto
//   productCard(p)                  <article class="pcard"> com compra rápida
//   rail(titulo, produtos, { id })  trilho horizontal com botões anterior/próximo
//   syncRails(raiz)                 atualiza os botões dos trilhos (o roteador chama a cada rota)
//   thumb(p, classe)                retalho com a foto (classe: "", "sm" ou "lg")
//   stars(nota)                     estrelas de 0 a 5
//
// Sacola e resumo
//   renderDrawer()                          redesenha a gaveta
//   cartAction("plus"|"minus"|"remove", i)  altera o item i da sacola (remover oferece "Desfazer")
//   freeShipHTML(totais)                    frase + fio de progresso do frete grátis
//   shipOptionsHTML(cotacoes, selecionada)  rádios de entrega (name="ship-opt")
//   summaryHTML({ button, calc })           resumo do pedido (cupom, CEP, total)
//   bindSummary(el, aoMudar)                liga os formulários do resumo
//   sizeGuide(p)                            HTML da tabela de medidas (para openModal)
//
// Cabeçalho e busca
//   updateHeader()                contadores, nome da conta e gaveta aberta
//   openSearch()  closeSearch()   busca (popover no desktop, tela cheia no celular)
//   initSearch()                  liga os eventos da busca (main.js chama uma vez)
//
// Cliques delegados em main.js (basta pôr o atributo no HTML):
//   data-add="id:tamanho"  adiciona à sacola e mostra o aviso "Adicionado à sacola"
//   data-pick="id"         abre a folha de tamanhos
//   data-fav="id"          favorita/desfavorita (o botão ganha a classe "on" e aria-pressed)
//   data-rail="-1|1"       rola o trilho

// ===== Ícones =====
const ICONS = {
  buscar: `<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.3-4.3"/>`,
  coracao: `<path d="M12 20.2s-7.6-4.6-7.6-10.4a4.3 4.3 0 0 1 7.6-2.7 4.3 4.3 0 0 1 7.6 2.7c0 5.800-7.600 10.400-7.600 10.400Z"/>`,
  conta: `<circle cx="12" cy="8.200" r="3.800"/><path d="M4.500 20.500c.4-4 3.500-6 7.500-6s7.100 2 7.500 6"/>`,
  sacola: `<path d="M5.200 8.500h13.600l-1 12H6.200l-1-12Z"/><path d="M9 8.500V7a3 3 0 0 1 6 0v1.500"/>`,
  inicio: `<path d="m4 11 8-7 8 7"/><path d="M6 9.500V20h4.200v-5.500h3.600V20H18V9.500"/>`,
  grade: `<rect x="4" y="4" width="6.500" height="6.500" rx="1.200"/><rect x="13.500" y="4" width="6.500" height="6.500" rx="1.200"/><rect x="4" y="13.500" width="6.500" height="6.500" rx="1.200"/><rect x="13.500" y="13.500" width="6.500" height="6.500" rx="1.200"/>`,
  fechar: `<path d="m6 6 12 12M18 6 6 18"/>`,
  mais: `<path d="M12 5v14M5 12h14"/>`,
  menos: `<path d="M5 12h14"/>`,
  "seta-esquerda": `<path d="M19 12H5M11 6l-6 6 6 6"/>`,
  "seta-direita": `<path d="M5 12h14M13 6l6 6-6 6"/>`,
  chevron: `<path d="m6 9 6 6 6-6"/>`,
  filtro: `<path d="M4 7h16M7 12h10M10 17h4"/>`,
  compartilhar: `<path d="M12 15V4M8 8l4-4 4 4"/><path d="M5 12.500V20h14v-7.500"/>`,
  check: `<path d="m5 12.500 4.500 4.500L19 7.500"/>`,
  lixeira: `<path d="M4.500 7h15M10 7V4.500h4V7"/><path d="m6.500 7 1 13h9l1-13M10 11v5.500M14 11v5.500"/>`,
  presente: `<path d="M4 9h16v4H4zM5.500 13v7h13v-7M12 9v11"/><path d="M12 9c-2.500 0-4.500-.8-4.500-2.700 0-2.200 3.300-2.500 4.500 2.700 1.200-5.200 4.500-4.900 4.500-2.700C16.500 8.200 14.500 9 12 9Z"/>`,
  caminhao: `<path d="M2.500 6h11v10h-11zM13.500 10h4l3 3.200V16h-7"/><circle cx="7" cy="17.500" r="1.900"/><circle cx="17" cy="17.500" r="1.900"/>`,
  regua: `<path d="M3 16 16 3l5 5L8 21l-5-5Z"/><path d="m7 12 2 2M10 9l2 2M13 6l2 2"/>`,
};
const icon = (name) => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name] || ""}</svg>`;

// ===== Aviso (toast) e título =====
function toast(msg, { action, onAction } = {}) {
  const el = $("#toast");
  el.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button" class="toast-action">${esc(action)}</button>` : ""}`;
  el.classList.toggle("has-action", !!action);
  el.classList.add("show");
  const hide = () => el.classList.remove("show");
  if (action) $("button", el).addEventListener("click", () => { hide(); onAction?.(); });
  clearTimeout(toast.t);
  toast.t = setTimeout(hide, action ? 6000 : 3000);
}

function setTitle(text) {
  document.title = text ? `${text} — Trama` : "Trama";
}

function showErrors(form, errors) {
  $$(".field", form).forEach((field) => {
    const input = $("input, select, textarea", field);
    const err = $(".err", field);
    if (input && err) err.textContent = errors[input.name] || "";
    input?.classList.toggle("invalid", !!errors[input?.name]);
    if (input) input.setAttribute("aria-invalid", errors[input.name] ? "true" : "false");
  });
}

// ===== Foco preso =====
// Prende o foco em `el`, fecha com Esc (chama `close`), trava a rolagem do fundo.
// Devolve uma função que solta tudo e devolve o foco a quem abriu.
const focusTraps = [];
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function trapFocus(el, close) {
  const opener = document.activeElement;
  const list = () => $$(FOCUSABLE, el).filter((n) => n.offsetParent !== null || n === document.activeElement);
  const trap = { el };
  const onKey = (e) => {
    if (focusTraps[focusTraps.length - 1] !== trap) return;
    if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); close(); return; }
    if (e.key !== "Tab") return;
    const items = list();
    if (!items.length) { e.preventDefault(); el.focus(); return; }
    const first = items[0];
    const last = items[items.length - 1];
    const inside = el.contains(document.activeElement);
    if (e.shiftKey && (!inside || document.activeElement === first || document.activeElement === el)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (!inside || document.activeElement === last)) { e.preventDefault(); first.focus(); }
  };
  document.addEventListener("keydown", onKey, true);
  focusTraps.push(trap);
  document.body.classList.add("lock");
  ($("[data-autofocus]", el) || el).focus({ preventScroll: true });

  return function release({ restore = true } = {}) {
    document.removeEventListener("keydown", onKey, true);
    const i = focusTraps.indexOf(trap);
    if (i >= 0) focusTraps.splice(i, 1);
    if (!focusTraps.length) document.body.classList.remove("lock");
    if (restore && opener && document.contains(opener) && opener.focus) opener.focus({ preventScroll: true });
  };
}

// ===== Sobreposições: modal, folha inferior e gaveta =====
const layers = {};
function showLayer(key, veil, box, close) {
  if (!veil.hidden) return;
  veil.hidden = false;
  layers[key] = trapFocus(box, close);
}
function hideLayer(key, veil) {
  if (veil.hidden) return;
  veil.hidden = true;
  layers[key]?.();
  layers[key] = null;
}

function openModal(html, { wide = false } = {}) {
  $("#modal-content").innerHTML = html;
  const box = $("#modal-box");
  box.classList.toggle("wide", wide);
  const title = $("h2", box);
  if (title) { title.id = "modal-title"; box.setAttribute("aria-labelledby", "modal-title"); } else box.removeAttribute("aria-labelledby");
  showLayer("modal", $("#modal"), box, closeModal);
  box.scrollTop = 0;
}
function closeModal() { hideLayer("modal", $("#modal")); }

function openSheet(html) {
  $("#sheet-content").innerHTML = html;
  const box = $("#sheet");
  const title = $("h2", box);
  if (title) { title.id = "sheet-title"; box.setAttribute("aria-labelledby", "sheet-title"); } else box.removeAttribute("aria-labelledby");
  showLayer("sheet", $("#sheet-veil"), box, closeSheet);
  box.scrollTop = 0;
}
function closeSheet() { hideLayer("sheet", $("#sheet-veil")); }

function openDrawer() {
  renderDrawer();
  showLayer("drawer", $("#drawer-veil"), $("#drawer"), closeDrawer);
}
function closeDrawer() { hideLayer("drawer", $("#drawer-veil")); }

// ===== Componentes =====
const thumb = (p, cls = "") => `<div class="thumb ${cls}" data-cat="${p.cat}"><img src="${p.images[0]}" alt="${esc(p.name)}" loading="lazy" width="200" height="250"></div>`;

const stars = (r) => `<span class="stars" style="--r:${r.toFixed(2)}" role="img" aria-label="${r.toFixed(1).replace(".", ",")} de 5 estrelas"></span>`;

function sizeButtons(p, cls = "") {
  return p.sizes.map((s) => {
    const out = stock.get(p.id, s) <= 0;
    return `<button type="button" class="size ${cls}" data-add="${p.id}:${esc(s)}" ${out ? "disabled" : ""} aria-label="${out ? `Tamanho ${esc(s)} esgotado` : `Adicionar tamanho ${esc(s)} à sacola`}">${esc(s)}</button>`;
  }).join("");
}

function productCard(p) {
  const off = discountPct(p);
  const avail = stock.total(p) > 0;
  const single = p.sizes.length === 1;
  const n = reviews.of(p.id).length;
  const name = esc(p.name);
  const label = !avail ? "Esgotado" : p.tag || "";
  const fav = favs.has(p.id);
  const quick = !avail ? "" : single
    ? `<div class="pcard-quick"><button type="button" class="btn small" data-add="${p.id}:${esc(p.sizes[0])}" aria-label="Adicionar ${name} à sacola">Adicionar</button></div>
       <button type="button" class="pcard-plus" data-add="${p.id}:${esc(p.sizes[0])}" aria-label="Adicionar ${name} à sacola">${icon("mais")}</button>`
    : `<div class="pcard-quick" role="group" aria-label="Adicionar à sacola no tamanho">${sizeButtons(p)}</div>
       <button type="button" class="pcard-plus" data-pick="${p.id}" aria-haspopup="dialog" aria-label="Escolher tamanho de ${name}">${icon("mais")}</button>`;
  return `
    <article class="pcard${avail ? "" : " is-out"}" data-cat="${p.cat}">
      <div class="pcard-swatch">
        <a class="pcard-photos" href="#/produto/${p.id}" tabindex="-1" aria-hidden="true">
          <img class="main" src="${p.images[0]}" alt="" loading="lazy" width="400" height="500">
          <img class="alt" src="${p.images[1] || p.images[0]}" alt="" loading="lazy" width="400" height="500">
        </a>
        ${label ? `<span class="tag pcard-tag${avail ? "" : " out"}">${esc(label)}</span>` : ""}
        <button type="button" class="pcard-fav${fav ? " on" : ""}" data-fav="${p.id}" aria-pressed="${fav}" aria-label="Favoritar ${name}">${icon("coracao")}</button>
        ${quick}
      </div>
      <div class="pcard-body">
        <a class="pcard-name" href="#/produto/${p.id}">${name}</a>
        <div class="pcard-price">
          <span class="now">${brl(p.price)}</span>
          ${p.oldPrice ? `<span class="old"><span class="sr-only">de </span>${brl(p.oldPrice)}</span>` : ""}
          ${off ? `<span class="tag sale">-${off}%</span>` : ""}
        </div>
        ${n ? `<span class="rating">${stars(reviews.avg(p.id))}<span>${n} ${n === 1 ? "avaliação" : "avaliações"}</span></span>` : ""}
      </div>
    </article>`;
}

// Folha inferior com os tamanhos (compra rápida no toque)
function openSizeSheet(id) {
  const p = findProduct(id);
  if (!p) return;
  openSheet(`
    <h2>Escolha o tamanho</h2>
    <div class="sheet-product">
      ${thumb(p, "sm")}
      <div><div>${esc(p.name)}</div><strong class="nums">${brl(p.price)}</strong></div>
    </div>
    <div class="sizes">${sizeButtons(p)}</div>`);
}

function rail(title, products, { id = "" } = {}) {
  return `
    <section class="rail"${id ? ` id="${id}"` : ""} aria-label="${esc(title)}">
      <div class="rail-head">
        <h2>${esc(title)}</h2>
        <div class="rail-nav">
          <button type="button" class="rail-btn" data-rail="-1" aria-label="Anteriores" disabled>${icon("seta-esquerda")}</button>
          <button type="button" class="rail-btn" data-rail="1" aria-label="Próximos">${icon("seta-direita")}</button>
        </div>
      </div>
      <div class="rail-track">${products.map(productCard).join("")}</div>
    </section>`;
}

function syncRails(root = document) {
  const tracks = root.classList?.contains("rail-track") ? [root] : $$(".rail-track", root);
  tracks.forEach((track) => {
    const [prev, next] = $$("[data-rail]", track.closest(".rail"));
    if (!prev || !next) return;
    const max = track.scrollWidth - track.clientWidth;
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= max - 2;
  });
}

// ===== Resumo, frete e cupom =====
function freeShipHTML(t) {
  const base = t.subtotal - t.discount;
  const missing = CONFIG.freeShippingFrom - base;
  return `
    <p class="ship-goal${missing > 0 ? "" : " ok"}">${missing > 0
      ? `Faltam <strong>${brl(missing)}</strong> para o frete grátis no PAC`
      : `${icon("check")}<strong>Você ganhou frete grátis no PAC</strong>`}</p>
    <div class="progress"><div style="width:${Math.max(0, Math.min(100, (base / CONFIG.freeShippingFrom) * 100))}%"></div></div>`;
}

function shipOptionsHTML(quotes, selected) {
  return `<div class="ship-options">${quotes.map((q) => `
    <label class="ship-opt">
      <input type="radio" name="ship-opt" value="${q.id}" ${q.id === (selected || "pac") ? "checked" : ""}>
      <span class="ship-opt-text"><strong>${esc(q.name)}</strong><small class="muted">Chega até ${fmtDay(addBusinessDays(q.days))}</small></span>
      <strong class="nums">${q.price ? brl(q.price) : "Grátis"}</strong>
    </label>`).join("")}</div>`;
}

function summaryHTML({ button = false, calc = false } = {}) {
  const t = cart.totals();
  const ship = shipping.get();
  return `
    <h3>Resumo do pedido</h3>
    ${freeShipHTML(t)}
    <div class="summary-line"><span>Subtotal</span><span>${brl(t.subtotal)}</span></div>
    ${t.discount ? `<div class="summary-line ok"><span>Cupom ${esc(t.code)}</span><span>- ${brl(t.discount)}</span></div>` : ""}
    ${t.gift ? `<div class="summary-line"><span>Embalagem para presente</span><span>${brl(t.gift)}</span></div>` : ""}
    <div class="summary-line"><span>Frete${t.quote ? ` <small class="muted">(${esc(t.quote.name.split(" ")[0])})</small>` : ""}</span><span>${t.shipping === null ? "a calcular" : t.shipping === 0 ? "Grátis" : brl(t.shipping)}</span></div>
    ${calc ? `
      <form class="inline-form" id="ship-form">
        <input name="cep" inputmode="numeric" placeholder="Seu CEP" value="${esc(ship?.cep || "")}" aria-label="CEP para calcular o frete" autocomplete="postal-code">
        <button class="btn secondary small">Calcular</button>
      </form>
      ${ship?.cep ? `<p class="muted small">${ship.city ? `Entrega em ${esc(ship.city)} - ${esc(ship.uf)}` : "Estimativa pela região do CEP"}</p>
        ${shipOptionsHTML(shipping.quotes(ship, t.subtotal - t.discount), ship.option)}` : ""}` : ""}
    <form class="inline-form" id="coupon-form">
      <input name="code" placeholder="Cupom de desconto" value="${esc(t.code || "")}" aria-label="Cupom de desconto" autocapitalize="characters">
      <button class="btn secondary small">Aplicar</button>
    </form>
    <div class="summary-line total"><span>Total</span><span>${brl(t.total)}</span></div>
    ${t.shipping === null && t.subtotal ? `<p class="muted small">Mais o frete, calculado ${calc ? "pelo CEP acima" : "na finalização"}.</p>` : ""}
    ${button ? `<a href="#/checkout" class="btn block">Finalizar compra</a>` : ""}`;
}

function bindSummary(el, onChange) {
  $("#coupon-form", el)?.addEventListener("submit", (e) => {
    e.preventDefault();
    try {
      const c = coupon.apply(e.target.code.value);
      toast(c ? `Cupom ${c} aplicado` : "Cupom removido");
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

// ===== Gaveta da sacola =====
function renderDrawer() {
  const drawer = $("#drawer");
  const active = drawer.contains(document.activeElement) ? document.activeElement : null;
  const keep = active?.dataset.act ? `[data-act="${active.dataset.act}"][data-i="${active.dataset.i}"]` : null;
  const items = cart.items();
  const t = cart.totals();
  const n = cart.count();
  $("#drawer-title").textContent = n ? `Sua sacola (${n})` : "Sua sacola";
  $("#drawer-body").innerHTML = items.length
    ? items.map((i, idx) => {
      const p = findProduct(i.id);
      if (!p) return "";
      const name = esc(p.name);
      return `
        <div class="drawer-item">
          <a href="#/produto/${p.id}" tabindex="-1" aria-hidden="true">${thumb(p)}</a>
          <div>
            <div class="drawer-item-top">
              <a href="#/produto/${p.id}" class="drawer-item-name">${name}</a>
              <span class="drawer-item-price">${brl(p.price * i.qty)}</span>
            </div>
            <div class="muted small">Tamanho ${esc(i.size)}</div>
            <div class="drawer-row">
              <div class="qty sm">
                <button type="button" data-act="minus" data-i="${idx}" aria-label="Diminuir quantidade de ${name}">${icon("menos")}</button>
                <span aria-label="Quantidade">${i.qty}</span>
                <button type="button" data-act="plus" data-i="${idx}" aria-label="Aumentar quantidade de ${name}">${icon("mais")}</button>
              </div>
              <button type="button" class="link small" data-act="remove" data-i="${idx}" aria-label="Remover ${name}">Remover</button>
            </div>
          </div>
        </div>`;
    }).join("")
    : `<div class="empty">${icon("sacola")}<h3>Sua sacola está vazia</h3><p>Escolha uma peça e ela aparece aqui.</p><a href="#/catalogo" class="btn">Ver catálogo</a></div>`;
  $("#drawer-foot").innerHTML = items.length ? `
    ${freeShipHTML(t)}
    ${t.discount ? `<div class="summary-line ok"><span>Cupom ${esc(t.code)}</span><span>- ${brl(t.discount)}</span></div>` : ""}
    <div class="summary-line drawer-total"><span>Subtotal</span><span>${brl(t.subtotal - t.discount)}</span></div>
    <a href="#/checkout" class="btn block">Finalizar compra</a>
    <a href="#/carrinho" class="btn secondary block">Ver sacola</a>` : "";
  if (active && !drawer.contains(document.activeElement)) ((keep && $(keep, drawer)) || drawer).focus({ preventScroll: true });
}

function cartAction(act, idx) {
  const it = cart.items()[idx];
  if (!it) return;
  if (act === "remove") {
    const removed = cart.remove(idx);
    if (removed) toast("Removido da sacola", { action: "Desfazer", onAction: () => cart.restore(removed, idx) });
    return;
  }
  const res = cart.setQty(idx, it.qty + (act === "plus" ? 1 : -1));
  if (res?.capped != null) toast(`Só temos ${res.capped} ${res.capped === 1 ? "unidade" : "unidades"} deste tamanho.`);
}

function sizeGuide(p) {
  if (p.cat === "calcados") {
    return `<h2>Guia de medidas de calçados</h2><p class="muted">Meça o pé do calcanhar até a ponta do dedo maior.</p>
      <div class="table-wrap"><table class="table"><tr><th>Número</th><th>Comprimento do pé</th></tr>
      ${SIZE_TABLES.calcados.map((r) => `<tr><td>${r.size}</td><td>${r.foot} cm</td></tr>`).join("")}</table></div>`;
  }
  return `<h2>Guia de medidas de roupas</h2><p class="muted">Medidas do corpo, em centímetros.</p>
    <div class="table-wrap"><table class="table"><tr><th>Tamanho</th><th>Busto ou tórax</th><th>Cintura</th><th>Quadril</th></tr>
    ${SIZE_TABLES.roupas.map((r) => `<tr><td>${r.size}</td>${[r.bust, r.waist, r.hip].map((c) => `<td>${c[0]}–${c[1]}</td>`).join("")}</tr>`).join("")}</table></div>`;
}

// ===== Cabeçalho =====
function updateHeader() {
  const n = cart.count();
  $("#cart-count").textContent = n;
  $("#cart-count").hidden = !n;
  $("#cart-btn").setAttribute("aria-label", n ? `Abrir sacola, ${n} ${n === 1 ? "item" : "itens"}` : "Abrir sacola");
  const nFav = favs.list().length;
  ["#fav-count", "#tab-fav-count"].forEach((sel) => { $(sel).hidden = !nFav; $(sel).textContent = nFav; });
  $("#fav-link").setAttribute("aria-label", nFav ? `Favoritos, ${nFav}` : "Favoritos");
  const user = auth.current();
  $("#account-label").textContent = user ? user.name.split(" ")[0] : "Entrar";
  if (!$("#drawer-veil").hidden) renderDrawer();
}

// ===== Busca =====
// Um só campo: popover sob a pílula no desktop; tela cheia (com foco preso) no celular.
const searchUI = { open: false, release: null, active: -1 };
const isMobile = () => window.matchMedia("(max-width: 899px)").matches;

function searchPanelHTML(q) {
  if (!q) {
    const recents = searches.list();
    return `
      ${recents.length ? `
        <div class="search-group">
          <div class="search-group-head"><h3>Buscas recentes</h3><button type="button" class="link small" id="search-clear">Limpar</button></div>
          ${recents.map((r) => `<a class="search-option" data-opt href="#/catalogo?q=${encodeURIComponent(r)}">${icon("buscar")}<span class="search-option-name">${esc(r)}</span></a>`).join("")}
        </div>` : ""}
      <div class="search-group">
        <div class="search-group-head"><h3>Categorias</h3></div>
        ${Object.entries(CATEGORIES).map(([k, v]) => `<a class="search-option" data-opt data-cat="${k}" href="#/catalogo?cat=${k}"><span class="chip-dot"></span><span class="search-option-name">${esc(v)}</span></a>`).join("")}
      </div>`;
  }
  const all = searchProducts(q);
  if (!all.length) {
    return `<p class="search-none">Nenhuma peça para "${esc(q)}". Tente outra palavra ou veja uma categoria.</p>
      <div class="search-group">${Object.entries(CATEGORIES).map(([k, v]) => `<a class="search-option" data-opt data-cat="${k}" href="#/catalogo?cat=${k}"><span class="chip-dot"></span><span class="search-option-name">${esc(v)}</span></a>`).join("")}</div>`;
  }
  return `
    ${all.slice(0, 6).map((p) => `
      <a class="search-option" data-opt data-term href="#/produto/${p.id}">
        ${thumb(p)}
        <span class="search-option-name">${esc(p.name)}</span>
        <span class="search-option-price">${brl(p.price)}</span>
      </a>`).join("")}
    <a class="link search-all" data-opt data-term href="#/catalogo?q=${encodeURIComponent(q)}">Ver todos os resultados (${all.length})</a>`;
}

function renderSearch() {
  const input = $("#search-input");
  const panel = $("#search-panel");
  panel.innerHTML = searchPanelHTML(input.value.trim());
  $$("[data-opt]", panel).forEach((o, i) => { o.id = `search-opt-${i}`; o.setAttribute("role", "option"); });
  panel.setAttribute("role", "listbox");
  panel.setAttribute("aria-label", "Sugestões de busca");
  searchUI.active = -1;
  input.removeAttribute("aria-activedescendant");
}

function openSearch() {
  const input = $("#search-input");
  if (!searchUI.open) {
    searchUI.open = true;
    renderSearch();
    $("#search-panel").hidden = false;
    input.setAttribute("aria-expanded", "true");
    if (isMobile()) {
      document.body.classList.add("search-open");
      searchUI.release = trapFocus($("#search"), closeSearch);
    }
  }
  if (document.activeElement !== input) input.focus();
}

function closeSearch({ clear = false } = {}) {
  if (!searchUI.open) return;
  searchUI.open = false;
  const input = $("#search-input");
  $("#search-panel").hidden = true;
  input.setAttribute("aria-expanded", "false");
  input.removeAttribute("aria-activedescendant");
  if (clear) input.value = "";
  document.body.classList.remove("search-open");
  if (searchUI.release) { searchUI.release(); searchUI.release = null; }
  else if (document.activeElement === input) input.blur();
}

function moveSearch(step) {
  const opts = $$("#search-panel [data-opt]");
  if (!opts.length) return;
  opts[searchUI.active]?.classList.remove("is-active");
  searchUI.active = (searchUI.active + step + opts.length + (searchUI.active < 0 && step < 0 ? 1 : 0)) % opts.length;
  const cur = opts[searchUI.active];
  cur.classList.add("is-active");
  cur.scrollIntoView({ block: "nearest" });
  $("#search-input").setAttribute("aria-activedescendant", cur.id);
}

function initSearch() {
  const input = $("#search-input");
  const box = $("#search");
  input.addEventListener("focus", openSearch);
  input.addEventListener("click", openSearch);
  input.addEventListener("input", debounce(() => { if (searchUI.open) renderSearch(); else openSearch(); }, 120));
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!searchUI.open) openSearch(); else moveSearch(e.key === "ArrowDown" ? 1 : -1);
    } else if (e.key === "Escape" && searchUI.open && !searchUI.release) {
      e.preventDefault();
      closeSearch();
    }
  });
  $("#search-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = input.value.trim();
    const cur = $$("#search-panel [data-opt]")[searchUI.active];
    if (q) searches.add(q);
    if (cur) { location.hash = cur.getAttribute("href"); closeSearch({ clear: true }); return; }
    if (!q) return;
    const target = `#/catalogo?q=${encodeURIComponent(q)}`;
    closeSearch({ clear: true });
    if (location.hash === target) window.dispatchEvent(new HashChangeEvent("hashchange")); else location.hash = target;
  });
  $("#search-panel").addEventListener("click", (e) => {
    if (e.target.closest("#search-clear")) { searches.clear(); renderSearch(); input.focus(); return; }
    const opt = e.target.closest("[data-opt]");
    if (!opt) return;
    if (opt.hasAttribute("data-term")) searches.add(input.value);
    closeSearch({ clear: true });
  });
  // O popover não some enquanto o clique estiver dentro da busca
  document.addEventListener("pointerdown", (e) => {
    if (searchUI.open && !searchUI.release && !box.contains(e.target)) closeSearch();
  });
  box.addEventListener("focusout", (e) => {
    if (searchUI.open && !searchUI.release && e.relatedTarget && !box.contains(e.relatedTarget)) closeSearch();
  });
  $("#search-close").addEventListener("click", () => closeSearch({ clear: true }));
  $("#tab-search").addEventListener("click", openSearch);
  // "/" foca a busca de qualquer lugar, menos de dentro de um campo de texto
  document.addEventListener("keydown", (e) => {
    if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey || focusTraps.length) return;
    const t = e.target;
    if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    e.preventDefault();
    openSearch();
  });
}
