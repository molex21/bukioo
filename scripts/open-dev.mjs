import { spawn } from 'node:child_process';

const urls = [
  'http://localhost:5173',
  'http://localhost:3000',
];

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function waitForUrl(url, timeout = 60000) {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    try {
      const controller = new AbortController();

      const timer = setTimeout(() => {
        controller.abort();
      }, 1500);

      try {
        await fetch(url, {
          signal: controller.signal,
        });

        clearTimeout(timer);
        return;
      } catch {
        clearTimeout(timer);
      }
    } catch {
      // Todavía no disponible
    }

    await sleep(500);
  }

  throw new Error(
    `No se pudo conectar con ${url} después de ${timeout / 1000}s.`,
  );
}

function openUrl(url) {
  let child;

  if (process.platform === 'win32') {
    child = spawn(
      'cmd.exe',
      ['/d', '/s', '/c', `start "" "${url}"`],
      {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      },
    );
  } else if (process.platform === 'darwin') {
    child = spawn('open', [url], {
      detached: true,
      stdio: 'ignore',
    });
  } else {
    child = spawn('xdg-open', [url], {
      detached: true,
      stdio: 'ignore',
    });
  }

  child.unref();
}

try {
  console.log('Esperando a frontend y backend...');

  await Promise.all(urls.map(waitForUrl));

  console.log('Frontend y backend disponibles.');
  console.log('Abriendo navegador...');

  for (const url of urls) {
    openUrl(url);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}