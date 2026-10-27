function rgb(hex: string): number[] | null {
  return /^#[0-9a-f]{6}$/i.test(hex)
    ? [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16))
    : null;
}
const luminance = (channels: number[]) =>
  channels
    .map((value) => {
      const s = value / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    })
    .reduce(
      (sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index],
      0,
    );
export function employeeColorContrast(
  hex: string,
  dark: boolean,
): number | null {
  const color = rgb(hex);
  if (!color) return null;
  const background = color.map(
    (value) => value * 0.12 + (dark ? 36 : 255) * 0.88,
  );
  const a = luminance(color),
    b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
export function improvedEmployeeColor(hex: string, dark: boolean): string {
  const color = rgb(hex);
  if (!color) return hex;
  for (let step = 1; step <= 100; step++) {
    const candidate =
      "#" +
      color
        .map((channel) =>
          Math.round(channel + (((dark ? 255 : 0) - channel) * step) / 100)
            .toString(16)
            .padStart(2, "0"),
        )
        .join("");
    if ((employeeColorContrast(candidate, dark) ?? 0) >= 4.5) return candidate;
  }
  return hex;
}
