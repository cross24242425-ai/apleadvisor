const searchButton = document.querySelector(".search-box button");
const searchInputs = document.querySelectorAll(".search-box input");
const seedSelect = document.querySelector(".search-box select");

if (searchButton && searchInputs.length >= 2 && seedSelect) {
  searchButton.addEventListener("click", () => {
    const nickname = searchInputs[0].value.trim();
    const hwan = searchInputs[1].value.trim().replace(/,/g, "");
    const seed = seedSelect.value;

    if (!nickname) {
      alert("닉네임을 입력해주세요.");
      return;
    }

    if (!hwan) {
      alert("아이템환산을 입력해주세요.");
      return;
    }

    if (!seed) {
      alert("시드링 레벨을 선택해주세요.");
      return;
    }

    const url = `result.html?nickname=${encodeURIComponent(nickname)}&hwan=${encodeURIComponent(hwan)}&seed=${encodeURIComponent(seed)}`;
    window.location.href = url;
  });
}
