function pageAccount(params) {
  const user = auth.current();
  if (!user) return pageAuth(params);

  const tab = params.get("aba") || "pedidos";
  const list = orders.ofUser(user.email);
  const a = user.address || {};
  app.innerHTML = `
    <div class="account-head">
      <div><span class="eyebrow">Minha conta</span><h1 style="margin:4px 0 0">Olá, ${esc(user.name.split(" ")[0])}!</h1><span class="muted">${esc(user.email)}</span></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${user.role === "admin" ? `<a href="#/admin" class="btn accent">Painel admin</a>` : ""}
        <button class="btn ghost" id="logout">Sair</button>
      </div>
    </div>
    <div class="tabs">
      <a href="#/conta?aba=pedidos" class="${tab === "pedidos" ? "active" : ""}">Pedidos (${list.length})</a>
      <a href="#/conta?aba=dados" class="${tab === "dados" ? "active" : ""}">Dados e endereço</a>
      <a href="#/conta?aba=senha" class="${tab === "senha" ? "active" : ""}">Senha</a>
    </div>
    <div id="tab-content"></div>`;

  const content = $("#tab-content");

  if (tab === "pedidos") {
    content.innerHTML = list.length ? list.map((o) => `
      <a class="order" href="#/pedido/${o.id}">
        <div class="order-head">
          <strong>Pedido #${o.id}</strong>
          <span class="status ${statusClass(o.status)}">${o.status}</span>
        </div>
        <div class="muted small">${fmtDate(o.date)} · ${esc(o.methodLabel)}${o.tracking ? ` · Rastreio ${o.tracking}` : ""}</div>
        <div class="order-thumbs">${o.items.map((i) => { const p = findProduct(i.id); return p ? thumb(p) : ""; }).join("")}</div>
        <div class="order-head" style="margin:0"><span class="small">${o.items.reduce((n, i) => n + i.qty, 0)} item(ns)</span><strong>${brl(o.total)}</strong></div>
      </a>`).join("") : `<div class="empty"><p>Você ainda não fez nenhum pedido.</p><a class="btn" href="#/catalogo">Começar a comprar</a></div>`;
  }

  if (tab === "dados") {
    content.innerHTML = `
      <form class="card narrow" id="profile" novalidate>
        <h3>Dados pessoais</h3>
        <div class="field"><label>Nome completo</label><input name="name" value="${esc(user.name)}"><span class="err"></span></div>
        <h3 style="margin-top:24px">Endereço principal</h3>
        <div class="row">
          <div class="field"><label>CEP</label><input name="cep" inputmode="numeric" placeholder="00000-000" value="${esc(a.cep || "")}"><span class="err"></span></div>
          <div class="field"><label>&nbsp;</label><span class="muted small" id="cep-status" style="padding-top:12px"></span></div>
        </div>
        <div class="row-addr">
          <div class="field"><label>Rua</label><input name="street" value="${esc(a.street || "")}"><span class="err"></span></div>
          <div class="field"><label>Número</label><input name="number" value="${esc(a.number || "")}"><span class="err"></span></div>
        </div>
        <div class="row">
          <div class="field"><label>Complemento</label><input name="extra" value="${esc(a.extra || "")}"></div>
          <div class="field"><label>Bairro</label><input name="district" value="${esc(a.district || "")}"></div>
        </div>
        <div class="row">
          <div class="field"><label>Cidade</label><input name="city" value="${esc(a.city || "")}"></div>
          <div class="field"><label>UF</label><input name="uf" maxlength="2" value="${esc(a.uf || "")}"></div>
        </div>
        <button class="btn block">Salvar alterações</button>
      </form>`;
    const f = $("#profile");
    bindCepAutofill(f);
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      if (f.name.value.trim().split(/\s+/).length < 2) return showErrors(f, { name: "Informe nome e sobrenome." });
      showErrors(f, {});
      auth.update({ name: f.name.value.trim(), address: readAddress(f) });
      toast("Dados salvos!");
    });
  }

  if (tab === "senha") {
    content.innerHTML = `
      <form class="card narrow" id="pass-form" novalidate>
        <h3>Alterar senha</h3>
        <div class="field"><label>Senha atual</label><input name="current" type="password" autocomplete="current-password"><span class="err"></span></div>
        <div class="field"><label>Nova senha</label><input name="next" type="password" autocomplete="new-password"><span class="err"></span></div>
        <div class="field"><label>Confirmar nova senha</label><input name="confirm" type="password" autocomplete="new-password"><span class="err"></span></div>
        <button class="btn block">Alterar senha</button>
      </form>`;
    const f = $("#pass-form");
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const errors = {};
      if (f.next.value.length < 6) errors.next = "A senha precisa ter ao menos 6 caracteres.";
      if (f.confirm.value !== f.next.value) errors.confirm = "As senhas não coincidem.";
      showErrors(f, errors);
      if (Object.keys(errors).length) return;
      try {
        await auth.changePassword(f.current.value, f.next.value);
        f.reset();
        toast("Senha alterada com sucesso!");
      } catch (err) { showErrors(f, { current: err.message }); }
    });
  }

  $("#logout").onclick = () => { auth.logout(); toast("Você saiu da sua conta."); location.hash = "#/"; };
}

function readAddress(f) {
  return {
    cep: f.cep.value, street: f.street.value.trim(), number: f.number.value.trim(), extra: f.extra.value.trim(),
    district: f.district.value.trim(), city: f.city.value.trim(), uf: f.uf.value.trim().toUpperCase(),
  };
}

// Preenche o endereço automaticamente ao digitar o CEP (ViaCEP)
function bindCepAutofill(f, onDone) {
  let last = onlyDigits(f.cep.value);
  maskInput(f.cep, maskCep);
  f.cep.addEventListener("input", async () => {
    const cep = onlyDigits(f.cep.value);
    if (cep.length !== 8 || cep === last) return;
    last = cep;
    const status = $("#cep-status");
    if (status) status.textContent = "Buscando endereço...";
    try {
      const addr = await shipping.lookup(cep);
      if (!addr.offline) {
        f.street.value = addr.street || "";
        f.district.value = addr.district || "";
        f.city.value = addr.city || "";
        f.uf.value = addr.uf || "";
        (addr.street ? f.number : f.street).focus();
      }
      if (status) status.textContent = addr.offline ? "Sem conexão: preencha o endereço manualmente." : "✓ Endereço encontrado";
      showErrors(f, {});
    } catch (err) {
      if (status) status.textContent = "";
      showErrors(f, { cep: err.message });
    }
    onDone?.();
  });
}

function pageAuth(params) {
  const next = params.get("next");
  let mode = params.get("modo") === "cadastro" ? "register" : "login";

  const render = () => {
    app.innerHTML = `
      <div class="auth">
        <h1>${mode === "login" ? "Entrar" : "Criar conta"}</h1>
        <div class="card">
          ${next ? `<p class="notice">Entre ou crie uma conta para continuar.</p>` : ""}
          <div class="tabs">
            <button data-mode="login" class="${mode === "login" ? "active" : ""}">Entrar</button>
            <button data-mode="register" class="${mode === "register" ? "active" : ""}">Criar conta</button>
          </div>
          <form id="auth-form" novalidate>
            ${mode === "register" ? `<div class="field"><label>Nome completo</label><input name="name" autocomplete="name"><span class="err"></span></div>` : ""}
            <div class="field"><label>E-mail</label><input name="email" type="email" autocomplete="email"><span class="err"></span></div>
            <div class="field"><label>Senha</label>
              <div class="pass-wrap"><input name="password" type="password" autocomplete="${mode === "login" ? "current-password" : "new-password"}"><button type="button" class="link" id="show-pass">Mostrar</button></div>
              <span class="err"></span>
            </div>
            ${mode === "register" ? `<div class="field"><label>Confirmar senha</label><input name="confirm" type="password" autocomplete="new-password"><span class="err"></span></div>
              <label class="check small" style="margin-bottom:14px"><input type="checkbox" name="news" checked> Quero receber novidades e ofertas por e-mail</label>` : ""}
            <p class="err" id="form-err" style="color:var(--error);min-height:1em"></p>
            <button class="btn accent block">${mode === "login" ? "Entrar" : "Criar conta"}</button>
          </form>
        </div>
      </div>`;

    $$(".tabs button").forEach((b) => (b.onclick = () => { mode = b.dataset.mode; render(); }));
    $("#show-pass").onclick = (e) => {
      const input = $("#auth-form").password;
      input.type = input.type === "password" ? "text" : "password";
      e.target.textContent = input.type === "password" ? "Mostrar" : "Ocultar";
    };
    $("#auth-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target;
      const errors = {};
      if (mode === "register" && f.name.value.trim().split(/\s+/).length < 2) errors.name = "Informe nome e sobrenome.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.value.trim())) errors.email = "E-mail inválido.";
      if (f.password.value.length < 6) errors.password = "A senha precisa ter ao menos 6 caracteres.";
      if (mode === "register" && f.confirm.value !== f.password.value) errors.confirm = "As senhas não coincidem.";
      showErrors(f, errors);
      if (Object.keys(errors).length) return;

      try {
        if (mode === "login") await auth.login(f.email.value, f.password.value);
        else await auth.register({ name: f.name.value, email: f.email.value, password: f.password.value });
        toast(mode === "login" ? "Bem-vindo(a) de volta!" : "Conta criada com sucesso!");
        location.hash = next ? `#/${next}` : "#/conta";
      } catch (err) {
        $("#form-err").textContent = err.message;
      }
    });
  };
  render();
}

