export function playtimeLabel(minutes: number) {
  if (minutes === 0) return "No playtime";
  if (minutes < 60) return `${minutes} min played`;

  const hours = minutes / 60;
  return `${new Intl.NumberFormat("en", {
    maximumFractionDigits: hours < 10 ? 1 : 0,
  }).format(hours)} hr played`;
}
