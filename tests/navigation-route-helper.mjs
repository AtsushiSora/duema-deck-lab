import assert from 'node:assert/strict';
const has=(html,action,extra={})=>[...html.matchAll(/<button\b([^>]*)>/g)].some(([,a])=>a.includes(`data-action="${action}"`)&&Object.entries(extra).every(([k,v])=>a.includes(`data-${k}="${v}"`))&&!/\bdisabled\b/.test(a));
// Existing feature tests reach their original action through the new visible menu
// or deck-source picker. Every intermediate action must exist in that screen.
export async function routeToAction({action,extra,getHTML,fire}){
 if(has(getHTML(),action,extra))return false;
 const click=async(a,x={})=>{assert.ok(has(getHTML(),a,x),`navigation step ${a} ${JSON.stringify(x)}`);await fire(a,x);};
 const menu=async()=>{if(has(getHTML(),'app-menu'))await click('app-menu');};
 const navigate=async v=>{if(has(getHTML(),'nav',{view:v})){await click('nav',{view:v});return;}await menu();if(['home','duel','decks','records','account'].includes(v)){await click('nav',{view:v});return;}if(v==='battle'){await click('nav',{view:'duel'});await click('prepare-match',{mode:'auto'});return;}if(['online','challenge'].includes(v)){await click('nav',{view:'duel'});await click('nav',{view:v});return;}if(['analysis','history'].includes(v)){await click('nav',{view:'records'});await click('nav',{view:v});return;}throw Error('Unsupported test navigation '+v);};
 if(action==='nav'){await navigate(extra.view);return true;}
 if(['about','check-update'].includes(action)){await menu();return false;}
 if(action==='new-deck'){await navigate('decks');return false;}
 if(['choose-environment','choose-starter25','choose-champions'].includes(action)){if(!has(getHTML(),extra.role==='opponent'?'choose-opponent':'select-my-deck'))await navigate('battle');await click(extra.role==='opponent'?'choose-opponent':'select-my-deck');return false;}
 if(action==='opponent-environment'){await click('choose-opponent');await click('choose-environment',{role:'opponent'});return true;}
 return false;
}
