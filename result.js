const params = new URLSearchParams(window.location.search);

const nickname = params.get("nickname") || "";
const hwan = params.get("hwan") || "";

const nicknameValue = document.getElementById("nicknameValue");
const hwanValue = document.getElementById("hwanValue");
const top3List = document.getElementById("top3List");
const candidateTableBody = document.getElementById("candidateTableBody");

const setSummaryBars = document.getElementById("setSummaryBars");
const starforceBars = document.getElementById("starforceBars");
const potentialBars = document.getElementById("potentialBars");

const API_BASE = "https://maple-bundle-new.maple-bundle.workers.dev/optimize-lite";

/**
 * 지금은 메인에서 시드링 입력을 받지 않으므로
 * 우선 임시 기본값 5로 호출
 * 이후 자동 조회 로직 붙으면 여기만 바꾸면 됨
 */
const DEFAULT_SEED_RING_LEVEL = 5;

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

function setSummaryValues() {
  if (nicknameValue) nicknameValue.textContent = nickname || "-";
  if (hwanValue) hwanValue.textContent = hwan ? formatNumber(hwan) : "-";
}

function renderBarSection(container, rows) {
  if (!container) return;

  const max = Math.max(...rows.map((r) => r.value), 1);

  container.innerHTML = rows
    .map((row) => {
      const width = (row.value / max) * 100;
      return `
        <div class="bar-row">
          <div class="bar-top">
            <div class="bar-label">${row.label}</div>
            <div class="bar-value">${row.value}</div>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${width}%"></div>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderDefaultGraphs() {
  renderBarSection(setSummaryBars, [
    { label: "칠흑 세트", value: 7 },
    { label: "에테르넬 세트", value: 3 },
    { label: "여명 세트", value: 2 },
    { label: "보스 장신구", value: 5 }
  ]);

  renderBarSection(starforceBars, [
    { label: "22성 장비", value: 8 },
    { label: "18성 장비", value: 4 },
    { label: "17성 이하", value: 3 }
  ]);

  renderBarSection(potentialBars, [
    { label: "레전더리", value: 9 },
    { label: "유니크", value: 6 },
    { label: "에픽", value: 4 }
  ]);
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
          : "-";
      const efficiency = formatEfficiencyGrade(item.efficiency);

      return `
        <div class="top3-card">
          <div class="top3-rank">${item.rank ?? "-"}</div>
          <div class="top3-title">${item.action_summary || "추천 결과"}</div>
          <div class="top3-desc">
            슬롯: ${item.slot_key || "-"}<br />
            현재 아이템: ${item.current_item || "-"}<br />
            목표 아이템: ${item.target_item || "-"}
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
        <td colspan="5">표시할 후보가 없습니다.</td>
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
          : "-";
      const efficiency = formatEfficiencyGrade(item.efficiency);

      return `
        <tr>
          <td>${item.rank ?? "-"}</td>
          <td>${item.action_summary || "-"}</td>
          <td>${gain}</td>
          <td>${cost}</td>
          <td>${efficiency}</td>
        </tr>
      `;
    })
    .join("");
}

async function fetchOptimizeResult() {
  setSummaryValues();
  renderDefaultGraphs();

  if (!nickname || !hwan) {
    renderError("닉네임과 아이템환산이 필요합니다.");
    return;
  }

  renderLoading();

  const url =
    `${API_BASE}?character_name=${encodeURIComponent(nickname)}` +
    `&hwan=${encodeURIComponent(hwan)}` +
    `&seed_ring_level=${DEFAULT_SEED_RING_LEVEL}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log("optimize-lite response:", data);

    if (!data || data.ok === false) {
      throw new Error("응답 데이터가 올바르지 않습니다.");
    }

    if (nicknameValue && data.character_name) {
      nicknameValue.textContent = data.character_name;
    }

    if (hwanValue && hwan) {
      hwanValue.textContent = formatNumber(hwan);
    }

    renderTop3(data.top3 || []);
    renderTop10(data.top10 || []);
  } catch (error) {
    console.error("optimize-lite fetch error:", error);
    renderError(`엔진 호출 중 오류가 발생했습니다. (${error.message})`);
  }
}

fetchOptimizeResult();
