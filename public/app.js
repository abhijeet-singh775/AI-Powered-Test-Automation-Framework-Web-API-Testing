async function loadStatus() {
  const status = await fetch('/api/status').then((response) => response.json());
  document.querySelector('#api-status').textContent = status.suites.api ? 'Available' : 'Missing';
  document.querySelector('#ui-status').textContent = status.suites.ui ? 'Available' : 'Missing';
  document.querySelector('#api-url').textContent = status.configured.apiUrl ? 'Configured' : 'Using default';
  document.querySelector('#base-url').textContent = status.configured.baseUrl ? 'Configured' : 'Using example.com';
  document.querySelector('#hf-status').textContent = status.configured.huggingFace ? 'Configured' : 'Optional';
}

async function runSuite(suite) {
  const output = document.querySelector('#run-output');
  const buttons = document.querySelectorAll('[data-run], #run-all');
  buttons.forEach((button) => { button.disabled = true; });
  output.className = 'run-empty running';
  output.textContent = `Running ${suite === 'all' ? 'full test suite' : suite.toUpperCase() + ' suite'}...`;

  try {
    const result = await fetch(`/api/run/${suite}`, { method: 'POST' }).then((response) => response.json());
    output.className = `run-empty ${result.success ? 'success' : 'failed'}`;
    output.textContent = result.output || (result.success ? 'Tests completed successfully.' : 'Tests failed.');
    document.querySelector('#last-run').textContent = result.success ? 'Passed' : 'Failed';
    document.querySelector('#last-run-detail').textContent = new Date(result.finishedAt).toLocaleString();
  } catch (error) {
    output.className = 'run-empty failed';
    output.textContent = `Unable to run tests: ${error.message}`;
  } finally {
    buttons.forEach((button) => { button.disabled = false; });
  }
}

document.querySelectorAll('[data-run]').forEach((button) => {
  button.addEventListener('click', () => runSuite(button.dataset.run));
});
document.querySelector('#run-all').addEventListener('click', () => runSuite('all'));
loadStatus();
