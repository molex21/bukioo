import { spawnSync } from 'node:child_process';

const isWindows = process.platform === 'win32';

const prompt = `
Revisa el estado actual del repositorio BUKIOO.

Antes de modificar nada revisa:

- git status
- git diff
- package.json
- frontend/package.json
- backend/package.json
- docker-compose.yml
- README.md
- frontend/README.md
- backend/README.md

Actualiza únicamente la documentación README que haya quedado
desactualizada por los cambios actuales.

Reglas:

- La documentación debe reflejar el estado REAL del repositorio.
- No inventes tecnologías.
- No inventes dependencias.
- No marques como instalada una tecnología que no lo esté.
- Mantén actualizados los comandos npm.
- Mantén actualizada la forma de iniciar el proyecto.
- Mantén actualizada la forma de compilar.
- Mantén actualizada la configuración Docker.
- Mantén actualizadas las variables de entorno documentadas.

Puedes modificar únicamente:

- README.md
- frontend/README.md
- backend/README.md

No modifiques:

- código fuente;
- package.json;
- package-lock.json;
- docker-compose.yml;
- archivos .env;
- AGENTS.md.

No hagas commits.

Si la documentación ya está correctamente actualizada,
no modifiques ningún archivo.
`;

console.log('Codex está revisando la documentación...\n');

const result = spawnSync(
  "codex",
  [
    "exec",
    "--ephemeral",
    "--sandbox",
    "workspace-write",
    "--color",
    "never",
    "-",
  ],
  {
    input: prompt,
    encoding: "utf8",
    shell: isWindows,
    stdio: ["pipe", "inherit", "inherit"],
  },
);

if (result.error) {
  console.error('\nNo se pudo ejecutar Codex.');
  console.error(result.error);
  process.exit(1);
}

if (result.status !== 0) {
  console.error(
    `\nCodex terminó con código ${result.status}.`,
  );

  process.exit(result.status ?? 1);
}

console.log('\nDocumentación revisada correctamente.');