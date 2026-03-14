const params = new URLSearchParams(window.location.search);

const nickname = params.get("nickname") || "-";
const hwan = params.get("hwan") || "-";
const seed = params.get("seed") || "-";

const nicknameValue = document.getElementById("nicknameValue");
const hwanValue = document.getElementById("hwanValue");
const seedValue = document.getElementById("seedValue");
const top3List = document.getElementById("top3List");
const candidateTableBody = document.getElementById("candidateTableBody");

if (nicknameValue) nicknameValue.textContent = nickname;
if (hwanValue) hwanValue.textContent = Number(hwan).toLocaleString("ko-KR");
if (seedValue) seedValue.textContent = seed;

const demoTop3 = [
  {
    rank: 1,
    title: "데이브레이크 펜던트 에디 유니크 2줄",
    desc: "현재 장비 기준 가장 높은 가성비를 보이는 업그레이드입니다. 세트효과 손실 없이 환산 상승 대비 비용 효율이 좋습니다.",
    gain: "+258",
    cost: "82억",
    efficiency: "S"
  },
  {
    rank: 2,
    title: "루즈 컨트롤 머신 마크 에디 유니크 2줄",
    desc: "동일한 방향의 추가 잠재 업그레이드로, 현재 세팅에서 안정적으로 환산 상승을 기대할 수 있습니다.",
    gain: "+260",
    cost: "86억",
    efficiency: "S"
  },
  {
    rank: 3,
    title: "마력이 깃든 안대 에디 유니크 2줄",
    desc: "비슷한 비용대에서 높은 상승량을 보여주는 후보입니다. 상위 두 후보 다음 순서로 추천됩니다.",
    gain: "+260",
    cost: "86억",
    efficiency: "A"
  }
];

const demoTop10 = [
  ["1", "데이브레이크 펜던트 에디 유니크 2줄", "+258", "82억", "S"],
  ["2", "루즈 컨트롤 머신 마크 에디 유니크 2줄", "+260", "86억", "S"],
  ["3", "마력이 깃든 안대 에디 유니크 2줄", "+260", "86억", "A"],
  ["4", "플라즈마 하트", "+230", "75억", "A"],
  ["5", "고통의 근원 18성", "+190", "65억", "A"],
  ["6", "몽환의 벨트 18성", "+175", "58억", "B"],
  ["7", "마이스터링 22성", "+170", "55억", "B"],
  ["8", "거대한 공포 18성", "+165", "53억", "B"],
  ["9", "에테르넬 숄더 18성", "+160", "52억", "B"],
  ["10", "에디셔널 잠재 보강", "+140", "45억", "C"]
];

if (top3List) {
  top3List.innerHTML = demoTop3.map((item) => `
    <div class="top3-card">
      <div class="top3-rank">${item.rank}</div>
      <div class="top3-title">${item.title}</div>
      <div class="top3-desc">${item.desc}</div>
      <div class="top3-meta">
        <div class="meta-box">
          <div class="meta-label">예상 상승</div>
          <div class="meta-value">${item.gain}</div>
        </div>
        <div class="meta-box">
          <div class="meta-label">예상 비용</div>
          <div class="meta-value">${item.cost}</div>
        </div>
        <div class="meta-box">
          <div class="meta-label">효율 등급</div>
          <div class="meta-value">${item.efficiency}</div>
        </div>
      </div>
    </div>
  `).join("");
}

if (candidateTableBody) {
  candidateTableBody.innerHTML = demoTop10.map((row) => `
    <tr>
      <td>${row[0]}</td>
      <td>${row[1]}</td>
      <td>${row[2]}</td>
      <td>${row[3]}</td>
      <td>${row[4]}</td>
    </tr>
  `).join("");
}
