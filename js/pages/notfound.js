// ===== Pagina nao encontrada (404) =====
function pageNotFound() {
  setTitle("Página não encontrada");
  app.innerHTML = `
    <div class="empty notfound-view">
      ${icon("sacola")}
      <h1>Página não encontrada</h1>
      <p>O endereço que você tentou acessar não existe ou a peça saiu do ar.</p>
      <a href="#/" class="btn">Voltar ao início</a>
    </div>
  `;
}
