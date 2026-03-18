(() => {
  const API_BASE = "https://maple-bundle-new.maple-bundle.workers.dev";

  const els = {
    bucketStartInput: document.getElementById("hwanMin"),
    bucketEndInput: document.getElementById("hwanMax"),
    periodSelect: document.getElementById("periodSelect"),
    slotSelect: document.getElementById("slotSelect"),
    sortSelect: document.getElementById("sortSelect"),
    applyBtn: document.getElementById("applyStatsHwanFilter"),

    summaryCount: document.getElementById("statsSummaryCount"),
    summaryTopItem: document.getElementById("statsSummaryTopItem"),
    summaryAvgGain: document.getElementById("statsSummaryAvgGain"),
    summarySetTrend: document.getElementById("statsSummarySetTrend"),

    rankingBody: document.getElementById("statsHwanTableBody"),
    prevBtn: document.getElementById("statsPrevPage"),
    pageInfo: document.getElementById("statsPageInfo"),
    nextBtn: document.getElementById("statsNextPage"),
  };

  let currentPage = 1;
  let totalPages = 1;

  const safe = (v, fb = "-") =>
    v === null || v === undefined || String(v).trim() === "" ? fb : String(v);

  const safeNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const fmt = (v) => {
    const n = safeNum(v);
    return n === null ? "-" : n.toLocaleString("ko-KR");
  };

  const esc = (s) =>
    String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  function mapPeriod(v) {
    if (v === "week") return "7d";
    if (v === "month") return "all";
    return "today";
  }

  function mapSort(v) {
    if (v === "gain") return "avg_delta_hwan";
    return "count";
  }

  function buildSummaryParams() {
    const p = new URLSearchParams();
    p.set("bucket_start", els.bucketStartInput?.value?.trim() || "90000");
    p.set("bucket_end", els.bucketEndInput?.value?.trim() || "94999");
    p.set("period", mapPeriod(els.periodSelect?.value || "today"));
    return p;
  }

  function buildRankingParams(page = 1) {
    const p = buildSummaryParams();
    p.set("slot_key", els.slotSelect?.value || "");
    p.set("sort", mapSort(els.sortSelect?.value || "count"));
    p.set("page", String(page));
    p.set("page_size", "10");
    return p;
  }

  async function fetchJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  function renderSummary(summary) {
    if (els.summaryCount) {
      els.summaryCount.textContent = fmt(summary.search_count);
    }

    if (els.summaryTopItem) {
      const item = summary.top_recommended_item;
      if (item && typeof item === "object") {
        els.summaryTopItem.textContent = safe(item.item_name || item.name, "-");
      } else {
        els.summaryTopItem.textContent = safe(item, "-");
      }
    }

    if (els.summaryAvgGain) {
      els.summaryAvgGain.textContent = `+${fmt(Math.round(Number(summary.avg_delta_hwan || 0)))}`;
    }

    if (els.summarySetTrend) {
      if (Array.isArray(summary.set_summary)) {
        els.summarySetTrend.textContent = summary.set_summary.join(", ");
      } else {
        els.summarySetTrend.textContent = safe(summary.set_summary, "-");
      }
    }
  }

  function renderTable(items) {
    if (!els.rankingBody) return;

    if (!Array.isArray(items) || !items.length) {
      els.rankingBody.innerHTML = `<tr><td colspan="7" style="padding:18px;">데이터가 없습니다.</td></tr>`;
      return;
    }

    els.rankingBody.innerHTML = items.map((item) => `
      <tr>
        <td style="padding:12px;">${safe(item.rank)}</td>
        <td style="padding:12px;">${esc(safe(item.item_name))}</td>
        <td style="padding:12px;">${esc(safe(item.slot_key))}</td>
        <td style="padding:12px;">${fmt(item.count)}</td>
        <td style="padding:12px;">${fmt(item.avg_rank)}</td>
        <td style="padding:12px;">+${fmt(Math.round(Number(item.avg_delta_hwan || 0)))}</td>
        <td style="padding:12px;">${safeNum(item.representative_starforce) === null ? "-" : `${item.representative_starforce}성`}</td>
      </tr>
    `).join("");
  }

  async function load(page = 1) {
    if (els.rankingBody) {
      els.rankingBody.innerHTML = `<tr><td colspan="7" style="padding:18px;">데이터를 불러오는 중...</td></tr>`;
    }

    try {
      console.log("stats-hwan init");
      console.log("stats-hwan fetch");
      console.log("stats-hwan fetch");

      const summaryUrl = `${API_BASE}/stats/hwan-item-summary?${buildSummaryParams().toString()}`;
      const rankingUrl = `${API_BASE}/stats/hwan-item-ranking?${buildRankingParams(page).toString()}`;

      const [summary, ranking] = await Promise.all([
        fetchJson(summaryUrl),
        fetchJson(rankingUrl),
      ]);

      renderSummary(summary);

      const items = Array.isArray(ranking.items) ? ranking.items : [];
      currentPage = Number(ranking.page || 1);
      totalPages = Number(ranking.total_pages || 1);

      renderTable(items);

      if (els.pageInfo) els.pageInfo.textContent = `${currentPage} / ${totalPages}`;
      if (els.prevBtn) els.prevBtn.disabled = currentPage <= 1;
      if (els.nextBtn) els.nextBtn.disabled = currentPage >= totalPages;
    } catch (err) {
      console.error(err);
      if (els.rankingBody) {
        els.rankingBody.innerHTML = `<tr><td colspan="7" style="padding:18px;">데이터를 불러오지 못했습니다.</td></tr>`;
      }
      if (els.pageInfo) els.pageInfo.textContent = `1 / 1`;
    }
  }

  function init() {
    if (els.applyBtn) {
      els.applyBtn.addEventListener("click", () => load(1));
    }
    if (els.prevBtn) {
      els.prevBtn.addEventListener("click", () => {
        if (currentPage > 1) load(currentPage - 1);
      });
    }
    if (els.nextBtn) {
      els.nextBtn.addEventListener("click", () => {
        if (currentPage < totalPages) load(currentPage + 1);
      });
    }

    if (els.bucketStartInput && !els.bucketStartInput.value) els.bucketStartInput.value = "90000";
    if (els.bucketEndInput && !els.bucketEndInput.value) els.bucketEndInput.value = "94999";

    load(1);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
