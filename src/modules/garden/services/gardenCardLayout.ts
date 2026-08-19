export const CARD_WIDTH = 960;
export const CARD_HEIGHT = 540;

export interface CellRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SpriteDest {
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

/**
 * Measured dirt patches on garden_bg.png (960x540).
 * Row 0 = back (fence), row 2 = front. Each col is [x0, x1].
 */
const ROWS: { y: number; h: number; cols: [number, number][] }[] = [
  {
    y: 300,
    h: 44,
    cols: [
      [230, 313],
      [349, 428],
      [463, 545],
      [581, 661],
      [698, 780],
    ],
  },
  {
    y: 352,
    h: 50,
    cols: [
      [188, 301],
      [321, 424],
      [443, 547],
      [562, 666],
      [684, 795],
    ],
  },
  {
    y: 412,
    h: 50,
    cols: [
      [186, 281],
      [321, 411],
      [453, 550],
      [590, 685],
      [726, 816],
    ],
  },
];

export function gridCell(col: number, row: number): CellRect {
  const band = ROWS[row];
  const span = band?.cols[col];
  if (!band || !span) {
    return { x: 0, y: 0, w: 0, h: 0 };
  }
  const insetX = (span[1] - span[0]) * 0.04;
  const insetY = band.h * 0.06;
  return {
    x: span[0] + insetX,
    y: band.y + insetY,
    w: span[1] - span[0] - insetX * 2,
    h: band.h - insetY * 2,
  };
}

/**
 * Player plots: front two rows, center three columns.
 * Slots 0-2 = front row left→right, 3-5 = mid row left→right.
 */
export const SLOT_TO_GRID: { col: number; row: number }[] = [
  { col: 1, row: 2 },
  { col: 2, row: 2 },
  { col: 3, row: 2 },
  { col: 1, row: 1 },
  { col: 2, row: 1 },
  { col: 3, row: 1 },
];

export function cellForSlot(slot: number): CellRect | null {
  const mapped = SLOT_TO_GRID[slot];
  if (!mapped) {
    return null;
  }
  return gridCell(mapped.col, mapped.row);
}

export function fitSpriteToCell(
  contentW: number,
  contentH: number,
  cell: CellRect,
): SpriteDest {
  const innerW = cell.w * 1.12;
  const aspect = contentH / Math.max(1, contentW);
  let scale = innerW / contentW;
  const maxH = aspect <= 1.12 ? cell.h * 1.35 : cell.h * 2.15;
  if (contentH * scale > maxH) {
    scale = maxH / contentH;
  }
  const dw = contentW * scale;
  const dh = contentH * scale;
  const dx = cell.x + (cell.w - dw) / 2;

  if (aspect <= 1.12) {
    return {
      dx,
      dy: cell.y + (cell.h - dh) / 2,
      dw,
      dh,
    };
  }

  const ground = cell.y + cell.h * 0.94;
  return {
    dx,
    dy: ground - dh,
    dw,
    dh,
  };
}

export function drawOrderForSlots(slots: number[]): number[] {
  return [...slots].sort((left, right) => {
    const leftRow = SLOT_TO_GRID[left]?.row ?? 0;
    const rightRow = SLOT_TO_GRID[right]?.row ?? 0;
    if (leftRow !== rightRow) {
      return leftRow - rightRow;
    }
    return left - right;
  });
}
