(() => {
  const API_BASE = "https://maple-bundle-new.maple-bundle.workers.dev";

  document.addEventListener("DOMContentLoaded", () => {
    bindSearchBar();
    bootstrap();
  });

  function qs(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name) || "";
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text ?? "-";
  }

  function esc(v) {
    return String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function num(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return "-";
    return n.toLocaleString("ko-KR");
  }

  function showOverlay(on) {
    const el = document.getElementById("loadingOverlay");
    if (!el) return;
    el.classList.toggle("show", !!on);
    el.setAttribute("aria-hidden", on ? "false" : "true");
  }

  function bindSearchBar() {
    const nickEl = document.getElementById("resultNicknameInput");
    const hwanEl = document.getElementById("resultHwanInput");
    const btn = document.getElementById("resultSearchButton");
    if (!nickEl || !hwanEl || !btn) return;

    // URL에서 초기값
    const qNick = qs("nickname") || qs("character_name");
    const qHwan = qs("hwan");
    if (qNick) nickEl.value = qNick;
    if (qHwan) hwanEl.value = qHwan;

    const go = () => {
      const nickname = (nickEl.value || "").trim();
      const hwan = (hwanEl.value || "").trim().replaceAll(",", "");
      if (!nickname || !hwan) return alert("닉네임과 환산을 입력해주세요.");
      window.location.href = `/result.html?nickname=${encodeURIComponent(nickname)}&hwan=${encodeURIComponent(hwan)}`;
    };

    btn.addEventListener("click", go);
    nickEl.addEventListener("keydown", (e) => e.key === "Enter" && go());
    hwanEl.addEventListener("keydown", (e) => e.key === "Enter" && go());
  }

  async function fetchJson(path) {
    const url = path.startsWith("http") ? path : `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
    const res = await fetch(url, { method: "GET", headers: { "Accept": "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
    return res.json();
  }

  async function bootstrap() {
    const nickname = (qs("nickname") || "").trim();
    const hwan = (qs("hwan") || "").trim().replaceAll(",", "");

    // 상단 표시
    setText("nicknameValue", nickname || "-");
    setText("hwanValue", hwan ? num(hwan) : "-");

    if (!nickname || !hwan) {
      // 입력 없으면 빈 상태
      document.getElementById("top3List").innerHTML = `<div class="muted">닉네임과 환산을 입력하고 검색하세요.</div>`;
      document.getElementById("top10Body").innerHTML = "";
      return;
    }

    showOverlay(true);

    try {
      // gpt-diagnose 사용 (시드링 자동감지 포함)
      const data = await fetchJson(`/gpt-diagnose?character_name=${encodeURIComponent(nickname)}&hwan=${encodeURIComponent(hwan)}`);

      // 닉네임 표시: 응답 우선
      setText("nicknameValue", data.character_name || nickname);
      setText("hwanValue", num(data.hwan || hwan));

      renderEquipmentLevelSummary(data);
      renderEquipmentScore(data);
      renderNextStepPlan(data);
      renderTop3(data);
      renderSummaryMini(data);
      renderTop10(data);

    } catch (e) {
      document.getElementById("top3List").innerHTML = `<div class="muted">데이터를 불러오지 못했습니다.</div>`;
      document.getElementById("top10Body").innerHTML = "";
      document.getElementById("equipmentLevelSummaryBody").textContent = "데이터를 불러오지 못했습니다.";
      document.getElementById("equipmentScoreBody").textContent = "데이터를 불러오지 못했습니다.";
      document.getElementById("nextStepPlanBody").textContent = "데이터를 불러오지 못했습니다.";
      console.error(e);
    } finally {
      showOverlay(false);
    }
  }

  // 1) 내 템 어느 수준임
  function renderEquipmentLevelSummary(data) {
    const box = document.getElementById("equipmentLevelSummaryBody");
    if (!box) return;

    const s = data.equipment_level_summary;
    if (!s) {
      box.textContent = "equipment_level_summary가 없습니다.";
      return;
    }

    const gradeChips = [
      ["완성도", s.completion_grade],
      ["스타포스", s.starforce_grade],
      ["잠재", s.potential_grade],
      ["에디", s.additional_grade],
      ["세트효과", s.set_effect_grade],
    ].filter(([,v]) => v);

    box.innerHTML = `
      <div class="kv-grid">
        <div class="kv"><div class="k">현재 환산</div><div class="v">${esc(num(s.current_hwan))}</div></div>
        <div class="kv"><div class="k">전체 기준</div><div class="v">상위 ${esc(s.percentile_overall)}%</div><div class="s">수집 데이터 기준</div></div>
        <div class="kv"><div class="k">구간 기준</div><div class="v">상위 ${esc(s.percentile_bucket)}%</div><div class="s">동일 환산 구간</div></div>
        <div class="kv"><div class="k">요약</div><div class="v">${esc(s.completion_grade || "-")}</div><div class="s">${esc(s.summary_comment || "")}</div></div>
      </div>
      <div class="badges">
        ${gradeChips.map(([k,v]) => `<span class="badge">${esc(k)}: ${esc(v)}</span>`).join("")}
      </div>
      ${s.priority_summary ? `<div class="small muted" style="margin-top:10px;">${esc(s.priority_summary)}</div>` : ""}
    `;
  }

  // 2) 자동 템 평가 점수
  function renderEquipmentScore(data) {
    const box = document.getElementById("equipmentScoreBody");
    if (!box) return;

    const s = data.equipment_score;
    if (!s) {
      box.textContent = "equipment_score가 없습니다.";
      return;
    }

    const strengths = Array.isArray(s.strengths) ? s.strengths : [];
    const weaknesses = Array.isArray(s.weaknesses) ? s.weaknesses : [];

    box.innerHTML = `
      <div class="kv-grid">
        <div class="kv"><div class="k">종합 점수</div><div class="v">${esc(s.total_score ?? "-")}</div><div class="s">등급 ${esc(s.final_grade || "-")}</div></div>
        <div class="kv"><div class="k">스타포스</div><div class="v">${esc(s.starforce_score ?? "-")}</div></div>
        <div class="kv"><div class="k">잠재</div><div class="v">${esc(s.potential_score ?? "-")}</div></div>
        <div class="kv"><div class="k">에디</div><div class="v">${esc(s.additional_score ?? "-")}</div></div>
      </div>
      <div class="badges">
        <span class="badge">세트효과: ${esc(s.set_effect_score ?? "-")}</span>
      </div>
      <div class="kv-grid" style="margin-top:12px;grid-template-columns:1fr 1fr;">
        <div class="kv">
          <div class="k">장점</div>
          <div class="v" style="font-size:14px;color:var(--text);font-weight:800;line-height:1.6;">
            ${strengths.length ? strengths.map(x=>`• ${esc(x)}`).join("<br>") : "-"}
          </div>
        </div>
        <div class="kv">
          <div class="k">약점</div>
          <div class="v" style="font-size:14px;color:var(--text);font-weight:800;line-height:1.6;">
            ${weaknesses.length ? weaknesses.map(x=>`• ${esc(x)}`).join("<br>") : "-"}
          </div>
        </div>
      </div>
    `;
  }

  // 3) 다음 단계 추천
  function renderNextStepPlan(data) {
    const box = document.getElementById("nextStepPlanBody");
    if (!box) return;

    const p = data.next_step_plan;
    if (!p) {
      box.textContent = "next_step_plan이 없습니다.";
      return;
    }

    const steps = Array.isArray(p.steps) ? p.steps : [];
    box.innerHTML = `
      <div class="kv-grid" style="grid-template-columns:repeat(4,1fr);">
        <div class="kv"><div class="k">목표 환산</div><div class="v">${esc(num(p.target_hwan))}</div></div>
        <div class="kv"><div class="k">예상 총 상승</div><div class="v">+${esc(num(p.total_delta_hwan))}</div></div>
        <div class="kv"><div class="k">예상 총비용</div><div class="v">${esc(formatCost(p.total_expected_cost_p60))}</div></div>
        <div class="kv"><div class="k">요약</div><div class="v" style="font-size:14px;">${esc(p.plan_summary || "-")}</div></div>
      </div>
      <div class="kv-grid" style="margin-top:12px;grid-template-columns:1fr 1fr;">
        ${steps.slice(0,3).map((s,i)=>`
          <div class="kv">
            <div class="k">STEP ${i+1}</div>
            <div class="v" style="font-size:16px;">${esc(s.item_name || "-")}</div>
            <div class="s">${esc(s.action_summary || "")}</div>
            <div class="s">상승 +${esc(num(s.delta_hwan))} · 비용 ${esc(formatCost(s.expected_cost_p60))}</div>
          </div>
        `).join("")}
      </div>
    `;
  }

  // TOP3 + 추천이유
  function renderTop3(data) {
    const wrap = document.getElementById("top3List");
    if (!wrap) return;

    const rows = Array.isArray(data.top3) ? data.top3 : [];
    if (!rows.length) {
      wrap.innerHTML = `<div class="muted">TOP3가 없습니다.</div>`;
      return;
    }

    wrap.innerHTML = rows.map((r) => {
      const reasons = Array.isArray(r.recommendation_reasons) ? r.recommendation_reasons : [];
      const currentLines = buildStateLines("현재", r);
      const targetLines = buildStateLines("목표", r, true);

      return `
        <div class="t3">
          <div class="rank">${esc(r.rank ?? "-")}</div>
          <div class="title">${esc(r.current_item || "-")}</div>
          <div class="arrow">→ ${esc(r.target_item || r.current_item || "-")}</div>
          <div class="desc">${esc(r.action_summary || "")}</div>

          <div class="states">
            <div class="state">
              <div class="k">현재 상태</div>
              <div class="v">${currentLines}</div>
            </div>
            <div class="state">
              <div class="k">목표 상태</div>
              <div class="v">${targetLines}</div>
            </div>
          </div>

          ${reasons.length ? `
            <div class="reasons">
              <div class="k">추천 이유</div>
              ${reasons.slice(0,4).map(x=>`<div class="line">${esc(x)}</div>`).join("")}
            </div>
          ` : ""}

          <div class="states" style="margin-top:10px;">
            <div class="state">
              <div class="k">예상 상승</div>
              <div class="v"><strong>+${esc(num(r.delta_hwan))}</strong></div>
            </div>
            <div class="state">
              <div class="k">예상 비용</div>
              <div class="v"><strong>${esc(formatCost(r.total_expected_cost_p60 ?? r.expected_cost_p60))}</strong></div>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  // 구성요약 (세트/스타포스/잠재/에디)
  function renderSummaryMini(data) {
    const el = document.getElementById("summaryMiniCard");
    if (!el) return;

    const set = Array.isArray(data.set_summary) ? data.set_summary : [];
    const sf = Array.isArray(data.starforce_summary) ? data.starforce_summary : [];
    const pot = Array.isArray(data.potential_summary) ? data.potential_summary : [];
    const add = Array.isArray(data.additional_summary) ? data.additional_summary : [];

    el.innerHTML = `
      <div class="kv-grid" style="grid-template-columns:1fr 1fr;">
        <div class="kv">
          <div class="k">세트</div>
          <div class="v" style="font-size:14px;color:var(--text);font-weight:800;line-height:1.6;">
            ${set.length ? set.map(x=>`• ${esc(x.label)}: ${esc(x.value)}`).join("<br>") : "-"}
          </div>
        </div>
        <div class="kv">
          <div class="k">스타포스</div>
          <div class="v" style="font-size:14px;color:var(--text);font-weight:800;line-height:1.6;">
            ${sf.length ? sf.map(x=>`• ${esc(x.label)}: ${esc(x.value)}`).join("<br>") : "-"}
          </div>
        </div>
        <div class="kv">
          <div class="k">잠재</div>
          <div class="v" style="font-size:14px;color:var(--text);font-weight:800;line-height:1.6;">
            ${pot.length ? pot.map(x=>`• ${esc(x.label)}: ${esc(x.value)}`).join("<br>") : "-"}
          </div>
        </div>
        <div class="kv">
          <div class="k">에디</div>
          <div class="v" style="font-size:14px;color:var(--text);font-weight:800;line-height:1.6;">
            ${add.length ? add.map(x=>`• ${esc(x.label)}: ${esc(x.value)}`).join("<br>") : "-"}
          </div>
        </div>
      </div>
    `;
  }

  // TOP10 테이블
  function renderTop10(data) {
    const body = document.getElementById("top10Body");
    const dbg = document.getElementById("debugCounts");
    if (!body) return;

    const rows = Array.isArray(data.top10) ? data.top10 : [];
    body.innerHTML = rows.map((r) => {
      const currentLines = stripHtml(buildStateLines("현재", r));
      const targetLines = stripHtml(buildStateLines("목표", r, true));
      return `
        <tr>
          <td>${esc(r.rank ?? "-")}</td>
          <td>${esc(r.slot_key || r.slot || "-")}</td>
          <td>${esc(currentLines)}</td>
          <td>${esc(targetLines)}</td>
          <td>+${esc(num(r.delta_hwan))}</td>
          <td>${esc(formatCost(r.total_expected_cost_p60 ?? r.expected_cost_p60))}</td>
          <td>${esc(formatEff(r.efficiency))}</td>
        </tr>
      `;
    }).join("");

    if (dbg) {
      dbg.textContent = `수신 top3=${Array.isArray(data.top3)?data.top3.length:0}, top10=${rows.length}, top10_count=${data.top10_count ?? "-"}`;
    }
  }

  // 상태 줄 만들기
  function buildStateLines(label, row, useTarget = false) {
    const sf = useTarget ? row.target_starforce : row.current_starforce;
    const pot = useTarget ? (row.target_potential_text || row.target_potential_label) : (row.current_potential_text || row.current_potential_effective_label);
    const add = useTarget ? (row.target_additional_text || row.target_additional_label) : (row.current_additional_text || row.current_additional_effective_label);

    const star = (sf !== null && sf !== undefined && sf !== "") ? `${sf}성` : "-";
    const p = pot ? String(pot) : "-";
    const a = add ? String(add) : "-";

    return `<strong>${star}</strong><br>잠재: ${esc(p)}<br>에디: ${esc(a)}`;
  }

  function stripHtml(html) {
    return String(html).replace(/<br\s*\/?>/gi, " / ").replace(/<\/?strong>/gi, "");
  }

  function formatCost(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return "-";
    // 메소 → 억(1억=100,000,000)
    const eok = n / 100000000;
    return `${eok.toFixed(1)}억`;
  }

  function formatEff(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return "-";
    // 보기 좋게
    return n.toExponential(2);
  }
})();
