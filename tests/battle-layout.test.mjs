import test from 'node:test';
import assert from 'node:assert/strict';
import {PHONE_LANDSCAPE_QUERY,manualLayout} from '../dist/battle-layout.js';

test('phone landscape selects the desktop arrangement on either side of the width breakpoint',()=>{
 for(const narrow of[true,false]){
  const view={matchMedia:query=>({matches:query===PHONE_LANDSCAPE_QUERY||narrow&&query==='(max-width: 850px)'})};
  assert.deepEqual(manualLayout(view),{mobile:false,landscape:true});
 }
 const portrait={matchMedia:query=>({matches:query==='(max-width: 850px)'})};assert.deepEqual(manualLayout(portrait),{mobile:true,landscape:false});
 assert.deepEqual(manualLayout({matchMedia:()=>({matches:false})}),{mobile:false,landscape:false});
 assert.deepEqual(manualLayout(null),{mobile:false,landscape:false});
});
