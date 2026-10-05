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
            <button class="btn ghost fav-big ${favs.has(p.id) ? "on" : ""}" data-fav="${p.id}" aria-label="Favoritar">${icon("coracao")}</button>
          </div>` : `
          <div class="notice">Produto esgotado no momento.</div>
          <button class="btn ghost block fav-big ${favs.has(p.id) ? "on" : ""}" data-fav="${p.id}">${icon("coracao")} Salvar nos favoritos</button>`}
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
      <div class="grid">${visibleProducts().filter((x) => x.cat === p.cat && x.id !== p.id).slice(0, 4).map(productCard).join("")}</div>
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

