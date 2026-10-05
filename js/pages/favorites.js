function pageFavorites() {
  const list = favs.list().map(findProduct);
  app.innerHTML = `
    <div class="catalog-head"><div><span class="eyebrow">Sua lista</span><h1>Favoritos</h1></div><span class="muted">${list.length} produto${list.length === 1 ? "" : "s"}</span></div>
    ${list.length ? `<div class="grid">${list.map(productCard).join("")}</div>`
      : `<div class="empty"><div class="success-icon pending">♡</div><h2>Nenhum favorito ainda</h2><p>Toque no coração dos produtos para salvá-los aqui.</p><a href="#/catalogo" class="btn">Ver catálogo</a></div>`}`;
}

