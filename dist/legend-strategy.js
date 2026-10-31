// Legend-only priorities share the protagonist rules: five physical opening
// cards and ordinary paid actions. Inputs contain only own/public card data.
import {CHARACTER_PLANS} from './character-plans.js?v=0.330.0';
export const legendProfile=id=>CHARACTER_PLANS[id]||null;
const colors=f=>f.civilizations||[f.civ].filter(x=>x&&x!=='無色');
const list=x=>x.faces||[x];
const cost=f=>Math.max(0,Number(f.cost)||0);
const creature=f=>f.type==='creature';
const race=(f,r)=>String(f.race||'').includes(r);
function matches(base,c){
 if(!c)return false;if(c.any)return c.any.some(x=>matches(base,x));
 if(c.ultimate)return !!base.ultimateEvolution;
 if(c.evolution)return !!base.evolution;
 if(c.nonEvolution&&base.evolution)return false;
 if(c.civilization&&!colors(base).includes(c.civilization))return false;
 if((c.race||c.category)&&!race(base,c.race||c.category))return false;
 return creature(base);
}
function revolution(base,to){const r=to.rev;return !!r&&creature(base)&&cost(base)>=(r.min||0)&&(!r.race||race(base,r.race))&&(!r.colors||r.colors.some(x=>colors(base).includes(x)))&&(!r.multicolor||colors(base).length>1)&&(!r.nameIncludes||String(base.name||'').includes(r.nameIncludes));}
function basesFor(to,position){
 const field=to.manaEvolution?position.manaCards||[]:to.graveEvolution?position.grave||[]:position.battle||[];
 if(to.g31Evolution){const need=to.g31Evolution.conditions||[];return need.length===2&&field.some((a,i)=>matches(a,need[0])&&field.some((b,j)=>i!==j&&matches(b,need[1])));}
 return field.some(b=>matches(b,to.evolution));
}
function supports(base,to){return to.g31Evolution?(to.g31Evolution.conditions||[]).some(c=>matches(base,c)):matches(base,to.evolution)||revolution(base,to);}
const ramp=f=>['ramp1','ramp2','dragonRamp2','ramp2Return1','dogiRamp','girlsRupia','untapTwoMana','bambooRamp','dedoAllocate'].includes(f.effect)||f.normalCharger||f.recommendRole==='pixie'||['Tower','LifePlan'].includes(f.g51Effect)||f.effect==='fairyMiracle'||f.g34Tasks?.some(t=>t.op==='Ramp');
const gate=f=>['heavensGate','dragonSign','saiphogate'].includes(f.effect);
function recipient(f,g){return creature(f)&&!f.evolution&&(g.effect==='dragonSign'?cost(f)<=7&&colors(f).includes('光')&&race(f,'ドラゴン'):f.blocker&&colors(f).includes('光'));}
export function legendOpeningBonus(hand,id){
 const plan=legendProfile(id);if(!plan||!['evolve','gate','swarm'].includes(plan.style))return 0;
 const early=hand.flatMap((x,i)=>list(x).filter(f=>cost(f)<=3).map(f=>({x,i,f}))),cheapBodies=early.filter(x=>creature(x.f)&&!x.f.evolution),late=hand.filter(x=>list(x).every(f=>cost(f)>=7));let score=-Math.max(0,late.length-1)*34;
 const payable=early.filter(({i,f})=>{const other=hand.filter((_,j)=>i!==j),need=colors(f),n=Math.max(1,cost(f));return other.length>=n&&need.every(c=>other.some(x=>list(x).some(g=>colors(g).includes(c))))&&other.some(x=>list(x).some(g=>colors(g).length===1));});
 score+=payable.length?12: -70;score+=Math.min(2,payable.length)*4;
 if(['swarm','tribal','evolve','invasion'].includes(plan.style))score+=Math.min(3,cheapBodies.length)*6;
 if(['ramp','dragon','gate'].includes(plan.style))score+=early.some(x=>ramp(x.f)||plan.setup.includes(x.x.id))?24:0;
 for(const x of hand)for(const f of list(x)){
  if(f.evolution&&hand.some(y=>y.uid!==x.uid&&list(y).some(b=>supports(b,f))))score+=30;
  if(gate(f)&&hand.some(y=>y.uid!==x.uid&&list(y).some(b=>recipient(b,f))))score+=30;
 }
 return score;
}
export function legendDrawBonus(candidate,position){
 const plan=legendProfile(position.heroId);if(!plan)return 0;const {hand=[],battle=[],mana=0,signature=[]}=position;
 const future=hand.flatMap(list),field=battle;return Math.max(...list(candidate).map(f=>{
  let bonus=0;const n=cost(f),body=creature(f),onTime=n<=mana+1;
  // Find the missing evolution/revolution source before collecting another ace.
  const needed=future.filter(to=>to.evolution||to.rev).some(to=>supports(f,to)&&(to.evolution?!basesFor(to,position):!battle.some(b=>revolution(b,to))));
  if(needed&&body&&onTime)bonus+=55;
  if(f.evolution&&!basesFor(f,position))bonus-=future.some(b=>supports(b,f))?12:85;
  if(body&&future.some(g=>gate(g)&&recipient(f,g)&&cost(g)<=mana+1))bonus+=50;
  if(gate(f))bonus+=future.some(b=>recipient(b,f))?35:-30;
  if(plan.style==='swarm'&&body&&n<=3&&mana<=3)bonus+=8;
  const cheapFire=future.filter(b=>creature(b)&&!b.evolution&&colors(b).includes('火')).reduce((m,b)=>Math.min(m,cost(b)),99);
  if(f.g40MasterBad&&(mana>=5||cheapFire+3<=mana))bonus+=100;
  if(f.g40Gagaga&&((mana>=5&&basesFor(f,position))||cheapFire+2<=mana))bonus+=105;
  if(['ramp','dragon'].includes(plan.style)&&ramp(f)&&mana<7&&!future.some(ramp))bonus+=18;
  


  if(position.heroId==='cap'){
   const materials=[...(position.grave||[]),...battle].filter(x=>race(x,'魔導具')).length;
   if(f.type==='spell'&&race(f,'魔導具')&&materials<4)bonus+=45;
   if(f.mugenGate&&materials>=3&&future.some(x=>x.type==='spell'&&race(x,'魔導具')&&cost(x)<=mana)&&!hand.some(x=>x.id===candidate.id)&&!(position.grave||[]).some(x=>x.id===candidate.id))bonus+=95;
  }
  if(plan.style==='gods'&&body&&f.g31God&&field.some(x=>x.g31God&&x.g31God!==f.g31God))bonus+=45;
  return bonus;
 }));
}
export function legendKeepBonus(candidate,position){
 const plan=legendProfile(position.heroId);if(!plan)return 0;const {hand=[],battle=[],mana=0}=position,others=hand.filter(x=>x.uid!==candidate.uid),copies=hand.filter(x=>x.id===candidate.id).length;
 let value=0;for(const f of list(candidate)){
  for(const to of others.flatMap(list))if((to.evolution||to.rev)&&supports(f,to)&&(to.evolution?!basesFor(to,position):!battle.some(b=>revolution(b,to)))&&!others.some(x=>x.id!==candidate.id&&x.id!==to.id&&list(x).some(b=>supports(b,to))))value=Math.max(value,36);

  if(gate(f)&&others.some(x=>list(x).some(b=>recipient(b,f))))value=Math.max(value,24);
  if(creature(f)&&others.some(x=>list(x).some(g=>gate(g)&&recipient(f,g)))&&!battle.some(b=>(b.id||b.cardId)===candidate.id))value=Math.max(value,30);
  if(ramp(f)&&mana<4&&plan.style!=='pressure'&&!others.some(x=>list(x).some(ramp)))value=Math.max(value,22);
 }
 return value/Math.max(1,copies);
}

