export interface GridConfig {
  columns: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
  worldWidth: number;
  worldHeight: number;
}

export function getGridConfig(): GridConfig {
  const width = window.innerWidth;

  const isMobile = width < 768;

  const rows = 20;

  if (isMobile) {
    const columns = 12;

    // ให้ 12 ช่องเต็มความกว้างมือถือ
    const cellWidth = width / columns;
    const cellHeight = 60;

    return {
      columns,
      rows,
      cellWidth,
      cellHeight,
      worldWidth: width,
      worldHeight: rows * cellHeight,
    };
  }

  // PC
  const cellWidth = 60;
  const columns = Math.max(
    12,
    Math.floor(width / cellWidth)
  );

  const cellHeight = 60;

  return {
    columns,
    rows,
    cellWidth,
    cellHeight,
    worldWidth: columns * cellWidth,
    worldHeight: rows * cellHeight,
  };
}