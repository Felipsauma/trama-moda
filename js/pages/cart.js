// ===== Página de Sacola (Carrinho) =====
function pageCart() {
  setTitle("Sacola");

  const render = () => {
    const items = cart.items();
    if (!items.length) {
      app.innerHTML = `
        <div class="empty">
          ${icon("sacola")}
          <h2>Sua sacola está vazia</h2>
          <p>Explore as novidades no catálogo e adicione suas peças favoritas.</p>
          <a href="#/catalogo" class="btn">Explorar catálogo</a>
        </div>
      `;
      return;
    }

    const giftData = gift.get();
    const count = cart.count();

    app.innerHTML = `
      <h1>Sacola <span class="muted" style="font-size: var(--t-20);">(${count} ${count === 1 ? "peça" : "peças"})</span></h1>

      <div class="cart-layout">
        <div>
          <!-- Lista de Peças -->
          <div class="cart-items-card" id="cart-items-list">
            ${items.map((i, idx) => {
              const p = findProduct(i.id);
              if (!p) return "";
              const left = stock.get(p.id, i.size);
              return `
                <div class="cart-row">
                  <a href="#/produto/${p.id}">${thumb(p)}</a>
                  <div class="cart-row-info">
                    <a href="#/produto/${p.id}" class="cart-row-name">${esc(p.name)}</a>
                    <div class="cart-row-meta">Tamanho: ${esc(i.size)} · ${brl(p.price)} cada</div>
                    ${left <= 2 ? `<div class="small" style="color: var(--acafrao); font-weight: 600;">Restam apenas ${left} em estoque!</div>` : ""}

                    <div class="cart-row-actions">
                      <div class="qty sm">
                        <button type="button" data-act="minus" data-i="${idx}" aria-label="Diminuir">${icon("menos")}</button>
                        <span>${i.qty}</span>
                        <button type="button" data-act="plus" data-i="${idx}" aria-label="Aumentar">${icon("mais")}</button>
                      </div>
                      <button type="button" class="link small" data-act="remove" data-i="${idx}">Remover</button>
                      <button type="button" class="link small" data-act="save" data-i="${idx}">Mover para favoritos</button>
                    </div>
                  </div>
                  <div class="cart-row-price nums">
                    ${brl(p.price * i.qty)}
                  </div>
                </div>
              `;
            }).join("")}
          </div>

          <!-- Embalagem para Presente -->
          <div class="gift-card">
            <label class="check">
              <input type="checkbox" id="gift-checkbox" ${giftData.on ? "checked" : ""}>
              <span class="gift-card-header">
                ${icon("presente")}
                Embalar para presente (+ ${brl(CONFIG.giftWrapPrice)})
              </span>
            </label>

            <div class="gift-message-box" id="gift-msg-container" ${giftData.on ? "" : "hidden"}>
              <label for="gift-message" class="label">Mensagem para o cartão (opcional)</label>
              <textarea id="gift-message" class="textarea" rows="2" maxlength="200" placeholder="Escreva aqui uma mensagem especial...">${esc(giftData.message)}</textarea>
              <div class="gift-char-counter" id="gift-char-count">${(giftData.message || "").length} / 200</div>
            </div>
          </div>
        </div>

        <!-- Coluna de Resumo -->
        <div class="cart-summary-sticky" id="cart-summary-box">
          ${summaryHTML({ button: true, calc: true })}
        </div>
      </div>
    `;

    // Interações na lista de itens
    $("#cart-items-list").addEventListener("click", (e) => {
      const b = e.target.closest("[data-act]");
      if (!b) return;
      const idx = Number(b.dataset.i);
      const act = b.dataset.act;

      if (act === "save") {
        const it = cart.items()[idx];
        if (it) {
          if (!favs.has(it.id)) favs.toggle(it.id);
          cart.remove(idx);
          toast("Movido para os favoritos.");
        }
      } else {
        cartAction(act, idx);
      }
    });

    // Embalagem para presente
    const giftCheckbox = $("#gift-checkbox");
    const giftMsgBox = $("#gift-msg-container");
    const giftMsg = $("#gift-message");
    const giftCounter = $("#gift-char-count");

    giftCheckbox.addEventListener("change", (e) => {
      const on = e.target.checked;
      giftMsgBox.hidden = !on;
      gift.set({ on, message: giftMsg.value });
    });

    giftMsg.addEventListener("input", debounce(() => {
      giftCounter.textContent = `${giftMsg.value.length} / 200`;
      gift.set({ on: giftCheckbox.checked, message: giftMsg.value });
    }, 200));

    // Liga formulários de cupom e CEP no resumo
    bindSummary($("#cart-summary-box"), render);
  };

  bus.on(render);
  render();
}
