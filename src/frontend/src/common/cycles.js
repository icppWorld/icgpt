// Cycles formatting + the cycles→USD conversion, shared by the live StatsBar and the
// Prompt Cost Lab report. cycles are exact in-canister measurements; the USD rate is
// the same one shown in the stats bar (~1 XDR / 1T cycles, 1 XDR ~ $1.33).
export const USD_PER_TRILLION_CYCLES = 1.33

export function formatCycles(cycles) {
  if (cycles >= 1e12) return `${(cycles / 1e12).toFixed(3)}T`
  if (cycles >= 1e9) return `${(cycles / 1e9).toFixed(2)}B`
  if (cycles >= 1e6) return `${(cycles / 1e6).toFixed(1)}M`
  if (cycles >= 1e3) return `${(cycles / 1e3).toFixed(0)}K`
  return `${Math.round(cycles)}`
}

export function usd(cycles) {
  return (cycles / 1e12) * USD_PER_TRILLION_CYCLES
}
