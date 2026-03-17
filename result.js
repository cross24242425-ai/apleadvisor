/* result.js - 복붙용 단일 파일 */

const API_BASE = "https://maple-bundle-new.maple-bundle.workers.dev";

const $ = (id) => document.getElementById(id);

function showLoading(on) {
  const el = $("loading");
  if (!el) return;
  el.classList.toggle("hidden", !on);
}

function qparam(name) {
  const u = new URL(location.href);
  return u.searchParams.get(name) || "";
}

function setQuery(nickname, hwan) {
  const u = new URL(location.href);
  u.searchParams.set("nickname", nickname);
  u.searchParams.set("hwan", String(hwan || "").replace(/,/g, ""));
  history.replaceState({}, "", u.toString());
}

function formatNumber(n) {
  if (n === null || n === undefined) return "-";
  const x = Number(n);
  if (!Number.isFinite(x)) return "-";
  return x.toLocaleString("ko-KR");
}

function formatEokFromMeso(meso) {
  if (meso === null || meso === undefined) return "-";
  const x = Number(meso);
  if (!Number.isFinite(x)) return "-";
  // 1억 = 100,000,000
  const eok = x / 100000000;
  return `${eok.toFixed(1)}억`;
}

function safeText(s) {
  return (s === null || s === undefined || s === "") ? "-" : String(s);
}

function isSameItemRow(row) {
  const a = (row?.current_item || "").trim();
  const b = (row?.target_item || "").trim();
  return a && b && a === b;
}

function resolveTargetStarforce(row) {
  // 목표가 없으면 현재 사용
  return row?.target_starforce ?? row?.current_starforce ?? null;
}
function resolveTargetPotential(row) {
  return row?.target_potential_text || row?.current_potential_text || "-";
}
function resolveTargetAdditional(row) {
  return row?.target_additional_text || row?.current_additional_text || "-";
}

function buildStateBox(title, star, pot, add) {
  return `
    <div class="state-box">
      <div class="state-title">${title}</div>
      <div class="state-line"><b>스타포스:</b> ${star !== null ? `${star}성` : "-"}</div>
      <div class="state-line"><b>잠재:</b> ${safeText(pot)}</div>
      <div class="state-line"><b>에디:</b> ${safeText(add)}</div>
    </div>
  `;
}

function buildTop3Card(row, idx, reasonsMap) {
  const currentName = safeText(row?.current_item);
  const targetName = safeText(row?.target_item);

  // 요구사항:
  // - 현재 템 이름(기존 금색 위치)을 "검정색"으로
  // - 그 아래 줄에 → 변경템(금색, 크게)
  // - 아래 작은 current->target 라인 제거
  const currentStar = row?.current_starforce ?? null;
  const currentPot = row?.current_potential_text || "-";
  const currentAdd = row?.current_additional_text || "-";

  const targetStar = resolveTargetStarforce(row);
  const targetPot = resolveTargetPotential(row);
  const targetAdd = resolveTargetAdditional(row);

  const reasonText = (reasonsMap?.get(idx + 1) || row?.recommendation_reason || "").trim();

  return `
    <div class="top3-item">
      <div class="top3-head">
        <div class="rank-badge">${idx + 1}</div>
        <div class="top3-names">
          <div class="item-current">${currentName}</div>
          <div class="item-target">${targetName}</div>
          <div class="item-sub">${safeText(row?.slot_key)} · ${safeText(row?.upgrade_path || row?.family || "")}</div>
        </div>
      </div>

      <div class="state-grid">
        ${buildStateBox("현재 상태", currentStar, currentPot, currentAdd)}
        ${buildStateBox("목표 상태", targetStar, targetPot, targetAdd)}
      </div>

      <div class="reason-box">
        <div class="reason-title">추천 이유</div>
        <div class="reason-text">${safeText(reasonText || "추천 이유 데이터가 없습니다.")}</div>
      </div>

      <div class="metrics">
        <div class="metric">
          <div class="metric-title">예상 상승</div>
          <div class="metric-val">+${formatNumber(row?.delta_hwan)}</div>
        </div>
        <div class="metric">
          <div class="metric-title">예상 비용</div>
          <div class="metric-val">${formatEokFromMeso(row?.total_expected_cost_p60 ?? row?.expected_cost_p60)}</div>
        </div>
      </div>
    </div>
  `;
}

function buildSummaryBlock(title, arr) {
  const items = Array.isArray(arr) ? arr : [];
  const max = items.reduce((m, x) => Math.max(m, Number(x?.value || 0)), 0) || 1;
  const rows = items.map((x) => {
    const v = Number(x?.value || 0);
    const pct = Math.max(0, Math.min(100, Math.round((v / max) * 100)));
    return `
      <div class="bar-row">
        <div class="bar-label">${safeText(x?.label)}</div>
        <div class="bar"><i style="width:${pct}%"></i></div>
        <div class="bar-val">${formatNumber(v)}</div>
      </div>
    `;
  }).join("");

  return `
    <div class="summary-block">
      <div class="title">${title}</div>
      ${rows || `<div class="card-sub" style="color:#64748b;margin-top:2px;">데이터 없음</div>`}
    </div>
  `;
}

function renderSummary(data) {
  const el = $("summaryGrid");
  if (!el) return;

  const setSummary = data?.set_summary || [];
  const sfSummary = data?.starforce_summary || [];
  const potSummary = data?.potential_summary || [];
  const addSummary = data?.additional_summary || [];

  el.innerHTML = [
    buildSummaryBlock("세트", setSummary),
    buildSummaryBlock("스타포스", sfSummary),
    buildSummaryBlock("잠재", potSummary),
    buildSummaryBlock("에디", addSummary),
  ].join("");
}

function renderNextStep(data) {
  // 요구사항 레이아웃:
  // 1줄: 목표환산/예상총상승량/예상총비용 3칸
  // 2줄: 요약(폭 동일)
  // 3줄: step1~3 세로
  const top3 = $("nextStepTop3");
  const summary = $("nextStepSummary");
  const steps = $("nextStepSteps");
  if (!top3 || !summary || !steps) return;

  const plan = data?.next_step_plan || null;

  if (!plan) {
    top3.innerHTML = `<div class="score-box"><div class="score-k">목표 환산</div><div class="score-v">-</div></div>
                      <div class="score-box"><div class="score-k">예상 총 상승량</div><div class="score-v">-</div></div>
                      <div class="score-box"><div class="score-k">예상 총 비용</div><div class="score-v">-</div></div>`;
    summary.innerHTML = `<div class="box">다음 단계 추천 데이터가 없습니다.</div>`;
    steps.innerHTML = "";
    return;
  }

  const targetHwan = plan?.target_hwan ?? null;
  const totalDelta = plan?.expected_total_delta_hwan ?? null;
  const totalCost = plan?.expected_total_cost_p60 ?? plan?.expected_total_cost ?? null;

  top3.innerHTML = `
    <div class="score-box">
      <div class="score-k">목표 환산</div>
      <div class="score-v">${targetHwan !== null ? formatNumber(targetHwan) : "-"}</div>
    </div>
    <div class="score-box">
      <div class="score-k">예상 총 상승량</div>
      <div class="score-v">${totalDelta !== null ? `+${formatNumber(totalDelta)}` : "-"}</div>
    </div>
    <div class="score-box">
      <div class="score-k">예상 총 비용</div>
      <div class="score-v">${formatEokFromMeso(totalCost)}</div>
    </div>
  `;

  summary.innerHTML = `<div class="box">${safeText(plan?.summary || "요약 정보가 없습니다.")}</div>`;

  const stepArr = Array.isArray(plan?.steps) ? plan.steps : [];
  const pick3 = stepArr.slice(0, 3);

  steps.innerHTML = pick3.map((s, i) => {
    const name = safeText(s?.item_name || s?.target_item || s?.title);
    const slot = safeText(s?.slot_key);
    const delta = s?.delta_hwan != null ? `상승 +${formatNumber(s.delta_hwan)}` : "";
    const cost = (s?.expected_cost_p60 ?? s?.total_expected_cost_p60 ?? null);
    const costText = cost != null ? `비용 ${formatEokFromMeso(cost)}` : "";
    const sub = [slot, delta, costText].filter(Boolean).join(" · ");

    return `
      <div class="step">
        <div class="step-hd">STEP ${i + 1}</div>
        <div class="step-title">${name}</div>
        <div class="step-sub">${sub || "-"}</div>
      </div>
    `;
  }).join("");
}

function renderLevelSummary(data) {
  const top3 = $("levelTop3");
  const sum = $("levelSummary");
  const chips = $("levelChips");
  if (!top3 || !sum || !chips) return;

  const lv = data?.equipment_level_summary || null;
  if (!lv) {
    top3.innerHTML = `
      <div class="score-box"><div class="score-k">현재 환산</div><div class="score-v">-</div></div>
      <div class="score-box"><div class="score-k">전체 기준</div><div class="score-v">-</div></div>
      <div class="score-box"><div class="score-k">구간 기준</div><div class="score-v">-</div></div>
    `;
    sum.innerHTML = `<div class="box">내 템 수준 데이터가 없습니다.</div>`;
    chips.innerHTML = "";
    return;
  }

  const currentHwan = lv?.current_hwan ?? null;
  const overall = lv?.percentile_overall ?? null;
  const bucket = lv?.percentile_bucket ?? null;

  top3.innerHTML = `
    <div class="score-box">
      <div class="score-k">현재 환산</div>
      <div class="score-v">${currentHwan !== null ? formatNumber(currentHwan) : "-"}</div>
      <div class="score-mini">입력 기준</div>
    </div>
    <div class="score-box">
      <div class="score-k">전체 기준</div>
      <div class="score-v">${overall !== null ? `상위 ${formatNumber(overall)}%` : "-"}</div>
      <div class="score-mini">수혜 대비 위치</div>
    </div>
    <div class="score-box">
      <div class="score-k">구간 기준</div>
      <div class="score-v">${bucket !== null ? `상위 ${formatNumber(bucket)}%` : "-"}</div>
      <div class="score-mini">동일 환산 구간</div>
    </div>
  `;

  const summaryText =
    lv?.summary ||
    (lv?.completion_grade ? `요약 등급: ${lv.completion_grade}` : "요약 정보가 없습니다.");
  sum.innerHTML = `<div class="box">${safeText(summaryText)}</div>`;

  // 1번 사진처럼: 완성도/스타포스/잠재/에디/세트효과
  const chipItems = [];
  if (lv?.completion_grade) chipItems.push(`완성도: ${lv.completion_grade}`);
  if (lv?.starforce_grade) chipItems.push(`스타포스: ${lv.starforce_grade}`);
  if (lv?.potential_grade) chipItems.push(`잠재: ${lv.potential_grade}`);
  if (lv?.additional_grade) chipItems.push(`에디: ${lv.additional_grade}`);
  if (lv?.set_effect_grade) chipItems.push(`세트효과: ${lv.set_effect_grade}`);

  chips.innerHTML = chipItems.map(t => `<span class="chip">${t}</span>`).join("");
}

function renderEquipmentScore(data) {
  const row = $("scoreTopRow");
  const pros = $("scorePros");
  const cons = $("scoreCons");
  if (!row || !pros || !cons) return;

  const s = data?.equipment_score || null;
  if (!s) {
    row.innerHTML = `
      <div class="score-box"><div class="score-k">종합 점수</div><div class="score-v">-</div></div>
      <div class="score-box"><div class="score-k">스타포스</div><div class="score-v">-</div></div>
      <div class="score-box"><div class="score-k">잠재</div><div class="score-v">-</div></div>
      <div class="score-box"><div class="score-k">에디</div><div class="score-v">-</div></div>
      <div class="score-box"><div class="score-k">세트효과</div><div class="score-v">-</div></div>
    `;
    pros.textContent = "데이터 없음";
    cons.textContent = "데이터 없음";
    return;
  }

  const total = s?.total ?? s?.score ?? null;
  const sf = s?.starforce ?? null;
  const pot = s?.potential ?? null;
  const add = s?.additional ?? null;
  const set = s?.set_effect ?? null;

  row.innerHTML = `
    <div class="score-box"><div class="score-k">종합 점수</div><div class="score-v">${total ?? "-"}</div><div class="score-mini">${safeText(s?.grade || "")}</div></div>
    <div class="score-box"><div class="score-k">스타포스</div><div class="score-v">${sf ?? "-"}</div></div>
    <div class="score-box"><div class="score-k">잠재</div><div class="score-v">${pot ?? "-"}</div></div>
    <div class="score-box"><div class="score-k">에디</div><div class="score-v">${add ?? "-"}</div></div>
    <div class="score-box"><div class="score-k">세트효과</div><div class="score-v">${set ?? "-"}</div></div>
  `;

  const prosArr = Array.isArray(s?.pros) ? s.pros : [];
  const consArr = Array.isArray(s?.cons) ? s.cons : [];
  pros.textContent = prosArr.length ? prosArr.map(x => `• ${x}`).join("\n") : "• 장점 데이터 없음";
  cons.textContent = consArr.length ? consArr.map(x => `• ${x}`).join("\n") : "• 약점 데이터 없음";
}

function buildTop10Row(row) {
  const rank = row?.rank ?? "-";
  const slot = safeText(row?.slot_key);
  const currentName = safeText(row?.current_item);
  const targetName = safeText(row?.target_item);

  // 요구사항: TOP10 업그레이드 칼럼은
  // - “업그레이드”가 아니라 “업그레이드 할 부위”
  // - 부위 + 템이름 + 아래에 화살표(→ 변경템 이름)만 깔끔하게
  const upgradeCell = `
    <div class="upgrade-cell">
      <div class="slot">${slot} · ${currentName}</div>
      <div class="arrow">${targetName}</div>
    </div>
  `;

  const curStar = row?.current_starforce ?? null;
  const curPot = row?.current_potential_text || "-";
  const curAdd = row?.current_additional_text || "-";

  const tgtStar = resolveTargetStarforce(row);
  const tgtPot = resolveTargetPotential(row);
  const tgtAdd = resolveTargetAdditional(row);

  const curCell = `
    <div class="state-cell">
      <div class="line"><b>스타포스</b> ${curStar !== null ? `${curStar}성` : "-"}</div>
      <div class="line"><b>잠재</b> ${safeText(curPot)}</div>
      <div class="line"><b>에디</b> ${safeText(curAdd)}</div>
    </div>
  `;
  const tgtCell = `
    <div class="state-cell">
      <div class="line"><b>스타포스</b> ${tgtStar !== null ? `${tgtStar}성` : "-"}</div>
      <div class="line"><b>잠재</b> ${safeText(tgtPot)}</div>
      <div class="line"><b>에디</b> ${safeText(tgtAdd)}</div>
    </div>
  `;

  const delta = row?.delta_hwan != null ? `+${formatNumber(row.delta_hwan)}` : "-";
  const cost = formatEokFromMeso(row?.total_expected_cost_p60 ?? row?.expected_cost_p60);
  const eff = row?.efficiency_grade || row?.efficiency_letter || row?.efficiency || "-";

  return `
    <tr>
      <td class="num">${rank}</td>
      <td>${upgradeCell}</td>
      <td>${curCell}</td>
      <td>${tgtCell}</td>
      <td class="num">${delta}</td>
      <td class="num">${cost}</td>
      <td class="num">${safeText(eff)}</td>
    </tr>
  `;
}

function buildReasonsMap(data) {
  // recommendation_reasons가 있다면 rank -> reason 매핑
  const m = new Map();
  const arr = Array.isArray(data?.recommendation_reasons) ? data.recommendation_reasons : [];
  for (const r of arr) {
    const k = Number(r?.rank);
    const v = (r?.reason || r?.text || "").trim();
    if (Number.isFinite(k) && v) m.set(k, v);
  }
  return m;
}

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function runDiagnose(nickname, hwan) {
  showLoading(true);
  try {
    const url = `${API_BASE}/gpt-diagnose?character_name=${encodeURIComponent(nickname)}&hwan=${encodeURIComponent(String(hwan))}`;
    const data = await fetchJson(url);

    // 구성요약
    renderSummary(data);

    // 다음단계
    renderNextStep(data);

    // 내 템의 수준
    renderLevelSummary(data);

    // 자동 평가 점수
    renderEquipmentScore(data);

    // TOP3/TOP10
    const reasonsMap = buildReasonsMap(data);

    const top3 = Array.isArray(data?.top3) ? data.top3 : [];
    const top10 = Array.isArray(data?.top10) ? data.top10 : [];

    const top3List = $("top3List");
    top3List.innerHTML = top3.slice(0, 3).map((row, i) => buildTop3Card(row, i, reasonsMap)).join("");

    const top10Body = $("top10Body");
    top10Body.innerHTML = top10.slice(0, 10).map(buildTop10Row).join("");

    $("debugLine").textContent = `현재 수신 개수: ${top10.length} / 응답 top10_count: ${safeText(data?.top10_count)}`;

  } catch (e) {
    console.error(e);
    alert(`진단 불러오기 실패: ${e?.message || e}`);
  } finally {
    showLoading(false);
  }
}

function bindSearch() {
  const nicknameInput = $("nicknameInput");
  const hwanInput = $("hwanInput");
  const btn = $("searchBtn");

  function go() {
    const nickname = (nicknameInput.value || "").trim();
    const hwan = (hwanInput.value || "").trim().replace(/,/g, "");
    if (!nickname || !hwan) {
      alert("닉네임과 환산을 입력해주세요.");
      return;
    }
    setQuery(nickname, hwan);
    runDiagnose(nickname, hwan);
  }

  btn.addEventListener("click", go);
  hwanInput.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
  nicknameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
}

function bootstrapFromUrl() {
  const nickname = qparam("nickname") || qparam("character_name") || "";
  const hwan = qparam("hwan") || "";

  $("nicknameInput").value = nickname;
  $("hwanInput").value = hwan;

  if (nickname && hwan) {
    runDiagnose(nickname, hwan);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  bindSearch();
  bootstrapFromUrl();
});
