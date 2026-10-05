function pageCatalog(params) {
  const maxPrice = Math.ceil(Math.max(...visibleProducts().map((p) => p.price)) / 50) * 50;
  const parsed = parseCatalogParams(params);
  const state = { ...parsed, sizes: new Set(parsed.sizes), max: parsed.max ?? maxPrice };
  // Estado -> filtros (preço máximo no teto = sem filtro)
  const filters = () => ({ ...state, sizes: [...state.sizes], max: state.max < maxPrice ? state.max : null });

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
            <option value="desconto">Maior desconto</option>
            <option value="avaliacao">Mais bem avaliados</option>
            <option value="novidades">Novidades</option>
            <option value="promo">Promoções</option>
          </select>
        </div>
        <div class="grid grid-3" id="grid"></div>
      </div>
    </div>`;

  const sortValue = () => (state.promo && state.sort === "desconto" ? "promo" : state.sort);
  $("#sort").value = sortValue();
  if (window.innerWidth < 860) $("#filters").open = false;

  const render = () => {
    const inCat = visibleProducts().filter((p) => !state.cat || p.cat === state.cat);
    const allSizes = sortSizes(new Set(inCat.flatMap((p) => p.sizes)));
    $("#size-filter").innerHTML = allSizes.map((s) => `<button class="size sm ${state.sizes.has(s) ? "active" : ""}" data-size="${s}">${s}</button>`).join("");

    const list = filterProducts(filters());

    $$(".chip").forEach((c) => c.classList.toggle("active", c.dataset.cat === state.cat));
    $("#max-label").textContent = brl(state.max);
    $("#cat-title").textContent = state.q ? `Busca: "${state.q}"` : state.promo ? "Promoções" : CATEGORIES[state.cat] || "Catálogo";
    $("#result-count").textContent = `${list.length} produto${list.length === 1 ? "" : "s"}`;
    $("#grid").innerHTML = list.length ? list.map(productCard).join("") : `<div class="empty" style="grid-column:1/-1"><h2>Nada encontrado</h2><p>Tente remover alguns filtros.</p></div>`;

    const qs = catalogQuery(filters());
    history.replaceState(null, "", "#/catalogo" + (qs ? "?" + qs : ""));
    $$("#nav [data-nav]").forEach((a) => a.classList.toggle("active", a.dataset.nav === state.cat && !state.q));
  };

  $("#q").addEventListener("input", debounce((e) => { state.q = e.target.value.trim(); render(); }));
  $("#sort").addEventListener("change", (e) => {
    state.promo = e.target.value === "promo";
    state.sort = state.promo ? "desconto" : e.target.value;
    render();
  });
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
    Object.assign(state, { cat: "", q: "", sort: "relevancia", max: maxPrice, avail: false, promo: false });
    state.sizes.clear();
    $("#q").value = ""; $("#sort").value = "relevancia"; $("#max").value = maxPrice; $("#avail").checked = false;
    render();
  });
  render();
}

