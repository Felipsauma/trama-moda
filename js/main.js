// ===== Páginas =====
const main = $("#app");
let app = main;

// ===== Roteador =====
function router() {
  const [path, query] = location.hash.slice(1).split("?");
  const params = new URLSearchParams(query || "");
  const parts = (path || "/").split("/").filter(Boolean);
  window.scrollTo(0, 0);
  closeDrawer();
  closeModal();
  toggleSearch(false);
  $("#nav").classList.remove("open");
  $$("#nav [data-nav]").forEach((a) => a.classList.toggle("active", parts[0] === "catalogo" && a.dataset.nav === (params.get("cat") || "")));

  // A home ocupa a largura toda; as demais páginas ficam dentro do container
  if (parts[0]) {
    main.innerHTML = `<div class="container page"></div>`;
    app = main.firstElementChild;
  } else {
    app = main;
  }

  switch (parts[0]) {
    case undefined: return pageHome();
    case "catalogo": return pageCatalog(params);
    case "produto": return pageProduct(parts[1]);
    case "carrinho": return pageCart();
    case "favoritos": return pageFavorites();
    case "checkout": return pageCheckout();
    case "conta": return pageAccount(params);
    case "pedido": return pageOrder(parts[1]);
    case "admin": return pageAdmin(params);
    default: return pageNotFound();
  }
}

// ===== Eventos globais =====
document.addEventListener("click", (e) => {
  // Favoritar (coração nos cards e na página do produto)
  const fav = e.target.closest("[data-fav]");
  if (fav) {
    e.preventDefault();
    const added = favs.toggle(Number(fav.dataset.fav));
    $$(`[data-fav="${fav.dataset.fav}"]`).forEach((b) => b.classList.toggle("on", added));
    toast(added ? "Adicionado aos favoritos ♥" : "Removido dos favoritos");
    if (location.hash.startsWith("#/favoritos")) router();
    return;
  }
  // "Adicionar à sacola" direto do card (produtos de tamanho único)
  const quick = e.target.closest("[data-quick]");
  if (quick) {
    e.preventDefault();
    const p = findProduct(quick.dataset.quick);
    try { cart.add(p.id, p.sizes[0], 1); openDrawer(); } catch (err) { toast(err.message); }
  }
});

$("#drawer").addEventListener("click", (e) => {
  const b = e.target.closest("[data-act]");
  if (b) { cartAction(b.dataset.act, Number(b.dataset.i)); renderDrawer(); return; }
  if (e.target.closest("a")) closeDrawer();
});
$("#cart-btn").addEventListener("click", openDrawer);
$("#drawer-close").addEventListener("click", closeDrawer);
$("#overlay").addEventListener("click", closeDrawer);
$("#modal-close").addEventListener("click", closeModal);
$("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { closeDrawer(); closeModal(); toggleSearch(false); }
});

$("#search-btn").addEventListener("click", () => toggleSearch());
$("#search-input").addEventListener("input", debounce((e) => {
  const q = e.target.value.trim();
  const results = q ? searchProducts(q).slice(0, 6) : [];
  $("#suggestions").innerHTML = q
    ? results.length
      ? results.map((p) => `<a href="#/produto/${p.id}" class="suggestion">${thumb(p)}<span>${esc(p.name)}<br><small class="muted">${CATEGORIES[p.cat]}</small></span><strong>${brl(p.price)}</strong></a>`).join("") +
        `<a class="link" href="#/catalogo?q=${encodeURIComponent(q)}">Ver todos os resultados para "${esc(q)}"</a>`
      : `<p class="muted">Nenhum produto encontrado para "${esc(q)}".</p>`
    : "";
}, 150));
$("#search-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const q = $("#search-input").value.trim();
  if (q) location.hash = `#/catalogo?q=${encodeURIComponent(q)}`;
});

$("#menu-btn").addEventListener("click", () => $("#nav").classList.toggle("open"));
$("#newsletter").addEventListener("submit", (e) => {
  e.preventDefault();
  e.target.reset();
  toast("Inscrição confirmada! Fique de olho no seu e-mail.");
});

bus.on(updateHeader);
window.addEventListener("hashchange", router);
// Mantém várias abas sincronizadas
window.addEventListener("storage", () => { updateHeader(); });

auth.ensureAdmin();
updateHeader();
router();
