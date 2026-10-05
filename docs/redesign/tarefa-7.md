## Task 7: Painel administrativo, impressão, README e acabamento

Leia na spec: seções 1, 2 e "Pedido, conta e painel". Reescreva `js/pages/admin.js`, `js/pages/notfound.js`, `css/admin.css`; atualize `README.md`.

**Painel**
- Números principais em uma linha de fatos (faturamento, pedidos pagos, ticket médio, aguardando pagamento, tamanhos esgotados) usando `storeKpis`; sem cartões.
- Gráfico de barras "Faturamento dos últimos 14 dias" com `revenueByDay`: barras em HTML/CSS numa só cor (anil), altura proporcional ao maior dia, rótulo do dia embaixo (pode alternar no celular), valor em `title` e em texto acessível; hoje destacado; estado vazio "Ainda não há vendas neste período". Inclua uma tabela equivalente visualmente oculta para leitores de tela.
- Aba Pedidos: filtro por status, busca por número/nome/e-mail, troca de status (como hoje), botão "Exportar CSV" (baixa `pedidos-trama-AAAA-MM-DD.csv` com `ordersToCsv` da lista filtrada, via `Blob`), linha de presente indicada.
- Aba Produtos: por produto, preço, preço original (promoção) e "Oculto na loja" editáveis (`catalog.set`, erro junto ao campo, "Restaurar original" com `catalog.reset`), estoque por tamanho (como hoje), filtro por nome e alternador "Só estoque baixo" (`lowStock`).
- Aba Clientes (como hoje, com o visual novo). Aba Avise-me: `waitlist.all()` agrupado por produto/tamanho com a quantidade de pessoas e o estoque atual.
- Acesso restrito para quem não é admin, com link para entrar.

**Acabamento**
- Página não encontrada com o visual novo.
- Estilos de impressão do comprovante conferidos (sem cabeçalho, barra de abas, rodapé e botões).
- Remover código e CSS mortos: funções, classes e seletores que nenhuma página usa mais (confira com `git grep`); nenhum `style="..."` com cor/espaçamento restante em `js/`.
- `README.md`: funcionalidades novas, estrutura de pastas, como rodar os testes (`npm test`) e a ferramenta de print, configuração (`giftWrapPrice`), mantendo dados de teste e limitações.
- Varredura final das restrições da spec: `git grep -n "uppercase" css/`, `git grep -n "·\|→" js/ index.html`, cores fora de `css/tokens.css`, emojis em `js/` e `index.html`.

**Verificação:** `npm test`; prints em 1440 e 390 de `admin` em cada aba, com pedidos semeados (faça dois pedidos por `--seed`, um pago e um aguardando), página não encontrada (`rota-que-nao-existe`); `--print` confirmando que `ordersToCsv(orders.all())` começa com o cabeçalho esperado e que `catalog.set` muda o preço mostrado no catálogo. Rode a ferramenta em todas as rotas da loja uma última vez (1440 e 390) e confirme zero erros de JavaScript.
