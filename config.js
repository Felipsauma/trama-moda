// ===== Configurações da loja =====
// Edite aqui os dados da sua loja.
const CONFIG = {
  storeName: "TRAMA MODA",   // nome que aparece no Pix (até 25 caracteres, sem acentos)
  storeCity: "SAO PAULO",    // cidade que aparece no Pix (até 15 caracteres, sem acentos)

  // Coloque aqui a sua chave Pix (CPF, CNPJ, e-mail, telefone +55... ou chave aleatória).
  // Com a chave preenchida, o QR Code gerado no pedido é um Pix real e pode ser pago por qualquer banco.
  // Deixe vazio para usar o modo de demonstração.
  pixKey: "",

  freeShippingFrom: 299,
  pixDiscount: 0.05,
  maxInstallments: 6,

  // Cupons: percentual de desconto. "firstPurchase" = só vale na primeira compra.
  coupons: {
    BEMVINDO10: { off: 0.10, firstPurchase: true },
    TRAMA20: { off: 0.20 },
  },

  // Conta de administrador criada automaticamente (troque a senha em produção)
  admin: { name: "Administrador Trama", email: "admin@trama.com", password: "admin123" },
};
