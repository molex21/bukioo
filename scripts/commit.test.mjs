import assert from "node:assert/strict";
import test from "node:test";
import {
  cleanGeneratedDescription,
  commitMessage,
  fingerprint,
  localDate,
  prohibitedEnvironmentFiles,
  stagedPaths,
} from "./commit-helpers.mjs";

test("usa fecha local con día y mes de dos cifras", () => {
  assert.equal(localDate(new Date(2026, 0, 3)), "03/01/2026");
  assert.throws(() => localDate(new Date("invalid")), /Fecha inválida/);
});

test("construye el formato acordado con inicial fija", () => {
  assert.equal(commitMessage("  Añadir agenda  ", new Date(2026, 9, 17)), "17/10/2026 Añadir agenda (A)");
});

test("rechaza descripciones vacías, multilínea o con controles", () => {
  for (const text of [" ", "primera\nsegunda", "a\tb"]) {
    assert.throws(() => commitMessage(text), /una sola línea/);
  }
});

test("analiza nombres preparados separados por NUL", () => {
  assert.deepEqual(stagedPaths("a b.ts\0carpeta/á.ts\0"), ["a b.ts", "carpeta/á.ts"]);
  assert.deepEqual(stagedPaths(""), []);
});

test("bloquea archivos de entorno reales y permite el ejemplo explícito", () => {
  assert.deepEqual(prohibitedEnvironmentFiles([".env", "backend/.env.production", "frontend/.env.example", "x/ENV.txt"]), [".env", "backend/.env.production"]);
});

test("detecta si cambia el contenido preparado", () => {
  assert.equal(fingerprint("cambio"), fingerprint("cambio"));
  assert.notEqual(fingerprint("cambio"), fingerprint("otro cambio"));
});

test("extrae la descripción generada sin cercas ni comillas", () => {
  assert.equal(cleanGeneratedDescription("```\n\"Actualizar pruebas\"\n```"), "Actualizar pruebas");
  assert.equal(cleanGeneratedDescription(""), "");
});
