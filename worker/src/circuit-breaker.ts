export interface CircuitState {
  failures: number;
  lastFailure: number;
  open: boolean;
}

const circuits = new Map<string, CircuitState>();

export function isCircuitOpen(endpoint: string): boolean {
  const state = circuits.get(endpoint);
  if (!state || !state.open) return false;
  if (Date.now() - state.lastFailure > 30_000) {
    state.open = false;
    state.failures = 0;
    return false;
  }
  return true;
}

export function recordFailure(endpoint: string): void {
  const state = circuits.get(endpoint) || { failures: 0, lastFailure: 0, open: false };
  state.failures++;
  state.lastFailure = Date.now();
  if (state.failures >= 3) state.open = true;
  circuits.set(endpoint, state);
}

export function recordSuccess(endpoint: string): void {
  const state = circuits.get(endpoint);
  if (state) {
    state.failures = 0;
    state.open = false;
  }
}

export function getCircuitStates(): Map<string, CircuitState> {
  return circuits;
}
