// Regression checks for the three defects and two improvements found in the review.
// Pre-fix observations remain in online-status-review.json and the archived cases.
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const pattern='^(online number candidate|explicit online number|invalid and stale numeric|number drafts|online log|optional abyss|online attack context|online shield targets|numeric entry|online numeric declaration|online attack projection)';
const r=spawnSync(process.execPath,['--test','--test-name-pattern',pattern,'tests/online-app.test.mjs','tests/online-feedback.test.mjs','tests/online-ui.test.mjs','tests/online-server.test.mjs'],{cwd:root,stdio:'inherit',timeout:570000,killSignal:'SIGKILL'});
if(r.error)throw r.error;
process.exitCode=r.status??1;
