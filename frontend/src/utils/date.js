export function dateKey(date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export function formatStoredDate(date) {
  if (!date) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : date;
}

export function toIsoDate(date) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date || "");
  return match ? `${match[3]}-${match[2]}-${match[1]}` : "";
}
