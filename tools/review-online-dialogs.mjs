// Fixed-behavior regressions for online dialog freshness and public fight-target selection.
// Historical observations remain in online-dialog-review.json and the archived cases.
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const r=spawnSync(process.execPath,['--test','--test-name-pattern','^(online dialog|online single fight targets)','tests/online-app.test.mjs','tests/online-ui.test.mjs','tests/online-server.test.mjs'],{cwd:root,stdio:'inherit',timeout:570000,killSignal:'SIGKILL'});
if(r.error)throw r.error;
process.exitCode=r.status??1;
