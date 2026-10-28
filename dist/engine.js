import {deckCopyLimit} from './historical-regulations.js?v=0.98.0';
import {CHALLENGER_IDS,chooseHeroDraw,chooseHeroOpening} from './hero-draw.js?v=0.96.0';
import {shieldCards,shieldGroup,findShield,attachShield,detachShieldCard} from './shield-state.js';
import {createExtendedRules} from './extended-rules.js?v=0.168.0';
import {createStrategicAI} from './strategic-ai.js?v=0.147.0';
// Supported-card rules engine. No strength-based or precomputed win rates.
export const RULE_VERSION='総合ルール 1.53 / 対応カード版 0.127';
export const ENGINE_VERSION='0.127.0';
export const AI_VERSION='2.3.55';
const EFFECTS=new Set(['champion','environment','recommended','sixPhoto','ramp1','ramp2','discard','teamBuff','optionalDraw','drawUpTo3','searchCreature','tap','tapTwo','buff','unblock','bounce','destroySmall','destroyUntapped','draw2','destroy','manaRemoval','tapAll','discardAll','bounceOptional','bounceSmall','bounceBlockers','dragonRamp2','ramp2Return1','optionalRamp4Return2','purgeNonDragonMana','fightOptional','destroyWeakerLimitNextTurn','shieldTop1','deployMulticolor7','superheroSweep','destroyBattleCard3','jadowShield','vamBounce','goodEvil','aterModes','jaganRevive','reverseLock','urEvolve','muteLoot','tensaiLoot','graveRecycle','destroyMin','vtBounce','miradaCast','spellLock','miracleDraw','serpentModal','icicleModes','mirageModes','judgeDraw','maryRevive','darknessModes','fumiModes','brainSlash','charonReset','jennySacrifice','inspectDiscard','gospelRecover','dolsuzakuTurn','frozenCarnival','finalStop','oriotisJudge','nextSummonSpeed','tripleMode','sirenMana','courageMode','burningLoot','lastDragonFlame','destroy6000','masterGGGLoot','untapTwoMana','fairyDiscard6000','graveShuffle','permitManaSummon','wellkius','mikadoreo','sheva','rudolf','saiphogate','heavensGate','stargaze','bambooRamp','sharappu','fairyPower','takeback','hugePlan','shakoRecycle','naturalGo','herculesRecycle','jurassicHowl','corenReveal','plantRamp','sonicMana','jumboReveal','granRamp','kiyonagaReveal','gohaten','zenonRamp','wiseShutter','dokiBounce','minogamiRecover','hazardPact','fortress','casablancaBounce','sheketDraw','petrovaProtect','bojiMill','dranEntry','goldShield','c0braRevive','mechaDraw','ameliaShield','mechaMinus','goryuShield','magicNapo','magicSmallDestroy','magicIgnore','magicNumberLock','magicFire','magicKaraku','magicHime','magicBounce','magicPeecap','magicDraw','armoredBaku','armoredValkyria','armoredVal','armoredMonster','hunterMekraid','hunterBambi','hunterSweep4','hunterSweep2','hunterVictory','hunterMana','hunterDraw','zardCast','dogiRamp','dolfSweep','damdRemove','fiveModes','dragonSign','aquaReveal','bossDeploy','dedoAllocate','fireAllocate','fairyMiracle','babaBottom','cycleEntry','jaougaShields','katsuLook','reverseMinus','jaoumon','fortuneRamp','giantHeavy','giantLake','giantTouch','giantYuki','giantSpace','giantSineraria','giantFirefly','gachiRobo','gachiCambiare','gachiFight','gachiMystery','gachiNicol','gachiBigBang','gachiMagrul','gachiRice','gachiGuignol','samuraiBui','samuraiMusashi','samuraiMekraid','samuraiFlash','lionelPeace','lionelRune','lionelHeart','lionelSlotton','lionelAQ','lionelKorail','lionelGera','lionelSong','lionelStar','kenjiCrymax','kenjiDida','kenjiMill','kenjiPlan','kenjiHeart','travelJourney','travelAfro','travelKatsura','travelPrison','travelRevZero','travelG3','travelZero','travelHelt','travelOra','travelChicken','graveGT','graveObuza','graveKaibyaku','graveUra','graveAbaku','graveLoot','graveDoor','graveMinus4','maruruOrugate','maruruKiinary','maruruWatch','maruruBunker','maruruSky','girlsDaiou','girlsSavak','girlsZeos','girlsTry','girlsMega','girlsGyai','girlsArshu','girlsRupia','madoNothing','madoAirvo','madoBarred','madoGon','madoBlood','madoBock','madoCombat','madoDollar','madoDraw','madoShuno','madoGokusatsu','madoGyap','redBlack','redMax','redRoyal','redCircle','redClock','redGareck','abyssJaga','abyssSis','abyssMurder','abyssMakua','abyssMill','abyssMek','abyssSeal','abyssBella','hachiRedZ','hachiStorm','hachiFight','hachiForbidden','hachiShibire','hachiPower','hachiSSD','virideEver','golgyEntry','golgyKohaku','golgyBig','golgyShield','golgyHerc','golgyWest','golgyGin','golgyBlueprint','golgyJasmine','bandeRadio','bandePizza','bandeDecision','bandeDagra','bandeBalance','bandeSeal','bandeTaka','madoZadan','madoMaou','madoNameless','madoJaw','madoGride','madoFunz','madoVoga','madoLab','madoTin','bolBaro','bolBT','bolAgony','bolLoot','bolMol','bolLand','bolJura','bolDuel','bolBird','phoenixFel','phoenixGate','phoenixMetal','phoenixReverse','phoenixRecover','phoenixXeno','phoenixLoot','phoenixAbu','phoenixHeavy','phoenixMill','phoenixReload','phoenixOni','kenjiMysteryCube','kenjiCocoon','kenjiPanda','kenjiJaouga8','shieldDogi','shieldResolve','shieldBounce','shieldD4','shieldMirror','shieldMirrorSpell','shieldParfe','shieldDeka','shieldFaceTop']);
let catalogue=new Map();
export function setCards(cards){for(const c of cards){if(c.effect&&!EFFECTS.has(c.effect))throw Error('未実装の効果です：'+c.effect);if(c.breaker!=null&&![2,3,4,'∞'].includes(c.breaker))throw Error('未実装のブレイカーです');if(c.evolution&&c.exLife&&c.ultraEvolution!==20&&!c.g34EvoExLife)throw Error('進化EXライフは未対応です');if(c.evolution&&c.trigger&&!c.g32EvoTrigger)throw Error('進化S・トリガーは未対応です');if(c.costReduction&&!['opponentMulticolorMana3','ownFourDragonsMana3','ownFiveLightFireMana3','allCreatures'].includes(c.costReduction))throw Error('未実装のコスト軽減です');for(const key of ['dragonEntryTap','attackDragonReveal','exLife','zRush','shieldEntryTapLock','soulShieldGuard','attackJudge','stopSelfEntryAttack','gNeo','dream','multiAssault','manaSummon','entryGate','manaGuard','machFighter','ignoreSmall','gaia'])if(c[key]!=null&&c[key]!==true)throw Error('未実装の能力です：'+key);}for(const c of cards)if(c.hyper&&(!(c.zRush||c.hyperTap)||!Number.isFinite(c.hyper.power)||(c.hyper.breaker!=null&&![2,3,4,'∞'].includes(c.hyper.breaker))||Object.keys(c.hyper).some(k=>!['power','blocker','breaker','spellLockMaxCost','stopEntryAttack','attackExecuteHand','drawDiscard','reverseBurn','manaOnce','blazeLoot','engelsProtect','petrovaAttack','machFighter','g28ManaEnd','g32DemonOnce','g34HLock','g35Venom','g35Dogi','g35Mobius','g38Revive','g38Plaisir'].includes(k))))throw Error('未実装のハイパーモードです');for(const c of cards)if(c.spellFace&&!(c.spellFace.type==='spell'&&EFFECTS.has(c.spellFace.effect)&&Number.isFinite(c.spellFace.cost)&&Array.isArray(c.spellFace.civilizations||String(c.spellFace.civ).split('/'))&&(!c.spellFace.charger||c.spellFace.effect==='judgeDraw')))throw Error('未実装のツインパクトです');for(const c of cards){if(c.neoEvolution&&(!c.neoEvolution.any||![1,2,3].includes(c.neoEvolution.any.length)||c.neoEvolution.any.some(x=>Object.keys(x).length!==1||!(['光','水','闇','火','自然'].includes(x.civilization)||x.category==='ドラゴン'||x.creature===true||['ジョーカーズ','レクスターズ'].includes(x.race)))))throw Error('未実装のNEO進化です');if(c.neoEvolution&&c.evolution)throw Error('進化形式が重複しています');if(c.ddd&&!((c.ddd.cost===3&&JSON.stringify(c.ddd.civilizations)==='["光","火"]'&&Object.keys(c.ddd).length===2)||(c.neoEvolution&&(([4,7].includes(c.ddd.cost)&&Object.keys(c.ddd).length===1)||(c.ddd.cost===8&&c.ddd.attackDiscount===true&&Object.keys(c.ddd).length===2)))||(c.g49Red&&c.ddd.cost===4&&JSON.stringify(c.ddd.civilizations)==='["火","火"]'||c.neoEvolution&&c.ddd.cost===2&&JSON.stringify(c.ddd.civilizations)==='["自然","自然"]'&&Object.keys(c.ddd).length===2)||(c.type==='spell'&&c.ddd.cost===5&&c.ddd.fromMana===true&&Object.keys(c.ddd).length===2)))throw Error('未実装のD・D・Dです');if(c.mugenCrime!=null&&![2,4,5].includes(c.mugenCrime))throw Error('未実装のムゲンクライムです');}catalogue=new Map([...cards.map(c=>[c.id,c]),[FACE_DOWN.id,FACE_DOWN],[SEAL_CARD.id,SEAL_CARD]]);}
const SEAL_CARD={id:'face-down-seal',name:'裏向きの封印',type:'seal',cost:0,power:0,civ:'',civilizations:[],race:'',manaValue:0};
const FACE_DOWN={id:'face-down-mana',name:'裏向きのマナ',type:'unknown',cost:0,power:0,race:'',civ:'',civilizations:[],manaValue:1};
export const copySource=(original,reference)=>'ability-copy:'+encodeURIComponent(original)+':'+encodeURIComponent(reference);
export function card(id){
 if(typeof id!=='string'&&id?.g50KingFace){const c=card(id.g50KingDefinition||id.cardId);return {...c.g50KingFace,id:id.cardId,limit:c.limit};}
 if(typeof id!=='string'&&id?.sealOf)return SEAL_CARD;
 if(typeof id!=='string'&&id?.faceDown)return FACE_DOWN;
 if(typeof id!=='string'&&id?.sealed){const c=card(id.cardId);return {id:c.id,name:c.name,type:'ignored',cost:Infinity,power:0,civ:'',civilizations:[],race:'',limit:c.limit};}
 if(typeof id!=='string'&&id?.godLinks?.length){const parts=[id,...id.godLinks],defs=parts.map(x=>card(x.cardId)),base={...defs[0]},union=key=>[...new Set(defs.flatMap(c=>key==='civilizations'?civilizations(c):String(c[key]||'').split('/')))];for(const c of defs)for(const[k,v]of Object.entries(c))if(v===true)base[k]=true;return {...base,name:defs.map(c=>c.name).join('＋'),cost:defs.reduce((n,c)=>n+costValue(c),0),power:defs.reduce((n,c)=>n+numeric(c.power),0),civilizations:union('civilizations'),civ:union('civilizations').join('/'),race:union('race').join('/'),g31GodHeavy:defs.some(c=>c.g31God==='left'),breaker:Math.max(...defs.map(c=>Number(c.breaker)||1))===1?undefined:Math.max(...defs.map(c=>Number(c.breaker)||1))};}
 const key=typeof id==='string'?id:id?.cardId,base=catalogue.get(key);if(base?.g39Verde&&typeof id!=='string'&&id.g39GraveColors)return {...base,civilizations:['光','水','闇','火','自然'],civ:'光/水/闇/火/自然',g39InGrave:true};if(base||!key?.startsWith('ability-copy:')||key.length>4096)return base;
 const parts=key.split(':');if(parts.length!==3)return undefined;
 try{const source=card(decodeURIComponent(parts[1])),reference=card(decodeURIComponent(parts[2]));if(!source||!reference)return undefined;return {...source,...Object.fromEntries(['name','cost','printedCost','civ','civilizations','power','race','type'].map(k=>[k,reference[k]])),id:key,copyOf:source.id,referenceId:reference.id};}catch{return undefined;}
}
export const numeric=value=>value==='∞'?Infinity:Number(value);
export const costValue=c=>numeric(c.cost);
function rawTravelIgnored(s,x){return !!s&&(s.extLimits||[]).some(l=>l.kind==='travelIgnore'&&x.g14IgnoreScopes?.includes(l.scope));}
function travelIgnored(s,x){return rawTravelIgnored(s,x)&&!genmuActive(s);}
function rawNumberIgnored(s,x){return !!s&&(s.extLimits||[]).some(l=>l.kind==='numberIgnore'&&x.g9IgnoreScopes?.includes(l.scope)&&costValue(card(x))===(l.cost==='∞'?Infinity:l.cost));}
function rawSixCreature(s,x){const c=card(x);if(c.type!=='creature')return false;if(!c.natureAce4)return true;const p=s?.players.findIndex(p=>p.battle.some(y=>y.uid===x.uid));return p>=0&&(!!x.aceIgnored||natureElements(s,p)>=4);}
function rawSixMute(s,x){if(!rawSixCreature(s,x))return false;if(!(s?.extLimits||[]).some(l=>l.kind==='g34Mute'))return false;const p=s?.players.findIndex(p=>p.battle.some(y=>y.uid===x.uid));return p>=0&&(s.extLimits||[]).some(l=>l.kind==='g34Mute'&&l.player===p);}
function rawSixNamed(s,x){if(!s||!rawSixCreature(s,x))return false;const monoMasked=s.players.some(p=>p.battle.some(y=>card(y).g32Momo&&!rawNumberIgnored(s,y)&&!rawTravelIgnored(s,y)&&!rawSixMute(s,y)));return s.players.some(p=>p.battle.some(y=>!y.sealed&&card(y).g34Role==='emotional'&&y.g34ChosenName===card(x).name&&!rawSixMute(s,y)&&!rawNumberIgnored(s,y)&&!rawTravelIgnored(s,y)&&!(monoMasked&&civilizations(card(y)).length<=1)));}
export function momoActive(s){return !!s?.players.some(p=>p.battle.some(x=>card(x).g32Momo&&!rawNumberIgnored(s,x)&&!rawTravelIgnored(s,x)&&!rawSixMute(s,x)&&!rawSixNamed(s,x)));}
export function genmuActive(s){return !!s?.players.some(p=>p.battle.some(x=>card(x).ignoreSmall&&!rawNumberIgnored(s,x)&&!rawTravelIgnored(s,x)));}
export function numberIgnored(s,x){return rawNumberIgnored(s,x)&&!genmuActive(s);}
export function natureElements(s,p){return s.players[p].battle.filter(x=>['creature','seed'].includes(card(x).type)&&civilizations(card(x)).includes('自然')).length;}
export function isCreature(s,x){const c=card(x);if(c.type!=='creature')return false;if(!c.natureAce4)return true;const p=s.players.findIndex(p=>p.battle.some(y=>y.uid===x.uid));return p<0||numberIgnored(s,x)||travelIgnored(s,x)||!!x.aceIgnored||natureElements(s,p)>=4;}
function refreshDynamicTypes(s){refreshSeals(s);const g=genmuActive(s);for(const p of[0,1])for(const x of s.players[p].battle)if(card(x).natureAce4){if(!g&&!numberIgnored(s,x)&&!travelIgnored(s,x)&&!rawSixMute(s,x)&&!rawSixNamed(s,x))delete x.aceIgnored;else if(numberIgnored(s,x)||travelIgnored(s,x)||rawSixMute(s,x)||rawSixNamed(s,x)||natureElements(s,p)>=4)x.aceIgnored=true;}extra.gearCleanup(s);for(const own of s.players)for(const x of own.battle)if(card(x).g32Complex||x.g32NoUntap)x.g32NoUntap=extra.photo.noUntap(s,x);for(const own of s.players)for(const x of own.battle)x.g34NoUntap=extra.six.noUntap(s,x);}
export function abilitiesIgnored(s,c){return c.g35Ignored===s?.turn||!!c.sealed||rawSixMute(s,c)||rawSixNamed(s,c)||travelIgnored(s,c)||numberIgnored(s,c)||isCreature(s,c)&&(genmuActive(s)&&costValue(card(c))<=5||momoActive(s)&&civilizations(card(c)).length<=1);}
export function spellIgnored(s,c){if(c.spellSource){const source=card(c.spellSource),face=source&&playFaces(source).find(f=>f.type==='spell');if(face)c={...face,cost:c.cost};}return c.type==='spell'&&(costValue(c)<=5&&genmuActive(s)||momoActive(s)&&civilizations(c.civilizations||c.civ?c:c.id?(card(c.id)||c):c).length<=1);}
// Identity and printed stats stay intact; all abilities, including granted ones, are ignored.
export function effectiveCard(inst,context,forPower=false){
 const base=card(inst),owner=context?.players.findIndex(p=>p.battle.some(x=>x.uid===inst.uid));
 if(owner==null||owner<0)return base;
 if(abilitiesIgnored(context,inst)){const {id,name,type,civ,civilizations,manaValue,cost,power,race,limit,sMax,starEvolution}=base;return extra.utilityNatureSupport.decorate(context,owner,inst,{id,name,type,civ,civilizations,manaValue,cost,...(inst.g40Reckless?.turn===context.turn?{mustAttack:true}:{}),...(sMax?{sMax:true}:{}),...(starEvolution?{starEvolution:true}:{}),power:base.hyperTap&&inst.hyperActive?base.hyper.power:power,race,limit,...(extra.samuraiUnblocked(context,owner,inst)?{unblockable:true}:{})});}
 let c=base.hyper&&inst.hyperActive?{...base,...base.hyper}:base;if(base.natureAce4&&!isCreature(context,inst))c={...c,type:'seed',power:0};
 if(String(c.race).includes('生徒会組')&&context.players[owner].battle.some(x=>!abilitiesIgnored(context,x)&&card(x).g28Suzu))c={...c,slayer:true};
 if(c.g38EnemyTurnBonus&&context.active!==owner)c={...c,power:c.power+c.g38EnemyTurnBonus};
 if(c.g39Verde)c={...c,civilizations:['光','水','闇','火','自然'],civ:'光/水/闇/火/自然'};
 if(c.g39Fuujin&&!context.players[1-owner].shields.length)c={...c,speedAttacker:true};
 if(c.g38Mela&&!context.players[owner].shields.length)c={...c,blocker:true};
 if(c.madoDeSuzaku&&layers(inst).length>=5)c={...c,opponentTapEntry:true};
 if(c.type==='creature'&&context.players[owner].battle.some(x=>!abilitiesIgnored(context,x)&&card(x).madoGiruUnblock))c={...c,unblockable:true};
 if(c.sheket&&context.players[owner].battle.filter(x=>['creature','seed'].includes(card(x).type)&&civilizations(card(x)).includes('光')).length>=5)c={...c,power:c.power+10000,breaker:3,sheketAttack:true};
 if(c.type==='creature'&&context.players[owner].battle.some(x=>x.uid!==inst.uid&&!abilitiesIgnored(context,x)&&card(x).bakteras))c={...c,blocker:true,speedAttacker:true};
 if(c.type==='creature'&&context.players[owner].battle.some(x=>!abilitiesIgnored(context,x)&&card(x).gachiTeamSpeed))c={...c,speedAttacker:true};
 if(c.type==='creature'&&civilizations(c).includes('水')&&context.players[1-owner].shields.length<=2&&context.players[owner].battle.some(x=>!abilitiesIgnored(context,x)&&card(x).gachiRoboProtect))c={...c,unblockable:true,cannotBeAttacked:true};
 if(c.type==='creature'&&String(c.race).includes('コマンド')&&context.players[owner].battle.some(x=>!abilitiesIgnored(context,x)&&card(x).giraCommands))c={...c,speedAttacker:true,machFighter:true,unblockable:true};
 if((inst.g11Triple||[]).some(g=>g.turn===context.turn&&!spellIgnored(context,{type:'spell',cost:g.cost,spellSource:g.spellSource})))c={...c,breaker:c.breaker==='∞'?'∞':Math.max(3,Number(c.breaker)||1)};
 if(c.hachiStorm)c={...c,power:c.power+new Set(context.players[owner].battle.filter(x=>isCreature(context,x)).map(x=>costValue(card(x)))).size*3000};
 if(inst.justDiverActive)c={...c,justDiver:true};
 if(inst.g2Blocker?.length)c={...c,blocker:true};
 if(inst.g19Blocker!==undefined)c={...c,blocker:true};
 if(civilizations(base).length>1&&context.players[owner].battle.some(x=>x.uid!==inst.uid&&!abilitiesIgnored(context,x)&&card(x).multiAssault))c={...c,speedAttacker:true,machFighter:true,escape:true};
 if(c.type==='creature'&&context.players[owner].battle.some(x=>!abilitiesIgnored(context,x)&&card(x).hades))c={...c,escape:true};
 if(c.oniTime&&context.players.reduce((n,p)=>n+p.shields.length,0)<=6)c={...c,power:c.power+4000,breaker:2};
 if((inst.g18Blocker||[]).some(x=>!spellIgnored(context,{type:'spell',cost:x.cost,spellSource:x.spellSource})))c={...c,blocker:true};
 if(extra.samuraiSpeed(context,owner,inst))c={...c,speedAttacker:true};
 if(extra.samuraiUnblocked(context,owner,inst))c={...c,unblockable:true};
 const kohaku=(c.g27Kohaku?1:0)+(inst.under?.length?layers(inst).slice(1).filter(x=>card(x).g27Kohaku).length:0);if(kohaku)c={...c,g27KohakuCount:kohaku};
 if(layers(inst).slice(1).some(x=>card(x).soulBlocker))c={...c,blocker:true};
 if(c.gggSpeed&&context.players[owner].hand.length<=1)c={...c,speedAttacker:true};
 if((inst.g9Speed||[]).some(g=>g.turn===context.turn&&!spellIgnored(context,{type:'spell',cost:g.cost,spellSource:g.spellSource})))c={...c,speedAttacker:true};
 if(c.race?.includes('マジック')&&context.players[owner].battle.some(x=>!abilitiesIgnored(context,x)&&card(x).kakumeijin))c={...c,speedAttacker:true};
 if(inst.gospelSpeed===context.turn)c={...c,speedAttacker:true};if(extra.bolshack.grants(context,owner,inst))c={...c,blocker:true,speedAttacker:true};
 if(c.type==='creature'&&context.players[owner].battle.some(x=>!abilitiesIgnored(context,x)&&card(x).hunterSpeed))c={...c,speedAttacker:true};
 if(c.hunterShieldSpeed&&context.players[1-owner].shields.length>=5)c={...c,speedAttacker:true};
 if(c.type==='creature'&&base.spellFace&&context.players[owner].battle.some(x=>!abilitiesIgnored(context,x)&&card(x).zenon))c={...c,speedAttacker:true};
 if(c.race?.includes('デスパペット')&&context.players[owner].battle.some(x=>!abilitiesIgnored(context,x)&&card(x).puppetLord))c={...c,blocker:true};
 if(c.katsuZero&&context.players[owner].shields.length===0)c={...c,power:c.power+10000,speedAttacker:true,breaker:3};
 if(c.type==='creature'&&civilizations(c).length>1&&context.players[owner].battle.some(x=>!abilitiesIgnored(context,x)&&card(x).burstSpeed))c={...c,speedAttacker:true};
 if(c.type==='creature'&&String(c.race).includes('ジャイアント')&&context.players[owner].battle.some(x=>!abilitiesIgnored(context,x)&&card(x).giantUnblock))c={...c,unblockable:true};
 if(c.type==='creature'&&String(c.race).includes('アビス')&&context.players[owner].battle.some(x=>!abilitiesIgnored(context,x)&&card(x).abyssLord))c={...c,machFighter:true};
 if(c.abyssTeresco)c={...c,power:c.power+context.players.filter(p=>!p.hand.length).length*5000};
 c=extra.lionelDecorate(context,owner,inst,c);c=extra.travelDecorate(context,owner,inst,c);
 if(c.g31GravePower)c={...c,power:c.power+context.players[owner].grave.length*1000};
 if(c.g31Gar&&context.players[owner].battle.some(x=>x.uid!==inst.uid&&!x.sealed&&String(card(x).race).includes('ドラゴン')))c={...c,attackBonus:6000,breaker:3};
 if(c.g122DarkGravePower&&!forPower){const n=power(inst,inst.uid===context.attack?.attacker,context);c={...c,breaker:c.breaker==='∞'?'∞':Math.max(Number(c.breaker)||1,n>=6000?2:1)};}
 if(c.g116ShieldDragon&&!forPower){const n=power(inst,inst.uid===context.attack?.attacker,context);c={...c,breaker:c.breaker==='∞'?'∞':Math.max(Number(c.breaker)||1,n>=15000?3:n>=6000?2:1)};}
 if(c.poweredBreaker&&!forPower){const n=power(inst,inst.uid===context.attack?.attacker,context);c={...c,breaker:n===Infinity||c.breaker==='∞'?'∞':Math.max(Number(c.breaker)||1,1+Math.floor(n/6000))};}
 c=extra.utilityDragon.decorate(context,owner,inst,c);
 c=extra.utilityRaid.decorate(context,owner,inst,c);
 c=extra.utilityGraveKnights.decorate(context,owner,inst,c);
 c=extra.utilityRomano.decorate(context,owner,inst,c);
 c=extra.utilityTide.decorate(context,owner,inst,c);
 c=extra.utilityTop.decorate(context,owner,inst,c);
 return extra.utilityNatureSupport.decorate(context,owner,inst,extra.utilityGuard.decorate(context,owner,inst,extra.saga.decorate(context,owner,inst,extra.combat.decorate(context,owner,inst,extra.firebird.decorate(context,owner,inst,extra.history.decorate(context,owner,inst,extra.continuation.decorate(context,owner,inst,extra.six.decorate(context,owner,inst,extra.shieldPhoto.decorate(context,owner,inst,extra.photo.decorate(context,owner,inst,c))))))))));
}
export const playFaces=c=>c.spellFace?[c,{id:c.id,limit:c.limit,...c.spellFace}]:[c];
const executionCard=c=>c.g39InGrave?{...c,civilizations:card(c.id).civilizations,civ:card(c.id).civ,g39InGrave:false}:c;
export function canCastSpell(s,p,c,origin=null){c=executionCard(c);if(!extra.saga.allowedCast(s,p,c)||!extra.cyber.allowedCast(s,p,c,origin)||!extra.combat.allowedCast(s,p,c,origin))return false;if(c.type==='spell'&&!canMoveZone(s,p,origin))return false;if(c.type==='castle'&&!canAddShield(s,p))return false;if(!extra.environment.allowedCast(s,p,c)||!extra.six.allowedCast(s,p,c))return false;if(c.type==='spell'&&s.active===1-p&&s.players[1-p].battle.some(x=>effectiveCard(x,s).g32Dolf))return false;if(!extra.viride.spellAllowed(s,p,c)||origin&&!extra.originAllowed(s,p,origin))return false;return extra.spellPermission(s,p,c)||extra.allowedCard(s,p,c)&&(c.type!=='spell'||(extra.allowedSpell(s,p,c)&&!s.players[1-p].battle.some(x=>c.cost<=(effectiveCard(x,s).spellLockMaxCost??-1))&&!(s.extLimits||[]).some(l=>l.player===p&&(l.kind==='cast'||l.kind==='spellCostLock'&&costValue(c)<=l.max||l.kind==='numberCast'&&(l.creatureSource||!spellIgnored(s,{type:'spell',cost:4}))&&costValue(c)===(l.cost==='∞'?Infinity:l.cost)))));}
export const canUntap=c=>!c.sealed&&!c.tapLocks?.length&&!c.g32NoUntap&&!c.g34NoUntap;
export function validateDeck(deck){
 const errors=[];
 if(!deck||!Array.isArray(deck.cards))return ['デッキ形式が正しくありません'];
 let total=0;const counts={};
 for(const row of deck.cards){
  if(!row||typeof row.id!=='string'||!Number.isSafeInteger(row.count)||row.count<1||row.count>40){errors.push('カードの枚数が正しくありません');continue;}
  total+=row.count;counts[row.id]=(counts[row.id]||0)+row.count;
 }
 for(const[id,n]of Object.entries(counts)){const c=catalogue.get(id);if(!c)errors.push(`未対応カード：${id}`);else if(n>deckCopyLimit(c,deck))errors.push(`${c.name}は${deckCopyLimit(c,deck)}枚までです`);}
 if(total!==40)errors.push(`40枚必要です（現在${total}枚）`);
 if(deck.format&&deck.format!=='original')errors.push('現在はオリジナルのみ対応しています');
 return [...new Set(errors)];
}
const effectContexts=new WeakMap();
const effectActor=s=>effectContexts.get(s)??null;
function withEffect(s,p,fn){const prev=effectContexts.get(s);effectContexts.set(s,p);try{return fn();}finally{if(prev===undefined)effectContexts.delete(s);else effectContexts.set(s,prev);}}
let randomSource=null;
let manaTransaction=null;
// Hypothetical positions use their own deterministic RNG, including on the server.
const aiProjections=new WeakSet();
let aiPlanningDepth=0;
export function setRandomSource(source=null){if(source!==null&&typeof source!=='function')throw TypeError('乱数源が正しくありません');randomSource=source;}
export function random(state){
 const external=randomSource&&!aiPlanningDepth&&!aiProjections.has(state),next=()=>{if(external)return randomSource();let t=state.rng+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};
 // Replay the same random samples when a human revises a payment. Never reroll.
 if(manaTransaction){const t=manaTransaction,i=t.randomIndex++;if(i===t.randomTape.length)t.randomTape.push(next());else if(!external)next();return t.randomTape[i];}return next();
}
export function shuffled(items,seed){const s={rng:seed>>>0},out=[...items];for(let i=out.length-1;i>0;i--){const j=Math.floor(random(s)*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
const instance=(id,uid)=>({cardId:id,uid,tapped:false,entered:0,buff:0,unblocked:false});
export function createGame(decks,{seed=1,first=0,challenge=null}={}){
 for(const d of decks){const e=validateDeck(d);if(e.length)throw Error(e.join(' / '));}
 const s={seed:seed>>>0,rng:(seed^0x317)>>>0,first,active:first,turn:1,phase:'charge',winner:null,reason:'',decision:null,after:[],log:[],actions:0,version:ENGINE_VERSION,metrics:[0,1].map(()=>({played:{},earlyPlayed:{},firstCreature:null,charges:0,breaks:0,triggers:0,turns:0}))};
 s.players=decks.map((d,p)=>{let n=0;const deck=shuffled(d.cards.flatMap(r=>Array.from({length:r.count},()=>instance(r.id,`${p}-${n++}`))),seed^(p?0x9e3779b9:0x42));const shields=deck.splice(0,5),hand=deck.splice(0,5);return {name:d.name,knownDeck:d.cards.map(r=>({id:r.id,count:r.count})),deck,hand,shields,mana:[],battle:[],grave:[],extra:[],seals:[],turns:0};});
 if(challenge){if(challenge.seat!==1||!CHALLENGER_IDS.includes(challenge.heroId))throw Error('チャレンジの設定が正しくありません');s.challenge={heroId:challenge.heroId,seat:1,signature:[...(challenge.signature||[])]};
  const own=s.players[1],pool=[...own.hand,...own.deck],chosen=new Set(chooseHeroOpening(pool.map(x=>({id:x.cardId,uid:x.uid,faces:playFaces(card(x))})),challenge.heroId));
  own.hand=pool.filter(x=>chosen.has(x.uid));own.deck=pool.filter(x=>!chosen.has(x.uid));
 }
 s.players[first].turns=1;s.metrics[first].turns=1;
 log(s,first,'start','対戦開始。先攻の最初のドローを省略');return s;
}
function log(s,p,type,text,extra={}){s.log.push({index:s.log.length,turn:s.turn,player:p,type,text,...extra});}
function endGame(s,winner,reason){s.winner=winner;s.reason=reason;s.decision=null;delete s.lossEvent;log(s,winner,'finish',reason);}
function finish(s,winner,reason,kind='win',condition=null){
 if(s.winner!==null)return;if(extra.noLose(s,1-winner,condition==='directAttack'?'directAttack':kind)){log(s,1-winner,'lossPrevented','ゲームに負けない効果が適用中');return;}
 if(kind!=='replacementWin'&&extra.lossOptions(s,1-winner).length){s.lossEvent??={winner,loser:1-winner,reason,condition};return;}
 endGame(s,winner,reason);
}
function deckCheck(s,p){if(!s.players[p].deck.length&&!extra.deckSafe(s,p))finish(s,1-p,`${s.players[p].name}の山札がなくなった`,'loss','deck');}
// State-based defeat is checked before queued death abilities (official QA36823).
function advanceLoss(s){
 const e=s.lossEvent;if(!e||s.winner!==null)return false;
 if(['g12Loss','g25_Oni','g24_UraReplace','g34_Custom'].includes(s.decision?.task?.op))return true;
 if(!e.captured){e.resume=s.decision;e.captured=true;}
 const choices=extra.lossOptions(s,e.loser);if(!choices.length){endGame(s,e.winner,e.reason);return true;}
 s.decision={type:'extended',player:e.loser,source:choices[0].cardId,title:'敗北を置き換える効果を選ぶ',task:extra.task('g12Loss',e.loser,choices[0].cardId),choices};return true;
}
function replaceLoss(s,p,uid){
 const e=s.lossEvent,own=s.players[p],x=own.battle.find(x=>x.uid===uid);if(!e||e.loser!==p||!x||!extra.canLeave(s,p,x))throw Error('適用できない敗北置換です');
 const snapshot=extra.leaveSnapshot(s,[{player:p,uid}]),all=layers(x);recordLastPower(s,p,x,all);extra.leaving(s,p,x,!!effectiveCard(x,s).kakuLeave,snapshot,'grave',true);
 remove(own.battle,uid);for(const y of all)clearBattleState(y);addZone(s,own,'grave',...all);if(s.attack&&[s.attack.attacker,s.attack.target,s.attack.blockUid].includes(uid))s.attack=null;
 log(s,p,'lossReplace',card(x).name+'をかわりに破壊し、敗北を置換',{cardId:x.cardId});delete s.lossEvent;s.decision=e.resume;
 if(e.condition==='deck'&&!own.deck.length)finish(s,e.winner,e.reason,'loss','deck');
}
function replaceHandLoss(s,p,uid){const e=s.lossEvent,x=s.players[p].hand.find(x=>x.uid===uid);if(!e||e.loser!==p||!x||!extra.lossOptions(s,p).some(o=>o.value?.kind==='baba'&&o.value.uid===uid))throw Error('適用できない手札の敗北置換です');remove(s.players[p].hand,uid);clearBattleState(x,'deck');s.players[p].deck.push(x);delete s.lossEvent;s.decision=e.resume;log(s,p,'lossReplace',card(x).name+'を公開して山札の下に置き、敗北を置換',{cardId:x.cardId});}
function replaceJohnnyHandLoss(s,p,uid){const e=s.lossEvent,own=s.players[p],x=own.hand.find(x=>x.uid===uid);if(!e||e.loser!==p||!x||!extra.lossOptions(s,p).some(o=>o.value?.kind==='johnnyHand'&&o.value.uid===uid))throw Error('適用できない手札の敗北置換です');remove(own.hand,uid);clearBattleState(x,'grave');addZone(s,own,'grave',x);own.discardedThisTurn=true;delete s.lossEvent;s.decision=e.resume;log(s,p,'lossReplace',card(x).name+'を手札から捨てて敗北を置換',{cardId:x.cardId});}
function declineLoss(s){const e=s.lossEvent;if(e)endGame(s,e.winner,e.reason);}
function completeLossReplacement(s,message='鬼S-MAX：表向きのカード3枚を破壊して敗北を置換'){const e=s.lossEvent;delete s.lossEvent;s.decision=e.resume;log(s,e.loser,'lossReplace',message);if(e.condition==='deck'&&!s.players[e.loser].deck.length)finish(s,e.winner,e.reason,'loss','deck');}
// Replacement payments destroy physical cards directly, including evolution layers.
// They cannot apply Star, EX Life, or another leave/destroy replacement again.
function destroyReplacementCards(s,p,uids,snapshot=null){
 const own=s.players[p],ids=new Set(uids),tops=own.battle.filter(x=>layers(x).some(y=>ids.has(y.uid)));
 snapshot??=extra.leaveSnapshot(s,tops.filter(x=>ids.has(x.uid)).map(x=>({player:p,uid:x.uid})));
 for(const top of tops){
  const selected=layers(top).filter(x=>ids.has(x.uid));for(const x of selected)if(x!==top)extra.combat.layerLeaving(s,p,top,x);recordLastPower(s,p,top,selected);
  if(ids.has(top.uid))extra.leaving(s,p,top,!!effectiveCard(top,s).kakuLeave,snapshot,'grave',true);
 }
 const prune=x=>{const below=(x.under||[]).flatMap(prune);if(ids.has(x.uid))return below;if(below.length)x.under=below;else delete x.under;return [x];};
 for(const top of tops){const selected=layers(top).filter(x=>ids.has(x.uid)),index=own.battle.indexOf(top),wasEvolution=isEvolution(top),survivors=prune(top);if(ids.has(top.uid)&&!wasEvolution){selected.push(...survivors.flatMap(layers));survivors.length=0;}
  if(ids.has(top.uid)){own.battle.splice(index,1,...survivors);const base=survivors[0];if(base){const underEntered=base.entered||0;for(const k of['tapped','entered','buff','unblocked','tapLocks','buffSources','unblockSpellCost','powerModifiers','skipUntap','gospelSpeed','g19Protected','g19Blocker','justDiverActive'])if(top[k]!==undefined)base[k]=structuredClone(top[k]);base.entered=Math.max(base.entered||0,underEntered);extra.inherit(s,top,base);}if(s.attack)for(const k of['attacker','target','blockUid'])if(s.attack[k]===top.uid){if(base)s.attack[k]=base.uid;else s.attack=null;break;}}
  for(const x of selected){clearBattleState(x,'grave');addZone(s,own,'grave',x);}
 }
 refreshDynamicTypes(s);
}
export function canMoveZone(s,p,origin){return !['mana','grave'].includes(origin)||!s.players[1-p].battle.some(x=>card(x)?.g44Apul&&!abilitiesIgnored(s,x)&&isCreature(s,x));}
export function lookPublic(s,p){return s.players[1-p].battle.some(x=>card(x)?.g44Tsu&&!abilitiesIgnored(s,x)&&isCreature(s,x));}
export function lookCount(s,p,n){if(deckLocked(s,p))return 0;return s.players[1-p].battle.some(x=>card(x)?.g44Tsu&&!abilitiesIgnored(s,x)&&isCreature(s,x))?Math.min(1,n):n;}
export function deckLocked(s,p){return s.players[1-p].battle.some(x=>{const c=effectiveCard(x,s);return c.qqLock||c.g42QX;});}
function checkSidewaysHand(s,p){if(s.winner!==null||s.lossEvent)return;for(const x of s.players[p].hand)if(x.g11FromSideways){delete x.g11FromSideways;if(s.players[1-p].battle.some(x=>effectiveCard(x,s).qqLock)){finish(s,1-p,'Q.Q.QX.：山札の横向きのカードを手札に加えた','loss','qq');break;}}}
export function shuffleLibrary(s,p,added=[],source=null){const own=s.players[p];own.deck.push(...added);if(deckLocked(s,p)){if(added.length)extra.put(s,extra.task('g11_Insert',p,source||added[0].cardId,{uids:added.map(x=>x.uid)}));return;}for(const x of own.deck)delete x.g11Sideways;own.deck=shuffled(own.deck,Math.floor(random(s)*4294967296));}
function takeDeckTop(s,p){const own=s.players[p],protectedIds=[...(own.g39Protected||[]),...(own.g38Protected||[]),...(own.g36Protected||[]),...(own.g35Protected||[]),...(own.g34Protected||[]),...(own.g33Protected||[]),...(own.g29Protected||[]),...(own.g28Protected||[]),...(own.g27Protected||[]),...(own.g13Protected||[]),...(own.g4Protected||[]),...(own.g8Protected||[]),...(own.g14Protected||[]),...(own.g25Protected||[]),...(own.g18Protected||[]),...(own.g10Protected||[]),...(own.g17Protected||[]),...(own.g3Protected||[]),...(own.g2Protected||[]),...(own.g19Reveals||[]),...(own.g21Protected||[]),...(own.g7Reveals||[]),...(own.g12Reveals||[])],i=own.deck.findIndex(x=>!protectedIds.includes(x.uid));return i<0?null:own.deck.splice(i,1)[0];}
function takeDrawCard(s,p){
 if(s.challenge?.seat!==p||!CHALLENGER_IDS.includes(s.challenge.heroId)||deckLocked(s,p))return takeDeckTop(s,p);
 const own=s.players[p],protectedIds=new Set(Object.entries(own).filter(([k,v])=>Array.isArray(v)&&(/Protected$|Reveals$/.test(k))).flatMap(([,v])=>v));
 const describe=x=>{const c=card(x);return {uid:x.uid,id:c.id,faces:playFaces(c).map(f=>({...f,usable:canCastSpell(s,p,f)&&(f.type!=='creature'||canEnterCreature(s,p,f))&&validMana(s,p,f)&&(!f.evolution||evolutionBases(s,p,f).length>0)}))};};
 const choices=own.deck.filter(x=>!protectedIds.has(x.uid)).map(describe);
 const publicCreature=(x,who)=>{const c=effectiveCard(x,s);return {id:x.cardId,cost:costValue(c),race:c.race,name:c.name,civilizations:civilizations(c),tapped:x.tapped,sealed:!!x.sealed,power:power(x,false,s),blocker:!!c.blocker,breaker:c.breaker==='∞'?'∞':(c.breaker||1)+(c.extraBreak||0),noPlayerAttack:!!(c.noAttack||c.noPlayerAttack),attackLocked:attackLocked(s,who,x)};};
 const uid=chooseHeroDraw(choices,{heroId:s.challenge.heroId,signature:s.challenge.signature,mana:own.mana.length,colors:[...new Set(own.mana.flatMap(x=>manaCivilizations(card(x))))],hand:own.hand.map(describe),battle:own.battle.map(x=>publicCreature(x,p)),enemyBattle:s.players[1-p].battle.map(x=>publicCreature(x,1-p)),shields:own.shields.length,enemyShields:s.players[1-p].shields.length,active:s.active===p});
 const i=own.deck.findIndex(x=>x.uid===uid);return i<0?null:own.deck.splice(i,1)[0];
}
function draw(s,p,n,{unreplaceable=false}={}){let actual=0;for(let i=0;i<n&&s.winner===null;i++){if(!unreplaceable&&babyloniaDraw(s,p))continue;if(!unreplaceable&&!s.players[p].deck.length&&extra.deckSafe(s,p)&&s.players[p].battle.some(x=>effectiveCard(x,s).bigBang)){extra.put(s,extra.task("g10_Draws",p,s.players[p].battle.find(x=>effectiveCard(x,s).bigBang).cardId,{n:n-i}));break;}const last=s.players[p].deck.length===1&&!extra.deckSafe(s,p)&&!extra.seed.noLose(s,1-p,'replacementWin')&&s.players[p].battle.some(x=>effectiveCard(x,s).shako),c=takeDrawCard(s,p);if(c){clearBattleState(c,'hand');s.players[p].hand.push(c);actual++;if(!last&&c.g11FromSideways){checkSidewaysHand(s,p);if(s.winner!==null||s.lossEvent){if(n-i-1&&s.lossEvent)extra.put(s,extra.task('draw',p,c.cardId,{n:n-i-1}));break;}}}if(last&&c){finish(s,p,'シャコガイル：山札の最後の1枚を引いて勝利','replacementWin');if(s.winner===null)deckCheck(s,p);}else deckCheck(s,p);checkSidewaysHand(s,p);}extra.drawn(s,p,actual);log(s,p,'draw',`カードを${actual}枚引いた`);}
function mill(s,p,n){for(let i=0;i<n&&s.winner===null;i++){const x=takeDeckTop(s,p);if(x){clearBattleState(x);addZone(s,s.players[p],'grave',x);}deckCheck(s,p);}}

function addZone(s,player,zone,...cards){if(!cards.length)return;for(const x of cards){if(zone==='grave'&&card(x.cardId)?.g39Verde)x.g39GraveColors=true;else delete x.g39GraveColors;}const p=typeof player==='number'?player:s.players.indexOf(player);if(p<0)throw Error('移動先のプレイヤーを確認できません');if(zone==='mana'&&(extra.manaTap(s,p)||s.players[1-p].battle.some(x=>effectiveCard(x,s).g35Venom)))for(const x of cards)x.tapped=true;if(zone==='deckFourth'){for(const x of cards)x.g11Sideways=true;s.players[p].deck.splice(Math.min(3,s.players[p].deck.length),0,...cards);return;}if(zone!=='deck')for(const x of cards){if(x.g11Sideways&&zone==='hand')x.g11FromSideways=true;delete x.g11Sideways;}const list=s.players[p][zone];list.push(...cards);if(zone==='hand')checkSidewaysHand(s,p);if(zone==='grave')extra.graveAdded(s,p,cards,s.leaving?.snapshot?.mado);if(zone==='mana')extra.revisions.manaAdded(s,p,cards);if(zone==='extra')extra.extraAdded(s,p,cards);}
export const visibleBattleCards=(s,p)=>[...s.players[p].battle.filter(x=>!x.sealed),...(s.players[p].seals||[])];
function refreshSeals(s){for(const own of s.players)for(const x of own.battle){if((own.seals||[]).some(y=>y.sealOf===x.uid))x.sealed=true;else delete x.sealed;}}
function moveSeal(s,p,uid,to='grave',shield=null){if((to==='shields'||shield)&&!canAddShield(s,p))return null;const own=s.players[p],target=own.seals?.find(x=>x.uid===uid)?.sealOf,x=remove(own.seals||[],uid);if(!x)return null;clearBattleState(x,to);if(shield)addShieldCard(s,p,shield,x);else if(to==='deckTop')own.deck.unshift(x);else addZone(s,p,to,x);refreshSeals(s);extra.six.fifteen.unsealed(s,p,target);log(s,p,'unseal',to==='grave'?'封印を墓地へ置く':'封印を'+({hand:'手札',mana:'マナ',deck:'山札の下',shields:'シールド',extra:'超次元ゾーン'}[to]||to)+'へ移動');return x;}
function seal(s,p,uids,n=1){const own=s.players[p];for(const uid of uids){const x=own.battle.find(x=>x.uid===uid&&!x.sealed);if(!x)continue;for(let i=0;i<n;i++){const top=takeDeckTop(s,p);if(top){clearBattleState(top,'seals');top.faceDown=true;top.sealOf=x.uid;delete x.g40Reckless;(own.seals??=[]).push(top);x.sealed=true;log(s,p,'seal',card(x.cardId).name+'に封印を付ける',{cardId:x.cardId});}deckCheck(s,p);if(s.winner!==null||s.lossEvent)break;}}refreshDynamicTypes(s);}
function recordCombat(s,p){s.g4Combat??=[null,null];const x=s.g4Combat[p];s.g4Combat[p]={turn:s.turn,count:x?.turn===s.turn?x.count+1:1};}
function attachMugenBases(s,p,inst,refs){const all=[];for(const r of refs){const own=s.players[p],x=remove(own[r.origin],r.uid);if(!x)throw Error('無月の門の素材がありません');const cards=layers(x);if(r.origin==='battle')recordLastPower(s,p,x,cards);for(const y of cards){if(r.origin!=='battle')clearBattleState(y,'battle');else{delete y.under;delete y.godLinks;}}all.push(...cards);}inst.under=all;log(s,p,'mugenSummon',card(inst).name+'の下に'+(card(inst).mugenKind==='joker'?'魔導具・ジョーカーズを':'魔導具を')+refs.length+'つ重ねる',{cardId:inst.cardId});}
function detachBattleSource(top,uid){for(const parent of layers(top))for(const key of ['under','godLinks']){const i=parent[key]?.findIndex(x=>x.uid===uid)??-1;if(i<0)continue;const x=parent[key][i];parent[key].splice(i,1,...(key==='under'?[...(x.under||[]),...(x.godLinks||[])]:[]));if(key==='godLinks'&&x.under?.length)(parent.under??=[]).push(...x.under);return x;}return null;}
function moveBattleCard(s,p,uid,to){if(to==='shields'&&!canAddShield(s,p))return;if((s.players[p].seals||[]).some(x=>x.uid===uid)){moveSeal(s,p,uid,to);return;}const own=s.players[p],top=own.battle.find(x=>layers(x).some(y=>y.uid===uid));if(!top)return;if(top.godLinks?.some(x=>x.uid===uid)||top.uid===uid){moveCreatures(s,[{player:p,uid:top.uid,to,destroy:false,cardOnly:true,...(top.godLinks?.length?{godPart:uid}:{})}]);return;}const departing=layers(top).find(y=>y.uid===uid);if(departing)extra.combat.layerLeaving(s,p,top,departing);const x=detachBattleSource(top,uid);if(!x)return;recordLastPower(s,p,top,[x]);clearBattleState(x,to);addZone(s,p,to,x);if(to==='shields')extra.shieldAdded(s,p,x);}
function remove(list,uid){const i=list.findIndex(x=>x.uid===uid);if(i<0)return null;return list.splice(i,1)[0];}
const layers=c=>[c,...(c.under||[]).flatMap(layers),...(c.godLinks||[]).flatMap(layers)];
// Only the marked soul ability transfers; entry effects and other base abilities do not.
export function shieldGuardSources(s,p){return s.players[p].battle.filter(c=>!abilitiesIgnored(s,c)&&c.under?.length&&layers(c).some(x=>card(x).soulShieldGuard));}
function shieldGuardChoices(s){const b=s.shieldBreak;return shieldGuardSources(s,b.player).filter(c=>!b.protections.some(x=>x.uid===c.uid));}
function recordLastPower(s,p,c,leaving){extra.cyber.recordBattleCards(s,p,leaving);
 for(const e of [...(s.pendingEffects||[]),...(s.triggers?.entries||[]),...(s.judge?.deferredEffects||[])])if(e.player===p&&leaving.some(x=>x.uid===e.uid&&(x.incarnation||0)===(e.incarnation||0))){e.lastKnownCost=effectiveCard(c,s).cost;e.lastKnownPower=power(c,c.uid===s.attack?.attacker,s);e.lastKnownCount=layers(c).length;if(e.task)e.task.lastKnownCount=e.lastKnownCount;}
}
function tapCard(s,p,x){if(x&&!x.sealed&&!x.tapped){x.tapped=true;extra.tapped(s,p,x);}}
function clearBattleState(x,to='grave'){for(const k of ['g47ElementRefs','g50KingFace','g50KingDefinition','g50KingdomCount','g50Jo','g50Rx','g50OrderGrant','g50PolecoBroke','g45LemmingBreaker'])delete x[k];if(to==='grave'&&card(x.cardId)?.g39Verde)x.g39GraveColors=true;else delete x.g39GraveColors;delete x.g89Race;delete x.g85RomanoCast;delete x.finishTo;delete x.normalFinish;delete x.crystalFinish;for(const k of['g35Ignored','g35NoAttack','g35ShieldForce','g35Maximum','g35DrawOnBottom'])delete x[k];delete x.g34ChosenName;delete x.g34Delayed;delete x.g34Grants;delete x.g34NoUntap;delete x.g40Reckless;if(x.g11Sideways&&to==='hand')x.g11FromSideways=true;delete x.g11Sideways;delete x.g11Triple;delete x.g26Stay;delete x.g13Rush;delete x.summonedTurn;x.zoneSerial=(x.zoneSerial||0)+1;delete x.sealOf;delete x.sealed;delete x.g14IgnoreScopes;delete x.g14G;delete x.g14Joe;delete x.crossedTo;delete x.g15Blocker;delete x.g18Blocker;delete x.g2Blocker;delete x.g7Para;delete x.g9IgnoreScopes;delete x.g9LockScopes;delete x.g9Speed;delete x.g9Untap;delete x.g9AttackTurn;delete x.g9AttackCount;delete x.g19Blocker;delete x.g19Protected;delete x.g19ShieldST;delete x.under;delete x.godLinks;delete x.g31EndDeath;delete x.g32NoUntap;delete x.g32MomoAttack;delete x.shieldStack;delete x.shieldGroup;delete x.shieldCardOnly;delete x.faceDown;delete x.g22ManaAllowed;delete x.g29Origin;delete x.g5Origin;delete x.g20Origin;delete x.aceIgnored;delete x.gospelSpeed;delete x.skipUntap;delete x.exLifeShieldUid;delete x.exLifeShieldUids;delete x.g29Origin;delete x.hyperActive;delete x.tapLocks;delete x.buffSources;delete x.unblockSpellCost;delete x.powerModifiers;delete x.triggerPlus;delete x.superTrigger;delete x.hyperResolved;delete x.faceUp;delete x.uraNinja;delete x.justDiverActive;delete x.g4WorldUsed;delete x.g30SuperFace;x.tapped=to==='mana'&&manaCivilizations(card(x)).length>1;x.buff=0;x.unblocked=false;x.entered=0;}
function finishShieldGuards(s){
 const b=s.shieldBreak,p=b.player,protectedShields=new Set(b.protections.map(x=>x.shield));
 const remaining=b.uids.filter(uid=>!protectedShields.has(uid));
 // Each reserved stack pays for exactly one shield. All choices precede all moves (609.9).
 const batch=b.protections.map(row=>{const c=s.players[p].battle.find(x=>x.uid===row.uid);return {c,cards:(c.under||[]).flatMap(layers)};});
 for(const {c,cards}of batch)recordLastPower(s,p,c,cards);
 for(const {c,cards}of batch){delete c.under;for(const x of cards)clearBattleState(x);addZone(s,s.players[p],'grave',...cards);log(s,p,'shieldGuard',`${card(c).name}の下のカード${cards.length}枚をすべて墓地へ置き、シールド1つを残す`,{cardId:c.cardId});}
 s.shieldBreak=null;s.decision=null;
 if(remaining.length)commitShieldBreak(s,p,remaining);else s.breakContext=null;
}

export function exLifeShields(s,p,c){if(!effectiveCard(c,s).exLife)return[];const ids=new Set(layers(c).flatMap(x=>[...(x.exLifeShieldUids||[]),...(x.exLifeShieldUid?[x.exLifeShieldUid]:[])]));return s.players[p].shields.filter(x=>ids.has(shieldGroup(x)));}
export function exLifeShieldInfo(s,p,uid){
 for(const top of s.players[p].battle)for(const source of layers(top))if(s.players[p].shields.some(x=>(x.uid===uid||shieldGroup(x)===uid)&&[source.exLifeShieldUid,...source.exLifeShieldUids||[]].includes(shieldGroup(x))))return {sourceUid:source.uid,sourceCardId:source.cardId,active:exLifeShields(s,p,top).some(x=>shieldCards(x).some(c=>c.uid===uid)||shieldGroup(x)===uid)};
 return null;
}
function shieldLeft(s,p,x,group=null){
 extra.shieldLeft(s,p,x,group);delete x.g19ShieldST;
 if(group!==null)for(const top of s.players[p].battle)for(const c of layers(top)){if(c.exLifeShieldUid===group)delete c.exLifeShieldUid;if(c.exLifeShieldUids)c.exLifeShieldUids=c.exLifeShieldUids.filter(x=>x!==group);}
 for(const who of [0,1])for(const c of s.players[who].battle)if(card(c).zRush){if(!c.hyperActive)log(s,who,'hyper',`${card(c).name}のZラッシュでハイパーモードを解放`,{cardId:c.cardId});c.hyperActive=true;}
}
function removeShield(s,p,uid){const own=s.players[p],root=findShield(own,uid);if(!root)return null;if(shieldCards(root).some(x=>x.g37ShieldHeld)){const moved=shieldCards(root).filter(x=>!x.g37ShieldHeld).map(x=>removeShieldCard(s,p,x.uid)).filter(Boolean);if(!moved.length)return null;const first=moved.shift();if(moved.length)first.shieldStack=moved;return first;}remove(own.shields,root.uid);for(const [i,x] of shieldCards(root).entries())shieldLeft(s,p,x,i===0?shieldGroup(root):null);return root;}
function removeShieldCard(s,p,uid){if(s.players[p].shields.flatMap(shieldCards).some(x=>x.uid===uid&&x.g37ShieldHeld))return null;const row=detachShieldCard(s.players[p],uid);if(!row)return null;shieldLeft(s,p,row.card,row.removedGroup?row.group:null);return row.card;}
function moveShield(s,p,uid,to,{cardOnly=false,handEffects=true,replacement=false}={}){if(to==='shields'&&!canAddShield(s,p))return [];const root=cardOnly?removeShieldCard(s,p,uid):removeShield(s,p,uid),all=shieldCards(root);for(const x of all){const target=!replacement&&x.faceUp&&card(x).gCastle||to==='mana'&&extra.manaRedirect(s,p)?'grave':to;clearBattleState(x,target);addZone(s,s.players[p],target,x);if(target==='hand'&&handEffects)extra.shieldHand(s,p,x);}return all;}
function addShieldCard(s,p,uid,x,options={}){if(!canAddShield(s,p))return false;if(!attachShield(s.players[p],uid,x,options))return false;extra.shieldAdded(s,p,x);for(const y of s.players[p].battle)if(effectiveCard(y,s).shieldEntryTapLock)enqueueEffect(s,p,{uid:y.uid,source:y.cardId,effect:'shieldEntryTapLock'});return true;}
function sendBattleCardToShield(s,p,uid,shield){if(!canAddShield(s,p))return;if((s.players[p].seals||[]).some(x=>x.uid===uid)){moveSeal(s,p,uid,'shields',shield);return;}const own=s.players[p],top=own.battle.find(x=>layers(x).some(y=>y.uid===uid));if(!top||!findShield(own,shield))return;if(top.godLinks?.some(x=>x.uid===uid)||top.uid===uid){moveCreatures(s,[{player:p,uid:top.uid,to:'shields',destroy:false,cardOnly:true,shieldAttach:shield,...(top.godLinks?.length?{godPart:uid}:{})}]);return;}const x=detachBattleSource(top,uid);if(!x)return;recordLastPower(s,p,top,[x]);clearBattleState(x,'shields');addShieldCard(s,p,shield,x);}

function deckRedirect(s,p=null){return (p!==null&&extra.manaRedirect(s,p))|| s.players.some(p=>p.battle.some(x=>effectiveCard(x,s).deckRedirect));}
export function canAddShield(s,p){return s.active!==p||!s.players[1-p].battle.some(x=>effectiveCard(x,s).g39Fuujin);}
function shieldTop(s,p,source,exLifeSource=null){
 if(!canAddShield(s,p))return null;
 const own=s.players[p],index=own.deck.findIndex(x=>![...(own.g39Protected||[]),...(own.g38Protected||[]),...(own.g36Protected||[]),...(own.g34Protected||[]),...(own.g33Protected||[]),...(own.g29Protected||[]),...(own.g28Protected||[]),...(own.g27Protected||[]),...(own.g13Protected||[]),...(own.g4Protected||[]),...(own.g8Protected||[]),...(own.g14Protected||[]),...(own.g25Protected||[]),...(own.g18Protected||[]),...(own.g10Protected||[]),...(own.g17Protected||[]),...(own.g3Protected||[]),...(own.g2Protected||[]),...(own.g21Protected||[]),...(own.g19Reveals||[]),...(own.g7Reveals||[]),...(own.g12Reveals||[])].includes(x.uid)),shield=index<0?null:own.deck.splice(index,1)[0];
 if(shield&&s.players.some(p=>p.battle.some(x=>effectiveCard(x,s).deckRedirect))){clearBattleState(shield);addZone(s,own,'grave',shield);log(s,p,'deckReplace','カレイコの黒像でシールドのかわりに墓地へ置く',{cardId:shield.cardId});deckCheck(s,p);return;}
 if(shield){clearBattleState(shield,'shields');own.shields.push(shield);if(exLifeSource){if(card(exLifeSource).extraExLife)(exLifeSource.exLifeShieldUids??=[]).push(shield.uid);else exLifeSource.exLifeShieldUid=shield.uid;}
  log(s,p,exLifeSource?'exLifeAdd':'shieldAdd',`${source.name}${exLifeSource?'のEXライフ':''}で山札の上から1枚をシールド化（内容は非公開）`,{cardId:source.id});
  extra.shieldAdded(s,p,shield);
  for(const c of own.battle)if(effectiveCard(c,s).shieldEntryTapLock)enqueueEffect(s,p,{uid:c.uid,source:c.cardId,effect:'shieldEntryTapLock'});
 }
 deckCheck(s,p);return shield;
}
export function canEnterCreature(s,p,c=null,{origin='hand',execution=true,committed=false}={}){
 if(!canMoveZone(s,p,origin)||!extra.originAllowed(s,p,origin)||!extra.viride.entryAllowed(s,p,c))return false;
 if(!extra.combat.allowedEntry(s,p,c,{origin,execution})||!extra.original.allowedEntry(s,p,c))return false;
 if(!extra.environment.allowedEntry(s,p,c)||!extra.recommended.allowedEntry(s,p,c,{execution}))return false;
 if(c&&execution&&!extra.allowedCard(s,p,c))return false;
 const own=s.players[p];if(c?.g48HandEvolution&&!committed&&own.hand.filter(x=>card(x).type==='creature').length-(origin==='hand'?1:0)<3)return false;if((!c||c.type==='creature')&&own.entryLimitThisTurn&&(own.enteredThisTurn||0)>=1)return false;
 if(!c)return true;if(execution&&!committed&&!extra.six.allowedCast(s,p,c))return false;if(!extra.six.allowedEntry(s,p,c,{origin,execution}))return false;
 if((s.extLimits||[]).some(l=>l.player===p&&l.active!==false&&((l.kind==='entryCost'&&c.type==='creature'&&costValue(c)<=l.max)||(l.kind==='entryPower'&&c.type==='creature'&&numeric(c.power)<=l.max)||(l.kind==='summon'&&execution&&c.type==='creature'&&costValue(c)<=l.max))))return false;
 if(c.type==='creature'&&s.players[1-p].battle.some(x=>effectiveCard(x,s).handEntryOnly)&&origin!=='hand')return false;
 if(c.type==='creature'&&s.players.some(y=>y.battle.some(x=>effectiveCard(x,s).smallSummonLock))&&(c.psychic||execution&&numeric(c.power)<=5000))return false;
 if(c.dream&&own.battle.some(x=>x.cardId===c.id))return false;
 if(s.players[1-p].battle.some(x=>effectiveCard(x,s).entryGate)&&(origin!=='hand'||!execution))return false;
 return true;
}
export function dddPayment(s,p,c){
 if(!c.ddd)return null;
 if(c.ddd.attackDiscount&&s.players[1-p].battle.some(x=>effectiveCard(x,s).noCostReduction))return null;
 if(!c.ddd.attackDiscount)return {cost:c.ddd.cost,civilizations:c.ddd.civilizations||civilizations(c)};
 const colors=new Set(s.players[p].mana.flatMap(x=>manaColors(card(x),s,p)));if(!['光','火','自然'].every(x=>colors.has(x)))return null;
 const attacker=s.players[p].battle.find(x=>x.uid===s.attack?.attacker);return {cost:Math.max(1,8-(attacker?costValue(card(attacker)):0)),civilizations:[]};
}

function limitNextTurn(s,p,source){s.players[1-p].entryLimitNextTurn=true;log(s,p,'entryLimit',`${source.name}：次の相手のターン、相手が出せるクリーチャーは1体まで`,{cardId:source.id});}
export const civilizations=c=>c.civilizations||String(c.civ).split('/');
export const manaCivilizations=c=>[...new Set(playFaces(c).flatMap(civilizations))];
export const manaValueAt=(s,p,x)=>(s.g35ZeroMana||[]).some(l=>l.p===p)?0:manaValue(card(x));
export const manaValue=c=>c.manaValue??(civilizations(c).length===5?0:1);
export const isDragon=c=>c.type==='creature'&&String(c.race).includes('ドラゴン');
export function physicalCards(s){const flatten=c=>[c,...[...(c.under||[]),...(c.shieldStack||[]),...(c.godLinks||[])].flatMap(flatten)];return [...s.players.flatMap(p=>['deck','hand','shields','mana','battle','grave','extra','seals'].flatMap(z=>(p[z]||[]).flatMap(flatten))),...s.players.flatMap(p=>[...(p.g34Holding||[]),...(p.g31Holding||[]),...(p.g29Holding||[]),...(p.g29Reviving||[]),...(p.g24Holding||[]),...(p.g5Holding||[]),...(p.g20Holding||[]),...(p.g21Holding||[]),...(p.g21ManaPending||[]),...(p.g19Holding||[]),...(p.g7Holding||[])].flatMap(flatten)),...(s.g33Executions||[]).filter(x=>!x.options.virtualArgs).flatMap(x=>flatten(x.inst)),...(s.g22Entry?flatten(s.g22Entry.inst):[]),...(s.g22Entries||[]).flatMap(e=>flatten(e.inst)),...(s.resolvingSpell&&!s.resolvingSpell.shieldCast?flatten(s.resolvingSpell.inst):[]),...(s.extSpells||[]).filter(f=>!f.virtual).flatMap(f=>flatten(f.inst))];}
// Destruction-only returns share the mandatory hand-return plan with Eternal Omega.
function leaveOptions(s,row){
 const own=s.players[row.player],batch=s.leaving,usedShields=new Set(batch.rows.flatMap(r=>r.plan?.shield?[r.plan.shield]:r.plan?.kind==='ever'?r.plan.shields:[])),usedMana=new Set(batch.rows.flatMap(r=>r.plan?.mana||[]));
 if(row.selfDeath)return {g47:[],g49:[],ever:[],jashin:[],savak:[],ura:[],ex:null,exChoices:[],gneo:false,star:false,ningyo:false,oni:[],escape:[],mana:[],ultra:[],ater:[],g33:[],muku:[],omega:false,hawk:false,yamata:false};
 const usedSavak=new Set(batch.rows.filter(r=>['savak','g33'].includes(r.plan?.kind)).map(r=>r.plan.uid)),available=x=>!usedShields.has(shieldGroup(x))&&!shieldCards(x).some(c=>usedSavak.has(c.uid)),savak=row.savak?[0,1].flatMap(owner=>s.players[owner].shields.filter(x=>!usedShields.has(shieldGroup(x))).flatMap(shieldCards).filter(x=>x.faceUp&&!usedSavak.has(x.uid)).map(x=>({owner,uid:x.uid,cardId:x.cardId}))):[];
 const usedHand=new Set(batch.rows.flatMap(r=>r.plan?.kind==='jashin'?r.plan.cards:[])),exChoices=exLifeShields(s,row.player,own.battle.find(x=>x.uid===row.uid)).filter(available).map(x=>x.uid);
 const usedFlip=new Set(batch.rows.filter(r=>r.plan?.kind==='g33').map(r=>r.plan.uid));
 return {g47:extra.seed.leaveOptions(s,row,batch),g49:extra.firebird.leaveOptions(s,row,batch),deathDeck:!!row.destroyToDeck,deathMana:!!row.destroyToMana,yamata:row.yamata||row.destroyToMana,omega:row.omega||row.destroyToHand,muku:(row.muku||[]).filter(x=>!batch.rows.some(r=>r.plan?.kind==='g34Stay'&&r.plan.key===x.key)),g33:row.g33?extra.shieldPhoto.up(s,row.player).filter(x=>!usedFlip.has(x.uid)&&!usedSavak.has(x.uid)&&!usedShields.has(shieldGroup(own.shields.find(r=>shieldCards(r).includes(x))))):[],hawk:row.hawk||row.destroyToDeck,ever:row.ever?own.shields.filter(available):[],jashin:row.jashin?own.hand.filter(x=>!usedHand.has(x.uid)):[],savak,ura:row.ura?extra.uraBelow(own.battle.find(x=>x.uid===row.uid)):[],ningyo:row.to==='mana'&&!row.star&&!row.gneo&&!row.ex&&extra.manaRedirect(s,row.player),oni:row.oni?extra.oniCards(s,row.player,batch.rows.flatMap(r=>r.plan?.kind==='oni'?r.plan.cards:[])):[],ex:exChoices[0]||null,exChoices,gneo:row.gneo,star:row.star,escape:row.escape?own.shields.filter(available):[],mana:row.manaGuard?own.mana.filter(x=>!usedMana.has(x.uid)&&canMoveZone(s,row.player,'mana')):[],ultra:own.battle.filter(x=>x.uid!==row.uid&&(row.to==='grave'&&row.destroy!==false&&effectiveCard(x,s).g40Saver&&String(card(own.battle.find(y=>y.uid===row.uid)).race).includes('グランセクト')||effectiveCard(x,s).ultraArmored&&String(card(own.battle.find(y=>y.uid===row.uid)).race).includes('アーマード')||effectiveCard(x,s).ultraMecha&&String(card(own.battle.find(y=>y.uid===row.uid)).race).includes('メカ')||effectiveCard(x,s).ultraGiant&&String(card(own.battle.find(y=>y.uid===row.uid)).race).includes('ジャイアント'))&&extra.canLeave(s,row.player,x)&&!batch.rows.some(r=>r.plan?.kind==='ultra'&&r.plan.uid===x.uid)),ater:row.aterGuard?own.battle.filter(x=>isCreature(s,x)&&x.uid!==row.uid&&!batch.rows.some(r=>r.plan?.kind==='ater'&&r.plan.uid===x.uid)):[]};
}
function shevaProtection(s,p){const own=s.players[p];return own.battle.some(x=>effectiveCard(x,s).sheva)&&new Set(own.battle.map(x=>costValue(card(x)))).size>=5;}
function moveCreatures(s,moves,after=null){
 for(const m of moves)if((s.players[m.player].seals||[]).some(x=>x.uid===m.uid))moveSeal(s,m.player,m.uid,m.to||'grave',m.shieldAttach);
 const rows=moves.flatMap(m=>{const top=s.players[m.player].battle.find(x=>x.uid===m.uid);if(!top||top.sealed||!extra.canLeave(s,m.player,top,{battleLoss:after?.kind==='battleResult'})||m.to==='shields'&&!canAddShield(s,m.player))return [];const by=m.controller??m.by??effectActor(s);if(!m.stateBased&&after?.kind!=='battleResult'&&by===1-m.player&&isCreature(s,top)&&s.g26Extreme?.[m.player])return [];const c=effectiveCard(top,s);if(extra.six.zeroSafe(s,top)&&(m.to||'grave')==='grave'&&m.destroy!==false)return [];if(c.caddy&&(m.to||'grave')==='grave'&&shevaProtection(s,m.player))return [];if(c.type==='creature'&&((m.to||'grave')!=='grave'||m.destroy===false)&&shevaProtection(s,m.player))return [];return [{...m,yamata:isCreature(s,top)&&s.players[m.player].battle.some(x=>effectiveCard(x,s).g40Yamata),to:m.to||'grave',ex:exLifeShields(s,m.player,top)[0]?.uid||null,gneo:!!(c.gNeo&&top.under?.length),star:!!card(top).starEvolution,escape:!!((c.escape||c.g112ShieldGrave)&&m.destroy!==false&&(m.to||'grave')==='grave'),escapeTo:c.g112ShieldGrave?'grave':'hand',manaGuard:c.type==='creature'&&s.players[m.player].battle.some(x=>effectiveCard(x,s).manaGuard),ura:!!c.uraGuard,oni:!!c.oniMax,leaveKaku:!!c.kakuLeave,savak:isCreature(s,top)&&s.players[m.player].battle.some(x=>effectiveCard(x,s).savakGuard),death:m.replacement?null:c.caddy?((m.to||'grave')==='grave'?'mana':null):c.death||null,selfDeath:!!m.replacement||!!(c.caddy&&(m.to||'grave')==='grave'),aterGuard:!!c.aterGuard,jashin:!!c.abyssGuard,ever:isCreature(s,top)&&extra.everSaver(s,m.player),g33:isCreature(s,top)&&extra.shieldPhoto.guard(s,m.player,top),hawk:isCreature(s,top)&&s.players[m.player].battle.some(x=>effectiveCard(x,s).g32Hawk),omega:!!c.g34Omega,destroyToDeck:!!(c.destroyToDeck&&(m.to||'grave')==='grave'&&m.destroy!==false),destroyToMana:!!(c.destroyToMana&&(m.to||'grave')==='grave'&&m.destroy!==false),destroyToHand:!!(c.destroyToHand&&(m.to||'grave')==='grave'&&m.destroy!==false),muku:extra.six.muku(s,m.player,top),plan:null}];});
 if(s.leaving)throw Error('未完了の移動があります');s.leaving={rows,after};advanceLeaving(s);
}
function batchRows(s,p){return s.leaving.rows.filter(r=>r.player===p&&r.to==='deckFourth').flatMap(r=>{const x=s.players[p].battle.find(x=>x.uid===r.uid);return x?layers(x).map(y=>y.uid):[];});}
function ownCardForRow(s,row){return s.players[row.player].battle.find(x=>x.uid===row.uid);}
function reconstructSources(s,p,top){while(top.under?.length){const first=top.under[0];if(!first.faceDown&&['creature','seed','field','gear'].includes(card(first).type))break;top.under.shift();top.under.unshift(...(first.under||[]));clearBattleState(first,'grave');addZone(s,s.players[p],'grave',first);}return top.under||[];}
function advanceLeaving(s){if(s.lossEvent)return;
 if(!s.leaving||s.decision||s.winner!==null)return;
 for(const who of [s.active,1-s.active])for(const row of s.leaving.rows.filter(x=>x.player===who&&!x.plan)){
  const opts=leaveOptions(s,row),foreign=opts.g47.filter(x=>x.controller!==who),ownSeed=opts.g47.filter(x=>x.controller===who);if(foreign.length&&s.active!==who&&!row.g47StratoDeclined){s.decision={type:'leaveReplace',player:s.active,owner:who,uid:row.uid,foreignOnly:true};return;}
  const mandatory=!!(opts.deathMana||opts.omega||opts.ex||opts.gneo||opts.star||opts.ningyo||opts.hawk||ownSeed.some(x=>x.mandatory)),optional=ownSeed.length||opts.g49.length||(opts.yamata&&!opts.deathMana)||opts.muku.length||opts.g33.length||(opts.hawk&&!opts.deathDeck)||opts.exChoices.length>1||opts.ever.length>=2||opts.jashin.length>=2||opts.savak.length||opts.ura.length>=5||opts.oni.length>=3||opts.escape.length||opts.mana.length>=3||opts.ater.length||opts.ultra.length;
  if(!optional&&Number(!!opts.ex)+Number(!!opts.gneo)+Number(!!opts.star)+Number(!!opts.ningyo)+Number(!!opts.omega)+Number(!!opts.deathMana)+Number(!!opts.deathDeck)<=1)row.plan=opts.deathMana?{kind:'yamata'}:opts.deathDeck?{kind:'hawk'}:opts.omega?{kind:'omega'}:opts.ningyo?{kind:'ningyo'}:opts.ex?{kind:'ex',shield:opts.ex}:opts.gneo?{kind:'gneo'}:opts.star?{kind:'star'}:{kind:'leave'};
  else{s.decision={type:'leaveReplace',player:who,uid:row.uid,mandatory};return;}
  if(row.plan?.kind==='leave'&&foreign.length&&!row.g47StratoDeclined){delete row.plan;s.decision={type:'leaveReplace',player:1-who,owner:who,uid:row.uid,foreignOnly:true,ownerPassed:true};return;}
 }
 for(const row of s.leaving.rows){if(row.plan?.kind==='leave'&&!row.g47StratoDeclined){const foreign=leaveOptions(s,row).g47.filter(x=>x.controller!==row.player);if(foreign.length){delete row.plan;s.decision={type:'leaveReplace',player:1-row.player,owner:row.player,uid:row.uid,foreignOnly:true,ownerPassed:true};return;}}const top=s.players[row.player].battle.find(x=>x.uid===row.uid);if(row.plan.kind==='leave'&&top?.godLinks?.length&&!row.godPart){s.decision={type:'godLeave',player:row.player,uid:row.uid,title:'離れるゴッドを1枚選ぶ'};return;}}
 const batch=s.leaving,fourth=[0,1].map(p=>({p,uids:batchRows(s,p)}));
 for(const row of batch.rows)if(row.plan.kind==='yamata'){row.to='mana';row.destroy=false;row.death=null;row.plan={kind:'leave'};}
 for(const row of batch.rows)if(row.plan.kind==='omega'){row.to='hand';row.destroy=false;row.death=null;row.plan={kind:'leave'};}
 for(const row of batch.rows)if(row.plan.kind==='hawk'){if(row.destroyToDeck){const top=ownCardForRow(s,row),rows=layers(top).map((y,i)=>({uid:y.uid,label:y.faceDown?'裏向きのカード '+(i+1):card(y).name,cardId:y.faceDown?null:y.cardId}));if(rows.length>1)(batch.bottomOrders??=[]).push(extra.task('g78_BottomOrder',row.player,top.cardId,{rows,ordered:[],newCards:true}));}row.to='deck';row.destroy=false;row.death=null;row.plan={kind:'leave'};}
 for(const row of batch.rows)if(row.plan.kind==='ningyo'){row.to='grave';row.destroy=false;row.death=null;row.plan={kind:'leave'};}
 const savers=[...new Set(batch.rows.filter(r=>r.plan.kind==='ultra').map(r=>r.plan.uid))];
 batch.snapshot=extra.leaveSnapshot(s,batch.rows.flatMap(r=>r.plan.kind==='oni'?s.players[r.player].battle.filter(x=>r.plan.cards.includes(x.uid)).map(x=>({player:r.player,uid:x.uid})):r.plan.kind==='ultra'?[{player:r.player,uid:r.plan.uid}]:['leave','star','g47','g49'].includes(r.plan.kind)&&!savers.includes(r.uid)?[{player:r.player,uid:r.uid}]:r.plan.kind==='ater'?[{player:r.player,uid:r.plan.uid}]:[]));
 s.g20LeavingUids=[...savers,...batch.rows.flatMap(r=>['leave','star','g47','g49'].includes(r.plan.kind)?[r.uid]:r.plan.kind==='ater'?[r.plan.uid]:[])];
 // Ultra-Saver is itself a replacement: its destruction cannot be replaced again.
 for(const uid of savers){const row=batch.rows.find(r=>r.plan.kind==='ultra'&&r.plan.uid===uid),own=s.players[row.player],x=own.battle.find(x=>x.uid===uid);if(!x)continue;recordLastPower(s,row.player,x,layers(x));extra.leaving(s,row.player,x,!!effectiveCard(x,s).kakuLeave,batch.snapshot,'grave');remove(own.battle,uid);const all=layers(x);for(const y of all)clearBattleState(y);addZone(s,own,'grave',...all);if(s.attack&&[s.attack.attacker,s.attack.target,s.attack.blockUid].includes(uid))s.attack=null;log(s,row.player,'ultraSaver',card(x).name+'をかわりに破壊する',{cardId:x.cardId});}
 // Preserve LKI for every card before applying any of the simultaneous moves.
 for(const row of batch.rows){const c=s.players[row.player].battle.find(x=>x.uid===row.uid);if(!c)continue;if(['leave','star'].includes(row.plan.kind))recordLastPower(s,row.player,c,row.cardOnly||row.plan.kind==='star'?[c]:layers(c));else if(row.plan.kind==='gneo')recordLastPower(s,row.player,c,(c.under||[]).flatMap(layers));}
 for(const row of batch.rows.filter(r=>r.plan.kind==='ater')){const own=s.players[row.player],victim=own.battle.find(x=>x.uid===row.plan.uid),kaku=!!(victim&&effectiveCard(victim,s).kakuLeave),other=remove(own.battle,row.plan.uid);if(other){const cards=layers(other);recordLastPower(s,row.player,other,cards);extra.leaving(s,row.player,other,kaku,batch.snapshot,'grave');for(const x of cards)clearBattleState(x);addZone(s,own,'grave',...cards);log(s,row.player,'aterGuard',`${card(other).name}をかわりに破壊する`,{cardId:other.cardId});}}
 for(const p of[s.active,1-s.active]){const ids=batch.rows.filter(r=>r.player===p&&r.plan.kind==='oni').flatMap(r=>r.plan.cards);if(ids.length)destroyReplacementCards(s,p,ids,batch.snapshot);}
 for(const row of batch.rows){
  const own=s.players[row.player],top=own.battle.find(x=>x.uid===row.uid),plan=row.plan;if(!top)continue;
  if(plan.kind==='g47'){extra.seed.replaceLeaving(s,row,plan);continue;}
  if(plan.kind==='g49'){extra.firebird.replaceLeaving(s,row,plan);continue;}
  if(plan.kind==='g34Stay'){extra.six.useMuku(s,row.player,plan.key);continue;}
  if(plan.kind==='g33'){const x=extra.shieldPhoto.up(s,row.player).find(x=>x.uid===plan.uid);if(x)x.faceUp=false;log(s,row.player,'shieldGuard',card(top).name+'を表向きシールドの裏返しで残す',{cardId:top.cardId});continue;}
  if(plan.kind==='jashin'||plan.kind==='ura'||plan.kind==='ater'||plan.kind==='ultra'||plan.kind==='oni'){continue;}
  if(plan.kind==='ever'){for(const uid of plan.shields)moveShield(s,row.player,uid,'hand',{replacement:true});log(s,row.player,'everSaver',card(top).name+'を残し、シールド2つを手札へ（S・トリガー不可）',{cardId:top.cardId});continue;}
  if(plan.kind==='savak'){moveShield(s,plan.owner,plan.uid,'grave',{cardOnly:true});log(s,row.player,'savakReplace',`${card(top).name}を表向きのシールドカード1枚で残す`,{cardId:top.cardId});continue;}
  if(plan.kind==='ex'||plan.kind==='escape'){moveShield(s,row.player,plan.shield,plan.kind==='ex'?'grave':row.escapeTo||'hand',{replacement:true});log(s,row.player,plan.kind==='ex'?'exLifeReplace':'escape',`${card(top).name}は${plan.kind==='ex'?'EXライフのシールドを墓地へ':row.escapeTo==='grave'?'シールド1つを墓地へ':'シールド1つを手札へ（S・トリガー不可）'}置いて残る`,{cardId:top.cardId});}
  else if(plan.kind==='mana'){for(const uid of plan.mana){const x=remove(own.mana,uid);clearBattleState(x);addZone(s,own,'grave',x);}log(s,row.player,'manaGuard',`${card(top).name}を残し、マナ3枚を墓地へ置く`,{cardId:top.cardId});}
  else if(plan.kind==='gneo'){const below=(top.under||[]).flatMap(layers);delete top.under;for(const x of below){clearBattleState(x,row.to);if(row.tapped&&row.to==='mana')x.tapped=true;}if(row.to==='deckTop')own.deck.unshift(...below);else addZone(s,own,row.to,...below);log(s,row.player,'gNeoReplace',`${card(top).name}の下の${below.length}枚がかわりに${row.to==='hand'?'手札':row.to==='mana'?'マナ':'墓地'}へ移動し、本体は残る`,{cardId:top.cardId});}
  else if(row.godPart&&top.godLinks?.length){const parts=[top,...top.godLinks],out=parts.find(x=>x.uid===row.godPart),remaining=parts.filter(x=>x!==out),next=remaining[0];delete top.godLinks;remove(own.battle,top.uid);if(remaining.length>1)next.godLinks=remaining.slice(1);if(next!==top){for(const key of ['tapped','entered','buff','unblocked','powerModifiers','tapLocks','gospelSpeed'])if(top[key]!==undefined)next[key]=structuredClone(top[key]);extra.inherit(s,top,next);}own.battle.push(next);if(s.attack)for(const key of ['attacker','target','blockUid'])if(s.attack[key]===top.uid)s.attack[key]=next.uid;const to=row.to==='grave'&&row.death?row.death:row.to,all=layers(out);extra.leaving(s,row.player,out,false,batch.snapshot,to,row.destroy!==false&&to==='grave');for(const x of all)clearBattleState(x,to);if(to==='deckTop')own.deck.unshift(...all);else if(row.shieldAttach)for(const x of all)addShieldCard(s,row.player,row.shieldAttach,x);else addZone(s,own,to,...all);log(s,row.player,'godUnlink',card(out.cardId).name+'だけが離れ、残りのゴッドは場に残る',{cardId:out.cardId});}
  else if((row.cardOnly&&isEvolution(top)||plan.kind==='star')&&reconstructSources(s,row.player,top).length){
   const [base,...other]=top.under,underEntered=base.entered||0;const index=own.battle.indexOf(top);own.battle[index]=base;if(other.length)(base.under??=[]).push(...other);
   for(const key of ['tapped','entered','buff','unblocked','tapLocks','buffSources','unblockSpellCost','powerModifiers','skipUntap','gospelSpeed','g19Protected','g19Blocker','justDiverActive'])if(top[key]!==undefined)base[key]=structuredClone(top[key]);base.entered=Math.max(base.entered||0,underEntered);
   if(s.attack?.attacker===top.uid)s.attack.attacker=base.uid;if(s.attack?.target===top.uid)s.attack.target=base.uid;
   extra.inherit(s,top,base);extra.leaving(s,row.player,top,row.leaveKaku,batch.snapshot,row.to,row.to==='grave'&&row.destroy!==false);clearBattleState(top,row.to);if(row.tapped&&row.to==='mana')top.tapped=true;if(row.to==='deckTop')own.deck.unshift(top);else if(row.shieldAttach)addShieldCard(s,row.player,row.shieldAttach,top);else addZone(s,own,row.to,top);log(s,row.player,'reconstruct',`${card(top).name}だけが墓地へ移動し、下の${card(base).name}が残る`,{cardId:top.cardId});
  }
  else{remove(own.battle,top.uid);if(s.attack&&(s.attack.attacker===top.uid||s.attack.target===top.uid))s.attack=null;const to=row.to==='grave'&&row.death?row.death:row.to,cards=layers(top);if(row.cardOnly){const rest=cards.splice(1);for(const x of rest)clearBattleState(x,'grave');addZone(s,own,'grave',...rest);}extra.leaving(s,row.player,top,row.leaveKaku,batch.snapshot,to,row.destroy!==false&&to==='grave');for(const x of cards){clearBattleState(x,to);if(row.tapped&&to==='mana')x.tapped=true;}if(to==='deckTop')own.deck.unshift(...cards);else if(row.shieldAttach)for(const x of cards)addShieldCard(s,row.player,row.shieldAttach,x);else addZone(s,own,to,...cards);if(to==='shields'&&!row.shieldAttach)for(const x of cards)extra.shieldAdded(s,row.player,x);log(s,row.player,'leave',`${card(top).name}${cards.length>1?`と進化元${cards.length-1}枚`:''}が${{grave:'墓地',hand:'手札',mana:'マナ',deck:'山札の下',deckTop:'山札の上',deckFourth:'山札の4枚目（横向き）',shields:'シールド',extra:'超次元ゾーン'}[to]}へ移動`,{cardId:top.cardId});}
 }
 for(const row of batch.rows)if(row.plan.kind==='jashin')extra.forcedDiscard(s,row.player,row.plan.cards,card(ownCardForRow(s,row)).id);
 s.leaving=null;if(batch.bottomOrders?.length)extra.put(s,...batch.bottomOrders.sort((a,b)=>Number(b.p===s.active)-Number(a.p===s.active)));for(const row of fourth){const uids=row.uids.filter(uid=>s.players[row.p].deck.some(x=>x.uid===uid&&x.g11Sideways));if(uids.length>1)extra.put(s,extra.task('g11_FourthOrder',row.p,'dmrp07-m01',{uids,selected:[]}));}delete s.g20LeavingUids;refreshDynamicTypes(s);
 if(batch.after?.kind==='limit')limitNextTurn(s,batch.after.player,card(batch.after.source));
 if(batch.after?.kind==='battleResult')finishBattleResult(s,batch.after.winner,batch.after.late,batch.after.winning,batch.after.both);
}
function matchesEvolution(base,condition,context){
 const c=effectiveCard(base,context),races=String(c.race).split('/');
 if(condition.creature)return isCreature(context,base);if(condition.nonEvolution&&isEvolution(base))return false;if(condition.evolution)return isEvolution(base);
 if(condition.ultimate)return !!card(base).ultimateEvolution;
 if(condition.any)return condition.any.some(x=>matchesEvolution(base,x,context));
 if(condition.race)return races.some(r=>r.includes(condition.race));
 if(condition.category)return races.some(r=>r.includes(condition.category))&&(!condition.civilization||civilizations(c).includes(condition.civilization));
 if(condition.civilization)return civilizations(c).includes(condition.civilization);
 if(condition.blocker)return !!c.blocker;
 return false;
}
export function ultraBases(s,p,c){return s.players[p].battle.filter(x=>isCreature(s,x)&&!isEvolution(x)&&/コマンド|ドラゴン/.test(String(effectiveCard(x,s).race)));}
export function evolutionBases(s,p,c){if(c.g45MDeck)return s.players[p].deck.slice(0,1);if(extra.phoenix.complex(s,p,c))return extra.phoenix.bases(s,p,c);if(c.ultraEvolution){const list=ultraBases(s,p,c);return list.reduce((n,x)=>n+costValue(effectiveCard(x,s)),0)>=c.ultraEvolution?list:[];}const condition=c.evolution||c.neoEvolution;if(c.manaEvolution&&!canMoveZone(s,p,'mana'))return[];if(c.graveEvolution&&!canMoveZone(s,p,'grave'))return[];if(c.manaEvolution)return s.players[p].mana.filter(x=>!x.faceDown&&card(x).type==='creature'&&matchesEvolution(x,condition,s)&&!(s.players[p].g34ManaHeld||[]).includes(x.uid)&&!(s.players[p].g20Holding||[]).includes(x));if(c.graveEvolution)return s.players[p].grave.filter(x=>card(x).type==='creature');return condition?s.players[p].battle.filter(x=>(isCreature(s,x)||card(x).shinkalize)&&matchesEvolution(x,condition,s)):[];}
export function isEvolution(inst){return !!(card(inst).g45MDeck||card(inst).g50ForbiddenEvolution||card(inst).g48HandEvolution&&inst.under?.length||card(inst).sMax||card(inst).evolution||(card(inst).neoEvolution&&inst.under?.length));}
export function selfTriggersStopped(s,p){return s.players[1-p].battle.some(x=>effectiveCard(x,s).stopSelfEntryAttack&&isEvolution(x));}
export function power(c,attacking=false,context=null){
 const modifiers=(c.powerModifiers||[]).filter(x=>x.spellCost===undefined||!spellIgnored(context,{type:'spell',cost:x.spellCost,spellSource:x.spellSource}));if(modifiers.some(x=>x.amount==='-infinity'))return -Infinity;
 const data=effectiveCard(c,context,true),owner=data.ownTurnBonus&&context?context.players.findIndex(p=>p.battle.some(x=>x.uid===c.uid)):-1;
 return numeric(data.power)+(context?extra.utilityLightControl.power(context,c,data):0)+(context?extra.lionelPower(context,context.players.findIndex(p=>p.battle.some(x=>x.uid===c.uid)),c):0)+(context?extra.samuraiPower(context,context.players.findIndex(p=>p.battle.some(x=>x.uid===c.uid)),c):0)+modifiers.reduce((n,x)=>n+x.amount,0)+(attacking?(data.attackBonus||0)+(c.buff||0)-(c.buffSources||[]).filter(x=>spellIgnored(context,{type:'spell',cost:x.cost,spellSource:x.spellSource})).reduce((n,x)=>n+x.amount,0):0)+(attacking&&data.g29GraveFire&&context?context.players[context.players.findIndex(p=>p.battle.some(x=>x.uid===c.uid))]?.grave.filter(x=>playFaces(card(x)).some(f=>civilizations(f).includes('火'))).length*1000||0:0)+(owner>=0&&context.active===owner?data.ownTurnBonus:0);
}
// Conditional power against a particular opponent does not affect power outside that battle.
export function matchupPower(x,y,attacking=false,s=null,otherAttacking=y?.uid===s?.attack?.attacker){const c=effectiveCard(x,s),other=y&&(c.g116FireBattleBonus||c.g118LargeBattleBonus)?effectiveCard(y,s):null,fire=c.g116FireBattleBonus&&other&&civilizations(other).includes('火')?c.g116FireBattleBonus:0,otherPower=c.g118LargeBattleBonus&&other?power(y,otherAttacking,s)+(other.g116FireBattleBonus&&civilizations(c).includes('火')?other.g116FireBattleBonus:0)+(other.g118LargeBattleBonus&&power(x,attacking,s)+fire>=12000?other.g118LargeBattleBonus:0):0;return power(x,attacking,s)+fire+(c.g118LargeBattleBonus&&y&&otherPower>=12000?c.g118LargeBattleBonus:0);}
export function attackLocked(s,p,c){return !!s&&!!c&&!c.sealed&&effectiveCard(c,s).type==='creature'&&extra.locked(s,p,c,'attack');}
export const canCreatureAttack=(s,p,c)=>canAttack(s,p,c);
function canAttack(s,p,c){const d=effectiveCard(c,s);return d.type==='creature'&&extra.history.canAttack(s,p,c)&&extra.six.fifteen.canAttack(s,p,c)&&(!d.twoTappedAttack||s.players[p].battle.filter(x=>isCreature(s,x)&&x.tapped).length>=2)&&!c.tapped&&!d.noAttack&&(!d.needsBigAttack||s.g16BigAttack?.[p]===s.turn)&&!extra.locked(s,p,c,'attack')&&!(c.entered===s.turn&&s.players[1-p].battle.some(x=>effectiveCard(x,s).stopEntryAttack)&&!s.players[p].battle.some(x=>effectiveCard(x,s).ignoreAttackLocks))&&(c.entered<s.turn||d.speedAttacker||isEvolution(c)||d.machFighter||d.entryPlayerAttack||extra.abyssPlayer(s,c));}
function canAttackPlayer(s,c){const p=s.players.findIndex(x=>x.battle.some(y=>y.uid===c.uid));return (s.players[p].battle.some(x=>effectiveCard(x,s).ignoreAttackLocks)||!s.players[1-p].battle.some(x=>effectiveCard(x,s).didaGuard&&power(c,false,s)<power(x,false,s)))&&!(c.entered===s.turn&&s.players[1-p].battle.some(x=>effectiveCard(x,s).gaia||effectiveCard(x,s).g40EntryPlayerStop)&&!s.players[p].battle.some(x=>effectiveCard(x,s).ignoreAttackLocks))&&(c.entered<s.turn||effectiveCard(c,s).speedAttacker||effectiveCard(c,s).entryPlayerAttack||extra.abyssPlayer(s,c)||isEvolution(c));}
function unblockedNow(s,c){return effectiveCard(c,s).unblockable||c.unblocked&&(!c.unblockSpellCost||!spellIgnored(s,{type:'spell',cost:c.unblockSpellCost}));}
function targets(s,p,effect){
 const own=s.players[p],opp=s.players[1-p];let ts;
 if(effect==='destroyBattleCard3')ts=visibleBattleCards(s,1-p).flatMap(top=>layers(top).filter(x=>(x===top?[card(x)]:playFaces(card(x))).some(c=>costValue(c)<=3)).map(x=>({player:1-p,uid:x.uid,cardId:card(x).id,topUid:top.uid})));
 else if(['buff','unblock'].includes(effect))ts=own.battle.filter(x=>isCreature(s,x)).map(x=>({player:p,uid:x.uid}));
 else if(['bounce','bounceOptional','bounceSmall','bounceBlockers'].includes(effect))ts=[p,1-p].flatMap(player=>s.players[player].battle.filter(x=>isCreature(s,x)).filter(x=>effect!=='bounceSmall'||card(x).cost<=6).map(x=>({player,uid:x.uid})));
 else ts=opp.battle.filter(x=>isCreature(s,x)).filter(x=>effect!=='destroyUntapped'||!x.tapped).filter(x=>effect!=='destroySmall'||power(x,x.uid===s.attack?.attacker,s)<=2000).map(x=>({player:1-p,uid:x.uid}));
 return ts.filter(t=>extra.targetable(s,p,t.player,s.players[t.player].battle.find(x=>layers(x).some(y=>y.uid===t.uid))));
}
// One distinct mana card per required civilization; five-color mana has value zero.
export function manaPayment(mana,c){
 const pool=mana.filter(x=>!x.tapped),colors=civilizations(c),goal=(1<<colors.length)-1,cost=costValue(c);
 if(pool.reduce((n,x)=>n+(x.paymentValue??manaValue(card(x))),0)<cost)return null;
 if(colors.length===1&&pool.every(x=>(x.paymentValue??manaValue(card(x)))===1)){const same=pool.find(x=>(x.paymentBird||x.paymentAllColors?['光','水','闇','火','自然']:manaCivilizations(card(x))).includes(colors[0]));return same?[same,...pool.filter(x=>x!==same).slice(0,Math.max(0,cost-1))].map(x=>x.uid):null;}
 let states=new Map([['0:0',{mask:0,amount:0,ids:[]}]]);
 for(const x of pool){const next=new Map(states),value=x.paymentValue??manaValue(card(x)),bits=[0,...colors.flatMap((v,i)=>(x.paymentBird||x.paymentAllColors?['光','水','闇','火','自然']:manaCivilizations(card(x))).includes(v)?[1<<i]:[])];
  for(const st of states.values())for(const bit of bits){const amount=Math.min(cost,st.amount+value),mask=st.mask|bit,key=mask+':'+amount,ids=[...st.ids,x.uid],old=next.get(key);if(!old||ids.length<old.ids.length)next.set(key,{mask,amount,ids});}
  states=next;
 }
 return states.get(goal+':'+cost)?.ids||null;
}
// Printed cost remains unchanged for all references, searches, and card details (201.2a).
export function summonCost(s,p,c){
 c=executionCard(c);
 if(c.fixedPayment)return costValue(c);
 if(freeSpell(s,p,c)&&!c.g40PayNormally)return 0;
 const tax=extra.spellTax(s,p,c);
 if(s.players[1-p].battle.some(x=>effectiveCard(x,s).noCostReduction))return costValue(c)+tax;
 if(c.crossing)return Math.max(1,costValue(c)-extra.samuraiDiscount(s,p,c));
 const reduce=c.type==='creature'&&((c.costReduction==='opponentMulticolorMana3'&&s.players[1-p].mana.some(x=>manaColors(card(x),s,p).length>1))||(c.costReduction==='ownFourDragonsMana3'&&s.players[p].mana.filter(x=>isDragon(card(x))).length>=4)||(c.costReduction==='ownFiveLightFireMana3'&&s.players[p].mana.filter(x=>manaColors(card(x),s,p).some(v=>v==='光'||v==='火')).length>=5));
 const gaia=c.type==='creature'&&numeric(c.printedCost??c.cost)>=10?s.players[p].battle.filter(x=>effectiveCard(x,s).gaia).length*4:0;
 const graveReduction=c.graveCreatureReduction?s.players[p].grave.filter(x=>card(x).type==='creature').length:c.graveEvolution?(c.graveBaseCount??s.players[p].grave.filter(x=>card(x).type==='creature').length-(c.summonOrigin==='grave'?1:0)):0;
 const base=c.g29BT?Math.max(3,costValue(c)-s.players.reduce((n,p)=>n+p.battle.filter(x=>isCreature(s,x)).length,0)):c.graveSpellReduction?Math.max(2,costValue(c)+tax-s.players[p].grave.filter(x=>playFaces(card(x)).some(c=>c.type==='spell')).length):extra.golgy.baseCost(s,p,c)+tax;
 const rupias=extra.utilityTop.rupias(s,p,c);
 return Math.max(rupias||c.graveSpellReduction?2:1,base-2*rupias-(c.g40Reduction||0)-(c.g39Reduction||0)-extra.six.discount(s,p,c)-extra.shieldPhoto.discount(s,p,c)-extra.phoenix.discount(s,p,c)-extra.mado.discount(s,p,c)-(c.g29Arc&&s.players[p].battle.some(x=>isCreature(s,x)&&String(effectiveCard(x,s).race).includes('アーマード'))?1:0)-(c.type==='creature'&&String(c.race).includes('ドラゴン')?s.players[p].battle.filter(x=>effectiveCard(x,s).g29Bird).length:0)-extra.golgy.discount(s,p,c)-extra.virideDiscount(s,p,c)-graveReduction-(c.madoMomo&&s.players[p].grave.filter(x=>card(x).type!=='creature').length>=4?90:0)-(c.type==='spell'?s.players[p].battle.filter(x=>effectiveCard(x,s).kurokami).length:0)-(c.opponentCreatureReduction?s.players[1-p].battle.filter(x=>isCreature(s,x)).length:0)-(c.manaSympathy?s.players[p].mana.length:0)-extra.abyssDiscount(s,p,c)-extra.samuraiDiscount(s,p,c)-extra.giantDiscount(s,p,c)-extra.hunterDiscount(s,p,c)-extra.armoredDiscount(s,p,c)-extra.magicDiscount(s,p,c)-extra.mechaDiscount(s,p,c)-extra.granDiscount(s,p,c)-(c.gio?c.gioRevealCount||0:0)-(c.gggReduction&&s.players[p].hand.length<=1?c.gggReduction:0)-extra.raceDiscount(s,p,c)-(c.type==='creature'?extra.nextDiscount(s,p):0)-(reduce?3:0)-gaia-(c.costReduction==='allCreatures'?s.players.reduce((n,p)=>n+p.battle.filter(x=>isCreature(s,x)).length,0):0));
}
export function manaColors(c,s=null,p=null){return s&&p!==null&&s.players[p].battle.some(x=>effectiveCard(x,s).casablanca||effectiveCard(x,s).g51Courtney)?['光','水','闇','火','自然']:manaCivilizations(c);}
export function paymentPool(s,p,exclude=[],c=null){const zero=(s.g35ZeroMana||[]).some(l=>l.p===p),all=s.players[p].battle.some(x=>effectiveCard(x,s).casablanca||effectiveCard(x,s).g51Courtney||String(c?.race).includes('生徒会組')&&effectiveCard(x,s).g28Gyai);return [...s.players[p].mana.map(x=>zero?{...x,paymentValue:0,...(all?{paymentAllColors:true}:{})}:all?{...x,paymentAllColors:true}:x),...s.players[p].battle.filter(x=>effectiveCard(x,s).manaBird).map(x=>({...x,paymentBird:true}))].filter(x=>!exclude.includes(x.uid));}
function freeSpell(s,p,c){return c.type==='spell'&&s.players[p].battle.some(x=>card(x).g40Acashic&&!abilitiesIgnored(s,x));}
function validMana(s,p,c){c=executionCard(c);if(freeSpell(s,p,c)&&!c.g40PayNormally)return true;return manaPayment(paymentPool(s,p,[],c),{...c,cost:summonCost(s,p,c)})!==null;}
class DrawSelectionRequired extends Error{constructor(request){super('ドローの置換を選んでください');this.request=request;}}
class ManaSelectionRequired extends Error{constructor(request){super('支払うマナを選んでください');this.request=request;}}
export function manaSelectionStatus(d){
 const selected=d.pool.filter(x=>d.selected.includes(x.uid)),amount=selected.reduce((n,x)=>n+(x.paymentValue??manaValue(card(x))),0),colors=d.colors;
 // A multicolor physical card can satisfy only one required civilization.
 let masks=new Set([0]);for(const x of selected){const next=new Set(masks),available=x.paymentBird||x.paymentAllColors?['光','水','闇','火','自然']:manaCivilizations(card(x));for(const mask of masks)for(let i=0;i<colors.length;i++)if(available.includes(colors[i]))next.add(mask|1<<i);masks=next;}
 const goal=(1<<colors.length)-1,best=[...masks].sort((a,b)=>b.toString(2).replaceAll('0','').length-a.toString(2).replaceAll('0','').length)[0];
 return {amount,cost:d.cost,colors:colors.map((name,i)=>({name,paid:!!(best&1<<i)})),valid:new Set(d.selected).size===d.selected.length&&selected.length===d.selected.length&&selected.every(x=>!x.tapped)&&amount>=d.cost&&masks.has(goal)};
}
function paymentIds(s,p,c,exclude=[],fixed=false){
 c=executionCard(c);if(!fixed&&freeSpell(s,p,c)&&!c.g40PayNormally)return [];
 const pool=paymentPool(s,p,exclude,c),cost=fixed?costValue(c):summonCost(s,p,c),request={cost,colors:civilizations(c),pool:pool.map(x=>({...x})),selected:[],source:c.id||null,use:{name:c.name||null,type:c.type||null,origin:c.summonOrigin||null,baseUids:Array.isArray(c.g27BaseUid)?[...c.g27BaseUid]:c.g27BaseUid?[c.g27BaseUid]:[]}};
 const automatic=manaPayment(pool,{...c,cost});if(!automatic)return null;
 if(manaTransaction?.manualMana&&p===manaTransaction.player&&automatic.length){const t=manaTransaction,selected=t.payments[t.paymentIndex++];if(!selected)throw new ManaSelectionRequired(request);if(!manaSelectionStatus({...request,selected}).valid)throw Error('選んだマナでは支払えません');return selected;}
 return automatic;
}
function tapPayment(s,p,ids){let real=false;for(const x of s.players[p].mana)if(ids.includes(x.uid)){x.tapped=true;real=true;}for(const x of s.players[p].battle)if(ids.includes(x.uid))tapCard(s,p,x);return real;}
function pay(s,p,c,exclude=[]){const ids=paymentIds(s,p,c,exclude);if(!ids)throw Error('必要な文明・マナが足りません');return tapPayment(s,p,ids);}
// Probe a private copy until the next payment, then commit the original move once.
// This also covers alternative costs, evolution, cross gear and deferred payments.
function withManaTransaction(t,fn){const previous=manaTransaction;manaTransaction=t;try{return fn();}finally{manaTransaction=previous;}}
function executeManaMove(s,action,baseDecision=s.decision,payments=[],randomTape=[],drawChoices=[],manualMana=true){
 const t={player:action.player,manualMana,payments,randomTape,drawChoices,randomIndex:0,paymentIndex:0,drawIndex:0},preview=structuredClone(s);preview.decision=structuredClone(baseDecision);
 try{withManaTransaction(t,()=>withEffect(preview,baseDecision?.type==='effect'?baseDecision.player:null,()=>stepCore(preview,action)));}catch(error){
  if(!(error instanceof ManaSelectionRequired)&&!(error instanceof DrawSelectionRequired))throw error;
  const draw=error instanceof DrawSelectionRequired;
  s.decision={type:draw?'drawReplacement':'manaPayment',title:draw?'ヴェール・バビロニア：ドローを選ぶ':'支払うマナを選ぼう',player:action.player,...error.request,action:structuredClone(action),baseDecision:structuredClone(baseDecision),payments:structuredClone(payments),drawChoices:structuredClone(drawChoices),manualMana,randomTape,cancellable:!draw&&!baseDecision&&['play','crossGear','pandora'].includes(action.kind)};return;
 }
 const previous=s.decision;s.decision=baseDecision;
 try{return withManaTransaction({...t,randomIndex:0,paymentIndex:0,drawIndex:0},()=>withEffect(s,baseDecision?.type==='effect'?baseDecision.player:null,()=>stepCore(s,action)));}catch(error){s.decision=previous;throw error;}
}
function babyloniaDraw(s,p){
 const source=s.players[p].battle.find(x=>card(x)?.g45Babylonia&&!abilitiesIgnored(s,x));if(!source||!manaTransaction)return false;
 const tx=manaTransaction,index=tx.drawIndex++,selected=tx.drawChoices[index];
 if(selected===undefined)throw new DrawSelectionRequired({player:p,source:source.cardId,drawIndex:index,stage:'replace'});
 if(!selected.replace)return false;
 draw(s,p,2,{unreplaceable:true});if(s.winner!==null||!s.players[p].hand.length)return true;
 if(!selected.discard)throw new DrawSelectionRequired({player:p,source:source.cardId,drawIndex:index,stage:'discard',cards:s.players[p].hand.map(x=>({uid:x.uid,cardId:x.cardId}))});
 if(!s.players[p].hand.some(x=>x.uid===selected.discard))throw Error('捨てる手札を確認できません');
 extra.forcedDiscard(s,p,[selected.discard],source.cardId);return true;
}

// Move the whole batch together (400.7). Looking/revealing alone does not empty the library.
function rampTapped(s,p,c,n,dragonsOnly=false){
 const own=s.players[p],batch=own.deck.splice(0,dragonsOnly?lookCount(s,p,n):n);
 if(dragonsOnly)log(s,p,'reveal',`${c.name}で公開：${batch.map(x=>card(x).name).join('・')}`,{cardId:c.id});
 const redirected=deckRedirect(s,p),mana=batch.filter(x=>!redirected&&(!dragonsOnly||isDragon(card(x)))),grave=batch.filter(x=>redirected||dragonsOnly&&!isDragon(card(x)));
 for(const x of batch){x.tapped=mana.includes(x);x.buff=0;x.unblocked=false;x.entered=0;}
 addZone(s,own,'mana',...mana);addZone(s,own,'grave',...grave);if(redirected&&batch.length)log(s,p,'deckReplace','カレイコの黒像でマナのかわりに墓地へ置く',{cardId:c.id});
 log(s,p,'ramp',`${c.name}：${mana.length}枚をタップしてマナへ${grave.length?`、${grave.length}枚を墓地へ`:''}`,{cardId:c.id});
 deckCheck(s,p);
}
function chooseManaTop(s,p,c,n){
 const count=canMoveZone(s,p,'mana')?Math.min(n,s.players[p].mana.length):0;
 if(s.winner===null&&count)s.decision={type:'manaTop',player:p,source:c.id,count,chosen:[]};
}
function withAbilitySource(s,source,fn){const previous=s.g35ChoosingSource;s.g35ChoosingSource=source;try{return fn();}finally{if(previous===undefined)delete s.g35ChoosingSource;else s.g35ChoosingSource=previous;}}
function doEffect(s,p,c,sourceUid=null,entry=null){return withAbilitySource(s,c.id,()=>withEffect(s,p,()=>doEffectCore(s,p,c,sourceUid,entry)));}
function doEffectCore(s,p,c,sourceUid=null,entry=null){
 const e=c.effect;if(!e)return;
 if(extra.effect(s,p,c,sourceUid,entry))return;
 if(e==='destroyWeakerLimitNextTurn'){
  const source=s.players[p].battle.find(top=>layers(top).some(x=>x.uid===sourceUid&&(x.incarnation||0)===(entry?.incarnation||0))),max=source?power(source,source.uid===s.attack?.attacker,s):entry?.lastKnownPower??c.power;
  const ts=s.players[1-p].battle.filter(x=>isCreature(s,x)&&extra.targetable(s,p,1-p,x)).filter(x=>power(x,x.uid===s.attack?.attacker,s)<max).map(x=>({player:1-p,uid:x.uid}));
  if(ts.length)s.decision={type:'effect',player:p,effect:e,source:c.id,targets:ts,limitAfter:true};else limitNextTurn(s,p,c);
  return;
 }
 if(e==='deployMulticolor7'){s.decision={type:'deploy',player:p,source:c.id};return;}
 if(e==='shieldTop1'){shieldTop(s,p,c);return;}
 if(e==='fightOptional'){if(s.players[p].battle.some(x=>x.uid===sourceUid)&&s.players[1-p].battle.length)s.decision={type:'fight',player:p,source:c.id,uid:sourceUid};return;}
 if(e==='dragonRamp2'&&deckLocked(s,p))return;
 if(e==='searchCreature'&&deckLocked(s,p))return;
 if(e==='dragonRamp2'){rampTapped(s,p,c,2,true);return;}
 if(e==='ramp2Return1'){rampTapped(s,p,c,2);chooseManaTop(s,p,c,1);return;}
 if(e==='optionalRamp4Return2'){s.decision={type:'optionalRamp',player:p,source:c.id};return;}
 if(e==='purgeNonDragonMana'){
  for(const who of [0,1]){if(!canMoveZone(s,who,'mana'))continue;const own=s.players[who],removed=own.mana.filter(x=>!isDragon(card(x)));own.mana=own.mana.filter(x=>isDragon(card(x)));for(const x of removed){x.tapped=false;x.buff=0;x.unblocked=false;x.entered=0;}addZone(s,own,'grave',...removed);log(s,who,'manaLeave',`${c.name}でドラゴン以外のマナ${removed.length}枚を墓地へ`,{cardId:c.id});}return;
 }
 if(e==='bounceBlockers'){const batch=[0,1].flatMap(who=>s.players[who].battle.filter(x=>isCreature(s,x)&&effectiveCard(x,s).blocker).map(x=>({who,uid:x.uid})));moveCreatures(s,batch.map(x=>({player:x.who,uid:x.uid,to:'hand'})));return;}
 if(e==='superheroSweep'){const moves=[0,1].flatMap(player=>s.players[player].battle.filter(x=>isCreature(s,x)&&power(x,x.uid===s.attack?.attacker,s)<=3000).map(x=>({player,uid:x.uid,to:'grave'})));if(moves.length)moveCreatures(s,moves);return;}
 if(e==='draw2'){draw(s,p,2);return;}
 if(e==='tapAll'){for(const x of s.players[1-p].battle.filter(x=>isCreature(s,x)))tapCard(s,1-p,x);log(s,p,'effect',`${c.name}で相手のクリーチャーすべてをタップ`,{cardId:c.id});return;}
 if(e==='discardAll'){extra.put(s,extra.task('discard',1-p,c.id,{causedBy:p,n:s.players[1-p].hand.length,all:true}));return;}
 if(e==='ramp1'||e==='ramp2'){const n=e==='ramp1'?1:2;let added=0;for(let i=0;i<n&&s.winner===null;i++){const x=takeDeckTop(s,p);if(x){x.tapped=manaCivilizations(card(x)).length>1;if(deckRedirect(s,p)){clearBattleState(x);addZone(s,s.players[p],'grave',x);log(s,p,'deckReplace','カレイコの黒像でマナのかわりに墓地へ置く',{cardId:x.cardId});}else{addZone(s,s.players[p],'mana',x);added++;}}deckCheck(s,p);}log(s,p,'ramp',`${c.name}でマナを${added}枚追加`,{cardId:c.id});return;}
 if(e==='discard'){extra.put(s,extra.task('discard',1-p,c.id,{causedBy:p,n:1,random:true}));return;}
 if(e==='teamBuff'){for(const x of s.players[p].battle.filter(x=>isCreature(s,x))){x.buff+=2000;if(c.type==='spell')(x.buffSources??=[]).push({amount:2000,cost:c.cost,spellSource:c.id});}log(s,p,'buff','このターン、攻撃中のパワーを+2000');return;}
 if(e==='optionalDraw'||e==='drawUpTo3'){s.decision={type:'draw',player:p,max:e==='optionalDraw'?1:3,source:c.id};return;}
 if(e==='searchCreature'){if(lookPublic(s,p)){const x=s.players[p].deck[0];if(x)log(s,p,'reveal','曲通風により山札の上1枚を公開：'+card(x).name,{cardId:x.cardId});}s.decision={type:'search',player:p,source:c.id};return;}
 const ts=targets(s,p,e);if(ts.length)s.decision={type:'effect',player:p,effect:e,source:c.id,targets:ts,optional:e==='bounceOptional'};
}
function enqueueEffect(s,p,entry){
 if(s.g24EntryMute===p&&s.players[p].battle.some(x=>(entry.uid?x.uid===entry.uid:x.cardId===entry.source)&&isCreature(s,x)))return;
 const ctx=s.g1Entering,self=ctx?.player===p&&(entry.uid?entry.uid===ctx.uid:entry.source===ctx.cardId);
 if(self&&s.players[1-p].battle.some(x=>effectiveCard(x,s).selfEntrySilence))return;
 const queue=s.triggers?s.triggers.entries:(s.pendingEffects??=[]);
 if(entry.task)entry={...entry,task:{...entry.task,controller:entry.task.controller??p}};
 queue.push({...entry,player:p,effectId:s.effectSerial=(s.effectSerial||0)+1});
 if(self)extra.copyEntry(s,p,ctx,entry);
}
// Check all entry triggers after the new top card has entered (603.5a).
function enterCreature(s,p,inst,baseUid=null,entryOptions={}){
 delete inst.g39GraveColors;if(extra.saga.beginMDeck(s,p,inst,baseUid,entryOptions))return;if(extra.cyber.beforeEnter(s,p,inst,baseUid,entryOptions))return;
 if(!canEnterCreature(s,p,card(inst),{...entryOptions,committed:true}))throw Error('このクリーチャーは現在出せません');
 if(!entryOptions.g31Force&&extra.phoenix.complex(s,p,card(inst),entryOptions)&&!Array.isArray(baseUid)){extra.phoenix.beginPut(s,p,inst,baseUid,entryOptions);return;}
 if(extra.phoenix.beginLink(s,p,inst,baseUid,entryOptions))return;
 if(card(inst).ultraEvolution&&!Array.isArray(baseUid)){extra.bolshack.beginPut(s,p,inst,baseUid,entryOptions);return;}
 if(card(inst).graveEvolution&&!Array.isArray(baseUid)){extra.beginGravePut(s,p,inst,baseUid,entryOptions);return;}
 const baseWasCreature=!!baseUid&&s.players[p].battle.some(x=>x.uid===baseUid&&isCreature(s,x)),baseWasEvolution=!!baseUid&&s.players[p].battle.some(x=>x.uid===baseUid&&isEvolution(x));
 const c=card(inst);delete inst.g11Sideways;if(extra.replaceEntry(s,p,inst,baseUid,entryOptions))return;if(entryOptions.mugenBases)attachMugenBases(s,p,inst,entryOptions.mugenBases);delete inst.g22ManaAllowed;inst.entered=s.turn;inst.tapped=c.type==='creature'&&(entryOptions.tapped||c.g32Complex&&!abilitiesIgnored(s,inst)||c.g26Zaze&&!abilitiesIgnored(s,inst)||extra.tapEntry(s,p)||s.players[1-p].battle.some(x=>effectiveCard(x,s).opponentTapEntry||effectiveCard(x,s).g35Venom));inst.incarnation=(inst.incarnation||0)+1;
 if(entryOptions.g31Force||extra.phoenix.complex(s,p,c,entryOptions))extra.phoenix.attach(s,p,inst,baseUid,entryOptions);
 else if(c.g45MDeck&&entryOptions.g45MDeckReady){inst.under=entryOptions.g45MDeckBase?[entryOptions.g45MDeckBase]:[];}
 else if(c.g48HandEvolution){extra.cyber.attachHandEvolution(s,p,inst,baseUid);}
 else if(c.graveEvolution){if(!baseUid.length||new Set(baseUid).size!==baseUid.length||!baseUid.every(uid=>s.players[p].grave.some(x=>x.uid===uid&&card(x).type==='creature')))throw Error('墓地進化元が正しくありません');inst.under=baseUid.map(uid=>{const x=remove(s.players[p].grave,uid);clearBattleState(x,'battle');return x;});}
 else if(c.ultraEvolution){const list=baseUid.map(uid=>s.players[p].battle.find(x=>x.uid===uid)),allowed=ultraBases(s,p,c);if(!list.length||new Set(baseUid).size!==baseUid.length||list.some(x=>!allowed.includes(x))||list.reduce((n,x)=>n+costValue(effectiveCard(x,s)),0)<20)throw Error('超無限進化の進化元が正しくありません');for(const x of list)extra.evolutionBase(s,p,x);inst.under=list;inst.tapped=!!entryOptions.tapped||list.some(x=>x.tapped)||extra.tapEntry(s,p)||s.players[1-p].battle.some(x=>effectiveCard(x,s).opponentTapEntry);inst.buff=list.reduce((n,x)=>n+(x.buff||0),0);inst.unblocked=list.some(x=>x.unblocked);inst.powerModifiers=list.flatMap(x=>structuredClone(x.powerModifiers||[]));inst.tapLocks=list.flatMap(x=>x.tapLocks||[]);if(list.some(x=>x.gospelSpeed===s.turn))inst.gospelSpeed=s.turn;for(const x of list){remove(s.players[p].battle,x.uid);extra.inherit(s,x,inst);if(s.attack?.attacker===x.uid)s.attack.attacker=inst.uid;if(s.attack?.target===x.uid)s.attack.target=inst.uid;}log(s,p,'evolve','コスト合計'+list.reduce((n,x)=>n+costValue(card(x)),0)+'の'+list.length+'体から'+c.name+'へ進化',{cardId:c.id});}
 else if(c.manaEvolution){const base=s.players[p].mana.find(x=>x.uid===baseUid&&x.uid!==inst.uid);if(!base||!matchesEvolution(base,c.evolution,s))throw Error('マナ進化元が正しくありません');remove(s.players[p].mana,baseUid);clearBattleState(base,'battle');inst.under=[base];}
 else if(c.evolution||(c.neoEvolution&&baseUid)){const base=s.players[p].battle.find(x=>x.uid===baseUid);if(!base||!matchesEvolution(base,c.evolution||c.neoEvolution,s))throw Error('進化元が正しくありません');extra.evolutionBase(s,p,base);remove(s.players[p].battle,baseUid);inst.under=[base];inst.tapped=!!entryOptions.tapped||base.tapped||extra.tapEntry(s,p)||s.players[1-p].battle.some(x=>effectiveCard(x,s).opponentTapEntry);inst.buff=base.buff||0;inst.unblocked=base.unblocked||false;if(base.tapLocks)inst.tapLocks=[...base.tapLocks];if(base.buffSources)inst.buffSources=base.buffSources.map(x=>({...x}));if(base.unblockSpellCost)inst.unblockSpellCost=base.unblockSpellCost;if(base.powerModifiers)inst.powerModifiers=structuredClone(base.powerModifiers);if(base.skipUntap)inst.skipUntap=true;if(base.gospelSpeed===s.turn)inst.gospelSpeed=s.turn;if(base.g19Protected)inst.g19Protected=true;if(base.g19Blocker!==undefined)inst.g19Blocker=base.g19Blocker;
  extra.inherit(s,base,inst);if(s.attack?.attacker===baseUid)s.attack.attacker=inst.uid;
  if(s.attack?.target===baseUid)s.attack.target=inst.uid;
  log(s,p,'evolve',`${card(base).name}から${c.name}へ進化`,{cardId:c.id});
 }
 if(c.natureAce4&&genmuActive(s))inst.aceIgnored=true;s.players[p].battle.push(inst);extra.history.d2Entry(s,p,inst);inst=extra.phoenix.link(s,p,inst,entryOptions);inst=extra.saga.linkM(s,p,inst,entryOptions);if(c.balchuris)(s.g23BalEntered??=[null,null])[p]=s.turn;if(c.type==='creature')(s.g7Entries??=[0,0])[p]++;refreshDynamicTypes(s);if(isCreature(s,inst)&&s.metrics[p].firstCreature===null)s.metrics[p].firstCreature=s.players[p].turns;
 if(isCreature(s,inst)){s.players[p].enteredThisTurn=(s.players[p].enteredThisTurn||0)+1;s.creaturesEntered=(s.creaturesEntered||0)+1;}
 extra.viride.entry(s,p,inst,!!entryOptions.ignoreEntry);
 const graveMuted=isCreature(s,inst)&&s.players[1-p].battle.some(x=>effectiveCard(x,s).entrySilence);if(graveMuted)s.g24EntryMute=p;
 if(isCreature(s,inst))s.g1Entering={player:p,uid:inst.uid,cardId:inst.cardId};
 const selfMuted=graveMuted||isCreature(s,inst)&&(selfTriggersStopped(s,p)||extra.muteEntry(s,p));
 if(!entryOptions.ignoreEntry){extra.entry(s,p,inst,{...entryOptions,selfMuted});extra.command(s,p,inst);}
 if(!entryOptions.paidMana)(s.noManaUse??=[false,false])[p]=true;
 if(effectiveCard(inst,s).exLife){for(let n=0;n<(c.extraExLife?2:1)&&s.winner===null;n++)shieldTop(s,p,c,inst);if(s.winner!==null){delete s.g24EntryMute;delete s.g1Entering;return;}}
 const stopped=graveMuted||c.g31God&&genmuActive(s)&&costValue(c)<=5||c.abakuOni&&s.players.reduce((n,p)=>n+p.shields.length,0)<=6||entryOptions.ignoreEntry||(isCreature(s,inst)&&(!c.stackOnlyEntry&&selfTriggersStopped(s,p)||extra.muteEntry(s,p)))||abilitiesIgnored(s,inst);
 if(stopped&&(c.effect||c.dragonEntryTap))log(s,p,'triggerPrevented',`${c.name}自身の登場時能力は${abilitiesIgnored(s,inst)?'能力の無視':graveMuted?'ブラキオ龍樹':c.abakuOni&&s.players.reduce((n,p)=>n+p.shields.length,0)<=6?'鬼タイム':extra.muteEntry(s,p)?'マリニャンX':'GG'}によりトリガーしない`,{cardId:c.id});
 if(c.justDiver&&!stopped)enqueueEffect(s,p,{uid:inst.uid,incarnation:inst.incarnation,source:c.id,effect:'justDiver'});
 if(c.triggerPlus&&inst.triggerPlus&&!stopped&&c.g34Plus)enqueueEffect(s,p,{uid:inst.uid,incarnation:inst.incarnation,source:c.id,effect:'extended',task:extra.task('g34_Sequence',p,c.id,{uid:inst.uid,incarnation:inst.incarnation,defs:c.g34Plus})});
 if(c.triggerPlus&&inst.triggerPlus&&!stopped&&!c.g34Plus)enqueueEffect(s,p,{uid:inst.uid,source:c.id,effect:'extended',task:extra.task('muteAttackLock',p,c.id)});
 if(c.effect&&!(c.effect==='sixPhoto'&&!c.g34Tasks?.length)&&!stopped&&(!c.evolvedEntryOnly||isEvolution(inst))&&(!c.stackOnlyEntry||baseWasCreature)&&(!c.nonEvolutionBase||baseWasCreature&&!baseWasEvolution)&&(!c.summonedEntryOnly||entryOptions.execution!==false))enqueueEffect(s,p,{uid:inst.uid,incarnation:inst.incarnation,lastKnownPower:power(inst,false,s),lastKnownCost:effectiveCard(inst,s).cost,source:c.id,lastKnownCount:layers(inst).length,super:!!entryOptions.super,effect:'entry'});
 if(!entryOptions.ignoreEntry&&isDragon(c))for(const x of s.players[p].battle)if(effectiveCard(x,s).dragonEntryTap&&(!stopped||x.uid!==inst.uid)){const key=x.uid+'@'+(x.incarnation||0);if(s.once?.[key]!==s.turn)enqueueEffect(s,p,{uid:x.uid,source:x.cardId,effect:'dragonEntryTap',key});}
 delete s.g24EntryMute;delete s.g1Entering;
}
// Borrowing chooses a printed entry ability; no creature enters and no watchers fire.
export function entryAbilities(s,p,original,reference){
 const c=card(original),source=copySource(original,reference.source),uid=reference.uid,incarnation=reference.incarnation||0,key=uid+'@'+incarnation+':borrow:'+original;
 const base={player:p,uid,incarnation,source,original,lastKnownPower:reference.lastKnownPower},out=[];
 const add=(label,effect,more={})=>out.push({...base,label,effect,...more});
 const extended=(label,op,more={})=>add(label,'extended',{task:extra.task(op,p,source,{uid,incarnation,...more})});
 if(c.type!=='spell'&&c.effect)add('出た時の効果','entry');
 if(c.justDiver)add('ジャストダイバー','justDiver');
 if(c.g27Raid)extended('超魂レイド','g27_Raid');
 if(c.yobinion)extended('ヨビニオン','g19Yobi',{max:costValue(card(reference.source))});
 if(c.samuraiGenerate)extended('侍流ジェネレート','g18_Generate');
 if(c.finalRev)extended('ファイナル革命',c.finalRev==='extreme'?'g26_Final':c.finalRev==='burst'?'g3_Final':c.finalRev==='dark'?'finalDark':c.finalRev==='nova'?'g8_Final':c.finalRev==='gira'?'g11_Final':'finalLight');
 if(c.shiroLock)extended('革命チェンジ登場時の呪文制限','g18_ShiraLock');
 if(c.redUntap)extended('アンタップ','redUntap');
 if(c.dragonEntryTap&&isDragon(c))add('ドラゴン登場時のタップ','dragonEntryTap',{key});
 if(c.darkEntryFight)extended('多色登場時のバトル','darkFight');
 if(c.g33Golgini)extended('アーマード・ドラゴン登場時のタップとアンタップ制限','g33_TapLock');
 if(c.voljaak)extended('クリーチャー登場時のシールド化','g7VolShield',{key});
 if(c.nacht)extended('大型クリーチャー登場時のマナ追加','g16Nacht');
 if(c.secondEntryLook)extended('2体目登場時の手札・マナ追加','g1_Look');
 if(c.secondEntrySacrifice)extended('2体目登場時の破壊','g24_Timp');
 if(c.abyssJaga)extended('山札から登場時のアビス展開','g13_JagaRevive',{key,max:costValue(card(reference.source))});
 if(c.cobra&&p!==s.active&&(s.players[p].brokenThisTurn||0)<2)extended('シールド条件による自壊','g19CobraDie');
 if(c.tryshot&&p!==s.active)extended('相手ターン登場時の自壊','g8_TryDie');
 if(c.prisonZero&&!s.players[p].shields.length)extended('シールド0枚での登場時能力','g14_RevZero');
 return out;
}
function resolveEntry(s,entry){return withEffect(s,entry.player,()=>resolveEntryCore(s,entry));}
function resolveEntryCore(s,entry){
 const p=entry.player;
 if(entry.effect==='extended'){extra.resolve(s,entry);return;}
 if(entry.effect==='justDiver'){const x=s.players[p].battle.find(x=>x.uid===entry.uid&&(x.incarnation||0)===(entry.incarnation||0));if(x)x.justDiverActive=true;return;}
 if(entry.effect==='ddd'){s.decision={type:'dddSummon',player:p,uid:entry.uid,source:entry.source,origin:entry.origin||'hand',serial:entry.serial};}
 else if(entry.effect==='endUntap'){s.decision={type:'untap',player:p,uids:entry.uids};}
 else if(entry.effect==='attackDragonReveal')revealDragon(s,p,card(entry.source));
 else if(entry.effect==='attackExecuteHand'){extra.put(s,extra.task('execute',p,entry.source,{origin:'hand',max:s.players[p].hand.length,noncreature:true}));}
 else if(entry.effect==='deploy')doEffect(s,p,{...card(entry.source),effect:'deployMulticolor7'},entry.uid,entry);
 else if(entry.effect==='attackJudge')startJudge(s,p,entry.source,entry.uid,'attack');
 else if(entry.effect==='shieldEntryTapLock'){
  const ts=targets(s,p,'tap');if(ts.length)s.decision={type:'effect',player:p,effect:'shieldEntryTapLock',source:entry.source,targets:ts};
 }else if(entry.effect==='dragonEntryTap'){
  if(s.once?.[entry.key]!==s.turn&&s.players[1-p].battle.length)s.decision={type:'dragonTap',player:p,source:entry.source,key:entry.key};
 }else doEffect(s,p,card(entry.source),entry.uid,entry);
}
function availableEffects(s,queue){return queue.filter(e=>e.effect!=='dragonEntryTap'||s.once?.[e.key]!==s.turn);}
function advanceEffects(s){if(s.lossEvent)return;
 while(!s.lossEvent&&s.pendingEffects?.length&&!s.triggers&&!s.extTasks?.length&&!s.decision&&s.winner===null&&(!s.judge||s.judge.stage==='breaks')){
  s.pendingEffects=availableEffects(s,s.pendingEffects);if(!s.pendingEffects.length)return;
  if(!s.pendingEffects.some(e=>e.player===s.active)&&extra.beforeNonActive(s))return;
  const p=s.pendingEffects.some(e=>e.player===s.active)?s.active:1-s.active,entries=s.pendingEffects.filter(e=>e.player===p);
  if(entries.length>1){s.decision={type:'effectOrder',player:p};return;}
  s.pendingEffects.splice(s.pendingEffects.indexOf(entries[0]),1);resolveEntry(s,entries[0]);advanceBattle(s);
 }
}
function playCard(s,p,uid,free=false,baseUid=null,face=0,alternativeCost=null,origin='hand',freeReason='S・トリガー',ownGraveCast=false,permit=null,snowReducers=null,gioReveals=null,magicReducers=null,g7Payment=null,g18Reducers=null,g26Reducers=null,g42Reduction=null){
 const source=s.players[p][origin].find(x=>x.uid===uid),ruleOrigin=source?.g5Origin||origin,c=source&&{...playFaces(card(source.cardId))[face],summonOrigin:ruleOrigin,g27BaseUid:baseUid,...(freeReason==='D・D・D'?{g28DDD:true}:{}),...(g42Reduction!==null?{g42Reduction}:{}),...(g26Reducers!==null?{g26Reducers}:{}),...(g18Reducers!==null?{g18Reducers}:{}),...(g7Payment?{g7Payment}:{}),...(magicReducers?{magicReducers}:{}),...(snowReducers?{snowReducers}:{}),...(gioReveals?{gioRevealCount:gioReveals.length}:{})};if(!c||!canCastSpell(s,p,c,ruleOrigin)||(c.type!=='spell'&&!canEnterCreature(s,p,c,{origin:ruleOrigin,execution:true})))throw Error('このカードは使えません');
 if(!free&&freeSpell(s,p,c)&&!alternativeCost?.g40PayNormally){free=true;freeReason='アカシック3';}
 if(extra.utilityWater.beforeCast(s,p,[uid,free,baseUid,face,alternativeCost,origin,freeReason,ownGraveCast,permit,snowReducers,gioReveals,magicReducers,g7Payment,g18Reducers,g26Reducers,g42Reduction]))return;
 if(extra.cyber.beforeCast(s,p,[uid,free,baseUid,face,alternativeCost,origin,freeReason,ownGraveCast,permit,snowReducers,gioReveals,magicReducers,g7Payment,g18Reducers,g26Reducers,g42Reduction]))return;
 if(extra.phoenix.beginPayment(s,p,[uid,free,baseUid,face,alternativeCost,origin,freeReason,ownGraveCast,permit,snowReducers,gioReveals,magicReducers,g7Payment,g18Reducers,g26Reducers,g42Reduction]))return;
 if(extra.phoenix.complex(s,p,c)&&!Array.isArray(baseUid)){extra.phoenix.beginCast(s,p,[uid,free,baseUid,face,alternativeCost,origin,freeReason,ownGraveCast,permit,snowReducers,gioReveals,magicReducers,g7Payment,g18Reducers,g26Reducers,g42Reduction]);return;}
 if(c.ultraEvolution&&!Array.isArray(baseUid)){extra.bolshack.beginCast(s,p,[uid,free,baseUid,face,alternativeCost,origin,freeReason,ownGraveCast,permit,snowReducers,gioReveals,magicReducers,g7Payment,g18Reducers,g26Reducers,g42Reduction]);return;}
 if(c.graveEvolution&&!Array.isArray(baseUid)){extra.beginGraveCast(s,p,[uid,free,baseUid,face,alternativeCost,origin,freeReason,ownGraveCast,permit,snowReducers,gioReveals,magicReducers,g7Payment,g18Reducers,g26Reducers,g42Reduction]);return;}
 if(gioReveals?.length)log(s,p,'reveal','超七極 Gioの召喚のため手札を公開：'+gioReveals.map(uid=>card(s.players[p].hand.find(x=>x.uid===uid)).name).join('、'),{cardId:c.id});
 if(!free)for(const id of c.g7Payment?.energy||[])tapCard(s,p,s.players[p].battle.find(x=>x.uid===id));
 const payment=alternativeCost===null?c:{...c,...(typeof alternativeCost==='object'?alternativeCost:{cost:alternativeCost}),costReduction:typeof alternativeCost==='object'&&alternativeCost.cost===undefined&&!alternativeCost.fixedPayment?c.costReduction:undefined,printedCost:c.cost},cost=summonCost(s,p,payment);const paidMana=free?false:pay(s,p,payment);const inst=remove(s.players[p][origin],uid),grantedSuper=free&&!!c.superTrigger&&inst.g30SuperFace===face;delete inst.g30SuperFace;
 const execution={ruleOrigin,origin,free,freeReason,alternativeCost,paidMana,cost,ownGraveCast,grantedSuper,baseUid,face,permit};if(extra.shieldPhoto.beforeExecution(s,p,c,inst,execution))return;completeExecution(s,p,inst,c,execution);
}
function completeExecution(s,p,inst,c,{ruleOrigin,origin,free,freeReason,alternativeCost,paidMana,cost,ownGraveCast,grantedSuper,baseUid,face,permit}){
 if(c.type==='creature')inst.summonedTurn=s.turn;extra.played(s,p,free?{...c,snowReducers:[],magicReducers:[],g7Payment:{reducers:[]},g26Reducers:[]}:alternativeCost?.fixedPayment?{...c,fixedPayment:true}:c,inst,ruleOrigin,permit);if(c.type==='creature')extra.summoned(s,p,inst);delete inst.g5Origin;
 if(ownGraveCast&&origin==='grave'&&c.graveCast)inst.finishTo='deck';
 const met=s.metrics[p];met.played[c.id]=(met.played[c.id]||0)+1;if(s.players[p].turns<=3)met.earlyPlayed[c.id]=true;if(free&&freeReason==='S・トリガー')met.triggers++;
 if(!paidMana)(s.noManaUse??=[false,false])[p]=true;
 log(s,p,free?(freeReason==='S・トリガー'?'trigger':'gaiaSummon'):'play',`${c.name}を${free?freeReason+'で':''}${c.type==='creature'?'召喚':c.type==='gear'?'ジェネレート':'使用'}${!free&&cost!==c.cost?`（支払い${cost}マナ / 元のコスト${c.cost}）`:''}`,{cardId:c.id});
 if(c.type==='spell')extra.spellCast(s,p,c,inst,ruleOrigin,face);
 if(c.type==='castle'){inst.faceUp=true;s.players[p].shields.push(inst);extra.shieldAdded(s,p,inst);if(free)(s.noManaUse??=[false,false])[p]=true;}
 else if(['creature','seed','gear','field'].includes(c.type)){enterCreature(s,p,inst,baseUid,{origin:ruleOrigin,execution:true,committed:true,paidMana,costPaid:!free&&cost>0,effectController:free||alternativeCost!==null?p:null,super:grantedSuper,...(c.mugenGate&&Array.isArray(baseUid)?{mugenBases:baseUid}:{})});if(ruleOrigin==='deck')deckCheck(s,p);}
 else if(c.charger&&!spellIgnored(s,c)){s.resolvingSpell={player:p,inst,source:c.id,face,origin:'hand'};startJudge(s,p,c.id,inst.uid,'spell');}
 else{c.triggerPlusActive=!!c.triggerPlus&&free&&freeReason==='S・トリガー'&&!!inst.triggerPlus;c.superTriggerActive=!!c.superTrigger&&free&&(freeReason==='S・トリガー'&&!!inst.superTrigger||grantedSuper);if(c.crystalCharger&&!spellIgnored(s,c))inst.crystalFinish=true;if(c.normalCharger&&!spellIgnored(s,c))inst.normalFinish=true;extra.finishSpell(s,p,inst,c);if(!extra.beforeSpell(s,p,c,inst))resolveSpell(s,p,inst.uid);}
}
// Executing the spell side may be replaced even when its physical card stays in battle (QA46947).
function canReplaceExecution(s,p,uid,to='grave'){const top=s.players[p].battle.find(x=>layers(x).some(y=>y.uid===uid));return top?extra.canLeave(s,p,top)&&!s.g26Extreme?.[p]&&!(to==='mana'&&shevaProtection(s,p)):s.players[p].shields.flatMap(shieldCards).some(x=>x.uid===uid&&!x.g37ShieldHeld)||['hand','deck','mana','grave','extra'].some(z=>s.players[p][z].some(x=>x.uid===uid));}
function replaceExecutionCard(s,p,uid,to='grave'){const own=s.players[p],top=own.battle.find(x=>layers(x).some(y=>y.uid===uid));if(!canReplaceExecution(s,p,uid,to))return false;const shield=own.shields.flatMap(shieldCards).find(x=>x.uid===uid&&!x.g37ShieldHeld);if(shield){moveShield(s,p,uid,to,{cardOnly:true});return true;}if(top){if(top.uid===uid)moveCreatures(s,[{player:p,uid,to,destroy:false,cardOnly:true,replacement:true}]);else moveBattleCard(s,p,uid,to);return !own.battle.some(x=>layers(x).some(y=>y.uid===uid));}for(const zone of['hand','deck','mana','grave','extra']){const x=own[zone].find(x=>x.uid===uid);if(!x)continue;if(zone!==to){remove(own[zone],uid);clearBattleState(x,to);addZone(s,p,to,x);}return true;}return false;}
function resolveSpell(s,p,uid){const f=s.extSpells?.find(x=>x.inst.uid===uid);if(!f)return;const c=f.spell,inst=f.inst,before=s.extTasks?.length||0;if(spellIgnored(s,c))log(s,p,'spellIgnored',c.name+'の効果はバトルゾーンの能力により無視される',{cardId:c.id});else doEffect(s,p,c,uid,{plus:!!c.triggerPlusActive,super:!!c.superTriggerActive});(s.extTasks??=[]).splice(s.extTasks.length-before,0,extra.task('finishSpell',p,c.id,{uid}));}
// Smash Burst executes a spell without moving or duplicating its physical battlefield card.
// A spell cast by Lucky Darts remains in its shield until its resolution ends (QA48473).
function castShieldSpell(s,p,uid,face,source,counterChecked=false){
 const x=s.players[p].shields.flatMap(shieldCards).find(x=>x.uid===uid&&!x.g37ShieldHeld),c=x&&playFaces(card(x))[face];if(!c||c.type!=='spell'||!canCastSpell(s,p,c,'shields'))return;
 if(!counterChecked&&extra.shieldPhoto.beforeExecution(s,p,c,{uid:'pending-shield-'+String(s.virtualSerial=(s.virtualSerial||0)+1),cardId:x.cardId},{virtualArgs:[uid,face,source,{shield:true}],origin:'shields'}))return;
 x.g37ShieldHeld=true;const virtualUid=uid+':shield-spell:'+String(s.virtualSerial=(s.virtualSerial||0)+1),inst={uid:virtualUid,cardId:x.cardId},frame={inst,owner:p,caster:p,spell:c,virtual:true,shieldCast:{uid,face}};
 (s.extSpells??=[]).push(frame);s.metrics[p].played[c.id]=(s.metrics[p].played[c.id]||0)+1;(s.noManaUse??=[false,false])[p]=true;log(s,p,'play',c.name+'をラッキー・ダーツで唱える',{cardId:x.cardId});extra.spellCast(s,p,c,inst,'shields',face);
 if(c.charger&&!spellIgnored(s,c)){s.resolvingSpell={player:p,inst,source:x.cardId,face,shieldCast:frame};startJudge(s,p,x.cardId,uid,'spell');return;}
 resolveSpell(s,p,virtualUid);
}
function finishShieldSpell(s,f,to=null){
 to??=!spellIgnored(s,f.spell)&&(f.spell.normalCharger||f.spell.crystalCharger)?'mana':'grave';
 const x=s.players[f.owner].shields.flatMap(shieldCards).find(x=>x.uid===f.shieldCast.uid);if(!x)return;delete x.g37ShieldHeld;
 const physical=removeShieldCard(s,f.owner,x.uid);if(physical){clearBattleState(physical,to);if(to==='mana'&&f.spell.manaFinishTapped)physical.tapped=true;if(to==='mana'&&f.spell.crystalCharger){physical.faceDown=true;physical.tapped=false;}addZone(s,f.owner,to,physical);}
}
function castBattleSpell(s,p,uid,incarnation,source,reason='スマッシュ・バースト',counterChecked=false){if(reason?.shield){castShieldSpell(s,p,uid,incarnation,source,counterChecked);return;}const origin=['hand','deck','mana','grave','extra','battle'].find(z=>s.players[p][z].some(x=>layers(x).some(y=>y.uid===uid)))||'battle',c=playFaces(card(source))[1];if(!c||!canCastSpell(s,p,c,origin))return;if(!counterChecked&&canReplaceExecution(s,p,uid)&&extra.shieldPhoto.beforeExecution(s,p,c,{uid:'pending-spell-'+String(s.virtualSerial=(s.virtualSerial||0)+1),cardId:source},{virtualArgs:[uid,incarnation,source,reason],origin}))return;if(!reason?.paid)(s.noManaUse??=[false,false])[p]=true;s.metrics[p].played[c.id]=(s.metrics[p].played[c.id]||0)+1;log(s,p,'play',c.name+'を'+(reason?.label||reason)+'で唱える',{cardId:c.id});extra.spellCast(s,p,c);if(reason?.rinne)extra.original.rinneCast(s,p,{uid,cardId:source,incarnation});if(spellIgnored(s,c))return;if(c.charger){startJudge(s,p,c.id,uid,'spell');return;}const before=s.extTasks?.length||0;const virtualUid=uid+':spell:'+String(s.virtualSerial=(s.virtualSerial||0)+1);(s.extSpells??=[]).push({inst:{uid:virtualUid,cardId:source},owner:p,caster:p,spell:c,virtual:true});doEffect(s,p,c,uid);s.extTasks.splice(s.extTasks.length-before,0,extra.task('finishSpell',p,c.id,{uid:virtualUid}));}
// The revealed card remains in its library until an actual move succeeds.
function revealDragon(s,p,c){
 const own=s.players[p],top=own.deck[0];if(deckLocked(s,p))return;if(!top){deckCheck(s,p);return;}
 const data=card(top);log(s,p,'reveal',`${c.name}で山札の上を公開：${data.name}`,{cardId:data.id});
 if(!isDragon(data)){addZone(s,own,'grave',own.deck.shift());log(s,p,'revealMove',`${data.name}はドラゴンではないため墓地へ`,{cardId:data.id});deckCheck(s,p);return;}
 if(!canEnterCreature(s,p,data,{origin:'deck',execution:false})){log(s,p,'revealStay',`${data.name}はこのターンの登場制限により山札の上に残る`,{cardId:data.id});return;}
 if(data.evolution||data.neoEvolution){
  if(data.neoEvolution||evolutionBases(s,p,data).length)s.decision={type:'revealEvolution',player:p,uid:top.uid,source:data.id};
  else log(s,p,'revealStay',`${data.name}は進化元がないため山札の上に残る`,{cardId:data.id});
  return;
 }
 enterRevealed(s,p,top.uid);
}
function enterRevealed(s,p,uid,baseUid=null){
 const inst=remove(s.players[p].deck,uid);
 const met=s.metrics[p];met.played[inst.cardId]=(met.played[inst.cardId]||0)+1;if(s.players[p].turns<=3)met.earlyPlayed[inst.cardId]=true;
 log(s,p,'enter',`${card(inst).name}を山札からバトルゾーンへ出す（召喚ではない）`,{cardId:inst.cardId});enterCreature(s,p,inst,baseUid,{origin:'deck',execution:false});deckCheck(s,p);
}
function deployCandidates(s,p){return ['hand','mana'].flatMap(origin=>s.players[p][origin].filter(x=>isCreature(s,x)&&costValue(card(x))<=7&&civilizations(card(x)).length>1&&canEnterCreature(s,p,card(x),{origin,execution:false})&&(!card(x).evolution||evolutionBases(s,p,card(x)).length)).map(x=>({origin,inst:x})));}
function deployCreature(s,p,uid,origin,baseUid=null){
 const inst=remove(s.players[p][origin],uid),c=card(inst),met=s.metrics[p];met.played[c.id]=(met.played[c.id]||0)+1;if(s.players[p].turns<=3)met.earlyPlayed[c.id]=true;
 log(s,p,'deploy',`${c.name}を${origin==='hand'?'手札':'マナ'}から出す（召喚ではない）`,{cardId:c.id});enterCreature(s,p,inst,baseUid,{origin,execution:false});
}
function canMugen(s,p,c,origin,selected=[]){if(![2,4,5].includes(c.mugenCrime)||!canCastSpell(s,p,c,origin)||(c.type==='creature'&&!canEnterCreature(s,p,c,{origin,execution:true})))return false;const free=s.players[p].battle.filter(x=>isCreature(s,x)&&!x.tapped&&!selected.includes(x.uid)),need=c.mugenCrime-selected.length;if(need<0||free.length<need)return false;const birds=free.filter(x=>effectiveCard(x,s).manaBird),ordinary=free.length-birds.length,required=Math.max(0,need-ordinary),payment={...c,cost:summonCost(s,p,{...c,cost:c.mugenCrime,printedCost:c.cost,summonOrigin:origin})};return combinations(birds,required).some(bs=>manaPayment(paymentPool(s,p,[...selected,...bs.map(x=>x.uid)]),payment));}
function finishCharger(s){
 const r=s.resolvingSpell;if(!r||s.winner!==null)return;
 const c=playFaces(card(r.source))[r.face];const to='mana';if(r.shieldCast){finishShieldSpell(s,r.shieldCast,to);s.extSpells=s.extSpells.filter(f=>f!==r.shieldCast);s.resolvingSpell=null;return;}delete r.inst.finishTo;clearBattleState(r.inst,to);addZone(s,s.players[r.inst.cardOwner??r.player],to,r.inst);s.resolvingSpell=null;
 log(s,r.player,'charger',`${c.name}をチャージャーでマナへ（${r.inst.tapped?'タップ':'アンタップ'}）`,{cardId:r.source,face:r.face});
}
function startJudge(s,p,source,uid,mode,onWin=null){s.judge={player:p,source,uid,mode,onWin,parent:s.judge||null,wins:0,round:0,...(mode==='attack'?{deferredEffects:(s.pendingEffects||[]).splice(0)}:{})};judgeRound(s);}
function judgeRound(s){
 const j=s.judge;j.round++;j.stage='compare';j.prohibited=[0,1].map(p=>deckLocked(s,p));j.revealed=s.players.map((p,i)=>!deckLocked(s,i)&&p.deck[0]?{uid:p.deck[0].uid,cardId:p.deck[0].cardId}:null);
 for(const who of [s.active,1-s.active])if(!j.revealed[who]&&!s.players[who].deck.length){deckCheck(s,who);if(s.winner!==null||s.lossEvent)return;}
 j.costs=j.revealed.map(x=>{if(!x)return 'no-card';const costs=[...new Set(playFaces(card(x)).map(c=>c.cost))];return costs.length===1?costs[0]:null;});
 log(s,j.player,'judgeReveal',`ガチンコ・ジャッジ${j.round}回目：${j.revealed.map((x,i)=>`${s.players[i].name}は${x?card(x).name:'公開できるカードなし'}`).join(' / ')}を公開`,{cardId:j.source});
 advanceJudgeCosts(s);
}
function advanceJudgeCosts(s){
 const j=s.judge;if(!j||j.stage!=='compare'||s.winner!==null)return;
 for(const who of [s.active,1-s.active])if(j.costs[who]===null){s.decision={type:'judgeCost',player:who,source:j.revealed[who].cardId};return;}
 // The two cards rotate directly within their libraries; a one-card library never becomes empty.
 for(const who of [0,1]){if(j.revealed[who]){const x=s.players[who].deck.shift();if(x)s.players[who].deck.push(x);}}
 const won=j.costs[j.player]==='no-card'?j.costs[1-j.player]==='no-card'&&!j.prohibited.some(Boolean):j.costs[1-j.player]==='no-card'||numeric(j.costs[j.player])>=numeric(j.costs[1-j.player]);
 log(s,j.player,'judgeResult',`ガチンコ・ジャッジ：${j.costs[j.player]} 対 ${j.costs[1-j.player]}、${won?'勝ち':'負け'}`,{cardId:j.source});
 s.decision=null;
 if(j.mode==='single'){s.judge=j.parent||null;if(won&&j.onWin)extra.put(s,j.onWin);return;}
 if(j.mode==='spell'){s.judge=j.parent||null;if(won){extra.put(s,extra.task('finishJudgeCharger',j.player,j.source));draw(s,j.player,1);}else finishCharger(s);return;}
 if(won){j.wins++;s.decision={type:'judgeContinue',player:j.player};}
 else beginJudgeBreaks(s);
}
function beginJudgeBreaks(s){const j=s.judge;j.stage='breaks';j.remaining=j.wins;s.decision=null;}
function advanceJudgeBreaks(s){if(s.lossEvent)return;
 const j=s.judge;if(!j||j.stage!=='breaks'||s.extTasks?.length||s.decision||s.triggers||s.pendingEffects?.length||s.battleResolution||s.winner!==null)return;
 if(j.remaining&&s.players[1-j.player].shields.length){s.decision={type:'judgeBreak',player:j.player};return;}
 if(j.deferredEffects?.length)(s.pendingEffects??=[]).push(...j.deferredEffects);s.judge=j.parent||null;
}
// Usage declarations precede every attack-trigger resolution (506.3b).
function advanceDeclarations(s){if(s.lossEvent)return;
 if(!s.extTasks?.length&&!s.decision&&!s.triggers?.undeclared.length&&extra.shieldDeclarations(s))return;
 if(!s.attackDeclarations||s.decision||s.winner!==null)return;
 while(s.attackDeclarations.length&&!['hand','mana'].some(z=>s.players[s.active][z].some(x=>x.uid===s.attackDeclarations[0])))s.attackDeclarations.shift();
 if(s.attackDeclarations.length){const uid=s.attackDeclarations[0],origin=s.players[s.active].hand.some(x=>x.uid===uid)?'hand':'mana',inst=s.players[s.active][origin].find(x=>x.uid===uid);s.decision={type:'dddDeclare',player:s.active,uid,source:inst.cardId,origin,serial:inst.zoneSerial||0};}
 else delete s.attackDeclarations;
}
function defenseOptions(s,p){if(!s.attack)return [];const a=s.players[s.active].battle.find(x=>x.uid===s.attack.attacker);if(!a||effectiveCard(a,s).attackUnredirectable)return [];const list=[];for(const x of s.players[p].battle){const c=effectiveCard(x,s);if(!isCreature(s,x)||x.tapped)continue;if(c.blocker&&!card(a).unblockable&&!unblockedNow(s,a)&&(!effectiveCard(a,s).flying||c.flying)&&!extra.locked(s,p,x,'block'))list.push({kind:'block',uid:x.uid,cardId:x.cardId,label:card(x).name+'でブロック'});if(c.guardman&&!c.cannotBeAttacked&&s.attack.target!=='player'&&s.attack.target!==x.uid&&s.players[p].battle.some(y=>y.uid===s.attack.target&&isCreature(s,y)))list.push({kind:'guardman',uid:x.uid,cardId:x.cardId,label:card(x).name+'でガードマン'});}return list;}
function defend(s,p,uid,kind,incarnation){if(!s.attack)return;const x=s.players[p].battle.find(x=>x.uid===uid&&(x.incarnation||0)===incarnation),a=s.players[s.active].battle.find(x=>x.uid===s.attack.attacker);if(!x||!a||effectiveCard(a,s).attackUnredirectable||x.tapped||!isCreature(s,x))return;if(kind==='guardman'&&(effectiveCard(x,s).cannotBeAttacked||s.attack.target==='player'||s.attack.target===uid||!s.players[p].battle.some(y=>y.uid===s.attack.target&&isCreature(s,y))))return;if(kind==='block'&&(card(a).unblockable||unblockedNow(s,a)||(effectiveCard(a,s).flying&&!effectiveCard(x,s).flying)||extra.locked(s,p,x,'block')))return;tapCard(s,p,x);s.attack.target=uid;log(s,p,kind==='block'?'block':'guardman',card(x).name+(kind==='block'?'でブロック':'へ攻撃先を変更'),{cardId:x.cardId});if(kind==='block'){recordCombat(s,p);extra.block(s,p,x);s.attack.stage='redirecting'+(s.attack.defenseSerial=(s.attack.defenseSerial||0)+1);extra.ninjaWindow(s,s.active);}}
function advanceAttack(s){if(s.lossEvent)return;
 if(s.attack){const a=s.players[s.active].battle.find(x=>x.uid===s.attack.attacker),b=s.attack.target!=='player'&&s.players[1-s.active].battle.find(x=>x.uid===s.attack.target);if(a?.sealed||b?.sealed)s.attack=null;}
 if(!s.attack||s.decision||s.winner!==null||s.pendingEffects?.length||s.extTasks?.length||s.triggers||s.battleResolution||s.judge||s.attackDeclarations||s.leaving)return;
 if(s.attack.stage==='effects'){if(extra.ninjaWindow(s,1-s.active))return;s.attack.stage='block';s.decision={type:'block',player:1-s.active};}
 else if(s.attack.stage.startsWith('redirecting'))resolveAttack(s,null);
 else if(s.attack.stage==='blockedEffects'){const a=s.players[s.active].battle.find(x=>x.uid===s.attack.attacker),b=s.players[1-s.active].battle.find(x=>x.uid===s.attack.blockUid);if(a&&b)battle(s,s.active,a,1-s.active,b,a.uid);s.attack=null;}
}
function battle(s,pa,a,pd,b,attackingUid=null,replaced=false){
 if(!replaced&&extra.replaceBattle(s,pa,a,pd,b,attackingUid))return;
 if(s.battleResolution){(s.battleStack??=[]).push(s.battleResolution);s.battleResolution=null;}
 const bonus=(x,p)=>effectiveCard(x,s).revZero&&!s.players[p].shields.length?10000:0;
 const ap=matchupPower(a,b,a.uid===attackingUid,s,b.uid===attackingUid)+bonus(a,pa)+(effectiveCard(a,s).g38BattleBonus||0),bp=matchupPower(b,a,b.uid===attackingUid,s,a.uid===attackingUid)+bonus(b,pd)+(effectiveCard(b,s).g38BattleBonus||0),late=[],forced=extra.beforeBattle(s,pa,a,pd,b);
 if(effectiveCard(a,s).slayer)late.push({controller:pa,player:pd,uid:b.uid,source:a.cardId});
 if(effectiveCard(b,s).slayer)late.push({controller:pd,player:pa,uid:a.uid,source:b.cardId});
 if(effectiveCard(a,s).afterBattleDie)late.push({controller:pa,player:pa,uid:a.uid,source:a.cardId});
 if(effectiveCard(b,s).afterBattleDie)late.push({controller:pd,player:pd,uid:b.uid,source:b.cardId});
 log(s,pa,'battle',`${card(a).name}(${ap}) 対 ${card(b).name}(${bp})`);
 const aw=forced[0]||!forced[1]&&ap>bp,bw=forced[1]||!forced[0]&&bp>ap,winner=aw&&!bw?pa:bw&&!aw?pd:null,winning=aw&&!bw?a:bw&&!aw?b:null,moves=[];if(!aw&&!extra.firebird.battleSafe(s,a)&&!extra.six.battleSafe(s,a))moves.push({player:pa,uid:a.uid});if(!bw&&!extra.firebird.battleSafe(s,b)&&!extra.six.battleSafe(s,b))moves.push({player:pd,uid:b.uid});
 moveCreatures(s,moves,{kind:'battleResult',winner,both:aw&&bw?[{player:pa,uid:a.uid,source:a.cardId,mechade:!!effectiveCard(a,s).mechade,breakNine:!!effectiveCard(a,s).breakNine},{player:pd,uid:b.uid,source:b.cardId,mechade:!!effectiveCard(b,s).mechade,breakNine:!!effectiveCard(b,s).breakNine}]:null,winning:winning?{uid:winning.uid,source:winning.cardId,mechade:!!effectiveCard(winning,s).mechade,breakNine:!!effectiveCard(winning,s).breakNine}:null,late:late.sort((x,y)=>Number(y.controller===s.active)-Number(x.controller===s.active))});
}
function finishBattleResult(s,winner,late,winning=null,both=null){
 if(both){const wins=[];for(const p of[s.active,1-s.active])for(const w of both.filter(x=>x.player===p)){wins.push(...s.players[p].battle.filter(x=>effectiveCard(x,s).battleWinDraw).map(x=>({player:p,uid:x.uid,source:x.cardId})),...extra.battleWins(s,p,w));if(w.breakNine)wins.push(w);}s.battleResolution={wins,late};return;}
 const wins=winner===null?[]:s.players[winner].battle.filter(x=>effectiveCard(x,s).battleWinDraw).map(x=>({player:winner,uid:x.uid,source:x.cardId}));if(winner!==null){wins.push(...extra.battleWins(s,winner,winning));if(winning?.breakNine)wins.push({player:winner,uid:winning.uid,source:winning.source,breakNine:true});}s.battleResolution={wins,late};
}
// Resolve battle-result triggers before Slayer and other "after the battle" effects (115.3d).
function resolveBattleWin(s,e){if(e.task){s.battleResolution.gateWait=true;extra.put(s,e.task);}else if(e.hunter){s.battleResolution.gateWait=true;extra.put(s,extra.task('g12Mechade',e.player,e.source));}else if(e.breakNine){s.battleResolution.gateWait=true;extra.put(s,extra.task('g21BreakNine',e.player,e.source));}else if(e.gate){s.battleResolution.gateWait=true;extra.put(s,extra.task('g20Wellkius',e.player,e.source));}else s.decision={type:'draw',player:e.player,max:1,source:e.source,reason:'battleWin'};}
function advanceBattle(s){
 while(s.battleResolution&&!s.lossEvent&&s.judge?.stage!=='compare'&&!s.decision&&!s.leaving&&s.winner===null){
  const r=s.battleResolution;
  if(r.gateWait){if(s.extTasks?.length||s.pendingEffects?.length||s.triggers)return;delete r.gateWait;}
  const who=r.wins.some(x=>x.player===s.active)?s.active:1-s.active,available=r.wins.filter(x=>x.player===who);
  if(available.length>1){s.decision={type:'battleWinOrder',player:who};return;}
  if(available.length){const e=available[0];r.wins.splice(r.wins.indexOf(e),1);resolveBattleWin(s,e);return;}
  if(r.late.length){const e=r.late.shift();if(s.players[e.player].battle.some(x=>x.uid===e.uid)){log(s,e.controller,'afterBattle',`${card(e.source).name}のバトルの後の効果`,{cardId:e.source});moveCreatures(s,[e]);}}else s.battleResolution=s.battleStack?.pop()||null;
 }
}
function resolveAttack(s,blockUid){
 const a=s.players[s.active].battle.find(x=>x.uid===s.attack.attacker),other=1-s.active;
 if(!a){s.attack=null;return;}
 if(blockUid){recordCombat(s,other);const b=s.players[other].battle.find(x=>x.uid===blockUid);tapCard(s,other,b);extra.block(s,other,b);log(s,other,'block',`${card(b).name}でブロック`,{cardId:b.cardId});s.attack.stage='blockedEffects';s.attack.blockUid=blockUid;extra.ninjaWindow(s,s.active);return;}
 if(s.attack.target==='player'&&extra.selectBreaker(s,s.active,a))return;
 const gMode=s.attack.g14Breaker==='g'||!s.attack.g14Breaker&&effectiveCard(a,s).gBreaker;if(s.attack.target==='player'&&gMode&&s.attackLifecycle)s.attackLifecycle.g14G={p:s.active,uid:a.uid,source:a.cardId};
 if(s.attack.target!=='player'){const b=s.players[other].battle.find(x=>x.uid===s.attack.target);if(b)battle(s,s.active,a,other,b,a.uid);}
 else if(!s.players[other].shields.length)finish(s,s.active,'ダイレクトアタックが成立','loss','directAttack');
 else{
  s.breakContext={player:s.active,sourceUid:a.uid,source:a.cardId,...(effectiveCard(a,s).g122NoST?{noST:true}:{}),reverse:!!effectiveCard(a,s).reverseBurn,burn:!!effectiveCard(a,s).shieldBurn};
  const shields=s.players[other].shields,n=gMode?shields.length:Math.min(numeric(effectiveCard(a,s).breaker||1)+(effectiveCard(a,s).extraBreak||0),shields.length);
  if(!gMode&&effectiveCard(a,s).breaker==='∞'&&!effectiveCard(a,s).worldBreaker)s.decision={type:'infinityCount',player:s.active,defender:other};
  else if(n===shields.length)breakShields(s,other,shields.map(c=>c.uid));
  else if(n===1){if(s.attack.shield&&!shields.some(x=>x.uid===s.attack.shield)&&shields.length>1)s.decision={type:'breakChoice',player:s.active,defender:other,count:1};else breakShields(s,other,[shields.some(x=>x.uid===s.attack.shield)?s.attack.shield:shields[0].uid]);}
  else s.decision={type:'breakChoice',player:s.active,defender:other,count:n};
 }
 s.attack=null;
}
// Rule 509.5: selected shields leave together. Declare every trigger before executing any.
function breakShields(s,defender,uids){
 const attacker=s.players[1-defender].battle.find(x=>x.uid===s.attack?.attacker);if(attacker&&s.breakContext?.sourceUid===attacker.uid&&effectiveCard(attacker,s).qqLock&&!s.breakContext?.reverse){s.breakContext=null;const moved=[];for(const uid of uids)moved.push(...moveShield(s,defender,uid,'deckFourth',{replacement:true}));if(moved.length>1)extra.put(s,extra.task('g11_FourthOrder',defender,attacker.cardId,{uids:moved.map(x=>x.uid),selected:[]}));log(s,1-defender,'fiveSD',`シールド${uids.length}つのカード${moved.length}枚を山札の4枚目へ横向きで置く`,{cardId:attacker.cardId});return;}
 if(extra.beforeBreak(s,defender,uids))return;
 if(s.breakContext?.burn){const n=uids.filter(uid=>findShield(s.players[defender],uid)).length;s.breakContext=null;for(const uid of uids)moveShield(s,defender,uid,'grave');s.players[defender].brokenThisTurn=(s.players[defender].brokenThisTurn||0)+n;s.metrics[s.active].breaks+=n;log(s,s.active,'break',`シールド${n}つをブレイクして墓地へ（S・トリガー不可）`);return;}
 if(extra.reverseBreak(s,defender,uids))return;
 if(shieldGuardSources(s,defender).length){s.shieldBreak={player:defender,uids:[...uids],protections:[]};s.decision={type:'shieldGuard',player:defender};return;}
 commitShieldBreak(s,defender,uids);
}
function commitShieldBreak(s,defender,uids){
 const breakContext=s.breakContext;s.breakContext=null;
 // Declaration eligibility is captured BEFORE the shields leave (official QA 48474).
 const groups=uids.map(uid=>findShield(s.players[defender],uid)).filter(Boolean),count=breakContext?.replacementBreak?groups.length:groups.filter(x=>shieldCards(x).some(c=>!c.faceUp||!card(c).gCastle)).length,all=groups.flatMap(shieldCards);
 const eligibleFaces=Object.fromEntries(all.flatMap(x=>{if(x.faceUp&&card(x).gCastle&&!breakContext?.replacementBreak)return [];const faces=!breakContext?.noST&&extra.triggersAllowed(s,defender)?playFaces(card(x)).flatMap((c,face)=>(c.g26Viride&&s.players[1-defender].battle.filter(x=>isCreature(s,x)).length>=3||extra.six.shieldTrigger(s,defender,x,c)||c.trigger||c.triggerPlus||c.superTrigger||c.graveTotalTrigger&&s.players.reduce((n,p)=>n+p.grave.length,0)>=c.graveTotalTrigger||c.rev2Trigger&&s.players[defender].shields.length-count<=2||x.g19ShieldST!==undefined||c.type==='spell'&&extra.spellShieldTrigger(s,defender)||c.shieldConditionalTrigger&&s.players[defender].grave.filter(x=>playFaces(card(x)).some(c=>c.type==='spell')).length>=2)&&extra.triggersAllowed(s,defender,c)&&canCastSpell(s,defender,c)?[face]:[]):[];return faces.length?[[x.uid,faces]]:[];})),eligible=Object.keys(eligibleFaces);
 const broken=[];for(const uid of uids){const root=removeShield(s,defender,uid);for(const x of shieldCards(root)){const castle=x.faceUp&&card(x).gCastle&&!breakContext?.replacementBreak;clearBattleState(x,'hand');if(castle)addZone(s,s.players[defender],'grave',x);else broken.push(x);}}
 extra.broken(s,breakContext,count);s.players[defender].hand.push(...broken);s.players[defender].brokenThisTurn=(s.players[defender].brokenThisTurn||0)+count;s.metrics[s.active].breaks+=count;
 for(const x of broken){if(card(x).triggerPlus)x.triggerPlus=defender!==s.active&&s.players[defender].brokenThisTurn>=2;if(playFaces(card(x)).some(c=>c.superTrigger))x.superTrigger=s.players[defender].shields.length===0;}
 log(s,s.active,'break',`シールド${count}つ（カード${broken.length}枚）を同時にブレイク（残り${s.players[defender].shields.length}つ）`);
 for(const x of broken)extra.shieldHand(s,defender,x,true);
 const gs=extra.gsAllowed(s,defender)?broken.filter(x=>card(x).gStrike).map(x=>x.uid):[];
 if(eligible.length||gs.length||extra.hasSB(s,defender,broken)){if(s.triggers)(s.triggerStack??=[]).push(s.triggers);s.triggers={interrupt:!!s.g19Interrupt?.breaking,player:defender,undeclared:eligible.filter(uid=>broken.some(x=>x.uid===uid)),declared:[],entries:[],eligibleFaces,faceByUid:{},gsUndeclared:gs,gsDeclared:[]};if(s.g19Interrupt?.breaking)s.g19Interrupt.breaking=false;}
 extra.beginSB(s,defender,broken,true);
}
function interruptBreak(s,p,uids,follow){if(s.g19Interrupt)throw Error('重複した割り込み');s.g19Interrupt={breaking:true,tasks:[follow,...(s.extTasks||[])],effects:(s.pendingEffects||[]).splice(0),context:s.breakContext};s.extTasks=[];s.breakContext=null;breakShields(s,p,uids);}
function resumeInterrupt(s){const w=s.g19Interrupt;if(!w||s.shieldBreak||s.decision||!w.breaking)return;finishInterrupt(s);}
function finishInterrupt(s){const w=s.g19Interrupt;delete s.g19Interrupt;s.extTasks=[...w.tasks,...(s.extTasks||[])];s.pendingEffects=[...w.effects,...(s.pendingEffects||[])];s.breakContext=w.context;}

// Rule 112.3a: spell triggers finish first; creature entry effects wait until all triggers finish.
function advanceTriggers(s){if(s.lossEvent)return;
 while(!s.lossEvent&&s.triggers&&!s.extTasks?.length&&!s.decision&&s.winner===null){
  const t=s.triggers,p=t.player;
  t.undeclared=t.undeclared.filter(uid=>s.players[p].hand.some(x=>x.uid===uid));if(t.undeclared.length){const c=s.players[p].hand.find(c=>c.uid===t.undeclared[0]);s.decision={type:'trigger',player:p,uid:c.uid,source:c.cardId};return;}
  if(extra.shieldDeclarations(s))return;
  t.declared=t.declared.filter(uid=>{const x=s.players[p].hand.find(c=>c.uid===uid);if(!x||t.sbDeclared?.includes(uid)&&(x.zoneSerial||0)!==t.sbSerials?.[uid])return false;const c=playFaces(card(x))[t.faceByUid?.[uid]||0];if(c.type!=='creature'||canEnterCreature(s,p,c))return true;log(s,p,'entryPrevented',`${card(x).name}は登場制限により召喚できず手札に残る`,{cardId:x.cardId});return false;});
  if(t.gsUndeclared?.length){const uid=t.gsUndeclared[0];extra.choice(s,extra.task('gsDeclare',p,s.players[p].hand.find(x=>x.uid===uid).cardId,{uid}),'G・ストライクを使いますか？',[{label:'使う',value:true,score:15},{label:'使わない',value:false,score:0}]);return;}
  t.gsDeclared=(t.gsDeclared||[]).filter(uid=>s.players[p].hand.some(x=>x.uid===uid));
  const usable=t.declared.filter(uid=>canUseTrigger(s,p,playFaces(card(s.players[p].hand.find(x=>x.uid===uid)))[t.faceByUid?.[uid]||0],uid));
  if(usable.length+(t.gsDeclared?.length||0)>1){s.decision={type:'triggerOrder',player:p};return;}
  if(usable.length){const uid=usable[0];t.declared.splice(t.declared.indexOf(uid),1);executeTrigger(s,p,uid,t.faceByUid?.[uid]||0);continue;}
  if(t.gsDeclared?.length){const uid=t.gsDeclared.shift();extra.put(s,extra.task('gsTarget',p,s.players[p].hand.find(x=>x.uid===uid).cardId));continue;}
  for(const uid of t.declared){const c=card(s.players[p].hand.find(x=>x.uid===uid));log(s,p,'spellPrevented',`${c.name}は実行条件を満たさないため使用できず手札に残る`,{cardId:c.id});}t.declared=[];
  if(t.interrupt){s.pendingEffects=[...(s.pendingEffects||[]),...t.entries];s.triggers=s.triggerStack?.pop()||null;finishInterrupt(s);return;}
  if(s.pendingEffects?.length)t.entries.push(...s.pendingEffects.splice(0));
  t.entries=availableEffects(s,t.entries);
  if(!t.entries.some(x=>x.player===s.active)&&extra.beforeNonActive(s))return;
  const ep=t.entries.some(x=>x.player===s.active)?s.active:1-s.active,entries=t.entries.filter(x=>x.player===ep);
  if(entries.length>1){s.decision={type:'entryOrder',player:ep};return;}
  if(entries.length){const e=entries[0];t.entries.splice(t.entries.indexOf(e),1);resolveEntry(s,e);advanceBattle(s);continue;}
  s.triggers=s.triggerStack?.pop()||null;
 }
}
function canUseTrigger(s,p,c,uid=null){if(s.triggers?.sbDeclared?.includes(uid))return canCastSpell(s,p,c)&&(c.type!=='creature'||canEnterCreature(s,p,c))&&(!c.evolution||evolutionBases(s,p,c).length>0);return extra.triggersAllowed(s,p,c)&&canCastSpell(s,p,c)&&!spellIgnored(s,c)&&(c.type!=='creature'||canEnterCreature(s,p,c))&&(!c.evolution||evolutionBases(s,p,c).length>0);}
function executeTrigger(s,p,uid,face){const x=s.players[p].hand.find(x=>x.uid===uid),c=playFaces(card(x))[face];if(c.evolution||c.neoEvolution)s.decision={type:'triggerEvolution',player:p,uid,source:x.cardId,face};else playCard(s,p,uid,true,null,face,null,'hand',s.triggers?.sbDeclared?.includes(uid)?'S・バック':'S・トリガー');}
function combinations(items,n){if(n===0)return [[]];if(n>items.length)return [];return items.flatMap((x,i)=>combinations(items.slice(i+1),n-1).map(rest=>[x,...rest]));}

function skipTurn(s,p,source){
 log(s,p,'skipTurn',`${card(source).name}でターンの残りを飛ばす`,{cardId:source});
 // An interrupted effect may still own physical spells and reserved cards.
 for(const f of(s.g33Executions||[]).splice(0).filter(x=>!x.options.virtualArgs)){clearBattleState(f.inst,'grave');addZone(s,f.inst.cardOwner??f.p,'grave',f.inst);}
 const tasks=[...(s.extTasks||[]),...(s.g19Interrupt?.tasks||[]),...(s.g19BreakSequence?.tasks||[])];
 for(const [who,own]of s.players.entries()){
  for(const [zone,fallback]of [['g34Holding','grave'],['g29Holding','hand'],['g29Reviving','grave'],['g24Holding','hand'],['g5Holding','hand'],['g20Holding','hand'],['g21Holding','deck'],['g21ManaPending','mana'],['g19Holding','deck'],['g7Holding','deck']])for(const x of (own[zone]||[]).splice(0)){
   const t=tasks.find(t=>t.p===who&&t.uid===x.uid),origin=x.g29Origin||x.g5Origin||x.g20Origin||t?.origin||t?.options?.origin||fallback;
   delete x.g5Origin;delete x.g20Origin;own[['deck','hand','grave','mana'].includes(origin)?origin:fallback].push(x);
  }
  for(const key of ['g34Protected','g33Protected','g29Protected','g28Protected','g27Protected','g13Protected','g4Protected','g8Protected','g14Protected','g25Protected','g18Protected','g10Protected','g17Protected','g3Protected','g2Protected','g7Reveals','g19Reveals','g21Protected','g12Reveals'])delete own[key];
 }
 for(const spell of s.extSpells||[])if(spell.shieldCast)finishShieldSpell(s,spell);else if(!spell.virtual){clearBattleState(spell.inst,'grave');addZone(s,s.players[spell.owner],'grave',spell.inst);}s.extSpells=[];
 if(s.resolvingSpell?.shieldCast)s.resolvingSpell=null;if(s.resolvingSpell){const r=s.resolvingSpell;clearBattleState(r.inst,'grave');addZone(s,s.players[r.inst.cardOwner??r.player],'grave',r.inst);s.resolvingSpell=null;}
 delete s.g23After;delete s.g25DeployBatch;delete s.g34DeployBatch;delete s.g15ResumeAfterMove;delete s.g15SmaxResume;
 for(const key of ['decision','attack','attackDeclarations','attackLifecycle','battleResolution','judge','endStep','startStep','leaving','triggers','g19BreakSequence','g19Interrupt','g14AfterAttack','g3Window','breakContext','shieldBreak'])s[key]=null;
 s.pendingEffects=[];s.triggerStack=[];s.extTasks=[];s.after=[];s.g10RevDeclarations=[];
 nextTurn(s);
}
function manaSnapshot(s){return s.players.map((own,p)=>({uids:own.mana.map(x=>x.uid),watchers:own.battle.filter(x=>card(x)?.g47Strato&&!abilitiesIgnored(s,x)).map(x=>({uid:x.uid,cardId:x.cardId,incarnation:x.incarnation||0}))}));}
function manaDeparted(s,before){for(let p=0;p<2;p++)if(before[p].uids.some(uid=>!s.players[p].mana.some(x=>x.uid===uid)))extra.seed.manaLeft(s,p,before[p].watchers);}
function nextTurn(s){
 extra.expire(s,'end',s.active);for(const p of[s.active,1-s.active]){deckCheck(s,p);if(s.winner!==null||s.lossEvent)return;}s.noManaUse=[false,false];s.endStep=null;s.creaturesEntered=0;
 for(const p of s.players){p.enteredThisTurn=0;p.entryLimitThisTurn=false;for(const c of p.battle){c.buff=0;c.unblocked=false;delete c.buffSources;delete c.unblockSpellCost;}}
 let queued=s.extraTurns?.length?s.extraTurns.shift():null,next=queued?queued.player:1-s.active;while(s.g43Skip?.[next]>0){s.g43Skip[next]--;log(s,next,'skipNextTurn','夢幻の無：次の自身のターンをとばす');queued=s.extraTurns?.length?s.extraTurns.shift():null;next=queued?queued.player:1-next;}s.g31ExtraTurn=!!queued;s.active=next;extra.expire(s,'start',s.active);s.turn++;s.phase='charge';const p=s.players[s.active];p.turns++;s.metrics[s.active].turns=p.turns;if(!p.deck.length){deckCheck(s,s.active);if(s.winner!==null||s.lossEvent)return;}
 // Expire effects at the specified controller's turn start, before untapping.
 for(const own of s.players)for(const top of own.battle)for(const c of layers(top)){if(c.tapLocks)c.tapLocks=c.tapLocks.filter(who=>who!==s.active);}
 for(const top of p.battle)for(const c of layers(top))delete c.hyperActive;
 refreshDynamicTypes(s);const limited=extra.beforeUntap(s,s.active);for(const c of [...p.mana,...p.battle]){const wasTapped=c.tapped;if((!limited||p.battle.includes(c))&&!c.skipUntap&&!(p.battle.includes(c)&&(effectiveCard(c,s).g26Zaze||effectiveCard(c,s).g40StartNoUntap))&&canUntap(c))c.tapped=false;delete c.skipUntap;if(wasTapped&&!c.tapped&&p.battle.includes(c))extra.six.untapped(s,s.active,c,true);}
 p.entryLimitThisTurn=!!p.entryLimitNextTurn;p.entryLimitNextTurn=false;
 log(s,s.active,'turn',`${p.name}の${p.turns}ターン目`);s.startStep={player:s.active};s.phase='start';for(const e of extra.start(s,s.active))enqueueEffect(s,e.player??s.active,e);advanceStart(s);
}
function advanceStart(s){if(s.lossEvent)return;if(!s.startStep||s.decision||s.extTasks?.length||s.pendingEffects?.length||s.triggers||s.leaving||s.battleResolution||s.winner!==null)return;const p=s.startStep.player;delete s.startStep;s.phase='charge';draw(s,p,1);}
function beginEnd(s){
 const untappers=s.players[s.active].battle.filter(c=>effectiveCard(c,s).endUntap&&c.tapped&&canUntap(c)),deferred=[...extra.end(s),...(untappers.length?[{uid:untappers[0].uid,source:untappers[0].cardId,effect:'endUntap',uids:untappers.map(x=>x.uid)}]:[])],p=1-s.active;s.endStep={player:p,stage:'declare',deferred,remaining:s.players[p].hand.filter(x=>card(x).gaia||card(x).endMirage).map(x=>x.uid),declared:[],untap:[]};extra.beforeEnd(s);advanceEnd(s);
}
function advanceEnd(s){if(s.lossEvent)return;
 const end=s.endStep;if(!end||s.decision||s.extTasks?.length||s.winner!==null||s.pendingEffects?.length||s.triggers||s.leaving||s.battleResolution||s.judge||s.attack)return;
 const p=end.player,own=s.players[p];
 if(end.stage==='declare'){
  end.remaining=end.remaining.filter(uid=>{const x=own.hand.find(x=>x.uid===uid);return x&&(card(x).endMirage||s.noManaUse?.[s.active]&&!own.battle.some(x=>card(x).gaia));});
  if(end.remaining.length){s.decision={type:card(own.hand.find(x=>x.uid===end.remaining[0])).endMirage?'mirageDeclare':'gaiaDeclare',player:p,uid:end.remaining[0],source:own.hand.find(x=>x.uid===end.remaining[0])?.cardId};return;}
  end.stage='resolve';const deferred=end.deferred||[];end.deferred=[];for(const e of deferred)enqueueEffect(s,e.player??s.active,e);if(deferred.length)return;
  if(end.untap.length){s.decision={type:'untap',player:s.active,uids:end.untap};return;}
 }
 end.declared=end.declared.filter(uid=>own.hand.some(x=>x.uid===uid));
 while(end.declared.length){
  if(end.declared.length>1&&end.declared.some(uid=>card(own.hand.find(x=>x.uid===uid)).endMirage)){s.decision={type:'endAbilityOrder',player:p};return;}
  const uid=end.declared.shift(),x=own.hand.find(x=>x.uid===uid);
  if(x&&card(x).endMirage){extra.put(s,extra.task('mirageCast',p,x.cardId,{uid}));return;}
  if(x&&s.noManaUse?.[s.active]&&!own.battle.some(x=>card(x).gaia)&&canEnterCreature(s,p,card(x))){s.decision={type:'gaiaSummon',player:p,uid,source:x.cardId};return;}
 }
 nextTurn(s);
}

function option(kind,label,extra={}){return {kind,label,...extra};}
function effectOptions(entries,kind){return entries.map((e,i)=>option(kind,`${card(e.source).name} ${i+1}：${e.effect==='justDiver'?'ジャストダイバー':e.effect==='dragonEntryTap'?'ドラゴン登場時の任意タップ':e.effect==='shieldEntryTapLock'?'シールド追加時のタップとアンタップ制限':e.effect==='ddd'?'宣言したD・D・D':e.effect==='attackDragonReveal'?'攻撃時の山札公開':e.effect==='attackJudge'?'攻撃時のガチンコ・ジャッジ':e.effect==='extended'?({g19Yobi:'ヨビニオン',g1_Copy:'オルゲイトの能力コピー',g1_Look:'2体目登場時の手札・マナ追加',g1_Skip:'ターンの残りを飛ばす'}[e.task?.op]||'カードの能力'):'出た時の効果'}を先に解決`,{uid:e.uid,cardId:e.source,effectId:e.effectId}));}
export function getLegalActions(s){
 if(s.winner!==null)return [];
 let out=[];const d=s.decision,p=d?d.player:s.active,own=s.players[p],opp=s.players[1-p];
 if(d){
  if(d.type==='drawReplacement')return (d.stage==='replace'?[option('replaceDraw','2枚引いて1枚捨てる',{replace:true,score:10}),option('replaceDraw','通常どおり1枚引く',{replace:false,score:0})]:d.cards.map(x=>option('discardDraw',card(x.cardId).name+'を捨てる',{uid:x.uid,cardId:x.cardId,score:-costValue(card(x.cardId))}))).map((a,id)=>({...a,id,player:p}));
  if(d.type==='manaPayment'){
   out=d.pool.filter(x=>!x.tapped).map(x=>option('selectMana',(d.selected.includes(x.uid)?'選択を解除：':'選ぶ：')+card(x).name,{uid:x.uid,cardId:x.cardId}));
   if(manaSelectionStatus(d).valid)out.push(option('confirmMana','このマナで使う'));if(d.cancellable)out.push(option('cancelMana','キャンセル'));
   return out.map((a,i)=>({...a,id:i,player:p}));
  }
  if(d.type==='godLeave')out=[s.players[p].battle.find(x=>x.uid===d.uid)].flatMap(x=>[x,...x.godLinks]).map(x=>option('godLeave',card(x.cardId).name+'を移動する',{uid:x.uid,cardId:x.cardId}));
  else if(d.type==='extended')out=extra.actions(s,d);
  if(d.type==='leaveReplace'){
   const row=s.leaving.rows.find(x=>x.uid===d.uid&&x.player===(d.owner??p)),v=leaveOptions(s,row),name=card(s.players[row.player].battle.find(x=>x.uid===row.uid)).name;
   for(const x of v.g47.filter(x=>x.controller===p))out.push(option('g47Replace',x.label,{choice:x.value,cardId:x.cardId}));
   if(d.foreignOnly){out.push(option('g47Decline','ストラトバッグの置換を使わない'));return out.map(a=>({...a,player:p}));}
   for(const x of v.g49)out.push(option('g49Replace',x.label,{choice:x.value,cardId:x.cardId}));
   if(v.omega)out.push(option('replaceOmega',name+(row.destroyToHand?'の破壊を手札に戻す効果で置き換える':'をエターナル・Ωで手札に戻す')));for(const x of v.muku)out.push(option('replaceMuku',card(x.cardId).name+'：'+name+'をとどまらせる',{key:x.key,cardId:x.cardId}));
   if(v.hawk)out.push(option('replaceHawk',name+'をブラック・ホークの効果で山札の下へ置く'));
   if(v.ningyo)out.push(option('replaceNingyo','ニンギョ：マナのかわりに墓地へ置く'));
   if(v.ura.length>=5)out.push(option('replaceUra',name+'を残すため下の5枚を山札へ戻す'));
   if(v.oni.length>=3)out.push(option('replaceOni',name+'を残すため表向きのカード3枚を選ぶ'));
   for(const x of v.g33)out.push(option('replaceShieldFace',name+'を残し、'+card(x).name+'を裏返す',{shieldCard:x.uid,cardId:x.cardId}));
   for(const shield of v.exChoices)out.push(option('replaceEx',name+'をEXライフで残す'+(v.exChoices.length>1?'（シールド'+(own.shields.findIndex(x=>x.uid===shield)+1)+'）':''),{shield}));
   if(v.star)out.push(option('replaceStar',`${name}の一番上だけを移動する（スター進化）`));
   if(v.gneo)out.push(option('replaceGneo',`${name}の下のカードすべてをかわりに移動する`));
   for(const x of v.savak)out.push(option('replaceSavak',`${name}を残し、${x.owner===p?'自分':'相手'}の表向きの${card(x.cardId).name}を墓地へ`,{shieldCard:x.uid,owner:x.owner,cardId:x.cardId}));
   if(v.jashin.length>=2)out.push(option('replaceJashin',`${name}を残すため手札2枚を選ぶ`));
   if(v.ever.length>=2)out.push(option('replaceEver',name+'を残すためシールド2つを選ぶ（S・トリガー不可）'));
   for(const shield of v.escape)out.push(option('replaceEscape',`${name}を残し、シールド${own.shields.findIndex(x=>x.uid===shield.uid)+1}を${row.escapeTo==='grave'?'墓地へ':'手札へ（S・トリガー不可）'}`,{shield:shield.uid}));
   if(v.yamata)out.push(option('replaceYamata',name+'をかわりにマナゾーンに置く'));
   for(const x of v.ultra)out.push(option('replaceUltra',card(x).name+(effectiveCard(x,s).g40Saver?'をセイバーでかわりに破壊する':'をウルトラ・セイバーでかわりに破壊する'),{uid:x.uid,cardId:x.cardId}));
   for(const x of v.ater)out.push(option('replaceAter',`${card(x).name}をかわりに破壊して残す`,{uid:x.uid,cardId:x.cardId}));
   if(v.mana.length>=3)out.push(option('replaceMana',`${name}を残すためマナ3枚を選ぶ`));
   if(!d.mandatory)out.push(option('allowLeave',`${name}をそのまま移動する`));
  }
  if(d.type==='everShields'){const row=s.leaving.rows.find(x=>x.uid===d.uid&&x.player===p),v=leaveOptions(s,row);out=v.ever.filter(x=>!d.chosen.includes(x.uid)).map(x=>option('everShield','手札に加えるシールド '+(own.shields.indexOf(x)+1)+'（'+(d.chosen.length+1)+'/2）',{shield:x.uid}));out.push(option('cancelEverShields','シールドを選び直す'));}
  if(d.type==='leaveHand'){const row=s.leaving.rows.find(x=>x.uid===d.uid&&x.player===p),v=leaveOptions(s,row);out=v.jashin.filter(x=>!d.chosen.includes(x.uid)).map(x=>option('leaveHand',`${card(x).name}を捨てるカード${d.chosen.length+1}/2枚目に選ぶ`,{uid:x.uid,cardId:x.cardId}));out.push(option('cancelLeaveHand','手札の選択をやり直す'));}
  if(d.type==='leaveMana'){const row=s.leaving.rows.find(x=>x.uid===d.uid&&x.player===p),v=leaveOptions(s,row);out=v.mana.filter(x=>!d.chosen.includes(x.uid)).map(x=>option('leaveMana',`${card(x).name}を保護コスト${d.chosen.length+1}/3枚目に選ぶ`,{uid:x.uid,cardId:x.cardId}));out.push(option('cancelLeaveMana','マナの選択をやり直す'));}
  if(d.type==='deploy'){out=deployCandidates(s,p).map(({origin,inst})=>option('deploy',`${origin==='hand'?'手札':'マナ'}の${card(inst).name}を出す`,{uid:inst.uid,cardId:inst.cardId,origin}));out.push(option('skipDeploy','クリーチャーを出さない'));}
  if(d.type==='deployEvolution'){const c=card(d.source);out=evolutionBases(s,p,c).map(x=>option('deployEvolve',`${card(x).name}の上に${c.name}を重ねて出す`,{uid:d.uid,cardId:c.id,origin:d.origin,baseUid:x.uid}));if(c.neoEvolution)out.unshift(option('deployEvolve',`${c.name}を進化させず出す`,{uid:d.uid,cardId:c.id,origin:d.origin}));out.push(option('cancelDeploy','出すカードを選び直す'));}
  if(d.type==='mugen'){out=own.battle.filter(x=>isCreature(s,x)&&!x.tapped&&!d.chosen.includes(x.uid)&&canMugen(s,p,card(d.source),d.origin,[...d.chosen,x.uid])).map(x=>option('mugenTap',`${card(x).name}をタップする${d.chosen.length+1}/${card(d.source).mugenCrime}体目に選ぶ`,{uid:x.uid,cardId:x.cardId}));out.push(option('cancelMugen','召喚をやめる'));}
  if(d.type==='infinityCount')out=Array.from({length:opp.shields.length+1},(_,n)=>option('infinityCount',`${n}つのシールドをブレイクする`,{n}));
  if(d.type==='infinityShields')out=opp.shields.filter(x=>!d.chosen.includes(x.uid)).map(x=>option('infinityShield',`シールド${opp.shields.findIndex(y=>y.uid===x.uid)+1}を${d.chosen.length+1}/${d.count}つ目に選ぶ`,{shield:x.uid,exLifeHit:!!exLifeShieldInfo(s,1-p,x.uid)?.active}));
  if(d.type==='dddDeclare')out=[option('declareDDD',`${card(d.source).name}のD・D・Dを宣言（支払いは解決時）`,{uid:d.uid,cardId:d.source}),option('skipDDD','このカードは宣言しない')];
  if(d.type==='dddSummon'){
   const c=card(d.source),origin=d.origin||'hand',inst=own[origin].find(x=>x.uid===d.uid&&(d.serial===undefined||(x.zoneSerial||0)===d.serial)),payment=dddPayment(s,p,c),actual=payment&&summonCost(s,p,{...c,...payment});
   if(inst&&payment&&canCastSpell(s,p,c,origin)&&(c.type==='spell'||canEnterCreature(s,p,c,{origin,execution:true}))&&manaPayment(paymentPool(s,p,[],c),{...c,...payment,cost:actual})){out=[option('summonDDD',actual+'マナで'+c.name+(c.type==='spell'?'を唱える':'を進化させず召喚'),{uid:d.uid,cardId:c.id,cost:actual,...(origin==='mana'?{origin}:{})}),...(c.type==='creature'?evolutionBases(s,p,c).map(base=>option('summonDDD',actual+'マナで'+card(base).name+'の上に'+c.name+'を重ねる',{uid:d.uid,baseUid:base.uid,cardId:c.id,cost:actual,...(origin==='mana'?{origin}:{})})):[])];}
   out.push(option('skipDDDSummon','実行せず元のゾーンに残す'));
  }
  if(d.type==='triggerEvolution'){const c=playFaces(card(d.source))[d.face];out=evolutionBases(s,p,c).map(base=>option('triggerEvolve',card(base).name+'の上にS・トリガーで召喚',{uid:d.uid,cardId:d.source,baseUid:base.uid}));if(c.neoEvolution)out.unshift(option('triggerEvolve','進化させずにS・トリガーで召喚',{uid:d.uid,cardId:d.source}));}
  if(d.type==='evolution'){const c=card(d.source);out=evolutionBases(s,p,c).filter(base=>base.uid!==d.uid).map(base=>option('evolve',`${card(base).name}の上に${c.name}を重ねる`,{uid:d.uid,baseUid:base.uid,cardId:c.id}));if(c.neoEvolution)out.unshift(option('evolve',`${c.name}を進化させず召喚`,{uid:d.uid,cardId:c.id}));out.push(option('cancelEvolution','召喚をやめる'));}
  if(d.type==='revealEvolution'){const c=card(d.source);out=evolutionBases(s,p,c).map(base=>option('revealEvolve',`${card(base).name}の上に公開した${c.name}を重ねる`,{uid:d.uid,baseUid:base.uid,cardId:c.id}));if(c.neoEvolution)out.unshift(option('revealEvolve',`公開した${c.name}を進化させず出す`,{uid:d.uid,cardId:c.id}));}
  if(d.type==='judgeCost')out=playFaces(card(d.source)).map((c,face)=>option('judgeCost',`${c.name}のコスト${c.cost}を参照`,{face,cost:c.cost,cardId:d.source}));
  if(d.type==='judgeContinue')out=[option('judgeAgain',`もう一度ガチンコ・ジャッジ（現在${s.judge.wins}勝）`),option('stopJudge',`${s.judge.wins}勝で中止し、ブレイクへ進む`)];
  if(d.type==='judgeBreak')out=opp.shields.map((x,i)=>{const ex=!!exLifeShieldInfo(s,1-p,x.uid)?.active;return option('judgeBreak',`効果でシールド${i+1}${ex?'（EXライフ）':''}を1つブレイク（残り${s.judge.remaining}回）`,{shield:x.uid,exLifeHit:ex});});
  if(d.type==='shieldGuard'){
   const b=s.shieldBreak,remaining=b.uids.filter(uid=>!b.protections.some(x=>x.shield===uid));
   out=shieldGuardChoices(s).flatMap(c=>remaining.map(shield=>{const i=own.shields.findIndex(x=>x.uid===shield)+1,ex=!!exLifeShieldInfo(s,p,shield)?.active;return option('guardShield',`${card(c).name}の下の${layers(c).length-1}枚をすべて墓地へ置き、シールド${i}${ex?'（EXライフ）':''}を残す`,{uid:c.uid,cardId:c.cardId,shield,exLifeHit:ex});}));
   out.push(option('finishShieldGuards',b.protections.length?'選択を確定し、残りはブレイクする':'置き換えずにブレイクする'));
  }
  if(d.type==='mirageDeclare')out=[option('declareGaia','真気楼の使用を宣言する',{uid:d.uid,cardId:d.source}),option('skipGaiaDeclare','このカードは宣言しない')];
  if(d.type==='endAbilityOrder')out=s.endStep.declared.map(uid=>option('orderEndAbility',card(own.hand.find(x=>x.uid===uid)).name+'を先に解決',{uid,cardId:own.hand.find(x=>x.uid===uid).cardId}));
  if(d.type==='gaiaDeclare')out=[option('declareGaia','ガイアッシュの使用を宣言する',{uid:d.uid,cardId:d.source}),option('skipGaiaDeclare','このカードは宣言しない')];
  if(d.type==='gaiaSummon')out=[option('summonGaia','ガイアッシュをコストを支払わずに召喚する',{uid:d.uid,cardId:d.source,origin:'hand'}),option('skipGaiaSummon','召喚せず手札に残す')];
  if(d.type==='block'){const a=opp.battle.find(x=>x.uid===s.attack.attacker);out=[option('noBlock','ブロックしない')];if(a&&!effectiveCard(a,s).attackUnredirectable&&!card(a).unblockable&&!unblockedNow(s,a))for(const c of own.battle)if(effectiveCard(c,s).type==='creature'&&effectiveCard(c,s).blocker&&(!effectiveCard(a,s).flying||effectiveCard(c,s).flying)&&!c.tapped&&!extra.locked(s,p,c,'block'))out.push(option('block',`${card(c).name}でブロック`,{uid:c.uid}));}
  if(d.type==='block'&&!opp.battle.some(x=>x.uid===s.attack.attacker&&effectiveCard(x,s).attackUnredirectable)&&s.attack.target!=='player'&&own.battle.some(x=>x.uid===s.attack.target&&isCreature(s,x)))for(const x of own.battle)if(x.uid!==s.attack.target&&!x.tapped&&isCreature(s,x)&&!effectiveCard(x,s).cannotBeAttacked&&effectiveCard(x,s).guardman)out.push(option('guardman',card(x).name+'でガードマン（ブロックではありません）',{uid:x.uid,cardId:x.cardId}));
  if(d.type==='block'&&defenseOptions(s,p).length>1)out.push(option('defendMany','複数のブロッカー・ガードマンを選ぶ'));
  if(d.type==='breakChoice')out=combinations(opp.shields.map((c,i)=>({uid:c.uid,index:i+1,ex:!!exLifeShieldInfo(s,1-p,c.uid)?.active})),d.count).map(rows=>option('breakShields',`シールド${rows.map(r=>r.index+(r.ex?'（EXライフ）':'')).join('・')}をブレイク`,{shields:rows.map(r=>r.uid),exLifeHits:rows.filter(r=>r.ex).length}));
  if(d.type==='triggerOrder')out=s.triggers.declared.filter(uid=>canUseTrigger(s,p,playFaces(card(own.hand.find(c=>c.uid===uid)))[s.triggers.faceByUid?.[uid]||0],uid)).map(uid=>{const c=own.hand.find(c=>c.uid===uid);return option('orderTrigger',`${playFaces(card(c))[s.triggers.faceByUid?.[uid]||0].name}を先に使う`,{uid,cardId:c.cardId});});
  if(d.type==='triggerOrder')out.push(...(s.triggers.gsDeclared||[]).map(uid=>option('orderGS','G・ストライクを先に使う',{uid,cardId:own.hand.find(x=>x.uid===uid).cardId})));
  if(d.type==='entryOrder')out=effectOptions(s.triggers.entries.filter(e=>e.player===p),'orderEntry');
  if(d.type==='effectOrder')out=effectOptions(s.pendingEffects.filter(e=>e.player===p),'orderEffect');
  if(d.type==='dragonTap'){out=opp.battle.filter(x=>isCreature(s,x)).map(x=>option('dragonTap',`${card(x).name}をタップ${x.tapped?'（タップ中）':''}`,{uid:x.uid,cardId:x.cardId}));out.push(option('skipDragonTap','今回はタップせず、次の登場時に使えるようにする'));}
  if(d.type==='trigger')out=[...(s.triggers.eligibleFaces?.[d.uid]||[0]).map(face=>option('useTrigger',`${playFaces(card(d.source))[face].name}を使う`,{uid:d.uid,cardId:d.source,...(card(d.source).spellFace?{face}:{})})),option('skipTrigger','使わず手札に加える')];
  if(d.type==='fight'){out=own.battle.some(x=>x.uid===d.uid)?opp.battle.filter(x=>isCreature(s,x)).map(x=>option('fight',`${card(x).name}とバトル（相手のパワー${power(x,x.uid===s.attack?.attacker,s)}）`,{uid:d.uid,target:x.uid,cardId:x.cardId})):[];out.push(option('skipFight','バトルさせない'));}
  if(d.type==='battleWinOrder')out=s.battleResolution.wins.filter(e=>e.player===p).map((e,i)=>option('battleWinOrder',`${card(e.source).name} ${i+1}体目の勝利時能力を先に解決`,{uid:e.uid,cardId:e.source}));
  if(d.type==='draw')out=Array.from({length:d.max+1},(_,n)=>option('draw',n?`${n}枚引く`:'引かない',{n}));
  if(d.type==='optionalRamp')out=[option('useRamp','4枚をマナに置き、2枚を山札に戻す'),option('skipRamp','マナに置かない')];
  if(d.type==='manaTop')out=own.mana.filter(x=>!d.chosen.includes(x.uid)).map(x=>option('manaTop',`山札の上から${d.chosen.length+1}枚目に${card(x).name}を置く（${x.tapped?'タップ中':'アンタップ'}）`,{uid:x.uid,cardId:x.cardId}));
  if(d.type==='search'){out=[option('search','選ばずにシャッフル',{uid:null})];for(const c of own.deck.slice(0,lookCount(s,p,own.deck.length)))if(isCreature(s,c)&&!out.some(a=>a.cardId===c.cardId))out.push(option('search',`${card(c).name}を手札へ`,{uid:c.uid,cardId:c.cardId}));}
  if(d.type==='untap')out=[option('endUntap','アンタップする',{yes:true}),option('endUntap','アンタップしない',{yes:false})];
  if(d.type==='effect'){
   if(d.effect==='tapTwo'){out=[option('effect','選ばない',{targets:[]})];for(let i=0;i<d.targets.length;i++){const a=d.targets[i];out.push(option('effect',`${nameOf(s,a)}をタップ`,{targets:[a]}));for(let j=i+1;j<d.targets.length;j++){const b=d.targets[j];out.push(option('effect',`${nameOf(s,a)}・${nameOf(s,b)}をタップ`,{targets:[a,b]}));}}}
   else out=d.targets.map(t=>option('effect',`${nameOf(s,t)}を選ぶ`,{targets:[t]}));
   if(d.optional)out.push(option('skipEffect','効果を使わない'));
  }
 }else if(s.phase==='charge'){out=own.hand.map(c=>option('charge',`${card(c).name}をマナへ`,{uid:c.uid,cardId:c.cardId}));out.push(option('skipCharge','マナを置かずに進む'));}
 else if(s.phase==='main'){
  out=own.hand.flatMap(inst=>playFaces(card(inst)).flatMap((c,face)=>canCastSpell(s,p,c)&&(c.type!=='creature'||canEnterCreature(s,p,c))&&validMana(s,p,c)&&(!c.evolution||evolutionBases(s,p,c).length)?[option('play',`${c.name}を${c.type==='creature'?'召喚':c.type==='gear'?'ジェネレート':'使用'}`,{uid:inst.uid,cardId:inst.cardId,cost:summonCost(s,p,c),...(freeSpell(s,p,c)?{freeSpell:'アカシック3'}:{}),...(card(inst).spellFace?{face}:{})})]:[]));out.push(...own.mana.filter(x=>card(x).manaSummon&&canEnterCreature(s,p,card(x),{origin:'mana',execution:true})&&validMana(s,p,{...card(x),summonOrigin:'mana'})&&(!card(x).evolution||evolutionBases(s,p,card(x)).length)).map(x=>option('play',`マナの${card(x).name}を召喚`,{uid:x.uid,cardId:x.cardId,cost:summonCost(s,p,{...card(x),summonOrigin:'mana'}),origin:'mana'})));
  for(const origin of ['hand','grave'])out.push(...own[origin].filter(x=>canMugen(s,p,card(x),origin)).map(x=>option('mugenStart',`${origin==='hand'?'手札':'墓地'}の${card(x).name}をムゲンクライム${card(x).mugenCrime}で${card(x).type==='spell'?'唱える':'召喚'}`,{uid:x.uid,cardId:x.cardId,origin,cost:Math.max(civilizations(card(x)).length,summonCost(s,p,{...card(x),cost:card(x).mugenCrime,printedCost:card(x).cost,summonOrigin:origin}))})));
  out.push(...extra.mainActions(s,p));out.push(option('toAttack','攻撃へ進む'));
 }else if(s.phase==='attack'){
  for(const c of own.battle.filter(c=>canAttack(s,p,c))){if(!effectiveCard(c,s).noPlayerAttack&&canAttackPlayer(s,c)){if(opp.shields.length&&effectiveCard(c,s).noShieldBreak){}else if(effectiveCard(c,s).gBreaker)out.push(option('attack',`${card(c).name} → 相手（G・ブレイカー）`,{uid:c.uid,target:'player'}));else if(opp.shields.length&&(effectiveCard(c,s).breaker||effectiveCard(c,s).extraBreak))out.push(option('attack',`${card(c).name} → 相手（${effectiveCard(c,s).worldBreaker?'ワールド・ブレイカー':effectiveCard(c,s).breaker==='∞'?'∞ブレイカー':Math.min(numeric(effectiveCard(c,s).breaker||1)+(effectiveCard(c,s).extraBreak||0),opp.shields.length)+'枚ブレイク'}）`,{uid:c.uid,target:'player'}));else if(opp.shields.length)for(let i=0;i<opp.shields.length;i++){const ex=!!exLifeShieldInfo(s,1-p,opp.shields[i].uid)?.active;out.push(option('attack',`${card(c).name} → シールド${i+1}${ex?'（EXライフ）':''}`,{uid:c.uid,target:'player',shield:opp.shields[i].uid,exLifeHit:ex}));}else out.push(option('attack',`${card(c).name}でダイレクトアタック`,{uid:c.uid,target:'player'}));}
   if(!effectiveCard(c,s).noCreatureAttack&&(c.entered<s.turn||effectiveCard(c,s).speedAttacker||isEvolution(c)||effectiveCard(c,s).machFighter))for(const target of opp.battle.filter(x=>isCreature(s,x)&&!effectiveCard(x,s).cannotBeAttacked&&extra.six.fifteen.canAttackTarget(s,c,x)&&(!effectiveCard(x,s).flying||effectiveCard(c,s).flying)&&(x.tapped||effectiveCard(c,s).attackUntapped||(c.entered===s.turn&&effectiveCard(c,s).machFighter))&&(!effectiveCard(x,s).justDiver||!x.justDiverActive||extra.creatures(s,p).some(y=>effectiveCard(y,s).ignoreAttackLocks))))out.push(option('attack',`${card(c).name} → ${card(target).name}`,{uid:c.uid,target:target.uid}));
  }
  if(!out.some(a=>a.kind==='attack'&&effectiveCard(own.battle.find(c=>c.uid===a.uid),s).mustAttack))out.push(option('endTurn','ターン終了'));
 }
 out=out.filter(a=>(!['fight','dragonTap'].includes(a.kind)||extra.targetable(s,p,1-p,s.players[1-p].battle.find(x=>x.uid===(a.target||a.uid))))&&(!a.targets||a.targets.every(t=>extra.targetable(s,p,t.player,s.players[t.player].battle.find(x=>layers(x).some(y=>y.uid===t.uid))))));
 out=extra.utilityWater.variants(s,p,extra.history.variants(s,p,extra.viride.variants(s,p,extra.variants(s,p,extra.forceActions(s,p,out))))).filter(a=>!['play','mugenStart'].includes(a.kind)||extra.originAllowed(s,p,a.origin||'hand'));
 return out.map((a,i)=>({...a,id:i,player:p}));
}
function nameOf(s,t){const seal=(s.players[t.player].seals||[]).find(x=>x.uid===t.uid);if(seal)return '裏向きの封印';const top=s.players[t.player].battle.find(x=>layers(x).some(y=>y.uid===t.uid)),x=top&&layers(top).find(x=>x.uid===t.uid);return card(x).name+(top.uid!==x.uid?'（'+card(top).name+'の下）':'');}
const evolutionFace=a=>playFaces(card(a.cardId))[a.face||0];
export function step(s,action,{manualMana=false}={}){return withEffect(s,s.decision?.type==='effect'?s.decision.player:null,()=>{
 if(s.decision?.type==='drawReplacement'){
  const d=s.decision,a=(typeof action==='number'?getLegalActions(s)[action]:getLegalActions(s).find(x=>JSON.stringify(x)===JSON.stringify(action)));if(!a)throw Error('選択できない行動です');
  const choices=structuredClone(d.drawChoices);choices[d.drawIndex]=a.kind==='replaceDraw'?{replace:a.replace}:{...choices[d.drawIndex],discard:a.uid};
  return executeManaMove(s,d.action,d.baseDecision,d.payments,d.randomTape,choices,d.manualMana);
 }
 if(s.decision?.type==='manaPayment'){
  const d=s.decision,opts=getLegalActions(s),a=typeof action==='number'?opts[action]:opts.find(x=>JSON.stringify(x)===JSON.stringify(action));if(!a)throw Error('選択できない行動です');
  if(a.kind==='selectMana'){d.selected=d.selected.includes(a.uid)?d.selected.filter(x=>x!==a.uid):[...d.selected,a.uid];return;}
  if(a.kind==='cancelMana'){s.decision=d.baseDecision;return;}
  if(a.kind==='confirmMana')return executeManaMove(s,d.action,d.baseDecision,[...d.payments,[...d.selected]],d.randomTape,d.drawChoices||[],d.manualMana??true);
 }
 if(!manualMana&&physicalCards(s).some(x=>card(x)?.g45Babylonia))return executeManaMove(s,typeof action==='number'?getLegalActions(s)[action]:action,s.decision,[],[],[],false);
 if(manualMana)return executeManaMove(s,typeof action==='number'?getLegalActions(s)[action]:action);
 return stepCore(s,action);
 });}
function stepCore(s,action){
 const opts=getLegalActions(s);let a=typeof action==='number'?opts[action]:opts.find(x=>JSON.stringify(x)===JSON.stringify(action));
 // Only the declared number may differ from a legal template; all other fields stay validated.
 if(!a&&s.decision?.task?.op==='g9Number'&&(action?.number==='∞'||Number.isSafeInteger(action?.number)&&action.number>=0)){const template=opts.find(x=>JSON.stringify({...x,number:action.number})===JSON.stringify(action));if(template)a={...template,number:action.number};}
 if(!a)throw Error('選択できない行動です');
 const manaBefore=manaSnapshot(s),graveBefore=s.players.map(p=>p.grave.map(x=>x.uid));const p=a.player,d=s.decision;s.actions++;extra.combat.selected(s,p,a,d);extra.original.selected(s,p,a,d);extra.phoenix.selected(s,p,a,d);extra.six.fifteen.selected(s,p,a,d);
 if(a.kind==='godLeave'){s.leaving.rows.find(r=>r.player===p&&r.uid===d.uid).godPart=a.uid;s.decision=null;}
 if(a.kind==='extended')extra.step(s,a,d);
 if(a.kind==='g47Replace'){const row=s.leaving.rows.find(x=>x.uid===d.uid&&x.player===(d.owner??p));s.decision=null;extra.seed.beginReplacement(s,row,a.choice);}
 if(a.kind==='g47Decline'){const row=s.leaving.rows.find(x=>x.uid===d.uid&&x.player===d.owner);row.g47StratoDeclined=true;if(d.ownerPassed)row.plan={kind:'leave'};s.decision=null;}
 if(a.kind==='g49Replace'){s.leaving.rows.find(x=>x.uid===d.uid&&x.player===p).plan={kind:'g49',...a.choice};s.decision=null;}
 if(a.kind==='pandora')extra.pandora(s,p,a);
 if(a.kind==='crossGear')extra.crossAction(s,p,a);
 if(a.kind==='hyper')extra.hyper(s,p,a.uid);
 if(['replaceEx','replaceGneo','replaceStar','replaceEscape','allowLeave'].includes(a.kind)){const row=s.leaving.rows.find(x=>x.uid===d.uid&&x.player===p);row.plan=a.kind==='replaceEx'?{kind:'ex',shield:a.shield}:a.kind==='replaceGneo'?{kind:'gneo'}:a.kind==='replaceStar'?{kind:'star'}:a.kind==='replaceEscape'?{kind:'escape',shield:a.shield}:{kind:'leave'};s.decision=null;}
 if(a.kind==='replaceOmega'||a.kind==='replaceMuku'){s.leaving.rows.find(x=>x.uid===d.uid&&x.player===p).plan=a.kind==='replaceOmega'?{kind:'omega'}:{kind:'g34Stay',key:a.key};s.decision=null;}
 if(a.kind==='replaceEver')s.decision={type:'everShields',player:p,uid:d.uid,chosen:[],mandatory:d.mandatory};
 if(a.kind==='everShield'){d.chosen.push(a.shield);if(d.chosen.length===2){s.leaving.rows.find(x=>x.uid===d.uid&&x.player===p).plan={kind:'ever',shields:d.chosen};s.decision=null;}}
 if(a.kind==='cancelEverShields')s.decision={type:'leaveReplace',player:p,uid:d.uid,mandatory:d.mandatory};
 if(a.kind==='replaceJashin')s.decision={type:'leaveHand',player:p,uid:d.uid,chosen:[]};
 if(a.kind==='leaveHand'){d.chosen.push(a.uid);if(d.chosen.length===2){s.leaving.rows.find(x=>x.uid===d.uid&&x.player===p).plan={kind:'jashin',cards:d.chosen};s.decision=null;}}
 if(a.kind==='cancelLeaveHand')s.decision={type:'leaveReplace',player:p,uid:d.uid};
 if(a.kind==='replaceShieldFace'){s.leaving.rows.find(x=>x.uid===d.uid&&x.player===p).plan={kind:'g33',uid:a.shieldCard};s.decision=null;}
 if(a.kind==='replaceSavak'){s.leaving.rows.find(x=>x.uid===d.uid&&x.player===p).plan={kind:'savak',uid:a.shieldCard,owner:a.owner};s.decision=null;}
 if(a.kind==='replaceHawk'){s.leaving.rows.find(r=>r.uid===d.uid&&r.player===p).plan={kind:'hawk'};s.decision=null;advanceLeaving(s);}
 if(a.kind==='replaceNingyo'){s.leaving.rows.find(x=>x.uid===d.uid&&x.player===p).plan={kind:'ningyo'};s.decision=null;}
 if(a.kind==='replaceUra')extra.beginUra(s,p,d.uid,'leave');
 if(a.kind==='replaceOni')extra.beginOni(s,p,d.uid,'leave');
 if(a.kind==='replaceYamata'){s.leaving.rows.find(x=>x.uid===d.uid&&x.player===p).plan={kind:'yamata'};s.decision=null;}
 if(a.kind==='replaceUltra'){s.leaving.rows.find(x=>x.uid===d.uid&&x.player===p).plan={kind:'ultra',uid:a.uid};s.decision=null;}
 if(a.kind==='replaceAter'){s.leaving.rows.find(x=>x.uid===d.uid&&x.player===p).plan={kind:'ater',uid:a.uid};s.decision=null;}
 if(a.kind==='replaceMana')s.decision={type:'leaveMana',player:p,uid:d.uid,chosen:[],mandatory:d.mandatory};
 if(a.kind==='leaveMana'){d.chosen.push(a.uid);if(d.chosen.length===3){s.leaving.rows.find(x=>x.uid===d.uid&&x.player===p).plan={kind:'mana',mana:[...d.chosen]};s.decision=null;}}
 if(a.kind==='cancelLeaveMana')s.decision={type:'leaveReplace',player:p,uid:d.uid,mandatory:d.mandatory};
 if(a.kind==='deploy'){const c=card(a.cardId);if(c.evolution||c.neoEvolution)s.decision={type:'deployEvolution',player:p,uid:a.uid,source:c.id,origin:a.origin};else{s.decision=null;deployCreature(s,p,a.uid,a.origin);}}
 if(a.kind==='deployEvolve'){s.decision=null;deployCreature(s,p,a.uid,a.origin,a.baseUid);}
 if(a.kind==='cancelDeploy')s.decision={type:'deploy',player:p};
 if(a.kind==='skipDeploy')s.decision=null;
 if(a.kind==='mugenStart')s.decision={type:'mugen',player:p,uid:a.uid,source:a.cardId,origin:a.origin,chosen:[]};
 if(a.kind==='mugenTap'){d.chosen.push(a.uid);if(d.chosen.length===card(d.source).mugenCrime){for(const uid of d.chosen)tapCard(s,p,s.players[p].battle.find(x=>x.uid===uid));s.decision=null;log(s,p,'mugenCrime',`${card(d.source).name}をムゲンクライム${card(d.source).mugenCrime}で召喚`,{cardId:d.source});playCard(s,p,d.uid,false,null,0,card(d.source).mugenCrime,d.origin);}}
 if(a.kind==='cancelMugen')s.decision=null;
 if(a.kind==='infinityCount'){if(!a.n)s.breakContext=null;s.decision=a.n?{type:'infinityShields',player:p,defender:d.defender,count:a.n,chosen:[]}:null;}
 if(a.kind==='infinityShield'){d.chosen.push(a.shield);if(d.chosen.length===d.count){s.decision=null;breakShields(s,d.defender,d.chosen);}}
 if(a.kind==='charge'){const c=remove(s.players[p].hand,a.uid);c.tapped=manaCivilizations(card(c)).length>1;addZone(s,s.players[p],'mana',c);extra.handMana(s,p,c);s.metrics[p].charges++;s.phase='main';log(s,p,'charge',`${card(c).name}をマナへ`,{cardId:c.cardId});}
 if(a.kind==='skipCharge'){s.phase='main';log(s,p,'skip','マナチャージを省略');}
 if(a.kind==='play'){if(evolutionFace(a).g45MDeck&&!a.alternative)playCard(s,p,a.uid,!!a.freeSummon,null,a.face||0,null,a.origin||'hand',a.freeSummon||'S・トリガー',!!a.ownGraveCast,a.manaPermit,a.snowReducers,null,a.magicReducers,a.g7Payment,a.g18Reducers??null,a.g26Reducers??null,a.g42Reduction??null);else if(extra.phoenix.complex(s,p,evolutionFace(a))&&!a.alternative)playCard(s,p,a.uid,!!a.freeSummon,null,a.face||0,null,a.origin||'hand',a.freeSummon||'S・トリガー',!!a.ownGraveCast,a.manaPermit,a.snowReducers,null,a.magicReducers,a.g7Payment,a.g18Reducers??null,a.g26Reducers??null,a.g42Reduction??null);else if(a.freeSummon&&(evolutionFace(a).evolution||evolutionFace(a).neoEvolution))s.decision={type:'evolution',player:p,uid:a.uid,source:a.cardId,playAction:a};else if(a.freeSummon)playCard(s,p,a.uid,true,null,a.face||0,null,a.origin||'hand',a.freeSummon,false,a.manaPermit,a.snowReducers,null,a.magicReducers,a.g7Payment,a.g18Reducers??null,a.g26Reducers??null,a.g42Reduction??null);else if(a.alternative)extra.beginAlternative(s,p,a);else if(evolutionFace(a).evolution||evolutionFace(a).neoEvolution)s.decision={type:'evolution',player:p,uid:a.uid,source:a.cardId,playAction:a};else playCard(s,p,a.uid,false,null,a.face||0,null,a.origin||'hand','S・トリガー',!!a.ownGraveCast,a.manaPermit,a.snowReducers,null,a.magicReducers,a.g7Payment,a.g18Reducers??null,a.g26Reducers??null,a.g42Reduction??null);}
 if(a.kind==='evolve'){s.decision=null;playCard(s,p,a.uid,!!d.playAction?.freeSummon,a.baseUid,d.playAction?.face||0,null,d.playAction?.origin||'hand',d.playAction?.freeSummon||'S・トリガー',!!d.playAction?.ownGraveCast,d.playAction?.manaPermit,d.playAction?.snowReducers,null,d.playAction?.magicReducers,d.playAction?.g7Payment,d.playAction?.g18Reducers??null,d.playAction?.g26Reducers??null,d.playAction?.g42Reduction??null);}
 if(a.kind==='revealEvolve'){s.decision=null;enterRevealed(s,p,a.uid,a.baseUid);}
 if(a.kind==='cancelEvolution')s.decision=null;
 if(a.kind==='toAttack'){s.phase='attack';log(s,p,'phase','攻撃ステップへ');}
 if(a.kind==='attack'){
  recordCombat(s,p);const c=s.players[p].battle.find(x=>x.uid===a.uid),data=effectiveCard(c,s),stopped=selfTriggersStopped(s,p);s.attack={attacker:a.uid,target:a.target,shield:a.shield,stage:'effects'};if(power(c,true,s)>=12000)(s.g16BigAttack??={})[p]=s.turn;tapCard(s,p,c);extra.attackStart(s,p,c);extra.attackTriggers(s,p,c);log(s,p,'attack',a.label,{cardId:c.cardId});
  s.attackDeclarations=[...s.players[p].hand,...s.players[p].mana.filter(x=>card(x).ddd?.fromMana)].filter(x=>dddPayment(s,p,card(x))).map(x=>x.uid);
  for(const effect of ['attackDragonReveal','attackJudge','deployMulticolor7','attackExecuteHand'])if(data[effect]||(effect==='deployMulticolor7'&&data.effect===effect)){if(stopped)log(s,p,'triggerPrevented',`${data.name}自身の攻撃時能力はGGによりトリガーしない`,{cardId:data.id});else enqueueEffect(s,p,{uid:c.uid,source:data.id,effect:effect==='deployMulticolor7'?'deploy':effect});}
 }
 if(a.kind==='declareDDD'||a.kind==='skipDDD'){s.decision=null;s.attackDeclarations.shift();if(a.kind==='declareDDD'){enqueueEffect(s,p,{uid:a.uid,source:a.cardId,effect:'ddd',origin:d.origin||'hand',serial:d.serial});log(s,p,'dddDeclare',`${card(a.cardId).name}のD・D・Dを宣言`,{cardId:a.cardId});}}
 if(a.kind==='summonDDD'){s.decision=null;log(s,p,'dddSummon',`${card(a.cardId).name}のD・D・Dを解決（${a.cost}マナ）`,{cardId:a.cardId});playCard(s,p,a.uid,false,a.baseUid||null,0,dddPayment(s,p,card(a.cardId)),a.origin||'hand','D・D・D');}
 if(a.kind==='skipDDDSummon'){s.decision=null;log(s,p,'skip',`${card(d.source).name}のD・D・Dで実行しない`,{cardId:d.source});}
 if(a.kind==='defendMany'){s.decision=null;extra.put(s,extra.task('g16DefenseSelect',p,s.players[p].battle.find(x=>x.uid===defenseOptions(s,p)[0].uid).cardId,{selected:[]}));}
 if(a.kind==='guardman'){s.decision=null;const x=s.players[p].battle.find(x=>x.uid===a.uid);tapCard(s,p,x);s.attack.target=x.uid;log(s,p,'guardman',card(x).name+'へ攻撃先を変更',{cardId:x.cardId});resolveAttack(s,null);}
 if(a.kind==='block'||a.kind==='noBlock'){s.decision=null;resolveAttack(s,a.kind==='block'?a.uid:null);}
 if(a.kind==='useTrigger'){s.decision=null;s.triggers.undeclared.shift();s.triggers.declared.push(a.uid);(s.triggers.faceByUid??={})[a.uid]=a.face||0;log(s,p,'declare',`${playFaces(card(d.source))[a.face||0].name}のS・トリガーを宣言`,{cardId:d.source});}
 if(a.kind==='skipTrigger'){s.decision=null;s.triggers.undeclared.shift();log(s,p,'skip','S・トリガーを使わない');}
 if(a.kind==='breakShields'){s.decision=null;breakShields(s,d.defender,a.shields);}
 if(a.kind==='judgeCost'){s.judge.costs[p]=a.cost;s.decision=null;advanceJudgeCosts(s);}
 if(a.kind==='judgeAgain'){s.decision=null;judgeRound(s);}
 if(a.kind==='stopJudge')beginJudgeBreaks(s);
 if(a.kind==='judgeBreak'){s.decision=null;s.judge.remaining--;breakShields(s,1-p,[a.shield]);}
 if(a.kind==='guardShield'){const b=s.shieldBreak;b.protections.push({uid:a.uid,shield:a.shield});if(b.protections.length===b.uids.length||!shieldGuardChoices(s).length)finishShieldGuards(s);}
 if(a.kind==='finishShieldGuards')finishShieldGuards(s);
 if(a.kind==='orderGS'){s.decision=null;s.triggers.gsDeclared.splice(s.triggers.gsDeclared.indexOf(a.uid),1);extra.put(s,extra.task('gsTarget',p,a.cardId));}
 if(a.kind==='orderTrigger'){s.decision=null;s.triggers.declared.splice(s.triggers.declared.indexOf(a.uid),1);executeTrigger(s,p,a.uid,s.triggers.faceByUid?.[a.uid]||0);}
 if(a.kind==='triggerEvolve'){s.decision=null;playCard(s,p,a.uid,true,a.baseUid||null,d.face);}
 if(a.kind==='orderEntry'||a.kind==='orderEffect'){s.decision=null;const queue=a.kind==='orderEntry'?s.triggers.entries:s.pendingEffects,i=queue.findIndex(e=>e.effectId===a.effectId),[entry]=queue.splice(i,1);resolveEntry(s,entry);}
 if(a.kind==='dragonTap'){s.decision=null;tapCard(s,1-p,s.players[1-p].battle.find(x=>x.uid===a.uid));(s.once??={})[d.key]=s.turn;log(s,p,'dragonTap',`${card(d.source).name}：${card(a.cardId).name}をタップ（このターンの1回を使用）`,{cardId:d.source});}
 if(a.kind==='skipDragonTap'){s.decision=null;log(s,p,'skip',`${card(d.source).name}の任意タップを見送る（このターンは未使用）`,{cardId:d.source});}
 if(a.kind==='fight'){s.decision=null;const source=s.players[p].battle.find(x=>x.uid===a.uid),target=s.players[1-p].battle.find(x=>x.uid===a.target);if(source&&target){log(s,p,'fight',`${card(source).name}の効果で${card(target).name}とバトル`,{cardId:source.cardId});battle(s,p,source,1-p,target,s.attack?.attacker);}}
 if(a.kind==='skipFight'){s.decision=null;log(s,p,'skip',`${card(d.source).name}の登場時バトルを使わない`,{cardId:d.source});}
 if(a.kind==='battleWinOrder'){const i=s.battleResolution.wins.findIndex(e=>e.uid===a.uid),[e]=s.battleResolution.wins.splice(i,1);s.decision=null;resolveBattleWin(s,e);}
 if(a.kind==='draw'){s.decision=null;if(d.reason==='battleWin')log(s,p,'battleWin',`${card(d.source).name}：バトル勝利時のドローを${a.n?'使う':'使わない'}`,{cardId:d.source});if(a.n)draw(s,p,a.n);else log(s,p,'skip','任意のドローを省略');}
 if(a.kind==='useRamp'){s.decision=null;const source=card(d.source);rampTapped(s,p,source,4);chooseManaTop(s,p,source,2);}
 if(a.kind==='skipRamp'){s.decision=null;log(s,p,'skip',`${card(d.source).name}のマナ加速を使わない`,{cardId:d.source});}
 if(a.kind==='manaTop'){
  d.chosen.push(a.uid);
  if(d.chosen.length===d.count){const returned=d.chosen.map(uid=>remove(s.players[p].mana,uid));for(const x of returned)clearBattleState(x,'deck');s.players[p].deck.unshift(...returned);s.decision=null;log(s,p,'manaTop',`${card(d.source).name}でマナ${returned.length}枚を山札の上へ（順序は非公開）`,{cardId:d.source});}
 }
 if(a.kind==='skipEffect'){s.decision=null;log(s,p,'skip','任意の効果を使わない');}
 if(a.kind==='search'){s.decision=null;if(a.uid){const c=remove(s.players[p].deck,a.uid);s.players[p].hand.push(c);log(s,p,'search',`${card(c).name}を探して手札へ`,{cardId:c.cardId});}shuffleLibrary(s,p);deckCheck(s,p);}
 if(a.kind==='effect'){
  s.decision=null;const moves=[];
  if(d.effect==='destroyBattleCard3'){const t=a.targets[0];if((s.players[t.player].seals||[]).some(x=>x.uid===t.uid)){moveSeal(s,t.player,t.uid,'grave');}const top=s.players[t.player].battle.find(x=>x.uid===t.topUid);if(top){if(t.uid===top.uid)moveCreatures(s,[{player:t.player,uid:top.uid,to:'grave',destroy:false,cardOnly:true}]);else{const parent=layers(top).find(x=>x.under?.some(y=>y.uid===t.uid)),index=parent?.under.findIndex(x=>x.uid===t.uid);if(parent&&index>=0){const x=parent.under[index];recordLastPower(s,t.player,top,[x]);parent.under.splice(index,1,...(x.under||[]));clearBattleState(x);addZone(s,s.players[t.player],'grave',x);log(s,p,'cardLeave',`${card(d.source).spellFace.name}で進化元の${card(x).name}を墓地へ`,{cardId:d.source});}}}}

  for(const t of d.effect==='destroyBattleCard3'?[]:a.targets){const c=s.players[t.player].battle.find(x=>x.uid===t.uid);if(!c)continue;
   if(['tap','tapTwo','shieldEntryTapLock'].includes(d.effect))tapCard(s,t.player,c);
   if(d.effect==='shieldEntryTapLock')c.tapLocks=[...new Set([...(c.tapLocks||[]),p])];
   if(d.effect==='buff'){c.buff+=2000;const source=card(d.source);if(source.type==='spell')(c.buffSources??=[]).push({amount:2000,cost:source.cost,spellSource:source.id});}
   if(d.effect==='unblock'){c.unblocked=true;const source=card(d.source);if(source.type==='spell')c.unblockSpellCost=source.cost;}
   if(['bounce','bounceOptional','bounceSmall','bounceBlockers','destroy','destroySmall','destroyUntapped','destroyWeakerLimitNextTurn','manaRemoval'].includes(d.effect))moves.push({player:t.player,uid:t.uid,to:['bounce','bounceOptional','bounceSmall','bounceBlockers'].includes(d.effect)?'hand':d.effect==='manaRemoval'?'mana':'grave'});
   log(s,p,'effect',`${card(d.source).name}：${card(c).name}を選択`,{cardId:d.source});
  }
  if(moves.length)moveCreatures(s,moves,d.limitAfter?{kind:'limit',player:p,source:d.source}:null);else if(d.limitAfter)limitNextTurn(s,p,card(d.source));
 }
 if(a.kind==='orderEndAbility'){const ids=s.endStep.declared;s.endStep.declared=ids.filter(x=>x!==a.uid);const x=s.players[p].hand.find(x=>x.uid===a.uid);s.decision=null;if(card(x).endMirage)extra.put(s,extra.task('mirageCast',p,x.cardId,{uid:a.uid}));else if(s.noManaUse?.[s.active]&&!s.players[p].battle.some(x=>card(x).gaia)&&canEnterCreature(s,p,card(x)))s.decision={type:'gaiaSummon',player:p,uid:x.uid,source:x.cardId};}
 if(a.kind==='declareGaia'||a.kind==='skipGaiaDeclare'){s.endStep.remaining.shift();if(a.kind==='declareGaia'){s.endStep.declared.push(d.uid);log(s,p,'gaiaDeclare',`${card(d.source).name}の使用を宣言`,{cardId:d.source});}s.decision=null;}
 if(a.kind==='summonGaia'){s.decision=null;playCard(s,p,a.uid,true,null,0,null,'hand','ターン終了時の能力');}
 if(a.kind==='skipGaiaSummon')s.decision=null;
 if(a.kind==='endTurn')beginEnd(s);
 if(a.kind==='endUntap'){s.decision=null;if(a.yes)for(const c of s.players[p].battle)if(d.uids.includes(c.uid)&&canUntap(c))c.tapped=false;if(!s.endStep)nextTurn(s);}
 manaDeparted(s,manaBefore);let manaPrevious=manaSnapshot(s);extra.six.fifteen.graveDeparted(s,graveBefore);let gravePrevious=s.players.map(p=>p.grave.map(x=>x.uid));for(let n=0;n<1000;n++){manaDeparted(s,manaPrevious);manaPrevious=manaSnapshot(s);extra.six.fifteen.graveDeparted(s,gravePrevious);gravePrevious=s.players.map(p=>p.grave.map(x=>x.uid));
  for(const p of[s.active,1-s.active])checkSidewaysHand(s,p);
  if(advanceLoss(s)){if(s.decision||s.winner!==null)break;continue;}
  refreshDynamicTypes(s);if(extra.lionelState(s)){if(s.decision)break;continue;}advanceLeaving(s);if(extra.lionelState(s)){if(s.decision)break;continue;}if(!s.leaving&&!s.decision)for(const p of[s.active,1-s.active]){deckCheck(s,p);if(s.winner!==null||s.lossEvent)break;}if(s.winner!==null)break;if(s.lossEvent)continue;resumeInterrupt(s);advanceDeclarations(s);advanceBattle(s);extra.finishSwap(s);if(!s.attackDeclarations&&!s.leaving)advanceEffects(s);if(!s.leaving)advanceTriggers(s);advanceJudgeBreaks(s);powerCleanup(s);if(!s.pendingEffects?.length&&!s.triggers)extra.beforeNonActive(s);extra.advance(s);refreshDynamicTypes(s);if(extra.lionelState(s)){if(s.decision)break;continue;}powerCleanup(s);advanceAttack(s);extra.advanceBreak(s);extra.advanceAttackEnd(s);extra.advanceAfterAttack(s);advanceEnd(s);advanceStart(s);
  manaDeparted(s,manaPrevious);manaPrevious=manaSnapshot(s);extra.six.fifteen.graveDeparted(s,gravePrevious);gravePrevious=s.players.map(p=>p.grave.map(x=>x.uid));for(const p of[s.active,1-s.active])checkSidewaysHand(s,p);if(s.lossEvent){advanceLoss(s);if(s.decision||s.winner!==null)break;continue;}
  if(s.decision||s.winner!==null||!(s.pendingEffects?.length||s.triggers||s.battleResolution||s.judge||s.attackDeclarations||s.leaving||s.endStep||s.startStep||s.extTasks?.length||s.g19BreakSequence||s.g19Interrupt||s.attackLifecycle||s.g14AfterAttack||s.g10RevDeclarations?.length||s.g3Window&&!s.g3Window.done))break;
  if(n===999)throw Error('待機中の処理を完了できません');
 }
 return s;
}
// This observation deliberately omits both players' shield identities and deck order,
// and the opponent's hand. The AI receives only this object and its legal choices.
export function peekDeckTop(s,p){if(deckLocked(s,p)||p!==s.active||!s.players[p].battle.some(x=>effectiveCard(x,s).orochiTop))return null;const own=s.players[p],excluded=[...(own.g34Protected||[]),...(own.g33Protected||[]),...(own.g29Protected||[]),...(own.g28Protected||[]),...(own.g27Protected||[]),...(own.g13Protected||[]),...(own.g4Protected||[]),...(own.g8Protected||[]),...(own.g14Protected||[]),...(own.g25Protected||[]),...(own.g18Protected||[]),...(own.g10Protected||[]),...(own.g17Protected||[]),...(own.g3Protected||[]),...(own.g2Protected||[]),...(own.g7Reveals||[]),...(own.g19Reveals||[]),...(own.g21Protected||[]),...(own.g12Reveals||[])];return own.deck.find(x=>!excluded.includes(x.uid))||null;}
function visibleBattleState(x){if(x.faceDown)return {...x,cardId:FACE_DOWN.id};return {...x,...(x.under?{under:x.under.map(visibleBattleState)}:{}),...(x.godLinks?{godLinks:x.godLinks.map(visibleBattleState)}:{})};}
export function observation(s,p){return {active:s.active,turn:s.turn,phase:s.phase,extLimits:structuredClone(s.extLimits||[]),attack:s.attack?{attacker:s.attack.attacker,target:s.attack.target}:null,leaving:s.leaving?{rows:s.leaving.rows.map(r=>({player:r.player,uid:r.uid,to:r.to})),uid:s.decision?.uid}:null,decision:s.decision?{type:s.decision.type,effect:s.decision.effect,...(s.decision.type==='judgeContinue'?{wins:s.judge.wins}:{})}:null,judge:s.judge?.stage==='compare'?{revealed:s.judge.revealed,costs:s.judge.costs}:null,resolvingSpell:s.resolvingSpell?{player:s.resolvingSpell.player,cardId:s.resolvingSpell.source,face:s.resolvingSpell.face}:null,players:s.players.map((x,i)=>({turns:x.turns,battle:x.battle.map(visibleBattleState),mana:x.mana.map(c=>c.faceDown&&i!==p?{uid:c.uid,tapped:c.tapped,faceDown:true,cardId:FACE_DOWN.id}:c),grave:x.grave,extra:x.extra||[],seals:(x.seals||[]).map(y=>({uid:y.uid,sealOf:y.sealOf,faceDown:true})),hand:i===p?x.hand:x.hand.map(()=>({hidden:true})),...(i===p&&x.knownDeck?{knownDeck:structuredClone(x.knownDeck)}:{}),shields:x.shields.length,publicShields:structuredClone(x.shields.flatMap(shieldCards).filter(x=>x.faceUp).map(({uid,cardId,faceUp})=>({uid,cardId,faceUp}))),deckCount:x.deck.length,sidewaysPositions:x.deck.flatMap((c,j)=>c.g11Sideways?[j+1]:[]),...(i===p&&peekDeckTop(s,p)?{deckTop:peekDeckTop(s,p)}:{})}))};}
const aiCost=c=>Math.min(20,costValue(c));
export function rankHeuristicActions(s){
 const acts=getLegalActions(s);if(!acts.length)return [];const p=acts[0].player,v=observation(s,p),me=v.players[p],them=v.players[1-p];
 const find=(who,uid)=>v.players[who].battle.find(x=>x.uid===uid);
 const currentPower=x=>power(x,x.uid===v.attack?.attacker,v),living=xs=>xs.filter(x=>isCreature(v,x)&&!x.sealed);
 const fireSweepValue=c=>{const matches=x=>c.g75Effect==='Duel'?effectiveCard(x,v).blocker:currentPower(x)<=(c.g75Effect==='Shark'?2000:c.g75Effect==='Burst'?3000:4000),value=xs=>living(xs).filter(matches).reduce((n,x)=>n+aiCost(effectiveCard(x,v))+2,0);return value(them.battle)-(c.g75Effect==='Burst'?0:value(me.battle));};
 const score=a=>{
  const c=a.cardId?(a.kind==='play'?playFaces(card(a.cardId))[a.face||0]:card(a.cardId)):null;
  const chainPick=a.kind==='extended'&&s.decision?.task?.op==='g84_Pick',afterDeck=me.deckCount-(chainPick?(s.decision.task.selected.length+1):0);
  if(c&&['play','useTrigger'].includes(a.kind)&&!spellIgnored(v,c)){
   const draws=c.g92Effect==='Typhoon',snow=c.g92Effect==='Snow'&&me.mana.length<them.mana.length,reveal=c.g52Effect==='Tutor'&&c.g52TutorCount===5;
   if(draws&&me.deckCount<=1&&!me.battle.some(x=>effectiveCard(x,v).shako)||snow&&me.deckCount<=2||reveal&&!deckLocked(v,p)&&lookCount(v,p,5)>=me.deckCount)return -1000;
  }
  if(a.kind==='extended'&&s.decision?.task?.op==='g34_LookPick'&&s.decision.task.stage===0&&(card(s.decision.task.source)?.g89Logic||card(s.decision.task.source)?.g111Role==='gagan'||card(s.decision.task.source)?.g113Role==='gogo'||card(s.decision.task.source)?.g114Role==='doremi')&&me.deckCount<=1&&s.decision.choices[a.choice]?.value)return -1000;
  if(c&&['play','useTrigger'].includes(a.kind)&&!spellIgnored(v,c)&&me.deckCount<=1){
   if(c.g110Role==='wizard'||c.g110Role==='valhalla'&&!living(me.battle).some(x=>effectiveCard(x,v).shako))return -1000;
   if(c.g89Master&&!me.battle.some(x=>effectiveCard(x,v).shako)||c.g89Effect==='AndSpark'&&canAddShield(v,p))return -1000;
   if(c.g75Effect==='Burst'&&living(me.battle).some(x=>currentPower(x)>=6000)&&!living(me.battle).some(x=>effectiveCard(x,v).shako))return -1000;
  }
  if(a.kind==='useTrigger'&&['Spear','Duel'].includes(c?.g75Effect)&&!spellIgnored(v,c)&&fireSweepValue(c)<=0)return -1;
  if(c?.g111Role&&['play','useTrigger'].includes(a.kind)&&!spellIgnored(v,c)){
   const n=c.g111Role==='journey'?3:c.g111Role==='onsen'?(them.shields<=2?3:1):0;
   if(n&&me.deckCount<=n&&!living(me.battle).some(x=>effectiveCard(x,v).shako)||c.g111Role==='yell'&&me.deckCount<=1)return -1000;
  }
  if(c?.g84Effect==='Deep'&&['play','useTrigger'].includes(a.kind)&&!spellIgnored(v,c)&&them.battle.filter(x=>isCreature(v,x)&&!x.sealed).length>=me.deckCount&&!me.battle.some(x=>effectiveCard(x,v).shako))return -1000;
  if(c?.g116Role==='ulcos'&&(chainPick||['play','deploy','useTrigger'].includes(a.kind)||a.kind==='extended'&&(s.decision?.task?.op==='g20Select'||s.decision?.task?.op==='g34_Select'&&s.decision.task.deploy))){
   const x=me.hand.find(x=>x.uid===a.uid)||{cardId:c.id,uid:a.uid};
   if(afterDeck<=1&&!abilitiesIgnored(v,x)&&!selfTriggersStopped(v,p)&&!them.battle.some(x=>effectiveCard(x,v).selfEntrySilence))return -1000;
  }
  if(a.kind==='extended'&&s.decision?.task?.op==='g34_Offer'&&card(s.decision.task.source)?.g118Role==='zalms'&&(me.deckCount<=1||deckLocked(v,p)))return s.decision.choices[a.choice]?.value?-1000:0;
  if(a.kind==='extended'&&s.decision?.task?.op==='g34_Target'&&(card(s.decision.task.source)?.g118Role==='jams'||card(s.decision.task.source)?.g119Role==='malta')){const o=s.decision.choices[a.choice],x=find(1-p,o.value?.uid);return x?x.tapped?-5:25+aiCost(card(x)):0;}
  if(a.kind==='extended'&&s.decision?.task?.op==='g34_Select'&&card(s.decision.task.source)?.g117Role==='borgres'){
   const t=s.decision.task,selected=t.selected||[],o=s.decision.choices[a.choice];if(!o.value)return 0;
   if(selected.length>=2||me.mana.length-selected.length<=4||me.hand.length+selected.length>=4)return -20;
   const x=me.mana.find(x=>x.uid===o.value.uid);return x?15+(x.tapped?15:0)+aiCost(card(x)):0;
  }
  if(a.kind==='extended'&&s.decision?.task?.op==='g34_Offer'&&card(s.decision.task.source)?.g117Role==='satique'){
   const rows=me.grave.filter(x=>card(x).type==='creature'&&/ヒューマノイド|アーク・セラフィム/.test(card(x).race)),value=s.decision.choices[a.choice]?.value;
   if(!value)return 0;if(!canMoveZone(v,p,'grave')||extra.manaRedirect(v,p)||!rows.length)return -20;
   return living(me.battle).some(x=>effectiveCard(x,v).g117GraveCreaturePower&&power(x,false,v)-rows.length*2000<=0)?-20:rows.length*10;
  }
  if(c?.g117Role==='curse'&&(chainPick||['play','deploy','useTrigger'].includes(a.kind)||a.kind==='extended'&&(s.decision?.task?.op==='g20Select'||s.decision?.task?.op==='g34_Select'&&s.decision.task.deploy))&&!me.grave.some(x=>x.uid!==a.uid&&card(x).type==='creature'))return -1000;
  if(a.kind==='extended'&&s.decision?.task?.op==='g34_Draw'&&card(s.decision.task.source)?.g116Role==='chick'&&me.deckCount<=1)return s.decision.choices[a.choice]?.value?(living(me.battle).some(x=>effectiveCard(x,v).shako)?1000:-1000):0;
  if(c?.g115Role==='prometheus'&&(chainPick||['play','deploy','useTrigger'].includes(a.kind)||a.kind==='extended'&&(s.decision?.task?.op==='g20Select'||s.decision?.task?.op==='g34_Select'&&s.decision.task.deploy))){
   const x=me.hand.find(x=>x.uid===a.uid)||{cardId:c.id,uid:a.uid};
   if(afterDeck<=2&&!abilitiesIgnored(v,x)&&!selfTriggersStopped(v,p)&&!them.battle.some(x=>effectiveCard(x,v).selfEntrySilence))return -1000;
  }
  if(a.kind==='extended'&&s.decision?.task?.op==='g34_Target'&&card(s.decision.task.source)?.g115Role==='colon'){const o=s.decision.choices[a.choice],x=find(1-p,o.value?.uid);return x?x.tapped?-5:25+aiCost(card(x)):0;}
  if(a.kind==='extended'&&s.decision?.task?.op==='g34_Select'&&card(s.decision.task.source)?.g115Role==='prometheus'){const o=s.decision.choices[a.choice],x=me.mana.find(x=>x.uid===o.value?.uid);return x?(x.tapped?30:0)+aiCost(card(x)):0;}
  if(['bell','bogo'].includes(c?.g114Role)&&(chainPick||['play','deploy','useTrigger'].includes(a.kind)||a.kind==='extended'&&(s.decision?.task?.op==='g20Select'||s.decision?.task?.op==='g34_Select'&&s.decision.task.deploy))){
   const n=c.g114Role==='bell'?2:1,x=me.hand.find(x=>x.uid===a.uid)||{cardId:c.id,uid:a.uid};
   if(afterDeck<=n&&!abilitiesIgnored(v,x)&&!selfTriggersStopped(v,p)&&!them.battle.some(x=>effectiveCard(x,v).selfEntrySilence))return -1000;
  }
  if(['court','emerald'].includes(c?.g113Role)&&(chainPick||['play','deploy','useTrigger'].includes(a.kind)||a.kind==='extended'&&(s.decision?.task?.op==='g20Select'||s.decision?.task?.op==='g34_Select'&&s.decision.task.deploy))){
   const n=c.g113Role==='court'?3:1,x=me.hand.find(x=>x.uid===a.uid)||{cardId:c.id,uid:a.uid};
   if(afterDeck<=n&&!abilitiesIgnored(v,x)&&!selfTriggersStopped(v,p)&&!them.battle.some(x=>effectiveCard(x,v).selfEntrySilence)&&(c.g113Role==='court'||!living(me.battle).some(x=>effectiveCard(x,v).shako)))return -1000;
  }
  if(a.kind==='extended'&&s.decision?.task?.op==='g34_Select'&&card(s.decision.task.source)?.g113Role==='king'){
   const selected=s.decision.task.selected||[],remaining=me.hand.filter(x=>!selected.includes(x.uid)),goal=Math.min(10,Math.max(4,...remaining.map(x=>aiCost(card(x))))),o=s.decision.choices[a.choice];
   if(!o.value)return 0;if(remaining.length<=1||me.mana.length+selected.length>=goal)return -20;
   const keeper=[...remaining].sort((a,b)=>aiCost(card(b))-aiCost(card(a)))[0];return o.value.uid===keeper?.uid?-30:30-aiCost(card(o.cardId));
  }
  if(a.kind==='extended'&&s.decision?.task?.op==='g34_Select'&&card(s.decision.task.source)?.g113Role==='zebra'){const o=s.decision.choices[a.choice],x=me.mana.find(x=>x.uid===o.value?.uid);return x?(x.tapped?30:0)+aiCost(card(x)):0;}
  if(c?.g83Nasuo&&(chainPick||['play','deploy','useTrigger'].includes(a.kind)||a.kind==='extended'&&(s.decision?.task?.op==='g20Select'||s.decision?.task?.op==='g34_Select'&&s.decision.task.deploy))){
   const x=me.hand.find(x=>x.uid===a.uid)||{cardId:c.id,uid:a.uid};
   if(afterDeck<=1&&!abilitiesIgnored(v,x)&&!selfTriggersStopped(v,p)&&!them.battle.some(x=>effectiveCard(x,v).selfEntrySilence))return -1000;
  }
  if(c?.g91Effect==='Natsuki'&&(chainPick||['play','deploy','useTrigger'].includes(a.kind)||a.kind==='extended'&&(s.decision?.task?.op==='g20Select'||s.decision?.task?.op==='g34_Select'&&s.decision.task.deploy))){
   const n=deckLocked(v,p)?0:lookCount(v,p,3),x=me.hand.find(x=>x.uid===a.uid)||{cardId:c.id,uid:a.uid};
   if(n>0&&n>=afterDeck&&!abilitiesIgnored(v,x)&&!selfTriggersStopped(v,p)&&!them.battle.some(x=>effectiveCard(x,v).selfEntrySilence))return -1000;
  }
  if(c?.g82Effect==='Nasuro'&&(chainPick||['play','deploy','useTrigger'].includes(a.kind)||a.kind==='extended'&&(s.decision?.task?.op==='g20Select'||s.decision?.task?.op==='g34_Select'&&s.decision.task.deploy))){
   const x=me.hand.find(x=>x.uid===a.uid)||{cardId:c.id,uid:a.uid};
   if(afterDeck<=1&&!deckLocked(v,p)&&!abilitiesIgnored(v,x)&&!selfTriggersStopped(v,p)&&!them.battle.some(x=>effectiveCard(x,v).selfEntrySilence))return -1000;
  }
  if(c?.g81Earl&&(chainPick||['play','deploy','useTrigger'].includes(a.kind)||a.kind==='extended'&&(s.decision?.task?.op==='g20Select'||s.decision?.task?.op==='g34_Select'&&s.decision.task.deploy))){
   const n=lookCount(v,p,3),x=me.hand.find(x=>x.uid===a.uid)||{cardId:c.id,uid:a.uid};
   if(n>0&&n>=afterDeck&&!abilitiesIgnored(v,x)&&!selfTriggersStopped(v,p)&&!them.battle.some(x=>effectiveCard(x,v).selfEntrySilence))return -1000;
  }
  if(c?.g79Effect==='Rush'&&(chainPick||['play','evolve'].includes(a.kind))){
   const n=Math.max(0,3-me.shields),x=me.hand.find(x=>x.uid===a.uid)||{cardId:c.id,uid:a.uid};
   if(n>0&&n>=afterDeck&&!abilitiesIgnored(v,x)&&!selfTriggersStopped(v,p)&&!them.battle.some(x=>effectiveCard(x,v).selfEntrySilence)&&!me.battle.some(x=>effectiveCard(x,v).shako))return -1000;
  }
  if(a.kind==='godLeave')return -aiCost(c);
  if(a.kind==='extended'&&s.decision?.task?.op==='g75_Scramble'){const x=find(p,s.decision.choices[a.choice]?.value);return x&&!x.tapped&&x.entered===v.turn&&!effectiveCard(x,v).speedAttacker&&!effectiveCard(x,v).noAttack&&!abilitiesIgnored(v,x)?50+aiCost(card(x)):0;}
  if(a.kind==='extended'&&s.decision?.task?.op==='g34_Target'&&card(s.decision.task.source)?.g121Role==='leaf'&&s.decision.task.owner==='self'){const x=find(p,s.decision.choices[a.choice]?.value?.uid);return x?-aiCost(card(x))*4+(extra.canLeave(v,p,x)?0:50):0;}
  if(a.kind==='extended'&&s.decision?.task?.op==='g34_Draw'&&card(s.decision.task.source)?.g121Role==='protection'&&me.deckCount<=1&&living(me.battle).some(x=>effectiveCard(x,v).shako))return s.decision.choices[a.choice]?.value?1000:0;
  if(a.kind==='extended')return a.score??0;
  if(a.kind==='crossGear')return a.score;
  if(a.kind==='hyper')return 12;
  if(a.kind==='replaceShieldFace'||a.kind==='replaceSavak')return 35;
  if(a.kind==='replaceMuku')return (s.extTasks||[]).some(t=>t.op==='swapFinish'&&t.p===p&&t.old===s.decision?.uid)?-15:45;
  if(a.kind==='replaceOmega')return 20;
  if(a.kind==='replaceEx'||a.kind==='replaceGneo'||a.kind==='replaceStar')return 40;
  if(a.kind==='replaceEscape'){const x=find(p,s.decision?.uid);return x&&power(x,false,v)<=0?-1:30;}
  if(a.kind==='replaceEver')return 32;
  if(a.kind==='everShield')return 5;
  if(a.kind==='cancelEverShields')return -100;
  if(a.kind==='replaceAter'||a.kind==='replaceUltra')return 25-aiCost(c);
  if(a.kind==='replaceJashin')return me.hand.length>2?35:15;
  if(a.kind==='leaveHand')return aiCost(c)+(c.abyssRush?12:0);
  if(a.kind==='cancelLeaveHand')return -100;
  if(a.kind==='replaceMana')return 20;
  if(a.kind==='allowLeave')return 0;
  if(a.kind==='leaveMana'){const x=me.mana.find(x=>x.uid===a.uid);return(x.tapped?15:0)-aiCost(c);}
  if(a.kind==='cancelLeaveMana'||a.kind==='cancelMugen'||a.kind==='cancelDeploy')return -100;
  if(a.kind==='declareGaia')return 10;
  if(a.kind==='summonGaia')return me.deckCount>2?80:-10;
  if(a.kind==='skipGaiaDeclare'||a.kind==='skipGaiaSummon')return 0;
  if(a.kind==='mugenStart')return 95;
  if(a.kind==='mugenTap'){const x=find(p,a.uid);return(x.entered===v.turn&&!effectiveCard(x,v).speedAttacker?20:0)-aiCost(c)-(effectiveCard(x,v).blocker?8:0);}
  if(a.kind==='deploy')return 30+aiCost(c)*3+(c.effect==='destroyWeakerLimitNextTurn'?15:0);
  if(a.kind==='skipDeploy')return 0;
  if(a.kind==='infinityCount')return a.n*10;
  if(a.kind==='infinityShield')return a.exLifeHit?5:1;
  if(a.kind==='charge'){
   const duplicates=me.hand.filter(x=>x.cardId===c.id).length;
   const colors=manaCivilizations(c).filter(v=>!me.mana.some(x=>manaCivilizations(card(x)).includes(v))).length;
   return 50+colors*10+aiCost(c)*1.5+(duplicates>1?4:0)-(c.type==='creature'&&aiCost(c)<=3?10:0);
  }
  if(a.kind==='skipCharge')return me.mana.reduce((n,x)=>n+manaValue(card(x)),0)>=Math.max(7,...me.hand.map(x=>aiCost(card(x))))?100:me.hand.length<=1&&me.mana.length>=4?70:0;
  if(a.kind==='pandora')return me.mana.length<4?42:(me.extra||[]).some(x=>card(x).pandora)?5:30;
  if(a.kind==='play'){
   if(c.g125Role){
    if(c.type==='spell'&&spellIgnored(v,c))return -20;
    if(c.g125Role==='suit')return living(me.battle).length?35:5;
    if(c.g125Role==='eternal')return living(them.battle).some(x=>!isEvolution(x)&&aiCost(effectiveCard(x,v))<=4&&extra.targetable(v,p,1-p,x)&&canAddShield(v,1-p))?42:-20;
    if(c.g125Role==='bites')return living(them.battle).some(x=>extra.targetable(v,p,1-p,x))?40:-20;
    if(c.g125Role==='choker')return 30+aiCost(c)*2+(canMoveZone(v,p,'grave')&&me.grave.some(x=>String(card(x).race).includes('ドラゴン'))?14:0);
   }
   if(c.g124Role){
    const source=me.hand.find(x=>x.uid===a.uid)||{cardId:c.id,uid:a.uid},entryActive=!abilitiesIgnored(v,source)&&!selfTriggersStopped(v,p)&&!living(them.battle).some(x=>effectiveCard(x,v).selfEntrySilence),enemy=living(them.battle),own=living(me.battle);
    if(c.g124Role==='demise')return enemy.length?40:-20;
    if(c.g124Role==='escort'&&entryActive&&!own.some(x=>aiCost(card(x))<=4||!extra.canLeave(v,p,x)))return -20;
    if(c.g124Role==='wave'&&entryActive){const value=xs=>xs.filter(x=>civilizations(effectiveCard(x,v)).length<2).reduce((n,x)=>n+3+Math.min(aiCost(card(x)),12),0),gain=value(enemy)-value(own);return gain>0?35+gain*3:-20;}
    if(c.g124Role==='chain'){const targets=enemy.filter(x=>extra.targetable(v,p,1-p,x));return targets.length?35+Math.min(2,targets.length)*15-(own.length?Math.min(...own.map(x=>aiCost(card(x))))*3:0):-20;}
   }
   if(c.g123Role){
    const source=me.hand.find(x=>x.uid===a.uid)||{cardId:c.id,uid:a.uid},entryActive=!abilitiesIgnored(v,source)&&!selfTriggersStopped(v,p)&&!living(them.battle).some(x=>effectiveCard(x,v).selfEntrySilence);
    if(c.g123Role==='eco'&&entryActive&&me.deckCount<=2)return -1000;
    if(c.g123Role==='claw')return living(me.battle).length?32:5;
    if(c.g123Role==='bouncer')return 30+aiCost(c)*2+(entryActive&&living(them.battle).some(x=>extra.targetable(v,p,1-p,x))?18:0);
   }
   if(c.g122Role){
    if(c.g122Role==='izolist'&&(!me.grave.some(x=>card(x).type==='creature'&&civilizations(card(x)).includes('闇'))||abilitiesIgnored(v,me.hand.find(x=>x.uid===a.uid)||{cardId:c.id,uid:a.uid})))return -1000;
    if(c.g122Role==='zekira'&&!selfTriggersStopped(v,p)&&!living(them.battle).some(x=>effectiveCard(x,v).selfEntrySilence)&&!abilitiesIgnored(v,me.hand.find(x=>x.uid===a.uid)||{cardId:c.id,uid:a.uid})&&!living(me.battle).some(x=>!extra.canLeave(v,p,x)||aiCost(card(x))<3))return -20;
    if(c.g122Role==='vines')return 30+aiCost(c)*2+(living(them.battle).some(x=>effectiveCard(x,v).blocker)?20:0);
    if(c.g122Role==='gallium')return 30+aiCost(c)*2+(them.shields?12:0);
   }
   if(c.g121Role){
    if(c.g121Role==='genesis'){const xs=living(me.battle);return xs.some(x=>me.deckCount>3||xs.some(y=>y.uid!==x.uid&&effectiveCard(y,v).shako))?35+(me.hand.length<4?12:0):-20;}
    if(c.g121Role==='vice')return them.hand.length?30+Math.min(2,them.hand.length)*10:-20;
    if(c.g121Role==='blossom'||c.g121Role==='leaf')return living(them.battle).some(x=>extra.targetable(v,p,1-p,x))?40+(c.g121Role==='leaf'&&!living(me.battle).length?10:0):-20;
    if(c.g121Role==='protection'){const add=me.hand.some(x=>x.uid!==a.uid)&&canAddShield(v,p),draw=me.shields+(add?1:0)>them.shields;if(draw&&me.deckCount===1&&living(me.battle).some(x=>effectiveCard(x,v).shako))return 1000;return add?20+(me.shields<3?20:0):draw&&me.deckCount>1?22:-10;}
   }
   if(c.g120Role){
    if(c.g120Role==='scramble')return living(me.battle).some(x=>!x.tapped&&x.entered===v.turn&&!effectiveCard(x,v).speedAttacker&&!effectiveCard(x,v).noAttack&&!abilitiesIgnored(v,x))?48:-20;
    if(c.g120Role==='drill')return living(them.battle).some(x=>currentPower(x)<=6000&&extra.targetable(v,p,1-p,x))?45:-20;
    if(c.g120Role==='song'||c.g120Role==='shine'){const applies=x=>c.g120Role==='song'?!civilizations(effectiveCard(x,v)).includes('光'):aiCost(effectiveCard(x,v))<=3;return living(them.battle).filter(x=>!x.tapped&&applies(x)).length*16-living(me.battle).filter(x=>!x.tapped&&applies(x)).length*18;}
    if(c.g120Role==='quake')return living(me.battle).some(x=>!x.tapped&&x.entered<v.turn&&!effectiveCard(x,v).noAttack&&!effectiveCard(x,v).noCreatureAttack)?30:-20;
    if(c.g120Role==='cube')return me.deckCount>1&&!deckLocked(v,p)?30:-20;
   }
   if(c.g119Role){
    const source=me.hand.find(x=>x.uid===a.uid)||{cardId:c.id,uid:a.uid},entryActive=!abilitiesIgnored(v,source)&&!selfTriggersStopped(v,p)&&!them.battle.some(x=>effectiveCard(x,v).selfEntrySilence);
    if(c.g119Role==='aventure'&&entryActive&&them.mana.length>me.mana.length&&me.deckCount<=1)return -1000;
    const base=30+aiCost(c)*2;
    if(c.g119Role==='aventure')return base+(entryActive&&them.mana.length>me.mana.length?18:0);
    if(c.g119Role==='raju')return base+(me.hand.some(x=>civilizations(card(x)).includes('光')&&(card(x).evolution||card(x).sMax||card(x).neoEvolution))?14:0);
    if(c.g119Role==='malta')return base+(entryActive&&living(them.battle).some(x=>!x.tapped)?12:0);
    if(c.g119Role==='petro')return living(me.battle).length?35:5;
   }
   if(c.g118Role){const base=30+aiCost(c)*2;
    if(c.g118Role==='shadow')return base+(a.freeSummon?30:0);
    if(c.g118Role==='gregory')return base+(canMoveZone(v,p,'grave')&&me.grave.some(x=>playFaces(card(x)).some(f=>String(f.race).includes('ナイト')))?16:0);
    if(c.g118Role==='zalms')return base+Math.min(3,living(me.battle).filter(x=>String(effectiveCard(x,v).race).includes('ドラゴン')).length)*8;
    if(c.g118Role==='jams')return base+(living(me.battle).some(x=>String(effectiveCard(x,v).race).includes('アーク・セラフィム'))?12:0);
    if(c.g118Role==='muse')return base+living(them.battle).filter(x=>!x.tapped&&currentPower(x)<=3000).length*8-living(me.battle).filter(x=>!x.tapped&&currentPower(x)<=3000).length*5;
   }
   if(c.g117Role){const base=30+aiCost(c)*2;
    if(c.g117Role==='borgres')return base+(canMoveZone(v,p,'mana')&&me.mana.some(x=>card(x).type==='creature'&&String(card(x).race).includes('ドラゴン'))&&me.hand.length<4?12:0);
    if(c.g117Role==='dolzark')return base+Math.min(3,living(me.battle).filter(x=>String(effectiveCard(x,v).race).includes('ドラゴン')).length)*12;
    if(c.g117Role==='curse')return base+Math.min(6,me.grave.filter(x=>card(x).type==='creature').length)*3;
    if(c.g117Role==='swallow')return base+(me.hand.some(x=>card(x).type==='gear')?18:0);
    if(c.g117Role==='satique')return base+(canMoveZone(v,p,'grave')?Math.min(5,me.grave.filter(x=>card(x).type==='creature'&&/ヒューマノイド|アーク・セラフィム/.test(card(x).race)).length)*5:0);
   }
   if(c.g116Role&&!abilitiesIgnored(v,{cardId:c.id,uid:a.uid})&&!selfTriggersStopped(v,p)&&!them.battle.some(x=>effectiveCard(x,v).selfEntrySilence)){
    const base=30+aiCost(c)*2;
    if(c.g116Role==='ulcos')return base+(me.mana.length<8?18:5);
    if(c.g116Role==='pointer')return base+Math.min(1,them.hand.length)*18;
    if(c.g116Role==='chick')return base+(them.shields===0?80:15);
    if(c.g116Role==='librarian')return base+(them.shields===0?15:8);
   }
   if(c.g115Role&&!abilitiesIgnored(v,{cardId:c.id,uid:a.uid})&&!selfTriggersStopped(v,p)&&!them.battle.some(x=>effectiveCard(x,v).selfEntrySilence)){
    const base=30+aiCost(c)*2,targets=living(them.battle).filter(x=>extra.targetable(v,p,1-p,x));
    if(c.g115Role==='kiryu')return base+18+(them.shields===0?80:0)+living(me.battle).filter(x=>!x.tapped&&x.entered>=v.turn&&!effectiveCard(x,v).speedAttacker&&!effectiveCard(x,v).noAttack).length*12;
    if(c.g115Role==='dolbo')return base+(targets.some(x=>currentPower(x)<=6000)?18:0)+(targets.some(x=>currentPower(x)>6000)?18:0);
    if(c.g115Role==='prometheus')return base+(me.mana.length<8?20:8);
    if(c.g115Role==='colon')return base+(targets.some(x=>!x.tapped)?12:0);
   }
   if(c.g114Role&&!abilitiesIgnored(v,{cardId:c.id,uid:a.uid})&&!selfTriggersStopped(v,p)&&!them.battle.some(x=>effectiveCard(x,v).selfEntrySilence)){
    const base=30+aiCost(c)*2;
    if(c.g114Role==='shark'){const gain=fireSweepValue(c);return gain<-2?-10:base+gain*5;}
    if(c.g114Role==='mandra')return base+(canMoveZone(v,p,'grave')&&me.grave.some(x=>card(x).type==='creature')?14:0);
    if(c.g114Role==='dotsuki')return base+(living(them.battle).some(x=>x.tapped&&extra.targetable(v,p,1-p,x))?22:0);
    if(c.g114Role==='doremi')return base+(!deckLocked(v,p)&&me.deckCount>1?12:0);
    if(c.g114Role==='bogo')return base+(me.mana.length<8?18:5);
    if(c.g114Role==='bell')return base+(a.origin==='grave'?12:5);
   }
   if(c.g113Role&&!abilitiesIgnored(v,{cardId:c.id,uid:a.uid})&&!selfTriggersStopped(v,p)&&!them.battle.some(x=>effectiveCard(x,v).selfEntrySilence)){
    const base=30+aiCost(c)*2;
    if(c.g113Role==='gogo')return base+(!deckLocked(v,p)&&me.deckCount>1?12:0);
    if(c.g113Role==='shell')return base+(living(them.battle).some(x=>extra.targetable(v,p,1-p,x))?16:0);
    if(c.g113Role==='zebra')return base+8;
    if(c.g113Role==='king')return base+(me.hand.length>2&&me.mana.length<7?12:0);
    if(c.g113Role==='court')return base+(a.origin==='grave'?10:0);
    if(c.g113Role==='emerald')return base+(me.deckCount<=1&&living(me.battle).some(x=>effectiveCard(x,v).shako)?1000:12);
   }
   if(c.g112Role&&!abilitiesIgnored(v,{cardId:c.id,uid:a.uid})&&!selfTriggersStopped(v,p)&&!them.battle.some(x=>effectiveCard(x,v).selfEntrySilence)){
    const base=30+aiCost(c)*2;
    if(c.g112Role==='ore')return base+Math.min(them.hand.length,1+living(me.battle).filter(x=>/コマンド/.test(effectiveCard(x,v).race||'')).length)*8;
    if(c.g112Role==='congrat')return base+(me.shields&&living(them.battle).length?16:0);
    if(c.g112Role==='black')return base+(them.shields?16:0)+(canAddShield(v,p)&&canMoveZone(v,p,'grave')&&me.grave.some(x=>card(x).type==='creature'&&/コマンド/.test(card(x).race||''))?12:0);
    if(c.g112Role==='giga')return 24+(canMoveZone(v,p,'grave')?Math.min(2,me.grave.filter(x=>card(x).type==='creature').length)*14:0);
    if(c.g112Role==='aq')return base+(living(them.battle).some(x=>extra.targetable(v,p,1-p,x))?18:0);
   }
   if(c.g111Role){
    if(spellIgnored(v,c))return 0;
    if(c.g111Role==='gagan')return !deckLocked(v,p)&&me.deckCount>1&&lookCount(v,p,3)>0?26:0;
    if(c.g111Role==='yell')return (me.mana.length<7?24:0)+(living(them.battle).some(x=>effectiveCard(x,v).blocker&&extra.targetable(v,p,1-p,x)&&!effectiveCard(x,v).spellUntargetable)?28:0);
    if(['journey','onsen'].includes(c.g111Role)){const n=c.g111Role==='journey'||them.shields<=2?3:1;return me.deckCount<=n&&living(me.battle).some(x=>effectiveCard(x,v).shako)?1000:me.hand.length<6?20+n*4:12;}
    if(c.g111Role==='wedding'){const n=me.hand.filter(x=>{const d=card(x);return d.type==='creature'&&!d.evolution&&!d.sMax&&!civilizations(d).includes('光')&&/エンジェル・コマンド/.test(d.race||'')&&canEnterCreature(v,p,d,{origin:'hand',execution:false});}).length;return n?28+Math.min(2,n)*8:0;}
    if(c.g111Role==='portal'){const n=canMoveZone(v,p,'grave')&&me.grave.some(x=>{const d=card(x);return d.type==='creature'&&civilizations(d).includes('闇')&&canEnterCreature(v,p,d,{origin:'grave',execution:false})&&(!d.evolution||evolutionBases(v,p,d).length);});return n?38:0;}
   }
   if(c.g110Role){
    if(spellIgnored(v,c))return 0;
    const enemies=living(them.battle).filter(x=>extra.targetable(v,p,1-p,x)&&!effectiveCard(x,v).spellUntargetable),win=living(me.battle).some(x=>effectiveCard(x,v).shako);
    if(c.g110Role==='wizard')return (canMoveZone(v,p,'mana')&&me.mana.some(x=>playFaces(card(x)).some(f=>f.type==='spell'))?24:0)+(me.mana.length<7?20:0);
    if(c.g110Role==='analyze')return enemies.length?26+Math.min(2,enemies.length)*6:me.mana.length<9?12:0;
    if(c.g110Role==='wave')return me.deckCount<=1&&win&&[...enemies,...living(me.battle).filter(x=>!effectiveCard(x,v).shako)].some(x=>/ドラゴン/.test(effectiveCard(x,v).race||''))?1000:enemies.length?30:0;
    if(c.g110Role==='valhalla')return (me.deckCount<=1&&win?1000:18)+(enemies.some(x=>!x.tapped)?10:0);
    if(c.g110Role==='ifrit')return enemies.some(x=>costValue(effectiveCard(x,v))<=9)?32:0;
    if(c.g110Role==='unseen')return (enemies.some(x=>!x.tapped)?32:0)+(canMoveZone(v,p,'grave')&&me.grave.some(x=>card(x).type==='creature')?20:0);
   }
   if(c.g78Effect==='Dio'&&!abilitiesIgnored(v,{cardId:c.id,uid:a.uid})&&!selfTriggersStopped(v,p)&&!them.battle.some(x=>effectiveCard(x,v).selfEntrySilence)){
    const ownLoss=Math.min(aiCost(c),...living(me.battle).map(x=>aiCost(effectiveCard(x,v)))),enemies=living(them.battle);return enemies.length?24+(Math.min(...enemies.map(x=>aiCost(effectiveCard(x,v))))-ownLoss)*4:ownLoss<aiCost(c)?20:0;
   }
   if(c.type==='spell'&&c.g89Logic)return !spellIgnored(v,c)&&!deckLocked(v,p)&&me.deckCount>1?26:0;
   if(c.type==='spell'&&(c.g89Master||['Recover','RevSpark','AndSpark','SilentSpark'].includes(c.g89Effect))){
    if(spellIgnored(v,c))return 0;
    const n=them.battle.filter(x=>isCreature(v,x)&&!x.sealed&&!x.tapped).length,attack=me.battle.some(x=>isCreature(v,x)&&!x.tapped&&!effectiveCard(x,v).noAttack&&(x.entered<v.turn||effectiveCard(x,v).speedAttacker||isEvolution(x))),taps=n*(attack?12:5);
    if(c.g89Effect==='Recover')return (canMoveZone(v,p,'grave')&&me.grave.some(x=>playFaces(card(x)).some(f=>f.type==='spell'))?24:0)+(me.mana.length<7?12:0);
    if(c.g89Effect==='AndSpark')return (me.shields<=2?taps:0)+(canAddShield(v,p)&&me.deckCount>1?18:0);
    if(c.g89Effect==='RevSpark')return me.shields<=2?taps:n&&attack?16:0;
    return taps+(me.deckCount>1?20:me.battle.some(x=>effectiveCard(x,v).shako)?80:0);
   }
   if(c.type==='spell'&&c.g92Effect){
    if(spellIgnored(v,c))return 0;
    if(c.g92Effect==='Slash'){const n=me.battle.filter(x=>isCreature(v,x)&&!x.sealed&&!x.tapped&&x.entered>=v.turn&&!isEvolution(x)&&!effectiveCard(x,v).speedAttacker&&!effectiveCard(x,v).noAttack).length;return n?25+n*8:0;}
    if(c.g92Effect==='Neo')return me.deckCount>1||me.battle.some(x=>effectiveCard(x,v).shako)?me.hand.length<5?25:12:0;
    if(c.g92Effect==='Typhoon')return me.hand.length<=4?25:12;
    if(c.g92Effect==='Snow')return me.mana.length<them.mana.length?32:0;
    if(c.g92Effect==='Rainbow'){const target=them.battle.some(x=>isCreature(v,x)&&!x.sealed&&costValue(effectiveCard(x,v))<=5&&extra.targetable(v,p,1-p,x)&&!effectiveCard(x,v).spellUntargetable),rainbow=me.mana.filter(x=>manaColors(x.faceDown?card('face-down-seal'):card(x),v,p).length>1).length>=2;return(target?30:0)+(rainbow&&them.hand.length?14:0);}
   }
   if(c.type==='spell'&&c.g52Effect==='Tutor'&&c.g52TutorCount===5)return !spellIgnored(v,c)&&!deckLocked(v,p)?me.hand.length<7?28:12:0;
   if(c.g88Effect){const value=extra.utilityTwinSupport.playScore(v,p,c);if(value!==null)return value;}
   if(c.g87Effect==='Crimson'&&!selfTriggersStopped(v,p)&&!them.battle.some(x=>effectiveCard(x,v).selfEntrySilence)){const blockers=xs=>xs.filter(x=>isCreature(v,x)&&!x.sealed&&effectiveCard(x,v).blocker).reduce((n,x)=>n+aiCost(effectiveCard(x,v))+1,0);return 44+blockers(them.battle)*4-blockers(me.battle)*8;}
   if(c.type==='spell'&&c.g85Effect==='Strike'){const targets=them.battle.filter(x=>isCreature(v,x)&&!x.sealed&&!effectiveCard(x,v).spellUntargetable&&extra.targetable(v,p,1-p,x));return !spellIgnored(v,c)&&targets.length?targets.some(x=>power(x,false,v)<=5000)?32:15:0;}
   if(c.type==='spell'&&c.g84Effect==='Deep')return !spellIgnored(v,c)&&them.battle.some(x=>isCreature(v,x)&&!x.sealed)?30:0;
   if(c.type==='spell'&&c.g83Effect==='Star')return !spellIgnored(v,c)&&extra.utilityNatureSupport.starUseful(v,p)?36:0;
   if(c.type==='spell'&&c.g82Effect==='Reload')return !spellIgnored(v,c)&&(me.deckCount>1||me.battle.some(x=>effectiveCard(x,v).shako))?me.hand.length>1?22:8:0;
   if(c.type==='spell'&&c.g82Effect==='Triple'){const n=canMoveZone(v,p,'grave')?me.grave.filter(x=>{const d=card(x);return d.type==='creature'&&!d.evolution&&!d.sMax&&costValue(d)<=3;}).length:0;return !spellIgnored(v,c)&&n?24+Math.min(3,n)*6:0;}
   if(c.type==='spell'&&c.g82Effect==='Stone')return !spellIgnored(v,c)&&!deckLocked(v,p)&&me.deckCount>1?me.mana.length<7?32:12:0;
   if(c.type==='spell'&&c.g82Effect==='Mountain')return !spellIgnored(v,c)&&!deckLocked(v,p)&&me.deckCount>1?me.hand.length<5?26:12:0;
   if(c.type==='spell'&&c.g77Effect){
    if(spellIgnored(v,c))return 0;
    if(c.g77Effect==='Fusion')return me.deckCount>me.mana.length&&!deckRedirect(v,p)&&me.mana.length<12?32:0;
    if(c.g77Effect==='Gaia')return me.mana.length<6&&me.battle.some(x=>isCreature(v,x)&&!x.sealed&&costValue(card(x))<=3)?26:0;
   }
   if(c.type==='spell'&&c.g76Effect==='Lance')return !spellIgnored(v,c)&&them.battle.some(x=>card(x).type==='gear'&&!x.sealed&&extra.targetable(v,p,1-p,x)&&!effectiveCard(x,v).spellUntargetable)?28:0;
   if(c.type==='spell'&&c.g75Effect){
    if(spellIgnored(v,c))return 0;
    if(['Burst','Spear','Duel'].includes(c.g75Effect))return Math.max(0,fireSweepValue(c)*6)+(c.g75Effect==='Burst'&&living(me.battle).some(x=>currentPower(x)>=6000)?me.deckCount<=1&&living(me.battle).some(x=>effectiveCard(x,v).shako)?1000:18:0);
    const enemies=them.battle.filter(x=>isCreature(v,x)&&!x.sealed&&extra.targetable(v,p,1-p,x)&&!effectiveCard(x,v).spellUntargetable);
    if(c.g75Effect==='Meteor')return enemies.some(x=>power(x,false,v)<=6000&&effectiveCard(x,v).blocker)?30:0;
    if(c.g75Effect==='Arrow')return enemies.some(x=>power(x,false,v)<=6000)&&!(me.shields<=1&&them.battle.some(x=>isCreature(v,x)&&!x.tapped))?30:0;
    if(c.g75Effect==='Rush')return enemies.some(x=>power(x,false,v)<=6000)?30:0;
    if(c.g75Effect==='Scrapper')return enemies.some(x=>costValue(card(x))<=6)?35:0;
    if(c.g75Effect==='Lion')return enemies.some(x=>power(x,false,v)<=2000)||them.battle.some(x=>card(x).type==='gear'&&!x.sealed&&extra.targetable(v,p,1-p,x)&&!effectiveCard(x,v).spellUntargetable)?30:0;
   }
   if(c.type==='spell'&&(c.g74Effect||c.g74Role)){
    if(spellIgnored(v,c))return 0;
    if(c.g74Role==='spark')return !deckLocked(v,p)&&me.deckCount>1?26:0;
    if(c.g74Effect==='Mail')return canAddShield(v,p)&&me.hand.some(x=>x.uid!==a.uid)?me.shields<=2?32:12:0;
    if(c.g74Effect==='Arc')return them.battle.some(x=>isCreature(v,x)&&!x.sealed&&!/ドラゴン|フェニックス/.test(effectiveCard(x,v).race||'')&&extra.targetable(v,p,1-p,x)&&!effectiveCard(x,v).spellUntargetable)&&canAddShield(v,1-p)?30:0;
   }
   if(c.type==='spell'&&(c.g73Effect||c.g73Role)){
    if(spellIgnored(v,c))return 0;
    if(c.g73Role==='slash')return deckLocked(v,p)?me.mana.length<7?25:0:me.deckCount>1?me.mana.length<7?36:20:0;
    if(c.g73Role==='forest')return canMoveZone(v,p,'grave')&&me.grave.some(x=>card(x).type==='creature')?me.mana.length<7?34:18:0;
    const enemies=them.battle.filter(x=>isCreature(v,x)&&!x.sealed);
    if(c.g73Effect==='Devil')return enemies.some(x=>extra.targetable(v,p,1-p,x)&&!effectiveCard(x,v).spellUntargetable)?32:0;
    if(c.g73Effect==='Soil')return me.mana.length<7?36:enemies.length?24:0;
   }
   if(c.type==='spell'&&c.g72Effect){
    if(spellIgnored(v,c))return 0;
    const enemies=them.battle.filter(x=>isCreature(v,x)&&!x.sealed&&extra.targetable(v,p,1-p,x)&&!effectiveCard(x,v).spellUntargetable);
    if(c.g72Effect==='Chaser')return enemies.some(x=>!x.tapped)?30:0;
    if(c.g72Effect==='Grudge')return enemies.some(x=>costValue(card(x))<=me.grave.length)?30:0;
    if(c.g72Effect==='Blossom')return me.deckCount>1?me.mana.length<7?35:22:0;
   }
   if(c.type==='spell'&&c.g71Effect){
    if(spellIgnored(v,c))return 0;
    const own=me.battle.filter(x=>isCreature(v,x)&&!x.sealed),enemies=them.battle.filter(x=>isCreature(v,x)&&!x.sealed&&extra.targetable(v,p,1-p,x)&&!effectiveCard(x,v).spellUntargetable),shako=own.some(x=>effectiveCard(x,v).shako);
    if(c.g71Effect==='Critical')return enemies.some(x=>effectiveCard(x,v).blocker)?30:0;
    if(c.g71Effect==='Surf')return me.deckCount>1?(enemies.length?34:own.length?0:25):shako&&(enemies.length||own.some(x=>!effectiveCard(x,v).shako))?90:0;
    if(c.g71Effect==='Strong')return enemies.length?28:0;
    if(c.g71Effect==='Tornado')return enemies.some(x=>power(x,false,v)<=4000)?30:0;
    if(c.g71Effect==='Burst'){const value=xs=>xs.filter(x=>isCreature(v,x)&&!x.sealed&&power(x,false,v)<=2000).reduce((n,x)=>n+aiCost(effectiveCard(x,v))+1,0);return value(them.battle)>value(me.battle)?32:0;}
   }
   if(c.type==='spell'&&(c.g70Role||c.g70Effect)){
    if(spellIgnored(v,c))return 0;
    const enemies=them.battle.filter(x=>isCreature(v,x)&&!x.sealed&&extra.targetable(v,p,1-p,x)&&!effectiveCard(x,v).spellUntargetable),win=me.battle.some(x=>effectiveCard(x,v).shako);
    if(c.g70Role==='spiralCharger')return enemies.length?32:me.mana.length<7&&!me.battle.some(x=>isCreature(v,x)&&!x.sealed)?22:0;
    if(c.g70Effect==='Phantom')return enemies.length?(enemies.some(x=>power(x,false,v)<=2000)?32:them.battle.some(x=>x.tapped)?14:0):0;
    if(c.g70Effect==='Clone')return enemies.length?32:0;
    if(c.g70Effect==='Open')return me.deckCount>1||win?27:0;
    if(c.g70Effect==='Bullet')return them.hand.length?28:0;
    if(c.g70Effect==='Zanzibar'){const knight=me.battle.some(x=>!x.sealed&&String(effectiveCard(x,v).race||'').includes('ナイト'));return enemies.length?(enemies.some(x=>power(x,false,v)<=(knight?4000:2000))?32:enemies.some(x=>x.tapped)?14:0):0;}
    if(c.g70Effect==='Soul')return canMoveZone(v,p,'grave')&&me.grave.some(x=>card(x).type==='creature')?28:0;
    if(c.g70Effect==='Glory')return me.deckCount>1&&!deckLocked(v,p)?27:0;
    if(c.g70Effect==='Panda')return me.deckCount>1?(me.mana.length<7?30:16):0;
    if(c.g70Effect==='Stream')return enemies.length||them.battle.some(x=>card(x).type==='gear'&&extra.targetable(v,p,1-p,x))?32:0;
    if(c.g70Effect==='Critical')return enemies.some(x=>effectiveCard(x,v).blocker)?30:0;
    if(c.g70Effect==='Plus')return me.deckCount>1&&me.shields>0&&canAddShield(v,p)&&!v.players.some(q=>q.battle.some(x=>effectiveCard(x,v).deckRedirect))?18:0;
    if(c.g70Effect==='Chain')return enemies.some(x=>!x.tapped)&&me.battle.some(x=>isCreature(v,x)&&!x.tapped&&!effectiveCard(x,v).noAttack&&(x.entered<v.turn||effectiveCard(x,v).speedAttacker||isEvolution(x)))?26:0;
   }
   if(c.type==='spell'&&(c.g69Role||c.g69Effect)){
    if(spellIgnored(v,c))return 0;
    const win=me.battle.some(x=>effectiveCard(x,v).shako),enemies=them.battle.filter(x=>isCreature(v,x)&&!x.sealed&&extra.targetable(v,p,1-p,x)&&!effectiveCard(x,v).spellUntargetable);
    if(c.g69Effect==='Demon')return enemies.length?32:living(them.battle).some(x=>!x.tapped)&&living(me.battle).some(x=>!x.tapped&&(x.entered<v.turn||effectiveCard(x,v).speedAttacker||isEvolution(x)))?26:0;
    if(c.g69Role==='brain')return me.deckCount>1?me.mana.length<7?30:20:win?80:0;
    if(c.g69Effect==='Spiral')return me.deckCount>2||win||enemies.length?30:0;
    if(c.g69Effect==='Hell')return enemies.some(x=>power(x,false,v)<=8000)?32:0;
    if(c.g69Effect==='Variant')return them.battle.some(x=>isCreature(v,x)&&!x.sealed&&!x.tapped&&(me.mana.length>=7||extra.targetable(v,p,1-p,x)))&&me.battle.some(x=>isCreature(v,x)&&!x.tapped&&!effectiveCard(x,v).noAttack&&(x.entered<v.turn||effectiveCard(x,v).speedAttacker||isEvolution(x)))?26:0;
   }
   if(c.type==='spell'&&(c.g68Role||c.g68Effect)){
    if(spellIgnored(v,c))return 0;
    const win=me.battle.some(x=>effectiveCard(x,v).shako);
    if(c.g68Role==='medicine')return canMoveZone(v,p,'grave')&&me.grave.some(x=>card(x).type==='creature')?26:0;
    if(c.g68Effect==='Cross')return me.deckCount>2?(them.deckCount<=2?80:18):0;
    if(c.g68Effect==='Flame')return me.deckCount>2||win?(win&&me.deckCount<=2?80:me.shields===1&&them.battle.some(x=>isCreature(v,x)&&!effectiveCard(x,v).noAttack)?0:28):-10;
    if(c.g68Effect==='Bakuretsu')return them.battle.some(x=>isCreature(v,x)&&!x.sealed&&extra.targetable(v,p,1-p,x)&&!effectiveCard(x,v).spellUntargetable&&power(x,false,v)<=5000)?30:0;
   }
   if(c.type==='spell'&&(c.g67Role||c.g67Effect)){
    if(spellIgnored(v,c))return 0;
    const win=me.battle.some(x=>effectiveCard(x,v).shako),enemies=them.battle.filter(x=>isCreature(v,x)&&!x.sealed&&extra.targetable(v,p,1-p,x)&&!effectiveCard(x,v).spellUntargetable);
    if(c.g67Role==='grip')return me.deckCount>1?22:win?80:-10;
    if(c.g67Role==='scramble')return me.deckCount>3?27:0;
    if(c.g67Effect==='Zombie')return canMoveZone(v,p,'grave')&&me.grave.some(x=>card(x).type==='creature')?29:0;
    if(c.g67Effect==='Mobius')return me.mana.length<7?23:0;
    if(c.g67Effect==='SuperHand'){const forced=enemies.filter(x=>effectiveCard(x,v).forceTarget),list=forced.length?forced:enemies;return list.some(x=>costValue(effectiveCard(x,v))<me.deckCount)?32:0;}
    if(c.g67Effect==='Castle')return enemies.some(x=>power(x,x.uid===v.attack?.attacker,v)<=3000)?30:enemies.some(x=>!x.tapped)&&me.battle.some(x=>isCreature(v,x)&&!x.tapped&&!effectiveCard(x,v).noAttack&&(x.entered<v.turn||effectiveCard(x,v).speedAttacker||isEvolution(x)))?18:0;
   }
   if(c.type==='spell'&&c.g66Role==='meteor'){
    if(spellIgnored(v,c))return 0;
    const blocker=them.battle.some(x=>isCreature(v,x)&&!x.sealed&&effectiveCard(x,v).blocker&&extra.targetable(v,p,1-p,x));
    return blocker?32:me.mana.length<7?23:0;
   }
   if(c.type==='spell'&&c.g66Role==='spark'){
    if(spellIgnored(v,c))return 0;
    return them.battle.some(x=>isCreature(v,x)&&!x.sealed&&!x.tapped)&&me.battle.some(x=>isCreature(v,x)&&!x.tapped&&!effectiveCard(x,v).noAttack&&(x.entered<v.turn||effectiveCard(x,v).speedAttacker||isEvolution(x)))?25:0;
   }
   if(c.type==='spell'&&c.g66Effect==='Rainbow'){
    if(spellIgnored(v,c))return 0;
    const draw=me.mana.filter(x=>manaColors(card(x),v,p).length>1).length>=2,safe=me.deckCount>2||me.battle.some(x=>effectiveCard(x,v).shako);
    if(draw&&!safe)return -10;
    const tap=them.battle.some(x=>isCreature(v,x)&&!x.tapped&&extra.targetable(v,p,1-p,x))&&me.battle.some(x=>isCreature(v,x)&&!x.tapped&&!effectiveCard(x,v).noAttack&&(x.entered<v.turn||effectiveCard(x,v).speedAttacker||isEvolution(x)));
    return (draw?28:0)+(tap?18:0);
   }
   if(c.type==='spell'&&c.g65Effect){
    if(spellIgnored(v,c))return 0;
    const enemies=them.battle.filter(x=>isCreature(v,x)&&!x.sealed),chosen=enemies.filter(x=>extra.targetable(v,p,1-p,x));
    if(c.g65Effect==='Superburst'){const n=enemies.filter(x=>power(x,x.uid===v.attack?.attacker,v)<=2000).length;return n?24+n*6:0;}
    if(c.g65Effect==='Smash')return chosen.some(x=>civilizations(effectiveCard(x,v)).length<2)?30:0;
    if(c.g65Effect==='CloneLightning')return chosen.some(x=>!x.tapped)&&me.battle.some(x=>isCreature(v,x)&&!x.tapped&&!effectiveCard(x,v).noAttack&&(x.entered<v.turn||effectiveCard(x,v).speedAttacker||isEvolution(x)))?26:0;
   }
   if(c.type==='spell'&&c.effect==='recommended'){
    const role=c.recommendRole;
    if(role==='love')return them.battle.length*14+Math.min(18,them.hand.length*3)+(me.deckCount<5&&me.grave.length>5?60:0);
    if(['dondon','surasura','memory'].includes(role))return me.deckCount>1?28+(them.battle.length?6:0):0;
    if(role==='pixie'||role==='purify')return (me.mana.length<7&&me.deckCount>1?28:3)+(role==='purify'?Math.min(15,them.grave.length*2):0);
    if(role==='dna')return them.battle.filter(x=>!x.tapped).length*12+(me.shields<=2&&me.deckCount>1?15:0);
    if(role==='scrapper')return them.battle.some(x=>isCreature(v,x)&&power(x,false,v)<=5000)?32:0;
    if(role==='chaff')return me.deckCount>1?24+(me.battle.some(x=>!x.tapped)?12:0):5;
   }
   if(c.type==='spell'&&c.g35Role)return me.deckCount>5?24:them.battle.length?15:0;if(c.type==='field')return c.newWorld?40:25;
   if(c.type==='spell'&&String(c.race).includes('魔導具'))return c.effect==='madoBlood'&&me.deckCount<12?50:me.battle.some(x=>effectiveCard(x,v).newWorld)?45:15;
   if(c.type==='gear')return c.doss?34:c.takion?30:26;
   if(c.effect==='samuraiFlash')return me.deckCount>1?24:-5;
   if(c.type==='seed')return 28;
   if(c.type==='creature'&&c.g68Effect==='Wyvern'){
    const value=who=>v.players[who].battle.filter(x=>isCreature(v,x)&&!x.sealed&&effectiveCard(x,v).blocker).reduce((n,x)=>n+aiCost(card(x)),0),enemy=value(1-p),own=value(p);
    return own>enemy?-10:40+enemy-own;
   }
   if(c.type==='creature'&&c.g67School)return them.battle.some(x=>isCreature(v,x)&&!x.sealed)?34:0;
   if(c.type==='creature')return 30+aiCost(c)*2+(aiCost(c)-a.cost)*2+(c.effect==='ramp1'&&me.mana.length<6?12:0)+(c.blocker&&them.battle.length>me.battle.length?8:0)+(c.unblockable?7:0)+(c.speedAttacker?8:0);
   if(c.effect==='bolDuel')return me.deckCount>3?35:0;
   if(c.effect==='bolLoot')return me.deckCount>3&&me.mana.length<10?32:0;
   if(c.effect==='bolLand')return me.deckCount>5?38:0;
   if(c.effect==='bandeRadio')return me.deckCount>1?39:0;
   if(c.effect==='bandeDecision')return me.deckCount>2||me.hand.some(x=>aiCost(card(x))<=3)||them.battle.some(x=>aiCost(card(x))<=6)?38:0;
   if(c.effect==='bandeBalance')return me.battle.some(x=>x.tapped&&canUntap(x))?42:them.battle.length&&me.battle.some(x=>!x.tapped)?18:0;
   if(c.effect==='darknessModes')return them.hand.length||them.battle.length||me.grave.some(x=>isCreature(s,x)&&costValue(card(x))<=4)?30:0;
   if(c.effect==='brainSlash')return me.deckCount>3||me.grave.some(x=>isCreature(s,x)&&costValue(card(x))<=8)?32:0;
   if(c.effect==='fumiModes')return me.deckCount>2||them.battle.length?29:0;
   if(c.effect==='judgeDraw')return me.deckCount>1?(me.mana.length<9?38:16):-5;
   if(c.effect==='discard')return them.hand.length?22:0;
   if(c.effect==='ramp2')return me.mana.length<7?20:1;
   if(c.effect==='ramp1')return me.mana.length<7&&me.deckCount>1?23:1;
   if(c.effect==='dragonRamp2')return me.mana.length<9&&me.deckCount>2?36:1;
   if(c.effect==='searchCreature')return me.hand.filter(x=>isCreature(s,x)).length<2?25:0;
   if(c.effect==='drawUpTo3')return me.deckCount>6?32:0;
   if(c.effect==='draw2')return me.deckCount>2?28:0;
   if(c.effect==='discardAll')return them.hand.length?15+them.hand.length*5:0;
   if(['destroy','manaRemoval'].includes(c.effect))return them.battle.length?28:0;
   if(c.effect==='tapAll')return them.battle.length&&me.battle.some(x=>!x.tapped&&(x.entered<v.turn||effectiveCard(x,v).speedAttacker||isEvolution(x))&&!effectiveCard(x,v).noAttack)?25:0;
   if(c.effect==='bounceSmall')return them.battle.some(x=>aiCost(card(x))<=6)?24:0;
   if(c.effect==='bounce')return them.battle.some(x=>aiCost(card(x))>=3)?24:0;
   if(['tap','tapTwo','teamBuff','buff','unblock'].includes(c.effect))return me.battle.some(x=>!x.tapped&&(x.entered<v.turn||effectiveCard(x,v).speedAttacker||isEvolution(x))&&!effectiveCard(x,v).noAttack)?15:0;
   if(c.effect==='destroySmall')return them.battle.some(x=>power(x,false,v)<=2000)?27:0;
   if(c.effect==='destroyBattleCard3')return them.battle.some(top=>layers(top).some(x=>(x===top?[card(x)]:playFaces(card(x))).some(c=>costValue(c)<=3)))?29:0;
   if(c.effect==='destroyUntapped')return them.battle.some(x=>!x.tapped)?26:0;
   return 1;
  }
  if(a.kind==='declareDDD')return 10;
  if(['skipDDD','skipDDDSummon'].includes(a.kind))return 0;
  if(['evolve','revealEvolve','summonDDD','deployEvolve','triggerEvolve'].includes(a.kind)){const base=a.baseUid?find(p,a.baseUid):null;return 30+aiCost(c)*2+(base&&c.stopSelfEntryAttack?15:0)-(base?.tapped?(a.baseUid===v.attack?.attacker?0:20):0)-(base?aiCost(card(base)):5);}
  if(a.kind==='cancelEvolution')return -1;
  if(a.kind==='toAttack')return 5;
  if(a.kind==='attack'){
   const x=find(p,a.uid);if(effectiveCard(x,v).g76Juggler&&extra.utilityTide.monoWater(v,p)&&me.deckCount<=1&&!me.battle.some(x=>effectiveCard(x,v).shako))return -1000;if(a.target==='player')return 25+(a.exLifeHit?3:0)+(them.shields===0?100:0)+(effectiveCard(x,v).unblockable?8:0)-(effectiveCard(x,v).blocker&&me.shields===0?20:0);
   const y=find(1-p,a.target);if(effectiveCard(y,v).g35Role==='venom')return effectiveCard(x,v).mustAttack?1:-5;if(y.g19Protected||them.shields>=7&&them.battle.some(z=>effectiveCard(z,v).engelsProtect))return effectiveCard(x,v).mustAttack?1:-10;return matchupPower(x,y,true,v)>matchupPower(y,x,false,v)?40+aiCost(card(y)):matchupPower(x,y,true,v)===matchupPower(y,x,false,v)?16:effectiveCard(x,v).mustAttack?1:-10;
  }
  if(a.kind==='endTurn')return 0;
  if(a.kind==='defendMany')return -1;
  if(a.kind==='guardman'){const b=find(p,a.uid),a1=them.battle.find(x=>x.uid===v.attack?.attacker),target=find(p,v.attack?.target);return a1&&matchupPower(b,a1,false,v)>=matchupPower(a1,b,true,v)?50:target&&aiCost(card(target))>aiCost(card(b))?15:-2;}
  if(a.kind==='block'){const b=find(p,a.uid);const attacker=them.battle.find(x=>x.uid===v.attack?.attacker);return(me.shields===0?100:0)+(attacker&&matchupPower(b,attacker,false,v)>=matchupPower(attacker,b,true,v)?50:me.shields<=2?20:-2)-aiCost(card(b))*.1;}
  if(a.kind==='noBlock')return 0;
  if(a.kind==='breakShields')return 1+(a.exLifeHits||0)*2;
  if(a.kind==='judgeCost')return a.cost;
  if(a.kind==='judgeAgain')return v.decision.wins<them.shields?10:-1;
  if(a.kind==='stopJudge')return 0;
  if(a.kind==='judgeBreak')return a.exLifeHit?5:1;
  if(a.kind==='guardShield'){const x=find(p,a.uid),cost=layers(x).slice(1);return 20+Math.max(0,3-me.shields)*15+(a.exLifeHit?5:0)-cost.length-cost.reduce((n,x)=>n+aiCost(card(x)),0)*.2;}
  if(a.kind==='finishShieldGuards')return 0;
  if(a.kind==='orderTrigger')return (c.type==='creature'?35:30)+aiCost(c);
  if(a.kind==='orderEntry'||a.kind==='orderEffect')return aiCost(c)+(c.multiAssault?20:0);
  if(a.kind==='dragonTap'){const x=find(1-p,a.uid);return x.tapped?-1:10+aiCost(c)*2+(effectiveCard(x,v).blocker?12:0);}
  if(a.kind==='skipDragonTap')return 0;
  if(a.kind==='useTrigger')return 30;
  if(a.kind==='skipTrigger')return 0;
  if(a.kind==='draw')return me.deckCount>a.n+2?a.n*10:-a.n;
  if(a.kind==='search')return a.cardId?20-Math.abs(aiCost(card(a.cardId))-me.mana.length)*2+(card(a.cardId).unblockable?3:0):0;
  if(a.kind==='endUntap')return a.yes?10:0;
  if(a.kind==='fight'){
   const own=find(p,a.uid),target=find(1-p,a.target),ap=power(own,own.uid===v.attack?.attacker,v),bp=power(target,target.uid===v.attack?.attacker,v);
   return ap>bp?25+aiCost(c)*3-(c.slayer?aiCost(card(own))*4:0):ap===bp?aiCost(c)*3-aiCost(card(own))*3:-20;
  }
  if(a.kind==='skipFight'||a.kind==='battleWinOrder')return 0;
  if(a.kind==='useRamp')return me.deckCount>4&&me.mana.length<11?20:-1;
  if(a.kind==='skipRamp')return 0;
  if(a.kind==='manaTop'){
   const x=me.mana.find(x=>x.uid===a.uid),others=me.mana.filter(x=>x.uid!==a.uid),lostColors=manaCivilizations(c).filter(color=>!others.some(y=>manaCivilizations(card(y)).includes(color))).length;
   return(x.tapped?15:0)-lostColors*18+(c.type==='creature'&&aiCost(c)<=me.mana.length?10:0)-(me.hand.some(y=>y.cardId===c.id)?8:0);
  }
  if(a.kind==='effect')return a.targets.reduce((sum,t)=>{const top=v.players[t.player].battle.find(x=>layers(x).some(y=>y.uid===t.uid)),x=top&&layers(top).find(x=>x.uid===t.uid);if(!x)return sum;const e=v.decision.effect;if(['buff','unblock'].includes(e))return sum+(t.player===p&&!x.tapped&&(x.entered<v.turn||effectiveCard(x,v).speedAttacker||isEvolution(x))?20:0)+aiCost(card(x));if(['bounce','bounceOptional','bounceSmall','bounceBlockers'].includes(e)&&t.player===p)return sum-20;return sum+aiCost(card(x))*3+(effectiveCard(x,v).blocker?8:0);},0);
  return 0;
 };
 return acts.map(a=>({a,value:score(a)})).sort((a,b)=>b.value-a.value||a.a.id-b.a.id);
}
// Retained as a reproducible benchmark baseline; the app always uses chooseAI.
export const chooseHeuristicAI=s=>rankHeuristicActions(s)[0]?.a??null;
export function chooseAI(s){
 if(s.decision?.type==='manaPayment'){const d=s.decision,actions=getLegalActions(s),target=manaPayment(d.pool,{cost:d.cost,civilizations:d.colors})||[],remove=d.selected.find(uid=>!target.includes(uid)),add=target.find(uid=>!d.selected.includes(uid));return actions.find(a=>a.kind==='selectMana'&&a.uid===(remove||add))||actions.find(a=>a.kind==='confirmMana')||actions[0];}
 return strategicAI.choose(s);
}
export function runGame(decks,options={}){const s=createGame(decks,options);while(s.winner===null&&s.actions<2500&&s.turn<160){const a=chooseAI(s);if(!a)break;step(s,a);}return s;}
export function runSummary(s){return {seed:s.seed,first:s.first,winner:s.winner,reason:s.reason,turns:s.turn,metrics:s.metrics,actions:s.actions,version:s.version,aiVersion:AI_VERSION};}
export function aggregate(games){
 const total=games.length,wins=games.filter(g=>g.winner===0).length,losses=games.filter(g=>g.winner===1).length,unresolved=total-wins-losses,completed=wins+losses;
 const rate=completed?wins/completed:0,z=1.96,den=1+z*z/(completed||1),center=(rate+z*z/(2*(completed||1)))/den,half=z*Math.sqrt(rate*(1-rate)/(completed||1)+z*z/(4*(completed||1)**2))/den;
 const groups=[0,1].map(first=>{const gs=games.filter(g=>g.first===first&&g.winner!==null);return {count:gs.length,wins:gs.filter(g=>g.winner===0).length};});
 const cards={};for(const g of games){if(g.winner===null)continue;for(const id of Object.keys(g.metrics[0].earlyPlayed)){const x=cards[id]||={count:0,wins:0};x.count++;if(g.winner===0)x.wins++;}}
 return {total,wins,losses,unresolved,completed,rate,interval:completed?[Math.max(0,center-half),Math.min(1,center+half)]:null,groups,averageTurns:completed?games.filter(g=>g.winner!==null).reduce((n,g)=>n+g.turns,0)/completed:0,earlyCreatures:games.filter(g=>g.metrics[0].firstCreature!==null&&g.metrics[0].firstCreature<=3).length,cards};
}

function powerCleanup(s){if(s.g25DeployBatch||s.g32DeployBatch||s.g34DeployBatch||s.lossEvent)return;if(s.winner===null)extra.utilityTop.flush(s);if(s.winner!==null||s.leaving||s.decision)return;for(const p of[0,1])if(!s.players[p].deck.length){deckCheck(s,p);if(s.winner!==null||s.lossEvent)return;}const bad=[0,1].flatMap(player=>s.players[player].battle.filter(x=>isCreature(s,x)&&power(x,false,s)<=0&&!extra.six.zeroSafe(s,x)&&extra.canLeave(s,player,x)).map(x=>({player,uid:x.uid,to:'grave',stateBased:true})));if(bad.length)moveCreatures(s,bad);}
const extra=createExtendedRules({canAddTurn:(s,p)=>extra.seed.canAddTurn(s,p),canMoveZone,lookCount,lookPublic,recordLastPower,leaving:(...args)=>extra.leaving(...args),evolutionBase:(...args)=>extra.evolutionBase(...args),canLeave:(...args)=>extra.canLeave(...args),canAddShield,replaceLossBaku(s,p,uid){const event=s.lossEvent,x=s.players[p].battle.find(x=>x.uid===uid);if(!event||event.loser!==p||!x||!extra.canLeave(s,p,x))throw Error('敗北置換を適用できません');const snapshot=extra.leaveSnapshot(s,[{player:p,uid}]),all=layers(x);extra.leaving(s,p,x,false,snapshot,'mana',false);remove(s.players[p].battle,uid);for(const y of all)clearBattleState(y,'mana');addZone(s,p,'mana',...all);delete s.lossEvent;s.decision=event.resume;},castShieldSpell,finishShieldSpell,withAbilitySource,allCards:()=>[...catalogue.values()],isEvolution,completeExecution,canReplaceExecution,replaceExecutionCard,ultraBases,matchesEvolution,notifyShieldAdded:(s,p,x)=>extra.shieldAdded(s,p,x),effectActor,withEffect,extremeProtected:(s,p)=>!!s.g26Extreme?.[p],saintBreak(s,p,uid,context){s.breakContext={...context,g26SaintUsed:true,replacementBreak:true};commitShieldBreak(s,p,[uid]);},deckLocked,shuffleLibrary,entryAbilities,allLayers:layers,seal,moveSeal,visibleBattleCards,addZone,attachMugenBases,moveBattleCard,resolveSpell,isSpellResolution:s=>!!s.resolvingSpell||!!s.extSpells?.length,wouldEnterCreature:(s,p,c)=>c.type==='creature'&&(!c.natureAce4||genmuActive(s)||natureElements(s,p)+1>=4),shieldCards,shieldGroup,findShield,removeShieldCard,moveShield,addShieldCard,sendBattleCardToShield,skipTurn,resolveEntry,copySource,takeTop:takeDeckTop,resolveEffect:doEffect,resolveAttack,peekTop:peekDeckTop,finishCharger,pay,manaRedirect:(s,p)=>extra.manaRedirect(s,p),destroyReplacementCards,completeLossReplacement,replaceJohnnyHandLoss,manaMoveForbidden:shevaProtection,card,faces:playFaces,cost:costValue,colors:civilizations,effective:effectiveCard,power,layers:x=>x.sealed?[]:layers(x),draw,mill,move:moveCreatures,enter:enterCreature,cast:playCard,remove,removeShield,clear:clearBattleState,enqueue:enqueueEffect,log,random,canEnter:canEnterCreature,canCast:canCastSpell,evolutionBases,battle,tap:tapCard,selfStopped:selfTriggersStopped,ignored:abilitiesIgnored,spellIgnored,deckRedirect,shieldTop,canPay:validMana,summonCost,shuffled,manaColors,deckCheck,finish,isCreature,castBattleSpell,breakShields,interruptBreak,canUntap,singleJudge:(s,p,source,uid,onWin)=>startJudge(s,p,source,uid,'single',onWin),replaceLoss,replaceHandLoss,declineLoss,payDeferred(s,p,n,civ){const ids=paymentIds(s,p,{cost:n,civilizations:[civ]},[],true);if(!ids)return false;tapPayment(s,p,ids);return true;},shieldHand:(s,p,x)=>extra.shieldHand(s,p,x),defenseOptions,defend,handMana:(s,p,x)=>extra.handMana(s,p,x)});
const strategicAI=createStrategicAI({blockersFor:(s,p,x)=>defenseOptions({...s,active:1-p,attack:{attacker:x.uid,target:'player',player:1-p}},p).filter(a=>a.kind==='block').map(a=>a.uid),directAttackProtected:(s,p)=>extra.noLose({...s,attack:{player:1-p,target:"player"}},p,'directAttack'),canAttack,canAttackPlayer,canUntap,card,faces:playFaces,effective:effectiveCard,power,isCreature,summonCost,legal:getLegalActions,step:(s,a)=>{aiPlanningDepth++;try{return step(s,a);}finally{aiPlanningDepth--;}},rank:rankHeuristicActions,observe:observation,colors:manaCivilizations,mark:s=>aiProjections.add(s)});
export const analyzeAI=s=>strategicAI.analyze(s);
