(() => {
  const API_BASE = "https://maple-bundle-new.maple-bundle.workers.dev";

  const els = {
    dailyDiagnosisCount: document.getElementById("dailyDiagnosisCount"),
    periodSelect: document.getElementById("slotPeriodSelect"),
    slotSelect: document.getElementById("slotTypeSelect"),
    sortSelect: document.getElementById("slotSortSelect"),
    pageSizeSelect: document.getElementById("slotSizeSelect"),
    searchInput: document.getElementById("slotKeywordInput"),
    applyBtn: document.getElementById("applySlotRankingFilter"),
    top3Wrap: document.getElementById("top3SlotsGrid"),
    rankingBody: document.getElementById("rankingSlotTableBody"),
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

  function buildParams(page = 1) {
    const p = new URLSearchParams();
    p.set("period", mapPeriod(els.periodSelect?.value || "today"));
    p.set("slot_key", els.slotSelect?.value || "");
    p.set("sort", mapSort(els.sortSelect?.value || "count"));
    p.set("page", String(page));
    p.set("page_size", els.pageSizeSelect?.value || "20");

    const q = els.searchInput?.value?.trim() || "";
    if (q) p.set("q", q);

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
      const data = await fetchJson(`${API_BASE}/stats/hwan-buckets/today`);
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
    const name = safe(item?.item_name);
    const starforceLabel = getRepresentativeStarforceLabel(item);
    return starforceLabel ? `${starforceLabel} ${name}` : name;
  }

  function buildSpecLine(item) {
    const p = safe(item.representative_potential_label, "잠재 정보 없음");
    const a = safe(item.representative_additional_label, "에디 정보 없음");
    return `${p} · ${a}`;
  }

  function renderTop3(items) {
    if (!els.top3Wrap) return;

    const top3 = Array.isArray(items) ? items.slice(0, 3) : [];
    if (!top3.length) {
      els.top3Wrap.innerHTML = `
        <div class="card"><div class="card-body" style="padding-top:16px;">데이터가 없습니다.</div></div>
        <div class="card"><div class="card-body" style="padding-top:16px;">데이터가 없습니다.</div></div>
        <div class="card"><div class="card-body" style="padding-top:16px;">데이터가 없습니다.</div></div>
      `;
      return;
    }

    els.top3Wrap.innerHTML = top3.map((item) => `
      <div class="card">
        <div class="card-body" style="padding-top:16px;">
          <div class="empty-text" style="font-weight:900;">TOP ${safe(item.rank)}</div>
          <div style="font-size:20px;font-weight:900;margin-top:8px;">${esc(buildItemTitle(item))}</div>
          <div class="empty-text" style="margin-top:8px;">${esc(safe(item.slot_key))}</div>
          <div class="empty-text" style="margin-top:8px;">${esc(buildSpecLine(item))}</div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px;">
            <div class="card" style="border-radius:12px;">
              <div class="card-body" style="padding:12px;">
                <div class="empty-text">추천 횟수</div>
                <div style="font-size:16px;font-weight:900;">${fmt(item.count)}</div>
              </div>
            </div>
            <div class="card" style="border-radius:12px;">
              <div class="card-body" style="padding:12px;">
                <div class="empty-text">평균 상승량</div>
                <div style="font-size:16px;font-weight:900;">+${fmt(Math.round(Number(item.avg_delta_hwan || 0)))}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `).join("");
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
    if (els.top3Wrap) {
      els.top3Wrap.innerHTML = `
        <div class="card"><div class="card-body" style="padding-top:16px;">불러오는 중...</div></div>
        <div class="card"><div class="card-body" style="padding-top:16px;">불러오는 중...</div></div>
        <div class="card"><div class="card-body" style="padding-top:16px;">불러오는 중...</div></div>
      `;
    }

    if (els.rankingBody) {
      els.rankingBody.innerHTML = `<tr><td colspan="9" style="padding:18px;">데이터를 불러오는 중...</td></tr>`;
    }

    try {
      console.log("ranking-slot init");
      console.log("ranking-slot fetch");

      const data = await fetchJson(`${API_BASE}/stats/recommended-items/by-slot?${buildParams(page).toString()}`);
      const items = Array.isArray(data.items) ? data.items : [];

      currentPage = Number(data.page || 1);
      totalPages = Number(data.total_pages || 1);

      renderTop3(items);
      renderTable(items);
    } catch (err) {
      console.error(err);
      if (els.top3Wrap) {
        els.top3Wrap.innerHTML = `
          <div class="card"><div class="card-body" style="padding-top:16px;">불러오지 못했습니다.</div></div>
          <div class="card"><div class="card-body" style="padding-top:16px;">불러오지 못했습니다.</div></div>
          <div class="card"><div class="card-body" style="padding-top:16px;">불러오지 못했습니다.</div></div>
        `;
      }
      if (els.rankingBody) {
        els.rankingBody.innerHTML = `<tr><td colspan="9" style="padding:18px;">데이터를 불러오지 못했습니다.</td></tr>`;
      }
    }
  }

  function init() {
    if (els.applyBtn) {
      els.applyBtn.addEventListener("click", () => load(1));
    }
    updateDailyDiagnosisCount();
    load(1);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
