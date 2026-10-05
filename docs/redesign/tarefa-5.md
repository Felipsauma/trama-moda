## Task 5: Página de produto e sacola

Leia na spec: seções 1, 2, "Produto" e "Sacola". Reescreva `js/pages/product.js`, `js/pages/cart.js`, `css/product.css`, `css/cart.css` e, em `js/ui.js`, a gaveta e os blocos de resumo (`renderDrawer`, `summaryHTML`, `freeShipHTML`, `shipOptionsHTML`, `bindSummary`, `sizeGuide`).

**Produto**
- Galeria: mosaico no desktop; carrossel com encaixe e contador no celular; clique abre a foto ampliada em modal, com setas na tela e no teclado (←/→).
- Painel de compra fixo (desktop) e barra de compra fixa no celular, que substitui a barra de abas (classe no `<body>` posta e retirada pelo roteador ao entrar/sair da rota).
- Tamanhos: esgotados continuam selecionáveis (riscados, com `aria-label` "M, esgotado"). Com tamanho esgotado selecionado, o botão principal vira "Avise-me quando chegar": logado usa o e-mail da conta; deslogado mostra um campo de e-mail na hora. Usa `waitlist.add`; confirma com "Avisaremos em fulano@..." e o botão passa a "Aviso ativado" (`waitlist.has`). Erros de `waitlist.add` aparecem junto ao campo.
- Sem tamanho escolhido, "Adicionar à sacola" pede o tamanho (mensagem junto dos tamanhos, foco na lista), sem `alert`.
- "Descobrir meu tamanho" (não aparece em acessórios): modal com a tabela (`SIZE_TABLES`) e formulário de medidas com `label` e unidade; usa `recommendSize`; mostra "Seu tamanho provável é M" e, se esgotado, "M está esgotado" com a opção de aviso; "Selecionar M" fecha e seleciona; grava em `measures.set`. Com medidas salvas, a página mostra "Pelas suas medidas: M" junto dos tamanhos.
- Compartilhar: `navigator.share` quando existir, senão copia o link e avisa "Link copiado".
- Frete por CEP (como hoje, com o visual novo), seções expansíveis (`<details>`): Descrição (aberta), Entrega e trocas, Pagamento.
- Avaliações: resumo com média e barras de distribuição (`reviews.summary`), ordenação (`reviews.sorted`), formulário com as regras atuais (logado, uma por pessoa, mínimo 10 caracteres, selo "Compra verificada"). As estrelas do formulário funcionam por teclado (grupo de botões de opção).
- "Combina com" (`completeLook`) e "Da mesma categoria" (`visibleProducts`), como trilhos. Produto oculto (`p.hidden`) ou inexistente: página de não encontrado.
- `setTitle(p.name)`.

**Sacola (gaveta e página)**
- Itens com foto no retalho da categoria, tamanho, preço, quantidade, remover. Remover usa `cart.remove` e mostra `toast("Removido da sacola", { action: "Desfazer", ... })` que chama `cart.restore`. "Mover para favoritos" continua na página.
- Progresso do frete grátis como fio açafrão; cupom com erro junto ao campo (não em toast) e cupom aplicado mostrado como chip removível; CEP e opções de entrega.
- Embalagem para presente na página da sacola: caixa de seleção "Embalar para presente (+ R$ 9,90)" e, marcada, campo de mensagem com contador de caracteres; usa `gift.get/set`; linha "Embalagem para presente" no resumo quando ligada (em `summaryHTML`, portanto também no checkout).
- Vazio: convite ao catálogo.
- A gaveta e a página re-renderizam por `bus` (`cart`), sem recarregar a rota.

**Verificação:** `npm test`; prints em 1440 e 390 de `produto/8` (página inteira), `produto/21` (tamanho único), produto com tamanho esgotado selecionado (descubra um com `--print` sobre `stock.get`), modal "Descobrir meu tamanho" com resultado, `carrinho` com 3 itens + cupom + CEP + presente, gaveta aberta, `carrinho` vazio. Confirme por `--print` que desfazer devolve o item (`cart.remove` + `cart.restore`).

---

