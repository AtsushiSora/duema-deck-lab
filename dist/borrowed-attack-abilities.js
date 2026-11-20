import {copiedRoles393} from './requested393-joker-rules.js';

// Enumerate abilities without declaring an attack or firing any other card's watcher.
// Each descriptor reuses the ordinary resolver. The spell is the new source.
export function borrowedAttackAbilities(s,p,x,reference,api){
 const c=api.definition(s,x),out=[],uid=reference.uid,incarnation=reference.incarnation||0;
 const sourceFor=id=>api.copySource(id,reference.source);
 const add=(label,op,more={},original=x.cardId)=>{
  const source=sourceFor(original);
  out.push({player:p,uid,incarnation,source,original,label,effect:'extended',
   task:more.g1370Condition?{op:'g34_BorrowCondition1370',p,source,uid,incarnation,controller:p,condition:more.g1370Condition,task:{op,p,source,uid,incarnation,controller:p,...more}}:{op,p,source,uid,incarnation,controller:p,...more}});
 };
 const sequence=(label,defs,more={},original=x.cardId)=>add(label,'g34_Sequence',{
  ...(defs.some(d=>d.op==='AttackLookDeploy1317')?{g399Attacker:{uid,incarnation,cost:api.cost(api.card(reference.source))}}:{}),
  defs:structuredClone(defs),...more},original);
 const native=(label,effect,more={})=>out.push({player:p,uid,incarnation,source:sourceFor(x.cardId),original:x.cardId,label,effect,...more});
 const text=String(c.text||'').split('\n');
 const line=pattern=>text.find(t=>pattern.test(t)&&/攻撃|メテオバーン|スマッシュ/.test(t))||text.find(t=>/攻撃(?:する|した)(?:時|とき)/.test(t))||'攻撃する時の能力';
 const plain={
  g338Noradi:'g13_Noradi',abyssWMek:'g13_WMek',abyssMurder:'g13_Borrow',
  paraReduction:'g7ParaAttack',g28Bande:'g28_Bande',g29Baro:'g29_Destroy',
  g29Invincible:'g29_Invincible',g29Mol:'g29_MolAttack',g29Danger:'g29_Danger',g29Arc:'g29_Arc',
  g42Mino:'g42_MinoAttack',g50Jo:'g50_JoEvolve',g50Nex:'g50_Nex',g50Dogi:'g50_Battle',
  g50Secret:'g50_Secret',g50Varga:'g50_VargaAttack',g40Kumitate:'g40_Kumitate',g40Sonkun:'g40_Sonkun',
  g48Mercury:'g48_Mercury',g49Jaou:'g49_JaouReturn',g49Queen:'g49_Queen',g49Balpia:'g49_BalpiaPut',
  g38Plaisir:'g38_Plaisir',giveSpeedOnAttack:'g22Speed',blazeLoot:'g22Blaze',stegoro:'g20Stegoro',
  scarletMana:'g17_Scarlet',g27Golgy:'g27_Win',hercules:'g16HercAttack',smashBurst:'g16Smash',
  meteorDoom:'g24_Meteor',hunterMekraid:'g12Mekraid',onimaruExtra:'g12Onimaru',ougaJudge:'g12Ouga',
  g32Complex:'g32_ComplexAttack',g32Galaxy:'g32_Galaxy',g32Dolf:'g32_DolfSweep',g32Momo:'g32_MomoUntap',
  oniMax:'g25_CryAttack',pegasus:'g25_Pegasus',kiyonaga:'g21KiyoReveal',minogami:'g21MinoAttack',
  g4Zadan:'g30_Zadan',dollarGraveDraw:'g4_Dollar',watch:'g1_WatchBounce',
  sheketAttack:'g19SheketAttack',petrovaAttack:'g19Petrova',ninjaMechraid:'g19Shield',
  samuraiBui:'g18_Bui',samuraiMusashi:'g18_MusashiUse',g33Hikari:'g33_Hikari',g33Golgini:'g33_Draw2',
  travelMMM:'g14_MMMAttack',g79Bajura:'g77_Fortress',g87Raiser:'g87_Raiser',
  g137RampAttack:'g61_Axe',g136ManaBurnAttack:'g61_Bolzard',g136NatureRecoverAttack:'g61_Maboroshi',
  g135BounceAttack:'g61_Neptas',g134GraveAttack:'g61_Amber',g125Grappler:'g61_Grappler',
  g132ManaReturn:'g61_ManaReturn',g132EnemyManaReturn:'g61_Angler',g85Romano:'g85_RomanoCast',
  g85Zamar:'g85_ZamarDiscard',g80Gazer:'g80_Gazer',g80Genji:'g80_Genji',g86Fernando:'g86_Fernando',g89Julius:'g89_Julius',g118Zalms:'g34_Offer',g76Juggler:'g76_JugglerDraw',g26Ever:'g26_Ever',
 };
 for(const [flag,op] of Object.entries(plain))if(c[flag])add(line(/攻撃/),op,
  flag==='g132ManaReturn'?{n:1,optional:false,selected:[]}:
  flag==='abyssMurder'?{lastKnownPower:0}:flag==='g49Jaou'?{g1370Condition:'zeroShields'}:flag==='g118Zalms'?{title:'山札の上を公開する？',defs:[{op:'Look',n:1,public:true,stages:[{to:'hand',n:1,filter:{creature:true,race:'ドラゴン'}}],rest:'mana'}]}:{});
 if(c.g50Volzeos)add(line(/捨て/),'discard',{p:1-p,causedBy:p,n:s.players[1-p].hand.length,all:true});
 if(c.g40Kumitate)sequence(line(/３つ|3つ/),[{op:'Draw',n:1}],{g1370Condition:'kumitate'});
 if(c.g40Kotatsu)sequence(line(/アンタップ/),[]);
 if(c.g78Jelly)add(line(/捨て/),'discard',{p:1-p,n:1,random:true,causedBy:p});
 if(c.g86Zangiras)sequence(line(/墓地/),[{op:'Select',origin:'grave',n:1,optional:true,deploy:true,filter:{creature:true,color:'闇',max:3}}]);
 if(c.g37Role==='shuffle')add(line(/数字/),'g9Number',{family:'shuffle'});
 if(c.g37Role==='blue')add(line(/スマッシュ/),'g37Smash');
 if(c.g37Role==='smoke')add(line(/攻撃/),'g37Smoke');
 if(c.g29Mol)sequence(line(/龍マナ武装/),[]);
 if(c.g49Hatter&&x.hyperActive)add(line(/超魂/),'g49_Raid',{race:'ファイアー・バード',max:5});
 if(c.g38Revive)sequence(line(/墓地/),[{op:'Select',origin:'grave',n:1,optional:true,deploy:true,filter:{creature:true,max:8},grant:{entryPlayerAttack:true}}]);
 if(c.g38Sycrill)add(line(/スノーフェアリー/),'g38_Sycrill');
 if(c.gachiAttack)add(line(/攻撃/),c.gachiAttack);
 if(c.gospelAttack)add(line(/呪文/),'execute',{origin:'hand',max:'∞',spellOnly:true});
 if(c.diehard)add(line(/シールド/),'g12DiehardShield');
 if(c.zenon)sequence(line(/ツインパクト/),[]);
 if(c.madoGashagon)add(line(/捨て/),'discard',{n:1,causedBy:p});
 if(c.g4Manji)add(line(/破壊/),'destroyPower',{max:'∞'});
 if(copiedRoles393(c,'g159CRole').includes('bolshack'))add(line(/バトル/),'g159C_Fight');
 if(c.g159D==='trio')add(line(/ガチンコ/),'g159D_TrioJudge');
 for(const role of ['yes','elbolom'])if(c.g159ShieldRole===role)add(line(/攻撃/),'g159S_'+(role==='yes'?'Yes':'Elbolom'));
 if(c.g160FRole==='dai')add(line(/出たターン/),'g160F_DaiDiscard');
 if(c.g393Smash||c.g320Jave||c.g1318Smash)sequence(line(/スマッシュ/),[{op:'Smash320',serial:reference.serial||0}]);
 const changes=c.g393CChangeCopies?.length?[...(api.card(x.cardId).g393Change?[c.g393Change]:[]),...c.g393CChangeCopies]:[c.g393Change||{}];
 for(const change of changes)for(const [origin,max]of Object.entries(change))add(line(origin==='grave'?/Jクライム/:/Jチェンジ/),'g393C_Swap',{origin,max});
 for(const role of copiedRoles393(c,'g393DRole')){
  if(role==='next')add(line(/攻撃/),'g393D_NextReset');
  if(role==='gorina'){
   add(line(/はじめて攻撃/),'g393D_GorinaUntap');
   add(line(/自分のクリーチャーが攻撃/),'g393D_GorinaWatch',{attackCost:null});
  }
 }
 if(c.g393JSigma)for(let i=0;i<(c.g393JSigmaCount||1);i++)add(line(/攻撃/),'g393J_ZeroTarget');
 if(c.g394Jao)add(line(/はじめて攻撃/),'g394_Attack');
 const roles=copiedRoles393(c,'g35Role'),custom=name=>({op:'g35_Custom',name});
 const roleDefs={hyperBolshack:[custom('hyperBolshackTop')],galaxy:[custom('galaxyAttack')],joragon:[custom('joragonLoot')],
  melaventure:[custom('melaSweep')],finalJohnny:[{op:'Offer',defs:[custom('finalRemove')]}],gaiging:[custom('gaigingReveal')],
  venom:[{op:'Mill',owner:1-p,n:1}],baruga:[custom('barugaBurn')],universe:[custom('universeBurn')],alpha:[custom('alphaAttack')],
  world:[custom('worldAttack')],scorpion:[custom('scorpionAttack')],geracho:[custom('gerachoSwap')],chief:[custom('chief')],
  bakus:[{op:'Offer',defs:[custom('untapOther')]}]};
 for(const role of roles){
  if(roleDefs[role])sequence(line(/攻撃/),roleDefs[role]);
  if(role==='mobius'&&x.hyperActive)sequence(line(/アンタップ/),[custom('untapOther')]);
  if(role==='dogiHyper'&&x.hyperActive)sequence(line(/多色/),[]);
 }
 if(c.g34Attack)sequence(line(/攻撃/),c.g34Attack);
 if(c.g691AttackCreature)sequence(line(/クリーチャーを攻撃/),c.g691AttackCreature);
 if(c.g540FirstAttack)sequence(line(/はじめて攻撃/),c.g540FirstAttack);
 if(c.g781ReleaseAll)sequence(line(/ハイパー/),[{op:'ReleaseAllHyper781'}]);
 for(const {min,def}of c.g1269TeamAttack||[])sequence(line(new RegExp(String(min)+'度目|'+({2:'２',3:'３',4:'４'})[min]+'度目')),[]);
 if(c.g756TurboRush==='discard'&&api.turboReady(s,p,x))sequence(line(/ターボラッシュ/),[{op:'Discard',g756All:true}]);
 let watchIndex=0;const watchLines=text.filter(t=>/自分(?:の[^。]*?)?が攻撃/.test(t));
 for(const watch of [...(c.g252AttackWatch?[c.g252AttackWatch]:[]),...(c.g253AttackWatches||[])]){
  if(watch.other||!['self','both'].includes(watch.who))continue;
  sequence(watchLines[watchIndex++]||line(/クリーチャーが攻撃/),watch.defs,watch.g399Attacker?{g399Attacker:{uid,incarnation,cost:null}}:{});
 }
 for(const {source,grants}of [...(c.g404Inherited||[]),...(c.g406Inherited||[])])
  if(grants.g34Attack)sequence(api.card(source).text||'得た攻撃時能力',grants.g34Attack,{},source);
 for(const g of x.g34Grants||[])if(g.g1049RevolutionUntap&&g.turn===s.turn)
  sequence('革命０：攻撃する時にアンタップする',[{op:'IfOwn',filter:{g265ShieldsMax:0},defs:[{op:'Untap',g191First:true}]}]);
 if(c.g34Role==='emrakul')sequence(line(/攻撃/),[{op:'Custom',name:'emrakulSix'}]);
 if(c.g34Role==='minogami')sequence(line(/攻撃/),[{op:'Offer',defs:[{op:'Look',n:3,public:true,stages:[{to:'mana',n:'all',filter:{twin:true}}],after:[{op:'Custom',name:'minogamiBuff'}]}]}]);
 if(c.g34Role==='grasper')sequence(line(/NEO/),[{op:'Select',origin:'mana',n:1,filter:{creature:true,belowPower:0},deploy:true,optional:true}]);
 if(c.g34Role==='happou')sequence(line(/シノビ/),[]);
 for(const layer of api.layers(x)){
  const d=api.card(layer);
  if(d.g34SoulDiscard)sequence('得た攻撃時能力：相手の手札をランダムに１枚捨てさせる',[{op:'Discard',n:1,random:true}],{},d.id);
  if(d.g35Role==='graveName')sequence('得た攻撃時能力：墓地の同名クリーチャーを出す',[{op:'g35_Custom',name:'graveNameRevive',max:api.cost(api.card(reference.source))}],{},d.id);
  if(d.g48Soul==='flower')add('得た攻撃時能力：カードを引いて捨てる','g48_Loot',{soul:d.id},d.id);
  if(d.g48Soul==='chaos')add('得た攻撃時能力：シールドをブレイクする','g48_Chaos',{soul:d.id,lastCost:api.cost(api.card(reference.source))},d.id);
  if(d.g47SoulBlue)add('得た攻撃時能力：非クリーチャーを実行する','g47_Execute',{origins:['hand'],max:4,noncreature:true},d.id);
 }
 for(const d of [x,...(x.godLinks||[])]){
  const def=api.card(d.cardId);
  if(def.g45MDeck&&!def.g831SingleDeckEvolution)add(line(/メテオバーン/),'g45_Meteor',{mUid:uid},def.id);
  if(def.g1081GodCombat?.linkedAttack)sequence(def.text,def.g1081GodCombat.linkedAttack,{},def.id);
 }
 if(c.g1158FirstAttackBreak)add(line(/はじめて/),'g34_FirstAttackBreak1158');
 if(c.g213Mars)add(line(/メテオバーン/),'g31_MarsOffer');
 for(const [flag,kind]of [['g31Apollo','apollo'],['g31Pluto','pluto'],['g31Destroy','destroy']])if(c[flag])add(line(/メテオバーン/),'g31_Meteor',{kind,count:0});
 if(c.g825Meteor)add(line(/メテオバーン/),'g31_Meteor',{follow825:c.g825Meteor});
 if(c.jayTornado)add(line(/Jトルネード/),'jayTornado');
 if(c.attackEffect)add(line(/攻撃/),c.effect==='graveRecycle'?'recyclePlayer':c.effect==='destroyMin'?'destroyMin':'tapAll');
 for(const effect of ['attackDragonReveal','attackJudge','attackExecuteHand'])if(c[effect])native(line(/攻撃/),effect,effect==='attackJudge'&&c.attackJudge==='draw'?{judgeDraw880:true}:{});
 if(c.deployMulticolor7||c.effect==='deployMulticolor7')native(line(/攻撃/),'deploy');
 return out;
}
