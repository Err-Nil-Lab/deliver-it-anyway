import { GAME_CONFIG } from "../config";

/** 100% up to capacity; then loses `overloadPenaltyPerPercent` points per 1% of capacity exceeded. */
export function calculateDeliveryChance(load: number, capacity: number): number {
  const overloadPercent = (Math.max(0, load - capacity) / capacity) * 100;
  const chance = Math.round(100 - overloadPercent * GAME_CONFIG.risk.overloadPenaltyPerPercent);

  return Math.max(GAME_CONFIG.risk.minimumDeliveryChance, chance);
}
