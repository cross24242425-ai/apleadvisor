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

const summaryMiniCard = document.getElementById("summaryMiniCard");

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
  return data.top3 || data.data?.top3 || data.result?.top3 || [];
}

function getTop10(data) {
  const raw = data.top10 || data.data?.top10 || data.result?.top10 || [];
  return Array.isArray(raw) ? raw.slice(0, 10) : [];
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

  if (summaryMiniCard) {
    summaryMiniCard.innerHTML = `<div class="guide-text">구성 요약을 불러오지 못했습니다.</div>`;
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

  if (summaryMiniCard) {
    summaryMiniCard.innerHTML = `<div class="guide-text">구성 요약을 불러오는 중...</div>`;
  }
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

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px;">
          <div style="background:#ffffff;border:1px solid #e7eaf3;border-radius:14px;padding:12px;">
            <div style="font-size:12px;color:#7a819f;font-weight:700;margin-bottom:8px;">현재 아이템 상태</div>
            <div style="font-size:13px;color:#223055;line-height:1.7;">
              <div><strong>스타포스:</strong> ${safeText(item.current_starforce, "-")}성</div>
              <div><strong>잠재:</strong> ${safeText(item.current_potential_text, "-")}</div>
              <div><strong>에디:</strong> ${safeText(item.current_additional_text, "-")}</div>
            </div>
          </div>

          <div style="background:#ffffff;border:1px solid #e7eaf3;border-radius:14px;padding:12px;">
            <div style="font-size:12px;color:#7a819f;font-weight:700;margin-bottom:8px;">목표 아이템 상태</div>
            <div style="font-size:13px;color:#223055;line-height:1.7;">
              <div><strong>스타포스:</strong> ${safeText(item.target_starforce, "-")}성</div>
              <div><strong>잠재:</strong> ${safeText(item.target_potential_text || item.target_potential_label, "-")}</div>
              <div><strong>에디:</strong> ${safeText(item.target_additional_text || item.target_additional_label, "-")}</div>
            </div>
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
  }).join("");
}

function renderTop10(top10, top10Count) {
  if (!candidateTableBody) return;

  if (!Array.isArray(top10) || top10.length === 0) {
    candidateTableBody.innerHTML = `
      <tr>
        <td colspan="7">표시할 후보가 없습니다.</td>
      </tr>
    `;
    return;
  }

  const rowsHtml = top10.map((item) => {
    const gain = item.delta_hwan != null ? `+${formatNumber(item.delta_hwan)}` : "-";
    const cost =
      item.total_expected_cost_p60 != null
        ? formatCostToEok(item.total_expected_cost_p60)
        : item.expected_cost_p60 != null
        ? formatCostToEok(item.expected_cost_p60)
        : "-";
    const efficiency = formatEfficiencyGrade(item.efficiency);

    const currentState = [
      `스타포스 ${safeText(item.current_starforce, "-")}성`,
      `잠재 ${safeText(item.current_potential_text, "-")}`,
      `에디 ${safeText(item.current_additional_text, "-")}`
    ].join(" / ");

    const targetState = [
      `스타포스 ${safeText(item.target_starforce, "-")}성`,
      `잠재 ${safeText(item.target_potential_text || item.target_potential_label, "-")}`,
      `에디 ${safeText(item.target_additional_text || item.target_additional_label, "-")}`
    ].join(" / ");

    return `
      <tr>
        <td>${item.rank ?? "-"}</td>
        <td>${safeText(item.action_summary)}</td>
        <td style="font-size:12px;line-height:1.5;color:#465273;">${currentState}</td>
        <td style="font-size:12px;line-height:1.5;color:#465273;">${targetState}</td>
        <td>${gain}</td>
        <td>${cost}</td>
        <td>${efficiency}</td>
      </tr>
    `;
  }).join("");

  const debugRow = `
    <tr>
      <td colspan="7" style="font-size:12px;color:#6f7694;background:#fafbff;">
        현재 수신 개수: ${top10.length} / 응답 top10_count: ${safeText(top10Count, "-")}
      </td>
    </tr>
  `;

  candidateTableBody.innerHTML = rowsHtml + debugRow;
}

function makeMiniBar(label, value, max) {
  const safeValue = Number(value) || 0;
  const percent = max > 0 ? Math.max(6, Math.round((safeValue / max) * 100)) : 0;

  return `
    <div style="margin-top:8px;">
      <div style="display:flex;justify-content:space-between;gap:8px;font-size:11px;color:#465273;font-weight:700;">
        <span>${label}</span>
        <span>${safeValue}</span>
      </div>
      <div style="margin-top:4px;height:7px;background:#e7ebf5;border-radius:999px;overflow:hidden;">
        <div style="height:100%;width:${percent}%;background:linear-gradient(90deg,#6763ff 0%,#5c84ff 100%);border-radius:999px;"></div>
      </div>
    </div>
  `;
}

function renderSummaryMiniCard(data, top10) {
  if (!summaryMiniCard) return;

  const setSummary = Array.isArray(data.set_summary) ? data.set_summary : [];
  const starforceSummary = Array.isArray(data.starforce_summary) ? data.starforce_summary : [];
  const potentialSummary = Array.isArray(data.potential_summary) ? data.potential_summary : [];
  const additionalSummary = Array.isArray(data.additional_summary) ? data.additional_summary : [];

  const summaryCounts = data.summary_counts || data.summaryCounts || {};
  const summaryLabels = data.summary_labels || data.summaryLabels || {};

  const fallbackSet = [
    { label: "same-item 강화 추천", value: Number(summaryCounts.same_item_count ?? 0) || top10.filter(x => x.current_item === x.target_item).length },
    { label: "교체 추천", value: Number(summaryCounts.replace_count ?? 0) || top10.filter(x => x.current_item !== x.target_item).length }
  ];

  const fallbackStar = [
    { label: "잠재 업그레이드 추천", value: Number(summaryCounts.potential_upgrade_count ?? 0) || top10.filter(x => /잠재/i.test(x.action_summary || "")).length },
    { label: "에디 업그레이드 추천", value: Number(summaryCounts.additional_upgrade_count ?? 0) || top10.filter(x => /에디/i.test(x.action_summary || "")).length }
  ];

  const fallbackPotential = [
    { label: "세트효과 변동 포함 추천", value: Number(summaryCounts.set_change_count ?? 0) || top10.filter(x => Number(x.set_effect_hwan || 0) !== 0).length }
  ];

  const fallbackAdditional = [
    { label: "에디 업그레이드 추천", value: Number(summaryCounts.additional_upgrade_count ?? 0) || top10.filter(x => /에디/i.test(x.action_summary || "")).length }
  ];

  const setRows = setSummary.length > 0 ? setSummary : fallbackSet;
  const starRows = starforceSummary.length > 0 ? starforceSummary : fallbackStar;
  const potentialRows = potentialSummary.length > 0 ? potentialSummary : fallbackPotential;
  const additionalRows = additionalSummary.length > 0 ? additionalSummary : fallbackAdditional;

  const allValues = [...setRows, ...starRows, ...potentialRows, ...additionalRows].map(x => Number(x.value) || 0);
  const maxBar = Math.max(...allValues, 1);

  const ringText = data.seed_ring_name
    ? `현재 시드링: ${data.seed_ring_name}${data.seed_ring_level ? ` ${data.seed_ring_level}레벨` : ""}`
    : "현재 시드링: 자동 조회 정보 없음";

  const buildSummary = safeText(
    summaryLabels.build_summary || summaryLabels.buildSummary,
    `${safeText(data.character_name || data.nickname, nickname)} 현재 환산 ${formatNumber(hwan)}, 추천 후보 ${top10.length}개`
  );

  const prioritySummary = safeText(
    summaryLabels.priority_summary || summaryLabels.prioritySummary,
    "현재 장비 유지 상태에서 에디/잠재 강화 비중이 높습니다."
  );

  summaryMiniCard.innerHTML = `
    <div style="font-size:11px;line-height:1.6;color:#45506f;margin-bottom:10px;">
      <div style="font-weight:800;color:#1f2747;">${buildSummary}</div>
      <div style="margin-top:4px;">${ringText}</div>
      <div style="margin-top:4px;">${prioritySummary}</div>
    </div>

    <div style="margin-top:10px;">
      <div style="font-size:11px;font-weight:800;color:#1f2747;">세트 효과</div>
      ${setRows.map(row => makeMiniBar(row.label, row.value, maxBar)).join("")}
    </div>

    <div style="margin-top:12px;">
      <div style="font-size:11px;font-weight:800;color:#1f2747;">스타포스</div>
      ${starRows.map(row => makeMiniBar(row.label, row.value, maxBar)).join("")}
    </div>

    <div style="margin-top:12px;">
      <div style="font-size:11px;font-weight:800;color:#1f2747;">잠재</div>
      ${potentialRows.map(row => makeMiniBar(row.label, row.value, maxBar)).join("")}
    </div>

    <div style="margin-top:12px;">
      <div style="font-size:11px;font-weight:800;color:#1f2747;">에디</div>
      ${additionalRows.map(row => makeMiniBar(row.label, row.value, maxBar)).join("")}
    </div>
  `;
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

    renderSummaryMiniCard(data, top10);
    renderTop3(top3);
    renderTop10(top10, data.top10_count);
  } catch (error) {
    console.error("optimize-lite fetch error:", error);
    renderError(`엔진 호출 중 오류가 발생했습니다. (${error.message})`);
  }
}

fetchOptimizeResult();
