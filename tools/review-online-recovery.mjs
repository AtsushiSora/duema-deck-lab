// Fixed-behavior regressions for the additional recovery and selection review.
// Historical pre-fix observations remain in online-recovery-review.json and the archived cases.
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const pattern='^(room-code input|selected field Hyper|a selected field|a permanent connection|permanent |transient |an uncertain committed|identity changes clear|token provider|recovery safety:)';
const r=spawnSync(process.execPath,['--test','--test-name-pattern',pattern,'tests/online-client.test.mjs','tests/online-app.test.mjs','tests/online-ui.test.mjs'],{cwd:root,stdio:'inherit',timeout:570000,killSignal:'SIGKILL'});
if(r.error)throw r.error;
process.exitCode=r.status??1;
