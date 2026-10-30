// Build-time only: accept complete clauses, never infer support from a keyword substring.
// The resulting definitions are pinned and checked against the official pages before release.
const colors=['光','水','闇','火','自然'];
const aliasNames=new Set(['炎のたてがみ(バーニング・ヘアー)','青銅の鎧(ブロンズ・アーム・トライブ)','無敵の咆哮(マイティ・シャウター)','紅玉草(ルビー・グラス)','ワ・タンポ－ポ・タンク','【問２】ノロン&#x2934','怪力の化身(マイティ・トーテム)']);
const normalize=s=>s.normalize('NFKC').replace(/\s|■/g,'').replaceAll('、','');
const keyword=(line,name)=>new RegExp('^(?:'+name+'){1,2}(?:\\([^()]*\\))?$').test(line);
const clauses=(body,phase)=>phase>=201&&search201(body)||phase>=200&&look200(body)||phase>=197&&mana197(body,phase)||phase>=185&&lookSpec(body)?[body]:(phase>=181?(phase>=184?body.replace(/^自分の手札を([1-9]\d*)枚捨て(?!る)(?:その後)?/,'自分の手札を$1枚捨てる。その後'):body).replace(/^カードを([1-9]\d*)枚引き(?:その後)?/,'カードを$1枚引く。その後'):body).split('その後').filter(Boolean);
const flags={
 'ブロッカー':'blocker','スピードアタッカー':'speedAttacker','スレイヤー':'slayer',
 'マッハファイター':'machFighter','ガードマン':'guardman','エスケープ':'escape',
 'ジャストダイバー':'justDiver','パワード・ブレイカー':'poweredBreaker','EXライフ':'exLife',
 'S・トリガー':'trigger'
};
function countDiscount212(line){
 const head=line.match(/^(?:このクリーチャーの召喚コストを|このクリーチャーを召喚するコストは)(.+?)(?:1枚|1体)につき([12])少なく(?:する|なる)。ただしコストは(?:0以下(?:には|に)は?ならない|1より少なくならない)。$/),tail=line.match(/^(.+?)(?:1枚|1体)につき(?:このクリーチャーの召喚コスト(?:を|は)|このクリーチャーを召喚するコストは)([12])少なく(?:する|なる)。ただしコストは(?:0以下(?:には|に)は?ならない|1より少なくならない)。$/),m=head||tail;if(!m)return null;
 const targets={'自分のマナゾーンにあるクリーチャー':{zone:'mana',filter:{creature:true}},'自分の墓地にあるクリーチャー':{zone:'grave',filter:{creature:true}},'自分の墓地にあるガーディアン':{zone:'grave',filter:{creature:true,race:'ガーディアン'}},'自分の墓地の進化クリーチャー':{zone:'grave',filter:{creature:true,evolution:true}},'バトルゾーンにある相手のクリーチャー':{zone:'battle',owner:'opponent',filter:{creature:true}},'相手のタップしているクリーチャー':{zone:'battle',owner:'opponent',filter:{creature:true,tapped:true}},'相手の墓地にある呪文':{zone:'grave',owner:'opponent',filter:{spell:true}}};
 return targets[m[1]]?{...targets[m[1]],amount:Number(m[2])}:null;
}
function sympathy211(line){
 const m=line.match(/^(ダブル・)?シンパシー:(.+?)\((?:このクリーチャーを召喚する時支払うコストは|このクリーチャーの召喚コストを|この呪文を唱える時支払うコストは|この呪文を唱えるコストは)(?:バトルゾーンにある)?自分の(.+?)(?:1体|1つ)につき([12])少なく(?:なる|する)。ただしコストは(?:0以下(?:には|に)は?ならない|1より少なくならない)\)$/);
 if(!m||Number(m[4])!==(m[1]?2:1))return null;
 const filters={"クリーチャー":{creature:true},"水のクリーチャー":{creature:true,color:"水"},"光のコスト3以下のクリーチャー":{creature:true,color:"光",max:3},"リキッド・ピープル":{creature:true,race:"リキッド・ピープル"},"ヒューマノイド":{creature:true,race:"ヒューマノイド"},"ドリームメイトまたはビークル・ビー":{creature:true,raceAny:["ドリームメイト","ビークル・ビー"]},"グレートメカオーまたはキカイヒーロー":{creature:true,raceAny:["グレートメカオー","キカイヒーロー"]},"パワー12000以上のクリーチャー":{creature:true,minPower:12000,g199Power:true},"タマシード":{seed:true}};
 const title=m[2].replace(/と|および/g,"または");if(title!==m[3]||!filters[m[3]])return null;
 return{amount:Number(m[4]),filter:filters[m[3]]};
}
function lookSpec(text){
 const m=text.match(/^自分の山札の上から([1-9]\d*)枚を見る。(?:その中から|そのうちの)(?:(.+?)を)?1(枚|体)(?:を)?(?:選び)?(?:(?:相手に)?(?:見せてから|見せ)|表向きにし)?(?:自分の)?手札に加え(てもよい。|る。|)(?:その後)?残りを好きな順序で(?:自分の)?山札の(?:一番)?下に置く。$/);if(!m)return null;
 const filters={'呪文':{spell:true},'呪文またはオーラ':{any:[{spell:true},{aura:true}]},'クリーチャー':{creature:true},'自然のクリーチャー':{creature:true,color:'自然'},'多色クリーチャー':{creature:true,multi:true},'進化クリーチャー':{creature:true,evolution:true},'タマシード':{seed:true},'コスト1のカード':{exactCost:1},'ジョーカーズ':{race:'ジョーカーズ'},'レクスターズ':{race:'レクスターズ'},'ファイアー・バード':{race:'ファイアー・バード'}};
 if(m[2]&&!filters[m[2]])return null;const filter=structuredClone(filters[m[2]]||{});if(m[3]==='体')filter.creature=true;
 return{op:'Look',g185Search:true,n:+m[1],rest:'bottom',stages:[{n:1,to:'hand',...(Object.keys(filter).length?{filter,reveal:true}:{}),...(m[4]==='てもよい。'?{optional:true}:{})}]};
}
function search201(text){
 if(text==='自分の山札を見る。その中から好きな枚数のカードを選び相手に見せてから自分の手札に加えてもよい。その後山札をシャッフルする。')return{op:'Look',g201Search:true,g200Search:true,n:'all',rest:'shuffle',stages:[{n:'all',to:'hand',reveal:true,optional:true}]};
 const m=text.match(/^自分の山札を見る。その中から(.+?)を(1枚|1体)(?:選び|選んで)?(?:相手に)?(見せてから|見せ|表向きにし)?(?:自分の)?手札に加え(てもよい|てよい|る)。(?:その後)?山札をシャッフルする。$/);if(!m)return null;
 const filters={'怪力の化身':{g201ExactName:'怪力の化身'},'カード':{},'クリーチャー':{creature:true},'呪文':{spell:true},'クロスギア':{g201Gear:true},'水のカード':{anyFaceColor:'水'},'火のカード':{anyFaceColor:'火'},'自然のカード':{anyFaceColor:'自然'},'光のカード':{anyFaceColor:'光'},'闇のカード':{anyFaceColor:'闇'},'ファイアー・バード':{race:'ファイアー・バード'},'ドラゴン':{race:'ドラゴン'},'ゴッド':{race:'ゴッド'}};
 const exact=m[1].match(/^《([^《》]+)》$/),filter=exact?{g201ExactName:exact[1]}:structuredClone(filters[m[1]]);if(!filter)return null;if(m[2]==='1体')filter.creature=true;
 return{op:'Look',g201Search:true,g200Search:true,n:'all',rest:'shuffle',stages:[{n:1,to:'hand',...(Object.keys(filter).length?{filter}:{}),...(m[3]?{reveal:true}:{}),...(m[4]!=='る'?{optional:true}:{})}]};
}
function look200(text){
 let m;
 if(m=text.match(/^自分の山札の上から2枚を(?:見る。|見て)(?:そのうちの|その中から)1枚を(?:自分の)?(墓地|山札の一番下)に置く。$/))return{op:'Look',g200Search:true,n:2,rest:'top',stages:[{n:1,to:m[1]==='墓地'?'grave':'deck'}]};
 if(m=text.match(/^自分の山札の上から2枚を見る。(?:その中から|そのうちの)1枚を(?:自分の)?手札に加えもう1枚を(?:自分の)?(墓地|マナゾーン)に置く。$/))return{op:'Look',g200Search:true,n:2,rest:m[1]==='墓地'?'grave':'mana',stages:[{n:1,to:'hand'}]};
 if(/^自分の山札の上から3枚を見る。その中から好きな枚数の無色カードを相手に見せ自分の手札に加えてもよい。それ以外のカードを好きな順序で自分の山札の一番下に置く。$/.test(text))return{op:'Look',g200Search:true,n:3,rest:'bottom',stages:[{n:'all',to:'hand',filter:{g200Colorless:true},reveal:true,optional:true}]};
 return null;
}
function mana197(text,phase){
 const h=text.match(/^マナ武装([1-9]\d*)[:―-](.+)$/);if(!h)return null;const trigger=h[2].match(/^(?:このクリーチャーが(?:バトルゾーンに)?出た時|このクリーチャーをバトルゾーンに出した時|このクリーチャーが攻撃する時|このクリーチャーが破壊された時)(.+)$/),body=trigger?trigger[1]:h[2],m=body.match(/^自分のマナゾーンに(?:(光|水|闇|火|自然)のカード|(多色カード))が([1-9]\d*)枚以上あれば(.+)$/);if(!m||+h[1]!==+m[3])return null;const defs=clauses(m[4],phase).map(q=>instruction(q,phase));if(!defs.length||defs.some(d=>!d))return null;return{event:trigger?(h[2].startsWith('このクリーチャーが攻撃')?'attack':h[2].startsWith('このクリーチャーが破壊')?'death':'entry'):null,task:{op:'IfMana',n:+m[3],...(m[1]?{color:m[1]}:{multi:true}),defs}};
}
function count203(text){
 let m;
 if(text==='自分の墓地にある呪文1枚につきカードを1枚引く。')return{op:'CountDraw',zone:'grave',filter:{spell:true}};
 if(m=text.match(/^自分のマナゾーンにある(ドラゴン1体|無色カード1枚|多色カード1枚)につきカードを1枚引(く|いてもよい)。$/))return{op:'CountDraw',zone:'mana',filter:m[1]==='ドラゴン1体'?{race:'ドラゴン'}:m[1]==='無色カード1枚'?{g200Colorless:true}:{multi:true},...(m[2]!=='く'?{optional:'each'}:{})};
 if(m=text.match(/^(?:バトルゾーンにある)?(自分|相手)の(タップ(?:している|されている)クリーチャー|ジョーカーズ|ドラゴン|サイバー|コマンド|コスト4以下のクリーチャー)1体につき(?:カードを1枚|1枚カードを)引(く|いてもよい)。$/)){const f=m[2].startsWith('タップ')?{tapped:true}:m[2].startsWith('コスト')?{max:4}:{race:m[2]};return{op:'CountDraw',zone:'battle',...(m[1]==='相手'?{owner:'opponent'}:{}),filter:{creature:true,...f},...(m[3]!=='く'?{optional:'each'}:{})};}
 if(text==='自分のマナゾーンにあるカードの数と同じ枚数のカードを引く。')return{op:'CountDraw',zone:'mana'};
 if(text==='自分の手札を数える。それと同じ枚数のカードを引いてもよい。')return{op:'CountDraw',zone:'hand',optional:'all'};
 if(text==='バトルゾーンにある相手のクリーチャーと同じ枚数のカードを引いてよい。')return{op:'CountDraw',zone:'battle',owner:'opponent',filter:{creature:true},optional:'all'};
 return null;
}
function aura205(text){
 const line=text.replace(/^このクリーチャーがバトルゾーンにある間/,'');
 const m=line.match(/^(?:(自分|相手)のターン中)?(?:バトルゾーンにある)?(自分の)?(他の)?(.+?)(?:すべて)?のパワー(?:を|は)(?:それぞれ)?\+([1-9]\d*)(?:する|される)。$/);if(!m)return null;
 const filters={'クリーチャー':{},'進化クリーチャー':{evolution:true},'光のクリーチャー':{color:'光'},'闇のクリーチャー':{color:'闇'},'自然のクリーチャー':{color:'自然'},'光と闇のクリーチャー':{any:[{color:'光'},{color:'闇'}]},'光と火のクリーチャー':{any:[{color:'光'},{color:'火'}]},'ガーディアンとワイルド・ベジーズ':{raceAny:['ガーディアン','ワイルド・ベジーズ']},'スリヴァーとサバイバー':{raceAny:['スリヴァー','サバイバー']}};
 for(const race of['グランセクト','サイバーロード','エイリアン','ガーディアン','アーマード・ドラゴン','ティラノ・ドレイク','ダイナモ'])filters[race]={race};
 const filter=filters[m[4]];if(!filter)return null;return{power:+m[5],filter:{creature:true,...filter},...(m[1]?{turn:m[1]==='自分'?'own':'opponent'}:{}),...(!m[2]?{both:true}:{}),...(m[3]?{other:true}:{})};
}
function countPower207(text){
 let line=text,condition={};
 if(line.startsWith('これが進化クリーチャーなら')){condition.evolution=true;line=line.slice('これが進化クリーチャーなら'.length);}
 for(const [prefix,value]of [['攻撃中',{attackOnly:true}],['自分のターン中',{turn:'own'}],['相手のターン中',{turn:'opponent'}]])if(line.startsWith(prefix)){condition={...condition,...value};line=line.slice(prefix.length);break;}
 line=line.replace(/^(?:このクリーチャーがバトルゾーンにある間|バトルゾーンにある間)/,'');
 const first=line.match(/^(.+?)(?:1枚|1体|1つ)につきこのクリーチャーのパワー(?:を|は)\+([1-9]\d*)(?:する|される)。$/),last=line.match(/^このクリーチャーのパワー(?:を|は)(.+?)(?:1枚|1体|1つ)につき\+([1-9]\d*)(?:する|される)。(?:\(パワー0以下のクリーチャーは破壊される\))?$/),m=first||last;
 if(!m)return null;const target=m[1];let count;
 if(/^(?:自分の手札(?:にある)?(?:のカード|カード)?|すべてのプレイヤーの手札)$/.test(target))count={zone:'hand',...(target.startsWith('すべて')?{both:true}:{})};
 if(/^(?:自分の墓地(?:にある|の)カード|すべての墓地にあるカード)$/.test(target))count={zone:'grave',...(target.startsWith('すべて')?{both:true}:{})};
 if(target==='自分の墓地にある呪文')count={zone:'grave',filter:{spell:true}};
 if(target==='自分の墓地にあるクリーチャー')count={zone:'grave',filter:{creature:true}};
 const color=target.match(/^自分の墓地にある(光|水|闇|火|自然)のカード$/);if(color)count={zone:'grave',filter:{color:color[1]}};
 if(target==='自分のマナゾーンにあるカード')count={zone:'mana'};
 if(target==='自分のマナゾーンにある進化カード')count={zone:'mana',filter:{evolution:true}};
 if(target==='自分のマナゾーンでタップされているカード')count={zone:'mana',filter:{tapped:true}};
 if(['自分のマナゾーンにあるカードの文明','自分のマナゾーンにある文明'].includes(target))count={zone:'mana',civilizations:true};
 if(target==='自分のシールド')count={zone:'shields'};
 const battle=target.match(/^バトルゾーンにある(?:(自分|相手)の)?(他の)?(.+)$/);
 if(battle){const filters={'クリーチャー':{},'光のクリーチャー':{color:'光'},'水のクリーチャー':{color:'水'},'闇のクリーチャー':{color:'闇'},'火のクリーチャー':{color:'火'},'自然のクリーチャー':{color:'自然'},'水と闇のクリーチャー':{colorsAny:['水','闇']},'タップされているクリーチャー':{tapped:true},'タップされていないクリーチャー':{untapped:true},'進化クリーチャー':{evolution:true},'「ブロッカー」を持つクリーチャー':{blocker:true},'イニシエート':{race:'イニシエート'}};const filter=filters[battle[3]];if(filter)count={zone:'battle',...(!battle[1]?{both:true}:battle[1]==='相手'?{opponent:true}:{}),...(battle[2]?{other:true}:{}),filter:{creature:true,...filter}};}
 return count?{...count,amount:+m[2],...condition}:null;
}
function grantAura208(text){
 const line=text.replace(/^このクリーチャーがバトルゾーンにある間/,'');
 const m=line.match(/^(?:バトルゾーンにある)?(自分の)?(他の)?(?:すべての)?(.+?)(?:はすべて|すべてに|すべては|は|に)(.+)$/);if(!m)return null;
 const filters={'クリーチャー':{},'進化クリーチャー':{evolution:true},'ドラゴン':{race:'ドラゴン'},'ドラゴンとハンター両方を持つクリーチャー':{raceAll:['ドラゴン','ハンター']},'水と自然のクリーチャー':{colorsAny:['水','自然']},'光または水のクリーチャー':{colorsAny:['光','水']},'光または火のクリーチャー':{colorsAny:['光','火']},'アーク・セラフィムとワイルド・ベジーズ':{raceAny:['アーク・セラフィム','ワイルド・ベジーズ']}};
 for(const color of colors)filters[color+'のクリーチャー']={color};
 for(const r of ['リキッド・ピープル','コマンド・ドラゴン','デーモン・コマンド','エイリアン','アンノウン','ティラノ・ドレイク','ディスタス','サイバーロードとヘドリアン'])filters[r]=r.includes('と')?{raceAny:r.split('と')}:{race:r};
 const filter=filters[m[3]];if(!filter)return null;const body=m[4];let grants;
 if(body==='ブロックされない。')grants={unblockable:true};
 else{const grant=body.match(/^((?:「[^「」]+」)(?:と「[^「」]+」)*)(?:を得る|を与える)。(?:\(.*\))?$/);if(!grant)return null;grants={};for(const word of grant[1].matchAll(/「([^「」]+)」/g)){const key={'スピードアタッカー':'speedAttacker','スレイヤー':'slayer','ブロッカー':'blocker','W・ブレイカー':'breaker','W(ダブル)・ブレイカー':'breaker'}[word[1]],power=word[1].match(/^パワーアタッカー\+([1-9]\d*)$/);if(key)grants[key]=key==='breaker'?2:true;else if(power)grants.attackBonus=+power[1];else return null;}}
 return{filter:{creature:true,...filter},...(!m[1]?{both:true}:{}),...(m[2]?{other:true}:{}),grants};
}
function instruction(text,phase){
 let m;
 if(phase>=212&&(m=text.match(/^パワー([1-9]\d*)以下のクリーチャーをすべて破壊する。$/)))return{op:'Sweep',both:true,to:'grave',filter:{creature:true,maxPower:+m[1],g199Power:true}};
 if(phase>=210){
  if(m=text.match(/^(?:自分の)?マナゾーン(?:にある|の)カードを([1-9]\d*)枚(まで)?アンタップする。$/))return{op:'Select',origin:'mana',n:+m[1],g210ManaUntap:true,title:'アンタップするマナを'+m[1]+'枚'+(m[2]?'まで':'')+'選ぶ',...(m[2]?{optional:true}:{})};
  if(m=text.match(/^(?:バトルゾーンにある)?相手のクリーチャーを([1-9]\d*)体(まで)?選びタップする。(?:そのクリーチャーは次の相手のターンのはじめに|次の相手のターンのはじめに(?:そのクリーチャー|それら(?:のクリーチャー)?)は)アンタップ(?:し|され)ない。$/)){const common={g210TapLock:true,title:'タップして次のターンまで止めるクリーチャーを'+m[1]+'体'+(m[2]?'まで':'')+'選ぶ'};return +m[1]===1&&!m[2]?{op:'Target',tap:true,lock:true,...common}:{op:'Select',origin:'battle',owner:'opponent',n:+m[1],filter:{creature:true},g173Targets:true,g193Select:true,g193Tap:true,...common,...(m[2]?{optional:true}:{})};}
 }

 if(phase>=204&&/^カードを1枚引いてもよい。そうした(?:ら|場合)自分の手札を1枚捨てる。$/.test(text))return{op:'Offer',g204DrawDiscard:true,defs:[{op:'Draw',n:1},{op:'Discard',owner:'self',n:1}]};
 if(phase>=203){const count=count203(text);if(count)return count;}
 if(phase>=201){const search=search201(text);if(search)return search;}
 if(phase>=200){const look=look200(text);if(look)return look;}
 if(phase>=199){
  if(m=text.match(/^相手は(?:自身の|自分の)?手札(?:を|から)(?:さらに)?([1-9]\d*)枚(?:選び|選んで)?捨てる。$/))return{op:'Discard',n:+m[1]};
  if(m=text.match(/^(?:バトルゾーンにある)?相手の(?:パワー([1-9]\d*)(以上|以下)の|(?:「ブロッカー」を持つ)|(?:タップしている|タップされている))クリーチャーを1体(?:選び|選んで)?(破壊する|持ち主の手札に戻す|持ち主のマナゾーンに置く)。$/))return{op:'Target',to:m[3]==='破壊する'?'grave':m[3]==='持ち主の手札に戻す'?'hand':'mana',filter:m[1]?{[m[2]==='以上'?'minPower':'maxPower']:+m[1],g199Power:true}:text.includes('ブロッカー')?{blocker:true}:{tapped:true}};
 }
 if(phase>=198){
  if(m=text.match(/^(?:バトルゾーンにある)?クリーチャーを1体(?:選び|選んで)?持ち主の手札に戻してもよい。$/))return{op:'Target',anyOwner:true,to:'hand',optional:true};
  if(m=text.match(/^(?:バトルゾーンにある)?相手の(?:アンタップしている|タップされていない)クリーチャーを1体(?:選び)?持ち主の(手札に戻す|マナゾーンに置く)。$/))return{op:'Target',to:m[1]==='手札に戻す'?'hand':'mana',filter:{untapped:true}};
  if(m=text.match(/^バトルゾーンにある相手のクリーチャーをすべて持ち主の手札に戻す。$/))return{op:'Sweep',to:'hand',filter:{creature:true}};
  if(m=text.match(/^山札の上から([1-9]\d*)枚(?:目)?を墓地に置いてもよい。$/))return{op:'Mill',n:+m[1],optional:true};
 }
 if(phase>=197){const mana=mana197(text,phase);if(mana&&!mana.event)return mana.task;}
 if(phase>=196){
  if(m=text.match(/^コスト([1-9]\d*)以下のタマシードを1枚自分の手札から(?:バトルゾーンに)?出(す|してもよい)。$/))return{op:'Select',origin:'hand',n:1,deploy:true,g195HandDeploy:true,title:'手札から出すタマシードを1枚選ぶ',filter:{seed:true,max:+m[1]},optional:m[2]==='してもよい'};
  if(m=text.match(/^コスト([1-9]\d*)以下のクリーチャー1体またはコスト\1以下のタマシードを1枚自分の手札から出(す|してもよい)。$/))return{op:'Select',origin:'hand',n:1,deploy:true,g195HandDeploy:true,title:'手札から出すクリーチャーかタマシードを1枚選ぶ',filter:{creatureOrSeed:true,max:+m[1]},optional:m[2]==='してもよい'};
  if(m=text.match(/^(?:「(ブロッカー)」を持つ)?(?:(光|水|闇|火|自然)の)?(?:コスト([1-9]\d*)以下の)?(?:パワー([1-9]\d*)以上の)?(進化ではない)?クリーチャーを1体自分の手札から(?:バトルゾーンに)?出(す|してもよい)。$/))return{op:'Select',origin:'hand',n:1,deploy:true,g195HandDeploy:true,filter:{creature:true,...(m[1]?{blocker:true}:{}),...(m[2]?{color:m[2]}:{}),...(m[3]?{max:+m[3]}:{}),...(m[4]?{minPower:+m[4]}:{}),...(m[5]?{nonEvolution:true}:{})},optional:m[6]==='してもよい'};
 }
 if(phase>=195&&(m=text.match(/^(?:自分の手札から)?(?:(光|水|闇|火|自然)の)?(?:コスト([1-9]\d*)以下の)?(?:「(ブロッカー)」を持つ)?クリーチャーを([1-9]\d*)体(まで)?(?:自分の手札から)(?:バトルゾーンに)?出(す|してもよい)。$/))){if(+m[4]>1&&!m[5]&&m[6]==='してもよい')return null;return{op:'Select',origin:'hand',n:+m[4],deploy:true,g195HandDeploy:true,title:'手札から出すクリーチャーを'+m[4]+'体'+(m[5]||m[6]==='してもよい'?'まで':'')+'選ぶ',filter:{creature:true,...(m[1]?{color:m[1]}:{}),...(m[2]?{max:+m[2]}:{}),...(m[3]?{blocker:true}:{})},...(m[5]||m[6]==='してもよい'?{optional:true}:{})};}
 if(phase>=194&&(m=text.match(/^(?:バトルゾーンに)?自分のパワー(\d+)以上のクリーチャーが(?:あれば|いれば|いるなら)(.+)$/))){const next=instruction(m[2],phase);if(next&&(['Draw','DrawUpTo'].includes(next.op)||next.op==='Offer'&&next.defs.every(d=>d.op==='Draw')))return{op:'IfOwnPower',minPower:+m[1],defs:[next]};}
 if(phase>=193&&(m=text.match(/^(?:バトルゾーンにある)?相手の(?:パワー(\d+)以下の)?クリーチャーを([1-9]\d*)体(まで)?(?:選び|選んで)?(タップする|破壊する|持ち主の手札に戻す|持ち主のマナゾーンに置く)。$/))){const to=m[4]==='破壊する'?'grave':m[4]==='持ち主の手札に戻す'?'hand':'mana';return{op:'Select',owner:'opponent',origin:'battle',n:+m[2],filter:{creature:true,...(m[1]?{maxPower:+m[1]}:{})},g173Targets:true,g193Select:true,...(m[4]==='タップする'?{g193Tap:true}:{to}),title:({'タップする':'タップする','破壊する':'破壊する','持ち主の手札に戻す':'手札に戻す','持ち主のマナゾーンに置く':'マナに置く'}[m[4]])+'相手のクリーチャーを'+m[2]+'体'+(m[3]?'まで':'')+'選ぶ',...(m[3]?{optional:true}:{})};}
 if(phase>=192&&text==='このクリーチャーを破壊する。')return{op:'SelfDestroy'};
 if(phase>=190&&(m=text.match(/^(?:バトルゾーンにある)?相手のクリーチャーを([1-9]\d*)体(まで)?選ぶ。次の(自分|相手)のターンの(?:はじめ|始め)まで(?:そのクリーチャー|それら(?:のクリーチャー)?)は攻撃もブロックもできない。$/))){const common={g190Freeze:m[3]==='自分'?'self':'opponent',title:'攻撃とブロックを止めるクリーチャーを'+m[1]+'体'+(m[2]?'まで':'')+'選ぶ'};return +m[1]===1&&!m[2]?{op:'Target',...common}:{op:'Select',owner:'opponent',origin:'battle',n:+m[1],filter:{creature:true},g173Targets:true,...common,...(m[2]?{optional:true}:{})};}
 if(phase>=189&&/^このクリーチャーをアンタップ(?:する|してもよい)。$/.test(text))return /てもよい/.test(text)?{op:"Offer",defs:[{op:"Untap"}]}:{op:"Untap"};
 if(phase>=187){
  if(m=text.match(/^相手は(?:バトルゾーンにある)?(?:自身の|自分自身の)(アンタップしている|アンタップされている|タップされていない|進化|光または自然の)?クリーチャーを([1-9]\d*)体(?:選び|選んで)?(?:持ち主の)?(破壊する|手札に戻す|マナゾーンに置く|タップする)。$/))return{op:'OpponentSelect',n:+m[2],...(m[3]==='タップする'?{tap:true}:{to:m[3]==='破壊する'?'grave':m[3]==='手札に戻す'?'hand':'mana'}),...(m[1]?{filter:m[1]==='進化'?{evolution:true}:m[1]==='光または自然の'?{any:[{color:'光'},{color:'自然'}]}:{untapped:true}}:{})};
  if(m=text.match(/^自分の(アンタップしている)?クリーチャーを1体(?:選び)?(?:持ち主の)?(破壊する|マナゾーンに置く|マナゾーンに置いてもよい)。$/))return{op:'Target',owner:'self',to:m[2]==='破壊する'?'grave':'mana',g177SelfMana:true,...(m[1]?{filter:{untapped:true}}:{}),...(m[2]==='マナゾーンに置いてもよい'?{optional:true}:{})};
 }
 if(phase>=186){
  if(m=text.match(/^自分の山札の上から([1-9]\d*)枚(?:目)?を墓地に置いてもよい。そうした(?:場合|ら)(.+)$/)){const next=instruction(m[2],phase);if(next?.op==='Select'&&next.origin==='grave')return{op:'Offer',g186GraveMill:true,defs:[{op:'Mill',n:+m[1]},next]};}
  if(m=text.match(/^カードを好きな枚数自分の墓地から手札に戻してもよい。$/))return{op:'Select',origin:'grave',to:'hand',n:'all',optional:true,title:'手札に戻す墓地のカードを好きな枚数選ぶ'};
  if(m=text.match(/^(.+?)を([1-9]\d*)(?:体|枚)(まで)?自分の墓地から(?:自分の)?手札に戻(す|してもよい)。$/)){
   const filters={'闇のカード':{anyFaceColor:'闇'},'無色クリーチャー':{creature:true,noColor:true},'ジョーカーズ・クリーチャー':{creature:true,race:'ジョーカーズ'},'進化クリーチャー':{creature:true,evolution:true},'他のクリーチャー':{creature:true},'他のハンター':{creature:true,race:'ハンター'},'ドラゴン・ゾンビ':{creature:true,race:'ドラゴン・ゾンビ'},'アビス':{race:'アビス'}};
   const filter=filters[m[1]];if(filter)return{op:'Select',origin:'grave',to:'hand',n:+m[2],filter,...(m[1].startsWith('他の')?{g186Other:true}:{}),...(m[3]||m[4]==='してもよい'?{optional:true}:{})};
  }
  if(m=text.match(/^クリーチャーを1体自分の墓地から自分の手札に戻してもよい。$/))return{op:'Select',origin:'grave',to:'hand',n:1,filter:{creature:true},optional:true};
  if(m=text.match(/^闇と火を両方持つクリーチャーをすべて自分の墓地から手札に戻す。$/))return{op:'Select',origin:'grave',to:'hand',n:'all',filter:{creature:true,colorsAll:['闇','火']},title:'闇と火を両方持つ墓地のクリーチャーをすべて選ぶ'};
  if(m=text.match(/^相手のコスト([1-9]\d*)以下のクリーチャーを1体(?:選び)?持ち主のマナゾーンに置いてもよい。$/))return{op:'Target',to:'mana',optional:true,filter:{max:+m[1]}};
 }
 if(phase>=185){const look=lookSpec(text);if(look)return look;}
 if(phase>=184){
  if(m=text.match(/^(?:カードを([1-9]\d*)枚自分の|自分の)マナゾーン(?:から|のカードを([1-9]\d*)枚)?(?:選び)?墓地に置く。$/)){const n=m[1]||m[2];if(n)return{op:'Select',origin:'mana',to:'grave',n:+n,g184ManaLoss:true};}
  if(m=text.match(/^クリーチャーを1体自分の墓地からマナゾーンにタップして置く。$/))return{op:'Select',origin:'grave',to:'mana',n:1,tapped:true,filter:{creature:true}};
  if(text==='クリーチャーを1体自分のマナゾーンから手札に戻す。')return{op:'Select',origin:'mana',to:'hand',n:1,filter:{creature:true}};
 }
 if(phase>=183){
  if(m=text.match(/^自分の手札を([1-9]\d*)枚(?:好きな順序で)?(?:自分の)?山札の(?:一番)?(上|下)に置く。$/))return{op:'Select',origin:'hand',to:m[2]==='上'?'deckTop':'deck',n:+m[1],g183Return:true,title:m[2]==='上'?'山札の上に戻す手札を選ぶ（先に選んだカードが一番上）':'山札の下に戻す手札を選ぶ（先に選んだカードから下へ）'};
  if(m=text.match(/^カードを([1-9]\d*)枚引いてもよい。そうした(?:場合|ら)(.+)$/)){const next=instruction(m[2],phase);if(next?.g183Return)return{op:'Offer',defs:[{op:'Draw',n:+m[1]},next]};}
 }
 if(phase>=182){
  if(m=text.match(/^自分の手札を([1-9]\d*)(枚まで|枚)(?:自分の)?(タップして)?マナゾーンに(?:置く|置いてもよい|加えてもよい)。$/))return{op:'Select',origin:'hand',to:'mana',n:+m[1],g182HandMana:true,...(m[2]==='枚まで'||/てもよい/.test(text)?{optional:true}:{}),...(m[3]?{tapped:true}:{})};
  if(m=text.match(/^自分の手札を好きな(?:枚数|数)(?:自分の)?(タップして)?マナゾーンに置(?:く|いてもよい)。$/))return{op:'Select',origin:'hand',to:'mana',n:'all',optional:true,title:'マナに置く手札を好きな枚数選ぶ',g182HandMana:true,...(m[1]?{tapped:true}:{})};
  if(m=text.match(/^クリーチャーを好きな数(?:自分の)?マナゾーンから手札に戻す。$/))return{op:'Select',origin:'mana',to:'hand',n:'all',optional:true,title:'手札に戻すマナのクリーチャーを好きな枚数選ぶ',filter:{creature:true}};
  if(m=text.match(/^カードを1枚自分のマナゾーンから(?:自分の)?手札に(?:戻す|戻してもよい|加えてもよい)。$/))return{op:'Select',origin:'mana',to:'hand',n:1,...(/てもよい/.test(text)?{optional:true}:{})};
  if(m=text.match(/^自分の山札の上から([1-9]\d*)枚(?:目)?を自分のマナゾーンに置く。$/))return{op:'Ramp',n:+m[1]};
 }
 if(phase>=181){
  if(m=text.match(/^相手の手札を見ないで([1-9]\d*)枚選び捨てさせる。$/))return{op:'Discard',n:+m[1],random:true};
  if(m=text.match(/^自分の山札の上から([1-9]\d*)枚(?:目)?をタップしてマナゾーンに置(く|いてもよい)。$/)){const def={op:'Ramp',n:+m[1],tapped:true};return m[2]==='いてもよい'?{op:'Offer',defs:[def]}:def;}
 }
 if(phase>=180&&(m=text.match(/^自分の山札の上から1枚(?:目)?を(?:裏向きのまま)?(?:新しいシールドとして)?(?:自分の)?シールド(?:ゾーン)?(?:に置く|に加える|化する|に加えてもよい|に置いてもよい)。$/))){const def={op:'ShieldTop',n:1};return /てもよい/.test(text)?{op:'Offer',defs:[def]}:def;}
 if(phase>=179){
  if(m=text.match(/^自分の(他の)?クリーチャーを1体(?:選び)?(?:持ち主の)?手札に戻(す|してもよい)。$/))return{op:'Target',owner:'self',to:'hand',g179Return:true,...(m[1]?{g179Other:true}:{}),...(m[2]==='してもよい'?{optional:true}:{})};
  if(m=text.match(/^相手はカードを([1-9]\d*)枚引く。$/))return{op:'Draw',owner:'opponent',n:+m[1]};
 }
 if(phase>=177){
  if(m=text.match(/^(?:バトルゾーンにある)?(?:パワー(\d+)以下の)?相手の(?:パワー(\d+)以下の)?クリーチャー(?:を1体|1体を)(?:選び|選んで)?(破壊する|持ち主の手札に戻す|持ち主のマナゾーンに置く)。$/)){if(m[1]&&m[2])return null;return{op:'Target',to:m[3]==='破壊する'?'grave':m[3]==='持ち主の手札に戻す'?'hand':'mana',...(m[1]||m[2]?{filter:{maxPower:Number(m[1]||m[2])}}:{})};}
  if(m=text.match(/^パワー(\d+)以下のクリーチャー(?:を1体|1体を)(?:選び|選んで)?(破壊する|持ち主の手札に戻す|持ち主のマナゾーンに置く)。$/))return{op:'Target',anyOwner:true,to:m[2]==='破壊する'?'grave':m[2]==='持ち主の手札に戻す'?'hand':'mana',filter:{maxPower:+m[1]}};
  if(m=text.match(/^(?:バトルゾーンにある)?(自分の|相手の)?クリーチャーを1体(?:選び|選んで)?アンタップ(する|してもよい)。$/))return{op:'Target',untap:true,...(m[1]?m[1]==='自分の'?{owner:'self'}:{}:{anyOwner:true}),...(m[2]==='してもよい'?{optional:true}:{})};
  if(/^自分のクリーチャーを1体(?:選び)?マナゾーンに置く。$/.test(text))return{op:'Target',owner:'self',to:'mana',g177SelfMana:true};
 }
 if(phase>=173){
  if(m=text.match(/^相手の(?:パワー(\d+)以下の)?クリーチャーを([1-9]\d*)体まで選び持ち主の手札に戻す。$/))return{op:'Select',owner:'opponent',origin:'battle',to:'hand',n:+m[2],optional:true,g173Targets:true,filter:{creature:true,...(m[1]?{maxPower:+m[1]}:{})}};
  if(m=text.match(/^(?:自分の)?手札(?:から|を)([1-9]\d*)枚(?:選び)?捨てる。$/))return{op:'Discard',owner:'self',n:+m[1]};
  if(m=text.match(/^呪文を1枚自分の墓地から手札に戻(す|してもよい)。$/))return{op:'Select',origin:'grave',to:'hand',n:1,filter:{spell:true},...(/てもよい/.test(text)?{optional:true}:{})};
  if(m=text.match(/^自分の墓地から(クリーチャー|呪文)を1枚(?:選び)?手札に戻(す|してもよい)。$/))return{op:'Select',origin:'grave',to:'hand',n:1,filter:{[m[1]==='呪文'?'spell':'creature']:true},...(/てもよい/.test(text)?{optional:true}:{})};
  if(m=text.match(/^(クリーチャー|呪文)を([1-9]\d*)枚(まで)?自分の墓地から手札に戻(す|してもよい)。$/)){if(!m[3]&&+m[2]>1&&/てもよい/.test(text))return null;return{op:'Select',origin:'grave',to:'hand',n:+m[2],filter:{[m[1]==='呪文'?'spell':'creature']:true},...(m[3]||/てもよい/.test(text)?{optional:true}:{})};}
 }
 if(phase>=171){
  if(text==='バトルゾーンにある相手のクリーチャーをすべてタップする。')return{op:'TapAll'};
  if(m=text.match(/^相手の(?:パワー(\d+)以下の)?クリーチャーを1体(?:選び|選んで)?(破壊してもよい|持ち主の手札に戻してもよい|持ち主のマナゾーンに置いてもよい)。$/))return{op:'Target',to:m[2]==='破壊してもよい'?'grave':m[2]==='持ち主の手札に戻してもよい'?'hand':'mana',optional:true,...(m[1]?{filter:{maxPower:+m[1]}}:{})};
  if(m=text.match(/^相手のコスト(\d+)以下のクリーチャーを1体(?:選び|選んで)?(破壊する|持ち主の手札に戻す|持ち主のマナゾーンに置く)。$/))return{op:'Target',to:m[2]==='破壊する'?'grave':m[2]==='持ち主の手札に戻す'?'hand':'mana',filter:{max:+m[1]}};
 }
 if(phase>=170){
  if(m=text.match(/^(?:バトルゾーンにある)?相手の(?:パワー(\d+)以下の)?クリーチャーを1体(?:選び|選んで)?タップしてもよい。$/))return{op:'Target',tap:true,optional:true,...(m[1]?{filter:{maxPower:+m[1]}}:{})};
  if(/^バトルゾーンにある相手のクリーチャーを1体選びタップする。$/.test(text))return{op:'Target',tap:true};
  if(m=text.match(/^(?:バトルゾーンにある)?クリーチャーを1体(?:選び|選んで)?持ち主の手札に戻す。$/))return{op:'Target',anyOwner:true,to:'hand'};
  if(m=text.match(/^相手は自身の手札(?:から|を)([1-9]\d*)枚選び捨てる。$/))return{op:'Discard',n:+m[1]};
  if(m=text.match(/^相手の(?:パワー(\d+)以下の)?クリーチャーをすべて(破壊する|持ち主の手札に戻す|持ち主のマナゾーンに置く)。$/))return{op:'Sweep',to:m[2]==='破壊する'?'grave':m[2]==='持ち主の手札に戻す'?'hand':'mana',filter:{creature:true,...(m[1]?{maxPower:+m[1]}:{})}};
  if(m=text.match(/^相手の(?:アンタップしている|タップされていない)クリーチャーを1体(?:選び)?破壊する。$/))return{op:'Target',to:'grave',filter:{untapped:true}};
  if(m=text.match(/^相手のクリーチャーを1体選ぶ。(?:この|その)ターンそのクリーチャーのパワーを[-−](\d+)する。(?:\(パワー0以下のクリーチャーは破壊される\))?$/))return{op:'Target',power:-Number(m[1])};
  if(text==='相手のクリーチャーを1体選びタップする。次の相手のターンのはじめにそのクリーチャーはアンタップしない。')return{op:'Target',tap:true,lock:true};
 }
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
 const spec={},entry=[],attack=[],block=[],death=[],leave=[],turnStart=[],turnEnd=[],opponentStart=[],tapped=[],battleWin=[];let powerBonus=false,nativeEntry=null;
 const lines=(phase>=184?f.abilityText.replace(/[▶▼→][\uFE0E\uFE0F]?|__/g,'\n▶'):f.abilityText).split('\n').filter(s=>s.trim());
 for(let i=0;i<lines.length;i++){
  const raw=lines[i],line=normalize(raw);let m,known=false;
  if(phase>=184){
   const modal=line.match(/^(?:(?:このクリーチャーが(?:バトルゾーンに)?出た時|このクリーチャーをバトルゾーンに出した時))?次のうちいずれか(?:1つ|ひとつ)を選ぶ。$/);
   if(modal){if(entry.length||nativeEntry||((creature||seed)&&line.startsWith('次の'))||(!creature&&line.startsWith('このクリーチャー')))throw Error('独立した誘発能力の順序対応が必要');const modes=[];while(i+1<lines.length&&normalize(lines[i+1]).startsWith('▶')){const text=normalize(lines[++i]).slice(1),defs=clauses(text,phase).map(q=>instruction(q,phase));if(!defs.length||defs.some(t=>!t))throw Error('未対応の選択能力: '+text);modes.push({label:lines[i].replace(/^\s*▶/,'').trim(),defs});}if(modes.length<2)throw Error('選択能力の不足');entry.push({op:'Choose',g184Modes:true,modes});continue;}
  }
  if(phase>=212&&creature){const reduction=countDiscount212(line);if(reduction){if(spec.g212CountDiscount)throw Error("重複する枚数軽減");spec.g212CountDiscount=reduction;continue;}}
  if(phase>=211){const sympathy=sympathy211(line);if(sympathy){if(spec.g211Sympathy)throw Error("重複するシンパシー");spec.g211Sympathy=sympathy;continue;}}
  if(phase>=209&&creature){
   if(/^このクリーチャーはバトル中破壊されない。$/.test(line)){spec.g34BattleSafe=true;continue;}
   if(m=line.match(/^パワード・ブロッカー\+([1-9]\d*)\(ブロック中このクリーチャーのパワーを\+\1する\)$/)){spec.g209PoweredBlocker=+m[1];powerBonus=true;continue;}
   if(m=line.match(/^(?:このクリーチャーは)?「ブロッカー」を持つクリーチャーとの?バトル中(?:このクリーチャーの)?パワー(?:を|は)\+([1-9]\d*)(?:する|される)。$/)){spec.g209BattlePower={amount:+m[1],vsBlocker:true};powerBonus=true;continue;}
   if(m=line.match(/^コスト([1-9]\d*)以下のクリーチャーとバトル中このクリーチャーのパワーは\+([1-9]\d*)される。$/)){spec.g209BattlePower={amount:+m[2],opponentMaxCost:+m[1]};powerBonus=true;continue;}
   if(m=line.match(/^G・G・G:このクリーチャーがバトル中自分の手札が([1-9]\d*)枚以下ならこのクリーチャーのパワーを\+([1-9]\d*)する。$/)){spec.g209BattlePower={amount:+m[2],handMax:+m[1]};powerBonus=true;continue;}
   if(m=line.match(/^バトル中このクリーチャーのパワーを自分の墓地にある火のカード1枚につき\+([1-9]\d*)する。$/)){spec.g209BattlePower={amount:+m[1],graveFire:true};powerBonus=true;continue;}
   if(m=line.match(/^相手のターンバトル中このクリーチャーのパワーは\+([1-9]\d*)される。$/)){spec.g209BattlePower={amount:+m[1],opponentTurn:true};powerBonus=true;continue;}
  }
  if(phase>=208&&creature){const aura=grantAura208(line);if(aura){(spec.g208Auras??=[]).push(aura);continue;}}
  if(phase>=207&&creature){
   const counted=countPower207(line);if(counted){if(spec.g207CountPower)throw Error('重複する枚数パワー');spec.g207CountPower=counted;powerBonus=true;continue;}
   if(m=line.match(/^このクリーチャーはパワーが(6000|15000)以上の(?:時|とき)「(W|T)・ブレイカー」を得る。$/)){const rule={power:+m[1],breaker:m[2]==='W'?2:3};if((spec.g207Breakers||[]).some(r=>r.power===rule.power))throw Error('重複するパワー別ブレイカー');(spec.g207Breakers??=[]).push(rule);continue;}
   if(line==='このクリーチャーはこのクリーチャーよりパワーが小さいクリーチャーにブロックされない。'){if(spec.g206NoBlock)throw Error('重複するブロック制限');spec.g206NoBlock={lessPower:true};continue;}
  }
  if(phase>=206&&creature){
   const restricted=line.match(/^このクリーチャーは(パワー([1-9]\d*)以下の|コスト([1-9]\d*)以下の|これよりパワーが小さい|進化クリーチャーではない|(?:光|水|闇|火|自然)の)クリーチャーにブロックされない。$/);
   if(restricted){if(spec.g206NoBlock)throw Error('重複するブロック制限');spec.g206NoBlock=restricted[2]?{maxPower:+restricted[2]}:restricted[3]?{maxCost:+restricted[3]}:restricted[1]==='これよりパワーが小さい'?{lessPower:true}:restricted[1]==='進化クリーチャーではない'?{nonEvolution:true}:{color:restricted[1].slice(0,-1)};continue;}
   if(line==='このクリーチャーはクリーチャーを攻撃するときブロックされない。'){if(spec.g206NoBlock)throw Error('重複するブロック制限');spec.g206NoBlock={creatureAttack:true};continue;}
   if(m=line.match(/^このクリーチャーは((?:光|水|闇|火|自然)(?:または(?:光|水|闇|火|自然))?)のクリーチャー(?:から|に)攻撃(またはブロック)?されない。$/)){if(spec.cannotBeAttackedByCivs)throw Error('重複する攻撃制限');spec.cannotBeAttackedByCivs=m[1].split('または');if(m[2]){if(spec.g206NoBlock||spec.cannotBeAttackedByCivs.length!==1)throw Error('複雑なブロック制限');spec.g206NoBlock={color:m[1]};}continue;}
   if(line==='このクリーチャーは進化クリーチャーではないクリーチャーから攻撃されない。'){if(spec.g206AttackProtection)throw Error('重複する攻撃制限');spec.g206AttackProtection={nonEvolution:true};continue;}
   if(line==='ドラゴンはこのクリーチャーを攻撃できない。'){if(spec.g206AttackProtection)throw Error('重複する攻撃制限');spec.g206AttackProtection={race:'ドラゴン'};continue;}
   if(line==='ドラゴンだけがこのクリーチャーを攻撃できる。'){if(spec.g206AttackProtection)throw Error('重複する攻撃制限');spec.g206AttackProtection={exceptRace:'ドラゴン'};continue;}
  }
  if(phase>=205&&creature){const aura=aura205(line);if(aura){if(spec.g205Aura)throw Error('重複する常在パワー能力');spec.g205Aura=aura;continue;}const bonus=line.match(/^(自分|相手)のターン中このクリーチャーのパワー(?:を|は)\+([1-9]\d*)(?:する|される)。$/);if(bonus){const key=bonus[1]==='自分'?'ownTurnBonus':'g38EnemyTurnBonus';if(spec[key])throw Error('重複するターン中のパワー能力');spec[key]=+bonus[2];powerBonus=true;continue;}}
  if(phase>=204&&creature){const watch=line.match(/^(相手のターン中に)?(自分|相手)が呪文を唱えた時(.+)$/),colored=line.match(/^自分の(光|水|闇|火|自然)の呪文を唱える時(.+)$/);if(watch||colored){if(spec.g204SpellWatch)throw Error('独立した呪文誘発能力の順序対応が必要');const body=watch?watch[3]:colored[2],single=instruction(body,phase),defs=single?[single]:clauses(body,phase).map(text=>instruction(text,phase));if(!defs.length||defs.some(d=>!d))throw Error('未対応の能力文: '+raw);spec.g204SpellWatch={who:watch&&watch[2]==='相手'?'opponent':'self',...(watch?.[1]?{opponentTurn:true}:{}),...(colored?{color:colored[1]}:{}),defs};continue;}}
  if(phase>=201&&creature&&(m=line.match(/^このクリーチャーが(?:バトルゾーンに)?出たとき(.+)$/))){const search=search201(m[1]);if(search){if(entry.length||nativeEntry)throw Error('独立した誘発能力の順序対応が必要');entry.push(search);continue;}}
  if(phase>=203&&creature&&(m=line.match(/^このクリーチャーが(?:バトルゾーンに出たとき|攻撃するとき)(.+)$/))){const count=count203(m[1]);if(count){const dest=line.startsWith('このクリーチャーが攻撃')?attack:entry;if(dest.length||dest===entry&&nativeEntry)throw Error('独立した誘発能力の順序対応が必要');dest.push(count);continue;}}
  if(phase>=197&&creature){const mana=mana197(line,phase);if(mana?.event){const dest=mana.event==='entry'?entry:mana.event==='attack'?attack:death;if(dest.length||dest===entry&&nativeEntry)throw Error('独立した誘発能力の順序対応が必要');dest.push(mana.task);continue;}}
  if(phase>=191&&creature&&/^各ターンこのクリーチャーがはじめてタップした時アンタップする。$/.test(line)){if(spec.g191FirstTapUntap)throw Error('重複する最初のタップ能力');spec.g191FirstTapUntap=true;continue;}
  if(phase>=189&&creature&&(m=line.match(/^このクリーチャーがバトルに勝った時(.+)$/))){if(battleWin.length)throw Error('独立した誘発能力の順序対応が必要');const defs=phase>=192&&m[1]==='破壊する。'?[{op:'SelfDestroy'}]:clauses(m[1],phase).map(text=>instruction(text,phase));if(!defs.length||defs.some(t=>!t))throw Error('未対応の能力文: '+raw);battleWin.push(...defs);continue;}
  if(phase>=188&&creature){
   const both=line.match(/^このクリーチャーが(?:バトルゾーンに)?出た時またはタップした時(.+)$/),tap=line.match(/^このクリーチャーがタップした時(.+)$/);
   if(both||tap){if(tapped.length||both&&(entry.length||nativeEntry))throw Error('独立した誘発能力の順序対応が必要');const defs=clauses((both||tap)[1],phase).map(text=>instruction(text,phase));if(!defs.length||defs.some(t=>!t))throw Error('未対応の能力文: '+raw);tapped.push(...defs);if(both)entry.push(...structuredClone(defs));continue;}
  }
  if(phase>=178&&creature){
   const both=line.match(/^このクリーチャーが(?:攻撃する時またはブロックした時|攻撃またはブロックした時)(.+)$/),blocked=line.match(/^このクリーチャーがブロック(?:する|した)時(.+)$/);
   if(both||blocked){if(block.length||both&&attack.length)throw Error('独立した誘発能力の順序対応が必要');const body=(both||blocked)[1],defs=/^(?:その)?攻撃の後(?:で)?このクリーチャーを破壊する。$/.test(body)?[{op:'AfterAttackDestroy'}]:clauses(body,phase).map(text=>instruction(text,phase));if(!defs.length||defs.some(t=>!t))throw Error('未対応の能力文: '+raw);block.push(...defs);if(both)attack.push(...structuredClone(defs));continue;}
  }
  if(phase>=176&&creature&&/^このクリーチャーが攻撃する時攻撃の後(?:で)?このクリーチャーを破壊する。$/.test(line)){if(attack.length)throw Error('独立した誘発能力の順序対応が必要');attack.push({op:'AfterAttackDestroy'});continue;}
  if(phase>=175&&creature&&(m=line.match(/^B・A・D([1-9]\d*)\(このクリーチャーをコストを\1少なくして召喚してもよい。そうしたらこのターンの終わりにこのクリーチャーを破壊する\)$/))){spec.bad=+m[1];spec.g175Bad=true;continue;}
  if(phase>=174&&creature){
   if(m=line.match(/^J・O・E([1-9]\d*)\(このクリーチャーをコストを\1少なくして召喚してもよい。そうしたらこのターンの終わりにこれを自分の山札の一番下に置く。下に置いたらカードを1枚引く\)$/)){spec.joeDiscount=+m[1];continue;}
   if(m=line.match(/^J・O・E([1-9]\d*)\(このクリーチャーをコストを\1少なくして召喚してもよい。こうして出したらこのターンの終わりにそれを自分の山札の下に置く。そうしたらカードを1枚引く\)$/)){spec.joeDiscount=+m[1];continue;}
   if(/^このクリーチャーがバトルする時バトルの後(?:このクリーチャーを)?破壊する。$/.test(line)){spec.afterBattleDie=true;continue;}
  }
  if(phase>=171&&creature){
   if(['このクリーチャーはクリーチャーを攻撃できない。','このクリーチャーはクリーチャーを攻撃することができない。'].includes(line)){spec.noCreatureAttack=true;continue;}
   if(m=line.match(/^バトル中このクリーチャーのパワー(?:を|は)\+(\d+)(?:する|される)。$/)){if(spec.g38BattleBonus)throw Error('重複バトルパワー');spec.g38BattleBonus=+m[1];powerBonus=true;continue;}
  }
  if(phase>=168&&creature){
   if(/^ハイパーエナジー\(このクリーチャーを召喚する時コストが異なる自分のクリーチャーを好きな数タップしてもよい。こうしてタップしたクリーチャー1体につきこのクリーチャーの召喚コストを2少なくする。ただしコストは0以下(?:には|に)は?ならない\)$/.test(line)){spec.hyperEnergy=true;continue;}
   if(line==='アビスラッシュ:このクリーチャーを自分の墓地から召喚してもよい。そうしたらこのターンこのクリーチャーはプレイヤーを攻撃できターンの終わりに山札の下に置かれる。'){spec.abyssRush=true;continue;}
   if(line==='このクリーチャーを自分の墓地から召喚してもよい。'){spec.graveSummon=true;continue;}
   if(/^シンパシー:クリーチャー\((?:このクリーチャーの召喚コストは|このクリーチャーを召喚する時支払うコストは)バトルゾーンにある自分のクリーチャー1体につき1少なくなる。ただしコストは0以下(?:には|に)は?ならない\)$/.test(line)){spec.g168Sympathy=true;continue;}
  }
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
  if(phase>=169){
   const trigger=creature&&line.match(/^(?:このクリーチャーが(?:バトルゾーンに)?出た時|このクリーチャーをバトルゾーンに出した時)(.+)$/),body=trigger?trigger[1]:!creature&&!seed?line:null;
   const effect=body==='相手のクリーチャーを1体選んでもよい。その選んだクリーチャーとこのクリーチャーをバトルさせる。'&&creature?'fightOptional':body==='相手の手札を見て1枚選び捨てさせる。'?'inspectDiscard':null;
   if(effect){if(nativeEntry||entry.length)throw Error('独立した誘発能力の順序対応が必要');nativeEntry=effect;continue;}
  }
  let body=line,dest=entry;
  if(creature||seed){const trigger=line.match(/^(?:このクリーチャー|このタマシード)(?:が(?:バトルゾーンに)?出た時|をバトルゾーンに出した時)(.+)$/);const atk=creature&&line.match(/^このクリーチャーが攻撃する時(.+)$/);const dies=phase>=172&&creature&&line.match(/^このクリーチャーが破壊された時(.+)$/),leaves=phase>=172&&creature&&line.match(/^このクリーチャーがバトルゾーンを離れた時(.+)$/);if(trigger)body=trigger[1];else if(atk){body=atk[1];dest=attack;}else if(dies){body=dies[1];dest=death;}else if(leaves){body=leaves[1];dest=leave;}else if(phase>=182&&creature&&(m=line.match(/^このクリーチャーが離れた時(.+)$/))){body=m[1];dest=leave;}else if(phase>=179&&creature&&(m=line.match(/^相手のターンの(?:はじめ|始め)に(.+)$/))){body=m[1];dest=opponentStart;}else if(phase>=174&&creature&&(m=line.match(/^自分のターンの(?:はじめ|始め)に(.+)$/))){body=m[1];dest=turnStart;}else if(phase>=174&&creature&&(m=line.match(/^自分のターンの終わりに(.+)$/))){body=m[1];dest=turnEnd;}else throw Error('未対応の能力文: '+raw);if(dest.length||dest===entry&&nativeEntry)throw Error('独立した誘発能力の順序対応が必要');}
  if(nativeEntry&&dest===entry)throw Error('未対応の複合効果');
  const parts=clauses(body,phase),tasks=parts.map(text=>instruction(text,phase));if(tasks.some(t=>!t)||!tasks.length)throw Error('未対応の能力文: '+raw);dest.push(...tasks.map(t=>!creature&&!seed&&(t.power||phase>=170&&t.lock)?{...t,spell:true}:t));
 }
 if(phase>=190&&!creature&&!seed){const mark=defs=>{for(const d of defs||[]){if(d.g190Freeze||phase>=210&&d.g210TapLock)d.spell=true;mark(d.defs);for(const m of d.modes||[])mark(m.defs);}};mark(entry);}
 if(f.typeText==='NEOクリーチャー'&&(!spec.neoEvolution||spec.exLife))throw Error('未対応のNEO進化条件');
 if(evolution&&(!spec.evolution||spec.exLife||spec.trigger))throw Error('特殊進化または進化条件の不足');
 if(creature&&f.powerText.endsWith('+')&&!powerBonus)throw Error('未実装の可変パワー');
 if(!creature&&!seed&&!entry.length&&!nativeEntry)throw Error('呪文の効果がありません');
 if(nativeEntry)spec.effect=nativeEntry;
 if(entry.length){spec.effect='sixPhoto';spec.g34Tasks=entry;}
 if(attack.length)spec.g34Attack=attack;
 if(block.length)spec.g178Block=block;
 if(death.length)spec.g172Death=death;
 if(leave.length)spec.g172Leave=leave;
 if(turnStart.length)spec.g174Start=turnStart;
 if(turnEnd.length)spec.g174End=turnEnd;
 if(opponentStart.length)spec.g179OpponentStart=opponentStart;
 if(tapped.length)spec.g188Tapped=tapped;
 if(battleWin.length)spec.g189BattleWin=battleWin;
 if(f.civilizations.length===5)spec.manaValue=0;
 return spec;
}
