(() => {
  "use strict";

  const alphabet = "ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ".split("");
  const poems = [...(window.DEYISLER || [])].sort((a, b) =>
    a.baslik.localeCompare(b.baslik, "tr", { sensitivity: "base" })
  );

  const els = {
    form: document.querySelector("#search-form"),
    input: document.querySelector("#search-input"),
    clear: document.querySelector("#clear-search"),
    summary: document.querySelector("#search-summary"),
    alphabet: document.querySelector("#alphabet"),
    grid: document.querySelector("#poem-grid"),
    empty: document.querySelector("#empty-state"),
    emptyCopy: document.querySelector("#empty-copy"),
    webSearches: document.querySelector("#web-searches"),
    showAll: document.querySelector("#show-all"),
    count: document.querySelector("#archive-count"),
    reader: document.querySelector("#reader"),
    readerClose: document.querySelector("#reader-close"),
    readerType: document.querySelector("#reader-type"),
    readerTitle: document.querySelector("#reader-title"),
    readerAuthor: document.querySelector("#reader-author"),
    readerText: document.querySelector("#reader-text"),
    readerNotes: document.querySelector("#reader-notes")
  };

  let activeLetter = "";

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

  function createCard(poem) {
    const button = document.createElement("button");
    button.className = "poem-card";
    button.type = "button";
    button.dataset.id = poem.id;
    button.innerHTML = `
      <span class="poem-letter">${escapeHtml(firstLetter(poem.baslik))} · ${escapeHtml(poem.tur || "Deyiş")}</span>
      <h3>${escapeHtml(poem.baslik)}</h3>
      <span class="poem-meta-label">Mahlas</span>
      <p class="poem-author">${escapeHtml(poem.mahlas)}</p>
      <p class="poem-first-line">${escapeHtml(poem.metin.split("\n").find(line => line.trim()) || "")}</p>
      <span class="poem-open">Oku</span>
    `;
    button.addEventListener("click", () => openReader(poem));
    return button;
  }

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = String(value || "");
    return div.innerHTML;
  }

  function openReader(poem) {
    els.readerType.textContent = poem.tur || "Deyiş";
    els.readerTitle.textContent = poem.baslik;
    els.readerAuthor.textContent = poem.mahlas;
    els.readerText.textContent = poem.metin;
    els.readerNotes.textContent = poem.not || "";
    els.readerNotes.hidden = !poem.not;
    els.reader.showModal();
    history.replaceState(null, "", `#${encodeURIComponent(poem.id)}`);
  }

  function closeReader() {
    els.reader.close();
    history.replaceState(null, "", location.pathname + location.search);
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

  function renderWebSearches(query) {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      els.webSearches.replaceChildren();
      return;
    }
    const searches = [
      ["Google’da ara", `https://www.google.com/search?q=${encodeURIComponent(`\"${cleanQuery}\" deyiş sözleri mahlas`)}`],
      ["YouTube’da ara", `https://www.youtube.com/results?search_query=${encodeURIComponent(`${cleanQuery} deyiş`)}`],
      ["Google Kitaplar’da ara", `https://books.google.com/books?q=${encodeURIComponent(`\"${cleanQuery}\" deyiş`)}`]
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
      return matchesQuery && matchesLetter;
    });

    const fragment = document.createDocumentFragment();
    filtered.forEach(poem => fragment.appendChild(createCard(poem)));
    els.grid.replaceChildren(fragment);
    els.grid.hidden = filtered.length === 0;
    els.empty.hidden = filtered.length !== 0;
    els.clear.hidden = !query;
    els.showAll.hidden = !query && !activeLetter;

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
    } else if (activeLetter) {
      els.summary.textContent = `${activeLetter} harfiyle başlayan ${filtered.length} kayıt gösteriliyor.`;
      els.emptyCopy.textContent = "Bu harfle başlayan kayıt henüz eklenmemiş.";
      renderWebSearches("");
    } else {
      els.summary.textContent = "";
      renderWebSearches("");
    }
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
    els.input.value = "";
    render();
  });
  els.readerClose.addEventListener("click", closeReader);
  els.reader.addEventListener("click", event => {
    if (event.target === els.reader) closeReader();
  });
  els.reader.addEventListener("close", () => {
    if (location.hash) history.replaceState(null, "", location.pathname + location.search);
  });

  els.count.textContent = `${poems.length} kayıt`;
  renderAlphabet();
  render();

  const requestedId = decodeURIComponent(location.hash.slice(1));
  const requestedPoem = poems.find(poem => poem.id === requestedId);
  if (requestedPoem) openReader(requestedPoem);
})();
