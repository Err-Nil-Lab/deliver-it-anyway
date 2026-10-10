import { GAME_CONFIG } from "./config";
import { calculateDeliveryChance } from "./systems/risk";

// v2 shift state: package queue, parallel trucks, timed shift. Pure logic, no KAPLAY.

// Package tiers unlock with capacity upgrades. Each tier: small, medium, and a heavy jackpot that is
// only reachable by overloading at the start of that tier.
const PACKAGE_TIERS = [
  [
    { name: "TV", value: 40, load: 8 },
    { name: "SOFA", value: 100, load: 18 },
    { name: "FRIDGE", value: 220, load: 30 },
  ],
  [
    { name: "WASHER", value: 90, load: 14 },
    { name: "PIANO", value: 240, load: 26 },
    { name: "ARCADE", value: 520, load: 40 },
  ],
  [
    { name: "SAFE", value: 150, load: 20 },
    { name: "HOT TUB", value: 420, load: 40 },
    { name: "BOAT", value: 900, load: 60 },
  ],
  [
    { name: "SHED", value: 250, load: 30 },
    { name: "TRACTOR", value: 700, load: 55 },
    { name: "HOUSE", value: 1600, load: 85 },
  ],
] as const;

export function getPackageTier(upgrades: Upgrades): number {
  const tier = Math.floor(upgrades.capacity / GAME_CONFIG.shift.capacityLevelsPerTier);
  return Math.min(PACKAGE_TIERS.length - 1, tier);
}

export type UpgradeKey = "capacity" | "duration" | "spawn" | "trucks";
export type Upgrades = Record<UpgradeKey, number>;

export function createUpgrades(): Upgrades {
  return { capacity: 0, duration: 0, spawn: 0, trucks: 0 };
}

export function getUpgradeCost(upgrades: Upgrades, key: UpgradeKey): number | null {
  const def = GAME_CONFIG.upgrades[key];
  const level = upgrades[key];
  if (level >= def.maxLevel) return null;
  return Math.round(def.baseCost * def.costGrowth ** level);
}

/** Only valid on the report screen; spends wallet exactly once and raises the level by one. */
export function buyUpgrade(state: ShiftState, upgrades: Upgrades, key: UpgradeKey): boolean {
  const cost = getUpgradeCost(upgrades, key);
  if (state.phase !== "REPORT" || cost === null || state.wallet < cost) return false;

  state.wallet -= cost;
  upgrades[key] += 1;
  return true;
}

// `rarity` is the package's rank inside its tier: 0 common, 1 rare, 2 jackpot (heaviest, most valuable).
export type Package = { id: number; name: string; value: number; load: number; rarity: number };
export type TruckStatus = "LOADING" | "EN_ROUTE" | "RETURNING";
export type ShiftPhase = "RUNNING" | "ENDING" | "REPORT";
export type DeliveryOutcome = "SUCCESS" | "BUST";

export type Truck = {
  id: number;
  capacity: number;
  cargo: Package[];
  status: TruckStatus;
  lockedChance: number | null;
  lockedValue: number;
  lockedLoad: number;
  timeRemaining: number;
};

export type DeliveryLogEntry = {
  truckId: number;
  cargo: string[];
  value: number;
  load: number;
  chance: number;
  outcome: DeliveryOutcome;
  payout: number;
  repairCost: number;
  atSeconds: number;
};

export type ShiftState = {
  phase: ShiftPhase;
  wallet: number;
  timeRemaining: number;
  elapsed: number;
  tier: number;
  spawnInterval: number;
  spawnTimer: number;
  nextPackageId: number;
  spawnedCount: number;
  queue: Package[];
  trucks: Truck[];
  log: DeliveryLogEntry[];
};

function spawnPackage(state: ShiftState): void {
  const pool = PACKAGE_TIERS[state.tier];
  const rarity = state.spawnedCount % pool.length;
  state.queue.push({ id: state.nextPackageId, ...pool[rarity], rarity });
  state.nextPackageId += 1;
  state.spawnedCount += 1;
}

export function createShiftState(wallet = 0, upgrades: Upgrades = createUpgrades()): ShiftState {
  const { shift, upgrades: defs } = GAME_CONFIG;
  const spawnInterval = Math.max(
    1,
    shift.spawnIntervalSeconds - upgrades.spawn * defs.spawn.perLevel,
  );
  const truckCount = shift.truckCount + upgrades.trucks * defs.trucks.perLevel;
  const capacity = shift.truckCapacity + upgrades.capacity * defs.capacity.perLevel;
  const state: ShiftState = {
    phase: "RUNNING",
    wallet,
    timeRemaining: shift.durationSeconds + upgrades.duration * defs.duration.perLevel,
    elapsed: 0,
    tier: getPackageTier(upgrades),
    spawnInterval,
    spawnTimer: spawnInterval,
    nextPackageId: 1,
    spawnedCount: 0,
    queue: [],
    trucks: Array.from({ length: truckCount }, (_, id) => ({
      id,
      capacity,
      cargo: [],
      status: "LOADING" as const,
      lockedChance: null,
      lockedValue: 0,
      lockedLoad: 0,
      timeRemaining: 0,
    })),
    log: [],
  };

  for (let i = 0; i < shift.initialPackages; i += 1) {
    spawnPackage(state);
  }

  return state;
}

export function getTruckLoad(truck: Truck): number {
  return truck.cargo.reduce((sum, item) => sum + item.load, 0);
}

export function getTruckValue(truck: Truck): number {
  return truck.cargo.reduce((sum, item) => sum + item.value, 0);
}

export function getTruckChance(truck: Truck): number {
  return calculateDeliveryChance(getTruckLoad(truck), truck.capacity);
}

function findTruck(state: ShiftState, truckId: number): Truck | undefined {
  return state.trucks.find((truck) => truck.id === truckId);
}

function canLoad(state: ShiftState, truck: Truck | undefined): truck is Truck {
  return state.phase === "RUNNING" && truck !== undefined && truck.status === "LOADING";
}

export function loadPackage(state: ShiftState, truckId: number, packageId: number): boolean {
  const truck = findTruck(state, truckId);
  const index = state.queue.findIndex((item) => item.id === packageId);

  if (!canLoad(state, truck) || index < 0) return false;

  truck.cargo.push(state.queue.splice(index, 1)[0]);
  return true;
}

export function unloadPackage(state: ShiftState, truckId: number, packageId: number): boolean {
  const truck = findTruck(state, truckId);
  const index = truck ? truck.cargo.findIndex((item) => item.id === packageId) : -1;

  if (!canLoad(state, truck) || index < 0) return false;

  state.queue.push(truck.cargo.splice(index, 1)[0]);
  return true;
}

export function deliver(state: ShiftState, truckId: number): boolean {
  const truck = findTruck(state, truckId);

  if (!canLoad(state, truck) || truck.cargo.length === 0) return false;

  truck.lockedChance = getTruckChance(truck);
  truck.lockedValue = getTruckValue(truck);
  truck.lockedLoad = getTruckLoad(truck);
  truck.status = "EN_ROUTE";
  truck.timeRemaining = GAME_CONFIG.shift.routeSeconds;
  return true;
}

function resolveTruck(state: ShiftState, truck: Truck, roll: number): void {
  const chance = truck.lockedChance ?? 0;
  const outcome: DeliveryOutcome = roll * 100 < chance ? "SUCCESS" : "BUST";
  const payout = outcome === "SUCCESS" ? truck.lockedValue : 0;
  const { repairShare, repairMin } = GAME_CONFIG.shift;
  const repairCost = outcome === "BUST" ? Math.max(repairMin, Math.round(truck.lockedValue * repairShare)) : 0;

  state.wallet += payout - repairCost;
  state.log.push({
    truckId: truck.id,
    cargo: truck.cargo.map((item) => item.name),
    value: truck.lockedValue,
    load: truck.lockedLoad,
    chance,
    outcome,
    payout,
    repairCost,
    atSeconds: state.elapsed,
  });

  truck.cargo = [];
  truck.lockedChance = null;
  truck.lockedValue = 0;
  truck.lockedLoad = 0;

  if (outcome === "BUST") {
    truck.status = "RETURNING";
    truck.timeRemaining = GAME_CONFIG.shift.bustDowntimeSeconds;
  } else {
    truck.status = "LOADING";
    truck.timeRemaining = 0;
  }
}

/** Advance the shift by `dt` seconds. `random` supplies one roll in [0, 1) per resolved delivery. */
export function tickShift(state: ShiftState, dt: number, random: () => number = Math.random): void {
  if (state.phase === "REPORT" || dt <= 0) return;

  state.elapsed += dt;

  if (state.phase === "RUNNING") {
    state.timeRemaining = Math.max(0, state.timeRemaining - dt);
    state.spawnTimer -= dt;

    while (state.spawnTimer <= 0) {
      state.spawnTimer += state.spawnInterval;
      if (state.queue.length < GAME_CONFIG.shift.maxQueue) spawnPackage(state);
    }
  }

  for (const truck of state.trucks) {
    if (truck.status === "LOADING") continue;

    truck.timeRemaining = Math.max(0, truck.timeRemaining - dt);
    if (truck.timeRemaining > 0) continue;

    if (truck.status === "EN_ROUTE") {
      resolveTruck(state, truck, random());
    } else {
      truck.status = "LOADING";
    }
  }

  if (state.phase === "RUNNING" && state.timeRemaining <= 0) {
    state.phase = "ENDING";
  }

  if (state.phase === "ENDING" && state.trucks.every((truck) => truck.status !== "EN_ROUTE")) {
    state.phase = "REPORT";
  }
}
