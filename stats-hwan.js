(() => {
  const API_BASE = "https://maple-bundle-new.maple-bundle.workers.dev";
  const BUCKETS_ENDPOINT = `${API_BASE}/stats/hwan-buckets/today`;

  const els = {
    dailyDiagnosisCount: document.getElementById("dailyDiagnosisCount"),
    bucketStartInput: document.getElementById("hwanMin"),
    bucketEndInput: document.getElementById("hwanMax"),
    periodSelect: document.getElementById("periodSelect"),
    slotSelect: document.getElementById("slotSelect"),
    sortSelect: document.getElementById("sortSelect"),
    applyBtn: document.getElementById("applyStatsHwanFilter"),

    summaryCount: document.getElementById("statsSummaryCount"),
    summaryTopItem: document.getElementById("statsSummaryTopItem"),
    summaryTopItemMeta: document.getElementById("statsSummaryTopItemMeta"),
    summaryAvgGain: document.getElementById("statsSummaryAvgGain"),
    summarySetTrend: document.getElementById("statsSummarySetTrend"),
    summarySetTrendMeta: document.getElementById("statsSummarySetTrendMeta"),

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
    p.set("bucket_end", els.bucketEndInput?.value?.trim() || "99999");
    p.set("period", mapPeriod(els.periodSelect?.value || "today"));

    const slotKey = els.slotSelect?.value || "";
    if (slotKey) p.set("slot_key", slotKey);

    return p;
  }

  function buildRankingParams(page = 1) {
    const p = buildSummaryParams();
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

  function firstOf(...vals) {
    for (const value of vals) {
      if (value !== null && value !== undefined && String(value).trim() !== "") return value;
    }
    return null;
  }

  function deriveDailyDiagnosisCount(data) {
    const explicit = firstOf(
      data?.today_diagnosis_count,
      data?.diagnosis_count,
      data?.today_count,
      data?.total_count
    );
    const direct = safeNum(explicit);
    if (direct !== null && direct > 0) return direct;

    const rows = Array.isArray(firstOf(data?.buckets, data?.items, data?.results))
      ? firstOf(data?.buckets, data?.items, data?.results)
      : [];
    if (!rows.length) return null;

    const total = rows.reduce((sum, row) => {
      const value = safeNum(firstOf(row?.count, row?.search_count, row?.diagnosis_count, 0));
      return sum + (value !== null && value > 0 ? value : 0);
    }, 0);
    return total > 0 ? total : null;
  }

  async function updateDailyDiagnosisCount() {
    if (!els.dailyDiagnosisCount) return;
    try {
      const data = await fetchJson(BUCKETS_ENDPOINT);
      const count = deriveDailyDiagnosisCount(data);
      els.dailyDiagnosisCount.textContent = count === null ? "오늘 진단 집계 중" : `오늘 진단 ${fmt(count)}건`;
    } catch (_) {
      els.dailyDiagnosisCount.textContent = "오늘 진단 집계 중";
    }
  }

  function getRepresentativeStarforceLabel(item) {
    const direct = safe(item?.representative_starforce_label, "");
    if (direct && direct !== "-") return direct;

    const starforce = safeNum(item?.representative_starforce);
    return starforce === null ? "" : `${starforce}성`;
  }

  function buildItemTitle(item) {
    const itemName = safe(item?.item_name || item?.name, "-");
    const starforceLabel = getRepresentativeStarforceLabel(item);
    return starforceLabel ? `${starforceLabel} ${itemName}` : itemName;
  }

  function stringifySetSummary(value) {
    if (!value) return { main: "-", meta: "-" };

    if (typeof value === "string") {
      return { main: value, meta: "-" };
    }

    if (Array.isArray(value)) {
      const parts = value
        .map((x) => {
          if (typeof x === "string") return x;
          if (x && typeof x === "object") {
            const label =
              x.label ||
              x.name ||
              x.set_name ||
              x.setName ||
              x.key ||
              x.slot_key ||
              "";
            const count =
              x.count ??
              x.value ??
              x.observed_count ??
              x.freq ??
              null;
            if (label && count !== null) return `${label} ${count}회`;
            if (label) return label;
          }
          return "";
        })
        .filter(Boolean);

      return {
        main: parts[0] || "-",
        meta: parts.slice(1).join(", ") || "-"
      };
    }

    if (typeof value === "object") {
      const label =
        value.label ||
        value.name ||
        value.set_name ||
        value.setName ||
        value.key ||
        "-";

      const metaParts = [];

      if (value.count !== undefined && value.count !== null) {
        metaParts.push(`관측 ${value.count}회`);
      }
      if (value.rate !== undefined && value.rate !== null) {
        metaParts.push(`비중 ${value.rate}`);
      }
      if (value.detail) {
        metaParts.push(String(value.detail));
      }

      return {
        main: String(label),
        meta: metaParts.join(" · ") || "-"
      };
    }

    return { main: String(value), meta: "-" };
  }

  function topItemMetaText(item) {
    if (!item || typeof item !== "object") return "-";

    const slot = item.slot_key || item.slot || item.slotName || "";
    const star = getRepresentativeStarforceLabel(item);
    const potential = item.representative_potential_label || "";
    const additional = item.representative_additional_label || "";

    const parts = [slot, star, potential, additional].filter(Boolean);
    return parts.length ? parts.join(" · ") : "-";
  }

  function renderSummary(summary) {
    if (els.summaryCount) {
      els.summaryCount.textContent = fmt(summary.search_count);
    }

    if (els.summaryTopItem) {
      const item = summary.top_recommended_item;
      if (item && typeof item === "object") {
        els.summaryTopItem.textContent = buildItemTitle(item);
        if (els.summaryTopItemMeta) {
          els.summaryTopItemMeta.textContent = topItemMetaText(item);
        }
      } else {
        els.summaryTopItem.textContent = safe(item, "-");
        if (els.summaryTopItemMeta) {
          els.summaryTopItemMeta.textContent = "-";
        }
      }
    }

    if (els.summaryAvgGain) {
      els.summaryAvgGain.textContent = `+${fmt(Math.round(Number(summary.avg_delta_hwan || 0)))}`;
    }

    if (els.summarySetTrend) {
      const setInfo = stringifySetSummary(summary.set_summary);
      els.summarySetTrend.textContent = setInfo.main;
      if (els.summarySetTrendMeta) {
        els.summarySetTrendMeta.textContent = setInfo.meta;
      }
    }
  }

  function renderTable(items) {
    if (!els.rankingBody) return;

    if (!Array.isArray(items) || !items.length) {
      els.rankingBody.innerHTML = `<tr><td colspan="9" style="padding:18px;">데이터가 없습니다.</td></tr>`;
      return;
    }

    els.rankingBody.innerHTML = items.map((item) => `
      <tr>
        <td style="padding:12px;">${safe(item.rank)}</td>
        <td style="padding:12px;">${esc(buildItemTitle(item))}</td>
        <td style="padding:12px;">${esc(safe(item.slot_key))}</td>
        <td style="padding:12px;">${fmt(item.count)}</td>
        <td style="padding:12px;">${fmt(item.avg_rank)}</td>
        <td style="padding:12px;">+${fmt(Math.round(Number(item.avg_delta_hwan || 0)))}</td>
        <td style="padding:12px;">${esc(getRepresentativeStarforceLabel(item) || "-")}</td>
        <td style="padding:12px;">${esc(safe(item.representative_potential_label, "-"))}</td>
        <td style="padding:12px;">${esc(safe(item.representative_additional_label, "-"))}</td>
      </tr>
    `).join("");
  }

  async function load(page = 1) {
    if (els.rankingBody) {
      els.rankingBody.innerHTML = `<tr><td colspan="9" style="padding:18px;">데이터를 불러오는 중...</td></tr>`;
    }

    try {
      console.log("stats-hwan init");
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
        els.rankingBody.innerHTML = `<tr><td colspan="9" style="padding:18px;">데이터를 불러오지 못했습니다.</td></tr>`;
      }
      if (els.pageInfo) els.pageInfo.textContent = `1 / 1`;
      if (els.summarySetTrend) els.summarySetTrend.textContent = "-";
      if (els.summarySetTrendMeta) els.summarySetTrendMeta.textContent = "-";
    }
  }

  async function hydrateDefaultBuckets() {
    const startSet = els.bucketStartInput?.value?.trim();
    const endSet = els.bucketEndInput?.value?.trim();
    if (startSet && endSet) return;

    const params = new URLSearchParams(window.location.search);
    if (params.has("bucket_start") || params.has("bucket_end")) return;

    try {
      const payload = await fetchJson(BUCKETS_ENDPOINT);
      const topBucket = Array.isArray(payload?.buckets) ? payload.buckets[0] : null;
      const bucketStart = safeNum(topBucket?.bucket_start);
      const bucketEnd = safeNum(topBucket?.bucket_end);
      if (bucketStart !== null && bucketEnd !== null) {
        if (els.bucketStartInput) els.bucketStartInput.value = String(bucketStart);
        if (els.bucketEndInput) els.bucketEndInput.value = String(bucketEnd);
        return;
      }
    } catch (error) {
      console.error("stats-hwan bucket bootstrap error", error);
    }

    if (els.bucketStartInput && !els.bucketStartInput.value) els.bucketStartInput.value = "90000";
    if (els.bucketEndInput && !els.bucketEndInput.value) els.bucketEndInput.value = "99999";
  }

  async function init() {
    updateDailyDiagnosisCount();
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

    await hydrateDefaultBuckets();

    load(1);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
