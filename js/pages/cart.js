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

