// Build-time only: accept complete clauses, never infer support from a keyword substring.
// The resulting definitions are pinned and checked against the official pages before release.
const colors=['光','水','闇','火','自然'];
const aliasNames=new Set(['炎のたてがみ(バーニング・ヘアー)','青銅の鎧(ブロンズ・アーム・トライブ)','無敵の咆哮(マイティ・シャウター)','紅玉草(ルビー・グラス)','ワ・タンポ－ポ・タンク']);
const normalize=s=>s.normalize('NFKC').replace(/\s|■/g,'').replaceAll('、','');
const keyword=(line,name)=>new RegExp('^(?:'+name+'){1,2}(?:\\([^()]*\\))?$').test(line);
const flags={
 'ブロッカー':'blocker','スピードアタッカー':'speedAttacker','スレイヤー':'slayer',
 'マッハファイター':'machFighter','ガードマン':'guardman','エスケープ':'escape',
 'ジャストダイバー':'justDiver','パワード・ブレイカー':'poweredBreaker','EXライフ':'exLife',
 'S・トリガー':'trigger'
};
function instruction(text,phase){
 let m;
 if(phase>=166){
  if(text==='相手のクリーチャーをすべてタップする。')return{op:'TapAll'};
  if(m=text.match(/^相手の(?:パワー(\d+)以下の)?クリーチャーを1体(?:選び|選んで)?タップする。$/))return{op:'Target',tap:true,...(m[1]?{filter:{maxPower:+m[1]}}:{})};
  if(m=text.match(/^相手の(?:パワー(\d+)以下の)?クリーチャーを1体破壊する。$/))return{op:'Target',to:'grave',...(m[1]?{filter:{maxPower:+m[1]}}:{})};
  if(/^相手の「ブロッカー」を持つクリーチャーを1体(?:選び)?破壊する。$/.test(text))return{op:'Target',to:'grave',filter:{blocker:true}};
  if(m=text.match(/^相手のアンタップしているクリーチャーを1体選び持ち主の(手札に戻す|マナゾーンに置く)。$/))return{op:'Target',to:m[1]==='手札に戻す'?'hand':'mana',filter:{untapped:true}};
  if(m=text.match(/^カードを1枚自分の(マナゾーン|墓地)から手札に戻(す|してもよい)。$/))return{op:'Select',origin:m[1]==='マナゾーン'?'mana':'grave',to:'hand',n:1,...(/てもよい/.test(text)?{optional:true}:{})};
 }
 if(m=text.match(/^カードを([1-9]\d*)枚(まで)?引(く|いてもよい)。$/)){const task={op:m[2]?'DrawUpTo':'Draw',n:+m[1]};return !m[2]&&/てもよい/.test(text)?{op:'Offer',defs:[task]}:task;}
 if(m=text.match(/^自分の山札の上から([1-9]\d*)枚(?:目)?をマナゾーンに置(く|いてもよい)。$/)){const task={op:'Ramp',n:+m[1]};return /てもよい/.test(text)?{op:'Offer',defs:[task]}:task;}
 if(m=text.match(/^自分の山札の上から([1-9]\d*)枚(?:目)?を墓地に置(く|いてもよい)。$/))return{op:'Mill',n:+m[1],...(/てもよい/.test(text)?{optional:true}:{})};
 if(m=text.match(/^相手の(?:パワー(\d+)以下の)?クリーチャーを1体(?:選び|選んで)(破壊する|持ち主の手札に戻す|持ち主のマナゾーンに置く)。$/))return{op:'Target',to:m[2]==='破壊する'?'grave':m[2]==='持ち主の手札に戻す'?'hand':'mana',...(m[1]?{filter:{maxPower:+m[1]}}:{})};
 if(m=text.match(/^相手の手札を([1-9]\d*)枚見ないで選び捨てさせる。$/))return{op:'Discard',n:+m[1],random:true};
 if(m=text.match(/^クリーチャーを1体自分の墓地から手札に戻(す|してもよい)。$/))return{op:'Select',origin:'grave',to:'hand',n:1,filter:{creature:true},...(/てもよい/.test(text)?{optional:true}:{})};
 return null;
}
export function standardCardSpec(d,{phase=165}={}){
 const f=d?.faces?.[0];
 if(aliasNames.has(d?.name))throw Error('既存名の別表記');
 if(d?.status!=='complete'||d.faces.length!==1||!['クリーチャー','進化クリーチャー','タマシード','呪文',...(phase>=166?['NEOクリーチャー']:[])].includes(f.typeText))throw Error('複数面・特殊カードタイプまたは情報不足');
 if(!Number.isInteger(f.cost)||f.cost<1||!f.civilizations.length||f.civilizations.some(c=>!colors.includes(c)&&c!=='無色')||new Set(f.civilizations).size!==f.civilizations.length)throw Error('コスト・文明の個別処理が必要');
 if(f.civilizations.includes('無色')&&f.civilizations.length!==1)throw Error('無色の複合文明');
 const creature=f.typeText.includes('クリーチャー'),evolution=f.typeText==='進化クリーチャー',seed=f.typeText==='タマシード';
 if(creature&&!/^\d+\+?$/.test(f.powerText))throw Error('特殊なパワー');
 const spec={},entry=[],attack=[];let powerBonus=false;
 for(const raw of f.abilityText.split('\n').filter(s=>s.trim())){
  const line=normalize(raw);let m,known=false;
  if(phase>=166){
   if(creature&&keyword(line,'ハンティング')){spec.g166Hunting=true;powerBonus=true;continue;}
   if(seed&&keyword(line,'シンカライズ')){spec.shinkalize=true;continue;}
   if(keyword(line,'S\\(シールド\\)・トリガー')){spec.trigger=true;continue;}
   if(creature&&['自分のターンの終わりにこのクリーチャーをアンタップする。','自分のターンの終わりにこのクリーチャーをアンタップする','自分のターンが終わる時このクリーチャーをアンタップする。'].includes(line)){spec.g166EndUntap=true;continue;}
   if(creature&&['このクリーチャーは可能であれば毎ターン攻撃する。','このクリーチャーは可能なら毎ターン攻撃する。'].includes(line)){spec.mustAttack=true;continue;}
   if(creature&&['このクリーチャーが破壊される時墓地に置くかわりに手札に戻す。','このクリーチャーが破壊される時墓地に置くかわりにマナゾーンに置く。'].includes(line)){spec[line.includes('マナゾーン')?'destroyToMana':'destroyToHand']=true;continue;}
   if(creature&&/^このクリーチャーは相手に選ばれない。(?:\(ただしこのクリーチャーを攻撃またはブロックしてもよい\))?$/.test(line)){spec.untargetable=true;continue;}
   if(f.typeText==='NEOクリーチャー'&&(m=line.match(/^NEO進化:(?:自分の)?((?:光|水|闇|火|自然)(?:(?:または)?(?:光|水|闇|火|自然)){0,2})のクリーチャー1体の上に置いてもよい。(?:\([^()]*\))?$/))){const cs=m[1].match(/光|水|闇|火|自然/g);if(new Set(cs).size!==cs.length||spec.neoEvolution)throw Error('NEO進化条件の重複');spec.neoEvolution={any:cs.map(civilization=>({civilization}))};continue;}
   if(f.typeText==='NEOクリーチャー'&&/^NEO進化:自分のジョーカーズ(?:・クリーチャー)?1体の上に置いてもよい。(?:\([^()]*\))?$/.test(line)){if(spec.neoEvolution)throw Error('NEO進化条件の重複');spec.neoEvolution={any:[{race:'ジョーカーズ'}]};continue;}
   if(f.typeText==='NEOクリーチャー'&&/^NEO進化:自分のクリーチャー1体の上に置いてもよい。(?:\([^()]*\))?$/.test(line)){if(spec.neoEvolution)throw Error('NEO進化条件の重複');spec.neoEvolution={any:[{creature:true}]};continue;}
  }
  for(const [word,flag]of Object.entries(flags))if(keyword(line,word)){spec[flag]=true;known=true;break;}
  if(known)continue;
  if(keyword(line,'\\{GS\\}G・ストライク')){spec.gStrike=true;continue;}
  if(line==='マナゾーンに置く時このカードはタップして置く。'&&f.civilizations.length>1)continue;
  if(keyword(line,'W・ブレイカー')||keyword(line,'W\\(ダブル\\)・ブレイカー')){if(spec.breaker)throw Error('重複ブレイカー');spec.breaker=2;continue;}
  if(keyword(line,'T・ブレイカー')||keyword(line,'T\\(トリプル\\)・ブレイカー')){if(spec.breaker)throw Error('重複ブレイカー');spec.breaker=3;continue;}
  if(keyword(line,'Q・ブレイカー')){if(spec.breaker)throw Error('重複ブレイカー');spec.breaker=4;continue;}
  if(keyword(line,'ワールド・ブレイカー')){if(spec.breaker)throw Error('重複ブレイカー');spec.breaker='∞';spec.worldBreaker=true;continue;}
  if(m=line.match(/^パワーアタッカー\+(\d+)(?:\([^()]*\))?$/)){if(powerBonus)throw Error('重複パワー修整');spec.attackBonus=+m[1];powerBonus=true;continue;}
  if(m=line.match(/^ササゲール([1-4])(?:\([^()]*\))?$/)){if(spec.sasage)throw Error('重複ササゲール');spec.sasage=+m[1];continue;}
  if(seed&&(line==='シンカライズ'||line==='シンカライズ:このタマシードがクリーチャーであるかのようにこの上に進化クリーチャーを置いてもよい。')){spec.shinkalize=true;continue;}
  const staticFlags={
   'このクリーチャーは相手プレイヤーを攻撃できない。':'noPlayerAttack',
   'このクリーチャーは相手プレイヤーを攻撃することができない。':'noPlayerAttack',
   'このクリーチャーは攻撃できない。':'noAttack','このクリーチャーは攻撃することができない。':'noAttack',
   'このクリーチャーはブロックされない。':'unblockable','このクリーチャーは攻撃されない。':'cannotBeAttacked',
   'このクリーチャーはタップされていないクリーチャーを攻撃できる。':'attackUntapped',
   'このクリーチャーはアンタップしているクリーチャーを攻撃できる。':'attackUntapped',
   'このクリーチャーは毎ターン攻撃しなければならない。':'mustAttack',
   '自分のターンの終わりにこのクリーチャーをアンタップしてもよい。':'endUntap',
   'このクリーチャーが破壊される時墓地に置くかわりに自分のマナゾーンに置く。':'destroyToMana',
   'このクリーチャーが破壊される時墓地に置くかわりに自分の手札に戻す。':'destroyToHand',
   'このクリーチャーを自分のマナゾーンから召喚してもよい。':'manaSummon'
  };
  if(creature&&staticFlags[line]){spec[staticFlags[line]]=true;continue;}
  if(!creature&&!seed&&keyword(line,'チャージャー')){spec.normalCharger=true;continue;}
  // Single-body race/civilization evolution only. Complex evolution rules stay pending.
  if(evolution&&(m=line.match(/^進化[-―−:]自分の([^。/]+)1体の上に置く。$/))){if(spec.evolution)throw Error('重複進化条件');const q=m[1];if(q.endsWith('のクリーチャー')&&colors.includes(q.slice(0,-7)))spec.evolution={civilization:q.slice(0,-7)};else if(!/[、または以上以下枚体]|クリーチャー/.test(q))spec.evolution={race:q};else throw Error('複雑な進化条件');continue;}
  let body=line,dest=entry;
  if(creature||seed){const trigger=line.match(/^(?:このクリーチャー|このタマシード)(?:が(?:バトルゾーンに)?出た時|をバトルゾーンに出した時)(.+)$/);const atk=creature&&line.match(/^このクリーチャーが攻撃する時(.+)$/);if(trigger)body=trigger[1];else if(atk){body=atk[1];dest=attack;}else throw Error('未対応の能力文: '+raw);if(dest.length)throw Error('独立した誘発能力の順序対応が必要');}
  const parts=body.split('その後').filter(Boolean),tasks=parts.map(text=>instruction(text,phase));if(tasks.some(t=>!t)||!tasks.length)throw Error('未対応の能力文: '+raw);dest.push(...tasks);
 }
 if(f.typeText==='NEOクリーチャー'&&(!spec.neoEvolution||spec.exLife))throw Error('未対応のNEO進化条件');
 if(evolution&&(!spec.evolution||spec.exLife||spec.trigger))throw Error('特殊進化または進化条件の不足');
 if(creature&&f.powerText.endsWith('+')&&!powerBonus)throw Error('未実装の可変パワー');
 if(!creature&&!seed&&!entry.length)throw Error('呪文の効果がありません');
 if(entry.length){spec.effect='sixPhoto';spec.g34Tasks=entry;}
 if(attack.length)spec.g34Attack=attack;
 if(f.civilizations.length===5)spec.manaValue=0;
 return spec;
}
