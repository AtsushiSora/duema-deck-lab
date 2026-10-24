// CPU challenge draw policy. Inputs contain only the CPU's own cards and public
// battlefield information. No enemy hand identities, shields or deck order.
export const HERO_IDS=Object.freeze(['shobu','katta','joe','win']);
const ramps=new Set(['ramp1','ramp2','dragonRamp2','ramp2Return1','girlsRupia','dogiRamp','untapTwoMana']);
const removal=new Set(['destroy','destroySmall','destroyUntapped','destroy6000','destroyWeakerLimitNextTurn','bounce','bounceSmall','tapAll','vtBounce','abyssMurder','abyssMakua','abyssSis','superheroSweep']);
const cheap=c=>Math.min(30,Number(c.cost)||0);
export function chooseHeroDraw(candidates,position){
 if(!candidates.length)return null;
 const {heroId,mana,hand,battle,enemyBattle,shields,enemyShields,signature=[],active,colors=[]}=position;
 const seen=new Map();for(const c of hand)seen.set(c.id,(seen.get(c.id)||0)+1);
 const rampInHand=hand.filter(c=>c.faces.some(f=>ramps.has(f.effect))).length;
 const affordable=hand.some(c=>c.faces.some(f=>f.usable&&f.type==='creature'));
 const danger=shields<=2&&enemyBattle.length>0;
 const score=c=>Math.max(...c.faces.map(f=>{
  const n=cheap(f),body=f.type==='creature',near=n<=mana+2;
  const chain=f.rev&&battle.some(x=>!x.tapped&&x.cost>=(f.rev.min||0)&&(!f.rev.race||String(x.race).includes(f.rev.race))&&(!f.rev.nameIncludes||String(x.name).includes(f.rev.nameIncludes))&&(!f.rev.multicolor||x.civilizations?.length>1));
  const usable=f.usable||chain;
  let v=usable?40:near?12:-Math.max(0,n-mana)*5;
  if(body)v+=Math.min(n,10)*2+(usable&&!affordable?18:0);
  if(ramps.has(f.effect))v+=(mana<5?65:mana<8?30:3)-rampInHand*28+(body&&mana<6?18:0);
  if(f.discountRace||f.armoredCoppi||f.chara||f.koppi)v+=mana<5?38:8;
  if(f.blocker&&usable||f.travelMMM&&shields===0)v+=danger?40:7;
  if(removal.has(f.effect))v+=enemyBattle.length?(danger?45:25):-20;
  if(f.speedAttacker||f.machFighter)v+=usable?15:3;
  if(signature.includes(c.id))v+=usable?30:near?22:-8;
  if(heroId==='joe'&&/ジョーカーズ/.test(f.race||''))v+=12+(battle.length>=2?10:0);
  if(heroId==='win'&&/アビス/.test(f.race||''))v+=13+(n<=5&&usable?9:0);
  if(heroId==='katta'&&f.rev)v+=battle.some(x=>x.cost>=5)?35:5;
  if(heroId==='shobu'&&/ドラゴン/.test(f.race||''))v+=10;
  if(body&&f.speedAttacker&&enemyShields<=2&&usable)v+=45;
  if(!usable&&f.civilizations?.some(x=>!colors.includes(x)))v+=mana<5?25:8;
  if(!active&&danger&&(f.blocker||f.trigger))v+=10;
  return v-(seen.get(c.id)||0)*18;
 }));
 let best=candidates[0],value=score(best);for(const c of candidates.slice(1)){const n=score(c);if(n>value||n===value&&c.id.localeCompare(best.id)<0){best=c;value=n;}}
 return best.uid;
}
