const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'public');
const port = Number(process.env.DASHBOARD_PORT || 4173);
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function sendJson(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(value));
}

function getStatus() {
  const suiteFiles = [
    path.join(root, 'src/tests/ui/login.spec.ts'),
    path.join(root, 'src/tests/api/users.api.spec.ts'),
  ];
  return {
    project: 'AI Test Automation',
    suites: {
      ui: fs.existsSync(suiteFiles[0]),
      api: fs.existsSync(suiteFiles[1]),
    },
    configured: {
      apiUrl: Boolean(process.env.API_BASE_URL),
      baseUrl: Boolean(process.env.BASE_URL),
      huggingFace: Boolean(process.env.HUGGINGFACE_API_KEY),
    },
  };
}

function runSuite(suite) {
  const command = suite === 'ui'
    ? 'npm run test:ui'
    : suite === 'api'
      ? 'npm run test:api'
      : 'npm test';

  return new Promise((resolve) => {
    const child = spawn(command, {
      cwd: root,
      shell: true,
      env: process.env,
      windowsHide: true,
    });
    let output = '';

    child.stdout.on('data', (chunk) => { output += chunk.toString(); });
    child.stderr.on('data', (chunk) => { output += chunk.toString(); });
    child.on('close', (code) => {
      resolve({
        success: code === 0,
        exitCode: code,
        output: output.slice(-12000),
        finishedAt: new Date().toISOString(),
      });
    });
  });
}

function serveStatic(requestUrl, response) {
  let relativePath = decodeURIComponent(requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname);
  let baseDir = publicDir;

  if (relativePath === '/playwright-report') {
    relativePath = '/playwright-report/';
  }
  if (relativePath.startsWith('/playwright-report/')) {
    baseDir = path.join(root, 'playwright-report');
    relativePath = relativePath.slice('/playwright-report'.length) || '/';
  }

  const filePath = path.resolve(baseDir, `.${relativePath}`);

  if (!filePath.startsWith(baseDir + path.sep) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }

  response.writeHead(200, { 'Content-Type': contentTypes[path.extname(filePath)] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(response);
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host || 'localhost'}`);

  if (requestUrl.pathname === '/api/status') {
    sendJson(response, 200, getStatus());
    return;
  }

  if (requestUrl.pathname.startsWith('/api/run/') && request.method === 'POST') {
    const suite = requestUrl.pathname.split('/').pop();
    if (!['all', 'ui', 'api'].includes(suite)) {
      sendJson(response, 400, { error: 'Unknown suite' });
      return;
    }
    sendJson(response, 200, await runSuite(suite));
    return;
  }

  serveStatic(requestUrl, response);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Test dashboard: http://127.0.0.1:${port}`);
});
