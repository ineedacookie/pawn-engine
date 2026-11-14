import type {
  AppearanceInput, Direction, Expression, FrozenAppearance, PawnLayout,
  RendererOptions, RendererStats, WarmOptions, WarmRequest,
} from "./pawn-engine.js";

export type CharacterAction = "idle" | "browse" | "wait" | "hold-cards" | "play-card" | "shuffle" | "open-pack" | "pay" | "trade" | "carry-bag" | "restock" | "clean" | "judge" | "inspect" | "celebrate";
export type Reaction = "happy" | "love" | "angry" | "confused" | "idea" | "waiting" | "sale" | "win" | "sad" | "surprised" | "talk" | "fresh";
export type Posture = "standing" | "seated";
export const REACTIONS: readonly Reaction[];
export const CHARACTER_ACTIONS: Readonly<Record<CharacterAction, Readonly<{ label: string; duration: number; next: CharacterAction }>>>;
export interface TableProjection { a: number; b: number; c: number; d: number }
export interface ActionTarget { x: number; y: number; projection?: TableProjection | null }
export interface ActionOptions { cardCount?: number; target?: ActionTarget | null }
export interface CharacterOptions {
  x?: number; y?: number; direction?: Direction; posture?: Posture; cardCount?: number;
  onActionComplete?: ((action: CharacterAction, character: PawnCharacter, target: ActionTarget | null) => void) | null;
}
export interface CharacterStats extends RendererStats { effectBytes: number; effectBuilds: number; characters: number }
export interface CharacterWarmOptions extends WarmOptions { directions?: Iterable<Direction> }
export interface PawnCharacters {
  create(appearance?: AppearanceInput, options?: CharacterOptions): PawnCharacter;
  warm(characters: Iterable<PawnCharacter>, options?: CharacterWarmOptions): Promise<CharacterStats>;
  stats(): CharacterStats;
  dispose(): void;
}
/** Presentation only; movement, inventory, collision and rules belong to the game. */
export class PawnCharacter {
  constructor(cast: PawnCharacters, appearance?: AppearanceInput, options?: CharacterOptions);
  x: number; y: number; direction: Direction; expression: Expression;
  posture: Posture; cardCount: number; stinky: boolean; visible: boolean;
  readonly action: CharacterAction;
  readonly appearance: FrozenAppearance;
  readonly actionProgress: number;
  readonly reaction: Reaction | null;
  readonly displayExpression: Expression;
  onActionComplete: CharacterOptions["onActionComplete"];
  setAppearance(appearance: AppearanceInput): this;
  face(direction: Direction): this;
  teleport(x: number, y: number): this;
  setPosture(posture: Posture): this;
  setStatus(status: "stinky", enabled: boolean): this;
  act(action: CharacterAction, options?: ActionOptions): this;
  react(kind: Reaction, options?: { duration?: number }): this;
  clearReaction(): this;
  /** Seconds plus actual screen-pixel displacement after game collision. */
  update(seconds: number, dx?: number, dy?: number): this;
  /** The default output is reused. Supply an object to retain a snapshot. */
  layout(): PawnLayout;
  layout<T extends object>(out: T): T & PawnLayout;
  draw(context: CanvasRenderingContext2D, options?: { foreground?: boolean }): void;
  drawForeground(context: CanvasRenderingContext2D): void;
  drawOverhead(context: CanvasRenderingContext2D): void;
  warmRequest(directions?: Iterable<Direction>): WarmRequest;
  dispose(): void;
}
export function createPawnCharacters(options?: RendererOptions): PawnCharacters;
