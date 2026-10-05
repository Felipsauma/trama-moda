## Task 6: Finalizar compra, pedido, conta e acesso

Leia na spec: seções 1, 2, "Finalizar compra" e "Pedido, conta e painel". Reescreva `js/pages/checkout.js`, `js/pages/order.js`, `js/pages/account.js`, `css/checkout.css`, `css/order.css`, `css/account.css`.

**Validação testável (TDD):** extraia para `js/domain.js` as funções puras `validateDelivery(v)` e `validateCard(v, now)`, que recebem os valores dos campos e devolvem `{ campo: "mensagem" }` com exatamente as regras e mensagens de hoje em `submitOrder` (nome e sobrenome, CPF, CEP, rua, número, bairro, cidade, UF; cartão por Luhn, nome, validade não vencida, CVV). Testes em `tests/domain.test.js`, incluindo validade no mês corrente (válida) e no mês anterior (inválida).

**Finalizar compra**
- Etapa 1 Entrega: "Continuar para o pagamento" valida com `validateDelivery`; válido → recolhe em um resumo (destinatário, endereço, forma de entrega escolhida) com "Alterar"; inválido → mensagens junto aos campos e foco no primeiro erro. Preenchimento por CEP (ViaCEP) e opções de entrega como hoje. CPF: pré-preenche de `user.cpf` e salva em `auth.update({ cpf })` ao concluir o pedido.
- Etapa 2 Pagamento: só abre com a etapa 1 concluída. Cartão (bandeira detectada, parcelas com mínimo de R$ 20), Pix (valor com desconto), boleto. Mantém o aviso de pagamento simulado e os cartões de teste.
- Resumo ao lado (desktop) e recolhível no topo (celular, total sempre visível). O botão final mostra o valor ("Pagar R$ 219,90" / "Confirmar pedido R$ ...").
- O pedido grava também `gift: { price, message }` quando houver embalagem; total = subtotal − cupom + frete + presente (− desconto Pix sobre o total, como hoje). Todas as outras regras de `submitOrder` ficam (estoque conferido, frete calculado para o CEP, cartão recusado `4000 0000 0000 0002`, baixa de estoque, limpar cupom e sacola).
- Sem conta → redireciona para entrar com retorno ao checkout; sacola vazia → sacola.

**Pedido**
- Confirmação, linha do tempo como fio com nós (horizontal no desktop, vertical no celular; `aria-current="step"` na etapa atual), bloco Pix (QR + copia e cola + simular) e boleto, itens, linha da embalagem para presente e mensagem quando houver, entrega, pagamento.
- "Comprar de novo" → `orders.reorder`, abre a gaveta e avisa o que não pôde ser adicionado ("Vestido Poá Rodado (M) está esgotado").
- Cancelar: confirmação em modal próprio (não `confirm()` do navegador). Imprimir comprovante continua (estilos de impressão em `order.css`).

**Conta e acesso**
- Entrar / criar conta: uma tela, alternância por abas acessíveis, mostrar/ocultar senha, erros junto aos campos; respeita `?next=`.
- Conta: navegação por abas (lateral no desktop, rolável no celular): Pedidos (cartões de pedido com miniaturas, status, total e "Comprar de novo"), Dados e endereço (inclui CPF), Avise-me (lista de `waitlist.ofUser` com "Disponível agora — ver peça" ou "Aguardando reposição" e "Cancelar aviso"), Senha. Link para o painel se for admin. Sair.

**Verificação:** `npm test`; prints em 1440 e 390 de: `conta` deslogado (entrar e criar conta), `checkout` na etapa 1, etapa 1 com erros, etapa 2 em cartão e em Pix (avance com `--after` preenchendo os campos), página de um pedido Pix aguardando pagamento e de um pedido pago, `conta` em cada aba. Faça um pedido completo por `--after`/`--print` e confira que `orders.all()` tem o pedido com `gift` quando a embalagem estava ligada e que o estoque baixou.

---

