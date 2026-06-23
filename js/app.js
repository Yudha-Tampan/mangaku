/* ============================================================
   APP — bootstrap, search realtime, theme toggle, nav handlers
   ============================================================ */

const App = {

  searchDebounceTimer: null,

  init() {
    document.getElementById("year").textContent = new Date().getFullYear();
    this.initTheme();
    this.initSearch();
    this.initMobileNav();
    this.initGlobalLinkHandler();
    this.registerRoutes();
    Router.init();
  },

  /* ---------------- THEME ---------------- */
  initTheme() {
    const saved = Storage.getTheme();
    document.documentElement.setAttribute("data-theme", saved);
    this.updateThemeIcon(saved);

    document.getElementById("themeToggle").addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") || "dark";
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      Storage.setTheme(next);
      this.updateThemeIcon(next);
    });
  },
  updateThemeIcon(theme) {
    document.getElementById("themeToggle").textContent = theme === "dark" ? "🌙" : "☀️";
  },

  /* ---------------- MOBILE NAV ---------------- */
  initMobileNav() {
    const menuBtn = document.getElementById("mobileMenuBtn");
    const mobileNav = document.getElementById("mobileNav");
    menuBtn.addEventListener("click", () => mobileNav.classList.toggle("show"));

    mobileNav.querySelectorAll("a").forEach(a => {
      a.addEventListener("click", () => mobileNav.classList.remove("show"));
    });

    const searchBtn = document.getElementById("mobileSearchBtn");
    const searchWrap = document.getElementById("searchWrap");
    searchBtn.addEventListener("click", () => {
      searchWrap.classList.toggle("mobile-show");
      if (searchWrap.classList.contains("mobile-show")) {
        document.getElementById("searchInput").focus();
      }
    });
  },

  /* ---------------- GLOBAL LINK HANDLER (close menus on nav) ---------------- */
  initGlobalLinkHandler() {
    document.addEventListener("click", (e) => {
      const link = e.target.closest("[data-link]");
      if (link) {
        document.getElementById("mobileNav").classList.remove("show");
        document.getElementById("searchWrap").classList.remove("mobile-show");
        document.getElementById("searchResults").classList.remove("show");
      }
    });
  },

  /* ---------------- SEARCH REALTIME ---------------- */
  initSearch() {
    const input = document.getElementById("searchInput");
    const wrap = document.getElementById("searchWrap");
    const resultsBox = document.getElementById("searchResults");
    const clearBtn = document.getElementById("searchClear");

    input.addEventListener("input", () => {
      const query = input.value.trim();
      wrap.classList.toggle("has-value", query.length > 0);

      clearTimeout(this.searchDebounceTimer);
      if (!query) {
        resultsBox.classList.remove("show");
        resultsBox.innerHTML = "";
        return;
      }

      this.searchDebounceTimer = setTimeout(() => this.runSearch(query), 280);
    });

    clearBtn.addEventListener("click", () => {
      input.value = "";
      wrap.classList.remove("has-value");
      resultsBox.classList.remove("show");
      resultsBox.innerHTML = "";
      input.focus();
    });

    document.addEventListener("click", (e) => {
      if (!wrap.contains(e.target)) {
        resultsBox.classList.remove("show");
      }
    });

    input.addEventListener("focus", () => {
      if (input.value.trim() && resultsBox.innerHTML) {
        resultsBox.classList.add("show");
      }
    });
  },

  async runSearch(query) {
    const resultsBox = document.getElementById("searchResults");
    resultsBox.classList.add("show");
    resultsBox.innerHTML = `<div class="search-empty"><div class="spinner" style="margin:0 auto;"></div></div>`;

    try {
      // Try dedicated search endpoint first
      let results = await Api.search(query);

      // Fallback: filter from cached new-anime list by title
      if (!results) {
        const list = await Pages.ensureNewListCache();
        const q = query.toLowerCase();
        results = list.filter(a => a.title.toLowerCase().includes(q));
      }

      if (!results.length) {
        resultsBox.innerHTML = `<div class="search-empty">Tidak ada hasil untuk "${Components.escapeHtml(query)}"</div>`;
        return;
      }

      resultsBox.innerHTML = results.slice(0, 8).map(a => `
        <a href="#/anime/${encodeURIComponent(a.url)}" data-link class="search-result-item">
          <img src="${Components.escapeHtml(a.cover)}" alt="" onerror="this.src='${Components.placeholderImg()}'">
          <span class="sri-title">${Components.escapeHtml(a.title)}</span>
        </a>
      `).join("");

    } catch (err) {
      resultsBox.innerHTML = `<div class="search-empty">Gagal memuat hasil pencarian.</div>`;
    }
  },

  /* ---------------- BOOKMARK BUTTON BINDING (used after grid render) ---------------- */
  bindBookmarkButtons() {
    document.querySelectorAll("[data-bookmark]").forEach(btn => {
      // avoid double-binding
      if (btn.dataset.bound) return;
      btn.dataset.bound = "1";

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const url = btn.dataset.bookmark;
        const card = btn.closest(".anime-card");
        const title = card.querySelector(".anime-card-title")?.textContent || "";
        const cover = card.querySelector("img")?.src || "";

        const isNow = Storage.toggleBookmark({ url, title, cover });
        btn.classList.toggle("active", isNow);
        btn.textContent = isNow ? "★" : "☆";
        Components.toast(isNow ? "Ditambahkan ke bookmark" : "Dihapus dari bookmark");
      });
    });
  },

  /* ---------------- ROUTES ---------------- */
  registerRoutes() {
    Router.add("/home", () => Pages.home());
    Router.add("/anime/:slug", (params) => Pages.detail(params));
    Router.add("/watch/:episodeUrl", (params) => {
      const queryParams = new URLSearchParams(location.hash.split("?")[1] || "");
      return Pages.watch(params, queryParams);
    });
    Router.add("/genres", () => Pages.genres({ genreName: null }));
    Router.add("/genres/:genreName", (params) => Pages.genres(params));
    Router.add("/bookmarks", () => Pages.bookmarks());
    Router.add("/history", () => Pages.history());
  },
};

App.init();
