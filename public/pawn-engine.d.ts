export type Direction = "south" | "south-west" | "west" | "north-west" | "north" | "north-east" | "east" | "south-east";
export type AnimationState = "idle" | "walk";
export type Expression = "happy" | "neutral" | "excited" | "sleepy" | "surprised";
export type HairStyle = "bald" | "short" | "sidepart" | "pixie" | "bob" | "long" | "wavy" | "curly" | "bun" | "ponytail" | "braid" | "undercut" | "mohawk" | "spiky";
export type Outfit = "tunic" | "sweater" | "hoodie" | "cardigan" | "dress" | "overalls" | "robe" | "armor" | "chainmail" | "monk" | "ranger" | "tabard";
export type Hat = "none" | "beanie" | "beret" | "fedora" | "sunhat" | "hood" | "helmet" | "greathelm" | "wizard" | "rangerhood" | "circlet" | "flower" | "bow" | "laurel" | "crown" | "goggles" | "bandana";
export type Bag = "none" | "shoulder" | "backpack" | "pouch" | "tote";
export type BackEquipment = "none" | "quiver" | "sword" | "shield" | "staff" | "bow" | "lute";
export type BeltEquipment = "none" | "sword" | "dagger" | "potions" | "scroll" | "book";
export type ClassPreset = "warrior" | "knight" | "monk" | "archer" | "ranger" | "mage" | "cleric" | "rogue" | "bard";
export interface PawnColors { skin: string; hair: string; clothes: string; accent: string; bag: string; metal: string }
export interface PawnProportions { height: number; head: number; width: number }
export interface PawnAppearance {
  version: 2;
  hair: HairStyle;
  outfit: Outfit;
  hat: Hat;
  bag: Bag;
  back: BackEquipment;
  belt: BeltEquipment;
  colors: PawnColors;
  proportions: PawnProportions;
}
export type AppearanceInput = Partial<Omit<PawnAppearance, "colors" | "proportions">> & {
  colors?: Partial<PawnColors>;
  proportions?: Partial<PawnProportions>;
};
export type FrozenAppearance = Readonly<Omit<PawnAppearance, "colors" | "proportions">> & {
  readonly colors: Readonly<PawnColors>;
  readonly proportions: Readonly<PawnProportions>;
};
export const DIRECTIONS: readonly Direction[];
export const STATES: readonly AnimationState[];
export const EXPRESSIONS: readonly Expression[];
export const ANIMATION: Readonly<Record<AnimationState, Readonly<{ frames: number; fps: number }>>>;
export const PAWN_OUTLINE: "#000000";
export const PAWN_PALETTE: readonly Readonly<{ name: string; color: string }>[];
export const PAWN_DEFAULTS: Readonly<PawnAppearance>;
export const PAWN_OPTIONS: Readonly<{
  hair: readonly HairStyle[]; outfit: readonly Outfit[]; hat: readonly Hat[];
  bag: readonly Bag[]; back: readonly BackEquipment[]; belt: readonly BeltEquipment[];
}>;
export const CLASS_PRESETS: Readonly<Record<ClassPreset, AppearanceInput>>;
export function nearestPaletteColor(value: string): string;
export function normalizeAppearance(input?: AppearanceInput): PawnAppearance;
export function directionFromVector(x: number, y: number, fallback?: Direction): Direction;
export function frameIndex(state: AnimationState, progress?: number): number;

declare const preparedPawn: unique symbol;
/** Opaque, immutable handle owned by the renderer that prepared it. */
export interface PreparedPawn {
  readonly appearance: FrozenAppearance;
  readonly [preparedPawn]: true;
}
export interface RenderOptions {
  x: number; y: number;
  direction?: Direction;
  state?: AnimationState;
  /** Animation cycle fraction. Values above one wrap. */
  progress?: number;
  expression?: Expression;
  lift?: number;
  shadow?: boolean;
}
export interface PawnLayout {
  index: number; side: number; rear: boolean;
  bodyX: number; bodyY: number; bodyWidth: number;
  headX: number; headY: number; headScale: number; topY: number;
  heldX: number; heldY: number; propScale: number;
  floorX: number; floorY: number; lift: number;
  shadowScaleX: number; shadowScaleY: number;
}
export interface RendererOptions { maxCacheBytes?: number }
export interface WarmOptions {
  budgetMs?: number;
  signal?: AbortSignal;
  onProgress?: (progress: { completed: number; total: number }) => void;
}
export interface WarmRequest { pawn: PreparedPawn; directions?: Iterable<Direction> }
export interface RendererStats {
  bytes: number; maxBytes: number; pages: number; poses: number;
  faceSheets: number; faceSprites: number; looks: number;
  builds: number; faceBuilds: number; hits: number; misses: number;
  evictions: number; preparations: number; capacity: number;
  layoutBuilds: number; layoutHits: number;
}
export interface PawnRenderer {
  prepare(input?: AppearanceInput): PreparedPawn;
  layout(pawn: PreparedPawn, options: RenderOptions): PawnLayout;
  layout<T extends object>(pawn: PreparedPawn, options: RenderOptions, out: T): T & PawnLayout;
  draw(context: CanvasRenderingContext2D, pawn: PreparedPawn, options: RenderOptions): void;
  warm(requests: Iterable<WarmRequest>, options?: WarmOptions): Promise<RendererStats>;
  release(pawn: PreparedPawn): void;
  clear(): void;
  dispose(): void;
  stats(): RendererStats;
}
export function createPawnRenderer(options?: RendererOptions): PawnRenderer;
export interface AtlasOptions { scale?: 1 | 2; expression?: Expression }
export interface FrameRect { x: number; y: number; width: number; height: number }
export interface AtlasMetadata {
  version: 2; appearance: PawnAppearance; expression: Expression;
  width: number; height: number; frameWidth: number; frameHeight: number;
  columns: 12; rows: 8; directions: readonly Direction[];
  animations: typeof ANIMATION;
  footAnchor: { x: number; y: number };
  collisionRadius: number;
  frames: Record<Direction, Record<AnimationState, FrameRect[]>>;
}
export function createAtlas(input?: AppearanceInput, options?: AtlasOptions): HTMLCanvasElement;
export function atlasMetadata(input?: AppearanceInput, options?: AtlasOptions): AtlasMetadata;
