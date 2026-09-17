(() => {
  "use strict";

  const alphabet = "ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ".split("");
  const poems = [...(window.DEYISLER || [])].sort((a, b) =>
    a.baslik.localeCompare(b.baslik, "tr", { sensitivity: "base" })
  );
  const poemsById = new Map(poems.map(poem => [poem.id, poem]));
  const fontSizes = [1.02, 1.16, 1.32, 1.52, 1.74];
  const scrollSpeeds = [9, 17, 27, 40, 58];

  const els = {
    form: document.querySelector("#search-form"),
    input: document.querySelector("#search-input"),
    clear: document.querySelector("#clear-search"),
    summary: document.querySelector("#search-summary"),
    alphabet: document.querySelector("#alphabet"),
    mahlasFilter: document.querySelector("#mahlas-filter"),
    grid: document.querySelector("#poem-grid"),
    empty: document.querySelector("#empty-state"),
    emptyCopy: document.querySelector("#empty-copy"),
    webSearches: document.querySelector("#web-searches"),
    showAll: document.querySelector("#show-all"),
    count: document.querySelector("#archive-count"),
    installApp: document.querySelector("#install-app"),
    favoritesCount: document.querySelector("#favorites-count"),
    setlistCount: document.querySelector("#setlist-count"),
    showFavorites: document.querySelector("#show-favorites"),
    showSetlist: document.querySelector("#show-setlist"),
    showRecent: document.querySelector("#show-recent"),
    reader: document.querySelector("#reader"),
    readerClose: document.querySelector("#reader-close"),
    readerType: document.querySelector("#reader-type"),
    readerTitle: document.querySelector("#reader-title"),
    readerAuthor: document.querySelector("#reader-author"),
    readerText: document.querySelector("#reader-text"),
    readerNotes: document.querySelector("#reader-notes"),
    readerSource: document.querySelector("#reader-source"),
    readerFavorite: document.querySelector("#reader-favorite"),
    readerSetlist: document.querySelector("#reader-setlist"),
    fontDecrease: document.querySelector("#font-decrease"),
    fontIncrease: document.querySelector("#font-increase"),
    fontSizeLabel: document.querySelector("#font-size-label"),
    autoscrollToggle: document.querySelector("#autoscroll-toggle"),
    scrollSpeed: document.querySelector("#scroll-speed"),
    wakeToggle: document.querySelector("#wake-toggle"),
    fullscreenToggle: document.querySelector("#fullscreen-toggle"),
    previousPoem: document.querySelector("#previous-poem"),
    nextPoem: document.querySelector("#next-poem"),
    collectionDialog: document.querySelector("#collection-dialog"),
    collectionClose: document.querySelector("#collection-close"),
    collectionTitle: document.querySelector("#collection-title"),
    collectionCopy: document.querySelector("#collection-copy"),
    collectionList: document.querySelector("#collection-list"),
    clearCollection: document.querySelector("#clear-collection")
  };

  let activeLetter = "";
  let activeMahlas = "";
  let currentPoem = null;
  let collectionMode = "favorites";
  let deferredInstallPrompt = null;
  let wakeLock = null;
  let scrollFrame = null;
  let previousFrameTime = 0;
  let fontIndex = clamp(Number(localStorage.getItem("deyis-font-size") || 1), 0, fontSizes.length - 1);
  const state = {
    favorites: readStoredList("deyis-favorites"),
    setlist: readStoredList("deyis-setlist"),
    recent: readStoredList("deyis-recent")
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
  }

  function readStoredList(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value.filter(id => poemsById.has(id)) : [];
    } catch {
      return [];
    }
  }

  function saveState(key) {
    localStorage.setItem(`deyis-${key}`, JSON.stringify(state[key]));
    updateCounts();
  }

  function normalize(value) {
    return String(value || "")
      .toLocaleLowerCase("tr-TR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ı/g, "i")
      .replace(/ş/g, "s")
      .replace(/ç/g, "c")
      .replace(/ğ/g, "g")
      .replace(/ö/g, "o")
      .replace(/ü/g, "u");
  }

  function firstLetter(title) {
    return String(title || "").trim().charAt(0).toLocaleUpperCase("tr-TR");
  }

  function searchableText(poem) {
    return normalize([
      poem.baslik,
      poem.mahlas,
      poem.tur,
      poem.metin,
      ...(poem.konular || []),
      ...(poem.anilanlar || [])
    ].join(" "));
  }

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = String(value || "");
    return div.innerHTML;
  }

  function createCard(poem) {
    const card = document.createElement("article");
    card.className = "poem-card";
    card.dataset.id = poem.id;
    const isFavorite = state.favorites.includes(poem.id);
    const isListed = state.setlist.includes(poem.id);
    card.innerHTML = `
      <span class="poem-letter">${escapeHtml(firstLetter(poem.baslik))} · ${escapeHtml(poem.tur || "Deyiş")}</span>
      <h3>${escapeHtml(poem.baslik)}</h3>
      <span class="poem-meta-label">Mahlas</span>
      <p class="poem-author">${escapeHtml(poem.mahlas)}</p>
      <p class="poem-first-line">${escapeHtml(poem.metin.split("\n").find(line => line.trim()) || "")}</p>
      <div class="poem-actions">
        <button type="button" data-action="favorite" aria-label="${isFavorite ? "Favorilerden çıkar" : "Favorilere ekle"}">${isFavorite ? "★" : "☆"}</button>
        <button type="button" data-action="setlist">${isListed ? "Listede" : "+ Liste"}</button>
        <button type="button" data-action="open" class="poem-open">Oku →</button>
      </div>
    `;
    card.addEventListener("click", event => {
      const action = event.target.closest("button")?.dataset.action;
      if (action === "favorite") toggleFavorite(poem.id);
      if (action === "setlist") toggleSetlist(poem.id);
      if (action === "open") openReader(poem);
    });
    return card;
  }

  function toggleInList(key, id) {
    const index = state[key].indexOf(id);
    if (index >= 0) state[key].splice(index, 1);
    else state[key].push(id);
    saveState(key);
    render();
    if (currentPoem?.id === id) updateReaderActions();
    if (els.collectionDialog.open && collectionMode === key) renderCollection();
  }

  function toggleFavorite(id) {
    toggleInList("favorites", id);
  }

  function toggleSetlist(id) {
    toggleInList("setlist", id);
  }

  function updateCounts() {
    els.favoritesCount.textContent = state.favorites.length;
    els.setlistCount.textContent = state.setlist.length;
  }

  function updateReaderActions() {
    if (!currentPoem) return;
    const favorite = state.favorites.includes(currentPoem.id);
    const listed = state.setlist.includes(currentPoem.id);
    els.readerFavorite.textContent = favorite ? "★ Favoride" : "☆ Favori";
    els.readerFavorite.classList.toggle("active", favorite);
    els.readerSetlist.textContent = listed ? "✓ Listede" : "＋ Liste";
    els.readerSetlist.classList.toggle("active", listed);
  }

  function sourceMarkup(poem) {
    const source = poem.kaynak || "Hz. Sauna Sultan Dergâhı aile arşivine iletilen metin";
    const status = poem.dogrulama || "Kaynak karşılaştırması bekliyor";
    const date = poem.sonKontrol || "Henüz kaydedilmedi";
    const variant = poem.varyant || "Kayıtlı varyant notu yok";
    return `
      <h3>Kaynak ve doğrulama</h3>
      <dl>
        <div><dt>Kaynak</dt><dd>${escapeHtml(source)}</dd></div>
        <div><dt>Durum</dt><dd>${escapeHtml(status)}</dd></div>
        <div><dt>Son kontrol</dt><dd>${escapeHtml(date)}</dd></div>
        <div><dt>Varyant notu</dt><dd>${escapeHtml(variant)}</dd></div>
      </dl>
    `;
  }

  function openReader(poem) {
    stopAutoScroll();
    currentPoem = poem;
    els.readerType.textContent = poem.tur || "Deyiş";
    els.readerTitle.textContent = poem.baslik;
    els.readerAuthor.textContent = poem.mahlas;
    els.readerText.textContent = poem.metin;
    els.readerNotes.textContent = poem.not || "";
    els.readerNotes.hidden = !poem.not;
    els.readerSource.innerHTML = sourceMarkup(poem);
    applyFontSize();
    updateReaderActions();
    addRecent(poem.id);
    if (!els.reader.open) els.reader.showModal();
    els.reader.scrollTop = 0;
    history.replaceState(null, "", `#${encodeURIComponent(poem.id)}`);
  }

  function addRecent(id) {
    state.recent = [id, ...state.recent.filter(item => item !== id)].slice(0, 12);
    saveState("recent");
  }

  async function closeReader() {
    stopAutoScroll();
    await releaseWakeLock();
    els.reader.classList.remove("full-reading");
    els.fullscreenToggle.textContent = "Tam ekran";
    els.reader.close();
    currentPoem = null;
    history.replaceState(null, "", location.pathname + location.search);
  }

  function changePoem(direction) {
    if (!currentPoem) return;
    const index = poems.findIndex(poem => poem.id === currentPoem.id);
    const nextIndex = (index + direction + poems.length) % poems.length;
    openReader(poems[nextIndex]);
  }

  function applyFontSize() {
    els.readerText.style.fontSize = `${fontSizes[fontIndex]}rem`;
    els.fontSizeLabel.textContent = ["Küçük", "Normal", "Büyük", "Daha büyük", "En büyük"][fontIndex];
    localStorage.setItem("deyis-font-size", String(fontIndex));
  }

  function autoScrollFrame(time) {
    if (!previousFrameTime) previousFrameTime = time;
    const elapsed = Math.min(time - previousFrameTime, 100);
    previousFrameTime = time;
    const speed = scrollSpeeds[Number(els.scrollSpeed.value) - 1];
    els.reader.scrollTop += speed * elapsed / 1000;
    const finished = els.reader.scrollTop + els.reader.clientHeight >= els.reader.scrollHeight - 2;
    if (finished) stopAutoScroll();
    else scrollFrame = requestAnimationFrame(autoScrollFrame);
  }

  function startAutoScroll() {
    if (scrollFrame) return;
    previousFrameTime = 0;
    els.autoscrollToggle.textContent = "Kaydırmayı durdur";
    els.autoscrollToggle.classList.add("active");
    scrollFrame = requestAnimationFrame(autoScrollFrame);
  }

  function stopAutoScroll() {
    if (scrollFrame) cancelAnimationFrame(scrollFrame);
    scrollFrame = null;
    previousFrameTime = 0;
    els.autoscrollToggle.textContent = "Kaydırmayı başlat";
    els.autoscrollToggle.classList.remove("active");
  }

  async function requestWakeLock() {
    if (!("wakeLock" in navigator)) return;
    try {
      wakeLock = await navigator.wakeLock.request("screen");
      els.wakeToggle.textContent = "Ekran açık ✓";
      els.wakeToggle.classList.add("active");
      wakeLock.addEventListener("release", () => {
        wakeLock = null;
        els.wakeToggle.textContent = "Ekranı açık tut";
        els.wakeToggle.classList.remove("active");
      });
    } catch {
      els.wakeToggle.textContent = "İzin verilemedi";
    }
  }

  async function releaseWakeLock() {
    if (wakeLock) await wakeLock.release();
    wakeLock = null;
  }

  function renderAlphabet() {
    const available = new Set(poems.map(poem => firstLetter(poem.baslik)));
    const fragment = document.createDocumentFragment();
    alphabet.forEach(letter => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "letter-button";
      button.textContent = letter;
      button.disabled = !available.has(letter);
      button.setAttribute("aria-label", `${letter} harfiyle başlayanları göster`);
      button.addEventListener("click", () => {
        activeLetter = activeLetter === letter ? "" : letter;
        els.input.value = "";
        render();
      });
      fragment.appendChild(button);
    });
    els.alphabet.replaceChildren(fragment);
  }

  function renderMahlasFilter() {
    const mahlases = [...new Set(poems.map(poem => poem.mahlas).filter(value => value && value !== "Metinde belirtilmiyor"))]
      .sort((a, b) => a.localeCompare(b, "tr"));
    const values = ["", ...mahlases];
    const fragment = document.createDocumentFragment();
    values.forEach(value => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "mahlas-chip";
      button.textContent = value || "Bütün mahlaslar";
      button.classList.toggle("active", activeMahlas === value);
      button.setAttribute("aria-pressed", String(activeMahlas === value));
      button.addEventListener("click", () => {
        activeMahlas = value;
        renderMahlasFilter();
        render();
      });
      fragment.appendChild(button);
    });
    els.mahlasFilter.replaceChildren(fragment);
  }

  function renderWebSearches(query) {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      els.webSearches.replaceChildren();
      return;
    }
    const searches = [
      ["Google’da ara", `https://www.google.com/search?q=${encodeURIComponent(`\"${cleanQuery}\" deyiş sözleri mahlas`)}`],
      ["YouTube’da ara", `https://www.youtube.com/results?search_query=${encodeURIComponent(`${cleanQuery} deyiş`)}`]
    ];
    const fragment = document.createDocumentFragment();
    searches.forEach(([label, href]) => {
      const link = document.createElement("a");
      link.className = "web-link";
      link.href = href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = label;
      fragment.appendChild(link);
    });
    els.webSearches.replaceChildren(fragment);
  }

  function render() {
    const query = els.input.value.trim();
    const normalizedQuery = normalize(query);
    const filtered = poems.filter(poem => {
      const matchesQuery = !normalizedQuery || searchableText(poem).includes(normalizedQuery);
      const matchesLetter = !activeLetter || firstLetter(poem.baslik) === activeLetter;
      const matchesMahlas = !activeMahlas || poem.mahlas === activeMahlas;
      return matchesQuery && matchesLetter && matchesMahlas;
    });

    const fragment = document.createDocumentFragment();
    filtered.forEach(poem => fragment.appendChild(createCard(poem)));
    els.grid.replaceChildren(fragment);
    els.grid.hidden = filtered.length === 0;
    els.empty.hidden = filtered.length !== 0;
    els.clear.hidden = !query;
    els.showAll.hidden = !query && !activeLetter && !activeMahlas;

    document.querySelectorAll(".letter-button").forEach(button => {
      button.classList.toggle("active", button.textContent === activeLetter);
      button.setAttribute("aria-pressed", String(button.textContent === activeLetter));
    });

    if (query) {
      els.summary.textContent = filtered.length
        ? `“${query}” için ${filtered.length} sonuç bulundu.`
        : `“${query}” arşivde bulunamadı.`;
      els.emptyCopy.textContent = `“${query}” için farklı kaynaklardaki sonuçlara bakabilirsiniz. Bulduğunuz metni doğruladıktan sonra arşive ekleyin.`;
      renderWebSearches(query);
    } else if (activeLetter || activeMahlas) {
      els.summary.textContent = `${filtered.length} kayıt gösteriliyor.`;
      els.emptyCopy.textContent = "Bu süzgeçlerle eşleşen kayıt henüz eklenmemiş.";
      renderWebSearches("");
    } else {
      els.summary.textContent = "";
      renderWebSearches("");
    }
  }

  function openCollection(mode) {
    collectionMode = mode;
    const copy = {
      favorites: ["Favoriler", "Sık okuduğunuz deyişler bu cihazda saklanır."],
      setlist: ["Bu Akşam Okunacaklar", "Sırayı ok düğmeleriyle değiştirebilirsiniz."],
      recent: ["Son Okunanlar", "Bu cihazda en son açtığınız deyişler."]
    }[mode];
    els.collectionTitle.textContent = copy[0];
    els.collectionCopy.textContent = copy[1];
    els.clearCollection.textContent = mode === "setlist" ? "Okuma listesini temizle" : mode === "favorites" ? "Favorileri temizle" : "Geçmişi temizle";
    renderCollection();
    els.collectionDialog.showModal();
  }

  function renderCollection() {
    const ids = state[collectionMode];
    if (!ids.length) {
      els.collectionList.innerHTML = `<div class="collection-empty">Bu bölüm henüz boş.</div>`;
      els.clearCollection.hidden = true;
      return;
    }
    els.clearCollection.hidden = false;
    els.collectionList.innerHTML = ids.map((id, index) => {
      const poem = poemsById.get(id);
      if (!poem) return "";
      const orderButtons = collectionMode === "setlist" ? `
        <button type="button" data-action="up" data-id="${id}" ${index === 0 ? "disabled" : ""} aria-label="Yukarı taşı">↑</button>
        <button type="button" data-action="down" data-id="${id}" ${index === ids.length - 1 ? "disabled" : ""} aria-label="Aşağı taşı">↓</button>` : "";
      return `
        <article class="collection-item">
          <div><strong>${escapeHtml(poem.baslik)}</strong><span>${escapeHtml(poem.mahlas)}</span></div>
          <div class="collection-item-actions">
            ${orderButtons}
            <button type="button" data-action="open" data-id="${id}">Oku</button>
            <button type="button" data-action="remove" data-id="${id}">Kaldır</button>
          </div>
        </article>`;
    }).join("");
  }

  function moveSetlist(id, direction) {
    const index = state.setlist.indexOf(id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= state.setlist.length) return;
    [state.setlist[index], state.setlist[target]] = [state.setlist[target], state.setlist[index]];
    saveState("setlist");
    renderCollection();
  }

  els.form.addEventListener("submit", event => event.preventDefault());
  els.input.addEventListener("input", () => {
    activeLetter = "";
    render();
  });
  els.clear.addEventListener("click", () => {
    els.input.value = "";
    els.input.focus();
    render();
  });
  els.showAll.addEventListener("click", () => {
    activeLetter = "";
    activeMahlas = "";
    els.input.value = "";
    renderMahlasFilter();
    render();
  });
  els.showFavorites.addEventListener("click", () => openCollection("favorites"));
  els.showSetlist.addEventListener("click", () => openCollection("setlist"));
  els.showRecent.addEventListener("click", () => openCollection("recent"));
  els.readerClose.addEventListener("click", closeReader);
  els.readerFavorite.addEventListener("click", () => currentPoem && toggleFavorite(currentPoem.id));
  els.readerSetlist.addEventListener("click", () => currentPoem && toggleSetlist(currentPoem.id));
  els.fontDecrease.addEventListener("click", () => { fontIndex = clamp(fontIndex - 1, 0, fontSizes.length - 1); applyFontSize(); });
  els.fontIncrease.addEventListener("click", () => { fontIndex = clamp(fontIndex + 1, 0, fontSizes.length - 1); applyFontSize(); });
  els.autoscrollToggle.addEventListener("click", () => scrollFrame ? stopAutoScroll() : startAutoScroll());
  els.fullscreenToggle.addEventListener("click", () => {
    const enabled = els.reader.classList.toggle("full-reading");
    els.fullscreenToggle.textContent = enabled ? "Normal görünüm" : "Tam ekran";
  });
  els.wakeToggle.addEventListener("click", () => wakeLock ? releaseWakeLock() : requestWakeLock());
  els.previousPoem.addEventListener("click", () => changePoem(-1));
  els.nextPoem.addEventListener("click", () => changePoem(1));
  els.reader.addEventListener("click", event => {
    if (event.target === els.reader) closeReader();
  });
  els.reader.addEventListener("close", () => {
    stopAutoScroll();
    releaseWakeLock();
    if (location.hash) history.replaceState(null, "", location.pathname + location.search);
  });
  els.collectionClose.addEventListener("click", () => els.collectionDialog.close());
  els.collectionDialog.addEventListener("click", event => {
    if (event.target === els.collectionDialog) els.collectionDialog.close();
  });
  els.collectionList.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const { action, id } = button.dataset;
    if (action === "open") {
      els.collectionDialog.close();
      openReader(poemsById.get(id));
    }
    if (action === "remove") {
      state[collectionMode] = state[collectionMode].filter(item => item !== id);
      saveState(collectionMode);
      renderCollection();
      render();
    }
    if (action === "up") moveSetlist(id, -1);
    if (action === "down") moveSetlist(id, 1);
  });
  els.clearCollection.addEventListener("click", () => {
    state[collectionMode] = [];
    saveState(collectionMode);
    renderCollection();
    render();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && els.wakeToggle.classList.contains("active") && !wakeLock) requestWakeLock();
  });

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    els.installApp.hidden = false;
  });
  els.installApp.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    els.installApp.hidden = true;
  });
  window.addEventListener("appinstalled", () => { els.installApp.hidden = true; });

  if (!("wakeLock" in navigator)) {
    els.wakeToggle.disabled = true;
    els.wakeToggle.title = "Bu tarayıcı ekranı açık tutma özelliğini desteklemiyor.";
  }
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js?v=5"));
  }

  els.count.textContent = `${poems.length} kayıt`;
  updateCounts();
  renderAlphabet();
  renderMahlasFilter();
  applyFontSize();
  render();

  const requestedId = decodeURIComponent(location.hash.slice(1));
  const requestedPoem = poems.find(poem => poem.id === requestedId);
  if (requestedPoem) openReader(requestedPoem);
})();
