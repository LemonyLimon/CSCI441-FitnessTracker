export type UnitSystem = 'standard' | 'metric';

const LB_TO_KG = 0.45359237;

/** Resolve API display unit system from user preference flag. */
export function unitSystemFromStandardUnits(
  standardUnits: boolean,
): UnitSystem {
  return standardUnits ? 'standard' : 'metric';
}

/** Convert stored pounds to display weight in user unit system. */
export function poundsToDisplayWeight(
  pounds: number | null,
  unitSystem: UnitSystem,
): number | null {
  if (pounds == null) return null;
  if (unitSystem === 'standard') return round2(pounds);
  return round2(pounds * LB_TO_KG);
}

/** Convert user display weight input into stored pounds. */
export function displayWeightToPounds(
  value: number,
  unitSystem: UnitSystem,
): number {
  if (unitSystem === 'standard') return round2(value);
  return round2(value / LB_TO_KG);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
