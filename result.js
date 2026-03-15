const params = new URLSearchParams(window.location.search);

const nickname = params.get("nickname") || "";
const hwan = params.get("hwan") || "";

const nicknameValue = document.getElementById("nicknameValue");
const hwanValue = document.getElementById("hwanValue");
const top3List = document.getElementById("top3List");
const candidateTableBody = document.getElementById("candidateTableBody");
const summaryMiniCard = document.getElementById("summaryMiniCard");

const resultNicknameInput = document.getElementById("resultNicknameInput");
const resultHwanInput = document.getElementById("resultHwanInput");
const resultSearchButton = document.getElementById("resultSearchButton");

const loadingOverlay = document.getElementById("loadingOverlay");

const GPT_DIAGNOSE_API = "https://maple-bundle-new.maple-bundle.workers.dev/gpt-diagnose";
const OPTIMIZE_LITE_API = "https://maple-bundle-new.maple-bundle.workers.dev/optimize-lite";

function formatNumber(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return "-";
  return num.toLocaleString("ko-KR");
}

function formatCostToEok(value) {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  if (Number.isNaN(num)) return "-";

  const eok = num / 100000000;
  if (eok === 0) return "0억";
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setSummaryValues() {
  if (nicknameValue) nicknameValue.textContent = nickname || "-";
  if (hwanValue) hwanValue.textContent = hwan ? formatNumber(hwan) : "-";

  if (resultNicknameInput) resultNicknameInput.value = nickname || "";
  if (resultHwanInput) resultHwanInput.value = hwan ? formatNumber(hwan) : "";
}

function showLoading() {
  if (loadingOverlay) loadingOverlay.classList.add("show");
}

function hideLoading() {
  if (loadingOverlay) loadingOverlay.classList.remove("show");
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

function normalizeRows(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((x) => ({
    label: safeText(x?.label, "-"),
    value: Number(x?.value) || 0
  }));
}

function makeSummaryBar(label, value, max) {
  const safeValue = Number(value) || 0;
  const percent = max > 0 ? Math.max(6, Math.round((safeValue / max) * 100)) : 0;

  return `
    <div class="summary-row">
      <div class="summary-row-head">
        <span>${escapeHtml(label)}</span>
        <strong>${safeValue}</strong>
      </div>
      <div class="summary-track">
        <div class="summary-fill" style="width:${percent}%"></div>
      </div>
    </div>
  `;
}

function renderSummaryMiniCard(data, rowsForFallback) {
  if (!summaryMiniCard) return;

  const setRows = normalizeRows(data?.set_summary || data?.setSummary || data?.summary?.set_summary);
  const starRows = normalizeRows(data?.starforce_summary || data?.starforceSummary || data?.summary?.starforce_summary);
  const potentialRows = normalizeRows(data?.potential_summary || data?.potentialSummary || data?.summary?.potential_summary);
  const additionalRows = normalizeRows(data?.additional_summary || data?.additionalSummary || data?.summary?.additional_summary);

  const summaryLabels = data.summary_labels || data.summaryLabels || {};
  const buildSummary = safeText(
    summaryLabels.build_summary || summaryLabels.buildSummary,
    `${safeText(data.character_name || data.nickname, nickname)} 현재 환산 ${formatNumber(hwan)}, 유지형 ${rowsForFallback.length}개`
  );

  const ringText = data.seed_ring_name
    ? `현재 시드링: ${data.seed_ring_name}${data.seed_ring_level ? ` ${data.seed_ring_level}레벨` : ""}`
    : "현재 시드링: 자동 조회 정보 없음";

  const prioritySummary = safeText(
    summaryLabels.priority_summary || summaryLabels.prioritySummary,
    "현재 장비 유지형 강화 비중이 높습니다."
  );

  const allRows = [...setRows, ...starRows, ...potentialRows, ...additionalRows];
  const maxBar = Math.max(...allRows.map((x) => x.value), 1);

  summaryMiniCard.innerHTML = `
    <div class="summary-card">
      <div class="summary-top-text">
        <strong>${escapeHtml(buildSummary)}</strong><br>
        ${escapeHtml(ringText)}<br>
        ${escapeHtml(prioritySummary)}
      </div>

      <div class="summary-divider"></div>

      <div class="summary-stack">
        <div class="summary-group">
          <div class="summary-group-title">세트 효과</div>
          ${setRows.length ? setRows.map((row) => makeSummaryBar(row.label, row.value, maxBar)).join("") : `<div class="guide-text">데이터 없음</div>`}
        </div>

        <div class="summary-group">
          <div class="summary-group-title">스타포스</div>
          ${starRows.length ? starRows.map((row) => makeSummaryBar(row.label, row.value, maxBar)).join("") : `<div class="guide-text">데이터 없음</div>`}
        </div>

        <div class="summary-group">
          <div class="summary-group-title">잠재</div>
          ${potentialRows.length ? potentialRows.map((row) => makeSummaryBar(row.label, row.value, maxBar)).join("") : `<div class="guide-text">데이터 없음</div>`}
        </div>

        <div class="summary-group">
          <div class="summary-group-title">에디</div>
          ${additionalRows.length ? additionalRows.map((row) => makeSummaryBar(row.label, row.value, maxBar)).join("") : `<div class="guide-text">데이터 없음</div>`}
        </div>
      </div>
    </div>
  `;
}

function getArrayCandidates(data) {
  return [
    { name: "top10", value: data?.top10 },
    { name: "summary_visible_rows", value: data?.summary_visible_rows },
    { name: "data.top10", value: data?.data?.top10 },
    { name: "data.summary_visible_rows", value: data?.data?.summary_visible_rows },
    { name: "result.top10", value: data?.result?.top10 },
    { name: "result.summary_visible_rows", value: data?.result?.summary_visible_rows },
    { name: "top3", value: data?.top3 },
    { name: "data.top3", value: data?.data?.top3 },
    { name: "result.top3", value: data?.result?.top3 }
  ];
}

function resolveTop10Rows(data) {
  const candidates = getArrayCandidates(data);
  let best = [];
  for (const item of candidates) {
    if (Array.isArray(item.value) && item.value.length > best.length) {
      best = item.value;
    }
  }
  return best.slice(0, 10);
}

function resolveTop3Rows(data) {
  const candidates = [
    data?.top3,
    data?.data?.top3,
    data?.result?.top3,
    data?.top10,
    data?.summary_visible_rows
  ];

  for (const arr of candidates) {
    if (Array.isArray(arr) && arr.length > 0) {
      return arr.slice(0, 3);
    }
  }
  return [];
}

function resolveCostText(item) {
  if (item?.cost_status === "missing") return "계산 확인 필요";
  return formatCostToEok(item?.total_expected_cost_p60 ?? item?.expected_cost_p60);
}

function parsePotentialGrade(text, fallbackLabel) {
  const value = String(text || fallbackLabel || "").trim();
  if (!value) return "-";

  if (value.includes("레전")) return "레전 3줄";
  if (value.includes("유니크")) return "유니크 2줄";
  if (value.includes("에픽")) return "에픽 2줄";

  const parts = value.split("/").map((x) => x.trim()).filter(Boolean);
  if (parts.length >= 3) return "레전 3줄";
  if (parts.length >= 2) return "유니크 2줄";
  return value;
}

function parseAdditionalGrade(text, fallbackLabel) {
  const value = String(text || fallbackLabel || "").trim();
  if (!value) return "-";

  if (value.includes("레전")) return "레전 3줄";
  if (value.includes("유니크")) return "유니크 2줄";
  if (value.includes("에픽")) return "에픽 2줄";

  const parts = value.split("/").map((x) => x.trim()).filter(Boolean);
  if (parts.length >= 3) return "에픽 2줄";
  if (parts.length >= 2) return "에픽 2줄";
  return value;
}

function buildCurrentItemSummary(item) {
  const starforce = item.current_starforce ? `${item.current_starforce}성` : "-";
  const potential = parsePotentialGrade(item.current_potential_text, item.current_potential_effective_label);
  const additional = parseAdditionalGrade(item.current_additional_text, item.current_additional_effective_label);

  return `${starforce} ${safeText(item.current_item)} ${potential} ${additional}`;
}

function buildTargetItemSummary(item) {
  const targetStarforce = item.target_starforce || item.current_starforce;
  const targetPotentialText = item.target_potential_text || item.current_potential_text;
  const targetPotentialLabel = item.target_potential_label || item.current_potential_effective_label || targetPotentialText;
  const targetAdditionalText = item.target_additional_text || item.current_additional_text;
  const targetAdditionalLabel = item.target_additional_label || item.current_additional_effective_label || targetAdditionalText;

  const starforce = targetStarforce ? `${targetStarforce}성` : "-";
  const potential = parsePotentialGrade(targetPotentialText, targetPotentialLabel);
  const additional = parseAdditionalGrade(targetAdditionalText, targetAdditionalLabel);

  return `${starforce} ${safeText(item.target_item || item.current_item)} ${potential} ${additional}`;
}

function buildCurrentStateText(item) {
  return `
    <strong>스타포스:</strong> ${safeText(item.current_starforce, "-")}성<br>
    <strong>잠재:</strong> ${safeText(item.current_potential_text)}<br>
    <strong>에디:</strong> ${safeText(item.current_additional_text)}
  `;
}

function buildTargetStateText(item) {
  const starforce = item.target_starforce || item.current_starforce || "-";
  const potential = item.target_potential_text || item.current_potential_text || "-";
  const additional = item.target_additional_text || item.target_additional_label || item.current_additional_text || "-";

  return `
    <strong>스타포스:</strong> ${safeText(starforce, "-")}성<br>
    <strong>잠재:</strong> ${safeText(potential)}<br>
    <strong>에디:</strong> ${safeText(additional)}
  `;
}

function buildTop3Title(item) {
  return safeText(item.current_item || item.target_item || item.item_name, "추천 아이템");
}

function buildTargetArrowText(item) {
  const currentItem = safeText(item.current_item || item.item_name, "");
  const targetItem = safeText(item.target_item || item.current_item || item.item_name, "");

  if (!targetItem) return "";

  if (currentItem && targetItem && currentItem === targetItem) {
    return "";
  }

  return `→ ${targetItem}`;
}

function buildTop3TargetArrowHtml(item) {
  const arrowText = buildTargetArrowText(item);
  if (!arrowText) return "";
  return `<div class="top3-target-arrow">${escapeHtml(arrowText)}</div>`;
}

function buildTop10UpgradeMain(item) {
  return `${safeText(item.slot_key || item.slot, "부위")} · ${safeText(item.current_item || item.target_item, "아이템")}`;
}

function buildTop10UpgradeSub(item) {
  return `${safeText(item.slot_key || item.slot, "부위")} 업그레이드`;
}

function buildTop10UpgradeArrowHtml(item) {
  const arrowText = buildTargetArrowText(item);
  if (!arrowText) return "";
  return `<div class="upgrade-arrow">${escapeHtml(arrowText)}</div>`;
}

function buildStateHtml(starforce, potential, additional) {
  return `
    <div class="state-lines">
      <span class="state-line"><strong>스타포스</strong> ${safeText(starforce, "-")}성</span>
      <span class="state-line"><strong>잠재</strong> ${safeText(potential, "-")}</span>
      <span class="state-line"><strong>에디</strong> ${safeText(additional, "-")}</span>
    </div>
  `;
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
    const costText = resolveCostText(item);
    const efficiency = formatEfficiencyGrade(item.efficiency);

    return `
      <div class="top3-card">
        <div class="top3-rank">${item.rank ?? "-"}</div>
        <div class="top3-title">${escapeHtml(buildTop3Title(item))}</div>
        ${buildTop3TargetArrowHtml(item)}

        <div class="top3-desc">
          슬롯: ${escapeHtml(safeText(item.slot_key || item.slot))}<br>
          현재 아이템: ${escapeHtml(buildCurrentItemSummary(item))}<br>
          목표 아이템: ${escapeHtml(buildTargetItemSummary(item))}
        </div>

        <div class="top3-state-grid">
          <div class="top3-state-box">
            <div class="top3-state-title">현재 아이템 상태</div>
            <div class="top3-state-text">
              ${buildCurrentStateText(item)}
            </div>
          </div>

          <div class="top3-state-box">
            <div class="top3-state-title">목표 아이템 상태</div>
            <div class="top3-state-text">
              ${buildTargetStateText(item)}
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
            <div class="meta-value">${costText}</div>
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

function renderTop10(rows, top10Count) {
  if (!candidateTableBody) return;

  if (!Array.isArray(rows) || rows.length === 0) {
    candidateTableBody.innerHTML = `
      <tr>
        <td colspan="7">표시할 후보가 없습니다.</td>
      </tr>
    `;
    return;
  }

  const rowsHtml = rows.map((item) => {
    const gain = item.delta_hwan != null ? `+${formatNumber(item.delta_hwan)}` : "-";
    const costText = resolveCostText(item);
    const efficiency = formatEfficiencyGrade(item.efficiency);

    return `
      <tr>
        <td>${item.rank ?? "-"}</td>
        <td>
          <div class="upgrade-title-cell">
            <div class="upgrade-main">${escapeHtml(buildTop10UpgradeMain(item))}</div>
            ${buildTop10UpgradeArrowHtml(item)}
            <div class="upgrade-sub">${escapeHtml(buildTop10UpgradeSub(item))}</div>
          </div>
        </td>
        <td>${buildStateHtml(item.current_starforce, item.current_potential_text, item.current_additional_text)}</td>
        <td>${buildStateHtml(item.target_starforce || item.current_starforce, item.target_potential_text || item.current_potential_text, item.target_additional_text || item.target_additional_label || item.current_additional_text)}</td>
        <td class="delta-text">${gain}</td>
        <td>${costText}</td>
        <td>${efficiency}</td>
      </tr>
    `;
  }).join("");

  const debugRow = `
    <tr>
      <td colspan="7" class="footer-debug">
        현재 수신 개수: ${rows.length} / 응답 top10_count: ${safeText(top10Count, "-")}
      </td>
    </tr>
  `;

  candidateTableBody.innerHTML = rowsHtml + debugRow;
}

function renderError(message) {
  if (top3List) {
    top3List.innerHTML = `
      <div class="top3-card">
        <div class="top3-title">결과를 불러오지 못했습니다</div>
        <div class="top3-desc">${escapeHtml(message)}</div>
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

function renderLoadingSkeleton() {
  if (top3List) {
    top3List.innerHTML = `
      <div class="top3-card">
        <div class="top3-title">결과를 불러오는 중...</div>
        <div class="top3-desc">진단 결과를 불러오는 중입니다.</div>
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

async function fetchJson(url) {
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
    json,
    text
  };
}

async function fetchDiagnoseFirst() {
  const urls = [
    `${GPT_DIAGNOSE_API}?character_name=${encodeURIComponent(nickname)}&hwan=${encodeURIComponent(hwan)}`,
    `${OPTIMIZE_LITE_API}?character_name=${encodeURIComponent(nickname)}&hwan=${encodeURIComponent(hwan)}&seed_ring_level=5`,
    `${OPTIMIZE_LITE_API}?nickname=${encodeURIComponent(nickname)}&hwan=${encodeURIComponent(hwan)}&seed_ring_level=5`
  ];

  let lastError = null;

  for (const url of urls) {
    try {
      const result = await fetchJson(url);
      if (result.ok && result.json) return result.json;
      lastError = `HTTP ${result.status}`;
    } catch (error) {
      lastError = error.message;
    }
  }

  throw new Error(lastError || "응답 없음");
}

async function fetchResultPage() {
  setSummaryValues();

  if (!nickname || !hwan) {
    renderError("닉네임과 아이템환산이 필요합니다.");
    return;
  }

  showLoading();
  renderLoadingSkeleton();

  try {
    const data = await fetchDiagnoseFirst();

    if (!data || data.ok === false) {
      throw new Error("응답 데이터가 올바르지 않습니다.");
    }

    if (nicknameValue) {
      nicknameValue.textContent = data.character_name || data.nickname || nickname;
    }

    if (hwanValue) {
      hwanValue.textContent = formatNumber(hwan);
    }

    const top3Rows = resolveTop3Rows(data);
    const top10Rows = resolveTop10Rows(data);

    renderSummaryMiniCard(data, top10Rows);
    renderTop3(top3Rows);
    renderTop10(top10Rows, data.top10_count);
  } catch (error) {
    renderError(`엔진 호출 중 오류가 발생했습니다. (${error.message})`);
  } finally {
    hideLoading();
  }
}

fetchResultPage();
