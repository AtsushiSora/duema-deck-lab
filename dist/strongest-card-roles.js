import {civilizations,playFaces} from './engine.js';

// Read compiled abilities, rather than matching names or incidental rules text.
export function strongestCardRoles(c){
 const out={ramp:false,draw:false,removal:false,sweep:false,shieldBurn:false,faceDownMana:false,spellLock:!!c.g1698FlySpellLock};
 const visit=defs=>{for(const d of defs||[]){
  const self=d.owner===undefined||d.owner==='self',enemy=!d.both&&d.owner!=='self';
  if(d.op==='Ramp'&&self){out.ramp=true;if(d.faceDown)out.faceDownMana=true;}
  if(['ManaDown426','ManaDown286'].includes(d.op)&&self)out.faceDownMana=true;
  if(d.op==='Draw'&&self||d.op==='Look'&&self&&d.stages?.some(x=>x.to==='hand'))out.draw=true;
  if(['Target','Sweep','OpponentSelect'].includes(d.op)&&enemy&&['grave','hand','mana','deck','deckBottom','shields'].includes(d.to))out.removal=true;
  if(d.op==='Sweep'&&enemy&&d.to==='grave'&&d.filter?.creature)out.sweep=true;
  if(d.op==='ShieldMove685'&&enemy&&d.to==='grave')out.shieldBurn=true;
  visit(d.defs);visit(d.elseDefs);for(const m of d.modes||[])visit(m.defs);
 }};
 for(const f of playFaces(c))for(const defs of[f.g34Tasks,f.g34Attack,f.g34Plus,f.g174End])visit(defs);
 return out;
}

// Conservative construction estimates. The game engine still decides actual
// evolution/change legality, including dynamic races, colors and replacements.
function simpleEvolution(c,r){
 if(!r||Object.keys(r).some(k=>!['any','all','creature','nonEvolution','evolution','ultimate','civilization','race','category','multicolor','blocker','nameIncludes'].includes(k)))return false;
 if(r.any&&!r.any.some(q=>simpleEvolution(c,q))||r.all&&!r.all.every(q=>simpleEvolution(c,q)))return false;
 if(r.creature&&c.type!=='creature'||r.nonEvolution&&c.evolution||r.evolution&&!c.evolution||r.ultimate&&!c.ultimateEvolution)return false;
 if(r.civilization&&!civilizations(c).includes(r.civilization)||r.multicolor&&civilizations(c).length<2||r.blocker&&!c.blocker)return false;
 if((r.race||r.category)&&!String(c.race).includes(r.race||r.category)||r.nameIncludes&&!String(c.name).includes(r.nameIncludes))return false;
 return Object.keys(r).length>0;
}
function revolutionBase(c,r){
 if(!r||Object.keys(r).some(k=>!['any','categories','race','nameIncludes','multicolor','powerMin','min','colors','g1349NonPsychic','g486Current'].includes(k)))return false;
 return c.type==='creature'&&!c.noAttack&&!c.noPlayerAttack&&(!r.g1349NonPsychic||!c.psychic)&&
  (r.any||(r.categories?r.categories.some(q=>String(c.race).includes(q)):String(c.race).includes(r.race||'ドラゴン')))&&
  (!r.nameIncludes||c.name.includes(r.nameIncludes))&&(!r.multicolor||civilizations(c).length>1)&&
  (!r.powerMin||c.power>=r.powerMin)&&c.cost>=(r.min||0)&&(!r.colors||civilizations(c).some(color=>r.colors.includes(color)));
}
export function strongestCardSupport(c,rows,lookup,getRoles=strongestCardRoles){
 const faceDownIds=new Set(rows.filter(r=>getRoles(lookup(r.id)).faceDownMana).map(r=>r.id)),faceDown=rows.reduce((n,r)=>n+(faceDownIds.has(r.id)?r.count:0),0),rev=new Set(),conditionalRev=new Set(),evolution=new Set(),jo=new Set();
 for(const r of rows){if(r.id===c.id)continue;const base=lookup(r.id);
  const affordable=base.cost<=8||faceDown>=8&&(base.g434CrystalSoul||base.g396Zero?.all?.every(x=>x.g286FaceDownMana>0&&x.g286FaceDownMana<=5));
  if(affordable&&revolutionBase(base,c.rev)){rev.add(r.id);if(base.cost>8)conditionalRev.add(r.id);}
  if(base.cost<=6&&(base.type==='creature'||base.shinkalize)&&simpleEvolution(base,c.evolution)){
   evolution.add(r.id);if(base.g50Jo&&c.name.includes('モモキング'))jo.add(r.id);
  }
 }
 const count=ids=>rows.reduce((n,r)=>n+(ids.has(r.id)?r.count:0),0);
 return {rev,conditionalRev,faceDownIds,evolution,jo,revCount:count(rev),evolutionCount:count(evolution),joCount:count(jo)};
}
