import {spawnSync} from 'node:child_process';
// Regression entry point. Historical defect evidence is retained in online-broad-review.json.
const result=spawnSync(process.execPath,['--test','--test-name-pattern','^online resignation','tests/online-app.test.mjs'],{cwd:new URL('../',import.meta.url),stdio:'inherit',timeout:570000,killSignal:'SIGKILL'});
if(result.error)console.error(result.error.message);
process.exitCode=result.status??1;
