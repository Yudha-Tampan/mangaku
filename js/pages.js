/* ============================================================
   PAGES — render logic untuk setiap route
   ============================================================ */

const Pages = {

  _cachedNewList: null, // cache homepage list untuk dipakai fallback search & genre filter

  async ensureNewListCache() {
    if (!this._cachedNewList) {
      this._cachedNewList = await Api.getNewAnime();
    }
    return this._cachedNewList;
  },

  /* ================= HOME ================= */
  async home() {
    const app = document.getElementById("app");
    app.innerHTML = `
      <section class="section">
        <div id="carouselSlot"><div class="carousel" style="display:flex;align-items:center;justify-content:center;"><div class="spinner"></div></div></div>
      </section>
      <section class="section">
        <div class="section-head">
          <div class="section-title"><span class="bar"></span> Anime Terbaru</div>
          <a href="#/home" data-link class="section-link">LIHAT SEMUA &rarr;</a>
        </div>
        <div id="newAnimeSlot">${Components.skeletonNewGrid(6)}</div>
      </section>
    `;

    try {
      const list = await this.ensureNewListCache();

      // Carousel: take first 6 as "trending"
      const trending = list.slice(0, 6);
      document.getElementById("carouselSlot").innerHTML = Components.carousel(trending);
      Components.initCarousel(trending.length);

      // New anime 2-col card grid
      document.getElementById("newAnimeSlot").innerHTML = Components.newAnimeGrid(list);
      App.bindBookmarkButtons();

    } catch (err) {
      console.error(err);
      document.getElementById("newAnimeSlot").innerHTML = Components.errorState(err.message, "#/home");
      document.getElementById("carouselSlot").innerHTML = "";
    }
  },

  /* ================= DETAIL ================= */
  async detail({ slug }) {
    const app = document.getElementById("app");
    app.innerHTML = `<div id="detailSlot" class="detail-loading-wrap">${Components.skeletonDetailNew()}</div>`;

    try {
      const anime = await Api.getDetail(slug);
      const bookmarked = Storage.isBookmarked(anime.url || slug);
      const animeUrl = anime.url || slug;
      const firstEpHref = anime.episodes.length
        ? `#/watch/${encodeURIComponent(anime.episodes[0].url)}?anime=${encodeURIComponent(animeUrl)}`
        : null;

      // Update schedule text from status
      const scheduleText = anime.status && anime.status !== "-"
        ? `Update ${Components.escapeHtml(anime.status)}`
        : "";

      document.getElementById("detailSlot").innerHTML = `
        <!-- HERO SECTION -->
        <div class="dv2-hero">
          <div class="dv2-hero-bg" style="background-image:url('${Components.escapeHtml(anime.cover)}')"></div>
          <div class="dv2-hero-gradient"></div>

          <!-- Top bar: back button -->
          <div class="dv2-topbar">
            <button class="dv2-back-btn" onclick="history.back()">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
          </div>

          <!-- Hero content overlay -->
          <div class="dv2-hero-body">
            ${scheduleText ? `<div class="dv2-schedule-badge">📅 ${scheduleText}</div>` : ""}
            <h1 class="dv2-title">${Components.escapeHtml(anime.title)}</h1>
            <p class="dv2-title-native">${Components.escapeHtml(anime.title)}</p>

            <!-- Meta pills -->
            <div class="dv2-meta-row">
              ${anime.rating && anime.rating !== "-" ? `<span class="dv2-meta-pill dv2-rating"><svg width="13" height="13" viewBox="0 0 24 24" fill="#f1c40f"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> ${Components.escapeHtml(anime.rating)}</span>` : ""}
              ${anime.studio && anime.studio !== "-" ? `<span class="dv2-meta-pill">${Components.escapeHtml(anime.studio)}</span>` : ""}
              ${anime.releaseDate && anime.releaseDate !== "-" ? `<span class="dv2-meta-pill">${Components.escapeHtml(anime.releaseDate)}</span>` : ""}
              ${anime.type && anime.type !== "-" ? `<span class="dv2-meta-pill">${Components.escapeHtml(anime.type)}</span>` : ""}
              <span class="dv2-meta-pill dv2-views">6.5K views</span>
            </div>

            <!-- Genre chips -->
            ${anime.genres.length ? `
            <div class="dv2-genre-row">
              ${anime.genres.map(g => `<a href="#/genres/${encodeURIComponent(g)}" data-link class="dv2-genre-chip">${Components.escapeHtml(g)}</a>`).join("")}
            </div>` : ""}

            <!-- Action buttons -->
            <div class="dv2-action-row">
              ${firstEpHref ? `<a href="${firstEpHref}" data-link class="dv2-btn-watch">Tonton Sekarang</a>` : ""}
              <button class="dv2-btn-subscribe ${bookmarked ? "subscribed" : ""}" id="detailBookmarkBtn">
                ${bookmarked ? "★ Tersimpan" : "Subscribe"}
              </button>
            </div>

            <!-- Type & schedule tags -->
            <div class="dv2-tag-row">
              ${anime.type && anime.type !== "-" ? `<span class="dv2-tag">${Components.escapeHtml(anime.type)}</span>` : ""}
              ${scheduleText ? `<span class="dv2-tag">${scheduleText}</span>` : ""}
            </div>
          </div>
        </div>

        <!-- SYNOPSIS -->
        <div class="dv2-card">
          <div class="dv2-section-head">
            <span class="dv2-section-title">Synopsis</span>
            <button class="dv2-read-more" id="synopsisToggle">Baca semua</button>
          </div>
          <p class="dv2-synopsis" id="synopsisText">${Components.escapeHtml(anime.synopsis)}</p>
        </div>

        <!-- EPISODE LIST -->
        <div class="dv2-card">
          <div class="dv2-section-head">
            <span class="dv2-section-title">Daftar Episode</span>
            <span class="dv2-ep-count">${anime.episodes.length} Episode</span>
          </div>
          <div class="dv2-episode-list">
            ${this.renderEpisodeListV2(anime.episodes, animeUrl)}
          </div>
        </div>

        <!-- RELATED ANIME (load from cache) -->
        <div class="dv2-card" id="relatedSection">
          <div class="dv2-section-head">
            <span class="dv2-section-title">Related Anime</span>
          </div>
          <div class="dv2-related-grid" id="relatedGrid">
            ${Components.skeletonGrid(4)}
          </div>
        </div>
      `;

      // Bookmark button
      document.getElementById("detailBookmarkBtn").addEventListener("click", (e) => {
        const isNow = Storage.toggleBookmark({ url: animeUrl, title: anime.title, cover: anime.cover });
        e.target.classList.toggle("subscribed", isNow);
        e.target.textContent = isNow ? "★ Tersimpan" : "Subscribe";
        Components.toast(isNow ? "Ditambahkan ke bookmark" : "Dihapus dari bookmark");
      });

      // Synopsis toggle
      const synText = document.getElementById("synopsisText");
      const synToggle = document.getElementById("synopsisToggle");
      let expanded = false;
      synText.classList.add("synopsis-clamp");
      synToggle.addEventListener("click", () => {
        expanded = !expanded;
        synText.classList.toggle("synopsis-clamp", !expanded);
        synToggle.textContent = expanded ? "Sembunyikan" : "Baca semua";
      });

      // Load related anime
      try {
        const list = await this.ensureNewListCache();
        const related = list.filter(a => a.url !== animeUrl).slice(0, 8);
        document.getElementById("relatedGrid").innerHTML = Components.animeGrid(related);
        App.bindBookmarkButtons();
      } catch (_) {
        document.getElementById("relatedSection").style.display = "none";
      }

    } catch (err) {
      console.error(err);
      document.getElementById("detailSlot").innerHTML = Components.errorState(err.message, `#/anime/${encodeURIComponent(slug)}`);
    }
  },

  renderEpisodeListV2(episodes, animeUrl) {
    if (!episodes.length) {
      return Components.emptyState("📺", "Belum ada episode", "Episode akan tersedia segera.");
    }
    // show latest first (reverse)
    const reversed = [...episodes].reverse();
    return reversed.map(ep => {
      const watched = Storage.isEpisodeWatched(ep.url);
      return `<a href="#/watch/${encodeURIComponent(ep.url)}?anime=${encodeURIComponent(animeUrl)}" data-link
                  class="dv2-ep-item ${watched ? "watched" : ""}">
        <div class="dv2-ep-num">${ep.number}</div>
        <div class="dv2-ep-info">
          <div class="dv2-ep-title">${Components.escapeHtml(ep.title)}</div>
          ${ep.date ? `<div class="dv2-ep-date">${Components.escapeHtml(ep.date)}</div>` : ""}
        </div>
        <div class="dv2-ep-arrow">›</div>
        ${watched ? `<div class="dv2-ep-watched">✓</div>` : ""}
      </a>`;
    }).join("");
  },

  renderEpisodeList(episodes, animeUrl) {
    if (!episodes.length) {
      return Components.emptyState("📺", "Belum ada episode", "Episode akan tersedia segera.");
    }
    return `<div class="episode-list">${episodes.map(ep => {
      const watched = Storage.isEpisodeWatched(ep.url);
      return `<a href="#/watch/${encodeURIComponent(ep.url)}?anime=${encodeURIComponent(animeUrl)}" data-link
                  class="episode-pill ${watched ? "watched" : ""}">${Components.escapeHtml(ep.title)}</a>`;
    }).join("")}</div>`;
  },



  /* ================= WATCH (EPISODE PLAYER) ================= */
  async watch({ episodeUrl }, queryParams) {
    const app = document.getElementById("app");
    const animeUrl = queryParams.get("anime") || "";
    let reso = queryParams.get("reso") || "720p";

    app.innerHTML = `
      <div class="watch-layout">
        <div>
          <div class="player-wrap" id="playerWrap">
            <div class="player-overlay-msg"><div class="spinner"></div><span>Memuat video...</span></div>
          </div>
          <div class="ep-title-row">
            <div class="ep-title" id="epTitleSlot">Memuat...</div>
            <div class="ep-controls">
              <select class="reso-select" id="resoSelect">
                <option value="360p">360p</option>
                <option value="480p">480p</option>
                <option value="720p" selected>720p</option>
                <option value="1080p">1080p</option>
                <option value="4K">4K</option>
              </select>
            </div>
          </div>
          <div class="like-bar">
            <button class="like-btn" id="likeBtn">👍 <span id="likeCount">0</span></button>
            <button class="like-btn" id="dislikeBtn">👎 <span id="dislikeCount">0</span></button>
          </div>
          <div class="nav-ep-row">
            <a href="#" class="nav-ep-btn disabled" id="prevEpBtn">‹ Episode Sebelumnya</a>
            <a href="#/anime/${encodeURIComponent(animeUrl)}" data-link class="nav-ep-btn">📋 Semua Episode</a>
            <a href="#" class="nav-ep-btn disabled" id="nextEpBtn">Episode Berikutnya ›</a>
          </div>
        </div>
        <aside class="side-panel" id="sidePanel">
          <h3>Daftar Episode</h3>
          <div class="center-loader"><div class="spinner"></div></div>
        </aside>
      </div>
    `;

    const resoSelect = document.getElementById("resoSelect");
    resoSelect.value = reso;

    // load anime detail for sidebar + prev/next (independent of episode call, runs in parallel)
    const detailPromise = animeUrl ? Api.getDetail(animeUrl).catch(() => null) : Promise.resolve(null);

    await this.loadEpisode(episodeUrl, reso, animeUrl); // also sets _lastServerReaction & refreshes reaction UI

    document.getElementById("resoSelect").addEventListener("change", (e) => {
      const newReso = e.target.value;
      location.hash = `#/watch/${encodeURIComponent(episodeUrl)}?anime=${encodeURIComponent(animeUrl)}&reso=${newReso}`;
    });

    document.getElementById("likeBtn").addEventListener("click", () => this.handleReaction(episodeUrl, "like"));
    document.getElementById("dislikeBtn").addEventListener("click", () => this.handleReaction(episodeUrl, "dislike"));

    const animeDetail = await detailPromise;
    if (animeDetail) {
      this.renderSidePanel(animeDetail, episodeUrl, animeUrl);
      this.setupPrevNext(animeDetail, episodeUrl, animeUrl, reso);
      // judul episode API stream tidak menyediakan field judul, jadi ambil dari daftar episode anime
      const currentEp = animeDetail.episodes.find(e => e.url === episodeUrl);
      if (currentEp) document.getElementById("epTitleSlot").textContent = `${animeDetail.title} — ${currentEp.title}`;
      Storage.addHistory({
        animeUrl: animeDetail.url || animeUrl,
        animeTitle: animeDetail.title,
        cover: animeDetail.cover,
        episodeUrl,
        episodeTitle: currentEp ? currentEp.title : "Episode",
      });
    } else {
      document.getElementById("sidePanel").innerHTML = `<h3>Daftar Episode</h3>` + Components.emptyState("📭", "Tidak tersedia", "Info anime tidak dapat dimuat.");
    }
  },

  async loadEpisode(episodeUrl, reso, animeUrl) {
    const playerWrap = document.getElementById("playerWrap");
    const epTitleSlot = document.getElementById("epTitleSlot");
    playerWrap.innerHTML = `<div class="player-overlay-msg"><div class="spinner"></div><span>Memuat video (${reso})...</span></div>`;

    try {
      const ep = await Api.getEpisode(episodeUrl, reso);
      epTitleSlot.textContent = "Episode"; // akan diganti dengan judul lengkap setelah detail anime termuat

      // sesuaikan opsi resolusi dengan yang benar-benar tersedia dari server
      this.updateResoOptions(ep.availableReso, reso);

      // simpan like/dislike count terbaru dari server ke cache lokal supaya tetap konsisten antar halaman
      this._lastServerReaction = { likeCount: ep.likeCount, dislikeCount: ep.dislikeCount };
      this.refreshReactionUI(episodeUrl);

      const allSources = [ep.videoUrl, ...ep.mirrors.map(m => m.link)].filter(Boolean);

      if (allSources.length) {
        this.renderPlayerWithFallback(allSources, reso);
      } else {
        playerWrap.innerHTML = `<div class="player-overlay-msg">
            <span>⚠️ Sumber video resolusi ${Components.escapeHtml(reso)} tidak tersedia.</span>
            <span style="font-size:.8rem;opacity:.7;">Coba pilih resolusi lain.</span>
          </div>`;
      }
    } catch (err) {
      console.error(err);
      playerWrap.innerHTML = `<div class="player-overlay-msg">
          <span>⚠️ Gagal memuat video.</span>
          <span style="font-size:.8rem;opacity:.7;">${Components.escapeHtml(err.message)}</span>
        </div>`;
    }
  },

  /* Render video, dan otomatis coba mirror berikutnya kalau sumber pertama gagal load
     (beberapa provider sering down/expired). */
  renderPlayerWithFallback(sources, reso) {
    const playerWrap = document.getElementById("playerWrap");
    let idx = 0;

    const tryNext = () => {
      if (idx >= sources.length) {
        playerWrap.innerHTML = `<div class="player-overlay-msg">
            <span>⚠️ Semua sumber video (${sources.length} mirror) gagal dimuat.</span>
            <span style="font-size:.8rem;opacity:.7;">Coba pilih resolusi lain atau muat ulang.</span>
          </div>`;
        return;
      }
      const src = sources[idx];
      playerWrap.innerHTML = `
        <video controls autoplay playsinline id="videoPlayer">
          <source src="${Components.escapeHtml(src)}" type="video/mp4">
          Browser Anda tidak mendukung pemutar video HTML5.
        </video>`;
      const videoEl = document.getElementById("videoPlayer");
      videoEl.addEventListener("error", () => {
        idx += 1;
        tryNext();
      }, { once: true });
    };

    tryNext();
  },

  updateResoOptions(availableReso, currentReso) {
    const select = document.getElementById("resoSelect");
    if (!select || !availableReso || !availableReso.length) return;
    select.innerHTML = availableReso.map(r =>
      `<option value="${r}" ${r === currentReso ? "selected" : ""}>${r}</option>`
    ).join("");
  },

  renderSidePanel(animeDetail, currentEpisodeUrl, animeUrl) {
    const panel = document.getElementById("sidePanel");
    if (!animeDetail.episodes.length) {
      panel.innerHTML = `<h3>Daftar Episode</h3>` + Components.emptyState("📭", "Kosong", "Tidak ada episode lain.");
      return;
    }
    panel.innerHTML = `
      <h3>${Components.escapeHtml(animeDetail.title)}</h3>
      ${animeDetail.episodes.map(ep => `
        <a href="#/watch/${encodeURIComponent(ep.url)}?anime=${encodeURIComponent(animeUrl)}" data-link
           class="side-ep-item ${ep.url === currentEpisodeUrl ? "current" : ""}">
          <span class="side-ep-num">${ep.number}</span>
          <span>${Components.escapeHtml(ep.title)}</span>
        </a>
      `).join("")}
    `;
  },

  setupPrevNext(animeDetail, currentEpisodeUrl, animeUrl, reso) {
    const episodes = animeDetail.episodes;
    const idx = episodes.findIndex(e => e.url === currentEpisodeUrl);
    const prevBtn = document.getElementById("prevEpBtn");
    const nextBtn = document.getElementById("nextEpBtn");

    if (idx > 0) {
      const prevEp = episodes[idx - 1];
      prevBtn.classList.remove("disabled");
      prevBtn.href = `#/watch/${encodeURIComponent(prevEp.url)}?anime=${encodeURIComponent(animeUrl)}&reso=${reso}`;
      prevBtn.setAttribute("data-link", "");
    }
    if (idx >= 0 && idx < episodes.length - 1) {
      const nextEp = episodes[idx + 1];
      nextBtn.classList.remove("disabled");
      nextBtn.href = `#/watch/${encodeURIComponent(nextEp.url)}?anime=${encodeURIComponent(animeUrl)}&reso=${reso}`;
      nextBtn.setAttribute("data-link", "");
    }
  },

  handleReaction(episodeUrl, type) {
    Storage.setReaction(episodeUrl, type);
    this.refreshReactionUI(episodeUrl);
  },

  refreshReactionUI(episodeUrl) {
    const r = Storage.getReaction(episodeUrl);
    const likeBtn = document.getElementById("likeBtn");
    const dislikeBtn = document.getElementById("dislikeBtn");

    // Base count datang dari server (jumlah like/dislike global episode ini).
    // Status "sudah like/dislike" tetap dari localStorage karena API tidak
    // mengembalikan auth per-user yang konsisten antar request.
    const serverBase = this._lastServerReaction || { likeCount: 0, dislikeCount: 0 };
    const likeTotal = serverBase.likeCount + (r.liked ? 1 : 0);
    const dislikeTotal = serverBase.dislikeCount + (r.disliked ? 1 : 0);

    document.getElementById("likeCount").textContent = likeTotal;
    document.getElementById("dislikeCount").textContent = dislikeTotal;
    likeBtn.classList.toggle("liked", r.liked);
    dislikeBtn.classList.toggle("disliked", r.disliked);
  },

  /* ================= GENRES ================= */
  async genres({ genreName }) {
    const app = document.getElementById("app");
    const allGenres = ["Action", "Romance", "Comedy", "Fantasy", "Isekai", "Drama", "Slice of Life", "Horror", "Sci-Fi", "Sports", "Mystery", "Adventure", "Supernatural", "Psychological", "Music"];

    app.innerHTML = `
      <section class="section">
        <div class="section-head">
          <div class="section-title"><span class="bar"></span> ${genreName ? `Genre: ${Components.escapeHtml(genreName)}` : "Jelajahi Genre"}</div>
        </div>
        <div class="chip-row" id="genreChips">
          ${allGenres.map(g => `<a href="#/genres/${encodeURIComponent(g)}" data-link class="chip ${g === genreName ? "active" : ""}">${g}</a>`).join("")}
        </div>
      </section>
      <section class="section">
        <div id="genreResultSlot">${Components.skeletonGrid(10)}</div>
      </section>
    `;

    if (!genreName) {
      document.getElementById("genreResultSlot").innerHTML = Components.emptyState(
        "🏷️", "Pilih Genre", "Klik salah satu genre di atas untuk melihat anime terkait."
      );
      return;
    }

    try {
      // NOTE: endpoint /new tidak menyediakan field genre, jadi filter genre
      // di sini bersifat best-effort berdasarkan judul (placeholder UX) sampai
      // backend menyediakan endpoint genre khusus.
      const list = await this.ensureNewListCache();
      document.getElementById("genreResultSlot").innerHTML = `
        ${Components.emptyState(
          "🔧", "Genre filter terbatas",
          "API saat ini belum menyediakan data genre per-anime di endpoint daftar. Menampilkan semua anime terbaru sebagai gantinya.",
        )}
        ${Components.animeGrid(list)}
      `;
      App.bindBookmarkButtons();
    } catch (err) {
      document.getElementById("genreResultSlot").innerHTML = Components.errorState(err.message);
    }
  },

  /* ================= BOOKMARKS ================= */
  bookmarks() {
    const app = document.getElementById("app");
    const list = Storage.getBookmarks();

    app.innerHTML = `
      <section class="section">
        <div class="section-head">
          <div class="section-title"><span class="bar"></span> Anime Tersimpan (${list.length})</div>
        </div>
        <div id="bookmarkList"></div>
      </section>
    `;

    const slot = document.getElementById("bookmarkList");
    if (!list.length) {
      slot.innerHTML = Components.emptyState("🔖", "Belum ada bookmark", "Tambahkan anime favorit Anda dengan menekan ikon bintang.",
        `<a href="#/home" data-link class="btn btn-primary">Jelajahi Anime</a>`);
      return;
    }

    slot.innerHTML = list.map(b => `
      <div class="list-row">
        <a href="#/anime/${encodeURIComponent(b.url)}" data-link>
          <img src="${Components.escapeHtml(b.cover)}" alt="${Components.escapeHtml(b.title)}" onerror="this.src='${Components.placeholderImg()}'">
        </a>
        <div class="list-row-body">
          <a href="#/anime/${encodeURIComponent(b.url)}" data-link><div class="list-row-title">${Components.escapeHtml(b.title)}</div></a>
          <div class="list-row-meta">Ditambahkan ${new Date(b.addedAt).toLocaleDateString("id-ID")}</div>
        </div>
        <div class="list-row-actions">
          <button class="icon-action" data-remove-bookmark="${Components.escapeHtml(b.url)}" aria-label="Hapus">🗑️</button>
        </div>
      </div>
    `).join("");

    slot.querySelectorAll("[data-remove-bookmark]").forEach(btn => {
      btn.addEventListener("click", () => {
        Storage.removeBookmark(btn.dataset.removeBookmark);
        Components.toast("Bookmark dihapus");
        Pages.bookmarks();
      });
    });
  },

  /* ================= HISTORY ================= */
  history() {
    const app = document.getElementById("app");
    const list = Storage.getHistory();

    app.innerHTML = `
      <section class="section">
        <div class="section-head">
          <div class="section-title"><span class="bar"></span> Riwayat Tontonan (${list.length})</div>
          ${list.length ? `<button class="section-link" id="clearHistoryBtn" style="background:none;border:none;cursor:pointer;">Hapus Semua</button>` : ""}
        </div>
        <div id="historyList"></div>
      </section>
    `;

    const slot = document.getElementById("historyList");
    if (!list.length) {
      slot.innerHTML = Components.emptyState("🕒", "Belum ada riwayat", "Anime yang Anda tonton akan muncul di sini.",
        `<a href="#/home" data-link class="btn btn-primary">Mulai Nonton</a>`);
      return;
    }

    slot.innerHTML = list.map(h => `
      <div class="list-row">
        <a href="#/watch/${encodeURIComponent(h.episodeUrl)}?anime=${encodeURIComponent(h.animeUrl)}" data-link>
          <img src="${Components.escapeHtml(h.cover)}" alt="${Components.escapeHtml(h.animeTitle)}" onerror="this.src='${Components.placeholderImg()}'">
        </a>
        <div class="list-row-body">
          <a href="#/watch/${encodeURIComponent(h.episodeUrl)}?anime=${encodeURIComponent(h.animeUrl)}" data-link>
            <div class="list-row-title">${Components.escapeHtml(h.animeTitle)}</div>
          </a>
          <div class="list-row-meta">${Components.escapeHtml(h.episodeTitle)} · ${new Date(h.watchedAt).toLocaleString("id-ID")}</div>
        </div>
        <div class="list-row-actions">
          <button class="icon-action" data-remove-history="${Components.escapeHtml(h.episodeUrl)}" aria-label="Hapus">🗑️</button>
        </div>
      </div>
    `).join("");

    slot.querySelectorAll("[data-remove-history]").forEach(btn => {
      btn.addEventListener("click", () => {
        Storage.removeHistory(btn.dataset.removeHistory);
        Components.toast("Riwayat dihapus");
        Pages.history();
      });
    });

    document.getElementById("clearHistoryBtn")?.addEventListener("click", () => {
      if (confirm("Hapus semua riwayat tontonan?")) {
        Storage.clearHistory();
        Pages.history();
      }
    });
  },
};
