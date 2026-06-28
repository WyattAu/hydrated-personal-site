import { createSignal } from 'solid-js';

// Module-level shared signal. EtfApp writes to it when the user selects
// an ETF. All quant components read from it to know which ticker to analyze.
const [activeTicker, setActiveTicker] = createSignal<string>('SPY');

export { activeTicker, setActiveTicker };
