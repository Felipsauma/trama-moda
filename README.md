# Trama Moda

Loja virtual brasileira de roupas, calçados e acessórios construída com HTML, CSS e JavaScript puro (Vanilla JS), sem dependências nem etapas de compilação (*build*). Abre diretamente com duplo clique em `index.html` (`file://`) ou em qualquer hospedagem estática (GitHub Pages, Netlify, Vercel).

---

## Funcionalidades

- **Identidade e conceito do tear:** fios horizontais e urdume vertical, retalhos de cor por categoria (`mix-blend-mode: multiply`), tipografia com Bricolage Grotesque e Instrument Sans, cores estritamente baseadas em tokens sem pretos puros.
- **Início:** hero interativo com tecido plano onde os fios cruzam os retalhos alternadamente, trilho de novidades com rolagem suave, faixa promocional com aplicação dinâmica de cupom, produtos mais vendidos, vistos recentemente e diferenciais da loja em quatro colunas com fios divisórios.
- **Catálogo:** barra de filtros horizontal com chips de categoria, popovers para seleção de tamanho e faixa de preço com atalhos, alternadores para promoções e itens em estoque, chips de filtros ativos removíveis, alternador de densidade de grade (compacta e confortável, persistido na sessão) e sincronização bidirecional na URL. Na versão mobile, conta com folha inferior (*bottom sheet*) completa de filtros.
- **Busca inteligente:** campo com atalho de teclado (`/`), sugestões instantâneas em popover (ou tela cheia no celular), tolerância a erros de digitação (distância de Levenshtein) e histórico das últimas buscas.
- **Página do produto:** galeria em mosaico no desktop e carrossel com encaixe e contador no mobile; zoom em modal acessível com suporte a teclado (←/→); painel fixo de compra; "Descobrir meu tamanho" com tabela de medidas e recomendação personalizada baseada no corpo; botão de compartilhamento nativo (Web Share API com alternativa para cópia do link); cálculo de frete por CEP com prazos úteis; avaliações com notas e barras de distribuição percentual por estrelas; trilhos "Combina com" e "Da mesma categoria".
- **Fila de espera (Avise-me):** seleção de tamanhos esgotados permite ativar aviso quando a peça for reposta, integrado à conta do cliente ou com captura imediata de e-mail.
- **Sacola (gaveta e página):** itens com miniaturas, ajuste de quantidade respeitando o estoque em tempo real, exclusão com aviso interativo e botão "Desfazer" (*undo*), barra de progresso açafrão para frete grátis, opção de embalagem para presente com cartão e mensagem personalizada, além de movimentação direta para os favoritos.
- **Finalizar compra em 2 etapas:** fluxo linear e intuitivo na mesma tela. A etapa de entrega valida os dados (com busca automática no ViaCEP) e recolhe para um resumo compacto com botão "Alterar". A etapa de pagamento só é liberada com a entrega validada, suportando cartão com validação de algoritmo de Luhn e detecção de bandeira, Pix com QR Code e desconto automático, e boleto bancário.
- **Pedido e acompanhamento:** linha do tempo do status desenhada como um fio com nós conectados, código Pix com QR Code dinâmico e código Copia e Cola, linha digitável do boleto, botão "Comprar de novo" que recoloca os itens disponíveis na sacola, cancelamento em modal próprio e estilos otimizados para impressão.
- **Conta do cliente:** tela unificada de entrada/cadastro com abas e revelação de senha, navegação por abas para Pedidos, Dados cadastrais e endereço (com CPF persistido para novos pedidos), lista de itens cadastrados no Avise-me (com alerta de "Disponível agora") e alteração de senha.
- **Painel administrativo:** fita de indicadores principais (*KPI strip*) sem cartões repetidos, gráfico de barras com faturamento dos últimos 14 dias (com hoje destacado e tabela oculta acessível para leitores de tela), gestão de pedidos com troca de status e exportação em CSV (com BOM para compatibilidade com Excel), gestão de produtos com edição de preço/promoção/ocultação e estoque por tamanho, filtro de estoque baixo, listagem de clientes e visão consolidada da fila do Avise-me.

---

## Estrutura de Pastas

```text
trama-moda/
├── index.html              # Estrutura base da loja, moldura, cabeçalho e rodapé
├── config.js               # Configurações da loja, cupons, frete e dados de admin
├── products.js             # Catálogo de produtos e dados iniciais
├── css/
│   ├── tokens.css          # Paleta de cores, tipografia, espaçamento e raios
│   ├── base.css            # Reset, estilos gerais e classes utilitárias
│   ├── components.css      # Botões, campos, etiquetas, modais, gaveta e tabelas
│   ├── shell.css           # Cabeçalho fixo, busca, barra de abas e rodapé
│   ├── home.css            # Estilos da página inicial, hero do tear e trilhos
│   ├── catalog.css         # Barra de filtros horizontal, popovers e densidade
│   ├── product.css         # Mosaico de fotos, painel de compra e avaliações
│   ├── cart.css            # Sacola, embalagem para presente e resumo
│   ├── checkout.css        # Checkout em duas etapas e opções de pagamento
│   ├── order.css           # Linha do tempo, bloco Pix e estilos de impressão
│   ├── account.css         # Área da conta, autenticação e abas
│   └── admin.css           # Fita de KPIs, gráfico de barras e painel
├── js/
│   ├── core.js             # Utilitários, armazenamento, validações e barramento
│   ├── domain.js           # Regras de negócio (estoque, sacola, pedidos, auth, frete)
│   ├── catalog.js          # Busca com tolerância, filtros, medidas e recomendações
│   ├── reports.js          # Relatórios, KPIs, faturamento por dia e exportação CSV
│   ├── ui.js               # Componentes de UI, ícones SVG, gaveta, modal e toast
│   ├── main.js             # Roteador por hash e inicialização do sistema
│   └── pages/
│       ├── home.js         # Página inicial
│       ├── catalog.js      # Catálogo e listagem com filtros
│       ├── product.js      # Detalhes do produto
│       ├── cart.js         # Página da sacola
│       ├── checkout.js     # Checkout em duas etapas
│       ├── order.js        # Confirmação e detalhes do pedido
│       ├── account.js      # Minha conta e autenticação
│       ├── favorites.js    # Meus favoritos
│       ├── admin.js        # Painel administrativo
│       └── notfound.js     # Página 404 não encontrada
├── tests/
│   ├── helpers/load.js     # Carregador de módulos no ambiente de teste Node.js
│   ├── core.test.js        # Testes de utilitários, máscaras e validações
│   ├── domain.test.js      # Testes de regras de negócio, carrinho e pedidos
│   ├── catalog.test.js     # Testes de filtros, busca e recomendação de tamanho
│   └── reports.test.js     # Testes de relatórios, KPIs e geração de CSV
├── tools/
│   └── shot.mjs            # Ferramenta para captura de telas e verificação JS
└── img/                    # Imagens dos produtos
```

---

## Como Rodar os Testes

A suíte de testes unitários utiliza o *test runner* nativo do Node.js:

```bash
npm test
```

Os 71 testes cobrem regras de negócio, cálculos tributários e de frete, busca com tolerância a erro, algoritmo de Luhn, validações de entrega e cartão, cálculo de KPIs e integridade da formatação do CSV.

---

## Ferramenta de Captura Visual (`tools/shot.mjs`)

O projeto inclui a ferramenta `tools/shot.mjs` que controla instâncias headless do Google Chrome para inspecionar telas e capturar screenshots sem dependências externas:

```bash
# Capturar a página inicial em 1440px
node tools/shot.mjs --out inicio.png

# Capturar o catálogo no formato mobile (390px)
node tools/shot.mjs --route "catalogo?cat=feminino" --width 390 --out catalogo-mobile.png

# Avaliar expressões em tempo de execução
node tools/shot.mjs --print "storeKpis(orders.all())"

# Popular dados antes do carregamento com --seed
node tools/shot.mjs --route "carrinho" --seed "cart.add(1, 'M', 1)" --out sacola.png
```

---

## Configuração

Edite o arquivo `config.js` para personalizar os parâmetros da loja:

| Campo | Descrição |
| --- | --- |
| `pixKey` | Chave Pix do recebedor (se preenchida, gera o payload BR Code real) |
| `storeName` / `storeCity` | Nome da loja e cidade exibidos no QR Code do Pix |
| `coupons` | Dicionário de cupons de desconto e percentuais correspondentes |
| `freeShippingFrom` | Valor mínimo em reais para elegibilidade ao frete grátis |
| `giftWrapPrice` | Valor adicional cobrado pelo serviço de embalagem para presente |
| `admin` | Credenciais padrão da conta de administrador criada na inicialização |

---

## Dados para Teste

| Identificação | Valores |
| --- | --- |
| **Admin** | `admin@trama.com` / `admin123` |
| **Cartão Aprovado** | `4111 1111 1111 1111` (qualquer validade futura e CVV de 3 dígitos) |
| **Cartão Recusado** | `4000 0000 0000 0002` (simula recusa de operadora) |
| **Cupons Ativos** | `BEMVINDO10` (10% de desconto), `TRAMA20` (20% de desconto) |

---

## Limitações

Por ser um projeto front-end estático para demonstração e portfólio:
- As contas, pedidos, ajustes de preço e controle de estoque ficam persistidos no `localStorage` do navegador.
- As transações de cartão e emissões de boleto são simuladas no ambiente do cliente.
- As fotos dos produtos são provenientes da biblioteca [DummyJSON](https://dummyjson.com) apenas para fins demonstrativos.
