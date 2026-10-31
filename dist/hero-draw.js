import {legendOpeningBonus,legendDrawBonus} from './legend-strategy.js?v=0.346.0';
import {EXTRA_CHARACTER_IDS} from './character-roster.js?v=0.346.0';
import {CHARACTER_PLANS} from './character-plans.js?v=0.346.0';
// CPU challenge draw policy. Inputs contain only the CPU's own cards and public
// battlefield information. No enemy hand identities, shields or deck order.
export const HERO_IDS=Object.freeze(['shobu','katta','joe','win']);
export const RIVAL_IDS=Object.freeze(['hakuoh','basara','kira','kaiza']);
export const CHALLENGER_IDS=Object.freeze([...HERO_IDS,...RIVAL_IDS,...EXTRA_CHARACTER_IDS]);
// Shared priorities describe the intended route, never a separate rules bonus.
const plans={
 shobu:{setup:['dm23sd1-014','dmbd15-006','dmx11-012','dmbd16-011'],bridge:['dm23rp3-005','dm23rp4-S05'],engine:[]},
 katta:{setup:['dmx11-012','dmbd16-011'],bridge:['dmrp04m-016','dmex15-b002'],engine:['dm23ex2-016']},
 joe:{setup:['dmsd01-012','dmsd01-011','promoy19-014'],bridge:['dm24bd2-010','dmex12-010'],engine:['dmr10-039','dmrp05-m02']},
 win:{setup:['dmsd17-014','dmbd10-009','dm23ex1-044'],bridge:['dm22rp2-S5','dm23rp3-S05'],engine:['dm22rp1-1B','dm23rp2-005']},
 hakuoh:{setup:['dmr15-007','dm08-043','dmrp17-073'],bridge:['dmr14-034','dm24rp1-012','dm16-007'],engine:['dm04-001','dm15-s01']},
 basara:{setup:['dmrp01-041','dm01-094','dm26ex2-020'],bridge:['dmr17-081','dmex17-102'],engine:['dmr17-l02','dm25rp3-DM1','dm22ex2-S07']},
 kira:{setup:['dmrp05-011','dmrp22-027','dmrp17-073','dm08-043'],bridge:['dmr13-016','dmrp14-024','dm23rp4-011'],engine:['dmrp04s-m02','dm24sp1-008']},
 kaiza:{setup:['dm23sd1-014','dmbd15-006','dmbd16-011','dmbd16-008'],bridge:['dm23rp3-005','dm23rp3-S01'],engine:['dm23rp4-OR2','dm23rp3-S07']}
};
export function heroCardRole(heroId,id){const plan=plans[heroId]||CHARACTER_PLANS[heroId];return plan&&['setup','bridge','engine'].find(k=>plan[k]?.includes(id))||'';}
const ramps=new Set(['ramp1','ramp2','dragonRamp2','ramp2Return1','girlsRupia','dogiRamp','untapTwoMana']);
const removal=new Set(['destroy','destroySmall','destroyUntapped','destroy6000','destroyWeakerLimitNextTurn','bounce','bounceSmall','tapAll','vtBounce','abyssMurder','abyssMakua','abyssSis','superheroSweep']);
const cheap=c=>Math.min(30,Number(c.cost)||0);
const colors=c=>[...new Set(c.faces.flatMap(f=>f.civilizations||[]))];
// Choose five physical cards from the CPU's non-shield pool. The bounded beam
// rewards an early play with two other cards that can actually pay for it.
export function chooseHeroOpening(candidates,heroId){
 if(candidates.length<=5)return candidates.map(x=>x.uid);
 const quality=hand=>{
  const counts=new Map();for(const c of hand)counts.set(c.id,(counts.get(c.id)||0)+1);
  const starts=[];let score=0;
  for(const c of hand){
   const role=heroCardRole(heroId,c.id);
   if(role==='bridge'||role==='engine')score+=22/(counts.get(c.id)||1);
   const early=c.faces.filter(f=>cheap(f)<=3||f.bad&&cheap(f)-f.bad<=3);
   for(const f of early){
    const others=hand.filter(x=>x.uid!==c.uid),required=f.civilizations||[],n=Math.max(1,cheap(f)-(f.bad||0));
    const payable=others.some((a,i)=>others.some((b,j)=>i!==j&&colors(b).length<=1&&required.every(k=>[...colors(a),...colors(b)].includes(k))));
    starts.push((role==='setup'?48:18)+(ramps.has(f.effect)||f.g35Role==='man'||f.koppi||f.chara?16:0)+(payable?40:0)-n*2);
   }
   score-=Math.max(0,(counts.get(c.id)||0)-1)*7;
  }
  starts.sort((a,b)=>b-a);score+=(starts[0]||0)+(starts[1]||0)*.3;
  const coverage=new Set(hand.flatMap(colors));score+=coverage.size*6;
  score+=Math.min(2,hand.filter(c=>colors(c).length<=1).length)*9;
  score-=Math.max(0,hand.filter(c=>c.faces.every(f=>cheap(f)>=7)).length-2)*20;
  return score+legendOpeningBonus(hand,heroId);
 };
 // Collapse identical copies while retaining enough physical instances for a hand.
 let beam=[{hand:[],last:-1,value:0}];
 for(let depth=0;depth<5;depth++){
  const next=[];for(const row of beam){const seen=new Set();for(let i=row.last+1;i<candidates.length;i++){
   const c=candidates[i];if(seen.has(c.id)||candidates.length-i<5-depth)continue;seen.add(c.id);
   const hand=[...row.hand,c];next.push({hand,last:i,value:quality(hand)});
  }}
  beam=next.sort((a,b)=>b.value-a.value||a.last-b.last).slice(0,32);
 }
 return (beam[0]?.hand||candidates.slice(0,5)).map(x=>x.uid);
}
export function chooseHeroDraw(candidates,position){
 if(!candidates.length)return null;
 const {heroId,mana,hand,battle,enemyBattle,shields,enemyShields,signature=[],active,colors=[]}=position;
 const seen=new Map();for(const c of hand)seen.set(c.id,(seen.get(c.id)||0)+1);
 const rampInHand=hand.filter(c=>c.faces.some(f=>ramps.has(f.effect))).length;
 const affordable=hand.some(c=>c.faces.some(f=>f.usable&&f.type==='creature'));
 const attackers=enemyBattle.filter(x=>!x.noPlayerAttack&&!x.attackLocked&&!x.sealed);
 const danger=attackers.length>0&&(shields<=2||attackers.reduce((n,x)=>n+(Number(x.breaker)||1),0)>=shields+1);
 const hasRole=role=>hand.some(x=>heroCardRole(heroId,x.id)===role);
 const score=c=>Math.max(...c.faces.map(f=>{
  const n=cheap(f),body=f.type==='creature',near=n<=mana+2;
  const chain=f.rev&&battle.some(x=>!x.tapped&&x.cost>=(f.rev.min||0)&&(!f.rev.race||String(x.race).includes(f.rev.race))&&(!f.rev.nameIncludes||String(x.name).includes(f.rev.nameIncludes))&&(!f.rev.multicolor||x.civilizations?.length>1));
  const invasion=['basara','basara-final'].includes(heroId)&&f.invasion&&battle.some(x=>!x.tapped&&!x.sealed&&!x.attackLocked&&!x.noPlayerAttack&&x.cost>=(f.invasion.min||0)&&(f.invasion.categories||['コマンド']).some(r=>String(x.race).includes(r))&&x.civilizations?.some(v=>f.invasion.colors.includes(v)));
  const usable=f.usable||chain||invasion;
  const role=heroCardRole(heroId,c.id);
  let v=usable?40:near?12:-Math.max(0,n-mana)*5;
  if(body)v+=Math.min(n,10)*2+(usable&&!affordable?18:0);
  if(ramps.has(f.effect))v+=(mana<5?65:mana<8?30:3)-rampInHand*28+(body&&mana<6?18:0);
  if(f.discountRace||f.armoredCoppi||f.chara||f.koppi)v+=mana<5?38:8;
  if(role==='setup'&&mana<=3)v+=hasRole('setup')?0:24;
  if(role==='bridge'&&usable)v+=battle.length?26:14;
  if(role==='engine'&&usable&&!battle.some(x=>x.id===c.id))v+=30;
  if(f.g35Role==='nyary')v+=usable&&hand.length<=3?55:-25;
  if(chain)v+=55;
  if(invasion)v+=55;
  if(f.blocker&&usable||f.travelMMM&&shields===0)v+=danger?40:7;
  if(removal.has(f.effect)&&usable)v+=enemyBattle.length?(danger?55:25):-20;
  if(f.speedAttacker||f.machFighter)v+=usable?15:3;
  if(signature.includes(c.id))v+=usable?30:near?22:-8;
  if(CHARACTER_PLANS[heroId]?.races?.some(r=>String(f.race||'').includes(r)))v+=12;
  if(heroId==='joe'&&/ジョーカーズ/.test(f.race||''))v+=12+(battle.length>=2?10:0);
  if(heroId==='win'&&/アビス/.test(f.race||''))v+=13+(n<=5&&usable?9:0);
  if(heroId==='katta'&&f.rev)v+=battle.some(x=>x.cost>=5)?35:5;
  if(heroId==='shobu'&&/ドラゴン/.test(f.race||''))v+=10;
  if(heroId==='hakuoh'&&/エンジェル・コマンド/.test(f.race||''))v+=12;
  if(heroId==='basara'&&/コマンド/.test(f.race||''))v+=12;
  if(heroId==='kira'&&/メタリカ|マスター・ドラゴン/.test(f.race||''))v+=12;
  if(heroId==='kaiza'&&/アーマード/.test(f.race||''))v+=12;
  if(body&&f.speedAttacker&&enemyShields<=2&&usable)v+=45;
  if(!usable&&f.civilizations?.some(x=>!colors.includes(x)))v+=mana<5?25:8;
  if(!active&&danger&&(f.blocker||f.trigger))v+=10;
  return v-(seen.get(c.id)||0)*18+legendDrawBonus({id:c.id,faces:[f]},position);
 }));
 let best=candidates[0],value=score(best);for(const c of candidates.slice(1)){const n=score(c);if(n>value||n===value&&c.id.localeCompare(best.id)<0){best=c;value=n;}}
 return best.uid;
}
