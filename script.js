const searchButton = document.querySelector(".search-box button");
const searchInputs = document.querySelectorAll(".search-box input");

if (searchButton && searchInputs.length >= 2) {
  searchButton.addEventListener("click", () => {
    const nickname = searchInputs[0].value.trim();
    const hwan = searchInputs[1].value.trim().replace(/,/g, "");

    if (!nickname) {
      alert("닉네임을 입력해주세요.");
      return;
    }

    if (!hwan) {
      alert("아이템환산을 입력해주세요.");
      return;
    }

    if (!/^\d+$/.test(hwan)) {
      alert("아이템환산은 숫자만 입력해주세요.");
      return;
    }

    const url = `result.html?nickname=${encodeURIComponent(nickname)}&hwan=${encodeURIComponent(hwan)}`;
    window.location.href = url;
  });
}
