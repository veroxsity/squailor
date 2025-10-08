const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function checkModule(name) {
  try {
    require.resolve(name);
    return true;
  } catch (e) {
    return false;
  }
}

function runAuditJson() {
  try {
    const out = execSync('npm audit --json', { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
    return JSON.parse(out);
  } catch (e) {
    // npm audit exits with non-zero when vulnerabilities found; still parse stdout if present
    const out = (e.stdout || '').toString();
    try {
      return JSON.parse(out);
    } catch (parseErr) {
      console.error('Failed to run npm audit or parse output:', (e && e.message) || parseErr.message);
      return null;
    }
  }
}

(function main() {
  console.log('Running pre-build dependency verification...');

  const criticalDeps = [ 'electron-updater' ];
  const missing = criticalDeps.filter(d => !checkModule(d));

  if (missing.length > 0) {
    console.error('Missing critical dependencies:', missing.join(', '));
    console.error('Run "npm install" and ensure the build machine installs dependencies before packaging.');
    process.exitCode = 2;
    return;
  }

  const audit = runAuditJson();
  if (!audit) {
    console.warn('Could not get audit results; skipping vulnerability fail-fast.');
    return;
  }

  const meta = audit.metadata && audit.metadata.vulnerabilities;
  if (meta) {
    const high = meta.high || 0;
    const critical = meta.critical || 0;

    console.log(`npm audit found vulnerabilities: info=${meta.info} low=${meta.low} moderate=${meta.moderate} high=${high} critical=${critical}`);

    if (high > 0 || critical > 0) {
      console.error('High or critical vulnerabilities detected. Please review audit report before building.');
      // Write audit json to file for easier triage
      try {
        const outPath = path.join(process.cwd(), 'npm-audit-prebuild.json');
        fs.writeFileSync(outPath, JSON.stringify(audit, null, 2), 'utf8');
        console.error('Audit report saved to', outPath);
      } catch (e) { /* ignore */ }
      process.exitCode = 3;
      return;
    }
  }

  console.log('Pre-build checks passed.');
})();
