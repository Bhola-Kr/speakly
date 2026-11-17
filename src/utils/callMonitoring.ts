export function matchesCallDate(timestamp: number, query: string) {
  if (!query.trim()) return true;
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return false;
  const pad = (value: number) => String(value).padStart(2, '0');
  const local = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return (
    local.includes(query.trim()) ||
    date
      .toLocaleString('en-IN')
      .toLowerCase()
      .includes(query.trim().toLowerCase())
  );
}
