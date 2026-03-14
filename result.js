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

const ringSummaryValue = document.getElementById("ringSummaryValue");
const currentHwanSummaryValue = document.getElementById("currentHwanSummaryValue");
const sameItemCountValue = document.getElementById("sameItemCountValue");
const replaceCountValue = document.getElementById("replaceCountValue");
const potentialUpgradeCountValue = document.getElementById("potentialUpgradeCountValue");
const additionalUpgradeCountValue = document.getElementById("additionalUpgradeCountValue");
const setChangeCountValue = document.getElementById("setChangeCountValue");
const buildSummaryValue = document.getElementById("buildSummaryValue");
const ringSummaryTextValue = document.getElementById("ringSummaryTextValue");
const prioritySummaryValue = document.getElementById("prioritySummaryValue");

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
  if (currentHwanSummaryValue) currentHwanSummaryValue.textContent = hwan ? formatNumber(hwan) : "-";
}

function getSummaryCounts(data) {
  return (
    data.summary_counts ||
    data.summaryCounts ||
    data.summary?.counts ||
    {}
  );
}

function getSummaryLabels(data) {
  return (
    data.summary_labels ||
    data.summaryLabels ||
    data.summary?.labels ||
    {}
  );
}

function getTop3(data) {
  return data.top3 || data.data?.top3 || data.result?.top3 || [];
}

function getTop10(data) {
  return data.top10 || data.data?.top10 || data.result?.top10 || [];
}

function getRingSummary(data) {
  if (data.seed_ring_name && data.seed_ring_level) {
    return `${data.seed_ring_name} ${data.seed_ring_level}레벨`;
  }
  if (data.seed_ring_name) {
    return data.seed_ring_name;
  }
  if (data.ring_summary) {
    return data.ring_summary;
  }
  return "자동 조회 정보 없음";
}

function renderSummaryOverview(data) {
  const counts = getSummaryCounts(data);
  const labels = getSummaryLabels(data);

  if (ringSummaryValue) {
    ringSummaryValue.textContent = getRingSummary(data);
  }

  if (currentHwanSummaryValue) {
    currentHwanSummaryValue.textContent = hwan ? formatNumber(hwan) : "-";
  }

  if (sameItemCountValue) {
    sameItemCountValue.textContent = formatNumber(
      counts.same_item_count ??
      counts.sameItemCount ??
      0
    );
  }

  if (replaceCountValue) {
    replaceCountValue.textContent = formatNumber(
      counts.replace_count ??
      counts.replaceCount ??
      0
    );
  }

  if (potentialUpgradeCountValue) {
    potentialUpgradeCountValue.textContent = formatNumber(
      counts.potential_upgrade_count ??
      counts.potentialUpgradeCount ??
      0
    );
  }

  if (additionalUpgradeCountValue) {
    additionalUpgradeCountValue.textContent = formatNumber(
      counts.additional_upgrade_count ??
      counts.additionalUpgradeCount ??
      0
    );
  }

  if (setChangeCountValue) {
    setChangeCountValue.textContent = formatNumber(
      counts.set_change_count ??
      counts.setChangeCount ??
      0
    );
  }

  if (buildSummaryValue) {
    buildSummaryValue.textContent = safeText(
      labels.build_summary ??
      labels.buildSummary
    );
  }

  if (ringSummaryTextValue) {
    ringSummaryTextValue.textContent = safeText(
      labels.ring_summary ??
      labels.ringSummary ??
      getRingSummary(data)
    );
  }

  if (prioritySummaryValue) {
    prioritySummaryValue.textContent = safeText(
      labels.priority_summary ??
      labels.prioritySummary
    );
  }
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
        <td colspan="7">데이터를 불러오지 못했습니다.</td>
      </tr>
    `;
  }
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
        <td colspan="7">불러오는 중...</td>
      </tr>
    `;
  }
}

function getCurrentStatusHtml(item) {
  const currentPotentialText = safeText(item.current_potential_text, "");
  const currentAdditionalText = safeText(item.current_additional_text, "");
  const currentPotentialEffectiveLabel = safeText(item.current_potential_effective_label, "");
  const currentAdditionalEffectiveLabel = safeText(item.current_additional_effective_label, "");

  const lines = [];

  if (currentPotentialText) {
    lines.push(`<div class="item-detail-line"><strong>현재 잠재:</strong> ${currentPotentialText}</div>`);
  }

  if (currentPotentialEffectiveLabel) {
    lines.push(`<div class="item-detail-line"><strong>잠재 평가:</strong> ${currentPotentialEffectiveLabel}</div>`);
  }

  if (currentAdditionalText) {
    lines.push(`<div class="item-detail-line"><strong>현재 에디:</strong> ${currentAdditionalText}</div>`);
  }

  if (currentAdditionalEffectiveLabel) {
    lines.push(`<div class="item-detail-line"><strong>에디 평가:</strong> ${currentAdditionalEffectiveLabel}</div>`);
  }

  if (lines.length === 0) {
    lines.push(`<div class="item-detail-line">현재 상태 정보 없음</div>`);
  }

  return lines.join("");
}

function getTargetStatusHtml(item) {
  const targetPotentialLabel = safeText(item.target_potential_label, "");
  const targetAdditionalLabel = safeText(item.target_additional_label, "");

  const lines = [];

  if (targetPotentialLabel) {
    lines.push(`<div class="item-detail-line"><strong>목표 잠재:</strong> ${targetPotentialLabel}</div>`);
  }

  if (targetAdditionalLabel) {
    lines.push(`<div class="item-detail-line"><strong>목표 에디:</strong> ${targetAdditionalLabel}</div>`);
  }

  if (lines.length === 0) {
    lines.push(`<div class="item-detail-line">목표 상태 정보 없음</div>`);
  }

  return lines.join("");
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

  top3List.innerHTML = top3
    .map((item) => {
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

          <div class="top3-detail-box">
            <div class="top3-detail-title">현재 아이템 상태</div>
            <div class="top3-detail-body">
              ${getCurrentStatusHtml(item)}
            </div>
          </div>

          <div class="top3-detail-box">
            <div class="top3-detail-title">추천 목표 상태</div>
            <div class="top3-detail-body">
              ${getTargetStatusHtml(item)}
            </div>
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
    })
    .join("");
}

function renderTop10(top10) {
  if (!candidateTableBody) return;

  if (!Array.isArray(top10) || top10.length === 0) {
    candidateTableBody.innerHTML = `
      <tr>
        <td colspan="7">표시할 후보가 없습니다.</td>
      </tr>
    `;
    return;
  }

  candidateTableBody.innerHTML = top10
    .map((item) => {
      const gain = item.delta_hwan != null ? `+${formatNumber(item.delta_hwan)}` : "-";
      const cost =
        item.total_expected_cost_p60 != null
          ? formatCostToEok(item.total_expected_cost_p60)
          : item.expected_cost_p60 != null
          ? formatCostToEok(item.expected_cost_p60)
          : "-";
      const efficiency = formatEfficiencyGrade(item.efficiency);

      const currentStatusText = [
        item.current_potential_text ? `잠재: ${item.current_potential_text}` : "",
        item.current_potential_effective_label ? `(${item.current_potential_effective_label})` : "",
        item.current_additional_text ? `에디: ${item.current_additional_text}` : "",
        item.current_additional_effective_label ? `(${item.current_additional_effective_label})` : ""
      ].filter(Boolean).join(" / ");

      const targetStatusText = [
        item.target_potential_label ? `잠재 목표: ${item.target_potential_label}` : "",
        item.target_additional_label ? `에디 목표: ${item.target_additional_label}` : ""
      ].filter(Boolean).join(" / ");

      return `
        <tr>
          <td>${item.rank ?? "-"}</td>
          <td>
            <div>${safeText(item.action_summary)}</div>
            <div class="table-subtext">현재: ${safeText(item.current_item)} → 목표: ${safeText(item.target_item)}</div>
          </td>
          <td>
            <div>${safeText(currentStatusText, "상태 정보 없음")}</div>
          </td>
          <td>
            <div>${safeText(targetStatusText, "목표 정보 없음")}</div>
          </td>
          <td>${gain}</td>
          <td>${cost}</td>
          <td>${efficiency}</td>
        </tr>
      `;
    })
    .join("");
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

    renderSummaryOverview(data);

    const top3 = getTop3(data);
    const top10 = getTop10(data);

    renderTop3(top3);
    renderTop10(top10);
  } catch (error) {
    console.error("optimize-lite fetch error:", error);
    renderError(`엔진 호출 중 오류가 발생했습니다. (${error.message})`);
  }
}

fetchOptimizeResult();
