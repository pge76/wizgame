export interface GridCell {
  terrainId: string;
  occupantEntityId: number | null;
}

export function createEmptyCell(terrainId: string): GridCell {
  return { terrainId, occupantEntityId: null };
}
