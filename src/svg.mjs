// Build an authentic arcade-style animated SVG: Pac-Man navigates classic
// arcade maze corridors generated from the GitHub contribution grid, chomping
// contribution tiles and pellets, with 4 arcade ghosts (Blinky, Pinky, Inky, Clyde)
// patrolling and chasing. Fully self-contained, native SVG/SMIL with zero JS.

const CELL = 13.5; // cell square size
const GAP = 2; // gap between squares
const PITCH = CELL + GAP; // center-to-center distance (15.5px)
const MARGIN_X = 15;
const MARGIN_Y = 15;
const R = 5.8; // Pac-Man radius (~0.86 * CELL scale)
const SECONDS_PER_CELL = 0.08; // travel speed
const CHOMP = 0.30; // seconds per full open/close cycle
const MOUTH_OPEN = 42;
const MOUTH_SHUT = 3;
const ROWS = 7;

const round = (n) => Math.round(n * 100) / 100;
const cx = (w) => MARGIN_X + w * PITCH + CELL / 2;
const cy = (d) => MARGIN_Y + d * PITCH + CELL / 2;

// Set up classic arcade maze walls across 53 weeks x 7 days
function setupArcadeWalls(W, H) {
  const hWalls = Array.from({ length: W + 1 }, () => Array(H + 1).fill(false));
  const vWalls = Array.from({ length: W + 1 }, () => Array(H + 1).fill(false));

  function setWall(x, y, dir) {
    if (x < 0 || x > W || y < 0 || y > H) return;
    if (dir === "horizontal") hWalls[x][y] = true;
    else vWalls[x][y] = true;
  }

  function setSymmetricWall(x, y, direction, sym) {
    if (direction === "horizontal") {
      setWall(x, y, "horizontal");
      if (sym === "x") setWall(W - x - 1, y, "horizontal");
      else if (sym === "y") setWall(x, H - y, "horizontal");
      else if (sym === "xy") {
        setWall(W - x - 1, y, "horizontal");
        setWall(x, H - y, "horizontal");
        setWall(W - x - 1, H - y, "horizontal");
      }
    } else {
      setWall(x, y, "vertical");
      if (sym === "x") setWall(W - x, y, "vertical");
      else if (sym === "y") setWall(x, H - y - 1, "vertical");
      else if (sym === "xy") {
        setWall(W - x, y, "vertical");
        setWall(x, H - y - 1, "vertical");
        setWall(W - x, H - y - 1, "vertical");
      }
    }
  }

  // Classic arcade symmetrical maze wall barriers
  setSymmetricWall(0, 2, "horizontal", "xy");
  setSymmetricWall(1, 2, "horizontal", "xy");
  setSymmetricWall(4, 1, "vertical", "x");
  setSymmetricWall(4, 2, "vertical", "x");
  setSymmetricWall(4, 3, "vertical", "x");
  setSymmetricWall(4, 4, "vertical", "x");
  setSymmetricWall(3, 3, "horizontal", "x");
  setSymmetricWall(2, 3, "horizontal", "x");
  setSymmetricWall(4, 5, "horizontal", "x");
  setSymmetricWall(6, 4, "vertical", "x");
  setSymmetricWall(6, 3, "vertical", "x");
  setSymmetricWall(6, 2, "vertical", "x");
  setSymmetricWall(6, 2, "horizontal", "x");
  setSymmetricWall(7, 2, "horizontal", "x");
  setSymmetricWall(8, 2, "horizontal", "x");
  setSymmetricWall(9, 2, "horizontal", "x");
  setSymmetricWall(13, 2, "horizontal", "xy");
  setSymmetricWall(14, 2, "horizontal", "xy");
  setSymmetricWall(15, 2, "horizontal", "xy");
  setSymmetricWall(16, 2, "horizontal", "xy");
  setSymmetricWall(17, 2, "horizontal", "xy");
  setSymmetricWall(18, 2, "horizontal", "xy");
  setSymmetricWall(16, 2, "vertical", "xy");
  setSymmetricWall(8, 1, "horizontal", "x");
  setSymmetricWall(9, 1, "horizontal", "x");
  setSymmetricWall(10, 1, "horizontal", "x");
  setSymmetricWall(11, 1, "horizontal", "x");
  setSymmetricWall(12, 1, "vertical", "x");
  setSymmetricWall(12, 3, "vertical", "x");
  setSymmetricWall(11, 4, "horizontal", "x");
  setSymmetricWall(10, 4, "horizontal", "x");
  setSymmetricWall(9, 4, "horizontal", "x");
  setSymmetricWall(8, 4, "horizontal", "x");
  setSymmetricWall(8, 4, "vertical", "x");
  setSymmetricWall(8, 5, "vertical", "x");
  setSymmetricWall(23, 1, "horizontal", "x");
  setSymmetricWall(22, 1, "horizontal", "x");
  setSymmetricWall(21, 1, "horizontal", "x");
  setSymmetricWall(21, 1, "vertical", "x");
  setSymmetricWall(21, 2, "vertical", "x");
  setSymmetricWall(21, 3, "vertical", "x");
  setSymmetricWall(20, 4, "horizontal", "x");
  setSymmetricWall(19, 4, "horizontal", "x");
  setSymmetricWall(19, 3, "vertical", "x");
  setSymmetricWall(18, 3, "horizontal", "x");
  setSymmetricWall(22, 5, "vertical", "x");
  setSymmetricWall(21, 5, "horizontal", "x");
  setSymmetricWall(20, 5, "horizontal", "x");
  setSymmetricWall(20, 5, "vertical", "x");
  setSymmetricWall(1, 6, "horizontal", "x");
  setSymmetricWall(2, 6, "horizontal", "x");
  setSymmetricWall(3, 4, "vertical", "x");
  setSymmetricWall(5, 6, "horizontal", "x");
  setSymmetricWall(6, 6, "horizontal", "x");

  // Center Ghost House
  setWall(25, 2, "horizontal");
  setWall(27, 2, "horizontal");
  setWall(25, 4, "horizontal");
  setWall(26, 4, "horizontal");
  setWall(27, 4, "horizontal");
  setWall(25, 3, "vertical");
  setWall(28, 3, "vertical");
  setWall(25, 2, "vertical");
  setWall(28, 2, "vertical");

  return { hWalls, vWalls };
}

// Get connected orthogonal corridor neighbors
function getCorridorNeighbors(x, y, W, H, hWalls, vWalls) {
  const n = [];
  if (x > 0 && !vWalls[x][y]) n.push([x - 1, y]);
  if (x < W - 1 && !vWalls[x + 1][y]) n.push([x + 1, y]);
  if (y > 0 && !hWalls[x][y]) n.push([x, y - 1]);
  if (y < H - 1 && !hWalls[x][y + 1]) n.push([x, y + 1]);
  return n;
}

// Generate full corridor tour that visits all cells without crossing any walls
function generateArcadeTour(W, H, hWalls, vWalls) {
  const unvisited = new Set();
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) {
      unvisited.add(`${x},${y}`);
    }
  }

  function findNearestUnvisited(start) {
    const q = [[start[0], start[1], []]];
    const vis = new Set([`${start[0]},${start[1]}`]);
    while (q.length > 0) {
      const [cx, cy, path] = q.shift();
      if (unvisited.has(`${cx},${cy}`)) return path;
      for (const [nx, ny] of getCorridorNeighbors(cx, cy, W, H, hWalls, vWalls)) {
        const k = `${nx},${ny}`;
        if (!vis.has(k)) {
          vis.add(k);
          q.push([nx, ny, [...path, [nx, ny]]]);
        }
      }
    }
    return null;
  }

  let cur = [0, 0];
  unvisited.delete("0,0");
  const fullTour = [[0, 0]];
  const firstVisitIndex = new Map();
  firstVisitIndex.set("0,0", 0);

  while (unvisited.size > 0) {
    const path = findNearestUnvisited(cur);
    if (!path) break;
    for (const step of path) {
      fullTour.push(step);
      const k = `${step[0]},${step[1]}`;
      if (unvisited.has(k)) {
        unvisited.delete(k);
        firstVisitIndex.set(k, fullTour.length - 1);
      }
      cur = step;
    }
  }

  // Seamless adjacent return path through corridors to [0, 0]
  function shortestCorridorPath(start, goal) {
    const q = [[start[0], start[1], []]];
    const vis = new Set([`${start[0]},${start[1]}`]);
    while (q.length > 0) {
      const [cx, cy, path] = q.shift();
      if (cx === goal[0] && cy === goal[1]) return path;
      for (const [nx, ny] of getCorridorNeighbors(cx, cy, W, H, hWalls, vWalls)) {
        const k = `${nx},${ny}`;
        if (!vis.has(k)) {
          vis.add(k);
          q.push([nx, ny, [...path, [nx, ny]]]);
        }
      }
    }
    return [];
  }

  const returnPath = shortestCorridorPath(cur, [0, 0]);
  for (const step of returnPath) {
    fullTour.push(step);
  }

  return { fullTour, firstVisitIndex };
}

// Generate closed corridor cycle for quadrant ghost patrol
function generateGhostCycle(xMin, xMax, yMin, yMax, start, W, H, hWalls, vWalls) {
  function dfs(cur, path) {
    if (path.length >= 14 && cur[0] === start[0] && cur[1] === start[1]) {
      return path;
    }
    const nbrs = getCorridorNeighbors(cur[0], cur[1], W, H, hWalls, vWalls).filter(
      ([nx, ny]) => nx >= xMin && nx <= xMax && ny >= yMin && ny <= yMax
    );
    for (const [nx, ny] of nbrs) {
      const prev = path[path.length - 2];
      if (prev && prev[0] === nx && prev[1] === ny) continue;
      const count = path.filter((p) => p[0] === nx && p[1] === ny).length;
      if (count > 1) continue;
      if (nx === start[0] && ny === start[1] && path.length >= 14) {
        return [...path, [nx, ny]];
      }
      if (count === 0) {
        const res = dfs([nx, ny], [...path, [nx, ny]]);
        if (res) return res;
      }
    }
    return null;
  }
  return dfs(start, [start]) || [start];
}

// Generate SVG wall elements from maze definition
function renderMazeSvg(W, H, hWalls, vWalls) {
  const wallElements = [];

  // Horizontal wall bars
  for (let y = 0; y <= H; y++) {
    let runStart = null;
    for (let x = 0; x <= W; x++) {
      const active = x < W && hWalls[x][y];
      if (active && runStart === null) runStart = x;
      if ((!active || x === W) && runStart !== null) {
        const x1 = MARGIN_X + runStart * PITCH - GAP;
        const y1 = MARGIN_Y + y * PITCH - GAP;
        const len = (x - runStart) * PITCH;
        wallElements.push(
          `<rect class="maze-wall" x="${round(x1)}" y="${round(y1)}" width="${round(len)}" height="${GAP}" rx="1"/>`
        );
        runStart = null;
      }
    }
  }

  // Vertical wall bars
  for (let x = 0; x <= W; x++) {
    let runStart = null;
    for (let y = 0; y <= H; y++) {
      const active = y < H && vWalls[x][y];
      if (active && runStart === null) runStart = y;
      if ((!active || y === H) && runStart !== null) {
        const x1 = MARGIN_X + x * PITCH - GAP;
        const y1 = MARGIN_Y + runStart * PITCH - GAP;
        const len = (y - runStart) * PITCH;
        wallElements.push(
          `<rect class="maze-wall" x="${round(x1)}" y="${round(y1)}" width="${GAP}" height="${round(len)}" rx="1"/>`
        );
        runStart = null;
      }
    }
  }

  // Outer border with rounded corners
  const border = `<rect class="maze-border" x="${round(MARGIN_X - 5)}" y="${round(MARGIN_Y - 5)}" width="${round(W * PITCH - GAP + 10)}" height="${round(H * PITCH - GAP + 10)}" rx="6"/>`;

  return { border, walls: wallElements.join("") };
}

// Pac-Man wedge path in local coordinates
function pacPath(thetaDeg) {
  const t = (thetaDeg * Math.PI) / 180;
  const ux = round(R * Math.cos(t));
  const uy = round(-R * Math.sin(t));
  const lx = round(R * Math.cos(t));
  const ly = round(R * Math.sin(t));
  return `M0,0 L${ux},${uy} A${R},${R} 0 1,0 ${lx},${ly} Z`;
}

// Opacity animation for cell/pellet consumption
function eatAnim(a, fadeW, dur) {
  const t1 = round(a);
  const t2 = round(Math.min(a + fadeW, 1));
  let keyTimes, values;
  if (t1 <= 0) {
    keyTimes = `0;${t2 || 0.001};1`;
    values = `1;0;0`;
  } else if (t2 >= 1) {
    keyTimes = `0;${t1};1`;
    values = `1;1;0`;
  } else {
    keyTimes = `0;${t1};${t2};1`;
    values = `1;1;0;0`;
  }
  return `<animate attributeName="opacity" dur="${dur}s" repeatCount="indefinite" values="${values}" keyTimes="${keyTimes}"/>`;
}

export function buildSvg(grid) {
  const W = grid.length;
  const H = ROWS;
  const { hWalls, vWalls } = setupArcadeWalls(W, H);
  const { fullTour, firstVisitIndex } = generateArcadeTour(W, H, hWalls, vWalls);

  const totalSteps = fullTour.length;
  const dur = round(totalSteps * SECONDS_PER_CELL);
  const fadeW = 0.28 / totalSteps;

  const width = round(MARGIN_X * 2 + W * PITCH - GAP);
  const height = round(MARGIN_Y * 2 + H * PITCH - GAP);

  const emptyCells = [];
  const squares = [];
  const pellets = [];

  for (let w = 0; w < W; w++) {
    for (let d = 0; d < H; d++) {
      const cell = grid[w] ? grid[w][d] : null;
      if (!cell) continue;
      const x = round(MARGIN_X + w * PITCH);
      const y = round(MARGIN_Y + d * PITCH);
      const firstIdx = firstVisitIndex.has(`${w},${d}`) ? firstVisitIndex.get(`${w},${d}`) : 0;
      const a = totalSteps > 1 ? firstIdx / totalSteps : 0;
      const eat = eatAnim(a, fadeW, dur);

      emptyCells.push(
        `<rect class="empty" x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="3.5"/>`
      );

      if (cell.level > 0) {
        const pulse =
          cell.level === 4
            ? `<animate attributeName="opacity" dur="1.2s" repeatCount="indefinite" values="1;0.65;1" keyTimes="0;0.5;1"/>`
            : "";
        squares.push(
          `<rect class="l${cell.level}" x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="3.5">${pulse}${eat}</rect>`
        );
      } else {
        const isPowerPellet =
          (w === 1 && d === 1) ||
          (w === 1 && d === 5) ||
          (w === W - 2 && d === 1) ||
          (w === W - 2 && d === 5);

        if (isPowerPellet) {
          pellets.push(
            `<circle class="pellet power-pellet" cx="${round(x + CELL / 2)}" cy="${round(y + CELL / 2)}" r="2.6"><animate attributeName="r" dur="0.8s" repeatCount="indefinite" values="2.6;1.7;2.6"/>${eat}</circle>`
          );
        } else {
          pellets.push(
            `<circle class="pellet" cx="${round(x + CELL / 2)}" cy="${round(y + CELL / 2)}" r="1.35">${eat}</circle>`
          );
        }
      }
    }
  }

  // Maze walls & border
  const maze = renderMazeSvg(W, H, hWalls, vWalls);

  // Motion path for Pac-Man
  const pacMotion = "M" + fullTour.map(([w, d]) => `${round(cx(w))},${round(cy(d))}`).join(" L");

  // Ghost patrol cycles
  const pinkyCycle = generateGhostCycle(0, 15, 0, 6, [0, 0], W, H, hWalls, vWalls);
  const inkyCycle = generateGhostCycle(18, 34, 0, 6, [26, 0], W, H, hWalls, vWalls);
  const clydeCycle = generateGhostCycle(37, 52, 0, 6, [52, 0], W, H, hWalls, vWalls);

  const pinkyMotion = "M" + pinkyCycle.map(([w, d]) => `${round(cx(w))},${round(cy(d))}`).join(" L") + " Z";
  const inkyMotion = "M" + inkyCycle.map(([w, d]) => `${round(cx(w))},${round(cy(d))}`).join(" L") + " Z";
  const clydeMotion = "M" + clydeCycle.map(([w, d]) => `${round(cx(w))},${round(cy(d))}`).join(" L") + " Z";

  const pinkyDur = round(pinkyCycle.length * 0.24);
  const inkyDur = round(inkyCycle.length * 0.24);
  const clydeDur = round(clydeCycle.length * 0.24);

  // Ghost templates with authentic arcade silhouettes
  const ghostBlinky = `<g class="ghost ghost-blinky">
    <path d="M -4.8,0.6 A 4.8,4.8 0 0,1 4.8,0.6 L 4.8,4.4 Q 3.2,2.8 1.6,4.4 Q 0,2.8 -1.6,4.4 Q -3.2,2.8 -4.8,4.4 Z" fill="var(--blinky)"/>
    <ellipse cx="-1.9" cy="-0.8" rx="1.5" ry="1.9" fill="#ffffff"/>
    <ellipse cx="1.9" cy="-0.8" rx="1.5" ry="1.9" fill="#ffffff"/>
    <circle cx="-1.3" cy="-0.8" r="0.8" fill="#1e3a8a"/>
    <circle cx="2.5" cy="-0.8" r="0.8" fill="#1e3a8a"/>
    <animateMotion dur="${dur}s" repeatCount="indefinite" path="${pacMotion}" keyPoints="0;1" keyTimes="0;1" calcMode="linear" begin="-1.12s"/>
  </g>`;

  const ghostPinky = `<g class="ghost ghost-pinky">
    <path d="M -4.8,0.6 A 4.8,4.8 0 0,1 4.8,0.6 L 4.8,4.4 Q 3.2,2.8 1.6,4.4 Q 0,2.8 -1.6,4.4 Q -3.2,2.8 -4.8,4.4 Z" fill="var(--pinky)"/>
    <ellipse cx="-1.9" cy="-0.8" rx="1.5" ry="1.9" fill="#ffffff"/>
    <ellipse cx="1.9" cy="-0.8" rx="1.5" ry="1.9" fill="#ffffff"/>
    <circle cx="-1.3" cy="-0.8" r="0.8" fill="#1e3a8a"/>
    <circle cx="2.5" cy="-0.8" r="0.8" fill="#1e3a8a"/>
    <animateMotion dur="${pinkyDur}s" repeatCount="indefinite" path="${pinkyMotion}" keyPoints="0;1" keyTimes="0;1" calcMode="linear"/>
  </g>`;

  const ghostInky = `<g class="ghost ghost-inky">
    <path d="M -4.8,0.6 A 4.8,4.8 0 0,1 4.8,0.6 L 4.8,4.4 Q 3.2,2.8 1.6,4.4 Q 0,2.8 -1.6,4.4 Q -3.2,2.8 -4.8,4.4 Z" fill="var(--inky)"/>
    <ellipse cx="-1.9" cy="-0.8" rx="1.5" ry="1.9" fill="#ffffff"/>
    <ellipse cx="1.9" cy="-0.8" rx="1.5" ry="1.9" fill="#ffffff"/>
    <circle cx="-1.3" cy="-0.8" r="0.8" fill="#1e3a8a"/>
    <circle cx="2.5" cy="-0.8" r="0.8" fill="#1e3a8a"/>
    <animateMotion dur="${inkyDur}s" repeatCount="indefinite" path="${inkyMotion}" keyPoints="0;1" keyTimes="0;1" calcMode="linear"/>
  </g>`;

  const ghostClyde = `<g class="ghost ghost-clyde">
    <path d="M -4.8,0.6 A 4.8,4.8 0 0,1 4.8,0.6 L 4.8,4.4 Q 3.2,2.8 1.6,4.4 Q 0,2.8 -1.6,4.4 Q -3.2,2.8 -4.8,4.4 Z" fill="var(--clyde)"/>
    <ellipse cx="-1.9" cy="-0.8" rx="1.5" ry="1.9" fill="#ffffff"/>
    <ellipse cx="1.9" cy="-0.8" rx="1.5" ry="1.9" fill="#ffffff"/>
    <circle cx="-1.3" cy="-0.8" r="0.8" fill="#1e3a8a"/>
    <circle cx="2.5" cy="-0.8" r="0.8" fill="#1e3a8a"/>
    <animateMotion dur="${clydeDur}s" repeatCount="indefinite" path="${clydeMotion}" keyPoints="0;1" keyTimes="0;1" calcMode="linear"/>
  </g>`;

  // Pac-Man with circular silhouette, chomp animation, and auto-rotation
  const pac = `<g class="pac">
    <path d="${pacPath(MOUTH_SHUT)}">
      <animate attributeName="d" dur="${CHOMP}s" repeatCount="indefinite"
        calcMode="spline" keyTimes="0;0.5;1" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"
        values="${pacPath(MOUTH_SHUT)};${pacPath(MOUTH_OPEN)};${pacPath(MOUTH_SHUT)}"/>
    </path>
    <animateMotion dur="${dur}s" repeatCount="indefinite" rotate="auto"
      path="${pacMotion}" keyPoints="0;1" keyTimes="0;1" calcMode="linear"/>
  </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="sans-serif">
  <style>
    :root {
      --empty: #ebedf0;
      --l1: #9be9a8; --l2: #40c463; --l3: #30a14e; --l4: #216e39;
      --pac: #ffd93b;
      --pellet: #d97706;
      --maze: #334155;
      --blinky: #dc2626;
      --pinky: #ec4899;
      --inky: #0891b2;
      --clyde: #ea580c;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --empty: #161b22;
        --l1: #0e4429; --l2: #006d32; --l3: #26a641; --l4: #39d353;
        --pac: #ffd93b;
        --pellet: #fbbf24;
        --maze: #ffffff;
        --blinky: #ef4444;
        --pinky: #f472b6;
        --inky: #06b6d4;
        --clyde: #fb923c;
      }
    }
    .empty { fill: var(--empty); }
    .l1 { fill: var(--l1); } .l2 { fill: var(--l2); }
    .l3 { fill: var(--l3); } .l4 { fill: var(--l4); }
    .pac { fill: var(--pac); }
    .pellet { fill: var(--pellet); opacity: 0.85; }
    .power-pellet { fill: var(--pellet); opacity: 0.95; }
    .maze-border { stroke: var(--maze); stroke-width: 1.6; stroke-opacity: 0.8; fill: none; }
    .maze-wall { fill: var(--maze); opacity: 0.8; }
    @media (prefers-reduced-motion: reduce) {
      .pac animateMotion, .ghost animateMotion, .pac animate, .power-pellet animate {
        animation: none !important;
      }
    }
  </style>
  <g class="layer-maze-border">${maze.border}</g>
  <g class="layer-empty-cells">${emptyCells.join("")}</g>
  <g class="layer-maze-walls">${maze.walls}</g>
  <g class="layer-pellets">${pellets.join("")}</g>
  <g class="layer-contrib-cells">${squares.join("")}</g>
  <g class="layer-ghosts">
    ${ghostPinky}
    ${ghostInky}
    ${ghostClyde}
    ${ghostBlinky}
  </g>
  <g class="layer-pacman">${pac}</g>
</svg>`;
}
