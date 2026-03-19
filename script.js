(() => {
  const API_BASE = "https://maple-bundle-new.maple-bundle.workers.dev";
  const $ = (selector) => document.querySelector(selector);

  function firstOf(...vals) {
    for (const v of vals) {
      if (v !== null && v !== undefined && String(v).trim() !== "") return v;
    }
    return null;
  }

  function safeText(v, fallback = "정보 없음") {
    if (v === null || v === undefined) return fallback;
    const s = String(v).trim();
    return s ? s : fallback;
  }

  function safeArr(v) {
    return Array.isArray(v) ? v : [];
  }

  function formatNumber(n) {
    const x = Number(n);
    if (!Number.isFinite(x)) return "0";
    return x.toLocaleString("ko-KR");
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getRecommendedItemsWrap() {
    return $("#recommendedItemsToday");
  }

  function getSearchedCharactersWrap() {
    return $("#searchedCharactersToday");
  }

  function getHwanBucketsWrap() {
    return $("#hwanBucketsToday");
  }

  function getSummaryTextWrap() {
    return $("#hwanSummaryText");
  }

  function getDailyDiagnosisCountWrap() {
    return $("#dailyDiagnosisCount");
  }



  function deriveDailyDiagnosisCount(data) {
    const explicit = firstOf(
      data?.today_diagnosis_count,
      data?.diagnosis_count,
      data?.today_count,
      data?.total_count,
      data?.summary?.today_diagnosis_count,
      data?.meta?.today_diagnosis_count
    );
    const n = Number(explicit);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  function renderDailyDiagnosisCount(count) {
    const wrap = getDailyDiagnosisCountWrap();
    if (!wrap || count === null) return;
    wrap.textContent = `오늘 진단 ${formatNumber(count)}건`;
  }

  function getRecommendedStarforceLabel(item) {
    const direct = firstOf(
      item?.representative_starforce_label,
      item?.starforce_label
    );
    if (direct !== null && direct !== undefined && String(direct).trim() !== "") {
      return String(direct).trim();
    }

    const v = firstOf(
      item?.representative_starforce,
      item?.starforce,
      item?.starforce_value,
      item?.avg_starforce
    );
    const n = Number(v);
    return Number.isFinite(n) ? `${n}성` : null;
  }

  function getRecommendedPotential(item) {
    return safeText(
      firstOf(
        item?.representative_potential_label,
        item?.potential_label,
        item?.potential,
        item?.summary_potential,
        item?.representative_potential,
        item?.potential_summary,
        item?.main_potential_label,
        item?.main_potential,
        item?.representative_main_potential_label
      ),
      "잠재 정보 없음"
    );
  }

  function getRecommendedAdditional(item) {
    return safeText(
      firstOf(
        item?.representative_additional_label,
        item?.additional_label,
        item?.additional,
        item?.summary_additional,
        item?.representative_additional,
        item?.additional_summary,
        item?.bonus_potential_label,
        item?.bonus_potential,
        item?.representative_bonus_potential_label
      ),
      "에디 정보 없음"
    );
  }

  function buildRecommendedItemDisplayName(item) {
    const itemName = safeText(firstOf(item?.item_name, item?.name), "-");
    const sf = getRecommendedStarforceLabel(item);
    if (sf === null) return itemName;
    if (/^\d+성\s/.test(itemName)) return itemName;
    return `${sf} ${itemName}`;
  }

  function buildRecommendedSubText(item) {
    const pot = getRecommendedPotential(item);
    const add = getRecommendedAdditional(item);
    return `${pot} · ${add}`;
  }

  function renderRecommendedItemsToday(data) {
    const wrap = getRecommendedItemsWrap();
    if (!wrap) return;

    const items = safeArr(data?.items);
    if (!items.length) {
      wrap.innerHTML = `<div class="empty-text">데이터를 불러오지 못했습니다.</div>`;
      return;
    }

    const top = items[0];
    const topName = buildRecommendedItemDisplayName(top);
    const topSub = buildRecommendedSubText(top);
    const topCount = formatNumber(firstOf(top?.count, top?.recommended_count, 0));
    const topDeltaRaw = Number(firstOf(top?.avg_delta_hwan, top?.delta_hwan, 0));
    const topDelta = Number.isFinite(topDeltaRaw) ? Math.round(topDeltaRaw).toLocaleString("ko-KR") : "0";

    const heroHtml = `
      <div class="today-rec-hero">
        <div class="today-rec-rank">1</div>
        <div class="today-rec-main">
          <div class="today-rec-title">${escapeHtml(topName)}</div>
          <div class="today-rec-sub">${escapeHtml(topSub)}</div>
          <div class="today-rec-meta">오늘 누적 추천 수 ${topCount}회</div>
        </div>
        <div class="today-rec-delta">+${topDelta}</div>
      </div>
    `;

    const listHtml = items.slice(0, 5).map((item, idx) => {
      const name = buildRecommendedItemDisplayName(item);
      const sub = buildRecommendedSubText(item);
      const count = formatNumber(firstOf(item?.count, item?.recommended_count, 0));
      const deltaRaw = Number(firstOf(item?.avg_delta_hwan, item?.delta_hwan, 0));
      const delta = Number.isFinite(deltaRaw) ? Math.round(deltaRaw).toLocaleString("ko-KR") : "0";

      return `
        <div class="today-rec-row">
          <div class="today-rec-row-rank">${idx + 1}</div>
          <div class="today-rec-row-main">
            <div class="today-rec-row-title">${escapeHtml(name)}</div>
            <div class="today-rec-row-sub">${escapeHtml(sub)}</div>
          </div>
          <div class="today-rec-row-count">${count}회</div>
          <div class="today-rec-row-delta">+${delta}</div>
        </div>
      `;
    }).join("");

    wrap.innerHTML = heroHtml + `<div class="today-rec-list">${listHtml}</div>`;
  }

  function renderSearchedCharactersToday(data) {
    const wrap = getSearchedCharactersWrap();
    if (!wrap) return;

    const items = safeArr(firstOf(data?.items, data?.characters));
    if (!items.length) {
      wrap.innerHTML = `<div class="empty-text">오늘 검색된 캐릭터 데이터가 없습니다.</div>`;
      return;
    }

    wrap.innerHTML = items.slice(0, 3).map((item) => {
      const name = safeText(firstOf(item?.character_name, item?.name), "-");
      const world = safeText(firstOf(item?.world_name, item?.world), "");
      const cls = safeText(firstOf(item?.class_name, item?.job_name, item?.job), "");
      const hwan = firstOf(item?.hwan, item?.item_hwan, item?.hwan_value);
      const count = firstOf(item?.count, item?.search_count, 0);

      const metaParts = [
        world,
        cls,
        hwan !== null ? `환산 ${formatNumber(hwan)}` : "",
        `${formatNumber(count)}회 검색`
      ].filter(Boolean);

      return `
        <div class="simple-rank-card">
          <div class="simple-rank-title">${escapeHtml(name)}</div>
          <div class="simple-rank-sub">${escapeHtml(metaParts.join(" · "))}</div>
        </div>
      `;
    }).join("");
  }

  function renderHwanBucketsToday(data) {
    const wrap = getHwanBucketsWrap();
    if (!wrap) return;

    const items = safeArr(firstOf(data?.items, data?.buckets));
    if (!items.length) {
      wrap.innerHTML = `<div class="empty-text">오늘 환산 구간 데이터가 없습니다.</div>`;
      return;
    }

    wrap.innerHTML = items.slice(0, 3).map((item) => {
      const explicitLabel = firstOf(item?.label, item?.bucket_label);
      const start = firstOf(item?.bucket_start, item?.start, 0);
      const end = firstOf(item?.bucket_end, item?.end, 0);
      const count = firstOf(item?.count, item?.search_count, 0);
      const label = explicitLabel ? String(explicitLabel) : `${formatNumber(start)} ~ ${formatNumber(end)}`;

      return `
        <div class="bucket-row">
          <div class="bucket-label">${label}</div>
          <div class="bucket-count">${formatNumber(count)}명</div>
        </div>
      `;
    }).join("");
  }

  function renderHwanSummaryText(data) {
    const wrap = getSummaryTextWrap();
    if (!wrap) return;

    const text = firstOf(
      data?.summary_text,
      data?.summary,
      data?.description
    );

    if (text) {
      wrap.textContent = String(text);
      return;
    }

    const items = safeArr(firstOf(data?.items, data?.buckets));
    const top = items[0];
    if (top) {
      const explicitLabel = firstOf(top?.label, top?.bucket_label);
      const start = firstOf(top?.bucket_start, top?.start);
      const end = firstOf(top?.bucket_end, top?.end);
      const label = explicitLabel
        ? String(explicitLabel)
        : (start !== null && end !== null ? `${formatNumber(start)} ~ ${formatNumber(end)}` : "");
      const count = firstOf(top?.count, top?.search_count, 0);
      if (label) {
        wrap.textContent = `오늘은 ${label} 구간 검색이 가장 많았어. 현재 집계 ${formatNumber(count)}건 기준이야.`;
        return;
      }
    }

    wrap.textContent = "오늘 검색 기준으로 자주 본 환산 구간을 보여주고 있어.";
  }

  async function fetchJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function loadRecommendedItemsToday() {
    const data = await fetchJson(`${API_BASE}/stats/recommended-items/today`);
    renderRecommendedItemsToday(data);
  }

  async function loadSearchedCharactersToday() {
    const data = await fetchJson(`${API_BASE}/stats/searched-characters/today`);
    renderSearchedCharactersToday(data);
    renderDailyDiagnosisCount(deriveDailyDiagnosisCount(data));
  }

  async function loadHwanBucketsToday() {
    const data = await fetchJson(`${API_BASE}/stats/hwan-buckets/today`);
    renderHwanBucketsToday(data);
    renderHwanSummaryText(data);
  }

  function bindHomeSearch() {
    const nicknameInput = $("#nicknameInput");
    const hwanInput = $("#hwanInput");
    const searchBtn = $("#searchBtn");
    if (!nicknameInput || !hwanInput || !searchBtn) return;

    const go = () => {
      const nickname = String(nicknameInput.value || "").trim();
      const hwan = String(hwanInput.value || "").replace(/,/g, "").trim();

      if (!nickname || !hwan) {
        alert("닉네임과 아이템환산을 입력해주세요.");
        return;
      }

      location.href = `/result.html?nickname=${encodeURIComponent(nickname)}&hwan=${encodeURIComponent(hwan)}`;
    };

    searchBtn.addEventListener("click", go);
    nicknameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") go();
    });
    hwanInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") go();
    });
  }

  async function bootstrap() {
    bindHomeSearch();

    await Promise.all([
      loadRecommendedItemsToday().catch((err) => {
        console.error("recommended-items/today 실패", err);
        const wrap = getRecommendedItemsWrap();
        if (wrap) wrap.innerHTML = `<div class="empty-text">데이터를 불러오지 못했습니다.</div>`;
      }),
      loadSearchedCharactersToday().catch((err) => {
        console.error("searched-characters/today 실패", err);
        const wrap = getSearchedCharactersWrap();
        if (wrap) wrap.innerHTML = `<div class="empty-text">오늘 검색된 캐릭터 데이터가 없습니다.</div>`;
      }),
      loadHwanBucketsToday().catch((err) => {
        console.error("hwan-buckets/today 실패", err);
        const wrap = getHwanBucketsWrap();
        if (wrap) wrap.innerHTML = `<div class="empty-text">오늘 환산 구간 데이터가 없습니다.</div>`;
        renderHwanSummaryText({});
      }),
    ]);
  }

  document.addEventListener("DOMContentLoaded", bootstrap);
})();
