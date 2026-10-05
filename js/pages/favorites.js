// ===== Página de Favoritos =====
function pageFavorites() {
  setTitle("Favoritos");

  let density = store.get(KEYS.view, "compacta");
  if (density !== "confortavel" && density !== "compacta") density = "compacta";

  const render = () => {
    const ids = favs.list();
    const list = ids.map(findProduct).filter(Boolean);

    app.innerHTML = `
      <div class="catalog-head">
        <div class="catalog-head-left">
          <h1>Favoritos</h1>
          <span class="catalog-count" id="fav-count-label" aria-live="polite">
            ${list.length} ${list.length === 1 ? "peça" : "peças"}
          </span>
        </div>
        ${list.length ? `
          <div class="density-toggle" role="group" aria-label="Densidade da grade">
            <button type="button" class="density-btn ${density === "compacta" ? "active" : ""}" id="dense-compact" aria-label="Visualização compacta" aria-pressed="${density === "compacta"}">
              ${icon("grade")}
            </button>
            <button type="button" class="density-btn ${density === "confortavel" ? "active" : ""}" id="dense-comfort" aria-label="Visualização confortável" aria-pressed="${density === "confortavel"}">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="7" height="16" rx="1.5"/><rect x="13" y="4" width="7" height="16" rx="1.5"/></svg>
            </button>
          </div>
        ` : ""}
      </div>

      ${list.length ? `
        <div class="grid ${density === "confortavel" ? "comfortable" : ""}" id="fav-grid">
          ${list.map(productCard).join("")}
        </div>
      ` : `
        <div class="empty">
          ${icon("coracao")}
          <h2>Sua lista de favoritos está vazia</h2>
          <p>Salve suas peças favoritas para acompanhar ou comprar mais tarde.</p>
          <a href="#/catalogo" class="btn">Explorar catálogo</a>
        </div>
      `}
    `;

    if (list.length) {
      const setDensity = (d) => {
        density = d;
        store.set(KEYS.view, d);
        const g = $("#fav-grid");
        if (g) g.classList.toggle("comfortable", d === "confortavel");
        $("#dense-compact")?.classList.toggle("active", d === "compacta");
        $("#dense-comfort")?.classList.toggle("active", d === "confortavel");
      };
      $("#dense-compact")?.addEventListener("click", () => setDensity("compacta"));
      $("#dense-comfort")?.addEventListener("click", () => setDensity("confortavel"));
    }
  };

  render();
}
