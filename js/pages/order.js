// ===== Página de Pedido (Confirmação e Acompanhamento) =====
function pageOrder(id) {
  const user = auth.current();
  const order = orders.find(id);
  if (!order || !user || (order.email !== user.email && user.role !== "admin")) {
    return pageNotFound();
  }

  setTitle(`Pedido #${order.id}`);

  const ship = orderShipping(order);
  const paid = !["Aguardando pagamento", "Cancelado"].includes(order.status);
  const cancelled = order.status === "Cancelado";
  const stepIdx = STATUS_FLOW.indexOf(order.status);
  const when = (s) => (order.history || []).filter((h) => h.status === s).pop()?.date;

  const pix = pixPayload(order.total, `TRAMA${order.id}`);
  const boletoLine = `23793.38128 60000.${order.id.slice(0, 6)} 00000.${order.id.slice(2, 8)} 1 9${String(Math.round(order.total * 100)).padStart(10, "0")}`;
  const awaitingPay = order.status === "Aguardando pagamento";

  app.innerHTML = `
    <div class="order-container">
      <!-- Status Hero -->
      <div class="order-hero-status">
        <div class="order-icon-badge ${cancelled ? "cancelled" : paid ? "paid" : ""}">
          ${cancelled ? icon("fechar") : paid ? icon("check") : icon("caminhao")}
        </div>
        <h1>${cancelled ? "Pedido cancelado" : paid ? "Pedido confirmado!" : "Pedido recebido!"}</h1>
        <p class="muted">
          Pedido <strong>#${order.id}</strong> — Realizado em ${fmtDate(order.date)}
        </p>
      </div>

      <!-- Linha do tempo: fio com nós -->
      ${!cancelled ? `
        <div class="order-timeline-card">
          <h3 style="margin-bottom: var(--e-4);">Acompanhe a entrega</h3>
          <ol class="order-timeline" aria-label="Progresso do pedido">
            ${STATUS_FLOW.map((s, i) => {
              const isDone = i < stepIdx;
              const isCurrent = i === stepIdx;
              return `
                <li class="timeline-step ${isDone ? "done" : isCurrent ? "current" : ""}" ${isCurrent ? 'aria-current="step"' : ""}>
                  <div class="timeline-node">
                    ${isDone ? icon("check") : ""}
                  </div>
                  <div>
                    <span class="timeline-label">${s}</span>
                    ${when(s) ? `<div class="timeline-date">${fmtDay(when(s))}</div>` : ""}
                  </div>
                </li>
              `;
            }).join("")}
          </ol>

          ${order.tracking ? `
            <p class="small" style="margin-top: var(--e-4);">
              Código de rastreio: <strong>${order.tracking}</strong> — 
              <a href="https://rastreamento.correios.com.br/app/index.php" target="_blank" rel="noopener" class="link">Rastrear encomenda</a>
            </p>
          ` : ""}

          ${ship.eta && order.status !== "Entregue" ? `
            <p class="small muted" style="margin-top: var(--e-2);">
              Previsão de entrega: <strong>${fmtDay(ship.eta)}</strong> via ${esc(ship.name || "Correios")}
            </p>
          ` : ""}
        </div>
      ` : ""}

      <!-- Bloco de Pagamento Pix -->
      ${order.method === "pix" && awaitingPay ? `
        <div class="payment-action-card">
          <h3>Pague com Pix</h3>
          <p class="muted small">Escaneie o QR Code no aplicativo do seu banco ou use o Pix Copia e Cola:</p>

          <div class="qr-box" id="pix-qr-container"></div>
          <div class="nums" style="font-size: var(--t-25); font-weight: 700;">${brl(order.total)}</div>

          <div class="code-snippet" id="pix-code-text">${pix}</div>
          <button type="button" class="btn small" id="btn-copy-pix">Copiar código Pix</button>

          <div style="margin-top: var(--e-3);">
            <button type="button" class="btn secondary small" id="btn-sim-pay">Simular pagamento Pix</button>
          </div>
        </div>
      ` : ""}

      <!-- Bloco de Pagamento Boleto -->
      ${order.method === "boleto" && awaitingPay ? `
        <div class="payment-action-card">
          <h3>Boleto bancário</h3>
          <p class="muted small">Vencimento em 3 dias úteis: ${fmtDay(addBusinessDays(3))}</p>

          <div class="code-snippet">${boletoLine}</div>
          <button type="button" class="btn small" id="btn-copy-boleto">Copiar linha digitável</button>

          <div style="margin-top: var(--e-3);">
            <button type="button" class="btn secondary small" id="btn-sim-pay">Simular compensação de boleto</button>
          </div>
        </div>
      ` : ""}

      <!-- Detalhes do Pedido e Peças -->
      <div class="order-details-card">
        <h3>Itens do pedido</h3>
        <div class="order-items-table">
          ${order.items.map((i) => {
            const p = findProduct(i.id);
            return `
              <div class="order-item-line">
                <a href="#/produto/${i.id}">${p ? thumb(p, "sm") : ""}</a>
                <div>
                  <a href="#/produto/${i.id}" class="link" style="font-weight: 600;">${esc(i.name)}</a>
                  <div class="muted small">Tam. ${esc(i.size)}, Qtd: ${i.qty}</div>
                </div>
                <span class="nums"><strong>${brl(i.price * i.qty)}</strong></span>
              </div>
            `;
          }).join("")}
        </div>

        <!-- Embalagem para presente no pedido -->
        ${order.gift ? `
          <div class="notice" style="margin: 0;">
            <p><strong>${icon("presente")} Embalagem para presente inclusa (${brl(order.gift.price || CONFIG.giftWrapPrice)})</strong></p>
            ${order.gift.message ? `<p class="muted small" style="margin-top: 4px;">Mensagem: "${esc(order.gift.message)}"</p>` : ""}
          </div>
        ` : ""}

        <!-- Linhas de Totais -->
        <div style="display: grid; gap: var(--e-2);">
          <div class="summary-line"><span>Subtotal</span><span class="nums">${brl(order.subtotal)}</span></div>
          ${order.discount ? `<div class="summary-line ok"><span>Cupom ${esc(order.coupon)}</span><span class="nums">- ${brl(order.discount)}</span></div>` : ""}
          ${order.pixDiscount ? `<div class="summary-line ok"><span>Desconto Pix (5%)</span><span class="nums">- ${brl(order.pixDiscount)}</span></div>` : ""}
          ${order.gift ? `<div class="summary-line"><span>Embalagem para presente</span><span class="nums">${brl(order.gift.price || CONFIG.giftWrapPrice)}</span></div>` : ""}
          <div class="summary-line"><span>Frete (${esc(ship.name)})</span><span class="nums">${ship.price ? brl(ship.price) : "Grátis"}</span></div>
          <div class="summary-line total" style="border-top: var(--fio-fino); padding-top: var(--e-2);">
            <span>Total</span><span class="nums">${brl(order.total)}</span>
          </div>
        </div>

        <hr style="margin: 0;">

        <!-- Endereço e Pagamento -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: var(--e-4);">
          <div>
            <strong>Endereço de entrega</strong>
            <p class="muted small" style="margin: 4px 0 0;">
              ${esc(order.recipient)}<br>
              ${esc(order.address.street)}, ${esc(order.address.number)}${order.address.extra ? ` - ${esc(order.address.extra)}` : ""}<br>
              ${esc(order.address.district)}, ${esc(order.address.city)} - ${esc(order.address.uf)}<br>
              CEP ${esc(order.address.cep)}
            </p>
          </div>
          <div>
            <strong>Forma de pagamento</strong>
            <p class="muted small" style="margin: 4px 0 0;">
              ${esc(order.methodLabel)}<br>
              Status: <strong>${order.status}</strong>
            </p>
          </div>
        </div>

        <!-- Ações do rodapé do pedido -->
        <div class="order-foot-actions">
          <div style="display: flex; gap: var(--e-2); flex-wrap: wrap;">
            <button type="button" class="btn secondary small" id="btn-reorder">
              Comprar de novo
            </button>
            <button type="button" class="btn ghost small" onclick="window.print()">
              Imprimir comprovante
            </button>
          </div>
          ${canCancel(order) ? `
            <button type="button" class="btn danger small" id="btn-cancel-order">
              Cancelar pedido
            </button>
          ` : ""}
        </div>
      </div>
    </div>
  `;

  // QR Code Pix
  if (order.method === "pix" && awaitingPay && typeof QRCode !== "undefined") {
    new QRCode($("#pix-qr-container"), {
      text: pix,
      width: 180,
      height: 180,
      colorDark: "#1B2559",
      colorLight: "#FFFFFF",
      correctLevel: QRCode.CorrectLevel.M,
    });
  }

  // Copiar código Pix
  $("#btn-copy-pix")?.addEventListener("click", () => {
    navigator.clipboard.writeText(pix).then(() => toast("Código Pix copiado!"))
      .catch(() => toast("Não foi possível copiar o código."));
  });

  // Copiar código Boleto
  $("#btn-copy-boleto")?.addEventListener("click", () => {
    navigator.clipboard.writeText(boletoLine).then(() => toast("Linha digitável copiada!"))
      .catch(() => toast("Não foi possível copiar a linha."));
  });

  // Simular pagamento
  $("#btn-sim-pay")?.addEventListener("click", () => {
    orders.setStatus(order.id, "Pago");
    toast("Pagamento confirmado!");
    pageOrder(order.id);
  });

  // Comprar de novo
  $("#btn-reorder")?.addEventListener("click", () => {
    const res = orders.reorder(order.id);
    if (res.missing.length) {
      const msg = res.missing.map((m) => `${m.name} (${m.size}) está esgotado`).join(", ");
      toast(msg);
    }
    openDrawer();
  });

  // Cancelar pedido com modal acessível
  $("#btn-cancel-order")?.addEventListener("click", () => {
    const modalHtml = `
      <h2>Cancelar pedido #${order.id}</h2>
      <p>Tem certeza de que deseja cancelar este pedido? Os itens retornarão ao estoque da loja.</p>
      <div style="display: flex; gap: var(--e-3); justify-content: flex-end; margin-top: var(--e-5);">
        <button type="button" class="btn secondary small" id="modal-cancel-dismiss">Voltar</button>
        <button type="button" class="btn danger small" id="modal-cancel-confirm">Sim, cancelar pedido</button>
      </div>
    `;
    openModal(modalHtml);

    $("#modal-cancel-dismiss").onclick = closeModal;
    $("#modal-cancel-confirm").onclick = () => {
      orders.setStatus(order.id, "Cancelado");
      closeModal();
      toast("Pedido cancelado.");
      pageOrder(order.id);
    };
  });
}
