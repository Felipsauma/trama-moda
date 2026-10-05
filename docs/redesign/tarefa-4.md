## Task 4: Catálogo, favoritos e resultados de busca

Leia na spec: seções 1, 2 e "Catálogo". Reescreva `js/pages/catalog.js`, `js/pages/favorites.js` e `css/catalog.css`.

- Barra de filtros horizontal conforme a spec, usando `parseCatalogParams`, `filterProducts`, `catalogQuery` (Task 2). Estado sempre refletido na URL com `history.replaceState`; abrir a URL reproduz a tela.
- Chips de categoria (com o ponto na cor do fio); popover "Tamanho" (tamanhos existentes na categoria atual, ordenados por `sortSizes`; trocar de categoria limpa os tamanhos); popover "Preço" (campos mínimo e máximo + atalhos "Até R$ 150", "R$ 150 a R$ 300", "Acima de R$ 300"); alternadores "Em promoção" e "Só disponíveis"; ordenação (`Relevância`, `Menor preço`, `Maior preço`, `Maior desconto`, `Mais bem avaliados`, `Novidades`); densidade da grade lembrada em `trama_view` (`compacta` | `confortavel`).
- Popovers: botão com `aria-expanded`, fecham com `Esc`, clique fora e ao escolher; um aberto por vez. Mostram no botão o que está selecionado (ex.: "Tamanho: M, G").
- Filtros ativos como chips removíveis + "Limpar tudo". Contagem "N peças" atualizada a cada mudança, anunciada com `aria-live="polite"`.
- Celular: botão "Filtros (n)" abre `openSheet` com todos os filtros e o botão "Ver N peças".
- Só a grade e a contagem são re-renderizadas a cada mudança (o campo em foco não pode perder o foco ao digitar o preço).
- Título: nome da categoria, `Resultados para "termo"` (termo com `esc`) ou "Promoções" quando só o filtro de promoção está ativo, senão "Catálogo". `setTitle` de acordo.
- Vazio: "Nenhuma peça com esses filtros" + "Limpar filtros". Em busca sem resultado, sugerir as categorias.
- Favoritos: grade com os cartões novos; remover dos favoritos atualiza a lista sem recarregar a rota inteira; vazio com convite ao catálogo.

**Verificação:** `npm test`; prints em 1440 e 390 de `catalogo`, `catalogo?cat=feminino&tam=M&promo=1`, `catalogo?q=vestdo`, `catalogo?q=zzzz`, popover de tamanho aberto (1440), folha de filtros aberta (390), `favoritos` vazio e com itens (`--seed "favs.toggle(1); favs.toggle(8)"`). Use `--print` para conferir que `location.hash` reflete um filtro aplicado via `--after`.

---

