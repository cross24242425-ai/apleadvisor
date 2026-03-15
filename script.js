(function () {
  console.log("homepage stats bootstrap loaded");

  const nicknameInput = document.getElementById("homepageNicknameInput");
  const hwanInput = document.getElementById("homepageHwanInput");
  const searchButton = document.getElementById("homepageSearchButton");

  const recommendedRoot = document.getElementById("stats-recommended");
  const charactersRoot = document.getElementById("stats-characters");
  const hwanBucketsRoot = document.getElementById("stats-hwan-buckets");

  const RECOMMENDED_API = "/stats/recommended-items/today";
  const CHARACTERS_API = "/stats/searched-characters/today";
  const HWAN_BUCKETS_API = "/stats/hwan-buckets/today";

  function formatNumber(value) {
    const num = Number(value);
    if (Number.isNaN(num)) return "-";
    return num.toLocaleString("ko-KR");
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function goSearch() {
    const nickname = nicknameInput?.value.trim() || "";
    const hwan = (hwanInput?.value.trim() || "").replace(/,/g, "");

    if (!nickname) {
      alert("닉네임을 입력해주세요.");
      return;
    }

    if (!hwan) {
      alert("아이템환산을 입력해주세요.");
      return;
    }

    if (!/^\d+$/.test(hwan)) {
      alert("아이템환산은 숫자만 입력해주세요.");
      return;
    }

    window.location.href = `result.html?nickname=${encodeURIComponent(nickname)}&hwan=${encodeURIComponent(hwan)}`;
  }

  if (searchButton) {
    searchButton.addEventListener("click", goSearch);
  }

  if (nicknameInput) {
    nicknameInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") goSearch();
    });
  }

  if (hwanInput) {
    hwanInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") goSearch();
    });
  }

  async function fetchStatsJson(url) {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json"
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    return await res.json();
  }

  function buildRecommendedItemsMarkup(items) {
    if (!Array.isArray(items) || items.length === 0) {
      return `
        <div class="homepage-empty">
          오늘 집계된 추천 데이터가 없습니다.
        </div>
      `;
    }

    const top = items[0];
    const rest = items.slice(0, 5);

    return `
      <div class="homepage-recommended-card">
        <div class="homepage-recommended-top">
          <div class="homepage-recommended-badge">1</div>
          <div class="homepage-recommended-main">
            <div class="homepage-recommended-title">${escapeHtml(top.item_name)}</div>
            <div class="homepage-recommended-sub">오늘 누적 추천 수 ${formatNumber(top.count)}회</div>
          </div>
          <div class="homepage-recommended-delta">+${formatNumber(Math.round(top.avg_delta_hwan || 0))}</div>
        </div>

        <div class="homepage-recommended-list">
          ${rest.map((item, index) => `
            <div class="homepage-recommended-row">
              <div class="homepage-rank-circle">${index + 1}</div>
              <div class="homepage-recommended-name">${escapeHtml(item.item_name)}</div>
              <div class="homepage-recommended-count">${formatNumber(item.count)}회</div>
              <div class="homepage-recommended-pill">+${formatNumber(Math.round(item.avg_delta_hwan || 0))}</div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  function buildSearchedCharactersMarkup(characters) {
    if (!Array.isArray(characters) || characters.length === 0) {
      return `<div class="homepage-empty">오늘 검색된 캐릭터 데이터가 없습니다.</div>`;
    }

    return characters.slice(0, 3).map((item) => {
      const job = item.job_name && item.job_name !== "UNKNOWN" ? item.job_name : "";
      const world = item.world_name && item.world_name !== "UNKNOWN" ? item.world_name : "";
      const prefix = [job, world].filter(Boolean).join(" · ");
      const desc = `${prefix ? `${prefix} · ` : ""}환산 ${formatNumber(item.latest_hwan)} · ${formatNumber(item.count)}회 검색`;

      return `
        <div class="homepage-character-card">
          <div class="homepage-character-name">${escapeHtml(item.character_name)}</div>
          <div class="homepage-character-desc">${escapeHtml(desc)}</div>
        </div>
      `;
    }).join("");
  }

  function buildHwanBucketsMarkup(buckets) {
    if (!Array.isArray(buckets) || buckets.length === 0) {
      return `<div class="homepage-empty">오늘 환산 구간 데이터가 없습니다.</div>`;
    }

    return buckets.slice(0, 3).map((item) => `
      <div class="homepage-bucket-card">
        <div class="homepage-bucket-label">${escapeHtml(item.label)}</div>
        <div class="homepage-bucket-count">${formatNumber(item.count)}명</div>
      </div>
    `).join("");
  }

  async function loadRecommendedItemsStats() {
    if (!recommendedRoot) return;
    recommendedRoot.innerHTML = `<div class="homepage-loading">불러오는 중...</div>`;

    try {
      console.log("render recommended");
      const data = await fetchStatsJson(RECOMMENDED_API);
      recommendedRoot.innerHTML = buildRecommendedItemsMarkup(data.items || []);
    } catch (error) {
      console.error("recommended stats error:", error);
      recommendedRoot.innerHTML = `<div class="homepage-empty">데이터를 불러오지 못했습니다.</div>`;
    }
  }

  async function loadSearchedCharactersStats() {
    if (!charactersRoot) return;
    charactersRoot.innerHTML = `<div class="homepage-loading">불러오는 중...</div>`;

    try {
      console.log("render characters");
      const data = await fetchStatsJson(CHARACTERS_API);
      charactersRoot.innerHTML = buildSearchedCharactersMarkup(data.characters || []);
    } catch (error) {
      console.error("character stats error:", error);
      charactersRoot.innerHTML = `<div class="homepage-empty">데이터를 불러오지 못했습니다.</div>`;
    }
  }

  async function loadHwanBucketStats() {
    if (!hwanBucketsRoot) return;
    hwanBucketsRoot.innerHTML = `<div class="homepage-loading">불러오는 중...</div>`;

    try {
      console.log("render hwan buckets");
      const data = await fetchStatsJson(HWAN_BUCKETS_API);
      hwanBucketsRoot.innerHTML = buildHwanBucketsMarkup(data.buckets || []);
    } catch (error) {
      console.error("hwan bucket stats error:", error);
      hwanBucketsRoot.innerHTML = `<div class="homepage-empty">데이터를 불러오지 못했습니다.</div>`;
    }
  }

  async function loadHomepageStats() {
    await Promise.all([
      loadRecommendedItemsStats(),
      loadSearchedCharactersStats(),
      loadHwanBucketStats()
    ]);
  }

  loadHomepageStats();
})();
