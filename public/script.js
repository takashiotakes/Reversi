const board = document.getElementById("board");
const size = 8;
let state = Array(size)
  .fill(null)
  .map(() => Array(size).fill(null));

// 初期配置
state[3][3] = "white";
state[4][4] = "white";
state[3][4] = "black";
state[4][3] = "black";

function renderBoard() {
  board.innerHTML = ""; // 盤面をリセット
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      if (state[y][x]) {
        const stone = document.createElement("div");
        stone.className = `stone ${state[y][x]}`;
        cell.appendChild(stone);
      }
      cell.addEventListener("click", () => handleClick(x, y));
      board.appendChild(cell);
    }
  }
}

function handleClick(x, y) {
  // 今はテスト的に黒石を置くだけ（あとで合法手や反転処理を追加）
  if (state[y][x] === null) {
    state[y][x] = "black";
    renderBoard();
  }
}

renderBoard();
