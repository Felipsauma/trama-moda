// Página inicial: hero em tecido plano, novidades, cupom, mais vendidos, vistos e fatos da loja.

// Retalhos do hero (categoria, peça da foto) e as cores dos três fios que os atravessam
const HERO_PATCHES = [["feminino", 8], ["masculino", 1], ["calcados", 15], ["acessorios", 22]];
const HERO_THREADS = ["feminino", "masculino", "acessorios"];
const HOME_COUPON = "TRAMA20";

function heroWeave(list) {
  const count = (cat) => list.filter((p) => p.cat === cat).length;
  const patch = ([cat, id], i) => {
    const p = findProduct(id);
    const n = count(cat);
    // Ligamento tela: o fio passa por cima quando (retalho + fio) é par, por baixo quando é ímpar
    const over = HERO_THREADS.map((t, j) => ((i + j) % 2 === 0 ? `<span class="thread thread-over t${j}" data-cat="${t}"></span>` : "")).join("");
    return `
      <a class="patch" data-cat="${cat}" href="#/catalogo?cat=${cat}">
        <span class="patch-swatch"><img src="${p.images[0]}" alt="" width="500" height="625">${over}</span>
        <span class="patch-caption">
          <span class="patch-name">${esc(CATEGORIES[cat])}</span>
          <span class="patch-count">${n} ${n === 1 ? "peça" : "peças"}</span>
        </span>
      </a>`;
  };
  const threads = HERO_THREADS.map((t, j) => `<span class="thread t${j}" data-cat="${t}"></span>`).join("");
  // Duas fileiras de dois retalhos: lado a lado no desktop (uma faixa só), empilhadas no celular (2×2)
  return `
    <div class="weave" id="weave">
      ${[0, 2].map((start) => `
        <div class="weave-row">
          <span class="weave-threads" aria-hidden="true">${threads}</span>
          ${HERO_PATCHES.slice(start, start + 2).map((h, k) => patch(h, start + k)).join("")}
        </div>`).join("")}
    </div>`;
}

// Sequência de entrada: cada fio se desenha da esquerda para a direita (0,8s), um após o outro (0,2s).
// Cada trecho recebe o instante e a duração proporcionais à sua posição no percurso do fio.
function timeWeave(weave) {
  const rows = $$(".weave-row", weave);
  const box = weave.getBoundingClientRect();
  const stacked = rows[1].offsetTop > rows[0].offsetTop;
  const passes = stacked ? 2 : 1;
  $$(".thread", weave).forEach((el) => {
    const r = el.getBoundingClientRect();
    const j = Number(el.className.match(/\bt(\d)\b/)[1]);
    const row = stacked ? rows.indexOf(el.closest(".weave-row")) : 0;
    const start = (row + (r.left - box.left) / box.width) / passes;
    el.style.setProperty("--t0", `${(j * 0.2 + start * 0.8).toFixed(3)}s`);
    el.style.setProperty("--dur", `${Math.max(0.01, (r.width / box.width / passes) * 0.8).toFixed(3)}s`);
  });
}

function couponBandHTML() {
  const applied = coupon.active() === HOME_COUPON;
  return `
    <section class="coupon-band" aria-label="Cupom ${HOME_COUPON}">
      <h2>20% em qualquer peça com o cupom <span class="coupon-code">${HOME_COUPON}</span></h2>
      <div class="coupon-actions">
        <button type="button" class="btn" id="coupon-apply" ${applied ? "disabled" : ""}>${applied ? `${icon("check")}Cupom aplicado` : "Aplicar cupom"}</button>
        <a class="link tall" href="#/catalogo?promo=1">Ver promoções</a>
      </div>
    </section>`;
}

function pageHome() {
  const list = visibleProducts();
  const news = list.filter((p) => p.tag === "Novo");
  const best = list.filter((p) => p.tag === "Mais vendido").slice(0, 8);
  const seen = recent.list().map(findProduct).filter((p) => p && !p.hidden).slice(0, 10);
  const facts = [
    [`Frete grátis acima de ${brl(CONFIG.freeShippingFrom).replace(",00", "")}`, "Vale para o PAC, em todo o Brasil. O prazo aparece na sacola, pelo seu CEP."],
    [`Até ${CONFIG.maxInstallments}x sem juros`, "No cartão de crédito, sem acréscimo no preço da peça."],
    [`${Math.round(CONFIG.pixDiscount * 100)}% de desconto no Pix`, "O desconto entra na hora de pagar e a aprovação sai na hora."],
    ["Primeira troca grátis", "Você tem 30 dias depois da entrega para trocar de tamanho ou de peça."],
  ];
  setTitle("");
  app.innerHTML = `
    <section class="hero">
      <div class="container hero-text">
        <h1>Roupa boa se faz<br>fio a fio.</h1>
        <div class="hero-lead">
          <p>Peças para usar muito, por muito tempo.</p>
          <a href="#/catalogo?sort=novidades" class="btn">Ver novidades</a>
        </div>
      </div>
      ${heroWeave(list)}
    </section>

    <div class="container home">
      ${news.length ? rail("Chegou agora", news, { id: "chegou" }) : ""}
      ${couponBandHTML()}
      ${best.length ? `
      <section aria-labelledby="best-title">
        <div class="section-head">
          <h2 id="best-title">Mais vendidos</h2>
          <a href="#/catalogo" class="link">Ver o catálogo todo</a>
        </div>
        <div class="grid">${best.map(productCard).join("")}</div>
      </section>` : ""}
      ${seen.length ? rail("Vistos recentemente", seen, { id: "vistos" }) : ""}
      <section class="facts" aria-labelledby="facts-title">
        <h2 id="facts-title">Como é comprar na Trama</h2>
        <ul class="facts-list">
          ${facts.map(([t, d]) => `<li><h3>${t}</h3><p>${d}</p></li>`).join("")}
        </ul>
      </section>
    </div>`;

  timeWeave($("#weave"));

  $("#coupon-apply").addEventListener("click", (e) => {
    try {
      coupon.apply(HOME_COUPON);
      e.currentTarget.disabled = true;
      e.currentTarget.innerHTML = `${icon("check")}Cupom aplicado`;
      toast(`Cupom ${HOME_COUPON} aplicado`, { action: "Ver sacola", onAction: openDrawer });
    } catch (err) { toast(err.message); }
  });
}
