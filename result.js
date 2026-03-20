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

  function normalizeOptionTierLabel(value) {
    const raw = safeText(value, "");
    if (!raw) return "";
    if (/\uB808\uC804/i.test(raw) || /\bLEG(?:ENDARY)?\b/i.test(raw)) return "\uB808\uC804";
    if (/\uC720\uB2C8\uD06C/i.test(raw) || /\bUNI(?:QUE)?\b/i.test(raw)) return "\uC720\uB2C8\uD06C";
    if (/\uC5D0\uD53D/i.test(raw) || /\bEPI(?:C)?\b/i.test(raw)) return "\uC5D0\uD53D";
    if (/\uB808\uC5B4/i.test(raw) || /\bRAR(?:E)?\b/i.test(raw)) return "\uB808\uC5B4";
    return raw;
  }

  function extractOptionBaseLabel(value) {
    const raw = safeText(value, "");
    if (!raw) return "";
    const match = raw.match(/(\uB808\uC804(?:\uB354\uB9AC)?|\uC720\uB2C8\uD06C|\uC5D0\uD53D|\uB808\uC5B4|LEGENDARY|UNIQUE|EPIC|RARE)\s*(\d)\s*(?:\uC904|LINE)?/iu);
    if (!match) return "";
    const tier = normalizeOptionTierLabel(match[1]);
    const lines = Number(match[2] || 0);
    return tier && Number.isFinite(lines) && lines > 0 ? (tier + " " + lines + "\uC904") : "";
  }

  function extractOptionQualityDetail(value) {
    const raw = safeText(value, "");
    if (!raw) return "";
    const bulletIndex = raw.indexOf("\u00B7");
    if (bulletIndex >= 0) return raw.slice(bulletIndex + 1).trim();
    const parenMatch = raw.match(/\(([^()]+)\)\s*$/);
    if (parenMatch) return safeText(parenMatch[1], "");
    const base = extractOptionBaseLabel(raw);
    if (!base) return "";
    return safeText(raw.slice(raw.indexOf(base) + base.length), "")
      .replace(/^[\s\u00B7:/>-]+/u, "")
      .trim();
  }

  function extractOptionLineCount(value) {
    const raw = safeText(value, "");
    const match = raw.match(/(\d)\s*\uC904/u);
    const count = Number(match?.[1] || NaN);
    return Number.isFinite(count) ? count : null;
  }

  function firstFiniteNumber(...values) {
    for (const value of values) {
      if (Number.isFinite(value)) return value;
    }
    return null;
  }

  function rebuildOptionBaseLabel(baseLike, lineCount) {
    const tier = normalizeOptionTierLabel(baseLike);
    if (!tier) return safeText(baseLike, "");
    if (!Number.isFinite(lineCount) || lineCount <= 0) return tier;
    return `${tier} ${lineCount}\uC904`;
  }

  function hasOptionQualityHint(value) {
    const raw = safeText(value, "");
    return /(?:\uC720\uD6A8|\uC774\uD0C8|\uC900\uC885\uACB0|\uC885\uACB0)/u.test(raw);
  }

  function resolveOptionBaseLabel(baseCandidate, displayFallback, currentBase, qualityLabel) {
    const resolvedBase = safeText(
      firstOf(
        baseCandidate,
        extractOptionBaseLabel(displayFallback),
        currentBase
      ),
      ""
    );
    const resolvedTier = normalizeOptionTierLabel(resolvedBase);
    if (!resolvedTier) return resolvedBase;

    let lineCount = firstFiniteNumber(
      extractOptionLineCount(baseCandidate),
      extractOptionLineCount(displayFallback),
      extractOptionLineCount(resolvedBase)
    );
    const currentTier = normalizeOptionTierLabel(currentBase);
    const currentLineCount = extractOptionLineCount(currentBase);
    if (
      hasOptionQualityHint(qualityLabel)
      && resolvedTier
      && currentTier
      && resolvedTier === currentTier
      && Number.isFinite(currentLineCount)
      && (!Number.isFinite(lineCount) || currentLineCount > lineCount)
    ) {
      lineCount = currentLineCount;
    }
    return rebuildOptionBaseLabel(resolvedTier, lineCount);
  }

  function extractOptionEffectiveLineCount(value) {
    const raw = safeText(value, "");
    if (!raw) return null;
    const patterns = [
      /(\d)\s*\uC720\uD6A8/u,
      /(\d)\s*\uC904\s*\uC720\uD6A8/u,
      /(?:\uC8FC\uC2A4\uD0EF|\uBA54\uC778\uC2A4\uD0EF|\uC8FC\uC635)\s*(\d)\s*\uC904/u
    ];
    for (const pattern of patterns) {
      const count = Number(raw.match(pattern)?.[1] || NaN);
      if (Number.isFinite(count)) return count;
    }
    return null;
  }

  function extractOptionLostLineCount(value) {
    const raw = safeText(value, "");
    const count = Number(raw.match(/(\d)\s*\uC904\s*\uC774\uD0C8/u)?.[1] || NaN);
    return Number.isFinite(count) ? count : null;
  }

  function formatHumanOptionQuality(qualityLabel, baseLabel) {
    const raw = safeText(qualityLabel, "");
    if (!raw || raw === "-") return "";
    if (/\uC900\uC885\uACB0/u.test(raw)) return "\uC900\uC885\uACB0";
    if (/\uC885\uACB0/u.test(raw)) return "\uC885\uACB0";
    const baseLines = extractOptionLineCount(baseLabel);
    const validLines = extractOptionEffectiveLineCount(raw);
    if (Number.isFinite(validLines)) {
      if (Number.isFinite(baseLines)) {
        const lostLines = Math.max(0, baseLines - validLines);
        return lostLines === 0 ? (baseLines + "\uC904 \uC720\uD6A8") : (lostLines + "\uC904 \uC774\uD0C8");
      }
      return validLines + "\uC904 \uC720\uD6A8";
    }
    const lostLines = extractOptionLostLineCount(raw);
    if (Number.isFinite(lostLines)) return lostLines + "\uC904 \uC774\uD0C8";
    if (/\d+\s*\uC810/u.test(raw)) return raw;
    if (/\d+\s*\uC904\s*\uBAA9\uD45C/u.test(raw)) return raw.replace(/\s*\uBAA9\uD45C$/u, "").trim();
    return "";
  }

  function buildOptionDisplayLabel(baseLabel, qualityLabel, displayFallback = "") {
    const base = safeText(baseLabel, "");
    const quality = safeText(qualityLabel, "");
    if (!base) return safeText(displayFallback, "-");
    if (!quality || normalizeCompareText(base).includes(normalizeCompareText(quality))) return base;
    return base + " \u00B7 " + quality;
  }

  function getOptionTierRank(baseLabel) {
    const base = safeText(baseLabel, "");
    if (/\uB808\uC804/i.test(base) || /\bLEG(?:ENDARY)?\b/i.test(base)) return 4;
    if (/\uC720\uB2C8\uD06C/i.test(base) || /\bUNI(?:QUE)?\b/i.test(base)) return 3;
    if (/\uC5D0\uD53D/i.test(base) || /\bEPI(?:C)?\b/i.test(base)) return 2;
    if (/\uB808\uC5B4/i.test(base) || /\bRAR(?:E)?\b/i.test(base)) return 1;
    return 0;
  }

  function getOptionQualityRank(baseLabel, qualityLabel) {
    const quality = formatHumanOptionQuality(qualityLabel, baseLabel);
    if (!quality) return 0;
    if (/\uC885\uACB0/u.test(quality)) return /\uC900/u.test(quality) ? 95 : 99;
    const validLines = extractOptionEffectiveLineCount(quality);
    if (Number.isFinite(validLines)) return validLines * 10;
    const baseLines = extractOptionLineCount(baseLabel);
    const lostLines = extractOptionLostLineCount(quality);
    if (Number.isFinite(baseLines) && Number.isFinite(lostLines)) {
      return Math.max(0, baseLines - lostLines) * 10 + 5;
    }
    return 0;
  }

  function compareOptionStates(currentState, targetState) {
    const currentTier = getOptionTierRank(currentState?.base);
    const targetTier = getOptionTierRank(targetState?.base);
    if (currentTier !== targetTier) return targetTier > currentTier ? 1 : -1;
    const currentLines = extractOptionLineCount(currentState?.base);
    const targetLines = extractOptionLineCount(targetState?.base);
    if (Number.isFinite(currentLines) && Number.isFinite(targetLines) && currentLines !== targetLines) {
      return targetLines > currentLines ? 1 : -1;
    }
    const currentQuality = getOptionQualityRank(currentState?.base, currentState?.quality);
    const targetQuality = getOptionQualityRank(targetState?.base, targetState?.quality);
    if (currentQuality !== targetQuality) return targetQuality > currentQuality ? 1 : -1;
    return 0;
  }

  function buildOptionState(baseLabel, qualityLabel, rawText, displayFallback) {
    const base = safeText(baseLabel, "");
    const quality = formatHumanOptionQuality(qualityLabel, base);
    return {
      base,
      quality,
      raw: safeText(rawText, ""),
      label: buildOptionDisplayLabel(base, quality, displayFallback),
    };
  }

  function normalizeOptionRawText(value) {
    return safeText(value, "").replace(/\s+/g, " ").trim();
  }

  function looksLikeConcreteOptionRaw(value) {
    const raw = normalizeOptionRawText(value);
    if (!raw) return false;
    if (raw.includes("/")) return true;
    if (/[+]\s*\d+%/.test(raw) && /(STR|DEX|INT|LUK|\uC62C\uC2A4\uD0EF|\uACF5\uACA9\uB825|\uB9C8\uB825|ATT|MAGIC)/i.test(raw)) return true;
    if (/[+]\s*\d+/.test(raw) && /(STR|DEX|INT|LUK|\uACF5\uACA9\uB825|\uB9C8\uB825|ATT|MAGIC)/i.test(raw)) return true;
    return false;
  }

  function splitOptionLines(raw) {
    return normalizeOptionRawText(raw)
      .split("/")
      .map((part) => safeText(part, "").trim())
      .filter(Boolean);
  }

  function inferMainStatToken(raw) {
    const text = normalizeOptionRawText(raw).toUpperCase();
    const tokens = ["STR", "DEX", "INT", "LUK"].map((token) => ({
      token,
      count: (text.match(new RegExp(token, "g")) || []).length
    }));
    tokens.sort((a, b) => b.count - a.count);
    return tokens[0]?.count > 0 ? tokens[0].token : "LUK";
  }

  function inferAttackToken(raw) {
    return /(\uB9C8\uB825|MAGIC)/i.test(normalizeOptionRawText(raw)) ? "\uB9C8\uB825" : "\uACF5\uACA9\uB825";
  }

  function buildRowStatHintSource(row) {
    return normalizeOptionRawText(firstOf(
      row?.current_potential_raw,
      row?.current_potential_text,
      row?.current_additional_raw,
      row?.current_additional_text,
      row?.target_potential_raw,
      row?.target_potential_text,
      row?.target_additional_raw,
      row?.target_additional_text
    ));
  }

  function getTierKeyFromBaseLabel(baseLabel) {
    const base = safeText(baseLabel, "");
    if (/\uB808\uC804/i.test(base) || /\bLEG(?:ENDARY)?\b/i.test(base)) return "LEGENDARY";
    if (/\uC720\uB2C8\uD06C/i.test(base) || /\bUNI(?:QUE)?\b/i.test(base)) return "UNIQUE";
    if (/\uC5D0\uD53D/i.test(base) || /\bEPI(?:C)?\b/i.test(base)) return "EPIC";
    if (/\uB808\uC5B4/i.test(base) || /\bRAR(?:E)?\b/i.test(base)) return "RARE";
    return "";
  }

  function getTierValueMap(baseLabel) {
    const tierKey = getTierKeyFromBaseLabel(baseLabel);
    const values = {
      LEGENDARY: { percent: 12, subPercent: 9, addStat: 5, addAttack: 13, addFlat: 12 },
      UNIQUE: { percent: 9, subPercent: 6, addStat: 4, addAttack: 10, addFlat: 10 },
      EPIC: { percent: 6, subPercent: 3, addStat: 4, addAttack: 10, addFlat: 8 },
      RARE: { percent: 3, subPercent: 3, addStat: 2, addAttack: 6, addFlat: 6 }
    };
    return values[tierKey] || null;
  }

  function extractTargetValidLineCount(baseLabel, qualityLabel, currentBase = "") {
    const totalLines = extractOptionLineCount(baseLabel) || extractOptionLineCount(currentBase);
    if (!Number.isFinite(totalLines)) return null;
    const quality = safeText(qualityLabel, "");
    const validLines = extractOptionEffectiveLineCount(quality);
    if (Number.isFinite(validLines)) return Math.max(0, Math.min(totalLines, validLines));
    const lostLines = extractOptionLostLineCount(quality);
    if (Number.isFinite(lostLines)) return Math.max(0, totalLines - lostLines);
    if (/\uC900\uC885\uACB0/u.test(quality)) return Math.max(1, totalLines - 1);
    if (/\uC885\uACB0/u.test(quality)) return totalLines;
    return totalLines;
  }

  function buildOptionChangeSummaryFromRaw(currentRaw, targetRaw) {
    if (!looksLikeConcreteOptionRaw(currentRaw) || !looksLikeConcreteOptionRaw(targetRaw)) return "";
    const currentLines = splitOptionLines(currentRaw);
    const targetLines = splitOptionLines(targetRaw);
    const total = Math.max(currentLines.length, targetLines.length);
    const changes = [];
    for (let index = 0; index < total; index += 1) {
      const before = currentLines[index] || "";
      const after = targetLines[index] || "";
      if (before === after) continue;
      const prefix = `${index + 1}\uBC88\uC9F8 \uC904`;
      if (!before && after) {
        changes.push(`${prefix} \uCD94\uAC00: ${after}`);
        continue;
      }
      if (before && !after) {
        changes.push(`${prefix} \uC81C\uAC70: ${before}`);
        continue;
      }
      changes.push(`${prefix} ${before} -> ${after}`);
    }
    return changes.join(" / ");
  }

  function synthesizePotentialTargetRaw(currentRaw, targetBase, targetQuality, currentBase = "") {
    const fallbackSource = normalizeOptionRawText(currentRaw);
    const lines = splitOptionLines(fallbackSource);
    const totalLines = extractOptionLineCount(targetBase) || extractOptionLineCount(currentBase) || lines.length;
    const validLines = extractTargetValidLineCount(targetBase, targetQuality, currentBase);
    const tierValues = getTierValueMap(targetBase || currentBase);
    if (!Number.isFinite(totalLines) || !tierValues) return "";
    const statSource = fallbackSource || currentBase || targetBase;
    const mainStat = inferMainStatToken(statSource);
    const currentAllStatLine = lines.find((line) => /\uC62C\uC2A4\uD0EF/i.test(line));
    const invalidLine = currentAllStatLine || `\uC62C\uC2A4\uD0EF +${tierValues.subPercent}%`;
    const targetLines = [];
    for (let index = 0; index < totalLines; index += 1) {
      if (index < validLines) {
        targetLines.push(`${mainStat} +${tierValues.percent}%`);
      } else {
        targetLines.push(lines[index] || invalidLine);
      }
    }
    return targetLines.join(" / ");
  }

  function synthesizeAdditionalTargetRaw(currentRaw, targetBase, targetQuality, currentBase = "") {
    const fallbackSource = normalizeOptionRawText(currentRaw);
    const totalLines = extractOptionLineCount(targetBase) || extractOptionLineCount(currentBase) || splitOptionLines(fallbackSource).length || 2;
    const tierValues = getTierValueMap(targetBase || currentBase);
    if (!Number.isFinite(totalLines) || !tierValues) return "";
    const statSource = fallbackSource || currentBase || targetBase;
    const mainStat = inferMainStatToken(statSource);
    const attackToken = inferAttackToken(statSource);
    const targetLines = [
      `${mainStat} +${tierValues.addStat}%`,
      `${attackToken} +${tierValues.addAttack}`,
      `${mainStat} +${tierValues.addFlat}`
    ];
    return targetLines.slice(0, totalLines).join(" / ");
  }

  function buildResolvedTargetRaw(row, kind) {
    const targetState = resolveTargetOptionState(row, kind);
    const currentState = resolveCurrentOptionState(row, kind);
    const explicitRaw = normalizeOptionRawText(firstOf(
      kind === "potential" ? row?.target_potential_raw : row?.target_additional_raw,
      kind === "potential" ? row?.target_potential_text : row?.target_additional_text
    ));
    if (looksLikeConcreteOptionRaw(explicitRaw)) return explicitRaw;
    const sourceRaw = looksLikeConcreteOptionRaw(currentState.raw)
      ? currentState.raw
      : buildRowStatHintSource(row);
    return kind === "additional"
      ? synthesizeAdditionalTargetRaw(sourceRaw, targetState.base, targetState.quality, currentState.base)
      : synthesizePotentialTargetRaw(sourceRaw, targetState.base, targetState.quality, currentState.base);
  }

  function buildResolvedCurrentRaw(row, kind) {
    const currentState = resolveCurrentOptionState(row, kind);
    if (looksLikeConcreteOptionRaw(currentState.raw)) return currentState.raw;
    const sourceRaw = buildRowStatHintSource(row);
    return kind === "additional"
      ? synthesizeAdditionalTargetRaw(sourceRaw, currentState.base, currentState.quality, currentState.base)
      : synthesizePotentialTargetRaw(sourceRaw, currentState.base, currentState.quality, currentState.base);
  }

  function resolveCurrentOptionState(row, kind) {
    const isPotential = kind === "potential";
    const displayFallback = firstOf(
      isPotential ? row?.current_potential_display_label : row?.current_additional_display_label,
      isPotential ? row?.current_state?.potential : row?.current_state?.additional,
      isPotential ? row?.current_potential_effective_label : row?.current_additional_effective_label,
      isPotential ? row?.current_potential_text : row?.current_additional_text
    );
    const quality = firstOf(
      isPotential ? row?.current_potential_quality_label : row?.current_additional_quality_label,
      extractOptionQualityDetail(displayFallback)
    );
    const base = resolveOptionBaseLabel(
      firstOf(
        isPotential ? row?.current_potential_label : row?.current_additional_label,
        extractOptionBaseLabel(displayFallback)
      ),
      displayFallback,
      "",
      quality
    );
    const raw = firstOf(
      isPotential ? row?.current_potential_raw : row?.current_additional_raw,
      isPotential ? row?.current_potential_text : row?.current_additional_text
    );
    return buildOptionState(base, quality, raw, displayFallback);
  }

  function resolveTargetOptionState(row, kind) {
    const isPotential = kind === "potential";
    const currentState = resolveCurrentOptionState(row, kind);
    const displayFallback = firstOf(
      isPotential ? row?.target_potential_display_label : row?.target_additional_display_label,
      isPotential ? row?.target_state?.potential : row?.target_state?.additional,
      isPotential ? row?.target_potential_text : row?.target_additional_text,
      currentState.label
    );
    const quality = firstOf(
      isPotential ? row?.target_potential_quality_label : row?.target_additional_quality_label,
      extractOptionQualityDetail(displayFallback),
      currentState.quality
    );
    const base = resolveOptionBaseLabel(
      firstOf(
        isPotential ? row?.target_potential_label : row?.target_additional_label,
        extractOptionBaseLabel(displayFallback),
        currentState.base
      ),
      displayFallback,
      currentState.base,
      quality
    );
    const raw = firstOf(
      isPotential ? row?.target_potential_raw : row?.target_additional_raw,
      isPotential ? row?.target_potential_text : row?.target_additional_text,
      currentState.raw
    );
    const targetState = buildOptionState(base, quality, raw, displayFallback);
    const compare = compareOptionStates(currentState, targetState);
    if (compare < 0) return currentState;
    if (compare > 0) return targetState;
    const mergedQuality = chooseChangedValue(currentState.quality, targetState.quality, "");
    const mergedBase = safeText(firstOf(targetState.base, currentState.base), "");
    return {
      base: mergedBase,
      quality: mergedQuality,
      raw: chooseChangedValue(currentState.raw, targetState.raw, ""),
      label: buildOptionDisplayLabel(mergedBase, mergedQuality, firstOf(targetState.label, currentState.label))
    };
  }

  function getCurrentPotential(row) {
    return safeText(resolveCurrentOptionState(row, "potential").label);
  }

  function getTargetPotential(row) {
    return safeText(resolveTargetOptionState(row, "potential").label);
  }

  function getCurrentAdditional(row) {
    return safeText(resolveCurrentOptionState(row, "additional").label);
  }

  function getTargetAdditional(row) {
    return safeText(resolveTargetOptionState(row, "additional").label);
  }

  function getCurrentPotentialRaw(row) {
    return safeText(buildResolvedCurrentRaw(row, "potential"), "");
  }

  function getTargetPotentialRaw(row) {
    return safeText(buildResolvedTargetRaw(row, "potential"), "");
  }

  function getCurrentAdditionalRaw(row) {
    return safeText(buildResolvedCurrentRaw(row, "additional"), "");
  }

  function getTargetAdditionalRaw(row) {
    return safeText(buildResolvedTargetRaw(row, "additional"), "");
  }

  function getTargetPotentialChangeSummary(row) {
    const explicit = safeText(firstOf(row?.target_potential_change_summary, row?.potential_change_summary), "");
    if (explicit) return explicit;
    return safeText(buildOptionChangeSummaryFromRaw(getCurrentPotentialRaw(row), getTargetPotentialRaw(row)), "");
  }

  function getTargetAdditionalChangeSummary(row) {
    const explicit = safeText(firstOf(row?.target_additional_change_summary, row?.additional_change_summary), "");
    if (explicit) return explicit;
    return safeText(buildOptionChangeSummaryFromRaw(getCurrentAdditionalRaw(row), getTargetAdditionalRaw(row)), "");
  }

  function getCurrentPotentialQuality(row) {
    return safeText(resolveCurrentOptionState(row, "potential").quality, "");
  }

  function getTargetPotentialQuality(row) {
    return safeText(resolveTargetOptionState(row, "potential").quality, "");
  }

  function getCurrentAdditionalQuality(row) {
    return safeText(resolveCurrentOptionState(row, "additional").quality, "");
  }

  function getTargetAdditionalQuality(row) {
    return safeText(resolveTargetOptionState(row, "additional").quality, "");
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

  function shouldShowOptionChangeSummary(summary) {
    const normalized = normalizeCompareText(summary);
    return Boolean(normalized) && normalized !== "-";
  }

  function looksLikeSeedRingName(value) {
    const raw = safeText(value, "");
    if (!raw) return false;
    return /(?:\uCEE8\uD2F0\uB274\uC5B4\uC2A4 \uB9C1|\uB9AC\uC2A4\uD2B8\uB808\uC778\uD2B8 \uB9C1|\uC6E8\uD3F0\uD37C\uD504|\uB9C1 \uC624\uBE0C \uC36C|\uC5BC\uD2F0\uBA54\uC774\uB364 \uB9C1|\uD06C\uB9AC\uB370\uBBF8\uC9C0 \uB9C1|\uB9AC\uBC0B \uB9C1|\uB808\uBCA8\uD37C\uD504 \uB9C1|\uD06C\uB77C\uC774\uC2DC\uC2A4(?: HM| H| M)?\uB9C1)/u.test(raw);
  }

  function isSeedRingRow(row) {
    const upgradeType = String(row?.upgrade_type || row?.action_type || "").trim().toLowerCase();
    const key = String(row?.key || "").trim().toUpperCase();
    const actionSummary = safeText(row?.action_summary, "");
    const itemNames = [
      row?.current_item,
      row?.current_item_name,
      row?.target_item,
      row?.target_item_name,
      row?.item_name
    ];
    const hasSeedRingLabel = Boolean(firstOf(
      row?.current_seedring_label,
      row?.current_seed_ring_label,
      row?.target_seedring_label,
      row?.target_seed_ring_label
    ));
    return hasSeedRingLabel
      || upgradeType === "seedring"
      || key.startsWith("SEEDRING_")
      || itemNames.some((value) => looksLikeSeedRingName(value))
      || /(?:LV|Lv)\s*\.?\s*\d+/.test(actionSummary);
  }

  function parseSeedRingTransition(row) {
    const tokens = [
      row?.key,
      row?.candidate_key,
      row?.row_id,
      row?.action_summary,
      row?.target_item,
      row?.current_item
    ].map((value) => safeText(value, "")).filter(Boolean);
    for (const token of tokens) {
      const direct = token.match(/SEEDRING_(\d+)_TO_(\d+)/i);
      if (direct) {
        return {
          from: Number(direct[1] || 0),
          to: Number(direct[2] || 0)
        };
      }
      const arrow = token.match(/(?:Lv\.?\s*)?(\d+)\s*(?:->|\u2192)\s*(?:Lv\.?\s*)?(\d+)/i)
        || token.match(/(\d+)\s*\uB808\uBCA8\s*(?:->|\u2192)\s*(\d+)\s*\uB808\uBCA8/u);
      if (arrow) {
        return {
          from: Number(arrow[1] || 0),
          to: Number(arrow[2] || 0)
        };
      }
    }
    return null;
  }

  function formatSeedRingLevelLabel(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? `${n}\uB808\uBCA8` : "";
  }

  function parseSeedRingLabelFromText(text) {
    const raw = safeText(text, "");
    const match = raw.match(/Lv\s*\.?\s*(\d+)/i) || raw.match(/(\d+)\s*\uB808\uBCA8/u);
    if (!match) return "";
    return Number(match[1] || 0) + "\uB808\uBCA8";
  }

  function getCurrentSeedRingLevel(row, data) {
    const transition = parseSeedRingTransition(row);
    return safeText(
      firstOf(
        row?.current_seedring_label,
        row?.current_seed_ring_label,
        parseSeedRingLabelFromText(row?.current_item),
        parseSeedRingLabelFromText(row?.action_summary),
        formatSeedRingLevelLabel(transition?.from),
        formatSeedRingLevelLabel(firstOf(data?.seed_ring_level, data?.seedRingLevel))
      ),
      ""
    );
  }

  function getTargetSeedRingLevel(row, data) {
    const transition = parseSeedRingTransition(row);
    return safeText(
      firstOf(
        row?.target_seedring_label,
        row?.target_seed_ring_label,
        parseSeedRingLabelFromText(row?.target_item),
        parseSeedRingLabelFromText(row?.action_summary),
        formatSeedRingLevelLabel(transition?.to),
        getCurrentSeedRingLevel(row, data)
      ),
      ""
    );
  }

  function isGenericSeedRingName(value) {
    const raw = safeText(value, "");
    if (!raw) return true;
    return /^(?:\uC2DC\uB4DC\uB9C1|SEEDRING)/i.test(raw);
  }

  function resolveSeedRingDisplayName(row, data, kind = "current") {
    const primary = kind === "target"
      ? firstOf(row?.target_item, row?.target_item_name)
      : firstOf(row?.current_item, row?.current_item_name);
    const secondary = kind === "target"
      ? firstOf(row?.current_item, row?.item_name)
      : firstOf(row?.target_item, row?.item_name);
    const seedMetaName = firstOf(data?.seed_ring_name, data?.seedRingName);
    return safeText(
      firstOf(
        !isGenericSeedRingName(primary) ? primary : null,
        !isGenericSeedRingName(secondary) ? secondary : null,
        seedMetaName
      ),
      "\uC2DC\uB4DC\uB9C1"
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

  function buildNormalStateHtml(star, potential, potentialRaw, potentialChangeSummary, additional, additionalRaw, additionalChangeSummary) {
    return `
      <div><b>스타포스</b> ${formatStarforce(star)}</div>
      <div><b>잠재</b> ${escapeHtml(safeText(potential))}</div>
      ${shouldShowOptionRaw(potential, potentialRaw) ? `<div><small>raw: ${escapeHtml(potentialRaw)}</small></div>` : ""}
      ${shouldShowOptionChangeSummary(potentialChangeSummary) ? `<div><small>\uBCC0\uD654: ${escapeHtml(potentialChangeSummary)}</small></div>` : ""}
      <div><b>에디</b> ${escapeHtml(safeText(additional))}</div>
      ${shouldShowOptionRaw(additional, additionalRaw) ? `<div><small>raw: ${escapeHtml(additionalRaw)}</small></div>` : ""}
      ${shouldShowOptionChangeSummary(additionalChangeSummary) ? `<div><small>\uBCC0\uD654: ${escapeHtml(additionalChangeSummary)}</small></div>` : ""}
    `;
  }

  function buildSeedRingStateHtml(level, itemName) {
    const levelLabel = safeText(level, "");
    const displayText = [safeText(itemName), levelLabel].filter(Boolean).join(" ");
    return `
      <div><b>\uC2DC\uB4DC\uB9C1</b> ${escapeHtml(displayText || safeText(itemName))}</div>
    `;
  }

  

  function buildTop3Card(row, idx, reasonsMap, data) {
    const rank = getRowRank(row, idx);
    const seedRing = isSeedRingRow(row);
    const currentName = seedRing ? resolveSeedRingDisplayName(row, data, "current") : getCurrentItemName(row);
    const targetName = seedRing ? resolveSeedRingDisplayName(row, data, "target") : getTargetItemName(row);
    const slot = getSlotKey(row);

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
    const currentSeedRing = getCurrentSeedRingLevel(row, data);
    const targetSeedRing = getTargetSeedRingLevel(row, data);
    const targetPotChangeSummary = getTargetPotentialChangeSummary(row);
    const targetAddChangeSummary = getTargetAdditionalChangeSummary(row);

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
                : buildNormalStateHtml(currentStar, currentPot, currentPotRaw, "", currentAdd, currentAddRaw, "")}
            </div>
          </div>
          <div class="info-box">
            <div class="info-k">목표 상태</div>
            <div class="info-v">
              ${seedRing
                ? buildSeedRingStateHtml(targetSeedRing, targetName)
                : buildNormalStateHtml(targetStar, targetPot, targetPotRaw, targetPotChangeSummary || targetPotQuality, targetAdd, targetAddRaw, targetAddChangeSummary || targetAddQuality)}
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
    el.top3List.innerHTML = rows.map((row, idx) => buildTop3Card(row, idx, reasonsMap, data)).join("");
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

  

  function buildTop10Row(row, idx, data) {
    const rank = getRowRank(row, idx);
    const slot = getSlotKey(row);
    const seedRing = isSeedRingRow(row);
    const currentName = seedRing ? resolveSeedRingDisplayName(row, data, "current") : getCurrentItemName(row);
    const targetName = seedRing ? resolveSeedRingDisplayName(row, data, "target") : getTargetItemName(row);
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
    const currentSeedRing = getCurrentSeedRingLevel(row, data);
    const targetSeedRing = getTargetSeedRingLevel(row, data);
    const targetPotChangeSummary = getTargetPotentialChangeSummary(row);
    const targetAddChangeSummary = getTargetAdditionalChangeSummary(row);

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
            ? buildSeedRingStateHtml(currentSeedRing, currentName)
            : buildNormalStateHtml(currentStar, currentPot, currentPotRaw, "", currentAdd, currentAddRaw, "")}
        </td>
        <td class="state-cell">
          ${seedRing
            ? buildSeedRingStateHtml(targetSeedRing, targetName)
            : buildNormalStateHtml(targetStar, targetPot, targetPotRaw, targetPotChangeSummary || targetPotQuality, targetAdd, targetAddRaw, targetAddChangeSummary || targetAddQuality)}
        </td>
        <td class="num">${formatSigned(delta)}</td>
        <td class="num">${formatEokFromMeso(cost)}</td>
        <td class="num">${escapeHtml(eff)}</td>
      </tr>
    `;
  }


  function renderTop10(data) {
    const rows = safeArr(firstOf(data?.top10, data?.top10_rows)).slice(0, 10);
    el.top10Body.innerHTML = rows.map((row, idx) => buildTop10Row(row, idx, data)).join("");
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
