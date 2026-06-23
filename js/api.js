/* ============================================================
   API LAYER
   Semua request ke api.theresav.biz.id dilakukan di sini.
   Karena struktur JSON detail/episode tidak terverifikasi 100%,
   setiap fungsi "normalize" mencoba banyak nama field yang umum
   dipakai API anime sejenis, agar UI tetap berjalan walau
   nama key sedikit berbeda.
   ============================================================ */

const API_BASE = "https://api.theresav.biz.id/anime/animelovers";
const API_KEY = "myapikey-111";

const Api = {

  async _get(path, params = {}) {
    const url = new URL(`${API_BASE}/${path}`);
    url.searchParams.set("apikey", API_KEY);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
    });
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const json = await res.json();
    return json;
  },

  /* -------- list endpoint (homepage / new releases) -------- */
  async getNewAnime() {
    const json = await this._get("new");
    const raw = json.data || json.result || json.results || [];
    return raw.map(Api._normalizeListItem);
  },

  _normalizeListItem(item) {
    return {
      id: item.id ?? item.episode_id ?? null,
      url: item.url ?? item.slug ?? item.link ?? "",
      title: item.judul ?? item.title ?? item.name ?? "Untitled",
      cover: item.cover ?? item.thumbnail ?? item.image ?? item.poster ?? "",
      info: item.lastup ?? item.episode ?? item.status ?? "",
    };
  },

  /* -------- search (client-side filter over the new-list cache,
     plus best-effort attempt at a dedicated search endpoint) -------- */
  async search(query) {
    // Try a dedicated search endpoint first; if it 404s/fails, fall back.
    try {
      const json = await this._get("search", { q: query });
      const raw = json.data || json.result || [];
      if (Array.isArray(raw) && raw.length) {
        return raw.map(Api._normalizeListItem);
      }
    } catch (e) {
      /* ignore, fallback below */
    }
    return null; // signal caller to do local fallback filtering
  },

  /* -------- detail endpoint --------
     Struktur asli terkonfirmasi:
     { data: { data: [ { id, series_id, cover, judul, type, status, rating,
                          published, author, genre[], sinopsis, chapter[] } ] } }
     chapter[] = [{ id, ch, url, date }]  -- ch = label episode (e.g. "12 (End)")
  -------------------------------------- */
  async getDetail(slug) {
    const json = await this._get("detail", { url: slug });
    const d = json?.data?.data?.[0] ?? json?.data?.[0] ?? json?.data ?? {};
    return Api._normalizeDetail(d, slug);
  },

  _normalizeDetail(d, slug) {
    const genres = d.genre ?? d.genres ?? d.genreurl ?? [];
    const genreArr = Array.isArray(genres)
      ? genres.map(g => (typeof g === "string" ? g : (g.name ?? g.judul ?? "")))
      : (typeof genres === "string" ? genres.split(",").map(s => s.trim()) : []);

    const chapterRaw = d.chapter ?? d.episode ?? d.episode_list ?? d.episodes ?? [];
    // API mengembalikan chapter terbaru lebih dulu (descending) — urutkan ascending untuk player & next/prev
    const episodes = (Array.isArray(chapterRaw) ? chapterRaw : [])
      .map(Api._normalizeEpisodeListItem)
      .reverse();

    return {
      url: d.series_id ?? d.url ?? slug,
      title: d.judul ?? d.title ?? d.name ?? "Untitled",
      cover: d.cover ?? d.thumbnail ?? d.image ?? d.poster ?? "",
      rating: d.rating ?? d.score ?? d.nilai ?? "-",
      status: d.status ?? d.state ?? "-",
      releaseDate: d.published ?? d.tanggal_rilis ?? d.release_date ?? d.rilis ?? d.aired ?? "-",
      studio: d.author ?? d.studio ?? d.produser ?? "-",
      genres: genreArr.filter(Boolean),
      synopsis: d.sinopsis ?? d.synopsis ?? d.deskripsi ?? d.description ?? "Sinopsis tidak tersedia.",
      episodes,
      type: d.type ?? d.tipe ?? "-",
      duration: d.durasi ?? d.duration ?? "-",
    };
  },

  _normalizeEpisodeListItem(ep, idx) {
    if (typeof ep === "string") {
      return { url: ep, title: `Episode ${idx + 1}`, number: idx + 1 };
    }
    // ch contoh: "12 (End)" atau "11" -> ambil angka di depan sebagai nomor urut
    const chLabel = ep.ch ?? ep.episode ?? ep.judul ?? ep.title ?? `${idx + 1}`;
    const numMatch = String(chLabel).match(/[\d.]+/);
    return {
      url: ep.url ?? ep.slug ?? ep.link ?? ep.episode_url ?? "",
      title: `Episode ${chLabel}`,
      number: numMatch ? parseFloat(numMatch[0]) : (idx + 1),
      date: ep.date ?? null,
    };
  },

  /* -------- episode/stream endpoint --------
     Struktur asli terkonfirmasi:
     { resolution: "720p",
       data: { data: [ { episode_id, likeCount, dislikeCount, userLikeStatus,
                          reso: ["360p","480p","720p","1080p","4K"],
                          stream: [ { reso, link, provide } ] } ] } }
     Catatan: array "stream" bisa berisi beberapa provider untuk reso yang
     SAMA dengan yang diminta (server tampaknya mengembalikan provider untuk
     reso yang diminta saja, bukan seluruh reso). Kita ambil seluruh entri
     stream yang reso-nya cocok, dan pakai entri pertama sebagai sumber utama,
     entri lain sebagai mirror.
  -------------------------------------- */
  async getEpisode(episodeUrl, reso) {
    const json = await this._get("episode", { url: episodeUrl, reso });
    const d = json?.data?.data?.[0] ?? json?.data?.[0] ?? json?.data ?? {};
    return Api._normalizeEpisode(d, episodeUrl, reso);
  },

  _normalizeEpisode(d, episodeUrl, requestedReso) {
    const streamArr = Array.isArray(d.stream) ? d.stream : [];
    const availableReso = Array.isArray(d.reso) ? d.reso : ["360p", "480p", "720p", "1080p", "4K"];

    // cocokkan stream dengan reso yang diminta; fallback ke entri pertama jika tidak match
    const matching = streamArr.filter(s => s.reso === requestedReso);
    const candidates = matching.length ? matching : streamArr;

    const primary = candidates[0] || null;
    const mirrors = candidates.slice(1);

    return {
      url: episodeUrl,
      title: d.title ?? d.judul ?? `Episode`,
      videoUrl: primary?.link ?? "",
      mirrors: mirrors.map(m => ({ link: m.link, provide: m.provide })),
      availableReso,
      likeCount: d.likeCount ?? 0,
      dislikeCount: d.dislikeCount ?? 0,
      userLikeStatus: d.userLikeStatus ?? 0, // 0 = none, 1 = like, -1 = dislike (asumsi)
      episodeId: d.episode_id ?? null,
      nextEpisode: d.next_episode ?? d.next ?? null,
      prevEpisode: d.prev_episode ?? d.previous ?? null,
    };
  },
};
