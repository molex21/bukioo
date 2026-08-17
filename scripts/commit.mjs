import { spawnSync } from "node:child_process";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const isWindows = process.platform === "win32";

/**
 * Ejecuta comandos Git.
 */
function runGit(args, captureOutput = false) {
  const result = spawnSync("git", args, {
    encoding: "utf8",
    stdio: captureOutput ? ["ignore", "pipe", "inherit"] : "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  return captureOutput ? (result.stdout ?? "") : "";
}

/**
 * Ejecuta comandos npm.
 */
function runNpm(args) {
  const result = spawnSync("npm", args, {
    encoding: "utf8",
    shell: isWindows,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

/**
 * Ejecuta Codex en modo solo lectura.
 */
function runCodex(prompt) {
  const result = spawnSync(
    "codex",
    [
      "exec",
      "--ephemeral",
      "--sandbox",
      "read-only",
      "--color",
      "never",
      "-",
    ],
    {
      input: prompt,
      encoding: "utf8",
      shell: isWindows,
      stdio: ["pipe", "pipe", "inherit"],
    },
  );

  if (result.error) {
    console.error("\nNo se pudo ejecutar Codex.");
    throw result.error;
  }

  if (result.status !== 0) {
    console.error(`\nCodex terminó con código ${result.status}.`);
    process.exit(result.status ?? 1);
  }

  return result.stdout?.trim() ?? "";
}

/**
 * Formato Conventional Commits permitido.
 */
const conventionalCommit =
  /^(feat|fix|refactor|docs|test|chore|build|ci|perf|style)(\([^)]+\))?!?: .+/;

/**
 * Limpia la respuesta de Codex.
 */
function cleanCommitMessage(rawMessage) {
  return rawMessage
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("```"))
    .at(0)
    ?.replace(/^["'`]+|["'`]+$/g, "")
    .trim();
}

/*
 * Comprobar cambios
 */

const status = runGit(["status", "--porcelain"], true);

if (!status.trim()) {
  console.log("\nNo hay cambios para hacer commit.");
  process.exit(0);
}

/*
 * 1. Preparar cambios
 */

console.log("\n[1/4] Preparando cambios...\n");

runGit(["add", "-A"]);

const diff = runGit(
  ["diff", "--cached", "--no-ext-diff"],
  true,
);

if (!diff.trim()) {
  console.log("\nNo hay cambios para hacer commit.");
  process.exit(0);
}

/*
 * 2. Generar mensaje automáticamente
 */

console.log(
  "\n[2/4] Generando mensaje de commit con Codex...\n",
);

const commitPrompt = `
Analiza el siguiente Git diff y genera UN único mensaje
Conventional Commit.

REGLAS:

- Devuelve únicamente el mensaje.
- No escribas explicaciones.
- No uses Markdown.
- No uses comillas.
- Usa una sola línea.
- El mensaje debe estar en inglés.
- Debe ser breve.
- Debe describir el cambio principal.
- No debe terminar con punto.
- Máximo aproximado de 72 caracteres.

Tipos permitidos:

feat
fix
refactor
docs
test
chore
build
ci
perf
style

Ejemplos:

feat: add appointment creation endpoint
fix: validate appointment availability
docs: update development setup
refactor: simplify database connection

GIT DIFF:

${diff}
`;

const rawMessage = runCodex(commitPrompt);

let message = cleanCommitMessage(rawMessage);

if (!message || !conventionalCommit.test(message)) {
  console.error(
    "\nCodex no generó un Conventional Commit válido.",
  );

  console.error(`Salida recibida: ${rawMessage}`);

  process.exit(1);
}

console.log(
  `\nMensaje generado:\n\n  ${message}\n`,
);

/*
 * 3. Comprobar proyecto
 */

console.log(
  "[3/4] Comprobando proyecto antes del commit...\n",
);

runNpm(["run", "check"]);

console.log(
  "\n✅ Todas las comprobaciones han pasado.",
);

/*
 * Preguntar antes del commit
 */

const rl = readline.createInterface({
  input,
  output,
});

while (true) {
  console.log("\nMensaje de commit propuesto:\n");
  console.log(`  ${message}\n`);

  const answer = await rl.question(
    "Enter = aceptar | E = editar | C = cancelar: ",
  );

  const option = answer.trim().toLowerCase();

  /*
   * Aceptar
   */

  if (
    option === "" ||
    option === "s" ||
    option === "si" ||
    option === "sí"
  ) {
    break;
  }

  /*
   * Cancelar
   */

  if (
    option === "c" ||
    option === "cancelar" ||
    option === "n" ||
    option === "no"
  ) {
    console.log(
      "\nCommit cancelado. No se ha creado ningún commit.",
    );

    rl.close();
    process.exit(0);
  }

  /*
   * Editar
   */

  if (
    option === "e" ||
    option === "editar"
  ) {
    const customMessage = await rl.question(
      "\nNuevo mensaje: ",
    );

    const cleanedMessage =
      customMessage.trim();

    if (
      !conventionalCommit.test(
        cleanedMessage,
      )
    ) {
      console.error(
        "\n❌ El mensaje no cumple Conventional Commits.",
      );

      console.error(
        "Ejemplo: feat: add appointment creation",
      );

      continue;
    }

    message = cleanedMessage;

    continue;
  }

  console.log("\nOpción no válida.");
}

rl.close();

/*
 * 4. Commit
 */

console.log("\n[4/4] Creando commit...\n");

runGit([
  "commit",
  "-m",
  message,
]);

console.log(
  "\n✅ Commit creado correctamente.",
);

console.log(
  `Mensaje: ${message}`,
);