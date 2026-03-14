const params = new URLSearchParams(window.location.search);

const nickname = params.get("nickname") || "";
const hwan = params.get("hwan") || "";

const nicknameValue = document.getElementById("nicknameValue");
const hwanValue = document.getElementById("hwanValue");
const top3List = document.getElementById("top3List");
const candidateTableBody = document.getElementById("candidateTableBody");

const resultNicknameInput = document.getElementById("resultNicknameInput");
const resultHwanInput = document.getElementById("resultHwanInput");
const resultSearchButton = document.getElementById("resultSearchButton");

const buildSummaryText = document.getElementById("buildSummaryText");
const ringSummaryText = document.getElementById("ringSummaryText");
const prioritySummaryText = document.getElementById("prioritySummaryText");
const summaryCountSame = document.getElementById("summaryCountSame");
const summaryCountReplace = document.getElementById("summaryCountReplace");
const summaryCountPotential = document.getElementById("summaryCountPotential");
const summaryCountAdditional = document.getElementById("summaryCountAdditional");
const summaryCountSet = document.getElementById("summaryCountSet");

const API_BASE = "https://maple-bundle-new.maple-bundle.workers.dev/optimize-lite";

function formatNumber(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return "-";
  return num.toLocaleString("ko-KR");
}

function formatCostToEok(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return "-";

  const eok = num / 100000000;

  if (eok >= 100) return `${eok.toFixed(0)}억`;
  if (eok >= 10) return `${eok.toFixed(1)}억`;
  return `${eok.toFixed(2)}억`;
}

function formatEfficiencyGrade(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return "-";
  if (num >= 0.00000006) return "S";
  if (num >= 0.00000005) return "A";
  if (num >= 0.00000004) return "B";
  return "C";
}

function safeText(value, fallback = "-") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text ? text : fallback;
}

function setSummaryValues() {
  if (nicknameValue) nicknameValue.textContent = nickname || "-";
  if (hwanValue) hwanValue.textContent = hwan ? formatNumber(hwan) : "-";

  if (resultNicknameInput) resultNicknameInput.value = nickname || "";
  if (resultHwanInput) resultHwanInput.value = hwan ? formatNumber(hwan) : "";
}

function getTop3(data) {
  return (
    data.top3 ||
    data.data?.top3 ||
    data.result?.top3 ||
    []
  );
}

function getTop10(data) {
  const raw =
    data.top10 ||
    data.data?.top10 ||
    data.result?.top10 ||
    [];

  return Array.isArray(raw) ? raw.slice(0, 10) : [];
}

function renderSummaryFallback(data, top10) {
  const summaryCounts =
    data.summary_counts ||
    data.summaryCounts ||
    {};

  const summaryLabels =
    data.summary_labels ||
    data.summaryLabels ||
    {};

  const seedRingName = safeText(data.seed_ring_name, "");
  const seedRingLevel = data.seed_ring_level;

  buildSummaryText.textContent =
    safeText(
      summaryLabels.build_summary ||
      summaryLabels.buildSummary,
      `현재 추천 후보 ${top10.length}개를 기준으로 same-item 강화와 에디 업그레이드 비중이 높은 상태입니다.`
    );

  ringSummaryText.textContent =
    seedRingName
      ? `현재 시드링: ${seedRingName}${seedRingLevel ? ` ${seedRingLevel}레벨` : ""}`
      : safeText(
          summaryLabels.ring_summary ||
          summaryLabels.ringSummary,
          "현재 시드링: 자동 조회 정보 연결 예정"
        );

  prioritySummaryText.textContent =
    safeText(
      summaryLabels.priority_summary ||
      summaryLabels.prioritySummary,
      "우선 추천 방향: 현재 세팅 유지 상태에서 same-item 강화 우선"
    );

  summaryCountSame.textContent =
    `same-item 강화 추천: ${formatNumber(summaryCounts.same_item_count ?? summaryCounts.sameItemCount ?? top10.filter((x) => x.current_item && x.target_item && x.current_item === x.target_item).length)}`;

  summaryCountReplace.textContent =
    `교체 추천: ${formatNumber(summaryCounts.replace_count ?? summaryCounts.replaceCount ?? top10.filter((x) => x.current_item && x.target_item && x.current_item !== x.target_item).length)}`;

  summaryCountPotential.textContent =
    `잠재 업그레이드 추천: ${formatNumber(summaryCounts.potential_upgrade_count ?? summaryCounts.potentialUpgradeCount ?? top10.filter((x) => /잠재/i.test(x.action_summary || "")).length)}`;

  summaryCountAdditional.textContent =
    `에디 업그레이드 추천: ${formatNumber(summaryCounts.additional_upgrade_count ?? summaryCounts.additionalUpgradeCount ?? top10.filter((x) => /에디/i.test(x.action_summary || "")).length)}`;

  summaryCountSet.textContent =
    `세트효과 변동 포함 추천: ${formatNumber(summaryCounts.set_change_count ?? summaryCounts.setChangeCount ?? top10.filter((x) => Number(x.set_effect_hwan || 0) !== 0).length)}`;
}

function renderError(message) {
  if (top3List) {
    top3List.innerHTML = `
      <div class="top3-card">
        <div class="top3-title">결과를 불러오지 못했습니다</div>
        <div class="top3-desc">${message}</div>
      </div>
    `;
  }

  if (candidateTableBody) {
    candidateTableBody.innerHTML = `
      <tr>
        <td colspan="5">데이터를 불러오지 못했습니다.</td>
      </tr>
    `;
  }

  if (buildSummaryText) buildSummaryText.textContent = "요약 정보를 불러오지 못했습니다.";
  if (ringSummaryText) ringSummaryText.textContent = "-";
  if (prioritySummaryText) prioritySummaryText.textContent = "-";
}

function renderLoading() {
  if (top3List) {
    top3List.innerHTML = `
      <div class="top3-card">
        <div class="top3-title">결과를 불러오는 중...</div>
        <div class="top3-desc">optimize-lite 엔진에 요청 중입니다.</div>
      </div>
    `;
  }

  if (candidateTableBody) {
    candidateTableBody.innerHTML = `
      <tr>
        <td colspan="5">불러오는 중...</td>
      </tr>
    `;
  }

  if (buildSummaryText) buildSummaryText.textContent = "구성 요약을 불러오는 중...";
  if (ringSummaryText) ringSummaryText.textContent = "-";
  if (prioritySummaryText) prioritySummaryText.textContent = "-";
}

function renderTop3(top3) {
  if (!top3List) return;

  if (!Array.isArray(top3) || top3.length === 0) {
    top3List.innerHTML = `
      <div class="top3-card">
        <div class="top3-title">추천 결과가 없습니다</div>
        <div class="top3-desc">현재 조건으로 표시할 TOP3가 없습니다.</div>
      </div>
    `;
    return;
  }

  top3List.innerHTML = top3.map((item) => {
    const gain = item.delta_hwan != null ? `+${formatNumber(item.delta_hwan)}` : "-";
    const cost =
      item.total_expected_cost_p60 != null
        ? formatCostToEok(item.total_expected_cost_p60)
        : item.expected_cost_p60 != null
        ? formatCostToEok(item.expected_cost_p60)
        : "-";
    const efficiency = formatEfficiencyGrade(item.efficiency);

    return `
      <div class="top3-card">
        <div class="top3-rank">${item.rank ?? "-"}</div>
        <div class="top3-title">${safeText(item.action_summary, "추천 결과")}</div>
        <div class="top3-desc">
          슬롯: ${safeText(item.slot_key || item.slot)}<br />
          현재 아이템: ${safeText(item.current_item)}<br />
          목표 아이템: ${safeText(item.target_item)}
        </div>
        <div class="top3-meta">
          <div class="meta-box">
            <div class="meta-label">예상 상승</div>
            <div class="meta-value">${gain}</div>
          </div>
          <div class="meta-box">
            <div class="meta-label">예상 비용</div>
            <div class="meta-value">${cost}</div>
          </div>
          <div class="meta-box">
            <div class="meta-label">효율 등급</div>
            <div class="meta-value">${efficiency}</div>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function renderTop10(top10) {
  if (!candidateTableBody) return;

  if (!Array.isArray(top10) || top10.length === 0) {
    candidateTableBody.innerHTML = `
      <tr>
        <td colspan="5">표시할 후보가 없습니다.</td>
      </tr>
    `;
    return;
  }

  candidateTableBody.innerHTML = top10.map((item) => {
    const gain = item.delta_hwan != null ? `+${formatNumber(item.delta_hwan)}` : "-";
    const cost =
      item.total_expected_cost_p60 != null
        ? formatCostToEok(item.total_expected_cost_p60)
        : item.expected_cost_p60 != null
        ? formatCostToEok(item.expected_cost_p60)
        : "-";
    const efficiency = formatEfficiencyGrade(item.efficiency);

    return `
      <tr>
        <td>${item.rank ?? "-"}</td>
        <td>${safeText(item.action_summary)}</td>
        <td>${gain}</td>
        <td>${cost}</td>
        <td>${efficiency}</td>
      </tr>
    `;
  }).join("");
}

function searchAgain() {
  const nextNickname = resultNicknameInput ? resultNicknameInput.value.trim() : "";
  const nextHwanRaw = resultHwanInput ? resultHwanInput.value.trim().replace(/,/g, "") : "";

  if (!nextNickname) {
    alert("닉네임을 입력해주세요.");
    return;
  }

  if (!nextHwanRaw) {
    alert("아이템환산을 입력해주세요.");
    return;
  }

  if (!/^\d+$/.test(nextHwanRaw)) {
    alert("아이템환산은 숫자만 입력해주세요.");
    return;
  }

  const url = `result.html?nickname=${encodeURIComponent(nextNickname)}&hwan=${encodeURIComponent(nextHwanRaw)}`;
  window.location.href = url;
}

if (resultSearchButton) {
  resultSearchButton.addEventListener("click", searchAgain);
}

if (resultNicknameInput) {
  resultNicknameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") searchAgain();
  });
}

if (resultHwanInput) {
  resultHwanInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") searchAgain();
  });
}

async function fetchJsonWithDebug(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json"
    }
  });

  const text = await response.text();

  let json = null;
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    text,
    json
  };
}

async function tryOptimizeRequests() {
  const urls = [
    `${API_BASE}?nickname=${encodeURIComponent(nickname)}&hwan=${encodeURIComponent(hwan)}&seed_ring_level=5`,
    `${API_BASE}?nickname=${encodeURIComponent(nickname)}&hwan=${encodeURIComponent(hwan)}`,
    `${API_BASE}?character_name=${encodeURIComponent(nickname)}&hwan=${encodeURIComponent(hwan)}&seed_ring_level=5`,
    `${API_BASE}?character_name=${encodeURIComponent(nickname)}&hwan=${encodeURIComponent(hwan)}`
  ];

  let lastResult = null;

  for (const url of urls) {
    try {
      const result = await fetchJsonWithDebug(url);
      console.log("try optimize-lite:", url, result);

      if (result.ok && result.json) {
        return result.json;
      }

      lastResult = result;
    } catch (error) {
      console.error("request failed:", url, error);
      lastResult = { ok: false, status: 0, text: error.message, json: null };
    }
  }

  throw new Error(
    lastResult
      ? `HTTP ${lastResult.status} / ${lastResult.text || "응답 없음"}`
      : "응답 없음"
  );
}

async function fetchOptimizeResult() {
  setSummaryValues();

  if (!nickname || !hwan) {
    renderError("닉네임과 아이템환산이 필요합니다.");
    return;
  }

  renderLoading();

  try {
    const data = await tryOptimizeRequests();

    if (!data || data.ok === false) {
      throw new Error("응답 데이터가 올바르지 않습니다.");
    }

    if (nicknameValue) {
      nicknameValue.textContent = data.character_name || data.nickname || nickname;
    }

    if (hwanValue) {
      hwanValue.textContent = formatNumber(hwan);
    }

    const top3 = getTop3(data);
    const top10 = getTop10(data);

    console.log("top3 length:", top3.length, top3);
    console.log("top10 length:", top10.length, top10);
    console.log("top10_count:", data.top10_count);

    renderSummaryFallback(data, top10);
    renderTop3(top3);
    renderTop10(top10);
  } catch (error) {
    console.error("optimize-lite fetch error:", error);
    renderError(`엔진 호출 중 오류가 발생했습니다. (${error.message})`);
  }
}

fetchOptimizeResult();
