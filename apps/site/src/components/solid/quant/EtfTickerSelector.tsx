import { For, createSignal } from 'solid-js';

const TICKERS = [
  'SPY',
  'QQQ',
  'VTI',
  'IWM',
  'GLD',
  'TLT',
  'EEM',
  'VWO',
  'XLF',
  'XLK',
  'XLV',
  'XLE',
  'ARKK',
  'SMH',
  'XLI',
  'HYG',
];

export function useTickerSelector(initial = 'SPY') {
  const [ticker, setTicker] = createSignal(initial);
  return { ticker, setTicker };
}

export default function TickerSelector(props: {
  ticker: () => string;
  setTicker: (t: string) => void;
}) {
  return (
    <select
      class="font-mono text-[10px] px-2 py-1 border"
      style={{
        'border-color': 'var(--border)',
        background: 'var(--bg-card)',
        color: 'var(--accent)',
      }}
      onChange={(e) => props.setTicker(e.currentTarget.value)}
    >
      <For each={TICKERS}>
        {(t) => (
          <option value={t} selected={props.ticker() === t}>
            {t}
          </option>
        )}
      </For>
    </select>
  );
}
