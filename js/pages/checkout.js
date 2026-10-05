// ===== Checkout =====
function pageCheckout() {
  const user = auth.current();
  if (!user) { location.hash = "#/conta?next=checkout"; return; }
  if (!cart.items().length) { location.hash = "#/carrinho"; return; }

  // Endereço inicial: o salvo na conta ou o CEP usado no cálculo de frete
  const ship = shipping.get();
  let a = user.address || {};
  if (ship?.cep && onlyDigits(ship.cep) !== onlyDigits(a.cep)) a = { cep: ship.cep, street: ship.street, district: ship.district, city: ship.city, uf: ship.uf };
  let method = "card";

  app.innerHTML = `
    <h1>Finalizar compra</h1>
    <div class="layout-2">
      <form id="checkout" novalidate>
        <div class="card mb">
          <div class="step-title"><b>1</b><h3 style="margin:0">Entrega</h3></div>
          <div class="row">
            <div class="field"><label>Nome de quem recebe</label><input name="recipient" autocomplete="name" value="${esc(user.name)}"><span class="err"></span></div>
            <div class="field"><label>CPF</label><input name="cpf" inputmode="numeric" placeholder="000.000.000-00"><span class="err"></span></div>
          </div>
          <div class="row">
            <div class="field"><label>CEP</label><input name="cep" inputmode="numeric" autocomplete="postal-code" placeholder="00000-000" value="${esc(a.cep || "")}"><span class="err"></span></div>
            <div class="field"><label>&nbsp;</label><span class="muted small" id="cep-status" style="padding-top:12px"></span></div>
          </div>
          <div class="row-addr">
            <div class="field"><label>Rua</label><input name="street" autocomplete="address-line1" value="${esc(a.street || "")}"><span class="err"></span></div>
            <div class="field"><label>Número</label><input name="number" value="${esc(a.number || "")}"><span class="err"></span></div>
          </div>
          <div class="row">
            <div class="field"><label>Complemento</label><input name="extra" value="${esc(a.extra || "")}"></div>
            <div class="field"><label>Bairro</label><input name="district" value="${esc(a.district || "")}"><span class="err"></span></div>
          </div>
          <div class="row">
            <div class="field"><label>Cidade</label><input name="city" value="${esc(a.city || "")}"><span class="err"></span></div>
            <div class="field"><label>UF</label><input name="uf" maxlength="2" value="${esc(a.uf || "")}"><span class="err"></span></div>
          </div>
          <div id="ship-area"></div>
        </div>

        <div class="card">
          <div class="step-title"><b>2</b><h3 style="margin:0">Pagamento</h3></div>
          <div class="pay-tabs">
            <button type="button" class="pay-tab active" data-m="card">💳 Cartão</button>
            <button type="button" class="pay-tab" data-m="pix">⚡ Pix</button>
            <button type="button" class="pay-tab" data-m="boleto">📄 Boleto</button>
          </div>
          <div id="pay-area"></div>
          <p class="err" id="pay-err" style="color:var(--error);min-height:1em"></p>
          <button class="btn accent block" id="pay-btn"></button>
          <div class="secure">🔒 Seus dados são protegidos</div>
        </div>
      </form>
      <div class="sticky">
        <div class="card mb">
          ${cart.items().map((i) => { const p = findProduct(i.id); return `<div class="mini-item">${thumb(p)}<span>${esc(p.name)}<br><span class="muted">${i.qty}× · Tam. ${i.size}</span></span><span>${brl(p.price * i.qty)}</span></div>`; }).join("")}
          <a href="#/carrinho" class="link">Editar sacola</a>
        </div>
        <div class="card" id="summary"></div>
      </div>
    </div>`;

  const f = $("#checkout");
  maskInput(f.cpf, maskCpf);

  const payAreaHTML = () => {
    if (method === "card") return `
      <p class="notice">Pagamento com cartão <strong>simulado</strong>: nenhum valor é cobrado e os dados não são salvos.
      Aprovado: <code>4111 1111 1111 1111</code> · Recusado: <code>4000 0000 0000 0002</code></p>
      <div class="field"><label>Número do cartão</label><div class="card-input"><input name="cardNumber" inputmode="numeric" autocomplete="cc-number" placeholder="0000 0000 0000 0000"><span id="brand"></span></div><span class="err"></span></div>
      <div class="field"><label>Nome impresso no cartão</label><input name="cardName" autocomplete="cc-name"><span class="err"></span></div>
      <div class="row">
        <div class="field"><label>Validade</label><input name="cardExp" inputmode="numeric" autocomplete="cc-exp" placeholder="MM/AA"><span class="err"></span></div>
        <div class="field"><label>CVV</label><input name="cardCvv" inputmode="numeric" autocomplete="cc-csc" maxlength="4" placeholder="123"><span class="err"></span></div>
      </div>
      <div class="field"><label>Parcelas</label><select name="installments" id="installments"></select></div>`;
    if (method === "pix") return `
      <div class="pix-box">
        <p>Pagando com Pix você ganha <strong>${CONFIG.pixDiscount * 100}% de desconto</strong>.</p>
        <p style="font-size:1.4rem;font-weight:700;margin:4px 0" id="pix-amount"></p>
        <p class="muted small" style="margin:0">O QR Code é gerado após confirmar o pedido. Aprovação imediata.</p>
      </div>`;
    return `
      <div class="pix-box">
        <p>O boleto vence em <strong>3 dias úteis</strong>. O pedido é enviado após a compensação (até 2 dias úteis).</p>
        <p style="font-size:1.4rem;font-weight:700;margin:4px 0" id="boleto-amount"></p>
      </div>`;
  };

  const refresh = () => {
    const t = cart.totals();
    $("#summary").innerHTML = summaryHTML();
    bindSummary($("#summary"), refresh);

    const s = shipping.get();
    const cepOk = s?.cep && onlyDigits(s.cep) === onlyDigits(f.cep.value);
    $("#ship-area").innerHTML = cepOk
      ? `<h4 class="sub">Forma de entrega</h4>${shipOptionsHTML(shipping.quotes(s, t.subtotal - t.discount), s.option)}`
      : `<p class="muted small" style="margin:4px 0 0">Informe o CEP para ver as opções de entrega.</p>`;
    $$('#ship-area input[name="ship-opt"]').forEach((r) => r.addEventListener("change", () => { shipping.set({ ...shipping.get(), option: r.value }); refresh(); }));

    const total = method === "pix" ? t.total * (1 - CONFIG.pixDiscount) : t.total;
    $("#pay-btn").textContent = `${method === "card" ? "Pagar" : "Confirmar pedido"} ${brl(total)}`;
    if ($("#pix-amount")) $("#pix-amount").textContent = brl(total);
    if ($("#boleto-amount")) $("#boleto-amount").textContent = brl(total);
    const sel = $("#installments");
    if (sel) {
      const prev = sel.value || "1";
      // Parcela mínima de R$ 20
      const max = Math.max(1, Math.min(CONFIG.maxInstallments, Math.floor(t.total / 20)));
      sel.innerHTML = Array.from({ length: max }, (_, k) => k + 1).map((n) => `<option value="${n}">${n}x de ${brl(t.total / n)} sem juros</option>`).join("");
      sel.value = Number(prev) <= max ? prev : "1";
    }
  };

  const renderPay = () => {
    $("#pay-area").innerHTML = payAreaHTML();
    maskInput(f.cardNumber, maskCard);
    maskInput(f.cardExp, maskExp);
    maskInput(f.cardCvv, onlyDigits);
    f.cardNumber?.addEventListener("input", () => {
      const n = onlyDigits(f.cardNumber.value);
      $("#brand").textContent = n.length >= 2 ? cardBrand(n) : "";
    });
    refresh();
  };

  $$(".pay-tab").forEach((b) => (b.onclick = () => {
    method = b.dataset.m;
    $$(".pay-tab").forEach((x) => x.classList.toggle("active", x === b));
    $("#pay-err").textContent = "";
    renderPay();
  }));

  bindCepAutofill(f, refresh);
  renderPay();
  // Se o CEP salvo ainda não tem frete calculado, calcula agora
  if (onlyDigits(a.cep).length === 8 && onlyDigits(shipping.get()?.cep) !== onlyDigits(a.cep)) {
    shipping.lookup(a.cep).then(refresh).catch(() => {});
  }

  f.addEventListener("submit", (e) => { e.preventDefault(); submitOrder(f, method); });
}

function submitOrder(f, method) {
  const errors = {};
  if (f.recipient.value.trim().split(/\s+/).length < 2) errors.recipient = "Informe nome e sobrenome.";
  if (!validCpf(f.cpf.value)) errors.cpf = "CPF inválido.";
  if (onlyDigits(f.cep.value).length !== 8) errors.cep = "CEP inválido.";
  if (f.street.value.trim().length < 3) errors.street = "Informe a rua.";
  if (!f.number.value.trim()) errors.number = "Informe o número.";
  if (!f.district.value.trim()) errors.district = "Informe o bairro.";
  if (!f.city.value.trim()) errors.city = "Informe a cidade.";
  if (!UF_REGION[f.uf.value.trim().toUpperCase()]) errors.uf = "UF inválida.";

  let cardInfo = null;
  if (method === "card") {
    const num = onlyDigits(f.cardNumber.value);
    const [mm, yy] = f.cardExp.value.split("/").map(Number);
    const expEnd = new Date(2000 + yy, mm, 1); // primeiro dia do mês seguinte
    if (!luhn(num)) errors.cardNumber = "Número de cartão inválido.";
    if (f.cardName.value.trim().split(/\s+/).length < 2) errors.cardName = "Informe o nome como está no cartão.";
    if (!mm || mm > 12 || !yy || expEnd <= new Date()) errors.cardExp = "Validade inválida.";
    if (!/^\d{3,4}$/.test(f.cardCvv.value)) errors.cardCvv = "CVV inválido.";
    cardInfo = { brand: cardBrand(num), last4: num.slice(-4), installments: Number(f.installments.value), declined: num === "4000000000000002" };
  }

  showErrors(f, errors);
  const err = (msg) => { $("#pay-err").textContent = msg; };
  if (Object.keys(errors).length) {
    err("Revise os campos destacados.");
    $(".invalid", f)?.focus();
    return;
  }

  const t = cart.totals();
  const s = shipping.get();
  if (!t.quote || onlyDigits(s?.cep) !== onlyDigits(f.cep.value)) return err("Aguarde o cálculo do frete para o seu CEP.");
  for (const i of cart.items()) {
    const left = stock.get(i.id, i.size);
    if (i.qty > left) return err(`${findProduct(i.id).name} (${i.size}): só temos ${left} em estoque. Ajuste sua sacola.`);
  }
  err("");

  const btn = $("#pay-btn");
  btn.disabled = true;
  btn.textContent = method === "card" ? "Processando pagamento..." : "Gerando pedido...";

  // Simula a comunicação com o gateway de pagamento
  setTimeout(() => {
    if (cardInfo?.declined) {
      btn.disabled = false;
      btn.textContent = `Pagar ${brl(t.total)}`;
      return err("Pagamento recusado pelo emissor do cartão. Tente outro cartão ou pague com Pix.");
    }
    const now = Date.now();
    const pixOff = method === "pix" ? t.total * CONFIG.pixDiscount : 0;
    const labels = {
      card: cardInfo && `${cardInfo.brand} final ${cardInfo.last4} · ${cardInfo.installments}x`,
      pix: `Pix (${CONFIG.pixDiscount * 100}% off)`,
      boleto: "Boleto bancário",
    };
    const address = readAddress(f);
    const order = {
      id: String(now).slice(-8),
      email: auth.current().email,
      date: now,
      items: cart.items().map((i) => { const p = findProduct(i.id); return { id: p.id, name: p.name, size: i.size, qty: i.qty, price: p.price }; }),
      subtotal: t.subtotal,
      discount: t.discount,
      coupon: t.code,
      pixDiscount: pixOff,
      shipping: { name: t.quote.name, price: t.quote.price, days: t.quote.days, eta: addBusinessDays(t.quote.days).getTime() },
      total: t.total - pixOff,
      method,
      methodLabel: labels[method],
      status: method === "card" ? "Pago" : "Aguardando pagamento",
      history: [{ status: "Aguardando pagamento", date: now }, ...(method === "card" ? [{ status: "Pago", date: now }] : [])],
      recipient: f.recipient.value.trim(),
      address,
    };

    order.items.forEach((i) => stock.change(i.id, i.size, -i.qty));
    orders.save([...orders.all(), order]);
    auth.update({ address });
    store.set(KEYS.coupon, null);
    cart.clear();
    location.hash = `#/pedido/${order.id}`;
  }, 1400);
}

