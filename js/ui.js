const HEART = `<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>`;

function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove("show"), 2800);
}

function showErrors(form, errors) {
  $$(".field", form).forEach((field) => {
    const input = $("input, select, textarea", field);
    const err = $(".err", field);
    if (input && err) err.textContent = errors[input.name] || "";
    input?.classList.toggle("invalid", !!errors[input?.name]);
  });
}

// ===== Componentes =====
const thumb = (p) => `<div class="thumb"><img class="main" src="${p.images[0]}" alt="${esc(p.name)}" loading="lazy"></div>`;
const stars = (r) => `<span class="stars" style="--r:${r.toFixed(2)}" aria-label="${r.toFixed(1)} de 5 estrelas">★★★★★</span>`;

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
  let res;
  if (act === "plus") res = cart.setQty(idx, it.qty + 1);
  if (act === "minus") res = cart.setQty(idx, it.qty - 1);
  if (act === "remove") res = cart.setQty(idx, 0);
  if (res?.capped != null) toast(`Só temos ${res.capped} unidade(s) deste tamanho.`);
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
      ${SIZE_TABLES.calcados.map((r) => `<tr><td>${r.size}</td><td>${r.foot} cm</td></tr>`).join("")}</table>`;
  }
  return `<h2>Guia de medidas · Roupas</h2><p class="muted">Medidas do corpo, em centímetros.</p>
    <table class="table"><tr><th>Tamanho</th><th>Busto/Tórax</th><th>Cintura</th><th>Quadril</th></tr>
    ${SIZE_TABLES.roupas.map((r) => `<tr><td>${r.size}</td>${[r.bust, r.waist, r.hip].map((c) => `<td>${c[0]}–${c[1]}</td>`).join("")}</tr>`).join("")}</table>`;
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


function toggleSearch(force) {
  const panel = $("#search-panel");
  panel.hidden = force === undefined ? !panel.hidden : !force;
  if (!panel.hidden) { $("#search-input").value = ""; $("#suggestions").innerHTML = ""; $("#search-input").focus(); }
}
