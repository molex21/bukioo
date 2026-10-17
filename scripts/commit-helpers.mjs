import { createHash } from "node:crypto";

export function localDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new Error("Fecha inválida.");
  }
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

export function commitMessage(description, date = new Date()) {
  const value = description.trim();
  if (!value || /[\r\n\x00-\x1f\x7f]/.test(value)) {
    throw new Error("La descripción debe tener una sola línea y no estar vacía.");
  }
  return `${localDate(date)} ${value} (A)`;
}

export function stagedPaths(output) {
  return output.split("\0").filter(Boolean);
}

export function prohibitedEnvironmentFiles(paths) {
  return paths.filter((path) => {
    const name = path.replaceAll("\\", "/").split("/").at(-1);
    return /^\.env(?:\..*)?$/i.test(name) && name.toLowerCase() !== ".env.example";
  });
}

export function fingerprint(diff) {
  return createHash("sha256").update(diff).digest("hex");
}

export function cleanGeneratedDescription(output) {
  return output.split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("```"))
    ?.replace(/^["'`]+|["'`]+$/g, "")
    .trim() ?? "";
}
