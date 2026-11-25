export const VIEW_W = 640;
export const VIEW_H = 360;
export const TILE_SIZE = 16; // World simulation unit per tile
export const PIXEL_SCALE = 1.5; // Hi-Bit screen pixels per simulation unit
export const TILE_PX = 24; // TILE_SIZE * PIXEL_SCALE (native rendered tile size)
export const WORLD_VIEW_W = VIEW_W / PIXEL_SCALE; // 426.6667 world units
export const WORLD_VIEW_H = VIEW_H / PIXEL_SCALE; // 240 world units
export const FIXED_DT = 1 / 60;

// Movement & Physics tuned for snappy Dead Cells feel
export const GRAVITY = 880;
export const MAX_FALL_SPEED = 420;
export const WALL_SLIDE_SPEED = 62;
export const COYOTE_TIME = 0.10;
export const JUMP_BUFFER_TIME = 0.12;
export const ATTACK_BUFFER_TIME = 0.16;
export const DROP_THROUGH_TIME = 0.18;

// Combat & Juice
export const DEFAULT_HITSTOP = 0.045;
export const CRIT_HITSTOP = 0.075;
export const PARRY_HITSTOP = 0.095;
export const RALLY_DECAY_DELAY = 0.85;
export const RALLY_DECAY_RATE = 38;

// Persistence
export const SAVE_STORAGE_KEY = 'masoul_save_v1';
export const MAX_CURSE_TIER = 3;
