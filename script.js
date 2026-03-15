(function () {
  console.log("homepage stats bootstrap loaded");

  const nicknameInput = document.getElementById("homepageNicknameInput");
  const hwanInput = document.getElementById("homepageHwanInput");
  const searchButton = document.getElementById("homepageSearchButton");

  const recommendedRoot = document.getElementById("stats-recommended");
  const charactersRoot = document.getElementById("stats-characters");
  const hwanBucketsRoot = document.getElementById("stats-hwan-buckets");

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
        <div class="top3-card">
          <div class="top3-title">오늘 집계된 추천 데이터가 없습니다.</div>
          <div class="top3-desc">추천 아이템 통계가 아직 쌓이지 않았습니다.</div>
        </div>
      `;
    }

    const top = items[0];
    const rest = items.slice(0, 5);

    return `
      <div class="top3-card" style="padding:18px 18px 10px;">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px;">
          <div style="width:42px;height:42px;border-radius:14px;background:#f4dfaa;display:flex;align-items:center;justify-content:center;font-size:20px;">🛡️</div>
          <div>
            <div style="font-size:18px;font-weight:900;color:#b06a00;line-height:1.2;">${escapeHtml(top.item_name)}</div>
            <div style="font-size:12px;color:#7c86a7;margin-top:4px;">오늘 누적 추천 수 ${formatNumber(top.count)}회</div>
          </div>
        </div>

        <div style="border-top:1px solid #e8edf7;">
          ${rest.map((item, index) => `
            <div style="display:grid;grid-template-columns:34px 1fr auto auto;gap:12px;align-items:center;padding:14px 4px;border-bottom:1px solid #eef2f8;">
              <div style="width:24px;height:24px;border-radius:999px;background:#eef2ff;color:#5a6dff;font-size:12px;font-weight:900;display:flex;align-items:center;justify-content:center;">
                ${index + 1}
              </div>
              <div style="font-size:13px;font-weight:800;color:#24335d;">
                ${escapeHtml(item.item_name)}
              </div>
              <div style="font-size:12px;color:#6f7ba0;font-weight:700;">
                ${formatNumber(item.count)}회
              </div>
              <div style="font-size:12px;color:#5a6dff;font-weight:900;background:#eef2ff;border-radius:999px;padding:4px 8px;">
                +${formatNumber(Math.round(item.avg_delta_hwan || 0))}
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  function buildSearchedCharactersMarkup(characters) {
    if (!Array.isArray(characters) || characters.length === 0) {
      return `<div class="guide-text">오늘 검색된 캐릭터 데이터가 없습니다.</div>`;
    }

    return characters.slice(0, 3).map((item) => {
      const job = item.job_name && item.job_name !== "UNKNOWN" ? item.job_name : "";
      const world = item.world_name && item.world_name !== "UNKNOWN" ? item.world_name : "";
      const prefix = [job, world].filter(Boolean).join(" · ");
      const desc = `${prefix ? `${prefix} · ` : ""}환산 ${formatNumber(item.latest_hwan)} · ${formatNumber(item.count)}회 검색`;

      return `
        <div style="background:#f7f9fe;border:1px solid #e6ebf6;border-radius:16px;padding:14px 14px 12px;margin-bottom:10px;">
          <div style="font-size:16px;font-weight:900;color:#1f2c56;">${escapeHtml(item.character_name)}</div>
          <div style="font-size:12px;color:#7d87a7;margin-top:6px;line-height:1.5;">${escapeHtml(desc)}</div>
        </div>
      `;
    }).join("");
  }

  function buildHwanBucketsMarkup(buckets) {
    if (!Array.isArray(buckets) || buckets.length === 0) {
      return `<div class="guide-text">오늘 환산 구간 데이터가 없습니다.</div>`;
    }

    return buckets.slice(0, 3).map((item) => `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;background:#f7f9fe;border:1px solid #e6ebf6;border-radius:14px;padding:12px 12px;margin-bottom:10px;">
        <div style="font-size:13px;font-weight:800;color:#25345d;">
          ${escapeHtml(item.label)}
        </div>
        <div style="font-size:13px;font-weight:900;color:#24335d;">
          ${formatNumber(item.count)}명
        </div>
      </div>
    `).join("");
  }

  async function loadRecommendedItemsStats() {
    if (!recommendedRoot) return;
    recommendedRoot.innerHTML = `<div class="guide-text">불러오는 중...</div>`;

    try {
      console.log("render recommended");
      const data = await fetchStatsJson("/stats/recommended-items/today");
      recommendedRoot.innerHTML = buildRecommendedItemsMarkup(data.items || []);
    } catch (error) {
      console.error("recommended stats error:", error);
      recommendedRoot.innerHTML = `<div class="guide-text">데이터를 불러오지 못했습니다.</div>`;
    }
  }

  async function loadSearchedCharactersStats() {
    if (!charactersRoot) return;
    charactersRoot.innerHTML = `<div class="guide-text">불러오는 중...</div>`;

    try {
      console.log("render characters");
      const data = await fetchStatsJson("/stats/searched-characters/today");
      charactersRoot.innerHTML = buildSearchedCharactersMarkup(data.characters || []);
    } catch (error) {
      console.error("character stats error:", error);
      charactersRoot.innerHTML = `<div class="guide-text">데이터를 불러오지 못했습니다.</div>`;
    }
  }

  async function loadHwanBucketStats() {
    if (!hwanBucketsRoot) return;
    hwanBucketsRoot.innerHTML = `<div class="guide-text">불러오는 중...</div>`;

    try {
      console.log("render hwan buckets");
      const data = await fetchStatsJson("/stats/hwan-buckets/today");
      hwanBucketsRoot.innerHTML = buildHwanBucketsMarkup(data.buckets || []);
    } catch (error) {
      console.error("hwan bucket stats error:", error);
      hwanBucketsRoot.innerHTML = `<div class="guide-text">데이터를 불러오지 못했습니다.</div>`;
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
