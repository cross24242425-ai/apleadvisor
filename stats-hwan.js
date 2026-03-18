(() => {
  const API_BASE = "https://maple-bundle-new.maple-bundle.workers.dev";

  const el = {
    bucketStartInput: document.getElementById("bucketStartInput"),
    bucketEndInput: document.getElementById("bucketEndInput"),
    periodSelect: document.getElementById("periodSelect"),
    slotSelect: document.getElementById("slotSelect"),
    sortSelect: document.getElementById("sortSelect"),
    applyBtn: document.getElementById("applyBtn"),
    summaryCards: document.getElementById("summaryCards"),
    rankingBody: document.getElementById("rankingBody"),
    pageInfo: document.getElementById("pageInfo"),
    prevBtn: document.getElementById("prevBtn"),
    nextBtn: document.getElementById("nextBtn")
  };

  let currentPage = 1;
  let totalPages = 1;

  const safe = (v, fb = "-") => (v === null || v === undefined || String(v).trim() === "" ? fb : String(v));
  const safeNum = (v) => Number.isFinite(Number(v)) ? Number(v) : null;
  const fmt = (v) => safeNum(v) === null ? "-" : Number(v).toLocaleString("ko-KR");
  const esc = (s) => String(s ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");

  function buildSummaryParams() {
    const p = new URLSearchParams();
    p.set("bucket_start", el.bucketStartInput.value.trim());
    p.set("bucket_end", el.bucketEndInput.value.trim());
    p.set("period", el.periodSelect.value);
    return p;
  }

  function buildRankingParams(page = 1) {
    const p = buildSummaryParams();
    p.set("sort", el.sortSelect.value);
    p.set("page", String(page));
    p.set("page_size", "20");
    if (el.slotSelect.value) p.set("slot_key", el.slotSelect.value);
    return p;
  }

  async function fetchJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  function renderSummary(data) {
    el.summaryCards.innerHTML = `
      <div class="summary-box">
        <div class="summary-k">검색 수</div>
        <div class="summary-v">${fmt(data.search_count)}</div>
      </div>
      <div class="summary-box">
        <div class="summary-k">가장 많이 추천된 아이템</div>
        <div class="summary-v">${esc(safe(data.top_recommended_item))}</div>
      </div>
      <div class="summary-box">
        <div class="summary-k">평균 추천 상승량</div>
        <div class="summary-v">+${fmt(Math.round(Number(data.avg_delta_hwan || 0)))}</div>
      </div>
      <div class="summary-box">
        <div class="summary-k">대표 세트 경향</div>
        <div class="summary-sub">${esc(safe(data.set_summary, "데이터 없음"))}</div>
      </div>
    `;
  }

  function renderTable(items) {
    if (!Array.isArray(items) || !items.length) {
      el.rankingBody.innerHTML = `<tr><td colspan="7" class="empty-text">데이터가 없습니다.</td></tr>`;
      return;
    }

    el.rankingBody.innerHTML = items.map((item) => `
      <tr>
        <td>${safe(item.rank)}</td>
        <td>${esc(safe(item.item_name))}</td>
        <td>${esc(safe(item.slot_key))}</td>
        <td>${fmt(item.count)}</td>
        <td>${fmt(item.avg_rank)}</td>
        <td>+${fmt(Math.round(Number(item.avg_delta_hwan || 0)))}</td>
        <td>${safeNum(item.representative_starforce) === null ? "-" : `${item.representative_starforce}성`}</td>
      </tr>
    `).join("");
  }

  async function load(page = 1) {
    el.summaryCards.innerHTML = `<div class="summary-box">데이터를 불러오는 중입니다.</div>`;
    el.rankingBody.innerHTML = `<tr><td colspan="7" class="empty-text">데이터를 불러오는 중입니다.</td></tr>`;

    try {
      const [summary, ranking] = await Promise.all([
        fetchJson(`${API_BASE}/stats/hwan-item-summary?${buildSummaryParams().toString()}`),
        fetchJson(`${API_BASE}/stats/hwan-item-ranking?${buildRankingParams(page).toString()}`)
      ]);

      currentPage = Number(ranking.page || 1);
      totalPages = Number(ranking.total_pages || 1);

      renderSummary(summary);
      renderTable(Array.isArray(ranking.items) ? ranking.items : []);
      el.pageInfo.textContent = `${currentPage} / ${totalPages}`;
      el.prevBtn.disabled = currentPage <= 1;
      el.nextBtn.disabled = currentPage >= totalPages;
    } catch (e) {
      el.summaryCards.innerHTML = `<div class="summary-box">데이터를 불러오지 못했습니다.</div>`;
      el.rankingBody.innerHTML = `<tr><td colspan="7" class="empty-text">데이터를 불러오지 못했습니다.</td></tr>`;
      el.pageInfo.textContent = `1 / 1`;
      console.error(e);
    }
  }

  el.applyBtn.addEventListener("click", () => load(1));
  el.prevBtn.addEventListener("click", () => currentPage > 1 && load(currentPage - 1));
  el.nextBtn.addEventListener("click", () => currentPage < totalPages && load(currentPage + 1));

  document.addEventListener("DOMContentLoaded", () => load(1));
})();
