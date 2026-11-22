import {spawnSync} from 'node:child_process';
// Acceptance tests replace the old diagnostic. Original evidence is retained in online-followup-review.json.
const result=spawnSync(process.execPath,['--test','--test-name-pattern','^online action context','tests/online-app.test.mjs','tests/online-ui.test.mjs'],{cwd:new URL('../',import.meta.url),stdio:'inherit',timeout:570000,killSignal:'SIGKILL'});
if(result.error)console.error(result.error.message);
process.exitCode=result.status??1;
