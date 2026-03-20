(() => {
  const API_BASE = "https://maple-bundle-new.maple-bundle.workers.dev";

  const $ = (id) => document.getElementById(id);

  const el = {
    nicknameInput: $("nicknameInput"),
    hwanInput: $("hwanInput"),
    searchBtn: $("searchBtn"),

    top3List: $("top3List"),
    summaryGrid: $("summaryGrid"),

    nextStepTop3: $("nextStepTop3"),
    nextStepSummary: $("nextStepSummary"),
    nextStepSteps: $("nextStepSteps"),

    levelTop3: $("levelTop3"),
    levelSummary: $("levelSummary"),
    levelChips: $("levelChips"),

    scoreTopRow: $("scoreTopRow"),
    scorePros: $("scorePros"),
    scoreCons: $("scoreCons"),

    top10Body: $("top10Body"),
    debugLine: $("debugLine"),

    loading: $("loading"),
    dailyDiagnosisCount: $("dailyDiagnosisCount"),
    heroComment: $("heroComment"),
    summaryHighlights: $("summaryHighlights"),
  };

  function showLoading(on) {
    if (!el.loading) return;
    el.loading.classList.toggle("hidden", !on);
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

  function safeText(v, fallback = "-") {
    if (v === null || v === undefined) return fallback;
    const s = String(v).trim();
    return s ? s : fallback;
  }

  function isValidValue(v) {
    return !(v === null || v === undefined || String(v).trim() === "");
  }

  function firstOf(...vals) {
    for (const v of vals) {
      if (isValidValue(v) && String(v).trim() !== "-") return v;
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

  function formatPercent(v) {
    const x = Number(v);
    if (!Number.isFinite(x)) return "-";
    return `${x}%`;
  }

  function formatStarforce(v) {
    if (typeof v === "string") {
      const s = v.trim();
      if (s && /\uC131$/.test(s)) return s;
    }
    const x = Number(v);
    if (!Number.isFinite(x)) return "-";
    return `${x}\uC131`;
  }

  function formatEokFromMeso(meso) {
    const x = Number(meso);
    if (!Number.isFinite(x)) return "-";
    const eok = x / 100000000;
    return `${eok.toFixed(1)}억`;
  }

  function buildReasonsMap(data) {
    const m = new Map();
    const arr = safeArr(data?.recommendation_reasons);

    for (const r of arr) {
      const key = Number(firstOf(r?.rank, r?.idx, r?.index));
      const val = firstOf(r?.reason, r?.text, r?.summary, r?.message, r?.action_summary);
      if (Number.isFinite(key) && val) {
        m.set(key, String(val));
      }
    }
    return m;
  }

  function getRowRank(row, idx) {
    const v = firstOf(row?.rank, row?.idx, row?.index);
    const n = Number(v);
    return Number.isFinite(n) ? n : idx + 1;
  }

  function getCurrentItemName(row) {
    return safeText(
      firstOf(
        row?.current_item,
        row?.current_item_name,
        row?.item_name,
        row?.source_item_name,
        row?.base_item_name,
        row?.name
      )
    );
  }

  function getTargetItemName(row) {
    return safeText(
      firstOf(
        row?.target_item,
        row?.target_item_name,
        row?.recommended_item_name,
        row?.result_item_name,
        row?.item_name,
        row?.current_item,
        row?.current_item_name
      )
    );
  }

  function getSlotKey(row) {
    return safeText(
      firstOf(
        row?.slot_key,
        row?.slot,
        row?.part,
        row?.equipment_slot,
        row?.position
      )
    );
  }

  function getCurrentStarforce(row) {
    return firstOf(
      row?.current_state?.starforce,
      row?.current_starforce_label,
      row?.current_starforce,
      row?.starforce_current,
      row?.before_starforce
    );
  }

  function getTargetStarforce(row) {
    return firstOf(
      row?.target_state?.starforce,
      row?.target_starforce_label,
      row?.target_starforce,
      row?.starforce_target,
      row?.after_starforce,
      row?.current_state?.starforce,
      row?.current_starforce_label,
      row?.current_starforce,
      row?.starforce_current,
      row?.before_starforce
    );
  }

  function getCurrentPotential(row) {
    return safeText(
      firstOf(
        row?.current_state?.potential,
        row?.current_potential_display_label,
        row?.current_potential_label,
        row?.current_potential_effective_label,
        row?.current_potential_text,
        row?.potential_current,
        row?.before_potential
      )
    );
  }

  function getTargetPotential(row) {
    return safeText(
      firstOf(
        row?.target_state?.potential,
        row?.target_potential_display_label,
        row?.target_potential_label,
        row?.target_potential_text,
        row?.potential_target,
        row?.after_potential,
        row?.current_state?.potential,
        row?.current_potential_display_label,
        row?.current_potential_label
        ,
        row?.current_potential_effective_label,
        row?.current_potential_text
      )
    );
  }

  function getCurrentAdditional(row) {
    return safeText(
      firstOf(
        row?.current_state?.additional,
        row?.current_additional_display_label,
        row?.current_additional_label,
        row?.current_additional_effective_label,
        row?.current_additional_text,
        row?.additional_current,
        row?.before_additional
      )
    );
  }

  function getTargetAdditional(row) {
    return safeText(
      firstOf(
        row?.target_state?.additional,
        row?.target_additional_display_label,
        row?.target_additional_label,
        row?.target_additional_text,
        row?.additional_target,
        row?.after_additional,
        row?.current_state?.additional,
        row?.current_additional_display_label,
        row?.current_additional_label
        ,
        row?.current_additional_effective_label,
        row?.current_additional_text
      )
    );
  }

  function getCurrentPotentialRaw(row) {
    return safeText(firstOf(row?.current_potential_text, row?.current_potential_raw), "");
  }

  function getTargetPotentialRaw(row) {
    return safeText(firstOf(row?.target_potential_text, row?.target_potential_raw), "");
  }

  function getCurrentAdditionalRaw(row) {
    return safeText(firstOf(row?.current_additional_text, row?.current_additional_raw), "");
  }

  function getTargetAdditionalRaw(row) {
    return safeText(firstOf(row?.target_additional_text, row?.target_additional_raw), "");
  }

  function getCurrentPotentialQuality(row) {
    return safeText(firstOf(row?.current_potential_quality_label, row?.current_potential_effective_label), "");
  }

  function getTargetPotentialQuality(row) {
    return safeText(firstOf(row?.target_potential_quality_label, row?.target_potential_effective_label), "");
  }

  function getCurrentAdditionalQuality(row) {
    return safeText(firstOf(row?.current_additional_quality_label, row?.current_additional_effective_label), "");
  }

  function getTargetAdditionalQuality(row) {
    return safeText(firstOf(row?.target_additional_quality_label, row?.target_additional_effective_label), "");
  }

  function shouldShowOptionRaw(label, raw) {
    const normalizedLabel = normalizeCompareText(label);
    const normalizedRaw = normalizeCompareText(raw);
    return Boolean(normalizedRaw) && normalizedRaw !== "-" && normalizedRaw !== normalizedLabel;
  }

  function shouldShowSecondaryLabel(primary, secondary) {
    const normalizedPrimary = normalizeCompareText(primary);
    const normalizedSecondary = normalizeCompareText(secondary);
    return Boolean(normalizedPrimary)
      && normalizedPrimary !== "-"
      && Boolean(normalizedSecondary)
      && normalizedSecondary !== "-"
      && normalizedSecondary !== normalizedPrimary
      && !normalizedPrimary.includes(normalizedSecondary);
  }

  function isSeedRingRow(row) {
    const upgradeType = String(row?.upgrade_type || row?.action_type || "").trim().toLowerCase();
    const key = String(row?.key || "").trim().toUpperCase();
    const actionSummary = safeText(row?.action_summary, "");
    const hasSeedRingLabel = Boolean(firstOf(
      row?.current_seedring_label,
      row?.current_seed_ring_label,
      row?.target_seedring_label,
      row?.target_seed_ring_label
    ));
    return hasSeedRingLabel
      || upgradeType === "seedring"
      || key.startsWith("SEEDRING_")
      || /(?:LV|Lv)\s*\.?\s*\d+/.test(actionSummary);
  }

  function parseSeedRingLabelFromText(text) {
    const raw = safeText(text, "");
    const match = raw.match(/Lv\s*\.?\s*(\d+)/i) || raw.match(/레벨\s*(\d+)/i);
    if (!match) return "";
    return "Lv" + Number(match[1] || 0);
  }

  function getCurrentSeedRingLevel(row) {
    return safeText(
      firstOf(
        row?.current_seedring_label,
        row?.current_seed_ring_label,
        parseSeedRingLabelFromText(row?.current_item),
        parseSeedRingLabelFromText(row?.action_summary)
      ),
      "-"
    );
  }

  function getTargetSeedRingLevel(row) {
    return safeText(
      firstOf(
        row?.target_seedring_label,
        row?.target_seed_ring_label,
        parseSeedRingLabelFromText(row?.target_item),
        parseSeedRingLabelFromText(row?.action_summary),
        getCurrentSeedRingLevel(row)
      ),
      "-"
    );
  }

  function getDeltaHwan(row) {
    return firstOf(
      row?.delta_hwan,
      row?.expected_delta_hwan,
      row?.gain_hwan,
      row?.delta
    );
  }

  function getExpectedCost(row) {
    return firstOf(
      row?.total_expected_cost_p60,
      row?.expected_cost_p60,
      row?.total_expected_cost,
      row?.expected_cost,
      row?.cost_p60,
      row?.cost
    );
  }



  function deriveDailyDiagnosisCount(data) {
    const explicit = firstOf(
      data?.today_diagnosis_count,
      data?.diagnosis_count,
      data?.today_count,
      data?.total_count,
      data?.summary?.today_diagnosis_count,
      data?.meta?.today_diagnosis_count
    );
    const n = Number(explicit);
    if (Number.isFinite(n) && n > 0) return n;

    const bucketRows = Array.isArray(firstOf(data?.buckets, data?.items, data?.results))
      ? firstOf(data?.buckets, data?.items, data?.results)
      : [];
    if (bucketRows.length) {
      const total = bucketRows.reduce((sum, row) => {
        const value = Number(firstOf(row?.count, row?.search_count, row?.diagnosis_count, 0));
        return sum + (Number.isFinite(value) && value > 0 ? value : 0);
      }, 0);
      if (total > 0) return total;
    }
    return null;
  }

  async function updateDailyDiagnosisCount() {
    if (!el.dailyDiagnosisCount) return;
    const candidates = [
      `${API_BASE}/stats/searched-characters/today`,
      `${API_BASE}/stats/recommended-items/today`,
      `${API_BASE}/stats/hwan-buckets/today`
    ];
    for (const url of candidates) {
      try {
        const data = await fetchJson(url);
        const n = deriveDailyDiagnosisCount(data);
        if (n !== null) {
          el.dailyDiagnosisCount.textContent = `오늘 진단 ${formatNumber(n)}건`;
          return;
        }
      } catch (_) {}
    }
    el.dailyDiagnosisCount.textContent = "오늘 진단 집계 중";
  }

  function chooseChangedValue(currentVal, targetVal, emptyFallback = "-") {
    const c = safeText(currentVal, emptyFallback);
    const t = safeText(targetVal, "");
    return t && t !== "-" && normalizeCompareText(t) !== normalizeCompareText(c) ? t : c;
  }

  function normalizeCompareText(value) {
    return String(value ?? "").trim().replace(/\s+/g, " ").toUpperCase();
  }

  function buildHeroComment(data) {
    const topRow = safeArr(firstOf(data?.top3, data?.top3_rows))[0];
    if (!topRow) {
      return "<b>추천 결과를 불러왔어.</b> 상단 TOP3와 구성 요약부터 확인해봐.";
    }

    const slot = getSlotKey(topRow);
    const currentName = getCurrentItemName(topRow);
    const targetName = getTargetItemName(topRow);
    const currentStar = getCurrentStarforce(topRow);
    const targetStar = getTargetStarforce(topRow);
    const currentPot = getCurrentPotential(topRow);
    const targetPot = getTargetPotential(topRow);
    const currentAdd = getCurrentAdditional(topRow);
    const targetAdd = getTargetAdditional(topRow);

    const changed = [];
    if (String(currentStar ?? "") !== String(targetStar ?? "")) changed.push("스타포스");
    if (safeText(currentPot) !== safeText(targetPot)) changed.push("잠재");
    if (safeText(currentAdd) !== safeText(targetAdd)) changed.push("에디");

    const changeText = changed.length ? changed.join(" / ") : "기존 세팅 유지형";
    const itemText = currentName === targetName ? currentName : `${currentName} → ${targetName}`;
    const summary = safeText(firstOf(data?.next_step_plan?.summary, data?.equipment_level_summary?.summary), "");

    return `<b>${slot}</b> 기준으로 <b>${itemText}</b> 추천이 가장 먼저 보이네. 이번 추천은 <b>${changeText}</b> 쪽을 손보는 흐름이고${summary ? `, ${escapeHtml(summary)}` : " 상단 TOP3부터 순서대로 보면 돼."}`;
  }

  function trimHighlightPrefix(text) {
    return safeText(text, "")
      .replace(/^가성비\s*1순위\s*:\s*/u, "")
      .replace(/^추천\s*흐름\s*:\s*/u, "")
      .replace(/^세트\s*상태\s*:\s*/u, "")
      .trim();
  }

  function buildFallbackTop1Summary(data) {
    const topRow = safeArr(firstOf(data?.top3, data?.top3_rows))[0];
    if (!topRow) return "-";

    const slot = getSlotKey(topRow);
    const currentStar = safeText(getCurrentStarforce(topRow), "");
    const targetStar = safeText(getTargetStarforce(topRow), "");
    const currentPot = safeText(getCurrentPotential(topRow), "");
    const targetPot = safeText(getTargetPotential(topRow), "");
    const currentAdd = safeText(getCurrentAdditional(topRow), "");
    const targetAdd = safeText(getTargetAdditional(topRow), "");
    const changed = [];

    if (currentStar !== targetStar && targetStar) changed.push(targetStar);
    if (currentPot !== targetPot && targetPot) changed.push(targetPot);
    if (currentAdd !== targetAdd && targetAdd) changed.push(targetAdd);

    return `${slot} ${changed.join(" / ") || getTargetItemName(topRow)}`.trim();
  }

  function buildFallbackFlowSummary(data) {
    const rows = safeArr(firstOf(data?.top3, data?.top3_rows)).slice(0, 3);
    if (!rows.length) return "-";
    return rows.map((row) => getSlotKey(row)).filter(Boolean).join(" → ");
  }

  function buildFallbackSetStatusSummary(data) {
    const rows = safeArr(firstOf(data?.set_summary, data?.summary?.set_summary, [])).slice(0, 3);
    if (!rows.length) return "-";

    return rows
      .map((row) => {
        const label = safeText(firstOf(row?.label, row?.name, row?.key), "");
        const value = safeText(firstOf(row?.value, row?.count), "");
        return `${label}${value ? ` ${value}` : ""}`;
      })
      .filter(Boolean)
      .join(" / ");
  }

  function renderSummaryHighlights(data) {
    if (!el.summaryHighlights) return;

    const highlights = firstOf(data?.summary_highlights, data?.summaryHighlights, {}) || {};
    const cards = [
      {
        label: "가성비 1순위",
        value: trimHighlightPrefix(firstOf(highlights?.top1_summary, highlights?.top1, data?.summary_labels?.build_summary)) || buildFallbackTop1Summary(data),
        meta: "실제 TOP1 기준",
      },
      {
        label: "추천 흐름",
        value: trimHighlightPrefix(firstOf(highlights?.flow_summary, highlights?.flow, data?.summary_labels?.ring_summary)) || buildFallbackFlowSummary(data),
        meta: "실제 TOP3 기준",
      },
      {
        label: "세트 상태",
        value: trimHighlightPrefix(firstOf(highlights?.set_status_summary, highlights?.set_status, data?.summary_labels?.priority_summary)) || buildFallbackSetStatusSummary(data),
        meta: "실제 세트 기준",
      },
    ];

    el.summaryHighlights.innerHTML = cards.map((card) => `
      <div class="score-box">
        <div class="score-k">${escapeHtml(card.label)}</div>
        <div class="score-v">${escapeHtml(card.value || "-")}</div>
        <div class="score-mini">${escapeHtml(card.meta)}</div>
      </div>
    `).join("");
  }

  function getEfficiency(row) {
    return safeText(
      firstOf(
        row?.efficiency_grade,
        row?.efficiency_letter,
        row?.grade,
        row?.efficiency
      )
    );
  }

  function getTop3Reason(row, rank, reasonsMap) {
    const inlineReason = firstOf(
      row?.recommendation_reason,
      row?.reason,
      row?.reason_summary,
      row?.recommendation_reason_summary,
      row?.action_summary,
      row?.action_reason
    );
    if (inlineReason) return String(inlineReason);

    const arr = safeArr(
      firstOf(
        row?.recommendation_reasons,
        row?.reasons
      )
    );
    if (arr.length) {
      return arr
        .map((x) => typeof x === "string" ? x : firstOf(x?.text, x?.reason, x?.summary))
        .filter(Boolean)
        .slice(0, 3)
        .join("\n");
    }

    const mapped = reasonsMap.get(rank);
    if (mapped) return mapped;

    const slot = getSlotKey(row);
    const currentName = getCurrentItemName(row);
    const targetName = getTargetItemName(row);

    if (currentName && targetName && currentName !== targetName) {
      return `${slot} 부위에서 ${currentName}을(를) ${targetName}(으)로 변경하는 추천입니다.`;
    }

    return `${slot} 부위의 현재 장비를 강화하는 추천입니다.`;
  }

  function buildStateBox(title, star, pot, add) {
    return `
      <div class="state-box">
        <div class="state-title">${title}</div>
        <div class="state-line"><b>스타포스</b> ${formatStarforce(star)}</div>
        <div class="state-line"><b>잠재</b> ${escapeHtml(safeText(pot))}</div>
        <div class="state-line"><b>에디</b> ${escapeHtml(safeText(add))}</div>
      </div>
    `;
  }

  function buildNormalStateHtml(star, potential, potentialRaw, potentialQuality, additional, additionalRaw, additionalQuality) {
    return `
      <div><b>스타포스</b> ${formatStarforce(star)}</div>
      <div><b>잠재</b> ${escapeHtml(safeText(potential))}</div>
      ${shouldShowOptionRaw(potential, potentialRaw) ? `<div><small>${escapeHtml(potentialRaw)}</small></div>` : ""}
      ${shouldShowSecondaryLabel(potential, potentialQuality) ? `<div><small>품질 ${escapeHtml(potentialQuality)}</small></div>` : ""}
      <div><b>에디</b> ${escapeHtml(safeText(additional))}</div>
      ${shouldShowOptionRaw(additional, additionalRaw) ? `<div><small>${escapeHtml(additionalRaw)}</small></div>` : ""}
      ${shouldShowSecondaryLabel(additional, additionalQuality) ? `<div><small>품질 ${escapeHtml(additionalQuality)}</small></div>` : ""}
    `;
  }

  function buildSeedRingStateHtml(level, itemName) {
    return `
      <div><b>시드링</b> ${escapeHtml(safeText(level))}</div>
      <div><small>${escapeHtml(safeText(itemName))}</small></div>
    `;
  }

  

  function buildTop3Card(row, idx, reasonsMap) {
    const rank = getRowRank(row, idx);
    const currentName = getCurrentItemName(row);
    const targetName = getTargetItemName(row);
    const slot = getSlotKey(row);

    const seedRing = isSeedRingRow(row);
    const currentStar = getCurrentStarforce(row);
    const targetStar = chooseChangedValue(currentStar, getTargetStarforce(row));
    const currentPot = getCurrentPotential(row);
    const targetPot = chooseChangedValue(currentPot, getTargetPotential(row));
    const currentAdd = getCurrentAdditional(row);
    const targetAdd = chooseChangedValue(currentAdd, getTargetAdditional(row));
    const currentPotRaw = getCurrentPotentialRaw(row);
    const targetPotRaw = chooseChangedValue(currentPotRaw, getTargetPotentialRaw(row), "");
    const currentAddRaw = getCurrentAdditionalRaw(row);
    const targetAddRaw = chooseChangedValue(currentAddRaw, getTargetAdditionalRaw(row), "");
    const currentPotQuality = getCurrentPotentialQuality(row);
    const targetPotQuality = chooseChangedValue(currentPotQuality, getTargetPotentialQuality(row), "");
    const currentAddQuality = getCurrentAdditionalQuality(row);
    const targetAddQuality = chooseChangedValue(currentAddQuality, getTargetAdditionalQuality(row), "");
    const currentSeedRing = getCurrentSeedRingLevel(row);
    const targetSeedRing = getTargetSeedRingLevel(row);

    const reasonText = getTop3Reason(row, rank, reasonsMap);
    const delta = getDeltaHwan(row);
    const cost = getExpectedCost(row);

    return `
      <div class="top3-item">
        <div class="top3-head">
          <div class="rank-badge">${rank}</div>
          <div>
            <div class="top3-title">${escapeHtml(currentName)}</div>
            <div class="top3-slot">${escapeHtml(slot)}</div>
          </div>
          <div>
            <div class="top3-gain">${formatSigned(delta)}</div>
            <div class="top3-cost">${formatEokFromMeso(cost)}</div>
          </div>
        </div>

        <div class="top3-summary">
          <div class="info-box">
            <div class="info-k">현재 상태</div>
            <div class="info-v">
              ${seedRing
                ? buildSeedRingStateHtml(currentSeedRing, currentName)
                : buildNormalStateHtml(currentStar, currentPot, currentPotRaw, currentPotQuality, currentAdd, currentAddRaw, currentAddQuality)}
            </div>
          </div>
          <div class="info-box">
            <div class="info-k">목표 상태</div>
            <div class="info-v">
              ${seedRing
                ? buildSeedRingStateHtml(targetSeedRing, targetName)
                : buildNormalStateHtml(targetStar, targetPot, targetPotRaw, targetPotQuality, targetAdd, targetAddRaw, targetAddQuality)}
            </div>
          </div>
        </div>

        <div class="reason-box">
          <div class="reason-k">추천 이유</div>
          <div class="reason-v">${escapeHtml(reasonText)}</div>
        </div>
      </div>
    `;
  }


  function renderTop3(data) {
    const rows = safeArr(firstOf(data?.top3, data?.top3_rows)).slice(0, 3);
    if (!rows.length) {
      el.top3List.innerHTML = `<div class="card-sub" style="padding:0 18px 18px;">TOP3 데이터가 없습니다.</div>`;
      return;
    }
    const reasonsMap = buildReasonsMap(data);
    el.top3List.innerHTML = rows.map((row, idx) => buildTop3Card(row, idx, reasonsMap)).join("");
  }

  function buildSummaryBlock(title, arr) {
    const items = safeArr(arr);
    const max = items.reduce((m, x) => Math.max(m, Number(firstOf(x?.value, x?.count, 0))), 0) || 1;

    const rows = items.map((x) => {
      const label = safeText(firstOf(x?.label, x?.name, x?.key));
      const raw = Number(firstOf(x?.value, x?.count, 0));
      const width = Math.max(4, Math.min(100, Math.round((raw / max) * 100)));

      return `
        <div class="bar-row">
          <div class="bar-label">${escapeHtml(label)}</div>
          <div class="bar"><i style="width:${width}%"></i></div>
          <div class="bar-val">${formatNumber(raw)}</div>
        </div>
      `;
    }).join("");

    return `
      <div class="summary-block">
        <div class="title">${title}</div>
        ${rows || `<div class="card-sub">데이터 없음</div>`}
      </div>
    `;
  }

  function renderSummary(data) {
    const setSummary = firstOf(data?.set_summary, data?.summary?.set_summary, []);
    const sfSummary = firstOf(data?.starforce_summary, data?.summary?.starforce_summary, []);
    const potSummary = firstOf(data?.potential_summary, data?.summary?.potential_summary, []);
    const addSummary = firstOf(data?.additional_summary, data?.summary?.additional_summary, []);

    el.summaryGrid.innerHTML = [
      buildSummaryBlock("세트", setSummary),
      buildSummaryBlock("스타포스", sfSummary),
      buildSummaryBlock("잠재", potSummary),
      buildSummaryBlock("에디", addSummary),
    ].join("");
  }

  function renderNextStep(data) {
    const plan = firstOf(data?.next_step_plan, data?.nextStepPlan, null);

    if (!plan) {
      el.nextStepTop3.innerHTML = `
        <div class="score-box"><div class="score-k">목표 환산</div><div class="score-v">-</div></div>
        <div class="score-box"><div class="score-k">예상 총 상승량</div><div class="score-v">-</div></div>
        <div class="score-box"><div class="score-k">예상 총 비용</div><div class="score-v">-</div></div>
      `;
      el.nextStepSummary.innerHTML = `<div class="box">다음 단계 추천 데이터가 없습니다.</div>`;
      el.nextStepSteps.innerHTML = "";
      return;
    }

    const targetHwan = firstOf(plan?.target_hwan, plan?.goal_hwan, plan?.targetHwan);
    const totalDelta = firstOf(plan?.expected_total_delta_hwan, plan?.total_delta_hwan, plan?.totalGain, plan?.total_delta);
    const totalCost = firstOf(
      plan?.expected_total_cost_p60,
      plan?.total_expected_cost_p60,
      plan?.total_cost,
      plan?.expected_total_cost,
      plan?.cost_p60,
      plan?.cost
    );
    const summary = safeText(
      firstOf(plan?.summary, plan?.description, plan?.note, plan?.plan_summary),
      "요약 정보가 없습니다."
    );

    el.nextStepTop3.innerHTML = `
      <div class="score-box">
        <div class="score-k">목표 환산</div>
        <div class="score-v">${formatNumber(targetHwan)}</div>
      </div>
      <div class="score-box">
        <div class="score-k">예상 총 상승량</div>
        <div class="score-v">${formatSigned(totalDelta)}</div>
      </div>
      <div class="score-box">
        <div class="score-k">예상 총 비용</div>
        <div class="score-v">${formatEokFromMeso(totalCost)}</div>
      </div>
    `;

    el.nextStepSummary.innerHTML = `<span class="chip">${escapeHtml(summary)}</span>`;

    const steps = safeArr(firstOf(plan?.steps, plan?.items)).slice(0, 3);
    el.nextStepSteps.innerHTML = steps.map((s, i) => {
      const title = safeText(firstOf(s?.item_name, s?.target_item, s?.title, s?.name));
      const slot = safeText(firstOf(s?.slot_key, s?.slot, s?.part), "");
      const delta = firstOf(s?.delta_hwan, s?.gain_hwan, s?.delta);
      const cost = firstOf(
        s?.expected_cost_p60,
        s?.total_expected_cost_p60,
        s?.cost,
        s?.expected_cost
      );

      const meta = [
        slot,
        delta !== null ? `상승 ${formatSigned(delta)}` : "",
        cost !== null ? `비용 ${formatEokFromMeso(cost)}` : ""
      ].filter(Boolean).join(" · ");

      return `
        <div class="step">
          <div class="step-hd">STEP ${i + 1}</div>
          <div class="step-title">${escapeHtml(title)}</div>
          <div class="step-sub">${escapeHtml(meta || "-")}</div>
        </div>
      `;
    }).join("");
  }

  function renderLevelSummary(data) {
    const lv = firstOf(data?.equipment_level_summary, data?.equipmentLevelSummary, null);

    if (!lv) {
      el.levelTop3.innerHTML = `
        <div class="score-box"><div class="score-k">현재 환산</div><div class="score-v">-</div></div>
        <div class="score-box"><div class="score-k">전체 기준</div><div class="score-v">-</div></div>
        <div class="score-box"><div class="score-k">구간 기준</div><div class="score-v">-</div></div>
      `;
      el.levelSummary.innerHTML = `<div class="box">내 템의 수준 데이터가 없습니다.</div>`;
      el.levelChips.innerHTML = "";
      return;
    }

    const currentHwan = firstOf(lv?.current_hwan, data?.hwan);
    const overall = firstOf(lv?.percentile_overall, lv?.overall_percentile);
    const bucket = firstOf(lv?.percentile_bucket, lv?.bucket_percentile);

    el.levelTop3.innerHTML = `
      <div class="score-box">
        <div class="score-k">현재 환산</div>
        <div class="score-v">${formatNumber(currentHwan)}</div>
        <div class="score-mini">입력 기준</div>
      </div>
      <div class="score-box">
        <div class="score-k">전체 기준</div>
        <div class="score-v">${overall !== null ? `상위 ${formatPercent(overall)}` : "-"}</div>
        <div class="score-mini">수집 데이터 기준</div>
      </div>
      <div class="score-box">
        <div class="score-k">구간 기준</div>
        <div class="score-v">${bucket !== null ? `상위 ${formatPercent(bucket)}` : "-"}</div>
        <div class="score-mini">동일 환산 구간</div>
      </div>
    `;

    const summaryText = safeText(
      firstOf(lv?.summary, lv?.summary_comment, lv?.description),
      "요약 정보가 없습니다."
    );
    el.levelSummary.innerHTML = `<span class="chip">${escapeHtml(summaryText)}</span>`;

    const chipItems = [
      firstOf(lv?.completion_grade) ? `완성도: ${lv.completion_grade}` : null,
      firstOf(lv?.starforce_grade) ? `스타포스: ${lv.starforce_grade}` : null,
      firstOf(lv?.potential_grade) ? `잠재: ${lv.potential_grade}` : null,
      firstOf(lv?.additional_grade) ? `에디: ${lv.additional_grade}` : null,
      firstOf(lv?.set_effect_grade, lv?.set_grade) ? `세트효과: ${firstOf(lv?.set_effect_grade, lv?.set_grade)}` : null,
    ].filter(Boolean);

    el.levelChips.innerHTML = chipItems.map((t) => `<span class="chip">${escapeHtml(t)}</span>`).join("");
  }

  function renderEquipmentScore(data) {
    const s = firstOf(data?.equipment_score, data?.equipmentScore, null);

    if (!s) {
      el.scoreTopRow.innerHTML = `
        <div class="score-box"><div class="score-k">종합 점수</div><div class="score-v">-</div></div>
        <div class="score-box"><div class="score-k">스타포스</div><div class="score-v">-</div></div>
        <div class="score-box"><div class="score-k">잠재</div><div class="score-v">-</div></div>
        <div class="score-box"><div class="score-k">에디</div><div class="score-v">-</div></div>
        <div class="score-box"><div class="score-k">세트효과</div><div class="score-v">-</div></div>
      `;
      el.scorePros.textContent = "• 장점 데이터 없음";
      el.scoreCons.textContent = "• 약점 데이터 없음";
      return;
    }

    const total = firstOf(s?.total, s?.score, s?.overall, s?.total_score);
    const sf = firstOf(s?.starforce, s?.starforce_score);
    const pot = firstOf(s?.potential, s?.potential_score);
    const add = firstOf(s?.additional, s?.additional_score);
    const set = firstOf(s?.set_effect, s?.set_score, s?.set, s?.set_effect_score);

    el.scoreTopRow.innerHTML = `
      <div class="score-box"><div class="score-k">종합 점수</div><div class="score-v">${safeText(total)}</div><div class="score-mini">${escapeHtml(safeText(firstOf(s?.grade, s?.final_grade), ""))}</div></div>
      <div class="score-box"><div class="score-k">스타포스</div><div class="score-v">${safeText(sf)}</div></div>
      <div class="score-box"><div class="score-k">잠재</div><div class="score-v">${safeText(pot)}</div></div>
      <div class="score-box"><div class="score-k">에디</div><div class="score-v">${safeText(add)}</div></div>
      <div class="score-box"><div class="score-k">세트효과</div><div class="score-v">${safeText(set)}</div></div>
    `;

    const pros = safeArr(firstOf(s?.pros, s?.strengths));
    const cons = safeArr(firstOf(s?.cons, s?.weaknesses));

    el.scorePros.textContent = pros.length
      ? pros.map((x) => `• ${x}`).join("\n")
      : "• 장점 데이터 없음";

    el.scoreCons.textContent = cons.length
      ? cons.map((x) => `• ${x}`).join("\n")
      : "• 약점 데이터 없음";
  }

  

  function buildTop10Row(row, idx) {
    const rank = getRowRank(row, idx);
    const slot = getSlotKey(row);
    const currentName = getCurrentItemName(row);
    const targetName = getTargetItemName(row);

    const seedRing = isSeedRingRow(row);
    const currentStar = getCurrentStarforce(row);
    const targetStar = chooseChangedValue(currentStar, getTargetStarforce(row));
    const currentPot = getCurrentPotential(row);
    const targetPot = chooseChangedValue(currentPot, getTargetPotential(row));
    const currentAdd = getCurrentAdditional(row);
    const targetAdd = chooseChangedValue(currentAdd, getTargetAdditional(row));
    const currentPotRaw = getCurrentPotentialRaw(row);
    const targetPotRaw = chooseChangedValue(currentPotRaw, getTargetPotentialRaw(row), "");
    const currentAddRaw = getCurrentAdditionalRaw(row);
    const targetAddRaw = chooseChangedValue(currentAddRaw, getTargetAdditionalRaw(row), "");
    const currentPotQuality = getCurrentPotentialQuality(row);
    const targetPotQuality = chooseChangedValue(currentPotQuality, getTargetPotentialQuality(row), "");
    const currentAddQuality = getCurrentAdditionalQuality(row);
    const targetAddQuality = chooseChangedValue(currentAddQuality, getTargetAdditionalQuality(row), "");
    const currentSeedRing = getCurrentSeedRingLevel(row);
    const targetSeedRing = getTargetSeedRingLevel(row);

    const delta = getDeltaHwan(row);
    const cost = getExpectedCost(row);
    const eff = getEfficiency(row);

    return `
      <tr>
        <td class="num">${rank}</td>
        <td>
          <div class="top10-slot">${escapeHtml(`${slot} · ${currentName}`)}</div>
          <div class="top10-arrow">${escapeHtml(targetName)}</div>
        </td>
        <td class="state-cell">
          ${seedRing
            ? `<div class="line"><b>시드링</b> ${escapeHtml(currentSeedRing)}</div><div class="line"><small>${escapeHtml(currentName)}</small></div>`
            : `
          <div class="line"><b>스타포스</b> ${formatStarforce(currentStar)}</div>
          <div class="line"><b>잠재</b> ${escapeHtml(currentPot)}</div>
          ${shouldShowOptionRaw(currentPot, currentPotRaw) ? `<div class="line"><small>${escapeHtml(currentPotRaw)}</small></div>` : ""}
          ${shouldShowSecondaryLabel(currentPot, currentPotQuality) ? `<div class="line"><small>품질 ${escapeHtml(currentPotQuality)}</small></div>` : ""}
          <div class="line"><b>에디</b> ${escapeHtml(currentAdd)}</div>
          ${shouldShowOptionRaw(currentAdd, currentAddRaw) ? `<div class="line"><small>${escapeHtml(currentAddRaw)}</small></div>` : ""}
          ${shouldShowSecondaryLabel(currentAdd, currentAddQuality) ? `<div class="line"><small>품질 ${escapeHtml(currentAddQuality)}</small></div>` : ""}`}
        </td>
        <td class="state-cell">
          ${seedRing
            ? `<div class="line"><b>시드링</b> ${escapeHtml(targetSeedRing)}</div><div class="line"><small>${escapeHtml(targetName)}</small></div>`
            : `
          <div class="line"><b>스타포스</b> ${formatStarforce(targetStar)}</div>
          <div class="line"><b>잠재</b> ${escapeHtml(targetPot)}</div>
          ${shouldShowOptionRaw(targetPot, targetPotRaw) ? `<div class="line"><small>${escapeHtml(targetPotRaw)}</small></div>` : ""}
          ${shouldShowSecondaryLabel(targetPot, targetPotQuality) ? `<div class="line"><small>품질 ${escapeHtml(targetPotQuality)}</small></div>` : ""}
          <div class="line"><b>에디</b> ${escapeHtml(targetAdd)}</div>
          ${shouldShowOptionRaw(targetAdd, targetAddRaw) ? `<div class="line"><small>${escapeHtml(targetAddRaw)}</small></div>` : ""}
          ${shouldShowSecondaryLabel(targetAdd, targetAddQuality) ? `<div class="line"><small>품질 ${escapeHtml(targetAddQuality)}</small></div>` : ""}`}
        </td>
        <td class="num">${formatSigned(delta)}</td>
        <td class="num">${formatEokFromMeso(cost)}</td>
        <td class="num">${escapeHtml(eff)}</td>
      </tr>
    `;
  }


  function renderTop10(data) {
    const rows = safeArr(firstOf(data?.top10, data?.top10_rows)).slice(0, 10);
    el.top10Body.innerHTML = rows.map((row, idx) => buildTop10Row(row, idx)).join("");
    el.debugLine.textContent = `현재 수신 개수: ${rows.length} / 응답 top10_count: ${safeText(data?.top10_count)}`;
  }

  async function fetchJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function runDiagnose(nickname, hwan) {
    showLoading(true);
    try {
      const url = `${API_BASE}/gpt-diagnose?character_name=${encodeURIComponent(nickname)}&hwan=${encodeURIComponent(String(hwan).replace(/,/g, ""))}`;
      const data = await fetchJson(url);

      renderTop3(data);
      renderSummary(data);
      renderNextStep(data);
      renderLevelSummary(data);
      renderEquipmentScore(data);
      renderTop10(data);
      renderSummaryHighlights(data);
      if (el.heroComment) el.heroComment.innerHTML = buildHeroComment(data);
    } catch (e) {
      console.error(e);
      alert(`진단 불러오기 실패: ${e?.message || e}`);
    } finally {
      showLoading(false);
    }
  }

  function bindSearch() {
    if (!el.searchBtn) return;

    const go = () => {
      const nickname = safeText(el.nicknameInput?.value, "").trim();
      const hwan = safeText(el.hwanInput?.value, "").replace(/,/g, "").trim();

      if (!nickname || !hwan) {
        alert("닉네임과 환산을 입력해주세요.");
        return;
      }

      setQuery(nickname, hwan);
      runDiagnose(nickname, hwan);
    };

    el.searchBtn.addEventListener("click", go);
    el.nicknameInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") go();
    });
    el.hwanInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") go();
    });
  }

  function bootstrap() {
    bindSearch();
    updateDailyDiagnosisCount().catch(() => {});

    const nickname = qparam("nickname") || qparam("character_name");
    const hwan = qparam("hwan");

    if (el.nicknameInput) el.nicknameInput.value = nickname;
    if (el.hwanInput) el.hwanInput.value = hwan;

    if (nickname && hwan) {
      runDiagnose(nickname, hwan);
    }
  }

  document.addEventListener("DOMContentLoaded", bootstrap);
})();
