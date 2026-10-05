// ===== Página de Conta e Autenticação =====
function pageAccount(params) {
  const user = auth.current();
  if (!user) return pageAuth(params);

  setTitle("Minha conta");

  const tab = params.get("aba") || "pedidos";
  const userOrders = orders.ofUser(user.email);
  const userWaitlist = waitlist.ofUser(user.email);
  const a = user.address || {};

  app.innerHTML = `
    <div class="account-layout">
      <!-- Barra lateral de navegação -->
      <aside class="account-sidebar">
        <a href="#/conta?aba=pedidos" class="account-nav-btn ${tab === "pedidos" ? "active" : ""}">
          ${icon("sacola")} Pedidos (${userOrders.length})
        </a>
        <a href="#/conta?aba=dados" class="account-nav-btn ${tab === "dados" ? "active" : ""}">
          ${icon("conta")} Dados e endereço
        </a>
        <a href="#/conta?aba=avise-me" class="account-nav-btn ${tab === "avise-me" ? "active" : ""}">
          ${icon("filtro")} Avise-me (${userWaitlist.length})
        </a>
        <a href="#/conta?aba=senha" class="account-nav-btn ${tab === "senha" ? "active" : ""}">
          ${icon("check")} Alterar senha
        </a>

        ${user.role === "admin" ? `
          <a href="#/admin" class="account-nav-btn" style="color: var(--acafrao);">
            Painel admin
          </a>
        ` : ""}

        <button type="button" class="account-nav-btn" id="btn-logout" style="color: var(--pitanga); text-align: left;">
          ${icon("fechar")} Sair da conta
        </button>
      </aside>

      <!-- Conteúdo da aba selecionada -->
      <div class="account-content" id="account-tab-content"></div>
    </div>
  `;

  const content = $("#account-tab-content");

  // Botão sair
  $("#btn-logout")?.addEventListener("click", () => {
    auth.logout();
    toast("Você saiu da sua conta.");
    location.hash = "#/";
  });

  // ABA 1: PEDIDOS
  if (tab === "pedidos") {
    content.innerHTML = `
      <h2>Meus pedidos</h2>
      ${userOrders.length ? `
        <div class="account-orders-list">
          ${userOrders.map((o) => `
            <div class="account-order-card">
              <div class="account-order-top">
                <div>
                  <strong>Pedido #${o.id}</strong>
                  <div class="muted small">${fmtDate(o.date)}, ${esc(o.methodLabel)}</div>
                </div>
                <span class="tag ${o.status === "Cancelado" ? "out" : o.status === "Entregue" ? "ok" : "dark"}">
                  ${o.status}
                </span>
              </div>

              <div class="account-order-thumbs">
                ${o.items.map((i) => {
                  const p = findProduct(i.id);
                  return p ? thumb(p, "sm") : "";
                }).join("")}
              </div>

              <div class="account-order-bottom">
                <span class="nums"><strong>${brl(o.total)}</strong></span>
                <div style="display: flex; gap: var(--e-2);">
                  <button type="button" class="btn secondary small" data-reorder="${o.id}">
                    Comprar de novo
                  </button>
                  <a href="#/pedido/${o.id}" class="btn tertiary small">
                    Ver detalhes
                  </a>
                </div>
              </div>
            </div>
          `).join("")}
        </div>
      ` : `
        <div class="empty">
          ${icon("sacola")}
          <h3>Você ainda não fez nenhum pedido</h3>
          <p>Quando você fizer uma compra na Trama, ela aparecerá aqui.</p>
          <a href="#/catalogo" class="btn">Explorar catálogo</a>
        </div>
      `}
    `;

    content.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-reorder]");
      if (!btn) return;
      const res = orders.reorder(btn.dataset.reorder);
      if (res.missing.length) {
        toast(res.missing.map((m) => `${m.name} (${m.size}) esgotado`).join(", "));
      }
      openDrawer();
    });
  }

  // ABA 2: DADOS E ENDEREÇO
  if (tab === "dados") {
    content.innerHTML = `
      <h2>Dados pessoais e endereço</h2>
      <form class="panel" id="form-account-profile" novalidate style="border-radius: var(--raio); display: grid; gap: var(--e-3); max-width: 600px;">
        <div class="field">
          <label for="acc-name">Nome completo</label>
          <input id="acc-name" name="name" class="input" value="${esc(user.name)}">
          <p class="err"></p>
        </div>

        <div class="field">
          <label for="acc-cpf">CPF</label>
          <input id="acc-cpf" name="cpf" class="input" inputmode="numeric" placeholder="000.000.000-00" value="${esc(user.cpf || "")}">
          <p class="err"></p>
        </div>

        <h3 style="margin-top: var(--e-4);">Endereço de entrega</h3>

        <div class="form-grid-2">
          <div class="field">
            <label for="acc-cep">CEP</label>
            <input id="acc-cep" name="cep" class="input" inputmode="numeric" placeholder="00000-000" value="${esc(a.cep || "")}">
            <p class="err"></p>
          </div>
          <div class="field" style="display: flex; align-items: flex-end; padding-bottom: 8px;">
            <span class="muted small" id="acc-cep-status"></span>
          </div>
        </div>

        <div class="form-grid-3">
          <div class="field">
            <label for="acc-street">Rua</label>
            <input id="acc-street" name="street" class="input" value="${esc(a.street || "")}">
            <p class="err"></p>
          </div>
          <div class="field">
            <label for="acc-number">Número</label>
            <input id="acc-number" name="number" class="input" value="${esc(a.number || "")}">
            <p class="err"></p>
          </div>
        </div>

        <div class="form-grid-2">
          <div class="field">
            <label for="acc-extra">Complemento</label>
            <input id="acc-extra" name="extra" class="input" value="${esc(a.extra || "")}">
          </div>
          <div class="field">
            <label for="acc-district">Bairro</label>
            <input id="acc-district" name="district" class="input" value="${esc(a.district || "")}">
          </div>
        </div>

        <div class="form-grid-2">
          <div class="field">
            <label for="acc-city">Cidade</label>
            <input id="acc-city" name="city" class="input" value="${esc(a.city || "")}">
          </div>
          <div class="field">
            <label for="acc-uf">UF</label>
            <input id="acc-uf" name="uf" class="input" maxlength="2" value="${esc(a.uf || "")}" style="text-transform: uppercase;">
          </div>
        </div>

        <button type="submit" class="btn" style="margin-top: var(--e-3); width: fit-content;">
          Salvar alterações
        </button>
      </form>
    `;

    const fProf = $("#form-account-profile");
    maskInput(fProf.cpf, maskCpf);
    maskInput(fProf.cep, maskCep);

    fProf.cep.addEventListener("input", debounce(async () => {
      if (onlyDigits(fProf.cep.value).length === 8) {
        $("#acc-cep-status").textContent = "Buscando...";
        try {
          const res = await shipping.lookup(fProf.cep.value);
          if (res.street) fProf.street.value = res.street;
          if (res.district) fProf.district.value = res.district;
          if (res.city) fProf.city.value = res.city;
          if (res.uf) fProf.uf.value = res.uf;
          $("#acc-cep-status").textContent = "";
        } catch (err) {
          $("#acc-cep-status").textContent = err.message;
        }
      }
    }, 300));

    fProf.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = fProf.name.value.trim();
      const cpf = fProf.cpf.value.trim();
      const errors = {};
      if (name.split(/\s+/).filter(Boolean).length < 2) errors.name = "Informe nome e sobrenome.";
      if (cpf && !validCpf(cpf)) errors.cpf = "CPF inválido.";
      showErrors(fProf, errors);
      if (Object.keys(errors).length) return;

      const address = {
        cep: fProf.cep.value,
        street: fProf.street.value,
        number: fProf.number.value,
        extra: fProf.extra.value,
        district: fProf.district.value,
        city: fProf.city.value,
        uf: fProf.uf.value,
      };

      auth.update({ name, cpf, address });
      toast("Dados salvos com sucesso.");
    });
  }

  // ABA 3: AVISE-ME
  if (tab === "avise-me") {
    content.innerHTML = `
      <h2>Alertas de reposição</h2>
      ${userWaitlist.length ? `
        <div class="account-orders-list">
          ${userWaitlist.map((w) => {
            const p = findProduct(w.id);
            if (!p) return "";
            return `
              <div class="account-order-card">
                <div style="display: flex; gap: var(--e-4); align-items: center;">
                  <a href="#/produto/${p.id}">${thumb(p, "sm")}</a>
                  <div style="flex: 1;">
                    <a href="#/produto/${p.id}" class="link" style="font-weight: 600;">${esc(p.name)}</a>
                    <div class="muted small">Tamanho: ${esc(w.size)}</div>
                    <div style="margin-top: 4px;">
                      ${w.available ? `
                        <span class="tag ok">${icon("check")} Disponível agora!</span>
                      ` : `
                        <span class="tag dark">Aguardando reposição</span>
                      `}
                    </div>
                  </div>
                  <div>
                    ${w.available ? `
                      <a href="#/produto/${p.id}" class="btn small">Ver peça</a>
                    ` : ""}
                    <button type="button" class="btn tertiary small" data-cancel-wait="${p.id}:${w.size}">
                      Cancelar aviso
                    </button>
                  </div>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      ` : `
        <div class="empty">
          ${icon("filtro")}
          <h3>Nenhum aviso de reposição ativado</h3>
          <p>Quando um tamanho que você quer estiver esgotado, clique em "Avise-me quando chegar" na página do produto.</p>
          <a href="#/catalogo" class="btn">Explorar catálogo</a>
        </div>
      `}
    `;

    content.addEventListener("click", (e) => {
      const b = e.target.closest("[data-cancel-wait]");
      if (!b) return;
      const [pid, sz] = b.dataset.cancelWait.split(":");
      waitlist.remove(pid, sz, user.email);
      toast("Aviso cancelado.");
      pageAccount(params);
    });
  }

  // ABA 4: SENHA
  if (tab === "senha") {
    content.innerHTML = `
      <h2>Alterar senha</h2>
      <form class="panel" id="form-account-pass" novalidate style="border-radius: var(--raio); display: grid; gap: var(--e-3); max-width: 480px;">
        <div class="field">
          <label for="acc-old-pass">Senha atual</label>
          <input id="acc-old-pass" name="oldPass" type="password" class="input">
          <p class="err"></p>
        </div>
        <div class="field">
          <label for="acc-new-pass">Nova senha (mínimo 6 caracteres)</label>
          <input id="acc-new-pass" name="newPass" type="password" class="input">
          <p class="err"></p>
        </div>
        <div class="field">
          <label for="acc-confirm-pass">Confirmar nova senha</label>
          <input id="acc-confirm-pass" name="confirmPass" type="password" class="input">
          <p class="err"></p>
        </div>
        <button type="submit" class="btn" style="margin-top: var(--e-3); width: fit-content;">
          Atualizar senha
        </button>
      </form>
    `;

    const fPass = $("#form-account-pass");
    fPass.addEventListener("submit", (e) => {
      e.preventDefault();
      const oldPass = fPass.oldPass.value;
      const newPass = fPass.newPass.value;
      const confirmPass = fPass.confirmPass.value;
      const errors = {};

      if (!oldPass) errors.oldPass = "Informe a senha atual.";
      if (newPass.length < 6) errors.newPass = "A nova senha precisa ter ao menos 6 caracteres.";
      if (newPass !== confirmPass) errors.confirmPass = "As senhas não coincidem.";

      showErrors(fPass, errors);
      if (Object.keys(errors).length) return;

      try {
        auth.changePassword(oldPass, newPass);
        fPass.reset();
        toast("Senha alterada com sucesso!");
      } catch (err) {
        showErrors(fPass, { oldPass: err.message });
      }
    });
  }
}

// ===== Tela de Autenticação (Entrar ou Criar conta) =====
function pageAuth(params) {
  setTitle("Entrar ou cadastrar");
  const next = params.get("next");
  let mode = "login"; // "login" ou "register"

  const render = () => {
    app.innerHTML = `
      <div class="auth-card">
        <div class="auth-header">
          <h1>${mode === "login" ? "Entrar na Trama" : "Criar sua conta"}</h1>
          <p class="muted small">${next ? "Entre para continuar com sua compra." : "Acesse seus pedidos e informações salvas."}</p>
        </div>

        <div class="auth-tabs" role="tablist">
          <button type="button" class="auth-tab-btn ${mode === "login" ? "active" : ""}" role="tab" id="tab-auth-login">
            Entrar
          </button>
          <button type="button" class="auth-tab-btn ${mode === "register" ? "active" : ""}" role="tab" id="tab-auth-reg">
            Criar conta
          </button>
        </div>

        <form id="form-auth" novalidate style="display: grid; gap: var(--e-3);">
          ${mode === "register" ? `
            <div class="field">
              <label for="auth-name">Nome completo</label>
              <input id="auth-name" name="name" class="input" autocomplete="name">
              <p class="err"></p>
            </div>
          ` : ""}

          <div class="field">
            <label for="auth-email">E-mail</label>
            <input id="auth-email" name="email" type="email" class="input" autocomplete="email">
            <p class="err"></p>
          </div>

          <div class="field">
            <label for="auth-password">Senha</label>
            <div class="password-wrap">
              <input id="auth-password" name="password" type="password" class="input" autocomplete="${mode === "login" ? "current-password" : "new-password"}">
              <button type="button" class="password-toggle-btn" id="btn-toggle-pass">Mostrar</button>
            </div>
            <p class="err"></p>
          </div>

          ${mode === "register" ? `
            <div class="field">
              <label for="auth-confirm">Confirmar senha</label>
              <input id="auth-confirm" name="confirm" type="password" class="input" autocomplete="new-password">
              <p class="err"></p>
            </div>
          ` : ""}

          <p class="err" id="auth-global-err" style="margin: 0;"></p>

          <button type="submit" class="btn block" style="margin-top: var(--e-3);">
            ${mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>
      </div>
    `;

    $("#tab-auth-login").onclick = () => { mode = "login"; render(); };
    $("#tab-auth-reg").onclick = () => { mode = "register"; render(); };

    const f = $("#form-auth");
    const passInput = $("#auth-password");
    $("#btn-toggle-pass").onclick = (e) => {
      const isPass = passInput.type === "password";
      passInput.type = isPass ? "text" : "password";
      e.target.textContent = isPass ? "Ocultar" : "Mostrar";
    };

    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const errBox = $("#auth-global-err");
      errBox.textContent = "";

      const errors = {};
      const email = f.email.value.trim();
      const password = f.password.value;

      if (mode === "register") {
        const name = f.name.value.trim();
        if (name.split(/\s+/).filter(Boolean).length < 2) errors.name = "Informe nome e sobrenome.";
        if (f.confirm.value !== password) errors.confirm = "As senhas não coincidem.";
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "E-mail inválido.";
      if (password.length < 6) errors.password = "A senha precisa ter ao menos 6 caracteres.";

      showErrors(f, errors);
      if (Object.keys(errors).length) return;

      try {
        if (mode === "login") {
          await auth.login(email, password);
          toast("Bem-vindo(a) de volta!");
        } else {
          await auth.register({ name: f.name.value.trim(), email, password });
          toast("Conta criada com sucesso!");
        }
        location.hash = next ? `#/${next}` : "#/conta";
      } catch (err) {
        errBox.textContent = err.message;
      }
    });
  };

  render();
}
