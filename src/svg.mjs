// Build a single self-contained animated SVG: Pac-Man serpentines across the
// contribution grid in an arcade maze, chomping contribution tiles and pellets,
// with classic arcade ghosts patrolling and chasing.
// Light/dark is handled with a prefers-color-scheme media query, so one file
// works in both GitHub themes when embedded with <img>.

const CELL = 12; // square size
const GAP = 3; // gap between squares
const PITCH = CELL + GAP; // center-to-center distance (15px)
const MARGIN_X = 14;
const MARGIN_Y = 14;
const R = 5.2; // Pac-Man radius (~0.87 * CELL scale)
const SECONDS_PER_CELL = 0.10; // travel speed
const CHOMP = 0.32; // seconds per full open/close cycle
const MOUTH_OPEN = 42; // widest mouth half-angle (degrees)
const MOUTH_SHUT = 3; // nearly-closed mouth half-angle (degrees)
const ROWS = 7;

const round = (n) => Math.round(n * 100) / 100;
const opposite = (r) => (r === 0 ? ROWS - 1 : 0);
const exists = (grid, w, d) => !!(grid[w] && grid[w][d]);

const cx = (w) => MARGIN_X + w * PITCH + CELL / 2;
const cy = (d) => MARGIN_Y + d * PITCH + CELL / 2;

// Deterministic PRNG with default seed for Siddhant (Sidd927)
function createRng(seed = 927) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

// Generate clean corridor-based Hamiltonian tour through the grid
export function corridorPath(grid, rand) {
  const W = grid.length;
  const order = [];
  let col = 0;
  let startRow = 0;

  while (col < W) {
    const width = 4 + Math.floor(rand() * 4); // 4..7 columns
    const c1 = Math.min(col + width, W);
    const w = c1 - col;
    const vertical = rand() < 0.5;

    if (vertical) {
      let sr = startRow;
      for (let c = col; c < c1; c++) {
        if (sr === 0) for (let d = 0; d < ROWS; d++) order.push([c, d]);
        else for (let d = ROWS - 1; d >= 0; d--) order.push([c, d]);
        sr = opposite(sr);
      }
      startRow = w % 2 === 1 ? opposite(startRow) : startRow;
    } else {
      const rowSeq =
        startRow === 0 ? [0, 1, 2, 3, 4, 5, 6] : [6, 5, 4, 3, 2, 1, 0];
      let dir = 1;
      for (const d of rowSeq) {
        if (dir === 1) for (let c = col; c < c1; c++) order.push([c, d]);
        else for (let c = c1 - 1; c >= col; c--) order.push([c, d]);
        dir = -dir;
      }
      startRow = opposite(startRow);
    }
    col = c1;
  }
  return order.filter(([w, d]) => exists(grid, w, d));
}

// Build seamless looping motion path that tours all cells, then cruises
// through the cleared corridor back to start with zero visible teleportation
export function buildMotionPath(grid) {
  const rand = createRng(927);
  const primaryTour = corridorPath(grid, rand);
  const W = grid.length;

  // Seamless adjacent return path to start [0, 0]
  const last = primaryTour[primaryTour.length - 1];
  const returnSteps = [];

  // Step up to row 0 if not already there
  for (let d = last[1] - 1; d >= 0; d--) {
    returnSteps.push([last[0], d]);
  }
  // Cruise left along row 0 back to [0, 0]
  for (let w = last[0] - 1; w >= 0; w--) {
    returnSteps.push([w, 0]);
  }

  const fullPath = [...primaryTour, ...returnSteps];
  return { primaryTour, fullPath };
}

// Algorithmic arcade maze walls and border generated from grid coordinates
function buildMaze(W, ROWS) {
  const gy = (d) => MARGIN_Y + d * PITCH + CELL + GAP / 2;
  const gx = (w) => MARGIN_X + w * PITCH + CELL + GAP / 2;

  const borderX = MARGIN_X - 4;
  const borderY = MARGIN_Y - 4;
  const borderWidth = W * PITCH - GAP + 8;
  const borderHeight = ROWS * PITCH - GAP + 8;

  const wallPaths = [];
  // Horizontal wall bars in gaps between rows 1&2, 3&4, 5&6
  for (let c = 1; c < W - 2; c += 6) {
    const cEnd = Math.min(c + 4, W - 1);
    const x1 = MARGIN_X + c * PITCH - GAP / 2;
    const x2 = MARGIN_X + cEnd * PITCH + CELL + GAP / 2;
    wallPaths.push(`M ${round(x1)},${round(gy(1))} L ${round(x2)},${round(gy(1))}`);
    wallPaths.push(`M ${round(x1)},${round(gy(3))} L ${round(x2)},${round(gy(3))}`);
    wallPaths.push(`M ${round(x1)},${round(gy(5))} L ${round(x2)},${round(gy(5))}`);
  }

  // Vertical wall connectors between rows creating arcade T/L blocks
  for (let c = 6; c < W - 2; c += 6) {
    wallPaths.push(`M ${round(gx(c))},${round(gy(1))} L ${round(gx(c))},${round(gy(2))}`);
    wallPaths.push(`M ${round(gx(c))},${round(gy(3))} L ${round(gx(c))},${round(gy(4))}`);
  }

  return {
    border: `<rect class="maze-border" x="${round(borderX)}" y="${round(borderY)}" width="${round(borderWidth)}" height="${round(borderHeight)}" rx="5"/>`,
    walls: `<path class="maze-wall" d="${wallPaths.join(' ')}"/>`,
  };
}

// Pac-Man wedge in local coords, pointing +x, mouth opening toward travel
function pacPath(thetaDeg) {
  const t = (thetaDeg * Math.PI) / 180;
  const ux = round(R * Math.cos(t));
  const uy = round(-R * Math.sin(t));
  const lx = round(R * Math.cos(t));
  const ly = round(R * Math.sin(t));
  return `M0,0 L${ux},${uy} A${R},${R} 0 1,0 ${lx},${ly} Z`;
}

// Opacity keyframes for a square eaten at path-fraction `a` (0..1)
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
  const { primaryTour, fullPath } = buildMotionPath(grid);
  const N = primaryTour.length;
  const totalSteps = fullPath.length;
  const dur = round(totalSteps * SECONDS_PER_CELL);
  const fadeW = 0.28 / totalSteps;

  const width = MARGIN_X * 2 + grid.length * PITCH - GAP;
  const height = MARGIN_Y * 2 + ROWS * PITCH - GAP;

  // Index each cell by its position in the primary tour for eat-time synchronization
  const orderIndex = new Map();
  primaryTour.forEach(([w, d], i) => orderIndex.set(`${w},${d}`, i));

  const emptyCells = [];
  const squares = [];
  const pellets = [];
  const W = grid.length;

  for (let w = 0; w < W; w++) {
    for (let d = 0; d < ROWS; d++) {
      const cell = grid[w][d];
      if (!cell) continue; // hole from a partial week
      const x = round(MARGIN_X + w * PITCH);
      const y = round(MARGIN_Y + d * PITCH);
      const i = orderIndex.has(`${w},${d}`) ? orderIndex.get(`${w},${d}`) : 0;
      const a = totalSteps > 1 ? i / totalSteps : 0;
      const eat = eatAnim(a, fadeW, dur);

      emptyCells.push(
        `<rect class="empty" x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2"/>`
      );

      if (cell.level > 0) {
        // Busy days are contribution power tiles; level 4 gently pulses
        const pulse =
          cell.level === 4
            ? `<animate attributeName="opacity" dur="1.2s" repeatCount="indefinite" values="1;0.6;1" keyTimes="0;0.5;1"/>`
            : "";
        squares.push(
          `<rect class="l${cell.level}" x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2">${pulse}${eat}</rect>`
        );
      } else {
        // Empty days are maze corridors dotted with pellets for Pac-Man to eat
        // Four corners feature arcade energizer / power pellets
        const isPowerPellet =
          (w === 1 && d === 1) ||
          (w === 1 && d === 5) ||
          (w === W - 2 && d === 1) ||
          (w === W - 2 && d === 5);

        if (isPowerPellet) {
          pellets.push(
            `<circle class="pellet power-pellet" cx="${round(x + CELL / 2)}" cy="${round(y + CELL / 2)}" r="2.2"><animate attributeName="r" dur="0.8s" repeatCount="indefinite" values="2.2;1.5;2.2"/>${eat}</circle>`
          );
        } else {
          pellets.push(
            `<circle class="pellet" cx="${round(x + CELL / 2)}" cy="${round(y + CELL / 2)}" r="1.15">${eat}</circle>`
          );
        }
      }
    }
  }

  // Pac-Man continuous motion path through cell centers
  const motion =
    "M" + fullPath.map(([w, d]) => `${round(cx(w))},${round(cy(d))}`).join(" L");

  // Corridor path line connecting cell centers
  const corridorLine =
    "M" + primaryTour.map(([w, d]) => `${round(cx(w))},${round(cy(d))}`).join(" L");

  // Algorithmic maze border and walls
  const maze = buildMaze(W, ROWS);

  // Independent ghost patrol paths across quadrants
  const pinkyMotion = `M ${round(cx(3))},${round(cy(1))} L ${round(cx(18))},${round(cy(1))} L ${round(cx(18))},${round(cy(3))} L ${round(cx(10))},${round(cy(3))} L ${round(cx(10))},${round(cy(5))} L ${round(cx(3))},${round(cy(5))} Z`;
  const inkyMotion = `M ${round(cx(20))},${round(cy(5))} L ${round(cx(36))},${round(cy(5))} L ${round(cx(36))},${round(cy(3))} L ${round(cx(28))},${round(cy(3))} L ${round(cx(28))},${round(cy(1))} L ${round(cx(20))},${round(cy(1))} Z`;
  const clydeMotion = `M ${round(cx(38))},${round(cy(1))} L ${round(cx(51))},${round(cy(1))} L ${round(cx(51))},${round(cy(3))} L ${round(cx(45))},${round(cy(3))} L ${round(cx(45))},${round(cy(5))} L ${round(cx(38))},${round(cy(5))} Z`;

  // Ghosts: Blinky (chases Pac-Man), Pinky (left), Inky (center), Clyde (right)
  const ghostBlinky = `<g class="ghost ghost-blinky">
    <path d="M -4,0.5 A 4,4 0 0,1 4,0.5 L 4,3.5 Q 2.7,2.2 1.3,3.5 Q 0,2.2 -1.3,3.5 Q -2.7,2.2 -4,3.5 Z" fill="var(--blinky)"/>
    <ellipse cx="-1.6" cy="-0.6" rx="1.3" ry="1.6" fill="#ffffff"/>
    <ellipse cx="1.6" cy="-0.6" rx="1.3" ry="1.6" fill="#ffffff"/>
    <circle cx="-1.1" cy="-0.6" r="0.7" fill="#1e3a8a"/>
    <circle cx="2.1" cy="-0.6" r="0.7" fill="#1e3a8a"/>
    <animateMotion dur="${dur}s" repeatCount="indefinite" path="${motion}" keyPoints="0;1" keyTimes="0;1" calcMode="linear" begin="-1.4s"/>
  </g>`;

  const ghostPinky = `<g class="ghost ghost-pinky">
    <path d="M -4,0.5 A 4,4 0 0,1 4,0.5 L 4,3.5 Q 2.7,2.2 1.3,3.5 Q 0,2.2 -1.3,3.5 Q -2.7,2.2 -4,3.5 Z" fill="var(--pinky)"/>
    <ellipse cx="-1.6" cy="-0.6" rx="1.3" ry="1.6" fill="#ffffff"/>
    <ellipse cx="1.6" cy="-0.6" rx="1.3" ry="1.6" fill="#ffffff"/>
    <circle cx="-1.1" cy="-0.6" r="0.7" fill="#1e3a8a"/>
    <circle cx="2.1" cy="-0.6" r="0.7" fill="#1e3a8a"/>
    <animateMotion dur="13s" repeatCount="indefinite" path="${pinkyMotion}" keyPoints="0;1" keyTimes="0;1" calcMode="linear"/>
  </g>`;

  const ghostInky = `<g class="ghost ghost-inky">
    <path d="M -4,0.5 A 4,4 0 0,1 4,0.5 L 4,3.5 Q 2.7,2.2 1.3,3.5 Q 0,2.2 -1.3,3.5 Q -2.7,2.2 -4,3.5 Z" fill="var(--inky)"/>
    <ellipse cx="-1.6" cy="-0.6" rx="1.3" ry="1.6" fill="#ffffff"/>
    <ellipse cx="1.6" cy="-0.6" rx="1.3" ry="1.6" fill="#ffffff"/>
    <circle cx="-1.1" cy="-0.6" r="0.7" fill="#1e3a8a"/>
    <circle cx="2.1" cy="-0.6" r="0.7" fill="#1e3a8a"/>
    <animateMotion dur="15s" repeatCount="indefinite" path="${inkyMotion}" keyPoints="0;1" keyTimes="0;1" calcMode="linear"/>
  </g>`;

  const ghostClyde = `<g class="ghost ghost-clyde">
    <path d="M -4,0.5 A 4,4 0 0,1 4,0.5 L 4,3.5 Q 2.7,2.2 1.3,3.5 Q 0,2.2 -1.3,3.5 Q -2.7,2.2 -4,3.5 Z" fill="var(--clyde)"/>
    <ellipse cx="-1.6" cy="-0.6" rx="1.3" ry="1.6" fill="#ffffff"/>
    <ellipse cx="1.6" cy="-0.6" rx="1.3" ry="1.6" fill="#ffffff"/>
    <circle cx="-1.1" cy="-0.6" r="0.7" fill="#1e3a8a"/>
    <circle cx="2.1" cy="-0.6" r="0.7" fill="#1e3a8a"/>
    <animateMotion dur="12s" repeatCount="indefinite" path="${clydeMotion}" keyPoints="0;1" keyTimes="0;1" calcMode="linear"/>
  </g>`;

  // Primary Pac-Man character with chomp animation and auto-rotation
  const pac = `<g class="pac">
    <path d="${pacPath(MOUTH_SHUT)}">
      <animate attributeName="d" dur="${CHOMP}s" repeatCount="indefinite"
        calcMode="spline" keyTimes="0;0.5;1" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"
        values="${pacPath(MOUTH_SHUT)};${pacPath(MOUTH_OPEN)};${pacPath(MOUTH_SHUT)}"/>
    </path>
    <animateMotion dur="${dur}s" repeatCount="indefinite" rotate="auto"
      path="${motion}" keyPoints="0;1" keyTimes="0;1" calcMode="linear"/>
  </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="sans-serif">
  <style>
    :root {
      --empty: #ebedf0;
      --l1: #9be9a8; --l2: #40c463; --l3: #30a14e; --l4: #216e39;
      --pac: #ffd93b;
      --pellet: #d97706;
      --maze: rgba(71, 85, 105, 0.75);
      --maze-path: rgba(100, 116, 139, 0.22);
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
        --maze: rgba(226, 232, 240, 0.75);
        --maze-path: rgba(255, 255, 255, 0.22);
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
    .pellet { fill: var(--pellet); }
    .power-pellet { fill: var(--pellet); opacity: 0.95; }
    .maze-border { stroke: var(--maze); stroke-width: 1.4; fill: none; }
    .maze-wall { stroke: var(--maze); stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; fill: none; }
    .maze-corridor { stroke: var(--maze-path); stroke-width: 1.2; stroke-linecap: round; stroke-linejoin: round; fill: none; }
    @media (prefers-reduced-motion: reduce) {
      .pac animateMotion, .ghost animateMotion, .pac animate, .power-pellet animate {
        animation: none !important;
      }
    }
  </style>
  <g class="layer-maze-border">${maze.border}</g>
  <g class="layer-maze-corridors"><path class="maze-corridor" d="${corridorLine}"/></g>
  <g class="layer-maze-walls">${maze.walls}</g>
  <g class="layer-empty-cells">${emptyCells.join("")}</g>
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
