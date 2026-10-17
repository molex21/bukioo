import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const script = fileURLToPath(new URL("./commit.mjs", import.meta.url));
const windows = process.platform === "win32";

function git(cwd, args, allowFailure = false) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.error) throw result.error;
  if (!allowFailure && result.status !== 0) throw new Error(result.stderr);
  return result;
}

function fixture(t) {
  const base = resolve(tmpdir());
  const root = mkdtempSync(join(base, "bukioo-commit-test-"));
  t.after(() => {
    const target = resolve(root);
    if (!target.startsWith(`${base}${sep}`) || !target.slice(base.length + 1).startsWith("bukioo-commit-test-")) {
      throw new Error("Ruta temporal de prueba no válida");
    }
    rmSync(target, { recursive: true, force: true });
  });
  const repo = join(root, "repo");
  const bin = join(root, "bin");
  mkdirSync(repo);
  mkdirSync(bin);
  git(repo, ["init", "-q"]);
  git(repo, ["config", "user.name", "Pruebas BUKIOO"]);
  git(repo, ["config", "user.email", "test@example.invalid"]);
  git(repo, ["config", "commit.gpgsign", "false"]);
  const fakeNpm = join(bin, windows ? "npm.cmd" : "npm");
  writeFileSync(fakeNpm, windows ? "@echo off\r\nexit /b 0\r\n" : "#!/bin/sh\nexit 0\n");
  if (!windows) chmodSync(fakeNpm, 0o755);
  return { root, repo, env: { ...process.env, PATH: `${bin}${delimiter}${process.env.PATH}` } };
}

function runInteractive(repo, env, steps = []) {
  return new Promise((resolveResult, reject) => {
    const child = spawn(process.execPath, [script], { cwd: repo, env, stdio: ["pipe", "pipe", "pipe"] });
    let output = "";
    let errors = "";
    let next = 0;
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`El proceso de prueba no terminó. Salida: ${output}\n${errors}`));
    }, 30000);
    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
      while (next < steps.length && output.includes(steps[next].prompt)) {
        const step = steps[next++];
        if (step.before) step.before();
        child.stdin.write(`${step.answer}\n`);
      }
    });
    child.stderr.on("data", (chunk) => { errors += chunk.toString(); });
    child.on("error", (error) => { clearTimeout(timer); reject(error); });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolveResult({ code, output, errors, answered: next });
    });
  });
}

test("sin archivos preparados no modifica el índice ni crea commit", async (t) => {
  const { repo, env } = fixture(t);
  writeFileSync(join(repo, "sin preparar.txt"), "datos de prueba\n");
  const result = await runInteractive(repo, env);
  assert.equal(result.code, 0);
  assert.match(result.output, /No hay archivos preparados/);
  assert.equal(git(repo, ["diff", "--cached", "--name-only"]).stdout, "");
  assert.notEqual(git(repo, ["rev-parse", "--verify", "HEAD"], true).status, 0);
});

test("rechaza un .env preparado antes de pedir confirmaciones", async (t) => {
  const { repo, env } = fixture(t);
  writeFileSync(join(repo, ".env"), "EXAMPLE=not-a-secret\n");
  git(repo, ["add", ".env"]);
  const result = await runInteractive(repo, env);
  assert.equal(result.code, 1);
  assert.match(result.errors, /archivos de entorno privados/);
  assert.notEqual(git(repo, ["rev-parse", "--verify", "HEAD"], true).status, 0);
});

test("confirma solo lo preparado y no hace push sin autorización", async (t) => {
  const { repo, env } = fixture(t);
  writeFileSync(join(repo, "preparado.txt"), "contenido de prueba\n");
  writeFileSync(join(repo, "sin preparar.txt"), "otro contenido\n");
  git(repo, ["add", "preparado.txt"]);
  const result = await runInteractive(repo, env, [
    { prompt: "M = manual", answer: "m" },
    { prompt: "Descripción breve en español", answer: "Probar el flujo" },
    { prompt: "Escribe SI para crear el commit", answer: "si" },
    { prompt: "¿Quieres preparar un push?", answer: "no" },
  ]);
  assert.equal(result.code, 0, result.errors);
  assert.equal(result.answered, 4);
  assert.match(git(repo, ["log", "-1", "--format=%s"]).stdout.trim(), /^\d{2}\/\d{2}\/\d{4} Probar el flujo \(A\)$/);
  assert.equal(git(repo, ["ls-files"]).stdout.trim(), "preparado.txt");
  assert.match(git(repo, ["status", "--short"]).stdout, /sin preparar/);
});

test("no confirma un contenido que cambió tras la propuesta", async (t) => {
  const { repo, env } = fixture(t);
  const file = join(repo, "datos.txt");
  writeFileSync(file, "primera versión\n");
  git(repo, ["add", "datos.txt"]);
  const result = await runInteractive(repo, env, [
    { prompt: "M = manual", answer: "m" },
    { prompt: "Descripción breve en español", answer: "Probar cambios" },
    { prompt: "Escribe SI para crear el commit", answer: "si", before: () => {
      writeFileSync(file, "segunda versión\n");
      git(repo, ["add", "datos.txt"]);
    } },
  ]);
  assert.equal(result.code, 1);
  assert.match(result.errors, /han variado/);
  assert.notEqual(git(repo, ["rev-parse", "--verify", "HEAD"], true).status, 0);
});

test("push requiere otra confirmación y solo alcanza un remoto de prueba", async (t) => {
  const { root, repo, env } = fixture(t);
  const remote = join(root, "remoto.git");
  git(root, ["init", "--bare", "-q", remote]);
  git(repo, ["remote", "add", "origin", remote]);
  writeFileSync(join(repo, "datos.txt"), "contenido de prueba\n");
  git(repo, ["add", "datos.txt"]);
  const result = await runInteractive(repo, env, [
    { prompt: "M = manual", answer: "m" },
    { prompt: "Descripción breve en español", answer: "Probar publicación" },
    { prompt: "Escribe SI para crear el commit", answer: "si" },
    { prompt: "¿Quieres preparar un push?", answer: "si" },
    { prompt: "Remoto exacto", answer: "origin" },
    { prompt: "Rama de destino exacta", answer: "pruebas" },
    { prompt: "Escribe SI para autorizar este push", answer: "si" },
  ]);
  assert.equal(result.code, 0, result.errors);
  assert.equal(result.answered, 7);
  assert.equal(git(root, [`--git-dir=${remote}`, "rev-parse", "refs/heads/pruebas"]).stdout.trim(), git(repo, ["rev-parse", "HEAD"]).stdout.trim());
});
