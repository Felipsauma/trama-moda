// ===== Página de Finalizar Compra (Checkout) =====
function pageCheckout() {
  setTitle("Finalizar compra");

  const user = auth.current();
  if (!user) {
    location.hash = "#/conta?next=checkout";
    return;
  }

  const items = cart.items();
  if (!items.length) {
    location.hash = "#/carrinho";
    return;
  }

  const ship = shipping.get();
  let a = user.address || {};
  if (ship?.cep && onlyDigits(ship.cep) !== onlyDigits(a.cep)) {
    a = { cep: ship.cep, street: ship.street, district: ship.district, city: ship.city, uf: ship.uf };
  }

  // Estado do fluxo de checkout
  let currentStep = 1; // 1 = Entrega, 2 = Pagamento
  let paymentMethod = "card";
  let deliveryData = {
    recipient: user.name || "",
    cpf: user.cpf || "",
    cep: a.cep || "",
    street: a.street || "",
    number: a.number || "",
    extra: a.extra || "",
    district: a.district || "",
    city: a.city || "",
    uf: a.uf || "",
  };

  const render = () => {
    const t = cart.totals();
    const pixDiscount = t.total * CONFIG.pixDiscount;

    app.innerHTML = `
      <h1>Finalizar compra</h1>

      <div class="checkout-layout">
        <div class="checkout-steps">
          <!-- ETAPA 1: ENTREGA -->
          <div class="checkout-step-card" id="step-1-card">
            <div class="step-header">
              <div class="step-title-wrap">
                <div class="step-num">1</div>
                <h3>Entrega</h3>
              </div>
              ${currentStep === 2 ? `
                <button type="button" class="btn tertiary small" id="btn-edit-delivery">Alterar</button>
              ` : ""}
            </div>

            ${currentStep === 2 ? `
              <div class="step-summary-box">
                <div><strong>Destinatário:</strong> ${esc(deliveryData.recipient)} (CPF: ${esc(deliveryData.cpf)})</div>
                <div><strong>Endereço:</strong> ${esc(deliveryData.street)}, ${esc(deliveryData.number)}${deliveryData.extra ? ` - ${esc(deliveryData.extra)}` : ""}, ${esc(deliveryData.district)}, ${esc(deliveryData.city)} - ${esc(deliveryData.uf)}, CEP ${esc(deliveryData.cep)}</div>
                <div><strong>Frete:</strong> ${t.quote ? `${esc(t.quote.name)} (${t.quote.price ? brl(t.quote.price) : "Grátis"})` : "Padrão"}</div>
              </div>
            ` : `
              <form id="form-delivery" novalidate style="display: grid; gap: var(--e-3);">
                <div class="form-grid-2">
                  <div class="field">
                    <label for="del-recipient">Nome de quem recebe</label>
                    <input id="del-recipient" name="recipient" class="input" autocomplete="name" value="${esc(deliveryData.recipient)}">
                    <p class="err"></p>
                  </div>
                  <div class="field">
                    <label for="del-cpf">CPF</label>
                    <input id="del-cpf" name="cpf" class="input" inputmode="numeric" placeholder="000.000.000-00" value="${esc(deliveryData.cpf)}">
                    <p class="err"></p>
                  </div>
                </div>

                <div class="form-grid-2">
                  <div class="field">
                    <label for="del-cep">CEP</label>
                    <input id="del-cep" name="cep" class="input" inputmode="numeric" autocomplete="postal-code" placeholder="00000-000" value="${esc(deliveryData.cep)}">
                    <p class="err"></p>
                  </div>
                  <div class="field" style="display: flex; align-items: flex-end; padding-bottom: 8px;">
                    <span class="muted small" id="del-cep-status"></span>
                  </div>
                </div>

                <div class="form-grid-3">
                  <div class="field">
                    <label for="del-street">Rua</label>
                    <input id="del-street" name="street" class="input" autocomplete="address-line1" value="${esc(deliveryData.street)}">
                    <p class="err"></p>
                  </div>
                  <div class="field">
                    <label for="del-number">Número</label>
                    <input id="del-number" name="number" class="input" value="${esc(deliveryData.number)}">
                    <p class="err"></p>
                  </div>
                </div>

                <div class="form-grid-2">
                  <div class="field">
                    <label for="del-extra">Complemento (opcional)</label>
                    <input id="del-extra" name="extra" class="input" value="${esc(deliveryData.extra)}">
                  </div>
                  <div class="field">
                    <label for="del-district">Bairro</label>
                    <input id="del-district" name="district" class="input" value="${esc(deliveryData.district)}">
                    <p class="err"></p>
                  </div>
                </div>

                <div class="form-grid-2">
                  <div class="field">
                    <label for="del-city">Cidade</label>
                    <input id="del-city" name="city" class="input" value="${esc(deliveryData.city)}">
                    <p class="err"></p>
                  </div>
                  <div class="field">
                    <label for="del-uf">UF</label>
                    <input id="del-uf" name="uf" class="input" maxlength="2" value="${esc(deliveryData.uf)}" style="text-transform: uppercase;">
                    <p class="err"></p>
                  </div>
                </div>

                <!-- Opções de Entrega -->
                <div id="del-shipping-options" style="margin-top: var(--e-2);"></div>

                <button type="submit" class="btn" style="margin-top: var(--e-3);">Continuar para o pagamento</button>
              </form>
            `}
          </div>

          <!-- ETAPA 2: PAGAMENTO -->
          <div class="checkout-step-card ${currentStep === 1 ? "disabled" : ""}" id="step-2-card">
            <div class="step-header">
              <div class="step-title-wrap">
                <div class="step-num">2</div>
                <h3>Pagamento</h3>
              </div>
            </div>

            ${currentStep === 2 ? `
              <div class="pay-methods-tabs">
                <button type="button" class="pay-tab-btn ${paymentMethod === "card" ? "active" : ""}" data-method="card">Cartão</button>
                <button type="button" class="pay-tab-btn ${paymentMethod === "pix" ? "active" : ""}" data-method="pix">Pix</button>
                <button type="button" class="pay-tab-btn ${paymentMethod === "boleto" ? "active" : ""}" data-method="boleto">Boleto</button>
              </div>

              <form id="form-payment" novalidate style="display: grid; gap: var(--e-3);">
                ${paymentMethod === "card" ? `
                  <div class="field">
                    <label for="card-num">Número do cartão</label>
                    <div style="display: flex; align-items: center;">
                      <input id="card-num" name="cardNumber" class="input" inputmode="numeric" placeholder="0000 0000 0000 0000">
                      <span class="card-brand-badge" id="card-brand-label"></span>
                    </div>
                    <p class="err"></p>
                  </div>

                  <div class="field">
                    <label for="card-name">Nome impresso no cartão</label>
                    <input id="card-name" name="cardName" class="input" autocomplete="cc-name" placeholder="Como no cartão">
                    <p class="err"></p>
                  </div>

                  <div class="form-grid-2">
                    <div class="field">
                      <label for="card-exp">Validade</label>
                      <input id="card-exp" name="cardExp" class="input" placeholder="MM/AA" maxlength="5">
                      <p class="err"></p>
                    </div>
                    <div class="field">
                      <label for="card-cvv">Código de segurança (CVV)</label>
                      <input id="card-cvv" name="cardCvv" class="input" inputmode="numeric" placeholder="123" maxlength="4">
                      <p class="err"></p>
                    </div>
                  </div>

                  <div class="field">
                    <label for="card-inst">Parcelamento</label>
                    <select id="card-inst" name="installments" class="select">
                      ${[1, 2, 3].map((n) => {
                        const val = t.total / n;
                        return `<option value="${n}">${n}x de ${brl(val)} sem juros</option>`;
                      }).join("")}
                    </select>
                  </div>

                  <p class="notice" style="margin-top: var(--e-2);">Modo de demonstração: use qualquer cartão de teste. Para simular cartão recusado, digite 4000 0000 0000 0002.</p>
                ` : paymentMethod === "pix" ? `
                  <div class="panel" style="border-radius: var(--raio); text-align: center;">
                    <p>Pague com Pix e ganhe <strong>${CONFIG.pixDiscount * 100}% de desconto</strong> imediato.</p>
                    <p class="nums" style="font-size: var(--t-25); font-weight: 700; margin-top: var(--e-2);">${brl(t.total - pixDiscount)}</p>
                    <p class="muted small">O QR Code e o código Pix serão gerados na próxima tela.</p>
                  </div>
                ` : `
                  <div class="panel" style="border-radius: var(--raio); text-align: center;">
                    <p>O boleto bancário será gerado após a confirmação do pedido.</p>
                    <p class="muted small">Prazo de compensação: até 3 dias úteis após o pagamento.</p>
                  </div>
                `}

                <p class="err" id="checkout-global-err" style="margin: 0;"></p>

                <button type="submit" class="btn block" id="btn-submit-order" style="margin-top: var(--e-3);">
                  ${paymentMethod === "card"
                    ? `Pagar ${brl(t.total)}`
                    : paymentMethod === "pix"
                    ? `Confirmar pedido ${brl(t.total - pixDiscount)}`
                    : `Confirmar pedido ${brl(t.total)}`}
                </button>
              </form>
            ` : ""}
          </div>
        </div>

        <!-- Barra lateral com itens e resumo -->
        <div class="checkout-summary-wrap">
          <div class="panel">
            <h3 style="margin-bottom: var(--e-4);">Itens na sacola</h3>
            <div class="checkout-mini-items">
              ${items.map((i) => {
                const p = findProduct(i.id);
                if (!p) return "";
                return `
                  <div class="checkout-mini-row">
                    ${thumb(p, "sm")}
                    <div class="checkout-mini-row-info">
                      <strong>${esc(p.name)}</strong>
                      <span class="muted small">Tam. ${esc(i.size)} · Qtd: ${i.qty}</span>
                    </div>
                    <span class="nums"><strong>${brl(p.price * i.qty)}</strong></span>
                  </div>
                `;
              }).join("")}
            </div>
            <a href="#/carrinho" class="link small">Editar sacola</a>
          </div>

          <div class="panel" id="checkout-summary-box">
            ${summaryHTML({ button: false, calc: false })}
          </div>
        </div>
      </div>
    `;

    // Interações Etapa 1
    if (currentStep === 1) {
      const formDel = $("#form-delivery");
      maskInput(formDel.cpf, maskCpf);
      maskInput(formDel.cep, maskCep);

      const renderShippingOptions = () => {
        const s = shipping.get();
        if (!s?.cep || onlyDigits(s.cep) !== onlyDigits(formDel.cep.value)) return;
        const quotes = shipping.quotes(s, t.subtotal - t.discount);
        $("#del-shipping-options").innerHTML = `
          <label class="label">Forma de envio</label>
          ${shipOptionsHTML(quotes, s.option)}
        `;
        $$('input[name="ship-opt"]', formDel).forEach((r) => {
          r.addEventListener("change", () => {
            shipping.set({ ...shipping.get(), option: r.value });
            render();
          });
        });
      };
      renderShippingOptions();

      formDel.cep.addEventListener("input", debounce(async () => {
        const raw = onlyDigits(formDel.cep.value);
        if (raw.length === 8) {
          $("#del-cep-status").textContent = "Buscando endereço...";
          try {
            const res = await shipping.lookup(formDel.cep.value);
            if (res.street) formDel.street.value = res.street;
            if (res.district) formDel.district.value = res.district;
            if (res.city) formDel.city.value = res.city;
            if (res.uf) formDel.uf.value = res.uf;
            $("#del-cep-status").textContent = "";
            renderShippingOptions();
          } catch (err) {
            $("#del-cep-status").textContent = err.message;
          }
        }
      }, 300));

      formDel.addEventListener("submit", (e) => {
        e.preventDefault();
        const vals = {
          recipient: formDel.recipient.value,
          cpf: formDel.cpf.value,
          cep: formDel.cep.value,
          street: formDel.street.value,
          number: formDel.number.value,
          extra: formDel.extra.value,
          district: formDel.district.value,
          city: formDel.city.value,
          uf: formDel.uf.value,
        };

        const errors = validateDelivery(vals);
        showErrors(formDel, errors);

        if (Object.keys(errors).length > 0) {
          $(".invalid", formDel)?.focus();
          return;
        }

        deliveryData = vals;
        currentStep = 2;
        render();
      });
    }

    // Interações Etapa 2
    if (currentStep === 2) {
      $("#btn-edit-delivery").onclick = () => {
        currentStep = 1;
        render();
      };

      $$(".pay-tab-btn").forEach((btn) => {
        btn.onclick = () => {
          paymentMethod = btn.dataset.method;
          render();
        };
      });

      const formPay = $("#form-payment");
      if (paymentMethod === "card") {
        maskInput(formPay.cardNumber, maskCard);
        maskInput(formPay.cardExp, maskExp);
        formPay.cardNumber.addEventListener("input", () => {
          const brand = cardBrand(onlyDigits(formPay.cardNumber.value));
          $("#card-brand-label").textContent = brand || "";
        });
      }

      formPay.addEventListener("submit", (e) => {
        e.preventDefault();
        const globalErr = $("#checkout-global-err");
        globalErr.textContent = "";

        let cardData = null;
        if (paymentMethod === "card") {
          const cardVals = {
            cardNumber: formPay.cardNumber.value,
            cardName: formPay.cardName.value,
            cardExp: formPay.cardExp.value,
            cardCvv: formPay.cardCvv.value,
          };
          const cardErrors = validateCard(cardVals);
          showErrors(formPay, cardErrors);
          if (Object.keys(cardErrors).length > 0) {
            $(".invalid", formPay)?.focus();
            return;
          }
          const num = onlyDigits(cardVals.cardNumber);
          cardData = {
            brand: cardBrand(num),
            last4: num.slice(-4),
            installments: Number(formPay.installments.value),
            declined: num === "4000000000000002",
          };
        }

        // Validação de frete e estoque antes de concluir
        const currTotals = cart.totals();
        if (!currTotals.quote) {
          globalErr.textContent = "Aguarde o cálculo do frete para o seu CEP.";
          return;
        }
        for (const item of cart.items()) {
          const left = stock.get(item.id, item.size);
          if (item.qty > left) {
            globalErr.textContent = `${findProduct(item.id).name} (${item.size}): estoque insuficiente (${left} disponíveis).`;
            return;
          }
        }

        const submitBtn = $("#btn-submit-order");
        submitBtn.disabled = true;
        submitBtn.textContent = paymentMethod === "card" ? "Processando pagamento..." : "Gerando pedido...";

        setTimeout(() => {
          if (cardData?.declined) {
            submitBtn.disabled = false;
            submitBtn.textContent = `Pagar ${brl(currTotals.total)}`;
            globalErr.textContent = "Pagamento recusado pelo emissor do cartão. Tente outro cartão ou pague com Pix.";
            return;
          }

          const now = Date.now();
          const pDiscount = paymentMethod === "pix" ? currTotals.total * CONFIG.pixDiscount : 0;
          const labels = {
            card: cardData && `${cardData.brand} final ${cardData.last4} · ${cardData.installments}x`,
            pix: `Pix (${CONFIG.pixDiscount * 100}% off)`,
            boleto: "Boleto bancário",
          };

          const giftData = gift.get();
          const order = {
            id: String(now).slice(-8),
            email: user.email,
            date: now,
            items: cart.items().map((i) => {
              const p = findProduct(i.id);
              return { id: p.id, name: p.name, size: i.size, qty: i.qty, price: p.price };
            }),
            subtotal: currTotals.subtotal,
            discount: currTotals.discount,
            coupon: currTotals.code,
            gift: giftData.on ? { price: CONFIG.giftWrapPrice, message: giftData.message } : null,
            pixDiscount: pDiscount,
            shipping: {
              name: currTotals.quote.name,
              price: currTotals.quote.price,
              days: currTotals.quote.days,
              eta: addBusinessDays(currTotals.quote.days).getTime(),
            },
            total: currTotals.total - pDiscount,
            method: paymentMethod,
            methodLabel: labels[paymentMethod],
            status: paymentMethod === "card" ? "Pago" : "Aguardando pagamento",
            history: [
              { status: "Aguardando pagamento", date: now },
              ...(paymentMethod === "card" ? [{ status: "Pago", date: now }] : []),
            ],
            recipient: deliveryData.recipient,
            cpf: deliveryData.cpf,
            address: {
              cep: deliveryData.cep,
              street: deliveryData.street,
              number: deliveryData.number,
              extra: deliveryData.extra,
              district: deliveryData.district,
              city: deliveryData.city,
              uf: deliveryData.uf,
            },
          };

          // Baixa estoque
          order.items.forEach((i) => stock.change(i.id, i.size, -i.qty));
          orders.save([...orders.all(), order]);
          auth.update({ address: order.address, cpf: order.cpf });
          coupon.remove();
          cart.clear();
          location.hash = `#/pedido/${order.id}`;
        }, 1000);
      });
    }
  };

  render();
}
