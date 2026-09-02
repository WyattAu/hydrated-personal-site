import { getPlychart } from './plychart-loader';

/**
 * Create a plychart chart and render data to it.
 * Handles init, create, and update in one call.
 */
export async function renderChart(
  canvasId: string,
  width: number,
  height: number,
  updateFn: string,
  dataJson: string,
  ...extraArgs: string[]
) {
  const p = await getPlychart();
  p.create_chart(canvasId, width, height);
  const fn = (p as Record<string, Function>)[updateFn];
  if (fn) {
    fn(canvasId, dataJson, ...extraArgs);
  }
}

/**
 * Destroy a plychart chart.
 */
export async function destroyChart(canvasId: string) {
  const p = await getPlychart();
  p.destroy_chart(canvasId);
}
