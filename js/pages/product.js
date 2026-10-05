// ===== Página de Produto =====
function pageProduct(id) {
  const p = findProduct(id);
  if (!p || p.hidden) return pageNotFound();
  recent.add(p.id);
  setTitle(p.name);

  const off = discountPct(p);
  const user = auth.current();

  // Seleção de tamanho: se tiver medidas salvas, sugere o tamanho
  let userMeasures = measures.get();
  let rec = recommendSize(p, userMeasures);
  let size = null;
  if (p.sizes.length === 1) {
    size = p.sizes[0];
  } else if (rec && p.sizes.includes(rec.size)) {
    size = rec.size;
  }

  let qty = 1;
  let activeImageIndex = 0;

  const getStockStatus = (s) => {
    if (!s) return "";
    const n = stock.get(p.id, s);
    if (n === 0) return `<span class="product-stock-status out">Esgotado neste tamanho</span>`;
    if (n <= 2) return `<span class="product-stock-status low">Últimas ${n} ${n === 1 ? "unidade" : "unidades"}!</span>`;
    return `<span class="product-stock-status ok">Em estoque</span>`;
  };

  const getWaitlistStatus = (s, email) => {
    if (!s) return false;
    return waitlist.has(p.id, s, email);
  };

  app.innerHTML = `
    <!-- Migalha de pão -->
    <nav class="product-breadcrumb" aria-label="Navegação estrutural">
      <a href="#/">Início</a>
      <span aria-hidden="true">/</span>
      <a href="#/catalogo?cat=${p.cat}">${CATEGORIES[p.cat]}</a>
      <span aria-hidden="true">/</span>
      <span aria-current="page">${esc(p.name)}</span>
    </nav>

    <!-- Layout principal -->
    <div class="product-layout" data-cat="${p.cat}">
      <!-- Galeria Desktop (Mosaico) -->
      <div class="product-gallery-desktop">
        ${p.images.map((src, i) => `
          <div class="gallery-mosaic-item" data-img-idx="${i}" role="button" aria-label="Ampliar foto ${i + 1} de ${esc(p.name)}" tabindex="0">
            <img src="${src}" alt="Foto ${i + 1} de ${esc(p.name)}">
          </div>
        `).join("")}
      </div>

      <!-- Galeria Mobile (Carrossel com contador) -->
      <div class="product-gallery-mobile">
        <div class="mobile-carousel" id="mobile-carousel">
          ${p.images.map((src, i) => `
            <div class="mobile-carousel-slide" data-img-idx="${i}">
              <img src="${src}" alt="Foto ${i + 1} de ${esc(p.name)}">
            </div>
          `).join("")}
        </div>
        <div class="mobile-carousel-counter" id="mobile-counter">1 / ${p.images.length}</div>
      </div>

      <!-- Painel de Compra Fixo -->
      <div class="product-panel">
        ${p.tag ? `<span class="tag dark product-tag">${esc(p.tag)}</span>` : ""}
        <h1 class="product-title">${esc(p.name)}</h1>

        <!-- Avaliação resumo topo -->
        ${reviews.of(p.id).length ? `
          <a href="#reviews" class="rating" id="goto-reviews" aria-label="Ir para avaliações">
            ${stars(reviews.avg(p.id))}
            <span class="muted small">${reviews.of(p.id).length} ${reviews.of(p.id).length === 1 ? "avaliação" : "avaliações"}</span>
          </a>
        ` : ""}

        <!-- Preços -->
        <div class="product-prices">
          <span class="product-price-now nums">${brl(p.price)}</span>
          ${p.oldPrice ? `
            <span class="product-price-old nums">${brl(p.oldPrice)}</span>
            <span class="tag sale nums">-${off}%</span>
          ` : ""}
        </div>
        <p class="product-installments">
          3x de <strong class="nums">${brl(p.price / 3)}</strong> sem juros ou <strong class="nums">${brl(p.price * (1 - CONFIG.pixDiscount))}</strong> no Pix
        </p>

        <hr style="margin: 0;">

        <!-- Seletor de Tamanhos -->
        <div class="product-size-section">
          <div class="product-size-header">
            <span class="label" id="label-size-selected">
              Tamanho${size ? `: ${size}` : ""}
            </span>
            ${p.cat !== "acessorios" ? `
              <button type="button" class="btn tertiary small size-guide-btn" id="btn-size-guide">
                ${icon("regua")} Descobrir meu tamanho
              </button>
            ` : ""}
          </div>

          <div id="measure-rec-note">
            ${rec && p.sizes.includes(rec.size) ? `
              <span class="size-measure-badge">
                ${icon("check")} Pelas suas medidas: ${rec.size}
              </span>
            ` : ""}
          </div>

          <div class="sizes" id="product-sizes" role="group" aria-label="Tamanhos disponíveis">
            ${p.sizes.map((s) => {
              const out = stock.get(p.id, s) === 0;
              const isSelected = s === size;
              return `
                <button type="button" class="size ${isSelected ? "active" : ""} ${out ? "out" : ""}"
                  data-size="${s}"
                  aria-pressed="${isSelected}"
                  aria-label="${s}${out ? ", esgotado" : ""}">
                  ${s}
                </button>
              `;
            }).join("")}
          </div>

          <div class="product-stock-status" id="stock-feedback">
            ${getStockStatus(size)}
          </div>
          <p class="size-error" id="size-error-msg" hidden></p>
        </div>

        <!-- Seção de Compra ou Avise-me -->
        <div id="buy-action-area"></div>

        <!-- Ações secundárias: Favoritar e Compartilhar -->
        <div class="product-share-row">
          <button type="button" class="btn ghost small fav-big ${favs.has(p.id) ? "on" : ""}" data-fav="${p.id}" id="product-fav-btn" aria-label="Salvar nos favoritos">
            ${icon("coracao")} <span id="fav-btn-label">${favs.has(p.id) ? "Favoritado" : "Favoritar"}</span>
          </button>
          <button type="button" class="btn ghost small" id="btn-share" aria-label="Compartilhar peça">
            ${icon("compartilhar")} Compartilhar
          </button>
        </div>

        <hr style="margin: 0;">

        <!-- Cálculo de frete -->
        <form class="field" id="form-frete" style="margin-bottom: var(--e-2);">
          <label for="input-frete-cep" class="label">Calcular frete e prazo</label>
          <div class="inline-form" style="margin: 0 0 var(--e-2);">
            <input id="input-frete-cep" name="cep" inputmode="numeric" placeholder="00000-000" value="${esc(shipping.get()?.cep || "")}">
            <button type="submit" class="btn secondary small">Calcular</button>
          </div>
          <div id="frete-quotes"></div>
        </form>

        <!-- Seções Expansíveis -->
        <div class="product-details">
          <details open>
            <summary>Descrição</summary>
            <div class="product-details-content">
              <p>${esc(p.desc)}</p>
            </div>
          </details>
          <details>
            <summary>Entrega e trocas</summary>
            <div class="product-details-content">
              <p>Frete grátis no PAC para compras acima de ${brl(CONFIG.freeShippingFrom)}.</p>
              <p>Primeira troca ou devolução 100% gratuita em até 30 dias após o recebimento.</p>
            </div>
          </details>
          <details>
            <summary>Pagamento</summary>
            <div class="product-details-content">
              <p>Parcele em até 3x sem juros no cartão de crédito.</p>
              <p>Ganhe ${CONFIG.pixDiscount * 100}% de desconto pagando via Pix com aprovação imediata.</p>
              <p>Boleto bancário aceito com compensação em até 3 dias úteis.</p>
            </div>
          </details>
        </div>
      </div>
    </div>

    <!-- Barra Fixa de Compra no Celular -->
    <div class="mobile-buy-bar" id="mobile-buy-bar">
      <div class="mobile-buy-info">
        <span class="mobile-buy-price nums">${brl(p.price)}</span>
        <span class="mobile-buy-installments">3x de ${brl(p.price / 3)}</span>
      </div>
      <button type="button" class="btn block" id="mobile-btn-add">
        ${stock.get(p.id, size) === 0 ? "Avise-me" : "Adicionar à sacola"}
      </button>
    </div>

    <!-- Avaliações -->
    <section class="reviews-section" id="reviews">
      <div id="reviews-content"></div>
    </section>

    <!-- Recomendações: Combina com -->
    <section class="section" id="section-complete-look">
      <div id="rail-complete-look"></div>
    </section>

    <!-- Recomendações: Da mesma categoria -->
    <section class="section" id="section-same-cat">
      <div id="rail-same-cat"></div>
    </section>
  `;

  // Referências DOM
  const buyArea = $("#buy-action-area");
  const sizeErrorMsg = $("#size-error-msg");
  const sizesGroup = $("#product-sizes");
  const stockFeedback = $("#stock-feedback");
  const labelSizeSelected = $("#label-size-selected");
  const mobileBtnAdd = $("#mobile-btn-add");

  // Renderizar área de compra (botão adicionar OU avise-me)
  const renderBuyArea = () => {
    const isOut = size && stock.get(p.id, size) === 0;

    if (isOut) {
      const isRegistered = user ? getWaitlistStatus(size, user.email) : false;
      buyArea.innerHTML = `
        <div class="waitlist-inline">
          <p><strong>Este tamanho está esgotado no momento.</strong></p>
          <p>Cadastre-se para receber um aviso assim que for reposto:</p>
          ${isRegistered ? `
            <div class="notice success" style="margin: 0;">
              ${icon("check")} Aviso ativado para ${esc(user.email)}.
            </div>
          ` : `
            <form id="form-waitlist" class="inline-form" style="margin: 0;">
              ${!user ? `
                <input type="email" id="waitlist-email" name="email" placeholder="Seu e-mail" required class="input" style="flex: 1;">
              ` : ""}
              <button type="submit" class="btn" style="flex: ${user ? "1" : "none"};">
                Avise-me quando chegar
              </button>
            </form>
            <p class="err" id="waitlist-err" style="margin: 4px 0 0;"></p>
          `}
        </div>
      `;

      if (mobileBtnAdd) mobileBtnAdd.textContent = isRegistered ? "Aviso ativado" : "Avise-me";

      const waitlistForm = $("#form-waitlist");
      if (waitlistForm) {
        waitlistForm.addEventListener("submit", (e) => {
          e.preventDefault();
          const email = user ? user.email : waitlistForm.email?.value.trim();
          const errEl = $("#waitlist-err");
          if (errEl) errEl.textContent = "";
          try {
            waitlist.add(p.id, size, email);
            toast(`Avisaremos em ${email} quando este tamanho chegar.`);
            renderBuyArea();
          } catch (err) {
            if (errEl) errEl.textContent = err.message;
            else toast(err.message);
          }
        });
      }
    } else {
      buyArea.innerHTML = `
        <div class="product-actions">
          <div class="qty" id="product-qty-box">
            <button type="button" id="p-qty-minus" aria-label="Diminuir quantidade">${icon("menos")}</button>
            <span id="p-qty-val" aria-label="Quantidade selecionada">${qty}</span>
            <button type="button" id="p-qty-plus" aria-label="Aumentar quantidade">${icon("mais")}</button>
          </div>
          <button type="button" class="btn btn-add" id="p-btn-add">
            Adicionar à sacola
          </button>
        </div>
      `;

      if (mobileBtnAdd) mobileBtnAdd.textContent = "Adicionar à sacola";

      $("#p-qty-minus").onclick = () => {
        qty = Math.max(1, qty - 1);
        $("#p-qty-val").textContent = qty;
      };
      $("#p-qty-plus").onclick = () => {
        const max = size ? stock.get(p.id, size) : 10;
        if (qty >= max) return toast(`Só temos ${max} ${max === 1 ? "unidade" : "unidades"} deste tamanho.`);
        qty++;
        $("#p-qty-val").textContent = qty;
      };
      $("#p-btn-add").onclick = () => handleAddAction();
    }
  };

  const handleAddAction = () => {
    if (!size) {
      sizeErrorMsg.textContent = "Por favor, selecione um tamanho.";
      sizeErrorMsg.hidden = false;
      sizesGroup.focus();
      return;
    }
    sizeErrorMsg.hidden = true;
    if (stock.get(p.id, size) === 0) {
      // Abre área de waitlist se ainda não estiver visível
      return;
    }
    try {
      const added = cart.add(p.id, size, qty);
      if (added < qty) toast(`Adicionamos ${added} unidade(s): é o que temos em estoque.`);
      else toast("Adicionado à sacola", { action: "Ver sacola", onAction: openDrawer });
      openDrawer();
    } catch (err) {
      toast(err.message);
    }
  };

  if (mobileBtnAdd) {
    mobileBtnAdd.onclick = () => {
      if (stock.get(p.id, size) === 0) {
        sizesGroup.scrollIntoView({ behavior: "smooth" });
      } else {
        handleAddAction();
      }
    };
  }

  renderBuyArea();

  // Seleção de tamanhos
  sizesGroup.addEventListener("click", (e) => {
    const btn = e.target.closest(".size");
    if (!btn) return;
    size = btn.dataset.size;
    sizeErrorMsg.hidden = true;
    $$(".size", sizesGroup).forEach((b) => {
      const active = b === btn;
      b.classList.toggle("active", active);
      b.setAttribute("aria-pressed", active);
    });
    labelSizeSelected.textContent = `Tamanho: ${size}`;
    stockFeedback.innerHTML = getStockStatus(size);
    qty = 1;
    renderBuyArea();
  });

  // Modal de Fotos Ampliadas (Desktop e Mobile)
  const openGalleryModal = (startIdx) => {
    activeImageIndex = startIdx;
    const modalHtml = `
      <div class="zoom-modal" id="zoom-modal-container">
        <button type="button" class="zoom-nav-btn prev" id="zoom-prev" aria-label="Foto anterior">${icon("seta-esquerda")}</button>
        <img id="zoom-modal-img" src="${p.images[activeImageIndex]}" alt="Foto ${activeImageIndex + 1} de ${esc(p.name)}">
        <button type="button" class="zoom-nav-btn next" id="zoom-next" aria-label="Próxima foto">${icon("seta-direita")}</button>
      </div>
    `;
    openModal(modalHtml, { wide: true });

    const modalImg = $("#zoom-modal-img");
    const updateModalImg = (idx) => {
      activeImageIndex = (idx + p.images.length) % p.images.length;
      modalImg.src = p.images[activeImageIndex];
    };

    $("#zoom-prev").onclick = () => updateModalImg(activeImageIndex - 1);
    $("#zoom-next").onclick = () => updateModalImg(activeImageIndex + 1);

    const onKeyNav = (e) => {
      if (e.key === "ArrowLeft") updateModalImg(activeImageIndex - 1);
      if (e.key === "ArrowRight") updateModalImg(activeImageIndex + 1);
    };
    document.addEventListener("keydown", onKeyNav);
  };

  $$(".gallery-mosaic-item").forEach((item) => {
    item.addEventListener("click", () => openGalleryModal(Number(item.dataset.imgIdx)));
    item.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openGalleryModal(Number(item.dataset.imgIdx));
      }
    });
  });

  // Mobile Carousel scroll
  const mobileCarousel = $("#mobile-carousel");
  const mobileCounter = $("#mobile-counter");
  if (mobileCarousel) {
    mobileCarousel.addEventListener("scroll", debounce(() => {
      const idx = Math.round(mobileCarousel.scrollLeft / mobileCarousel.clientWidth);
      mobileCounter.textContent = `${idx + 1} / ${p.images.length}`;
    }, 50));
    mobileCarousel.addEventListener("click", (e) => {
      const slide = e.target.closest(".mobile-carousel-slide");
      if (slide) openGalleryModal(Number(slide.dataset.imgIdx));
    });
  }

  // Guia de medidas e Descobrir meu tamanho (Modal)
  const btnSizeGuide = $("#btn-size-guide");
  if (btnSizeGuide) {
    btnSizeGuide.addEventListener("click", () => {
      const savedM = measures.get() || {};
      const isShoes = p.cat === "calcados";

      const guideHtml = `
        <h2>Descobrir meu tamanho</h2>
        <div style="margin-bottom: var(--e-5);">
          ${sizeGuide(p)}
        </div>
        <div class="panel" style="margin-top: var(--e-5); border-radius: var(--raio);">
          <h3>Calcular recomendação</h3>
          <form id="form-recommend-measure" style="display: grid; gap: var(--e-3); margin-top: var(--e-3);">
            ${isShoes ? `
              <div class="field">
                <label for="m-foot">Comprimento do pé (cm)</label>
                <input type="text" id="m-foot" name="foot" class="input" placeholder="Ex: 24,5" value="${savedM.foot || ""}">
              </div>
            ` : `
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--e-2);">
                <div class="field">
                  <label for="m-bust">Busto (cm)</label>
                  <input type="text" id="m-bust" name="bust" class="input" placeholder="Ex: 92" value="${savedM.bust || ""}">
                </div>
                <div class="field">
                  <label for="m-waist">Cintura (cm)</label>
                  <input type="text" id="m-waist" name="waist" class="input" placeholder="Ex: 74" value="${savedM.waist || ""}">
                </div>
                <div class="field">
                  <label for="m-hip">Quadril (cm)</label>
                  <input type="text" id="m-hip" name="hip" class="input" placeholder="Ex: 98" value="${savedM.hip || ""}">
                </div>
              </div>
            `}
            <button type="submit" class="btn secondary">Calcular meu tamanho</button>
          </form>
          <div id="recommend-modal-result" style="margin-top: var(--e-4);"></div>
        </div>
      `;

      openModal(guideHtml, { wide: true });

      const formRec = $("#form-recommend-measure");
      formRec.addEventListener("submit", (e) => {
        e.preventDefault();
        const m = isShoes
          ? { foot: formRec.foot.value.trim() }
          : { bust: formRec.bust.value.trim(), waist: formRec.waist.value.trim(), hip: formRec.hip.value.trim() };

        measures.set(m);
        const res = recommendSize(p, m);
        const outBox = $("#recommend-modal-result");

        if (!res) {
          outBox.innerHTML = `<p class="err">Preencha as medidas para calcular a recomendação.</p>`;
          return;
        }

        const inStock = res.inStock;
        outBox.innerHTML = `
          <div class="notice ${inStock ? "success" : "error"}">
            <p><strong>Seu tamanho provável é ${res.size}.</strong></p>
            ${!inStock ? `<p>O tamanho ${res.size} está esgotado no momento.</p>` : ""}
          </div>
          <button type="button" class="btn block" id="btn-select-recommended" style="margin-top: var(--e-3);">
            Selecionar ${res.size}
          </button>
        `;

        $("#btn-select-recommended").onclick = () => {
          closeModal();
          size = res.size;
          $$(".size", sizesGroup).forEach((b) => {
            const active = b.dataset.size === size;
            b.classList.toggle("active", active);
            b.setAttribute("aria-pressed", active);
          });
          labelSizeSelected.textContent = `Tamanho: ${size}`;
          stockFeedback.innerHTML = getStockStatus(size);
          $("#measure-rec-note").innerHTML = `
            <span class="size-measure-badge">${icon("check")} Pelas suas medidas: ${res.size}</span>
          `;
          renderBuyArea();
        };
      });
    });
  }

  // Compartilhar
  $("#btn-share").addEventListener("click", () => {
    if (navigator.share) {
      navigator.share({
        title: `${p.name} — Trama`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href).then(() => {
        toast("Link copiado");
      }).catch(() => {
        toast("Não foi possível copiar o link.");
      });
    }
  });

  // Frete
  const formFrete = $("#form-frete");
  maskInput(formFrete.cep, maskCep);
  const showFreightQuotes = () => {
    const s = shipping.get();
    if (!s?.cep) return;
    const quotes = shipping.quotes(s, p.price);
    $("#frete-quotes").innerHTML = `
      <p class="muted small" style="margin: var(--e-2) 0;">
        ${s.city ? `Entrega para ${esc(s.city)} - ${esc(s.uf)}` : "Estimativa de frete"}
      </p>
      ${quotes.map((q) => `
        <div class="summary-line small">
          <span>${esc(q.name)} · até ${fmtDay(addBusinessDays(q.days))}</span>
          <strong>${q.price ? brl(q.price) : "Grátis"}</strong>
        </div>
      `).join("")}
    `;
  };
  formFrete.addEventListener("submit", async (e) => {
    e.preventDefault();
    $("#frete-quotes").innerHTML = `<p class="muted small">Calculando...</p>`;
    try {
      await shipping.lookup(formFrete.cep.value);
      showFreightQuotes();
    } catch (err) {
      $("#frete-quotes").innerHTML = `<p class="err">${err.message}</p>`;
    }
  });
  showFreightQuotes();

  // Avaliações
  const renderReviewsSection = (sortBy = "recentes") => {
    const allReviews = reviews.of(p.id);
    const summary = reviews.summary(p.id);
    const sorted = reviews.sorted(p.id, sortBy);
    const mine = user && allReviews.some((r) => r.email === user.email);

    $("#reviews-content").innerHTML = `
      <div class="section-head">
        <h2>Avaliações (${summary.count})</h2>
      </div>

      <div class="reviews-summary-grid">
        <div class="reviews-score">
          <div class="reviews-big-avg nums">${summary.avg.toFixed(1)}</div>
          <div>${stars(summary.avg)}</div>
          <span class="muted small">${summary.count} ${summary.count === 1 ? "avaliação" : "avaliações"} no total</span>
        </div>

        <div class="dist-bars">
          ${[5, 4, 3, 2, 1].map((starsNum) => {
            const count = summary.dist[starsNum] || 0;
            const pct = summary.count ? (count / summary.count) * 100 : 0;
            return `
              <div class="dist-row">
                <span>${starsNum} ★</span>
                <div class="dist-track">
                  <div class="dist-fill" style="width: ${pct}%"></div>
                </div>
                <span class="muted">${count}</span>
              </div>
            `;
          }).join("")}
        </div>
      </div>

      <!-- Formulário de Nova Avaliação -->
      <div class="panel" style="margin-bottom: var(--e-6); border-radius: var(--raio);">
        ${!user ? `
          <p style="margin: 0;">Quer avaliar este produto? <a href="#/conta?next=produto/${p.id}" class="link">Entre na sua conta</a>.</p>
        ` : mine ? `
          <p style="margin: 0;" class="muted">${icon("check")} Você já avaliou esta peça. Obrigado pelo feedback!</p>
        ` : `
          <h3>Escreva sua avaliação</h3>
          <form id="form-new-review" style="display: grid; gap: var(--e-3); margin-top: var(--e-3);">
            <div class="field">
              <label class="label">Sua nota</label>
              <div class="sizes" id="review-stars-radio" role="radiogroup" aria-label="Nota de 1 a 5 estrelas">
                ${[1, 2, 3, 4, 5].map((st) => `
                  <button type="button" class="size sm" role="radio" aria-checked="false" data-rating="${st}">
                    ${st} ★
                  </button>
                `).join("")}
              </div>
            </div>
            <div class="field">
              <label for="review-text" class="label">Comentário</label>
              <textarea id="review-text" name="text" class="textarea" rows="3" placeholder="Conte como foi o caimento, o tecido e o acabamento..." maxlength="500"></textarea>
              <p class="err"></p>
            </div>
            <button type="submit" class="btn secondary" style="width: fit-content;">Publicar avaliação</button>
          </form>
        `}
      </div>

      <!-- Lista ordenada de avaliações -->
      ${sorted.length ? `
        <div style="display: flex; justify-content: flex-end; margin-bottom: var(--e-4);">
          <select class="select sm" id="review-sort-select" aria-label="Ordenar avaliações">
            <option value="recentes" ${sortBy === "recentes" ? "selected" : ""}>Mais recentes</option>
            <option value="melhores" ${sortBy === "melhores" ? "selected" : ""}>Mais bem avaliadas</option>
            <option value="piores" ${sortBy === "piores" ? "selected" : ""}>Menos bem avaliadas</option>
          </select>
        </div>
        <div class="review-list">
          ${sorted.map((r) => `
            <div class="review-card">
              <div class="review-card-head">
                <div class="review-card-author">
                  <strong>${esc(r.name)}</strong>
                  ${r.verified ? `<span class="review-verified">${icon("check")} Compra verificada</span>` : ""}
                </div>
                <small class="muted nums">${new Date(r.date).toLocaleDateString("pt-BR")}</small>
              </div>
              <div style="margin-bottom: var(--e-2);">${stars(r.rating)}</div>
              <p style="margin: 0;">${esc(r.text)}</p>
            </div>
          `).join("")}
        </div>
      ` : `
        <p class="muted">Esta peça ainda não possui avaliações. Seja a primeira pessoa a avaliar!</p>
      `}
    `;

    $("#review-sort-select")?.addEventListener("change", (e) => {
      renderReviewsSection(e.target.value);
    });

    const formRev = $("#form-new-review");
    if (formRev) {
      let chosenRating = 0;
      $("#review-stars-radio").addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        chosenRating = Number(b.dataset.rating);
        $$("#review-stars-radio button").forEach((rb) => {
          const on = Number(rb.dataset.rating) <= chosenRating;
          rb.classList.toggle("active", on);
          rb.setAttribute("aria-checked", rb === b);
        });
      });

      formRev.addEventListener("submit", (e) => {
        e.preventDefault();
        const text = formRev.text.value.trim();
        if (!chosenRating) return toast("Escolha uma nota de 1 a 5 estrelas.");
        if (text.length < 10) return showErrors(formRev, { text: "Escreva pelo menos 10 caracteres." });

        reviews.add(p.id, {
          name: user.name.split(" ")[0],
          email: user.email,
          rating: chosenRating,
          text,
          date: Date.now(),
          verified: hasPurchased(user.email, p.id),
        });
        toast("Avaliação enviada com sucesso!");
        renderReviewsSection(sortBy);
      });
    }
  };

  renderReviewsSection();

  $("#goto-reviews")?.addEventListener("click", (e) => {
    e.preventDefault();
    $("#reviews").scrollIntoView({ behavior: "smooth" });
  });

  // Recomendações: Combina com
  const lookProducts = completeLook(p, 4);
  if (lookProducts.length) {
    $("#rail-complete-look").innerHTML = rail("Combina com", lookProducts, { id: "rail-look" });
  }

  // Recomendações: Da mesma categoria
  const sameCatProducts = visibleProducts().filter((x) => x.cat === p.cat && x.id !== p.id).slice(0, 6);
  if (sameCatProducts.length) {
    $("#rail-same-cat").innerHTML = rail("Da mesma categoria", sameCatProducts, { id: "rail-same" });
  }

  syncRails(app);
}
