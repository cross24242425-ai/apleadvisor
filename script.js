(function () {
  const path = window.location.pathname || "/";
  const API_BASE = "https://maple-bundle-new.maple-bundle.workers.dev";

  document.addEventListener("DOMContentLoaded", () => {
    bindHomeSearch();

    if (path.endsWith("/index.html") || path === "/" || path === "") {
      bootstrapHome();
      return;
    }

    if (path.endsWith("/ranking-items.html")) {
      bootstrapRankingItems();
      return;
    }

    if (path.endsWith("/ranking-slot.html")) {
      bootstrapRankingSlot();
      return;
    }

    if (path.endsWith("/stats-hwan.html")) {
      bootstrapStatsHwan();
      return;
    }
  });

  function bindHomeSearch() {
    const nicknameInput = document.getElementById("nicknameInput");
    const hwanInput = document.getElementById("hwanInput");
    const searchButton = document.getElementById("searchButton");

    if (!nicknameInput || !hwanInput || !searchButton) return;

    const goSearch = () => {
      const nickname = (nicknameInput.value || "").trim();
      const hwan = (hwanInput.value || "").trim();

      if (!nickname || !hwan) {
        alert("닉네임과 환산을 입력해주세요.");
        return;
      }

      window.location.href = `/result.html?nickname=${encodeURIComponent(nickname)}&hwan=${encodeURIComponent(hwan)}`;
    };

    searchButton.addEventListener("click", goSearch);
    nicknameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") goSearch();
    });
    hwanInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") goSearch();
    });
  }

  async function fetchJson(url) {
    const finalUrl = url.startsWith("http")
      ? url
      : `${API_BASE}${url.startsWith("/") ? url : `/${url}`}`;

    const res = await fetch(finalUrl, {
      method: "GET",
      credentials: "omit",
      headers: {
        "Accept": "application/json"
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} - ${finalUrl}`);
    }

    return res.json();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function numberWithComma(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "-";
    return n.toLocaleString("ko-KR");
  }

  function formatDelta(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "-";
    return `+${numberWithComma(Math.round(n))}`;
  }

  function renderEmpty(target, text) {
    target.innerHTML = `<div class="empty-state">${escapeHtml(text)}</div>`;
  }

  function pickFirstNonEmpty(item, keys) {
    if (!item || typeof item !== "object") return null;

    for (const key of keys) {
      const value = item[key];
      if (value === null || value === undefined) continue;
      const text = String(value).trim();
      if (text && text !== "-" && text.toLowerCase() !== "null" && text.toLowerCase() !== "undefined") {
        return value;
      }
    }
    return null;
  }

  function pickArray(data, candidates) {
    for (const key of candidates) {
      if (Array.isArray(data?.[key])) return data[key];
    }
    if (Array.isArray(data)) return data;
    return [];
  }

  function resolveStarforce(item) {
    const raw = pickFirstNonEmpty(item, [
      "representative_starforce",
      "current_starforce",
      "target_starforce",
      "starforce"
    ]);

    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) return `${n}성`;
    return null;
  }

  function normalizeLabel(value) {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    if (!text || text === "-" || text === "잠재 -" || text === "에디 -") return null;
    return text;
  }

  function resolvePotentialLabel(item) {
    return normalizeLabel(
      pickFirstNonEmpty(item, [
        "representative_potential_label",
        "potential_label",
        "current_potential_effective_label",
        "current_potential_text",
        "target_potential_label",
        "target_potential_text"
      ])
    );
  }

  function resolveAdditionalLabel(item) {
    return normalizeLabel(
      pickFirstNonEmpty(item, [
        "representative_additional_label",
        "additional_label",
        "current_additional_effective_label",
        "current_additional_text",
        "target_additional_label",
        "target_additional_text"
      ])
    );
  }

  function resolveItemName(item) {
    return pickFirstNonEmpty(item, [
      "item_name",
      "current_item",
      "target_item",
      "name"
    ]) || "-";
  }

  function makeDescriptor(item) {
    const starText = resolveStarforce(item);
    const itemName = resolveItemName(item);
    if (starText) return `${starText} ${itemName}`;
    return itemName;
  }

  function buildMetaLine(item) {
    const potential = resolvePotentialLabel(item);
    const additional = resolveAdditionalLabel(item);

    const parts = [];
    if (potential) parts.push(`잠재 ${potential}`);
    if (additional) parts.push(`에디 ${additional}`);

    if (!parts.length) return "잠재 정보 없음 · 에디 정보 없음";
    return parts.join(" · ");
  }

  async function bootstrapHome() {
    await Promise.allSettled([
      loadHomeRecommended(),
      loadHomeCharacters(),
      loadHomeBuckets()
    ]);
  }

  async function loadHomeRecommended() {
    const target = document.getElementById("stats-recommended");
    if (!target) return;

    const guide = target.querySelector(".guide-text");
    try {
      const data = await fetchJson("/stats/recommended-items/today");
      const items = pickArray(data, ["items", "rows", "data"]);

      if (!items.length) {
        if (guide) guide.outerHTML = `<div class="empty-state light">오늘 집계된 추천 데이터가 없습니다.</div>`;
        return;
      }

      const top = items[0];
      const rest = items.slice(0, 5);

      const body = `
        <div class="home-recommended-list">
          <div class="home-top-card">
            <div class="home-top-title-row">
              <div style="display:flex; gap:12px; align-items:flex-start;">
                <span class="rank-chip">1</span>
                <div>
                  <h3>${escapeHtml(makeDescriptor(top))}</h3>
                  <div class="sub">${escapeHtml(buildMetaLine(top))}</div>
                  <div class="sub">오늘 누적 추천 수 ${numberWithComma(top.count || 0)}회</div>
                </div>
              </div>
              <span class="delta-chip">${escapeHtml(formatDelta(top.avg_delta_hwan))}</span>
            </div>
          </div>

          <div class="home-mini-list">
            ${rest.map((item, idx) => `
              <div class="home-mini-row">
                <span class="mini-rank">${idx + 1}</span>
                <div class="mini-main">
                  <div class="mini-title">${escapeHtml(makeDescriptor(item))}</div>
                  <div class="mini-sub">${escapeHtml(buildMetaLine(item))}</div>
                </div>
                <div class="count-text">${numberWithComma(item.count || 0)}회</div>
                <span class="delta-chip">${escapeHtml(formatDelta(item.avg_delta_hwan))}</span>
              </div>
            `).join("")}
          </div>
        </div>
      `;

      if (guide) guide.outerHTML = body;
    } catch (error) {
      if (guide) guide.outerHTML = `<div class="empty-state light">데이터를 불러오지 못했습니다.</div>`;
    }
  }

  async function loadHomeCharacters() {
    const target = document.getElementById("stats-characters");
    if (!target) return;

    const guide = target.querySelector(".guide-text");
    try {
      const data = await fetchJson("/stats/searched-characters/today");

      const items = pickArray(data, ["items", "rows", "characters", "data"]);

      if (!items.length) {
        if (guide) guide.outerHTML = `<div class="empty-state">오늘 검색된 캐릭터 데이터가 없습니다.</div>`;
        return;
      }

      const body = `
        <div class="summary-list">
          ${items.slice(0, 3).map((item) => `
            <div class="character-row">
              <div class="mini-main">
                <div class="mini-title">${escapeHtml(item.character_name || item.name || "-")}</div>
                <div class="mini-sub">
                  ${escapeHtml(item.job_name || item.job || "-")} ·
                  ${escapeHtml(item.world_name || item.world || "-")} ·
                  환산 ${numberWithComma(item.latest_hwan || item.hwan || 0)} ·
                  ${numberWithComma(item.count || item.search_count || 0)}회 검색
                </div>
              </div>
            </div>
          `).join("")}
        </div>
      `;

      if (guide) guide.outerHTML = body;
    } catch (error) {
      if (guide) guide.outerHTML = `<div class="empty-state">데이터를 불러오지 못했습니다.</div>`;
    }
  }

  async function loadHomeBuckets() {
    const target = document.getElementById("stats-hwan-buckets");
    if (!target) return;

    const guide = target.querySelector(".guide-text");
    try {
      const data = await fetchJson("/stats/hwan-buckets/today");

      const items = pickArray(data, ["items", "rows", "buckets", "data"]);

      if (!items.length) {
        if (guide) guide.outerHTML = `<div class="empty-state">오늘 환산 구간 데이터가 없습니다.</div>`;
        return;
      }

      const body = `
        <div class="summary-list">
          ${items.slice(0, 3).map((item) => {
            const label =
              item.label ||
              item.bucket_label ||
              item.range ||
              (
                item.bucket_start != null && item.bucket_end != null
                  ? `${numberWithComma(item.bucket_start)} ~ ${numberWithComma(item.bucket_end)}`
                  : "-"
              );

            return `
              <div class="bucket-row">
                <div class="mini-main">
                  <div class="mini-title">${escapeHtml(label)}</div>
                </div>
                <div class="count-text">${numberWithComma(item.count || item.search_count || 0)}명</div>
              </div>
            `;
          }).join("")}
        </div>
      `;

      if (guide) guide.outerHTML = body;
    } catch (error) {
      if (guide) guide.outerHTML = `<div class="empty-state">데이터를 불러오지 못했습니다.</div>`;
    }
  }

  function buildPagination(currentPage, totalPages, onClickName) {
    if (!Number.isFinite(totalPages) || totalPages <= 1) return "";

    const buttons = [];
    for (let i = 1; i <= totalPages; i += 1) {
      buttons.push(`
        <button class="page-btn ${i === currentPage ? "active" : ""}" onclick="${onClickName}(${i})">${i}</button>
      `);
      if (i >= 10 && totalPages > 10) break;
    }
    return `<div class="pagination">${buttons.join("")}</div>`;
  }

  async function bootstrapRankingItems() {
    const root = document.getElementById("rankingItemsRoot");
    if (!root) return;

    window.__loadRankingItemsPage = loadRankingItemsPage;
    document.getElementById("rankingApplyButton")?.addEventListener("click", () => loadRankingItemsPage(1));

    await loadRankingItemsPage(1);
  }

  async function loadRankingItemsPage(page) {
    const root = document.getElementById("rankingItemsRoot");
    if (!root) return;

    root.innerHTML = `<div class="empty-state">데이터를 불러오는 중입니다.</div>`;

    const period = document.getElementById("rankingPeriod")?.value || "today";
    const sort = document.getElementById("rankingSort")?.value || "count";
    const pageSize = document.getElementById("rankingPageSize")?.value || "50";
    const q = document.getElementById("rankingQuery")?.value || "";

    const qs = new URLSearchParams({
      period,
      sort,
      page: String(page),
      page_size: String(pageSize),
      q
    });

    try {
      const data = await fetchJson(`/stats/recommended-items/ranking?${qs.toString()}`);
      const items = pickArray(data, ["items", "rows", "data"]);

      if (!items.length) {
        renderEmpty(root, "표시할 추천 아이템 데이터가 없습니다.");
        return;
      }

      const top3 = items.slice(0, 3);
      const rest = items.slice(3);

      root.innerHTML = `
        <div class="summary-list" style="margin-bottom:18px;">
          ${top3.map((item, idx) => `
            <div class="home-top-card">
              <div class="home-top-title-row">
                <div style="display:flex; gap:12px; align-items:flex-start;">
                  <span class="rank-chip">${idx + 1}</span>
                  <div>
                    <h3>${escapeHtml(makeDescriptor(item))}</h3>
                    <div class="sub">부위: ${escapeHtml(item.slot_key || "-")}</div>
                    <div class="sub">${escapeHtml(buildMetaLine(item))}</div>
                    <div class="sub">추천 ${numberWithComma(item.count || 0)}회 · 평균 순위 ${numberWithComma(item.avg_rank || 0)}</div>
                  </div>
                </div>
                <span class="delta-chip">${escapeHtml(formatDelta(item.avg_delta_hwan))}</span>
              </div>
            </div>
          `).join("")}
        </div>

        <div class="page-section-title">4위 이하 순위표</div>
        <div class="simple-table-wrap">
          <table class="simple-table">
            <thead>
              <tr>
                <th>순위</th>
                <th>아이템명</th>
                <th>부위</th>
                <th>잠재 / 에디</th>
                <th>추천 횟수</th>
                <th>평균 순위</th>
                <th>평균 상승량</th>
              </tr>
            </thead>
            <tbody>
              ${rest.map((item) => `
                <tr>
                  <td>${escapeHtml(item.rank || "-")}</td>
                  <td>${escapeHtml(makeDescriptor(item))}</td>
                  <td>${escapeHtml(item.slot_key || "-")}</td>
                  <td>${escapeHtml(buildMetaLine(item))}</td>
                  <td>${escapeHtml(numberWithComma(item.count || 0))}</td>
                  <td>${escapeHtml(numberWithComma(item.avg_rank || 0))}</td>
                  <td>${escapeHtml(formatDelta(item.avg_delta_hwan))}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>

        ${buildPagination(Number(data.page || page), Number(data.total_pages || 1), "__loadRankingItemsPage")}
      `;
    } catch (error) {
      renderEmpty(root, "추천 아이템 순위를 불러오지 못했습니다.");
    }
  }

  async function bootstrapRankingSlot() {
    const root = document.getElementById("rankingSlotRoot");
    if (!root) return;

    window.__loadRankingSlotPage = loadRankingSlotPage;
    document.getElementById("slotApplyButton")?.addEventListener("click", () => loadRankingSlotPage(1));

    await loadRankingSlotPage(1);
  }

  async function loadRankingSlotPage(page) {
    const root = document.getElementById("rankingSlotRoot");
    if (!root) return;

    root.innerHTML = `<div class="empty-state">데이터를 불러오는 중입니다.</div>`;

    const period = document.getElementById("slotPeriod")?.value || "today";
    const sort = document.getElementById("slotSort")?.value || "count";
    const pageSize = document.getElementById("slotPageSize")?.value || "20";
    const slotKey = document.getElementById("slotFilter")?.value || "";
    const q = document.getElementById("slotQuery")?.value || "";

    const qs = new URLSearchParams({
      period,
      sort,
      page: String(page),
      page_size: String(pageSize),
      q
    });

    if (slotKey) qs.set("slot_key", slotKey);

    try {
      const data = await fetchJson(`/stats/recommended-items/by-slot?${qs.toString()}`);
      const items = pickArray(data, ["items", "rows", "data"]);

      if (!items.length) {
        renderEmpty(root, "표시할 부위별 추천 데이터가 없습니다.");
        return;
      }

      root.innerHTML = `
        <div class="simple-table-wrap">
          <table class="simple-table">
            <thead>
              <tr>
                <th>순위</th>
                <th>아이템명</th>
                <th>부위</th>
                <th>잠재 / 에디</th>
                <th>추천 횟수</th>
                <th>평균 순위</th>
                <th>평균 상승량</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item) => `
                <tr>
                  <td>${escapeHtml(item.rank || "-")}</td>
                  <td>${escapeHtml(makeDescriptor(item))}</td>
                  <td>${escapeHtml(item.slot_key || "-")}</td>
                  <td>${escapeHtml(buildMetaLine(item))}</td>
                  <td>${escapeHtml(numberWithComma(item.count || 0))}</td>
                  <td>${escapeHtml(numberWithComma(item.avg_rank || 0))}</td>
                  <td>${escapeHtml(formatDelta(item.avg_delta_hwan))}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>

        ${buildPagination(Number(data.page || page), Number(data.total_pages || 1), "__loadRankingSlotPage")}
      `;
    } catch (error) {
      renderEmpty(root, "부위별 추천 순위를 불러오지 못했습니다.");
    }
  }

  async function bootstrapStatsHwan() {
    const root = document.getElementById("statsHwanRoot");
    if (!root) return;

    window.__loadStatsHwanPage = loadStatsHwanPage;
    document.getElementById("hwanApplyButton")?.addEventListener("click", () => loadStatsHwanPage(1));

    await loadStatsHwanPage(1);
  }

  async function loadStatsHwanPage(page) {
    const root = document.getElementById("statsHwanRoot");
    if (!root) return;

    root.innerHTML = `<div class="empty-state">데이터를 불러오는 중입니다.</div>`;

    const start = document.getElementById("hwanStart")?.value || "90000";
    const end = document.getElementById("hwanEnd")?.value || "94999";
    const period = document.getElementById("hwanPeriod")?.value || "today";
    const slotKey = document.getElementById("hwanSlot")?.value || "";
    const sort = document.getElementById("hwanSort")?.value || "count";

    const summaryQs = new URLSearchParams({
      bucket_start: start,
      bucket_end: end,
      period
    });

    const rankingQs = new URLSearchParams({
      bucket_start: start,
      bucket_end: end,
      period,
      page: String(page),
      page_size: "20",
      sort
    });

    if (slotKey) rankingQs.set("slot_key", slotKey);

    try {
      const [summaryData, rankingData] = await Promise.all([
        fetchJson(`/stats/hwan-item-summary?${summaryQs.toString()}`),
        fetchJson(`/stats/hwan-item-ranking?${rankingQs.toString()}`)
      ]);

      const summary = summaryData || {};
      const items = pickArray(rankingData, ["items", "rows", "data"]);
      const topItem = summary?.top_recommended_item || null;

      const setSummary = pickArray(summary, ["set_summary"]);
      const starforceSummary = pickArray(summary, ["starforce_summary"]);
      const potentialSummary = pickArray(summary, ["potential_summary"]);
      const additionalSummary = pickArray(summary, ["additional_summary"]);

      root.innerHTML = `
        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-card-label">검색 수</div>
            <div class="summary-card-value">${escapeHtml(numberWithComma(summary.search_count || 0))}</div>
          </div>
          <div class="summary-card">
            <div class="summary-card-label">가장 많이 추천된 아이템</div>
            <div class="summary-card-value" style="font-size:18px;">${escapeHtml(topItem ? makeDescriptor(topItem) : "-")}</div>
          </div>
          <div class="summary-card">
            <div class="summary-card-label">평균 추천 상승량</div>
            <div class="summary-card-value">${escapeHtml(formatDelta(summary.avg_delta_hwan || 0))}</div>
          </div>
          <div class="summary-card">
            <div class="summary-card-label">대표 구간</div>
            <div class="summary-card-value" style="font-size:18px;">${escapeHtml(`${start} ~ ${end}`)}</div>
          </div>
        </div>

        <div class="summary-panel-grid">
          <div>
            <div class="page-section-title">추천 아이템 랭킹</div>
            ${items.length ? `
              <div class="simple-table-wrap">
                <table class="simple-table">
                  <thead>
                    <tr>
                      <th>순위</th>
                      <th>아이템명</th>
                      <th>부위</th>
                      <th>잠재 / 에디</th>
                      <th>추천 횟수</th>
                      <th>평균 순위</th>
                      <th>평균 상승량</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${items.map((item) => `
                      <tr>
                        <td>${escapeHtml(item.rank || "-")}</td>
                        <td>${escapeHtml(makeDescriptor(item))}</td>
                        <td>${escapeHtml(item.slot_key || "-")}</td>
                        <td>${escapeHtml(buildMetaLine(item))}</td>
                        <td>${escapeHtml(numberWithComma(item.count || 0))}</td>
                        <td>${escapeHtml(numberWithComma(item.avg_rank || 0))}</td>
                        <td>${escapeHtml(formatDelta(item.avg_delta_hwan))}</td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              </div>
              ${buildPagination(Number(rankingData.page || page), Number(rankingData.total_pages || 1), "__loadStatsHwanPage")}
            ` : `<div class="empty-state">표시할 랭킹 데이터가 없습니다.</div>`}
          </div>

          <div>
            <div class="page-section-title">세트 / 스타포스 / 잠재 / 에디 분포</div>
            <div class="summary-list">
              ${renderSummaryBlock("세트 효과", setSummary)}
              ${renderSummaryBlock("스타포스", starforceSummary)}
              ${renderSummaryBlock("잠재", potentialSummary)}
              ${renderSummaryBlock("에디", additionalSummary)}
            </div>
          </div>
        </div>
      `;
    } catch (error) {
      renderEmpty(root, "환산별 아이템 통계를 불러오지 못했습니다.");
    }
  }

  function renderSummaryBlock(title, rows) {
    if (!rows.length) {
      return `
        <div class="summary-card">
          <div class="summary-card-label">${escapeHtml(title)}</div>
          <div class="empty-state">데이터 없음</div>
        </div>
      `;
    }

    const max = Math.max(...rows.map((r) => Number(r.value || 0)), 1);

    return `
      <div class="summary-card">
        <div class="summary-card-label">${escapeHtml(title)}</div>
        <div class="summary-list">
          ${rows.map((row) => {
            const value = Number(row.value || 0);
            const width = Math.max(6, Math.round((value / max) * 100));
            return `
              <div class="summary-bar-item">
                <div class="summary-bar-top">
                  <span>${escapeHtml(row.label || "-")}</span>
                  <span>${escapeHtml(numberWithComma(value))}</span>
                </div>
                <div class="summary-bar-track">
                  <div class="summary-bar-fill" style="width:${width}%"></div>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }
})();
