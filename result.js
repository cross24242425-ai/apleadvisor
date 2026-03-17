(function () {
  'use strict';

  const API_BASE = 'https://maple-bundle-new.maple-bundle.workers.dev';
  const VERSION = '20260317-3';

  function qs(selector, parent = document) {
    return parent.querySelector(selector);
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function toNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;

    const text = String(value).trim();
    if (!text) return null;

    const cleaned = text.replace(/,/g, '').replace(/[^\d.-]/g, '');
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : null;
  }

  function formatNumber(value) {
    const num = toNumber(value);
    if (num === null) return '-';
    return num.toLocaleString('ko-KR');
  }

  function formatSignedNumber(value) {
    const num = toNumber(value);
    if (num === null) return '-';
    const abs = Math.abs(num).toLocaleString('ko-KR');
    return `${num >= 0 ? '+' : '-'}${abs}`;
  }

  function formatEok(value) {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'string' && value.includes('억')) return value;
    const num = toNumber(value);
    if (num === null) return '-';
    return `${num.toLocaleString('ko-KR')}억`;
  }

  function formatScore(value) {
    if (value === null || value === undefined || value === '') return '-';
    const num = toNumber(value);
    if (num === null) return String(value);
    return num.toLocaleString('ko-KR');
  }

  function withVersion(url) {
    const u = new URL(url);
    u.searchParams.set('v', VERSION);
    return u.toString();
  }

  async function fetchJson(path, params = {}) {
    const url = new URL(path, API_BASE);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });

    const res = await fetch(withVersion(url.toString()), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} ${text}`.trim());
    }

    return res.json();
  }

  function getQueryParams() {
    const url = new URL(window.location.href);
    const nickname = url.searchParams.get('nickname') || '';
    const characterName =
      url.searchParams.get('character_name') ||
      url.searchParams.get('characterName') ||
      nickname ||
      '';
    const hwan = url.searchParams.get('hwan') || '';

    return {
      nickname,
      characterName,
      hwan,
    };
  }

  function firstNonEmpty(...values) {
    for (const value of values) {
      if (value === 0 || value === '0') return value;
      if (Array.isArray(value) && value.length) return value;
      if (value && String(value).trim() && String(value).trim() !== '-') return value;
    }
    return null;
  }

  function normalizeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function readTopLevelList(payload, ...keys) {
    for (const key of keys) {
      const value = payload?.[key];
      if (Array.isArray(value)) return value;
    }
    return [];
  }

  function parseReasonList(value) {
    if (Array.isArray(value)) {
      return value.map(v => String(v ?? '').trim()).filter(Boolean);
    }

    if (typeof value === 'string') {
      return value
        .split(/\n|•|·|\/|,|;|^- /gm)
        .map(v => v.trim())
        .filter(Boolean);
    }

    return [];
  }

  function getReasonText(item) {
    const reasons = [
      ...parseReasonList(item?.recommendation_reasons),
      ...parseReasonList(item?.recommend_reason),
      ...parseReasonList(item?.reason),
      ...parseReasonList(item?.reasons),
      ...parseReasonList(item?.upgrade_reason),
      ...parseReasonList(item?.why),
    ];

    if (reasons.length) return reasons.join(' / ');

    return (
      firstNonEmpty(
        item?.recommendation_reason_summary,
        item?.reason_summary,
        item?.reason_text,
        item?.recommend_text,
        item?.description,
        item?.comment
      ) || '추천 이유 데이터가 없습니다.'
    );
  }

  function getCurrentPotential(item) {
    return (
      firstNonEmpty(
        item?.current_potential_label,
        item?.source_potential_label,
        item?.before_potential_label,
        item?.current?.potential_label,
        item?.currentPotentialLabel,
        item?.potential_label,
        item?.representative_potential_label,
        item?.potential
      ) || '-'
    );
  }

  function getCurrentAdditional(item) {
    return (
      firstNonEmpty(
        item?.current_additional_label,
        item?.source_additional_label,
        item?.before_additional_label,
        item?.current?.additional_label,
        item?.currentAdditionalLabel,
        item?.additional_label,
        item?.representative_additional_label,
        item?.additional
      ) || '-'
    );
  }

  function getCurrentStarforce(item) {
    const star = firstNonEmpty(
      item?.current_starforce,
      item?.source_starforce,
      item?.before_starforce,
      item?.current?.starforce,
      item?.starforce,
      item?.representative_starforce
    );
    return star === null ? '0성' : `${star}성`;
  }

  function getTargetPotential(item) {
    return (
      firstNonEmpty(
        item?.target_potential_label,
        item?.after_potential_label,
        item?.goal_potential_label,
        item?.target?.potential_label,
        item?.targetPotentialLabel,
        item?.planned_potential_label,
        item?.optimized_potential_label,
        item?.to_potential_label
      ) || getCurrentPotential(item)
    );
  }

  function getTargetAdditional(item) {
    return (
      firstNonEmpty(
        item?.target_additional_label,
        item?.after_additional_label,
        item?.goal_additional_label,
        item?.target?.additional_label,
        item?.targetAdditionalLabel,
        item?.planned_additional_label,
        item?.optimized_additional_label,
        item?.to_additional_label
      ) || getCurrentAdditional(item)
    );
  }

  function getTargetStarforce(item) {
    const star = firstNonEmpty(
      item?.target_starforce,
      item?.after_starforce,
      item?.goal_starforce,
      item?.target?.starforce,
      item?.planned_starforce,
      item?.optimized_starforce,
      item?.to_starforce
    );
    return star === null ? getCurrentStarforce(item) : `${star}성`;
  }

  function getUpgradeValue(item) {
    return firstNonEmpty(
      item?.expected_gain,
      item?.gain,
      item?.increase,
      item?.delta_hwan,
      item?.delta,
      item?.improvement,
      item?.score_gain
    );
  }

  function getCostValue(item) {
    return firstNonEmpty(
      item?.expected_cost,
      item?.cost,
      item?.meso_cost,
      item?.total_cost,
      item?.price
    );
  }

  function getCurrentItemName(item) {
    return (
      firstNonEmpty(
        item?.current_item_name,
        item?.source_item_name,
        item?.from_item_name,
        item?.before_item_name,
        item?.item_name,
        item?.name
      ) || '-'
    );
  }

  function getTargetItemName(item) {
    return (
      firstNonEmpty(
        item?.target_item_name,
        item?.to_item_name,
        item?.after_item_name,
        item?.goal_item_name,
        item?.recommended_item_name,
        item?.upgrade_item_name
      ) || '-'
    );
  }

  function renderCharacterHeader(payload, params) {
    const characterName =
      firstNonEmpty(
        payload?.character_name,
        payload?.characterName,
        payload?.nickname,
        params.characterName,
        params.nickname
      ) || '-';

    const hwan =
      firstNonEmpty(
        payload?.input_hwan,
        payload?.hwan,
        payload?.current_hwan,
        params.hwan
      ) || '-';

    const nameEl = qs('[data-role="character-name"]');
    const hwanEl = qs('[data-role="character-hwan"]');

    if (nameEl) nameEl.textContent = characterName;
    if (hwanEl) hwanEl.textContent = `환산 ${formatNumber(hwan)}`;

    const searchName = qs('#search-name');
    const searchHwan = qs('#search-hwan');
    if (searchName) searchName.value = params.nickname || params.characterName || '';
    if (searchHwan) searchHwan.value = params.hwan || '';
  }

  function renderTop3(payload) {
    const listWrap = qs('[data-role="top3-list"]');
    if (!listWrap) return;

    const items = readTopLevelList(
      payload,
      'top_recommendations',
      'top3_recommendations',
      'upgrade_top3',
      'recommend_top3',
      'recommendations'
    ).slice(0, 3);

    if (!items.length) {
      listWrap.innerHTML = `<div class="empty-box">추천 데이터가 없습니다.</div>`;
      return;
    }

    listWrap.innerHTML = items
      .map((item, idx) => {
        const currentName = getCurrentItemName(item);
        const targetName = getTargetItemName(item);

        const currentPotential = getCurrentPotential(item);
        const currentAdditional = getCurrentAdditional(item);
        const currentStarforce = getCurrentStarforce(item);

        const targetPotential = getTargetPotential(item);
        const targetAdditional = getTargetAdditional(item);
        const targetStarforce = getTargetStarforce(item);

        const reasonText = getReasonText(item);
        const gain = getUpgradeValue(item);
        const cost = getCostValue(item);

        return `
          <div class="top-card">
            <div class="top-card-rank">${idx + 1}</div>
            <div class="top-card-main">
              <div class="top-card-title-current">${escapeHtml(currentName)}</div>
              <div class="top-card-title-target">→ ${escapeHtml(targetName)}</div>

              <div class="top-card-state-grid">
                <div class="state-box">
                  <div class="state-box-label">현재 상태</div>
                  <div class="state-box-line">스타포스: ${escapeHtml(currentStarforce)}</div>
                  <div class="state-box-line">잠재: ${escapeHtml(currentPotential)}</div>
                  <div class="state-box-line">에디: ${escapeHtml(currentAdditional)}</div>
                </div>

                <div class="state-box">
                  <div class="state-box-label">목표 상태</div>
                  <div class="state-box-line">스타포스: ${escapeHtml(targetStarforce)}</div>
                  <div class="state-box-line">잠재: ${escapeHtml(targetPotential)}</div>
                  <div class="state-box-line">에디: ${escapeHtml(targetAdditional)}</div>
                </div>
              </div>

              <div class="reason-box">
                <div class="reason-box-label">추천 이유</div>
                <div class="reason-box-text">${escapeHtml(reasonText)}</div>
              </div>

              <div class="top-card-bottom-grid">
                <div class="metric-box">
                  <div class="metric-label">예상 상승</div>
                  <div class="metric-value">${escapeHtml(formatSignedNumber(gain))}</div>
                </div>
                <div class="metric-box">
                  <div class="metric-label">예상 비용</div>
                  <div class="metric-value">${escapeHtml(formatEok(cost))}</div>
                </div>
              </div>
            </div>
          </div>
        `;
      })
      .join('');
  }

  function renderCompositionSummary(payload) {
    const wrap = qs('[data-role="composition-summary"]');
    if (!wrap) return;

    const summary = payload?.composition_summary || payload?.set_summary || {};

    const setRows = normalizeArray(
      summary?.sets || summary?.set_rows || payload?.set_rows
    );

    const starRows = normalizeArray(
      summary?.starforce || summary?.starforce_rows || payload?.starforce_rows
    );

    const potentialRows = normalizeArray(
      summary?.potential || summary?.potential_rows || payload?.potential_rows
    );

    const addRows = normalizeArray(
      summary?.additional || summary?.additional_rows || payload?.additional_rows
    );

    function renderBarRows(rows) {
      if (!rows.length) {
        return `<div class="summary-empty">데이터 없음</div>`;
      }

      const maxValue = Math.max(
        ...rows.map(row => toNumber(row.value ?? row.count ?? row.total) || 0),
        1
      );

      return rows
        .map(row => {
          const label = firstNonEmpty(row.label, row.name, row.key) || '-';
          const value = toNumber(row.value ?? row.count ?? row.total) || 0;
          const percent = Math.max(8, Math.round((value / maxValue) * 100));

          return `
            <div class="bar-row">
              <div class="bar-row-label">${escapeHtml(label)}</div>
              <div class="bar-row-bar"><span style="width:${percent}%"></span></div>
              <div class="bar-row-value">${escapeHtml(String(value))}</div>
            </div>
          `;
        })
        .join('');
    }

    wrap.innerHTML = `
      <div class="summary-panel">
        <div class="summary-panel-title">세트</div>
        ${renderBarRows(setRows)}
      </div>

      <div class="summary-panel">
        <div class="summary-panel-title">스타포스</div>
        ${renderBarRows(starRows)}
      </div>

      <div class="summary-panel">
        <div class="summary-panel-title">잠재</div>
        ${renderBarRows(potentialRows)}
      </div>

      <div class="summary-panel">
        <div class="summary-panel-title">에디</div>
        ${renderBarRows(addRows)}
      </div>
    `;
  }

  function renderNextStepPlan(payload) {
    const wrap = qs('[data-role="next-step-plan"]');
    if (!wrap) return;

    const plan = payload?.next_step_plan || payload?.nextStepPlan || {};
    const steps = normalizeArray(
      plan?.steps ||
      plan?.step_list ||
      payload?.next_step_recommendations ||
      payload?.next_steps
    ).slice(0, 3);

    const targetHwan = firstNonEmpty(
      plan?.target_hwan,
      plan?.goal_hwan,
      plan?.targetHwan
    );

    const totalGain = firstNonEmpty(
      plan?.expected_total_gain,
      plan?.total_gain,
      plan?.expected_gain_total,
      plan?.total_expected_gain,
      plan?.delta_hwan_total
    );

    const totalCost = firstNonEmpty(
      plan?.expected_total_cost,
      plan?.total_cost,
      plan?.expected_cost_total,
      plan?.total_expected_cost
    );

    const summaryText =
      firstNonEmpty(
        plan?.summary,
        plan?.summary_text,
        plan?.description,
        plan?.comment
      ) || '요약 정보가 없습니다.';

    wrap.innerHTML = `
      <div class="info-grid three">
        <div class="info-card">
          <div class="info-card-label">목표 환산</div>
          <div class="info-card-value">${escapeHtml(formatNumber(targetHwan))}</div>
        </div>
        <div class="info-card">
          <div class="info-card-label">예상 총 상승량</div>
          <div class="info-card-value">${escapeHtml(formatSignedNumber(totalGain))}</div>
        </div>
        <div class="info-card">
          <div class="info-card-label">예상 총 비용</div>
          <div class="info-card-value">${escapeHtml(formatEok(totalCost))}</div>
        </div>
      </div>

      <div class="summary-line-box">${escapeHtml(summaryText)}</div>

      <div class="step-list">
        ${[0, 1, 2]
          .map(i => {
            const step = steps[i];

            if (!step) {
              return `
                <div class="step-box">
                  <div class="step-box-label">STEP ${i + 1}</div>
                  <div class="step-box-title">-</div>
                </div>
              `;
            }

            const stepTitle =
              firstNonEmpty(
                step?.title,
                step?.item_name,
                step?.target_item_name,
                step?.name
              ) || '-';

            const stepGain = firstNonEmpty(
              step?.expected_gain,
              step?.gain,
              step?.delta_hwan,
              step?.improvement
            );

            const stepCost = firstNonEmpty(
              step?.expected_cost,
              step?.cost,
              step?.meso_cost,
              step?.price
            );

            const sub = [
              stepGain !== null ? `상승 ${formatSignedNumber(stepGain)}` : null,
              stepCost !== null ? `비용 ${formatEok(stepCost)}` : null,
            ]
              .filter(Boolean)
              .join(' · ');

            return `
              <div class="step-box">
                <div class="step-box-label">STEP ${i + 1}</div>
                <div class="step-box-title">${escapeHtml(stepTitle)}</div>
                ${sub ? `<div class="step-box-sub">${escapeHtml(sub)}</div>` : ''}
              </div>
            `;
          })
          .join('')}
      </div>
    `;
  }

  function renderEquipmentLevel(payload) {
    const wrap = qs('[data-role="equipment-level-summary"]');
    if (!wrap) return;

    const data = payload?.equipment_level_summary || payload?.equipmentLevelSummary || {};

    const currentHwan = firstNonEmpty(
      data?.current_hwan,
      data?.hwan,
      payload?.input_hwan,
      payload?.hwan
    );

    const overallRank =
      firstNonEmpty(
        data?.overall_rank_text,
        data?.overall_percentile_text,
        data?.overall_text,
        data?.overall_rank
      ) || '-';

    const bucketRank =
      firstNonEmpty(
        data?.bucket_rank_text,
        data?.bucket_percentile_text,
        data?.bucket_text,
        data?.bucket_rank
      ) || '-';

    const summary =
      firstNonEmpty(
        data?.summary,
        data?.summary_text,
        data?.description,
        data?.comment
      ) || '요약 정보가 없습니다.';

    const chips = [
      { label: '완성도', value: firstNonEmpty(data?.completion_chip, data?.completion, data?.completion_text) },
      { label: '스타포스', value: firstNonEmpty(data?.starforce_chip, data?.starforce_summary, data?.starforce_text) },
      { label: '잠재', value: firstNonEmpty(data?.potential_chip, data?.potential_summary, data?.potential_text) },
      { label: '에디', value: firstNonEmpty(data?.additional_chip, data?.additional_summary, data?.additional_text) },
      { label: '세트효과', value: firstNonEmpty(data?.set_effect_chip, data?.set_summary, data?.set_effect_text) },
    ].filter(item => item.value);

    wrap.innerHTML = `
      <div class="info-grid three">
        <div class="info-card">
          <div class="info-card-label">현재 환산</div>
          <div class="info-card-value">${escapeHtml(formatNumber(currentHwan))}</div>
        </div>
        <div class="info-card">
          <div class="info-card-label">전체 기준</div>
          <div class="info-card-value">${escapeHtml(String(overallRank))}</div>
        </div>
        <div class="info-card">
          <div class="info-card-label">구간 기준</div>
          <div class="info-card-value">${escapeHtml(String(bucketRank))}</div>
        </div>
      </div>

      <div class="summary-line-box">${escapeHtml(summary)}</div>

      <div class="chip-list">
        ${
          chips.length
            ? chips.map(chip => `<span class="chip">${escapeHtml(chip.label)}: ${escapeHtml(String(chip.value))}</span>`).join('')
            : '<span class="chip">정보 없음</span>'
        }
      </div>
    `;
  }

  function renderEquipmentScore(payload) {
    const wrap = qs('[data-role="equipment-score"]');
    if (!wrap) return;

    const score = payload?.equipment_score || payload?.equipmentScore || {};

    const total = firstNonEmpty(score?.total, score?.overall, score?.total_score);
    const starforce = firstNonEmpty(score?.starforce, score?.starforce_score);
    const potential = firstNonEmpty(score?.potential, score?.potential_score);
    const additional = firstNonEmpty(score?.additional, score?.additional_score, score?.add_score);
    const setEffect = firstNonEmpty(score?.set_effect, score?.set_score, score?.set_effect_score);

    const strengths = [
      ...parseReasonList(score?.strengths),
      ...parseReasonList(score?.pros),
      ...parseReasonList(score?.advantages),
    ];

    const weaknesses = [
      ...parseReasonList(score?.weaknesses),
      ...parseReasonList(score?.cons),
      ...parseReasonList(score?.disadvantages),
    ];

    wrap.innerHTML = `
      <div class="score-grid five">
        <div class="score-card">
          <div class="score-card-label">종합 점수</div>
          <div class="score-card-value">${escapeHtml(formatScore(total))}</div>
        </div>
        <div class="score-card">
          <div class="score-card-label">스타포스</div>
          <div class="score-card-value">${escapeHtml(formatScore(starforce))}</div>
        </div>
        <div class="score-card">
          <div class="score-card-label">잠재</div>
          <div class="score-card-value">${escapeHtml(formatScore(potential))}</div>
        </div>
        <div class="score-card">
          <div class="score-card-label">에디</div>
          <div class="score-card-value">${escapeHtml(formatScore(additional))}</div>
        </div>
        <div class="score-card">
          <div class="score-card-label">세트효과</div>
          <div class="score-card-value">${escapeHtml(formatScore(setEffect))}</div>
        </div>
      </div>

      <div class="score-bottom-grid">
        <div class="score-list-box">
          <div class="score-list-title">장점</div>
          <ul class="score-list">
            ${
              strengths.length
                ? strengths.map(item => `<li>${escapeHtml(item)}</li>`).join('')
                : '<li>장점 데이터 없음</li>'
            }
          </ul>
        </div>

        <div class="score-list-box">
          <div class="score-list-title">약점</div>
          <ul class="score-list">
            ${
              weaknesses.length
                ? weaknesses.map(item => `<li>${escapeHtml(item)}</li>`).join('')
                : '<li>약점 데이터 없음</li>'
            }
          </ul>
        </div>
      </div>
    `;
  }

  function renderRawMessage(payload) {
    const box = qs('[data-role="result-message"]');
    if (!box) return;

    const message = firstNonEmpty(
      payload?.message,
      payload?.summary,
      payload?.diagnosis_summary
    );

    if (message) {
      box.textContent = message;
      box.style.display = 'block';
    } else {
      box.style.display = 'none';
    }
  }

  function showError(error) {
    const root = qs('[data-role="result-root"]');
    if (!root) return;

    root.innerHTML = `
      <div class="error-box">
        결과를 불러오지 못했습니다.<br />
        ${escapeHtml(error?.message || '알 수 없는 오류')}
      </div>
    `;
  }

  function bindSearchForm() {
    const form = qs('#search-form');
    if (!form) return;

    form.addEventListener('submit', event => {
      event.preventDefault();

      const nickname = (qs('#search-name')?.value || '').trim();
      const hwan = (qs('#search-hwan')?.value || '').trim();

      if (!nickname || !hwan) {
        alert('닉네임과 환산을 입력해주세요.');
        return;
      }

      const url = new URL('./result.html', window.location.href);
      url.searchParams.set('nickname', nickname);
      url.searchParams.set('hwan', hwan);
      window.location.href = url.toString();
    });
  }

  async function init() {
    bindSearchForm();

    const params = getQueryParams();

    if (!params.characterName || !params.hwan) {
      showError(new Error('nickname(character_name) 또는 hwan 파라미터가 없습니다.'));
      return;
    }

    try {
      const payload = await fetchJson('/gpt-diagnose', {
        character_name: params.characterName,
        hwan: params.hwan,
      });

      renderCharacterHeader(payload, params);
      renderRawMessage(payload);
      renderTop3(payload);
      renderCompositionSummary(payload);
      renderNextStepPlan(payload);
      renderEquipmentLevel(payload);
      renderEquipmentScore(payload);
    } catch (error) {
      console.error(error);
      showError(error);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
