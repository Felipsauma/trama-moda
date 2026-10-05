const test = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./helpers/load");

test("validCpf aceita CPF válido e rejeita inválidos", () => {
  const { get } = load();
  assert.equal(get('validCpf("529.982.247-25")'), true);
  assert.equal(get('validCpf("52998224725")'), true);
  assert.equal(get('validCpf("111.111.111-11")'), false);
  assert.equal(get('validCpf("529.982.247-24")'), false);
  assert.equal(get('validCpf("123")'), false);
});

test("luhn valida número de cartão", () => {
  const { get } = load();
  assert.equal(get('luhn("4111111111111111")'), true);
  assert.equal(get('luhn("4111111111111112")'), false);
  assert.equal(get('luhn("411111111111")'), false);
});

test("cardBrand identifica a bandeira", () => {
  const { get } = load();
  assert.equal(get('cardBrand("4111111111111111")'), "Visa");
  assert.equal(get('cardBrand("5555555555554444")'), "Mastercard");
  assert.equal(get('cardBrand("378282246310005")'), "Amex");
  assert.equal(get('cardBrand("6362970000457013")'), "Elo");
  assert.equal(get('cardBrand("9999")'), "Cartão");
});

test("máscaras de CEP, cartão, validade e CPF", () => {
  const { get } = load();
  assert.equal(get('maskCep("01310100")'), "01310-100");
  assert.equal(get('maskCep("0131")'), "0131");
  assert.equal(get('maskCard("4111111111111111")'), "4111 1111 1111 1111");
  assert.equal(get('maskExp("1228")'), "12/28");
  assert.equal(get('maskCpf("52998224725")'), "529.982.247-25");
  assert.equal(get('maskCpf("5299")'), "529.9");
});

test("esc escapa HTML e trata nulo", () => {
  const { get } = load();
  assert.equal(get("esc(\"<a href=\\\"x\\\">&'</a>\")"), "&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;");
  assert.equal(get("esc(null)"), "");
  assert.equal(get("esc(undefined)"), "");
});

test("norm ignora acentos e maiúsculas", () => {
  const { get } = load();
  assert.equal(get('norm("Calçados ÁÉÍ")'), "calcados aei");
});

test("store devolve o padrão com JSON inválido e guarda valores", () => {
  const { get, localStorage } = load();
  localStorage.setItem("x", "{quebrado");
  assert.deepEqual(get('store.get("x", [1])'), [1]);
  assert.equal(get('store.get("ausente", "pad")'), "pad");
  get('store.set("y", { a: 1 })');
  assert.equal(localStorage.getItem("y"), '{"a":1}');
  assert.equal(get('store.get("y", null).a'), 1);
});

test("bus chama todos os ouvintes com o assunto", () => {
  const { get } = load();
  get("globalThis.seen = []; bus.on((t) => seen.push('a:' + t)); bus.on((t) => seen.push('b:' + t)); bus.emit('cart');");
  assert.deepEqual(get("seen"), ["a:cart", "b:cart"]);
});
