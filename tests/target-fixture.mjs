import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as e from '../dist/engine.js';
import {PRESETS} from '../dist/decks.js';
import {createCatalogue} from '../dist/catalogue.js';
import {resolveEnvironmentDecks,ENVIRONMENT_TARGET} from '../dist/environment.js';
const read=async f=>JSON.parse(await readFile(new URL('../'+f,import.meta.url),'utf8'));
export const [data,details,snapshot,manifest]=await Promise.all(['dist/cards.json','dist/details.json','dist/catalogue.json','tools/support-phase-13.json'].map(read));e.setCards(data.cards);
export {e,PRESETS};
export const DOGI='dm25rp4-DM1',VEG='dm26rp1-S008',GEN='dmrp15-km1',GG='dm25rp3-S09',DREAM='dm24ex2-019',ROD='dm23ex2-016',Y='dm26rp1-S002',KIRA='dm25rp3-012',RS='dm22ex1-030',ONI='dm23ex3-S07';
export const target=resolveEnvironmentDecks(createCatalogue(snapshot,data.cards,details)).find(d=>d.id===ENVIRONMENT_TARGET);
let serial=0;export const inst=id=>({cardId:id,uid:'complete-'+serial++,tapped:false,entered:0,buff:0,unblocked:false});
export const give=(s,p,z,ids)=>s.players[p][z]=ids.map(inst);
export const act=(s,kind,pred=()=>true)=>{const a=e.getLegalActions(s).find(a=>a.kind===kind&&pred(a));assert.ok(a,kind+' '+JSON.stringify(s.decision));e.step(s,a);resolveKeyword(s);};
// Focused effect tests choose the no-choice JustDiver trigger first. UI and priority tests use raw step.
export function resolveKeyword(s){for(let n=0;n<20&&['effectOrder','entryOrder'].includes(s.decision?.type);n++){const entries=s.decision.type==='entryOrder'?s.triggers.entries:s.pendingEffects,effect=entries.find(x=>x.player===s.decision.player&&x.effect==='justDiver');if(!effect)break;const a=e.getLegalActions(s).find(x=>x.effectId===effect.effectId);assert.ok(a);e.step(s,a);}}
export const setup=()=>{const s=e.createGame([PRESETS[0],PRESETS[1]],{seed:1313});s.phase='main';for(const p of [0,1]){give(s,p,'hand',[]);give(s,p,'battle',[]);give(s,p,'mana',['dm01-075','dm01-083','dm01-090','dm01-097','dm01-108'].flatMap(id=>Array(10).fill(id)));give(s,p,'shields',Array(5).fill('dm01-108'));}return s;};
export const cast=(s,id)=>{s.players[s.active].hand.push(inst(id));act(s,'play',a=>a.cardId===id);};
export const attack=(s,uid=s.players[s.active].battle[0].uid,target='player')=>{s.phase='attack';act(s,'attack',a=>a.uid===uid&&a.target===target);};
export const drain=s=>{for(let n=0;s.decision&&s.winner===null;n++){assert.ok(n<300);e.step(s,e.chooseAI(s));}};
