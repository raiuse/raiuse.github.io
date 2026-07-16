document.getElementById('year').textContent = new Date().getFullYear();

const board = document.getElementById('game-board');

if (board) {
  const context = board.getContext('2d');
  const cells = 20;
  const cellSize = board.width / cells;
  const vectors = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
  const scoreNode = document.getElementById('score');
  const bestNode = document.getElementById('best-score');
  const statusNode = document.getElementById('game-status');
  const startButton = document.getElementById('start-game');
  const pauseButton = document.getElementById('pause-game');
  let snake;
  let food;
  let direction;
  let nextDirection;
  let score;
  let best = Number(localStorage.getItem('loop-snake-best') || 0);
  let timer = null;
  let running = false;
  let paused = false;
  let gameOver = false;
  let touchStart = null;

  function randomFood() {
    let next;
    do {
      next = { x: Math.floor(Math.random() * cells), y: Math.floor(Math.random() * cells) };
    } while (snake.some((part) => part.x === next.x && part.y === next.y));
    return next;
  }

  function updateScore() {
    scoreNode.textContent = String(score).padStart(2, '0');
    bestNode.textContent = String(best).padStart(2, '0');
  }

  function drawCell({ x, y }, color, inset = 2) {
    context.fillStyle = color;
    context.fillRect(x * cellSize + inset, y * cellSize + inset, cellSize - inset * 2, cellSize - inset * 2);
  }

  function draw() {
    context.fillStyle = '#030a05';
    context.fillRect(0, 0, board.width, board.height);
    context.strokeStyle = 'rgba(113,255,157,.08)';
    context.lineWidth = 1;
    for (let index = 0; index <= cells; index += 1) {
      context.beginPath(); context.moveTo(index * cellSize, 0); context.lineTo(index * cellSize, board.height); context.stroke();
      context.beginPath(); context.moveTo(0, index * cellSize); context.lineTo(board.width, index * cellSize); context.stroke();
    }
    drawCell(food, '#d8ff76', 5);
    snake.forEach((part, index) => drawCell(part, index === 0 ? '#effff2' : '#71ff9d'));
  }

  function stopTimer() {
    if (timer !== null) window.clearInterval(timer);
    timer = null;
  }

  function finish(message) {
    stopTimer();
    running = false;
    gameOver = true;
    statusNode.textContent = message;
    startButton.textContent = 'Play again ↻';
  }

  function step() {
    direction = nextDirection;
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
    const hitWall = head.x < 0 || head.x >= cells || head.y < 0 || head.y >= cells;
    const hitSelf = snake.some((part) => part.x === head.x && part.y === head.y);
    if (hitWall || hitSelf) { finish(`Game over. Score ${score}. Press Play again to reset.`); return; }
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score += 1;
      if (score > best) { best = score; localStorage.setItem('loop-snake-best', String(best)); }
      food = randomFood();
      updateScore();
    } else { snake.pop(); }
    draw();
  }

  function reset() {
    stopTimer();
    snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    direction = vectors.right;
    nextDirection = vectors.right;
    score = 0;
    food = randomFood();
    running = false;
    paused = false;
    gameOver = false;
    startButton.textContent = 'Start ↘';
    pauseButton.textContent = 'Pause';
    statusNode.textContent = 'Start를 눌러 게임을 시작하세요.';
    updateScore();
    draw();
  }

  function start() {
    if (gameOver) reset();
    if (running) return;
    running = true;
    paused = false;
    startButton.textContent = 'Running…';
    statusNode.textContent = 'Signal acquired. Keep the loop alive.';
    stopTimer();
    timer = window.setInterval(step, 135);
  }

  function togglePause() {
    if (gameOver) return;
    if (running) {
      stopTimer(); running = false; paused = true; pauseButton.textContent = 'Resume'; statusNode.textContent = 'Paused.';
    } else if (paused) {
      start(); pauseButton.textContent = 'Pause';
    }
  }

  function setDirection(name) {
    const candidate = vectors[name];
    if (!candidate || (candidate.x === -direction.x && candidate.y === -direction.y) || (candidate.x === -nextDirection.x && candidate.y === -nextDirection.y)) return;
    nextDirection = candidate;
    if (!running && !paused) start();
  }

  document.addEventListener('keydown', (event) => {
    const keys = { ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };
    if (keys[event.key]) { event.preventDefault(); setDirection(keys[event.key]); }
    if (event.key === ' ' || event.key === 'p' || event.key === 'P') { event.preventDefault(); togglePause(); }
  });
  document.querySelectorAll('[data-direction]').forEach((button) => button.addEventListener('click', () => setDirection(button.dataset.direction)));
  startButton.addEventListener('click', start);
  pauseButton.addEventListener('click', togglePause);
  document.getElementById('restart-game').addEventListener('click', () => { reset(); start(); });
  board.addEventListener('pointerdown', (event) => { touchStart = { x: event.clientX, y: event.clientY }; });
  board.addEventListener('pointerup', (event) => {
    if (!touchStart) return;
    const dx = event.clientX - touchStart.x; const dy = event.clientY - touchStart.y; touchStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    setDirection(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  });
  reset();
}
