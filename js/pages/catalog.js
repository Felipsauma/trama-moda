// ===== Página de Catálogo =====
function pageCatalog(params) {
  const parsed = parseCatalogParams(params);
  const state = {
    ...parsed,
    sizes: new Set(parsed.sizes),
  };

  let density = store.get(KEYS.view, "compacta");
  if (density !== "confortavel" && density !== "compacta") density = "compacta";

  const getFilters = () => ({
    ...state,
    sizes: [...state.sizes],
  });

  // Título e document.title
  const getTitle = () => {
    if (state.q) return `Resultados para "${esc(state.q)}"`;
    if (state.promo && !state.cat) return "Promoções";
    if (state.cat && CATEGORIES[state.cat]) return CATEGORIES[state.cat];
    return "Catálogo";
  };

  const getCleanTitle = () => {
    if (state.q) return `Resultados para "${state.q}"`;
    if (state.promo && !state.cat) return "Promoções";
    if (state.cat && CATEGORIES[state.cat]) return CATEGORIES[state.cat];
    return "Catálogo";
  };

  app.innerHTML = `
    <div class="catalog-head">
      <div class="catalog-head-left">
        <h1 id="cat-title">${getTitle()}</h1>
        <span class="catalog-count" id="result-count" aria-live="polite"></span>
      </div>
      <div class="density-toggle" role="group" aria-label="Densidade da grade">
        <button type="button" class="density-btn ${density === "compacta" ? "active" : ""}" id="dense-compact" aria-label="Visualização compacta" aria-pressed="${density === "compacta"}">
          ${icon("grade")}
        </button>
        <button type="button" class="density-btn ${density === "confortavel" ? "active" : ""}" id="dense-comfort" aria-label="Visualização confortável" aria-pressed="${density === "confortavel"}">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="7" height="16" rx="1.5"/><rect x="13" y="4" width="7" height="16" rx="1.5"/></svg>
        </button>
      </div>
    </div>

    <div class="catalog-bar">
      <!-- Categoria Chips -->
      <div class="chips" id="cat-chips">
        <button type="button" class="chip ${!state.cat ? "active" : ""}" data-cat="">Todos</button>
        ${Object.entries(CATEGORIES).map(([k, v]) => `
          <button type="button" class="chip ${state.cat === k ? "active" : ""}" data-cat="${k}">
            <span class="chip-dot" style="--fio: var(--fio-${k})"></span>${v}
          </button>
        `).join("")}
      </div>

      <!-- Barra de Filtros Horizontal -->
      <div class="filter-row">
        <!-- Desktop controls -->
        <div class="filter-controls desktop-filters">
          <!-- Popover Tamanho -->
          <div class="filter-popover-anchor" id="anchor-size">
            <button type="button" class="filter-btn" id="btn-size-popover" aria-expanded="false" aria-haspopup="true">
              <span id="label-size-btn">Tamanho</span>
              ${icon("chevron")}
            </button>
            <div class="filter-popover" id="popover-size" hidden>
              <div class="filter-popover-title">Selecione os tamanhos</div>
              <div class="sizes" id="size-options"></div>
            </div>
          </div>

          <!-- Popover Preço -->
          <div class="filter-popover-anchor" id="anchor-price">
            <button type="button" class="filter-btn" id="btn-price-popover" aria-expanded="false" aria-haspopup="true">
              <span id="label-price-btn">Preço</span>
              ${icon("chevron")}
            </button>
            <div class="filter-popover" id="popover-price" hidden>
              <div class="filter-popover-title">Faixa de preço</div>
              <div class="price-inputs">
                <div class="field">
                  <label for="price-min" class="label">Mínimo</label>
                  <input type="number" id="price-min" class="input" placeholder="R$ 0" min="0" step="10" value="${state.min != null ? state.min : ""}">
                </div>
                <div class="field">
                  <label for="price-max" class="label">Máximo</label>
                  <input type="number" id="price-max" class="input" placeholder="R$ 500" min="0" step="10" value="${state.max != null ? state.max : ""}">
                </div>
              </div>
              <div class="price-shortcuts">
                <button type="button" class="price-shortcut-btn" data-min="" data-max="150">Até R$ 150</button>
                <button type="button" class="price-shortcut-btn" data-min="150" data-max="300">R$ 150 a R$ 300</button>
                <button type="button" class="price-shortcut-btn" data-min="300" data-max="">Acima de R$ 300</button>
              </div>
            </div>
          </div>

          <!-- Alternadores -->
          <label class="toggle">
            <input type="checkbox" id="toggle-promo" ${state.promo ? "checked" : ""}>
            <span class="toggle-track"></span>
            Em promoção
          </label>

          <label class="toggle">
            <input type="checkbox" id="toggle-avail" ${state.avail ? "checked" : ""}>
            <span class="toggle-track"></span>
            Só disponíveis
          </label>
        </div>

        <!-- Mobile Filter Button -->
        <button type="button" class="btn secondary small btn-mobile-filters" id="btn-mobile-sheet">
          ${icon("filtro")}
          <span id="mobile-filter-count">Filtros</span>
        </button>

        <!-- Ordenação -->
        <div class="filter-actions">
          <select class="select sm" id="catalog-sort" aria-label="Ordenar produtos">
            <option value="relevancia" ${state.sort === "relevancia" ? "selected" : ""}>Relevância</option>
            <option value="menor" ${state.sort === "menor" ? "selected" : ""}>Menor preço</option>
            <option value="maior" ${state.sort === "maior" ? "selected" : ""}>Maior preço</option>
            <option value="desconto" ${state.sort === "desconto" ? "selected" : ""}>Maior desconto</option>
            <option value="avaliacao" ${state.sort === "avaliacao" ? "selected" : ""}>Mais bem avaliados</option>
            <option value="novidades" ${state.sort === "novidades" ? "selected" : ""}>Novidades</option>
          </select>
        </div>
      </div>

      <!-- Filtros Ativos -->
      <div class="active-filters" id="active-filters" hidden></div>
    </div>

    <!-- Grade de Produtos -->
    <div class="grid ${density === "confortavel" ? "comfortable" : ""}" id="catalog-grid"></div>
  `;

  // Referências
  const grid = $("#catalog-grid");
  const countEl = $("#result-count");
  const titleEl = $("#cat-title");
  const activeFiltersEl = $("#active-filters");
  const sizeOptionsEl = $("#size-options");
  const popoverSize = $("#popover-size");
  const popoverPrice = $("#popover-price");
  const btnSizePopover = $("#btn-size-popover");
  const btnPricePopover = $("#btn-price-popover");
  const labelSizeBtn = $("#label-size-btn");
  const labelPriceBtn = $("#label-price-btn");
  const mobileCountEl = $("#mobile-filter-count");

  // Fechar popovers
  const closePopovers = () => {
    if (popoverSize) popoverSize.hidden = true;
    if (popoverPrice) popoverPrice.hidden = true;
    if (btnSizePopover) btnSizePopover.setAttribute("aria-expanded", "false");
    if (btnPricePopover) btnPricePopover.setAttribute("aria-expanded", "false");
  };

  // Contagem de filtros ativos para o botão do celular
  const activeCount = () => {
    let c = 0;
    if (state.sizes.size > 0) c += state.sizes.size;
    if (state.min != null || state.max != null) c++;
    if (state.promo) c++;
    if (state.avail) c++;
    return c;
  };

  // Atualizar botões de popover e chips ativos
  const updateFilterControls = () => {
    // Label tamanho
    if (state.sizes.size > 0) {
      labelSizeBtn.textContent = `Tamanho: ${[...state.sizes].join(", ")}`;
      btnSizePopover.classList.add("active");
    } else {
      labelSizeBtn.textContent = "Tamanho";
      btnSizePopover.classList.remove("active");
    }

    // Label preço
    if (state.min != null && state.max != null) {
      labelPriceBtn.textContent = `Preço: ${brl(state.min)} - ${brl(state.max)}`;
      btnPricePopover.classList.add("active");
    } else if (state.min != null) {
      labelPriceBtn.textContent = `Preço: a partir de ${brl(state.min)}`;
      btnPricePopover.classList.add("active");
    } else if (state.max != null) {
      labelPriceBtn.textContent = `Preço: até ${brl(state.max)}`;
      btnPricePopover.classList.add("active");
    } else {
      labelPriceBtn.textContent = "Preço";
      btnPricePopover.classList.remove("active");
    }

    // Botão mobile
    const c = activeCount();
    if (mobileCountEl) {
      mobileCountEl.textContent = c > 0 ? `Filtros (${c})` : "Filtros";
    }

    // Tamanhos disponíveis para a categoria atual
    const inCat = visibleProducts().filter((p) => !state.cat || p.cat === state.cat);
    const availSizes = sortSizes(new Set(inCat.flatMap((p) => p.sizes)));
    sizeOptionsEl.innerHTML = availSizes.map((s) => `
      <button type="button" class="size sm ${state.sizes.has(s) ? "active" : ""}" data-size="${s}" aria-pressed="${state.sizes.has(s)}">
        ${s}
      </button>
    `).join("");

    // Chips de filtros ativos
    const chips = [];
    if (state.q) {
      chips.push(`<button type="button" class="chip removable" data-rm="q">Busca: "${esc(state.q)}" ${icon("fechar")}</button>`);
    }
    state.sizes.forEach((s) => {
      chips.push(`<button type="button" class="chip removable" data-rm="size" data-val="${s}">Tamanho ${s} ${icon("fechar")}</button>`);
    });
    if (state.min != null || state.max != null) {
      let lbl = "Preço";
      if (state.min != null && state.max != null) lbl = `${brl(state.min)} a ${brl(state.max)}`;
      else if (state.min != null) lbl = `A partir de ${brl(state.min)}`;
      else lbl = `Até ${brl(state.max)}`;
      chips.push(`<button type="button" class="chip removable" data-rm="price">${lbl} ${icon("fechar")}</button>`);
    }
    if (state.promo) {
      chips.push(`<button type="button" class="chip removable" data-rm="promo">Em promoção ${icon("fechar")}</button>`);
    }
    if (state.avail) {
      chips.push(`<button type="button" class="chip removable" data-rm="avail">Só disponíveis ${icon("fechar")}</button>`);
    }

    if (chips.length > 0) {
      chips.push(`<button type="button" class="btn tertiary small" id="btn-clear-all">Limpar tudo</button>`);
      activeFiltersEl.innerHTML = chips.join("");
      activeFiltersEl.hidden = false;
    } else {
      activeFiltersEl.innerHTML = "";
      activeFiltersEl.hidden = true;
    }

    // Categoria ativa
    $$("#cat-chips .chip").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.cat === state.cat);
    });
  };

  // Renderizar a lista de produtos sem perder foco nos campos
  const renderList = () => {
    const filters = getFilters();
    const list = filterProducts(filters);

    titleEl.innerHTML = getTitle();
    setTitle(getCleanTitle());

    countEl.textContent = `${list.length} ${list.length === 1 ? "peça" : "peças"}`;

    if (list.length > 0) {
      grid.innerHTML = list.map(productCard).join("");
    } else {
      let msgEmpty = `
        <div class="empty" style="grid-column: 1 / -1;">
          <h2>Nenhuma peça com esses filtros</h2>
          <p>Tente remover alguns filtros para ver outros modelos.</p>
          <button type="button" class="btn secondary" id="empty-clear">Limpar filtros</button>
        </div>
      `;
      if (state.q) {
        msgEmpty = `
          <div class="empty" style="grid-column: 1 / -1;">
            <h2>Nenhum resultado para "${esc(state.q)}"</h2>
            <p>Confira a ortografia ou explore nossas principais categorias:</p>
            <div class="chips" style="justify-content: center; margin-top: var(--e-3);">
              ${Object.entries(CATEGORIES).map(([k, v]) => `
                <a href="#/catalogo?cat=${k}" class="chip">
                  <span class="chip-dot" style="--fio: var(--fio-${k})"></span>${v}
                </a>
              `).join("")}
            </div>
            <button type="button" class="btn tertiary" id="empty-clear" style="margin-top: var(--e-4);">Limpar busca</button>
          </div>
        `;
      }
      grid.innerHTML = msgEmpty;
    }

    // Sincronizar URL com replaceState
    const qs = catalogQuery(filters);
    history.replaceState(null, "", "#/catalogo" + (qs ? "?" + qs : ""));
    $$("#nav [data-nav]").forEach((a) => {
      a.classList.toggle("active", a.dataset.nav === state.cat && !state.q);
    });

    updateFilterControls();
  };

  // Densidade
  const setDensity = (d) => {
    density = d;
    store.set(KEYS.view, d);
    grid.classList.toggle("comfortable", d === "confortavel");
    $("#dense-compact").classList.toggle("active", d === "compacta");
    $("#dense-compact").setAttribute("aria-pressed", d === "compacta");
    $("#dense-comfort").classList.toggle("active", d === "confortavel");
    $("#dense-comfort").setAttribute("aria-pressed", d === "confortavel");
  };

  $("#dense-compact").addEventListener("click", () => setDensity("compacta"));
  $("#dense-comfort").addEventListener("click", () => setDensity("confortavel"));

  // Popover Tamanho
  btnSizePopover.addEventListener("click", (e) => {
    e.stopPropagation();
    const isHidden = popoverSize.hidden;
    closePopovers();
    if (isHidden) {
      popoverSize.hidden = false;
      btnSizePopover.setAttribute("aria-expanded", "true");
    }
  });

  // Popover Preço
  btnPricePopover.addEventListener("click", (e) => {
    e.stopPropagation();
    const isHidden = popoverPrice.hidden;
    closePopovers();
    if (isHidden) {
      popoverPrice.hidden = false;
      btnPricePopover.setAttribute("aria-expanded", "true");
    }
  });

  // Fechar popover com clique fora
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".filter-popover-anchor")) {
      closePopovers();
    }
  });

  // Fechar popover com Esc
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePopovers();
  });

  // Seleção de tamanho no popover
  sizeOptionsEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".size");
    if (!btn) return;
    const s = btn.dataset.size;
    if (state.sizes.has(s)) state.sizes.delete(s);
    else state.sizes.add(s);
    renderList();
  });

  // Preço inputs
  const onPriceChange = () => {
    const minVal = $("#price-min").value.trim();
    const maxVal = $("#price-max").value.trim();
    state.min = minVal !== "" && Number.isFinite(Number(minVal)) ? Number(minVal) : null;
    state.max = maxVal !== "" && Number.isFinite(Number(maxVal)) ? Number(maxVal) : null;
    renderList();
  };

  $("#price-min").addEventListener("input", debounce(onPriceChange, 250));
  $("#price-max").addEventListener("input", debounce(onPriceChange, 250));

  // Atalhos de preço
  $$(".price-shortcut-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const min = btn.dataset.min ? Number(btn.dataset.min) : null;
      const max = btn.dataset.max ? Number(btn.dataset.max) : null;
      state.min = min;
      state.max = max;
      $("#price-min").value = min != null ? min : "";
      $("#price-max").value = max != null ? max : "";
      closePopovers();
      renderList();
    });
  });

  // Alternadores
  $("#toggle-promo").addEventListener("change", (e) => {
    state.promo = e.target.checked;
    renderList();
  });

  $("#toggle-avail").addEventListener("change", (e) => {
    state.avail = e.target.checked;
    renderList();
  });

  // Ordenação
  $("#catalog-sort").addEventListener("change", (e) => {
    state.sort = e.target.value;
    renderList();
  });

  // Categorias
  $("#cat-chips").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    const cat = chip.dataset.cat;
    if (state.cat !== cat) {
      state.cat = cat;
      state.sizes.clear(); // trocar de categoria limpa os tamanhos
      renderList();
    }
  });

  // Limpar chips ativos
  const clearFilters = () => {
    state.sizes.clear();
    state.min = null;
    state.max = null;
    state.promo = false;
    state.avail = false;
    state.q = "";
    $("#price-min").value = "";
    $("#price-max").value = "";
    $("#toggle-promo").checked = false;
    $("#toggle-avail").checked = false;
    renderList();
  };

  activeFiltersEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".chip.removable, #btn-clear-all");
    if (!btn) return;
    if (btn.id === "btn-clear-all") {
      clearFilters();
      return;
    }
    const rm = btn.dataset.rm;
    if (rm === "q") state.q = "";
    else if (rm === "size") state.sizes.delete(btn.dataset.val);
    else if (rm === "price") {
      state.min = null;
      state.max = null;
      $("#price-min").value = "";
      $("#price-max").value = "";
    } else if (rm === "promo") {
      state.promo = false;
      $("#toggle-promo").checked = false;
    } else if (rm === "avail") {
      state.avail = false;
      $("#toggle-avail").checked = false;
    }
    renderList();
  });

  // Botão limpar na tela vazia
  app.addEventListener("click", (e) => {
    if (e.target.closest("#empty-clear")) {
      clearFilters();
    }
  });

  // Folha de filtros no celular (openSheet)
  const openMobileFilterSheet = () => {
    const inCat = visibleProducts().filter((p) => !state.cat || p.cat === state.cat);
    const availSizes = sortSizes(new Set(inCat.flatMap((p) => p.sizes)));

    const sheetHtml = `
      <h2>Filtros</h2>
      <div class="sheet-filters">
        <!-- Tamanho -->
        <div class="sheet-filters-section">
          <h3>Tamanho</h3>
          <div class="sizes" id="sheet-sizes">
            ${availSizes.map((s) => `
              <button type="button" class="size sm ${state.sizes.has(s) ? "active" : ""}" data-size="${s}">
                ${s}
              </button>
            `).join("")}
          </div>
        </div>

        <!-- Preço -->
        <div class="sheet-filters-section">
          <h3>Preço</h3>
          <div class="price-inputs">
            <div class="field">
              <label for="sheet-price-min" class="label">Mínimo</label>
              <input type="number" id="sheet-price-min" class="input" placeholder="R$ 0" min="0" step="10" value="${state.min != null ? state.min : ""}">
            </div>
            <div class="field">
              <label for="sheet-price-max" class="label">Máximo</label>
              <input type="number" id="sheet-price-max" class="input" placeholder="R$ 500" min="0" step="10" value="${state.max != null ? state.max : ""}">
            </div>
          </div>
        </div>

        <!-- Alternadores -->
        <div class="sheet-filters-section">
          <label class="toggle" style="margin-bottom: var(--e-3);">
            <input type="checkbox" id="sheet-promo" ${state.promo ? "checked" : ""}>
            <span class="toggle-track"></span>
            Em promoção
          </label>
          <br>
          <label class="toggle">
            <input type="checkbox" id="sheet-avail" ${state.avail ? "checked" : ""}>
            <span class="toggle-track"></span>
            Só disponíveis
          </label>
        </div>

        <!-- Botão Ver Peças -->
        <div style="margin-top: var(--e-4);">
          <button type="button" class="btn block" id="sheet-apply-btn">
            Ver peças
          </button>
        </div>
      </div>
    `;

    openSheet(sheetHtml);

    const sheetSizes = $("#sheet-sizes");
    const sheetApply = $("#sheet-apply-btn");

    const updateSheetCount = () => {
      const list = filterProducts(getFilters());
      sheetApply.textContent = `Ver ${list.length} ${list.length === 1 ? "peça" : "peças"}`;
    };
    updateSheetCount();

    sheetSizes.addEventListener("click", (e) => {
      const btn = e.target.closest(".size");
      if (!btn) return;
      const s = btn.dataset.size;
      if (state.sizes.has(s)) state.sizes.delete(s);
      else state.sizes.add(s);
      btn.classList.toggle("active", state.sizes.has(s));
      updateSheetCount();
    });

    const onSheetPrice = () => {
      const minVal = $("#sheet-price-min").value.trim();
      const maxVal = $("#sheet-price-max").value.trim();
      state.min = minVal !== "" && Number.isFinite(Number(minVal)) ? Number(minVal) : null;
      state.max = maxVal !== "" && Number.isFinite(Number(maxVal)) ? Number(maxVal) : null;
      $("#price-min").value = state.min != null ? state.min : "";
      $("#price-max").value = state.max != null ? state.max : "";
      updateSheetCount();
    };

    $("#sheet-price-min").addEventListener("input", debounce(onSheetPrice, 200));
    $("#sheet-price-max").addEventListener("input", debounce(onSheetPrice, 200));

    $("#sheet-promo").addEventListener("change", (e) => {
      state.promo = e.target.checked;
      $("#toggle-promo").checked = state.promo;
      updateSheetCount();
    });

    $("#sheet-avail").addEventListener("change", (e) => {
      state.avail = e.target.checked;
      $("#toggle-avail").checked = state.avail;
      updateSheetCount();
    });

    sheetApply.addEventListener("click", () => {
      closeSheet();
      renderList();
    });
  };

  const btnMobileSheet = $("#btn-mobile-sheet");
  if (btnMobileSheet) {
    btnMobileSheet.addEventListener("click", openMobileFilterSheet);
  }

  // Render inicial
  renderList();
}
