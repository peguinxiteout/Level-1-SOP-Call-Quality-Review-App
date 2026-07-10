export function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatPercent(value: unknown): string {
  return `${toNumber(value).toFixed(1)}%`;
}

export function formatNumber(value: unknown, decimals = 1): string {
  return toNumber(value).toFixed(decimals);
}

export function formatDuration(secondsValue: unknown): string {
  const seconds = toNumber(secondsValue);

  if (seconds <= 0) {
    return '0 sec';
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);

  if (minutes <= 0) {
    return `${remainingSeconds} sec`;
  }

  return `${minutes} min ${remainingSeconds} sec`;
}