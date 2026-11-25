// Контур или линия: координаты подряд [x0, z0, x1, z1, …], метры
export type Flat = number[];

export type BuildingKind = 'main' | 'campus' | 'city';
export type MainPart = 'center' | 'west' | 'east' | 'north';

export type Building = { kind: BuildingKind; part?: MainPart; levels: number; points: Flat };
export type Pitch = { sport: string; points: Flat };
export type Road = { width: number; walk: boolean; points: Flat };
export type Green = { trees: boolean; points: Flat };

export type CampusData = {
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  // Ограда территории: за неё мир не продолжается
  fence: Flat;
  buildings: Building[];
  pitches: Pitch[];
  roads: Road[];
  greens: Green[];
  treeRows: Flat[];
};

export type Vec2 = { x: number; z: number };
