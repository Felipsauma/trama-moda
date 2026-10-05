function pageHome() {
  const bestSellers = PRODUCTS.filter((p) => p.tag === "Mais vendido").slice(0, 4);
  const news = PRODUCTS.filter((p) => p.tag === "Novo").slice(0, 4);
  const seen = recent.list().slice(0, 4).map(findProduct);
  const img = (id, n = 1) => `img/p${id}-${n}.webp`;
  app.innerHTML = `
    <section class="hero">
      <div class="hero-text">
        <span class="eyebrow">Coleção Primavera 2026</span>
        <h1>Vista o que é <em>atemporal</em></h1>
        <p>Peças leves, cortes precisos e cores que combinam com tudo. Feitas para acompanhar você em todas as estações.</p>
        <div class="hero-cta">
          <a href="#/catalogo?cat=feminino" class="btn">Comprar feminino</a>
          <a href="#/catalogo?cat=masculino" class="btn ghost">Comprar masculino</a>
        </div>
      </div>
      <div class="hero-art">
        <figure><img src="${img(8)}" alt="Vestido Poá Rodado"></figure>
        <figure><img src="${img(15)}" alt="Tênis cano alto"></figure>
        <figure><img src="${img(22)}" alt="Bolsa de couro"></figure>
      </div>
    </section>

    <div class="perks">
      <div class="perk"><span>🚚</span><div><strong>Frete grátis</strong>acima de ${brl(CONFIG.freeShippingFrom)}</div></div>
      <div class="perk"><span>💳</span><div><strong>Até ${CONFIG.maxInstallments}x sem juros</strong>no cartão de crédito</div></div>
      <div class="perk"><span>⚡</span><div><strong>${CONFIG.pixDiscount * 100}% off no Pix</strong>aprovação imediata</div></div>
      <div class="perk"><span>🔄</span><div><strong>Troca grátis</strong>em até 30 dias</div></div>
    </div>

    <div class="container">
      <section class="section">
        <div class="section-head"><div><span class="eyebrow">Categorias</span><h2>Compre por estilo</h2></div></div>
        <div class="cat-tiles">
          <a class="cat-tile" href="#/catalogo?cat=feminino"><img src="${img(5)}" alt=""><span>Feminino</span></a>
          <a class="cat-tile" href="#/catalogo?cat=masculino"><img src="${img(1)}" alt=""><span>Masculino</span></a>
          <a class="cat-tile" href="#/catalogo?cat=calcados"><img src="${img(18)}" alt=""><span>Calçados</span></a>
          <a class="cat-tile" href="#/catalogo?cat=acessorios"><img src="${img(21)}" alt=""><span>Acessórios</span></a>
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <div><span class="eyebrow">Os favoritos</span><h2>Mais vendidos</h2></div>
          <a href="#/catalogo" class="link">Ver tudo</a>
        </div>
        <div class="grid">${bestSellers.map(productCard).join("")}</div>
      </section>

      <section class="banner">
        <div class="banner-text">
          <span class="eyebrow">Sale de meia estação</span>
          <h2>Até 20% off em peças selecionadas</h2>
          <p>Aproveite descontos em vestidos, calçados e acessórios. Use também o cupom <strong style="color:#fff">TRAMA20</strong> na sacola.</p>
          <a href="#/catalogo?sort=promo" class="btn light">Ver promoções</a>
        </div>
        <div class="banner-img">
          <img src="${img(14)}" alt=""><img src="${img(19)}" alt="">
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <div><span class="eyebrow">Acabou de chegar</span><h2>Novidades</h2></div>
          <a href="#/catalogo" class="link">Ver tudo</a>
        </div>
        <div class="grid">${news.map(productCard).join("")}</div>
      </section>

      ${seen.length ? `
      <section class="section">
        <div class="section-head"><div><span class="eyebrow">Seu histórico</span><h2>Vistos recentemente</h2></div></div>
        <div class="grid">${seen.map(productCard).join("")}</div>
      </section>` : ""}
    </div>`;
}

