// ===== Pedido (confirmação e acompanhamento) =====
function pageOrder(id) {
  const user = auth.current();
  const order = orders.find(id);
  if (!order || !user || (order.email !== user.email && user.role !== "admin")) return pageNotFound();

  const ship = orderShipping(order);
  const paid = !["Aguardando pagamento", "Cancelado"].includes(order.status);
  const cancelled = order.status === "Cancelado";
  const stepIdx = STATUS_FLOW.indexOf(order.status);
  const when = (s) => (order.history || []).filter((h) => h.status === s).pop()?.date;
  const pix = pixPayload(order.total, `TRAMA${order.id}`);
  const boletoLine = `23793.38128 60000.${order.id.slice(0, 6)} 00000.${order.id.slice(2, 8)} 1 9${String(Math.round(order.total * 100)).padStart(10, "0")}`;
  const a = order.address;
  const awaitingPay = order.status === "Aguardando pagamento";

  app.innerHTML = `
    <div class="order-page">
      <div class="center">
        <div class="success-icon ${cancelled ? "cancel" : paid ? "" : "pending"}">${cancelled ? "✕" : paid ? "✓" : "⏳"}</div>
        <h1>${cancelled ? "Pedido cancelado" : paid ? "Pedido confirmado!" : "Pedido recebido!"}</h1>
        <p class="muted">Pedido <strong>#${order.id}</strong> · ${fmtDate(order.date)}</p>
      </div>

      ${!cancelled ? `
      <div class="card mb">
        <h3>Acompanhe seu pedido</h3>
        <ol class="timeline">
          ${STATUS_FLOW.map((s, i) => `
            <li class="${i < stepIdx ? "done" : i === stepIdx ? "current" : ""}">
              <span class="dot"></span>
              <div><strong>${s}</strong>${when(s) ? `<br><small class="muted">${fmtDate(when(s))}</small>` : ""}</div>
            </li>`).join("")}
        </ol>
        ${order.tracking ? `<p class="small" style="margin:16px 0 0">Código de rastreio: <strong>${order.tracking}</strong> · <a class="link" href="https://rastreamento.correios.com.br/app/index.php" target="_blank" rel="noopener">Rastrear nos Correios</a></p>` : ""}
        ${ship.eta && order.status !== "Entregue" ? `<p class="small muted" style="margin:8px 0 0">Previsão de entrega: <strong>${fmtDay(ship.eta)}</strong> (${esc(ship.name)})</p>` : ""}
      </div>` : ""}

      ${order.method === "pix" && awaitingPay ? `
        <div class="card mb center">
          <h3>Pague com Pix</h3>
          <p class="muted small">Abra o app do seu banco, escolha Pix › Ler QR Code, ou use o Pix Copia e Cola.</p>
          <div id="qr" class="qr"></div>
          <p style="font-size:1.3rem;font-weight:700;margin:8px 0">${brl(order.total)}</p>
          <div class="pix-code" id="pay-code">${pix}</div>
          <button class="btn small" id="copy">Copiar código Pix</button>
          ${CONFIG.pixKey ? `<p class="muted small" style="margin-top:12px">Assim que o pagamento for identificado, o status do pedido será atualizado.</p>`
            : `<p class="notice" style="margin-top:16px;text-align:left">Modo demonstração: configure sua chave Pix em <code>config.js</code> para receber pagamentos reais.</p>
               <button class="btn ghost small" id="simulate">Simular pagamento</button>`}
        </div>` : ""}

      ${order.method === "boleto" && awaitingPay ? `
        <div class="card mb center">
          <h3>Boleto bancário</h3>
          <p class="muted small">Vencimento em 3 dias úteis: ${fmtDay(addBusinessDays(3))}</p>
          <div class="pix-code" id="pay-code">${boletoLine}</div>
          <button class="btn small" id="copy">Copiar linha digitável</button>
          <button class="btn ghost small" id="simulate">Simular pagamento</button>
        </div>` : ""}

      <div class="card mb">
        <h3>Itens</h3>
        ${order.items.map((i) => { const p = findProduct(i.id); return `<div class="mini-item">${p ? thumb(p) : "<span></span>"}<span>${esc(i.name)}<br><span class="muted">${i.qty}× · Tam. ${i.size}</span></span><span>${brl(i.price * i.qty)}</span></div>`; }).join("")}
        <div class="summary-line" style="margin-top:12px"><span>Subtotal</span><span>${brl(order.subtotal)}</span></div>
        ${order.discount ? `<div class="summary-line" style="color:var(--ok)"><span>Cupom ${esc(order.coupon || "")}</span><span>- ${brl(order.discount)}</span></div>` : ""}
        ${order.pixDiscount ? `<div class="summary-line" style="color:var(--ok)"><span>Desconto Pix</span><span>- ${brl(order.pixDiscount)}</span></div>` : ""}
        <div class="summary-line"><span>Frete · ${esc(ship.name)}</span><span>${ship.price ? brl(ship.price) : "Grátis"}</span></div>
        <div class="summary-line total"><span>Total</span><span>${brl(order.total)}</span></div>
      </div>

      <div class="row mb">
        <div class="card">
          <h3>Entrega</h3>
          <p class="muted small" style="margin:0">${esc(order.recipient)}<br>${esc(a.street)}${a.number ? ", " + esc(a.number) : ""}${a.extra ? " - " + esc(a.extra) : ""}<br>${a.district ? esc(a.district) + " · " : ""}${esc(a.city)} - ${esc(a.uf)}<br>CEP ${esc(a.cep)}</p>
        </div>
        <div class="card">
          <h3>Pagamento</h3>
          <p class="muted small" style="margin:0">${esc(order.methodLabel)}<br>Status: <span class="status ${statusClass(order.status)}">${order.status}</span></p>
        </div>
      </div>

      <div class="order-actions no-print">
        <a href="#/catalogo" class="btn accent">Continuar comprando</a>
        <a href="#/conta" class="btn ghost">Meus pedidos</a>
        <button class="btn ghost" id="print">Imprimir comprovante</button>
        ${canCancel(order) && order.email === user.email ? `<button class="btn ghost danger" id="cancel">Cancelar pedido</button>` : ""}
      </div>
    </div>`;

  if ($("#qr") && window.QRCode) new QRCode($("#qr"), { text: pix, width: 200, height: 200, correctLevel: QRCode.CorrectLevel.M });
  $("#copy")?.addEventListener("click", () => {
    navigator.clipboard?.writeText($("#pay-code").textContent).then(() => toast("Copiado!"), () => toast("Não foi possível copiar."));
  });
  $("#simulate")?.addEventListener("click", () => {
    orders.setStatus(id, "Pago");
    toast("Pagamento confirmado!");
    pageOrder(id);
  });
  $("#print").addEventListener("click", () => window.print());
  $("#cancel")?.addEventListener("click", () => {
    if (!confirm("Tem certeza que deseja cancelar este pedido?")) return;
    orders.setStatus(id, "Cancelado");
    toast(order.status === "Pago" ? "Pedido cancelado. O estorno será feito em até 7 dias úteis." : "Pedido cancelado.");
    pageOrder(id);
  });
}

