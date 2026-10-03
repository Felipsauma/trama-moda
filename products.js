// Catálogo de produtos da loja (fotos em img/pID-N.webp)
const imgs = (id, n = 3) => Array.from({ length: n }, (_, i) => `img/p${id}-${i + 1}.webp`);

const PRODUCTS = [
  // Masculino
  { id: 1,  name: "Camisa Xadrez Azul e Preta", cat: "masculino", price: 169.9, oldPrice: 199.9, sizes: ["P", "M", "G", "GG"], tag: "Mais vendido", desc: "Camisa em flanela de algodão com estampa xadrez, botões frontais e bolso no peito. Confortável para o dia a dia." },
  { id: 2,  name: "Camisa Flanela Xadrez",      cat: "masculino", price: 189.9, oldPrice: null,  sizes: ["P", "M", "G", "GG"], tag: "Novo", desc: "Flanela macia e encorpada, ideal para dias mais frios. Pode ser usada fechada ou aberta sobre uma camiseta." },
  { id: 3,  name: "Camisa Manga Curta",         cat: "masculino", price: 129.9, oldPrice: null,  sizes: ["P", "M", "G", "GG"], desc: "Camisa leve de manga curta com tecido respirável, perfeita para o verão." },
  { id: 4,  name: "Camisa Xadrez Casual",       cat: "masculino", price: 149.9, oldPrice: 179.9, sizes: ["P", "M", "G"], desc: "Modelagem regular, tecido 100% algodão e estampa xadrez discreta." },

  // Feminino
  { id: 5,  name: "Vestido Longo Preto",          cat: "feminino", price: 459.9, oldPrice: null,  sizes: ["PP", "P", "M", "G"], tag: "Novo", desc: "Vestido longo de festa com caimento fluido e decote elegante. Para ocasiões especiais." },
  { id: 6,  name: "Corset de Couro com Saia",     cat: "feminino", price: 329.9, oldPrice: 389.9, sizes: ["PP", "P", "M", "G"], desc: "Conjunto com corset estruturado em couro sintético e saia evasê." },
  { id: 7,  name: "Conjunto Corset e Saia Preta", cat: "feminino", price: 289.9, oldPrice: null,  sizes: ["P", "M", "G"], desc: "Corset ajustável combinado com saia preta de cintura alta." },
  { id: 8,  name: "Vestido Poá Rodado",           cat: "feminino", price: 219.9, oldPrice: 259.9, sizes: ["PP", "P", "M", "G"], tag: "Mais vendido", desc: "Vestido tomara que caia com estampa de poá, saia rodada e laço na cintura. Inspiração anos 50." },
  { id: 9,  name: "Vestido Midi Color Block",     cat: "feminino", price: 279.9, oldPrice: null,  sizes: ["P", "M", "G"], desc: "Vestido midi de malha com mangas em cores contrastantes e fenda lateral." },
  { id: 10, name: "Vestido Azul Rodado",          cat: "feminino", price: 189.9, oldPrice: null,  sizes: ["PP", "P", "M", "G"], desc: "Vestido rodado em tom azul, com cintura marcada e tecido leve." },
  { id: 11, name: "Vestido de Verão",             cat: "feminino", price: 159.9, oldPrice: 189.9, sizes: ["PP", "P", "M"], desc: "Vestido fresco de alcinha, estampado, ideal para dias quentes." },
  { id: 12, name: "Vestido Cinza Básico",         cat: "feminino", price: 169.9, oldPrice: null,  sizes: ["P", "M", "G", "GG"], desc: "Vestido versátil em tom cinza, combina com tênis ou salto." },
  { id: 13, name: "Vestido Curto Babados",        cat: "feminino", price: 199.9, oldPrice: null,  sizes: ["PP", "P", "M", "G"], tag: "Novo", desc: "Vestido tomara que caia com saia em camadas de babados e faixa com laço na cintura." },
  { id: 14, name: "Vestido Xadrez Tartan",        cat: "feminino", price: 209.9, oldPrice: 249.9, sizes: ["P", "M", "G"], desc: "Vestido com estampa tartan clássica e modelagem ajustada." },

  // Calçados
  { id: 15, name: "Tênis Cano Alto Vermelho e Preto", cat: "calcados", price: 699.9, oldPrice: 799.9, sizes: ["37", "38", "39", "40", "41", "42", "43"], tag: "Mais vendido", desc: "Tênis de cano alto em couro, com cabedal vermelho e preto e solado de borracha." },
  { id: 16, name: "Tênis Retrô Runner",               cat: "calcados", price: 449.9, oldPrice: null,  sizes: ["37", "38", "39", "40", "41", "42", "43"], desc: "Tênis de corrida com visual retrô, camurça e entressola com amortecimento." },
  { id: 17, name: "Tênis Esportivo Off White",        cat: "calcados", price: 389.9, oldPrice: null,  sizes: ["36", "37", "38", "39", "40", "41", "42"], desc: "Tênis leve em tom off white com detalhes em vermelho." },
  { id: 18, name: "Scarpin Salto Alto",               cat: "calcados", price: 359.9, oldPrice: null,  sizes: ["34", "35", "36", "37", "38", "39"], tag: "Novo", desc: "Scarpin de bico fino com salto agulha de 10 cm e palmilha acolchoada." },
  { id: 19, name: "Scarpin Dourado Metalizado",       cat: "calcados", price: 299.9, oldPrice: 349.9, sizes: ["34", "35", "36", "37", "38", "39"], desc: "Scarpin metalizado em tom dourado, perfeito para festas." },
  { id: 20, name: "Sapato Vermelho",                  cat: "calcados", price: 249.9, oldPrice: null,  sizes: ["34", "35", "36", "37", "38", "39"], desc: "Sapato vermelho de salto médio, confortável e marcante." },

  // Acessórios
  { id: 21, name: "Bolsa Azul de Mão",      cat: "acessorios", price: 229.9, oldPrice: null,  sizes: ["Único"], desc: "Bolsa estruturada em couro sintético azul, com alça de mão e alça transversal removível." },
  { id: 22, name: "Bolsa de Couro Caramelo", cat: "acessorios", price: 499.9, oldPrice: 579.9, sizes: ["Único"], tag: "Mais vendido", desc: "Bolsa espaçosa em couro legítimo com bolsos internos e fecho em zíper." },
  { id: 23, name: "Mochila Branca",          cat: "acessorios", price: 259.9, oldPrice: null,  sizes: ["Único"], desc: "Mochila em couro sintético branco com compartimento acolchoado." },
  { id: 24, name: "Bolsa Preta Clássica",    cat: "acessorios", price: 279.9, oldPrice: null,  sizes: ["Único"], desc: "Bolsa preta atemporal com alças reforçadas e acabamento em metal dourado." },
  { id: 25, name: "Óculos de Sol Preto",     cat: "acessorios", price: 189.9, oldPrice: null,  sizes: ["Único"], desc: "Armação preta em acetato com lentes de proteção UV400." },
  { id: 26, name: "Óculos de Sol Clássico",  cat: "acessorios", price: 159.9, oldPrice: 199.9, sizes: ["Único"], desc: "Modelo clássico com armação metálica e lentes escuras UV400." },
].map((p) => ({ ...p, images: imgs(p.id) }));

const CATEGORIES = {
  feminino: "Feminino",
  masculino: "Masculino",
  calcados: "Calçados",
  acessorios: "Acessórios",
};
