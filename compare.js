(() => {
  const API_BASE = "https://maple-bundle-new.maple-bundle.workers.dev";

  const $ = (id) => document.getElementById(id);

  const el = {
    leftNickname: $("leftNickname"),
    leftHwan: $("leftHwan"),
    rightNickname: $("rightNickname"),
    rightHwan: $("rightHwan"),
    compareBtn: $("compareBtn"),

    leftUserName: $("leftUserName"),
    leftUserHwan: $("leftUserHwan"),
    rightUserName: $("rightUserName"),
    rightUserHwan: $("rightUserHwan"),

    compareSummaryCards: $("compareSummaryCards"),
    compareMetricsBody: $("compareMetricsBody"),
    compareComment: $("compareComment"),

    leftLevelSummary: $("leftLevelSummary"),
    rightLevelSummary: $("rightLevelSummary"),

    leftEquipmentScore: $("leftEquipmentScore"),
    rightEquipmentScore: $("rightEquipmentScore"),

    leftTop3: $("leftTop3"),
    rightTop3: $("rightTop3"),

    leftNextStep: $("leftNextStep"),
    rightNextStep: $("rightNextStep"),

    loadingOverlay: $("loadingOverlay"),
  };

  function showLoading(on) {
    el.loadingOverlay?.classList.toggle("hidden", !on);
  }

  function safeText(v, fallback = "-") {
    if (v === null || v === undefined) return fallback;
    const s = String(v).trim();
    return s ? s : fallback;
  }

  function firstOf(...vals) {
    for (const v of vals) {
      if (v !== null && v !== undefined && String(v).trim() !== "") return v;
    }
    return null;
  }

  function safeArr(v) {
    return Array.isArray(v) ? v : [];
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatNumber(n) {
    const x = Number(n);
    if (!Number.isFinite(x)) return "-";
    return x.toLocaleString("ko-KR");
  }

  function formatSigned(n) {
    const x = Number(n);
    if (!Number.isFinite(x)) return "-";
    return `${x >= 0 ? "+" : ""}${x.toLocaleString("ko-KR")}`;
  }

  function formatPercent(n) {
    const x = Number(n);
    if (!Number.isFinite(x)) return "-";
    return `${x}%`;
  }

  function formatEokFromMeso(meso) {
    const x = Number(meso);
    if (!Number.isFinite(x)) return "-";
    return `${(x / 100000000).toFixed(1)}억`;
  }

  function compareLowerBetter(a, b) {
    const x = Number(a);
    const y = Number(b);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return "비교불가";
    if (x < y) return "유저1";
    if (x > y) return "유저2";
    return "동일";
  }

  function compareHigherBetter(a, b) {
    const x = Number(a);
    const y = Number(b);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return "비교불가";
    if (x > y) return "유저1";
    if (x < y) return "유저2";
    return "동일";
  }

  function gradeWeight(v) {
    const s = String(v || "").trim();
    const map = {
      "매우 우수": 5,
      "우수": 4,
      "보통": 3,
      "부족": 2,
      "매우 부족": 1,
      "S": 5,
      "A": 4,
      "B": 3,
      "C": 2,
      "D": 1
    };
    return map[s] ?? null;
  }

  function compareGrade(a, b) {
    const x = gradeWeight(a);
    const y = gradeWeight(b);
    if (x === null || y === null) return "비교불가";
    if (x > y) return "유저1";
    if (x < y) return "유저2";
    return "동일";
  }

  function compareLabelClass(text) {
    if (text === "유저1") return "win";
    if (text === "유저2") return "lose";
    return "draw";
  }

  async function fetchJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function fetchDiagnose(nickname, hwan) {
    const url = `${API_BASE}/gpt-diagnose?character_name=${encodeURIComponent(nickname)}&hwan=${encodeURIComponent(String(hwan).replace(/,/g, ""))}&stale_if_nexon_fail=1`;
    return fetchJson(url);
  }

  function buildInfoGridThree(a, b, c) {
    return `
      <div class="info-grid">
        ${a}
        ${b}
        ${c}
      </div>
    `;
  }

  function buildInfoGridFive(items) {
    return `<div class="info-grid five">${items.join("")}</div>`;
  }

  function buildInfoBox(title, value, sub = "") {
    return `
      <div class="info-box">
        <div class="info-k">${escapeHtml(title)}</div>
        <div class="info-v">${escapeHtml(value)}</div>
        ${sub ? `<div class="info-s">${escapeHtml(sub)}</div>` : ""}
      </div>
    `;
  }

  function renderLevelSummary(targetEl, payload) {
    const lv = firstOf(payload?.equipment_level_summary, payload?.equipmentLevelSummary, null);
    if (!lv) {
      targetEl.innerHTML = `<div class="placeholder">데이터 없음</div>`;
      return;
    }

    const top = buildInfoGridThree(
      buildInfoBox("현재 환산", formatNumber(firstOf(lv?.current_hwan, payload?.hwan)), "입력 기준"),
      buildInfoBox("전체 기준", firstOf(lv?.percentile_overall) != null ? `상위 ${formatPercent(lv.percentile_overall)}` : "-", "수집 데이터 기준"),
      buildInfoBox("구간 기준", firstOf(lv?.percentile_bucket) != null ? `상위 ${formatPercent(lv.percentile_bucket)}` : "-", "동일 환산 구간")
    );

    const summary = `<div class="summary-box">${escapeHtml(safeText(firstOf(lv?.summary, lv?.summary_comment, lv?.description), "요약 정보가 없습니다."))}</div>`;

    const chips = [
      firstOf(lv?.completion_grade) ? `완성도: ${lv.completion_grade}` : null,
      firstOf(lv?.starforce_grade) ? `스타포스: ${lv.starforce_grade}` : null,
      firstOf(lv?.potential_grade) ? `잠재: ${lv.potential_grade}` : null,
      firstOf(lv?.additional_grade) ? `에디: ${lv.additional_grade}` : null,
      firstOf(lv?.set_effect_grade, lv?.set_grade) ? `세트효과: ${firstOf(lv?.set_effect_grade, lv?.set_grade)}` : null,
    ].filter(Boolean).map((x) => `<span class="tag">${escapeHtml(x)}</span>`).join("");

    targetEl.innerHTML = top + summary + `<div class="chips">${chips}</div>`;
  }

  function renderEquipmentScore(targetEl, payload) {
    const s = firstOf(payload?.equipment_score, payload?.equipmentScore, null);
    if (!s) {
      targetEl.innerHTML = `<div class="placeholder">데이터 없음</div>`;
      return;
    }

    const top = buildInfoGridFive([
      buildInfoBox("종합 점수", safeText(firstOf(s?.total, s?.score, s?.overall, s?.total_score)), safeText(firstOf(s?.grade, s?.final_grade), "")),
      buildInfoBox("스타포스", safeText(firstOf(s?.starforce, s?.starforce_score))),
      buildInfoBox("잠재", safeText(firstOf(s?.potential, s?.potential_score))),
      buildInfoBox("에디", safeText(firstOf(s?.additional, s?.additional_score))),
      buildInfoBox("세트효과", safeText(firstOf(s?.set_effect, s?.set_score, s?.set, s?.set_effect_score))),
    ]);

    const pros = safeArr(firstOf(s?.pros, s?.strengths));
    const cons = safeArr(firstOf(s?.cons, s?.weaknesses));

    const row = `
      <div class="metric-row">
        <div>
          <div class="mini-hd">장점</div>
          <div class="pros-cons-box">${escapeHtml(pros.length ? pros.map((x) => `• ${x}`).join("\n") : "• 장점 데이터 없음")}</div>
        </div>
        <div>
          <div class="mini-hd">약점</div>
          <div class="pros-cons-box">${escapeHtml(cons.length ? cons.map((x) => `• ${x}`).join("\n") : "• 약점 데이터 없음")}</div>
        </div>
      </div>
    `;

    targetEl.innerHTML = top + row;
  }

  function getTop3Reason(row) {
    const direct = firstOf(
      row?.recommendation_reason,
      row?.reason,
      row?.reason_summary,
      row?.recommendation_reason_summary,
      row?.action_summary,
      row?.action_reason
    );
    if (direct) return String(direct);

    const arr = safeArr(firstOf(row?.recommendation_reasons, row?.reasons));
    if (arr.length) {
      return arr
        .map((x) => typeof x === "string" ? x : firstOf(x?.text, x?.reason, x?.summary))
        .filter(Boolean)
        .slice(0, 3)
        .join("\n");
    }

    const current = safeText(firstOf(row?.current_item, row?.item_name));
    const target = safeText(firstOf(row?.target_item, row?.target_item_name, row?.item_name));
    const slot = safeText(firstOf(row?.slot_key, row?.slot));

    if (current !== target) {
      return `${slot} 부위에서 ${current}을(를) ${target}(으)로 바꾸는 추천입니다.`;
    }
    return `${slot} 부위의 현재 장비를 강화하는 추천입니다.`;
  }

  function renderTop3(targetEl, payload) {
    const top3 = safeArr(firstOf(payload?.top3, payload?.top3_rows)).slice(0, 3);
    if (!top3.length) {
      targetEl.innerHTML = `<div class="placeholder">데이터 없음</div>`;
      return;
    }

    targetEl.innerHTML = `<div class="compare-top3-list">${
      top3.map((row, idx) => {
        const current = safeText(firstOf(row?.current_item, row?.item_name));
        const target = safeText(firstOf(row?.target_item, row?.target_item_name, row?.item_name));
        const delta = formatSigned(firstOf(row?.delta_hwan, row?.expected_delta_hwan));
        const cost = formatEokFromMeso(firstOf(row?.total_expected_cost_p60, row?.expected_cost_p60, row?.expected_cost));
        const reason = getTop3Reason(row);

        return `
          <div class="compare-top3-item">
            <div class="compare-top3-rank">TOP ${idx + 1}</div>
            <div class="compare-top3-title">${escapeHtml(current)} → ${escapeHtml(target)}</div>
            <div class="compare-top3-sub">${escapeHtml(reason)}</div>
            <div class="metric-row">
              <div class="metric-chip"><b>예상 상승</b>${delta}</div>
              <div class="metric-chip"><b>예상 비용</b>${cost}</div>
            </div>
          </div>
        `;
      }).join("")
    }</div>`;
  }

  function renderNextStep(targetEl, payload) {
    const plan = firstOf(payload?.next_step_plan, payload?.nextStepPlan, null);
    if (!plan) {
      targetEl.innerHTML = `<div class="placeholder">데이터 없음</div>`;
      return;
    }

    const top = buildInfoGridThree(
      buildInfoBox("목표 환산", formatNumber(firstOf(plan?.target_hwan, plan?.goal_hwan, plan?.targetHwan))),
      buildInfoBox("예상 총 상승량", formatSigned(firstOf(plan?.expected_total_delta_hwan, plan?.total_delta_hwan, plan?.totalGain))),
      buildInfoBox("예상 총 비용", formatEokFromMeso(firstOf(plan?.expected_total_cost_p60, plan?.total_expected_cost_p60, plan?.total_cost)))
    );

    const steps = safeArr(firstOf(plan?.steps, plan?.items)).slice(0, 3);

    const stepHtml = steps.map((s, i) => {
      const title = safeText(firstOf(s?.item_name, s?.target_item, s?.title, s?.name));
      const slot = safeText(firstOf(s?.slot_key, s?.slot, s?.part), "");
      const delta = firstOf(s?.delta_hwan, s?.gain_hwan, s?.delta);
      const cost = firstOf(s?.expected_cost_p60, s?.total_expected_cost_p60, s?.cost, s?.expected_cost);
      const sub = [slot, delta != null ? `상승 ${formatSigned(delta)}` : "", cost != null ? `비용 ${formatEokFromMeso(cost)}` : ""]
        .filter(Boolean)
        .join(" · ");

      return `
        <div class="next-step-item">
          <div class="next-step-rank">STEP ${i + 1}</div>
          <div class="next-step-title">${escapeHtml(title)}</div>
          <div class="next-step-sub">${escapeHtml(sub || "-")}</div>
        </div>
      `;
    }).join("");

    targetEl.innerHTML = top + `<div class="summary-box">${escapeHtml(safeText(firstOf(plan?.summary, plan?.description, plan?.note), "요약 정보가 없습니다."))}</div>` + `<div class="next-step-list">${stepHtml}</div>`;
  }

  function renderSummaryCards(left, right) {
    const leftScore = Number(firstOf(left?.equipment_score?.total, left?.equipment_score?.score, left?.equipment_score?.overall, left?.equipment_score?.total_score));
    const rightScore = Number(firstOf(right?.equipment_score?.total, right?.equipment_score?.score, right?.equipment_score?.overall, right?.equipment_score?.total_score));

    const leftTarget = firstOf(left?.next_step_plan?.target_hwan, left?.nextStepPlan?.target_hwan, null);
    const rightTarget = firstOf(right?.next_step_plan?.target_hwan, right?.nextStepPlan?.target_hwan, null);

    const leftTop1 = safeText(firstOf(left?.top3?.[0]?.target_item, left?.top3?.[0]?.target_item_name));
    const rightTop1 = safeText(firstOf(right?.top3?.[0]?.target_item, right?.top3?.[0]?.target_item_name));

    el.compareSummaryCards.innerHTML = `
      <div class="summary-card">
        <div class="summary-label">현재 환산 우위</div>
        <div class="summary-value">${compareHigherBetter(left?.hwan, right?.hwan)}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">장비 점수 우위</div>
        <div class="summary-value">${compareHigherBetter(leftScore, rightScore)}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">다음 목표 환산</div>
        <div class="summary-value">${safeText(leftTarget)} / ${safeText(rightTarget)}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">추천 성향 비교</div>
        <div class="summary-value">${escapeHtml(leftTop1)} / ${escapeHtml(rightTop1)}</div>
      </div>
    `;
  }

  function renderCompareTable(left, right) {
    const leftLv = firstOf(left?.equipment_level_summary, left?.equipmentLevelSummary, {});
    const rightLv = firstOf(right?.equipment_level_summary, right?.equipmentLevelSummary, {});
    const leftScore = firstOf(left?.equipment_score, left?.equipmentScore, {});
    const rightScore = firstOf(right?.equipment_score, right?.equipmentScore, {});

    const rows = [
      {
        label: "전체 기준",
        a: firstOf(leftLv?.percentile_overall),
        b: firstOf(rightLv?.percentile_overall),
        fmt: (v) => v != null ? `상위 ${formatPercent(v)}` : "-",
        cmp: compareLowerBetter
      },
      {
        label: "구간 기준",
        a: firstOf(leftLv?.percentile_bucket),
        b: firstOf(rightLv?.percentile_bucket),
        fmt: (v) => v != null ? `상위 ${formatPercent(v)}` : "-",
        cmp: compareLowerBetter
      },
      {
        label: "완성도",
        a: firstOf(leftLv?.completion_grade),
        b: firstOf(rightLv?.completion_grade),
        fmt: (v) => safeText(v),
        cmp: compareGrade
      },
      {
        label: "스타포스",
        a: firstOf(leftLv?.starforce_grade),
        b: firstOf(rightLv?.starforce_grade),
        fmt: (v) => safeText(v),
        cmp: compareGrade
      },
      {
        label: "잠재",
        a: firstOf(leftLv?.potential_grade),
        b: firstOf(rightLv?.potential_grade),
        fmt: (v) => safeText(v),
        cmp: compareGrade
      },
      {
        label: "에디",
        a: firstOf(leftLv?.additional_grade),
        b: firstOf(rightLv?.additional_grade),
        fmt: (v) => safeText(v),
        cmp: compareGrade
      },
      {
        label: "세트효과",
        a: firstOf(leftLv?.set_effect_grade, leftLv?.set_grade),
        b: firstOf(rightLv?.set_effect_grade, rightLv?.set_grade),
        fmt: (v) => safeText(v),
        cmp: compareGrade
      },
      {
        label: "종합 점수",
        a: firstOf(leftScore?.total, leftScore?.score, leftScore?.overall, leftScore?.total_score),
        b: firstOf(rightScore?.total, rightScore?.score, rightScore?.overall, rightScore?.total_score),
        fmt: (v) => safeText(v),
        cmp: compareHigherBetter
      }
    ];

    el.compareMetricsBody.innerHTML = rows.map((r) => {
      const winner = r.cmp(r.a, r.b);
      return `
        <tr>
          <td>${escapeHtml(r.label)}</td>
          <td>${escapeHtml(r.fmt(r.a))}</td>
          <td>${escapeHtml(r.fmt(r.b))}</td>
          <td class="${compareLabelClass(winner)}">${escapeHtml(winner)}</td>
        </tr>
      `;
    }).join("");
  }

  function renderComment(left, right) {
    const leftLv = firstOf(left?.equipment_level_summary, left?.equipmentLevelSummary, {});
    const rightLv = firstOf(right?.equipment_level_summary, right?.equipmentLevelSummary, {});
    const leftScore = firstOf(left?.equipment_score, left?.equipmentScore, {});
    const rightScore = firstOf(right?.equipment_score, right?.equipmentScore, {});

    const comments = [];

    const starCmp = compareGrade(leftLv?.starforce_grade, rightLv?.starforce_grade);
    if (starCmp !== "비교불가") comments.push(`스타포스는 ${starCmp} 쪽이 우세합니다.`);

    const potCmp = compareGrade(leftLv?.potential_grade, rightLv?.potential_grade);
    if (potCmp !== "비교불가") comments.push(`잠재는 ${potCmp} 쪽이 더 좋아 보입니다.`);

    const addCmp = compareGrade(leftLv?.additional_grade, rightLv?.additional_grade);
    if (addCmp !== "비교불가") comments.push(`에디는 ${addCmp} 쪽이 더 안정적입니다.`);

    const totalCmp = compareHigherBetter(
      firstOf(leftScore?.total, leftScore?.score, leftScore?.overall, leftScore?.total_score),
      firstOf(rightScore?.total, rightScore?.score, rightScore?.overall, rightScore?.total_score)
    );
    if (totalCmp !== "비교불가") comments.push(`종합 점수 기준으로는 ${totalCmp} 쪽이 앞섭니다.`);

    if (!comments.length) {
      comments.push("아직 충분한 비교 데이터가 없어 우세 판단이 어렵습니다.");
    }

    el.compareComment.textContent = comments.join("\n");
  }

  function setUserHeader(side, nickname, hwan) {
    if (side === "left") {
      el.leftUserName.textContent = safeText(nickname);
      el.leftUserHwan.textContent = `아이템환산 ${formatNumber(hwan)}`;
    } else {
      el.rightUserName.textContent = safeText(nickname);
      el.rightUserHwan.textContent = `아이템환산 ${formatNumber(hwan)}`;
    }
  }

  async function runCompare() {
    const leftNickname = safeText(el.leftNickname?.value, "").trim();
    const leftHwan = safeText(el.leftHwan?.value, "").replace(/,/g, "").trim();
    const rightNickname = safeText(el.rightNickname?.value, "").trim();
    const rightHwan = safeText(el.rightHwan?.value, "").replace(/,/g, "").trim();

    if (!leftNickname || !leftHwan || !rightNickname || !rightHwan) {
      alert("유저 2명의 닉네임과 아이템환산을 모두 입력해주세요.");
      return;
    }

    showLoading(true);
    try {
      const [left, right] = await Promise.all([
        fetchDiagnose(leftNickname, leftHwan),
        fetchDiagnose(rightNickname, rightHwan),
      ]);

      setUserHeader("left", leftNickname, leftHwan);
      setUserHeader("right", rightNickname, rightHwan);

      renderSummaryCards(left, right);
      renderCompareTable(left, right);
      renderComment(left, right);

      renderLevelSummary(el.leftLevelSummary, left);
      renderLevelSummary(el.rightLevelSummary, right);

      renderEquipmentScore(el.leftEquipmentScore, left);
      renderEquipmentScore(el.rightEquipmentScore, right);

      renderTop3(el.leftTop3, left);
      renderTop3(el.rightTop3, right);

      renderNextStep(el.leftNextStep, left);
      renderNextStep(el.rightNextStep, right);

    } catch (e) {
      console.error(e);
      alert(`비교 불러오기 실패: ${e?.message || e}`);
    } finally {
      showLoading(false);
    }
  }

  function qparam(name) {
    const u = new URL(location.href);
    return u.searchParams.get(name) || "";
  }

  function setQuery(leftNickname, leftHwan, rightNickname, rightHwan) {
    const u = new URL(location.href);
    u.searchParams.set("leftNickname", leftNickname);
    u.searchParams.set("leftHwan", leftHwan);
    u.searchParams.set("rightNickname", rightNickname);
    u.searchParams.set("rightHwan", rightHwan);
    history.replaceState({}, "", u.toString());
  }

  function bind() {
    el.compareBtn?.addEventListener("click", () => {
      const leftNickname = safeText(el.leftNickname?.value, "").trim();
      const leftHwan = safeText(el.leftHwan?.value, "").replace(/,/g, "").trim();
      const rightNickname = safeText(el.rightNickname?.value, "").trim();
      const rightHwan = safeText(el.rightHwan?.value, "").replace(/,/g, "").trim();

      setQuery(leftNickname, leftHwan, rightNickname, rightHwan);
      runCompare();
    });
  }

  function bootstrap() {
    bind();

    const leftNickname = qparam("leftNickname");
    const leftHwan = qparam("leftHwan");
    const rightNickname = qparam("rightNickname");
    const rightHwan = qparam("rightHwan");

    if (leftNickname) el.leftNickname.value = leftNickname;
    if (leftHwan) el.leftHwan.value = leftHwan;
    if (rightNickname) el.rightNickname.value = rightNickname;
    if (rightHwan) el.rightHwan.value = rightHwan;

    if (leftNickname && leftHwan && rightNickname && rightHwan) {
      runCompare();
    }
  }

  document.addEventListener("DOMContentLoaded", bootstrap);
})();
