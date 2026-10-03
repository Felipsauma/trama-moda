# Trama Moda

Loja virtual de roupas feita com HTML, CSS e JavaScript puro, sem dependências nem build.

## Como usar

Abra o `index.html` no navegador. Para publicar, qualquer hospedagem estática serve (GitHub Pages, Netlify, Vercel).

## Funcionalidades

- **Catálogo**: categorias, busca com sugestões, filtros por tamanho, preço e disponibilidade, ordenação
- **Produto**: galeria com zoom, estoque por tamanho, guia de medidas, cálculo de frete por CEP, avaliações
- **Sacola**: sacola lateral, cupons de desconto, barra de frete grátis, mover para favoritos
- **Conta**: cadastro e login, pedidos, dados com preenchimento automático de endereço, troca de senha
- **Checkout**: endereço via [ViaCEP](https://viacep.com.br), frete PAC/SEDEX por região, pagamento com cartão (simulado), Pix e boleto
- **Pix**: QR Code e Pix Copia e Cola no padrão BR Code do Banco Central
- **Pedidos**: linha do tempo de status, código de rastreio, cancelamento com devolução ao estoque, comprovante para impressão
- **Painel admin**: faturamento, gestão de status dos pedidos, edição de estoque e lista de clientes

## Configuração

Edite o `config.js`:

| Campo | Descrição |
| --- | --- |
| `pixKey` | Sua chave Pix. Preenchida, o QR Code do pedido recebe pagamentos reais. |
| `storeName` / `storeCity` | Nome e cidade exibidos no Pix |
| `coupons` | Cupons de desconto |
| `freeShippingFrom` | Valor mínimo para frete grátis |
| `admin` | Conta de administrador criada automaticamente |

Os produtos ficam em `products.js` e as fotos em `img/`.

## Dados para teste

| | |
| --- | --- |
| Admin | `admin@trama.com` / `admin123` |
| Cartão aprovado | `4111 1111 1111 1111` |
| Cartão recusado | `4000 0000 0000 0002` |
| Cupons | `BEMVINDO10` (primeira compra), `TRAMA20` |

## Limitações

Este é um projeto front-end: contas, pedidos e estoque ficam no `localStorage` de cada navegador, e o pagamento com cartão e o boleto são simulados. Para uso em produção é preciso um back-end com banco de dados e um gateway de pagamento (Mercado Pago, Stripe, PagSeguro etc.).

Fotos de produtos: [DummyJSON](https://dummyjson.com) (uso para demonstração).
