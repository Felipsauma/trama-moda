# Especificação — Redesenho da Trama Moda

Loja virtual brasileira de roupas, calçados e acessórios. Site estático: HTML, CSS e JavaScript puro, sem build nem dependências, dados no `localStorage`. Público: quem compra roupa pelo celular no Brasil. Trabalho da página: achar a peça, escolher o tamanho certo e pagar (Pix, cartão, boleto) sem atrito.

O redesenho troca **todo** o layout e melhora as funções. Esta especificação é a autoridade; o plano de tarefas é o argumento dela.

## 1. Restrições globais (valem para todas as tarefas)

1. **Sem build, sem dependências.** Scripts clássicos (`<script src>`), nada de `import`/`export` no código da loja: a loja precisa abrir com duplo clique em `index.html` (`file://`). A única biblioteca externa continua sendo o `qrcode.min.js` já usado.
2. **Dados preservados.** As chaves de `localStorage` existentes (`trama_users`, `trama_session`, `trama_cart`, `trama_orders`, `trama_stock`, `trama_favs`, `trama_recent`, `trama_reviews`, `trama_ship`, `trama_coupon`) mantêm nome e formato. Chaves novas usam o prefixo `trama_`.
3. **Texto da interface em pt-BR**, frases em caixa normal (só a primeira letra maiúscula), voz ativa. Um botão diz o que acontece ("Adicionar à sacola") e a confirmação usa a mesma palavra ("Adicionado à sacola"). Erros dizem o que houve e como resolver, sem pedir desculpas. Tela vazia convida a agir.
4. **Proibido no visual** (são os vícios do layout antigo): `text-transform: uppercase` em rótulos; rótulo pequeno acima de título ("eyebrow"); destacar uma única palavra do título em itálico/cor; ponto mediano ("·") juntando metadados; "→" no fim de links; emoji como ícone (usar SVG inline pelo helper `icon(nome)`); fonte monoespaçada (exceto o código Pix/linha do boleto); sombras em cartões (sombra só em gaveta, folha, popover, modal); cartões brancos com borda cinza repetidos.
5. **Cores só por tokens.** Nenhum valor hexadecimal fora de `css/tokens.css`. Nenhum `style="..."` com cor ou espaçamento dentro do HTML gerado em JS (usar classes); `style` só para valores realmente dinâmicos (largura de barra, variável CSS).
6. **Segurança.** Todo texto que vem do usuário ou do `localStorage` passa por `esc()` antes de entrar em `innerHTML`.
7. **Acessibilidade mínima.** Tudo alcançável por teclado; foco visível (`:focus-visible`); campos com `<label>`; alvos de toque de pelo menos 44px; contraste AA; `prefers-reduced-motion` respeitado; gaveta, folha e modal prendem o foco e devolvem o foco ao fechar; `Esc` fecha.
8. **Responsivo de 360px a 1440px+**, sem rolagem horizontal da página.
9. **Movimento.** O único movimento não disparado pelo usuário é a sequência de entrada do hero. Transições que respondem a uma ação (abrir, expandir, confirmar) são bem-vindas. Nada de fade-in por seção ao rolar.
10. **Verificação.** `npm test` (roda `node --test tests/*.test.js`) passa com saída limpa. Toda tarefa que mexe em interface roda `node tools/shot.mjs` nas rotas que tocou, em 1440 e 390 de largura, sem erros de JavaScript, e **olha os prints** (ferramenta Read) antes de dar a tarefa como pronta. Leia o cabeçalho de `tools/shot.mjs` para as opções (`--route` sem `#/`, `--seed`, `--after`, `--full`, `--print`). Salve prints na pasta de trabalho indicada no despacho, nunca dentro do repositório.
11. **Commits** em português, terminando com a linha `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Não commitar nada de `.superpowers/`.
12. **Estado intermediário aceito.** Os arquivos `styles.css` e `store.css` são apagados na Tarefa 3. Páginas ainda não redesenhadas podem ficar com aparência crua até a tarefa delas, mas precisam continuar funcionando sem erros de JavaScript.
13. Não alterar `img/`. `config.js` e `products.js` só recebem acréscimos.

## 2. Identidade visual

"Trama" é o fio que atravessa o tear na horizontal. A identidade vem do tear: fios de cor, urdume (linhas verticais) e trama (linhas horizontais). As fotos são peças recortadas em fundo branco; elas ficam sobre "retalhos" de cor (fundo colorido + `mix-blend-mode: multiply`).

### Tokens (`css/tokens.css`)

| Token | Valor | Uso |
| --- | --- | --- |
| `--papel` | `#FFFFFF` | fundo da página |
| `--nevoa` | `#EEF0F7` | superfícies quietas: painéis, campos, faixas |
| `--linha` | `#D4D9E8` | fios divisórios de 1px |
| `--anil` | `#1B2559` | texto e ações principais (nunca preto puro) |
| `--anil-forte` | `#111A44` | hover/pressionado das ações principais |
| `--chumbo` | `#5A6285` | texto secundário |
| `--acafrao` | `#FFCF33` | destaque: etiqueta de desconto, faixa de cupom, progresso do frete grátis (sempre com texto anil por cima) |
| `--pitanga` | `#C81E3A` | erro e esgotado |
| `--folha` | `#1E7A4C` | confirmação e "em estoque" |

Cada categoria tem um "carretel": um retalho (fundo da foto) e um fio (ponto no menu, sublinhado ativo, linha do hero).

| Categoria | Retalho | Fio |
| --- | --- | --- |
| feminino | `#F6DDE6` | `#C2477A` |
| masculino | `#D9E6F7` | `#2F6FC4` |
| calcados | `#DCEBD8` | `#3F8A55` |
| acessorios | `#F8ECC6` | `#B88A00` |

Expostos como `--retalho-feminino`, `--fio-feminino` etc. Um elemento com `data-cat="feminino"` recebe `--retalho` e `--fio` locais. A cor de categoria é informação (diz de qual seção a peça é), não enfeite: não usar essas cores para outra coisa.

### Tipografia

- Títulos e marca: **Bricolage Grotesque** (Google Fonts, eixos `opsz,wdth,wght@12..96,75..100,200..800`), peso 700, largura condensada (`font-stretch: 80%`), entrelinha 1.0–1.1, `letter-spacing: -0.02em`. A marca é a palavra `trama` em minúsculas, peso 800.
- Texto e interface: **Instrument Sans** (`wght@400..700`), 16px, entrelinha 1.5. Preços com `font-variant-numeric: tabular-nums`.
- Escala (razão 1,25): 13 / 14 / 16 / 20 / 25 / 31 / 39 / 49px; título do hero `clamp(2.75rem, 7.5vw, 6.5rem)`.
- Linhas de texto com no máximo 65 caracteres. Tudo alinhado à esquerda; centralizado só em tela vazia e confirmação de pedido.

### Forma

- Controles (botões, chips, busca): pílula (`border-radius: 999px`). Campos de formulário: 10px. Retalhos e painéis: 10px. Folha inferior: 20px nos cantos de cima.
- Painéis são faixas `--nevoa` sem borda. Divisões por fios de 1px `--linha`.
- Botão principal: fundo anil, texto branco, altura 48px. Secundário: contorno anil. Terciário: texto sublinhado.
- Foco: contorno de 3px anil com 2px de afastamento (açafrão sobre fundo anil).
- Largura máxima do conteúdo 1320px, margens laterais 24px (16px no celular).

## 3. Estrutura das telas

### Moldura (todas as páginas)

Desktop (≥ 900px): barra fixa no topo, uma linha de 72px: marca `trama`; links Feminino, Masculino, Calçados, Acessórios, Promoções (cada categoria com um ponto de 8px na cor do fio; link ativo ganha sublinhado de 3px na cor do fio); campo de busca sempre visível (pílula névoa, resultados em popover logo abaixo); Favoritos (com contagem), Conta (primeiro nome ou "Entrar"), Sacola (com contagem). Não existe mais barra de aviso preta no topo.

Celular (< 900px): barra superior de 56px com marca e Sacola; **barra de abas fixa embaixo** com Início, Catálogo, Buscar, Favoritos e Conta (ícone + rótulo, aba atual marcada com `aria-current`). A busca abre em tela cheia. Sem menu hambúrguer.

Rodapé anil: marca grande, links da loja e de ajuda, inscrição na newsletter, aviso de loja de demonstração. Link "Pular para o conteúdo" como primeiro elemento focável. O título da aba do navegador muda por página ("Vestido Poá Rodado — Trama").

### Início

```
┌────────────────────────────────────────────────────────────┐
│ Roupa boa se faz                                            │
│ fio a fio.                          (título enorme, à esq.) │
│ Peças para usar muito, por muito tempo. [Ver novidades]     │
│                                                             │
│  ┌──────┐   ┌──────┐   ┌──────┐   ┌──────┐                  │
│ ═│══════│═══│      │═══│══════│═══│      │═  fio 1          │
│  │ foto │   │ foto │   │ foto │   │ foto │                  │
│ ═│      │═══│══════│═══│      │═══│══════│═  fio 2          │
│ ═│══════│═══│      │═══│══════│═══│      │═  fio 3          │
│  └──────┘   └──────┘   └──────┘   └──────┘                  │
│  Feminino    Masculino  Calçados   Acessórios               │
│  10 peças    4 peças    6 peças    6 peças                  │
└────────────────────────────────────────────────────────────┘
```

**O hero é o elemento memorável da loja: um tecido plano.** Quatro retalhos altos, um por categoria (cada um é o link para a categoria, com nome e número de peças embaixo). Três fios horizontais de 4px, nas cores dos fios das categorias, atravessam a faixa inteira passando por cima de um retalho e por baixo do seguinte, alternando a cada fio (ligamento tela). Implementação: os fios de largura total ficam atrás dos retalhos (que são opacos e os escondem); dentro de cada retalho, segmentos "por cima" aparecem só quando `(índice do retalho + índice do fio)` é par. Na carga da página os fios se desenham da esquerda para a direita, em sequência (cerca de 1,2s no total); com `prefers-reduced-motion` aparecem prontos. No celular os retalhos viram grade 2×2 e os fios continuam cruzando. As peças do hero: 8 (feminino), 1 (masculino), 15 (calçados), 22 (acessórios).

Depois do hero, nesta ordem: trilho horizontal "Chegou agora" (produtos com etiqueta Novo, rolagem com encaixe e botões anterior/próximo); faixa açafrão do cupom ("20% em qualquer peça com o cupom TRAMA20", botão "Aplicar cupom" que aplica de verdade e vira "Cupom aplicado", link "Ver promoções"); grade "Mais vendidos"; trilho "Vistos recentemente" (só se houver); lista de fatos "Como é comprar na Trama" em quatro colunas separadas por fios verticais (frete grátis acima do valor configurado, parcelas sem juros, desconto no Pix, primeira troca grátis em 30 dias), só texto.

### Cartão de produto

`<article data-cat>`: retalho 4:5 com a foto (troca para a segunda foto no hover); etiqueta ("Novo", "Mais vendido", "Esgotado") no canto; coração de favorito; abaixo, nome, preço, preço antigo riscado e etiqueta açafrão com o percentual de desconto; nota com estrelas se houver avaliações. **Compra rápida:** com mouse, ao passar/focar o cartão aparece no pé do retalho a fileira de tamanhos (esgotados desabilitados); clicar num tamanho adiciona à sacola. No toque (`hover: none`), um botão redondo "+" abre uma folha inferior com os tamanhos. Produto de tamanho único: um botão "Adicionar". Depois de adicionar: aviso "Adicionado à sacola" com a ação "Ver sacola". Link e botões são irmãos, nunca botão dentro de `<a>`.

### Catálogo

Título (nome da categoria, `Resultados para "termo"` ou "Promoções") com a contagem ao lado. Filtros em **barra horizontal** no topo (não mais coluna lateral): chips de categoria; botões "Tamanho" e "Preço" que abrem popovers; alternadores "Em promoção" e "Só disponíveis"; ordenação; alternador de densidade da grade (confortável: 3 colunas no desktop, 1 no celular; compacta: 4 e 2; padrão compacta; lembrado). Abaixo, os filtros ativos como chips removíveis e "Limpar tudo". No celular, um botão "Filtros (n)" abre folha inferior com todos os filtros e botão "Ver N peças". Preço: campos mínimo e máximo mais três atalhos. Estado todo refletido na URL. Vazio: "Nenhuma peça com esses filtros" e botão "Limpar filtros".

### Produto

Desktop: à esquerda, mosaico com as três fotos (a primeira ocupa a largura toda, as outras duas lado a lado); clicar abre a foto ampliada com setas. À direita, painel fixo: nome, nota, preço, parcelas e preço no Pix, tamanhos, aviso de estoque, quantidade, "Adicionar à sacola", favoritar, compartilhar, cálculo de frete por CEP e três seções expansíveis (Descrição, Entrega e trocas, Pagamento). Celular: carrossel de fotos com encaixe e contador "1/3"; barra de compra fixa embaixo (substitui a barra de abas nesta página).

Funções novas: **descobrir meu tamanho** (modal com a tabela de medidas e um formulário de medidas; responde "Seu tamanho provável é M", botão "Selecionar M"; as medidas ficam salvas e as outras páginas de produto mostram "Pelas suas medidas: M"); **avise-me** (tamanho esgotado selecionado troca o botão por "Avise-me quando chegar"; usa o e-mail da conta ou pede um); **compartilhar** (Web Share ou copiar link); **avaliações** com distribuição por estrelas e ordenação; **"Combina com"** (peças de outras categorias) além de "Da mesma categoria".

### Sacola (gaveta e página)

Itens com quantidade e remover. **Remover mostra aviso com "Desfazer".** Progresso do frete grátis como um fio açafrão. Cupom, CEP e opções de entrega. **Embalagem para presente** (caixa de seleção com preço e mensagem opcional de até 200 caracteres). "Mover para favoritos" continua.

### Finalizar compra

Duas etapas na mesma página: **Entrega** (ao continuar, valida, recolhe e mostra um resumo com "Alterar") e **Pagamento** (cartão, Pix, boleto). CPF salvo na conta para a próxima compra. Resumo do pedido ao lado (no celular, recolhível no topo, com o total visível). Regras de validação e de pedido iguais às atuais, mais a embalagem para presente.

### Pedido, conta e painel

Pedido: confirmação, linha do tempo desenhada como um fio com nós, Pix/boleto, itens, entrega, pagamento, **"Comprar de novo"**, imprimir, cancelar. Conta: abas Pedidos, Dados e endereço, **Avise-me**, Senha. Painel admin: números principais em linha (sem cartões), **gráfico de barras do faturamento dos últimos 14 dias**, abas Pedidos (filtro por status, busca, **exportar CSV**), Produtos (**editar preço, preço promocional e ocultar**, estoque por tamanho, filtro "estoque baixo"), Clientes, Avise-me.

## 4. Arquitetura

```
index.html
config.js  products.js
css/  tokens.css base.css components.css shell.css home.css catalog.css
      product.css cart.css checkout.css account.css order.css admin.css
js/   core.js      armazenamento, utilidades, máscaras, validações, barramento de eventos
      domain.js    conta, estoque, favoritos, avaliações, pedidos, frete, cupom, sacola, Pix, avise-me, presente
      catalog.js   busca, filtros, ajustes de preço do admin, guia de medidas, recomendações
      reports.js   números do painel, CSV, faturamento por dia
      ui.js        ícones, aviso, modal, folha, gaveta, cartão de produto, cabeçalho e busca
      pages/*.js   uma página por arquivo
      main.js      roteador, eventos globais, inicialização
tests/ helpers/load.js  *.test.js      (node --test)
tools/shot.mjs
```

`core.js`, `domain.js`, `catalog.js` e `reports.js` não tocam no DOM nem chamam funções de interface: avisam mudanças por `bus.emit(assunto)` e a interface escuta. É isso que permite testá-los no Node.
