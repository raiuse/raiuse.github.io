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
  const pulseButton = document.getElementById('pulse-game');
  const pulseStateNode = document.getElementById('pulse-state');
  const normalSpeed = 135;
  const pulseSpeed = 260;
  const pulseDuration = 3500;
  const obstacles = [{ x: 4, y: 4 }, { x: 5, y: 4 }, { x: 14, y: 5 }, { x: 14, y: 6 }, { x: 6, y: 14 }, { x: 7, y: 14 }, { x: 15, y: 15 }];
  let snake;
  let food;
  let sentinel;
  let direction;
  let nextDirection;
  let score;
  let best = Number(localStorage.getItem('loop-snake-best') || 0);
  let timer = null;
  let running = false;
  let paused = false;
  let gameOver = false;
  let pulseReady = false;
  let pulseActive = false;
  let nextPulseScore = 5;
  let pulseTimer = null;
  let touchStart = null;

  function randomFood() {
    let next;
    do {
      next = { x: Math.floor(Math.random() * cells), y: Math.floor(Math.random() * cells) };
    } while (snake.some((part) => part.x === next.x && part.y === next.y) || obstacles.some((part) => part.x === next.x && part.y === next.y) || (sentinel && sentinel.x === next.x && sentinel.y === next.y));
    return next;
  }

  function updateScore() {
    scoreNode.textContent = String(score).padStart(2, '0');
    bestNode.textContent = String(best).padStart(2, '0');
  }

  function updatePulse() {
    const remaining = Math.max(0, nextPulseScore - score);
    pulseButton.disabled = !running || !pulseReady || pulseActive;
    pulseStateNode.textContent = pulseActive ? 'ACTIVE / 3.5 SEC' : pulseReady ? 'READY / SHIFT' : `CHARGE ${5 - Math.min(5, remaining)} / 5`;
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
    obstacles.forEach((part) => drawCell(part, '#47746b', 3));
    drawCell(sentinel, '#ff6eb4', 4);
    context.strokeStyle = 'rgba(255,110,180,.8)';
    context.strokeRect(sentinel.x * cellSize + 4, sentinel.y * cellSize + 4, cellSize - 8, cellSize - 8);
    snake.forEach((part, index) => drawCell(part, index === 0 ? '#effff2' : '#71ff9d'));
    if (pulseActive) {
      context.fillStyle = 'rgba(216,255,118,.08)';
      context.fillRect(0, 0, board.width, board.height);
      context.strokeStyle = '#d8ff76';
      context.lineWidth = 3;
      context.strokeRect(2, 2, board.width - 4, board.height - 4);
    }
  }

  function stopTimer() {
    if (timer !== null) window.clearInterval(timer);
    timer = null;
  }

  function clearPulse() {
    if (pulseTimer !== null) window.clearTimeout(pulseTimer);
    pulseTimer = null;
    pulseActive = false;
  }

  function startTimer() {
    stopTimer();
    timer = window.setInterval(step, pulseActive ? pulseSpeed : normalSpeed);
  }

  function finish(message) {
    stopTimer();
    clearPulse();
    running = false;
    gameOver = true;
    statusNode.textContent = message;
    startButton.textContent = 'Play again ↻';
    updatePulse();
  }

  function moveSentinel() {
    const candidates = Object.values(vectors).map((vector) => ({ x: sentinel.x + vector.x, y: sentinel.y + vector.y }))
      .filter((candidate) => candidate.x >= 0 && candidate.x < cells && candidate.y >= 0 && candidate.y < cells)
      .filter((candidate) => !obstacles.some((part) => part.x === candidate.x && part.y === candidate.y))
      .filter((candidate) => !snake.slice(1).some((part) => part.x === candidate.x && part.y === candidate.y))
      .filter((candidate) => candidate.x !== food.x || candidate.y !== food.y);
    if (!candidates.length) return;
    candidates.sort((left, right) => (Math.abs(left.x - snake[0].x) + Math.abs(left.y - snake[0].y)) - (Math.abs(right.x - snake[0].x) + Math.abs(right.y - snake[0].y)));
    sentinel = candidates[Math.random() < .72 ? 0 : Math.floor(Math.random() * candidates.length)];
  }

  function step() {
    direction = nextDirection;
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
    const hitWall = head.x < 0 || head.x >= cells || head.y < 0 || head.y >= cells;
    const hitSelf = snake.some((part) => part.x === head.x && part.y === head.y);
    const hitObstacle = obstacles.some((part) => part.x === head.x && part.y === head.y);
    const hitSentinel = sentinel.x === head.x && sentinel.y === head.y;
    if (hitWall || hitSelf || hitObstacle || hitSentinel) { finish(`Signal lost. Score ${score}. Press Play again to reset.`); return; }
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score += 1;
      if (score > best) { best = score; localStorage.setItem('loop-snake-best', String(best)); }
      food = randomFood();
      updateScore();
      if (score >= nextPulseScore) { pulseReady = true; nextPulseScore += 5; }
    } else { snake.pop(); }
    moveSentinel();
    if (sentinel.x === snake[0].x && sentinel.y === snake[0].y) { finish(`Sentinel intercepted the loop. Score ${score}.`); return; }
    updatePulse();
    draw();
  }

  function reset() {
    stopTimer();
    snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    sentinel = { x: 16, y: 3 };
    direction = vectors.right;
    nextDirection = vectors.right;
    score = 0;
    food = randomFood();
    running = false;
    paused = false;
    gameOver = false;
    clearPulse();
    pulseReady = false;
    nextPulseScore = 5;
    startButton.textContent = 'Start ↘';
    pauseButton.textContent = 'Pause';
    statusNode.textContent = 'Start를 눌러 게임을 시작하세요.';
    updateScore();
    updatePulse();
    draw();
  }

  function start() {
    if (gameOver) reset();
    if (running) return;
    running = true;
    paused = false;
    startButton.textContent = 'Running…';
    statusNode.textContent = 'Signal acquired. Keep the loop alive.';
    startTimer();
    updatePulse();
  }

  function togglePause() {
    if (gameOver) return;
    if (running) {
      stopTimer(); running = false; paused = true; pauseButton.textContent = 'Resume'; statusNode.textContent = 'Paused.'; updatePulse();
    } else if (paused) {
      start(); pauseButton.textContent = 'Pause';
    }
  }

  function usePulse() {
    if (!running || !pulseReady || pulseActive) return;
    pulseReady = false;
    pulseActive = true;
    statusNode.textContent = 'Pulse active. Signal speed reduced.';
    startTimer();
    updatePulse();
    draw();
    pulseTimer = window.setTimeout(() => {
      pulseTimer = null;
      pulseActive = false;
      if (running) startTimer();
      statusNode.textContent = 'Pulse depleted. Collect 5 points to recharge.';
      updatePulse();
      draw();
    }, pulseDuration);
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
    if (event.key === 'Shift') { usePulse(); }
  });
  document.querySelectorAll('[data-direction]').forEach((button) => button.addEventListener('click', () => setDirection(button.dataset.direction)));
  startButton.addEventListener('click', start);
  pauseButton.addEventListener('click', togglePause);
  pulseButton.addEventListener('click', usePulse);
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
