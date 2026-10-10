export const GAME_CONFIG = {
  arena: {
    width: 800,
    height: 800,
    borderSize: 12,
    floorHeight: 56,
  },
  colors: {
    background: "#050505",
    foreground: "#f2f2f2",
    muted: "#858585",
    // Darker than muted so it keeps 4.5:1 contrast on the light footer.
    footer: "#6e6e6e",
    // Status accents (terminal-style). Used only for small state cues, never for fills of large areas.
    danger: "#ff5555",
    safe: "#50fa7b",
    caution: "#f1fa8c",
  },
  ui: {
    frameWidth: 2,
    // Type scale: key numbers, body labels, secondary text.
    text: { key: 28, body: 18, small: 14 },
  },
  risk: {
    // Chance tiers for accent color: >= safeAt is safe, >= cautionAt is caution, otherwise danger.
    safeAt: 100,
    cautionAt: 60,
    // Chance points lost per 1% of capacity exceeded (ratio-based so it scales with capacity upgrades).
    overloadPenaltyPerPercent: 0.8,
    minimumDeliveryChance: 5,
  },
  // v2 shift rules (test values, not design decisions; see GDD.md section 4)
  shift: {
    durationSeconds: 45,
    truckCount: 2,
    truckCapacity: 20,
    initialPackages: 5,
    spawnIntervalSeconds: 6,
    maxQueue: 8,
    routeSeconds: 8,
    bustDowntimeSeconds: 12,
    // A bust costs max(repairMin, repairShare * lost cargo value). Wallet may go negative (debt).
    repairShare: 0.4,
    repairMin: 40,
    // New package tier unlocks every N capacity upgrade levels.
    capacityLevelsPerTier: 3,
  },
  // Shift report upgrades (test values). Cost for the next level = baseCost * costGrowth ^ currentLevel.
  upgrades: {
    capacity: { label: "CAPACITY", baseCost: 200, costGrowth: 1.65, maxLevel: 12, perLevel: 2 },
    duration: { label: "SHIFT TIME", baseCost: 250, costGrowth: 1.65, maxLevel: 6, perLevel: 6 },
    spawn: { label: "SPAWN RATE", baseCost: 300, costGrowth: 1.75, maxLevel: 4, perLevel: 1 },
    trucks: { label: "EXTRA TRUCK", baseCost: 5000, costGrowth: 2, maxLevel: 1, perLevel: 1 },
  },
  juice: {
    soundEnabled: true,
    cargoDropSeconds: 0.22,
    bigPayout: 200,
    overlaySeconds: 0.9,
    dispatchShake: 3,
    successShake: 4,
    bustShake: 12,
    upgradeShake: 6,
  },
} as const;
