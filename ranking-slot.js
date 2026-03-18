(() => {
  const API_BASE = "https://maple-bundle-new.maple-bundle.workers.dev";

  const el = {
    periodSelect: document.getElementById("periodSelect"),
    slotSelect: document.getElementById("slotSelect"),
    sortSelect: document.getElementById("sortSelect"),
    pageSizeSelect: document.getElementById("pageSizeSelect"),
    searchInput: document.getElementById("searchInput"),
    applyBtn: document.getElementById("applyBtn"),
    top3Wrap: document.getElementById("top3Wrap"),
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

  function buildParams(page = 1) {
    const p = new URLSearchParams();
    p.set("period", el.periodSelect.value);
    p.set("sort", el.sortSelect.value);
    p.set("page", String(page));
    p.set("page_size", el.pageSizeSelect.value);
    if (el.slotSelect.value) p.set("slot_key", el.slotSelect.value);
    const q = el.searchInput.value.trim();
    if (q) p.set("q", q);
    return p;
  }

  async function fetchJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  function renderTop3(items) {
    const top3 = Array.isArray(items) ? items.slice(0, 3) : [];
    if (!top3.length) {
      el.top3Wrap.innerHTML = `<div class="empty-text">데이터가 없습니다.</div>`;
      return;
    }

    el.top3Wrap.innerHTML = top3.map((item) => `
      <div class="top3-card">
        <div class="top3-rank">TOP ${safe(item.rank)}</div>
        <div class="top3-name">${esc(safe(item.item_name))}</div>
        <div class="top3-sub">${esc(safe(item.slot_key))}</div>
        <div class="top3-sub">${esc(safe(item.representative_potential_label, "잠재 정보 없음"))} · ${esc(safe(item.representative_additional_label, "에디 정보 없음"))}</div>
        <div class="metric-row">
          <div class="metric-box">
            <div class="metric-k">추천 횟수</div>
            <div class="metric-v">${fmt(item.count)}</div>
          </div>
          <div class="metric-box">
            <div class="metric-k">평균 상승량</div>
            <div class="metric-v">+${fmt(Math.round(Number(item.avg_delta_hwan || 0)))}</div>
          </div>
        </div>
      </div>
    `).join("");
  }

  function renderTable(items) {
    if (!Array.isArray(items) || !items.length) {
      el.rankingBody.innerHTML = `<tr><td colspan="9" class="empty-text">데이터가 없습니다.</td></tr>`;
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
        <td>${esc(safe(item.representative_potential_label, "-"))}</td>
        <td>${esc(safe(item.representative_additional_label, "-"))}</td>
      </tr>
    `).join("");
  }

  async function load(page = 1) {
    el.top3Wrap.innerHTML = `<div class="empty-text">데이터를 불러오는 중입니다.</div>`;
    el.rankingBody.innerHTML = `<tr><td colspan="9" class="empty-text">데이터를 불러오는 중입니다.</td></tr>`;

    try {
      const data = await fetchJson(`${API_BASE}/stats/recommended-items/by-slot?${buildParams(page).toString()}`);
      const items = Array.isArray(data.items) ? data.items : [];
      currentPage = Number(data.page || 1);
      totalPages = Number(data.total_pages || 1);

      renderTop3(items);
      renderTable(items);
      el.pageInfo.textContent = `${currentPage} / ${totalPages}`;
      el.prevBtn.disabled = currentPage <= 1;
      el.nextBtn.disabled = currentPage >= totalPages;
    } catch (e) {
      el.top3Wrap.innerHTML = `<div class="empty-text">데이터를 불러오지 못했습니다.</div>`;
      el.rankingBody.innerHTML = `<tr><td colspan="9" class="empty-text">데이터를 불러오지 못했습니다.</td></tr>`;
      el.pageInfo.textContent = `1 / 1`;
      console.error(e);
    }
  }

  el.applyBtn.addEventListener("click", () => load(1));
  el.prevBtn.addEventListener("click", () => currentPage > 1 && load(currentPage - 1));
  el.nextBtn.addEventListener("click", () => currentPage < totalPages && load(currentPage + 1));

  document.addEventListener("DOMContentLoaded", () => load(1));
})();
