// ===== Páginas =====
const main = $("#app");
let app = main;

// Título padrão de cada rota (as páginas podem trocar com setTitle)
const ROUTE_TITLES = {
  inicio: "",
  catalogo: "Catálogo",
  produto: "Produto",
  carrinho: "Sacola",
  favoritos: "Favoritos",
  checkout: "Finalizar compra",
  conta: "Conta",
  pedido: "Pedido",
  admin: "Painel",
};

// ===== Roteador =====
let firstRender = true;

function render() {
  const [path, query] = location.hash.slice(1).split("?");
  const params = new URLSearchParams(query || "");
  const parts = (path || "/").split("/").filter(Boolean);
  const route = parts[0] || "inicio";

  // A rota fica no <body> para as folhas de estilo ajustarem a moldura
  document.body.dataset.route = route;
  setTitle(route in ROUTE_TITLES ? ROUTE_TITLES[route] : "Página não encontrada");
  markCurrent(route, params);

  // A página inicial ocupa a largura toda; as demais ficam dentro do contêiner
  if (parts[0]) {
    main.innerHTML = `<div class="container page"></div>`;
    app = main.firstElementChild;
  } else {
    app = main;
  }

  switch (parts[0]) {
    case undefined: pageHome(); break;
    case "catalogo": pageCatalog(params); break;
    case "produto": pageProduct(parts[1]); break;
    case "carrinho": pageCart(); break;
    case "favoritos": pageFavorites(); break;
    case "checkout": pageCheckout(); break;
    case "conta": pageAccount(params); break;
    case "pedido": pageOrder(parts[1]); break;
    case "admin": pageAdmin(params); break;
    default: pageNotFound();
  }
  syncRails(main);
}

// Troca de rota: fecha camadas, volta ao topo e leva o foco para o conteúdo
function router() {
  closeDrawer();
  closeModal();
  closeSheet();
  closeSearch({ clear: true });
  window.scrollTo(0, 0);
  render();
  if (!firstRender) main.focus({ preventScroll: true });
  firstRender = false;
}

// Marca o link do cabeçalho e a aba atuais com aria-current="page"
function markCurrent(route, params) {
  const nav = route !== "catalogo" ? null : params.get("promo") ? "promo" : params.get("cat");
  $$("#nav [data-nav]").forEach((a) => {
    if (a.dataset.nav === nav) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
  const tab = { inicio: "inicio", catalogo: "catalogo", produto: "catalogo", favoritos: "favoritos", conta: "conta", pedido: "conta", admin: "conta" }[route];
  $$("#tabbar [data-tab]").forEach((a) => {
    if (a.dataset.tab === tab) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
}

// ===== Eventos globais =====
function addToCart(id, size) {
  const p = findProduct(id);
  if (!p) return;
  try {
    cart.add(p.id, size, 1);
    toast("Adicionado à sacola", { action: "Ver sacola", onAction: openDrawer });
  } catch (err) { toast(err.message); }
}

document.addEventListener("click", (e) => {
  // Favoritar (coração nos cartões e na página do produto)
  const fav = e.target.closest("[data-fav]");
  if (fav) {
    e.preventDefault();
    const id = fav.dataset.fav;
    const added = favs.toggle(Number(id));
    $$(`[data-fav="${id}"]`).forEach((b) => { b.classList.toggle("on", added); b.setAttribute("aria-pressed", added); });
    toast(added ? "Adicionado aos favoritos" : "Removido dos favoritos");
    if (location.hash.startsWith("#/favoritos")) render();
    return;
  }
  // Compra rápida: tamanho escolhido no cartão ou na folha
  const add = e.target.closest("[data-add]");
  if (add) {
    e.preventDefault();
    const [id, ...size] = add.dataset.add.split(":");
    closeSheet();
    addToCart(id, size.join(":"));
    return;
  }
  // Compra rápida no toque: abre a folha de tamanhos
  const pick = e.target.closest("[data-pick]");
  if (pick) { e.preventDefault(); openSizeSheet(pick.dataset.pick); return; }
  // Trilho: anterior / próximo
  const step = e.target.closest("[data-rail]");
  if (step) {
    const track = $(".rail-track", step.closest(".rail"));
    track.scrollBy({ left: Number(step.dataset.rail) * track.clientWidth * 0.8, behavior: "smooth" });
    return;
  }
  // Pular para o conteúdo (sem mexer no hash, que é do roteador)
  if (e.target.closest("#skip")) { e.preventDefault(); main.focus(); main.scrollIntoView(); }
});

// A rolagem não borbulha: escuta na captura para atualizar os botões dos trilhos
document.addEventListener("scroll", (e) => {
  if (e.target.classList?.contains("rail-track")) syncRails(e.target);
}, true);
window.addEventListener("resize", debounce(() => syncRails(main), 150));

// Gaveta, modal e folha
$("#drawer").addEventListener("click", (e) => {
  const b = e.target.closest("[data-act]");
  if (b) { cartAction(b.dataset.act, Number(b.dataset.i)); return; }
  if (e.target.closest("a")) closeDrawer();
});
$("#cart-btn").addEventListener("click", openDrawer);
$("#drawer-close").addEventListener("click", closeDrawer);
$("#modal-close").addEventListener("click", closeModal);
$("#sheet-close").addEventListener("click", closeSheet);
// Clique no fundo fecha (só quando o clique começa e termina no véu)
[["#drawer-veil", closeDrawer], ["#modal", closeModal], ["#sheet-veil", closeSheet]].forEach(([sel, close]) => {
  const veil = $(sel);
  let down = null;
  veil.addEventListener("pointerdown", (e) => { down = e.target; });
  veil.addEventListener("click", (e) => { if (e.target === veil && down === veil) close(); });
});

$("#newsletter").addEventListener("submit", (e) => {
  e.preventDefault();
  e.target.reset();
  toast("Inscrição feita. As novidades chegam no seu e-mail.");
});

// ===== Inicialização =====
$$("[data-icon]").forEach((el) => { el.innerHTML = icon(el.dataset.icon); });
initSearch();

bus.on(updateHeader);
window.addEventListener("hashchange", router);
// Outra aba mudou os dados: atualiza o cabeçalho e redesenha a rota atual
window.addEventListener("storage", () => { updateHeader(); render(); });

auth.ensureAdmin();
updateHeader();
router();
