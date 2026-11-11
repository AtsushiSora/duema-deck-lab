// Build-time only: accept complete clauses, never infer support from a keyword substring.
// The resulting definitions are pinned and checked against the official pages before release.
const colors=['光','水','闇','火','自然'];
const aliasNames=new Set(['炎のたてがみ(バーニング・ヘアー)','青銅の鎧(ブロンズ・アーム・トライブ)','無敵の咆哮(マイティ・シャウター)','紅玉草(ルビー・グラス)','ワ・タンポ－ポ・タンク','【問２】ノロン&#x2934','怪力の化身(マイティ・トーテム)']);
const normalize=s=>s.normalize('NFKC').replace(/\s|■/g,'').replaceAll('、','');
const keyword=(line,name)=>new RegExp('^(?:'+name+'){1,2}(?:\\([^()]*\\))?$').test(line);
const christinaFall=()=>({op:'Target',owner:'self',tap:true,g882TapBelowPower:true,title:'タップする自分のクリーチャーを選ぶ'});
const formulaVictory=()=>({breaker:2,g174End:[{op:'IfSource541',defs:[{op:'IfOwn',
 filter:{all:[{g590SourceTapped:true},{g334ZoneCount:{zone:'hand',min:10}}]},
 defs:[{op:'Win871',reason:'タップ中かつ自分の手札が10枚以上で勝利'}]}]}]});
const replicaAuction616='自分の山札の上から3枚を見る。そのうちの1枚をシールド化しその後残りを好きな順序で山札の下に置く。';
function instruction655(text){
 if(text==='相手のクリーチャーをパワーの合計が5000以下になるように好きな数選び破壊してもよい。')
  return powerBudget506(text.replace('破壊してもよい。','破壊する。'));
 const highPower={g228Face:{type:'creature',minPower:6000}};
 if(text==='自分の手札を1枚捨ててもよい。そうしたらその捨てたカードよりコストが小さい相手のエレメントを1つ選び破壊する。')
  return {op:'DiscardFor248',defs:[{op:'DiscardCost655'}]};
 if(text==='自分の山札の上から2枚をタップしてマナゾーンに置く。その後カードを1枚自分のマナゾーンから手札に戻す。こうしてパワー6000以上のクリーチャーを手札に戻したら相手のコスト6以下のエレメントを1つ選び持ち主のマナゾーンに置いてもよい。')
  return {op:'Sequence',defs:[{op:'Ramp',n:2,tapped:true},{op:'Select',origin:'mana',to:'hand',n:1,title:'手札に戻すマナゾーンのカードを1枚選ぶ',g654MovedFilter:highPower,g583OnMove:[{op:'Target',element:true,to:'mana',filter:{max:6},optional:true}]}]};
 if(text==='コスト2以下のクリーチャーを1体自分のマナゾーンから出してもよい。その後相手の自分のクリーチャーの数以下のコストを持つクリーチャーを1体選び持ち主のマナゾーンに置いてもよい。')
  return {op:'Sequence',defs:[{op:'Select',origin:'mana',deploy:true,n:1,optional:true,filter:{creature:true,max:2},title:'マナゾーンから出すコスト2以下のクリーチャーを選ぶ（任意）'},{op:'TargetByOwnCount655',to:'mana',optional:true}]};
 return null;
}
function instruction654(text){
 const highPower={g228Face:{type:'creature',minPower:6000}};
 if(text==='自分の山札の上から3枚を墓地に置く。その後クリーチャーを1体自分の墓地から手札に戻す。こうしてパワー6000以上のクリーチャーを手札に戻したら相手のクリーチャーを1体選び破壊する。')
  return {op:'Sequence',defs:[{op:'Mill',n:3},{op:'Select',origin:'grave',to:'hand',n:1,filter:{g228Face:{type:'creature'}},title:'手札に戻す墓地のクリーチャーを1体選ぶ',g654MovedFilter:highPower,g583OnMove:[{op:'Target',to:'grave'}]}]};
 if(text==='自分の山札の上から1枚を表向きでシールド化する。こうしてパワー6000以上のクリーチャーをシールド化したら相手のクリーチャーを1体選びシールド化してもよい。')
  return {op:'ShieldTop',n:1,faceUp:true,g654MovedFilter:highPower,after:[{op:'Target',to:'shields',optional:true}]};
 if(text==='自分の手札を1枚捨てカードを2枚引く。こうしてパワー6000以上のクリーチャーを捨てたらコストの合計が6以下になるように相手のエレメントを好きな数選び破壊する。')
  return {op:'HandFollow584',always:[{op:'Draw',n:2}],filter:highPower,then:[{op:'Select',owner:'opponent',origin:'battle',n:'all',optional:true,to:'grave',g173Targets:true,g193Select:true,g513CostBudget:6,title:'合計コスト6以下になるよう相手のエレメントを選ぶ'}]};
 return null;
}
const clauses=(body,phase)=>{
 if(phase>=655&&instruction655(body))return[body];
 if(phase>=654&&instruction654(body))return[body];
 if(phase>=638&&body==='相手のクリーチャーを1体選び破壊する。その後選んだクリーチャーのコストと同じ枚数自分の山札の上から墓地に置いてもよい。')return[body];
 if(phase>=632&&body==='自分のパワー5000以下のクリーチャーを1体破壊する。そうした場合相手のパワー5000以下のクリーチャーを1体破壊する。')return[body];
 if(phase>=631&&body==='相手のクリーチャーを1体選び破壊する。その後選んだクリーチャーのコストと同じ枚数自分の山札の上から墓地に置く。')return[body];
 if(phase>=625&&body==='自分の山札の上から1枚目をシールド化する。このターンの終わりに自分のシールドを1つブレイクする。')
  return body.match(/[^。]+。/g);
 if(phase>=616&&body===replicaAuction616)return[body];
 if(phase>=604&&instruction604(body))return[body];
 if(phase>=603&&instruction603(body))return[body];
 if(phase>=602&&instruction602(body))return[body];
 if(phase>=599&&instruction599(body))return[body];
 if(phase>=598&&instruction598(body))return[body];
 if(phase>=590&&instruction590(body))return[body];
 if(phase>=589&&instruction589(body))return[body];
 if(phase>=588&&instruction588(body))return[body];
 if(phase>=587&&instruction587(body))return[body];
 if(phase>=586&&instruction586(body))return[body];
 if(phase>=585&&instruction585(body))return[body];
 if(phase>=584&&instruction584(body))return[body];
 if(phase>=583&&instruction583(body))return[body];
 if(phase>=582&&instruction582(body))return[body];
 if(phase>=581&&instruction581(body))return[body];
 if(phase>=580&&instruction580(body))return[body];
 if(phase>=569&&instruction569(body))return[body];
 if(phase>=568&&instruction568(body))return[body];
 if(phase>=563&&instruction563(body))return[body];
 if(phase>=562&&instruction562(body))return[body];
 if(phase>=561&&instruction561(body))return[body];
 if(phase>=557&&instruction557(body))return[body];
 if(phase>=556&&instruction556(body))return[body];
 if(phase>=555&&instruction555(body))return[body];
 if(phase>=554){if(instruction554(body))return[body];if(body==='自分の山札の上から2枚を裏向きにしてそれぞれ別の新しいシールドとして自分のシールドゾーンに加える。')return Array(2).fill('自分の山札の上から1枚目をシールド化する。');}
 if(phase>=553&&instruction553(body))return[body];
 if(phase>=552&&lookBudget552(body))return[body];
 if(phase>=551&&deploy551(body))return[body];
 if(phase>=550&&deployBudget550(body))return[body];
 if(phase>=549&&instruction549(body))return[body];
 if(phase>=540&&instruction540(body))return[body];
 if(phase>=539&&instruction539(body))return[body];
 if(phase>=538&&instruction538(body))return[body];
 if(phase>=537){const parts=clauses537(body);if(parts)return parts;}
 if(phase>=535&&instruction535(body))return[body];
 if(phase>=533&&instruction533(body))return[body];
 if(phase>=532&&instruction532(body))return[body];
 if(phase>=531&&instruction531(body))return[body];
 if(phase>=530&&instruction530(body))return[body];
 if(phase>=529&&instruction529(body))return[body];
 if(phase>=526&&instruction526(body))return[body];
 if(phase>=523&&manaDeploy523(body))return[body];
 if(phase>=522&&instruction522(body))return[body];
 if(phase>=521&&target521(body))return[body];
 if(phase>=520&&mill520(body))return[body];
 if(phase>=519&&target519(body))return[body];
 if(phase>=518&&fight518(body))return[body];
 if(phase>=517&&discard517(body))return[body];
 if(phase>=516&&ramp516(body))return[body];
 if(phase>=515&&boost515(body))return[body];
 if(phase>=514&&reveal514(body))return[body];
 if(phase>=513&&instruction513(body))return[body];
 if(phase>=510&&modal510(body))return[body];
 if(phase>=509&&body==='バトルゾーンにある相手のクリーチャーを1体選びタップする。その後バトルゾーンにある自分のクリーチャーを1体選んでもよい。このターンそのクリーチャーはブロックされない。')return['バトルゾーンにある相手のクリーチャーを1体選びタップする。','バトルゾーンにある自分のクリーチャーを1体選んでもよい。このターンそのクリーチャーはブロックされない。'];
 if(phase>=506&&powerBudget506(body))return[body];
 if(phase>=503&&ally503(body))return[body];
 if(phase>=501&&body==='自分のターンの終わりにバトルゾーンにある自分のクリーチャーを1体アンタップする。それが進化クリーチャーであればカードを1枚引いてもよい。')return[body];
 if(phase>=488&&(discardCreature488(body)||body==='自分の山札を見る。その中から多色ドラゴンを1体選び相手に見せてから自分の手札に加えてもよい。その後山札をシャッフルする。'))return[body];
 if(phase>=472&&instruction472(body))return[body];
 if(phase>=467&&look467(body))return[body];
 if(phase>=465&&protect465(body))return[body];
 if(phase>=462&&handReveal462(body))return[body];
 if(phase>=461&&playersDraw461(body))return[body];
 if(phase>=461&&body==='各プレイヤーは自身の手札を1枚選び捨てる。その後自分はカードを2枚引く。')return['各プレイヤーは自身の手札を1枚選び捨てる。','カードを2枚引く。'];
 if(phase>=460&&handCycle460(body))return[body];
 if(phase>=455&&body==='自分の手札をすべて捨てその後カードを5枚まで引く。')return['自分の手札をすべて捨てる。','カードを5枚まで引く。'];
 if(phase>=449&&body==='自分の山札の上から4枚を見る。そのうちの1枚を山札の上に戻し残りを墓地に置く。')return[body];
 if(phase>=438){
  if(body==='自分はカードを2枚引き各プレイヤーは自身の手札を1枚選び捨てる。')return['カードを2枚引く。','自分の手札を1枚捨てる。','相手は自分自身の手札を1枚選び捨てる。'];
  if(body==='このターン自分のクリーチャーすべてのパワーを+4000し「パワード・ブレイカー」を与える。')return['このターン自分のクリーチャーすべてのパワーは+4000される。','このターン自分のクリーチャーすべてに「パワード・ブレイカー」を与える。'];
 }
 if(phase>=429&&look429(body))return[body];
 if(phase>=424&&look424(body))return[body];
 if(phase>=414&&look414(body))return[body];
 if(phase>=413&&/^自分の(?:他の)?クリーチャーを1体破壊してもよい。/.test(body))return[body];
 if(phase>=411&&ramp411(body))return[body];
 if(phase>=411&&body==='自分のクリーチャーを1体マナゾーンに置いてもよい。そうしたら相手は自身のクリーチャーを1体選びマナゾーンに置く。')return[body];
 if(phase>=410&&look410(body))return[body];
 if(phase>=407&&body.startsWith('このクリーチャーを破壊してもよい。'))return[body];
 if(phase>=400&&look400(body))return[body];
 if(phase>=377&&body==='相手は自身のクリーチャーを1体選んで破壊しその後自分のクリーチャーを1体破壊する。')return['相手は自身のクリーチャーを1体選んで破壊する。','自分のクリーチャーを1体破壊する。'];
 if(phase>=373){
  if(body==='自分の手札を1枚捨ててもよい。そうした場合そのターンの終わりまでこのクリーチャーのパワーは+3000され「W・ブレイカー」を得る。')return[body];
  if(body==='このターンが終わるまでバトルゾーンにある自分のクリーチャーのパワーはそれぞれ+8000され「T(トリプル)・ブレイカー」を得る。(シールドを攻撃したときこのクリーチャーはシールドを3枚ブレイクする)')return['このターン自分のクリーチャーすべてのパワーは+8000される。','このターン自分のクリーチャーすべてに「T・ブレイカー」を与える。'];
 }
 if(phase>=371&&body==='自分の手札を1枚捨ててもよい。そうしたら相手は自身のクリーチャーを1体選んで破壊する。')return[body];
 if(phase>=368){
  if(body==='カードを3枚引く。その後自分の手札を1枚山札の上に置き1枚捨てる。')return['カードを3枚引く。','自分の手札を1枚山札の上に置く。','自分の手札を1枚捨てる。'];
  if(body==='自分の他のクリーチャーを1体破壊しカードを2枚引く。')return['自分の他のクリーチャーを1体破壊する。','カードを2枚引く。'];
 }
 if(phase>=366&&look366(body))return[body];
 if(phase>=364&&body==='このターンバトルゾーンにある自分のクリーチャーすべてのパワーは+2000され「スピードアタッカー」を得る。')return['このターン自分のクリーチャーすべてのパワーは+2000される。','このターン自分のクリーチャーすべてに「スピードアタッカー」を与える。'];
 if(phase>=362&&body==='自分の山札の上から6枚を表向きにする。その中のドラゴンではないカードをすべて好きな順序で山札の一番下に置く。その後残りを好きな順序で山札の一番上に置く。')return[body];
 if(phase>=359&&body==='自分の山札の上から4枚を表向きにしてもよい。その中から光闇火自然のカードをそれぞれ1枚ずつ選んで手札に加える。その後残りを墓地に置く。')return[body];
 if(phase>=356&&body==='自分の山札の上から2枚をタップしてマナゾーンに置きその後カードを1枚自分のマナゾーンから手札に戻す。')return['自分の山札の上から2枚をタップしてマナゾーンに置く。','カードを1枚自分のマナゾーンから手札に戻す。'];
 if(phase>=345){
  if(body==='カードを2枚引く。自分の進化クリーチャーがなければ自分の手札を1枚捨てる。')return['カードを2枚引く。','自分の進化クリーチャーがなければ自分の手札を1枚捨てる。'];
 }
 return phase>=360&&look360(body)||phase>=342&&look342(body)||phase>=318&&judge318(body,phase)||phase>=310&&modal310(body)||phase>=270&&presence270(body,phase)||phase>=255&&look255(body)||phase>=254&&/^カードを[1-9]\d*枚引いてもよい。そうした(?:ら|場合)自分の手札を[1-9]\d*枚捨てる。$/.test(body)||phase>=248&&discardForEffect248(body,phase)||phase>=244&&discardAll244(body,phase)||phase>=241&&fightBuff241(body)||phase>=216&&/^自分の手札を1枚捨ててもよい。そうした(?:ら|場合)カードを[1-9]\d*枚引く。$/.test(body)||phase>=201&&search201(body)||phase>=200&&look200(body)||phase>=197&&mana197(body,phase)||phase>=185&&lookSpec(body,phase)?[body]:(phase>=181?(phase>=184?body.replace(/^自分の手札を([1-9]\d*)枚捨て(?!る)(?:その後)?/,'自分の手札を$1枚捨てる。その後'):body).replace(/^カードを([1-9]\d*)枚引き(?:その後)?/,'カードを$1枚引く。その後'):body).split('その後').filter(Boolean);
};
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
function lookSpec(text,phase=185){
 const m=text.match(/^自分の山札の上から([1-9]\d*)枚を見る。(?:その中から|そのうちの)(?:(.+?)を)?1(枚|体)(?:を)?(?:選び)?(?:(?:相手に)?(?:見せてから|見せ)|表向きにし)?(?:自分の)?手札に加え(てもよい。|る。|)(?:その後)?残りを好きな順序で(?:自分の)?山札の(?:一番)?下に置く。$/);if(!m)return null;
 const filters={'呪文':{spell:true},'呪文またはオーラ':{any:[{spell:true},{aura:true}]},'クリーチャー':{creature:true},'自然のクリーチャー':{creature:true,color:'自然'},'多色クリーチャー':{creature:true,multi:true},'進化クリーチャー':{creature:true,evolution:true},'タマシード':{seed:true},'コスト1のカード':{exactCost:1},'ジョーカーズ':{race:'ジョーカーズ'},'レクスターズ':{race:'レクスターズ'},'ファイアー・バード':{race:'ファイアー・バード'}};
 if(phase>=327){
  filters['メカまたはシノビ']={any:[{anyFaceRace:'メカ'},{anyFaceRace:'シノビ'}]};
  filters['名前に《ヘブンズ》とあるカード']={g220NameAny:['ヘブンズ']};
  filters['光と自然を文明に持つクリーチャー']={g228Face:{type:'creature',colorsAll:['光','自然']}};
  filters['ハンターとエイリアンを種族に持つクリーチャー']={g228Face:{type:'creature',raceAll:['ハンター','エイリアン']}};
  filters['D2フィールド']={g228Face:{type:'field',d2:true}};
  filters['コマンドを1体またはD2フィールド']={any:[{g228Face:{type:'creature',raceAll:['コマンド']}},{g228Face:{type:'field',d2:true}}]};
 }
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
function count203(text,phase=203){
 let m;
 if(phase>=329&&(m=text.match(/^(?:バトルゾーンにある)?(自分|相手)の(他の)?(.+?)1体につき(?:カードを1枚|1枚カードを)引(く|いてもよい)。$/))){
  const filters={'クリーチャー':{},'進化クリーチャー':{evolution:true},'コスト7以上のクリーチャー':{min:7},'光のコスト3以下のクリーチャー':{color:'光',max:3}};
  for(const color of colors)filters[color+'のクリーチャー']={color};
  for(const race of['キカイヒーロー','ムートピア','スプラッシュ・クイーン','ドリームメイト','アースイーター']){filters[race]={race};filters[race+'・クリーチャー']={race};}
  if(filters[m[3]])return{op:'CountDraw',zone:'battle',...(m[1]==='相手'?{owner:'opponent'}:{}),filter:{creature:true,...filters[m[3]]},...(m[2]?{g329Other:true}:{}),...(m[4]!=='く'?{optional:'each'}:{})};
 }

 if(text==='自分の墓地にある呪文1枚につきカードを1枚引く。')return{op:'CountDraw',zone:'grave',filter:{spell:true}};
 if(m=text.match(/^自分のマナゾーンにある(ドラゴン1体|無色カード1枚|多色カード1枚)につきカードを1枚引(く|いてもよい)。$/))return{op:'CountDraw',zone:'mana',filter:m[1]==='ドラゴン1体'?{race:'ドラゴン'}:m[1]==='無色カード1枚'?{g200Colorless:true}:{multi:true},...(m[2]!=='く'?{optional:'each'}:{})};
 if(m=text.match(/^(?:バトルゾーンにある)?(自分|相手)の(タップ(?:している|されている)クリーチャー|ジョーカーズ|ドラゴン|サイバー|コマンド|コスト4以下のクリーチャー)1体につき(?:カードを1枚|1枚カードを)引(く|いてもよい)。$/)){const f=m[2].startsWith('タップ')?{tapped:true}:m[2].startsWith('コスト')?{max:4}:{race:m[2]};return{op:'CountDraw',zone:'battle',...(m[1]==='相手'?{owner:'opponent'}:{}),filter:{creature:true,...f},...(m[3]!=='く'?{optional:'each'}:{})};}
 if(text==='自分のマナゾーンにあるカードの数と同じ枚数のカードを引く。')return{op:'CountDraw',zone:'mana'};
 if(text==='自分の手札を数える。それと同じ枚数のカードを引いてもよい。')return{op:'CountDraw',zone:'hand',optional:'all'};
 if(text==='バトルゾーンにある相手のクリーチャーと同じ枚数のカードを引いてよい。')return{op:'CountDraw',zone:'battle',owner:'opponent',filter:{creature:true},optional:'all'};
 return null;
}
function aura205(text,phase=205){
 const line=text.replace(/^このクリーチャーがバトルゾーンにある間/,'');
 const m=line.match(/^(?:(自分|相手)のターン中)?(?:バトルゾーンにある)?(自分の)?(他の)?(.+?)(?:すべて)?のパワー(?:を|は)(?:それぞれ)?\+([1-9]\d*)(?:する|される)。$/);if(!m)return null;
 const filters={'クリーチャー':{},'進化クリーチャー':{evolution:true},'光のクリーチャー':{color:'光'},'闇のクリーチャー':{color:'闇'},'自然のクリーチャー':{color:'自然'},'光と闇のクリーチャー':{any:[{color:'光'},{color:'闇'}]},'光と火のクリーチャー':{any:[{color:'光'},{color:'火'}]},'ガーディアンとワイルド・ベジーズ':{raceAny:['ガーディアン','ワイルド・ベジーズ']},'スリヴァーとサバイバー':{raceAny:['スリヴァー','サバイバー']}};
 for(const race of['グランセクト','サイバーロード','エイリアン','ガーディアン','アーマード・ドラゴン','ティラノ・ドレイク','ダイナモ'])filters[race]={race};
 if(phase>=263){for(const race of['ドラゴン','オラクル','グレートメカオー'])filters[race]={race};filters['火または自然のドラゴン']={race:'ドラゴン',any:[{color:'火'},{color:'自然'}]};}
 if(phase>=331){filters['名前に《NEX》または《ルピア》とあるクリーチャー']={g220NameAny:['NEX','ルピア']};for(const color of colors)filters[color+'のクリーチャー']={color};for(const r of['ファイアー・バード','ヒューマノイド','ビーストフォーク','ドリームメイト','セイント・ヘッド','アーク・セラフィム','サムライ','ハンター','メタリカ','アウトレイジ']){filters[r]={race:r};filters[r+'・クリーチャー']={race:r};}}
 if(phase>=326)filters['エンジェル・コマンドとデーモン・コマンド']={raceAny:['エンジェル・コマンド','デーモン・コマンド']};
 const filter=filters[phase>=326?m[4].replace(/^すべての/,''):m[4]];if(!filter)return null;return{power:+m[5],filter:{creature:true,...filter},...(m[1]?{turn:m[1]==='自分'?'own':'opponent'}:{}),...(!m[2]?{both:true}:{}),...(m[3]?{other:true}:{})};
}
function countPower207(text,phase=207){
 let line=text,condition={};
 const negative=phase>=333&&line.match(/^(このクリーチャーのパワー(?:を|は).+?につき)-([1-9]\d*)(する|される)。(?:\(パワー0以下のクリーチャーは破壊される\))?$/);if(negative)line=line.replace('-'+negative[2],'+'+negative[2]);
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
 if(phase>=333){if(target==='相手のシールド')count={zone:'shields',opponent:true};const shield=target.match(/^(自分|相手)のシールドゾーンにあるカード$/);if(shield)count={zone:'shields',g333ShieldCards:true,...(shield[1]==='相手'?{opponent:true}:{})};}
 if(phase>=330){
  const grave=target.match(/^自分の墓地(?:にある|の)(ファイアー・バード|デーモン・コマンド|サムライ|アビス・カード)$/);
  if(grave)count={zone:'grave',filter:{race:grave[1]==='アビス・カード'?'アビス':grave[1]}};
 }
 const battle=target.match(/^バトルゾーンにある(?:(自分|相手)の)?(他の)?(.+)$/);
 if(battle){const filters={'クリーチャー':{},'光のクリーチャー':{color:'光'},'水のクリーチャー':{color:'水'},'闇のクリーチャー':{color:'闇'},'火のクリーチャー':{color:'火'},'自然のクリーチャー':{color:'自然'},'水と闇のクリーチャー':{colorsAny:['水','闇']},'タップされているクリーチャー':{tapped:true},'タップされていないクリーチャー':{untapped:true},'進化クリーチャー':{evolution:true},'「ブロッカー」を持つクリーチャー':{blocker:true},'イニシエート':{race:'イニシエート'}};if(phase>=330)for(const r of['アーク・セラフィム','セイント・ヘッド','ビーストフォーク','サムライ','ヒューマノイド','ファイアー・バード','ドラゴン','スノーフェアリー','ドリームメイト','グレートメカオー']){filters[r]={race:r};filters[r+'・クリーチャー']={race:r};}const filter=filters[battle[3]];if(filter)count={zone:'battle',...(!battle[1]?{both:true}:battle[1]==='相手'?{opponent:true}:{}),...(battle[2]?{other:true}:{}),filter:{creature:true,...filter}};}
 if(phase>=444&&battle&&battle[3]==='ハンター')count={zone:'battle',...(!battle[1]?{both:true}:battle[1]==='相手'?{opponent:true}:{}),...(battle[2]?{other:true}:{}),filter:{creature:true,race:'ハンター'}};
 if(phase>=333&&battle&&/^(光または自然|光または水|火または自然|水または闇)のクリーチャー$/.test(battle[3]))count={zone:'battle',...(!battle[1]?{both:true}:battle[1]==='相手'?{opponent:true}:{}),...(battle[2]?{other:true}:{}),filter:{creature:true,colorsAny:battle[3].replace('のクリーチャー','').split('または')}};
 return count?{...count,amount:+m[2]*(negative?-1:1),...condition}:null;
}
function grantAura208(text,phase=208){
 const line=text.replace(/^このクリーチャーがバトルゾーンにある間/,'');
 let m=line.match(/^(?:バトルゾーンにある)?(自分の)?(他の)?(?:すべての)?(.+?)(?:はすべて|すべてに|すべては|は|に)(.+)$/);if(!m)return null;
 const filters={'クリーチャー':{},'進化クリーチャー':{evolution:true},'ドラゴン':{race:'ドラゴン'},'ドラゴンとハンター両方を持つクリーチャー':{raceAll:['ドラゴン','ハンター']},'水と自然のクリーチャー':{colorsAny:['水','自然']},'光または水のクリーチャー':{colorsAny:['光','水']},'光または火のクリーチャー':{colorsAny:['光','火']},'アーク・セラフィムとワイルド・ベジーズ':{raceAny:['アーク・セラフィム','ワイルド・ベジーズ']}};
 if(phase>=351){filters['多色クリーチャー']={multi:true};filters['エンジェル・コマンドとデーモン・コマンド']={raceAny:['エンジェル・コマンド','デーモン・コマンド']};}
 for(const color of colors)filters[color+'のクリーチャー']={color};
 for(const r of ['リキッド・ピープル','コマンド・ドラゴン','デーモン・コマンド','エイリアン','アンノウン','ティラノ・ドレイク','ディスタス','サイバーロードとヘドリアン'])filters[r]=r.includes('と')?{raceAny:r.split('と')}:{race:r};
 if(phase>=227)filters['光と闇のクリーチャー']={colorsAny:['光','闇']};
 if(phase>=325){
  for(const color of['光と火','闇と自然'])filters[color+'のクリーチャー']={colorsAny:color.split('と')};
  for(const race of['ヒューマノイド','ビートジョッキー','ジャイアント'])filters[race]={race};
  for(const races of['ドリームメイトとビークル・ビー','ティラノ・ドレイクとブレイブ・スピリット'])filters[races]={raceAny:races.split('と')};
  filters['ドラゴン以外のクリーチャー']={notRace:'ドラゴン'};
 }
 if(phase>=331)for(const r of['ファイアー・バード','ヒューマノイド','ビーストフォーク','ドリームメイト','セイント・ヘッド','アーク・セラフィム','サムライ','ハンター','メタリカ','アウトレイジ']){filters[r]={race:r};filters[r+'・クリーチャー']={race:r};}
 if(phase>=358)filters['エンジェル・コマンド']={race:'エンジェル・コマンド'};
 if(phase>=480){
  filters['水と火のクリーチャー']={colorsAny:['水','火']};filters['光または火のドラゴン']={colorsAny:['光','火'],race:'ドラゴン'};
  // Match the complete subject first: the は in または belongs to its color filter.
  const scope=line.match(/^(?:バトルゾーンにある)?(自分の)?(他の)?(?:すべての)?(.+)$/);
  outer:for(const key of Object.keys(filters).sort((a,b)=>b.length-a.length))for(const join of ['はすべて','すべてに','すべては','は','に'])if(scope[3].startsWith(key+join)){m=[line,scope[1],scope[2],key,scope[3].slice(key.length+join.length)];break outer;}
 }
 const filter=filters[m[3]];if(!filter)return null;let body=m[4],grants;const protectedAttack=phase>=325&&/^「パワーアタッカー\+[1-9]\d*」を得攻撃されない。$/.test(body);if(protectedAttack)body=body.replace('を得攻撃されない。','を得る。');
 if(body==='ブロックされない。')grants={unblockable:true};
 else{const grant=body.match(/^((?:「[^「」]+」)(?:と「[^「」]+」)*)(?:を得る|を与える)。(?:\(.*\))?$/);if(!grant)return null;grants={};for(const word of grant[1].matchAll(/「([^「」]+)」/g)){const key={'スピードアタッカー':'speedAttacker','スレイヤー':'slayer','ブロッカー':'blocker','W・ブレイカー':'breaker','W(ダブル)・ブレイカー':'breaker',...(phase>=480?{'マッハファイター':'machFighter','エスケープ':'escape','シールド・セイバー':'g401ShieldSaver'}:{})}[word[1]],power=word[1].match(/^パワーアタッカー\+([1-9]\d*)$/);if(key)grants[key]=key==='breaker'?2:true;else if(phase>=358&&word[1]==='ワールド・ブレイカー'){grants.breaker='∞';grants.worldBreaker=true;}else if(phase>=325&&word[1]==='パワード・ブレイカー')grants.poweredBreaker=true;else if(power)grants.attackBonus=+power[1];else return null;}}
 if(protectedAttack)grants.cannotBeAttacked=true;
 return{filter:{creature:true,...filter},...(!m[1]?{both:true}:{}),...(m[2]?{other:true}:{}),grants};
}
function recovery228(text){
 const r=text.match(/^自分の墓地から(.+?)を([1-9]\d*)(体|枚)(まで)?(?:選び|選んで)?(?:自分の)?手札に戻(す|してもよい|してよい)。$/)||text.match(/^(.+?)を([1-9]\d*)(体|枚)(まで)?自分の墓地から(?:自分の)?手札に戻(す|してもよい|してよい)。$/);
 if(!r)return null;
 const filters={'カード':{},'クリーチャー':{g228Face:{type:'creature'}},'呪文':{g228Face:{type:'spell'}},'クロスギア':{g228Face:{type:'gear'}}};
 for(const c of colors){filters[c+'のクリーチャー']={g228Face:{type:'creature',color:c}};filters[c+'の呪文']={g228Face:{type:'spell',color:c}};}
 const limited=r[1].match(/^(光|水|闇|火|自然)のコスト([1-9]\d*)以下のクリーチャー$/);
 const filter=limited?{g228Face:{type:'creature',color:limited[1],max:+limited[2]}}:filters[r[1]];
 if(!filter||r[3]==='体'&&filter.g228Face?.type!=='creature'||+r[2]>1&&!r[4]&&r[5]!=='す')return null;
 return{op:'Select',g228Recovery:true,origin:'grave',to:'hand',n:+r[2],filter,...(r[4]||r[5]!=='す'?{optional:true}:{}),title:'手札に戻す墓地の'+r[1]+'を'+r[2]+r[3]+(r[4]?'まで':'')+'選ぶ'};
}
function fightBuff241(text){
 const m=text.match(/^このターン(?:バトルゾーンにある)?自分のクリーチャー1体のパワー(?:を|は)\+([1-9]\d*)(?:する|される)。(?:その後)?(?:バトルゾーンにある)?相手のクリーチャーを1体選(ぶ|んでもよい)。その2体をバトルさせる。$/)||text.match(/^自分のクリーチャーを1体選ぶ。このターンそのクリーチャーのパワーを\+([1-9]\d*)する。(?:その後)?相手のクリーチャーを1体選(ぶ|んでもよい)。その2体をバトルさせる。$/);
 return m?{op:'FightBuff241',power:+m[1],enemyOptional:m[2]==='んでもよい'}:null;
}
function discardAll244(text,phase=244){
 if(phase>=245)text=text.replace(/^(自分の手札をすべて捨ててもよい。)そうした場合(カードを[1-9]\d*枚引く。)$/,"$1そうしたら$2");
 if(text==='自分の手札をすべて捨てる。')return{op:'DiscardAll244',draw:0};
 const optional=text.match(/^自分の手札をすべて捨ててもよい。そうしたらカードを([1-9]\d*)枚引く。$/),mandatory=text.match(/^自分の手札をすべて捨て(?:その後)?カードを([1-9]\d*)枚引く。$/),m=optional||mandatory;
 return m?{op:'DiscardAll244',draw:Number(m[1]),...(optional?{optional:true}:{})}:null;
}
function discardCreature488(text){
 const m=text.match(/^クリーチャーを1体自分の手札から捨ててもよい。そうした(?:ら|場合)(.+)$/);if(!m)return null;
 const tails={
  '相手のクリーチャーを1体破壊する。':{op:'Target',to:'grave'},
  '相手のパワー3000以下のクリーチャーを1体破壊する。':{op:'Target',to:'grave',filter:{maxPower:3000,g199Power:true}},
  '相手は自身の手札を2枚選び捨てる。':{op:'Discard',n:2}
 };
 return tails[m[1]]?{op:'DiscardFor248',g488DiscardFilter:{creature:true},defs:[tails[m[1]]]}:null;
}
function discardForEffect248(text,phase=248){
 if(phase>=249)text=text.replace(/^自分の手札からカードを1枚捨ててもよい。/,'自分の手札を1枚捨ててもよい。');
 const m=text.match(/^自分の手札を1枚捨ててもよい。そうした(?:ら|場合)(.+)$/);if(!m)return null;
 const tails={
  '相手の手札を1枚見ないで選び捨てさせる。':{op:'Discard',n:1,random:true},
  '相手は自身のクリーチャーを1体選び破壊する。':{op:'OpponentSelect',n:1,to:'grave'},
  '相手のクリーチャーを1体選ぶ。そのターンそのクリーチャーのパワーを-6000する。(パワー0以下のクリーチャーは破壊される)':{op:'Target',power:-6000,g242PowerMinus:true,title:'パワーを-6000する相手のクリーチャーを選ぶ'},
  'そのカードが持つ文明の数カードを引く。':{op:'DrawColors248'}
 };
 if(phase>=249){
  tails['自分の墓地からアビスを1枚手札に戻してもよい。']={op:'Select',origin:'grave',to:'hand',n:1,optional:true,filter:{race:'アビス'}};
  const search=search201(m[1]);if(search)tails[m[1]]=search;
 }
 return tails[m[1]]?{op:'DiscardFor248',defs:[tails[m[1]]]}:null;
}
function look360(text){
 const base={op:'Look',g255Search:true};const rows={
  '自分の山札の上から3枚を見る。その後それを好きな順序で元に戻す。':{n:3,stages:[],rest:'top',g259OrderTop:true},
  '自分の山札の上から4枚を見る。その中から1枚を自分の墓地に置き残りを好きな順序で自分の山札の一番下に戻す。':{n:4,stages:[{n:1,to:'grave'}],rest:'bottom'},
  '自分の山札の上から4枚を見る。その中から1枚選んで自分の手札に加え他の3枚を好きな順で自分の山札の一番下に戻す。':{n:4,stages:[{n:1,to:'hand'}],rest:'bottom'},
  '自分の山札の上から2枚を見る。その中から好きな枚数を墓地に置き残りを好きな順序で山札の上に戻してもよい。':{n:2,stages:[{n:2,to:'grave',optional:true}],rest:'top',g259OrderTop:true}
 };return rows[text]?{...base,...structuredClone(rows[text])}:null;
}
function look342(text){
 const base={op:'Look',g255Search:true};let m;
 if(m=text.match(/^自分の山札の上から([1-9]\d*)枚を見る。その後(?:それら|その[1-9]\d*枚)を好きな順序で(?:元に)?戻す。$/)){const repeated=text.match(/その後その([1-9]\d*)枚/);if(repeated&&+repeated[1]!==+m[1])return null;return{...base,n:+m[1],stages:[],rest:'top',g259OrderTop:true};}
 if(text==='自分の山札の上から1枚目を見る。それを墓地に置いてもよい。')return{...base,n:1,stages:[{n:1,to:'grave',optional:true}],rest:'top'};
 if(text==='自分の山札の上から3枚を表向きにする。その中から光のコマンド1体と光の呪文1枚を手札に加える。その後残りを好きな順序で山札の一番下に置く。')return{...base,n:3,public:true,stages:[{n:1,to:'hand',filter:{g228Face:{type:'creature',color:'光',raceAll:['コマンド']}}},{n:1,to:'hand',filter:{g228Face:{type:'spell',color:'光'}}}],rest:'bottom'};
 if(text==='自分の山札の上から1枚目を表向きにする。それがクリーチャーなら手札に加えそれ以外ならマナゾーンに置く。')return{...base,n:1,public:true,stages:[{n:'all',to:'hand',filter:{creature:true}}],rest:'mana'};
 if(text==='自分の山札の上から2枚を見る。そのうち1枚を墓地に置きもう1枚をマナゾーンに置く。')return{...base,n:2,stages:[{n:1,to:'grave'}],rest:'mana'};
 if(text==='自分の山札の上から3枚を表向きにする。その中からジャイアントをすべてタップしてマナゾーンに置き残りを好きな順序で山札の下に置く。')return{...base,n:3,public:true,stages:[{n:'all',to:'mana',tapped:true,filter:{anyFaceRace:'ジャイアント'}}],rest:'bottom'};
 return null;
}
function look255(text){
 const base={op:'Look',g255Search:true},creatureToHand={n:1,public:true,stages:[{n:'all',to:'hand',filter:{creature:true}}],rest:'mana'};
 const specs={
  '自分の山札の上から6枚を見る。その中から3枚までタップして自分のマナゾーンに置きその後残りを好きな順序で自分の山札の一番下に置く。':{n:6,stages:[{n:3,to:'mana',tapped:true,optional:true}],rest:'bottom'},
  '自分の山札の上から4枚を見る。それらを1枚ずつ手札マナゾーン墓地山札の下に置く。':{n:4,g255Distribute:true,stages:[{n:1,to:'hand'},{n:1,to:'mana'},{n:1,to:'grave'}],rest:'bottom'},
  '自分の山札の上から1枚目を表向きにする。それがクリーチャーなら手札に加える。それ以外ならマナゾーンに置く。':creatureToHand,
  '自分の山札の上から1枚目を表向きにする。それがクリーチャーなら手札に加える。そうでなければマナゾーンに置く。':creatureToHand,
  '自分の山札の上から1枚目を表向きにする。それがアビスなら手札に加えてもよい。アビスではない場合または手札に加えない場合は墓地に置く。':{n:1,public:true,stages:[{n:1,to:'hand',filter:{anyFaceRace:'アビス'},optional:true}],rest:'grave'}
 };
 return specs[text]?{...base,...structuredClone(specs[text])}:null;
}
function presence270(text,phase){
 const m=text.match(/^バトルゾーンに自分の(光|水|闇|火|自然)(?:または(光|水|闇|火|自然))?のクリーチャーがあれば(.+)$/);if(!m)return null;
 const defs=clauses(m[3],phase).map(q=>instruction(q,phase));if(!defs.length||defs.some(d=>!d))return null;
 return{op:'IfOwn',filter:{creature:true,...(m[2]?{any:[{color:m[1]},{color:m[2]}]}:{color:m[1]})},defs};
}
function modal363(text){
 const kill=(filter,n)=>({op:'Select',owner:'opponent',origin:'battle',to:'grave',n,filter:{creature:true,...filter},g173Targets:true,g193Select:true,title:'破壊する相手のクリーチャーを'+n+'体選ぶ'});
 if(text==='相手のパワー5000以下のクリーチャー1体か相手のパワー2000以下のクリーチャー2体を破壊する。')return{op:'Choose',g184Modes:true,modes:[{label:'パワー5000以下の相手クリーチャー1体を破壊',defs:[{op:'Target',to:'grave',filter:{maxPower:5000,g199Power:true}}]},{label:'パワー2000以下の相手クリーチャー2体を破壊',defs:[kill({maxPower:2000,g199Power:true},2)]}]};
 if(text==='次のうちいずれかひとつを選ぶ。▼相手の「ブロッカー」を持つクリーチャーを2体破壊する。▼相手のパワー5000以下のクリーチャーを2体破壊する。▼相手の侵略者を2体破壊する。')return{op:'Choose',g184Modes:true,modes:[{label:'相手のブロッカー2体を破壊',defs:[kill({blocker:true},2)]},{label:'パワー5000以下の相手クリーチャー2体を破壊',defs:[kill({maxPower:5000,g199Power:true},2)]},{label:'相手の侵略者2体を破壊',defs:[kill({race:'侵略者'},2)]}]};
 return null;
}
function modal310(text){if(text==='バトルゾーンにある相手のクリーチャーを1体選んで持ち主の手札に戻すか自分の山札からコスト3以下のクリーチャーを1体選び相手に見せてから手札に加えその後山札をシャッフルする。')return{op:'Choose',g184Modes:true,modes:[{label:'相手クリーチャー1体を手札に戻す',defs:[{op:'Target',to:'hand'}]},{label:'山札からコスト3以下のクリーチャーを手札に加える',defs:[{op:'Look',g310Search:true,g201Search:true,g200Search:true,n:'all',rest:'shuffle',stages:[{n:1,to:'hand',filter:{creature:true,max:3},reveal:true,optional:true}]}]}]};return null;}
function judge318(text,phase){
 if(phase>=416)text=text.replace(/(そのカードのコストが相手以上であれば自分の勝ちとする\))\)$/,'$1');
 const m=text.match(/^相手とガチンコ・ジャッジする。自分が勝ったら(.+)\(ガチンコ・ジャッジ:各プレイヤーは自身の山札の上から1枚目を見せそれを一番下に置く。そのカードのコストが相手以上であれば自分の勝ちとする\)$/);
 if(!m||m[1].includes('ガチンコ・ジャッジ'))return null;
 const def=instruction(m[1],phase);return def?{op:'Judge318',defs:[def]}:null;
}
function look366(text){
 const base={op:'Look',g255Search:true};
 if(text==='自分の山札を見る。その中からジャイアント・インセクトを1体選び相手に見せてから自分の手札に加えてもよい。その後山札をシャッフルする。')return{...base,g201Search:true,g200Search:true,n:'all',stages:[{n:1,to:'hand',filter:{creature:true,race:'ジャイアント・インセクト'},reveal:true,optional:true}],rest:'shuffle'};
 if(text==='自分の山札の上から3枚をすべてのプレイヤーに見せる。その中からエンジェル・コマンドとジャスティス・ウイングをすべて自分の手札に加えその後残りを好きな順序で自分の山札の一番下に置く。')return{...base,n:3,public:true,stages:[{n:'all',to:'hand',filter:{any:[{anyFaceRace:'エンジェル・コマンド'},{anyFaceRace:'ジャスティス・ウイング'}]}}],rest:'bottom'};
 if(text==='自分の山札の上から2枚をすべてのプレイヤーに見せる。その中からコスト7以上のカードを好きな数手札に加えてもよい。残りを自分のマナゾーンに置く。')return{...base,n:2,public:true,stages:[{n:'all',to:'hand',filter:{anyFaceMinCost:7},optional:true}],rest:'mana'};
 return null;
}
function look400(text){
 if(text==='自分の山札の上から5枚を見る。その中からクリーチャーを1体選びすべてのプレイヤーに見せてから手札に加えてもよい。その後残りを好きな順序で山札の一番下に置く。')return{op:'Look',g185Search:true,n:5,rest:'bottom',stages:[{n:1,to:'hand',filter:{creature:true},reveal:true,optional:true}]};
 return null;
}
function look410(text){
 const rows={
  '自分の山札の上から3枚を見る。その中から2枚自分の墓地に置く。':{n:3,stages:[{n:2,to:'grave'}],rest:'top'},
  '自分の山札の上から3枚を見る。そのうちの1枚を裏向きのまま新しいシールドとしてシールドゾーンに加え1枚をマナゾーンに置き残りの1枚を手札に加える。':{n:3,stages:[{n:1,to:'shields'},{n:1,to:'mana'},{n:1,to:'hand'}],rest:'top'},
  '自分の山札の上から2枚を見る。その中から1枚を裏向きのまま新しいシールドとして自分のシールドゾーンに加えもう1枚を自分の手札に加える。':{n:2,stages:[{n:1,to:'shields'},{n:1,to:'hand'}],rest:'top'}
 };
 return rows[text]?{op:'Look',...structuredClone(rows[text])}:null;
}
function ramp411(text){
 const rows={
  '自分の山札の上から1枚目をマナゾーンに置く。その後それがクリーチャーでなければこのクリーチャーをマナゾーンに置く。':{kind:'selfUnlessCreature'},
  '自分の山札の上から1枚目をマナゾーンに置く。その後それ以下のコストを持つクリーチャーをすべて持ち主のマナゾーンに置く。':{kind:'costSweep'},
  '自分の山札の上から1枚目をマナゾーンに置く。それがパワー12000以上のクリーチャーなら自分の山札の上からもう1枚マナゾーンに置く。':{kind:'match',filter:{creature:true,minPower:12000}},
  '自分の山札の上から1枚目をマナゾーンに置く。そのカードがコマンドなら自分の山札の上からもう1枚マナゾーンに置く。':{kind:'match',filter:{anyFaceRace:'コマンド'}}
 };
 return rows[text]?{op:'RampCheck411',...structuredClone(rows[text])}:null;
}
// Pipippi uses the later DMX14-035 text: adding an evolution creature is mandatory.
function look414(text){
 if(text==='自分の山札の上から1枚目をすべてのプレイヤーに見せる。それが進化クリーチャーであれば手札に加える。進化クリーチャー以外のカードであれば山札の一番下に戻す。')text='自分の山札の上から1枚目を表向きにする。それが進化クリーチャーであれば手札に加えてもよい。進化クリーチャー以外のカードであれば山札の一番下に戻す。';
 const b={op:'Look',g255Search:true};
 const rules={
  '自分の山札の上から3枚を見る。その中からメタリカを1体または呪文を1枚相手に見せてから手札に加えてもよい。残りを好きな順序で山札の一番下に置く。':{n:3,stages:[{n:1,to:'hand',filter:{any:[{creature:true,race:'メタリカ'},{spell:true}]},reveal:true,optional:true}],rest:'bottom'},
  '自分の山札の上から2枚を見る。そのうちの1枚を裏向きにして新しいシールドとして自分のシールドゾーンに置きもう1枚を手札に加える。':{n:2,stages:[{n:1,to:'shields'},{n:1,to:'hand'}],rest:'top'},
  '自分の山札の上から3枚を見る。そのうちの1枚を墓地に1枚をマナゾーンに置き最後の1枚を手札に加える。':{n:3,stages:[{n:1,to:'grave'},{n:1,to:'mana'},{n:1,to:'hand'}],rest:'top'},
  '自分の山札の上から2枚をすべてのプレイヤーに見せてもよい。その中から名前に《超次元》とある呪文を1枚選んで自分の手札に加え残りを墓地に置く。':{n:2,public:true,offer:true,stages:[{n:1,to:'hand',filter:{spell:true,g220NameAny:['超次元']}}],rest:'grave'},
  '自分の山札の上から3枚をすべてのプレイヤーに見せる。このようにして見せたオラクルをすべて自分の手札に加えてもよい。残りを好きな順序で山札の一番下に戻す。':{n:3,public:true,stages:[{n:'all',to:'hand',filter:{anyFaceRace:'オラクル'},optional:true}],rest:'bottom'},
  '自分の山札の上から3枚を表向きにしてもよい。その中からクロスギアをすべて自分の手札に加えその後残りを好きな順序で山札の一番下に置く。':{n:3,public:true,offer:true,stages:[{n:'all',to:'hand',filter:{g201Gear:true}}],rest:'bottom'},
  '自分の山札の上から4枚を表向きにする。その中から名前に《白騎士》とあるカードを1枚手札に加える。その後残りのカードを好きな順序で山札の一番下に戻す。':{n:4,public:true,stages:[{n:1,to:'hand',filter:{g220NameAny:['白騎士']}}],rest:'bottom'},
  '自分の山札の上から1枚目を表向きにする。それがビートジョッキーなら自分の手札に加える。それ以外なら自分の山札の一番下に置く。':{n:1,public:true,stages:[{n:1,to:'hand',filter:{anyFaceRace:'ビートジョッキー'}}],rest:'bottom'},
  '自分の山札の上から1枚目を表向きにする。それが進化クリーチャーであれば手札に加えてもよい。進化クリーチャー以外のカードであれば山札の一番下に戻す。':{n:1,public:true,stages:[{n:1,to:'hand',filter:{creature:true,evolution:true}}],rest:'bottom'}
 },row=rules[text];if(!row)return null;const {offer,...args}=structuredClone(row),d={...b,...args};return offer?{op:'Offer',g359RevealAll:true,title:'山札の上'+args.n+'枚を公開して効果を使う？',defs:[d]}:d;
}
function look424(text){
 const rules={
  '自分の山札の上から3枚を表向きにする。その中から光のカードと闇のカードをすべて手札に加えてもよい。残りを墓地に置く。':{n:3,stages:[{n:'all',to:'hand',filter:{any:[{anyFaceColor:'光'},{anyFaceColor:'闇'}]},optional:true,g424AllOrNone:true}],rest:'grave'},
  '自分の山札の上から3枚を表向きにする。その中からハンターを好きな数手札に加え残りをタップしてマナゾーンに置く。':{n:3,stages:[{n:'all',to:'hand',filter:{anyFaceRace:'ハンター'},optional:true}],rest:'mana',restTapped:true},
  '自分の山札の上から4枚を表向きにする。その中から水火自然のカードを1枚ずつ手札に加える。残りを好きな順序で山札の下に置く。':{n:4,stages:['水','火','自然'].map(color=>({n:1,to:'hand',filter:{anyFaceColor:color},title:color+'のカードを1枚手札に加える'})),rest:'bottom'}
 },row=rules[text];return row?{op:'Look',g255Search:true,public:true,...structuredClone(row)}:null;
}
function look429(text){
 const base={op:'Look',g255Search:true,public:true};
 if(text==='自分の山札の上から3枚を表向きにする。その中から好きな数のクリーチャーを選んで手札に加え残りをタップしてマナゾーンに置く。')return{...base,n:3,stages:[{n:'all',to:'hand',filter:{creature:true},optional:true}],rest:'mana',restTapped:true};
 const m=text.match(/^自分の山札の上から([1-9]\d*)枚を表向きにする。その中から(.+?)を(1枚|1体)(?:選び)?(?:自分の)?手札に加え(てもよい。|る。)(?:その後)?残り(?:のカード)?を好きな順序で(?:自分の)?山札の(?:一番)?下に(?:置く|戻す)。$/);
 if(!m)return null;
 const filters={'クリーチャー':{creature:true},'進化クリーチャー':{creature:true,evolution:true},'呪文':{spell:true},'光または火のコマンド・ドラゴン':{creature:true,race:'コマンド・ドラゴン',any:[{color:'光'},{color:'火'}]}};
 const filter=filters[m[2]];if(!filter)return null;
 return{...base,n:+m[1],stages:[{n:1,to:'hand',filter:structuredClone(filter),...(m[4]==='てもよい。'?{optional:true}:{})}],rest:'bottom'};
}
// These clauses are accepted only inside a fully recognized Super S Trigger spell.
function battleCard579(text){
 const m=text.match(/^バトルゾーンにある(相手の|他の)?(?:(コスト([1-9]\d*)(以下|以上)の)|(クリーチャーではない))?カードを1枚(選び持ち主の手札に戻す|選び持ち主の手札に戻してもよい|選び持ち主の墓地に置く|選び持ち主の墓地に置いてもよい|選んで破壊する|選び持ち主のマナゾーンに置く|選び持ち主のマナゾーンに置いてもよい|選びシールド化してもよい|選ぶ。相手はそれを自身の山札の一番下に置く)。$/);
 if(!m||m[6].startsWith('選ぶ。相手')&&m[1]!=='相手の')return null;
 const destination=m[6],to=destination.includes('手札')?'hand':destination.includes('マナゾーン')?'mana':destination.includes('シールド化')?'shields':destination.includes('山札')?'deck':'grave';
 return{op:'BattleCardMove579',to,...(m[1]!=='相手の'?{anyOwner:true}:{}),...(m[1]==='他の'?{other:true}:{}),
  ...(m[2]?{[m[4]==='以下'?'max':'min']:+m[3]}:{}),...(m[5]?{nonCreature:true}:{}),...(destination.endsWith('てもよい')?{optional:true}:{})};
}
function instruction580(text){
 const otherAttack='それがそのターンはじめての攻撃でなければ';
 if(text.startsWith(otherAttack)){
  const move=battleCard579(text.slice(otherAttack.length));
  if(move)return{op:'IfOwn',filter:{g580LaterAttack:true},defs:[move]};
 }
 if(text==='バトルゾーンにある相手のコスト4以下のカードを1枚選ぶ。それがクリーチャーであれば破壊しそれ以外なら持ち主の墓地に置く。'){
  // Moving any battle-zone card to the graveyard counts as destruction.
  return{op:'BattleCardMove579',to:'grave',max:4};
 }
 if(text==='バトルゾーンにある相手のカードを1枚選ぶ。相手はそのカードを自身のマナゾーンに置くか手札に戻す。'){
  return{op:'BattleCardMove579',to:'hand',ownerChoosesDestination:true};
 }
 if(text==='相手はバトルゾーンにある自身のカードを1枚選ぶ。その後自分はバトルゾーンにある相手の残りのカードの中から1枚選んで破壊する。'){
  return{op:'ProtectBattleCard580'};
 }
 if(text==='バトルゾーンに自分のD2フィールドがあればバトルゾーンにあるクリーチャーを1体選び持ち主の手札に戻してもよい。'){
  return{op:'IfOwn',filter:{g580D2Field:true},defs:[{op:'Target',to:'hand',anyOwner:true,optional:true}]};
 }
 if(text==='プレイヤーを1人選んでもよい。そのプレイヤーは自身の墓地のカードをすべて山札に加えてシャッフルする。'){
  return{op:'GraveShuffle545',optional:true};
 }
 return null;
}
function instruction581(text){
 const both=['battle','mana'];
 if(['バトルゾーンまたはいずれかのマナゾーンからカードを1枚選び持ち主の手札に戻す。','バトルゾーンかどちらかのプレイヤーのマナゾーンからカードを1枚選び持ち主の手札に戻す。'].includes(text)){
  return{op:'BattleCardMove579',anyOwner:true,zones:both,to:'hand'};
 }
 if(text==='相手はバトルゾーンかマナゾーンから自分自身のカードを1枚選び持ち主の墓地に置く。'){
  return{op:'OwnCard581',who:'opponent',zones:both,to:'grave'};
 }
 if(text==='プレイヤーをひとり選ぶ。そのプレイヤーはバトルゾーンまたはマナゾーンから自分自身のカードを1枚選び持ち主の山札の一番上に置く。'){
  return{op:'OwnCard581',who:'choose',zones:both,to:'deckTop'};
 }
 if(text==='それぞれのマナゾーンからカードを1枚ずつ選び持ち主の山札の一番上に置く。'){
  return{op:'ManaPair581'};
 }
 if(text==='クリーチャーを1体自分のマナゾーンから山札の一番上に置いてもよい。'){
  return{op:'Select',origin:'mana',to:'deckTop',n:1,optional:true,g183Return:true,filter:{creature:true,faceUp:true}};
 }
 if(text==='バトルゾーンに自分のダママ団があれば多色カードを1枚自分のマナゾーンから手札に戻してもよい。'){
  return{op:'IfOwn',filter:{element:true,race:'ダママ団'},defs:[{op:'Select',origin:'mana',to:'hand',n:1,optional:true,filter:{multi:true,faceUp:true}}]};
 }
 return null;
}
function manaKeep582(text){
 const m=text.match(/^(?:(自分の|相手は(?:自分)?自身の)マナゾーンからカードを(3|6)枚選び|(?:相手は)?カードを(3|6)枚(?:自分の|自身の)マナゾーンから選び)(?:それ以外(?:のカード)?を|残りを)(?:自分の|持ち主の)?墓地に置く。$/);
 return m?{op:'ManaChoose582',n:+(m[2]||m[3]),keep:true,who:text.startsWith('相手は')?'opponent':'self',to:'grave'}:null;
}
function instruction582(text){
 const keep=manaKeep582(text);
 if(keep)return keep;
 const each=text.match(/^各プレイヤーは自分自身のマナゾーンから(カード|火以外のカード)を(1|2)枚(?:ずつ)?選びそれぞれの墓地に置く。$/);
 if(each)return{op:'ManaChoose582',who:'each',n:+each[2],to:'grave',...(each[1].startsWith('火')?{exceptColor:'火'}:{})};
 if(text==='プレイヤーを一人選ぶ。そのプレイヤーは自分自身のマナゾーンからカードを2枚選び手札に戻す。'){
  return{op:'ManaChoose582',who:'choose',n:2,to:'hand'};
 }
 if(text==='カードを3枚自分のマナゾーンから選ぶ。そのうちの1枚を手札に戻し他の1枚を自分の山札の一番下に置き残りの1枚を山札の一番上に置く。'){
  return{op:'ManaChoose582',n:3,destinations:['hand','deck','deckTop']};
 }
 if(text==='自分のマナゾーンからカードを2枚選び自分の墓地に置く。')return{op:'ManaChoose582',n:2,to:'grave'};
 return null;
}
const creatureManaReturn583={op:'Select',origin:'mana',to:'hand',n:1,optional:true,filter:{faceUp:true,g228Face:{type:'creature'}}};
function instruction583(text){
 const recovery={
  '好きな枚数のカードを自分の墓地からマナゾーンに置く。':{n:'all',optional:true},
  '好きな枚数の生徒会組カードを自分の墓地からマナゾーンに置く。':{n:'all',optional:true,filter:{anyFaceRace:'生徒会組'}},
  'サムライをすべて自分の墓地からマナゾーンに置く。':{n:'all',filter:{anyFaceRace:'サムライ'}},
  'クリーチャーを3体まで自分の墓地からマナゾーンに置く。':{n:3,optional:true,filter:{g228Face:{type:'creature'}}},
  '自分の墓地からカードを3枚まで選び自分のマナゾーンに置く。':{n:3,optional:true}
 }[text];
 if(recovery)return{op:'Select',origin:'grave',to:'mana',g583Group:true,title:'マナに置く墓地のカードを選ぶ',...recovery};
 if(text==='自分のマナゾーンから好きな枚数のカードを選び自分の墓地に置く。その後その枚数と同じ数のカードを引く。'){
  return{op:'Select',origin:'mana',to:'grave',g583Group:true,g583DrawMoved:true,n:'all',optional:true,title:'墓地に置いて同じ枚数を引くマナを選ぶ'};
 }
 if(text==='カードを1枚自分のマナゾーンから山札の一番上に置いてもよい。'){
  return{op:'Select',origin:'mana',to:'deckTop',g183Return:true,n:1,optional:true,title:'山札の一番上に置くマナを選ぶ'};
 }
 if(text==='自分のマナゾーンからクリーチャーを1体選び自分の手札に戻してよい。')return creatureManaReturn583;
 const follow=text.match(/^クリーチャーを1体自分のマナゾーンから手札に戻してもよい。そうした場合自分の山札の上から1枚目を(タップして)?マナゾーンに置く。$/);
 if(follow)return{...creatureManaReturn583,g583OnMove:[{op:'Ramp',n:1,...(follow[1]?{tapped:true}:{})}]};
 if(text==='自分の山札の上から1枚目をタップしてマナゾーンに置く。それがドラゴンなら自分の山札の上からもう1枚タップしてマナゾーンに置く。'){
  return{op:'RampCheck411',kind:'match',filter:{anyFaceRace:'ドラゴン'},tapped:true};
 }
 if(text==='自分の山札の上から1枚目をマナゾーンに置く。それがパワー12000以上のクリーチャーなら自分の山札の上からさらに1枚マナゾーンに置く。'){
  return{op:'RampCheck411',kind:'match',filter:{g583PrintedMinPower:12000}};
 }
 if(text==='自分のマナゾーンにすべての文明が揃っていれば自分の山札の上からさらに1枚マナゾーンに置く。'){
  return{op:'IfOwn',filter:{g568ManaColors:colors},defs:[{op:'Ramp',n:1}]};
 }
 if(text==='相手のマナゾーンにあるカードの数が自分のより多い場合自分の山札の上から1枚目を自分のマナゾーンに置く。'){
  return{op:'IfOwn',filter:{g334ZoneCount:{zone:'mana',lessThanOpponent:true}},defs:[{op:'Ramp',n:1}]};
 }
 if(text==='自分の山札の上から3枚を見る。そのうち1枚ずつマナゾーン墓地山札の下に置く。'){
  return{op:'Look',n:3,g255Distribute:true,stages:[{n:1,to:'mana'},{n:1,to:'grave'}],rest:'bottom'};
 }
 return null;
}
function instruction584(text){
 const fixed=text.match(/^カードを([1-5])枚引き(?:その後)?(?:自分の)?手札を([1-3])枚捨てる。$/);
 if(fixed)return{op:'Sequence',defs:[{op:'Draw',n:+fixed[1]},{op:'Discard',owner:'self',n:+fixed[2]}]};
 if(text==='カードを5枚引きその後相手のシールドの数と同じ枚数自分の手札を捨てる。'){
  return{op:'Sequence',defs:[{op:'Draw',n:5},{op:'Discard',owner:'self',g584Count:'opponentShields'}]};
 }
 if(text==='カードを2枚まで引く。その後こうして引いた枚数と同じ数自分の手札を捨てる。'){
  return{op:'PlayerDraw461',n:2,upTo:true,discard:'drawn'};
 }
 if(text==='カードを2枚引いてもよい。そうした場合自分の手札を2枚捨てる。'){
  return{op:'PlayerDraw461',n:2,optional:true,discard:2};
 }
 if(text==='自分のシールド1枚につき相手の手札を1枚見ないで選び捨てさせる。'){
  return{op:'Discard',g584Count:'ownShields',random:true};
 }
 if(text==='相手の手札を見る。その中から1枚選び捨てさせる。'||text==='相手の手札を見て1枚選び捨てさせる。')return{op:'InspectOne258'};
 const follow={
  '自分の手札を1枚捨てその後カードを1枚引く。こうして捨てた手札が進化クリーチャーならカードをもう1枚引く。':{always:[{op:'Draw',n:1}],filter:{evolution:true},then:[{op:'Draw',n:1}]},
  '自分の手札を1枚捨ててもよい。そうしたらカードを1枚引く。こうして捨てた手札のコストが6以上ならカードをもう1枚引く。':{optional:true,success:[{op:'Draw',n:1}],filter:{anyFaceMinCost:6},then:[{op:'Draw',n:1}]},
  '相手の手札を1枚見ないで選び捨てさせる。そのカードが呪文であればカードを1枚引いてもよい。':{blind:true,filter:{spell:true},then:[{op:'Offer',title:'カードを1枚引く？',defs:[{op:'Draw',n:1}]}]},
  '相手の手札を1枚見ないで選び捨てさせる。それが多色カードでない場合多色クリーチャーを1体自分の墓地から手札に戻してもよい。':{blind:true,filter:{g584MonoCard:true},then:[{op:'Select',origin:'grave',to:'hand',n:1,optional:true,filter:{g228Face:{type:'creature',multicolor:true}}}]},
  'カードを1枚引きその後自分の手札を1枚捨てる。捨てたカードがジョーカーズならカードを1枚引く。':{first:[{op:'Draw',n:1}],filter:{anyFaceRace:'ジョーカーズ'},then:[{op:'Draw',n:1}]},
  'カードを1枚引きその後自分の手札を1枚捨てる。こうして呪文を捨てたらこのクリーチャーをアンタップする。':{first:[{op:'Draw',n:1}],filter:{spell:true},then:[{op:'Untap'}]}
 }[text];
 if(follow){
  const {first,...condition}=follow,discard={op:'HandFollow584',...condition};
  return first?{op:'Sequence',defs:[...first,discard]}:discard;
 }
 return null;
}
const shieldHand585={op:'ShieldHand',g238ShieldHand:true,optional:true,g535Count:1};
function instruction585(text){
 const peeks={
  '相手のシールドを1枚選んで見る。そのあとそれを元に戻す。これをあと2回まで行ってよい。':{who:'opponent',remaining:3},
  '相手のシールドをすべて見る。その後そのシールドを元の場所に戻す。':{who:'opponent',all:true},
  '相手のシールドをひとつ見る。':{who:'opponent'},
  '相手のシールドを1枚見る。':{who:'opponent'},
  'シールドを1枚選んで見る。その後それを元に戻す。':{who:'both'},
  'いずれかのシールドゾーンからシールドをひとつ選んで見る。':{who:'both'},
  '自分のシールドカードを1枚見る。そのカードと自分の山札の上から1枚目を入れ替えてもよい。':{who:'self',swap:true,cardOnly:true},
  '相手の手札とシールドを見る。その後シールドを元の場所に戻す。':{who:'opponent',all:true,hand:true}
 }[text];
 if(peeks)return{op:'Peek585',...peeks};
 if(text==='自分のシールドの数を5から引く。その枚数相手の手札を見ないで選び捨てさせる。')return{op:'Discard',g585ShieldDeficit:true,random:true};
 return null;
}
function instruction586(text){
 const pairs={
  'クリーチャーを2体選びバトルさせる。':{who:'both'},
  'クリーチャーを2体選ぶ。この2体をバトルさせる。':{who:'both'},
  '相手のクリーチャーを2体選びバトルさせる。':{who:'opponent'},
  'バトルゾーンにある相手のクリーチャーを2体選びその2体にバトルさせる。':{who:'opponent'},
  'バトルゾーンにあるクリーチャーを2体選びタップする。そのクリーチャー同士をバトルさせる。':{who:'both',tap:true},
  'バトルゾーンにある自分のクリーチャーを1体選ぶ。その後相手はバトルゾーンにある自身のクリーチャーを1体選ぶ。この2体にバトルさせる。':{who:'self',opponentPicks:true}
 }[text];
 if(pairs)return{op:'FightPair586',...pairs};
 if(text==='自分のファイアー・バードまたはドラゴンを1体と相手のクリーチャーを1体選んでもよい。選んだクリーチャー2体をバトルさせる。'){
  return{op:'Fight240',optional:true,g419FightFilter:{raceAny:['ファイアー・バード','ドラゴン']}};
 }
 if(text==='すべてのクリーチャーをタップする。')return{op:'TapAll',both:true};
 if(text==='相手のシールドを3枚ブレイクする。')return{op:'Break497',n:3};
 if(text==='各プレイヤーはバトルゾーンにあるパワー3000以下のクリーチャーすべてをそれぞれの墓地に置く。'){
  return{op:'Sweep',both:true,to:'grave',filter:{creature:true,maxPower:3000,g199Power:true}};
 }
 if(text==='バトルゾーンにあるパワー3000以下のクリーチャーをすべて持ち主のマナゾーンに置く。'){
  return{op:'Sweep',both:true,to:'mana',filter:{creature:true,maxPower:3000,g199Power:true}};
 }
 return null;
}
const battleWinGroup587=(filter={})=>({op:'GroupGrant364',owner:'self',filter:{creature:true,...filter},grant:{g34AlwaysWin:true}});
function instruction587(text){
 switch(text){
 case 'このターン自分のクリーチャーはすべてのバトルに勝つ。':
  return battleWinGroup587();
 case 'このターン自分のパワーの最後の三桁が「500」のクリーチャーはすべて「このクリーチャーはすべてのバトルに勝つ」を得る。':
  return battleWinGroup587({g587PowerEnding500:true});
 case '自分のクリーチャーの数が自分のシールドの数以上ならそのターン自分のクリーチャーはすべてのバトルに勝つ。':
  return {op:'IfOwn',filter:{g541CreaturesAtLeastShields:true},defs:[battleWinGroup587()]};
 case 'そのターンこのクリーチャーは「スピードアタッカー」を得すべてのバトルに勝つ。':
 case 'このターンこのクリーチャーに「スピードアタッカー」を与えこのクリーチャーはすべてのバトルに勝つ。':
  return {op:'ShinkaGrant397',grant:{speedAttacker:true,g34AlwaysWin:true}};
 case '自分の他のクリーチャーを1体タップしてもよい。そうしたらこのクリーチャーをアンタップする。':
  return {op:'Target',owner:'self',g179Other:true,filter:{untapped:true},tap:true,optional:true,g587AfterSelection:true,after:[{op:'Untap'}],title:'タップする自分の他のクリーチャーを選ぶ'};
 default:return null;
 }
}
function instruction588(text){
 const lookTwo={op:'Look',n:2,stages:[{n:1,to:'hand'}],rest:'bottom'};
 switch(text){
 case '自分の山札の上から2枚を見てもよい。そうした場合そのうちの1枚を自分の手札に加えもう1枚を山札の一番下に置く。':
  return {op:'Offer',title:'山札の上から2枚を見る？',defs:[lookTwo]};
 case '自分の山札の上から1枚目を見る。それを自分の手札またはマナゾーンに加えてもよい。':
  return {op:'Look',n:1,stages:[{n:1,optional:true,g467Destinations:['hand','mana']}],rest:'top'};
 case '自分の山札の上から2枚を見る。そのうちの1枚をマナゾーンに置きもう1枚を手札に加える。':
  return {op:'Look',n:2,stages:[{n:1,to:'mana'},{n:1,to:'hand'}],rest:'top'};
 case 'バトルゾーンにある相手のクリーチャーを1体選びこのクリーチャーとバトルさせてもよい。':
  return {op:'Fight240',self:true,optional:true};
 case '破壊する。その後自分の山札の上から2枚を墓地に置く。':
  return {op:'Sequence',defs:[{op:'SelfDestroy'},{op:'Mill',n:2}]};
 case '自分の山札の上から1枚目をマナゾーンに置いてもよい。そうしたらカードを1枚自分のマナゾーンから手札に戻してもよい。':
  return {op:'Offer',title:'山札の上から1枚をマナゾーンに置く？',defs:[{op:'Ramp',n:1},{op:'Select',origin:'mana',to:'hand',n:1,optional:true,g232ManaReturn:true,title:'手札に戻すマナを選ぶ'}]};
 case 'バトルゾーンに自分の《GF隊中佐爆音のジャック》があれば相手のシールドを3つまで選び持ち主の墓地に置く。':
  return {op:'IfOwn',filter:{creature:true,g201ExactName:'GF隊中佐 爆音のジャック'},defs:[{op:'ShieldGrave588',n:3}]};
 default:return null;
 }
}
function instruction589(text){
 switch(text){
 case '次の相手のターン相手は呪文を唱えることができない。':
  return {op:'SpellLock589',nextOnly:true};
 case '文明をひとつ選ぶ。相手は自分自身の次のターンの終わりまでその文明の呪文を唱えることができない。':
  return {op:'SpellLock589',chooseColor:true};
 case '相手は自身の墓地をシャッフルし山札の下に置く。':
 case '相手は自身の墓地をシャッフルし山札の一番下に置く。':
  return {op:'GraveBottom589'};
 default:return null;
 }
}
function instruction590(text){
 if(/^相手は自身のマナゾーンにあるカードの枚数よりコスト(?:が|の)大きい自身のクリーチャーをすべて好きな順序で(?:持ち主の)?山札の(?:一番)?下に置く。$/.test(text)){
  return {op:'OverManaBottom590'};
 }
 if(text==='クリーチャーを1体選び持ち主の手札に戻してもよい。')return {op:'Target',anyOwner:true,to:'hand',optional:true};
 return null;
}
const graveSpellBottom594='コスト9以下の呪文を1枚いずれかのプレイヤーの墓地からコストを支払わずに唱える。それを唱えた後墓地のかわりに持ち主の山札の下に置く。';
function superInstructions437(text,phase){
 // A card selection can include seals and buried cards; element targeting is insufficient.
 if(/^バトルゾーンにある相手の(?:コスト[1-9]\d*以下の)?カードを1枚/.test(text)){
  if(phase>=578&&text==='バトルゾーンにある相手のカードを1枚選び持ち主の手札に戻す。')return{op:'BattleCardBounce578'};
  return phase>=579?battleCard579(text):null;
 }
 const ordinary=instruction(text,phase);if(ordinary)return ordinary;
 return{
  'タップしていない自分のクリーチャーを1体手札に戻す。':{op:'Target',owner:'self',to:'hand',filter:{untapped:true}},
  '相手は自身のタップしていないクリーチャーを1体選び手札に戻す。':{op:'OpponentSelect',n:1,to:'hand',filter:{untapped:true}},
  'クリーチャーをすべて持ち主の手札に戻す。':{op:'Sweep',both:true,to:'hand',filter:{creature:true}},
  '自然の進化ではないクリーチャーを2体まで自分のマナゾーンからバトルゾーンに出す。':{op:'Select',origin:'mana',n:2,deploy:true,optional:true,filter:{creature:true,color:'自然',nonEvolution:true}},
  '自然のパワー15000以下の進化ではないクリーチャーを1体自分のマナゾーンからバトルゾーンに出してもよい。':{op:'Select',origin:'mana',n:1,deploy:true,optional:true,filter:{creature:true,color:'自然',maxPower:15000,nonEvolution:true}},
  '相手のコスト7以下のクリーチャーをすべて破壊する。':{op:'Sweep',to:'grave',filter:{creature:true,max:7}},
  'パワー5000以下のクリーチャーをすべて持ち主のマナゾーンに置く。':{op:'Sweep',both:true,to:'mana',filter:{creature:true,maxPower:5000,g199Power:true}},
  '闇のコスト8以下の進化ではないクリーチャーを1体自分の墓地からバトルゾーンに出す。':{op:'Select',origin:'grave',n:1,deploy:true,g236GraveDeploy:true,optional:false,filter:{creature:true,color:'闇',max:8,nonEvolution:true}},
  '闇の進化ではないクリーチャーを1体自分の墓地からバトルゾーンに出す。':{op:'Select',origin:'grave',n:1,deploy:true,g236GraveDeploy:true,optional:false,filter:{creature:true,color:'闇',nonEvolution:true}}
 }[text]||null;
}
// Pinned aliases for older wording, only within an explicitly marked tap ability.
const tappedPowerAttacker712='このクリーチャーがタップされている間自分の他のクリーチャーは「パワーアタッカー+1500」を得る。';
const recoverSameCreature713=[{op:'Select',origin:'grave',to:'hand',n:1,filter:{faceUp:true,g228Face:{type:'creature'}},g713SameCreature:true,title:'墓地から同じ名前のクリーチャーを戻すため、1体選ぶ'}];
function tap440(text,phase){return{
 ...(phase>=713?{
  '種族を1つ選ぶ。このターンの終わりにバトルゾーンにあるその種族のクリーチャーをすべてアンタップする。':[{op:'ChooseRaceUntap713'}],
  '自分の墓地からクリーチャーを1体選ぶ。そのクリーチャーと同じ名前のクリーチャーをすべて自分の墓地から自分の手札に戻す。':recoverSameCreature713,
  '自分の墓地からクリーチャーを1体選ぶ。そのクリーチャーと同じ名前のクリーチャーをすべて自分の墓地から手札に戻す。':recoverSameCreature713
 }:{}),
 ...(phase>=712?{
  'このターンの終わりに自分の光のクリーチャーをすべてアンタップする。':[{op:'Schedule537',when:'turnEnd',defs:[{op:'GroupUntap',filter:{creature:true,color:'光'}}]}],
  'このターンバトルゾーンにある自分の自然クリーチャーが相手を攻撃してブロックされたとき相手のシールドが1枚でもあればそのうち1枚をブレイクする。':[{op:'TurnBlockBreak712'}],
  'バトルゾーンにある相手のクリーチャーを1体タップする。':[{op:'Target',tap:true}]
 }:{}),
 ...(phase>=711?{
  'このターンが終わるまでバトルゾーンにある自分の火のクリーチャーはすべて次の能力を得る。「このクリーチャーはタップされていないクリーチャーを攻撃できる」':[{op:'GroupGrant364',owner:'self',filter:{creature:true,color:'火'},grant:{attackUntapped:true}}],
  'バトルゾーンにある自分のクリーチャーを1体選び裏向きにして自分のシールドに加える。':[{op:'Target',owner:'self',to:'shields',title:'シールド化する自分のクリーチャーを選ぶ'}],
  'バトルゾーンにある相手のクリーチャーを1体選ぶ。そのクリーチャーは次のターン可能であれば攻撃する。':[{op:'Target',g546Force:'nextOpponent'}]
 }:{}),
 ...(phase>=710?{
  'バトルゾーンにある自分のドラゴンを1体アンタップする。':[{op:'Target',owner:'self',untap:true,filter:{race:'ドラゴン'},title:'アンタップする自分のドラゴンを選ぶ'}],
  'バトルゾーンにある自分のフレイム・コマンドを1体アンタップする。':[{op:'Target',owner:'self',untap:true,filter:{race:'フレイム・コマンド'},title:'アンタップする自分のフレイム・コマンドを選ぶ'}]
 }:{}),
 ...(phase>=708?{
  'バトルゾーンにある自分の他のクリーチャーを1体アンタップする。':[{op:'Target',owner:'self',untap:true,g179Other:true,title:'アンタップする自分の他のクリーチャーを選ぶ'}]
 }:{}),
 ...(phase>=441?{
 'バトルゾーンにある自分のクリーチャーを1体選ぶ。このターンそのクリーチャーはブロックされない。':[{op:'Target',owner:'self',grant:{unblockable:true}}],
 'バトルゾーンにある相手の「ブロッカー」を持つクリーチャーを1体選び持ち主の墓地に置く。':[{op:'Target',to:'grave',filter:{blocker:true}}],
 'バトルゾーンにあるパワー2000以下の相手のクリーチャーを1体選ぶ。相手はそれを持ち主の墓地に置く。':[{op:'Target',to:'grave',filter:{maxPower:2000,g199Power:true}}],
 '相手の手札から2枚見ないで選び相手はそれを持ち主の墓地に置く。1枚しかない場合は相手はその1枚を持ち主の墓地に置く。':[{op:'Discard',n:2,random:true}],
 'バトルゾーンにある自分のクリーチャーを1体選ぶ。このターンが終わるまでそのクリーチャーは「スレイヤー」を得る。(このクリーチャーとバトルした相手クリーチャーは勝っても持ち主の墓地に置かれる)':[{op:'Target',owner:'self',grant:{slayer:true}}],
 '相手のマナゾーンのカードが自分のマナゾーンのカードより多ければ自分の山札の上から1枚目を自分のマナゾーンに置く。':[{op:'IfOwn',filter:{g334ZoneCount:{zone:'mana',atLeastOpponent:true}},defs:[],elseDefs:[{op:'Ramp',n:1}]}],
 'バトルゾーンにある自分の光闇火または自然のクリーチャーを1体選ぶ。このターンそのクリーチャーはブロックされない。':[{op:'Target',owner:'self',filter:{any:[{color:'光'},{color:'闇'},{color:'火'},{color:'自然'}]},grant:{unblockable:true}}],
 'このクリーチャーを破壊する。相手は自身のクリーチャーを1体選び破壊する。':[{op:'SelfDestroy'},{op:'OpponentSelect',n:1,to:'grave'}],
 '各プレイヤーは相手の手札を1枚見ないで選び捨てさせる。':[{op:'Discard',owner:'self',n:1,random:true},{op:'Discard',n:1,random:true}]
 }:{}),
 '相手のマナゾーンからカードを1枚選ぶ。相手はそれを持ち主の手札に戻す。':[{op:'Select',owner:'opponent',origin:'mana',to:'hand',n:1,optional:false}],
 'クリーチャーをすべてバトルゾーンから持ち主の手札に戻す。':[{op:'Sweep',both:true,to:'hand',filter:{creature:true}}],
 '自分の山札のカードを上から3枚見る。その後これを好きな順番で元に戻す。':[{op:'Look',g255Search:true,n:3,stages:[],rest:'top',g259OrderTop:true}],
 'このターンが終わるまでバトルゾーンにある自分の水のクリーチャーはすべて次の能力を得る。「このクリーチャーはブロックされない」':[{op:'GroupGrant364',owner:'self',filter:{creature:true,color:'水'},grant:{unblockable:true}}],
 '自分のマナゾーンからクリーチャーを1体選び自分の手札に戻す。':[{op:'Select',origin:'mana',to:'hand',n:1,filter:{creature:true},optional:false}],
 'バトルゾーンにある自分のクリーチャーを1体選ぶ。このターンが終わるまでそのクリーチャーはブロックされない。':[{op:'Target',owner:'self',grant:{unblockable:true}}],
 'バトルゾーンにある相手の「ブロッカー」を持つクリーチャーを1体選びタップする。':[{op:'Target',tap:true,filter:{blocker:true}}],
 '相手はバトルゾーンにある自分自身のクリーチャーを1体選び持ち主の墓地に置く。':[{op:'OpponentSelect',n:1,to:'grave'}],
 '自分の手札から3枚まで選び自分のマナゾーンに置く。':[{op:'Select',origin:'hand',to:'mana',n:3,optional:true}],
 'バトルゾーンにある自分のクリーチャーを1体選ぶ。このターンが終わるまでそのクリーチャーのパワーは+5000される。':[{op:'Target',owner:'self',power:5000}],
 '自分の墓地から闇クリーチャーを1体選び自分の手札に戻す。':[{op:'Select',origin:'grave',to:'hand',n:1,filter:{g228Face:{type:'creature',color:'闇'}},optional:false}]
}[text]||null;}
function handCycle460(text){
  const cycle={
   '自分の手札を好きな枚数捨てる。その後同じ枚数のカードを引く。':{to:'grave',mode:'any'},
   '自分の手札をすべて捨て同じ枚数のカードを引く。':{to:'grave',mode:'all'},
   '自分の手札を2枚まで捨てその枚数より1枚多くカードを引く。':{to:'grave',mode:'any',max:2,extra:1},
   '自分の手札をすべて捨ててもよい。そうしたらその枚数より1枚多くカードを引く。':{to:'grave',mode:'all',optional:true,extra:1},
   '自分の手札を山札に戻してシャッフルしその枚数と同じ枚数のカードを引く。':{to:'deck',shuffle:true},
   '各プレイヤーは自分自身の手札をそれぞれの山札に戻してシャッフルしその枚数と同じ枚数のカードを引く。':{to:'deck',shuffle:true,both:true},
   '自分の手札をすべて好きな順序で山札の一番下に置く。その後同じ枚数のカードを引く。':{to:'deck',order:true},
   '自分の手札をすべて好きな順序で山札の下に置きその後それと同じ枚数のカードを引く。':{to:'deck',order:true}
  }[text];return cycle?{op:'HandCycle460',...cycle}:null;
}
function playersDraw461(text){return{
 '各プレイヤーはカードを1枚引いてもよい。':{op:'PlayersDraw461',n:1,optional:true},
 '各プレイヤーはそれぞれカードを3枚引いてもよい。そうしたプレイヤーは自身の手札を3枚捨てる。':{op:'PlayersDraw461',n:3,optional:true,discard:3},
 '各プレイヤーは自身の手札をすべて捨てる。その後それぞれカードを5枚まで引いてもよい。':{op:'PlayersDiscardDraw461',n:5},
 '各プレイヤーは自身の手札をすべて捨てる。その後各プレイヤーはカードを5枚まで引く。':{op:'PlayersDiscardDraw461',n:5}
}[text]||null;}
function handReveal462(text){return{
 '自分の手札を2枚まで相手に見せてもよい。それらのカードの文明に水と闇があればクリーチャーを1体選び持ち主の手札に戻す。':{max:2,needColors:['水','闇'],defs:[{op:'Target',anyOwner:true,to:'hand'}]},
 '自分の手札を2枚まで相手に見せてもよい。それらのカードの文明に火と自然があれば相手のパワー4000以下のクリーチャーを1体破壊する。':{max:2,needColors:['火','自然'],defs:[{op:'Target',to:'grave',filter:{maxPower:4000,g199Power:true}}]},
 '自分の手札を2枚まで相手に見せてもよい。それらのカードの文明に闇と火があれば相手は自身の手札を2枚選び捨てる。':{max:2,needColors:['闇','火'],defs:[{op:'Discard',n:2}]},
 '自分の手札にあるパワー12000以上のクリーチャーを1体見せてもよい。そうしたら自分の山札の上から1枚目をマナゾーンに置く。':{max:1,filter:{creature:true,minPower:12000},defs:[{op:'Ramp',n:1}]},
 '自分の手札にある光闇火または自然のカードをどれでも好きな枚数見せる。その見せた枚数1枚につきカードを1枚引く。':{filter:{any:['光','闇','火','自然'].map(anyFaceColor=>({anyFaceColor}))},drawEach:true},
 '自分の手札から好きな枚数の光水闇または火のカードを見せてもよい。このターン自分のクリーチャーすべてのパワーはその見せたカード1枚につき+1000される。':{filter:{any:['光','水','闇','火'].map(anyFaceColor=>({anyFaceColor}))},powerEach:1000},
 'コスト7以上の手札を1枚相手に見せてもよい。そうした場合カードを1枚引く。':{max:1,filter:{anyFaceMinCost:7},defs:[{op:'Draw',n:1}]}
}[text]||null;}
function look467(text){const top={
 '自分の山札の上から1枚目を見て手札に加えるかマナゾーンに置く。':{n:1,to:['hand','mana'],rest:'bottom'},
 '自分の山札の上から1枚を見る。そのカードを手札に加えるかマナゾーンに置く。':{n:1,to:['hand','mana'],rest:'bottom'},
 '自分の山札の上から1枚目を見て手札マナゾーン墓地のいずれかに置く。':{n:1,to:['hand','mana','grave'],rest:'bottom'},
 '自分の山札の上から2枚を見る。そのうちの1枚を手札に加えるかマナゾーンに置く。もう1枚を山札の下に置く。':{n:2,to:['hand','mana'],rest:'bottom'}
}[text];return top?{op:'Look',n:top.n,stages:[{n:1,g467Destinations:top.to}],rest:top.rest}:null;}
function protect465(text){return{
 '自分のクリーチャーを1体選ぶ。このターンそのクリーチャーは破壊されない。':{owner:'self',g465DestroySafe:'end'},
 'クリーチャーを1体選んでもよい。次の自分のターンのはじめまでそのクリーチャーは破壊されない。':{anyOwner:true,optional:true,g465DestroySafe:'start'}
}[text]||null;}
function instruction472(text){return{
 '自分の手札をすべて捨ててもよい。そうしたらカードを3枚引く。':{op:'HandCycle460',to:'grave',mode:'all',optional:true,fixedDraw:3},
 '相手のクリーチャーを1体選ぶ。相手はそれを山札の上か下に置く。':{op:'Target',g467Destinations:['deckTop','deck'],g472OwnerDestination:true},
 '自分の山札の上から3枚を表向きにする。その中から超化獣1枚と呪文を1枚手札に加える。残りを好きな順序で山札の下に置く。':{op:'Look',n:3,public:true,stages:[{n:1,to:'hand',filter:{creature:true,race:'超化獣'}},{n:1,to:'hand',filter:{spell:true}}],rest:'bottom'}
}[text]||null;}
function timedSpellLock489(text){
 const m=text.match(/^(次の自分のターンのはじめまで|そのターン|このターン)相手は(?:コスト([1-9]\d*)以下の)?呪文を唱えられない。$/);
 return m?{op:'SpellLock489',expires:m[1]==='次の自分のターンのはじめまで'?'start':'end',...(m[2]?{max:+m[2]}:{})}:null;
}
function powerBudget506(text){
 const any=text.match(/^相手のクリーチャーをパワーの合計が([1-9]\d*)以下になるように?好きな数選び破壊する。$/)||text.match(/^相手のクリーチャーを好きな数パワーの合計が([1-9]\d*)以下になるように選び破壊する。$/);
 const limited=text.match(/^相手のクリーチャーをパワーの合計が([1-9]\d*)以下になるように?([1-9]\d*)体まで選び破壊する。$/)||text.match(/^パワーの合計が([1-9]\d*)以下になるように相手のクリーチャーを([1-9]\d*)体まで選び破壊する。$/);
 const separate=text.match(/^相手のクリーチャーをパワーの合計が([1-9]\d*)以下になるように好きな数選ぶ。それらをすべて破壊する。$/);
 const m=any||limited||separate;if(!m)return null;
 return{op:'Select',owner:'opponent',origin:'battle',n:limited?+m[2]:'all',optional:true,to:'grave',filter:{creature:true},g173Targets:true,g193Select:true,g506PowerBudget:+m[1],title:'合計パワー'+m[1]+'以下になるよう'+(limited?m[2]+'体まで':'好きな数')+'選ぶ'};
}
function ally503(text){
 const stack=text.match(/^バトルゾーンにある自分のクリーチャーを1体選ぶ。そのクリーチャーに含まれるカード1枚につき(カードを1枚引いてもよい|自分の山札の上から1枚マナゾーンに置く)。$/);
 if(stack)return{op:'Target',owner:'self',g503Stack:stack[1]==='カードを1枚引いてもよい'?'draw':'ramp',title:'枚数を参照する自分のクリーチャーを1体選ぶ'};
 return{
  'そのターンバトルゾーンにある自分の火のハンター・クリーチャー1体はアンタップされているクリーチャーを攻撃できる。':{op:'Target',owner:'self',filter:{creature:true,color:'火',race:'ハンター'},grant:{attackUntapped:true}},
  'そのターンバトルゾーンにある自分のクリーチャー1体は「スレイヤー」を得る。':{op:'Target',owner:'self',grant:{slayer:true}},
  'そのターンの終わりまでバトルゾーンにある自分のクリーチャー1体のパワーは+2000される。':{op:'Target',owner:'self',power:2000},
  'そのターンの終わりまでバトルゾーンにある自分の他のシノビすべてのパワーは+3000される。':{op:'GroupPower',owner:'self',other:true,filter:{creature:true,race:'シノビ'},power:3000}
 }[text]||null;
}
function modal510(text){
 const tap={label:'相手のクリーチャー1体をタップ',defs:[{op:'Target',tap:true}]},bounce={label:'相手のクリーチャー1体を手札に戻す',defs:[{op:'Target',to:'hand'}]},recover={label:'墓地から他のクリーチャー1体を手札に戻す',defs:[{op:'Select',origin:'grave',to:'hand',n:1,g186Other:true,filter:{creature:true}}]},cycle={label:'手札をすべて捨て、同じ枚数引く',defs:[{op:'HandCycle460',mode:'all',to:'grave'}]},untap={label:'自分のクリーチャーを2体までアンタップ',defs:[{op:'Select',origin:'battle',owner:'self',n:2,optional:true,g173Targets:true,g193Select:true,g510Untap:true,filter:{creature:true},title:'アンタップする自分のクリーチャーを2体まで選ぶ'}]},search={label:'山札からコスト3以下のクリーチャーを手札に加える',defs:[{op:'Look',g310Search:true,g201Search:true,g200Search:true,n:'all',rest:'shuffle',stages:[{n:1,to:'hand',filter:{creature:true,max:3},reveal:true}]}]};
 const modes={
  'バトルゾーンにある相手のクリーチャーを1体選んでタップするか他のクリーチャーを1体自分の墓地から手札に戻す。':[tap,recover],
  'バトルゾーンにある相手のクリーチャーを1体選んでタップするか自分の手札をすべて捨て同じ枚数のカードを引く。':[tap,cycle],
  'バトルゾーンにある相手のクリーチャーを1体選んで持ち主の手札に戻すか自分の手札をすべて捨て同じ枚数のカードを引く。':[bounce,cycle],
  '自分の他のクリーチャーを1体墓地から手札に戻すか自分の山札からコスト3以下のクリーチャーを1体選んで相手に見せてから手札に加えその後山札をシャッフルする。':[recover,search],
  '自分の山札の上から1枚目をマナゾーンに置くかバトルゾーンにある自分のクリーチャーを2体までアンタップする。':[{label:'山札の上1枚をマナに置く',defs:[{op:'Ramp',n:1}]},untap],
  'バトルゾーンにある自分のクリーチャーを2体までアンタップするかカードを1枚引く。':[untap,{label:'カードを1枚引く',defs:[{op:'Draw',n:1}]}],
  '相手のコスト4以下の多色クリーチャーを1体破壊するか相手のコスト6以下の多色ではないクリーチャーを1体破壊する。':[{label:'コスト4以下の多色クリーチャー1体を破壊',defs:[{op:'Target',to:'grave',filter:{multi:true,max:4}}]},{label:'コスト6以下の多色ではないクリーチャー1体を破壊',defs:[{op:'Target',to:'grave',filter:{g510NonMulticolor:true,max:6}}]}],
  'バトルゾーンにある相手の多色ではないコスト5以下のクリーチャーを1体破壊するかバトルゾーンにある相手の多色ではないコスト5以下のクロスギアを1枚選んで持ち主の墓地に置く。':[{label:'コスト5以下の多色ではないクリーチャー1体を破壊',defs:[{op:'Target',to:'grave',filter:{g510NonMulticolor:true,max:5}}]},{label:'コスト5以下の多色ではないクロスギア1枚を墓地に置く',defs:[{op:'Target',element:true,to:'grave',filter:{g201Gear:true,g510NonMulticolor:true,max:5}}]}]
 }[text];return modes?{op:'Choose',g184Modes:true,modes}:null;
}
// Whole-clause aliases reuse the existing fight rules and target permissions.
// Keep the mill and its conditional reward in one complete, verified clause.
function useBlocker524(text){
 const head='相手がクリーチャーを召喚するか呪文を唱えた場合そのターンが終わるまでこのクリーチャーは「ブロッカー」を得る。';
 return text.startsWith(head)&&['(相手クリーチャーが攻撃するときこのクリーチャーをタップしてその攻撃を阻止してよい。そのあとその相手クリーチャーとバトルする)','(相手クリーチャーが攻撃するときこのクリーチャーをタップしてその攻撃を阻止してよい。その後その相手クリーチャーとバトルする)'].includes(text.slice(head.length));
}
function manaDeploy523(text){
 if(text==='自分のマナゾーンにあるカードの枚数以下のコストを持つクリーチャーを1体コストを支払わずに自分の手札から召喚してもよい。')return{op:'ManaDeploy523',origin:'hand',summon:true,optional:true};
 const m=text.match(/^自分のマナゾーン(?:にある|の)カードの枚数以下のコスト(?:を持つ|の)(進化ではないクリーチャー|進化クリーチャー|クリーチャー)を1体自分の(墓地|マナゾーン)から(?:選び)?(?:バトルゾーンに)?(出す|出してもよい)。$/);
 return m?{op:'ManaDeploy523',origin:m[2]==='墓地'?'grave':'mana',optional:m[3]==='出してもよい',filter:{creature:true,...(m[1]==='進化ではないクリーチャー'?{nonEvolution:true}:m[1]==='進化クリーチャー'?{evolution:true}:{})}}:null;
}
function instruction540(text){return text==='超天フィーバー:バトルゾーンまたはマナゾーンに自分のジョーカーズが合計10枚以上あればこのターン自分のクリーチャー1体に「ワールド・ブレイカー」を与える。(「ワールド・ブレイカー」を持つクリーチャーは相手のシールドをすべてブレイクする)'?{op:'IfOwn',filter:{g539Jokers:10},defs:[{op:'Target',owner:'self',grant:{g313Breaker:'∞',worldBreaker:true}}]}:null;}
function instruction539(text){return{
 'バトルゾーンまたはマナゾーンに自分のジョーカーズが合計5枚以上あればカードを2枚引く。その後ジョーカーズを1枚自分の手札から捨ててもよい。そうしたらカードを2枚引く。':{op:'IfOwn',filter:{g539Jokers:5},defs:[{op:'Draw',n:2},{op:'DiscardDraw',g216DiscardDraw:true,n:2,filter:{g539JokerCard:true}}]},
 'バトルゾーンまたはマナゾーンに自分のジョーカーズが合計3枚以上あれば相手のクリーチャーを1体選び相手はそれを自身の山札の一番下に置く。その後自分はカードを1枚引く。':{op:'IfOwn',filter:{g539Jokers:3},defs:[{op:'Target',to:'deck'},{op:'Draw',n:1}]}
}[text]||null;}
function instruction538(text){
 const tap={op:'Select',origin:'battle',owner:'opponent',optional:true,g173Targets:true,g193Select:true,g193Tap:true,filter:{creature:true},title:'タップする相手のクリーチャーを選ぶ'};
 return{
  'バトルゾーンにある自分のドラゴン1体につき「ブロッカー」を持つ相手のクリーチャーを1体破壊する。':{op:'CountOwn538',filter:{creature:true,race:'ドラゴン'},mode:'select',def:{op:'Select',origin:'battle',owner:'opponent',to:'grave',optional:false,g173Targets:true,g193Select:true,filter:{creature:true,blocker:true},title:'破壊する相手のブロッカーを選ぶ'}},
  'バトルゾーンにある自分のドラゴン1体につきバトルゾーンにある相手のクリーチャーを1体選びタップしてもよい。':{op:'CountOwn538',filter:{creature:true,race:'ドラゴン'},mode:'select',def:tap},
  'バトルゾーンにある自分のタップされているクリーチャー1体につきバトルゾーンにある相手のクリーチャーを1体選びタップしてもよい。':{op:'CountOwn538',filter:{creature:true,tapped:true},mode:'select',def:tap},
  'バトルゾーンにある自分のタップされているクリーチャーの数よりコストが小さい相手のクリーチャーを1体バトルゾーンから選ぶ。選んだクリーチャーを相手のマナゾーンに置く。':{op:'CountOwn538',filter:{creature:true,tapped:true},mode:'belowCost',def:{op:'Target',to:'mana',filter:{}}},
  'バトルゾーンにある自分のドラゴン1体につき1回相手とガチンコ・ジャッジする。こうして自分が勝つたび相手のコマンド1体または相手のパワー7000以下のクリーチャー1体を破壊する。(ガチンコ・ジャッジ:各プレイヤーは自身の山札の上から1枚目を見せそれを一番下に置く。そのカードのコストが相手以上であれば自分の勝ちとする)':{op:'CountOwn538',filter:{creature:true,race:'ドラゴン'},mode:'repeat',def:{op:'Judge318',defs:[{op:'Target',to:'grave',filter:{any:[{race:'コマンド'},{maxPower:7000,g199Power:true}]}}]}}
 }[text]||null;
}
function clauses537(text){
 const shield='自分のシールドを1つ手札に加える。ただしその「S・トリガー」は使えない。',later='次の自分のターンのはじめに自分のシールドを1つ手札に加える。ただしその「S・トリガー」は使えない。';
 for(const zone of['自分のシールドゾーン','シールドゾーン']){const first='自分の山札の上から1枚目を裏向きのまま新しいシールドとして'+zone+'に置く。';if(text===first+later)return[first,later];}
 const hand='そのターンの終わりに自分の手札を1枚新しいシールドとして自分のシールドゾーンに裏向きにして置く。';
 if(text==='自分のシールドをひとつ手札に戻す。ただしその「S・トリガー」は使えない。'+hand)return[shield,hand];
 if(text==='自分のシールドをすべて手札に加える。ただしその「S・トリガー」は使えない。その後自分の山札の上から5枚を裏向きのまま新しいシールドとして自分のシールドゾーンに置く。')return['自分のシールドをすべて手札に加える。ただしその「S・トリガー」は使えない。',...Array(5).fill('自分の山札の上から1枚目を裏向きのまま新しいシールドとして自分のシールドゾーンに置く。')];
 return null;
}
function instruction537(text){return{
 '次の自分のターンのはじめに自分のシールドを1つ手札に加える。ただしその「S・トリガー」は使えない。':{op:'Schedule537',when:'nextOwnStart',defs:[{op:'ShieldHand',g238ShieldHand:true}]},
 'そのターンの終わりに自分の手札を1枚新しいシールドとして自分のシールドゾーンに裏向きにして置く。':{op:'Schedule537',when:'turnEnd',defs:[{op:'Select',origin:'hand',to:'shields',n:1,optional:false}]},
 'このターンの終わりにバトルゾーンにある自分のクリーチャーをすべてアンタップする。':{op:'Schedule537',when:'turnEnd',defs:[{op:'GroupUntap',g219Untap:true,filter:{creature:true}}]},
 '自分のシールドをすべて手札に加える。ただしその「S・トリガー」は使えない。':{op:'ShieldHand',g238ShieldHand:true,g535Count:'all'}
}[text]||null;}
function instruction536(text){return text==='このクリーチャーをアンタップしそのターンこのクリーチャーのパワーは+11000される。'?{op:'Sequence',defs:[{op:'Untap',g191First:true},{op:'SelfBoost313',power:11000,g536Source:true}]}:null;}
function instruction535(text){return{
 '自分のシールドを2つ手札に加える。ただしその「S・トリガー」能力は使えない。':{op:'ShieldHand',g238ShieldHand:true,g535Count:2},
 '自分のシールドを2つまで手札に加えてもよい。ただしその「S・トリガー」は使えない。':{op:'ShieldHand',g238ShieldHand:true,g535Count:2,optional:true},
 '自分のシールドを2つまで手札に加える。ただしその「S・トリガー」は使えない。':{op:'ShieldHand',g238ShieldHand:true,g535Count:2,optional:true},
 '自分のシールドをひとつ手札に加える。(ただしその「S・トリガー」は使えない)':{op:'ShieldHand',g238ShieldHand:true},
 'カードを1枚自分のシールドゾーンから手札に戻す。ただしその「S・トリガー」は使えない。':{op:'ShieldHand',g238ShieldHand:true,g533CardOnly:true},
 '自分のシールドを1つ手札に加える。その「S・トリガー」は使えない。':{op:'ShieldHand',g238ShieldHand:true}
}[text]||null;}
function instruction533(text){return{
 'カードを2枚自分のマナゾーンから山札の一番上に好きな順序で置く。':{op:'Select',origin:'mana',to:'deckTop',n:2,g183Return:true,title:'山札の上に戻すマナを2枚選ぶ（先に選んだカードが一番上）'},
 'カードを1枚自分のシールドゾーンから手札に加える。ただしその「S・トリガー」は使えない。':{op:'ShieldHand',g238ShieldHand:true,g533CardOnly:true}
}[text]||null;}
function instruction532(text){return{
 '自分の山札を見る。その中からコスト3以下の進化ではないドリームメイトを1体選びバトルゾーンに出してもよい。その後山札をシャッフルする。':{op:'LookDeploy530',g201Search:true,n:'all',limit:1,rest:'shuffle',filter:{creature:true,nonEvolution:true,race:'ドリームメイト',max:3}},
 '自分の山札を見る。その中からコスト8以下の進化ではないハンターを1体選びバトルゾーンに出してもよい。その後山札をシャッフルする。':{op:'LookDeploy530',g201Search:true,n:'all',limit:1,rest:'shuffle',filter:{creature:true,nonEvolution:true,race:'ハンター',max:8}},
 '自分の山札の上から3枚を見る。その中からビートジョッキーを1体バトルゾーンに出してもよい。残りを好きな順序で自分の山札の一番下に置く。このターンの終わりにそのビートジョッキーを破壊する。':{op:'LookDeploy530',n:3,limit:1,rest:'bottom',delayed:'grave',filter:{creature:true,race:'ビートジョッキー'}},
 '自分の山札の上から7枚を見る。その中からコスト7以下の進化ではないドラゴン/ハンターを1体バトルゾーンに出してもよい。その後山札をシャッフルする。そのクリーチャーは「スピードアタッカー」を得る。そのターンの終わりにそのクリーチャーを破壊する。':{op:'LookDeploy530',n:7,limit:1,rest:'shuffle',delayed:'grave',grant:{speedAttacker:true},filter:{creature:true,nonEvolution:true,race:'ドラゴン',raceAny:['ハンター'],max:7}}
}[text]||null;}
function instruction531(text){
 const rows={
  '自分の山札を見る。その中から進化クリーチャーを2体まで選び相手に見せてから手札に加えてもよい。その後山札をシャッフルする。':{n:2,filter:{creature:true,evolution:true}},
  '自分の山札を見る。その中から進化クリーチャーを1体選び相手に見せてから自分の手札に加えてもよい。その後山札をシャッフルする。':{n:1,filter:{creature:true,evolution:true}},
  '自分の山札を見る。その中からゴッドまたはフェニックスを1体選び相手に見せてから自分の手札に加えてもよい。その後山札をシャッフルする。':{n:1,filter:{creature:true,raceAny:['ゴッド','フェニックス']}},
  '自分の山札を見る。その中から自然のクリーチャーを1体選び相手に見せてから自分の手札に加えてもよい。その後山札をシャッフルする。':{n:1,filter:{g228Face:{type:'creature',color:'自然'}}},
  '自分の山札を見る。その中から名前に《ヘブンズ》とある呪文を1枚選んですべてのプレイヤーに見せ新しいシールドとして自分のシールドゾーンに裏向きにして加えてもよい。その後山札をシャッフルする。':{n:1,to:'shields',filter:{g228Face:{type:'spell',nameAny:['ヘブンズ']}}}
 },r=rows[text];
 return r?{op:'Look',g201Search:true,g200Search:true,...(r.to==='shields'?{g255Search:true}:{}),n:'all',rest:'shuffle',stages:[{n:r.n,to:r.to||'hand',filter:r.filter,reveal:true,optional:true}]}:null;
}
function instruction530(text){return{
 '自分のマナゾーンにあるカードの枚数以下のコストを持つ進化ではないドラゴンを1体自分のマナゾーンからバトルゾーンに出してもよい。':{op:'ManaDeploy523',origin:'mana',optional:true,filter:{creature:true,nonEvolution:true,race:'ドラゴン'}},
 '進化ではないドラゴン・ゾンビを1体自分の墓地からバトルゾーンに出してもよい。':{op:'Select',origin:'grave',n:1,deploy:true,g236GraveDeploy:true,optional:true,filter:{creature:true,nonEvolution:true,race:'ドラゴン・ゾンビ'}},
 '相手とガチンコ・ジャッジする。自分が勝ったら自分の山札を見る。その中からドラゴンを1体選び相手に見せてから自分の手札に加えてもよい。その後山札をシャッフルする。':{op:'Judge318',defs:[{op:'Look',g201Search:true,g200Search:true,n:'all',rest:'shuffle',stages:[{n:1,to:'hand',filter:{creature:true,race:'ドラゴン'},reveal:true,optional:true}]}]},
 '自分の山札の上から2枚を見る。その中から好きな枚数の進化ではないサイバーロードをバトルゾーンに出してもよい。残りを好きな順序で山札の一番上に戻す。':{op:'LookDeploy530',n:2,filter:{creature:true,nonEvolution:true,race:'サイバーロード'}}
}[text]||null;}
function instruction529(text){return{
 'バトルゾーンに自分のフィールドがあれば自分の手札を1枚捨ててもよい。そうしたらカードを2枚引く。':{op:'IfOwn',filter:{g228Face:{type:'field'}},defs:[{op:'DiscardDraw',g216DiscardDraw:true,n:2}]},
 'バトルゾーンに自分のフィールドがあればそのターン相手のクリーチャーすべてのパワーを_1000し自分のクリーチャーすべてのパワーを+1000する。(パワー0以下のクリーチャーは破壊される)':{op:'IfOwn',filter:{g228Face:{type:'field'}},defs:[{op:'GroupPower',g214GroupPower:true,owner:'both',power:-1000,ownPower:1000,filter:{creature:true}}]},
 '自分のマナゾーンにあるカードの枚数を数える。その数だけ自分の山札の上からタップしてマナゾーンに置いてもよい。':{op:'ManaCountRamp529'},
 '自分のマナゾーンにあるカードの枚数以下のコストを持つ進化ではないアウトレイジを1体自分のマナゾーンからバトルゾーンに出してもよい。':{op:'ManaDeploy523',origin:'mana',optional:true,filter:{creature:true,nonEvolution:true,race:'アウトレイジ'}}
}[text]||null;}
function instruction526(text){
 if(text==='自分の山札の上から1枚目を墓地に置く。それが火のカードであればそのターンこのクリーチャーは「スピードアタッカー」を得る。(「スピードアタッカー」を得たクリーチャーは召喚酔いしない)')return{op:'MillMatch520',n:1,filter:{anyFaceColor:'火'},speedAttacker:true};
 if(text==='自分の山札の上から1枚目を墓地に置く。それがヒューマノイドかドラゴンであればそのターンこのクリーチャーは「スピードアタッカー」を得る。')return{op:'MillMatch520',n:1,filter:{any:[{anyFaceRace:'ヒューマノイド'},{anyFaceRace:'ドラゴン'}]},speedAttacker:true};
 if(['そのターン相手のクリーチャーすべてのパワーを_2000する。','そのターン相手のクリーチャーすべてのパワーを_2000する。(パワー0以下のクリーチャーは破壊される)'].includes(text))return{op:'GroupPower',g214GroupPower:true,owner:'opponent',power:-2000,filter:{creature:true}};
 return null;
}
function instruction522(text){return{
 '相手のマナゾーンにあるカードの枚数よりコストが大きい相手のクリーチャーをすべて破壊する。':{op:'ManaCostSweep522'},
 '相手のマナゾーンにあるカードの枚数が自分のより多ければ自分の山札の上から1枚目をマナゾーンに置く。':{op:'IfOwn',filter:{g334ZoneCount:{zone:'mana',atLeastOpponent:true}},defs:[],elseDefs:[{op:'Ramp',n:1}]},
 '自分の山札の上から3枚を表向きにする。その中から呪文をすべて自分の手札に加え残りを墓地に置く。':{op:'Look',n:3,public:true,stages:[{n:'all',to:'hand',filter:{spell:true}}],rest:'grave'}
}[text]||null;}
function target521(text){
 if(text==='次の自分のターンのはじめまで自分のクリーチャー1体のパワーを+3000し「ブロッカー」を与える。(「ブロッカー」を持つクリーチャーをタップして相手クリーチャーの攻撃先をそれに変更してもよい)')return{op:'Target',owner:'self',power:3000,grant:{blocker:true},g521UntilStart:true};
 if(text==='次の自分のターンのはじめまで自分のクリーチャー1体に「ブロッカー」を与える。(「ブロッカー」を持つクリーチャーをタップして相手クリーチャーの攻撃先をそのクリーチャーに変更してもよい)')return{op:'Target',owner:'self',grant:{blocker:true},g521UntilStart:true};
 const head='バトルゾーンにある闇または火のクリーチャーを1体選びタップしてもよい。';
 if(text.startsWith(head)&&['(ただしまず何を攻撃するか選んでからタップしたいクリーチャーを選ぶ)','(まずこのクリーチャーが何を攻撃するかを選びその後タップするクリーチャーを選ぶ)'].includes(text.slice(head.length)))return{op:'Target',anyOwner:true,tap:true,optional:true,filter:{any:[{color:'闇'},{color:'火'}]}};
 return null;
}
function mill520(text){
 const head='自分の山札の上から1枚目を墓地に置く。';if(!text.startsWith(head))return null;
 const rest={
  'それがリキッド・ピープルまたはドラゴンであればそのターンこのクリーチャーはブロックされない。':{filter:{any:[{anyFaceRace:'リキッド・ピープル'},{anyFaceRace:'ドラゴン'}]},unblockable:true},
  'それが呪文であればこのクリーチャーをアンタップする。':{filter:{spell:true},untap:true},
  'それがビーストフォークまたはドラゴンであればそのターンこのクリーチャーは「パワーアタッカー+4000」と「W・ブレイカー」を得る。':{filter:{any:[{anyFaceRace:'ビーストフォーク'},{anyFaceRace:'ドラゴン'}]},powerAttacker:4000,breaker:2}
 }[text.slice(head.length)];return rest?{op:'MillMatch520',n:1,...rest}:null;
}
function target519(text){return{
 '自分の他のクリーチャーを1体選ぶ。そのターン選んだクリーチャーのパワーを+2000する。':{op:'Target',owner:'self',g179Other:true,power:2000},
 'そのターン自分のクリーチャー1体に「スレイヤー」を与える。(「スレイヤー」を持つクリーチャーがバトルする時バトルの後相手クリーチャーを破壊する)':{op:'Target',owner:'self',grant:{slayer:true}},
 'バトルゾーンにある相手のクリーチャーを1体選びタップしてもよい。(まず何を攻撃するか選んでからタップするクリーチャーを選ぶ)':{op:'Target',tap:true,optional:true}
}[text]||null;}
function fight518(text){
 if(text==='自分のクリーチャーと相手のクリーチャーを1体ずつ選びその2体にバトルさせる。')return{op:'Fight240',optional:false};
 if(text==='自分のクリーチャーと相手のクリーチャーを1体ずつ選んでもよい。その選んだクリーチャー2体をバトルさせる。')return{op:'Fight240',optional:true};
 if(text==='相手のクリーチャーを1体選び持ち主の山札の一番下に置く。その後カードを1枚引く。')return{op:'Sequence',defs:[{op:'Target',to:'deck'},{op:'Draw',n:1}]};
 return null;
}
// Additional draw requires an actual discard, distinct from hand-size cycling.
function discard517(text){
 const prefix='自分の手札を1枚捨てカードを1枚引く。';if(!text.startsWith(prefix))return null;
 const filter={
  'こうして火のロスト・クルセイダー・カードを捨てたらカードをもう1枚引く。':{anyFaceColor:'火',anyFaceRace:'ロスト・クルセイダー'},
  'こうしてジョーカーズ・カードを捨てたらカードをもう1枚引く。':{anyFaceRace:'ジョーカーズ'},
  'こうして捨てたカードが闇または自然ならカードをもう1枚引く。':{any:[{anyFaceColor:'闇'},{anyFaceColor:'自然'}]}
 }[text.slice(prefix.length)];return filter?{op:'DiscardMatch517',filter}:null;
}
// The first physical ramped card controls only one additional action.
function ramp516(text){
 const first='自分の山札の上から1枚をタップしてマナゾーンに置く。';if(!text.startsWith(first))return null;
 const tails={
  'それがフェニックス・カードまたはファイアー・バード・カードなら自分の山札の上からもう1枚タップしてマナゾーンに置く。':{filter:{any:[{anyFaceRace:'フェニックス'},{anyFaceRace:'ファイアー・バード'}]}},
  'それがエンジェル・コマンド・カードなら自分の山札の上からもう1枚タップしてマナゾーンに置く。その後カードを1枚自分のマナゾーンから手札に戻してもよい。':{filter:{anyFaceRace:'エンジェル・コマンド'},after:[{op:'Select',origin:'mana',to:'hand',n:1,optional:true}]},
  'それがドラグナー・カードなら自分の山札の上からもう1枚タップしてマナゾーンに置く。それ以外ならカードを1枚引く。':{filter:{anyFaceRace:'ドラグナー'},elseDraw:true}
 }[text.slice(first.length)];return tails?{op:'RampMatch516',...tails}:null;
}
// Snapshot a resolved boost; these are not continuously recalculated auras.
function boost515(text){
 const other={op:'Target',owner:'self',g179Other:true};
 if(text==='そのターン自分の他のクリーチャー1体のパワーは+4000されシールドをさらに1つブレイクする。')return{...other,power:4000,g455ExtraBreak:1};
 if(text==='そのターン自分の他のクリーチャー1体は「パワーアタッカー+4000」を得シールドをさらに1つブレイクする。(攻撃中「パワーアタッカー+4000」を持つクリーチャーのパワーを+4000する)')return{...other,power:4000,g337PowerAttacker:true,g455ExtraBreak:1};
 if(text==='バトルゾーンにある自分の他のクリーチャーを1体選んでもよい。そのターンそのクリーチャーはブロックされずシールドをさらに1枚ブレイクし「パワーアタッカー+5000」を得る。')return{...other,optional:true,power:5000,g337PowerAttacker:true,g455ExtraBreak:1,grant:{unblockable:true}};
 if(text==='バトルゾーンにある自分のクリーチャーを1体選ぶ。そのターンそのクリーチャーのパワーは自分のマナゾーンにある文明ひとつにつき+1000される。')return{op:'ManaColorBoost515',amount:1000};
 return null;
}
// One public top card: decide its branch before attempting any zone movement.
function reveal514(text){
 const dragon='自分の山札の上から1枚目をすべてのプレイヤーに見せる。そのカードが進化ではないドラゴンであればバトルゾーンに出してもよい。',zero='自分の山札の上から1枚目をすべてのプレイヤーに見せる。そのカードが進化ではない無色クリーチャーであればバトルゾーンに出してもよい。',mate='自分の山札の上から1枚目を表向きにする。それが進化ではないドリームメイトかビークル・ビーであればバトルゾーンに出してもよい。';
 if(text===dragon)return{op:'RevealTop514',filter:{creature:true,nonEvolution:true,race:'ドラゴン'},to:'battle',optional:true};
 if(text===zero)return{op:'RevealTop514',filter:{creature:true,nonEvolution:true,g200Colorless:true},to:'battle',optional:true};
 if(text===mate)return{op:'RevealTop514',filter:{creature:true,nonEvolution:true,raceAny:['ドリームメイト','ビークル・ビー']},to:'battle',optional:true};
 if(text==='自分の山札の上から1枚目をすべてのプレイヤーに見せる。そのカードがドラゴンであれば自分の手札に加える。ドラゴン以外であれば自分の山札の一番下に戻す。')return{op:'RevealTop514',filter:{race:'ドラゴン'},to:'hand',elseTo:'deck'};
 if(text==='自分の山札の上から1枚目を表向きにしてもよい。それがムートピアなら自分の手札に加える。')return{op:'Offer',g359RevealAll:true,title:'山札の上1枚を公開する？',defs:[{op:'RevealTop514',n:1,filter:{race:'ムートピア'},to:'hand'}]};
 if(text==='自分の山札の上から1枚目を表向きにする。それがコスト5以下の進化ではないクリーチャーならバトルゾーンに出す。それ以外なら自分のマナゾーンに置く。')return{op:'RevealTop514',filter:{creature:true,nonEvolution:true,max:5},to:'battle',elseTo:'mana'};
 if(text==='自分の山札の上から1枚目を表向きにする。それがコスト6以下のジョーカーズ・クリーチャーならバトルゾーンに出す。それ以外なら自分の手札に加える。')return{op:'RevealTop514',filter:{creature:true,race:'ジョーカーズ',max:6},to:'battle',elseTo:'hand'};
 return null;
}
// Inclusive total-cost removal; keep the complete instruction together until selection ends.
function instruction513(text){
 if(/^相手のクリーチャーをコストの合計が6以下になるように?好きな数選び破壊する。$/.test(text)||text==='コストの合計が6以下になるように相手のクリーチャーを好きな数選び破壊する。')return{op:'Select',owner:'opponent',origin:'battle',n:'all',optional:true,to:'grave',filter:{creature:true},g173Targets:true,g193Select:true,g513CostBudget:6,title:'合計コスト6以下になるよう好きな数選ぶ'};
 if(text==='カードを1枚引く。その後進化ではないコスト5以下のクリーチャーを1体自分の手札からバトルゾーンに出してもよい。')return{op:'Sequence',defs:[{op:'Draw',n:1},{op:'Select',origin:'hand',n:1,deploy:true,optional:true,filter:{creature:true,nonEvolution:true,max:5}}]};
 return null;
}
function instruction546(text){const m=text.match(/^相手のクリーチャーを1体選ぶ。(次の相手のターン(?:中|に)?|次の自分のターンのはじめまで|このターン|そのターン)そのクリーチャーは可能(?:なら|であれば)攻撃する。$/);return m?{op:'Target',g546Force:m[1].startsWith('次の相手')?'nextOpponent':m[1].startsWith('次の自分')?'untilOwnStart':'thisTurn'}:null;}
function instruction549(text){
 const ramp={op:'Ramp',n:1,tapped:true},less=zone=>({g334ZoneCount:{zone,lessThanOpponent:true}}),rules={
  '自分の山札の上から1枚目をタップしてマナゾーンに置く。その後自分の他のタマシードがあれば自分の山札の上から1枚目をタップしてマナゾーンに置く。':{op:'Sequence',defs:[ramp,{op:'IfOwn',filter:{g295Tamaseed:true,g334Other:true},defs:[ramp]}]},
  '相手の手札が自分のより多ければカードを1枚引く。相手のマナゾーンのカードが自分のより多ければ自分の山札の上から1枚目をタップしてマナゾーンに置く。相手のシールドが自分のより多ければ自分の山札の上から1枚目をシールド化する。':{op:'Sequence',defs:[{op:'IfOwn',filter:less('hand'),defs:[{op:'Draw',n:1}]},{op:'IfOwn',filter:less('mana'),defs:[ramp]},{op:'IfOwn',filter:less('shields'),defs:[{op:'ShieldTop',n:1}]}]},
  '相手の多色カードを1枚破壊する。':{op:'Target',element:true,to:'grave',filter:{multi:true}},
  '相手のコスト5以下のエレメントを1つ選びシールド化してもよい。':{op:'Target',element:true,to:'shields',optional:true,filter:{max:5}}
 };return rules[text]?structuredClone(rules[text]):null;
}
function deployBudget550(text){
 const m=text.match(/^コストの合計が([1-9]\d*)以下になるように?(クリーチャー|エレメント|デーモン・コマンド)を(好きな数|([1-9]\d*)(?:体|つ)まで)自分の墓地から(?:(?:選び|選んで))?(?:バトルゾーンに)?出す。$/);
 if(m)return{op:'Select',origin:'grave',deploy:true,n:m[3]==='好きな数'?'all':+m[4],optional:true,g236GraveDeploy:true,g550CostBudget:+m[1],filter:m[2]==='クリーチャー'?{creature:true}:m[2]==='エレメント'?{element:true}:{race:'デーモン・コマンド'},title:'合計コスト'+m[1]+'以下で、出す順に選ぶ'};
 if(text==='コストの合計が7以下になるようディスタスを好きな数自分の墓地手札またはマナゾーンから選び出す。')return{op:'Select',zones:['grave','hand','mana'],deploy:true,n:'all',optional:true,g550CostBudget:7,filter:{race:'ディスタス'},title:'墓地・手札・マナから合計コスト7以下で、出す順に選ぶ'};
 return null;
}
function deploy551(text){
 const base={op:'Select',deploy:true,optional:true},rules={
  'コストの合計が4以下になるようタマシードを好きな数自分のマナゾーンから選んで出す。':{...base,origin:'mana',n:'all',g550CostBudget:4,filter:{g295Tamaseed:true}},
  '自分の手札からコストの合計が5以下になるようにクリーチャーを2体まで選びバトルゾーンに出す。そのターンの終わりにそれらを破壊する。':{...base,origin:'hand',n:2,g550CostBudget:5,filter:{creature:true},delayed:'grave'},
  '自分のマナゾーンから進化ではない自然のクリーチャーをコストの合計が7以下になるように2体まで選びバトルゾーンに出してもよい。':{...base,origin:'mana',n:2,g550CostBudget:7,filter:{creature:true,nonEvolution:true,color:'自然'}}
 };
 if(rules[text])return structuredClone(rules[text]);
 if(/^自分の墓地からコストの合計が5以下になるようにクリーチャーを2体まで選びバトルゾーンに出してもよい。そのターンそれらのクリーチャーは「スピードアタッカー」を得る。(?:\([^()]*\))?$/.test(text))return{...base,origin:'grave',n:2,g550CostBudget:5,filter:{creature:true},grant:{speedAttacker:true}};
 return null;
}
function lookBudget552(text){
 const rules={
  '自分の山札を見る。その中から名前に《アイニー》とある進化ではないクリーチャーをコストの合計が7以下になるよう2体まで選びタップしてバトルゾーンに出してもよい。その後山札をシャッフルする。':{op:'LookDeploy530',g201Search:true,n:'all',limit:2,rest:'shuffle',tapped:true,g550CostBudget:7,filter:{creature:true,nonEvolution:true,name:'アイニー'}},
  '自分の山札を見る。その中から好きな枚数の進化ではないクリーチャーをコストの合計が6以下になるように選びバトルゾーンに出してもよい。その後山札をシャッフルする。':{op:'LookDeploy530',g201Search:true,n:'all',rest:'shuffle',g550CostBudget:6,filter:{creature:true,nonEvolution:true}},
  '自分の山札の上から4枚を見る。その中からスノーフェアリーをコストの合計が5以下になるように2つまで出す。残りを好きな順序で山札の下に置く。':{op:'LookDeploy530',n:4,limit:2,rest:'bottom',g550CostBudget:5,filter:{race:'スノーフェアリー'}}
 };return rules[text]?structuredClone(rules[text]):null;
}
// Share the inclusive selection budget while preserving destination and card-count limits.
function instruction553(text){
 const select=(budget,to,n)=>({op:'Select',owner:'opponent',origin:'battle',n,optional:true,...(to?{to}:{}),filter:{creature:true},g173Targets:true,g193Select:true,g513CostBudget:budget,title:'合計コスト'+budget+'以下になるよう選ぶ'});
 if(text==='相手のクリーチャーを2体までコストの合計が8以下になるように選び持ち主の手札に戻す。')return select(8,'hand',2);
 if(text==='コストの合計が自分のマナゾーンにあるドラゴンの数以下になるよう相手のクリーチャーを2体まで破壊する。')return{op:'CountCost553',zone:'mana',filter:{anyFaceRace:'ドラゴン'},def:select(0,'grave',2)};
 if(text==='相手のエレメントをコストの合計が6以下になるように好きな数選ぶ。それらをすべて持ち主のマナゾーンに置くか破壊する。')return{...select(6,undefined,'all'),filter:{element:true},g553Destinations:true};
 return null;
}
function instruction554(text){
 if(text==='自分のシールドを2つ手札に加える。ただしその「S・トリガー」は使えない。')return{op:'ShieldHand',g238ShieldHand:true,g535Count:2};
 if(text==='自分のシールドを2つマナゾーンに置く。')return{op:'ShieldHand',g535Count:2,g554To:'mana'};
 if(text==='次の自分のターンのはじめに自分のシールドを2枚手札に加える。ただしその「S・トリガー」は使えない。')return{op:'Schedule537',when:'nextOwnStart',defs:[{op:'ShieldHand',g238ShieldHand:true,g535Count:2}]};
 return null;
}
// Casting and the destination after resolution are one complete instruction.
function instruction555(text){
 const base={op:'Execute',origin:'grave',spellOnly:true,g555FinishTo:'deck',optional:false};
 const rules={
  'コスト7以下の呪文を1枚自分の墓地からコストを支払わずに唱える。唱えた後その呪文を墓地に置くかわりに自分の山札の一番下に置く。':{...base,max:7},
  'コスト4以下の呪文を1枚自分の墓地からコストを支払わずに唱える。唱えた後墓地に置くかわりに山札の一番下に置く。':{...base,max:4},
  '自分の墓地にあるコスト7以下の呪文を1枚コストを支払わずに唱える。唱えた後墓地に置くかわりに山札の一番下に置く。':{...base,max:7},
  'コスト3以下の呪文を1枚自分の墓地からコストを支払わずに唱えてもよい。それを唱えた後墓地に置くかわりに山札の下に置く。':{...base,max:3,optional:true},
  'コスト4以下の呪文を1枚自分の手札または墓地からコストを支払わずに唱えてもよい。そうしたらそれを唱えた後墓地のかわりにマナゾーンに置く。':{...base,zones:['hand','grave'],max:4,optional:true,g555FinishTo:'mana'}
 };return rules[text]?structuredClone(rules[text]):null;
}
function instruction556(text){
 const cast={op:'Execute',origin:'grave',spellOnly:true,optional:true,g555FinishTo:'deck'};
 if(text==='コスト4以下の呪文を1枚自分の墓地からコストを支払わずに唱えてもよい。唱えた後墓地に置くかわりに自分の山札の一番下に置く。')return{...cast,max:4};
 if(text==='自分の墓地にある呪文を1枚コストを支払わずに唱えてもよい。そうしたらその呪文を唱えた後自分の墓地に置くかわりに山札の一番下に置く。')return cast;
 if(text==='自分の山札の上から5枚を墓地に置いてもよい。その後闇のコスト6以下の呪文を1枚自分の墓地からコストを支払わずに唱えてもよい。その呪文を唱えた後墓地のかわりに山札の下に置く。')return{op:'Sequence',defs:[{op:'Mill',n:5,optional:true},{...cast,max:6,g556SpellColor:'闇'}]};
 if(text==='コスト5以下の呪文を1枚自分の墓地または手札からコストを支払わずに唱えてもよい。唱えた後墓地に置くかわりに自分の山札の一番下に置く。')return{...cast,zones:['grave','hand'],max:5};
 return null;
}
function aura560(text){
 let line=text,condition,hand=false;
 if(line.startsWith('G・G・G:自分の手札が1枚以下なら')){line=line.slice('G・G・G:自分の手札が1枚以下なら'.length);condition={g334ZoneCount:{zone:'hand',max:1}};hand=true;}
 const mana=line.match(/^マナ武装3[:―-]自分のマナゾーンに(光|火)のカードが3枚以上あれば(.+)$/);if(mana){condition={g267Mana:{n:3,color:mana[1]}};line=mana[2];}
 const m=line.match(/^自分の(.+?)の召喚コストを(最大)?([1-9]\d*)(少なくする|少なくしてもよい)。ただし(?:コストは)?(?:0以下(?:には|に)は?ならない|1より少なくならない)。$/);if(!m)return null;
 const filters={'進化クリーチャー':{evolution:true},'コスト8以上のクリーチャー':{min:8},'ディスタス':{race:'ディスタス'},'ムートピア':{race:'ムートピア'},'コマンド・クリーチャー':{race:'コマンド'},'進化ヒューマノイド':{race:'ヒューマノイド',evolution:true},'エンジェル・コマンドとデーモン・コマンドすべて':{raceAny:['エンジェル・コマンド','デーモン・コマンド']},'ゴッド・ノヴァOMG':{race:'ゴッド・ノヴァ OMG'},'光のコマンド':{color:'光',race:'コマンド'},'光のドラゴン':{color:'光',race:'ドラゴン'},'コマンド・ドラゴン':{race:'コマンド・ドラゴン'},'ビートジョッキーすべて':{race:'ビートジョッキー'}};
 const filter=filters[m[1]];return filter?{filter,amount:+m[3],...(m[2]||m[4]==='少なくしてもよい'?{g560Optional:true}:{}),...(condition?{condition}:{}),...(hand?{g560InUse:true}:{})}:null;
}
function bara565(text){
 const prefix='バラバラエティ3:',suffix='(コストが異なる自分のエレメントが3つ以上あればこのクリーチャーにこの能力を与える)';
 if(!text.startsWith(prefix)||!text.endsWith(suffix))return null;
 const grants={
  'このクリーチャーが攻撃する時自分の山札の上から1枚目をシールド化してもよい。':{g34Attack:[{op:'Offer',defs:[{op:'ShieldTop',n:1}]}]},
  '自分のクリーチャーの召喚コストを1少なくする。ただしコストは0以下にはならない。':{g349SummonAuras:[{filter:{creature:true},amount:1}]},
  '相手のターンのはじめに相手のクリーチャーを1体選ぶ。このターンそのクリーチャーは攻撃できない。':{g179OpponentStart:[{op:'Target',g565AttackLock:true}]},
  '自分の他のクリーチャーが出た時次の自分のターンのはじめまでそのクリーチャーは相手に選ばれず攻撃されない。':{g468EntryWatch:{filter:{creature:true},g565Other:true,mode:'protect565'}}
 }[text.slice(prefix.length,-suffix.length)];
 return grants?{filter:{g466DistinctCosts:3},grants}:null;
}
function instruction569(text){
 const n={
  'このターンバトルゾーンにある自分のクリーチャー1体のパワーは+4000されそのクリーチャーよりパワーが小さいクリーチャーにブロックされない。':4000,
  'このターンバトルゾーンにある自分のクリーチャー1体のパワーは+2000される。このターンそのクリーチャーはそのクリーチャーよりパワーの小さいクリーチャーにブロックされない。':2000
 }[text];return n?{op:'Target',owner:'self',power:n,g569WeakerBlock:true,spell:true}:null;
}
function instruction568(text){
 const rules={
  '自分の山札の上から1枚を墓地に置く。その後クリーチャーまたはタマシードを1つ自分の墓地から手札に戻してもよい。':{op:'Sequence',defs:[{op:'Mill',n:1},{op:'Select',origin:'grave',to:'hand',n:1,optional:true,filter:{any:[{creature:true},{g295Tamaseed:true}]}}]},
  '自分の山札の上から2枚を表向きにする。その中からクリーチャーを1体手札に加えてもよい。残りを墓地に置く。':{op:'Look',n:2,public:true,rest:'grave',stages:[{n:1,to:'hand',filter:{creature:true},optional:true,reveal:true}]},
  '相手のエレメントを1つ選び破壊する。':{op:'Target',element:true,to:'grave',filter:{element:true}}
 };return rules[text]?structuredClone(rules[text]):null;
}
function instruction567(text){
 const rules={
  'バトルゾーンにあるクリーチャーを1体選ぶ。このターンそのクリーチャーのパワーは+5000され相手プレイヤーを攻撃できない。':{op:'Target',anyOwner:true,power:5000,g567PlayerStop:'end',spell:true},
  'クリーチャーを1体選ぶ。このターンそのクリーチャーのパワーは+4000され次の自分のターンのはじめまで相手プレイヤーを攻撃できない。':{op:'Target',anyOwner:true,power:4000,g567PlayerStop:'start',spell:true},
  'クリーチャーを1体選ぶ。このターンそのクリーチャーのパワーを+6000しそのクリーチャーは相手プレイヤーを攻撃できない。':{op:'Target',anyOwner:true,power:6000,g567PlayerStop:'end',spell:true},
  'クリーチャーを1体選ぶ。次の自分のターンのはじめまでそのクリーチャーのパワーを+4000し相手プレイヤーを攻撃できない。':{op:'Target',anyOwner:true,power:4000,g521UntilStart:true,g567PlayerStop:'start',spell:true}
 };return rules[text]?structuredClone(rules[text]):null;
}
function instruction566(text){
 const rules={
  'バトルゾーンにある自分のクリーチャーを1体選ぶ。このターンそのクリーチャーはブロックされない。':{op:'Target',owner:'self',grant:{unblockable:true}},
  'クリーチャーを2体まで自分の墓地から山札の一番上に好きな順序で置く。':{op:'Select',origin:'grave',to:'deckTop',n:2,optional:true,filter:{creature:true},g183Return:true},
  'バトルゾーンにある自分のクリーチャーを1体選ぶ。その後相手プレイヤーはバトルゾーンにある自身のクリーチャーを1体選ぶ。選ばれたクリーチャー以外のクリーチャーはこのターンと次のターン攻撃できない。':{op:'Bind566'}
 };return rules[text]?structuredClone(rules[text]):null;
}
function instruction565(text){
 if(['そのターン中にクリーチャーが攻撃していなければカードを1枚引いてもよい。','そのターンクリーチャーが1体も攻撃していなければカードを1枚引いてもよい。'].includes(text))return{op:'IfOwn',filter:{g565NoAttacks:true},defs:[{op:'Offer',defs:[{op:'Draw',n:1}]}]};
 return null;
}
function bara564(text){
 const prefix='バラバラエティ3:',suffix='(コストが異なる自分のエレメントが3つ以上あればこのクリーチャーにこの能力を与える)';
 if(text===prefix+'スレイヤー(コストが異なる自分のエレメントが3つ以上あればこのクリーチャーがバトルする時バトルの後相手クリーチャーを破壊する)')return{grants:{slayer:true}};
 if(text===prefix+'このクリーチャーのパワーを+5000し「W・ブレイカー」を与える。(コストが異なる自分のエレメントが3つ以上あればこのクリーチャーはパワーを+5000されシールドを2つブレイクする)')return{grants:{power:5000,breaker:2}};
 if(!text.startsWith(prefix)||!text.endsWith(suffix))return null;
 const body=text.slice(prefix.length,-suffix.length),rules={
  'このクリーチャーが攻撃する時このクリーチャーはシールドを1つブレイクしてもよい。':{grants:{g34Attack:[{op:'Offer',defs:[{op:'Break497',n:1}]}]}},
  '相手のターン中このクリーチャーのパワーを+10000する。':{turn:'opponent',grants:{power:10000}},
  '自分のクリーチャーすべてに「スレイヤー」を与える。':{aura:{slayer:true}},
  '自分のクリーチャーすべてに「マッハファイター」を与える。':{aura:{machFighter:true}},
  'このクリーチャーが攻撃する時相手は自身のクリーチャーを1体選び破壊する。':{grants:{g34Attack:[{op:'OpponentSelect',n:1,to:'grave'}]}},
  '各ターンの終わりに自分のクリーチャーをすべてアンタップする。':{grants:{g474AnyEnd:[{op:'GroupUntap',filter:{creature:true}}]}},
  'このクリーチャーが出た時相手のパワー12000以下のクリーチャーを1体選び破壊する。':{grants:{g34Tasks:[{op:'Target',to:'grave',filter:{creature:true,maxPower:12000,g199Power:true}}]}},
  'このクリーチャーが出た時カードを2枚引いてもよい。':{grants:{g34Tasks:[{op:'Offer',defs:[{op:'Draw',n:2}]}]}},
  'このクリーチャーが出た時コスト8以下のクリーチャーを1体自分の墓地から出す。':{grants:{g34Tasks:[{op:'Select',origin:'grave',n:1,deploy:true,g236GraveDeploy:true,filter:{creature:true,max:8}}]}},
  '自分のターンの終わりに自分の山札の上から1枚目をシールド化してもよい。その後自分のシールドを1つ手札に加えてもよい。ただしその「S・トリガー」は使えない。':{grants:{g174End:[{op:'Offer',defs:[{op:'ShieldTop',n:1}]},{op:'ShieldHand',g238ShieldHand:true,optional:true}]}}
 };
 return rules[body]||null;
}
function instruction563(text){
 const defs={
  'それがNEO進化クリーチャーなら自分の山札の上から2枚をマナゾーンに置く。':[{op:'Ramp',n:2}],
  'それがNEO進化クリーチャーならカードを3枚まで引く。':[{op:'DrawUpTo',n:3,g203Draw:true}],
  'それがNEO進化クリーチャーなら闇ではないクリーチャーをすべて破壊する。':[{op:'Sweep',both:true,to:'grave',filter:{creature:true,notColor:'闇'}}],
  'これがNEO進化クリーチャーなら相手のシールドを2つブレイクする。':[{op:'Break497',n:2}]
 }[text];
 if(defs)return{op:'IfNeo563',defs};
 if(text==='相手のコスト4以下のクリーチャーを1体選び相手はそれを自身の山札の一番下に置く。')return{op:'Target',filter:{creature:true,max:4},to:'deck'};
 return null;
}
function instruction562(text){
 const schedule=(defs,ownEnd=false)=>({op:'EndUntap562',ownEnd,defs}),choose=(n=1,optional=false)=>({op:'ChooseUntap562',n,optional});
 const grouped={
  'ターンの終わりにバトルゾーンにある自分のゴッドをすべてアンタップする。':{filter:{creature:true,race:'ゴッド'}},
  'ターンの終わりに自分のクリーチャーをすべてアンタップする。':{filter:{creature:true}},
  '自分のターンの終わりにバトルゾーンにある自分のクリ―チャーをすべてアンタップする。':{filter:{creature:true},ownEnd:true}
 }[text];
 if(grouped)return schedule([{op:'GroupUntap',filter:grouped.filter}],!!grouped.ownEnd);
 if(text==='このターンの終わりにバトルゾーンにある自分のクリーチャーを1体アンタップする。')return schedule([choose()]);
 if(text==='自分のターンの終わりにバトルゾーンにある自分のクリーチャーを2体までアンタップする。')return schedule([choose(2,true)],true);
 if(text==='バトルゾーンにある自分のクリーチャーを2体まで選ぶ。このターンの終わりにそのクリーチャーをアンタップしてもよい。')return{...choose(2,true),delay:true,optionalUntap:true};
 return null;
}
function instruction561(text){
 const counted=(zone,amount,def,filter={})=>({op:'CountPower561',zone,amount,filter,defs:[{...def,power:1,g561Scale:true}]});
 if(text==='このターンの攻撃中バトルゾーンにある自分のクリーチャーすべてのパワーは自分のマナゾーンにある闇のカード1枚につき+1000される。')return{op:'GroupPower',owner:'self',filter:{creature:true},g561AttackOnly:true,g561DarkMana:true,power:1};
 if(text==='ターンの終わりまで相手のタップされているクリーチャーすべてのパワーはバトルゾーンにある自分のグランド・デビル1体につき-1000される。')return counted('battle',-1000,{op:'GroupPower',owner:'opponent',filter:{creature:true,tapped:true}},{creature:true,race:'グランド・デビル'});
 if(text==='このターンバトルゾーンにある自分のドリームメイトすべてのパワーはバトルゾーンにある自分のドリームメイト1体につき+2000される。')return counted('battle',2000,{op:'GroupPower',owner:'self',filter:{creature:true,race:'ドリームメイト'}},{creature:true,race:'ドリームメイト'});
 if(text==='このターンバトルゾーンにある自分のパワー6000以上のドリームメイトはすべて「W・ブレイカー」を得る。')return{op:'GroupGrant364',owner:'self',filter:{creature:true,race:'ドリームメイト',minPower:6000,g199Power:true},grant:{g313Breaker:2}};
 if(text==='相手のクリーチャーを1体選ぶ。自分の手札1枚につきこのターンそのクリーチャーのパワーを_1000する。(パワー0以下のクリーチャーは破壊される)')return counted('hand',-1000,{op:'Target',g242PowerMinus:true,filter:{creature:true}});
 return null;
}
function instruction557(text){
 if(text==='そのターン自分のクリーチャーはすべてパワーを+4000されシールドをさらに1つブレイクする。')return{op:'Sequence',defs:[{op:'GroupPower',owner:'self',filter:{creature:true},power:4000},{op:'GroupLasting412',owner:'self',filter:{creature:true},extraBreak:1}]};
 if(text==='相手のシールドを1つ選び持ち主のマナゾーンに置く。')return{op:'ShieldMana557'};
 if(text==='このターン自分のクリーチャーすべてのパワーを+9000し「T・ブレイカー」を与える。(「T・ブレイカー」を持つクリーチャーはシールドを3つブレイクする)')return{op:'Sequence',defs:[{op:'GroupPower',owner:'self',filter:{creature:true},power:9000},{op:'GroupGrant364',owner:'self',filter:{creature:true},grant:{g313Breaker:3}}]};
 return null;
}
function instruction599(text){
 const kill={op:'Target',to:'grave',filter:{blocker:true}};
 if(text==='このターン自分のクリーチャーはすべてブロックされない。')return {op:'GroupGrant364',owner:'self',filter:{creature:true},grant:{unblockable:true}};
 if(text==='相手の「ブロッカー」を持つクリーチャーを1体破壊する。その後自分の自然のクリーチャーがバトルゾーンにあれば相手の「ブロッカー」を持つクリーチャーをもう1体破壊する。')return {op:'Sequence',defs:[kill,{op:'IfOwn',filter:{creature:true,color:'自然'},defs:[kill]}]};
 if(text==='相手のシールドが2つ以下なら相手の「ブロッカー」を持つクリーチャーを1体破壊する。')return {op:'IfOwn',filter:{g334ZoneCount:{zone:'shields',opponent:true,max:2}},defs:[kill]};
 return null;
}
function instruction598(text){
 if(text==='プレイヤーを1人選ぶ。そのプレイヤーは自身の墓地にあるカードをすべて山札に加えてシャッフルする。')return {op:'GraveShuffle545'};
 if(text==='プレイヤー1人の墓地にあるカードを2枚選び好きな順序で持ち主の山札の下に置いてもよい。そうしたら自分はカードを1枚引く。')return {op:'GravePick598',mode:'draw',n:2};
 if(text==='プレイヤー1人の墓地にあるカードを好きな枚数選ぶ。その持ち主は選ばれたカードを好きな順序で山札の下に置く。その後自分は選ばれたカードの枚数以下のコストを持つ相手のクリーチャーを1体選び破壊してもよい。')return {op:'GravePick598',mode:'destroy'};
 return null;
}
function instruction600(text){
 const catchUp={op:'IfOwn',filter:{g334ZoneCount:{zone:'mana',lessThanOpponent:true}},defs:[{op:'Ramp',n:1}]};
 const overMana={creature:true,g600OverMana:true};
 switch(text){
 case '相手のマナゾーンにあるカードの枚数よりコストが大きい相手の進化ではないクリーチャーをすべて裏向きにしてそれぞれ新しいシールドとして持ち主のシールドゾーンに置く。':
  return {op:'Sweep',to:'shields',filter:{...overMana,nonEvolution:true}};
 case '相手のマナゾーンにあるカードの枚数よりコストが大きい相手のクリーチャーを1体選び持ち主の山札の下に置く。':
  return {op:'Target',to:'deck',filter:overMana};
 case '相手のマナゾーンのカードが自分のより多ければ自分の山札の上から1枚目をマナゾーンに置く。':
  return catchUp;
 default:return null;
 }
}
function instruction601(text){
 const filter={creature:true,g510NonMulticolor:true};
 switch(text){
 case '相手の多色ではないクリーチャーを1体選び持ち主の手札に戻す。':
  return {op:'Target',to:'hand',filter};
 case '相手の多色ではないクリーチャーを1体破壊する。':
  return {op:'Target',to:'grave',filter};
 case '多色ではないクリーチャーをすべて持ち主の手札に戻す。':
  return {op:'Sweep',to:'hand',both:true,filter};
 case 'バトルゾーンに自分の光のハンターがあればバトルゾーンにある相手のクリーチャーを1体選びタップする。':
  return {op:'IfOwn',filter:{creature:true,color:'光',race:'ハンター'},defs:[{op:'Target',tap:true}]};
 default:return null;
 }
}
function instruction602(text){
 const shield={op:'ShieldTop',n:1};
 switch(text){
 case '相手のアンタップしているクリーチャーをすべて持ち主の手札に戻す。':
  return {op:'Sweep',to:'hand',filter:{creature:true,untapped:true}};
 case '相手のタップしているクリーチャーをすべて持ち主のマナゾーンに置く。':
  return {op:'Sweep',to:'mana',filter:{creature:true,tapped:true}};
 case '自分の山札の上から1枚をシールド化する。その後自分のシールドが2つ以下なら自分の山札の上からもう1枚シールド化する。':
  return {op:'Sequence',defs:[shield,{op:'IfOwn',filter:{g334ZoneCount:{zone:'shields',max:2}},defs:[shield]}]};
 case 'このターンの終わりにバトルゾーンにある自分の名前に《白騎士》とあるクリーチャーをすべてアンタップする。':
  return {op:'Schedule537',when:'turnEnd',defs:[{op:'GroupUntap',filter:{creature:true,name:'白騎士'}}]};
 case 'エレメントを1つ選ぶ。その持ち主はそれを山札の上または下に置く。':
  return {op:'Target',element:true,anyOwner:true,g467Destinations:['deckTop','deck'],g472OwnerDestination:true};
 case '自分のクリーチャーをすべてアンタップする。このターン自分のクリーチャーは破壊されない。':
  return {op:'Sequence',defs:[
   {op:'GroupUntap',filter:{creature:true}},
   {op:'GroupLasting412',owner:'self',filter:{creature:true},destroySafe:true,untilEnd:true}
  ]};
 default:return null;
 }
}
function instruction603(text){
 switch(text){
 case '自分の山札の上から1枚目をマナゾーンに置く。それがジョーカーズならカードを1枚引く。':
  return {op:'Ramp',n:1,g603Draw:{filter:{anyFaceRace:'ジョーカーズ'}}};
 case '自分の山札の上から1枚目をマナゾーンに置く。そのカードが光または火のカードであればカードを1枚引いてもよい。':
  return {op:'Ramp',n:1,g603Draw:{filter:{any:[{anyFaceColor:'光'},{anyFaceColor:'火'}]},optional:true}};
 case '自分の山札の上から2枚を見てそのうちの1枚をマナゾーンに置く。':
  return {op:'Look',n:2,stages:[{n:1,to:'mana'}],rest:'top'};
 case '相手のコスト6以下のエレメントを1つ選び持ち主のマナゾーンに置く。':
  return {op:'Target',element:true,to:'mana',filter:{max:6}};
 case 'このターンクリーチャーが攻撃していれば相手のコスト5以下のエレメントを1つ選び持ち主のマナゾーンに置いてもよい。':
  return {op:'IfOwn',filter:{g603AttackThisTurn:true},defs:[{op:'Target',element:true,to:'mana',optional:true,filter:{max:5}}]};
 default:return null;
 }
}
function instruction604(text){
 const bounce={op:'Target',element:true,to:'hand'};
 switch(text){
 case '相手のエレメントを1つ選び持ち主の手札に戻す。':
  return bounce;
 case '相手のエレメントを1つ選び持ち主の手札に戻す。その後相手の手札を1枚見ないで選び捨てさせる。':
  return {op:'Sequence',defs:[bounce,{op:'Discard',n:1,random:true}]};
 case '相手は自身のクリーチャーの中から1体選び残りを破壊する。':
  return {op:'KeepOne604',zone:'battle'};
 case '相手は自身の手札を1枚選び残りをすべて捨てる。':
  return {op:'KeepOne604',zone:'hand'};
 default:return null;
 }
}
function instruction(text,phase){
 if(phase>=657&&text==='次の自分のターンのはじめまで自分のクリーチャーはすべて攻撃もブロックもされない。')
  return {op:'GroupGrant364',owner:'self',filter:{creature:true},g521UntilStart:true,grant:{cannotBeAttacked:true,unblockable:true}};
 if(phase>=655){const def=instruction655(text);if(def)return def;}
 if(phase>=654){const def=instruction654(text);if(def)return def;}
 if(phase>=653){
  if(text==='自分のシールドを1つブレイクする。')return{op:'Break497',owner:'self',n:1};
  if(text==='相手は自身のシールドを1つ選ぶ。そのシールドをブレイクする。')return{op:'Break497',n:1,ownerChooses:true};
 }
 if(phase>=642){
  if(text==='相手のクリーチャーを1体選び持ち主の山札の下に置く。')return{op:'Target',to:'deck'};
  if(text==='ジョーカーズ・カードを1枚自分の墓地から手札に戻してもよい。')
   return{op:'Select',origin:'grave',to:'hand',n:1,optional:true,filter:{g539JokerCard:true}};
 }
 if(phase>=641){
  if(text==='コスト4以下のタマシードをすべて自分の墓地から出す。')
   return{op:'Select',origin:'grave',n:'all',deploy:true,g236GraveDeploy:true,filter:{g295Tamaseed:true,max:4},title:'墓地のコスト4以下のタマシードを出す順に選ぶ'};
  if(text==='バトルゾーンにある自分のカードの文明ひとつにつきカードを1枚引く。')
   return{op:'CountDraw',zone:'battle',g641Civilizations:true};
 }
 if(phase>=640){
  if(text==='ジョーカーズを1枚自分の手札から捨ててもよい。そうしたらカードを2枚引く。')
   return{op:'DiscardFor248',g488DiscardFilter:{g539JokerCard:true},title:'捨てるジョーカーズ・カードを1枚選ぶ（任意）',defs:[{op:'Draw',n:2}]};
  if(text==='自分の手札を1枚超次元ゾーンに置く。')
   return{op:'Select',origin:'hand',to:'extra',n:1,title:'超次元ゾーンに置く手札を1枚選ぶ'};
 }
 if(phase>=639){
  if(text==='自分のタマシードを1枚破壊してもよい。そうしたらカードを2枚引く。')
   return{op:'SacrificeAlly413',g547Seed:true,defs:[{op:'Draw',n:2}]};
  if(text==='パワー6000以下のタップされているクリーチャーすべてまたはパワー3000以下のタップされていないクリーチャーすべてを破壊する。')
   return{op:'Choose',g184Modes:true,modes:[
    {label:'パワー6000以下のタップ中のクリーチャーをすべて破壊',defs:[{op:'Sweep',both:true,to:'grave',filter:{creature:true,tapped:true,maxPower:6000,g199Power:true}}]},
    {label:'パワー3000以下のアンタップ中のクリーチャーをすべて破壊',defs:[{op:'Sweep',both:true,to:'grave',filter:{creature:true,untapped:true,maxPower:3000,g199Power:true}}]}
   ]};
 }
 if(phase>=638&&text==='相手のクリーチャーを1体選び破壊する。その後選んだクリーチャーのコストと同じ枚数自分の山札の上から墓地に置いてもよい。')
  return{op:'Target',to:'grave',g631MillCost:true,g638OptionalMill:true,title:'破壊する相手のクリーチャーを選ぶ'};
 if(phase>=637){
  if(text==='相手のエレメントを1つ選び持ち主のマナゾーンに置く。')return{op:'Target',element:true,to:'mana'};
  if(text==='相手のエレメントをすべて持ち主の手札に戻す。')return{op:'Sweep',to:'hand',filter:{element:true}};
  if(text==='コスト5以下のゴッドを1つ自分の墓地から出す。')
   return{op:'Select',origin:'grave',n:1,deploy:true,g236GraveDeploy:true,filter:{element:true,race:'ゴッド',max:5}};
 }
 if(phase>=636){
  if(text==='自分のドラゴン・クリーチャーと相手のクリーチャーを1体ずつ選んでもよい。その2体をバトルさせる。')return{op:'Fight240',optional:true,g419FightFilter:{race:'ドラゴン'}};
  if(text==='水または自然のコスト4以下のクリーチャーを1体自分の手札から出してもよい。')
   return{op:'Select',origin:'hand',n:1,deploy:true,g195HandDeploy:true,filter:{creature:true,max:4,any:[{color:'水'},{color:'自然'}]},optional:true};
 }
 if(phase>=635){
  if(text==='相手のエレメントを1つ選ぶ。相手はそれを山札の上か下に置く。')return{op:'Target',element:true,g467Destinations:['deckTop','deck'],g472OwnerDestination:true};
  if(text==='クリーチャーを1体選ぶ。このターンそのクリーチャーのパワーを+2000する。')return{op:'Target',anyOwner:true,power:2000,g419Boost:true,spell:true};
  if(text==='自分と相手のクリーチャーを1体ずつ選ぶ。その2体をバトルさせる。')return{op:'Fight240',optional:false};
 }
 if(phase>=634){
  if([
   '自分の手札を1枚裏向きのまま新しいシールドとしてシールドゾーンに置いてもよい。',
   '自分の手札を1枚裏向きにして新しいシールドとして自分のシールドゾーンに置いてもよい。',
   '自分の手札を1枚シールド化してもよい。'
  ].includes(text))return{op:'Select',origin:'hand',to:'shields',n:1,optional:true};
  if([
   '山札の上から4枚を見る。その中からクリーチャーを1体相手に見せ手札に加えてもよい。残りを好きな順序で山札の一番下に置く。',
   '自分の山札の上から4枚を見る。その中からクリーチャーを1体表向きにしてから手札に加えてもよい。残りを好きな順序で山札の下に置く。'
  ].includes(text))return lookSpec('自分の山札の上から4枚を見る。その中からクリーチャーを1体相手に見せ手札に加えてもよい。残りを好きな順序で山札の下に置く。',phase);
 }
 if(phase>=632){
  if(text==='相手のコスト3以下のクリーチャーを1体選んでもよい。その選んだクリーチャーとこのクリーチャーをバトルさせる。')
   return{op:'Fight240',self:true,optional:true,enemyFilter:{max:3}};
  if(text==='自分のパワー5000以下のクリーチャーを1体破壊する。そうした場合相手のパワー5000以下のクリーチャーを1体破壊する。'){
   const filter={creature:true,maxPower:5000,g199Power:true};
   return{op:'Target',owner:'self',to:'grave',filter,g587AfterSelection:true,
    title:'破壊する自分のパワー5000以下のクリーチャーを選ぶ',
    after:[{op:'Target',to:'grave',filter,title:'破壊する相手のパワー5000以下のクリーチャーを選ぶ'}]};
  }
 }
 if(phase>=631){
  if(text==='相手のクリーチャーを1体選び破壊する。その後選んだクリーチャーのコストと同じ枚数自分の山札の上から墓地に置く。')
   return{op:'Target',to:'grave',g631MillCost:true,title:'破壊する相手のクリーチャーを選ぶ'};
  if(text==='相手のクリーチャーを1体選び相手はそれに封印を1つ付ける。(カードを封印するには自分の山札の上から1枚を裏向きのままそのカードの上に置く。コマンドが出た時その持ち主はそのコマンドと同じ文明を持つ自身のカードから封印を1つ墓地に置く。封印されているクリーチャーは無視される)')
   return{op:'Target',seal:true,title:'封印する相手のクリーチャーを選ぶ'};
 }
 if(phase>=630){
  if(text==='コストの合計が4以下になるようにクリーチャーを好きな数自分の手札から出す。')
   return{op:'Select',origin:'hand',n:'all',deploy:true,optional:true,g550CostBudget:4,filter:{creature:true},title:'合計コスト4以下で、手札から出す順に選ぶ'};
  if(text==='自分の山札の上から2枚をシールド化してもよい。')
   return{op:'Offer',title:'山札の上から2枚をシールド化する？',defs:[{op:'ShieldTop',n:1},{op:'ShieldTop',n:1}]};
 }
 if(phase>=629&&text==='コスト3以下のクリーチャーではないカードを1枚自分の手札からコストを支払わずに実行してもよい。')
  return{op:'Execute',origin:'hand',nonCreature:true,max:3,optional:true};
 if(phase>=628){
  if(text==='クリーチャーを2体まで選び持ち主の手札に戻す。')
   return{op:'Select',origin:'battle',anyOwner:true,to:'hand',n:2,optional:true,g173Targets:true,g193Select:true,
    filter:{creature:true},title:'持ち主の手札に戻すクリーチャーを2体まで選ぶ'};
  if(text==='自分のクリーチャーを1体アンタップする。次の自分のターンのはじめまでそのクリーチャーのパワーを+4000し「ブロッカー」を与える。(「ブロッカー」を持つクリーチャーをタップして相手クリーチャーの攻撃先をそのクリーチャーに変更してもよい)')
   return{op:'Target',owner:'self',untap:true,power:4000,grant:{blocker:true},g521UntilStart:true,
    title:'アンタップして強化する自分のクリーチャーを選ぶ'};
 }
 if(phase>=627&&text==='次の相手のターン中相手は一度しかクリーチャーで攻撃できない。')
  return{op:'AttackCap627'};
 if(phase>=626){
  if(text==='相手のコスト6以下のクリーチャー1体またはタマシードを1枚破壊する。')
   return{op:'Target',element:true,to:'grave',filter:{creatureOrSeed:true,max:6}};
  if(text==='進化ではないクリーチャーを1体と進化クリーチャーを1体自分の墓地から手札に戻してもよい。')
   return{op:'Select',origin:'grave',to:'hand',n:2,filter:{creature:true},
    optional:true,g626DistinctEvolution:true,title:'墓地から進化ではないクリーチャーと進化クリーチャーを1体ずつ戻す（任意）'};
 }
 if(phase>=625&&text==='自分の山札の上から1枚目をシールド化する。')return{op:'ShieldTop',n:1};
 if(phase>=625&&text==='このターンの終わりに自分のシールドを1つブレイクする。')
  return{op:'Schedule537',when:'turnEnd',defs:[{op:'Break497',owner:'self',n:1}]};
 if(phase>=618&&text==='相手が自身の前のターンでシールドを加えていた場合相手のシールドを3枚選びそれ以外をすべて持ち主の墓地に置く。')
  return{op:'Harpoon618'};
 if(phase>=617){
  if(text==='相手のエレメントを1つ選んで持ち主のマナゾーンに置く。')
   return{op:'Target',element:true,to:'mana'};
  if(text==='コストの合計が7以下になるように相手のエレメントを好きな数選び破壊する。')
   return{op:'Select',owner:'opponent',origin:'battle',n:'all',optional:true,to:'grave',g173Targets:true,g193Select:true,g513CostBudget:7,title:'合計コスト7以下になるよう相手のエレメントを選ぶ'};
 }
 if(phase>=616&&text===replicaAuction616)
  return{op:'Look',n:3,stages:[{n:1,to:'shields'}],rest:'bottom'};
 if(phase>=615&&text==='このターン自分のクリーチャーすべてに「パワーアタッカー+4000」「パワード・ブレイカー」「スピードアタッカー」を与える。(それぞれ攻撃中のパワーを+4000されそのパワー6000ごとにシールドをさらに1つブレイクし召喚酔いしない)')
  return{op:'GroupGrant364',owner:'self',filter:{creature:true},grant:{attackBonus:4000,poweredBreaker:true,speedAttacker:true}};
 if(phase>=614&&text==='相手の墓地にあるクリーチャーと同じカード名の相手のクリーチャーを1体破壊する。')
  return{op:'Target',to:'grave',filter:{g614GraveCreatureName:true}};
 if(phase>=613){
  if(text==='このターンバトルゾーンにある自分の闇または自然のクリーチャー1体のパワーは+2000され「W・ブレイカー」を得る。(「W・ブレイカー」を得たクリーチャーはシールドを2枚ブレイクする)')
   return{op:'Target',owner:'self',filter:{any:[{color:'闇'},{color:'自然'}]},power:2000,grant:{g313Breaker:2}};
  if(text==='自分のクリーチャーを1体選ぶこのターンそのクリーチャーはブロックされない。')
   return{op:'Target',owner:'self',grant:{unblockable:true}};
  if(text==='このターン自分のクリーチャーが攻撃する時カードを1枚引く。')
   return{op:'TurnAttackDraw613'};
  if(text==='相手の「ブロッカー」を持つクリーチャーをすべて破壊する。')
   return{op:'Sweep',to:'grave',filter:{creature:true,blocker:true}};
 }
 if(phase>=612){
  if(text==='相手のコスト2以下のクリーチャーをすべて持ち主の手札に戻す。')
   return{op:'Sweep',to:'hand',filter:{creature:true,max:2}};
  if(text==='相手のパワー4000以下のクリーチャーをすべて持ち主のマナゾーンに置く。')
   return{op:'Sweep',to:'mana',filter:{creature:true,maxPower:4000,g199Power:true}};
 }
 if(phase>=611&&text==='相手のアンタップしているクリーチャーを1体選び裏向きにして新しいシールドとして持ち主のシールドゾーンに置く。')
  return{op:'Target',to:'shields',filter:{untapped:true}};
 if(phase>=607){
  if(text==='相手のクリーチャーではないエレメントを1つ選び破壊する。')
   return {op:'Target',element:true,to:'grave',filter:{nonCreatureElement:true}};
  if(/^このターン相手のクリーチャーすべてのパワーを[-−]3000する。\(パワー0以下のクリーチャーは破壊される\)$/.test(text))
   return {op:'GroupPower',g214GroupPower:true,owner:'opponent',power:-3000,filter:{creature:true}};
 }

 if(phase>=606){
  if(text==='バトルゾーンにある相手のクリーチャーを好きな数選ぶ。このターンそのクリーチャーは攻撃またはブロックできない。')
   return {op:'Select',origin:'battle',owner:'opponent',n:'all',optional:true,filter:{creature:true},g173Targets:true,g193Select:true,g190Freeze:'end',title:'このターン、攻撃とブロックを止める相手クリーチャーを選ぶ'};
  if(text==='相手のパワー4000以下のクリーチャーはすべて次の相手のターンのはじめにアンタップしない。')
   return {op:'LockUntap606',g210TapLock:true,filter:{maxPower:4000,g199Power:true}};
  if(text==='光または水のコスト5以下の呪文を1枚コストを支払わずに自分の手札から唱えてもよい。')
   return {op:'Execute',origin:'hand',spellOnly:true,max:5,spellColorsAny:['光','水'],optional:true};
 }
 if(phase>=605){
  const filter={
   '相手の手札を見てその中から呪文を1枚選び捨てさせる。':{g228Face:{type:'spell'}},
   '相手の手札を見てクリーチャー以外のカードを1枚選び捨てさせる。':{nonCreature:true}
  }[text];
  if(filter)return {op:'InspectHand',g223Inspect:true,chooseOne:true,discard:true,filter};
 }
 if(phase>=604){const def=instruction604(text);if(def)return def;}
 if(phase>=603){const def=instruction603(text);if(def)return def;}
 if(phase>=602){const def=instruction602(text);if(def)return def;}
 if(phase>=601){const def=instruction601(text);if(def)return def;}
 if(phase>=600){const def=instruction600(text);if(def)return def;}
 if(phase>=599){const def=instruction599(text);if(def)return def;}
 if(phase>=598){const def=instruction598(text);if(def)return def;}
 if(phase>=596){
  const kill=(filter={})=>({op:'Sweep',to:'grave',filter:{creature:true,...filter}});
  if(text==='1から5までの数字を1つ選ぶ。その数字と同じコストを持つ相手のクリーチャーをすべて破壊する。')return {op:'CostSweep596',min:1,max:5};
  if(text==='自分のシールドを1つ選び手札に加える。ただしその「S・トリガー」は使えない。')return {op:'ShieldHand',g238ShieldHand:true};
  if(text==='鬼タイム:自分と相手のシールドの数が合計6つ以下なら相手のコスト3以下のクリーチャーをすべて破壊する。')return {op:'IfOwn',filter:{g334ZoneCount:{zone:'shields',sumBoth:true,max:6}},defs:[kill({max:3})]};
  if(text==='このターン中に出た相手のクリーチャーをすべて破壊する。')return kill({g596EnteredThisTurn:true});
  if(text==='相手のパワー1000以下のクリーチャーをすべて破壊する。')return kill({maxPower:1000,g199Power:true});
  if(text==='相手のパワー3000以下のクリーチャーをすべて破壊してもよい。そうしたら自分のシールドを1つ手札に加える。ただしその「S・トリガー」は使えない。')return {op:'Offer',title:'パワー3000以下の相手をすべて破壊し、自分のシールドを1つ手札に加える？',defs:[kill({maxPower:3000,g199Power:true}),{op:'ShieldHand',g238ShieldHand:true}]};
 }
 if(phase>=593){
  const stop={
   '次の自分のターンのはじめまで相手はパワー5000以下のクリーチャーで攻撃できない。':{max:5000},
   '次の自分のターンのはじめまで相手のパワー4000以下のクリーチャーはすべてプレイヤーを攻撃できない。':{max:4000,playerOnly:true},
   '次の自分のターンのはじめまでパワー3000以下のクリーチャーは攻撃できない。':{max:3000,both:true}
  }[text];
  if(stop)return {op:'PowerAttack593',...stop};
  if(text==='相手のマナゾーンにあるカードの枚数より大きいコストを持つ相手のエレメントを1つ選ぶ。相手はそれを山札の下に置く。')return {op:'Target',to:'deck',element:true,g593OverMana:true};
 }
 if(phase>=592){
  const bottom={op:'GraveBottom589',choosePlayer:true};
  const body='プレイヤーを1人選んでもよい。そのプレイヤーは自身の墓地をシャッフルし山札の下に置く。';
  if(text===body)return bottom;
  if(text==='自分の山札の上から1枚目をマナゾーンに置く。その後'+body)return {op:'Sequence',defs:[{op:'Ramp',n:1},bottom]};
 }
 if(phase>=591){
  const defs={
   'バトルゾーンにある相手のクリーチャーを1体選ぶ。そのターンそのクリーチャーのパワーは-6000される。(パワー0以下のクリーチャーは破壊される)':{op:'Target',power:-6000,g242PowerMinus:true},
   'バトルゾーンにある相手のコスト4以下のカードを1枚選び持ち主のマナゾーンに置く。':{op:'Target',element:true,to:'mana',filter:{max:4}},
   '相手の「ブロッカー」を持つクリーチャーを1体選び破壊する。':{op:'Target',to:'grave',filter:{blocker:true}}
  }[text];
  if(defs)return defs;
 }
 if(phase>=590){const task=instruction590(text);if(task)return task;}
 if(phase>=589){const task=instruction589(text);if(task)return task;}
 if(phase>=588){const task=instruction588(text);if(task)return task;}
 if(phase>=622&&text==='自分のクリーチャーをすべてアンタップする。次の自分のターンのはじめまでそれらのクリーチャーに「ブロッカー」を与える。(「ブロッカー」を持つクリーチャーをタップして相手クリーチャーの攻撃先をそのクリーチャーに変更してもよい)'){
  return {op:'Sequence',defs:[
   {op:'GroupUntap',g219Untap:true,filter:{creature:true}},
   {op:'GroupGrant364',owner:'self',filter:{creature:true},grant:{blocker:true},g521UntilStart:true}
  ]};
 }
 if(phase>=587){const task=instruction587(text);if(task)return task;}
 if(phase>=586){const task=instruction586(text);if(task)return task;}
 if(phase>=585){const task=instruction585(text);if(task)return task;}
 if(phase>=584){const task=instruction584(text);if(task)return task;}
 if(phase>=583){const task=instruction583(text);if(task)return task;}
 if(phase>=582){const task=instruction582(text);if(task)return task;}
 if(phase>=581){const task=instruction581(text);if(task)return task;}
 if(phase>=580){const task=instruction580(text);if(task)return task;}
 if(phase>=579){
  if(text==='相手のパワー3000以下のクリーチャーをすべて破壊する。')return{op:'Sweep',to:'grave',filter:{creature:true,maxPower:3000,g199Power:true}};
  const move=battleCard579(text);
  if(move)return move;
  const oni='鬼タイム:自分と相手のシールドの数が合計6つ以下なら';
  if(text.startsWith(oni)){
   const move=battleCard579(text.slice(oni.length));
   if(move)return{op:'IfOwn',filter:{g334ZoneCount:{zone:'shields',sumBoth:true,max:6}},defs:[move]};
  }
 }

 if(phase>=576){
  const sweep=text.match(/^(相手の)?(無色ではない)?コスト([1-9]\d*)以下のエレメントをすべて破壊する。$/);
  if(sweep)return{op:'Sweep',...(!sweep[1]?{both:true}:{}),filter:{element:true,max:+sweep[3],...(sweep[2]?{g218Colored:true}:{})}};
  if(text==='コスト4以下のスノーフェアリーを1つ自分の手札またはマナゾーンから出してもよい。'){
   return{op:'Select',zones:['hand','mana'],n:1,deploy:true,optional:true,filter:{faceUp:true,element:true,race:'スノーフェアリー',max:4}};
  }
 }

 if(phase>=573){
  const drawRace={'自分の他のマジックがあればカードを1枚引く。':'マジック','自分の他のロスト・クルセイダーがあればカードを1枚引く。':'ロスト・クルセイダー'}[text];
  if(drawRace)return{op:'IfOwn',filter:{race:drawRace,g334Other:true},defs:[{op:'Draw',n:1}]};
 }
 if(phase>=569){const d=instruction569(text);if(d)return d;}
 if(phase>=568){const d=instruction568(text);if(d)return d;}
 if(phase>=567){const d=instruction567(text);if(d)return d;}
 if(phase>=566){const d=instruction566(text);if(d)return d;}
 if(phase>=565){const d=instruction565(text);if(d)return d;}
 if(phase>=563){const d=instruction563(text);if(d)return d;}
 if(phase>=562){const d=instruction562(text);if(d)return d;}
 if(phase>=561){const d=instruction561(text);if(d)return d;}
 if(phase>=557){const d=instruction557(text);if(d)return d;}
 if(phase>=556){const d=instruction556(text);if(d)return d;}
 if(phase>=555){const d=instruction555(text);if(d)return d;}
 if(phase>=554){const d=instruction554(text);if(d)return d;}
 if(phase>=553){const d=instruction553(text);if(d)return d;}
 if(phase>=552){const d=lookBudget552(text);if(d)return d;}
 if(phase>=551){const d=deploy551(text);if(d)return d;}
 if(phase>=550){const d=deployBudget550(text);if(d)return d;}
 if(phase>=549){const d=instruction549(text);if(d)return d;}
 if(phase>=548&&text==='コスト3以下のクリーチャー1体またはコスト3以下のタマシードを1枚破壊する。')return{op:'Target',anyOwner:true,element:true,to:'grave',filter:{creatureOrSeed:true,max:3}};
 if(phase>=547){const defs={
  '自分のタマシードを1枚破壊してもよい。そうしたらコスト4以下のタマシードを1枚自分の墓地から出す。':{op:'SacrificeAlly413',g547Seed:true,defs:[{op:'Select',origin:'grave',n:1,deploy:true,g236GraveDeploy:true,optional:false,filter:{g295Tamaseed:true,max:4}}]},
  '相手のクリーチャー1体またはタマシードを1枚破壊する。':{op:'Target',element:true,to:'grave',filter:{creatureOrSeed:true}},
  'クリーチャーを1体破壊する。そのクリーチャーの持ち主は自身の山札の上から1枚目をシールド化する。':{op:'Target',anyOwner:true,to:'grave',g547OwnerShield:true},
  'バトルゾーンにあるクリーチャー1体またはタマシードを1枚選び持ち主の手札に戻してもよい。':{op:'Target',anyOwner:true,element:true,to:'hand',optional:true,filter:{creatureOrSeed:true}}
 };if(defs[text])return structuredClone(defs[text]);}

 if(phase>=546){const force=instruction546(text);if(force)return force;}

 if(phase>=545&&text==='自分の山札の上から1枚目を墓地に置いてもよい。それが進化クリーチャーなら手札に加えそうでなければカードを1枚引く。')return{op:'Offer',defs:[{op:'MillRecover545',filter:{creature:true,evolution:true},elseDefs:[{op:'Draw',n:1}]}]};

 if(phase>=544){
  if(text==='自分の山札の上から4枚を表向きにする。その中から進化クリーチャーを1体手札に加えてもよい。残りを墓地に置く。')return{op:'Look',n:4,public:true,rest:'grave',stages:[{n:1,to:'hand',filter:{creature:true,evolution:true},optional:true,reveal:true}]};
  if(text==='バトルゾーンにある自分のクリーチャー1体につき相手のクリーチャーを1体選びタップする。')return{op:'CountOwn538',filter:{creature:true},mode:'select',def:{op:'Select',origin:'battle',owner:'opponent',optional:false,g173Targets:true,g193Select:true,g193Tap:true,filter:{creature:true},title:'タップする相手のクリーチャーを選ぶ'}};
 }

 if(phase>=540){const d=instruction540(text);if(d)return d;}
 if(phase>=539){const d=instruction539(text);if(d)return d;}
 if(phase>=538){const d=instruction538(text);if(d)return d;}
 if(phase>=537){const d=instruction537(text);if(d)return d;}
 if(phase>=536){const d=instruction536(text);if(d)return d;}
 if(phase>=535){const d=instruction535(text);if(d)return d;}
 if(phase>=533){const d=instruction533(text);if(d)return d;}
 if(phase>=532){const d=instruction532(text);if(d)return d;}
 if(phase>=531){const d=instruction531(text);if(d)return d;}
 if(phase>=530){const d=instruction530(text);if(d)return d;}
 if(phase>=529){const d=instruction529(text);if(d)return d;}
 if(phase>=526){const d=instruction526(text);if(d)return d;}
 if(phase>=523){const d=manaDeploy523(text);if(d)return d;}
 if(phase>=522){const d=instruction522(text);if(d)return d;}
 if(phase>=521){const d=target521(text);if(d)return d;}
 if(phase>=520){const d=mill520(text);if(d)return d;if(text==='D2フィールド1枚またはクリーチャーを1体自分の墓地から手札に戻してもよい。')return{op:'Select',origin:'grave',to:'hand',n:1,optional:true,filter:{any:[{creature:true},{g228Face:{type:'field',d2:true}}]}};}
 if(phase>=519){const d=target519(text);if(d)return d;}
 if(phase>=518){const d=fight518(text);if(d)return d;}
 if(phase>=517){const d=discard517(text);if(d)return d;}
 if(phase>=516){const d=ramp516(text);if(d)return d;if(text==='コスト3以下のクリーチャーを1体自分のマナゾーンからバトルゾーンに出してもよい。')return{op:'Select',origin:'mana',n:1,deploy:true,optional:true,filter:{creature:true,max:3}};if(text==='カードを1枚自分のマナゾーンまたは墓地から手札に戻してもよい。')return{op:'Select',zones:['mana','grave'],to:'hand',n:1,optional:true};}
 if(phase>=515){const d=boost515(text);if(d)return d;}
 if(phase>=514){const d=reveal514(text);if(d)return d;}
 if(phase>=513){const d=instruction513(text);if(d)return d;}
 if(phase>=512){if(text==='カードを1枚引く')return{op:'Draw',n:1};if(text==='この呪文を唱えた後墓地に置くかわりに自分の手札に戻す。')return{op:'SpellFinish416',to:'hand'};}
 if(phase>=510){const d=modal510(text);if(d)return d;}
 if(phase>=509){
  const aliases={
   '相手はバトルゾーンから自分自身のクリーチャーを1体選び持ち主の墓地に置く。':{op:'OpponentSelect',n:1,to:'grave'},
   '相手はバトルゾーンから自分自身のクリーチャーを1体選び持ち主の手札に戻す。':{op:'OpponentSelect',n:1,to:'hand'},
   '相手は自分自身の手札を1枚選んで捨てる。':{op:'Discard',n:1},
   'バトルゾーンにある自分の他のガーディアンをすべてアンタップする。':{op:'GroupUntap',g179Other:true,filter:{creature:true,race:'ガーディアン'}},
   'バトルゾーンにある自分のクリーチャーを1体選んでもよい。このターンそのクリーチャーはブロックされない。':{op:'Target',owner:'self',optional:true,grant:{unblockable:true}},
   '革命2―自分のシールドが2つ以下なら相手のパワー4000以下のクリーチャーをすべて破壊する。':{op:'IfOwn',filter:{g265ShieldsMax:2},defs:[{op:'Sweep',owner:'opponent',to:'grave',filter:{creature:true,maxPower:4000,g199Power:true}}]}
  }[text];if(aliases)return aliases;
  const exact=text.match(/^バトルゾーンにあるパワー([1-9]\d*)のクリーチャーすべてを持ち主の墓地に置く。$/);
  if(exact)return{op:'Sweep',both:true,to:'grave',filter:{creature:true,minPower:+exact[1],maxPower:+exact[1],g199Power:true}};
 }

 if(phase>=507){
  const sweep=text.match(/^バトルゾーンにある(?:パワー([1-9]\d*)以下の)?クリーチャーを?すべてを?持ち主の墓地に置く。$/);
  if(sweep)return{op:'Sweep',both:true,to:'grave',filter:{creature:true,...(sweep[1]?{maxPower:+sweep[1],g199Power:true}:{})}};
  const copy=text.match(/^自分のマナゾーンから(アンブッシュ・スコーピオン|オブシディアン・ビートル)を1体選びバトルゾーンに置いてもよい。$/);
  if(copy)return{op:'Select',origin:'mana',n:1,deploy:true,optional:true,filter:{creature:true,g201ExactName:copy[1]}};
  if(text==='自分のシールドを1枚裏向きのまま選び自分の手札に加えてもよい。ただしその「S(シールド)・トリガー」は使えない。')return{op:'Offer',g299ShieldHand:true,title:'シールド1つを手札に加える？（S・トリガーは使えない）',defs:[{op:'ShieldHand',g238ShieldHand:true}]};
  if(text==='自分のシールドが1枚でもあれば裏向きのまま1枚選び自分の墓地に置く。ただしその「S(シールド)・トリガー」は使えない。')return{op:'ShieldGrave',g239ShieldGrave:true};
 }
 if(phase>=506){const d=powerBudget506(text);if(d)return d;}
 if(phase>=504){
  const mana=text.match(/^バトルゾーンにある相手のコスト([1-9]\d*)以下の(進化ではない)?クリーチャーを([1-9]\d*)体(まで)?選び持ち主のマナゾーンに置く。$/);
  if(mana)return{op:'Select',owner:'opponent',origin:'battle',n:+mana[3],filter:{creature:true,max:+mana[1],...(mana[2]?{nonEvolution:true}:{})},g173Targets:true,g193Select:true,to:'mana',...(mana[4]?{optional:true}:{}),title:'マナに置く相手のクリーチャーを'+mana[3]+'体'+(mana[4]?'まで':'')+'選ぶ'};
  if(text==='相手のパワー2000以下のクリーチャーをすべてバトルゾーンから持ち主のマナゾーンに置く。')return{op:'Sweep',to:'mana',filter:{creature:true,maxPower:2000,g199Power:true}};
  if(text==='バトルゾーンにある火または自然のクリーチャーを1体選び持ち主の手札に戻してよい。')return{op:'Target',anyOwner:true,optional:true,to:'hand',filter:{creature:true,any:[{color:'火'},{color:'自然'}]}};
  if(text==='バトルゾーンにある相手の「ブロッカー」を持つクリーチャーを1体選び持ち主の墓地に置く。')return{op:'Target',to:'grave',filter:{creature:true,blocker:true}};
 }
 if(phase>=503){const d=ally503(text);if(d)return d;}
 if(phase>=501){
  const end={
   '自分のターンの終わりにバトルゾーンにある自分のクリーチャーを1体アンタップする。それが進化クリーチャーであればカードを1枚引いてもよい。':{op:'ChooseEndUntap501',evolutionDraw:true},
   'バトルゾーンにある自分のガーディアンまたはアーク・セラフィムを1体アンタップしてもよい。':{op:'Target',owner:'self',untap:true,optional:true,filter:{raceAny:['ガーディアン','アーク・セラフィム']}},
   '相手のシールドが2つ以下なら自分の光のクリーチャーをすべてアンタップする。':{op:'IfOwn',filter:{g465OpponentShieldsMax:2},defs:[{op:'GroupUntap',filter:{creature:true,color:'光'}}]},
   'バトルゾーンにあるクリーチャーが3体以下ならカードを1枚引いてもよい。':{op:'IfOwn',filter:{g501TotalCreaturesMax:3},defs:[{op:'Offer',defs:[{op:'Draw',n:1}]}]}
  }[text];if(end)return end;
 }
 if(phase>=494){
  const freeSpell=text.match(/^コスト([1-9]\d*)以下の呪文を1枚(?:自分の手札からコストを支払わずに|コストを支払わずに自分の手札から)唱えてもよい。$/);
  if(freeSpell)return{op:'Execute',origin:'hand',spellOnly:true,max:+freeSpell[1]};
  if(text==='クリーチャーをすべてタップする。')return{op:'TapAll',g218Tap:true,both:true,filter:{creature:true}};
  const catchup=text.match(/^相手のマナゾーンのカードが自分のより多ければ自分の山札の上から([1-9]\d*)枚をマナゾーンに置く。$/);
  if(catchup)return{op:'IfOwn',filter:{g334ZoneCount:{zone:'mana',lessThanOpponent:true}},defs:[{op:'Ramp',n:+catchup[1]}]};
 }
 if(phase>=491&&text==='相手の「ブロッカー」を持つクリーチャー1体を破壊する。')return{op:'Target',to:'grave',filter:{blocker:true}};
 if(phase>=489){const lock=timedSpellLock489(text);if(lock)return lock;}

 if(phase>=488){
  const discard=discardCreature488(text);if(discard)return discard;
  const blocker=text.match(/^相手の「ブロッカー」を持つクリーチャーを([12])体(まで)?(?:選び)?(?:破壊する|持ち主のマナゾーンに置いてもよい)。$/);
  if(blocker){const to=text.endsWith('破壊する。')?'grave':'mana';return +blocker[1]===1?{op:'Target',to,optional:to==='mana'||!!blocker[2],filter:{blocker:true}}:{op:'Select',owner:'opponent',origin:'battle',to,n:+blocker[1],optional:!!blocker[2],filter:{creature:true,blocker:true},g173Targets:true,g193Select:true};}
  if(text==='多色カードを1枚自分のマナゾーンから手札に戻してもよい。')return{op:'Select',origin:'mana',to:'hand',n:1,optional:true,filter:{g223Multicolor:true}};
  if(text==='自分の山札を見る。その中から多色ドラゴンを1体選び相手に見せてから自分の手札に加えてもよい。その後山札をシャッフルする。')return{op:'Look',g201Search:true,g200Search:true,n:'all',rest:'shuffle',stages:[{n:1,to:'hand',filter:{creature:true,multi:true,race:'ドラゴン'},reveal:true,optional:true}]};
  if(text==='光のコスト4以下の呪文を1枚コストを支払わずに自分の手札から唱えてもよい。そうしなければカードを1枚引く。')return{op:'Execute',origin:'hand',spellOnly:true,max:4,filter:{g228Face:{type:'spell',color:'光',max:4}},g408Decline:[{op:'Draw',n:1}]};
 }

 if(phase>=478){
  if(['自分のシールドが1枚でもあればその中から1枚を裏向きのまま選び自分の手札に加える。ただしその「S(シールド)・トリガー」は使えない。','自分のシールドを1枚選び手札に加える。ただしその「S・トリガー」は使えない。','自分のシールドを1枚手札に加える。ただしその「S・トリガー」は使えない。'].includes(text))return{op:'ShieldHand',g238ShieldHand:true};
  if(text==='相手は自分自身のマナゾーンからカードを1枚選び持ち主の墓地に置く。')return{op:'OpponentManaLoss478'};
 }
 if(phase>=476){
  if(text==='クリーチャーをすべて自分の墓地から手札に戻す。')return{op:'RecoverAll326',zones:['grave'],filter:{creature:true}};
  if(text==='好きな数の進化ダークロードを自分の墓地から手札に戻してもよい。')return{op:'Select',origin:'grave',to:'hand',n:'all',optional:true,filter:{creature:true,evolution:true,race:'ダークロード'},title:'手札に戻す進化ダークロードを好きな数選ぶ'};
  const recovery=text.match(/^コスト([1-9]\d*)以上の(クリーチャー|エンジェル・コマンド)を1体自分の墓地から手札に戻してもよい。$/);if(recovery)return{op:'Select',origin:'grave',to:'hand',n:1,optional:true,filter:{creature:true,min:+recovery[1],...(recovery[2]==='エンジェル・コマンド'?{race:'エンジェル・コマンド'}:{})}};
 }
 if(phase>=474&&text==='このクリーチャーを手札に戻す。')return{op:'SelfHand299'};
 if(phase>=472){const d=instruction472(text);if(d)return d;}
 if(phase>=469){const r=text.match(/^コスト([1-9]\d*)以下のクリーチャーを([12])体自分の墓地から選びバトルゾーンに出してもよい。$/);if(r){const d={op:'Select',origin:'grave',n:+r[2],deploy:true,g236GraveDeploy:true,filter:{creature:true,max:+r[1]},optional:r[2]==='1',title:'墓地から出すコスト'+r[1]+'以下のクリーチャーを'+r[2]+'体選ぶ'};return r[2]==='1'?d:{op:'Offer',title:'墓地からクリーチャーを2体出す？',defs:[d]};}}

 if(phase>=467){const looked=look467(text);if(looked)return looked;if(text==='相手のクリーチャーを1体選び持ち主の手札マナゾーン墓地のいずれかに置く。')return{op:'Target',g467Destinations:['hand','mana','grave']};}
 if(phase>=465){const protect=protect465(text);if(protect)return{op:'Target',...protect};}
 if(phase>=462){const reveal=handReveal462(text);if(reveal)return{op:'HandReveal462',...reveal};}
 if(phase>=461){const each=playersDraw461(text);if(each)return each;}
 if(phase>=460){const cycle=handCycle460(text);if(cycle)return cycle;}

 if(phase>=459){
  const each={
   '各プレイヤーは自身の手札を1枚選び捨てる。':{origin:'hand',to:'grave',discard:true},
   '各プレイヤーはそれぞれ1枚ずつ自身の手札を選び捨てる。':{origin:'hand',to:'grave',discard:true},
   '各プレイヤーは自身の手札を1枚選び持ち主の山札の上に置く。':{origin:'hand',to:'deckTop'},
   '各プレイヤーは自身の手札を1枚選びマナゾーンに置く。':{origin:'hand',to:'mana'},
   '各プレイヤーは自身のクリーチャーを1体選び破壊する。':{origin:'battle',to:'grave'},
   '各プレイヤーは自身のクリーチャーを1体選び持ち主のマナゾーンに置く。':{origin:'battle',to:'mana'},
   '各プレイヤーは自身のクリーチャーを1体ずつ選びマナゾーンに置く。':{origin:'battle',to:'mana'}
  }[text];if(each)return{op:'EachPlayer459',...each};
 }

 if(phase>=456){
  const next={
   'このターン次に自分が呪文を唱える時その呪文を唱えるコストを最大2少なくしてもよい。ただしコストは1より少なくならない。':{type:'spell',amount:2,optional:true},
   'このターン中次に召喚するクリーチャーのコストを最大2少なくする。ただしコストは1より少なくならない。':{type:'creature',amount:2,optional:true},
   'このターン次にクリーチャーを召喚する時そのクリーチャーの召喚コストを1少なくしてもよい。ただしコストは1より少なくならない。':{type:'creature',amount:1,optional:true},
   'そのターン次に唱える自分の呪文のコストを最大3少なくしてもよい。ただしコストは1より少なくならない。':{type:'spell',amount:3,optional:true},
   'このターン次に自分のチーム切札を召喚する時その召喚コストを最大5少なくする。ただしコストは0以下にはならない。':{type:'creature',amount:5,optional:true,filter:{race:'チーム切札'}},
   'このターン次に召喚する自然のパワー12000以上のクリーチャーのコストを最大8少なくしてもよい。ただしコストは0以下にはならない。':{type:'creature',amount:8,optional:true,filter:{color:'自然',minPower:12000}}
  }[text];if(next)return{op:'NextReduction456',...next};
 }
 if(phase>=455){let m;
  if(text==='このターンバトルゾーンにある自分のクリーチャー1体は「スレイヤー」を得る。(「スレイヤー」を得たクリーチャーがバトルする時バトルの後相手クリーチャーを破壊する)')return{op:'Target',owner:'self',grant:{slayer:true}};
  if(m=text.match(/^パワー([1-9]\d*)以下の「ブロッカー」を持つ相手のクリーチャーを1体破壊する。$/))return{op:'Target',to:'grave',filter:{maxPower:+m[1],g199Power:true,blocker:true}};
  if(text==='相手のクリーチャーを1体選びタップする。次の自分のターンのはじめまでそれはアンタップしない。'||text==='相手のクリーチャーを1体選びタップする。次の自分のターンのはじめまでそのクリーチャーはアンタップしない。')return{op:'Target',tap:true,g291UntapUntilSelf:true};
  if(m=text.match(/^相手のクリーチャーを1体選ぶ。このターンそのクリーチャーのパワーを−([1-9]\d*)する。\(パワーが0以下のクリーチャーは破壊される\)$/))return{op:'Target',power:-Number(m[1]),g242PowerMinus:true};
  if(text==='相手はバトルゾーンにある自身のタップされているクリーチャーを1体選び破壊する。')return{op:'OpponentSelect',n:1,to:'grave',filter:{tapped:true}};
  if(text==='カードを5枚まで引く。')return{op:'DrawUpTo',n:5};
  if(text==='このターンバトルゾーンにある自分のクリーチャー1体はシールドをさらに1枚ブレイクする。')return{op:'Target',owner:'self',g455ExtraBreak:1};
  if(m=text.match(/^このターンバトルゾーンにある自分のクリーチャー1体は「パワーアタッカー\+([1-9]\d*)」を得シールドをさらに1枚ブレイクする。$/))return{op:'Target',owner:'self',power:+m[1],g337PowerAttacker:true,g455ExtraBreak:1};
  if(text==='このターンこのクリーチャーは「パワーアタッカー+5000」を得シールドをさらにもう1枚ブレイクする。')return{op:'Sequence',defs:[{op:'SelfBoost313',power:5000,g337PowerAttacker:true},{op:'SelfExtraBreak444',amount:1}]};
 }
 if(phase>=451){let m;
  if(m=text.match(/^相手のコスト([1-9]\d*)以下のエレメントを1つ選び持ち主のマナゾーンに置いてもよい。$/))return{op:'Target',element:true,to:'mana',optional:true,filter:{max:+m[1]}};
  if(text==='自分の山札の上から3枚を見る。その中からドラゴンまたはファイアー・バードを1枚相手に見せてから手札に加えてもよい。残りを好きな順序で山札の下に置く。')return{op:'Look',n:3,stages:[{n:1,to:'hand',optional:true,reveal:true,filter:{any:[{anyFaceRace:'ドラゴン'},{anyFaceRace:'ファイアー・バード'}]}}],rest:'bottom'};
  if(text==='自分の山札の上から1枚目をマナゾーンに置く。')return{op:'Ramp',n:1};
  if(text==='エレメントを1つ選び持ち主のマナゾーンに置いてもよい。')return{op:'Target',element:true,anyOwner:true,to:'mana',optional:true};
  if(text==='水のコスト6以下の呪文を1枚自分の手札からコストを支払わずに唱えてもよい。')return{op:'Execute',origin:'hand',spellOnly:true,max:6,optional:true,filter:{g228Face:{type:'spell',color:'水',max:6}}};
 }
 if(phase>=450){
  if(text==='自分の墓地のカードを好きな枚数タップしてマナゾーンに置く。')return{op:'Select',origin:'grave',to:'mana',n:'all',optional:true,tapped:true,filter:{},title:'タップしてマナに置く墓地のカードを好きな枚数選ぶ'};
  if(text==='自然のクリーチャーをすべて自分の墓地からマナゾーンに置く。')return{op:'Select',origin:'grave',to:'mana',n:'all',filter:{g228Face:{type:'creature',color:'自然'}},title:'自然の墓地のクリーチャーをすべてマナに置く'};
 }
 if(phase>=449){
  if(text==='自分の山札の上から4枚を見る。そのうちの1枚を山札の上に戻し残りを墓地に置く。')return{op:'Look',n:4,g183Return:true,stages:[{n:1,to:'deckTop',filter:{}}],rest:'grave'};
  if(text==='カードを1枚自分の墓地からマナゾーンに置く。')return{op:'Select',origin:'grave',to:'mana',n:1,filter:{},title:'マナに置く墓地のカードを1枚選ぶ'};
 }
 if(phase>=438&&text==='このターン自分のクリーチャーすべてに「パワード・ブレイカー」を与える。')return{op:'GroupGrant364',owner:'self',filter:{creature:true},grant:{poweredBreaker:true}};
 if(phase>=434){
  if(text==='クリーチャーを1体選び持ち主のマナゾーンに置いてもよい。')return{op:'Target',anyOwner:true,to:'mana',optional:true};
  if(text==='相手のエレメントを1つ選び持ち主の山札の下に置く。')return{op:'Target',element:true,to:'deck'};
  if(text==='自分の手札を1枚シールド化する。')return{op:'Select',origin:'hand',to:'shields',n:1,optional:false};
 }
 if(phase>=429){const look=look429(text);if(look)return look;}
 if(phase>=427){
  if(/^(?:バトルゾーンにある)?クリーチャーを1体選びシールド化する。$/.test(text))return{op:'Target',anyOwner:true,to:'shields'};
  if(/^(?:バトルゾーンにある)?クリーチャーを1体(?:選び)?持ち主のマナゾーンに置く。$/.test(text))return{op:'Target',anyOwner:true,to:'mana'};
 }
 if(phase>=426&&[
  '自分のマナゾーンのカードを1枚裏向きにしてもよい。',
  '自分のマナゾーンのカードを1枚裏向きにしてもよい。(マナゾーンにある裏向きのカードはマナの数字が1の無色カードとして扱う。その持ち主はそれをいつでも見てもよい)',
  '自分のマナゾーンのカードを1枚裏向きにしてもよい。(パワー0以下のクリーチャーは破壊される。マナゾーンにある裏向きのカードはマナの数字が1の無色カードとして扱う。その持ち主はそれをいつでも見てもよい)'
 ].includes(text))return{op:'ManaDown426'};
 if(phase>=425){let m;
  if(m=text.match(/^バトルゾーンにあるパワー([1-9]\d*)以下の(光|水|闇|火|自然)のクリーチャーすべてを持ち主の墓地に置く。$/))return{op:'Sweep',both:true,to:'grave',filter:{creature:true,maxPower:+m[1],g199Power:true,color:m[2]}};
  if(m=text.match(/^バトルゾーンにあるパワー([1-9]\d*)以下の(相手|自分)のクリーチャーを1体選び(?:持ち主|自分)の墓地に(置く|置いてよい|置いてもよい)。$/))return{op:'Target',to:'grave',...(m[2]==='自分'?{owner:'self'}:{}),filter:{maxPower:+m[1],g199Power:true},...(m[3]!=='置く'?{optional:true}:{})};
 }
 if(phase>=446&&text==='自分の山札の上から4枚を見る。その中からクリーチャーを1体見せ手札に加えてもよい。残りを墓地に置く。')return{op:'Look',n:4,stages:[{n:1,to:'hand',filter:{creature:true},reveal:true,optional:true}],rest:'grave'};
 if(phase>=446&&text==='相手のクリーチャーを1体タップする。そのクリーチャーは次の相手のターンのはじめにアンタップしない。')return{op:'Target',tap:true,lock:true,g210TapLock:true};
 if(phase>=424){const def=look424(text);if(def)return def;}
 if(phase>=420){
  if(text==='相手は自分自身の手札を1枚選び捨てる。')return{op:'Discard',n:1};
  if(text==='自分の手札を1枚裏向きのまま自分のシールドに加える。')return{op:'Select',origin:'hand',to:'shields',n:1,optional:false};
  if(text==='バトルゾーンにある自分のクリーチャー1体はこのターンの終わりまで「スピードアタッカー」を得る。(「スピードアタッカー」を得たクリーチャーは召喚酔いしない)')return{op:'Target',owner:'self',g301Grant:true,grant:{speedAttacker:true}};
  if(text==='バトルゾーンにある自分のクリーチャー1体はこのターンの終わりまで「スレイヤー」を得る。(「スレイヤー」を得たクリーチャーがバトルする時バトルの後相手クリーチャーを破壊する)')return{op:'Target',owner:'self',grant:{slayer:true}};
 }
 if(phase>=419){
  if(text==='自分のクリーチャー1体と相手のクリーチャーを1体選ぶ。その2体をバトルさせる。'||text==='自分のクリーチャーと相手のクリーチャーを1体ずつ選ぶ。その2体をバトルさせる。')return{op:'Fight240',optional:false};
  if(text==='バトルゾーンにある自分のハンター1体と相手のクリーチャー1体を選びその2体をバトルさせる。')return{op:'Fight240',optional:false,g419FightFilter:{race:'ハンター'}};
  if(text==='進化ではないドラゴン・ゾンビを1体自分の墓地からバトルゾーンに出す。')return{op:'Select',origin:'grave',n:1,deploy:true,g236GraveDeploy:true,filter:{creature:true,nonEvolution:true,race:'ドラゴン・ゾンビ'},optional:false};
  if(text==='コスト6以下の多色クリーチャーを1体自分のマナゾーンから出す。')return{op:'Select',origin:'mana',n:1,deploy:true,filter:{creature:true,max:6,multi:true},optional:false};
  if(text==='相手のクリーチャーを2体まで選びタップする。次の相手ターンのはじめにそれらはアンタップされない。')return{op:'Select',origin:'battle',owner:'opponent',n:2,filter:{creature:true},g173Targets:true,g193Select:true,g193Tap:true,g210TapLock:true,optional:true,spell:true};
  if(text==='クリーチャーを1体選ぶ。このターンそのクリーチャーのパワーを+7000する。')return{op:'Target',anyOwner:true,power:7000,g419Boost:true,spell:true};
  if(text==='バトルゾーンにある自分の《真実の名ワクワク・チャップルン》を1体アンタップする。')return{op:'Target',owner:'self',untap:true,filter:{g201ExactName:'真実の名ワクワク・チャップルン'}};
 }
 if(phase>=416&&text==='この呪文を唱えた後墓地に置くかわりに手札に戻す。')return{op:'SpellFinish416',to:'hand'};
 if(phase>=415&&text==='自分の山札の上から5枚を見る。その中から「ムゲンクライム」能力を持つカードを好きな枚数墓地に置く。残りを好きな順序で山札の下に置く。')return{op:'Look',g255Search:true,n:5,stages:[{n:'all',to:'grave',filter:{g415Mugen:true},optional:true}],rest:'bottom'};
 if(phase>=414){const def=look414(text);if(def)return def;}
 if(phase>=413){
  const sacrifice=text.match(/^自分の(他の)?クリーチャーを1体破壊してもよい。そうした(?:ら|場合)(.+)$/);
  if(sacrifice){const defs=clauses(sacrifice[2],phase).map(s=>instruction(s,phase));return defs.length&&defs.every(Boolean)?{op:'SacrificeAlly413',defs,...(sacrifice[1]?{other:true}:{})}:null;}
  if(text==='バトルゾーンにある自分のクリーチャーの数が相手より多ければカードを1枚引く。')return{op:'IfOwn',filter:{g413MoreCreatures:true},defs:[{op:'Draw',n:1}]};
  if(text==='バトルゾーンにある自分のクリーチャーの数が相手より多ければ呪文を1枚自分の墓地から手札に戻す。')return{op:'IfOwn',filter:{g413MoreCreatures:true},defs:[{op:'Select',origin:'grave',to:'hand',n:1,filter:{spell:true}}]};
  if(text==='光のコスト5以下の進化ではないクリーチャーを1体自分の手札からバトルゾーンに出してもよい。')return{op:'Select',origin:'hand',deploy:true,n:1,optional:true,filter:{creature:true,color:'光',max:5,nonEvolution:true}};
  if(text==='バトルゾーンにある自分のクリーチャー1体につき相手のクリーチャーを1体選びタップする。')return{op:'CountTap413'};
 }
 if(phase>=412){
  if(text==='そのターンバトルゾーンにある自分のクリーチャーすべてのパワーは+7000されシールドをさらに1枚ブレイクする。')return{op:'Sequence',defs:[{op:'GroupPower',owner:'self',filter:{creature:true},power:7000},{op:'GroupLasting412',owner:'self',filter:{creature:true},extraBreak:1}]};
  if(text==='次の自分のターンのはじめまで自分のクリーチャーは破壊されない。')return{op:'GroupLasting412',owner:'self',filter:{creature:true},destroySafe:true};
  if(text==='バトルゾーンにある相手の進化ではないクリーチャーを2体まで選び新しいシールドとして持ち主のシールドゾーンに裏向きにして加えてもよい。')return{op:'Select',owner:'opponent',origin:'battle',to:'shields',n:2,optional:true,filter:{creature:true,nonEvolution:true},g173Targets:true};
  if(text==='《呪英雄ウラミハデス》以外の進化ではない闇のクリーチャーを1体自分の墓地からバトルゾーンに出してもよい。')return{op:'Select',origin:'grave',deploy:true,n:1,optional:true,filter:{creature:true,nonEvolution:true,color:'闇',g412ExceptName:'呪英雄 ウラミハデス'}};
  if(text==='《怒英雄ガイムソウ》以外の進化ではない火のクリーチャーを1体自分の手札からバトルゾーンに出してもよい。そのクリーチャーは「スピードアタッカー」を得ターンの終わりにバトルゾーンから自分の手札に戻す。')return{op:'Select',origin:'hand',deploy:true,n:1,optional:true,delayed:'hand',grant:{speedAttacker:true},filter:{creature:true,nonEvolution:true,color:'火',g412ExceptName:'怒英雄 ガイムソウ'}};
  if(text==='バトルゾーンにある相手のクリーチャーを1体選んでもよい。その選んだクリーチャーとこのクリーチャーをバトルさせる。')return{op:'Fight240',self:true,optional:true};
  if(text==='バトルゾーンにある相手のクリーチャーを1体選んでもよい。そうした場合その選んだクリーチャーとこのクリーチャーをバトルさせる。')return{op:'Fight240',self:true,optional:true};
  if(text==='バトルゾーンにある相手のクリーチャーを1体選ぶ。選んだクリーチャーとこのクリーチャーはバトルする。')return{op:'Fight240',self:true,optional:false};
  if(text==='コスト3以下の呪文を1枚コストを支払わずに自分の手札から唱えてもよい。')return{op:'Execute',origin:'hand',spellOnly:true,max:3};
 }
 if(phase>=411){
  const ramp=ramp411(text);if(ramp)return ramp;
  if(text==='自分の山札の上からもう1枚マナゾーンに置く。')return{op:'Ramp',n:1};
  if(text==='バトルゾーンにある自分のクリーチャーを1体選びマナゾーンに置く。')return{op:'Target',owner:'self',to:'mana',g177SelfMana:true};
  if(text==='自分のクリーチャーを1体マナゾーンに置いてもよい。そうしたら相手は自身のクリーチャーを1体選びマナゾーンに置く。')return{op:'AttackOtherMana409'};
  if(text==='自分のマナゾーンに火のドラゴンが3体以上あれば相手のパワー3000以下のクリーチャーを1体破壊する。')return{op:'IfOwn',filter:{g411ManaRace:{color:'火',race:'ドラゴン',n:3}},defs:[{op:'Target',to:'grave',filter:{maxPower:3000,g199Power:true}}]};
 }
 if(phase>=410){
  const look=look410(text);if(look)return look;
  if(text==='相手のクリーチャーを1体選ぶ。そのクリーチャーは次の自分のターンのはじめまで攻撃もブロックもできない。')return{op:'Target',g190Freeze:'self',title:'次の自分のターンまで攻撃とブロックを止めるクリーチャーを選ぶ'};
  if(text==='相手のクリーチャーを1体選ぶ。その選んだクリーチャーとこのクリーチャーをバトルさせる。')return{op:'Fight240',self:true,optional:false};
  const recovered=text.match(/^(マフィ・ギャングを([1-9]\d*)体|魔導具を([1-9]\d*)枚)自分の墓地から手札に戻す。$/);
  if(recovered)return{op:'Select',origin:'grave',to:'hand',n:+(recovered[2]||recovered[3]),filter:recovered[2]?{creature:true,race:'マフィ・ギャング'}:{anyFaceRace:'魔導具'}};
 }
 if(phase>=407){
  const target=text.match(/^バトルゾーンにある相手のタップされていないパワー([1-9]\d*)以下のクリーチャーを1体選び持ち主のマナゾーンに置く。$/);
  if(target)return{op:'Target',to:'mana',filter:{untapped:true,maxPower:+target[1],g199Power:true}};
  const m=text.match(/^このクリーチャーを破壊してもよい。(?:そうした(?:場合|ら)(.+))?$/);
  if(m){const defs=m[1]?clauses(m[1],phase).map(q=>instruction(q,phase)):[];return defs.some(d=>!d)?null:{op:'SelfSacrifice407',defs};}
 }
 if(phase>=400){
  const look=look400(text);if(look)return look;
  const tap=text.match(/^バトルゾーンにある相手のクリーチャーを1体選びタップしてもよい。そのクリーチャーは次の相手のターンのはじめにアンタップされない。(?:\(まず何を攻撃するか選んでからタップするクリーチャーを選ぶ\))?$/);
  if(tap)return{op:'Target',tap:true,optional:true,lock:true,g210TapLock:true,title:'次のターンまでタップする相手のクリーチャーを1体まで選ぶ'};
  if(text==='「ブロッカー」を持つ相手のクリーチャーを2体まで破壊する。')return{op:'Select',owner:'opponent',origin:'battle',to:'grave',n:2,optional:true,filter:{creature:true,blocker:true},g173Targets:true,g193Select:true,title:'破壊する相手のブロッカーを2体まで選ぶ'};
  if(text==='クリーチャーをすべて破壊する。')return{op:'Sweep',both:true,to:'grave',filter:{creature:true}};
 }
 if(phase>=398&&text==='ヨビニオン(自分の山札の上からこの呪文よりコストが小さいクリーチャーが出るまで表向きにしてもよい。そのクリーチャーを出す。残りをシャッフルし山札の下に置く)')return{op:'Yobi398'};

 if(phase>=397){
  if(text==='相手のクリーチャーを1体選び手札に戻してもよい。')return{op:'Target',to:'hand',optional:true,title:'手札に戻す相手のクリーチャーを1体まで選ぶ'};
  if(text==='相手のコスト5以下のクリーチャーを1体選んでもよい。相手はそれをシールド化する。')return{op:'Target',to:'shields',filter:{max:5},optional:true,title:'シールド化する相手のコスト5以下のクリーチャーを1体まで選ぶ'};
 }

 if(phase>=389&&text==='自分のタップしているクリーチャーが3体以上あればカードを2枚引く。')return{op:'IfOwn',filter:{g370BattleCount:{filter:{creature:true,tapped:true},min:3}},defs:[{op:'Draw',n:2}]};
 if(phase>=388&&text==='自分の山札の上から3枚を見る。そのうちの1枚を墓地に1枚をマナゾーンに置き残りの1枚を手札に加える。')return{op:'Look',g255Search:true,n:3,stages:[{n:1,to:'grave'},{n:1,to:'mana'},{n:1,to:'hand'}],rest:'bottom'};
 if(phase>=387){
  if(text==='相手のクリーチャーを1体選びシールド化してもよい。')return{op:'Target',to:'shields',optional:true,title:'シールド化する相手のクリーチャーを1体選ぶ'};
  if(text==='ディスタスを1体自分のマナゾーンから出してもよい。')return{op:'Select',origin:'mana',n:1,deploy:true,filter:{creature:true,race:'ディスタス'},optional:true,title:'マナから出すディスタスを1体選ぶ'};
 }
 if(phase>=386){
  if(text==='カードを1枚自分のマナゾーンから自分の墓地に置く。')return{op:'Select',origin:'mana',to:'grave',n:1,g184ManaLoss:true,title:'墓地に置く自分のマナを1枚選ぶ'};
  if(text==='カードを1枚相手のマナゾーンから選び持ち主の墓地に置く。')return{op:'Select',origin:'mana',owner:'opponent',to:'grave',n:1,title:'墓地に置く相手のマナを1枚選ぶ'};
 }
 if(phase>=385){
  if(text==='相手のシールドが2つ以下ならカードを2枚まで引く。')return{op:'IfOwn',filter:{g334ZoneCount:{zone:'shields',opponent:true,max:2}},defs:[{op:'DrawUpTo',n:2,g203Draw:true}]};
  if(text==='自分の闇以外のクリーチャーを1体破壊する。')return{op:'Target',owner:'self',to:'grave',g177SelfMana:true,filter:{notColor:'闇'},title:'破壊する自分の闇以外のクリーチャーを1体選ぶ'};
 }
 if(phase>=384){
  if(text==='カードを2枚まで自分の墓地からマナゾーンにタップして置く。')return{op:'Select',origin:'grave',to:'mana',n:2,tapped:true,optional:true,title:'マナに置く自分の墓地のカードを2枚まで選ぶ'};
  if(text==='相手のマナゾーンからカードを2枚まで選び持ち主の墓地に置く。')return{op:'Select',origin:'mana',owner:'opponent',to:'grave',n:2,optional:true,title:'墓地に置く相手のマナを2枚まで選ぶ'};
 }
 if(phase>=383&&text==='相手のシールドが2つ以下なら相手は自身の手札を2枚選んで捨てる。')return{op:'IfOwn',filter:{g334ZoneCount:{zone:'shields',opponent:true,max:2}},defs:[{op:'Discard',n:2}]};
 if(phase>=382&&text==='自分のマナゾーンからカードを1枚選び自分の墓地に置く。')return{op:'Select',origin:'mana',to:'grave',n:1,g184ManaLoss:true,title:'墓地に置く自分のマナを1枚選ぶ'};
 if(phase>=381){
  if(text==='コスト2以下のクリーチャーを1体自分のマナゾーンから出してもよい。')return{op:'Select',origin:'mana',n:1,deploy:true,filter:{creature:true,max:2},optional:true,title:'マナから出すコスト2以下のクリーチャーを1体選ぶ'};
  if(text==='クリーチャーを1体選びタップまたはアンタップしてもよい。')return{op:'Target',anyOwner:true,g235TapOrUntap:true,optional:true,title:'タップまたはアンタップするクリーチャーを選ぶ'};
 }
 if(phase>=380){
  if(text==='他のクリーチャーを1体選びシールド化してもよい。')return{op:'Target',anyOwner:true,g179Other:true,to:'shields',optional:true};
  if(text==='コスト1のクリーチャーをすべて破壊する。')return{op:'Sweep',g215Sweep:true,both:true,to:'grave',filter:{creature:true,exactCost:1}};
 }
 if(phase>=377&&text==='バトルゾーンに自分の光闇火または自然のクリーチャーが1体でもあればカードを1枚引いてもよい。')return{op:'IfOwn',filter:{creature:true,any:[{color:'光'},{color:'闇'},{color:'火'},{color:'自然'}]},defs:[{op:'Draw',n:1,optional:true}]};
 if(phase>=376&&text==='バトルゾーンにある自分のクリーチャーを1体手札に戻す。')return{op:'Target',owner:'self',to:'hand',g179Return:true};
 if(phase>=375){
  if(text==='クリーチャーを1体選びタップする。')return{op:'Target',anyOwner:true,tap:true};
  if(text==='コスト6以下の相手の「ブロッカー」を持つクリーチャーを1体破壊する。')return{op:'Target',to:'grave',filter:{max:6,blocker:true}};
 }
 if(phase>=374){
  if(text==='自分の他のアビスがあればカードを1枚引く。')return{op:'IfOwn',filter:{race:'アビス',g334Other:true},defs:[{op:'Draw',n:1}]};
  if(text==='相手のコスト3以下のエレメントを1つ選び持ち主の手札に戻してもよい。')return{op:'Target',element:true,filter:{max:3},to:'hand',optional:true};
 }
 if(phase>=373){
  if(text==='自分の手札を1枚捨ててもよい。そうした場合そのターンの終わりまでこのクリーチャーのパワーは+3000され「W・ブレイカー」を得る。')return{op:'DiscardFor248',defs:[{op:'SelfBoost313',power:3000,breaker:2}]};
  if(text==='このターン自分のクリーチャーすべてに「T・ブレイカー」を与える。')return{op:'GroupGrant364',owner:'self',filter:{creature:true},grant:{g313Breaker:3}};
  if(text==='バトルゾーンに自分の他のパワー6000以上のクリーチャーがなければこのクリーチャーを破壊する。')return{op:'IfOwn',filter:{creature:true,minPower:6000,g334Other:true},defs:[],elseDefs:[{op:'SelfDestroy'}]};
 }
 if(phase>=371){
  if(text==='自分の手札を1枚捨ててもよい。そうしたら相手は自身のクリーチャーを1体選んで破壊する。')return{op:'DiscardFor248',defs:[{op:'OpponentSelect',n:1,to:'grave'}]};
  if(text==='バトルゾーンに自分のディープ・マリーンが1体もなければ自分の手札を1枚捨てる。')return{op:'IfOwn',filter:{g370BattleCount:{filter:{race:'ディープ・マリーン'},max:0}},defs:[{op:'Discard',owner:'self',n:1}]};
 }
 if(phase>=368){
  if(text==='自分の他のクリーチャーを1体破壊する。')return{op:'Target',owner:'self',to:'grave',g179Other:true,title:'破壊する自分の他のクリーチャーを1体選ぶ'};
  if(text==='自分のシールドの数が相手のより多ければカードを1枚引いてもよい。')return{op:'IfOwn',filter:{g334ZoneCount:{zone:'shields',moreThanOpponent:true}},defs:[{op:'Draw',n:1,optional:true}]};
 }
 if(phase>=367){
  if(text==='カードを2枚自分のマナゾーンから好きな順序で山札の上に置く。')return{op:'Select',origin:'mana',to:'deckTop',n:2,g183Return:true,title:'山札の上に戻すマナを2枚選ぶ（先に選んだカードが一番上）'};
  if(text==='このターン自分の多色クリーチャーはブロックされない。')return{op:'GroupGrant364',owner:'self',filter:{creature:true,multi:true},grant:{unblockable:true}};
 }
 if(phase>=366){const look=look366(text);if(look)return look;}
 if(phase>=365){
  if(text==='このターンバトルゾーンにある自分のクリーチャーはすべて「スレイヤー」を得る。(「スレイヤー」を得たクリーチャーがバトルする時バトルの後相手クリーチャーを破壊する)')return{op:'GroupGrant364',owner:'self',filter:{creature:true},grant:{slayer:true}};
  if(text==='このターンバトルゾーンにある自分の水のクリーチャーはすべてブロックされない。')return{op:'GroupGrant364',owner:'self',filter:{creature:true,color:'水'},grant:{unblockable:true}};
  if(text==='そのターンバトルゾーンにある自分のクリーチャーはすべてタップされていないクリーチャーを攻撃できる。')return{op:'GroupGrant364',owner:'self',filter:{creature:true},grant:{attackUntapped:true}};
 }
 if(phase>=364){
  if(text==='このターンバトルゾーンにある自分のクリーチャーはすべて「スピードアタッカー」を得る。(「スピードアタッカー」を得たクリーチャーは召喚酔いしない)'||text==='このターン自分のクリーチャーすべてに「スピードアタッカー」を与える。')return{op:'GroupGrant364',owner:'self',filter:{creature:true},grant:{speedAttacker:true}};
  if(text==='このターン自分のクリーチャーすべてに「スレイヤー」を与える。(「スレイヤー」を持つクリーチャーがバトルする時バトルの後相手クリーチャーを破壊する)')return{op:'GroupGrant364',owner:'self',filter:{creature:true},grant:{slayer:true}};
 }

 if(phase>=362){
  if(text==='自分の山札の上から1枚目を見る。そのカードが呪文であれば相手に見せてから裏向きにして新しいシールドとして自分のシールドゾーンに加えてもよい。')return{op:'Look',g255Search:true,n:1,stages:[{n:1,to:'shields',filter:{spell:true},reveal:true,optional:true}],rest:'top'};
  if(text==='自分の山札の上から6枚を表向きにする。その中のドラゴンではないカードをすべて好きな順序で山札の一番下に置く。その後残りを好きな順序で山札の一番上に置く。')return{op:'Look',g255Search:true,n:6,public:true,stages:[{n:'all',to:'deck',filter:{notRace:'ドラゴン'},title:'山札の下に置く非ドラゴンを順に選ぶ'}],rest:'top',g259OrderTop:true};
  if(text==='自分の山札の上から1枚目を表向きにする。それがクリーチャーなら手札に加える。それ以外なら山札の下に置く。')return{op:'Look',g255Search:true,n:1,public:true,stages:[{n:1,to:'hand',filter:{creature:true}}],rest:'bottom'};
 }

 if(phase>=361){
  if(text==='自分の山札の上から1枚目を見る。それがサイバーなら相手に見せてから自分の手札に加えてもよい。')return{op:'Look',g255Search:true,n:1,stages:[{n:1,to:'hand',filter:{anyFaceRace:'サイバー'},reveal:true,optional:true}],rest:'top'};
  if(text==='自分の山札の上から1枚目をすべてのプレイヤーに見せてもよい。それがリキッド・ピープルであれば自分の手札に加える。')return{op:'Offer',g359RevealAll:true,title:'山札の上1枚を公開する？（リキッド・ピープルなら手札へ）',defs:[{op:'Look',g255Search:true,n:1,public:true,stages:[{n:1,to:'hand',filter:{anyFaceRace:'リキッド・ピープル'}}],rest:'top'}]};
  if(text==='*自分の山札の上から4枚を表向きにする。その中の水のカードをすべて自分の手札に加えそれ以外のカードを自分の墓地に置く。')return{op:'Look',g255Search:true,n:4,public:true,stages:[{n:'all',to:'hand',filter:{anyFaceColor:'水'}}],rest:'grave'};
 }

 if(phase>=360){const look=look360(text);if(look)return look;}
 if(phase>=359){
  if(text==='自分のマナゾーンからクリーチャーを2体選び自分の手札に戻す。1体しかない場合はその1体を自分の手札に戻す。')return{op:'Select',origin:'mana',to:'hand',n:2,filter:{creature:true},g232ManaReturn:true,title:'手札に戻すマナのクリーチャーを2体選ぶ'};
  if(text==='自分の山札の上から3枚を表向きにしてもよい。その中から光のカードと闇のカードをすべて自分の手札に加えそれ以外を自分の墓地に置く。')return{op:'Offer',g359RevealAll:true,title:'山札の上3枚を公開し、光と闇を手札に加える？',defs:[{op:'Look',g255Search:true,n:3,public:true,stages:[{n:'all',to:'hand',filter:{any:[{anyFaceColor:'光'},{anyFaceColor:'闇'}]}}],rest:'grave'}]};
  if(text==='自分の山札の上から4枚を表向きにしてもよい。その中から光闇火自然のカードをそれぞれ1枚ずつ選んで手札に加える。その後残りを墓地に置く。')return{op:'Offer',g359RevealAll:true,title:'山札の上4枚を公開し、光・闇・火・自然を各1枚手札に加える？',defs:[{op:'Look',g255Search:true,n:4,public:true,stages:['光','闇','火','自然'].map(color=>({n:1,to:'hand',filter:{anyFaceColor:color},title:color+'のカードを1枚手札に加える'})),rest:'grave'}]};
 }

 if(phase>=358&&text==='コスト3以下の進化ではないクリーチャーを3体まで自分の墓地からバトルゾーンに出す。')return{op:'Select',origin:'grave',n:3,deploy:true,g236GraveDeploy:true,filter:{creature:true,max:3,nonEvolution:true},optional:true,title:'墓地から出すコスト3以下の進化ではないクリーチャーを3体まで選ぶ'};
 if(phase>=357&&text==='自分の山札の上から3枚を見る。そのうちの1枚を自分のマナゾーンに1枚を山札の一番下に1枚を山札の一番上に置く。')return{op:'Look',g255Search:true,n:3,stages:[{n:1,to:'mana',title:'マナゾーンに置く1枚を選ぶ'},{n:1,to:'deck',title:'山札の一番下に置く1枚を選ぶ'}],rest:'top'};
 if(phase>=356){
  if(text==='カードを1枚自分のマナゾーンから山札の上に置く。')return{op:'Select',origin:'mana',to:'deckTop',n:1,g183Return:true,title:'山札の上に戻すマナを1枚選ぶ'};
  if(text==='カードを1枚自分のマナゾーンから手札に戻す。')return{op:'Select',origin:'mana',to:'hand',n:1,g232ManaReturn:true,title:'手札に戻すマナを1枚選ぶ'};
  if(text==='自分の山札の上から2枚をマナゾーンに置いてもよい。そうしたらカードを1枚自分のマナゾーンから手札に戻す。')return{op:'Offer',g356RampReturn:true,title:'山札の上2枚をマナに置き、マナ1枚を手札に戻す？',defs:[{op:'Ramp',n:2},{op:'Select',origin:'mana',to:'hand',n:1,g232ManaReturn:true,title:'手札に戻すマナを1枚選ぶ'}]};
 }
 if(phase>=346){
  if(text==='自分のD2フィールドがバトルゾーンにあればこのクリーチャーをアンタップする。')return{op:'IfOwn',filter:{g228Face:{type:'field',d2:true}},defs:[{op:'Untap'}]};
  if(text==='アンタップしてもよい。')return{op:'Offer',defs:[{op:'Untap'}]};
  if(text==='相手のマナゾーンからカードを1枚選び持ち主の墓地に置く。')return{op:'Select',origin:'mana',owner:'opponent',to:'grave',n:1,title:'墓地に置く相手のマナを1枚選ぶ'};
 }
 if(phase>=345){
  if(text==='自分の手札を1枚相手に見ないで選ばせ捨てる。')return{op:'Discard',owner:'self',n:1,random:true};
  if(text==='自分の進化クリーチャーがなければ自分の手札を1枚捨てる。')return{op:'IfOwn',filter:{creature:true,evolution:true},defs:[],elseDefs:[{op:'Discard',owner:'self',n:1}]};
 }
 if(phase>=344){
  const deployments={
   '光または水のコスト3以下のクリーチャーを1体自分の手札からバトルゾーンに出してもよい。':{creature:true,max:3,any:[{color:'光'},{color:'水'}]},
   'コスト5以下のD2フィールドを1枚自分の手札からバトルゾーンに出してもよい。':{g228Face:{type:'field',d2:true,max:5}},
   '火のコスト8以下のドラゴンまたはアウトレイジを1体自分の手札からバトルゾーンに出してもよい。':{creature:true,color:'火',max:8,raceAny:['ドラゴン','アウトレイジ']},
   '火のコスト7以下のコマンド・ドラゴンを1体自分の手札からバトルゾーンに出してもよい。':{creature:true,color:'火',max:7,race:'コマンド・ドラゴン'},
   '名前に《ジャシン》とあるクリーチャーを1体自分の手札から出してもよい。':{creature:true,g220NameAny:['ジャシン']}
  };
  if(deployments[text])return{op:'Select',origin:'hand',n:1,deploy:true,g195HandDeploy:true,filter:deployments[text],optional:true};
  if(text==='自分のシールドをひとつ手札に戻す。ただしその「S・トリガー」は使えない。')return{op:'ShieldHand',g238ShieldHand:true};
 }
 if(phase>=343){let m;
  if(m=text.match(/^自分のマナゾーンから呪文(?:カード)?を1枚(?:選び)?自分の手札に戻(す|してよい)。$/))return{op:'Select',origin:'mana',to:'hand',n:1,filter:{spell:true},optional:m[1]==='してよい',title:'手札に戻すマナの呪文を1枚選ぶ'};
  if(text==='ガーディアンを1体または呪文を1枚自分の墓地から手札に戻してもよい。')return{op:'Select',origin:'grave',to:'hand',n:1,optional:true,filter:{any:[{g228Face:{type:'creature',raceAll:['ガーディアン']}},{spell:true}]},title:'墓地のガーディアンか呪文を1枚まで手札に戻す'};
  if(text==='ファンキー・ナイトメアをすべて自分の墓地から手札に戻す。')return{op:'RecoverAll326',zones:['grave'],filter:{anyFaceRace:'ファンキー・ナイトメア'}};
  if(text==='自分のマナゾーンにあるサムライを好きな数選び自分の手札に戻してもよい。')return{op:'Select',origin:'mana',to:'hand',n:'all',optional:true,g343ManaReturn:true,filter:{anyFaceRace:'サムライ'},title:'手札に戻すマナのサムライを好きな枚数選ぶ'};
 }
 if(phase>=342){const look=look342(text);if(look)return look;}
 if(phase>=340){let m;
  if(text==='バトルゾーンにある自分のクリーチャーを1体タップする。')return{op:'Target',owner:'self',tap:true};
  if(m=text.match(/^相手のコスト([1-9]\d*)のクリーチャーを1体破壊する。$/))return{op:'Target',to:'grave',filter:{exactCost:+m[1]}};
  if(m=text.match(/^相手の無色(の|ではない)クリーチャーを1体破壊する。$/))return{op:'Target',to:'grave',filter:m[1]==='の'?{noColor:true}:{g218Colored:true}};
  if(m=text.match(/^相手のパワー([1-9]\d*)以下のクリーチャーを1体選び持ち主の山札の一番下に置く。$/))return{op:'Target',to:'deck',filter:{maxPower:+m[1],g199Power:true}};
  if(text==='バトルゾーンにある相手のカードを1枚選び持ち主の山札の一番下に置く。')return{op:'Target',to:'deck',element:true};
  if(m=text.match(/^バトルゾーンにある相手のコスト([1-9]\d*)以下のカードを1枚選び持ち主の墓地に置く。$/))return{op:'Target',to:'grave',element:true,filter:{max:+m[1]}};
  if(text==='相手のコスト3以下のクリーチャー1体または相手のコスト3以下のタマシードを1枚破壊する。')return{op:'Target',to:'grave',element:true,filter:{creatureOrSeed:true,max:3}};
 }
 if(phase>=339){let m;
  if(m=text.match(/^コスト([1-9]\d*)以下のクリーチャーを([1-9]\d*)体まで自分の墓地からバトルゾーンに出す。$/))return{op:'Select',origin:'grave',n:+m[2],deploy:true,g236GraveDeploy:true,filter:{creature:true,max:+m[1]},optional:true,title:'墓地から出すクリーチャーを'+m[2]+'体まで選ぶ'};
  if(m=text.match(/^(?:コスト([1-9]\d*)以下の)?進化ではない(光の「ブロッカー」を持つ)?クリーチャーを1体自分の墓地からバトルゾーンに出(す|してもよい)。$/))return{op:'Select',origin:'grave',n:1,deploy:true,g236GraveDeploy:true,filter:{creature:true,nonEvolution:true,...(m[1]?{max:+m[1]}:{}),...(m[2]?{color:'光',blocker:true}:{})},optional:m[3]==='してもよい',title:'墓地から出す進化ではないクリーチャーを1体選ぶ'};
  if(m=text.match(/^闇の進化ではないクリーチャーを1体自分の墓地からバトルゾーンに出してもよい。$/))return{op:'Select',origin:'grave',n:1,deploy:true,g236GraveDeploy:true,filter:{creature:true,nonEvolution:true,color:'闇'},optional:true,title:'墓地から出す闇の進化ではないクリーチャーを1体選ぶ'};
  if(m=text.match(/^コスト([1-9]\d*)以下の(セイント・ヘッド|進化ではない自然のクリーチャー)を1体自分のマナゾーンからバトルゾーンに出してもよい。$/))return{op:'Select',origin:'mana',n:1,deploy:true,filter:{creature:true,max:+m[1],...(m[2]==='セイント・ヘッド'?{race:'セイント・ヘッド'}:{nonEvolution:true,color:'自然'})},optional:true,title:'マナから出すクリーチャーを1体選ぶ'};
 }
 if(phase>=337){
  const line=text.replace(/^(?:バトルゾーンにある)?自分の(他の)?クリーチャー1体は(このターン(?:の終わりまで)?)/,'$2自分の$1クリーチャー1体は');
  const m=line.match(/^(?:この|その)ターン(?:の終わりまで)?(?:バトルゾーンにある)?自分の(他の)?クリーチャー1体(?:は|に)「パワーアタッカー\+([1-9]\d*)」(?:を得る|を与える)。(\([^()]*\))?$/);
  if(m&&(!m[3]||['(攻撃中「パワーアタッカー+'+m[2]+'」を持つクリーチャーのパワーを+'+m[2]+'する)','(「パワーアタッカー+'+m[2]+'」を得たクリーチャーのパワーは攻撃中+'+m[2]+'される)'].includes(m[3])))return{op:'Target',owner:'self',power:+m[2],g337PowerAttacker:true,...(m[1]?{g179Other:true}:{}),title:'このターン、パワーアタッカー+'+m[2]+'を与える自分の'+(m[1]?'他の':'')+'クリーチャーを1体選ぶ'};
 }
 if(phase>=336){let m;
  if(m=text.match(/^(?:この|その)ターン(?:バトルゾーンにある)?自分の(他の)?(クリーチャー|ハンター)1体(?:は|に)「スピードアタッカー」(?:を得る|を与える)。(?:\(「スピードアタッカー」を(?:得たクリーチャー|持つクリーチャー)は召喚酔いしない\))?$/))return{op:'Target',owner:'self',...(m[1]?{g179Other:true}:{}),...(m[2]==='ハンター'?{filter:{creature:true,race:'ハンター'}}:{}),g301Grant:true,grant:{speedAttacker:true},title:'このターン、スピードアタッカーを与える自分の'+(m[1]?'他の':'')+(m[2]==='ハンター'?'ハンター':'クリーチャー')+'を1体選ぶ'};
  if(m=text.match(/^(?:自分のクリーチャーを1体選ぶ。このターンそのクリーチャー|このターン自分のクリーチャー1体)のパワーを\+([1-9]\d*)し「パワード・ブレイカー」を与える。\(「パワード・ブレイカー」を持つクリーチャーはそのパワー6000ごとにシールドをさらに1つブレイクする\)$/))return{op:'Target',owner:'self',power:+m[1],grant:{poweredBreaker:true},title:'このターン、パワーを+'+m[1]+'し、パワード・ブレイカーを与える自分のクリーチャーを1体選ぶ'};
  if(text==='このターン自分のクリーチャー1体はブロックされず相手がクリーチャーを選ぶ時そのクリーチャーを選べない。')return{op:'Target',owner:'self',grant:{unblockable:true,untargetable:true},title:'このターン、ブロックされず相手に選ばれなくする自分のクリーチャーを1体選ぶ'};
  if(text==='このターン自分のクリーチャー1体は「スレイヤー」を得アンタップしているクリーチャーを攻撃できる。(「スレイヤー」を持つクリーチャーがバトルする時バトルの後相手クリーチャーを破壊する)')return{op:'Target',owner:'self',grant:{slayer:true,attackUntapped:true},title:'このターン、スレイヤーとアンタップ攻撃を与える自分のクリーチャーを1体選ぶ'};
 }
 if(phase>=335){let m;
  if(m=text.match(/^(?:この|その)ターン(?:バトルゾーンにある)?自分の(他の)?クリーチャー1体のパワー(?:を|は)\+([1-9]\d*)(?:する|される)。$/))return{op:'Target',owner:'self',power:+m[2],...(m[1]?{g179Other:true}:{}),title:'パワーを+'+m[2]+'する自分の'+(m[1]?'他の':'')+'クリーチャーを1体選ぶ'};
  if(m=text.match(/^(?:この|その)ターン(?:バトルゾーンにある)?自分の(他の)?クリーチャー1体はブロックされない。$/))return{op:'Target',owner:'self',grant:{unblockable:true},...(m[1]?{g179Other:true}:{}),title:'このターン、ブロックされなくする自分の'+(m[1]?'他の':'')+'クリーチャーを1体選ぶ'};
  if(m=text.match(/^バトルゾーンにある自分のクリーチャーを([1-9]\d*)体まで選ぶ。このターンそのクリーチャーはブロックされない。$/))return{op:'Select',owner:'self',origin:'battle',n:+m[1],optional:true,filter:{creature:true},g173Targets:true,g193Select:true,g335Grant:{unblockable:true},title:'このターン、ブロックされなくする自分のクリーチャーを'+m[1]+'体まで選ぶ'};
 }
 if(phase>=329&&text==='スプラッシュ・クイーン・クリーチャーを1体自分の手札から出してもよい。')return{op:'Select',origin:'hand',n:1,deploy:true,g195HandDeploy:true,filter:{creature:true,race:'スプラッシュ・クイーン'},optional:true};
 if(phase>=326){
  if(text==='自分のマナゾーンでタップされているカードをすべて自分の手札に戻す。')return{op:'RecoverAll326',zones:['mana'],filter:{tapped:true}};
  const r=text.match(/^自分の(墓地|マナゾーン|墓地とマナゾーン)(?:にある|から)(すべての)?(.+?)を(すべて)?(?:自分の)?手札に戻(す|してもよい)。$/);
  if(r&&!!r[2]!==!!r[4]){const filters={'カード':{},'クリーチャー':{g228Face:{type:'creature'}},'呪文':{g228Face:{type:'spell'}},'サイバーロード':{anyFaceRace:'サイバーロード'},'スノーフェアリー':{anyFaceRace:'スノーフェアリー'},'エンジェル・コマンドとデーモン・コマンド':{any:[{anyFaceRace:'エンジェル・コマンド'},{anyFaceRace:'デーモン・コマンド'}]}},filter=filters[r[3]];if(filter){const def={op:'RecoverAll326',zones:r[1].split('と').map(z=>z==='墓地'?'grave':'mana'),filter};return r[5]==='す'?def:{op:'Offer',title:'条件に合う墓地のカードをすべて手札に戻す？',defs:[def]};}}
 }
 if(phase>=328){
  if(text==='相手のクリーチャーを1体選びタップする。')return{op:'Target',tap:true};
  if(text==='自分の山札の上から2枚を見てそのうちの1枚を山札の下に置く。')return{op:'Look',g200Search:true,n:2,rest:'top',stages:[{n:1,to:'deck'}]};
  if(text==='自分のシールドを1つ手札に戻してもよい。ただしその「S・トリガー」は使えない。')return{op:'Offer',g299ShieldHand:true,title:'シールド1つを手札に加える？（S・トリガーは使えない）',defs:[{op:'ShieldHand',g238ShieldHand:true}]};
 }
 if(phase>=324){const ramp=text.match(/^自分の山札の上から([1-9]\d*)枚(?:目)?を裏向きのまま(タップして)?マナゾーンに置く。\(マナゾーンにある裏向きのカードはマナの数字が1の無色カードとして扱う。その持ち主はそれをいつでも見てもよい\)$/);if(ramp)return{op:'Ramp',n:+ramp[1],...(ramp[2]?{tapped:true}:{}),faceDown:true};}
 if(phase>=323&&/^自分の山札の上から1枚(?:目)?を見る。そのカードを(?:自分の)?山札の(?:一番)?下に置いてもよい。$/.test(text))return{op:'Look',g323Scry:true,n:1,rest:'top',stages:[{n:1,to:'deck',optional:true,title:'山札の一番下に置く？（見送ると上に残す）'}]};
 if(phase>=318){const judge=judge318(text,phase);if(judge)return judge;}
 if(phase>=317){
  const element=text.match(/^相手のコスト([1-9]\d*)以下のエレメントを1つ選(?:び|んで)破壊(する|してもよい)。$/);
  if(element)return{op:'Target',to:'grave',element:true,...(element[2]==='してもよい'?{optional:true}:{}),filter:{max:+element[1]}};
 }
 if(phase>=316&&text==='バトルゾーンにある相手のクリーチャー1体につきカードを1枚引いてもよい。')return{op:'CountDraw',zone:'battle',owner:'opponent',filter:{creature:true},optional:'each'};
 if(phase>=313){
  const boost=text.match(/^(?:その|この)ターン(?:の終わりまで)?このクリーチャーのパワー(?:は|を)\+([1-9]\d*)(?:する。|される。|され「([WT])・ブレイカー」を得る。)$/);
  if(boost)return{op:'SelfBoost313',power:+boost[1],...(boost[2]?{breaker:boost[2]==='W'?2:3}:{})};
 }
 if(phase>=312){
  const m=text.match(/^(?:コスト([1-9]\d*)以下の)?(進化ではない)?(デーモン・コマンド|アンノウン|ドリームメイト|無色クリーチャー)を1体自分の手札から(?:バトルゾーンに)?出(す|してもよい)。$/);
  if(m)return{op:'Select',origin:'hand',n:1,deploy:true,g195HandDeploy:true,filter:{creature:true,...(m[3]==='無色クリーチャー'?{noColor:true}:{race:m[3]}),...(m[1]?{max:+m[1]}:{}),...(m[2]?{nonEvolution:true}:{})},optional:m[4]==='してもよい'};
 }
 if(phase>=311){
  const deployments={
   'コスト7以下のデーモン・コマンドを1体自分の手札からバトルゾーンに出してもよい。':{creature:true,max:7,race:'デーモン・コマンド'},
   '進化ではない自然のクリーチャーを1体自分の手札からバトルゾーンに出してもよい。':{creature:true,color:'自然',nonEvolution:true},
   '進化ではないアンノウンを1体自分の手札からバトルゾーンに出してもよい。':{creature:true,race:'アンノウン',nonEvolution:true}
  };
  if(deployments[text])return{op:'Select',origin:'hand',n:1,deploy:true,g195HandDeploy:true,filter:deployments[text],optional:true};
 }
 if(phase>=310){
  if(text==='《ねぼすけリスくん》を1体自分のマナゾーンからバトルゾーンに出してもよい。')return{op:'Select',origin:'mana',deploy:true,n:1,optional:true,filter:{creature:true,g201ExactName:'ねぼすけリスくん'}};
  if(text==='《復活するバイタル・ホーン》を1体自分のマナゾーンからバトルゾーンに置いてもよい。')return{op:'Select',origin:'mana',deploy:true,n:1,optional:true,filter:{creature:true,g201ExactName:'復活するバイタル・ホーン'}};
  const modal=modal310(text);if(modal)return modal;
 }
 if(phase>=308){
  const kill={op:'Target',to:'grave',filter:{maxPower:3000,g199Power:true}},discard={op:'Discard',n:1},draw={op:'Draw',n:1},ramp={op:'Ramp',n:1},modes={
   '相手のパワー3000以下のクリーチャーを1体破壊するか自分の山札の上から1枚目をマナゾーンに置く。':[{label:'パワー3000以下の相手クリーチャーを破壊',defs:[kill]},{label:'山札の上から1枚をマナに置く',defs:[ramp]}],
   '相手に手札を1枚捨てさせるか相手のパワー3000以下のクリーチャーを1体破壊する。':[{label:'相手に手札を1枚捨てさせる',defs:[discard]},{label:'パワー3000以下の相手クリーチャーを破壊',defs:[kill]}],
   'カードを1枚引くか相手に手札を1枚捨てさせる。':[{label:'カードを1枚引く',defs:[draw]},{label:'相手に手札を1枚捨てさせる',defs:[discard]}]
  };
  if(modes[text])return{op:'Choose',g184Modes:true,modes:modes[text]};
 }
 if(phase>=307){
  if(text==='相手のシールドを1枚ブレイクする。')return{op:'Break278'};
  if(text==='相手のコスト4以下のエレメントを1つ選んで破壊する。')return{op:'Target',to:'grave',element:true,filter:{max:4}};
 }
 if(phase>=301){
  if(text==='自分の山札の上から1枚目をシールド化してもよい。')return{op:'Offer',defs:[{op:'ShieldTop',n:1}]};
  if(text==='相手のパワー3000以下のクリーチャーを1体破壊してもよい。')return{op:'Target',to:'grave',optional:true,filter:{maxPower:3000,g199Power:true}};
  if(text==='相手のコスト2以下のエレメントを1つ選び破壊してもよい。')return{op:'Target',to:'grave',element:true,optional:true,filter:{max:2}};
  if(text==='各相手は自身の手札を1枚選び捨てる。')return{op:'Discard',n:1};
  if(text==='このターン自分の他のクリーチャー1体に「スピードアタッカー」を与える。(「スピードアタッカー」を持つクリーチャーは召喚酔いしない)')return{op:'Target',owner:'self',g179Other:true,g301Grant:true,grant:{speedAttacker:true},title:'このターン、スピードアタッカーを与える他の自分のクリーチャーを1体選ぶ'};
 }
 if(phase>=299){
  if(text==='自分のシールドを1つ手札に加えてもよい。ただしその「S・トリガー」は使えない。'||phase>=634&&text==='自分のシールドを1つ手札に加えてもよい。その「S・トリガー」は使えない。')return{op:'Offer',g299ShieldHand:true,title:'シールド1つを手札に加える？（S・トリガーは使えない）',defs:[{op:'ShieldHand',g238ShieldHand:true}]};
  if(text==='このクリーチャーを自分の手札に戻す。')return{op:'SelfHand299'};
 }
 if(phase>=298){
  if(text==='このクリーチャーをタップしてマナゾーンに置く。')return{op:'SelfMana297',tapped:true};
  if(text==='このクリーチャーをタップしてマナゾーンに置いてもよい。')return{op:'Offer',g298SelfMana:true,title:'このクリーチャーをタップしてマナに置く？',defs:[{op:'SelfMana297',tapped:true}]};
  if(text==='自分の他のドラゴンがなければこのクリーチャーをマナゾーンに置く。')return{op:'SelfMana297',unlessOtherDragon:true};
 }
 if(phase>=297){
  if(text==='そのターン自分のマナゾーンからクリーチャーを召喚してもよい。')return{op:'ManaTurn297'};
  if(text==='このクリーチャーを自分のマナゾーンに置く。')return{op:'SelfMana297'};
 }
 if(phase>=294&&text==='自分の山札の上から2枚を墓地に置いてもよい。そうしたらカードを1枚引く。')return{op:'Offer',g294MillDraw:true,title:'山札の上から2枚を墓地に置いて、1枚引く？',defs:[{op:'Mill',n:2},{op:'Draw',n:1}]};
 if(phase>=292){
  if(text==='自分の手札が1枚もなければカードを1枚引く。')return{op:'IfHand246',max:0,defs:[{op:'Draw',n:1}]};
  if(text==='自分の手札が2枚以下であれば3枚になるまでカードを引いてもよい。')return{op:'IfHand246',max:2,defs:[{op:'Offer',g292Refill:true,title:'手札が3枚になるように引く？',defs:[{op:'Refill261',max:2,n:3}]}]};
 }
 if(phase>=288){
  if(text==='自分の山札の上から1枚目を裏向きのままタップしてマナゾーンに置く。(マナゾーンにある裏向きのカードはマナの数字が1の無色カードとして扱う。その持ち主はそれをいつでも見てもよい)')return{op:'Ramp',n:1,tapped:true,faceDown:true};
  if(text==='水晶武装2:自分のマナゾーンに裏向きのカードが2枚以上あれば自分の山札の上から1枚目を裏向きのままマナゾーンに置く。')return{op:'IfOwn',filter:{g286FaceDownMana:2},defs:[{op:'Ramp',n:1,faceDown:true}]};
 }
 if(phase>=286&&text==='水晶武装4:自分のマナゾーンに裏向きのカードが4枚以上あれば光または無色の「ブロッカー」を持つクリーチャーを1体自分の手札から出してもよい。')return{op:'IfOwn',filter:{g286FaceDownMana:4},defs:[{op:'Select',origin:'hand',n:1,deploy:true,g195HandDeploy:true,filter:{creature:true,blocker:true,any:[{color:'光'},{noColor:true}]},optional:true}]};
 if(phase>=285&&text==='自分のマナゾーンにあるカードがすべて水のカードならバトルゾーンにあるクリーチャーを1体選び持ち主の手札に戻してもよい。')return{op:'IfOwn',filter:{g282AllMana:{color:'水'}},defs:[{op:'Target',anyOwner:true,to:'hand',optional:true}]};
 if(phase>=281){
  if(text==='相手のクリーチャーを1体選んでもよい。その選んだクリーチャーとこのクリーチャーをバトルさせる。')return{op:'Fight240',self:true,optional:true};
  if(text==='自分と相手のクリーチャーを1体ずつ選ぶ。その選んだクリーチャーをバトルさせる。')return{op:'Fight240',optional:false};
 }
 if(phase>=278){
  const br=text.match(/^相手のシールドを(?:ひとつ|1つ)ブレイク(する|してもよい)。$/);
  if(br)return br[1]==='する'?{op:'Break278'}:{op:'Offer',defs:[{op:'Break278'}]};
 }
 if(phase>=276&&text==='自分の山札の上から1枚目を表向きにシールド化してもよい。')return{op:'Offer',defs:[{op:'ShieldTop',n:1,faceUp:true}]};
 if(phase>=275){
  const revive=text.match(/^コスト([1-9]\d*)以下のクリーチャーを([1-9]\d*)体まで自分の墓地から出す。$/);
  if(revive)return{op:'Select',origin:'grave',n:+revive[2],deploy:true,g236GraveDeploy:true,filter:{creature:true,max:+revive[1]},optional:true,title:'墓地から出すクリーチャーを'+revive[2]+'体まで選ぶ'};
 }
 if(phase>=271&&text==='相手のクリーチャーを1体選んでもよい。選んだクリーチャーとこのクリーチャーをバトルさせる。')return{op:'Fight240',self:true,optional:true};
 if(phase>=270){const conditional=presence270(text,phase);if(conditional)return conditional;}
 if(phase>=268){
  if(text==='バトルゾーンにある相手のクリーチャーを1体選んでもよい。このクリーチャーと選んだクリーチャーをバトルさせる。')return{op:'Fight240',self:true,optional:true};
  if(text==='バトルゾーンにある相手のクリーチャーを1体選ぶ。そのクリーチャーとこのクリーチャーをバトルさせる。')return{op:'Fight240',self:true,optional:false};
 }
 if(phase>=266&&text==='自分のシールドがふたつ以下であれば自分の山札の上から1枚目を裏向きのまま新しいシールドとしてシールドゾーンに加える。')return{op:'IfOwn',filter:{g265ShieldsMax:2},defs:[{op:'ShieldTop',n:1}]};

 if(phase>=264){
  if(text==='自分のタマシードがあればこのクリーチャーをアンタップする。')return{op:'IfOwn',filter:{seed:true},defs:[{op:'Untap'}]};
  if(text==='自分のタマシードがあれば自分の山札の上から1枚目をマナゾーンに置く。')return{op:'IfOwn',filter:{seed:true},defs:[{op:'Ramp',n:1}]};
  if(text==='相手のクリーチャー1体またはタマシードを1枚選び持ち主のマナゾーンに置く。')return{op:'Select',owner:'opponent',origin:'battle',n:1,filter:{creatureOrSeed:true},g173Targets:true,g193Select:true,to:'mana',title:'マナゾーンに置く相手のクリーチャーかタマシードを1枚選ぶ'};
 }

 if(phase>=263&&text==='バトルゾーンにある自分のグレートメカオー1体につき1枚カードを引いてもよい。')return{op:'CountDraw',zone:'battle',filter:{creature:true,race:'グレートメカオー'},optional:'each'};
 if(phase>=262){
  const handCost={
   '自分の手札の枚数以下のコストを持つ相手のクリーチャーをすべて持ち主の手札に戻す。':{defs:[{op:'Sweep',filter:{creature:true},to:'hand'}]},
   '自分の手札の枚数よりコストが小さい他のクリーチャーをすべて持ち主の手札に戻す。':{below:true,defs:[{op:'Sweep',both:true,g262Other:true,filter:{creature:true},to:'hand'}]},
   '自分の手札の枚数よりコストが小さいクリーチャーを1体選び持ち主の手札に戻してもよい。':{below:true,defs:[{op:'Target',anyOwner:true,optional:true,filter:{creature:true},to:'hand',title:'手札の枚数よりコストが小さいクリーチャーを1体まで選ぶ'}]},
   '次の自分のターンのはじめまで自分の手札の枚数以下のコストを持つ相手のクリーチャーはすべて攻撃もブロックもできない。':{defs:[{op:'Freeze262',g190Freeze:'self',filter:{creature:true}}]}
  }[text];
  if(handCost)return{op:'HandCost262',...structuredClone(handCost)};
  if(text==='自分の水のクリーチャー1体または水のタマシード1枚につきカードを1枚引いてもよい。')return{op:'CountDraw',zone:'battle',g262Elements:true,filter:{creatureOrSeed:true,color:'水'},optional:'each'};
 }

 if(phase>=261&&text==='自分の手札が4枚以下なら5枚になるようカードを引く。')return{op:'Refill261',max:4,n:5};
 if(phase>=259){
  let m;
  if(m=text.match(/^自分の山札の上から([1-9]\d*)枚を見て好きな順序で元に戻す。$/))return{op:'Look',n:+m[1],stages:[],rest:'top',g259OrderTop:true};
  if(text==='相手のクリーチャー1体またはタマシードを1枚選び持ち主の手札に戻す。')return{op:'Select',owner:'opponent',origin:'battle',n:1,filter:{creatureOrSeed:true},g173Targets:true,g193Select:true,to:'hand',title:'手札に戻す相手のクリーチャーかタマシードを1枚選ぶ'};
  if(text==='相手のクリーチャーを1体選んでもよい。このクリーチャーとその選んだクリーチャーをバトルさせる。')return{op:'Fight240',self:true,optional:true};
 }
 if(phase>=255){const look=look255(text);if(look)return look;}
 if(phase>=254){const m=text.match(/^カードを([1-9]\d*)枚引いてもよい。そうした(?:ら|場合)自分の手札を([1-9]\d*)枚捨てる。$/);if(m)return{op:'Offer',title:'カードを'+m[1]+'枚引き、手札を'+m[2]+'枚捨てる？',g204DrawDiscard:true,defs:[{op:'Draw',n:+m[1]},{op:'Discard',owner:'self',n:+m[2]}]};}
 let m;
 if(phase>=248){const discard=discardForEffect248(text,phase);if(discard)return discard;}
 if(phase>=244){const discard=discardAll244(text,phase);if(discard)return discard;}
 if(phase>=242&&(m=text.match(/^(?:バトルゾーンにある)?相手のクリーチャーを1体選ぶ。(?:この|その)ターン(?:の終わりまで)?そのクリーチャーのパワー(?:を|は)-([1-9]\d*)(?:する|される)。(?:\(パワー(?:が)?0以下のクリーチャーは破壊される\))?$/)))return{op:'Target',power:-Number(m[1]),g242PowerMinus:true,title:'パワーを-'+m[1]+'する相手のクリーチャーを選ぶ'};
 if(phase>=241){const fight=fightBuff241(text);if(fight)return fight;}
 if(phase>=240){
  const self={
   '相手のクリーチャーを1体選ぶ。このクリーチャーとその選んだクリーチャーをバトルさせる。':false,
   'バトルゾーンにある相手のクリーチャーを1体選びその2体をバトルさせる。':false,
   'バトルゾーンにある相手のクリーチャーを1体選んでもよい。そうした場合このクリーチャーとその選んだクリーチャーをバトルさせる。':true
  },both={
   '自分と相手のクリーチャーを1体ずつ選びその2体をバトルさせる。':false,
   '自分と相手のクリーチャーを1体ずつ選んでもよい。その2体をバトルさせる。':true,
   'バトルゾーンにある自分のクリーチャーを1体と相手のクリーチャーを1体選んでもよい。その2体をバトルさせる。':true,
   '自分のクリーチャーを1体と相手のクリーチャーを1体選んでもよい。選んだ2体をバトルさせる。':true
  };
  if(Object.hasOwn(self,text))return{op:'Fight240',self:true,optional:self[text]};
  if(Object.hasOwn(both,text))return{op:'Fight240',optional:both[text]};
 }

 if(phase>=239&&/^自分のシールドを(?:1つ|1枚|ひとつ)(?:選び)?(?:自分の)?墓地に置く。$/.test(text))return{op:'ShieldGrave',g239ShieldGrave:true};
 if(phase>=238&&text==='自分のシールドを1つ手札に加える。ただしその「S・トリガー」は使えない。')return{op:'ShieldHand',g238ShieldHand:true};
 if(phase>=237){
  const revive=text.match(/^(?:コスト([1-9]\d*)以下の)?(?:(闇)の(?:コスト([1-9]\d*)以下の)?|(アビス・))クリーチャーを1体自分の墓地から(?:バトルゾーンに)?出(す|してもよい)。$/);
  if(revive&&!(revive[1]&&revive[3]))return{op:'Select',origin:'grave',n:1,deploy:true,g236GraveDeploy:true,filter:{creature:true,...(revive[1]||revive[3]?{max:+(revive[1]||revive[3])}:{}),...(revive[2]?{color:revive[2]}:{race:'アビス'})},optional:revive[5]==='してもよい',title:'墓地から出すクリーチャーを1体選ぶ'};
 }
 if(phase>=236){
  const revive=text.match(/^(?:コスト([1-9]\d*)以下の)?(?:「(ブロッカー)」を持つ)?(進化|ハンター・)?クリーチャーを1体自分の墓地から(?:バトルゾーンに)?出(す|してもよい)。$/);
  if(revive)return{op:'Select',origin:'grave',n:1,deploy:true,g236GraveDeploy:true,filter:{creature:true,...(revive[1]?{max:+revive[1]}:{}),...(revive[2]?{blocker:true}:{}),...(revive[3]==='進化'?{evolution:true}:revive[3]?{race:'ハンター'}:{})},optional:revive[4]==='してもよい',title:'墓地から出すクリーチャーを1体選ぶ'};
 }
 if(phase>=235){
  if(text==='クリーチャーを1体選びタップまたはアンタップする。')return{op:'Target',anyOwner:true,g235TapOrUntap:true,title:'タップまたはアンタップするクリーチャーを選ぶ'};
  if(text==='自分の進化クリーチャーを1体アンタップする。')return{op:'Target',owner:'self',untap:true,filter:{evolution:true},title:'アンタップする自分の進化クリーチャーを選ぶ'};
  if(text==='自分の他のクリーチャーを1体アンタップする。')return{op:'Target',owner:'self',untap:true,g179Other:true,title:'アンタップする自分の他のクリーチャーを選ぶ'};
 }
 if(phase>=234&&text==='カードを1枚引いてよい。')return{op:'Offer',defs:[{op:'Draw',n:1}]};
 if(phase>=232){
  if(text==='自分のクリーチャーを1体バトルゾーンから手札に戻す。')return{op:'Target',owner:'self',to:'hand'};
  if(text==='自分のマナゾーンから1枚選び自分の手札に戻す。')return{op:'Select',origin:'mana',to:'hand',n:1,g232ManaReturn:true,title:'手札に戻すマナを1枚選ぶ'};
  if(text==='バトルゾーンにある相手のドラゴン以外のクリーチャーを1体選び持ち主のマナゾーンに置く。')return{op:'Target',to:'mana',filter:{notRace:'ドラゴン'}};
  if(text==='バトルゾーンにある「ブロッカー」を持つクリーチャーをすべて持ち主の手札に戻す。')return{op:'Sweep',both:true,to:'hand',filter:{creature:true,blocker:true}};
 }
 if(phase>=231&&(m=text.match(/^(?:バトルゾーンにある)?(相手の)?(?:(光|水|闇|火|自然)または(光|水|闇|火|自然)の)?クリーチャーを1体選びタップして(?:も)?よい。$/)))return{op:'Target',tap:true,optional:true,...(!m[1]?{anyOwner:true}:{}),...(m[2]?{filter:{any:[{color:m[2]},{color:m[3]}]}}:{})};
 if(phase>=229){
  if(text==='相手の手札を見てその中から闇の呪文をすべて選び出し持ち主の墓地に置く。')return{op:'InspectHand',g223Inspect:true,discard:true,filter:{g228Face:{type:'spell',color:'闇'}}};
  if(text==='相手の手札を見る。その中から光の呪文以外の呪文をすべて捨てさせる。')return{op:'InspectHand',g223Inspect:true,discard:true,filter:{g228Face:{type:'spell',exceptColor:'光'}}};
 }
 if(phase>=228){const recovery=recovery228(text);if(recovery)return recovery;}

 if(phase>=223){
  if(text==='相手の手札を見る。')return{op:'InspectHand',g223Inspect:true};
  if(m=text.match(/^相手は自身の手札を見せその中の(呪文|多色カード)をすべて捨てる。$/))return{op:'InspectHand',g223Inspect:true,reveal:true,discard:true,filter:m[1]==='呪文'?{spell:true}:{g223Multicolor:true}};
 }
 if(phase>=221&&(m=text.match(/^(?:バトルゾーンに)?自分の(クリーチャー|タマシード|光のクリーチャー|水のクリーチャー|闇のクリーチャー|火のクリーチャー|自然のクリーチャー|ドラゴン|ハンター)が(?:あれば|いれば|いるなら)(.+)$/))){const filters={'クリーチャー':{creature:true},'タマシード':{seed:true},'ドラゴン':{creature:true,race:'ドラゴン'},'ハンター':{creature:true,race:'ハンター'}};for(const c of colors)filters[c+'のクリーチャー']={creature:true,color:c};const next=instruction(m[2],phase);if(next&&['Draw','DrawUpTo','ShieldTop','DiscardDraw'].includes(next.op))return{op:'IfOwn',g221BattleCondition:true,filter:filters[m[1]],defs:[next]};}
 if(phase>=220){const r=text.match(/^(.+?)を([1-9]\d*)(体|枚)(まで)?自分のマナゾーンから(?:自分の)?手札に戻(す|してもよい)。$/)||text.match(/^自分のマナゾーンから(.+?)を([1-9]\d*)(体|枚)(まで)?(?:自分の)?手札に戻(す|してもよい)。$/);if(r){const filters={'カード':{},'クリーチャー':{creature:true},'呪文':{spell:true},'ドラゴン':{creature:true,race:'ドラゴン'},'ハンター':{creature:true,race:'ハンター'},'無色カード':{g217Colorless:true},'《漢》または《名人》と名前にあるクリーチャー':{creature:true,g220NameAny:['漢','名人']}};const filter=filters[r[1]];if(filter&&!(r[3]==='体'&&(filter.spell||r[1].endsWith('カード')))&&!(+r[2]>1&&!r[4]&&r[5]!=='す'))return{op:'Select',g220ManaReturn:true,origin:'mana',to:'hand',n:+r[2],filter:{...filter,...(r[3]==='体'?{creature:true}:{})},...(r[4]||r[5]!=='す'?{optional:true}:{}),title:'手札に戻すマナの'+r[1]+'を'+r[2]+r[3]+(r[4]?'まで':'')+'選ぶ'};}}
 if(phase>=219&&(m=text.match(/^(?:バトルゾーンにある)?自分の(クリーチャー|光のクリーチャー|水と自然のクリーチャー|セイント・ヘッド|ドラゴン)をすべてアンタップ(する|してもよい|してよい)。$/))){const filters={'クリーチャー':{},'光のクリーチャー':{color:'光'},'水と自然のクリーチャー':{any:[{color:'水'},{color:'自然'}]},'セイント・ヘッド':{race:'セイント・ヘッド'},'ドラゴン':{race:'ドラゴン'}},d={op:'GroupUntap',g219Untap:true,filter:{creature:true,...filters[m[1]]}};return m[2]==='する'?d:{op:'Offer',g219Untap:true,title:'自分の'+m[1]+'をすべてアンタップする？',defs:[d]};}
 if(phase>=218&&(m=text.match(/^(?:バトルゾーンにある)?(相手の)?(パワー([1-9]\d*)以下の|コスト([1-9]\d*)以下の|「ブロッカー」を持つ|無色ではない)クリーチャーをすべてタップする。$/)))return{op:'TapAll',g218Tap:true,...(!m[1]?{both:true}:{}),filter:{creature:true,...(m[3]?{maxPower:+m[3],g199Power:true}:m[4]?{max:+m[4]}:m[2].startsWith('「')?{blocker:true}:{g218Colored:true})}};
 if(phase>=217){
  const r=text.match(/^(.+?)を([1-9]\d*)(体|枚)(まで)?自分の墓地から(?:自分の)?手札に戻(す|してもよい|してよい)。$/)||text.match(/^自分の墓地から(.+?)を([1-9]\d*)(体|枚)(まで)?(?:自分の)?手札に戻(す|してもよい|してよい)。$/);
  if(r){const filters={'カード':{},'クリーチャー':{creature:true},'呪文':{spell:true},'無色カード':{g217Colorless:true},'多色クリーチャー':{creature:true,multi:true},'ガーディアン':{creature:true,race:'ガーディアン'},'フェニックス':{creature:true,race:'フェニックス'},'ドラゴン':{creature:true,race:'ドラゴン'}};for(const c of colors)filters[c+'の呪文']={spell:true,g217SpellColor:c};const filter=filters[r[1]];if(filter&&!(r[3]==='体'&&(filter.spell||r[1].endsWith('カード')))&&!(+r[2]>1&&!r[4]&&r[5]!=='す'))return{op:'Select',g217Recovery:true,origin:'grave',to:'hand',n:+r[2],filter:{...filter,...(r[3]==='体'?{creature:true}:{})},...(r[4]||r[5]!=='す'?{optional:true}:{}),title:'手札に戻す墓地の'+r[1]+'を'+r[2]+(r[3]||'枚')+(r[4]?'まで':'')+'選ぶ'};}
 }
 if(phase>=216){
  if(m=text.match(/^自分の手札を1枚捨ててもよい。そうした(?:ら|場合)カードを([1-9]\d*)枚引く。$/))return{op:'DiscardDraw',g216DiscardDraw:true,n:+m[1]};
  if(m=text.match(/^自分のマナゾーンにある(カード|フェニックス)をすべてアンタップする。$/))return{op:'UntapMana',g216UntapMana:true,...(m[1]==='フェニックス'?{filter:{anyFaceRace:'フェニックス'}}:{})};
 }
 if(phase>=215){
  if(m=text.match(/^(?:バトルゾーンにある)?相手の「ブロッカー」を持つクリーチャーをすべて破壊する。$/))return{op:'Sweep',g215Sweep:true,to:'grave',filter:{creature:true,blocker:true}};
  if(m=text.match(/^相手の(ファイアー・バード)をすべて破壊する。$/))return{op:'Sweep',g215Sweep:true,to:'grave',filter:{creature:true,race:m[1]}};
  if(m=text.match(/^パワー([1-9]\d*)以下のタップされていないクリーチャーをすべて破壊する。$/))return{op:'Sweep',g215Sweep:true,both:true,to:'grave',filter:{creature:true,maxPower:+m[1],g199Power:true,untapped:true}};
 }
 if(phase>=214&&(m=text.match(/^(?:この|その)ターン(?:の終わりまで|が終わるまで)?(?:バトルゾーンにある|バトルゾーンで)?(?:(自分|相手)の)?(タップされている)?(他の)?クリーチャーすべてのパワー(?:は|を)([+-])([1-9]\d*)(?:する|される)。(?:\(パワー0以下のクリーチャーは破壊される\))?$/)))return{op:'GroupPower',g214GroupPower:true,owner:m[1]==='自分'?'self':m[1]==='相手'?'opponent':'both',power:(m[4]==='-'?-1:1)*Number(m[5]),filter:{creature:true,...(m[2]?{tapped:true}:{})},...(m[3]?{other:true}:{})};

 if(phase>=212&&(m=text.match(/^パワー([1-9]\d*)以下のクリーチャーをすべて破壊する。$/)))return{op:'Sweep',both:true,to:'grave',filter:{creature:true,maxPower:+m[1],g199Power:true}};
 if(phase>=210){
  if(m=text.match(/^(?:自分の)?マナゾーン(?:にある|の)カードを([1-9]\d*)枚(まで)?アンタップする。$/))return{op:'Select',origin:'mana',n:+m[1],g210ManaUntap:true,title:'アンタップするマナを'+m[1]+'枚'+(m[2]?'まで':'')+'選ぶ',...(m[2]?{optional:true}:{})};
  if(m=text.match(/^(?:バトルゾーンにある)?相手のクリーチャーを([1-9]\d*)体(まで)?選びタップする。(?:そのクリーチャーは次の相手のターンのはじめに|次の相手のターンのはじめに(?:そのクリーチャー|それら(?:のクリーチャー)?)は)アンタップ(?:し|され)ない。$/)){const common={g210TapLock:true,title:'タップして次のターンまで止めるクリーチャーを'+m[1]+'体'+(m[2]?'まで':'')+'選ぶ'};return +m[1]===1&&!m[2]?{op:'Target',tap:true,lock:true,...common}:{op:'Select',origin:'battle',owner:'opponent',n:+m[1],filter:{creature:true},g173Targets:true,g193Select:true,g193Tap:true,...common,...(m[2]?{optional:true}:{})};}
 }

 if(phase>=204&&/^カードを1枚引いてもよい。そうした(?:ら|場合)自分の手札を1枚捨てる。$/.test(text))return{op:'Offer',g204DrawDiscard:true,defs:[{op:'Draw',n:1},{op:'Discard',owner:'self',n:1}]};
 if(phase>=203){const count=count203(text,phase);if(count)return count;}
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
 if(phase>=185){const look=lookSpec(text,phase);if(look)return look;}
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
// G-Zero accepts the complete condition, including whose elements are counted.
function zero396(line,phase=396){
 const m=line.match(/^G・ゼロ[:―-](.+?)(?:このクリーチャーをコストを支払わずに召喚してもよい。|この呪文をコストを支払わずに唱えてもよい。)$/);if(!m)return null;
 let body=m[1],q;
 if(phase>=489){if(body==='自分のエンジェル・コマンド・クリーチャーがあれば')return{all:[{creature:true,race:'エンジェル・コマンド',g258Civil:1}]};if(body==='バトルゾーンに自分のエンジェル・コマンド・ドラゴンがあれば')return{all:[{creature:true,race:'エンジェル・コマンド・ドラゴン',g258Civil:1}]};}
 if(phase>=448){
  const b=m[1];
  const spells=b.match(/^このターン自分が呪文を([1-9]\d*)枚以上唱えていれば$/);if(spells)return{all:[{g448Spells:+spells[1]}]};
  if(b==='このターン自分がクリーチャーではないカードを2枚以上実行していれば')return{all:[{g448NoncreatureUses:2}]};
  if(b==='このターンカードを6枚以上引いていて自分の《天災超邪クロスファイア2nd》がバトルゾーンになければ')return{all:[{g448Draws:6},{g448NoName:'天災超邪 クロスファイア 2nd'}]};
  if(b==='バトルゾーンに相手のマナゾーンにあるカードの枚数よりコストが大きい相手のクリーチャーがあれば')return{all:[{g448OpponentOverMana:true}]};
 }

 if(q=body.match(/^自分の手札が([1-9]\d*)枚以上あれば$/))return{all:[{g334ZoneCount:{zone:'hand',min:+q[1]}}]};
 if(q=body.match(/^自分のマナゾーンにカードが([1-9]\d*)枚以上あれば$/))return{all:[{g272ManaCount:+q[1]}]};
 const all=[];
 if(body.startsWith('自分のマナゾーンに光のカードが2枚以上あり')){all.push({g267Mana:{n:2,color:'光'}});body=body.slice('自分のマナゾーンに光のカードが2枚以上あり'.length);}
 const h=body.match(/^(?:バトルゾーンに)?(自分の)?(.+?)が(?:(?:([1-9]\d*)(?:体|枚)以上|1体でも))?あれば$/);if(!h)return null;
 const filters={
  'フェニックス':{race:'フェニックス'},'サイバーロード':{race:'サイバーロード'},
  '火のドラゴン':{color:'火',race:'ドラゴン'},'アーマード・ドラゴン':{race:'アーマード・ドラゴン'},
  'デーモン・コマンド':{race:'デーモン・コマンド'},'ドラゴン':{race:'ドラゴン'},
  'ゼニス':{race:'ゼニス'},'ホーン・ビースト':{race:'ホーン・ビースト'},
  'メカ':{race:'メカ'},'シノビ':{race:'シノビ'},'アウトレイジ':{race:'アウトレイジ'},
  'スノーフェアリー':{race:'スノーフェアリー'},'ワイルド・ベジーズ':{race:'ワイルド・ベジーズ'},
  'アーマード・ワイバーン':{race:'アーマード・ワイバーン'},'タマシード':{seed:true},
  '火のクリーチャー':{creature:true,color:'火'},'コスト6以上のクリーチャー':{creature:true,min:6},
  '水のD2フィールド':{g228Face:{type:'field',color:'水',d2:true}},
  ...(phase>=448?{'超化獣':{creature:true,race:'超化獣'},'クリーチャー':{creature:true}}:{})
 };
 if(!filters[h[2]])return null;all.push({...filters[h[2]],g258Civil:+(h[3]||1),...(!h[1]?{g334Both:true}:{})});return{all};
}
// Modal Shinka effects resolve after evolution, using the same task pipeline as entry effects.
// Only complete, source-independent bodies are accepted here.
function shinkaMode445(text,phase){
 if(phase>=590){
  const sweep=instruction590(text);
  if(sweep?.op==='OverManaBottom590')return [sweep];
  if(text==='カードを1枚自分の墓地から手札に戻す。')return [{op:'Select',origin:'grave',to:'hand',n:1}];
 }
 if(phase>=546){
  if(text==='相手のクリーチャーを2体まで選ぶ。次の自分のターンのはじめまでそれらのクリーチャーは攻撃もブロックもできない。')return[{op:'Select',origin:'battle',owner:'opponent',n:2,optional:true,g173Targets:true,g190Freeze:'self',filter:{creature:true}}];
  if(text==='相手のクリーチャーを2体まで選ぶ。次の相手のターン中それらのクリーチャーは可能なら攻撃する。')return[{op:'Select',origin:'battle',owner:'opponent',n:2,optional:true,g173Targets:true,g546Force:'nextOpponent',filter:{creature:true}}];
 }

 if(phase>=545){const modes={
  '相手のクリーチャーを1体選ぶ。このターンそのクリーチャーのパワーを-6000する。(パワー0以下のクリーチャーは破壊される)':[{op:'Target',power:-6000,g242PowerMinus:true}],
  'プレイヤーを1人選ぶ。そのプレイヤーは自身の墓地を山札に加えてシャッフルする。':[{op:'GraveShuffle545'}]
 };if(modes[text])return structuredClone(modes[text]);}

 if(phase>=543&&text==='このターンこのクリーチャーの最初の攻撃の終わりにこのクリーチャーをアンタップする。')return[{op:'ShinkaDelay543',when:'firstAttackEnd'}];
 const modes={
  'このターン自分のクリーチャーはブロックされない。':[{op:'GroupGrant364',owner:'self',filter:{creature:true},grant:{unblockable:true}}],
  '自分の山札の上から1枚目をマナゾーンに置く。その後カードを1枚自分のマナゾーンから手札に戻してもよい。':[{op:'Ramp',n:1},{op:'Select',origin:'mana',to:'hand',n:1,optional:true}],
  'カードを2枚引きその後自分の手札を1枚捨てる。':[{op:'Draw',n:2},{op:'Discard',owner:'self',n:1}],
  '相手のクリーチャーを1体選ぶ。このターンそのクリーチャーのパワーを-5000する。(パワー0以下のクリーチャーは破壊される)':[{op:'Target',power:-5000}],
  '自分の手札を1枚捨てその後カードを2枚引く。':[{op:'Discard',owner:'self',n:1},{op:'Draw',n:2}],
  '相手のコスト6以下のクリーチャーを1体選び持ち主のマナゾーンに置く。':[{op:'Target',to:'mana',filter:{max:6}}],
  'コスト2以下のクリーチャーを1体自分の墓地から出す。':[{op:'Select',origin:'grave',n:1,deploy:true,g236GraveDeploy:true,filter:{creature:true,max:2},optional:false}],
  '自分のシールドを1つ手札に加える。ただしその「S・トリガー」は使えない。':[{op:'ShieldHand',g238ShieldHand:true}],
  '相手のクリーチャーを1体選びタップする。次の相手のターンのはじめにそのクリーチャーはアンタップしない。':[{op:'Target',tap:true,lock:true,g210TapLock:true}],
  '自分の山札の上から1枚目をマナゾーンに置く。':[{op:'Ramp',n:1}],
  '自分の山札の上から1枚目をシールド化する。':[{op:'ShieldTop',n:1}],
  '相手のクリーチャーを1体選び持ち主の手札に戻す。':[{op:'Target',to:'hand'}]
 };
 return modes[text]?structuredClone(modes[text]):null;
}
function defense447(body,phase){
 if(phase>=587&&body==='相手のクリーチャーをすべてタップする。')return[{op:'TapAll'}];
 if(phase>=478&&body==='相手は自分自身のマナゾーンからカードを1枚選び持ち主の墓地に置く。')return[instruction(body,phase)];
 if(['そのターンの終わりまでこのクリーチャーは「スレイヤー」を得る。(「スレイヤー」を得たクリーチャーがバトルする時バトルの後相手クリーチャーを破壊する)', 'そのターンこのクリーチャーは「スレイヤー」を得る。(「スレイヤー」を得たクリーチャーがバトルする時バトルの後相手クリーチャーを破壊する)'].includes(body))return[{op:'ShinkaGrant397',grant:{slayer:true}}];
 const defs=clauses(body,phase).map(q=>instruction(q,phase));
 const safe=d=>!!d&&(['Draw','DrawUpTo','Ramp','Mill','Discard','ShieldHand','SelfBoost313'].includes(d.op)||d.op==='Target'&&!d.grant&&!d.g335Grant&&d.owner!=='self'||d.op==='Offer'&&d.defs?.length&&d.defs.every(safe));
 return defs.length&&defs.every(safe)?defs.map(d=>d.op==='SelfBoost313'?{op:'ShinkaGrant397',power:d.power,...(d.breaker?{grant:{g313Breaker:d.breaker}}:{})}:d.op==='Target'&&d.filter&&(d.filter.maxPower!==undefined||d.filter.minPower!==undefined)?{...d,filter:{...d.filter,g199Power:true}}:d):null;
}
function shinka446(body){
 const grants={
  'このターンバトル中このクリーチャーのパワーを+2000する。':{battlePower:2000},
  'このターンこのクリーチャーのパワーを+4000する。':{power:4000},
  'このターンこのクリーチャーはタップまたはアンタップしているクリーチャーを攻撃できる。':{grant:{attackUntapped:true}}
 };
 if(grants[body])return[{op:'ShinkaGrant397',...structuredClone(grants[body])}];
 if(body==='このターンこの進化したクリーチャーはすべてのバトルに勝つ。')return[{op:'ShinkaWin446'}];
 if(body==='自分の手札を1枚シールド化してもよい。そうしたら自分のシールドを1つ手札に加える。ただしその「S・トリガー」は使えない。')return[{op:'ShieldExchange446',optional:true}];
 if(body==='自分の手札を1枚シールド化しその後自分のシールドを1つ選んで手札に加える。ただしその「S・トリガー」は使えない。')return[{op:'ShieldExchange446'}];
 return null;
}
function shinka397(body,phase){
 if(phase>=545){
  if(body==='相手のクリーチャーを2体まで選びタップする。')return[{op:'Select',origin:'battle',owner:'opponent',n:2,optional:true,g173Targets:true,g193Select:true,g193Tap:true,filter:{creature:true}}];
  if(body==='自分の手札をすべて捨ててもよい。そうしたらカードを3枚引く。')return[{op:'HandCycle460',to:'grave',mode:'all',optional:true,fixedDraw:3}];
  if(body==='自分の墓地からコスト3以下のクリーチャーを1体出してもよい。')return[{op:'Select',origin:'grave',n:1,deploy:true,g236GraveDeploy:true,optional:true,filter:{creature:true,max:3}}];
 }

 if(phase>=544){const rules={
  '進化した後それよりコストが小さい相手のクリーチャーを1体破壊する。':[{op:'ShinkaHost544',mode:'belowCost'}],
  '相手のクリーチャーを1体選んでもよい。進化の後その選んだクリーチャーとこのクリーチャーをバトルさせる。':[{op:'ShinkaHost544',mode:'fight'}],
  '相手のクリーチャーを1体選ぶ。このターン自分の墓地にあるカード1枚につきそのクリーチャーのパワーを-1000する。':[{op:'CountTarget544',zone:'grave',amount:-1000,def:{op:'Target',g242PowerMinus:true}}],
  'カードを1枚引く。その後自分のシールドの数が相手より多ければカードをもう1枚引く。':[{op:'Draw',n:1},{op:'IfOwn',filter:{g334ZoneCount:{zone:'shields',moreThanOpponent:true}},defs:[{op:'Draw',n:1}]}]
 };if(rules[body])return structuredClone(rules[body]);}

 if(phase>=543){
  const rules={
   '次の自分のターンのはじめまでこのクリーチャーは攻撃されず相手がクリーチャーを選ぶ時選ばれない。':[{op:'ShinkaGrant397',untilStart:true,grant:{cannotBeAttacked:true,untargetable:true}}],
   '次の自分のターンのはじめまでこのクリーチャーはブロックされず相手がクリーチャーを選ぶ時このクリーチャーは選べない。':[{op:'ShinkaGrant397',untilStart:true,grant:{unblockable:true,untargetable:true}}],
   '次の自分のターンのはじめまでこの進化したクリーチャーは「ブロッカー」を得このターンの終わりにアンタップする。':[{op:'ShinkaGrant397',untilStart:true,grant:{blocker:true}},{op:'ShinkaDelay543',when:'end'}],
   'このターンこの進化したクリーチャーがはじめて攻撃する時その攻撃の後アンタップする。':[{op:'ShinkaDelay543',when:'firstAttack'}]
  };if(rules[body])return structuredClone(rules[body]);
 }

 if(phase>=446){const defs=shinka446(body);if(defs)return defs;}
 const grants={
  'このターンこの進化したクリーチャーはブロックされない。':{unblockable:true},
  'このターンこの進化したクリーチャーに「スレイヤー」を与える。(「スレイヤー」を持つクリーチャーがバトルする時バトルの後相手クリーチャーを破壊する)':{slayer:true},
  'このターンこの進化したクリーチャーに「マッハファイター」を与える。':{machFighter:true}
 };
 if(grants[body])return[{op:'ShinkaGrant397',grant:grants[body]}];
 const defs=clauses(body,phase).map(q=>instruction(q,phase));
 // These instructions do not rely on the original creature remaining on top.
 const safe=d=>!!d&&(['Draw','DrawUpTo','Ramp','Mill','Discard','DiscardDraw'].includes(d.op)||d.op==='Target'&&!d.grant&&!d.g335Grant&&d.owner!=='self'||d.op==='Select'&&['mana','grave'].includes(d.origin)&&d.to==='hand'&&!d.deploy||['Offer','DiscardFor248'].includes(d.op)&&d.defs?.length&&d.defs.every(safe));
 return defs.length&&defs.every(safe)?defs:null;
}
function abare399(body,phase){
 let m;
 if(phase>=409){
  if(body==='次の自分のターンのはじめまでそのクリーチャーはすべてのバトルに勝つ。')return[{op:'AttackEffect409',kind:'win'}];
  if(body==='次の自分のターンのはじめまでそのクリーチャーは破壊されない。')return[{op:'AttackEffect409',kind:'destroySafe'}];
  if(body==='それ以外の自分のクリーチャーを1体マナゾーンに置いてもよい。そうしたら相手は自身のクリーチャーを1体選びマナゾーンに置く。')return[{op:'AttackOtherMana409'}];
  if(body==='コストの合計がそのクリーチャーのコストより少なくなるようクリーチャーを2体まで自分のマナゾーンから選びバトルゾーンに出してもよい。')return[{op:'AttackDeploy409'}];
  if(body==='自分の山札の上から2枚見てもよい。そうしたらそのうちの1枚を裏向きにして新しいシールドとしてシールドゾーンに置きもう1枚をマナゾーンに置く。')return[{op:'Offer',g409Namake:true,defs:[{op:'Look',n:2,stages:[{n:1,to:'shields'},{n:1,to:'mana'}],rest:'top'}]}];
 }
 if(phase>=408){
  if(body==='このターンの終わりにそのクリーチャーをアンタップする。')return[{op:'AttackEndUntap408'}];
  if(body==='このターンそのクリーチャーはそれよりパワーが小さいクリーチャーにブロックされない。')return[{op:'AttackGrant399',grant:{g408LessPowerBlock:true}}];
  if(body==='相手のクリーチャーを1体選んでもよい。その選んだクリーチャーと攻撃しているクリーチャーをバトルさせる。')return[{op:'AttackFight408'}];
  if(body==='コスト4以下の呪文を1枚自分の手札からコストを支払わずに唱えてもよい。そうしなければカードを1枚引く。')return[{op:'Execute',origin:'hand',spellOnly:true,max:4,g408Decline:[{op:'Draw',n:1}]}];
 }
 if(m=body.match(/^このターンそのクリーチャーのパワーを\+([1-9]\d*)する。$/))return[{op:'AttackGrant399',power:+m[1]}];
 if(body==='このターンそのクリーチャーのパワーを+6000し「パワード・ブレイカー」を与える。(「パワード・ブレイカー」を持つクリーチャーはそのパワー6000ごとにシールドをさらに1つブレイクする)')return[{op:'AttackGrant399',power:6000,grant:{poweredBreaker:true}}];
 // These two reminders describe the attack declaration order, not another effect.
 body=body.replace(/\(まず何を攻撃するか選んでからタップするクリーチャーを選ぶ\)$/,'').replace(/\(まず自分のクリーチャーが何を攻撃するか選ぶ。その後相手はタップするクリーチャーを選ぶ\)$/,'');
 const defs=clauses(body,phase).map(q=>instruction(q,phase));
 const safe=d=>!!d&&(['Draw','DrawUpTo','Ramp','Mill','Discard','DiscardDraw','OpponentSelect'].includes(d.op)||d.op==='Target'&&!d.grant&&!d.g335Grant&&d.owner!=='self'||d.op==='Select'&&!d.deploy&&(['mana','grave'].includes(d.origin)&&d.to==='hand'||d.owner==='opponent'&&d.origin==='battle'&&['mana','grave','hand'].includes(d.to))||d.op==='Look'&&d.stages?.every(x=>x.to==='hand')&&!d.after||['Offer','DiscardFor248'].includes(d.op)&&d.defs?.length&&d.defs.every(safe));
 return defs.length&&defs.every(safe)?defs:null;
}
function mana402(code){
 const m=code.match(/^(ll|ww|dd|ff|nn|lw|ld|lf|ln|wd|wf|wn|df|dn|fn)(\d{2})$/);if(!m||+m[2]<1)return null;
 const names={l:'光',w:'水',d:'闇',f:'火',n:'自然'},civilizations=[...new Set([...m[1]].map(c=>names[c]))];
 return +m[2]>=civilizations.length?{cost:+m[2],civilizations}:null;
}
function chance418(line){
 const m=line.match(/^アタック・チャンス[:―-](.+?)\(自分の(.+?)が攻撃する時(?:この呪文をコストを支払わずに唱えてもよい|このカードをコストを支払わずに実行してもよい)\)$/);if(!m)return null;
 if(m[1]==='ハイパーモード状態のクリーチャー'&&m[2]==='ハイパーモードを解放しているクリーチャー')return{hyper:true};
 if(m[1]!==m[2])return null;
 if(['シノビ','エイリアン'].includes(m[1]))return{race:m[1]};
 if(m[1]==='ゼニスアンノウンまたはオラクル')return{raceAny:['ゼニス','アンノウン','オラクル']};
 const colored=m[1].match(/^(光|水|闇)のディスペクター$/);return colored?{color:colored[1],race:'ディスペクター'}:null;
}
function chance419(line){
 const m=line.match(/^アタック・チャンス[:―-](.+?)\(自分の(.+?)が攻撃する時この呪文をコストを支払わずに唱えてもよい\)$/);
 if(m&&m[1]===m[2]){
  if(['ハンター','ドラゴン・ゾンビ'].includes(m[1]))return{race:m[1]};
  if(m[1]==='自然のディスペクター')return{color:'自然',race:'ディスペクター'};
  if(m[1]==='《真実の名ワクワク・チャップルン》')return{g201ExactName:'真実の名ワクワク・チャップルン'};
 }
 const named=line.match(/^アタック・チャンス[:―-]名前に《(ジョニー|ドギラゴン)》とあるクリーチャー\(名前に《\1》とある自分のクリーチャーが攻撃する時この呪文をコストを支払わずに唱えてもよい\)$/);
 return named?{name:named[1]}:null;
}
const legacyWaveMarker='ウェーブストライカー(バトルゾーンに「ウェーブストライカー」を持つクリーチャーが他に2体以上あればこのクリーチャーは次の能力を得る)';
const waveMarker702='ウェーブストライカー(「ウェーブストライカー」を持つクリーチャーが他に2体以上あればこのクリーチャーに次のw能力を与える)';
const waveKirstein702=waveMarker702+'w自分のクリーチャーすべてのパワーを+5000し「ブロッカー」と「W・ブレイカー」を与える。';
const waveLameer702=waveMarker702+'w自分のクリーチャーすべてのパワーを+1000する。';

const waveTriggerSpell703='S・トリガーS・トリガー(この呪文をシールドゾーンから手札に加える時コストを支払わずにすぐ唱えてもよい)';
const waveTwinFaces703=[
 {
  front:'このクリーチャーのパワーは+4000されパワー5000以下のクリーチャーにブロックされない。',
  legacy:'このクリーチャーのパワーは+4000され、パワー5000以下のクリーチャーにブロックされない。',
  spell:'このターン自分のクリーチャー1体のパワーを+4000する。'
 },
 {
  front:'このクリーチャーのパワーを+4000し「ブロッカー」を与える。',
  legacy:'このクリーチャーのパワーは+4000され、「ブロッカー」を得る。',
  spell:waveTriggerSpell703+'相手のマナゾーンのカードが自分のより多ければ自分の山札の上から1枚目をマナゾーンに置く。'
 },
 {
  front:'このクリーチャーが出た時パワー2000以下のクリーチャーをすべて破壊する。',
  legacy:'このクリーチャーをバトルゾーンに出した時、パワー2000以下のクリーチャーをすべて破壊する。',
  spell:waveTriggerSpell703+'相手のパワー3000以下のクリーチャーをすべて破壊する。自分のパワー6000以上のクリーチャーがあればカードを1枚引く。'
 }
];

const phantomVeil704='次の相手のターン中相手のクリーチャーはすべて可能なら攻撃する。';
const waveTwinFaces704=[
 {
  front:'このクリーチャーが出た時クリーチャーを1体自分の墓地から手札に戻してもよい。',
  legacy:'このクリーチャーをバトルゾーンに出した時、クリーチャーを１体、自分の墓地から自分の手札に戻してもよい。',
  spell:waveTriggerSpell703+'相手のクリーチャーを1体破壊する。自分の山札の上から3枚を墓地に置いてもよい。'
 },
 {
  front:'このクリーチャーを出した時自分の山札の上から1枚目をマナゾーンに置く。その後クリーチャーを1体自分のマナゾーンから手札に戻す。',
  legacy:'このクリーチャーをバトルゾーンに出した時、自分の山札の上から１枚目を自分のマナゾーンに置く。その後、クリーチャーを１体、自分のマナゾーンから自分の手札に戻す。',
  spell:'S・トリガーS・トリガー相手のクリーチャーを1体選び持ち主のマナゾーンに置く。カードを1枚引く。'
 },
 {
  front:'このクリーチャーが出た時相手は自身のクリーチャーを1体選んで破壊する。',
  legacy:'このクリーチャーをバトルゾーンに出した時、相手は自分自身のクリーチャーを１体破壊する。',
  spell:phantomVeil704
 }
];

const waveGrants705={
 'wこのクリーチャーのパワーを+3000し「W・ブレイカー」を与える。(「W・ブレイカー」を持つクリーチャーはシールドを2つブレイクする)':{power:3000,breaker:2,g633DoubleBreaker:true},
 'wこのクリーチャーに「ブロッカー」と「スレイヤー」を与える。(このクリーチャーをタップして相手クリーチャーの攻撃先をこのクリーチャーに変更してもよい。このクリーチャーがバトルする時バトルの後相手クリーチャーを破壊する)':{blocker:true,slayer:true},
 'wこのクリーチャーに「マッハファイター」を与える。(このクリーチャーは出たターンの間タップまたはアンタップしているクリーチャーを攻撃できる)':{machFighter:true}
};

const shobuChargerTasks=()=>[
 {op:'Target',owner:'self',grant:{attackUntapped:true,g838FreshUntapped:true},spell:true,title:'アンタップしているクリーチャーを攻撃できるようにする自分のクリーチャーを選ぶ'}
];

export function standardCardSpec(d,{phase=165}={}){
 // Repair only the complete formatting variants pinned to these official prints.
 if(phase>=533&&d?.faces?.length===1){
  const fix={
   'dmrp17-024':['蟲偵電融 ゼノジェント','W・ブレイカー（このクリーチャーはシールドを２つブレイクする）。','W・ブレイカー（このクリーチャーはシールドを２つブレイクする）'],
   'dm14-008':['メガアサルト・ワイバーン','W・ブレイカー(このクリーチャーはシールドを２枚ブレイクする)このクリーチャーが破壊された時、パワー4000以下のクリーチャーをすべて破壊する。','W・ブレイカー(このクリーチャーはシールドを２枚ブレイクする)\nこのクリーチャーが破壊された時、パワー4000以下のクリーチャーをすべて破壊する。']
  }[d.id];
  if(fix&&d.name===fix[0]&&d.faces[0].abilityText.split('\n').includes(fix[1])){d=structuredClone(d);d.faces[0].abilityText=d.faces[0].abilityText.replace(fix[1],fix[2]);}
 }
 // These older official pages have a broken minus glyph. Keep the exception
 // pinned to the verified print and complete clause; never guess other symbols.
 if(phase>=428){
  const verified={
   'dmr22-071':['禁断C トビゲール','_',2000],
   'dmrp02-076':['震炎の影 シェイク・ディール','?',2000],
   'dmrp04m-033':['堕魔 ドゥシーザ','?',2000],
   'dmr23-069':['第２種 タマネギルM','_',1000],
   'dmrp02-041':['龍装者 ジバル84号','?',3000]
  }[d?.id];
  if(verified&&d.name===verified[0]&&d.faces?.length===1){
   const text='このクリーチャーがバトルゾーンに出た時、相手のクリーチャーを１体選ぶ。そのターン、そのクリーチャーのパワーを'+verified[1]+verified[2]+'する。（パワー０以下のクリーチャーは破壊される）';
   if(d.faces[0].abilityText.split('\n').filter(l=>l===text).length===1){d=structuredClone(d);d.faces[0].abilityText=d.faces[0].abilityText.replace(text,text.replace(verified[1]+verified[2],'－'+verified[2]));}
  }
 }
 const f=d?.faces?.[0];
 if(aliasNames.has(d?.name)||phase>=250&&d?.name==='アイドルマスターレオ')throw Error('既存名の別表記');
 if(phase>=782&&d?.status==='complete'&&d.faces.length===2&&d.faces.every(face=>face.typeText==='クリーチャー')){
  const front=normalize(f.abilityText),active=d.faces[1],back=normalize(active.abilityText);
  const hyper='ハイパー化:自分の他のクリーチャーを1体タップする。(自分のメインステップ中にハイパーモードを解放できる。ハイパーモードは次の自分のターンのはじめまで続く)';
  const guard='ガードマン(このクリーチャーをタップして相手クリーチャーの攻撃先を自分の他のクリーチャーからこのクリーチャーに変更してもよい)';
  const blocker='ブロッカーブロッカー(このクリーチャーをタップして相手クリーチャーの攻撃先をこのクリーチャーに変更してもよい)';
  if(phase>=785){
   const hido='S・トリガーS・トリガーこのクリーチャーが出た時相手のクリーチャーを1体選び破壊する。'+hyper;
   if(front===hido&&back===front+'スレイヤー(このクリーチャーがバトルする時バトルの後相手クリーチャーを破壊する)W・ブレイカー'&&f.powerText==='2000'&&active.powerText==='6000')
    return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'Target',to:'grave'}],hyperTap:true,hyper:{power:6000,breaker:2,slayer:true}};
   const panesko='スピードアタッカーW・ブレイカーこのクリーチャーが離れる時かわりに自分の他のクリーチャーを1体破壊してもよい。'+hyper;
   if(front===panesko&&back===front+'相手のクリーチャーが召喚以外の方法で出た時そのクリーチャーを破壊する。'&&f.powerText==='7000'&&active.powerText==='11000')
    return {speedAttacker:true,breaker:2,aterGuard:'panesko',hyperTap:true,hyper:{power:11000,g403Bloom:'eitherTurn'}};
  }
  if(phase>=784){
   const tri='S・トリガーS・トリガーこのクリーチャーが出た時相手のクリーチャーを1体選びシールド化する。'+hyper;
   if(front===tri&&back===front+'W・ブレイカー各ターンはじめて自分のクリーチャーが攻撃する時相手のクリーチャーを1体選びタップする。次の相手のターンのはじめにそのクリーチャーはアンタップしない。'&&f.powerText==='4500'&&active.powerText==='8500')
    return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'Target',to:'shields'}],hyperTap:true,
     hyper:{power:8500,breaker:2,g252AttackWatch:{who:'self',first:true,filter:{creature:true},defs:[{op:'Target',tap:true,lock:true,g210TapLock:true}]}}};
   const budget='パワーの合計が7000以下になるように相手のクリーチャーを2体まで選び破壊する。';
   const arx='S・トリガーS・トリガーこのクリーチャーが出た時'+budget+hyper;
   if(front===arx&&back===front+'W・ブレイカーこのクリーチャーが攻撃する時相手の「ブロッカー」を持つクリーチャーを1体選び破壊する。'&&f.powerText==='3000'&&active.powerText==='7000')
    return {trigger:true,effect:'sixPhoto',g34Tasks:[powerBudget506(budget)],hyperTap:true,
     hyper:{power:7000,breaker:2,g34Attack:[{op:'Target',to:'grave',filter:{blocker:true}}]}};
   const shin='ブロッカーブロッカーW・ブレイカーこのクリーチャーが出た時自分の山札の上から2枚を見る。そのうちの1枚をシールド化しもう1枚をマナゾーンに置く。'+hyper;
   if(front===shin&&back===front+'T・ブレイカーこのクリーチャーが攻撃する時自分の山札の上から1枚目をマナゾーンに置く。その後「S・トリガー」を持つクリーチャーを1体自分のマナゾーンから出してもよい。'&&f.powerText==='7000'&&active.powerText==='12000')
    return {blocker:true,breaker:2,effect:'sixPhoto',g34Tasks:[{op:'Look',n:2,stages:[{n:1,to:'shields'}],rest:'mana'}],hyperTap:true,
     hyper:{power:12000,breaker:3,g633DoubleBreaker:true,g34Attack:[{op:'Ramp',n:1},
      {op:'Select',origin:'mana',deploy:true,n:1,optional:true,filter:{creature:true,faceUp:true,g784ShieldTrigger:true}}]}};
  }
  if(phase>=783){
   const doubleBreaker='W・ブレイカー(このクリーチャーはシールドを2つブレイクする)';
   const eine='S・トリガーS・トリガーブロッカーブロッカーこのクリーチャーが出た時次の自分のターンのはじめまでこのクリーチャーのハイパーモードを解放する。'+hyper;
   if(front===eine&&back===front+'W・ブレイカー'&&f.powerText==='4000'&&active.powerText==='8000')
    return {trigger:true,blocker:true,effect:'sixPhoto',g34Tasks:[{op:'ReleaseSelfHyper783'}],hyperTap:true,hyper:{power:8000,breaker:2}};
   const ramar='このクリーチャーが出た時カードを2枚引き自分の手札を1枚捨てる。'+hyper;
   if(front===ramar&&back===front+doubleBreaker+'自分のクリーチャーの召喚コストを1少なくする。ただしコストは0以下にはならない。'&&f.powerText==='4000'&&active.powerText==='9000')
    return {effect:'sixPhoto',g34Tasks:[{op:'Draw',n:2},{op:'Discard',owner:'self',n:1}],hyperTap:true,
     hyper:{power:9000,breaker:2,g290SummonAura:{filter:{},amount:1}}};
   if(front===blocker+hyper&&back===front+doubleBreaker+'このクリーチャーが攻撃する時自分のタップしているクリーチャー1体につき1枚カードを引いてもよい。'&&f.powerText==='3500'&&active.powerText==='8500')
    return {blocker:true,hyperTap:true,hyper:{power:8500,breaker:2,g34Attack:[{op:'CountDraw',zone:'battle',filter:{creature:true,tapped:true},optional:'each'}]}};
  }
  const agaloom=blocker+'自分の墓地にカードが5枚以上なければこのクリーチャーは攻撃できない。'+hyper;
  if(front===agaloom&&back===front+'自分のターンの終わりに自分のタップしているクリーチャー1体につき1枚自分の山札の上から墓地に置いてもよい。'&&f.powerText==='1000'&&active.powerText==='4000')
   return {blocker:true,g225AttackRequires:{kind:'graveCards',min:5},hyperTap:true,hyper:{power:4000,g174End:[{op:'MillTapped782'}]}};
  if(front===guard+hyper&&back===front+'このクリーチャーは相手プレイヤーを攻撃できない。'&&f.powerText==='3000'&&active.powerText==='14000')
   return {guardman:true,hyperTap:true,hyper:{power:14000,noPlayerAttack:true}};
  const akane='S・トリガーS・トリガーこのクリーチャーが出た時相手のクリーチャーを1体選び持ち主のマナゾーンに置く。'+hyper;
  if(front===akane&&back===front+'W・ブレイカーこのクリーチャーはこのクリーチャーよりパワーが小さいクリーチャーにブロックされない。'&&f.powerText==='4000'&&active.powerText==='9000')
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'Target',to:'mana'}],hyperTap:true,
    hyper:{power:9000,breaker:2,g206NoBlock:{lessPower:true}}};
 }
 if(phase>=844&&d?.status==='complete'&&d.faces.length===1&&f.typeText==='クリーチャー'){
  const text=normalize(f.abilityText);
  if(text==='このクリーチャーをバトルゾーンに出した時自分のマナゾーンにカードが9枚以上なければこのクリーチャーを破壊する。T・ブレイカー(このクリーチャーはシールドを3枚ブレイクする)')
   return {breaker:3,effect:'sixPhoto',g34Tasks:[{op:'IfOwn',filter:{g272ManaCount:9},elseDefs:[{op:'SelfDestroy'}]}]};
  const swan='バトルゾーンに相手の「ブロッカー」を持つクリーチャーがあればこのクリーチャーを召喚するコストは最大3少なくなる。ただしコストは1より少なくならない';
  if([swan+')',swan+'。'].some(rule=>text===rule+'スピードアタッカー(このクリーチャーは召喚酔いしない)'))
   return {speedAttacker:true,g212CountDiscount:{zone:'battle',owner:'opponent',filter:{creature:true,blocker:true},amount:3,max:3,optional:true}};
  const egg='自分のターンのはじめに自分の山札の上から';
  if([
   egg+'1枚目を墓地に置く。そのカードが進化ではないドラゴンであればこのクリーチャーを破壊してもよい。そうした場合そのドラゴンをバトルゾーンに出す。このクリーチャーは攻撃することができない。',
   egg+'1枚目を墓地に置く。そのカードが進化ではないドラゴンならこのクリーチャーを破壊してもよい。そうしたらそのドラゴンを出す。このクリーチャーは攻撃できない。',
   egg+'1枚を墓地に置く。それが進化ではないドラゴンならこのクリーチャーを破壊してもよい。そうしたらそのドラゴンを出す。このクリーチャーは攻撃できない。'
  ].includes(text))return {noAttack:true,g174Start:[{op:'MillHatch841',optional:true,filter:{creature:true,nonEvolution:true,race:'ドラゴン'}}]};
 }
 if(phase>=843&&d?.status==='complete'&&d.faces.length===1){
  const text=normalize(f.abilityText);
  if(f.typeText==='クリーチャー'&&text==='マナゾーンに置く時このカードはタップして置く。バトルゾーンにある自分の他のエイリアンはすべて「スピードアタッカー」と「スレイヤー」を得る。相手の呪文の効果または相手のクリーチャーの能力によってこのクリーチャーが自分の手札から捨てられる時墓地に置くかわりに自分のマナゾーンに置いてもよい。')
   return {g208Auras:[{filter:{creature:true,race:'エイリアン'},other:true,grants:{speedAttacker:true,slayer:true}}],g843DiscardToMana:true};
  if(f.typeText==='呪文'&&text==='S・トリガー(この呪文をシールドゾーンから手札に加える時コストを支払わずにすぐ唱えてもよい)バトルゾーンにある自分の進化ではないクリーチャーを1体選んで裏向きにし新しいシールドとして自分のシールドゾーンに加える。加えたカードが闇または火のクリーチャーであればカードを1枚引いてもよい。')
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'Target',owner:'self',filter:{nonEvolution:true},to:'shields',g843ShieldDraw:true}]};
  if(f.typeText==='クリーチャー'&&text==='このクリーチャーが攻撃する時バトルゾーンにある相手のクリーチャーを1体選ぶ。そのターンそのクリーチャーのパワーはバトルゾーンにある自分のタップされているクリーチャー1体につき-1000される。(パワー0以下のクリーチャーは破壊される)')
   return {g34Attack:[{op:'TappedPower843'}]};
 }
 if(phase>=842&&d?.status==='complete'&&d.faces.length===1&&f.typeText==='クリーチャー'){
  const text=normalize(f.abilityText),breaker='W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)';
  if(text==='このクリーチャーが攻撃する時バトルゾーンにある自分のタップされているクリーチャー1体につき相手のシールドをひとつ選ぶ。相手は選ばれたシールドを自身の手札に加える。')
   return {g34Attack:[{op:'TappedShields842'}]};
  if(text==='マナゾーンに置く時このカードはタップして置く。パワーアタッカー+2000(攻撃中このクリーチャーのパワーは+2000される)このクリーチャーが破壊される時墓地に置くかわりに新しいシールドとして自分のシールドゾーンに加える。')
   return {attackBonus:2000,g842DestroyShield:true};
  if(text==='自分のターンの終わりにクリーチャーを1体自分の手札から捨ててもよい。そうした場合自分の山札の上から3枚を見る。その中から1枚を手札に加え1枚を山札の一番下に戻し残りの1枚を山札の一番上に置く。'+breaker)
   return {breaker:2,g174End:[{op:'DiscardFor248',g488DiscardFilter:{g228Face:{type:'creature'}},g770DiscardAttempt:true,defs:[{op:'Clock842'}]}]};
 }
 if(phase>=841&&d?.status==='complete'&&d.faces.length===1&&f.typeText==='クリーチャー'){
  const text=normalize(f.abilityText),breaker='W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)';
  if(text==='このクリーチャーをバトルゾーンに出した時またはこのクリーチャーが攻撃する時自分の山札の上から1枚目を見る。それが呪文であればコストを支払わずに唱えてもよい。'+breaker)
   return {breaker:2,effect:'sixPhoto',g34Tasks:[{op:'LookSpell841'}],g34Attack:[{op:'LookSpell841'}]};
  if(text==='このクリーチャーが攻撃する時自分の山札を見る。その中からコストが3以下の進化ではないライト・ブリンガーを2体まで選びバトルゾーンに出す。その後山札をシャッフルする。'+breaker)
   return {breaker:2,g34Attack:[{op:'LookDeploy530',g201Search:true,g841DeckPeek:true,limit:2,rest:'shuffle',filter:{creature:true,nonEvolution:true,race:'ライトブリンガー',max:3}}]};
  if(text==='自分のターンのはじめに自分の山札の上から1枚目を墓地に置く。そのカードが進化ではないハンター・クリーチャーであればこのクリーチャーを破壊してそのハンターをバトルゾーンに出す。このクリーチャーは攻撃することができない。')
   return {noAttack:true,g174Start:[{op:'MillHatch841',filter:{creature:true,nonEvolution:true,race:'ハンター'}}]};
 }
 if(phase>=840&&d?.status==='complete'&&d.faces.length===1){
  const text=normalize(f.abilityText);
  if(f.typeText==='呪文'&&text==='S・トリガーバトルゾーンにある相手のクリーチャーを1体選ぶ。バトルゾーンに自分の水または火のクリーチャーがあればこのターン選んだクリーチャーのパワーは-4000される。なければそのパワーは-2000される。(パワー0以下のクリーチャーは破壊される)'){
   const minus={op:'Target',g242PowerMinus:true,spell:true};
   return {trigger:true,effect:'sixPhoto',g34Tasks:[
    {op:'IfOwn',filter:{creature:true,any:[{color:'水'},{color:'火'}]},defs:[{...minus,power:-4000}],elseDefs:[{...minus,power:-2000}]}
   ]};
  }
  if(f.typeText==='クリーチャー'&&text==='ブロッカーこのクリーチャーはバトルゾーンに自分のエンジェル・コマンドまたはデーモン・コマンドがあれば相手プレイヤーを攻撃できる。')
   return {blocker:true,g558Souls:['H','E'],g840PlayerAttackRequires:{creature:true,raceAny:['エンジェル・コマンド','デーモン・コマンド']}};
  if(f.typeText==='クリーチャー'&&text==='返霊2(このクリーチャーが攻撃する時自分の墓地からカードを2枚好きな順序で山札の一番下に置いてもよい。そうした場合このクリーチャーの能力を使う)相手の闇以外のクリーチャーを1体破壊する。')
   return {g558Souls:['E'],g34Attack:[{op:'Select',origin:'grave',to:'deck',n:2,optional:true,
    g837Reikon:[{op:'Target',to:'grave',filter:{notColor:'闇'}}],title:'返霊2：山札の下に置く順に墓地のカードを2枚選ぶ'}]};
  if(f.typeText==='呪文'&&[
    'S・トリガー',
    'S・トリガー(この呪文をシールドゾーンから手札に加える時コストを支払わずにすぐ唱えてもよい)',
    'S・トリガーS・トリガー(この呪文をシールドゾーンから手札に加える時コストを支払わずにすぐ唱えてもよい)'
   ].some(trigger=>text===trigger+'クリーチャーを1体自分の墓地から手札に戻す。このようにして戻したカードが光または自然のクリーチャーであればカードを1枚引いてもよい。'))
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'Select',origin:'grave',to:'hand',n:1,
    filter:{g228Face:{type:'creature'}},g654MovedFilter:{any:[{g228Face:{type:'creature',color:'光'}},{g228Face:{type:'creature',color:'自然'}}]},
    g583OnMove:[{op:'Draw',n:1,optional:true}]}]};
 }
 if(phase>=839&&d?.status==='complete'&&f.typeText==='クリーチャー'){
  const text=normalize(f.abilityText),spell=d.faces[1];
  if(d.faces.length===2&&spell.typeText==='呪文'&&
     text==='S・トリガーS・トリガー(このクリーチャーをシールドゾーンから手札に加える時コストを支払わずにすぐ召喚してもよい)このクリーチャーが出た時相手のパワー3000以下のクリーチャーを1体選び破壊する。'&&
     normalize(spell.abilityText)==='このターン自分のクリーチャー1体はタップされていないクリーチャーを攻撃できる。チャージャー(この呪文を唱えた後墓地に置くかわりにマナゾーンに置く)')
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'Target',to:'grave',filter:{maxPower:3000,g199Power:true}}],
    spellFace:{name:spell.name,type:'spell',cost:spell.cost,civ:spell.civilizationText,civilizations:spell.civilizations,race:spell.race,
     effect:'sixPhoto',normalCharger:true,g34Tasks:shobuChargerTasks()}};
  if(d.faces.length===1&&text==='このクリーチャーが破壊された時墓地から自分の山札の一番下に置いてもよい。そうした場合名前に《死神》とある進化ではないクリーチャーを1体自分の墓地からバトルゾーンに出す。')
   return {g172Death:[{op:'SelfGraveBottom839',after:[
    {op:'Select',origin:'grave',deploy:true,n:1,filter:{creature:true,nonEvolution:true,g819CreatureNameIncludes:'死神'}}
   ]}]};
  if(d.faces.length===1&&text==='このクリーチャーをバトルゾーンに出した時相手は自身の手札から2枚カードを選びすべてのプレイヤーに見せる。そのうちの1枚を選び相手に捨てさせる。')
   return {effect:'sixPhoto',g34Tasks:[{op:'RevealDiscard839'}]};
 }
 if(phase>=838&&d?.status==='complete'&&d.faces.length===1){
  const text=normalize(f.abilityText);
  if(f.typeText==='呪文'&&text==='このターンバトルゾーンにある自分のクリーチャー1体はタップされていないクリーチャーを攻撃できる。チャージャー(この呪文を唱えた後墓地に置くかわりに自分のマナゾーンに置く)')
   return {normalCharger:true,effect:'sixPhoto',g34Tasks:shobuChargerTasks()};
  if(f.typeText==='呪文'&&text==='相手のクリーチャーを1体破壊しそのクリーチャーと同じ名前を持つ相手のクリーチャーをすべて破壊する。')
   return {effect:'sixPhoto',g34Tasks:[{op:'ChainDestroy838'}]};
  if(f.typeText==='クリーチャー'&&text==='いずれかの墓地にカードが置かれた時そのターンバトルゾーンにある自分のコスト2以下のクリーチャーはすべて「スレイヤー」を得る。(「スレイヤー」を得たクリーチャーがバトルする時バトルの後相手クリーチャーを破壊する)')
   return {g558Souls:['B'],g838AnyGrave:[{op:'GroupGrant364',owner:'self',filter:{creature:true,max:2},grant:{slayer:true}}]};
 }
 if(phase>=837&&d?.status==='complete'&&d.faces.length===1){
  const text=normalize(f.abilityText);
  if(f.typeText==='呪文'&&text==='S・トリガーバトルゾーンにある相手のクリーチャーを1体選びタップする。その後バトルゾーンにある自分のハンター1体につきバトルゾーンにある相手のクリーチャーを1体選びタップする。'){
   const tap={op:'Select',owner:'opponent',origin:'battle',n:1,filter:{creature:true},
    g173Targets:true,g193Select:true,g193Tap:true,title:'タップする相手のクリーチャーを1体選ぶ'};
   return {trigger:true,effect:'sixPhoto',g34Tasks:[tap,
    {op:'CountOwn538',filter:{race:'ハンター'},mode:'repeat',def:tap}]};
  }
  if(f.typeText==='クリーチャー'&&[
   'このクリーチャーをバトルゾーンに出した時',
   'このクリーチャーがバトルゾーンに出た時'
  ].some(prefix=>text===prefix+'カードを1枚いずれかのプレイヤーの墓地から選び持ち主の山札の一番上か一番下に置いてもよい。'))
   return {effect:'sixPhoto',g34Tasks:[{op:'Select',origin:'grave',anyOwner:true,n:1,optional:true,g837DeckEnds:true}]};
  if(f.typeText==='クリーチャー'&&text==='返霊1(このクリーチャーが攻撃する時自分の墓地からカードを1枚好きな順序で山札の一番下に置いてもよい。そうした場合このクリーチャーの能力を使う)相手の手札を1枚見ないで選び捨てさせる。')
   return {g558Souls:['E'],g34Attack:[{op:'Select',origin:'grave',to:'deck',n:1,optional:true,
    g837Reikon:[{op:'BlindDiscard773'}],title:'返霊1：山札の下に置く墓地のカードを選ぶ'}]};
  if(f.typeText==='クリーチャー'&&text==='自分のターン中にカードを1枚も自分のマナゾーンに置いていなければそのターンの終わりにこのクリーチャーを自分の手札に戻す。W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)')
   return {breaker:2,g174End:[{op:'IfOwn',filter:{g837NoManaAdded:true},defs:[{op:'SelfHand299'}]}]};
 }
 if(phase>=836&&d?.status==='complete'&&d.faces.length===1){
  const text=normalize(f.abilityText).replace(/^【K・ソウル】/,'');
  if(f.typeText==='進化クリーチャー'&&text==='進化-自分のジャイアント1体の上に置く。このクリーチャーをバトルゾーンに出した時パワー6000以下のクリーチャーをすべてバトルゾーンから持ち主のマナゾーンに置く。W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)')
   return {evolution:{race:'ジャイアント'},breaker:2,effect:'sixPhoto',g34Tasks:[
    {op:'Sweep',both:true,to:'mana',filter:{creature:true,maxPower:6000,g199Power:true}}
   ]};
  if(f.typeText==='クリーチャー'&&text==='自分の名前に《XX》とあるクリーチャーの召喚コストを1少なくしてもよい。ただしコストは1より少なくならない。バトルゾーンにある自分のフレイム・コマンドはすべて「スピードアタッカー」を得る。(「スピードアタッカー」を得たクリーチャーは召喚酔いしない)')
   // The printed name must include XX with the reading ダブルクロス (202.3a).
   return {g558Souls:['K'],g349SummonAuras:[{filter:{g836NameIds:[
    'dm24rp4-040','dm24rp4-004','dm38-003','dmd08-018','dm38-048','dm24rp4-019'
   ]},amount:1,g560Optional:true}],
    g208Auras:[{filter:{creature:true,race:'フレイム・コマンド'},grants:{speedAttacker:true}}]};
  if(f.typeText==='クリーチャー'&&text==='スピードアタッカー(このクリーチャーは召喚酔いしない)W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)自分のターンの終わりに自分のクリーチャーを1体バトルゾーンから手札に戻してもよい。')
   return {g558Souls:['K'],speedAttacker:true,breaker:2,g174End:[
    {op:'Select',origin:'battle',to:'hand',n:1,optional:true,filter:{creature:true}}
   ]};
  if(f.typeText==='クリーチャー'&&text==='相手がバトルゾーンにそのターン最初のクリーチャーを出した時相手は自身のクリーチャーを1体破壊する。W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)')
   return {g558Souls:['E'],breaker:2,g314OtherEntry:{who:'opponent',entryCount:1,defs:[{op:'OpponentSelect',n:1,to:'grave'}]}};
 }
 if(phase>=835&&d?.status==='complete'&&d.faces.length===1&&f.typeText==='クリーチャー'){
  const text=normalize(f.abilityText);
  if(text==='このクリーチャーを召喚してバトルゾーンに出した時パワー7000以下のクリーチャーを1体自分の墓地からバトルゾーンに出してもよい。W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)')
   return {breaker:2,summonedEntryOnly:true,effect:'sixPhoto',g34Tasks:[
    {op:'Select',origin:'grave',deploy:true,n:1,optional:true,filter:{g228Face:{type:'creature',maxPower:7000}}}
   ]};
  if(text==='自分のターン中他のクリーチャーがバトルゾーンに出た時そのターンこのクリーチャーは「パワーアタッカー+6000」を得シールドをさらに1枚ブレイクする。')
   return {g314OtherEntry:{who:'both',ownTurn:true,defs:[
    {op:'SelfBoost313',power:6000,g337PowerAttacker:true,g536Source:true},
    {op:'SelfExtraBreak444',amount:1}
   ]}};
  if(text==='自分のターンの終わりにクリーチャーを1体自分の手札から捨ててもよい。そうした場合そのクリーチャーよりコストが小さい相手のクリーチャーを1体破壊する。')
   return {g174End:[{op:'DiscardFor248',g488DiscardFilter:{g228Face:{type:'creature'}},
    defs:[{op:'DiscardCost655',g835Creature:true}]
   }]};
 }
 if(phase>=834&&d?.status==='complete'&&d.faces.length===1){
  const text=normalize(f.abilityText);
  if(f.typeText==='呪文'&&text==='いずれかのプレイヤーの山札の上から3枚を見る。その後それを好きな順序で元に戻す。')
   return {effect:'sixPhoto',g34Tasks:[{op:'GuardVision834'}]};
  if(f.typeText==='クリーチャー'&&text==='W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)自分の他の進化ではないクリーチャーをバトルゾーンに出した時このクリーチャーを破壊する。')
   return {breaker:2,g314OtherEntry:{who:'self',filter:{creature:true,nonEvolution:true},defs:[{op:'SelfDestroy'}]}};
  if(f.typeText==='クリーチャー'&&text==='ノー・チョイス(手札を1枚も持っていないプレイヤーがひとりでもいればこのクリーチャーは次の能力を得る)このクリーチャーのパワーは+4000され「W・ブレイカー」を得る。')
   return {g260Self:{filter:{g834AnyEmptyHand:true},grants:{power:4000,breaker:2}}};
  if(f.typeText==='クリーチャー'&&text==='自分のターンの終わりに自分のシールドが3枚以下であればクリーチャーを1体自分の手札から捨ててもよい。そうした場合自分の山札の上から1枚目を裏向きのまま新しいシールドとして自分のシールドゾーンに加える。')
   return {g174End:[{op:'IfOwn',filter:{g265ShieldsMax:3},defs:[{op:'DiscardFor248',
    g488DiscardFilter:{g228Face:{type:'creature'}},g770DiscardAttempt:true,defs:[{op:'ShieldTop',n:1}]
   }]}]};
 }
 if(phase>=833&&d?.status==='complete'&&d.faces.length===1){
  const text=normalize(f.abilityText);
  const blocker='ブロッカー(相手クリーチャーが攻撃する時このクリーチャーをタップしてその攻撃を阻止してもよい。その後その相手クリーチャーとバトルする)';
  // The official listing leaves the power cell blank; the DM39 card image prints 4000.
  if(d.id==='dm39-042'&&f.typeText==='クリーチャー'&&f.powerText===''&&text===blocker+'このクリーチャーは攻撃することができない。')
   return {power:4000,blocker:true,noAttack:true};
  const haunted=text.replace(/^S・トリガー(?=S・トリガー)/,'').replace('どちらかのプレイヤー','いずれかのプレイヤー');
  if(f.typeText==='呪文'&&haunted==='S・トリガー(この呪文をシールドゾーンから手札に加える時コストを支払わずにすぐ唱えてもよい)いずれかのプレイヤーの山札の上から1枚目を見る。そのカードを持ち主の墓地に置いてもよい。カードを1枚引く。')
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'HauntedChoice833'},{op:'Draw',n:1}]};
  if(f.typeText==='クリーチャー'&&text==='S・トリガー(このクリーチャーをシールドゾーンから手札に加える時コストを支払わずにすぐ召喚してもよい)このクリーチャーをバトルゾーンに出した時自分の墓地にあるコスト1の呪文を1枚手札に戻してもよい。')
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'Select',origin:'grave',to:'hand',n:1,optional:true,filter:{g228Face:{type:'spell',min:1,max:1}}}]};
 }
 if(phase>=832&&d?.status==='complete'&&d.faces.length===1){
  const text=normalize(f.abilityText);
  const mach=[
   '自分の名前に《NEX》とあるクリーチャーを召喚するコストを1少なくしてもよい。ただしコストは1より少なくならない。バトルゾーンにある自分のアーマード・ドラゴンはすべて「スピードアタッカー」を得る。(「スピードアタッカー」を得たクリーチャーは召喚酔いしない)自分のターンの終わりにこのターンにバトルゾーンに出した自分の進化ではないアーマード・ドラゴンをすべて手札に戻す。',
   '自分の名前に《NEX》とあるクリーチャーの召喚コストを1少なくしてもよい。ただしコストは0以下にならない。自分のアーマード・ドラゴンすべてに「スピードアタッカー」を与える。(「スピードアタッカー」を持つクリーチャーは召喚酔いしない)自分のターンの終わりにこのターンにバトルゾーンに出した自分の進化ではないアーマード・ドラゴンをすべて手札に戻す。'
  ];
  if(f.typeText==='クリーチャー'&&mach.includes(text))
   return {g349SummonAuras:[{filter:{g832NameIncludes:'NEX'},amount:1,g560Optional:true}],
    g208Auras:[{filter:{creature:true,race:'アーマード・ドラゴン'},grants:{speedAttacker:true}}],
    g174End:[{op:'ReturnRecentDragons832'}]};
  if(f.typeText==='呪文'&&text==='S・トリガー自分の手札を1枚裏向きにして新しいシールドとしてシールドゾーンに加えてもよい。そうした場合自分のシールドを1枚手札に加える。ただしそのシールドの「S・トリガー」能力は使えない。相手の手札を見てその中から1枚選ぶ。そのカードを裏向きにし新しいシールドとして持ち主のシールドゾーンに加えてもよい。そうした場合相手のシールドを1枚選び相手はそれを自身の手札に加える。ただしそのシールドの「S・トリガー」能力は使えない。')
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'HandShield832'},{op:'HandShield832',owner:'opponent'}]};
  if(f.typeText==='クリーチャー'&&text.replace('1枚目をすべてのプレイヤーに見せる。','1枚目を表向きにする。')==='このクリーチャーが攻撃する時自分の山札の上から1枚目を表向きにする。それがファイアー・バードであればバトルゾーンに出してもよい。それがドラゴンであれば相手のパワー4000以下のクリーチャーを1体破壊する。それが《超竜サンバースト・NEX》であればバトルゾーンにあるこのクリーチャーの上に置いてもよい。W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)')
   return {breaker:2,g34Attack:[{op:'Soulburn832'}]};
 }
 if(phase>=831&&d?.status==='complete'&&d.faces.length===1){
  const text=normalize(f.abilityText);
  if(f.typeText==='クリーチャー'&&text==='自分の他の名前に《死神》とあるクリーチャーをバトルゾーンに出した時自分の墓地からそのクリーチャーよりコストが小さく名前に《死神》とあるクリーチャーを1体選んでもよい。その選んだクリーチャーを手札に戻す。')
   return {g314OtherEntry:{who:'self',filter:{creature:true,g819CreatureNameIncludes:'死神'},g831DeathRecovery:true}};
  if(f.typeText==='進化クリーチャー(デッキ進化)'&&text==='デッキ進化-自分の山札の上から1枚目を表向きにする。そのカードがクリーチャーであればこのクリーチャーをその上に重ねつつバトルゾーンに出す。そのカードがクリーチャー以外であればこのクリーチャーを自分の手札に戻す。')
   return {g45MDeck:true,g831SingleDeckEvolution:true};
  if(f.typeText==='進化クリーチャー(究極進化)'&&text==='究極進化-自分の進化クリーチャー1体の上に置く。W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)このクリーチャーがバトルゾーンを離れる時かわりにクリーチャーではないカードを1枚手札から捨ててもよい。')
   return {ultimateEvolution:true,evolution:{evolution:true},breaker:2,g831Sunshine:true};
 }
 if(phase>=830&&d?.status==='complete'&&d.faces.length===1){
  const text=normalize(f.abilityText);
  if(f.typeText==='進化クリーチャー(マナ進化)'&&text==='マナ進化-自然のクリーチャーを1体自分のマナゾーンから選びこのクリーチャーをその上に重ねつつバトルゾーンに出す。自分の自然のクリーチャーを召喚するコストを最大2少なくしてもよい。ただしコストは1より少なくならない。')
   return {manaEvolution:true,evolution:{civilization:'自然'},g349SummonAuras:[{filter:{color:'自然'},amount:2,g560Optional:true}]};
  if(f.typeText==='進化クリーチャー'&&text==='ブロッカー進化-自分の「ブロッカー」を持つクリーチャー1体の上に置く。自分のクリーチャーがブロックした時そのクリーチャーは相手のシールドを1枚ブレイクする。')
   return {blocker:true,evolution:{blocker:true},g830AllyBlockBreak:true};
  if(['進化クリーチャー(究極進化)','進化クリーチャー'].includes(f.typeText)&&text.replace('W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)','W・ブレイカー')==='究極進化-自分の光の進化クリーチャー1体の上に置く。W・ブレイカーこのクリーチャーがタップされていて自分のシールドが1枚もない時自分はクリーチャーの攻撃を受けない。')
   return {ultimateEvolution:true,evolution:{evolution:true,civilization:'光'},breaker:2,g830MoonGuard:true};
 }
 if(phase>=829&&d?.status==='complete'&&d.faces.length===1){
  const text=normalize(f.abilityText);
  const handEvolution='手札進化-水のクリーチャーを1体自分の手札から選びこのクリーチャーをその上に重ねつつバトルゾーンに出す。';
  const drawDiscard=instruction584('カードを2枚引いてもよい。そうした場合自分の手札を2枚捨てる。');
  if(f.typeText==='進化クリーチャー(手札進化)'&&text===handEvolution+'このクリーチャーをバトルゾーンに出した時カードを2枚引いてもよい。そうした場合自分の手札を2枚捨てる。')
   return {g48HandEvolution:true,g827HandWaterEvolution:true,effect:'sixPhoto',g34Tasks:[drawDiscard]};
  if(f.typeText==='進化クリーチャー'&&text==='進化-自分のドリームメイトまたはオリジン1体の上に置く。メテオバーン-このクリーチャーが攻撃する時このクリーチャーの下にあるカードを1枚選び墓地に置いてもよい。そうした場合自分の山札の上から1枚目をマナゾーンに置く。')
   return {evolution:{any:[{race:'ドリームメイト'},{race:'オリジン'}]},g825Meteor:'ramp'};
  const romanov=[
   '究極進化-自分の進化クリーチャー1体の上に置く。このクリーチャーをバトルゾーンに出した時相手の手札を見てその中から2枚まで選び捨てさせる。W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)',
   '究極進化:進化クリーチャー1体の上に置く。W・ブレイカー(このクリーチャーはシールドを2つブレイクする)このクリーチャーが出た時相手の手札を見て2枚まで選び捨てさせる。'
  ];
  if(['進化クリーチャー(究極進化)','進化クリーチャー'].includes(f.typeText)&&romanov.includes(text))
   return {ultimateEvolution:true,evolution:{evolution:true},breaker:2,effect:'sixPhoto',
    g34Tasks:[{op:'Select',owner:'opponent',origin:'hand',n:2,optional:true,g829InspectDiscard:true,title:'相手の手札を見て、捨てさせるカードを2枚まで選ぶ'}]};
 }
 if(phase>=828&&d?.status==='complete'&&d.faces.length===1){
  const text=normalize(f.abilityText);
  const cascade=[
   'マナ進化-自然のクリーチャーを1体自分のマナゾーンから選びこのクリーチャーをその上に重ねつつバトルゾーンに出す。このクリーチャーをバトルゾーンに出した時スノーフェアリーをすべて自分のマナゾーンから手札に戻してもよい。そうした場合スノーフェアリーをすべて自分の墓地からマナゾーンに置く。',
   'マナ進化:自然のクリーチャーを1体自分のマナゾーンから選びこのクリーチャーをその上に重ねつつバトルゾーンに出す。このクリーチャーがバトルゾーンに出た時スノーフェアリーをすべて自分のマナゾーンから手札に戻してもよい。そうしたらスノーフェアリーをすべて自分の墓地からマナゾーンに置く。',
   'マナ進化:自然のクリーチャーを1体自分のマナゾーンから選びこのクリーチャーをその上に重ねつつ出す。このクリーチャーが出た時スノーフェアリーをすべて自分のマナゾーンから手札に戻してもよい。そうしたらスノーフェアリーをすべて自分の墓地からマナゾーンに置く。',
   'マナ進化:自分のマナゾーンにある自然のクリーチャー1体の上に重ねつつ出す。このクリーチャーが出た時スノーフェアリー・カードをすべて自分のマナゾーンから手札に戻してもよい。そうしたらスノーフェアリー・カードをすべて自分の墓地からマナゾーンに置く。'
  ];
  if(['進化クリーチャー(マナ進化)','進化クリーチャー'].includes(f.typeText)&&cascade.includes(text))
   return {manaEvolution:true,evolution:{civilization:'自然'},effect:'sixPhoto',g34Tasks:[{op:'FairyManaExchange828'}]};
  const shiden={creature:true,race:'ドラゴン',g819CreatureNameIncludes:'紫電'};
  if(f.typeText==='クリーチャー'&&text==='自分の名前に《紫電》とあるドラゴンが攻撃する時それよりパワーの小さい相手のクリーチャーを1体破壊する。セイバー-名前に《紫電》とあるドラゴン(自分の名前に《紫電》とあるドラゴン1体が破壊される時このクリーチャーをかわりに破壊してもよい)')
   return {g571Saver:{filter:shiden},g252AttackWatch:{who:'self',filter:shiden,g399Attacker:true,defs:[{op:'TargetBelowSource692',g828CompareAttacker:true,to:'grave'}]}};
  if(f.typeText==='呪文'&&text==='このターンバトルゾーンにある自分のクリーチャーすべてのパワーは+2000される。このターン自分のクリーチャーがバトルに勝った時負けたクリーチャーよりパワーが4000以上大きければそのクリーチャーは相手のシールドを1枚ブレイクする。')
   return {effect:'sixPhoto',g34Tasks:[{op:'GroupPower',owner:'self',filter:{creature:true},power:2000},{op:'BattleBreak828'}]};
  if(f.typeText==='クリーチャー'&&text==='ブロッカーこのクリーチャーがバトルに勝った時負けたクリーチャーよりパワーが4000以上大きければこのクリーチャーは相手のシールドを1枚ブレイクする。W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)')
   return {blocker:true,breaker:2,g828BattleBreak:true};
 }
 if(phase>=827&&d?.status==='complete'&&d.faces.length===1){
  const text=normalize(f.abilityText);
  if(f.typeText==='進化クリーチャー(手札進化)'&&text==='手札進化-水のクリーチャーを1体自分の手札から選びこのクリーチャーをその上に重ねつつバトルゾーンに出す。このクリーチャーはブロックされない。W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)')
   return {g48HandEvolution:true,g827HandWaterEvolution:true,unblockable:true,breaker:2};
  if(f.typeText==='クリーチャー'&&text==='このクリーチャーをバトルゾーンに出した時バトルゾーンにある相手のクリーチャーを1体選び持ち主の手札に戻す。このクリーチャーがバトルゾーンを離れた時相手はクリーチャーを1体自分自身の手札からバトルゾーンに出してもよい。')
   return {effect:'sixPhoto',g34Tasks:[{op:'Target',to:'hand'}],g172Leave:[{op:'OpponentSelect',origin:'hand',deploy:true,n:1,optional:true,filter:{creature:true},title:'自分の手札から出すクリーチャーを1体選ぶ（任意）'}]};
  if(f.typeText==='クリーチャー'&&text==='バトルゾーンにあるクリーチャーはすべて「スレイヤー」を得る。(「スレイヤー」を得たクリーチャーがバトルする時バトルの後相手クリーチャーを破壊する)自分のドラゴンが攻撃する時クリーチャーを1体自分の墓地から手札に戻してもよい。')
   return {g208Auras:[{filter:{creature:true},both:true,grants:{slayer:true}}],g252AttackWatch:{who:'self',filter:{creature:true,race:'ドラゴン'},defs:[{op:'Select',origin:'grave',n:1,to:'hand',optional:true,filter:{creature:true}}]}};
 }
 if(phase>=826&&d?.status==='complete'&&d.faces.length===1){
  const text=normalize(f.abilityText);
  const trigger='S・トリガー(この呪文をシールドゾーンから手札に加える時コストを支払わずにすぐ唱えてもよい)';
  if(f.typeText==='呪文'){
   if(text===trigger+'バトルゾーンにある相手のクリーチャーを1体選びタップする。バトルゾーンに自分の進化クリーチャーまたはリンクしているゴッドがあればバトルゾーンにある相手のクリーチャーをもう1体選びタップする。')
    return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'Target',tap:true,g826TapAnother:true}]};
   if(text==='この呪文を唱える時自分のマナゾーンにあるオリジンのマナの数字は1のかわりに2になる。自分の山札の上から4枚を見る。そのうちの2枚までを手札に加える。残りを好きな順序で自分の山札の一番下に戻す。')
    return {g826OriginSpellMana:true,effect:'sixPhoto',g34Tasks:[{op:'Look',n:4,rest:'bottom',g200Search:true,stages:[{n:2,to:'hand',optional:true}]}]};
  }
  if(f.typeText==='クリーチャー'&&text==='このクリーチャーをバトルゾーンに出した時バトルゾーンにある自分と相手のクリーチャーを1体ずつ選ぶ。そのターンその自分のクリーチャーに含まれるカード1枚につき選んだ相手クリーチャーのパワーは-2000される。(パワーが0以下のクリーチャーは破壊される)')
   return {effect:'sixPhoto',g34Tasks:[{op:'Target',owner:'self',g503Stack:'opponentMinus',title:'構成カードを数える自分のクリーチャーを1体選ぶ'}]};
 }
 if(phase>=825&&d?.status==='complete'&&d.faces.length===1){
  const text=normalize(f.abilityText);
  const meteor='メテオバーン-このクリーチャーが攻撃する時このクリーチャーの下にあるカードを1枚選び墓地に置いてもよい。そうした場合';
  if(f.typeText==='進化クリーチャー'){
   if(text==='進化-自分のファイアー・バードまたはオリジン1体の上に置く。'+meteor+'このクリーチャーをアンタップする。')
    return {evolution:{any:[{race:'ファイアー・バード'},{race:'オリジン'}]},g825Meteor:'untap'};
   if(text==='進化-自分の「サイバー」と種族にあるクリーチャーまたはオリジン1体の上に置く。'+meteor+'バトルゾーンにあるクリーチャーを1体選び持ち主の手札に戻す。')
    return {evolution:{any:[{race:'サイバー'},{race:'オリジン'}]},g825Meteor:'bounce'};
  }
  if(f.typeText==='進化クリーチャー(マナ進化)'&&text==='マナ進化-自然のクリーチャーを1体自分のマナゾーンから選びこのクリーチャーをその上に重ねつつバトルゾーンに出す。自分のターンの終わりに相手のマナゾーンのカードが自分より多ければ自分の山札の上から2枚をマナゾーンに置く。')
   return {manaEvolution:true,evolution:{civilization:'自然'},g174End:[{op:'IfOwn',filter:{g334ZoneCount:{zone:'mana',lessThanOpponent:true}},defs:[{op:'Ramp',n:2,g809Together:true}]}]};
  if(f.typeText==='クリーチャー'&&text==='このクリーチャーが攻撃する時次のうちいずれかひとつを選ぶ。バトルゾーンにある相手のコスト4以下の進化ではないクリーチャーを1体選び持ち主のマナゾーンに置く。相手の手札を1枚見ないで選び持ち主のマナゾーンに置く。')
   return {g34Attack:[{op:'Choose',g184Modes:true,modes:[
    {label:'相手のコスト4以下の進化ではないクリーチャーをマナに置く',defs:[{op:'Target',filter:{nonEvolution:true,max:4},to:'mana'}]},
    {label:'相手の手札を見ないで1枚選びマナに置く',defs:[{op:'BlindHandMana675'}]}
   ]}]};
 }
 if(phase>=824&&d?.status==='complete'&&d.faces.length===1){
  const text=normalize(f.abilityText);
  if(f.typeText==='クリーチャー'){
   if(text==='自分の進化クリーチャーがバトルゾーンにある時バトルゾーンにある自分のパワー3000以下のクリーチャーは攻撃されない。')
    return {g824EvolutionAttackProtection:true};
   if(text==='このクリーチャーが破壊された時バトルゾーンにある進化ではないクリーチャー1体またはリンクしていないゴッドを1体選び持ち主の手札に戻してもよい。')
    return {g172Death:[{op:'Target',anyOwner:true,optional:true,to:'hand',g824Panya:true}]};
  }
  if(f.typeText==='呪文'&&text==='ゴッドを2体まで自分のマナゾーンからバトルゾーンに出す。')
   return {effect:'sixPhoto',g34Tasks:[{op:'Select',origin:'mana',n:2,deploy:true,optional:true,filter:{creature:true,race:'ゴッド'}}]};
 }
 if(phase>=823&&d?.status==='complete'&&d.faces.length===1&&f.typeText==='クリーチャー'){
  const text=normalize(f.abilityText);
  const draw='このカードが墓地に置かれた時それが墓地に置かれる直前に進化クリーチャーの下にあった場合カードを1枚引いてもよい。';
  if(text===draw)return {g823EvolutionGraveDraw:true};
  if(text==='ブロッカーこのクリーチャーは相手プレイヤーを攻撃できない。'+draw)
   return {blocker:true,noPlayerAttack:true,g823EvolutionGraveDraw:true};
 }
 if(phase>=822&&d?.status==='complete'&&d.faces.length===1){
  const text=normalize(f.abilityText);
  if(f.typeText==='呪文'){
   if(/^(?:バトルゾーンにある)?自分のクリーチャーを1体選ぶ。そのクリーチャーに含まれるカード1枚につき相手は自身のクリーチャーを1体選んで破壊する。$/.test(text))
    return {effect:'sixPhoto',g34Tasks:[{op:'Target',owner:'self',spell:true,g503Stack:'opponentDestroy',title:'構成カードを数える自分のクリーチャーを1体選ぶ'}]};
   if(text==='相手の手札を見てその中から1枚選ぶ。相手はそのカードを捨ててもよい。もしそのカードを捨てない場合残りの手札をすべて捨てさせる。')
    return {effect:'sixPhoto',g34Tasks:[{op:'InspectHand',discard:true,chooseOne:true,g223Inspect:true,g822OpponentDiscardChoice:true}]};
  }
  if(f.typeText==='進化クリーチャー(マナ進化)'&&text==='マナ進化-自然のクリーチャーを1体自分のマナゾーンから選びこのクリーチャーをその上に重ねつつバトルゾーンに出す。このクリーチャーが破壊される時墓地に置くかわりに自分のマナゾーンに置く。')
   return {manaEvolution:true,evolution:{civilization:'自然'},destroyToMana:true};
 }
 if(phase>=821&&d?.status==='complete'&&d.faces.length===1){
  const text=normalize(f.abilityText);
  if(f.typeText==='呪文'&&text==='このターンバトルゾーンにある自分のクリーチャー1体のパワーは+3000されシールドをさらに1枚ブレイクする。そのクリーチャーが進化クリーチャーであればカードを1枚引いてもよい。')
   return {effect:'sixPhoto',g34Tasks:[{op:'Target',owner:'self',spell:true,power:3000,g455ExtraBreak:1,g821DrawIfEvolution:true}]};
  if(f.typeText==='進化クリーチャー(究極進化)'&&text==='究極進化-自分の進化クリーチャー1体の上に置く。このクリーチャーが攻撃する時カードを3枚まで引いてもよい。W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)')
   return {ultimateEvolution:true,evolution:{evolution:true},breaker:2,g34Attack:[{op:'DrawUpTo',n:3}]};
  if(f.typeText==='クリーチャー'&&text==='このクリーチャーをバトルゾーンに出した時相手の手札を1枚見ないで選び捨てさせる。このクリーチャーがバトルゾーンを離れた時相手はカードを1枚自分自身の墓地から選び手札に戻してもよい。')
   return {effect:'sixPhoto',g34Tasks:[{op:'BlindDiscard773'}],
    g172Leave:[{op:'OpponentSelect',origin:'grave',n:1,to:'hand',optional:true,title:'自分の墓地から手札に戻すカードを1枚選ぶ（任意）'}]};
 }
 if(phase>=820&&d?.status==='complete'&&d.faces.length===1){
  const text=normalize(f.abilityText);
  if(f.typeText==='クリーチャー'){
   if(/^このクリーチャー(?:をバトルゾーンに出した|が(?:バトルゾーンに)?出た)時名前に《死神》とある自分のクリーチャーを1体破壊してもよい。そうし(?:た場合|たら)相手は自身のクリーチャーを1体(?:選んで)?破壊する。$/.test(text))
    return {effect:'sixPhoto',g34Tasks:[{op:'SacrificeAlly413',filter:{g819CreatureNameIncludes:'死神'},
     defs:[{op:'OpponentSelect',n:1,to:'grave'}]}]};
   if(text==='このクリーチャーが攻撃する時自分の山札の上から1枚目を表向きにする。そのカードの名前に《白騎士》とあればそのカードを裏向きにし新しいシールドとして自分のシールドゾーンに加えてもよい。')
    return {g34Attack:[{op:'RevealTop514',filter:{g220NameAny:['白騎士']},to:'shields',optional:true}]};
  }
  if(/^進化クリーチャー(?:\(墓地進化\))?$/.test(normalize(f.typeText))&&
    /^墓地進化[-:]闇のクリーチャーを1体自分の墓地から選びこのクリーチャーをその上に重ねつつ(?:バトルゾーンに)?出す。このクリーチャーが破壊された時相手の手札を1枚見ないで選び捨てさせる。$/.test(text))
   return {evolution:{g31:true},g31Evolution:{zone:'grave',conditions:[{civilization:'闇'}]},g172Death:[{op:'BlindDiscard773'}]};
 }
 if(phase>=819&&d?.status==='complete'&&d.faces.length===1&&f.typeText==='クリーチャー'){
  const text=normalize(f.abilityText);
  if(text==='バトルゾーンにある自分の他の名前に《死神》とあるクリーチャーはすべて「スレイヤー」を得る。(「スレイヤー」を得たクリーチャーがバトルする時バトルの後相手クリーチャーを破壊する)')
   return {g208Auras:[{filter:{g819CreatureNameIncludes:'死神'},other:true,grants:{slayer:true}}]};
  if(text==='このクリーチャーをバトルゾーンに出した時バトルゾーンに自分の進化クリーチャーまたはリンクしているゴッドがなければこのクリーチャーを破壊する。')
   return {effect:'sixPhoto',g34Tasks:[{op:'IfOwn',filter:{g508EvolutionOrLink:true},defs:[],elseDefs:[{op:'SelfDestroy'}]}]};
  if(text==='このクリーチャーをバトルゾーンに出した時自分の手札からサムライまたはクロスギアを1枚選び見せる。そうしない場合このクリーチャーを破壊する。')
   return {effect:'sixPhoto',g34Tasks:[{op:'HandReveal462',max:1,filter:{faceUp:true,any:[{g819AnyFaceRace:'サムライ'},{g201Gear:true}]},
    elseDefs:[{op:'SelfDestroy'}]}]};
 }
 if(phase>=818&&d?.status==='complete'&&d.faces.length===1){
  const text=normalize(f.abilityText);
  if(f.typeText==='クリーチャー'&&text==='自分の進化クリーチャーを召喚した時カードを1枚引いてもよい。そうした場合自分の手札を1枚山札の一番下に置く。')
   return {g808SummonWatch:{g816Evolution:true,defs:[{op:'Offer',title:'カードを1枚引き、手札を1枚山札の下に置く？',
    defs:[{op:'Draw',n:1,g818AfterDraw:[{op:'Select',origin:'hand',n:1,to:'deck',g183Return:true,title:'山札の一番下に置く手札を選ぶ'}]}]}]}};
  if(f.typeText==='呪文'){
   if(text==='このターンバトルゾーンにある自分のクリーチャー1体のパワーは+3000され「W・ブレイカー」を得る。ナイト・マジック(バトルゾーンに自分のナイトがあればこの呪文の能力をもう一度使ってもよい)')
    return {effect:'sixPhoto',g70Effect:'Bakuretsu'};
   if(text==='バトルゾーンにある自分のクリーチャーを1体選ぶ。そのクリーチャーに含まれるカード1枚につき自分の山札の上から1枚を裏向きのまま新しいシールドとしてシールドゾーンに加える。')
    return {effect:'sixPhoto',g34Tasks:[{op:'Target',owner:'self',spell:true,g503Stack:'shield',title:'構成カードを数える自分のクリーチャーを1体選ぶ'}]};
  }
 }
 if(phase>=817&&d?.status==='complete'&&d.faces.length===1){
  const text=normalize(f.abilityText);
  if(f.typeText==='クリーチャー'){
   if(text==='バトルゾーンにある自分の他のナイトはすべて「スピードアタッカー」を得る。(「スピードアタッカー」を得たクリーチャーは召喚酔いしない)')
    return {g208Auras:[{filter:{creature:true,g724ExactRace:'ナイト'},other:true,grants:{speedAttacker:true}}]};
   if(text==='このクリーチャーが攻撃する時パワー3000以下のクリーチャーを1体自分のマナゾーンからバトルゾーンに出してもよい。W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)')
    return {breaker:2,g34Attack:[{op:'Select',origin:'mana',n:1,deploy:true,optional:true,filter:{faceUp:true,g228Face:{type:'creature',maxPower:3000}}}]};
  }
  if(f.typeText==='呪文'&&text==='S・トリガー(この呪文をシールドゾーンから手札に加える時コストを支払わずにすぐ唱えてもよい)名前に《白騎士》とあるクリーチャーを1体自分の手札からバトルゾーンに出してもよい。')
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'Select',origin:'hand',n:1,deploy:true,optional:true,filter:{g228Face:{type:'creature',nameAny:['白騎士']}}}]};
 }
 if(phase>=816&&d?.status==='complete'&&d.faces.length===1&&f.typeText==='クリーチャー'){
  const text=normalize(f.abilityText);
  if(text==='自分が呪文を唱えた時バトルゾーンにある相手の「ブロッカー」を持つクリーチャーを1体選ぶ。そのクリーチャーはこのターンブロックできない。')
   return {g204SpellWatch:{who:'self',defs:[{op:'Target',filter:{blocker:true},g816BlockOnly:true,title:'このターン、ブロックを止める相手クリーチャーを選ぶ'}]}};
  if(text==='自分の進化クリーチャーを召喚した時コスト3以下のクリーチャーを1体コストを支払わずに自分の手札からバトルゾーンに出してもよい。')
   return {g808SummonWatch:{g816Evolution:true,defs:[{op:'Select',origin:'hand',deploy:true,n:1,optional:true,filter:{g228Face:{type:'creature',max:3}}}]}};
  if(text==='このクリーチャーが攻撃する時自分のクロスギアを1枚バトルゾーンから墓地に置いてもよい。そうした場合カードを2枚まで引いてもよい。')
   return {g34Attack:[{op:'Target',owner:'self',element:true,filter:{g201Gear:true,faceUp:true},optional:true,
    g816GearDraw:true,title:'墓地に置く自分のクロスギアを選ぶ'}]};
 }
 if(phase>=815&&d?.status==='complete'&&d.faces.length===1&&f.typeText==='クリーチャー'){
  const text=normalize(f.abilityText);
  if(text==='S・トリガーこのクリーチャーをバトルゾーンに出した時自分の山札を見る。その中から自分のマナゾーンにある文明の数以下のコストを持つクリーチャーを1体選び相手に見せてから自分の手札に加えてもよい。その後山札をシャッフルする。')
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'Look',n:'all',g201Search:true,g200Search:true,
    stages:[{n:1,to:'hand',optional:true,reveal:true,filter:{g228Face:{type:'creature',g815ManaCivilCost:true}}}],rest:'shuffle'}]};
  if(text==='このクリーチャーをバトルゾーンに出した時バトルゾーンにあるクロスギアをすべて持ち主の墓地に置く。')
   return {effect:'sixPhoto',g34Tasks:[{op:'Sweep',both:true,to:'grave',filter:{g201Gear:true,faceUp:true},g815PutInGrave:true}]};
  if(text==='自分の墓地に呪文が1枚でもあればこのクリーチャーは「スピードアタッカー」を得る。(「スピードアタッカー」を得たクリーチャーは召喚酔いしない)')
   return {g260Self:{filter:{g273Grave:{n:1,filter:{spell:true,faceUp:true}}},grants:{speedAttacker:true}}};
 }
 if(phase>=814&&d?.status==='complete'&&d.faces.length===1&&f.typeText==='クリーチャー'){
  const text=normalize(f.abilityText);
  if(text==='S・トリガーブロッカーこのクリーチャーをバトルゾーンに出した時バトルゾーンにある相手のクロスギアを1枚選び持ち主の墓地に置いてもよい。このクリーチャーは相手プレイヤーを攻撃できない。')
   return {trigger:true,blocker:true,noPlayerAttack:true,effect:'sixPhoto',
    g34Tasks:[{op:'Target',element:true,filter:{g201Gear:true},to:'grave',optional:true,title:'墓地に置く相手のクロスギアを選ぶ'}]};
  if(text==='このクリーチャーをバトルゾーンに出した時バトルゾーンにある相手のクリーチャーを1体選びタップしてもよい。相手が自分のクリーチャーを攻撃する時その攻撃の終わりまでこのクリーチャーは「ブロッカー」を得る。')
   return {effect:'sixPhoto',g34Tasks:[{op:'Target',tap:true,optional:true}],
    g252AttackWatch:{who:'opponent',g814CreatureTarget:true,defs:[{op:'BlockForAttack814'}]}};
  if(text==='相手のクリーチャーが攻撃する時そのターンすでに自分のシールドが1枚でもブレイクされていればこのクリーチャーをアンタップする。そのターンこのクリーチャーのパワーは+5000され「ブロッカー」を得る。')
   return {g252AttackWatch:{who:'opponent',g814ShieldBroken:true,defs:[
    {op:'Untap',g191First:true},{op:'SelfBoost313',power:5000,g536Source:true},
    {op:'SelfGrant754',grant:{blocker:true}}
   ]}};
  if(text==='ブロッカーこのクリーチャーは相手プレイヤーを攻撃できない。相手のクリーチャーは攻撃1回につきシールドを1枚しかブレイクできない。')
   return {blocker:true,noPlayerAttack:true,g814OneAttackBreak:true};
 }
 if(phase>=813&&d?.status==='complete'&&d.faces.length===1&&f.typeText==='クリーチャー'){
  const text=normalize(f.abilityText);
  if(text==='自分が呪文を唱えた時バトルゾーンにある進化以外のカードを1枚持ち主の手札に戻してもよい。')
   return {g204SpellWatch:{who:'self',defs:[{op:'BattleCardMove579',anyOwner:true,g813NonEvolution:true,to:'hand',optional:true}]}};
  if(text==='「スピードアタッカー」を持つ自分のクリーチャーすべてのパワーは+2000されシールドをさらに1枚ブレイクする。')
   return {g813SpeedAura:{power:2000,extraBreak:1}};
  if(text==='マナゾーンに置く時このカードはタップして置く。自分の呪文を唱える時支払うコストを1少なくしてもよい。ただしコストは1より少なくならない。このクリーチャーが破壊された時相手の手札を1枚見ないで選び捨てさせる。')
   return {g485SpellReduction:1,g172Death:[{op:'BlindDiscard773'}]};
 }
 if(phase>=812&&d?.status==='complete'&&d.faces.length===1&&f.typeText==='クリーチャー'){
  const text=normalize(f.abilityText),keyword='シールド・プラス-';
  const plus='自分の山札の上から1枚目を裏向きのまま自分のシールドいずれかの下に置いてもよい。(こうして重ねたカードの束を1枚のシールドとみなす)';
  const defs=[{op:'ShieldPlus414'}];
  if(text===keyword+'このクリーチャーが攻撃する時'+plus+'W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)')
   return {breaker:2,g34Attack:defs};
  if(text===keyword+'このクリーチャーが相手プレイヤーを攻撃してブロックされなかった時'+plus)
   return {g482Unblocked:defs};
  if(text==='ブロッカーこのクリーチャーは相手プレイヤーを攻撃できない。'+keyword+'このクリーチャーが破壊された時'+plus)
   return {blocker:true,noPlayerAttack:true,g172Death:defs};
 }
 if(phase>=811&&d?.status==='complete'&&d.faces.length===1&&f.typeText==='クリーチャー'){
  const text=normalize(f.abilityText);
  if(text==='自分のマナゾーンからカードが離れる時そのターンこのクリーチャーのパワーは+4000される。')
   return {g811ManaDeparture:[{op:'SelfBoost313',power:4000,g536Source:true}]};
  if(text==='ターン中に自分のマナゾーンからカードが1枚でも離れていればそのターンの終わりに自分の山札の上から1枚目をマナゾーンに置いてもよい。')
   return {g811ManaLeftEnd:[{op:'Ramp',n:1,optional:true}]};
  if(text==='W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)このターン自分のマナゾーンから1枚でもカードが離れていればこのクリーチャーのパワーは+7000され「T・ブレイカー」を得る。')
   return {breaker:2,g260Self:{filter:{g811ManaLeft:true},grants:{power:7000,breaker:3,g633DoubleBreaker:true}}};
 }
 if(phase>=810&&d?.status==='complete'&&d.faces.length===1){
  const text=normalize(f.abilityText);
  if(f.typeText==='クリーチャー'){
   if(/^Q・ブレイカー\(このクリーチャーはシールドを4枚ブレイクする\)このクリーチャーが破壊される時墓地に置くかわりに山札に(?:入れて|加えて)シャッフルする。$/.test(text))
    return {breaker:4,g731DestroyShuffle:true};
   if(text==='このクリーチャーが破壊される時このクリーチャーを墓地に置くかわりに自分のシールドを1枚選び手札に加えてもよい。ただしその「S・トリガー」は使えない。')
    return {escape:true};
  }
  if(f.typeText==='呪文'&&text==='S・トリガー相手のパワー5000以下のクリーチャーを1体破壊する。バトルゾーンに自分の《ボルメテウス・武者・ドラゴン》が1体でもあれば相手のパワー5000以下のクリーチャーをもう1体破壊する。')
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'Target',to:'grave',filter:{maxPower:5000,g199Power:true},g810AnotherWith:'ボルメテウス・武者・ドラゴン'}]};
 }
 if(phase>=809&&d?.status==='complete'&&d.faces.length===1&&f.typeText==='呪文'){
  const text=normalize(f.abilityText).replace(/^S・トリガーS・トリガー/,'S・トリガー');
  const trigger=/^S・トリガー(?:\(この(?:呪文|カード)をシールドゾーンから手札に加える時コストを支払わずにすぐ(?:唱えて|実行して)もよい\))?/;
  const body=text.replace(trigger,'');
  if(body!==text&&(/^自分の山札を見る。その中からゴッドを1体選び相手に見せてもよい。その後山札をシャッフルし(?:て)?選んだカードを山札の一番上に置く。$/.test(body)||
     body==='自分の山札を見る。その中からゴッド・クリーチャーを1体表向きにしてもよい。その後山札をシャッフルしそのカードを山札の上に置く。'))
   return {trigger:true,effect:'champion',g54Effect:'GodSignal'};
  if(body!==text&&body==='自分のクリーチャーを1体破壊する。その後そのクリーチャーが持っていた文明の数だけ自分の山札の上からカードをマナゾーンに置く。')
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'Target',owner:'self',g809RampByCivilizations:true}]};
 }
 if(phase>=808&&d?.status==='complete'&&d.faces.length===1&&f.typeText==='クリーチャー'){
  const lines=f.abilityText.split('\n').map(normalize);
  const attack=lines.find(text=>/^このクリーチャーが攻撃する時自分のシールドを(?:1枚|1つ|ひとつ)墓地に置いてもよい。そうした(?:場合|ら)相手のパワー6000以下のクリーチャーを1体破壊する。$/.test(text));
  if(lines.length===2&&attack&&lines.some(text=>/^W・ブレイカー(?:\(このクリーチャーはシールドを2枚ブレイクする\))?$/.test(text)))
   return {breaker:2,g34Attack:[{op:'ShieldGrave',optional:true,then:[{op:'Target',to:'grave',filter:{maxPower:6000,g199Power:true}}]}]};
  let watch;
  if(lines.length===1&&lines[0]==='自分が多色の呪文を唱えた時または多色クリーチャーを召喚した時カードを1枚引いてもよい。')
   watch={multicolor:true,defs:[{op:'Draw',n:1,optional:true}]};
  if(lines.length===1&&lines[0]==='自分の水闇火または自然のクリーチャーを召喚した時あるいは自分の水闇火または自然の呪文を唱えた時そのターンこのクリーチャーのパワーは+2000される。')
   watch={colorsAny:['水','闇','火','自然'],defs:[{op:'SelfBoost313',power:2000,g536Source:true}]};
  if(watch)return {g204SpellWatch:{who:'self',...watch},g808SummonWatch:watch};
 }
 if(phase>=807&&d?.status==='complete'&&d.faces.length===1&&f.typeText==='クリーチャー'){
  const manaTap='マナゾーンに置く時このカードはタップして置く。';
  const text=normalize(f.abilityText);
  if(f.civilizations.length>1&&text===manaTap+'このクリーチャーをバトルゾーンに出した時自分の山札の上から1枚目を表向きにする。そのカードが多色でなければ自分のシールドを1枚選び墓地に置く。W・ブレイカー')
   return {breaker:2,effect:'sixPhoto',g34Tasks:[{op:'RevealTop514',filter:{g223Multicolor:true},elseDefs:[{op:'ShieldGrave'}]}]};
  const tobi=text.replace(/ブロッカーブロッカー(?:\(このクリーチャーをタップして相手クリーチャーの攻撃先をこのクリーチャーに変更してもよい\))?/,'ブロッカー');
  if(f.civilizations.length>1&&(tobi===manaTap+'ブロッカーこのクリーチャーは相手プレイヤーを攻撃できない。自分のマナゾーンにカードを置いた時バトルゾーンにある相手のクリーチャーを1体選びタップしてもよい。'||
     tobi===manaTap+'ブロッカーこのクリーチャーは相手プレイヤーを攻撃できない。自分のマナゾーンにカードを置いた時相手のクリーチャーを1体選びタップしてもよい。'))
   return {blocker:true,noPlayerAttack:true,g807ManaEntry:[{op:'Target',tap:true,optional:true}]};
  if(f.civilizations.length>1&&text===manaTap+'このクリーチャーが攻撃する時その攻撃の終わりまでこのクリーチャーは「W・ブレイカー」を得てもよい。そうした場合その攻撃の後このクリーチャーを破壊する。')
   return {g34Attack:[{op:'Offer',title:'この攻撃でW・ブレイカーを得る？',defs:[{op:'AttackDoubleBreaker807'},{op:'AfterAttack542',defs:[{op:'SelfDestroy'}]}]}]};
 }
 if(phase>=806&&d?.status==='complete'&&d.faces.length===1&&f.typeText==='クリーチャー'){
  const text=normalize(f.abilityText);
  if(text==='マナゾーンに置く時このカードはタップして置く。このクリーチャーはこのクリーチャーと同じ文明を持つクリーチャーに攻撃またはブロックされない。W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)')
   return {breaker:2,g806CivilizationProtection:'self'};
  if(text==='このクリーチャーはバトルゾーンにある自分のクリーチャーと同じ文明を持つクリーチャーから攻撃またはブロックされない。')
   return {g806CivilizationProtection:'team'};
  if(text==='S・トリガー(このクリーチャーをシールドゾーンから手札に加える時コストを支払わずにすぐ召喚してもよい)このクリーチャーをバトルゾーンに出した時バトルゾーンまたはマナゾーンにある自分の多色カードを1枚アンタップしてもよい。')
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'Select',zones:['battle','mana'],n:1,optional:true,g806MultiUntap:true,title:'アンタップする自分の多色カードを1枚選ぶ'}]};
 }
 if(phase>=805&&d?.status==='complete'&&d.faces.length===1&&f.typeText==='クリーチャー'){
  const text=normalize(f.abilityText);
  if(text==='このクリーチャーで攻撃するかわりにタップして次の能力を使ってもよい。バトルゾーンにある自分のクリーチャーを1体選ぶ。このターンそのクリーチャーに好きな文明をひとつ追加する。')
   return {g736AttackInstead:true,g439Tap:[{op:'Target',owner:'self',g805AddCivilization:true}]};
  if(text==='このクリーチャーをバトルゾーンに出した時文明をひとつ選ぶ。それ以外の文明を持つクリーチャーをすべてタップする。')
   return {effect:'sixPhoto',g34Tasks:[{op:'ChooseCivilization805'}]};
  if(text==='ブロッカーこのクリーチャーは相手プレイヤーを攻撃できない。バトルゾーンに相手の多色カードが1枚もない時このクリーチャーのパワーは+4000される。')
   return {blocker:true,noPlayerAttack:true,g260Self:{filter:{g805NoOpponentMulti:true},grants:{power:4000}}};
 }
 if(phase>=804&&d?.status==='complete'&&d.faces.length===1&&f.typeText==='クリーチャー'){
  const text=normalize(f.abilityText);
  const ability=text.match(/^(ブロッカー)?このクリーチャーで攻撃するかわりにこのクリーチャーと自分のマナゾーンのタップされていないカード(?:を8枚|8枚を)タップして次の能力を使ってもよい。(.+)$/);
  if(ability){
   const [,blocker,body]=ability;
   const effects={
    '相手の手札を見てその中から1枚選び捨てさせる。':{op:'InspectOne258'},
    '呪文を1枚自分の墓地から手札に戻す。':{op:'Select',origin:'grave',to:'hand',n:1,filter:{g228Face:{type:'spell'}}},
    'カードを1枚マナゾーンから持ち主の手札に戻す。':{op:'Select',anyOwner:true,origin:'mana',to:'hand',n:1},
    ...(phase>=923?{'バトルゾーンにある自分のクリーチャーを1体選ぶ。このターンそのクリーチャーのパワーは+6000され「W・ブレイカー」を得る。':
     {op:'Target',owner:'self',power:6000,grant:{g313Breaker:2,g633DoubleBreaker:true}}}:{}),
    ...(phase>=924?{'水以外の文明をひとつ選び自分の山札の上から2枚を表向きにする。その中から選んだ文明のカードを手札に加え残りのカードを好きな順序で山札の一番下に戻す。':
     {op:'ChooseCivilization805',g924DepthReveal:true}}:{})
   };
   if(effects[body])return {...(blocker?{blocker:true}:{}),g736AttackInstead:true,g804ManaTapCost:8,g439Tap:[effects[body]]};
  }
 }
 if(phase>=803&&d?.status==='complete'&&d.faces.length===1){
  const text=normalize(f.abilityText);
  if(f.typeText==='呪文'){
   const body=text.replace(/^マナゾーンに置く時このカードはタップして置く。/,'');
   if(body==='S・トリガー相手のクリーチャーを1体破壊する。その後相手の墓地からクリーチャーを1体選ぶ。相手はそれをバトルゾーンに出す。')
    return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'Target',to:'grave',spell:true},
     {op:'Select',owner:'opponent',origin:'grave',n:1,filter:{creature:true},g803DeployForOwner:true}]};
   if(body==='自分のマナゾーンから「S・トリガー」付きの呪文を1枚選ぶ。その呪文をコストを支払わずに唱えてもよい。'||
      body==='自分のマナゾーンから「S・トリガー」を持つ呪文を1枚選ぶ。その呪文をコストを支払わずに唱えてもよい。')
    return {effect:'sixPhoto',g34Tasks:[{op:'ManaTriggerCast803'}]};
  }
  if(f.typeText==='クリーチャー'&&text==='このクリーチャーをバトルゾーンに出した時自分の手札を1枚相手に選ばせそれを見せる。それが多色カードの場合そのターンこのクリーチャーは「スピードアタッカー」を得る。')
   return {effect:'sixPhoto',g34Tasks:[{op:'BlindReveal803'}]};
 }
 if(phase>=802&&d?.status==='complete'&&d.faces.length===1&&f.typeText==='クリーチャー'){
  const text=normalize(f.abilityText);
  if(text==='スレイヤー(このクリーチャーがバトルする時バトルの後相手クリーチャーを破壊する)このクリーチャーが攻撃する時自分のマナゾーンにある水のカードを2枚タップしてもよい。そうした場合そのターンこのクリーチャーはブロックされない。')
   return {slayer:true,g34Attack:[{op:'TapManaColors698',colors:['水','水'],
    defs:[{op:'SelfGrant754',grant:{unblockable:true}}]}]};
  if(text==='このクリーチャーが攻撃する時自分のマナゾーンのタップされていない闇または自然のカードを2枚タップしてもよい。そうしない場合このクリーチャーを破壊する。W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)'){
   const eligible=['闇','自然'];
   return {breaker:2,g34Attack:[{op:'TapManaColors698',colors:[eligible,eligible],defs:[],elseDefs:[{op:'SelfDestroy'}]}]};
  }
  if(text==='ブロッカーこのクリーチャーは相手プレイヤーを攻撃できない。このクリーチャーが破壊された時自分の山札を見る。その中から「S・トリガー」付き呪文を1枚選び相手に見せてから自分の手札に加えてもよい。その後山札をシャッフルする。')
   return {blocker:true,noPlayerAttack:true,g172Death:[{op:'Look',g201Search:true,g200Search:true,n:'all',rest:'shuffle',
    stages:[{n:1,to:'hand',filter:{g228Face:{type:'spell',shieldTrigger:true}},reveal:true,optional:true}]}]};
 }
 if(phase>=801&&d?.status==='complete'&&d.faces.length===1){
  const text=normalize(f.abilityText);
  const untapAtEnd={op:'Schedule537',when:'turnEnd',defs:[{op:'Untap',g191First:true}]};
  if(f.typeText==='クリーチャー'){
   if(text==='このクリーチャーが攻撃する時自分のマナゾーンにある光のカードを2枚タップしてもよい。そうした場合そのターンの終わりにこのクリーチャーをアンタップする。')
    return {g34Attack:[{op:'TapManaColors698',colors:['光','光'],defs:[untapAtEnd]}]};
   if(text==='このクリーチャーが水または闇のクリーチャーを攻撃する時このターンこのクリーチャーのパワーは+3000されターンの終わりにアンタップされる。')
    return {g801DefenderFilter:{any:[{color:'水'},{color:'闇'}]},g691AttackCreature:[{op:'SelfBoost313',power:3000,g536Source:true},untapAtEnd]};
  }
  if(f.typeText==='呪文'&&text==='マナゾーンに置く時このカードはタップして置く。S・トリガーこのターンの終わりにバトルゾーンでタップされているクリーチャー1体につきカードを1枚引いてもよい。')
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'Schedule537',when:'turnEnd',spell:true,
    defs:[{op:'CountDraw',zone:'battle',owner:'both',filter:{creature:true,tapped:true},optional:'each'}]}]};
 }
 if(phase>=800&&d?.status==='complete'&&d.faces.length===1&&f.typeText==='クリーチャー'){
  const text=normalize(f.abilityText);
  const match=text.match(/^このクリーチャーが攻撃する時自分のマナゾーン(?:にある|の)(火|自然|闇)のカードを2枚タップしてもよい。そうした場合(.+)$/);
  if(match){
   const [,color,body]=match;
   const effect={
    火:{text:'相手の「ブロッカー」を持つクリーチャーを1体破壊する。',def:{op:'Target',to:'grave',filter:{blocker:true}}},
    自然:{text:'そのターンこのクリーチャーのパワーは+3000される。',def:{op:'SelfBoost313',power:3000,g536Source:true}},
    闇:{text:'相手の手札を見てその中から1枚選び捨てさせる。',def:{op:'InspectOne258'}}
   }[color];
   if(body===effect.text)return {g34Attack:[{op:'TapManaColors698',colors:[color,color],defs:[effect.def]}]};
  }
 }
 if(phase>=799&&d?.status==='complete'&&d.faces.length===1&&f.typeText==='クリーチャー'){
  const text=normalize(f.abilityText);
  const hyper='ハイパーエナジー(このクリーチャーを召喚する時コストが異なる自分のクリーチャーを好きな数タップしてもよい。こうしてタップしたクリーチャー1体につきこのクリーチャーの召喚コストを2少なくする。ただしコストは0以下にはならない)';
  const yobi='ヨビニオン(このクリーチャーが召喚によって出た時自分の山札の上からこれよりコストが小さいクリーチャーが出るまで表向きにしてもよい。そのクリーチャーを出す。残りをシャッフルし山札の下に置く)';
  const doubleYobi='W・ヨビニオン(このクリーチャーが召喚によって出た時自分の山札の上からこれよりコストが小さいクリーチャーが2体出るまで表向きにしてもよい。その2体を出す。残りをシャッフルし山札の下に置く)';
  if(text.replace(hyper,'ハイパーエナジー')==='ハイパーエナジーマッハファイターT・ブレイカー各ターンはじめてクリーチャーが自分を攻撃する時このクリーチャーとそのクリーチャーをバトルさせてもよい。相手のターン中にこのクリーチャーが離れた時コスト7以下のクリーチャーを1体自分のマナゾーンから出してもよい。')
   return {hyperEnergy:true,machFighter:true,breaker:3,g252AttackWatch:{who:'opponent',playerAttack:true,g799FirstPlayer:true,g399Attacker:true,defs:[{op:'FightAttacker798'}]},
    g601OpponentLeave:true,g172Leave:[{op:'Select',origin:'mana',deploy:true,optional:true,n:1,filter:{creature:true,max:7}}]};
  if(text==='W・ブレイカー自分のクリーチャーすべてに「マッハファイター」を与える。'+doubleYobi)
   return {breaker:2,g799DoubleYobi:true,g208Auras:[{filter:{creature:true},grants:{machFighter:true}}]};
  if(text==='W・ブレイカー'+yobi+'自分のクリーチャーすべてに「スピードアタッカー」と「ガードマン」を与える。このクリーチャーが攻撃する時相手のパワー4000以下のクリーチャーを1体選び破壊する。')
   return {breaker:2,yobinion:true,g208Auras:[{filter:{creature:true},grants:{speedAttacker:true,guardman:true}}],
    g34Attack:[{op:'Target',to:'grave',filter:{maxPower:4000,g199Power:true}}]};
 }
 if(phase>=798&&d?.status==='complete'&&d.faces.length===1&&f.typeText==='クリーチャー'){
  const text=normalize(f.abilityText),gs='{GS}G・ストライク';
  const gsFull=gs+'(このクリーチャーを自分のシールドゾーンから手札に加える時表向きにし相手のクリーチャーを1体選んでもよい。このターンそのクリーチャーは攻撃できない)';
  const guard='ガードマン(このクリーチャーをタップして相手クリーチャーの攻撃先を自分の他のクリーチャーからこのクリーチャーに変更してもよい)';
  if(text===gsFull+guard+'このクリーチャーは相手プレイヤーを攻撃できない。相手のクリーチャーが出たターンに攻撃する時このクリーチャーとバトルさせてもよい。')
   return {gStrike:true,guardman:true,noPlayerAttack:true,g252AttackWatch:{who:'opponent',entryTurn:true,g399Attacker:true,defs:[{op:'FightAttacker798'}]}};
  if(text===gs+'各ターンに一度クリーチャーがプレイヤーを攻撃する時そのクリーチャー以下のコストのクリーチャーを1体自分の手札から出してもよい。')
   return {gStrike:true,g252AttackWatch:{who:'both',playerAttack:true,g399Attacker:true,defs:[{op:'AttackHandDeploy798',g792Once:'gajiraDeploy'}]}};
  const attack='このクリーチャーが攻撃する時自分の山札の上から3枚を表向きにする。その中からコスト6以下で自分のどのクリーチャーともコストが異なるクリーチャーを好きな数出してもよい。残りをすべて墓地に置く。';
  const bara='バラバラエティ5:クリーチャーがプレイヤーを攻撃する時自分のクリーチャーをすべてアンタップする。(コストが異なる自分のエレメントが5つ以上あればこのクリーチャーにこの能力を与える)';
  if(text==='スピードアタッカーW・ブレイカー'+attack+bara)
   return {speedAttacker:true,breaker:2,g34Attack:[{op:'LookDeploy530',n:3,public:true,g798DifferentCost:6,rest:'grave'}],
    g260Self:{filter:{g466DistinctCosts:5},grants:{g252AttackWatch:{who:'both',playerAttack:true,defs:[{op:'GroupUntap'}]}}}};
 }
 if(phase>=797&&d?.status==='complete'&&d.faces.length===1){
  const creatureHyper='ハイパーエナジー(このクリーチャーを召喚する時コストが異なる自分のクリーチャーを好きな数タップしてもよい。こうしてタップしたクリーチャー1体につきこのクリーチャーの召喚コストを2少なくする。ただしコストは0以下にはならない)';
  const spellHyper='ハイパーエナジー(この呪文を唱える時コストが異なる自分のクリーチャーを好きな数タップしてもよい。こうしてタップしたクリーチャー1体につきこの呪文のコストを2少なくする。ただしコストは0以下にはならない)';
  const text=normalize(f.abilityText),hyper='ハイパーエナジー';
  const body=text.replace(creatureHyper,hyper).replace(spellHyper,hyper).replace('(パワー0以下のクリーチャーは破壊される)','');
  const block=hyper+'ブロッカーブロッカー';
  if(f.typeText==='呪文'&&body===hyper+'自分の山札の上から5枚を墓地に置いてもよい。そうしたら相手のクリーチャーを1体選ぶ。このターンそのクリーチャーのパワーを自分の墓地にあるカード1枚につき-1000する。')
   return {hyperEnergy:true,effect:'sixPhoto',g34Tasks:[{op:'Offer',g186GraveMill:true,title:'山札の上5枚を墓地に置く？',defs:[
    {op:'Mill',n:5},{op:'CountPower561',zone:'grave',filter:{},amount:-1000,defs:[{op:'Target',g242PowerMinus:true,g561Scale:true,power:1,spell:true}]}
   ]}]};
  if(f.typeText==='クリーチャー'&&body===block+'W・ブレイカーこのクリーチャーが出た時または攻撃する時自分の他のクリーチャーを1体選んでもよい。次の自分のターンのはじめまでそのクリーチャーは離れない。'){
   const protect={op:'Target',owner:'self',g179Other:true,optional:true,g797Stay:true,title:'次の自分のターンのはじめまで離れなくするクリーチャーを選ぶ'};
   return {hyperEnergy:true,blocker:true,breaker:2,effect:'sixPhoto',g34Tasks:[protect],g34Attack:[protect]};
  }
  if(f.typeText==='クリーチャー'&&body===block+'パワード・ブレイカー(このクリーチャーはそのパワー6000ごとにシールドをさらに1つブレイクする)このクリーチャーがタップした時このターン自分の他のタップしているクリーチャー1体につきこのクリーチャーのパワーを+3000する。')
   return {hyperEnergy:true,blocker:true,poweredBreaker:true,g188Tapped:[{
    op:'CountPower561',zone:'battle',filter:{tapped:true},g179Other:true,amount:3000,
    defs:[{op:'SelfBoost313',g536Source:true,g561Scale:true,power:1}]
   }]};
 }
 if(phase>=796&&d?.status==='complete'&&d.faces.length===1&&f.typeText==='タマシード'){
  const front=normalize(f.abilityText).replaceAll('▶︎','▶')
   .replace('シンカライズ(このタマシードがクリーチャーであるかのようにこの上に進化クリーチャーを置いてもよい)','シンカライズ:このタマシードがクリーチャーであるかのようにこの上に進化クリーチャーを置いてもよい。')
   .replace('山札の上から1枚を見る','山札の上から1枚目を見る')
   .replace('次の中から1回選ぶ。','次のうちいずれか1つを選ぶ。')
   .replace('プレイヤー1人の墓地にあるカード','プレイヤー1人の墓地のカード')
   .replace('自身の山札の上から1枚をマナゾーンに置く','自身の山札の上から1枚目をマナゾーンに置く');
  const base={gStrike:true,shinkalize:true,runeUntap:true,effect:'sixPhoto'};
  const gs='{GS}G・ストライク',shinkalize='シンカライズ',reminder=':このタマシードがクリーチャーであるかのようにこの上に進化クリーチャーを置いてもよい。';
  const untap='このカードを自分の手札からマナゾーンに置いた時アンタップする。';
  const entry='このタマシードが出た時';
  if(front===gs+shinkalize+reminder+entry+'自分の山札の上から1枚目を見る。それをシールド化するか手札に加えるかあるいはマナゾーンに置く。'+untap)
   return {...base,g34Tasks:[{op:'Look',n:1,stages:[{n:1,g467Destinations:['shields','hand','mana']}],rest:'top'}]};
  if(front===gs+shinkalize+reminder+entry+'カードを1枚引く。その後コスト3以下のコマンドを1つ自分の手札またはマナゾーンから出してもよい。'+untap)
   return {...base,g34Tasks:[{op:'Draw',n:1},{op:'Select',zones:['hand','mana'],n:1,deploy:true,optional:true,filter:{element:true,race:'コマンド',max:3}}]};
  const claw=entry+'次のうちいずれか1つを選ぶ。▶プレイヤー1人の墓地のカードを好きな枚数選ぶ。その持ち主はそれらのカードをシャッフルし山札の下に置く。▶コスト4以下のエレメントを1つまたはマナゾーンにあるカードを1枚選び持ち主の山札の下に置く。そのカードの持ち主は自身の山札の上から1枚目をマナゾーンに置く。';
  if(front===gs+shinkalize+claw+untap)return {...base,g34Tasks:[{op:'Choose',g184Modes:true,modes:[
   {label:'選んだ墓地のカードをシャッフルして山札の下に置く',defs:[{op:'GravePick598',mode:'shuffleBottom'}]},
   {label:'エレメントまたはマナを山札の下に置き、持ち主がマナを置く',defs:[{op:'ElementOrMana796',max:4}]}
  ]}]};
 }
 if(phase>=795&&d?.status==='complete'&&d.faces.length===1&&f.typeText==='クリーチャー'){
  const front=normalize(f.abilityText),blocker='ブロッカーブロッカー';
  const interstellar=blocker+'ジャストダイバーW・ブレイカーこのクリーチャーが出た時水または闇のコスト7以下の呪文を1枚自分の手札または墓地からコストを支払わずに唱えてもよい。そうしたらそれを唱えた後墓地のかわりに自分の超次元ゾーンに置く。このクリーチャーが攻撃する時呪文を1枚自分の超次元ゾーンからコストを支払わずに唱えてもよい。そうしたらそれを唱えた後墓地のかわりに山札の下に置く。';
  if(front===interstellar||front===interstellar.replace('墓地のかわりに自分の超次元ゾーン','墓地のかわりに超次元ゾーン'))return {blocker:true,justDiver:true,breaker:2,effect:'sixPhoto',
   g34Tasks:[{op:'Execute',zones:['hand','grave'],spellOnly:true,max:7,spellColorsAny:['水','闇'],g555FinishTo:'extra'}],
   g34Attack:[{op:'Execute',origin:'extra',spellOnly:true,g555FinishTo:'deck'}]};
  const revenge='リベンジ・チャンス:各ターンの終わりに相手のコスト9以上またはパワー15000以上のクリーチャーがあればこのクリーチャーをコストを支払わずに召喚してもよい。';
  if(front===revenge+blocker+'W・ブレイカーこのクリーチャーがタップした時相手のクリーチャーを1体選び破壊する。その後その選んだクリーチャー以下のコストの進化ではないクリーチャーを1体自分の墓地から出してもよい。')
   return {blocker:true,breaker:2,g795Revenge:{any:[{min:9},{minPower:15000}],g199Power:true},g188Tapped:[{op:'Target',g786ReviveAtCost:true,g795OptionalNonEvolution:true}]};
  const hyper='ハイパーエナジー(このクリーチャーを召喚する時コストが異なる自分のクリーチャーを好きな数タップしてもよい。こうしてタップしたクリーチャー1体につきこのクリーチャーの召喚コストを2少なくする。ただしコストは0以下にはならない)';
  if(front===hyper+'マッハファイターT・ブレイカーこのクリーチャーが出た時相手のシールドを1つ選び持ち主のマナゾーンに置く。その後こうしてマナゾーンに置いたカードのいずれかよりコストが小さいクリーチャーを1体自分のマナゾーンから出してもよい。')
   return {hyperEnergy:true,machFighter:true,breaker:3,effect:'sixPhoto',g34Tasks:[{op:'ShieldMana557',g795DeployBelow:true}]};
 }
 if(phase>=794&&d?.status==='complete'&&d.faces.length===1){
  const front=normalize(f.abilityText);
  const gs='{GS}G・ストライク(この呪文を自分のシールドゾーンから手札に加える時表向きにし相手のクリーチャーを1体選んでもよい。このターンそのクリーチャーは攻撃できない)';
  if(f.typeText==='呪文'&&front===gs+'相手の手札を1枚見ないで選び捨てさせる。カードを2枚引く。相手は自身のクリーチャーを3体選び破壊する。次の相手のターンのはじめに相手は自身のマナゾーンにあるカードを4枚までしかアンタップできない。')
   return {gStrike:true,effect:'sixPhoto',g34Tasks:[{op:'BlindDiscard773'},{op:'Draw',n:2},
    {op:'OpponentSelect',n:3,to:'grave'},{op:'StartManaLimit794',max:4}]};
  if(f.typeText==='クリーチャー'){
   const joker='相手のクリーチャーの能力または呪文によってこのクリーチャーが自分の手札から捨てられる時墓地に置くかわりに出してもよい。ブロッカーブロッカー(このクリーチャーをタップして相手クリーチャーの攻撃先をこのクリーチャーに変更してもよい)このクリーチャーが出た時プレイヤーを1人選んでもよい。そのプレイヤーは自身の墓地にあるカードをすべて山札に加えてシャッフルする。その後自分はカードを2枚引く。';
   if(front===joker)return {blocker:true,g591Discard:'opponentEffect',effect:'sixPhoto',
    g34Tasks:[{op:'GraveShuffle545',optional:true},{op:'Draw',n:2}]};
   const change='革命チェンジ:光または火のコスト5以上のドラゴン';
   const reminder='(自分の光または火のコスト5以上のドラゴンが攻撃する時そのクリーチャーと手札にあるこのクリーチャーを入れ替えてもよい)';
   const rainbow='W・ブレイカー自分の名前に《ボルメテウス》とあるクリーチャーすべてに「スピードアタッカー」を与える。このクリーチャーが出た時このクリーチャーは自分のシールドを1つブレイクしてもよい。自分のシールドゾーンにあるコスト7以下のドラゴン';
   if([reminder,''].some(r=>['','・カード'].some(n=>front===change+r+rainbow+n+'すべてに「S・トリガー」を与える。')))
    return {rev:{colors:['光','火'],min:5},breaker:2,g208Auras:[{filter:{creature:true,g227NameIncludes:'ボルメテウス'},grants:{speedAttacker:true}}],
     g794DragonShieldTrigger:7,effect:'sixPhoto',g34Tasks:[{op:'Break497',owner:'self',n:1,optional:true,g747CreatureBreak:true}]};
  }
 }
 if(phase>=793&&d?.status==='complete'&&d.faces.length===1){
  const front=normalize(f.abilityText),trigger='S・トリガーS・トリガー';
  if(f.typeText==='呪文'){
   if(front===trigger+'クリーチャーを1体選んでもよい。このターンそのクリーチャーのパワーを+6000し「パワード・ブレイカー」を与える。(「パワード・ブレイカー」を持つクリーチャーはそのパワー6000ごとにシールドをさらに1つブレイクする)相手のクリーチャーを1体選んでもよい。このターンそのクリーチャーのパワーを-6000する。(パワーが0以下のクリーチャーは破壊される)')
    return {trigger:true,effect:'sixPhoto',g34Tasks:[
     {op:'Target',anyOwner:true,optional:true,power:6000,g301Grant:true,grant:{poweredBreaker:true},spell:true},
     {op:'Target',optional:true,power:-6000,spell:true}
    ]};
   if(front===trigger+'次のうちいずれか1つを選ぶ。▶相手のパワー6000以下のクリーチャーを1体選び破壊する。その後相手のクリーチャーをすべてタップする。▶光または火のコスト7以下のドラゴン・クリーチャーを1体自分の手札から出す。次の自分のターンのはじめまでそのクリーチャーに「ブロッカー」を与える。その後相手のクリーチャーを1体選んでもよい。その2体をバトルさせる。')
    return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'Choose',g184Modes:true,modes:[
     {label:'パワー6000以下の相手1体を破壊し、相手のクリーチャーをすべてタップ',defs:[
      {op:'Target',to:'grave',filter:{maxPower:6000,g199Power:true}},{op:'TapAll'}
     ]},
     {label:'光または火のドラゴンを出し、ブロッカーを与えてバトル',defs:[{
      op:'Select',origin:'hand',deploy:true,n:1,filter:{creature:true,max:7,race:'ドラゴン',any:[{color:'光'},{color:'火'}]},
      g791Grant:{blocker:true},g793FightOnEntry:true
     }]}
    ]}]};
  }
  if(f.typeText==='クリーチャー'&&front==='シンパシー:スノーフェアリー(自分のスノーフェアリー1つにつきこのクリーチャーの召喚コストを1少なくする。ただしコストは0以下にはならない)マッハファイターT・ブレイカーこのクリーチャーが出た時カードを3枚まで引く。自分のスノーフェアリー・クリーチャーすべてに「セイバー:スノーフェアリー」を与える。(自分のスノーフェアリーが破壊される時「セイバー:スノーフェアリー」を持つクリーチャーをかわりに破壊してもよい)')
   return {machFighter:true,breaker:3,effect:'sixPhoto',g34Tasks:[{op:'DrawUpTo',n:3}],
    g211Sympathy:{amount:1,minimum:1,elements:true,filter:{race:'スノーフェアリー'}},
    g208Auras:[{filter:{creature:true,race:'スノーフェアリー'},grants:{g793SnowSaver:true}}]};
 }
 if(phase>=792&&d?.status==='complete'&&d.faces.length===1){
  const front=normalize(f.abilityText),lightNature=['光','自然'];
  const anyCivilization=lightNature.map(color=>({color}));
  if(f.typeText==='進化クリーチャー'&&front==='このクリーチャーを自分のマナゾーンから召喚してもよい。進化:光または自然のクリーチャー1体の上に置く。T・ブレイカーこのクリーチャーが出た時エレメントを1つ選びシールド化してもよい。自分の他のクリーチャーすべてのパワーを+6000し「パワード・ブレイカー」を与える。')
   return {manaSummon:true,evolution:{any:lightNature.map(civilization=>({civilization}))},breaker:3,effect:'sixPhoto',
    g34Tasks:[{op:'Target',anyOwner:true,element:true,to:'shields',optional:true}],
    g205Aura:{filter:{creature:true},other:true,power:6000},
    g208Auras:[{filter:{creature:true},other:true,grants:{poweredBreaker:true}}]};
  if(f.typeText==='クリーチャー'&&front==='ブロッカーブロッカー各ターンに一度自分の他のクリーチャーが出た時カードを1枚引いてもよい。各ターンに一度自分のクリーチャーが攻撃する時自分の山札の上から1枚目をマナゾーンに置いてもよい。そうしたら光または自然のコスト3以下のクリーチャーを1体自分のマナゾーンから出してもよい。')
   return {blocker:true,g314OtherEntry:{who:'self',defs:[{op:'Offer',g792Once:'draw',title:'カードを1枚引く？',defs:[{op:'Draw',n:1}]}]},
    g252AttackWatch:{who:'self',filter:{creature:true},defs:[{op:'Offer',g792Once:'ramp',title:'山札の上1枚をマナに置く？',
     defs:[{op:'Ramp',n:1,after:[{op:'Select',origin:'mana',deploy:true,n:1,optional:true,filter:{creature:true,max:3,any:anyCivilization}}]}]}]}};
  if(f.typeText==='クリーチャー'&&front==='G・G・G:自分の手札が1枚以下で自分の《ミリオンブレイブ・カイザー》がなければこのクリーチャーをコストを支払わずに召喚してもよい。スピードアタッカーW・ブレイカー自分のターンのバトル中このクリーチャーのパワーを+1000000する。各ターン相手のクリーチャーがはじめて攻撃する時可能ならこのクリーチャーを攻撃する。')
   return {speedAttacker:true,breaker:2,g209BattlePower:{amount:1000000,ownTurn:true},g792FirstAttackTarget:true,
    g396Zero:{label:'G・G・G',all:[{g334ZoneCount:{zone:'hand',max:1}},{g792AbsentAlly:'ミリオンブレイブ・カイザー'}]}};
 }
 if(phase>=791&&d?.status==='complete'){
  const front=normalize(f.abilityText),trigger='S・トリガーS・トリガー';
  const handCreature={op:'Select',origin:'hand',deploy:true,n:1,optional:true};
  if(d.faces.length===1&&f.typeText==='呪文'){
   const strike=/^\{GS\}G・ストライク\(この(?:呪文|カード)を自分のシールドゾーンから手札に加える時表向きにし相手のクリーチャーを1体選んでもよい。このターンそのクリーチャーは攻撃できない\)/;
   if(strike.test(front)&&front.replace(strike,'')==='カードを2枚引く。光または水の「ブロッカー」を持つ進化ではないクリーチャーを1体自分の手札から出してもよい。')
    return {gStrike:true,effect:'sixPhoto',g34Tasks:[{op:'Draw',n:2},{...handCreature,
     filter:{creature:true,nonEvolution:true,blocker:true,any:[{color:'光'},{color:'水'}]}}]};
   if(front===trigger+'自分の山札の上から3枚を表向きにする。その中から光のクリーチャー自然のクリーチャーを1体ずつ手札に加えてもよい。残りを好きな順序で山札の下に置く。その後光または自然のコスト3以下のクリーチャーを1体自分の手札から出してもよい。次の自分のターンのはじめまでそのクリーチャーに「ブロッカー」を与える。')
    return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'Look',n:3,public:true,rest:'bottom',g255Distribute:true,g791OrderRest:true,
     stages:['光','自然'].map(color=>({n:1,to:'hand',optional:true,filter:{creature:true,color},title:color+'のクリーチャーを1体まで手札に加える'}))},
     {...handCreature,filter:{creature:true,max:3,any:[{color:'光'},{color:'自然'}]},g791Grant:{blocker:true}}]};
  }
  if(d.faces.length===2&&f.typeText==='クリーチャー'&&d.faces[1].typeText==='呪文'){
   const spell=d.faces[1];
   if(front==='ブロッカーブロッカーこのクリーチャーが出た時自分の山札の上から2枚を墓地に置いてもよい。その後そのうちの1枚を手札に戻してもよい。自分の超次元ゾーンに呪文があればこのクリーチャーに「スレイヤー」を与えこのクリーチャーは相手に選ばれない。'&&
      normalize(spell.abilityText)===trigger+'相手のエレメントを1つ選び持ち主の手札に戻す。その後相手の手札を1枚見ないで選び捨てさせる。')
    return {blocker:true,effect:'sixPhoto',g34Tasks:[{op:'Offer',g186GraveMill:true,title:'山札の上2枚を墓地に置く？',defs:[{op:'MillRecover791',n:2}]}],
     g260Self:{filter:{g791ExtraSpell:true},grants:{slayer:true,untargetable:true}},
     spellFace:{name:spell.name,type:'spell',cost:spell.cost,civ:spell.civilizationText,civilizations:spell.civilizations,race:spell.race,
      trigger:true,effect:'sixPhoto',g34Tasks:[{op:'Target',element:true,to:'hand',spell:true},{op:'BlindDiscard773'}]}};
  }
 }
 if(phase>=790&&d?.status==='complete'&&d.faces.length===1&&f.typeText==='クリーチャー'){
  const frontText=normalize(f.abilityText);
  if(frontText==='スピードアタッカージャストダイバーW・ブレイカーこのクリーチャーが攻撃する時カードを3枚まで引く。このターン自分がカードを7枚以上引いていれば相手のエレメントを2つまで選び持ち主の手札に戻す。その後このクリーチャーは相手のシールドを1つブレイクしてもよい。')
   return {speedAttacker:true,justDiver:true,breaker:2,g34Attack:[{op:'DrawUpTo',n:3},
    {op:'IfOwn',filter:{g790MinDraws:7},defs:[{op:'Select',origin:'battle',owner:'opponent',to:'hand',n:2,optional:true,filter:{element:true},g173Targets:true,
     title:'手札に戻す相手のエレメントを2つまで選ぶ',after:[{op:'Offer',title:'このクリーチャーで相手のシールドをブレイクする？',g790CreatureBreak:true,defs:[{op:'Break497',n:1,g747CreatureBreak:true}]}]}]}]};
  if(frontText==='スピードアタッカー(このクリーチャーは召喚酔いしない)W・ブレイカー(このクリーチャーはシールドを2つブレイクする)自分のクリーチャーが攻撃する時このクリーチャーが自分の手札にありこのターン自分がカードを7枚以上引いていてこのターン自分の《爆裂英雄C・T・7》が出ていなければこのクリーチャーを出してもよい。')
   return {speedAttacker:true,breaker:2,g790AttackDeclare:true};
  const sugoiReveal=/^このクリーチャーが出た時自分の山札の上から1枚目?を表向きにする。それがクリーチャーなら手札に加える。(そうでなければ|それ以外なら)山札の下に置く。/;
  const thirdEntry='相手のクリーチャーが出る時このターン相手の他のクリーチャーが2体以上出ていれば相手はかわりにそのクリーチャーをマナゾーンに置く。';
  if(sugoiReveal.test(frontText)&&frontText.replace(sugoiReveal,'')===thirdEntry)
   return {effect:'sixPhoto',g34Tasks:[{op:'RevealTop514',filter:{creature:true},to:'hand',elseTo:'deck'}],g38Ritsui:true};
 }
 if(phase>=789&&d?.status==='complete'){
  const frontText=normalize(f.abilityText);
  const trigger='S・トリガーS・トリガー';
  if(d.faces.length===2&&f.typeText==='クリーチャー'&&d.faces[1].typeText==='呪文'){
   const spell=d.faces[1],spellText=normalize(spell.abilityText);
   const spellFace={name:spell.name,type:'spell',cost:spell.cost,civ:spell.civilizationText,civilizations:spell.civilizations,race:spell.race,effect:'sixPhoto'};
   if(frontText==='相手のクリーチャーが召喚以外の方法で出た時そのクリーチャーを持ち主の手札に戻してもよい。'&&
      spellText===trigger+'(この呪文をシールドゾーンから手札に加える時コストを支払わずにすぐ唱えてもよい)次の自分のターンのはじめまで相手は各ターン2度までしかクリーチャーで攻撃できない。')
    return {g621NonSummon:'bounce',spellFace:{...spellFace,trigger:true,g34Tasks:[{op:'AttackCap627',max:2}]}};
   const blocker='ブロッカーブロッカー(このクリーチャーをタップして相手クリーチャーの攻撃先をこのクリーチャーに変更してもよい)';
   if(frontText===blocker+'各ターン自分が2枚目のカードを引いた時カードを1枚引く。'&&
      spellText==='相手のクリーチャーを1体選ぶ。次の自分のターンのはじめまでそのクリーチャーは攻撃もブロックもできない。カードを1枚引く。')
    return {blocker:true,g789SecondDraw:true,spellFace:{...spellFace,g34Tasks:[{op:'Target',g190Freeze:'self',spell:true},{op:'Draw',n:1}]}};
  }
  if(d.faces.length===1&&f.typeText==='呪文'&&
     frontText==='自分の手札がこのカードだけならこの呪文を[fn02]支払って唱えてもよい。'+trigger+'相手のコスト7以下のクリーチャーを1体選び破壊する。自分の山札の上から1枚目をマナゾーンに置く。その後クリーチャーを1体自分のマナゾーンから手札に戻してもよい。')
   return {trigger:true,effect:'sixPhoto',g568Alt:{cost:2,paymentColors:['火','自然'],handOnly:true},
    g34Tasks:[{op:'Target',to:'grave',filter:{max:7}},{op:'Ramp',n:1},{op:'Select',origin:'mana',to:'hand',n:1,optional:true,filter:{creature:true}}]};
 }
 if(phase>=883&&d?.status==='complete'&&d.id==='dm22ex1-059'&&d.faces.length===2&&f.typeText==='クリーチャー'){
  const spell=d.faces[1];
  if(spell.typeText==='呪文'&&normalize(f.abilityText)===
   'W・ブレイカー(このクリーチャーはシールドを2つブレイクする)自分のターンの終わりにこのクリーチャーがタップしていて自分の手札が10枚以上あれば自分はゲームに勝つ。'&&
   normalize(spell.abilityText)==='自分のクリーチャーを1体タップする。その後それよりパワーが小さい相手のクリーチャーをすべてタップする。')
   return {...formulaVictory(),spellFace:{name:spell.name,type:'spell',cost:spell.cost,civ:spell.civilizationText,
    civilizations:spell.civilizations,race:spell.race,effect:'sixPhoto',g34Tasks:[christinaFall()]}};
 }
 if(phase>=788&&d?.status==='complete'&&d.faces.length===2&&f.typeText==='クリーチャー'&&d.faces[1].typeText==='呪文'){
  const spell=d.faces[1],frontText=normalize(f.abilityText),spellText=normalize(spell.abilityText);
  const spellFace={name:spell.name,type:'spell',cost:spell.cost,civ:spell.civilizationText,civilizations:spell.civilizations,race:spell.race,effect:'sixPhoto'};
  const blocker='ブロッカーブロッカー(このクリーチャーをタップして相手クリーチャーの攻撃先をこのクリーチャーに変更してもよい)';
  const charger='チャージャー(この呪文を唱えた後墓地のかわりにマナゾーンに置く)';
  if(frontText===blocker+'W・ブレイカーこのクリーチャーが出た時自分の山札の上から2枚を見る。そのうちの1枚をシールド化しもう1枚を手札に加える。'&&
     spellText==='相手のクリーチャーを1体選びタップする。次の相手のターンのはじめにそのクリーチャーはアンタップしない。'+charger)
   return {blocker:true,breaker:2,effect:'sixPhoto',
    g34Tasks:[{op:'Look',n:2,stages:[{n:1,to:'shields'},{n:1,to:'hand'}],rest:'top'}],
    spellFace:{...spellFace,normalCharger:true,g34Tasks:[{op:'Target',tap:true,lock:true,g210TapLock:true,spell:true}]}};
  if(frontText==='このクリーチャーが出た時カードを2枚引きその後自分の手札を1枚超次元ゾーンに置く。'&&
     spellText==='S・トリガーS・トリガーエレメントを1つ選び持ち主の手札に戻してもよい。相手のクリーチャーを1体選ぶ。次の自分のターンのはじめまでそのクリーチャーは攻撃もブロックもできない。')
   return {effect:'sixPhoto',g34Tasks:[{op:'Draw',n:2},{op:'Select',origin:'hand',to:'extra',n:1,title:'超次元ゾーンに置く手札を1枚選ぶ'}],
    spellFace:{...spellFace,trigger:true,g34Tasks:[{op:'Target',anyOwner:true,element:true,optional:true,to:'hand'},{op:'Target',g190Freeze:'self',spell:true}]}};
  if(frontText==='このクリーチャーが出た時自分の手札からスノーフェアリーを1枚マナゾーンに置いてもよい。ラスト・バースト(このクリーチャーが破壊された時このカードの呪文側をコストを支払わずに唱えてもよい)'&&
     spellText==='相手のコスト5以下のエレメントを1つ選び持ち主のマナゾーンに置く。')
   return {g40LastBurst:true,effect:'sixPhoto',g34Tasks:[{op:'Select',origin:'hand',to:'mana',n:1,optional:true,g182HandMana:true,filter:{race:'スノーフェアリー'}}],
    spellFace:{...spellFace,g34Tasks:[{op:'Target',element:true,to:'mana',filter:{max:5}}]}};
 }
 if(phase>=787&&d?.status==='complete'&&d.faces.length===1){
  const text=normalize(f.abilityText);
  const trigger='S・トリガーS・トリガー';
  if(f.typeText==='クリーチャー'&&text==='このターンカードが自分のシールドゾーンを離れていなければこのクリーチャーは攻撃できない。')
   return {g787AttackAfterShieldLeaves:true};
  if(f.typeText==='呪文'&&text===trigger+'光のコスト7以下のエンジェル・コマンドを1つ自分の手札から出してもよい。闇のコスト7以下のデーモン・コマンドを1つ自分の墓地から出してもよい。')
   return {trigger:true,effect:'sixPhoto',g34Tasks:[
    {op:'Select',origin:'hand',n:1,deploy:true,optional:true,filter:{element:true,color:'光',race:'エンジェル・コマンド',max:7}},
    {op:'Select',origin:'grave',n:1,deploy:true,optional:true,g236GraveDeploy:true,filter:{element:true,color:'闇',race:'デーモン・コマンド',max:7}}
   ]};
  const cycle='自分の手札を2枚まで好きな順序で山札の下に置く。その後その枚数より1枚多くカードを引く。';
  const bounce='相手のクリーチャーを1体選び持ち主の手札に戻す。';
  if(f.typeText==='呪文'&&['次のうちいずれか1つを選ぶ。','次の中から1回選ぶ。'].some(mode=>text===trigger+mode+'▶'+cycle+'▶'+bounce))
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'Choose',modes:[
    {label:'手札を最大2枚、山札の下に置いて、その枚数＋1枚引く',defs:[{op:'HandCycle460',to:'deck',order:true,max:2,extra:1}]},
    {label:'相手のクリーチャー1体を手札に戻す',defs:[{op:'Target',to:'hand'}]}
   ]}]};
 }
 if(phase>=786&&d?.status==='complete'&&d.faces.length===1){
  const text=normalize(f.abilityText);
  const trigger='S・トリガーS・トリガー';
  const gacha='このクリーチャーが出た時相手のアンタップしているクリーチャーを1体選び破壊する。その後選んだクリーチャー以下のコスト';
  if(f.typeText==='クリーチャー'&&[
   trigger+gacha+'を持つクリーチャーを1体自分の墓地から出す。',
   trigger+gacha+'のクリーチャーを1体自分の墓地から出す。',
   trigger+'(このカードを自分のシールドゾーンから手札に加える時コストを支払わずにすぐ実行してもよい)'+gacha+'のクリーチャーを1体自分の墓地から出す。'
  ].includes(text))
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'Target',to:'grave',filter:{untapped:true},g786ReviveAtCost:true}]};
  if(f.typeText==='呪文'&&text===trigger+'相手のクリーチャーをすべてタップする。自分はカードを1枚引き自分のシールドをすべてブレイクする。')
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'TapAll'},{op:'Draw',n:1},{op:'Break497',owner:'self',n:'all'}]};
  if(f.typeText==='クリーチャー'&&text==='このクリーチャーが出た時自分の手札を1枚タップしてマナゾーンに置いてもよい。それがNEOクリーチャーならカードを1枚引く。')
   return {effect:'sixPhoto',g34Tasks:[{op:'Select',origin:'hand',to:'mana',n:1,optional:true,tapped:true,g182HandMana:true,
    g654MovedFilter:{g556Neo:true},g583OnMove:[{op:'Draw',n:1}]}]};
 }
 if(phase>=785&&d?.status==='complete'&&d.faces.length===1&&f.typeText==='呪文'&&f.abilityText.split('\n').length===2){
  const text=normalize(f.abilityText);
  const draw='S・トリガーS・トリガーカードを1枚引く。その後';
  const deploy='コスト3以下のクリーチャーを2体まで自分の手札から出す。このターンの終わりにそれらのクリーチャーを手札に戻す。';
  if(text===draw+'進化でない'+deploy||text===draw+'コスト3以下の進化ではない'+deploy.slice('コスト3以下の'.length))
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'Draw',n:1},
    {op:'Select',origin:'hand',deploy:true,n:2,optional:true,g785ReturnGroup:true,filter:{creature:true,nonEvolution:true,max:3}}]};
 }
 if(phase>=781&&d?.status==='complete'&&d.faces.length===2&&d.faces.every(face=>face.typeText==='クリーチャー')){
  const normal='マッハファイターW・ブレイカー自分の超化獣クリーチャーの召喚コストを3少なくする。ただしコストは0以下にはならない。'+
   'ハイパー化:自分の他のクリーチャーを1体タップする。(自分のメインステップ中にハイパーモードを解放できる。ハイパーモードは次の自分のターンのはじめまで続く)';
  const active=d.faces[1],attack='このクリーチャーが攻撃する時次の自分のターンのはじめまで自分の超化獣クリーチャーすべてのハイパーモードを解放する。';
  if(f.powerText==='6000'&&active.powerText==='11000'&&normalize(f.abilityText)===normal&&normalize(active.abilityText)===normal+attack)
   return {machFighter:true,breaker:2,g290SummonAura:{race:'超化獣',amount:3},hyperTap:true,
    hyper:{power:11000,g781ReleaseAll:true}};
 }
 if(phase>=593&&d?.status==='complete'&&d.faces.length===2&&f.typeText==='クリーチャー'&&d.faces[1].typeText==='呪文'){
  const [front,spell]=d.faces,frontText=normalize(front.abilityText);
  const entryStop=frontText==='相手のクリーチャーが出た時そのターンそのクリーチャーは攻撃できない。';
  const rushSweep=phase>=596&&frontText==='スピードアタッカー(このクリーチャーは召喚酔いしない)'&&normalize(spell.abilityText)==='相手のパワー1000以下のクリーチャーをすべて破壊する。';
  const blockerCharger=phase>=599&&[
   '相手のクリーチャーが召喚以外の方法で出た時そのクリーチャーを破壊する。',
   'スピードアタッカー(このクリーチャーは召喚酔いしない)'
  ].includes(frontText)&&[
   '相手の「ブロッカー」を持つクリーチャーを1体選び破壊する。水晶チャージャー(この呪文を唱えた後墓地に置くかわりに裏向きにしてマナゾーンに置く)',
   '相手の「ブロッカー」を持つクリーチャーを1体選び破壊する。チャージャー(この呪文を唱えた後墓地に置くかわりにマナゾーンに置く)'
  ].includes(normalize(spell.abilityText));
  const bounceOrRemove=phase>=609&&frontText==='このクリーチャーが出た時相手のクリーチャーを1体選び持ち主の手札に戻す。'&&
   normalize(spell.abilityText)==='相手のコスト3以下のエレメントを1つ選び破壊する。';
  const spellText=normalize(spell.abilityText);
  const discardOrRemove=phase>=611&&(
   frontText==='このクリーチャーがバトルゾーンに出た時相手は自身の手札を1枚選び捨てる。'&&
   spellText==='S・トリガーS・トリガー(この呪文をシールドゾーンから手札に加える時コストを支払わずにすぐ唱えてもよい)相手のアンタップしているクリーチャーを1体破壊する。'||
   frontText==='このクリーチャーを墓地から召喚してもよい。W・ブレイカーこのクリーチャーがバトルゾーンに出た時相手は自身の手札を2枚選び捨てる。'&&
   spellText==='S・トリガーS・トリガー相手のアンタップしているクリーチャーを1体選び持ち主のマナゾーンに置く。'
  );
  const rampOrSweep=phase>=612&&frontText==='自分のパワー6000以上のクリーチャーを召喚するコストは1少なくなる。ただしコストは0以下にならない。'&&
   spellText==='S・トリガーS・トリガー(この呪文をシールドゾーンから手札に加える時コストを支払わずにすぐ唱えてもよい)相手のパワー4000以下のクリーチャーをすべて持ち主のマナゾーンに置く。';
  const mammoth=phase>=684&&frontText==='このクリーチャーが攻撃する時多色カードを1枚自分の手札から捨ててもよい。そうしたらこのクリーチャーをアンタップする。'&&
   spellText==='カードを3枚まで引く。その後自分の手札を1枚捨てる。';
  const speedOrSweep=phase>=613&&frontText==='このクリーチャーがバトルゾーンに出た時または攻撃する時そのターン自分の他のクリーチャー1体に「スピードアタッカー」を与える。(「スピードアタッカー」を持つクリーチャーは召喚酔いしない)'&&
   spellText==='相手の「ブロッカー」を持つクリーチャーをすべて破壊する。';
  const capOrShield=phase>=616&&frontText==='相手のターン中相手はクリーチャーを2体までしか出せない。'&&
   spellText===replicaAuction616;
  const waveTwin=phase>=702&&(
   frontText===waveKirstein702&&spellText==='自分の山札の上から2枚をタップしてマナゾーンに置く。その後カードを1枚自分のマナゾーンから墓地に置く。'||
   frontText===waveLameer702&&spellText==='S・トリガーS・トリガー(この呪文をシールドゾーンから手札に加える時コストを支払わずにすぐ唱えてもよい)相手のクリーチャーをすべてタップする。カードを1枚引く。'
  );
  const matchesWavePair=pair=>frontText===waveMarker702+'w'+pair.front&&spellText===pair.spell;
  const wavePair=phase>=704&&waveTwinFaces704.find(matchesWavePair)||phase>=703&&waveTwinFaces703.find(matchesWavePair);
  const classicSweep733=phase>=733&&(
   frontText==='Q・ブレイカー(このクリーチャーはシールドを4つブレイクする)このクリーチャーが破壊される時墓地に置くかわりに山札に加えてシャッフルする。'&&
   spellText==='自分の山札の上からクリーチャーが出るまでカードを表向きにする。そのクリーチャーよりパワーが小さいクリーチャーをすべて破壊する。表向きにしたカードをすべて墓地に置く。'||
   frontText==='このクリーチャーが出た時自分の山札の上から1枚をマナゾーンに置く。'&&
   spellText==='パワー3000以下のクリーチャーをすべて破壊する。その後こうして破壊したクリーチャー1体につきカードを1枚引いてもよい。'
  );
  if(entryStop||rushSweep||blockerCharger||bounceOrRemove||discardOrRemove||rampOrSweep||speedOrSweep||capOrShield||mammoth||waveTwin||wavePair||classicSweep733){
   const creatureFace=wavePair?{...front,abilityText:legacyWaveMarker+'\n'+wavePair.legacy}:front;
   const creature=standardCardSpec({...d,faces:[creatureFace]},{phase}),body=standardCardSpec({...d,faces:[spell]},{phase});
   if(entryStop&&(!body.crystalCharger||body.g34Tasks?.length!==1||!body.g34Tasks[0].g593OverMana))throw Error('未対応の水晶チャージャーの構成');
   return {...creature,spellFace:{name:spell.name,type:'spell',cost:spell.cost,civ:spell.civilizationText,civilizations:spell.civilizations,race:spell.race,...body}};
  }
 }
 if(phase>=727&&d?.status==='complete'&&d.faces.length===1&&f.typeText==='クロスギア'&&normalize(f.abilityText)==='クロスギアバトルゾーンにあるこれをクロスしたクリーチャーと同じ種族のクリーチャーすべてのパワーは+1000される。これをクロスしたクリーチャーと同じ種族のクリーチャーが攻撃する時カードを1枚引いてもよい。'){
  return {type:'gear',g726CrossRacePower:1000,g727CrossRaceDraw:true};
 }
 if(phase>=726&&d?.status==='complete'&&d.faces.length===1&&f.typeText==='クロスギア'){
  const cross='クロスギア:このカードをバトルゾーンに置く。クリーチャーにクロスするにはこのカードのコストをもう一度支払う。そのクリーチャーがバトルゾーンを離れてもこのカードはバトルゾーンに残る。';
  const power='バトルゾーンにあるこれをクロスしたクリーチャーと同じ種族のクリーチャーすべてのパワーは+2000';
  if([cross+power+'される。',cross+power+'させる。'].includes(normalize(f.abilityText)))return {type:'gear',g726CrossRacePower:2000};
 }
 if(d?.status!=='complete'||d.faces.length!==1||!['クリーチャー','進化クリーチャー','タマシード','呪文',...(phase>=166?['NEOクリーチャー']:[]),...(phase>=273?['スター進化クリーチャー']:[]),...(phase>=619?['G-NEOクリーチャー']:[]),...(phase>=657?['G城']:[]),...(phase>=682?['D2フィールド']:[]),...(phase>=700?['進化クリーチャー(進化V)','進化クリーチャー（進化V）']:[])].includes(f.typeText))throw Error('複数面・特殊カードタイプまたは情報不足');
 if(phase>=728&&f.typeText==='クリーチャー'&&f.cost===0&&f.powerText==='0'&&f.civilizations.length===1&&f.civilizations[0]==='無色'&&normalize(f.abilityText)==='(パワー0以下のクリーチャーは破壊される)このクリーチャーを出す時自分のクロスギアを好きな枚数これにクロスする。アクセル(このクリーチャーにクロスギアがクロスされている時このクリーチャーは次のa能力を得る)aこのクリーチャーのパワーは+500される。')
  return {g728CrossOnEntry:true,g260Self:{filter:{g436Crossed:true},grants:{power:500}}};
 if(!Number.isInteger(f.cost)||f.cost<1||!f.civilizations.length||f.civilizations.some(c=>!colors.includes(c)&&c!=='無色')||new Set(f.civilizations).size!==f.civilizations.length)throw Error('コスト・文明の個別処理が必要');
 if(f.civilizations.includes('無色')&&f.civilizations.length!==1)throw Error('無色の複合文明');
 if(f.typeText==='D2フィールド'){
  const text=normalize(f.abilityText);
  const reminder='(他のD2フィールドがバトルゾーンに出た時このD2フィールドを自分の墓地に置く)';
  if(text==='自分のクリーチャーすべてのパワーを+3000する。'+reminder){
   return {d2Field:true,g205Aura:{filter:{creature:true},power:3000}};
  }
  if(text==='自分のクリーチャーはブロックされない。'+reminder){
   return {d2Field:true,g682FieldUnblockable:true};
  }
  if(phase>=683&&[
   reminder,
   '(他のD2フィールドがバトルゾーンに出た時このD2フィールドを墓地に置く)',
   '(他のD2フィールドが出た時このD2フィールドを墓地に置く)'
  ].some(suffix=>text==='自分のターンの終わりに自分のクリーチャーをすべてアンタップする。'+suffix)){
   return {d2Field:true,g174End:[{op:'GroupUntap',filter:{creature:true}}]};
  }
  if(phase>=684&&text==='自分のクリーチャーすべてに「スレイヤー」を与える。(「スレイヤー」を持つクリーチャーがバトルする時バトルの後相手クリーチャーを破壊する)'+reminder){
   return {d2Field:true,g208Auras:[{filter:{creature:true},grants:{slayer:true}}]};
  }
  throw Error('未対応のD2フィールド能力');
 }
 if(f.typeText==='G城'){
  const text=normalize(f.abilityText);
  const rule='(G城は実行したら表向きでシールド化される。このカードが表向きで自分のシールドゾーンを離れる時かわりに墓地に置く)';
  const entry='このG城が表向きで自分のシールドゾーンに置かれた時相手のクリーチャーを2体まで選び持ち主の手札に戻す。';
  const castle={type:'castle',gCastle:true};
  if(text===rule+entry)return {...castle,g657FaceUpEntry:true};
  if(phase>=658&&text===rule+'各ターンはじめてクリーチャーが破壊された時自分はカードを1枚引いてもよい。')return {...castle,g658FirstDestruction:true};
  if(phase>=658&&text===rule+'このG城が表向きで自分のシールドゾーンに置かれた時または自分のターンのはじめにカードを1枚引く。その後コスト4以下のクリーチャーを1体自分の手札から出してもよい。'){
   return {...castle,g658ShieldOrStart:[{op:'Draw',n:1},{op:'Select',origin:'hand',deploy:true,n:1,optional:true,filter:{creature:true,max:4}}]};
  }
  throw Error('未対応のG城能力');
 }
 const creature=f.typeText.includes('クリーチャー'),evolution=f.typeText==='進化クリーチャー'||phase>=273&&f.typeText==='スター進化クリーチャー',seed=f.typeText==='タマシード';
 if(creature&&!/^\d+\+?$/.test(f.powerText)&&!(phase>=243&&/^\d+-$/.test(f.powerText)))throw Error('特殊なパワー');
 if(phase>=644&&creature){
  const text=normalize(f.abilityText)
   .replace('S・トリガー(このカードを自分のシールドゾーンから手札に加える時コストを支払わずにすぐ実行してもよい)','S・トリガー')
   .replace(/Jビッグ1する。\(自分の他のジョーカーズのJビッグ1(?:能力)?以外の出た時にトリガーする能力を1つ使う\)/,'Jビッグ1する。');
  const start='このクリーチャーが出た時次の中から1回選ぶ。▶',end='▶Jビッグ1する。';
  if(text===start+'カードを1枚引く。'+end)return{effect:'champion',g159CEffect:'Benzaman'};
  if(text==='S・トリガーS・トリガー'+start+'クリーチャーを1体選びタップまたはアンタップする。'+end)return{trigger:true,effect:'champion',g159CEffect:'HitoridachiMonkid'};
 }
 const spec={},entry=[],attack=[],block=[],death=[],leave=[],turnStart=[],turnEnd=[],opponentStart=[],opponentEnd=[],tapped=[],battleWin=[];let powerBonus=false,nativeEntry=null;
 const compact363=phase>=363?normalize(f.abilityText):'',whole363=phase>=363&&(modal363(compact363)||compact363==='自分の水と闇を両方持つクリーチャーがバトルゾーンに出た時次のうちいずれか1つを選ぶ。▼カードを1枚引く。▼相手は自身の手札を1枚選び捨てる。');
 const abilityText=phase>=584?f.abilityText.replace(/(マナゾーンに置く時、このカードはタップして置く。)(?=このクリーチャーをバトルゾーンに出した時)/g,'$1\n'):f.abilityText;
 const joinedAbility=phase>=734?abilityText.replace(/(このクリーチャーの攻撃の終わりに、)[ \t]*\n(?=このクリーチャーを破壊する。)/g,'$1'):abilityText;
 const lines=whole363?[f.abilityText]:(phase>=184?(phase>=455?joinedAbility.replace(/(スペース・チャージ[^\n]+）)\s+q\s/g,'$1\nq '):joinedAbility).replace(/[▶▼→][\uFE0E\uFE0F]?|__/g,'\n▶'):f.abilityText).split('\n').filter(s=>s.trim());
 if(phase>=924&&d.faces.length===1){
  if(creature&&d.id==='dm20-033'&&compact363===
   'このクリーチャーをバトルゾーンに出した時相手はバトルゾーンにある自分自身のクリーチャーを1体選び持ち主のマナゾーンに置く。'+
   'このクリーチャーが破壊された時相手は進化ではないクリーチャーを1体自分自身のマナゾーンから選びバトルゾーンに出す。')
   return {effect:'sixPhoto',g34Tasks:[{op:'OpponentSelect',n:1,to:'mana'}],g172Death:[
    {op:'OpponentSelect',origin:'mana',n:1,deploy:true,filter:{creature:true,faceUp:true,nonEvolution:true},
     title:'自分のマナから進化ではないクリーチャーを1体出す'}]};
  if(creature&&['dm20-031','dmx12a-020','dmex12-066','dmex17-w05','dm24rp1-T07','dm24ex3-TF30'].includes(d.id)&&[
   'このクリーチャーは可能であれば毎ターン攻撃する。このクリーチャーがタップされている時誰も呪文を唱えることはできない。',
   'このクリーチャーは可能であれば毎ターン攻撃する。このクリーチャーがタップしている時誰も呪文を唱えられない。',
   'このクリーチャーは可能なら毎ターン攻撃する。このクリーチャーがタップしていればすべてのプレイヤーは呪文を唱えられない。'
  ].includes(compact363))return {mustAttack:true,g924TappedSpellLock:true};
  if(f.typeText==='呪文'&&d.id==='dm01-034'&&compact363===
   'バトルゾーンにある相手のクリーチャーを1体選ぶ。このターン選んだクリーチャーがタップされていなくても攻撃できる。')
   return {effect:'sixPhoto',g34Tasks:[{op:'Target',g924AttackableUntapped:true,spell:true,
    title:'アンタップ中でも攻撃できるようにする相手のクリーチャーを選ぶ'}]};
 }
 if(phase>=923&&d.faces.length===1){
  if(creature&&d.id==='dm20-001'&&compact363===
   '自分のキカイヒーローまたはグレートメカオーが破壊された時バトルゾーンにある自分のクリーチャーをすべてアンタップする。'+
   'W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)')
   return {breaker:2,g303DeathWatch:{self:true,selfFilter:true,g891LookBackSelf:true,
    raceAny:['キカイヒーロー','グレートメカオー'],defs:[{op:'GroupUntap',filter:{creature:true}}]}};
  if(evolution&&d.id==='dm24-010'&&compact363===
   'マナゾーンに置く時このカードはタップして置く。進化V-自分の火のクリーチャー1体と自然のクリーチャー1体を重ねた上に置く。'+
   '自分のターンのはじめにコスト7以下の火または自然のクリーチャーを1体自分のマナゾーンからバトルゾーンに出してもよい。W・ブレイカー')
   return {breaker:2,evolution:{g31:true},g31Evolution:{zone:'battle',conditions:[{civilization:'火'},{civilization:'自然'}]},
    g174Start:[{op:'Select',origin:'mana',n:1,deploy:true,optional:true,
     filter:{creature:true,faceUp:true,max:7,any:[{color:'火'},{color:'自然'}]}}]};
 }
 if(phase>=922&&d.faces.length===1){
  const stingerCurrent='このクリーチャーをバトルゾーンに出した時、自分のクリーチャーを１体破壊する。';
  if(creature&&(d.id==='dm18-071'&&compact363===normalize(stingerCurrent)||d.id==='dm01-057'&&compact363===
   'このクリーチャーがバトルゾーンに出たときバトルゾーンにある自分の他のクリーチャー1体を自分の墓地に置く。そうしなければこのクリーチャーを自分の墓地に置く。'))
   return {text:stingerCurrent,effect:'sixPhoto',g34Tasks:[{op:'Select',origin:'battle',owner:'self',to:'grave',
    n:1,filter:{creature:true},g187OwnPick:true,title:'破壊する自分のクリーチャーを1体選ぶ'}]};
  if(f.typeText==='呪文'&&d.id==='dm14-084'&&compact363===
   'バトルゾーンにあるクロスギアを1枚選び持ち主の手札に戻す。そのクロスギアをクロスしていたクリーチャーも持ち主の手札に戻す。')
   return {effect:'sixPhoto',g34Tasks:[{op:'WarpRifle922'}]};
  if(creature&&d.id==='dm24-019'&&compact363===
   '自分の多色クリーチャーを召喚する時このクリーチャーが自分の墓地にあればこのクリーチャーを墓地から手札に戻してもよい。'+
   'W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)')
   return {breaker:2,g922GraveMultiSummon:true};
 }
 if(phase>=921&&d.faces.length===1){
  const anyColor=(...colors)=>({any:colors.map(color=>({color}))});
  if(creature&&d.id==='dm24-071'&&compact363===
   'ブロッカー(相手クリーチャーが攻撃する時このクリーチャーをタップしてその攻撃を阻止してもよい。その後その相手クリーチャーとバトルする)'+
   'バトルゾーンに自分の水闇火または自然のクリーチャーが1体もなければこのクリーチャーは相手プレイヤーを攻撃することができない。')
   return {blocker:true,g840PlayerAttackRequires:{creature:true,...anyColor('水','闇','火','自然')}};
  if(f.typeText==='呪文'&&['dm24-108','dmx22a-053','dmex15-b096'].includes(d.id)){
   const trigger=(d.id==='dm24-108'?'':'S・トリガー')+'S・トリガー(この呪文をシールドゾーンから手札に加える時コストを支払わずにすぐ唱えてもよい)';
   const deploy=d.id==='dmex15-b096'?'出す。':'バトルゾーンに出してもよい。';
   if(compact363===trigger+'自分の山札を見る。その中から光水闇または火のコスト2以下のクリーチャーを1体'+deploy+'その後山札をシャッフルする。')
    return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'LookDeploy530',g201Search:true,g841DeckPeek:true,limit:1,rest:'shuffle',
     filter:{creature:true,...anyColor('光','水','闇','火'),max:2}}]};
  }
  if(f.typeText==='呪文'&&d.id==='dm09-029'&&compact363===
   '相手はバトルゾーンにある自分自身のクリーチャー1体か自分自身のシールドを1枚選びそれを持ち主の墓地に置く。ただしその「S・トリガー」は使えない。')
   return {effect:'sixPhoto',g34Tasks:[{op:'OpponentBury921'}]};
 }
 if(phase>=920&&creature&&d.faces.length===1){
  const colorSpec={
   'dm24-043':['水','自然','光'],
   'dm24-047':['光','闇','水'],
   'dmex12-057':['光','闇','水'],
   'dm24-050':['水','火','闇'],
   'dm24-059':['火','光','自然']
  }[d.id];
  if(colorSpec){
   const [first,second,add]=colorSpec,reprint=d.id==='dmex12-057';
   const trigger=d.id==='dm24-047'||reprint,zone=reprint?'':'バトルゾーンにある';
   const triggerText=trigger?(reprint?'S・トリガー':'')+
    'S・トリガー(このクリーチャーをシールドゾーンから手札に加える時コストを支払わずにすぐ召喚してもよい)':'';
   if(compact363===triggerText+zone+'自分の'+first+'のクリーチャーと'+second+'のクリーチャーはすべて'+add+'のクリーチャーでもある。'+
    zone+'自分の他の'+add+'のクリーチャーすべてのパワーは+1000される。')
    return {...(trigger?{trigger:true}:{}),g920Colors:{from:[first,second],add},g205Aura:{filter:{creature:true,color:add},other:true,power:1000}};
  }
 }
 if(phase>=919&&d.faces.length===1){
  if(creature&&['dmrp05-060','dmsd07-012'].includes(d.id)&&compact363===
   '自分のシールドゾーンにカードが置かれた時そのターンこのクリーチャーのパワーを+3000し「W・ブレイカー」を与える。(「W・ブレイカー」を持つクリーチャーはシールドを2つブレイクする)')
   return {g918ShieldAdded:[{op:'SelfBoost313',power:3000,breaker:2,g536Source:true,g633DoubleBreaker:true}]};
  if(f.typeText==='呪文'&&['dm03-020','dmr20-024','dmx12b-082'].includes(d.id)&&[
   '自分のシールドから好きな枚数を裏向きのまま選び表向きにして自分のマナゾーンに置く。',
   '自分のシールドを好きな数自分のマナゾーンに置く。'
  ].includes(compact363))
   return {effect:'sixPhoto',g34Tasks:[{op:'ShieldHand',g535Count:'any',g554To:'mana',optional:true}]};
  if(creature&&['dm10-088','dmr20-056','dmex13-073','dmx12b-099'].includes(d.id)&&
   /^このクリーチャー(?:をバトルゾーンに出した|がバトルゾーンに出た)時自分のシールドを(?:1枚選び自分の|ひとつ選び自分の|ひとつ|1つ)手札に加える。\(その「S・トリガー」を使ってもよい\)$/.test(compact363))
   return {effect:'sixPhoto',g34Tasks:[{op:'TappedShieldPick842',owner:'self',n:1,picked:[]}]};
 }
 if(phase>=918&&creature&&d.faces.length===1){
  if(d.id==='dm10-023'&&compact363===
   'このクリーチャーをバトルゾーンに出した時自分のシールドを1枚選び自分の手札に加える。(その「S・トリガー」を使ってもよい)')
   return {effect:'sixPhoto',g34Tasks:[{op:'TappedShieldPick842',owner:'self',n:1,picked:[]}]};
  if(['dmrp05-033','dmsd07-009'].includes(d.id)&&compact363===
   '自分のシールドゾーンにカードが置かれた時相手のクリーチャーを1体選びタップする。そのクリーチャーは次の相手のターンのはじめにアンタップしない。')
   return {g918ShieldAdded:[{op:'Target',tap:true,lock:true,g210TapLock:true}]};
  if(d.id==='dm24-025'&&compact363===
   'バトルゾーンにある自分の闇のクリーチャーと自然のクリーチャーはすべて火のクリーチャーでもある。'+
   'バトルゾーンにある自分の他の火のクリーチャーすべてのパワーは+1000される。')
   return {g918Kars:true,g205Aura:{filter:{creature:true,color:'火'},other:true,power:1000}};
 }
 if(phase>=917&&d.faces.length===1){
  if(creature&&d.id==='dm03-034'&&compact363===
   'このクリーチャーがバトルゾーンに出たときバトルゾーンにある相手の進化クリーチャーを1体選びそのクリーチャーの一番上のカードを持ち主の墓地に置いてよい。')
   return {effect:'sixPhoto',g34Tasks:[{op:'BattleCardMove579',to:'grave',optional:true,g917EvolutionTop:true}]};
  if(f.typeText==='呪文'&&['dm06-051','dm18-064'].includes(d.id)&&compact363===
   'バトルゾーンにある自分のクリーチャーを好きな数選び自分の手札に戻す。その後バトルゾーンにある相手のクリーチャーを同じ数選び持ち主の手札に戻してもよい。')
   return {effect:'sixPhoto',g34Tasks:[{op:'Select',owner:'self',origin:'battle',to:'hand',n:'all',optional:true,
    filter:{creature:true},g173Targets:true,g193Select:true,g917BounceMatch:true,title:'手札に戻す自分のクリーチャーを好きな数選ぶ'}]};
  if(creature&&['dm13-s03','dmc43-012'].includes(d.id)&&compact363===
   'マナゾーンに置く時このカードはタップして置く。シンパシー:エンジェル・コマンドおよびアーマード・ドラゴン'+
   '(このクリーチャーを召喚する時支払うコストはバトルゾーンにある自分のエンジェル・コマンドまたはアーマード・ドラゴン1体につき1少なくなる。ただしコストは2より少なくならない)'+
   'W・ブレイカーこのクリーチャーが破壊される時墓地に置くかわりに裏向きにして自分のシールドに加える。')
   return {breaker:2,g842DestroyShield:true,g211Sympathy:{amount:1,minimum:2,
    filter:{creature:true,raceAny:['エンジェル・コマンド','アーマード・ドラゴン']}}};
 }
 if(phase>=916&&creature&&d.faces.length===1){
  if(['dm03-036','dm04-007'].includes(d.id)&&compact363===
   'このクリーチャーがバトルゾーンから自分の墓地に置かれるとき裏向きにして自分のシールドに加える。')
   return {g916GraveShield:true};
  if(d.id==='dm10-050'&&compact363===
   '相手のターンのはじめに相手はバトルゾーンにある自分自身の攻撃できるクリーチャーを1体選ぶ。そのクリーチャーは可能であればそのターン攻撃する。')
   return {g179OpponentStart:[{op:'OpponentChooseAttacker916'}]};
 }
 if(phase>=915&&d.faces.length===1){
  if(f.typeText==='呪文'&&d.id==='dm10-094'&&compact363==='S・トリガー'+
   'バトルゾーンにある相手のクリーチャーを1体選ぶ。そのクリーチャーは自分の次のターンのはじめまで「このクリーチャーは可能なら攻撃する」を得る。')
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'Target',g521UntilStart:true,spell:true,
    grant:{mustAttack:true,g736ForcedAttack:true},title:'攻撃を強制する相手のクリーチャーを1体選ぶ'}]};
  if(creature&&d.id==='dm13-013'&&compact363===
   'このクリーチャーがシールドをブレイクした時そのターンの終わりにこのクリーチャーを破壊し各プレイヤーは自分自身のマナゾーンからカードを1枚選んで持ち主の墓地に置く。')
   return {g915AfterSelfBreak:[{op:'Schedule537',when:'turnEnd',defs:[
    {op:'SelfDestroy'},{op:'ManaChoose582',who:'each',n:1,to:'grave'}]}]};
  if(creature&&d.id==='dm14-003'&&compact363===
   'このクリーチャーをバトルゾーンに出した時相手はバトルゾーンにある自分自身のクリーチャーを1体選び持ち主の手札に戻してもよい。'+
   'そうした場合このクリーチャーを自分の手札に戻す。W・ブレイカー')
   return {breaker:2,effect:'sixPhoto',g34Tasks:[{op:'OpponentSelect',to:'hand',n:1,optional:true,
    title:'手札に戻す自分のクリーチャーを1体選ぶ（任意）',afterBattleSelect:[{op:'SelfHand299'}]}]};
 }
 if(phase>=914&&f.typeText==='呪文'&&d.faces.length===1){
  if(d.id==='dm27-026'&&compact363==='S・トリガー'+
   '相手は自分自身の手札を1枚選んで捨てる。そのカードの文明と同じ文明のカードが自分のマナゾーンに1枚でもあれば相手は自分自身のマナゾーンからカードを1枚選び墓地に置く。')
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'HandFollow584',owner:'opponent',g914SharedManaColor:true,then:[{op:'OpponentManaLoss478'}]}]};
  if(d.id==='dm05-023'&&compact363===
   'バトルゾーンにある自分の水のクリーチャー1体につきバトルゾーンにある相手のクリーチャーを1体選びタップしてもよい。')
   return {effect:'sixPhoto',g34Tasks:[{op:'CountOwn538',filter:{creature:true,color:'水'},mode:'select',
    def:{op:'Select',origin:'battle',owner:'opponent',optional:true,g173Targets:true,g193Select:true,g193Tap:true,
     filter:{creature:true},title:'タップする相手のクリーチャーを選ぶ'}}]};
  if(d.id==='dm10-100'&&compact363===
   'S・トリガー(この呪文をシールドゾーンから手札に加える時コストを支払わずにすぐ唱えてもよい)'+
   '自分の次のターンのはじめまで相手のクリーチャーは「このクリーチャーは可能であれば攻撃する」を得る。')
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'GroupGrant364',owner:'opponent',filter:{creature:true},g521UntilStart:true,spell:true,
    grant:{mustAttack:true,g736ForcedAttack:true}}]};
 }
 if(phase>=913&&d.faces.length===1){
  if(f.typeText==='呪文'&&d.id==='dm04-008'&&compact363===
   'S(シールド)・トリガー(このカードをシールドゾーンから手札に加えるときコストを支払わずにすぐ唱えてよい)'+
   '自分の次のターンが始まるまでバトルゾーンにある自分のクリーチャーはすべて「ブロッカー」を得る。')
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'GroupGrant364',owner:'self',filter:{creature:true},grant:{blocker:true},g521UntilStart:true,spell:true}]};
  if(creature&&d.id==='dmrp12-046'&&compact363===
   'S・トリガーS・トリガー(このクリーチャーをシールドゾーンから手札に加える時コストを支払わずにすぐ召喚してもよい)'+
   'ブロッカーブロッカー(このクリーチャーをタップして相手クリーチャーの攻撃先をこのクリーチャーに変更してもよい)'+
   'このクリーチャーがブロックした時このターンその相手クリーチャーのパワーを-9000する。(パワー0以下のクリーチャーは破壊される)'+
   'このターンの終わりにこのクリーチャーがタップしていたら破壊する。')
   return {trigger:true,blocker:true,g178Block:[{op:'EntryBoost755',power:-9000,g913BlockedAttacker:true}],
    g474AnyEnd:[{op:'IfOwn',filter:{g590SourceTapped:true},defs:[{op:'SelfDestroy'}]}]};
  if(f.typeText==='呪文'&&d.id==='dm05-026'&&compact363===
   'このターン自分のクリーチャーがシールドをブレイクするたびにカードを2枚引いてもよい。')
   return {effect:'sixPhoto',g34Tasks:[{op:'BreakDraw913'}]};
 }
 if(phase>=912&&creature&&d.faces.length===1){
  if(['dmr18-039','promoy14-033'].includes(d.id)&&[
   '自分の進化革命軍クリーチャーの召喚コストを',
   '自分の革命軍の進化クリーチャーの召喚コストを'
  ].some(head=>compact363===head+
   'バトルゾーンにある自分のファイアー・バード1体につき1少なくしてもよい。ただしコストは0以下にならない。'))
   return {g349SummonAuras:[{filter:{evolution:true,race:'革命軍'},amount:1,g560Optional:true,g912CountRace:'ファイアー・バード'}]};
  if(d.id==='dm27-042'&&compact363==='ブロッカーこのクリーチャーは攻撃することができない。'+
   'このクリーチャーがブロックする時バトルの後ブロックされたクリーチャーを持ち主の手札に戻す。')
   return {blocker:true,noAttack:true,g912BounceAfterBlock:true};
  if(d.id==='dmr16g-033'&&compact363===
   'ブロッカーブロッカー(相手クリーチャーが攻撃する時このクリーチャーをタップしてその攻撃を阻止してもよい。その後その相手クリーチャーとバトルする)'+
   'このクリーチャーは相手プレイヤーを攻撃できない。'+
   'このクリーチャーがブロックした時自分の山札の上から1枚目を墓地に置く。それがジャスティス・ウイングまたはドラゴンであればそのターンこのクリーチャーのパワーは+2000される。')
   return {blocker:true,noPlayerAttack:true,g178Block:[{op:'MillMatch520',n:1,
    filter:{any:[{anyFaceRace:'ジャスティス・ウイング'},{anyFaceRace:'ドラゴン'}]},
    defs:[{op:'SelfBoost313',power:2000,g536Source:true}]}]};
 }
 if(phase>=911&&d.faces.length===1){
  if(f.typeText==='呪文'&&d.id==='dm25-024'&&compact363===
   'カードを2枚引きそのカードを見せる。その中に1枚でも多色カードがあればさらに1枚引く。')
   return {effect:'sixPhoto',g34Tasks:[{op:'DrawReveal911',n:2}]};
  if(creature&&d.id==='dm05-040'&&compact363===
   '火・自然ブロッカー(相手の火または自然のクリーチャーが攻撃するときこのクリーチャーをタップしてその攻撃を阻止してよい。そのあとその相手クリーチャーとバトルする)')
   return {blocker:true,g911BlockColors:['火','自然']};
  if(creature&&d.id==='dmr13-042'&&compact363===
   'ブロッカーブロッカーバトルゾーンに自分の他の「ブロッカー」を持つクリーチャーがなければこのクリーチャーは相手プレイヤーを攻撃できない。'+
   'W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)')
   return {blocker:true,breaker:2,g840PlayerAttackRequires:{creature:true,blocker:true,g334Other:true}};
 }
 if(phase>=910&&d.faces.length===1){
  if(creature&&['dm03-050','dmc27-050'].includes(d.id)&&compact363===
   'バトルゾーンにある相手のクリーチャーの数が自分のクリーチャーの数より多いときこのクリーチャーは攻撃することができない。')
   return {g260Self:{filter:{g413MoreCreatures:'opponent'},grants:{noAttack:true}}};
  if(creature&&['dm38-053','dmx18-020'].includes(d.id)&&compact363===
   'リベンジ・チャンス-各ターンの終わりに相手がそのターンカードを3枚以上引いていた場合このクリーチャーをコストを支払わずに召喚してもよい。'+
   'このクリーチャーをバトルゾーンに出した時自分の山札の上から1枚目をマナゾーンに置く。')
   return {g558Souls:['W'],g795Revenge:{opponentDraws:3},effect:'sixPhoto',g34Tasks:[{op:'Ramp',n:1}]};
  if(creature&&d.id==='dm14-038'&&compact363===
   'パワーがこのクリーチャーより大きい他のクリーチャーがバトルゾーンに出た時このクリーチャーを自分のマナゾーンに置く。')
   return {g314OtherEntry:{who:'both',g910HigherPower:true,defs:[{op:'SelfMana297',g536Source:true}]}};
  if(f.typeText==='呪文'&&d.id==='dm31-013'&&compact363===
   '相手のクリーチャーを1体破壊する。そのクリーチャーがゴッドであれば相手のクリーチャーをもう1体破壊してもよい。')
   return {effect:'sixPhoto',g34Tasks:[{op:'Target',to:'grave',spell:true,g910AnotherIfRace:'ゴッド'}]};
 }
 if(phase>=909&&creature&&d.faces.length===1){
  if(['dm24ex1-070','promoy23-043'].includes(d.id)&&compact363===
   'S・トリガーS・トリガー(このクリーチャーをシールドゾーンから手札に加える時コストを支払わずにすぐ召喚してもよい)'+
   '各ターンに一度自分のクリーチャーが出た時クリーチャーを1体選びタップまたはアンタップしてもよい。')
   return {trigger:true,g251EntryDraw:{selfAlways:true,filter:{creature:true},defs:[
    {op:'Target',anyOwner:true,g235TapOrUntap:true,optional:true,g792Once:'way',title:'タップまたはアンタップするクリーチャーを選ぶ'}
   ]}};
  if(['dmrp16-029','promoy19-093'].includes(d.id)&&compact363===
   'マッハファイター(このクリーチャーはバトルゾーンに出たターンの間タップまたはアンタップしているクリーチャーを攻撃できる)'+
   'このクリーチャーが攻撃する時自分のシールドを1つブレイクしてもよい。このようにしてシールドをブレイクしたら自分のマナゾーンのカードを6枚までアンタップする。')
   return {machFighter:true,g34Attack:[{op:'Break497',owner:'self',n:1,optional:true,g909AfterBreak:[
    {op:'Select',origin:'mana',n:6,g210ManaUntap:true,optional:true,title:'アンタップする自分のマナを6枚まで選ぶ'}
   ]}]};
  if(d.id==='dmr01-042'&&compact363===
   'このクリーチャーまたは自分の他の光のハンターをバトルゾーンに出した時バトルゾーンにある相手のクリーチャーを1体選びタップしてもよい。'+
   'ハンティング(バトル中このクリーチャーのパワーはバトルゾーンにある自分のハンター1体につき+1000される)')
   return {g166Hunting:true,g251EntryDraw:{selfAlways:true,filter:{creature:true,color:'光',race:'ハンター'},
    defs:[{op:'Target',tap:true,optional:true,title:'タップする相手のクリーチャーを選ぶ'}]}};
 }
 if(phase>=908&&d.faces.length===1){
  const mach='マッハファイター(このクリーチャーは出たターンの間タップまたはアンタップしているクリーチャーを攻撃できる)';
  if(creature&&d.id==='dm23ex3-070'&&compact363===mach+
   'このクリーチャーが破壊される時墓地に置くかわりに裏向きにしてマナゾーンに置く。(マナゾーンにある裏向きのカードはマナの数字が1の無色カードとして扱う。その持ち主はそれをいつでも見てもよい)')
   return {machFighter:true,g908DestroyToCrystal:true};
  if(f.typeText==='呪文'&&d.id==='dmr10-028'&&compact363===
   'G・ゼロ-バトルゾーンに自分のアウトレイジがあればこの呪文をコストを支払わずに唱えてもよい。'+
   'このターンバトルゾーンにある自分のクリーチャー1体は「パワーアタッカー+3000」を得タップされていないクリーチャーを攻撃できる。')
   return {g261Free:{filter:{race:'アウトレイジ',faceUp:true},label:'G・ゼロ'},effect:'sixPhoto',
    g34Tasks:[{op:'Target',owner:'self',power:3000,g337PowerAttacker:true,grant:{attackUntapped:true},spell:true}]};
  if(creature&&['dm26ex3-070','dm26ex3-SEC018','dm26ex3-SEC018CHO'].includes(d.id)&&
   compact363===(d.id==='dm26ex3-070'?mach:'マッハファイター')+
   'このクリーチャーが攻撃する時自分の山札をシャッフルしその後上から1枚を表向きにする。それがドラゴンなら出してもよい。それ以外ならマナゾーンに置く。')
   return {machFighter:true,g34Attack:[{op:'Shuffle405'},{op:'RevealTop514',filter:{anyFaceRace:'ドラゴン'},to:'battle',elseTo:'mana',optional:true}]};
 }
 if(phase>=907&&creature&&d.faces.length===1){
  const mach='マッハファイター(このクリーチャーは出たターンの間タップまたはアンタップしているクリーチャーを攻撃できる)';
  if(['dmsd05-005','promoy17-013'].includes(d.id)&&compact363===mach.replace('は出た','はバトルゾーンに出た')+
   'T・ブレイカー(このクリーチャーはシールドを3つブレイクする)このクリーチャーが攻撃した時攻撃の後このクリーチャーをマナゾーンに置く。')
   return {machFighter:true,breaker:3,g34Attack:[{op:'AfterAttack542',defs:[{op:'SelfMana297',g536Source:true}]}]};
  if(d.id==='dm25rp1-044'&&compact363===mach+'このクリーチャーが出た時自分のマナゾーンにある光のカードと火のカードを1枚ずつアンタップする。')
   return {machFighter:true,effect:'sixPhoto',g34Tasks:[{op:'Select',origin:'mana',n:2,g210ManaUntap:true,g907ManaUntapColors:['光','火'],
    title:'アンタップする光と火のマナを1枚ずつ選ぶ'}]};
  if(d.id==='dmrp21-043'&&compact363===mach+'このクリーチャーが出た時自分の自然のクリーチャー1体または自然のタマシード1枚につき自分の山札の上から1枚目をタップしてマナゾーンに置いてもよい。')
   return {machFighter:true,effect:'sixPhoto',g34Tasks:[{op:'CreatureCountRamp765',g262Elements:true,
    filter:{creatureOrSeed:true,color:'自然',faceUp:true},optional:true,tapped:true,g809Together:true}]};
 }
 if(phase>=906&&d.faces.length===1){
  if(creature&&d.id==='dmx22b-020'&&compact363===
   'W・ブレイカーこのクリーチャーがバトルゾーンに出た時他のアンタップされているクリーチャーをすべて破壊する。')
   return {breaker:2,effect:'sixPhoto',g34Tasks:[{op:'Sweep',both:true,g179Other:true,filter:{creature:true,untapped:true}}]};
  if(f.typeText==='呪文'&&d.id==='dmsd11-006'&&compact363===
   '自分のクリーチャーを1体選ぶ。このターンそのクリーチャーが攻撃する時カードを2枚引く。')
   return {effect:'sixPhoto',g34Tasks:[{op:'Target',owner:'self',g906AttackDraw:2}]};
  if(f.typeText==='スター進化クリーチャー'&&d.id==='dmrp18-s01'&&compact363===
   'スター進化:レクスターズまたは水のクリーチャー1体の上に置く。(このクリーチャーが離れる時かわりに一番上のカードが離れる)T・ブレイカーこのクリーチャーが攻撃する時カードを2枚引く。その後自分の手札が6枚以下なら攻撃を中止する。')
   return {evolution:{any:[{race:'レクスターズ'},{civilization:'水'}]},starEvolution:true,breaker:3,
    g34Attack:[{op:'Draw',n:2},{op:'IfHand246',max:6,defs:[{op:'Custom',name:'stopAttack'}]}]};
 }
 if(phase>=905&&d.faces.length===1){
  if(creature&&d.id==='dmrp18-092'&&compact363===
   'このクリーチャーの召喚コストを自分のマナゾーンの進化クリーチャー1体につき1少なくする。ただしコストは0より少なくならない。')
   return {g212CountDiscount:{zone:'mana',filter:{creature:true,evolution:true},amount:1,minimum:0}};
  if(f.typeText==='呪文'&&d.id==='dmrp10-080'&&compact363===
   'このターン自分の水のクリーチャーはブロックされない。相手の手札を1枚見ないで選び相手はそれを見せる。')
   return {effect:'sixPhoto',g34Tasks:[
    {op:'GroupGrant364',owner:'self',filter:{creature:true,color:'水'},grant:{unblockable:true},spell:true},
    {op:'BlindReveal803',owner:'opponent'}
   ]};
  if(f.typeText==='呪文'&&d.id==='dmrp16-006'&&compact363===
   '自分のシールドをすべて墓地に置く。その後このようにして墓地に置いたカードの枚数より1枚多く自分の山札の上から裏向きのままそれぞれ新しいシールドとしてシールドゾーンに置く。')
   return {effect:'sixPhoto',g34Tasks:[{op:'Ragnarok'}]};
 }
 if(phase>=904&&d.faces.length===1){
  if(creature&&['dmrp09-021','dmex17-057'].includes(d.id)&&compact363===
   '自分のクリーチャーがタップした時それを破壊してもよい。そうしたらカードを1枚引く。')
   return {g904AllyTap:true};
  if(f.typeText==='呪文'&&d.id==='dmrp12-096'&&compact363===
   '自分のクリーチャーを1体選ぶ。このターンそのクリーチャーがはじめて攻撃する時そのクリーチャーをアンタップする。カードを1枚引く。')
   return {effect:'sixPhoto',g34Tasks:[{op:'Target',owner:'self',g904FirstAttackUntap:true},{op:'Draw',n:1}]};
  if(f.typeText==='呪文'&&['dmrp16-087','promoy21-075'].includes(d.id)&&[
   '相手の手札を見る。その中から1枚選んで表向きにし新しいシールドとして持ち主のシールドゾーンに置いてもよい。',
   '相手の手札を見る。その中から1枚選び表向きにシールド化してもよい。'
  ].includes(compact363))
   return {effect:'sixPhoto',g34Tasks:[{op:'InspectHand',g223Inspect:true,chooseOne:true,g904ToShield:true}]};
 }
 if(phase>=903&&creature&&d.faces.length===1){
  if(d.id==='dmrp12-041'&&compact363===
   'S・トリガーS・トリガー(このクリーチャーをシールドゾーンから手札に加える時コストを支払わずにすぐ召喚してもよい)このクリーチャーがバトルゾーンに出た時そのターン相手のコスト5以下のクリーチャーはすべて攻撃もブロックもできない。')
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'GroupFreeze',filter:{max:5},g190Freeze:'end'}]};
  if(d.id==='dmrp09-s06'&&compact363===
   'T・ブレイカーこのクリーチャーが攻撃する時自分のクリーチャーを1体破壊する。自分のクリーチャーが破壊された時次のうちいずれか1つを選ぶ。▶カードを1枚引く。▶相手のクリーチャーを1体選ぶ。このターンそのクリーチャーのパワーを-3000する。')
   return {breaker:3,g34Attack:[{op:'Select',origin:'battle',owner:'self',to:'grave',n:1,filter:{creature:true},g187OwnPick:true,title:'破壊する自分のクリーチャーを1体指定する'}],
    g303DeathWatch:{self:true,g891LookBackSelf:true,defs:[{op:'Choose',g184Modes:true,modes:[
     {label:'カードを1枚引く',defs:[{op:'Draw',n:1}]},
     {label:'相手クリーチャー1体のパワーを-3000',defs:[{op:'Target',power:-3000,g242PowerMinus:true}]}
    ]}]}};
  if(d.id==='dmrp18-077'&&compact363===
   'ブロッカーブロッカー(このクリーチャーをタップして相手クリーチャーの攻撃先をこのクリーチャーに変更してもよい)このクリーチャーは攻撃できない。このクリーチャーが出た時山札の上から1枚目を墓地に置く。')
   return {blocker:true,noAttack:true,effect:'sixPhoto',g34Tasks:[{op:'Mill',n:1}]};
 }
 if(phase>=902&&creature&&d.faces.length===1){
  if(d.id==='dmrp17-032'&&compact363===
   '自分のターンの終わりにこのクリーチャーをタップしてもよい。そうしたら自分の他のクリーチャーを1体アンタップする。ササゲール1(ディスペクターを召喚する時コストを1少なくしてもよい。そうしたらこのクリーチャーを破壊する。そのディスペクターのコストは0以下にはならない)')
   return {sasage:1,g174End:[{op:'TapToUntap748',otherAlly:true}]};
  if(d.id==='dmrp17-001'&&compact363===
   '自分の進化クリーチャーの召喚コストを1少なくする。ただしコストは0以下にはならない。このクリーチャーが出た時次の自分のターンのはじめまでこのクリーチャーは離れない。シンカパワー:このクリーチャーが進化する時次の自分のターンのはじめまで相手はコスト4以下の呪文を唱えられない。')
   return {evolutionReduction:1,effect:'sixPhoto',g34Tasks:[{op:'Stay627'}],g397Shinka:[{op:'SpellLock489',max:4,expires:'start'}]};
  if(d.id==='dmrp10-069'&&compact363===
   'このクリーチャーが破壊される時裏向きにして新しいシールドとして自分のシールドゾーンに置く。')
   return {g842DestroyShield:true};
 }
 if(phase>=901&&creature&&d.faces.length===1){
  if(d.id==='dmrp17-041'&&compact363===
   'シールド・セイバー(自分のシールドがブレイクされる時かわりにこのクリーチャーを破壊してもよい)自分のパワー6000以上のクリーチャーが出た時このクリーチャーを自分の墓地から手札に戻す。')
   return {g401ShieldSaver:true,g901GraveEntryPower:6000};
  if(d.id==='dmrp09-044'&&compact363===
   'W・ブレイカー(このクリーチャーはシールドを2つブレイクする)このターンにクリーチャーが破壊されていなければこのクリーチャーは攻撃できない。')
   return {breaker:2,g225AttackRequires:{kind:'creatureDeath'}};
  if(d.id==='dmrp11-094'&&compact363===
   'このクリーチャーが破壊された時それがアンタップしていたら自分の墓地からバトルゾーンにタップして出す。')
   return {g172Death:[{op:'SelfGraveRevive644',g901Untapped:true,tapped:true}]};
 }
 if(phase>=900&&creature&&d.faces.length===1){
  if(d.id==='dmrp11-100'&&compact363===
   'S・トリガーS・トリガー(このクリーチャーをシールドゾーンから手札に加える時コストを支払わずにすぐ召喚してもよい)このクリーチャーをバトルゾーンにタップして出してもよい。相手のクリーチャーが攻撃する時可能ならこのクリーチャーを攻撃する。')
   return {trigger:true,g432EntryTap:true,g431AttackMe:true};
  if(d.id==='dmrp11-083'&&compact363===
   'ブロッカーブロッカー(このクリーチャーをタップして相手クリーチャーの攻撃先をこのクリーチャーに変更してもよい)ターンの終わりにこのクリーチャーがタップしていればこのクリーチャーを破壊する。')
   return {blocker:true,g474AnyEnd:[{op:'IfOwn',filter:{g590SourceTapped:true},defs:[{op:'SelfDestroy'}]}]};
  if(d.id==='dmrp12-099'&&compact363===
   'S・トリガーS・トリガー(このクリーチャーをシールドゾーンから手札に加える時コストを支払わずにすぐ召喚してもよい)このクリーチャーがバトルゾーンに出た時カードを1枚自分の墓地からマナゾーンに置いてもよい。')
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'Select',origin:'grave',to:'mana',n:1,optional:true,filter:{}}]};
 }
 if(phase>=899&&creature&&d.faces.length===1){
  if(['dmrp17-011','dm22ex2-013'].includes(d.id)&&[
   'マッハファイター(このクリーチャーは出たターンの間タップまたはアンタップしているクリーチャーを攻撃できる)コスト5以下のクリーチャーを攻撃中このクリーチャーに「スレイヤー」を与える。このクリーチャーが出た時コスト5以下のクリーチャーを1体自分の手札から出してもよい。',
   'マッハファイターコスト5以下のクリーチャーを攻撃中このクリーチャーに「スレイヤー」を与える。このクリーチャーが出た時コスト5以下のクリーチャーを1体自分の手札から出してもよい。'].includes(compact363))
   return {machFighter:true,g899AttackSlayerMax:5,effect:'sixPhoto',g34Tasks:[{op:'Select',origin:'hand',deploy:true,n:1,optional:true,filter:{creature:true,max:5}}]};
  if(d.id==='dmrp09-057'&&compact363===
   'このクリーチャーが攻撃する時自分の他のクリーチャーを好きな数タップしてもよい。こうしてタップしたクリーチャー1体につき自分の山札の上から1枚をマナゾーンに置く。')
   return {g34Attack:[{op:'Select',origin:'battle',owner:'self',n:'all',optional:true,g187OwnPick:true,g899RampTapped:true,filter:{creature:true,untapped:true}}]};
  if(d.id==='dmrp11-054'&&compact363===
   'このクリーチャーがバトルゾーンに出た時そのターン中すでに自分の他のクリーチャーがバトルゾーンに出ていればこのターンこのクリーチャーに「スピードアタッカー」を与える。(「スピードアタッカー」を持つクリーチャーは召喚酔いしない)')
   return {effect:'sixPhoto',g34Tasks:[{op:'IfOwn',filter:{g334ZoneCount:{zone:'enteredThisTurn',min:2}},defs:[{op:'SelfGrant754',g770LiveCreature:true,grant:{speedAttacker:true}}]}]};
 }
 if(phase>=898&&creature&&d.faces.length===1){
  if(d.id==='dmrp14-035'&&compact363==='相手のコスト4以下のクリーチャーが手札以外のどこからでもバトルゾーンに出る時相手はかわりにそのクリーチャーを手札に加える。')
   return {g38Bell:true,g898BellMax:4};
  if(d.id==='dmrp17-063'&&compact363===
   '自分のパワー6000以上のクリーチャーがバトルゾーンにあればこのクリーチャーに「ブロッカー」を与える。(「ブロッカー」を持つクリーチャーをタップして相手クリーチャーの攻撃先をそのクリーチャーに変更してもよい)')
   return {g260Self:{filter:{creature:true,minPower:6000,g199Power:true},grants:{blocker:true}}};
  if(d.id==='dmrp09-s12'&&compact363===
   'マッハファイター(このクリーチャーはバトルゾーンに出たターンの間タップまたはアンタップしているクリーチャーを攻撃できる)T・ブレイカーこのクリーチャーがバトルで勝った時カードを1枚引く。その後パワー12000以上のクリーチャーを1体自分の手札からバトルゾーンに出してもよい。')
   return {machFighter:true,breaker:3,g189BattleWin:[{op:'Draw',n:1},
    {op:'Select',origin:'hand',deploy:true,n:1,optional:true,filter:{creature:true,minPower:12000}}]};
 }
 if(phase>=897&&creature&&d.faces.length===1){
  if(d.id==='dmrp14-007'&&compact363===
   'ブロッカーブロッカースピードアタッカークリーチャーの攻撃の終わりにそれがこのターン最初の攻撃なら自分のクリーチャーを1体アンタップする。')
   return {blocker:true,speedAttacker:true,g897FirstAttackEnd:[{op:'Target',owner:'self',untap:true}]};
  if(d.id==='dmrp13-s03'&&compact363===
   'W・ブレイカーこのクリーチャーがバトルゾーンを離れる時かわりに自分の手札を1枚捨ててもよい。鬼タイム:自分と相手のシールドの数が合計6つ以下なら相手のクリーチャーはタップしてバトルゾーンに出る。')
   return {breaker:2,g897LeaveDiscard:true,g260Self:{filter:{g334ZoneCount:{zone:'shields',sumBoth:true,max:6}},grants:{g720TapEntry:{all:true}}}};
  if(['dmrp16-046','dm24bd5-045'].includes(d.id)&&[
   '相手のクリーチャーがバトルゾーンに出た時それが相手がこのターンバトルゾーンに出した1体目のクリーチャーでなければ自分の山札の上から1枚目をマナゾーンに置いてもよい。',
   '相手のクリーチャーが出た時それが相手がこのターン出した1体目のクリーチャーでなければ自分の山札の上から1枚目をマナゾーンに置いてもよい。'
  ].includes(compact363))return {g314OtherEntry:{who:'opponent',filter:{creature:true},minEntryCount:2,
   defs:[{op:'Offer',title:'山札の上から1枚をマナゾーンに置く？',defs:[{op:'Ramp',n:1}]}]}};
 }
 if(phase>=896&&creature&&d.faces.length===1){
  if(d.id==='dmrp15-093'&&compact363===
   '各ターン自分の2体目以降のクリーチャーの召喚コストを1少なくする。ただしコストは0以下にならない。各ターン自分の2枚目以降の呪文を唱えるコストを1少なくする。ただしコストは0以下にならない。')
   return {g468UseReduction:{g896LaterSameKind:true,amount:1}};
  if(d.id==='dmrp15-070'&&compact363===
   'このクリーチャーがバトルゾーンに出た時自分の山札の上から2枚を墓地に置く。自分のターンの終わりにこのクリーチャーがバトルゾーンにあれば名前に《グルジェ・グルジェ》とあるクリーチャーをすべて自分の墓地からバトルゾーンに出す。')
   return {effect:'sixPhoto',g34Tasks:[{op:'Mill',n:2}],g174End:[{op:'IfSource541',defs:[
    {op:'Select',origin:'grave',deploy:true,n:'all',filter:{creature:true,g819CreatureNameIncludes:'グルジェ・グルジェ'}}
   ]}]};
  if(d.id==='dmrp16-016'&&compact363==='相手のクリーチャーが攻撃する時可能なら自分を攻撃する。')
   return {g896AttackPlayer:true};
 }
 if(phase>=895&&creature&&d.faces.length===1){
  if(d.id==='dmrp15-054'&&compact363===
   '水または火のクリーチャーを召喚によって自分の手札からバトルゾーンに出した時自分の手札を1枚捨てその後カードを1枚引く。')
   return {g251EntryDraw:{filter:{creature:true,any:[{color:'水'},{color:'火'}]},g895SummonedHand:true,
    defs:[{op:'Discard',owner:'self',n:1},{op:'Draw',n:1}]}};
  if(d.id==='dmrp16-095'&&compact363===
   '各ターン自分が最初のクリーチャーを召喚した時そのターンこのクリーチャーのパワーを+5000し「W・ブレイカー」を与える。(「W・ブレイカー」を持つクリーチャーはシールドを2つブレイクする)')
   return {g808SummonWatch:{g895FirstSummon:true,defs:[{op:'SelfBoost313',power:5000,breaker:2,g536Source:true}]}};
  if(['dmrp16-056','dm22ex2-049','promoy22-077'].includes(d.id)&&[
   'このクリーチャーがバトルゾーンに出た時このクリーチャーを破壊してもよい。そしたら',
   'このクリーチャーが出た時このクリーチャーを破壊してもよい。そうしたら'
  ].some(start=>compact363===start+'次のうちいずれか1つを選ぶ。▶相手の手札を1枚見ないで選び捨てさせる。▶相手のパワー2000以下のクリーチャーを1体破壊する。'||
   compact363===start+'次のうちいずれか1つを選ぶ。▶相手の手札を1枚見ないで選び捨てさせる。▶相手のパワー2000以下のクリーチャーを1体選び破壊する。'))
   return {effect:'sixPhoto',g34Tasks:[{op:'SelfSacrifice407',defs:[{op:'Choose',g184Modes:true,modes:[
    {label:'相手の手札1枚を見ないで選び捨てさせる',defs:[{op:'Discard',n:1,random:true}]},
    {label:'相手のパワー2000以下のクリーチャー1体を破壊する',defs:[{op:'Target',to:'grave',filter:{maxPower:2000,g199Power:true}}]}
   ]}]}]};
 }
 if(phase>=894){
  if(d.id==='dmex14-055'&&f.typeText==='呪文'&&compact363===
   'コスト4以下の進化ではないジョーカーズ・クリーチャーを1体自分の手札からバトルゾーンに出してもよい。レインボーナス:バトルゾーンに自分の多色クリーチャーがあれば相手と自分のクリーチャーを1体ずつ選んでもよい。その2体をバトルさせる。')
   return {effect:'sixPhoto',g34Tasks:[{op:'Select',origin:'hand',n:1,deploy:true,optional:true,
    filter:{creature:true,nonEvolution:true,race:'ジョーカーズ',max:4}},
    {op:'IfOwn',filter:{creature:true,multi:true},defs:[{op:'Fight240',optional:true}]}]};
  const dashZero='キリフダッシュ[cc00](自分のクリーチャーの攻撃の終わりにそのクリーチャーがその攻撃中にシールドをブレイクしていればこのクリーチャーをコストを支払わずに召喚してもよい)';
  if(['dmrp15-095','dm24ex2-100'].includes(d.id)&&creature&&[
   dashZero+'自分のマナゾーンに火のカードと自然のカードがそれぞれ1枚以上なければこのクリーチャーは攻撃できない。',
   dashZero+'自分のマナゾーンに火と自然の文明がなければこのクリーチャーは攻撃できない。'
  ].includes(compact363))
   return {kirifudaDash:0,g402DashColors:[],noAttack:true,g260Self:{filter:{g568ManaColors:['火','自然']},grants:{noAttack:false}}};
  if(d.id==='dmrp13-s09'&&creature&&compact363===
   'スピードアタッカーW・ブレイカーこのクリーチャーが攻撃する時相手のクリーチャーを1体選ぶ。このターンそのクリーチャーのパワーを-5000する。鬼タイム:自分と相手のシールドの数が合計6つ以下なら自分のクリーチャーすべてに「ブロッカー」と「スレイヤー」を与える。')
   return {speedAttacker:true,breaker:2,g34Attack:[{op:'Target',power:-5000,g242PowerMinus:true}],
    g208Auras:[{filter:{creature:true},g557Condition:{g334ZoneCount:{zone:'shields',sumBoth:true,max:6}},grants:{blocker:true,slayer:true}}]};
 }
 if(phase>=893&&creature){
  const active={g334ZoneCount:{zone:'shields',sumBoth:true,min:7}};
  const oniIgnore='鬼タイム:自分と相手のシールドの数が合計6つ以下なら真上の▪️能力を無視する。';
  const blocker='ブロッカーブロッカー(このクリーチャーをタップして相手クリーチャーの攻撃先をこのクリーチャーに変更してもよい)';
  if(d.id==='dmrp15-069'&&compact363===blocker+
   '各ターンの終わりにこのクリーチャーがタップしていたら破壊する。'+oniIgnore||
   d.id==='dmrp14-054'&&compact363===blocker+
   'スピードアタッカー(このクリーチャーは召喚酔いしない)各ターンの終わりにこのクリーチャーがタップしていれば破壊する。'+oniIgnore)
   return {blocker:true,...(d.id==='dmrp14-054'?{speedAttacker:true}:{}),g260Self:{filter:active,
    grants:{g474AnyEnd:[{op:'IfOwn',filter:{g590SourceTapped:true},defs:[{op:'SelfDestroy'}]}]}}};
  if(d.id==='dmrp15-041'&&compact363===
   'このクリーチャーが攻撃する時自分のシールドを1つ手札に加える。ただしその「S・トリガー」は使えない。'+oniIgnore)
   return {g260Self:{filter:active,grants:{g34Attack:[{op:'ShieldHand',g238ShieldHand:true}]}}};
 }
 if(phase>=892&&creature){
  if(d.id==='dmrp14-059'&&compact363===
   'ブロッカーブロッカー(このクリーチャーをタップして相手クリーチャーの攻撃先をこのクリーチャーに変更してもよい)各ターンこのクリーチャーがはじめてタップした時自分の火のクリーチャーがバトルゾーンにあればこのクリーチャーをアンタップする。')
   return {blocker:true,g219FirstTap:[{op:'IfOwn',filter:{creature:true,color:'火'},defs:[{op:'Untap',g191First:true}]}]};
  if(d.id==='dmrp14-071'&&compact363===
   'スレイヤー(このクリーチャーがバトルする時バトルの後相手クリーチャーを破壊する)このクリーチャーが破壊される時バトルゾーンに自分の自然のクリーチャーがあれば墓地に置くかわりにマナゾーンに置く。')
   return {slayer:true,g260Self:{filter:{creature:true,color:'自然'},grants:{destroyToMana:true}}};
  if(d.id==='dmrp14-094'&&compact363===
   'このクリーチャーがバトルゾーンに出た時自分の山札の上から1枚目を表向きにする。それが自分のマナゾーンにあるカードの枚数以下のコストを持つクリーチャーなら手札に加える。そうでなければ墓地に置く。')
   return {effect:'sixPhoto',g34Tasks:[{op:'RevealTop514',filter:{creature:true},g746OwnManaCost:true,to:'hand',elseTo:'grave'}]};
 }
 if(phase>=891){
  if(d.id==='dmrp14-037'&&f.typeText==='呪文'&&compact363===
   'S・トリガーS・トリガー(この呪文をシールドゾーンから手札に加える時コストを支払わずにすぐ唱えてもよい)相手のクリーチャーを1体選ぶ。その後自分のクリーチャーを1体選んでもよい。それらを持ち主の手札に戻す。')
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'Select',origin:'battle',owner:'opponent',to:'hand',n:1,
    g173Targets:true,g193Select:true,g891BouncePair:true,filter:{creature:true},title:'手札に戻す相手のクリーチャーを1体選ぶ'}]};
  if(d.id==='dmrp14-010'&&creature&&compact363===
   'W・ブレイカー自分のクリーチャーがバトルゾーンを離れた時カードを1枚引いてもよい。')
   return {breaker:2,g891OwnCreatureLeaves:[{op:'Draw',n:1,optional:true}]};
  if(d.id==='dmex14-006'&&creature&&compact363===
   'スレイヤーレインボーナス:クリーチャーが破壊された時バトルゾーンに自分の多色クリーチャーがあればカードを1枚引いてもよい。')
   return {slayer:true,g303DeathWatch:{both:true,self:true,g891LookBackSelf:true,
    defs:[{op:'IfOwn',filter:{creature:true,multi:true},defs:[{op:'Draw',n:1,optional:true}]}]}};
 }
 if(phase>=890){
  if(d.id==='dmrp15-071'&&creature&&compact363===
   "ブロッカーブロッカー(このクリーチャーをタップして相手クリーチャーの攻撃先をこのクリーチャーに変更してもよい)このクリーチャーが攻撃する時攻撃の後このクリーチャーを破壊する。オシオキムーン:カードが自分のシールドゾーンを離れた時そのターンこのクリーチャーに「スレイヤー」を与える。(「スレイヤー」を持つクリーチャーがバトルする時バトルの後相手クリーチャーを破壊する)")
   return {blocker:true,g34Attack:[{op:'AfterAttack542',defs:[{op:'SelfDestroy'}]}],
    g536ShieldLeft:[{op:'ShinkaGrant397',grant:{slayer:true}}]};
  if(['promoy19-056','dmrp15-048','promoy21-013'].includes(d.id)&&creature&&
   compact363.replace('このクリーチャーが出た時','このクリーチャーがバトルゾーンに出た時')===
   "ブロッカーブロッカー(このクリーチャーをタップして相手クリーチャーの攻撃先をこのクリーチャーに変更してもよい)このクリーチャーがバトルゾーンに出た時自分のシールドを1つ墓地に置く。オシオキムーン:カードが自分のシールドゾーンを離れた時相手は自身のクリーチャーを1体選び破壊する。")
   return {blocker:true,effect:'sixPhoto',g34Tasks:[{op:'ShieldGrave',g239ShieldGrave:true}],
    g536ShieldLeft:[{op:'OpponentSelect',n:1,to:'grave'}]};
  if(d.id==='dmrp13-036'&&f.typeText==='呪文'&&compact363===
   "S・トリガーS・トリガー(この呪文をシールドゾーンから手札に加える時コストを支払わずにすぐ唱えてもよい)パワー4000以下のクリーチャーを2体まで選び持ち主の手札に戻す。")
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'Select',origin:'battle',anyOwner:true,to:'hand',n:2,optional:true,
    g173Targets:true,g193Select:true,filter:{creature:true,maxPower:4000,g199Power:true},
    title:'手札に戻すパワー4000以下のクリーチャーを2体まで選ぶ'}]};
 }
 if(phase>=889&&creature){
  if(['dmex13-023','dmex19-035'].includes(d.id)&&compact363.replace('このクリーチャーが出た時','このクリーチャーがバトルゾーンに出た時')===
   "ブロッカーブロッカー(このクリーチャーをタップして相手クリーチャーの攻撃先をこのクリーチャーに変更してもよい)スレイヤー(このクリーチャーがバトルする時バトルの後相手クリーチャーを破壊する)W・ブレイカー(このクリーチャーはシールドを2つブレイクする)このクリーチャーがバトルゾーンに出た時コスト4以下の呪文を1枚自分の手札からコストを支払わずに唱えてもよい。オシオキムーン:カードが自分のシールドゾーンを離れた時呪文を1枚自分の墓地から手札に戻す。")
   return {blocker:true,slayer:true,breaker:2,effect:'sixPhoto',
    g34Tasks:[{op:'Execute',origin:'hand',spellOnly:true,max:4,optional:true}],
    g536ShieldLeft:[{op:'Select',origin:'grave',to:'hand',n:1,filter:{g228Face:{type:'spell'}}}]};
  if(d.id==='dmrp16-001'&&compact363===
   "シンパシー:クリーチャー(このクリーチャーの召喚コストはバトルゾーンにある自分のクリーチャー1体につき1少なくなる。ただしコストは0以下にはならない)ブロッカーブロッカーW・ブレイカーこのクリーチャーがバトルゾーンに出た時カードを1枚引く。オシオキムーン:カードが自分のシールドゾーンを離れた時光または闇のコスト3以下のクリーチャーを1体自分の手札からバトルゾーンに出してもよい。")
   return {g211Sympathy:{amount:1,filter:{creature:true}},blocker:true,breaker:2,effect:'sixPhoto',
    g34Tasks:[{op:'Draw',n:1}],g536ShieldLeft:[{op:'Select',origin:'hand',deploy:true,n:1,optional:true,
     filter:{creature:true,max:3,any:[{color:'光'},{color:'闇'}]}}]};
  if(d.id==='dmrp16-072'&&compact363===
   "ブロッカーブロッカー(このクリーチャーをタップして相手クリーチャーの攻撃先をこのクリーチャーに変更してもよい)このクリーチャーは攻撃できない。オシオキムーン:カードが自分のシールドゾーンを離れた時《死してなお蜜月のゲンショク》を1体自分の墓地からバトルゾーンに出す。")
   return {blocker:true,noAttack:true,g536ShieldLeft:[{op:'Select',origin:'grave',deploy:true,n:1,
    filter:{creature:true,g201ExactName:'死してなお蜜月のゲンショク'}}]};
 }
 if(phase>=888&&creature){
  if(d.id==='dmex14-s02'&&compact363===
   'ブロッカーブロッカーW・ブレイカー自分の他のクリーチャーすべてのパワーを+2000する。オシオキムーン:カードが自分のシールドゾーンを離れた時このターン相手のクリーチャーすべてのパワーを-2000する(パワー0以下のクリーチャーは破壊される)')
   return {blocker:true,breaker:2,g205Aura:{power:2000,filter:{creature:true},other:true},
    g536ShieldLeft:[{op:'GroupPower',owner:'opponent',power:-2000,filter:{creature:true}}]};
  if(d.id==='dmex13-074'&&compact363===
   '自分のターンの終わりに自分のシールドを1つ手札に加えてもよい。ただしその「S・トリガー」は使えない。オシオキムーン:カードが自分のシールドゾーンを離れた時相手のコスト1のクリーチャーを1体破壊する。')
   return {g174End:[{op:'ShieldHand',g238ShieldHand:true,optional:true,g535Count:1}],
    g536ShieldLeft:[{op:'Target',to:'grave',filter:{min:1,max:1}}]};
  if(d.id==='dmex14-016'&&compact363===
   'このクリーチャーがバトルゾーンに出た時自分のシールドを1つ墓地に置いてもよい。オシオキムーン:カードが自分のシールドゾーンを離れた時相手の手札が2枚以上あれば相手は自身の手札を1枚選び捨てる。')
   return {effect:'sixPhoto',g34Tasks:[{op:'ShieldGrave',g239ShieldGrave:true,optional:true}],
    g536ShieldLeft:[{op:'IfOwn',filter:{g334ZoneCount:{zone:'hand',opponent:true,min:2}},defs:[{op:'Discard',n:1}]}]};
 }
 if(phase>=887&&creature){
  if(d.id==='dmrp15-049'&&compact363===
   'ブロッカーブロッカー(このクリーチャーをタップして相手クリーチャーの攻撃先をこのクリーチャーに変更してもよい)このクリーチャーは相手プレイヤーを攻撃できない。このクリーチャーがバトルゾーンに出た時自分の山札の上から1枚目を墓地に置く。オシオキムーン:カードが自分のシールドゾーンを離れた時クリーチャーを1体自分の墓地から手札に戻す。')
   return {blocker:true,noPlayerAttack:true,effect:'sixPhoto',g34Tasks:[{op:'Mill',n:1}],
    g536ShieldLeft:[{op:'Select',origin:'grave',to:'hand',n:1,filter:{creature:true}}]};
  if(d.id==='dmrp16-059'&&compact363===
   'ブロッカーブロッカー(このクリーチャーをタップして相手クリーチャーの攻撃先をこのクリーチャーに変更してもよい)このクリーチャーは相手プレイヤーを攻撃できない。オシオキムーン:カードが自分のシールドゾーンを離れた時このクリーチャーをアンタップする。')
   return {blocker:true,noPlayerAttack:true,g536ShieldLeft:[{op:'Untap',g191First:true}]};
  if(d.id==='dmrp15-012'&&compact363===
   'W・ブレイカー(このクリーチャーはシールドを2つブレイクする)このクリーチャーはタップしてバトルゾーンに置かれ自分のターンのはじめにアンタップしない。オシオキムーン:カードが自分のシールドゾーンを離れた時このクリーチャーをアンタップする。')
   return {breaker:2,g295EnterTapped:true,g40StartNoUntap:true,g536ShieldLeft:[{op:'Untap',g191First:true}]};
 }
 if(phase>=886&&creature){
  if(d.id==='dmrp16-086'&&compact363===
   'ブロッカーブロッカー(このクリーチャーをタップして相手クリーチャーの攻撃先をこのクリーチャーに変更してもよい)W・ブレイカー(このクリーチャーはシールドを2つブレイクする)オシオキムーン:カードが自分のシールドゾーンを離れた時カードを1枚引いてもよい。')
   return {blocker:true,breaker:2,g536ShieldLeft:[{op:'Draw',n:1,optional:true}]};
  if(d.id==='dmrp16-049'&&compact363===
   'このクリーチャーが破壊された時他のカードを1枚自分の墓地から表向きのまま新しいシールドとしてシールドゾーンに置く。オシオキムーン:カードが自分のシールドゾーンを離れた時自分の山札の上から3枚を墓地に置いてもよい。')
   return {g172Death:[{op:'Select',origin:'grave',to:'shields',n:1,g186Other:true,g657FaceUp:true}],
    g536ShieldLeft:[{op:'Mill',n:3,optional:true}]};
  if(d.id==='dmrp16-048'&&compact363===
   'ブロッカーブロッカー(このクリーチャーをタップして相手クリーチャーの攻撃先をこのクリーチャーに変更してもよい)オシオキムーン:カードが自分のシールドゾーンを離れた時相手のクリーチャーを1体選ぶ。次の自分のターンのはじめまでそのクリーチャーは可能なら攻撃する。')
   return {blocker:true,g536ShieldLeft:[{op:'Target',g546Force:'untilOwnStart'}]};
 }
 if(phase>=885){
  if(d.id==='dmrp14-075'&&f.typeText==='クリーチャー'&&compact363===
   'S・トリガーS・トリガー(このクリーチャーをシールドゾーンから手札に加える時コストを支払わずにすぐ召喚してもよい)このクリーチャーがバトルゾーンに出た時自分の闇のクリーチャーがバトルゾーンにあれば相手のクリーチャーを1体選ぶ。そのターンそのクリーチャーのパワーを-4000する。(パワー0以下のクリーチャーは破壊される)')
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'IfOwn',filter:{creature:true,color:'闇'},
    defs:[{op:'Target',power:-4000,g242PowerMinus:true}]}]};
  if(d.id==='dmrp17-087'&&f.typeText==='呪文'&&compact363===
   '{GS}G・ストライク(この呪文を自分のシールドゾーンから手札に加える時相手に見せ相手のクリーチャーを1体選んでもよい。このターンそのクリーチャーは攻撃できない)自分のクリーチャーを1体選ぶ。このターンそのクリーチャーがはじめてタップした時アンタップする。')
   return {gStrike:true,effect:'sixPhoto',g34Tasks:[{op:'Target',owner:'self',g885FirstTap:true,
    title:'このターン最初のタップでアンタップする自分のクリーチャーを選ぶ'}]};
  if(d.id==='dmrp15-003'&&f.typeText==='クリーチャー'&&compact363===
   'ブロッカーブロッカーW・ブレイカーオシオキムーン:カードが自分のシールドゾーンを離れた時相手は自身の手札を2枚選び捨てる。')
   return {blocker:true,breaker:2,g536ShieldLeft:[{op:'Discard',n:2}]};
 }
 if(phase>=884){
  if(d.id==='dmrp17-009'&&f.typeText==='クリーチャー'&&compact363.replaceAll('▶︎','▶')===
   'EXライフ(このクリーチャーを出す時自分の山札の上から1枚目をシールド化する。このクリーチャーが離れる時かわりにそのシールドを墓地に置く)スピードアタッカーW・ブレイカーカードが自分のシールドゾーンから墓地に置かれた時次のうちいずれか1つを選ぶ。▶カードを1枚引く。▶相手は自身の手札を1枚選んで捨てる。▶相手のクリーチャーを1体選びタップする。')
   return {exLife:true,speedAttacker:true,breaker:2,g159ShieldRole:'gaizeki',g884ShieldGraveModes:[
    {label:'カードを1枚引く',defs:[{op:'Draw',n:1}]},
    {label:'相手が手札を1枚選んで捨てる',defs:[{op:'Discard',n:1}]},
    {label:'相手のクリーチャーを1体タップする',defs:[{op:'Target',tap:true}]}
   ]};
  if(d.id==='dmrp17-034'&&f.typeText==='呪文'&&compact363===waveTriggerSpell703+
   '自分のクリーチャーを1体選び表向きにシールド化する。その後相手のクリーチャーを1体選び表向きにシールド化する。'){
   const shield={op:'Target',to:'shields',faceUp:true};
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{...shield,owner:'self',title:'表向きにシールド化する自分のクリーチャーを選ぶ'},
    {...shield,title:'表向きにシールド化する相手のクリーチャーを選ぶ'}]};
  }
  if(d.id==='dmrp16-013'&&f.typeText==='呪文'&&compact363===
   '自分の山札の上から2枚を裏向きのままそれぞれ新しいシールドとしてシールドゾーンに置く。その後自分のシールドを1つ手札に加える。(その「S・トリガー」を使ってもよい)')
   return {effect:'sixPhoto',g34Tasks:[{op:'ShieldTop',n:2,g779Simultaneous:true},{op:'TappedShieldPick842',owner:'self',n:1,picked:[]}]};
 }
 if(phase>=883&&f.typeText==='クリーチャー'){
  if(d.id==='dmrp14-087'&&compact363==='各ターンはじめてカードが自分のシールドゾーンに置かれた時カードを1枚引く。')
   return {g159ShieldRole:'watchdog'};
  if(d.id==='dm23ex1-065'&&compact363==='カードが自分のシールドゾーンから墓地に置かれた時自分の山札の上から1枚目をシールド化する。')
   return {g159ShieldRole:'ashiga'};
 }
 if(phase>=882){
  const script='そのクリーチャーよりコストが小さいクリーチャーを1体自分の手札から';
  if(f.typeText==='クリーチャー'&&(
   d.id==='dmr08-010'&&compact363==='このクリーチャーをバトルゾーンに出した時バトルゾーンにある他のクリーチャーを1体選び持ち主の手札に戻す。その後'+script+'バトルゾーンに出してもよい。'||
   ['dm22ex1-045','dm25ex1-041'].includes(d.id)&&compact363==='このクリーチャーが出た時他のクリーチャーを1体選び持ち主の手札に戻す。その後'+script+'出してもよい。'))
   return {effect:'sixPhoto',g34Tasks:[{op:'Target',anyOwner:true,g179Other:true,to:'hand',g882DeployBelowCost:true,title:'手札に戻す他のクリーチャーを選ぶ'}]};
  if(f.typeText==='呪文'&&d.id==='dmrp04s-034'&&compact363===
   '自分のクリーチャーを1体タップする。その後それよりパワーが小さい相手のクリーチャーをすべてタップする。')
   return {effect:'sixPhoto',g34Tasks:[christinaFall()]};
  if(f.typeText==='呪文'&&d.id==='dmex15-b017'&&compact363===
   '相手のパワー14000以下のクリーチャーをすべて破壊する。次の自分のターンのはじめまで自分はゲームに負けず相手は勝たない。')
   return {effect:'sixPhoto',g34Tasks:[{op:'Sweep',to:'grave',filter:{creature:true,maxPower:14000,g199Power:true}},
    {op:'Lock',g746Self:true,limit:{kind:'g34NoLose'}}]};
 }
 if(phase>=881&&f.typeText==='クリーチャー'){
  if(['dmr09-069','promoy12-050'].includes(d.id)&&compact363===
   'このクリーチャーがバトルゾーンにあれば自分のマナゾーンにあるかのようにこのカードをタップしてマナを生み出してもよい。(このクリーチャーをバトルゾーンに出したターンにこの能力を使ってもよい)')
   return {manaBird:'ownColors'};
  if(d.id==='dmr09-023'&&compact363===
   'このクリーチャーがどこからでも墓地に置かれた時自分のマナゾーンに闇のカードが3枚以上あればバトルゾーンにある相手のクリーチャーを1体選ぶ。そのターンそのクリーチャーのパワーは-2000される。(パワー0以下のクリーチャーは破壊される)W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)')
   return {breaker:2,g675GraveEntry:[{op:'IfOwn',filter:{g267Mana:{n:3,color:'闇'}},
    defs:[{op:'Target',power:-2000,g242PowerMinus:true}]}]};
  if(d.id==='dmr08-018'&&compact363===
   '自分のターンのはじめにバトルゾーンに他のどのクリーチャーよりもパワーが大きい自分のクリーチャーがあれば自分の山札の上から2枚を見てそのうちの1枚を自分の手札に加えもう1枚をマナゾーンに置いてもよい。W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)')
   return {breaker:2,g174Start:[{op:'IfOwn',filter:{g881HighestPower:true},defs:[
    {op:'Offer',title:'山札の上2枚を見て、手札とマナに1枚ずつ置く？',g359RevealAll:true,
     defs:[{op:'Look',n:2,g255Distribute:true,stages:[{n:1,to:'hand'},{n:1,to:'mana',allMatches:true}]}]}
   ]}]};
 }
 if(phase>=880){
  if(d.id==='dmr09-110'&&f.typeText==='呪文'&&compact363===
   'バトルゾーンにある自分のクリーチャー1体は次の自分のターンのはじめまで「ガードマン」を得る。(自分の他のクリーチャーが攻撃される時「ガードマン」を得たクリーチャーをタップしてもよい。そうした場合攻撃クリーチャーはかわりにそのクリーチャーを攻撃する)カードを1枚引く。')
   return {effect:'sixPhoto',g34Tasks:[{op:'Target',owner:'self',grant:{guardman:true},g521UntilStart:true,spell:true},{op:'Draw',n:1}]};
  if(d.id==='dmr08-003'&&f.typeText==='進化クリーチャー'&&compact363===
   '進化-自分のグレートメカオー1体の上に置く。このクリーチャーが攻撃する時グレートメカオーを1体手札から捨ててもよい。そうした場合バトルゾーンにある相手のクリーチャーを1体選び相手の山札の一番上に置く。W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)')
   return {evolution:{race:'グレートメカオー'},breaker:2,g34Attack:[{op:'DiscardFor248',
    g488DiscardFilter:{g228Face:{type:'creature',raceAll:['グレートメカオー']}},g770DiscardAttempt:true,
    title:'手札から捨てるグレートメカオーを1体選ぶ（任意）',defs:[{op:'Target',to:'deckTop'}]}]};
  if(d.id==='dmr08-012'&&f.typeText==='クリーチャー'&&compact363===
   'このクリーチャーが攻撃する時自分が負けるか中止するまで相手とガチンコ・ジャッジする。その後こうして自分が勝った数カードを1枚引いてもよい。(ガチンコ・ジャッジ:各プレイヤーは自身の山札の上から1枚目を見せそれを一番下に置く。そのカードのコストが相手以上であれば自分の勝ちとする)')
   return {attackJudge:'draw'};
 }
 if(phase>=879){
  if(f.typeText==='クリーチャー'){
   const judge='このクリーチャーが攻撃する時自分が負けるか中止するまで相手とガチンコ・ジャッジする。その後こうして自分がガチンコ・ジャッジに勝った回数このクリーチャーは相手のシールドを';
   const rsfk={
    'dmr08-004':'スピードアタッカー(このクリーチャーは召喚酔いしない)'+judge+'1枚ブレイクする。',
    'dmex12-009':'スピードアタッカー'+judge+'1枚ブレイクする。(ガチンコ・ジャッジ:各プレイヤーは自身の山札の上から1枚目を見せそれを一番下に置く。そのカードのコストが相手以上であれば自分の勝ちとする)',
    'dmx22b-079':'スピードアタッカー'+judge+'ひとつブレイクする。'
   };
   if(compact363===rsfk[d.id])return {speedAttacker:true,attackJudge:true};
   if(['dmr07-005','dm24ex1-024','dmex08-187','dmx25-011'].includes(d.id)){
    const dreammates=d.id==='dm24ex1-024'?'自分のドリームメイト・クリーチャー':'バトルゾーンに自分のドリームメイト';
    if(compact363==='このクリーチャーが相手プレイヤーを攻撃してブロックされなかった時'+dreammates+'が7体以上あれば自分はゲームに勝つ。そうでなければその攻撃を中止する。')
     return {g482Unblocked:[{op:'IfOwn',filter:{g370BattleCount:{filter:{creature:true,race:'ドリームメイト'},min:7}},
      defs:[{op:'Win871',reason:'自分のドリームメイトが7体以上で勝利'}],elseDefs:[{op:'Custom',name:'stopAttack'}]}]};
   }
  }
  if(d.id==='dmr10-052'&&f.typeText==='呪文'&&compact363===
   'マナゾーンに置く時このカードはタップして置く。S・トリガーS・トリガー(この呪文をシールドゾーンから手札に加える時コストを支払わずにすぐ唱えてもよい)次の自分のターンのはじめまでバトルゾーンにある自分のクリーチャー1体のパワーは+3000され「ブロッカー」を得る。')
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'Target',owner:'self',power:3000,grant:{blocker:true},g521UntilStart:true,spell:true}]};
 }
 if(phase>=878&&f.typeText==='クリーチャー'){
  if(d.id==='dmr05-037'&&compact363===
   'ガチンコ・ジャッジで見せたカードを自分の山札の一番下に置くかわりにマナゾーンに置いてもよい。自分のターンの終わりに自然のカードを1枚自分のマナゾーンから手札に戻してもよい。')
   return {g878JudgeMana:true,g174End:[{op:'Select',origin:'mana',to:'hand',n:1,optional:true,filter:{color:'自然'}}]};
  if(['dmr05-026','dmr05-026M'].includes(d.id)&&compact363===
   'このクリーチャーまたは他のゴーストを召喚してバトルゾーンに出した時それとコストが同じゴーストを1体自分の墓地からバトルゾーンに出してもよい。')
   return {g878GhostRecovery:true};
  if(['dmr09-018','dmx16-032','dmex02-073'].includes(d.id)){
   const trigger='S・トリガーS・トリガー(このクリーチャーをシールドゾーンから手札に加える時コストを支払わずにすぐ召喚してもよい)';
   const body=d.id==='dmex02-073'?'このクリーチャーがバトルゾーンに出た時自分の山札をシャッフルしその後上から1枚目を表向きにする。そのカードが呪文なら':
    'このクリーチャーをバトルゾーンに出した時自分の山札をシャッフルしその後上から1枚目をすべてのプレイヤーに見せる。そのカードが呪文であれば';
   if(compact363===trigger+body+'コストを支払わずに唱えてもよい。呪文でなければ自分の手札に加える。')
    return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'Shuffle405'},{op:'LookSpell841',g878SpellBlue:true}]};
  }
 }
 if(phase>=877&&f.typeText==='クリーチャー'){
  if(['dmr06-017','dmx25-033','dmx12b-080','promoy11-034'].includes(d.id)){
   const prefix=d.id==='dmx25-033'?'':'バトルゾーンにある';
   const hunting=d.id==='dmx25-033'?['を','する']:['は','される'];
   if(compact363===prefix+'自分のクリーチャーはすべて種族にハンターとエイリアンを追加する。ハンティング(バトル中このクリーチャーのパワー'+hunting[0]+'バトルゾーンにある自分のハンター1体につき+1000'+hunting[1]+')')
    return {g208Auras:[{filter:{creature:true},grants:{raceAdd:['ハンター','エイリアン']}}],g166Hunting:true};
  }
  if(d.id==='dmr09-007'&&compact363===
   '相手のクリーチャーが自分を攻撃してブロックされなかった時自分の山札の上から3枚を墓地に置きそのクリーチャーを破壊する。T・ブレイカー(このクリーチャーはシールドを3枚ブレイクする)')
   return {breaker:3,g726DefenderUnblocked:[{op:'Mill',n:3},{op:'ExactMove',to:'grave',g877Attacker:true}]};
  if(d.id==='dmr06-020'&&compact363===
   '自分の他の進化ではないガーディアンが破壊される時墓地に置くかわりに新しいシールドとして自分のシールドゾーンに裏向きにして加える。W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)')
   return {breaker:2,g877DestroyToShield:{creature:true,nonEvolution:true,race:'ガーディアン'}};
 }
 if(phase>=876&&f.typeText==='クリーチャー'){
  if(d.id==='dmr05-027'&&compact363===
   'このクリーチャーのパワーはバトルゾーンにある自分の他の《跳箱男》1体につき+3000されシールドをさらに1枚ブレイクする。')
   return {g207CountPower:{zone:'battle',other:true,filter:{g876BattleName:'跳箱男'},amount:3000},g876BreakPerCount:true};
  if(d.id==='dmr06-025'&&compact363===
   'このクリーチャーが攻撃する時いずれかのプレイヤーの墓地から呪文を1枚選び持ち主の山札の一番上か一番下に置いてもよい。')
   return {g34Attack:[{op:'Select',origin:'grave',anyOwner:true,n:1,optional:true,g837DeckEnds:true,filter:{spell:true}}]};
  if(d.id==='dmr07-018'&&compact363===
   '各ターン3番目に召喚する自分のクリーチャーの召喚コストを最大3少なくしてもよい。ただしコストは1より少なくならない。')
   return {g290SummonAura:{filter:{},condition:{g876SummonNumber:3},amount:3,g560Optional:true}};
  if(d.id==='dmr09-015'&&compact363===
   'バトルゾーンに自分の無色クリーチャーがあればこのクリーチャーは「S・トリガー」を得る。このクリーチャーをバトルゾーンに出した時バトルゾーンにある相手のクリーチャーをすべてタップする。')
   return {g876ShieldTriggerCondition:{creature:true,noColor:true},effect:'sixPhoto',g34Tasks:[{op:'TapAll'}]};
 }
 if(phase>=875&&f.typeText==='クリーチャー'){
  if(d.id==='dmr06-044'&&compact363===
   '自分のアンノウンをバトルゾーンに出した時このクリーチャーを破壊してもよい。そうした場合相手のタップされているクリーチャーを1体破壊する。')
   return {g251EntryDraw:{filter:{creature:true,race:'アンノウン'},defs:[{op:'IfSource541',defs:[
    {op:'SelfSacrifice407',defs:[{op:'Target',to:'grave',filter:{tapped:true}}]}
   ]}]}};
  if(d.id==='dmr09-026'&&compact363===
   'このクリーチャーをバトルゾーンに出した時コスト1のクリーチャーコスト2のクリーチャーコスト3のクリーチャーをそれぞれ1体ずつ自分の墓地からバトルゾーンに出す。')
   return {effect:'sixPhoto',g34Tasks:[{op:'DeploySeries875',origin:'grave',costs:[1,2,3],filter:{creature:true}}]};
  if(d.id==='dmr05-035'&&compact363===
   'このクリーチャーが破壊された時ドリームメイトを2体自分のマナゾーンからバトルゾーンに出してもよい。')
   return {g172Death:[{op:'DeploySeries875',origin:'mana',n:2,optional:true,filter:{creature:true,race:'ドリームメイト'}}]};
 }
 if(phase>=874&&f.typeText==='クリーチャー'){
  if(d.id==='dmr04-014'&&compact363===
   'マナゾーンに置く時このカードはタップして置く。ブロッカーブロッカースペース・チャージ:多色(自分のマナゾーンに多色カードが置かれた時このクリーチャーのq能力を使ってもよい)qバトルゾーンにある進化ではないクリーチャーを1体選ぶ。それを破壊するか持ち主の手札に戻すか新しいシールドとして持ち主のシールドゾーンに裏向きにして加える。')
   return {blocker:true,g454Space:[{color:'多色',defs:[{op:'Target',anyOwner:true,filter:{nonEvolution:true},
    g467Destinations:['grave','hand','shields'],title:'破壊・手札戻し・シールド化する進化ではないクリーチャーを選ぶ'}]}]};
  const formula='自分のターンの終わりにこのクリーチャーがタップ';
  if(d.id==='dmr06-010'&&compact363===formula+'されていて自分の手札が10枚以上あれば自分はゲームに勝利する。W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)'||
     d.id==='dmex08-074'&&compact363==='W・ブレイカー(このクリーチャーはシールドを2つブレイクする)'+formula+'していて自分の手札が10枚以上なら自分はゲームに勝利する。')
   return formulaVictory();
  if(d.id==='dmr06-048'&&compact363===
   'このクリーチャーをバトルゾーンに出した時このクリーチャーよりパワーの小さい相手のクリーチャーを1体破壊する。')
   return {effect:'sixPhoto',g34Tasks:[{op:'TargetBelowSource692',to:'grave',g199Power:true}]};
 }
 if(phase>=873&&f.typeText==='クリーチャー'){
  const judge='相手とガチンコ・ジャッジする。自分が勝ったら';
  const reminder='(ガチンコ・ジャッジ:各プレイヤーは自身の山札の上から1枚目を見せそれを一番下に置く。そのカードのコストが相手以上であれば自分の勝ちとする)';
  if(d.id==='dmr06-023'&&compact363==='このクリーチャーをバトルゾーンに出した時'+judge+
   'バトルゾーンにあるクリーチャーを2体まで選び持ち主の手札に戻す。'+reminder)
   return {effect:'sixPhoto',g34Tasks:[{op:'Judge318',defs:[
    {op:'Select',anyOwner:true,origin:'battle',n:2,optional:true,to:'hand',filter:{creature:true},
     g173Targets:true,g193Select:true,title:'手札に戻すクリーチャーを2体まで選ぶ'}
   ]}]};
  if(d.id==='dmr05-s05'&&compact363==='このクリーチャーが攻撃する時'+judge+
   'バトルゾーンにある相手のコスト6以下のクリーチャーをすべて持ち主の手札に戻す。'+reminder+
   'ガチンコ・ジャッジ中自分が見せるカードのコストを3多くする。W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)')
   return {breaker:2,g873JudgeBonus:3,g34Attack:[{op:'Judge318',defs:[{op:'Sweep',to:'hand',filter:{creature:true,max:6}}]}]};
  if(d.id==='dmr05-090'&&compact363===
   'ハンティング(バトル中このクリーチャーのパワーはバトルゾーンにある自分のハンター1体につき+1000される)コスト6以下の呪文によって相手がバトルゾーンにあるクリーチャーを選ぶ時このクリーチャーを選ぶことはできない。')
   return {g166Hunting:true,g873SpellTargetMax:6};
 }
 if(phase>=872&&f.typeText==='呪文'){
  const nonEvolution={creature:true,nonEvolution:true};
  const shieldTarget={op:'Target',to:'shields',filter:nonEvolution,title:'シールド化する相手の進化ではないクリーチャーを選ぶ'};
  if(d.id==='dmr05-015'&&compact363===
   'S・トリガー(この呪文をシールドゾーンから手札に加える時コストを支払わずにすぐ唱えてもよい)バトルゾーンにある相手の進化ではないクリーチャーを1体選び裏向きにし新しいシールドとして持ち主のシールドゾーンに加える。その後相手のシールドをひとつ選び相手はそれを手札に加える。')
   return {trigger:true,effect:'sixPhoto',g34Tasks:[shieldTarget,{op:'TappedShieldPick842',n:1,picked:[]}]};
  const heavens='バトルゾーンにある相手の進化ではないクリーチャーを1体選ぶ。バトルゾーンに自分のエンジェル・コマンドが5体以上あればバトルゾーンにある相手の進化ではないクリーチャーをかわりに3体まで選ぶ。相手はその選ばれたクリーチャーを新しいシールドとして';
  if(d.id==='dmr06-008'&&compact363==='S・トリガー'+heavens+'持ち主のシールドゾーンに裏向きにして加える。'||
     d.id==='dmx16-013'&&compact363==='S・トリガーS・トリガー'+heavens+'自身のシールドゾーンに裏向きにして加える。')
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'IfOwn',
    filter:{g370BattleCount:{filter:{creature:true,race:'エンジェル・コマンド'},min:5}},
    defs:[{op:'Select',owner:'opponent',origin:'battle',to:'shields',filter:nonEvolution,n:3,optional:true,
     g173Targets:true,g193Select:true,title:'シールド化する相手の進化ではないクリーチャーを3体まで選ぶ'}],
    elseDefs:[shieldTarget]}]};
  const wind='バトルゾーンにあるパワー2000以下の進化ではないクリーチャーをすべて新しいシールドとして持ち主のシールドゾーンに裏向きにして';
  if(['dmr05-016','dmex07-010'].includes(d.id)&&[wind+'加える。',wind+'置く。'].includes(compact363))
   return {effect:'sixPhoto',g34Tasks:[{op:'Sweep',both:true,to:'shields',filter:{...nonEvolution,maxPower:2000,g199Power:true}}]};
 }
 if(phase>=871){
  const quartet='自分のターンのはじめにバトルゾーンに自分の《ケロヨン・カルテット》が4体あれば自分はゲームに勝利する。このクリーチャーが破壊される時墓地に置くかわりに手札に戻す。';
  if(f.typeText==='クリーチャー'&&(
   d.id==='dmr04-012'&&compact363==='マナゾーンに置く時このカードはタップして置く。'+quartet||
   d.id==='dmex08-301'&&compact363===quartet
  ))return {destroyToHand:true,g174Start:[{op:'IfOwn',filter:{g370BattleCount:{filter:{creature:true,g201ExactName:'ケロヨン・カルテット'},min:4}},defs:[{op:'Win871'}]}]};
  if(d.id==='dmr05-017'&&f.typeText==='進化クリーチャー'&&compact363===
   '進化-自分のサイバーロード1体の上に置く。メテオバーン-このクリーチャーが攻撃する時このクリーチャーの下にあるカードをすべて自分の手札に加えその後自分の山札の上から1枚目をすべてのプレイヤーに見せる。それがクリーチャーであればこのクリーチャーの下に置いてもよい。')
   return {evolution:{race:'サイバーロード'},g34Attack:[{op:'MeteorReload871'}]};
  if(d.id==='dmr01-040'&&f.typeText==='呪文'&&compact363===
   '自分の山札の上から2枚をマナゾーンに置く。こうしてマナゾーンに置いた光のカード1枚につきバトルゾーンにある相手のクリーチャーを1体選びタップする。こうしてマナゾーンに置いた火のカード1枚につきこのターンバトルゾーンにある自分のクリーチャー1体は「パワーアタッカー+2000」を得る。')
   return {effect:'sixPhoto',g34Tasks:[{op:'Ramp',n:2,g809Together:true,g871Civilizations:true}]};
 }
 if(phase>=870){
  if(['dmr01-s07','dmx19-s41'].includes(d.id)&&f.typeText==='進化クリーチャー'&&[
   '進化ー自分のビーストフォーク1体の上に置く。このクリーチャーをバトルゾーンに出した時自分の山札の上から2枚を自分のマナゾーンに置いてもよい。このクリーチャーが攻撃する時自分の山札の上から1枚目を自分のマナゾーンに置いてもよい。W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)',
   '進化ー自分のビーストフォーク1体の上に置く。このクリーチャーをバトルゾーンに出した時自分の山札の上から2枚をマナゾーンに置いてもよい。このクリーチャーが攻撃する時自分の山札の上から1枚をマナゾーンに置いてもよい。W・ブレイカー'
  ].includes(compact363)){
   const ramp=n=>({op:'Offer',title:'山札の上から'+n+'枚をマナゾーンに置く？',defs:[{op:'Ramp',n,g809Together:true}]});
   return {evolution:{race:'ビーストフォーク'},breaker:2,effect:'sixPhoto',g34Tasks:[ramp(2)],g34Attack:[ramp(1)]};
  }
  if(d.id==='dm34-027'&&f.typeText==='進化クリーチャー'&&compact363===
   '進化-自分のパラサイトワームまたはオリジン1体の上に置く。メテオバーン-このクリーチャーが攻撃する時このクリーチャーの下にあるカードを1枚選び墓地に置いてもよい。そうした場合相手の「ブロッカー」を持つクリーチャーを1体破壊する。')
   return {evolution:{any:[{race:'パラサイトワーム'},{race:'オリジン'}]},g825Meteor:'destroyBlocker'};
  if(d.id==='dmr03-007'&&f.typeText==='クリーチャー'&&compact363===
   'ブロッカー(相手クリーチャーが攻撃する時このクリーチャーをタップしてその攻撃を阻止してもよい。その後その相手クリーチャーとバトルする)相手のクリーチャーが攻撃してブロックされなかった時その攻撃の後このクリーチャーをアンタップする。ブロック中このクリーチャーのパワーは+2000される。')
   return {blocker:true,g209PoweredBlocker:2000,g870DefenderUnblocked:[{op:'AfterAttack542',defs:[{op:'Untap',g191First:true}]}]};
 }
 if(phase>=869){
  if(d.id==='dmr05-104'&&f.typeText==='クリーチャー'&&compact363===
   'S・トリガー(このクリーチャーをシールドゾーンから手札に加える時コストを支払わずにすぐ召喚してもよい)このクリーチャーをバトルゾーンに出した時バトルゾーンにあるクリーチャーを1体選ぶ。そのターンそのクリーチャーのパワーは+4000され相手プレイヤーを攻撃できない。')
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'Target',anyOwner:true,power:4000,g567PlayerStop:'end',spell:false}]};
  if(d.id==='dmr05-046'&&f.typeText==='呪文'&&compact363===
   'バトルゾーンにある相手のクリーチャーを2体まで選びタップする。その後自分の手札にあるコスト7以上のクリーチャーを1体見せてもよい。そうした場合選ばれたクリーチャーは次の相手のターンのはじめにアンタップされない。')
   return {effect:'sixPhoto',g34Tasks:[{op:'Select',owner:'opponent',origin:'battle',n:2,optional:true,
    filter:{creature:true},g173Targets:true,g193Select:true,g193Tap:true,g869RevealAfterTap:true,
    title:'タップする相手のクリーチャーを2体まで選ぶ',
    after:[{op:'HandReveal462',max:1,filter:{g228Face:{type:'creature',min:7}}}]}]};
  if(d.id==='dmr05-094'&&f.typeText==='呪文'&&compact363===
   '相手は自身の手札を1枚選んで捨てる。こうして捨てたカードが呪文であれば自分はこの呪文を唱えた後で墓地に置くかわりに手札に加える。')
   return {effect:'sixPhoto',g34Tasks:[{op:'Discard',n:1,g869ReturnOnSpell:true}]};
 }
 if(phase>=868&&f.typeText==='呪文'){
  const prefix='マナゾーンに置く時このカードはタップして置く。次のうちいずれかひとつを選ぶ。バトルゾーンに自分の多色クリーチャーがある場合は両方を選んでもよい。';
  const modal=(first,second)=>({effect:'sixPhoto',g34Tasks:[{op:'Choose',g184Modes:true,modes:[
   first,second,{label:'両方を選ぶ',condition:{creature:true,multi:true,faceUp:true},defs:[...first.defs,...second.defs]}
  ]}]});
  if(d.id==='dmr04-027'&&compact363===prefix+
   '▼バトルゾーンにある相手のクリーチャーを1体選びタップする。▼バトルゾーンにある相手のクリーチャーを1体選び持ち主の手札に戻す。')
   return modal(
    {label:'相手のクリーチャー1体をタップする',defs:[{op:'Target',tap:true}]},
    {label:'相手のクリーチャー1体を持ち主の手札に戻す',defs:[{op:'Target',to:'hand'}]}
   );
  if(d.id==='dmr04-033'&&compact363===prefix+
   '▼クリーチャーを1体自分の墓地から手札に戻す。▼相手のパワー4000以下のクリーチャーを1体破壊する。')
   return modal(
    {label:'墓地からクリーチャー1体を手札に戻す',defs:[{op:'Select',origin:'grave',to:'hand',n:1,filter:{creature:true}}]},
    {label:'パワー4000以下の相手クリーチャー1体を破壊する',defs:[{op:'Target',to:'grave',filter:{maxPower:4000,g199Power:true}}]}
   );
  if(d.id==='dmr04-030'&&compact363===prefix+
   '▼カードを2枚まで引きその後手札を1枚捨てる。▼相手はカードを1枚引きその後カードを2枚自身の手札から選んで捨てる。')
   return modal(
    {label:'2枚まで引き、自分の手札を1枚捨てる',defs:[
     {op:'DrawUpTo',n:2,g853EachDraw:true,g203Draw:true},{op:'Discard',owner:'self',n:1}
    ]},
    {label:'相手は1枚引き、相手自身が手札を2枚捨てる',defs:[{op:'Draw',owner:'opponent',n:1},{op:'Discard',n:2}]}
   );
 }
 if(phase>=867&&f.typeText==='呪文'){
  if(d.id==='dmr01-051'&&compact363===
   'S・トリガー相手はバトルゾーンにある自身のアンタップされているクリーチャーを1体選ぶ。その後バトルゾーンに自分の光または闇のクリーチャーがあれば相手はバトルゾーンにある自身のアンタップされているクリーチャーをもう1体選ぶ。選ばれたクリーチャーを相手の手札に戻す。'){
   const bounce=n=>({op:'OpponentSelect',to:'hand',n,filter:{untapped:true}});
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'IfOwn',filter:{creature:true,any:[{color:'光'},{color:'闇'}]},
    defs:[bounce(2)],elseDefs:[bounce(1)]}]};
  }
  if(d.id==='dmr04-010'&&compact363===
   'このターンバトルゾーンにある自分のハンターすべてのパワーは+3000されシールドをさらにもう1枚ブレイクする。バトルゾーンに自分のハンターが7体以上あれば相手のクリーチャーをすべて破壊する。'){
   const hunters={owner:'self',filter:{creature:true,race:'ハンター'},spell:true};
   return {effect:'sixPhoto',g34Tasks:[{op:'GroupPower',...hunters,power:3000},
    {op:'GroupLasting412',...hunters,extraBreak:1},
    {op:'IfOwn',filter:{g370BattleCount:{filter:hunters.filter,min:7}},defs:[{op:'Sweep',filter:{creature:true}}]}]};
  }
  if(['dmr04-020','dmx16-067'].includes(d.id)&&compact363===
   'マナゾーンに置く時このカードはタップして置く。自分のマナゾーンに水のカードが5枚以上あればカードを2枚まで引く。自分のマナゾーンに闇のカードが5枚以上あれば相手は自身の手札を2枚選んで捨てる。自分のマナゾーンに火のカードが5枚以上あれば相手のパワー6000以下のクリーチャーを2体破壊する。'){
   const mana=(color,def)=>({op:'IfOwn',filter:{g267Mana:{n:5,color}},defs:[def]});
   return {effect:'sixPhoto',g34Tasks:[
    mana('水',{op:'DrawUpTo',n:2,g853EachDraw:true,g203Draw:true}),
    mana('闇',{op:'Discard',n:2}),
    mana('火',{op:'Select',owner:'opponent',origin:'battle',to:'grave',n:2,g173Targets:true,g193Select:true,
     filter:{creature:true,maxPower:6000,g199Power:true},title:'破壊するパワー6000以下の相手クリーチャーを2体選ぶ'})
   ]};
  }
 }
 if(phase>=866){
  if(['dmr04-046','dmex12-109'].includes(d.id)&&f.typeText==='クリーチャー'&&[
   'マナゾーンに置く時このカードはタップして置く。このクリーチャーをバトルゾーンに出した時相手は自身の山札の上から2枚をすべてのプレイヤーに見せる。そのうちの1枚を選び墓地に置かせる。',
   'このクリーチャーがバトルゾーンに出た時相手は自身の山札の上から2枚を表向きにする。自分はそのうちの1枚を選び墓地に置かせる。'
  ].includes(compact363))
   return {effect:'sixPhoto',g34Tasks:[{op:'OpponentTopGrave866'}]};
  if(d.id==='dm36-090'&&f.typeText==='クリーチャー'&&compact363===
   '返霊3(このクリーチャーが攻撃する時自分の墓地からカードを3枚好きな順序で山札の一番下に置いてもよい。そうした場合このクリーチャーの能力を使う。)バトルゾーンにある相手のクリーチャーを1体選ぶ。このターンそのクリーチャーのパワーは-3000される。(パワー0以下のクリーチャーは破壊される)')
   return {g558Souls:['E'],g34Attack:[{op:'Select',origin:'grave',to:'deck',n:3,optional:true,
    g837Reikon:[{op:'Target',power:-3000,g242PowerMinus:true}],
    title:'返霊3：山札の下に置く順に墓地のカードを3枚選ぶ'}]};
  if(d.id==='dmr02-045'&&f.typeText==='呪文'&&compact363===
   'S・トリガー(この呪文をシールドゾーンから手札に加える時コストを支払わずにすぐ唱えてもよい)バトルゾーンに自分の闇または自然のクリーチャーがあれば相手のパワー7000以下のクリーチャーを1体破壊する。なければ相手のパワー4000以下のクリーチャーを1体破壊する。'){
   const destroy=maxPower=>({op:'Target',to:'grave',filter:{maxPower,g199Power:true}});
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'IfOwn',filter:{creature:true,any:[{color:'闇'},{color:'自然'}]},
    defs:[destroy(7000)],elseDefs:[destroy(4000)]}]};
  }
 }
 if(phase>=865){
  if(d.id==='dm39-041'&&f.typeText==='クリーチャー'&&compact363===
   'シンパシー:(M・ソウル)クリーチャー(このクリーチャーを召喚する時支払うコストはバトルゾーンにある自分の(M・ソウル)クリーチャー1体につき1少なくなる。ただしコストは1より少なくならない)連鎖(このクリーチャーをバトルゾーンに出した時自分の山札の上から1枚目をすべてのプレイヤーに見せる。そのカードがこのクリーチャーよりコストが小さいクリーチャーであればバトルゾーンに出してもよい)')
   return {g558Souls:['M'],g211Sympathy:{amount:1,minimum:1,filter:{creature:true,g853Soul:'M'}},
    effect:'champion',g84Effect:'Chain',g865PublicChain:true};
  if(d.id==='dm38-005'&&f.typeText==='進化クリーチャー'&&compact363===
   'マナゾーンに置く時このカードはタップして置く。進化-自分の(M・ソウル)または(K・ソウル)クリーチャー1体の上に置く。このクリーチャーをバトルゾーンに出した時相手のパワー3000以下のクリーチャーをすべて破壊する。その後こうして破壊したクリーチャー1体につき1枚カードを引く。W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)')
   return {g558Souls:['M','K'],evolution:{any:[{g853Soul:'M'},{g853Soul:'K'}]},breaker:2,effect:'sixPhoto',
    g34Tasks:[{op:'Sweep',filter:{creature:true,maxPower:3000,g199Power:true},g865DrawDestroyed:true}]};
  if(d.id==='dm36-009'&&f.typeText==='クリーチャー'&&compact363===
   '自分の他の(W・ソウル)クリーチャーをバトルゾーンに出した時自分のマナゾーンにある(W・ソウル)クリーチャーをすべてアンタップする。T・ブレイカー(このクリーチャーはシールドを3枚ブレイクする)')
   return {g558Souls:['W'],breaker:3,g865WSoulEntry:[{op:'UntapMana',filter:{faceUp:true,creature:true,g853Soul:'W'}}]};
 }
 if(phase>=864){
  if(d.id==='dm37-008'&&f.typeText==='進化クリーチャー'&&compact363===
   '進化-自分の(H・ソウル)または(M・ソウル)クリーチャー1体の上に置く。W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)相手がクリーチャーをバトルゾーンに出した時カードを2枚まで引いてもよい。')
   return {g558Souls:['H','M'],evolution:{any:[{g853Soul:'H'},{g853Soul:'M'}]},breaker:2,
    g314OtherEntry:{who:'opponent',defs:[{op:'DrawUpTo',n:2,g853EachDraw:true,g203Draw:true}]}};
  if(d.id==='dm39-024'&&f.typeText==='クリーチャー'&&compact363===
   'このクリーチャーをバトルゾーンに出した時自分の山札の上から3枚をすべてのプレイヤーに見せてもよい。その中からこのクリーチャーと同じソウルをひとつでも持つクリーチャーをすべて自分の手札に加え残りを墓地に置く。'){
   const souls=['H','M','E','K','W','B'];
   return {g558Souls:souls,effect:'sixPhoto',g34Tasks:[
    {op:'Offer',g359RevealAll:true,title:'山札の上から3枚を公開する？',defs:[
     {op:'Look',n:3,public:true,g255Distribute:true,stages:[{n:'all',allMatches:true,to:'hand',filter:{creature:true,any:souls.map(g853Soul=>({g853Soul}))}}],rest:'grave'}
    ]}
   ]};
  }
  if(d.id==='dm39-047'&&f.typeText==='クリーチャー'&&compact363===
   'ブロッカーこのクリーチャーは攻撃することができない。ノー・チョイス(手札を1枚も持っていないプレイヤーがひとりでもいればこのクリーチャーは次の能力を得る)このクリーチャーは「スレイヤー」を得る。(「スレイヤー」を得たクリーチャーがバトルする時バトルの後相手クリーチャーを破壊する)')
   return {blocker:true,noAttack:true,g260Self:{filter:{g834AnyEmptyHand:true},grants:{slayer:true}}};
 }
 if(phase>=863&&f.typeText==='クリーチャー'){
  if(['dm36-055','dm36-055VC'].includes(d.id)&&
   compact363.replace(/^【E・ソウル】/,'').replace('このクリーチャーのd能力を使う)d','このクリーチャーの能力を使う)').replace('{ESoulsicon}','')===
   '返霊3(このクリーチャーが攻撃する時自分の墓地からカードを3枚好きな順序で山札の一番下に置いてもよい。そうした場合このクリーチャーの能力を使う)コスト5以下の(E・ソウル)クリーチャーを1体自分の墓地からバトルゾーンに出す。')
   return {g558Souls:['E'],g34Attack:[{op:'Select',origin:'grave',to:'deck',n:3,optional:true,
    g837Reikon:[{op:'Select',origin:'grave',deploy:true,g236GraveDeploy:true,n:1,filter:{creature:true,g853Soul:'E',max:5},
     title:'墓地から出すコスト5以下のE・ソウルクリーチャーを1体選ぶ'}],
    title:'返霊3：山札の下に置く順に墓地のカードを3枚選ぶ'}]};
  if(['dm36-019','promoy21-074'].includes(d.id)&&
   compact363.replace('S・トリガーS・トリガー','S・トリガー').replace('このクリーチャーが出た時進化','このクリーチャーをバトルゾーンに出した時バトルゾーンにある進化')===
   '【M・ソウル】S・トリガー(このクリーチャーをシールドゾーンから手札に加える時コストを支払わずにすぐ召喚してもよい)このクリーチャーをバトルゾーンに出した時バトルゾーンにある進化クリーチャーまたはリンクしているゴッドを1体選び持ち主の手札に戻してもよい。')
   return {g558Souls:['M'],trigger:true,effect:'sixPhoto',g34Tasks:[
    {op:'Target',anyOwner:true,filter:{creature:true,g508EvolutionOrLink:true},to:'hand',optional:true}
   ]};
  if(d.id==='dm37-027'&&compact363===
   'ノー・チョイス(手札を1枚も持っていないプレイヤーがひとりでもいればこのクリーチャーは次の能力を得る)このクリーチャーが攻撃する時そのターンバトルゾーンにある相手のクリーチャーすべてのパワーは-2000される。(パワー0以下のクリーチャーは破壊される)')
   return {g558Souls:['B'],g260Self:{filter:{g834AnyEmptyHand:true},grants:{
    g34Attack:[{op:'GroupPower',owner:'opponent',filter:{creature:true},power:-2000,g214GroupPower:true}]
   }}};
 }
 if(phase>=862){
  if(d.id==='dm36-029'&&f.typeText==='進化クリーチャー'&&compact363===
   '進化-自分の(K・ソウル)クリーチャー1体の上に置く。このクリーチャーをバトルゾーンに出した時バトルゾーンにある自分の(K・ソウル)クリーチャーを1体選ぶ。そのターンそのクリーチャーのパワーは+3000され「W・ブレイカー」を得る。')
   return {g558Souls:['K'],evolution:{g853Soul:'K'},effect:'sixPhoto',g34Tasks:[
    {op:'Target',owner:'self',filter:{creature:true,g853Soul:'K'},power:3000,grant:{g313Breaker:2,g633DoubleBreaker:true}}
   ]};
  if(d.id==='dm36-017'&&f.typeText==='進化クリーチャー'&&compact363===
   '進化-自分の(M・ソウル)クリーチャー1体の上に置く。W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)このクリーチャーまたは自分の他の(M・ソウル)クリーチャーが破壊された時相手はバトルゾーンにある自身のクリーチャーを1体選び手札に戻す。')
   return {g558Souls:['M'],evolution:{g853Soul:'M'},breaker:2,
    g303DeathWatch:{self:true,g862OtherSoul:'M',defs:[{op:'OpponentSelect',to:'hand',n:1}]}};
  if(['dm36-088','dm36-088VC'].includes(d.id)&&f.typeText==='クリーチャー'&&
   compact363.replace(/^【E・ソウル】/,'').replace('このクリーチャーのd能力を使う)d','このクリーチャーの能力を使う)')===
   'このクリーチャーをバトルゾーンに出した時自分の山札の上から4枚を自分の墓地に置く。返霊3(このクリーチャーが攻撃する時自分の墓地からカードを3枚好きな順序で山札の一番下に置いてもよい。そうした場合このクリーチャーの能力を使う)カードを1枚引く。')
   return {g558Souls:['E'],effect:'sixPhoto',g34Tasks:[{op:'Mill',n:4}],
    g34Attack:[{op:'Select',origin:'grave',to:'deck',n:3,optional:true,g837Reikon:[{op:'Draw',n:1}],
     title:'返霊3：山札の下に置く順に墓地のカードを3枚選ぶ'}]};
 }
 if(phase>=861){
  if(['dm36-011','dm36-011VC'].includes(d.id)&&f.typeText==='進化クリーチャー'&&
   compact363.replace(/^【H・ソウル】/,'').replaceAll('{HSoulsicon}','').replace(/^進化ー/,'進化-')===
   '進化-自分の(H・ソウル)クリーチャー1体の上に置く。W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)このクリーチャーが破壊された時次のうちいずれかひとつを選ぶ。(H・ソウル)クリーチャーを1体自分の手札からバトルゾーンに出す。自分の山札の上から1枚目を裏向きのまま新しいシールドとして自分のシールドゾーンに加える。')
   return {g558Souls:['H'],evolution:{g853Soul:'H'},breaker:2,g172Death:[{op:'Choose',g184Modes:true,modes:[
    {label:'手札からH・ソウルクリーチャーを1体出す',defs:[{op:'Select',origin:'hand',deploy:true,n:1,filter:{creature:true,g853Soul:'H'},title:'出すH・ソウルクリーチャーを1体選ぶ'}]},
    {label:'山札の上から1枚をシールドにする',defs:[{op:'ShieldTop',n:1}]}
   ]}]};
  if(d.id==='dm37-007'&&f.typeText==='クリーチャー'&&compact363===
   'S・トリガー(このクリーチャーをシールドゾーンから手札に加える時コストを支払わずにすぐ召喚してもよい)ターン中自分のシールドが2枚以上ブレイクされていた場合そのターンの終わりに自分の山札の上から1枚目を裏向きのまま新しいシールドとして自分のシールドゾーンに加える。')
   return {trigger:true,g558Souls:['H'],g861OwnShieldBreakEnd:2};
  if(d.id==='dm23-027'&&f.typeText==='クリーチャー'&&compact363===
   '相手のターン中自分の他のグランド・デビルが破壊された時相手は自分自身のシールドを1枚選び持ち主の墓地に置く。')
   return {g303DeathWatch:{race:'グランド・デビル',opponentTurn:true,defs:[{op:'OwnShieldGraves697',opponentOnly:true}]}};
 }
 if(phase>=860&&f.typeText==='クリーチャー'){
  if(d.id==='dm36-036'&&compact363==='バトル中このクリーチャーのパワーはバトルゾーンにある自分の他の(W・ソウル)クリーチャー1体につき+2000される。W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)')
   return {g558Souls:['W'],breaker:2,g860BattleCountPower:{zone:'battle',other:true,filter:{g853Soul:'W'},amount:2000}};
  if(['dm36-025','dm36-025VC'].includes(d.id)&&compact363.replace(/^【E・ソウル】/,'').replace('{ESoulsicon}','')===
   '自分の他の(E・ソウル)クリーチャーが破壊された時相手は自身のクリーチャーを1体選び破壊する。')
   return {g558Souls:['E'],g303DeathWatch:{g860EvilSoul:true,defs:[{op:'OpponentSelect',to:'grave',n:1}]}};
  if(d.id==='dm36-100'&&compact363==='バトルゾーンに自分の他の(K・ソウル)クリーチャーがあればこのクリーチャーは「パワーアタッカー+2000」を得る。(攻撃中「パワーアタッカー+2000」を得たクリーチャーのパワーは+2000される)')
   return {g558Souls:['K'],g260Self:{filter:{creature:true,g853Soul:'K',g334Other:true},grants:{attackBonus:2000}}};
 }
 if(phase>=859&&f.typeText==='クリーチャー'){
  if(['dm36-043','dm36-043VC'].includes(d.id)&&compact363.replace(/^【H・ソウル】/,'').replace('{HSoulsicon}','')===
   'バトルゾーンにある自分のクリーチャーを相手が選ぶ時自分の他の(H・ソウル)クリーチャーを選ぶことはできない。(ただし選べないクリーチャーを攻撃またはブロックしてもよい)W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)')
   return {g558Souls:['H'],breaker:2,g608Protect:{g853Soul:'H',g334Other:true}};
  if(d.id==='dm36-021'&&compact363==='バトルゾーンにある自分の他の(H・ソウル)(M・ソウル)(E・ソウル)(K・ソウル)(W・ソウル)または(B・ソウル)クリーチャーすべてのパワーは+1000される。'){
   const souls=['H','M','E','K','W','B'];
   return {g558Souls:souls,g205Aura:{other:true,filter:{g856Souls:souls},power:1000}};
  }
  if(d.id==='dm36-091'&&compact363==='自分のターンの終わりにバトルゾーンに自分の他の(E・ソウル)クリーチャーがなければこのクリーチャーを破壊する。')
   return {g558Souls:['E'],g174End:[{op:'IfOwn',filter:{creature:true,g853Soul:'E',g334Other:true},defs:[],elseDefs:[{op:'SelfDestroy'}]}]};
 }
 if(phase>=858&&f.typeText==='クリーチャー'){
  if(d.id==='dm36-067'&&compact363==='自分の他の(W・ソウル)クリーチャーが破壊される時墓地に置くかわりに自分のマナゾーンに置く。')
   return {g558Souls:['W'],g575ManaAura:{other:true,filter:{creature:true,g853Soul:'W'}}};
  if(compact363==='相手がバトルゾーンにあるクロスギアを1枚選ぶ時このクリーチャーにクロスしてあるクロスギアを選ぶことはできない。')
   return {g858ProtectCrossedGear:true};
  if(d.id==='dm37-006'&&compact363==='バトルゾーンにある自分の他の(H・ソウル)と(M・ソウル)クリーチャーはすべて「ブロッカー」を得る。W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)')
   return {g558Souls:['H','M'],breaker:2,g208Auras:[{other:true,filter:{g856Souls:['H','M']},grants:{blocker:true}}]};
 }
 if(phase>=857&&f.typeText==='クリーチャー'){
  if(compact363==='自分のワイルド・ベジーズをマナゾーンに置いた時そのターンの終わりまでこのクリーチャーのパワーは+2000される。')
   return {g857ManaEntryRace:'ワイルド・ベジーズ',g807ManaEntry:[{op:'SelfBoost313',power:2000,g536Source:true}]};
  if(d.id==='dm36-044'&&compact363==='ブロッカーこのターン自分の(H・ソウル)クリーチャーをバトルゾーンに出していなければこのクリーチャーは相手プレイヤーを攻撃できない。')
   return {g558Souls:['H'],blocker:true,g840PlayerAttackRequires:{g857LightSoulEntered:true}};
  if(d.id==='dm36-032'&&compact363==='このクリーチャーが攻撃する時自分の他の(K・ソウル)クリーチャーを1体バトルゾーンから自分の手札に戻してもよい。そうした場合このクリーチャーをアンタップする。')
   return {g558Souls:['K'],g34Attack:[{op:'MarshalTouch558',filter:{g853Soul:'K'},g857ReturnRequired:true,
    title:'手札に戻す自分の他のK・ソウルクリーチャーを1体選ぶ（任意）',defs:[{op:'Untap',g191First:true}]}]};
 }
 if(phase>=856&&f.typeText==='クリーチャー'){
  if(compact363==='自分のクロスギアをジェネレートまたはクロスする時支払うコストは1少なくなる。ただしコストは1より少なくならない。')
   return {g856GearDiscount:true};
  if(d.id==='dm36-106'&&compact363==='このクリーチャーのパワーはバトルゾーンにある自分の他の(W・ソウル)クリーチャー1体につき+1000される。')
   return {g558Souls:['W'],g207CountPower:{zone:'battle',other:true,filter:{g853Soul:'W'},amount:1000}};
  if(d.id==='dm37-016'&&compact363==='バトルゾーンにある自分の(K・ソウル)と(W・ソウル)クリーチャーはすべて「W・ブレイカー」を持つ。')
   return {g558Souls:['K','W'],g208Auras:[{filter:{g856Souls:['K','W']},grants:{breaker:2,g633DoubleBreaker:true}}]};
 }
 if(phase>=855){
  if(f.typeText==='呪文'&&compact363==='Ωアタック・チャンス-グレートメカオー(自分のグレートメカオーが攻撃する時この呪文をコストを支払わずに唱えてもよい)カードを2枚引く。')
   return {effect:'sixPhoto',g417Chance:{race:'グレートメカオー'},g34Tasks:[{op:'Draw',n:2}]};
  if(f.typeText==='クリーチャー'&&[
   'このクリーチャーをバトルゾーンに出した時自分の山札の上から5枚を表向きにする。その中からクロスギアを1枚バトルゾーンに出し残りを好きな順序で山札の一番下に戻す。',
   'このクリーチャーが出た時自分の山札の上から5枚を表向きにする。その中からクロスギアを1枚出し残りを好きな順序で山札の下に置く。'
  ].includes(compact363))
   return {effect:'sixPhoto',g34Tasks:[{op:'LookDeploy530',n:5,public:true,limit:1,g749Required:true,rest:'bottom',
    filter:{g201Gear:true},title:'公開したカードから出すクロスギアを1枚選ぶ'}]};
  if(f.typeText==='クリーチャー'&&compact363==='ブロッカーこのクリーチャーがブロックした時バトルの後このクリーチャーを破壊する。W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)')
   return {blocker:true,breaker:2,g699DestroyAfterBlock:true};
 }
 if(phase>=854&&f.typeText==='クリーチャー'){
  if(d.id==='dm36-089'&&compact363==='このクリーチャーをバトルゾーンに出した時(E・ソウル)クリーチャーを1体自分の墓地から手札に戻してもよい。')
   return {g558Souls:['E'],effect:'sixPhoto',g34Tasks:[{op:'Select',origin:'grave',to:'hand',n:1,optional:true,
    filter:{creature:true,g853Soul:'E'},title:'墓地から手札に戻すE・ソウルクリーチャーを選ぶ（任意）'}]};
  if(compact363==='このクリーチャーをバトルゾーンに出した時コスト3以下のセイント・ヘッドディープ・マリーンブレイブ・スピリットキカイヒーローの中から1体を破壊してもよい。')
   return {effect:'sixPhoto',g34Tasks:[{op:'Target',anyOwner:true,to:'grave',optional:true,
    filter:{max:3,raceAny:['セイント・ヘッド','ディープ・マリーン','ブレイブ・スピリット','キカイヒーロー']},
    title:'破壊するコスト3以下の対象クリーチャーを選ぶ（任意）'}]};
  if(compact363==='相手がバトルゾーンにあるクリーチャーを選ぶ時自分の多色クリーチャーは選べない。(ただしそのクリーチャーを攻撃またはブロックしてもよい)')
   return {g608Protect:{multi:true}};
 }
 if(phase>=853){
  const effect=g34Tasks=>({effect:'sixPhoto',g34Tasks});
  if(f.typeText==='呪文'&&compact363==='自分の手札をすべて山札に加えてシャッフルしカードを4枚引く。その後コスト7以下の進化ではないコマンド・ドラゴンを1体自分の手札からバトルゾーンに出してもよい。')
   return effect([
    {op:'HandCycle460',to:'deck',shuffle:true,fixedDraw:4},
    {op:'Select',origin:'hand',deploy:true,n:1,optional:true,filter:{creature:true,nonEvolution:true,max:7,race:'コマンド・ドラゴン'},
     title:'手札から出す進化ではないコスト7以下のコマンド・ドラゴンを選ぶ（任意）'}
   ]);
  if(f.typeText==='クリーチャー'&&compact363==='このクリーチャーをバトルゾーンに出した時自分の手札から好きな枚数の呪文を見せてもよい。見せた呪文1枚につきカードを1枚各プレイヤーは引いてもよい。')
   return effect([{op:'HandReveal462',filter:{spell:true},g853EachDraw:true}]);
  if(d.id==='dm36-082'&&f.typeText==='クリーチャー'&&compact363==='このクリーチャーをバトルゾーンに出した時自分の(M・ソウル)クリーチャーを1体バトルゾーンから手札に戻す。')
   return {...effect([{op:'Target',owner:'self',to:'hand',filter:{g853Soul:'M'},title:'手札に戻す自分のM・ソウルクリーチャーを選ぶ'}]),g558Souls:['M']};
 }
 if(phase>=781){
  const race={creature:true,g724ExactRace:'超化獣'};
  if(f.typeText==='呪文'&&compact363==='S・トリガーS・トリガーコスト7以下の超化獣クリーチャーを1体自分の手札から出してもよい。次の自分のターンのはじめまでそのクリーチャーのハイパーモードを解放し「ブロッカー」を与える。')
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'Select',origin:'hand',deploy:true,n:1,optional:true,
    filter:{...race,max:7},g781HyperEntry:true,title:'手札から出すコスト7以下の超化獣を選ぶ（任意）'}]};
  if(f.typeText==='クリーチャー'&&compact363==='このクリーチャーが出た時自分の山札の上から2枚を見る。そのうちの1枚をマナゾーンに置きもう1枚を手札に加える。自分のターンに一度超化獣クリーチャーを1体自分のマナゾーンから召喚してもよい。')
   return {effect:'sixPhoto',g34Tasks:[{op:'Look',n:2,stages:[{n:1,to:'mana'},{n:1,to:'hand'}],rest:'top'}],
    g450ZoneSummon:{origin:'mana',filter:race}};
 }
 if(phase>=780&&d.faces.length===1&&f.typeText==='クリーチャー'){
  const releaseText='次の自分のターンのはじめまで自分の超化獣クリーチャー1体のハイパーモードを解放する。';
  const release={op:'Target',owner:'self',filter:{g724ExactRace:'超化獣'},g780ReleaseHyper:true,
   title:'ハイパーモードを解放する自分の超化獣を選ぶ'};
  if(compact363==='自分のタップしているクリーチャーが3体以上あれば相手のクリーチャーは自分を攻撃できない。')
   return {g780TappedPlayerGuard:3};
  if(compact363==='このクリーチャーが出た時'+releaseText+'このクリーチャーがタップした時自分の山札の上から1枚目をマナゾーンに置く。')
   return {effect:'sixPhoto',g34Tasks:[release],g188Tapped:[{op:'Ramp',n:1}]};
  if(compact363==='スピードアタッカー(このクリーチャーは召喚酔いしない)このクリーチャーが攻撃する時'+releaseText)
   return {speedAttacker:true,g34Attack:[release]};
 }
 if(phase>=779&&d.faces.length===1){
  const paid=(symbol,body)=>'このクリーチャーを{'+symbol+'}を支払って召喚してもよい。そうしたらこのクリーチャーが出た時相手は'+body;
  const blocker='ブロッカーブロッカー(このクリーチャーをタップして相手クリーチャーの攻撃先をこのクリーチャーに変更してもよい)';
  const wb='W・ブレイカー';
  if(f.typeText==='クリーチャー'&&compact363===paid('ll02','コスト3以下のクリーチャーを1体自身の手札から出してもよい。')+blocker+wb+'(このクリーチャーはシールドを2つブレイクする)')
   return {blocker:true,breaker:2,g568Alt:{cost:2,paymentColors:['光'],entry:[
    {op:'OpponentDeploy779',title:'自分の手札から出すコスト3以下のクリーチャーを選ぶ（任意）'}
   ]}};
  const breakDraw='自分のクリーチャーがシールドをブレイクした時カードを1枚引いてもよい。';
  if(f.typeText==='クリーチャー'&&compact363===paid('ff04','自身の山札の上から2枚をシールド化してもよい。')+'スピードアタッカー'+wb+breakDraw)
   return {speedAttacker:true,breaker:2,g779AllyBreakDraw:true,g568Alt:{cost:4,paymentColors:['火'],entry:[
    {op:'OpponentOffer777',title:'自分の山札の上から2枚をシールド化する？',defs:[{op:'ShieldTop',n:2,g779Simultaneous:true}]}
   ]}};
  const trigger='S・トリガーS・トリガー(この呪文をシールドゾーンから手札に加える時コストを支払わずにすぐ唱えてもよい)';
  if(f.typeText==='呪文'&&compact363===trigger+'タップしているクリーチャーとアンタップしているクリーチャーを最大1体ずつ選び持ち主の手札に戻す。')
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'Select',origin:'battle',anyOwner:true,to:'hand',n:2,optional:true,
    g173Targets:true,g193Select:true,g779DistinctTapState:true,filter:{creature:true},title:'手札に戻すタップ・アンタップのクリーチャーを各1体まで選ぶ'}]};
 }
 if(phase>=778&&d.faces.length===1){
  const breaker='W・ブレイカー(このクリーチャーはシールドを2つブレイクする)';
  const paid=(symbol,body)=>'このクリーチャーを{'+symbol+'}を支払って召喚してもよい。そうしたらこのクリーチャーが出た時'+body+breaker;
  if(f.typeText==='クリーチャー'&&compact363===paid('ff03','自分のシールドを1つ墓地に置く。'))
   return {breaker:2,g568Alt:{cost:3,paymentColors:['火'],entry:[{op:'ShieldGrave',g239ShieldGrave:true}]}};
  if(f.typeText==='クリーチャー'&&compact363===paid('ww03','カードを1枚自分のマナゾーンから手札に戻す。'))
   return {breaker:2,g568Alt:{cost:3,paymentColors:['水'],entry:[
    {op:'Select',origin:'mana',to:'hand',n:1,g232ManaReturn:true,title:'手札に戻すマナを1枚選ぶ'}
   ]}};
  const energy='ハイパーエナジー(この呪文を唱える時コストが異なる自分のクリーチャーを好きな数タップしてもよい。こうしてタップしたクリーチャー1体につきこの呪文のコストを2少なくする。ただしコストは0以下にはならない)';
  if(f.typeText==='呪文'&&compact363===energy+'自分の墓地を山札に加えてシャッフルしその後自分の山札の上から4枚を見る。その中からクリーチャーを1体出してもよい。残りを好きな順序で山札の下に置く。')
   return {hyperEnergy:true,effect:'sixPhoto',g34Tasks:[
    {op:'GraveShuffle545',owner:'self'},{op:'LookDeploy530',n:4,limit:1,rest:'bottom',filter:{creature:true}}
   ]};
  const gs='{GS}G・ストライク(このクリーチャーを自分のシールドゾーンから手札に加える時表向きにし相手のクリーチャーを1体選んでもよい。このターンそのクリーチャーは攻撃できない)';
  if(f.typeText==='クリーチャー'&&compact363===gs+'自分のマナゾーンにあるカードの枚数よりコストが大きい相手のクリーチャーが出た時自分の山札の上から1枚目をマナゾーンに置いてもよい。')
   return {gStrike:true,g314OtherEntry:{who:'opponent',g778OverMana:true,filter:{creature:true},defs:[
    {op:'Offer',title:'山札の上から1枚をマナゾーンに置く？',defs:[{op:'Ramp',n:1}]}
   ]}};
 }
 if(phase>=777&&d.faces.length===1){
  const shield={op:'Offer',title:'山札の上から1枚目をシールド化する？',defs:[{op:'ShieldTop',n:1}]};
  if(f.typeText==='クリーチャー'&&compact363==='コストが異なる自分のエレメントが3つ以上あればこのクリーチャーの召喚コストを5少なくする。ただしコストは0以下にはならない。このクリーチャーが出た時またはタップした時自分の山札の上から1枚目をシールド化してもよい。')
   return {g261Discount:{filter:{g466DistinctCosts:3},amount:5},effect:'sixPhoto',g34Tasks:[shield],g188Tapped:[shield]};
  const energy='ハイパーエナジー(この呪文を唱える時コストが異なる自分のクリーチャーを好きな数タップしてもよい。こうしてタップしたクリーチャー1体につきこの呪文のコストを2少なくする。ただしコストは0以下にはならない)';
  const draw='カードを1枚引く。';
  if(f.typeText==='呪文'&&['自分のクリーチャーの異なるコスト1つにつき','コストが異なる自分のクリーチャー1体につき'].some(prefix=>compact363===energy+prefix+draw))
   return {hyperEnergy:true,effect:'sixPhoto',g34Tasks:[{op:'CountDraw',zone:'battle',g777DistinctCreatureCosts:true}]};
  const breaker='W・ブレイカー(このクリーチャーはシールドを2つブレイクする)';
  const paid=(symbol,body)=>'このクリーチャーを{'+symbol+'}を支払って召喚してもよい。そうしたらこのクリーチャーが出た時相手は'+body+breaker;
  if(f.typeText==='クリーチャー'&&compact363===paid('nn02','自身の山札の上から1枚目をマナゾーンに置いてもよい。'))
   return {breaker:2,g568Alt:{cost:2,paymentColors:['自然'],entry:[
    {op:'OpponentOffer777',title:'山札の上から1枚目をマナゾーンに置く？',defs:[{op:'Ramp',n:1}]}
   ]}};
  if(f.typeText==='クリーチャー'&&compact363===paid('dd02','カードを2枚引いてもよい。'))
   return {breaker:2,g568Alt:{cost:2,paymentColors:['闇'],entry:[
    {op:'OpponentOffer777',title:'カードを2枚引く？',defs:[{op:'Draw',n:2}]}
   ]}};
 }
 if(phase>=776&&d.faces.length===1){
  const yobi='ヨビニオン(自分の山札の上からこの呪文よりコストが小さいクリーチャーが出るまで表向きにしてもよい。そのクリーチャーを出す。残りをシャッフルし山札の下に置く)';
  if(f.typeText==='呪文'&&compact363===yobi+'次のうちいずれか1つを選ぶ。▶シールドを1つブレイクする。▶このターン自分のクリーチャーすべてに「スピードアタッカー」を与える。')
   return {effect:'sixPhoto',g34Tasks:[{op:'Yobi398'},{op:'Choose',g184Modes:true,modes:[
    {label:'相手のシールドを1つブレイクする',defs:[{op:'Break497',n:1}]},
    {label:'自分のクリーチャーすべてにこのターン「スピードアタッカー」を与える',defs:[
     {op:'GroupGrant364',owner:'self',filter:{creature:true},grant:{speedAttacker:true},spell:true}
    ]}
   ]}]};
  if(f.typeText==='呪文'&&compact363===yobi+'自分のクリーチャーを1体選ぶ。次の自分のターンのはじめまでそのクリーチャーは相手に選ばれず攻撃されない。')
   return {effect:'sixPhoto',g34Tasks:[{op:'Yobi398'},{op:'Target',owner:'self',g521UntilStart:true,spell:true,
    grant:{untargetable:true,cannotBeAttacked:true},title:'次の自分のターンまで守るクリーチャーを選ぶ'}]};
  const arian='このクリーチャーがアンタップした時このターン次に召喚する自分のクリーチャーのコストを';
  const arianEnd='2少なくする。ただしコストは0以下にはならない。相手のターン中にこのクリーチャーが離れた時自分の山札の上から1枚目をシールド化してもよい。';
  // The first print's exact wording is preserved in the catalogue. Use the verified later text in battle.
  const earlyArian=d.id==='dm24rp1-030'&&d.name==='聖騎士アリアン'&&compact363===arian+'最大'+arianEnd;
  if(f.typeText==='クリーチャー'&&(earlyArian||compact363===arian+arianEnd))
   return {g299Untapped:[{op:'NextReduction456',type:'creature',amount:2}],
    g601OpponentLeave:true,g172Leave:[{op:'Offer',title:'山札の上から1枚目をシールド化する？',defs:[{op:'ShieldTop'}]}]};
 }
 if(phase>=775&&d.faces.length===1&&f.typeText==='クリーチャー'){
  const abyssRush='アビスラッシュ:このクリーチャーを自分の墓地から召喚してもよい。そうしたらこのターンこのクリーチャーはプレイヤーを攻撃できターンの終わりに山札の下に置かれる。';
  const reprintRush='アビスラッシュ(このクリーチャーを自分の墓地から召喚してもよい。そうしたらこのターンこのクリーチャーはプレイヤーを攻撃できこのターンの終わりに山札の下に置かれる)';
  const change=race=>'革命チェンジ:アビス(自分の'+race+'が攻撃する時そのクリーチャーと手札にあるこのクリーチャーを入れ替えてもよい)';
  const reveal='このクリーチャーが出た時自分の山札の上から4枚を表向きにする。その中からクリーチャーを1体手札に加えるかマナゾーンに置く。残りを墓地に置く。';
  if([abyssRush+change('アビス'),reprintRush+change('指定のクリーチャー')].some(prefix=>compact363===prefix+reveal))
   return {abyssRush:true,rev:{race:'アビス',g486Current:true},effect:'sixPhoto',g34Tasks:[
    {op:'Look',n:4,public:true,g255Distribute:true,stages:[{n:1,filter:{g228Face:{type:'creature'}},g467Destinations:['hand','mana']}],rest:'grave'}
   ]};
  const modal='S・トリガーS・トリガー(このクリーチャーをシールドゾーンから手札に加える時コストを支払わずにすぐ召喚してもよい)このクリーチャーが出た時次のうちいずれか1つを選ぶ。';
  if(compact363===modal+'▶相手のクリーチャーを1体選びタップする。次の相手のターンのはじめにそのクリーチャーはアンタップしない。▶自分の山札の上から2枚を見てそのうちの1枚を手札に加える。')
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'Choose',g184Modes:true,modes:[
    {label:'相手のクリーチャーをタップして次のターン開始時にアンタップさせない',defs:[{op:'Target',tap:true,lock:true,g210TapLock:true}]},
    {label:'山札の上2枚を見て1枚を手札に加える',defs:[{op:'Look',n:2,stages:[{n:1,to:'hand'}],rest:'top'}]}
   ]}]};
  if(compact363===modal+'▶このクリーチャーはシールドを1つブレイクする。▶相手のクリーチャーを1体選ぶ。このターンそのクリーチャーのパワーを-4000する。(パワー0以下のクリーチャーは破壊される)')
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'Choose',g184Modes:true,modes:[
    {label:'このクリーチャーでシールドを1つブレイクする',defs:[{op:'Break497',n:1,g747CreatureBreak:true}]},
    {label:'相手のクリーチャー1体のパワーをこのターン-4000する',defs:[{op:'Target',power:-4000,g242PowerMinus:true}]}
   ]}]};
 }
 if(phase>=774){
  const trigger='S・トリガーS・トリガー';
  if(f.typeText==='呪文'&&compact363.replace('(この呪文をシールドゾーンから手札に加える時コストを支払わずにすぐ唱えてもよい)','')===trigger+'自分の山札をシャッフルし上から1枚目を表向きにする。そのカードがクリーチャーでなければ手札に加える。クリーチャーなら出し「スピードアタッカー」を与える。次の相手のターンのはじめにそのクリーチャーを手札に戻す。(「スピードアタッカー」を持つクリーチャーは召喚酔いしない)')
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'Shuffle405'},{op:'RevealTop514',filter:{creature:true},to:'battle',elseTo:'hand',g774Banky:true}]};
  if(f.typeText==='クリーチャー'){
   const condition='コスト3以上のアーマードまたはコスト3以上のマジック';
   if(compact363==='革命チェンジ:'+condition+'(自分の'+condition+'が攻撃する時そのクリーチャーと手札にあるこのクリーチャーを入れ替えてもよい)W・ブレイカーこのクリーチャーが「革命チェンジ」によって出た時相手のパワー3000以下のクリーチャーを1体選び破壊する。自分のクリーチャーの攻撃の終わりにカードを1枚引いてもよい。')
    return {rev:{categories:['アーマード','マジック'],min:3,g486Current:true},breaker:2,
     g773RevEntry:[{op:'Target',to:'grave',filter:{maxPower:3000,g199Power:true}}],g774AllyAttackEnd:true};
   if(compact363===trigger+'(このクリーチャーをシールドゾーンから手札に加える時コストを支払わずにすぐ召喚してもよいブロッカーブロッカー(このクリーチャーをタップして相手クリーチャーの攻撃先をこのクリーチャーに変更してもよい)W・ブレイカー(このクリーチャーはシールドを2つブレイクする)このクリーチャーが出た時相手の手札を1枚見ないで選び捨てさせる。このクリーチャーが攻撃する時またはブロックした時その攻撃の後このクリーチャーを破壊する。')
    return {trigger:true,blocker:true,breaker:2,effect:'sixPhoto',g34Tasks:[{op:'BlindDiscard773'}],
     g34Attack:[{op:'AfterAttackDestroy'}],g178Block:[{op:'AfterAttackDestroy'}]};
  }
 }
 if(phase>=773&&f.typeText==='クリーチャー'){
  const change=(condition)=>'革命チェンジ:'+condition+'(自分の'+condition+'が攻撃する時そのクリーチャーと手札にあるこのクリーチャーを入れ替えてもよい)';
  const onChange='このクリーチャーが「革命チェンジ」によって出た時';
  const doubleBreak='W・ブレイカー(このクリーチャーはシールドを2つブレイクする)';
  if(compact363===change('コスト3以上のアビスまたはコスト3以上のメカ')+'W・ブレイカー'+onChange+'相手の手札を1枚見ないで選び捨てさせる。相手のカードはマナゾーンにタップして置かれる。')
   return {rev:{categories:['アビス','メカ'],min:3,g486Current:true},breaker:2,opponentManaTap:true,g773RevEntry:[{op:'BlindDiscard773'}]};
  if([doubleBreak,'W・ブレイカー'].some(breaker=>compact363===change('コスト3以上のジャイアントまたはコスト3以上のアビス')+breaker+onChange+'自分の山札の上から1枚目をマナゾーンに置く。その後カードを1枚自分のマナゾーンから手札に戻してもよい。相手のクリーチャーが攻撃する時可能ならこのクリーチャーを攻撃する。'))
   return {rev:{categories:['ジャイアント','アビス'],min:3,g486Current:true},breaker:2,g431AttackMe:true,
    g773RevEntry:[{op:'Ramp',n:1},{op:'Select',origin:'mana',to:'hand',n:1,optional:true,g183Return:true}]};
  if(compact363===change('コスト5以上のメカ')+doubleBreak+'このクリーチャーが出た時相手のエレメント1つと相手のマナゾーンにあるカードを1枚選ぶ。次の相手のターンのはじめにそれらのカードはアンタップしない。')
   return {rev:{race:'メカ',min:5,g486Current:true},breaker:2,effect:'sixPhoto',g34Tasks:[
    {op:'Target',element:true,filter:{faceUp:true},lock:true,title:'次のターン開始時にアンタップさせない相手のエレメントを選ぶ'},
    {op:'StartManaLock773'}
   ]};
 }
 if(phase>=772){
  if(f.typeText==='呪文'&&compact363==='コスト7以下の進化ではないアーマード・クリーチャーを1体自分の手札から出す。このターンそのクリーチャーに「スピードアタッカー」を与える。(「スピードアタッカー」を持つクリーチャーは召喚酔いしない)自分のエレメントを1つ破壊する。')
   return {effect:'sixPhoto',g34Tasks:[
    {op:'Select',origin:'hand',deploy:true,n:1,filter:{creature:true,nonEvolution:true,race:'アーマード',max:7},g771DeploySpeed:true},
    {op:'Select',origin:'battle',n:1,filter:{faceUp:true},to:'grave',title:'破壊する自分のエレメントを選ぶ'}
   ]};
  if(f.typeText==='クリーチャー'&&compact363==='自分のシールドの数が相手以上ならこのクリーチャーの召喚コストを2少なくする。ブロッカーブロッカー(このクリーチャーをタップして相手クリーチャーの攻撃先をこのクリーチャーに変更してもよい)W・ブレイカー(このクリーチャーはシールドを2つブレイクする)自分の他のアーマードがあればこのクリーチャーに「スピードアタッカー」を与える。(「スピードアタッカー」を持つクリーチャーは召喚酔いしない)')
   return {g261Discount:{filter:{g334ZoneCount:{zone:'shields',atLeastOpponent:true}},amount:2},blocker:true,breaker:2,
    g260Self:{filter:{race:'アーマード',faceUp:true,g334Other:true},grants:{speedAttacker:true}}};
  if(f.typeText==='クリーチャー'&&compact363==='革命チェンジ:コスト5以上のマジック(自分のコスト5以上のマジックが攻撃する時そのクリーチャーと手札にあるこのクリーチャーを入れ替えてもよい)スピードアタッカー(このクリーチャーは召喚酔いしない)W・ブレイカー(このクリーチャーはシールドを2つブレイクする)このクリーチャーが出た時またはクリーチャーが攻撃する時カードを1枚引いてもよい。'){
   const draw={op:'Draw',n:1,optional:true};
   return {rev:{race:'マジック',min:5,g486Current:true},speedAttacker:true,breaker:2,effect:'sixPhoto',g34Tasks:[draw],
    g253AttackWatches:['self','opponent'].map(who=>({who,filter:{creature:true},defs:[draw]}))};
  }
 }
 if(phase>=771){
  if(f.typeText==='クリーチャー'&&compact363==='自分のクリーチャーが相手のより多ければこのクリーチャーの召喚コストを3少なくする。ブロッカーブロッカーW・ブレイカー自分のクリーチャーがタップした時カードを1枚引いてもよい。自分の他のクリーチャーが離れた時このクリーチャーをアンタップしてもよい。')
   return {g261Discount:{filter:{g413MoreCreatures:true},amount:3},blocker:true,breaker:2,g771Wing:true};
  if(f.typeText==='クリーチャー'&&compact363==='このクリーチャーが出た時自分の墓地と手札からカードを最大1枚ずつタップしてマナゾーンに置いてもよい。')
   return {effect:'sixPhoto',g34Tasks:[{op:'GraveHandMana771'}]};
  if(f.typeText==='呪文'&&compact363==='コスト2以下のクリーチャーを1体自分の手札から出してもよい。このターンそのクリーチャーに「スピードアタッカー」を与える。(「スピードアタッカー」を持つクリーチャーは召喚酔いしない)チャージャー(この呪文を唱えた後墓地に置くかわりにマナゾーンに置く)')
   return {normalCharger:true,effect:'sixPhoto',g34Tasks:[{op:'Select',origin:'hand',deploy:true,n:1,optional:true,filter:{creature:true,max:2},g771DeploySpeed:true}]};
 }
 if(phase>=770&&f.typeText==='クリーチャー'){
  const trigger='S・トリガーS・トリガー';
  const summon='(このクリーチャーをシールドゾーンから手札に加える時コストを支払わずにすぐ召喚してもよい)';
  if(compact363===trigger+'W・ブレイカーこのクリーチャーが出た時相手のクリーチャーを1体選び持ち主のマナゾーンに置く。その後自分の山札の上から1枚目をマナゾーンに置く。相手のターン中にこのクリーチャーが出た時このターンに2つ以上自分のシールドがブレイクされていなければこのクリーチャーを破壊する。')
   return {trigger:true,breaker:2,effect:'sixPhoto',g34Tasks:[{op:'Target',to:'mana'},{op:'Ramp',n:1}],g770EntryBreakMin:2};
  if(compact363==='ブロッカーブロッカー(このクリーチャーをタップして相手クリーチャーの攻撃先をこのクリーチャーに変更してもよい)各ターンに一度自分のクリーチャーが攻撃する時カードを1枚引いてもよい。自分のターンの終わりに自分のクリーチャーを1体アンタップする。')
   return {blocker:true,g252AttackWatch:{who:'self',filter:{creature:true},defs:[{op:'AttackDraw770'}]},
    g174End:[{op:'Target',owner:'self',untap:true,title:'アンタップする自分のクリーチャーを1体選ぶ'}]};
  if(compact363===trigger+summon+'このクリーチャーが出た時次の能力を2回行う。▶自分と相手のクリーチャーを1体ずつ選ぶ。その2体をバトルさせる。')
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'Fight240'},{op:'Fight240'}]};
  if(compact363==='このクリーチャーが出た時自分の手札を1枚捨ててもよい。そうしたらこのターンこのクリーチャーに「スピードアタッカー」を与える。(「スピードアタッカー」を持つクリーチャーは召喚酔いしない)')
   return {effect:'sixPhoto',g34Tasks:[{op:'DiscardFor248',g770DiscardAttempt:true,defs:[{op:'SelfGrant754',g770LiveCreature:true,grant:{speedAttacker:true}}]}]};
 }
 if(phase>=769&&f.typeText==='クリーチャー'){
  if(compact363==='スピードアタッカー(このクリーチャーは召喚酔いしない)自分のターンの終わりにこのターン中にシールドが3つ以上ブレイクされていればアーマード・メクレイド8する。(アーマード・メクレイド8:自分の山札の上から3枚を見る。その中からコスト8以下のアーマードを1枚コストを支払わずに使ってもよい。残りを好きな順序で山札の下に置く)')
   return {speedAttacker:true,g769ShieldBreakRaid:3};
  if(compact363==='このクリーチャーが攻撃する時相手のクリーチャーを1体選ぶ。次の自分のターンのはじめまでそのクリーチャーは攻撃もブロックもできない。このクリーチャーがアンタップした時このターン次に自分が唱える呪文のコストを最大3少なくする。(ただしコストは0以下にはならない)')
   return {g34Attack:[{op:'Target',g190Freeze:'self',title:'次の自分のターンまで攻撃とブロックを止める相手のクリーチャーを選ぶ'}],
    g299Untapped:[{op:'NextReduction456',type:'spell',amount:3,optional:true}]};
  if(compact363==='S・トリガーS・トリガー(このクリーチャーをシールドゾーンから手札に加える時コストを支払わずにすぐ召喚してもよい)このクリーチャーが出た時このクリーチャーをタップしてもよい。相手のクリーチャーが攻撃する時可能ならこのクリーチャーを攻撃する。')
   return {trigger:true,g431AttackMe:true,effect:'sixPhoto',g34Tasks:[
    {op:'Offer',title:'このクリーチャーをタップする？',defs:[{op:'SelfTap314'}]}
   ]};
  if(compact363==='このクリーチャーが出た時自分のシールドを1つ手札に加えてもよい。ただしその「S・トリガー」は使えない。自分のシールドゾーンのカードが離れた時カードを1枚自分の墓地から手札に戻してもよい。')
   return {effect:'sixPhoto',g34Tasks:[{op:'ShieldHand',g238ShieldHand:true,g535Count:1,optional:true}],
    g536ShieldLeft:[{op:'Select',origin:'grave',to:'hand',n:1,optional:true}]};
 }
 if(phase>=768){
  const armoredRaid='アーマード・メクレイド5する。(アーマード・メクレイド5:自分の山札の上から3枚を見る。その中からコスト5以下のアーマードを1枚コストを支払わずに使ってもよい。残りを好きな順序で山札の下に置く)';
  const raid={op:'Raid767',race:'アーマード',max:5};
  if(f.typeText==='クリーチャー'){
   if(compact363==='ガードマン(このクリーチャーをタップして相手クリーチャーの攻撃先を自分の他のクリーチャーからこのクリーチャーに変更してもよい)相手のターン中このクリーチャーのパワーを+10000する。相手のエレメントがコストを支払わずに出た時自分の山札の上から1枚目をマナゾーンに置いてもよい。')
    return {guardman:true,g38EnemyTurnBonus:10000,g768UnpaidRamp:true};
   if(compact363==='自分のクリーチャーが攻撃する時それがこのターンの2回目の攻撃であれば'+armoredRaid)
    return {g252AttackWatch:{who:'self',g768AttackNumber:2,filter:{creature:true},defs:[raid]}};
   if(compact363==='このクリーチャーが出た時次のうちいずれか1つを選ぶ。▶カードを1枚引き自分の手札を1枚捨てる。▶コスト4以下の呪文を1枚自分の墓地から手札に戻す。')
    return {effect:'sixPhoto',g34Tasks:[{op:'Choose',g184Modes:true,modes:[
     {label:'カードを1枚引き、手札を1枚捨てる',defs:[{op:'Draw',n:1},{op:'Discard',owner:'self',n:1}]},
     {label:'コスト4以下の呪文を墓地から手札に戻す',defs:[{op:'Select',origin:'grave',to:'hand',n:1,filter:{g228Face:{type:'spell',max:4}}}]}
    ]}]};
   if(compact363==='このクリーチャーが出た時自分の山札の上から1枚目を表向きにする。それがアーマードなら手札に加える。そうでなければ山札の下に置いてもよい。')
    return {effect:'sixPhoto',g34Tasks:[{op:'RevealTop514',filter:{anyFaceRace:'アーマード'},to:'hand',elseTo:'deck',g768OptionalBottom:true}]};
  }
  if(f.typeText==='呪文'&&compact363===armoredRaid+'このターン自分のクリーチャーすべてに「スピードアタッカー」を与える。(「スピードアタッカー」を持つクリーチャーは召喚酔いしない)')
   return {effect:'sixPhoto',g34Tasks:[raid,{op:'GroupGrant364',owner:'self',filter:{creature:true},grant:{speedAttacker:true},spell:true}]};
 }
 if(phase>=767&&f.typeText==='クリーチャー'){
  if(compact363==='相手のこのターン2体目以降のクリーチャーが出た時このクリーチャーをマナゾーンに置いてもよい。そうしたら相手のそのクリーチャーを持ち主のマナゾーンに置く。')
   return {g767SecondEnemy:true};
  if(compact363==='自分のターンの終わりにこのターン相手の墓地にカードが2枚以上置かれていたらアビス・メクレイド5する。(アビス・メクレイド5:自分の山札の上から3枚を見る。その中からコスト5以下のアビスを1枚コストを支払わずに使ってもよい。残りを好きな順序で山札の下に置く)')
   return {g767GraveRaid:true};
  if(compact363==='各ターンに一度相手がコストを支払わずにエレメントを出した時マジック・メクレイド5してもよい。(マジック・メクレイド5:自分の山札の上から3枚を見る。その中からコスト5以下のマジックを1枚コストを支払わずに使ってもよい。残りを好きな順序で山札の下に置く)')
   return {g767UnpaidRaid:true};
 }
 if(phase>=766&&f.typeText==='クリーチャー'){
  if(compact363==='自分のコスト6以上のクリーチャーが召喚によって出た時このクリーチャーを自分の墓地から出してもよい。')
   return {g766GraveSummonMin:6};
  if(compact363==='このターン中に自分が呪文を唱えていなければこのクリーチャーは攻撃できない。各ターンに一度自分が呪文を唱えた時その呪文よりコストが小さいクリーチャーを1体自分の手札から出してもよい。')
   return {g225AttackRequires:{kind:'spells',min:1},g204SpellWatch:{who:'self',g766Once:true,defs:[{op:'CastCostDeploy595',g766Below:true}]}};
  if(compact363==='ブロッカーブロッカー(このクリーチャーをタップして相手クリーチャーの攻撃先をこのクリーチャーに変更してもよい)スピードアタッカー(このクリーチャーは召喚酔いしない)他のクリーチャーがアンタップした時このクリーチャーをアンタップする。')
   return {blocker:true,speedAttacker:true,g766OtherUntap:true};
 }
 if(phase>=765){
  if(f.typeText==='クリーチャー'&&compact363==='パワード・ブレイカー(このクリーチャーはそのパワー6000ごとにシールドをさらに1つブレイクする)自分のコスト6以上のクリーチャーが出た時次の自分のターンのはじめまでそのクリーチャーのパワーをこのクリーチャーのパワーに加える。')
   return {poweredBreaker:true,g314OtherEntry:{who:'self',filter:{min:6},g765CopyPower:true}};
  if(f.typeText==='クリーチャー'&&compact363==='自分のドラゴンが出た時カードを1枚引く。自分のタップしているドラゴン・クリーチャーがあれば自分のファイアー・バードは攻撃されない。')
   return {g314OtherEntry:{who:'self',filter:{race:'ドラゴン'},g765Element:true,defs:[{op:'Draw',n:1}]},g691AttackProtection:{requires:'ドラゴン',tapped:true,races:['ファイアー・バード']}};
  if(f.typeText==='呪文'&&compact363==='ヨビニオン(自分の山札の上からこの呪文よりコストが小さいクリーチャーが出るまで表向きにしてもよい。そのクリーチャーを出す。残りをシャッフルし山札の下に置く)自分の山札の上から自分のクリーチャーの数だけマナゾーンに置く。')
   return {effect:'sixPhoto',g34Tasks:[{op:'Yobi398'},{op:'CreatureCountRamp765'}]};
 }
 if(phase>=764&&f.typeText==='クリーチャー'){
  if(compact363==='各ターンはじめて自分のコスト6以上のクリーチャーが攻撃する時そのクリーチャーをアンタップする。')
   return {g252AttackWatch:{who:'self',g764FirstCostSix:true,g399Attacker:true,defs:[{op:'AttackUntap408',g562Creature:true,g764FollowControl:true}]}};
  if(compact363==='このクリーチャーが相手プレイヤーを攻撃する時このクリーチャーをマナゾーンに置く。')
   return {g34Attack:[{op:'DelayedMove532',to:'mana',g764PlayerAttack:true}]};
  if(compact363==='ジャストダイバー(このクリーチャーが出た時次の自分のターンのはじめまでこのクリーチャーは相手に選ばれず攻撃されない)自分のターンのはじめにカードを1枚引いてもよい。各ターンの終わりにこのターン中に自分が呪文を唱えクリーチャーを召喚していればマジック・メクレイド8する。(マジック・メクレイド8:自分の山札の上から3枚を見る。その中からコスト8以下のマジックを1枚コストを支払わずに使ってもよい。残りを好きな順序で山札の下に置く)')
   return {justDiver:true,g174Start:[{op:'Draw',n:1,optional:true}],g764MondoEnd:true};
 }
 if(phase>=763&&f.typeText==='クリーチャー'){
  if(compact363==='S・トリガーS・トリガー(このクリーチャーをシールドゾーンから手札に加える時コストを支払わずにすぐ召喚してもよい)このクリーチャーが出た時クリーチャーを2体まで選びそれぞれタップまたはアンタップする。')
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'Select',origin:'battle',anyOwner:true,n:2,optional:true,g173Targets:true,g193Select:true,g763TapOrUntap:true,filter:{creature:true},title:'タップまたはアンタップするクリーチャーを2体まで選ぶ'}]};
  if(compact363==='マナゾーンに置く時このカードはタップして置く。自分の他の多色クリーチャーがバトルゾーンに出た時カードを1枚引く。自分の多色カードをマナゾーンに置いた時そのカードをアンタップする。')
   return {g314OtherEntry:{who:'self',filter:{multi:true},defs:[{op:'Draw',n:1}]},g763MultiManaUntap:true};
  if(compact363==='W・ブレイカーこのクリーチャーが攻撃する時相手は自身の山札の上から1枚目を見せ山札の一番下に置く。そのカードのコストが5以上ならこのクリーチャーを攻撃の後アンタップする。')
   return {breaker:2,g34Attack:[{op:'Poker763'}]};
 }
 if(phase>=762&&f.typeText==='クリーチャー'){
  const mach='マッハファイター(このクリーチャーは出たターンの間タップまたはアンタップしているクリーチャーを攻撃できる)';
  if(compact363===mach+'相手のクリーチャーが出たターンに攻撃する時相手はそのクリーチャーを自身のマナゾーンに置く。')
   return {machFighter:true,g252AttackWatch:{who:'opponent',entryTurn:true,g399Attacker:true,defs:[{op:'AttackerMana762'}]}};
  if(compact363===mach+'自分のコスト6以上のクリーチャーが出た時そのターンそのクリーチャーに「マッハファイター」を与える。')
   return {machFighter:true,g314OtherEntry:{who:'self',filter:{min:6},g762EntrantMach:true}};
  if(compact363===mach+'このクリーチャーがバトルする時かわりに自分の超化獣クリーチャーにバトルさせてもよい。')
   return {machFighter:true,g762BattleProxyRace:'超化獣'};
 }
 if(phase>=761&&f.typeText==='クリーチャー'){
  const giantAura=min=>({
   breaker:2,
   g205Aura:{filter:{creature:true,race:'ジャイアント',...(min?{min}:{})},power:5000,other:true},
   g557BreakAura:{race:'ジャイアント',...(min?{min}:{}),amount:1,other:true}
  });
  if(compact363==='W・ブレイカー(このクリーチャーはシールドを2つブレイクする)このクリーチャーがバトルゾーンに出た時自分のマナゾーンにあるドリームメイトとジャイアントをすべてアンタップする。自分の他のコスト7以上のジャイアントはすべてパワーを+5000されシールドをさらにひとつブレイクする。')
   return {...giantAura(7),effect:'sixPhoto',g34Tasks:[{op:'UntapMana',filter:{faceUp:true,raceAny:['ドリームメイト','ジャイアント']}}]};
  if(compact363==='バトルゾーンにある自分の他のジャイアントすべてのパワーは+5000されシールドをさらに1枚ブレイクする。W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)')
   return giantAura();
  if(compact363==='オシオキムーン:カードが自分のシールドゾーンを離れた時クリーチャーを1体選びタップまたはアンタップする。')
   return {g536ShieldLeft:[{op:'Target',anyOwner:true,g235TapOrUntap:true,title:'タップまたはアンタップするクリーチャーを選ぶ'}]};
 }
 if(phase>=760&&f.typeText==='クリーチャー'){
  if(compact363==='マナゾーンに置く時このカードはタップして置く。W・ブレイカーこのクリーチャーが召喚されてバトルゾーンに出た時自分のマナゾーンにある闇のカードと火のカードをすべてアンタップする。')
   return {breaker:2,summonedEntryOnly:true,effect:'sixPhoto',g34Tasks:[{op:'UntapMana',manaColorsAny:['闇','火']}]};
  if(compact363==='ブロッカー(相手クリーチャーが攻撃するときこのクリーチャーをタップしてその攻撃を阻止してよい。そのあとその相手クリーチャーとバトルする。)このクリーチャーをブロックのためにタップしたときはバトルのあとでアンタップする。')
   return {blocker:true,g695UntapAfterBlock:true};
  if(compact363==='ブロッカー(相手クリーチャーが攻撃する時このクリーチャーをタップしてその攻撃を阻止してもよい。その後その相手クリーチャーとバトルする)このクリーチャーは相手プレイヤーを攻撃できない。このクリーチャーがブロックした時バトルの後このクリーチャーをアンタップする。')
   return {blocker:true,noPlayerAttack:true,g695UntapAfterBlock:true};
 }
 if(phase>=759&&f.typeText==='クリーチャー'){
  if(compact363==='このクリーチャーが攻撃する時バトルゾーンにある自分のクリーチャーの数が相手より多ければ相手のクリーチャーを1体選びタップする。')
   return {g34Attack:[{op:'IfOwn',filter:{g413MoreCreatures:true},defs:[{op:'Target',tap:true}]}]};
  if(compact363==='このクリーチャーが攻撃する時クリーチャーを1体選びタップしてもよい。(まず何を攻撃するか選んでからタップするクリーチャーを選ぶ)')
   return {g34Attack:[{op:'Target',anyOwner:true,tap:true,optional:true}]};
  if(compact363==='S・トリガーS・トリガー(このクリーチャーをシールドゾーンから手札に加える時コストを支払わずにすぐ召喚してもよい)このクリーチャーがバトルゾーンに出た時クリーチャーを2体まで選びタップする。')
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'Select',origin:'battle',anyOwner:true,n:2,optional:true,g173Targets:true,g193Select:true,g193Tap:true,filter:{creature:true},title:'タップするクリーチャーを2体まで選ぶ'}]};
  if(compact363==='相手のクリーチャーが攻撃する時相手はバトルゾーンにある自身のタップされていないクリーチャーを1体選びタップする。W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)')
   return {breaker:2,g252AttackWatch:{who:'opponent',defs:[{op:'OpponentSelect',n:1,tap:true,filter:{untapped:true}}]}};
 }
 if(phase>=758&&f.typeText==='クリーチャー'){
  if(compact363==='相手が「S・トリガー」を使った時カードを2枚まで引いてもよい。')
   return {g699OpponentShieldTrigger:[{op:'DrawUpTo',n:2}]};
  if(compact363==='相手が「S・トリガー」を使った時自分の山札の上から1枚目をマナゾーンに置いてもよい。')
   return {g699OpponentShieldTrigger:[{op:'Offer',title:'山札の上から1枚をマナに置く？',defs:[{op:'Ramp',n:1}]}]};
  if(compact363==='自分の他のクリーチャーが攻撃する時このクリーチャーをタップしてもよい。そうしたらその攻撃クリーチャーをアンタップする。')
   return {g252AttackWatch:{who:'self',other:true,g399Attacker:true,defs:[{op:'TapToUntap748',g758Attack:true}]}};
 }
 if(phase>=757&&f.typeText==='クリーチャー'){
  if(compact363==='スピードアタッカー(このクリーチャーは召喚酔いしない)自分の他のクリーチャーが攻撃する時このクリーチャーを自分の手札に戻す。')
   return {speedAttacker:true,g252AttackWatch:{who:'self',other:true,defs:[{op:'SelfHand299'}]}};
  if(compact363==='自分のシールドゾーンに表向きのカードがあればこのクリーチャーは「スピードアタッカー」を得る。W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)')
   return {breaker:2,g260Self:{filter:{g757FaceUpShield:true},grants:{speedAttacker:true}}};
  if(compact363==='相手は自分自身のシールドの「S・トリガー」を使った時手札を1枚選んで捨てる。')
   return {g699OpponentShieldTrigger:[{op:'Discard',n:1}]};
 }
 if(phase>=756&&f.typeText==='クリーチャー'){
  if(['自分の無色クリーチャーの召喚コストを最大2少なくしてもよい。','自分の無色クリーチャーの召喚コストを最大2少なくする。'].includes(compact363))
   return {g349SummonAuras:[{filter:{g756Colorless:true},amount:2,g560Optional:true,g756ZeroFloor:true}]};
  const turbo='ターボラッシュ(自分の他のクリーチャーがシールドをブレイクした';
  const suffix='そのターンが終わるまでこのクリーチャーは次の能力を得る)';
  if(compact363===turbo+'あと'+suffix+'このクリーチャーはブロックされない。')
   return {g756TurboRush:'unblockable'};
  if([turbo+'後'+suffix+'このクリーチャーが攻撃するとき相手は自分自身の手札をすべて持ち主の墓地に置く。',
      'ターボラッシュ(このターン中に自分の他のクリーチャーがシールドをブレイクしていればこのターンこのクリーチャーに次の{r}能力を与える){r}このクリーチャーが攻撃する時相手は自身の手札をすべて捨てる。'].includes(compact363))
   return {g756TurboRush:'discard'};
 }
 if(phase>=755&&f.typeText==='クリーチャー'){
  if(compact363==='このクリーチャーは自分の手札が2枚以下なら召喚できる。W・ブレイカー(このクリーチャーはシールドを2つブレイクする)')
   return {g755SummonHandMax:2,breaker:2};
  if(compact363==='【K・ソウル】このクリーチャーは自分のターンのはじめにアンタップしない。')
   return {g558Souls:['K'],g40StartNoUntap:true};
  if(compact363==='自分の他のクリーチャーがバトルゾーンに出た時そのターンそのクリーチャーのパワーを+3000する。')
   return {g314OtherEntry:{who:'self',g755EntrantPower:3000}};
 }
 if(phase>=754&&f.typeText==='クリーチャー'){
  if(compact363==='自分が呪文を唱えた時次の自分のターンのはじめまでこのクリーチャーは攻撃もブロックもされない。')
   return {g204SpellWatch:{who:'self',defs:[{op:'SelfGrant754',g521UntilStart:true,grant:{cannotBeAttacked:true,unblockable:true}}]}};
  if(compact363==='相手が呪文を唱えた時このクリーチャーをバトルゾーンから自分の手札に戻す。W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)')
   return {breaker:2,g204SpellWatch:{who:'opponent',defs:[{op:'SelfHand299'}]}};
  if(compact363==='自分のターンのはじめにこのクリーチャーがタップしていればこのクリーチャーを破壊しカードを2枚引く。')
   return {g754StartTapped:true,g174Start:[{op:'SelfDestroy'},{op:'Draw',n:2}]};
  if(compact363==='自分のターンのはじめに自分のマナゾーンに闇と火文明があればこのクリーチャーを自分の墓地から手札に戻してもよい。スピードアタッカー(このクリーチャーは召喚酔いしない)')
   return {speedAttacker:true,g754GraveStartColors:['闇','火']};
 }
 if(phase>=753&&f.typeText==='クリーチャー'){
  const sympathy='シンパシー:相手のマナゾーンにあるカード';
  const oldHelp='(相手のマナゾーンにあるカード1枚につきこのクリーチャーの召喚コストを1少なくする。ただしコストは0以下にはならない)';
  const newHelp='(このカードの実行コストを相手のマナゾーンにあるカード1枚につき1少なくする。ただしコストは0以下にならない)';
  const attack='マッハファイターQ・ブレイカーこのクリーチャーが攻撃する時バトルゾーンにあるエレメントを1つとその持ち主のマナゾーンにあるそれよりコストが小さいエレメントを1つ';
  if([sympathy+oldHelp+attack+'選びそれらを入れ替えてもよい。',
      sympathy+attack+'選びそれらを入れ替えてもよい。',
      sympathy+newHelp+attack+'選んでもよい。選ばれたエレメントの持ち主はそれらを入れ替える。'].includes(compact363))
   return {machFighter:true,breaker:4,g212CountDiscount:{zone:'mana',owner:'opponent',amount:1,g753AllMana:true},
    g34Attack:[{op:'ManaExchange753'}]};
 }
 if(phase>=752&&f.typeText==='クリーチャー'){
  const mach='マッハファイター(このクリーチャーはバトルゾーンに出たターンの間タップまたはアンタップしているクリーチャーを攻撃できる)';
  const double='W・ブレイカー(このクリーチャーはシールドを2つブレイクする)';
  const win='このクリーチャーがバトルに勝った時';
  const draw={op:'Draw',n:1};
  if(compact363===mach+double+'バトル中このクリーチャーのパワーを+4000する。'+win+'カードを1枚引く。それがこのクリーチャーがこのターンはじめて勝ったバトルなら相手のクリーチャーを1体選んでもよい。このクリーチャーとその選んだクリーチャーをバトルさせる。')
   return {machFighter:true,breaker:2,g38BattleBonus:4000,g189BattleWin:[
    draw,{op:'ShinkaHost544',mode:'fight',g752FirstOnly:true}
   ]};
  if(compact363==='このクリーチャーが出た時相手のコスト3以下のクリーチャー1体またはコスト3以下のタマシードを1枚持ち主の手札に戻す。その後自分のタマシードがあればカードを1枚引いてもよい。')
   return {effect:'sixPhoto',g34Tasks:[
    {op:'Target',element:true,filter:{creatureOrSeed:true,max:3},to:'hand'},
    {op:'IfOwn',filter:{g295Tamaseed:true},defs:[{op:'Offer',title:'カードを1枚引く？',defs:[draw]}]}
   ]};
  if(compact363==='シビルカウント3:自分の水のクリーチャーまたは水のタマシードが合計3つ以上あればこのクリーチャーは攻撃もブロックもされない。')
   return {g260Self:{filter:{creatureOrSeed:true,color:'水',g258Civil:3},grants:{cannotBeAttacked:true,unblockable:true}}};
  if(compact363==='このクリーチャーが攻撃する時相手のシールドが2つ以下なら自分の山札の上から2枚をマナゾーンに置いてもよい。そうしたらクリーチャーを1体自分のマナゾーンから手札に戻す。')
   return {g34Attack:[{op:'IfOwn',filter:{g334ZoneCount:{zone:'shields',opponent:true,max:2}},defs:[
    {op:'Offer',g356RampReturn:true,title:'山札の上から2枚をマナに置き、クリーチャー1体を手札に戻す？',defs:[
     {op:'Ramp',n:2},{op:'Select',origin:'mana',n:1,to:'hand',g232ManaReturn:true,filter:{creature:true},title:'マナから手札に戻すクリーチャーを1体選ぶ'}
    ]}
   ]}]};
 }
 if(phase>=751&&f.typeText==='クリーチャー'){
  const win='このクリーチャーがバトルに勝った時';
  const shield={op:'ShieldTop',n:1};
  const shieldText='自分の山札の上から1枚目を裏向きのまま新しいシールドとして';
  const double='W・ブレイカー(このクリーチャーはシールドを2つブレイクする)';
  const dogi='スピードアタッカーT・ブレイカー';
  const dogiTarget='このクリーチャーはアンタップしているクリーチャーを攻撃できる。';
  const dogiWin=win+'次の自分のターンのはじめまで';
  if(compact363===dogi+'このクリーチャーがバトルゾーンに出た時そのターン'+dogiTarget+dogiWin+'自分はゲームに負けず相手はゲームに勝てない。'||
     compact363===dogi+'このクリーチャーが出た時このターン'+dogiTarget+dogiWin+'自分はゲームに負けない。')
   return {effect:'sixPhoto',speedAttacker:true,breaker:3,g34Tasks:[{op:'ShinkaGrant397',grant:{attackUntapped:true}}],
    g189BattleWin:[{op:'Lock',g746Self:true,limit:{kind:'g34NoLose'}}]};
  if(compact363===win+shieldText+'自分のシールドゾーンに置く。ラビリンス:自分のシールドが相手より多ければこのクリーチャーのパワーを+3000し「W・ブレイカー」を与える。(「W・ブレイカー」を持つクリーチャーはシールドを2つブレイクする)')
   return {g189BattleWin:[shield],g260Self:{filter:{g334ZoneCount:{zone:'shields',moreThanOpponent:true}},grants:{power:3000,breaker:2}}};
  if(compact363===double+'自分の光または自然のクリーチャーがバトルに勝った時次のうちいずれか1つを選んでもよい。▶'+shieldText+'シールドゾーンに置く。▶自分の山札の上から1枚目をマナゾーンに置く。')
   return {breaker:2,g252WinWatch:{filter:{creature:true,any:[{color:'光'},{color:'自然'}]},defs:[
    {op:'Choose',g184Modes:true,modes:[
     {label:'山札の上からシールドを1つ追加',defs:[shield]},
     {label:'山札の上からマナに1枚置く',defs:[{op:'Ramp',n:1}]},
     {label:'この能力を使わない',defs:[]}
    ]}
   ]}};
  const blocker='ブロッカーブロッカー(このクリーチャーをタップして相手クリーチャーの攻撃先をこのクリーチャーに変更してもよい)';
  if(compact363===blocker+double+'シビルカウント3:'+win+'自分の光のクリーチャーまたは光のタマシードが合計3つ以上あれば自分の山札の上から1枚目をシールド化してもよい。')
   return {blocker:true,breaker:2,g189BattleWin:[{op:'IfOwn',filter:{creatureOrSeed:true,color:'光',g258Civil:3},
    defs:[{op:'Offer',title:'山札の上からシールドを1つ追加する？',defs:[shield]}]}]};
 }
 if(phase>=750&&f.typeText==='クリーチャー'){
  const speed='スピードアタッカー(このクリーチャーは召喚酔いしない)';
  const double='W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)';
  const win='このクリーチャーがバトルに勝った時';
  if(compact363===speed+'このクリーチャーをバトルゾーンに出した時そのターンこのクリーチャーはタップされていないクリーチャーを攻撃できる。'+win+'そのターンバトルゾーンにある自分のクリーチャーすべてはタップされていないクリーチャーを攻撃できる。'+double){
   const grant={attackUntapped:true};
   return {effect:'sixPhoto',speedAttacker:true,breaker:2,g34Tasks:[{op:'ShinkaGrant397',grant}],
    g189BattleWin:[{op:'GroupGrant364',owner:'self',filter:{creature:true},grant}]};
  }
  const dash='キリフダッシュ[ff04](自分のクリーチャーの攻撃の終わりにそのクリーチャーがその攻撃中にシールドをブレイクしていればこのクリーチャーを[ff04]支払って召喚してもよい)';
  if(compact363===dash+'スピードアタッカーW・ブレイカー'+win+'このクリーチャーをアンタップし相手のシールドを1つブレイクする。')
   return {effect:'sixPhoto',speedAttacker:true,breaker:2,kirifudaDash:4,g402DashColors:['火'],
    g189BattleWin:[{op:'Untap',g191First:true},{op:'Break497',n:1,g747CreatureBreak:true}]};
  const discount='このクリーチャーの召喚コストをバトルゾーンにあるクリーチャー1体につき1少なくする。ただしコストは0以下にならない。';
  const mach='マッハファイター(このクリーチャーはバトルゾーンに出たターンの間タップまたはアンタップしているクリーチャーを攻撃できる)';
  if(compact363===discount+mach+'T・ブレイカー自分のターン中に'+win+'次のターン自分は攻撃されない。')
   return {effect:'sixPhoto',machFighter:true,breaker:3,
    g212CountDiscount:{zone:'battle',owner:'both',filter:{creature:true},amount:1},g189BattleWin:[{op:'PlayerGuard750'}]};
 }
 if(phase>=749&&f.typeText==='クリーチャー'){
  const speed='スピードアタッカー(このクリーチャーは召喚酔いしない)';
  const double='W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)';
  const win='このクリーチャーがバトルに勝った時';
  const draw={op:'Draw',n:1};
  if(compact363===speed+double+win+'自分の山札の上から3枚をすべてのプレイヤーに見せてもよい。その中から進化ではないドラゴンを1体バトルゾーンに出しその後残りを墓地に置く。')
   return {effect:'sixPhoto',speedAttacker:true,breaker:2,g189BattleWin:[
    {op:'Offer',g359RevealAll:true,title:'山札の上3枚を公開して非進化ドラゴンを出す？',defs:[
     {op:'LookDeploy530',n:3,limit:1,public:true,g749Required:true,rest:'grave',filter:{creature:true,race:'ドラゴン',nonEvolution:true}}]}]};
  const life='EXライフ(このクリーチャーを出す時自分の山札の上から1枚目をシールド化する。このクリーチャーが離れる時かわりにそのシールドを墓地に置く)';
  if(compact363===life+'Q・ブレイカー自分のクリーチャーすべてに「マッハファイター」を与える。自分のクリーチャーがバトルに勝った時カードを1枚引く。その後相手のシールドを1つブレイクしてもよい。')
   return {effect:'sixPhoto',exLife:true,breaker:4,g208Auras:[{filter:{creature:true},grants:{machFighter:true}}],
    g252WinWatch:{filter:{creature:true},defs:[draw,{op:'Break278',optional:true}]}};
  const pair='このクリーチャーが出た時クリーチャーを2体選んでもよい。その2体をバトルさせる。';
  const die='相手のターン中にこのクリーチャーが出た時このターンに2つ以上自分のシールドがブレイクされていなければこのクリーチャーを破壊する。';
  if(compact363==='S・トリガーS・トリガーW・ブレイカー'+pair+win+'カードを1枚引く。'+die)
   return {effect:'sixPhoto',trigger:true,breaker:2,cobra:true,
    g34Tasks:[{op:'FightPair586',who:'both',optional:true}],g189BattleWin:[draw]};
 }
 if(phase>=748&&f.typeText==='クリーチャー'){
  const mach='マッハファイター(このクリーチャーはバトルゾーンに出たターンの間タップまたはアンタップしているクリーチャーを攻撃できる)';
  const win='このクリーチャーがバトルに勝った時';
  if(compact363===mach+'T・ブレイカー(このクリーチャーはシールドを3つブレイクする)'+win+'自然のコスト6以下の進化ではないクリーチャーを1体自分のマナゾーンからバトルゾーンに置いてもよい。')
   return {effect:'sixPhoto',machFighter:true,breaker:3,g189BattleWin:[{op:'Select',origin:'mana',n:1,deploy:true,optional:true,
    filter:{creature:true,faceUp:true,color:'自然',max:6,nonEvolution:true},title:'自然のコスト6以下の進化ではないクリーチャーをマナから出す？'}]};
  if(compact363==='自分のグレートメカオーがバトルに勝った時このクリーチャーをタップしてもよい。そうした場合その勝ったグレートメカオーをアンタップする。')
   return {effect:'sixPhoto',g252WinWatch:{filter:{creature:true,race:'グレートメカオー'},winner:true,defs:[{op:'TapToUntap748'}]}};
  const entry='このクリーチャーまたは自分の他のアウトレイジをバトルゾーンに出した時バトルゾーンにある相手のクリーチャーを1体選んでもよい。そうした場合その2体はバトルする。';
  const draw='自分のアウトレイジがバトルに勝った時カードを1枚引いてもよい。';
  if(f.civilizations.length>1&&compact363==='マナゾーンに置く時このカードはタップして置く。'+entry+draw+'W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)'){
   const filter={creature:true,race:'アウトレイジ'};
   return {effect:'sixPhoto',breaker:2,g468EntryWatch:{filter,mode:'fight'},
    g252WinWatch:{filter,defs:[{op:'Offer',title:'カードを1枚引く？',defs:[{op:'Draw',n:1}]}]}};
  }
 }
 if(phase>=747&&f.typeText==='クリーチャー'){
  const fight='各ターンに一度自分のドラゴンが攻撃する時相手のクリーチャーを1体選んでもよい。その2体をバトルさせる。';
  const untap='自分のドラゴンがバトルに勝った時そのクリーチャーをアンタップする。';
  const reduction='の召喚コストを1少なくする。ただしコストは0以下にはならない。';
  if(['ドラゴン','ドラゴン・クリーチャー'].some(r=>compact363===fight+untap+'自分の'+r+reduction)){
   const filter={creature:true,race:'ドラゴン'};
   return {effect:'sixPhoto',g349SummonAuras:[{race:'ドラゴン',amount:1}],
    g252AttackWatch:{who:'self',filter,g399Attacker:true,defs:[{op:'AttackFight408',g747Once:true}]},
    g252WinWatch:{filter,winner:true,defs:[{op:'AttackUntap408',g562Creature:true}]}};
  }
  const draw='自分のクリーチャーがバトルに勝った時カードを1枚引いてもよい。';
  const tap='このクリーチャーがタップした時このターン中に出た自分のクリーチャーを1体選んでもよい。';
  if(['このターンの終わりまで','このターン'].some(duration=>compact363===draw+tap+duration+'そのクリーチャーに「マッハファイター」を与える。'))
   return {effect:'sixPhoto',
    g252WinWatch:{filter:{creature:true},defs:[{op:'Offer',title:'カードを1枚引く？',defs:[{op:'Draw',n:1}]}]},
    g188Tapped:[{op:'Target',owner:'self',optional:true,filter:{creature:true,g596EnteredThisTurn:true},
     g301Grant:true,grant:{machFighter:true},title:'このターンに出た自分のクリーチャーにマッハファイターを与える？'}]};
  const guard='ガードマン(自分の他のクリーチャーが攻撃される時このクリーチャーをタップしてもよい。そうした場合攻撃クリーチャーはかわりにこのクリーチャーを攻撃する)';
  if(compact363===guard+'このクリーチャーがバトルに勝った時このクリーチャーは相手のシールドをひとつブレイクする。')
   return {guardman:true,effect:'sixPhoto',g189BattleWin:[{op:'Break497',n:1,g747CreatureBreak:true}]};
 }
 if(phase>=746&&f.typeText==='クリーチャー'){
  const draw={op:'Draw',n:1};
  const bad='B・A・D2(このクリーチャーの召喚コストを2少なくしてもよい。そうしたらこのターンの終わりにこのクリーチャーを破壊する)';
  const win='このクリーチャーがバトルに勝った時';
  if(compact363===bad+'スピードアタッカーW・ブレイカーこのクリーチャーが出た時相手のクリーチャーを1体選んでもよい。その選んだクリーチャーとこのクリーチャーをバトルさせる。'+win+'カードを1枚引く。その後「B・A・D」を持つビートジョッキーを1体自分の手札から出してもよい。このターンの終わりにそのビートジョッキーを破壊する。')
   return {bad:2,g175Bad:true,speedAttacker:true,breaker:2,effect:'sixPhoto',
    g34Tasks:[{op:'Fight240',self:true,optional:true}],
    g189BattleWin:[draw,{op:'Select',origin:'hand',n:1,deploy:true,optional:true,delayed:'grave',
     filter:{creature:true,race:'ビートジョッキー',g746Bad:true},title:'手札からB・A・Dを持つビートジョッキーを1体まで出す'}]};
  if(compact363==='W・ブレイカー'+win+'カードを1枚引く。その後自分のマナゾーンにあるカードの枚数以下のコストを持つジョーカーズを1体自分のマナゾーンから選びバトルゾーンに出してもよい。')
   return {breaker:2,g189BattleWin:[draw,{op:'Select',origin:'mana',n:1,deploy:true,optional:true,g746OwnManaCost:true,
    filter:{creature:true,race:'ジョーカーズ'},title:'マナの枚数以下のコストのジョーカーズを1体まで出す'}]};
  const protect='スピードアタッカーマッハファイターT・ブレイカー'+win+'次の自分のターンのはじめまで';
  if(compact363===protect+'自分はゲームに負けず相手は勝てない。'||compact363===protect+'自分はゲームに負けない。')
   return {speedAttacker:true,machFighter:true,breaker:3,g189BattleWin:[{op:'Lock',g746Self:true,limit:{kind:'g34NoLose'}}]};
 }
 if(phase>=745&&f.typeText==='クリーチャー'){
  const bad='B・A・D2(このクリーチャーをコストを2少なくして召喚してもよい。そうしたらこのターンの終わりにこのクリーチャーを破壊する)スピードアタッカー';
  const fast={bad:2,g175Bad:true,speedAttacker:true};
  if(compact363===bad+'T・ブレイカーこのクリーチャーが攻撃する時このクリーチャーよりパワーが小さいクリーチャーをすべて破壊する。')
   return {...fast,breaker:3,g34Attack:[{op:'TargetBelowSource692',g745Sweep:true}]};
  if(compact363===bad+'このクリーチャーが攻撃する時自分の山札の上から2枚を墓地に置く。こうして墓地に置いたビートジョッキー1体につきこのターンこのクリーチャーはシールドをさらに1つブレイクする。')
   return {...fast,g34Attack:[{op:'MillExtraBreak745',n:2,race:'ビートジョッキー'}]};
  if(compact363==='マジボンバー3(このクリーチャーが攻撃する時自分の山札の上から1枚目を見る。その後コスト3以下のクリーチャーを1体自分の手札または山札の上からバトルゾーンに出してもよい)自分が「マジボンバー」能力を使ってクリーチャーをバトルゾーンに出した時相手のクリーチャーを1体選んでもよい。その2体をバトルさせる。')
   return {g34Attack:[{op:'Magibomber321',n:3,g743HoldTop:true}],g745MagibomberFight:true};
 }
 if(phase>=744&&f.typeText==='クリーチャー'){
  const bomber=(n,top='1枚目')=>'マジボンバー'+n+'(このクリーチャーが攻撃する時自分の山札の上から'+top+'を見る。その後コスト'+n+'以下のクリーチャーを1体自分の手札または山札の上から';
  const attack=n=>[{op:'Magibomber321',n,g743HoldTop:true}];
  const fast={speedAttacker:true,breaker:2};
  const attackEnd='このクリーチャーの攻撃の終わりに';
  if(compact363===bomber(3)+'バトルゾーンに出してもよい)自分のクリーチャーが攻撃する時自分の手札を1枚捨てその後カードを1枚引く。')
   return {g34Attack:attack(3),g252AttackWatch:{who:'self',filter:{creature:true},defs:[{op:'Discard',owner:'self',n:1},{op:'Draw',n:1}]}};
  if(compact363===bomber(4)+'バトルゾーンに出してもよい)自分のターンの終わりにそのターン自分のクリーチャーを2体以上バトルゾーンに出していれば自分の山札の上から1枚目を見る。それを表向きまたは裏向きにして新しいシールドとしてシールドゾーンに置く。')
   return {g34Attack:attack(4),g174End:[{op:'IfOwn',filter:{g334ZoneCount:{zone:'enteredThisTurn',min:2}},defs:[{op:'LookShield744'}]}]};
  if(compact363==='スピードアタッカーW・ブレイカー'+bomber(5)+'バトルゾーンに出してもよい)'+attackEnd+'このターン中にシールドが1つもブレイクされていなければこのクリーチャーをアンタップする。')
   return {...fast,g34Attack:attack(5),g474AttackEnd:[{op:'IfOwn',filter:{g334ZoneCount:{zone:'brokenThisTurn',sumBoth:true,max:0}},defs:[{op:'Untap'}]}]};
  const discount='自分のクリーチャーがなければこのクリーチャーの召喚コストを3少なくする。';
  const vari=discount+'スピードアタッカーW・ブレイカー';
  if(compact363==='バトルゾーンに'+vari+bomber(7)+'バトルゾーンに出してもよい)'+attackEnd+'自分の山札の上から1枚目を裏向きのまま新しいシールドとしてシールドゾーンに置いてもよい。'||
     ['1枚','1枚目'].some(count=>compact363===vari+bomber(7,count)+'出してもよい)'+attackEnd+'自分の山札の上から'+count+'をシールド化してもよい。'))
   return {...fast,g261Discount:{filter:{g370BattleCount:{max:0,filter:{creature:true}}},amount:3},g34Attack:attack(7),
    g474AttackEnd:[{op:'Offer',title:'山札の上から1枚を裏向きでシールド化する？',defs:[{op:'ShieldTop',n:1}]}]};
 }
 if(phase>=743){
  if(f.typeText==='クリーチャー'&&compact363==='自分のクリーチャーがバトルゾーンに出た時それがこのターン自分がバトルゾーンに出した2体目のクリーチャーならカードを1枚引く。マジボンバー5(このクリーチャーが攻撃する時自分の山札の上から1枚目を見る。その後コスト5以下のクリーチャーを1体自分の手札または山札の上からバトルゾーンに出してもよい)')
   return {g742SecondEntry:[{op:'Draw',n:1}],g34Attack:[{op:'Magibomber321',n:5,g743HoldTop:true}]};
  if(f.typeText==='クリーチャー'&&compact363==='ブロッカーブロッカーW・ブレイカー自分のターンの終わりにこのクリーチャーをアンタップする。革命2―相手のクリーチャーがバトルゾーンに出た時自分のシールドが2つ以下ならそのクリーチャーをタップする。')
   return {blocker:true,breaker:2,g174End:[{op:'Untap'}],g743OpponentEntryTap:true};
  if(f.typeText==='NEOクリーチャー'&&compact363==='NEO進化:自分の光のクリーチャー1体の上に置いてもよい。(クリーチャーが下にあればこれをNEO進化クリーチャーとして扱う)W・ブレイカー(このクリーチャーはシールドを2つブレイクする)このクリーチャーが攻撃する時相手のクリーチャーを2体まで選びタップする。これがNEO進化クリーチャーなら選んだクリーチャーは次の相手のターンのはじめにアンタップしない。')
   return {neoEvolution:{any:[{civilization:'光'}]},breaker:2,
    g34Attack:[{op:'Select',origin:'battle',owner:'opponent',n:2,optional:true,filter:{creature:true},
     g173Targets:true,g193Select:true,g193Tap:true,g743NeoLock:true,title:'タップする相手のクリーチャーを2体まで選ぶ'}]};
 }
 if(phase>=742&&f.typeText==='クリーチャー'){
  const freeze={op:'Target',tap:true,lock:true,g210TapLock:true,title:'タップして次のターン開始時のアンタップを止めるクリーチャーを選ぶ'};
  if(compact363==='このクリーチャーが攻撃する時相手のシールドが2つ以下なら相手のクリーチャーを1体選んでタップする。次の相手のターンのはじめにそのクリーチャーはアンタップしない。')
   return {g34Attack:[{op:'IfOwn',filter:{g465OpponentShieldsMax:2},defs:[freeze]}]};
  if(compact363==='自分のクリーチャーがバトルゾーンに出た時それがこのターン自分がバトルゾーンに出した2体目のクリーチャーなら相手のクリーチャーを1体選びタップする。次の相手のターンのはじめにそのクリーチャーはアンタップしない。')
   return {g742SecondEntry:[freeze]};
  if(compact363==='シビルカウント3:このクリーチャーが攻撃する時自分の光のクリーチャーまたは光のタマシードが合計3つ以上あれば相手のクリーチャーを1体選びタップする。そのクリーチャーは次の相手のターンのはじめにアンタップしない。(まず自分のクリーチャーが何を攻撃するか選ぶ。その後タップする相手のクリーチャーを選ぶ)')
   return {g34Attack:[{op:'IfOwn',filter:{creatureOrSeed:true,color:'光',g258Civil:3},defs:[freeze]}]};
 }
 if(phase>=741){
  if(f.typeText==='クリーチャー'){
   if(compact363==='このクリーチャーが出た時次の自分のターンのはじめまで自分が攻撃される時相手は自身のパワーが一番小さいクリーチャーを1体選び破壊する。')
    return {effect:'sixPhoto',g34Tasks:[{op:'PlayerAttackResponse741',defs:[{op:'Custom',name:'opponentExtreme',extreme:'min',to:'grave',g740Power:true}]}]};
   const start='このクリーチャーをバトルゾーンに出した時バトルゾーンにある相手の';
   const lock='次の相手のターンのはじめにそのクリーチャーはアンタップされない。';
   if(compact363===start+'パワーが一番小さいタップされているクリーチャーを1体選ぶ。2体以上あればどちらか好きなほうを選ぶ。'+lock)
    return {effect:'sixPhoto',g34Tasks:[{op:'Target',filter:{tapped:true},g741MinPower:true,lock:true,title:'タップされている相手の最低パワーのクリーチャーを選ぶ'}]};
   if(compact363===start+'タップされているクリーチャーを1体選ぶ。'+lock)
    return {effect:'sixPhoto',g34Tasks:[{op:'Target',filter:{tapped:true},lock:true,title:'タップされている相手のクリーチャーを選ぶ'}]};
  }
  if(f.typeText==='進化クリーチャー'&&compact363==='進化:サバイバー1体の上に置く。W・ブレイカー(このクリーチャーはシールドを2つブレイクする)このクリーチャーが攻撃する時進化ではないクリーチャーを1体自分の墓地から出す。自分の他のサバイバーが破壊された時相手のパワーが一番小さいクリーチャーを1体選び破壊する。')
   return {evolution:{race:'サバイバー'},breaker:2,g34Attack:[{op:'Select',origin:'grave',n:1,deploy:true,filter:{creature:true,nonEvolution:true}}],
    g303DeathWatch:{race:'サバイバー',g725RemainInBattle:true,defs:[{op:'Target',to:'grave',g741MinPower:true,title:'破壊する相手の最低パワーのクリーチャーを選ぶ'}]}};
 }
 if(phase>=740&&f.typeText==='クリーチャー'){
  const trigger='S・トリガーS・トリガー';
  const extreme=(which,untapped=false)=>({op:'Custom',name:'opponentExtreme',extreme:which,to:'grave',g740Power:true,...(untapped?{untapped}:{})});
  const maskEntry=trigger+'(このクリーチャーをシールドゾーンから手札に加える時コストを支払わずにすぐ召喚してもよい)このクリーチャーがバトルゾーンに出た時相手は';
  const maskEffect='自身のパワーが一番小さいクリーチャーを1体選び破壊する。';
  if(compact363===maskEntry+maskEffect||compact363===maskEntry+'バトルゾーンにある'+maskEffect)
   return {trigger:true,effect:'sixPhoto',g34Tasks:[extreme('min')]};
  if(compact363===trigger+'ブロッカーブロッカーこのクリーチャーが出た時相手は自身のパワーが一番小さいクリーチャーを1体選んで破壊する。シビルカウント3:このクリーチャーが出た時自分の闇のクリーチャーまたは闇のタマシードが合計3つ以上あれば相手は自身のパワーが一番大きいクリーチャーを1体選んで破壊する。このクリーチャーが攻撃する時その攻撃の後このクリーチャーを破壊する。')
   return {trigger:true,blocker:true,effect:'sixPhoto',g34Tasks:[extreme('min')],
    g527ExtraEntry:[{label:'シビルカウント3',defs:[{op:'IfOwn',filter:{creatureOrSeed:true,color:'闇',g258Civil:3},defs:[extreme('max')]}]}],
    g34Attack:[{op:'AfterAttack542',defs:[{op:'SelfDestroy'}]}]};
  if(compact363===trigger+'このクリーチャーが出た時相手のパワー3000以下のクリーチャーをすべて破壊する。相手のクリーチャーが自分または自分のクリーチャーを攻撃する時相手は自身のアンタップしているクリーチャーの中でパワーが一番小さいクリーチャーを1体選び破壊する。')
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'Sweep',filter:{creature:true,maxPower:3000,g199Power:true}}],
    g252AttackWatch:{who:'opponent',defs:[extreme('min',true)]}};
 }
 if(phase>=739&&f.typeText==='クリーチャー'){
  const dragonEntry='このクリーチャーがバトルゾーンにある間自分のドラゴンまたはドラゴノイドがバトルゾーンに出たとき';
  const filter={creature:true,raceAny:['ドラゴン','ドラゴノイド']};
  if(compact363===dragonEntry+'自分の山札の上から1枚目を自分のマナゾーンに置く。')
   return {g251EntryDraw:{filter,defs:[{op:'Ramp',n:1}]}};
  if(compact363===dragonEntry+'バトルゾーンにあるパワーの一番小さいクリーチャーを1体選び持ち主の墓地に置く。')
   return {g251EntryDraw:{filter,defs:[{op:'LowestPower739'}]}};
  if(compact363==='自分の他のクリーチャーがバトルゾーンに出たときこのクリーチャーを自分の墓地に置く。')
   return {g250EntryDraw:{filter:{creature:true},self:false,defs:[{op:'SelfDestroy'}]}};
 }
 if(phase>=738){
  if(f.typeText==='クリーチャー'&&compact363==='このクリーチャーがバトルゾーンにある間自分のガーディアンがバトルゾーンに出たときバトルゾーンにある相手のクリーチャーを1体選びタップしてもよい。')
   return {g251EntryDraw:{filter:{creature:true,race:'ガーディアン'},defs:[{op:'Target',tap:true,optional:true,title:'タップする相手のクリーチャーを選ぶ'}]}};
  if(f.typeText==='進化クリーチャー'&&compact363==='進化-自分のダークロード1体の上に置く。このクリーチャーがバトルゾーンにある間自分のゴーストがバトルゾーンに出たときバトルゾーンにある相手のタップされていないクリーチャーを1体選び持ち主の墓地に置いてもよい。W・ブレイカー')
   return {evolution:{race:'ダークロード'},breaker:2,g251EntryDraw:{filter:{creature:true,race:'ゴースト'},defs:[{op:'Target',to:'grave',filter:{untapped:true},optional:true,title:'破壊するアンタップ状態の相手クリーチャーを選ぶ'}]}};
  if(f.typeText==='クリーチャー'&&compact363==='このクリーチャーがバトルゾーンから自分の墓地に置かれるときバトルゾーンに双光の使徒カリュートが他に1体でもあればこのクリーチャーを墓地に置くかわりに自分の手札に戻す。')
   return {g738GraveToHandWithName:'双光の使徒カリュート'};
 }
 if(phase>=737){
  if(f.typeText==='呪文'&&compact363==='種族を1つ選ぶ。このターンその種族のクリーチャーはアンタップされているクリーチャーを攻撃することができクリーチャーを攻撃するときブロックされない。')
   return {effect:'sixPhoto',g34Tasks:[{op:'ChooseRace724',g735Grant:{attackUntapped:true,g737CreatureAttackUnblockable:true}}]};
  if(f.typeText==='クリーチャー'){
   const tapHeader='このクリーチャーで攻撃するかわりにタップして次の能力を使ってもよい。種族を1つ選ぶ。';
   const body=compact363.startsWith(tapHeader)?compact363.slice(tapHeader.length):null;
   if(body==='このターンが終わるまでその種族のクリーチャーは「スレイヤー」を得る。(「スレイヤー」を持つクリーチャーとバトルした相手クリーチャーは勝っても持ち主の墓地に置かれる)')
    return {g736AttackInstead:true,g439Tap:[{op:'ChooseRace724',g737FromCreature:true,g735Grant:{slayer:true}}]};
   if(body==='このターンその種族のクリーチャーはパワー3000以下のクリーチャーにブロックされない。')
    return {g736AttackInstead:true,g439Tap:[{op:'ChooseRace724',g737FromCreature:true,g735Grant:{g725NoBlockMaxPower:3000}}]};
   if(compact363==='このクリーチャーが出た時種族を1つ選びその後自分の山札の上から2枚を表向きにする。その中から選んだ種族を持つカードをすべて手札に加え残りを好きな順序で山札の下に置く。')
    return {effect:'sixPhoto',g34Tasks:[{op:'ChooseRace724',g737RevealRace:true}]};
  }
 }
 if(phase>=736){
  if(f.typeText==='呪文'&&compact363==='種族を1つ選ぶ。その種族のクリーチャーを自分の手札から好きな枚数選び自分のマナゾーンに置いてもよい。')
   return {effect:'sixPhoto',g34Tasks:[{op:'ChooseRace724',g736HandMana:true}]};
  if(f.typeText==='クリーチャー'&&compact363==='このクリーチャーがバトルゾーンにある間自分の他のクリーチャーがバトルゾーンに出るたびこのターンの終わりまでバトルゾーンにあるビーストフォークのパワーは+2000され「W・ブレイカー」を得る。'){
   const group={owner:'both',filter:{creature:true,race:'ビーストフォーク'}};
   return {g314OtherEntry:{who:'self',defs:[{op:'GroupPower',...group,power:2000},{op:'GroupGrant364',...group,grant:{g313Breaker:2,g633DoubleBreaker:true}}]}};
  }
  if(f.typeText==='クリーチャー'&&compact363==='このクリーチャーで攻撃するかわりにタップして次の能力を使ってもよい。種族を1つ選ぶ。このターンその種族のクリーチャーは可能であれば攻撃し「パワーアタッカー+4000」を得る。')
   return {g736AttackInstead:true,g439Tap:[{op:'ChooseRace724',g736ForceAttack:true}]};
 }
 if(phase>=735&&f.typeText==='呪文'){
  if(compact363==='自分のマナゾーンにある無色カードの枚数よりコストが小さいクリーチャーをすべて破壊する。')
   return {effect:'sixPhoto',g34Tasks:[{op:'ManaCostSweep522',g735BelowColorless:true}]};
  if(compact363==='種族を1つ選ぶ。このターンその種族のクリーチャーはブロックされない。')
   return {effect:'sixPhoto',g34Tasks:[{op:'ChooseRace724',g735Grant:{unblockable:true}}]};
  if(compact363==='S・トリガー種族を1つ選ぶ。次の自分のターンが始まるまでバトルゾーンにあるその種族のクリーチャーはすべて「ブロッカー」を得る。')
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'ChooseRace724',g735Grant:{blocker:true},g521UntilStart:true}]};
 }
 if(phase>=733){
  if(f.typeText==='クリーチャー'&&compact363==='Q・ブレイカー(このクリーチャーはシールドを4つブレイクする)このクリーチャーが破壊される時墓地に置くかわりに山札に加えてシャッフルする。')
   return {breaker:4,g731DestroyShuffle:true};
  if(f.typeText==='呪文'){
   if(compact363==='自分の山札の上からクリーチャーが出るまでカードを表向きにする。そのクリーチャーよりパワーが小さいクリーチャーをすべて破壊する。表向きにしたカードをすべて墓地に置く。')
    return {effect:'sixPhoto',g34Tasks:[{op:'Barrage732'}]};
   const manaPrefix='マナゾーンに置く時このカードはタップして置く。';
   const triggerPrefix='S・トリガーS・トリガー(この呪文をシールドゾーンから手札に加える時コストを支払わずにすぐ唱えてもよい)';
   const body=compact363.startsWith(manaPrefix)?compact363.slice(manaPrefix.length):compact363;
   const trigger=body.startsWith(triggerPrefix);
   const sweep=trigger?body.slice(triggerPrefix.length):body;
   const match=sweep.match(/^(相手の)?パワー3000以下のクリーチャーをすべて破壊する。その後(?:こうして|このようにして)?破壊したクリーチャー1体につき(?:1枚カードを|カードを1枚)引いてもよい。$/);
   if(match)return {...(trigger?{trigger:true}:{}),effect:'sixPhoto',g34Tasks:[{op:'Sweep',both:!match[1],filter:{creature:true,maxPower:3000,g199Power:true},g733DrawPerAttempt:true}]};
  }
 }
 if(phase>=732){
  const text=normalize(f.abilityText);
  if(f.typeText==='クリーチャー'&&text==='このクリーチャーをバトルゾーンに出した時カード名をひとつ選んで言う。その後相手の手札を見る。相手はその中から選ばれたカードと同じ名前のカードをすべて捨てる。')
   return {effect:'sixPhoto',g34Tasks:[{op:'Nocturne732'}]};
  if(f.typeText==='呪文'&&text==='S・トリガー数字をひとつ選ぶ。自分の手札を相手に見せその中から選んだ数字と同じコストのカードをすべて捨てる。その後相手は自分自身の手札を見せその中から選んだ数字と同じコストのカードをすべて捨てる。')
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'Roulette732'}]};
  if(f.typeText==='呪文'&&text==='マナゾーンに置く時このカードはタップして置く。自分の山札の上からクリーチャーが出るまでカードを表向きにする。そのクリーチャーよりパワーの小さいクリーチャーをすべて破壊する。表向きにしたカードをすべて自分の墓地に置く。')
   return {effect:'sixPhoto',g34Tasks:[{op:'Barrage732'}]};
 }
 if(phase>=731&&f.typeText==='クリーチャー'){
  const text=normalize(f.abilityText);
  if(text==='このクリーチャーのパワーはバトルゾーンにある文明1つにつき+2000される。このクリーチャーはパワーが6000以上の時「W・ブレイカー」を得る。(このクリーチャーはシールドを2枚ブレイクする)')
   return {g207CountPower:{zone:'battle',both:true,civilizations:true,g561Battle:true,amount:2000},g207Breakers:[{power:6000,breaker:2}]};
  if(text==='このクリーチャーのパワーはバトルゾーンにある自分の他の水のクリーチャー1体につき+1000される。このクリーチャーが攻撃するとき自分の山札から好きな枚数のカードを引いてよい。ただしその枚数はバトルゾーンにある自分の他の水のクリーチャーの数までであること。'){
   const filter={creature:true,color:'水'};
   return {g207CountPower:{zone:'battle',other:true,filter,amount:1000},g34Attack:[{op:'CountDraw',zone:'battle',g329Other:true,filter,optional:'amount'}]};
  }
  if(text==='このクリーチャーのパワーはバトルゾーンにある自分の他のタップされていないクリーチャー1体につき+2000される。このクリーチャーが破壊される時墓地に置くかわりに自分の山札に戻す。その後山札をシャッフルする。')
   return {g207CountPower:{zone:'battle',other:true,filter:{creature:true,untapped:true},amount:2000},g731DestroyShuffle:true};
 }
 if(phase>=730&&f.typeText==='クリーチャー'){
  const text=normalize(f.abilityText);
  if(text==='攻撃を受けたときこのクリーチャーはこのターンが終わるまで「スレイヤー」を得る。(このクリーチャーとバトルした相手クリーチャーは勝っても持ち主の墓地に置かれる)')
   return {g447Attacked:[{op:'ShinkaGrant397',grant:{slayer:true}}]};
  const reduction='このクリーチャーのパワーはバトルゾーンにある';
  const suffix='のクリーチャー1体につき-1000される。(パワー0以下のクリーチャーは破壊される)';
  const count=colorsAny=>({g207CountPower:{zone:'battle',both:true,filter:{colorsAny},amount:-1000}});
  if(text==='ブロッカー'+reduction+'火または闇'+suffix+'このクリーチャーは相手プレイヤーを攻撃できない。')
   return {blocker:true,noPlayerAttack:true,...count(['火','闇'])};
  if(text===reduction+'水または闇'+suffix+'このクリーチャーはパワーが6000以上の時「W・ブレイカー」を得る。(「W・ブレイカー」を得たクリーチャーはシールドを2枚ブレイクする)')
   return {...count(['水','闇']),g207Breakers:[{power:6000,breaker:2}]};
 }
 if(phase>=729&&f.typeText==='進化クリーチャー'){
  const text=normalize(f.abilityText);
  if(text==='進化ー自分のゴースト1体の上に置く。このクリーチャーがバトルゾーンにある間バトルゾーンにある自分のゴーストはそれぞれ「スレイヤー」を得る。(そのクリーチャーとバトルした相手クリーチャーは勝っても持ち主の墓地に置かれる)')
   return {evolution:{race:'ゴースト'},g208Auras:[{filter:{creature:true,race:'ゴースト'},grants:{slayer:true}}]};
  if(text==='進化-自分のサイバー・ウイルス1体の上に置く。このクリーチャーがバトルゾーンにある間自分のターンのはじめにカードを1枚引くときもう1枚余分に引いてもよい。')
   return {evolution:{race:'サイバー・ウイルス'},g729ExtraStartDraw:true};
 }
 if(phase>=727&&f.typeText==='進化クリーチャー'){
  const text=normalize(f.abilityText);
  const attack='このクリーチャーが攻撃する時';
  const original='進化-自分のサムライ・クリーチャー1体の上に置く。侍流ジェネレート(このクリーチャーをバトルゾーンに出した時自分の手札にあるクロスギアを1枚コストを支払わずにジェネレートしてもよい)アクセル(このクリーチャーにクロスギアがクロスされている時このクリーチャーは次の能力を得る)'+attack+'バトルゾーンにある相手のクリーチャーを1体選び持ち主のマナゾーンに置いてもよい。W・ブレイカー';
  const reprint='進化:サムライ1体の上に置く。侍流ジェネレート(このクリーチャーが出た時クロスギアを1枚自分の手札からコストを支払わずにジェネレートしてもよい)アクセル(このクリーチャーにクロスギアがクロスされている時このクリーチャーに次のa能力を与える)a'+attack+'相手のクリーチャーを1体選び持ち主のマナゾーンに置いてもよい。W・ブレイカー';
  if([original,reprint].includes(text)){
   return {evolution:{race:'サムライ'},samuraiGenerate:true,breaker:2,g260Self:{filter:{g436Crossed:true},grants:{g34Attack:[{op:'Target',to:'mana',optional:true}]}}};
  }
 }
 if(phase>=728&&f.typeText==='クリーチャー'){
  const text=normalize(f.abilityText);
  if(text==='アクセル(このクリーチャーにクロスギアがクロスされている時このクリーチャーは次のa能力を得る)aこのクリーチャーが破壊された時このクリーチャーにクロスされていたクロスギアの数と同じ枚数カードを引いてもよい。')
   return {g260Self:{filter:{g436Crossed:true},grants:{g172Death:[{op:'CrossedDeathDraw728'}]}}};
 }
 if(phase>=726&&f.typeText==='クリーチャー'){
  const text=normalize(f.abilityText);
  const blocker='ブロッカー(相手クリーチャーが攻撃する時このクリーチャーをタップしてその攻撃を阻止してもよい。その後その相手クリーチャーとバトルする)';
  if(text===blocker+'このクリーチャーは攻撃することができない。相手のクリーチャーが自分を攻撃してブロックされなかった時このクリーチャーを破壊する。'){
   return {blocker:true,noAttack:true,g726DefenderUnblocked:[{op:'SelfDestroy'}]};
  }
  const death=blocker+'このクリーチャーは相手プレイヤーを攻撃できない。このクリーチャーが破壊された時そのターン';
  if([death+'中クリーチャーは攻撃することができない。',death+'クリーチャーは攻撃することができない。'].includes(text)){
   return {blocker:true,noPlayerAttack:true,g172Death:[{op:'LockAttacks726'}]};
  }
 }
 if(phase>=725){
  const text=normalize(f.abilityText);
  const trigger='S・トリガー(この呪文をシールドゾーンから手札に加える時コストを支払わずにすぐ唱えてもよい)';
  if(f.typeText==='呪文'&&text===trigger+'種族をひとつ選ぶ。このターンの終わりまでバトルゾーンにある選んだ種族の自分のクリーチャーすべてのパワーは+4000されパワーが5000以下のクリーチャーにブロックされない。'){
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'ChooseRace724',g725Tribal:true}]};
  }
  const blocker='ブロッカー(相手クリーチャーが攻撃する時このクリーチャーをタップしてその攻撃を阻止してもよい。その後その相手クリーチャーとバトルする)';
  const noPlayer='このクリーチャーは相手プレイヤーを攻撃できない。';
  if(f.typeText==='クリーチャー'&&text===blocker+noPlayer+'デーモン・コマンドまたは種族にドラゴンとあるクリーチャーとバトルする時このクリーチャーのパワーは+4000される。'){
   return {blocker:true,noPlayerAttack:true,g209BattlePower:{amount:4000,opponentRaces:['デーモン・コマンド','ドラゴン']}};
  }
  if(f.typeText==='クリーチャー'&&text===blocker+'相手の闇または火のクリーチャーが破壊された時このクリーチャーをアンタップしてもよい。'+noPlayer){
   return {blocker:true,noPlayerAttack:true,g303DeathWatch:{opponent:true,colorsAny:['闇','火'],g725RemainInBattle:true,defs:[{op:'Offer',title:'このクリーチャーをアンタップする？',defs:[{op:'Untap'}]}]}};
  }
 }
 if(phase>=724){
  const text=normalize(f.abilityText);
  if(f.typeText==='クリーチャー'&&text==='このクリーチャーをバトルゾーンに出した時バトルゾーンにある自分のクリーチャーの数と同じ枚数のカードを自分の山札の上から表向きにする。その中から呪文をすべて手札に加えそれ以外のカードをすべて好きな順番で山札の上に戻す。'){
   return {effect:'sixPhoto',g34Tasks:[{op:'Lengston724'}]};
  }
  const prefix='S・トリガー(この呪文をシールドゾーンから手札に加える時コストを支払わずにすぐ唱えてもよい)種族をひとつ選ぶ。バトルゾーンにある選んだ種族の自分のクリーチャー1体につき';
  if(f.typeText==='呪文'&&text.startsWith(prefix)){
   const targets={op:'Select',origin:'battle',owner:'opponent',optional:true,g173Targets:true,g193Select:true};
   const effect=text.slice(prefix.length);
   if(effect==='相手の「ブロッカー」を持つクリーチャーを1体破壊してもよい。'){
    return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'ChooseRace724',def:{...targets,to:'grave',filter:{creature:true,blocker:true},title:'破壊する相手のブロッカーを選ぶ'}}]};
   }
   if(effect==='バトルゾーンにある相手のクリーチャーを1体選びタップしてもよい。'){
    return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'ChooseRace724',def:{...targets,g193Tap:true,filter:{creature:true},title:'タップする相手のクリーチャーを選ぶ'}}]};
   }
  }
 }
 if(phase>=723&&f.typeText==='クリーチャー'){
  const text=normalize(f.abilityText);
  if(text==='このクリーチャーが相手プレイヤーを攻撃してブロックされなかった時グランド・デビルまたはディープ・マリーンを1体自分の墓地からバトルゾーンに出してもよい。ただし進化クリーチャーは選べない。W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)'){
   const filter={creature:true,nonEvolution:true,raceAny:['グランド・デビル','ディープ・マリーン']};
   return {breaker:2,g482Unblocked:[{op:'Select',origin:'grave',n:1,deploy:true,optional:true,filter}]};
  }
  if(text==='このクリーチャーをバトルゾーンに出した時そのターンの終わりまでバトルゾーンにある自分のアーク・セラフィムと自分の他のビーストフォークすべてのパワーは+3000され「W・ブレイカー」を得る。(「W・ブレイカー」を得たクリーチャーはシールドを2枚ブレイクする)'){
   const group={owner:'self',other:true,otherUnlessRace:'アーク・セラフィム',filter:{creature:true,raceAny:['アーク・セラフィム','ビーストフォーク']}};
   return {effect:'sixPhoto',g34Tasks:[{op:'GroupPower',...group,power:3000},{op:'GroupGrant364',...group,grant:{g313Breaker:2}}]};
  }
  if(text==='W・ブレイカーパワーアタッカー+4000(攻撃中このクリーチャーのパワーは+4000される)自分のターンのはじめに自分のマナゾーンにあるカードをアンタップできない。'){
   return {breaker:2,attackBonus:4000,g723NoStartManaUntap:true};
  }
  if(text==='G・ゼロ-バトルゾーンに《ブラザー・リザード》が1体でもあればこのクリーチャーをコストを支払わずに召喚してもよい。'){
   return {g396Zero:{all:[{g334Both:true,creature:true,g201ExactName:'ブラザー・リザード'}]}};
  }
 }
 if(phase>=722&&f.typeText==='クリーチャー'){
  const text=normalize(f.abilityText);
  const solo='このクリーチャーが攻撃する時自分の他のクリーチャーはこのターン中攻撃することができない。';
  if(text==='マナゾーンに置く時このカードはタップして置く。このクリーチャーのパワーは相手のマナゾーンにある水のカード1枚につき+1000される。このクリーチャーはパワーが6000以上の時「W・ブレイカー」を得る。'){
   return {g207CountPower:{zone:'mana',opponent:true,manaColor:'水',amount:1000},g135PowerBreaker:true};
  }
  if(text===solo+'W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)'){
   return {g34Attack:[{op:'OnlyAttacker677',own:true}],breaker:2};
  }
  if(text===solo+'スレイヤー(このクリーチャーがバトルする時バトルの後相手クリーチャーを破壊する)'){
   return {g34Attack:[{op:'OnlyAttacker677',own:true}],slayer:true};
  }
  if(text==='クロスギアをバトルゾーンに出した時カードを1枚自分のマナゾーンから自分の手札に戻してもよい。'){
   return {g251EntryDraw:{filter:{g201Gear:true},defs:[{op:'Select',origin:'mana',to:'hand',n:1,optional:true}]}};
  }
  if(text==='G・ゼロ-バトルゾーンにクロスギアをクロスしているクリーチャーが1体でもあればこのクリーチャーをコストを支払わずに召喚してもよい。クロスギアをクロスしているクリーチャーすべてのパワーは+1000される。'){
   return {g396Zero:{all:[{g722CrossedAny:true}]},g205Aura:{both:true,filter:{g436Crossed:true},power:1000}};
  }
 }
 if(phase>=721&&f.typeText==='クリーチャー'){
  const text=normalize(f.abilityText);
  if(text==='このクリーチャーにクロスギアをクロスする時自分の山札の上から1枚目をタップして自分のマナゾーンに置く。'){
   return {g721CrossRamp:true};
  }
  if(text==='自分の他のリキッド・ピープルまたはグランド・デビルが進化した時カードを1枚引いてもよい。'){
   return {g721EvolutionWatch:['リキッド・ピープル','グランド・デビル']};
  }
  if([
   'このクリーチャーが攻撃する時自分の他のクリーチャーはこのターン中攻撃することができない。',
   'このクリーチャーが攻撃する時そのターン自分の他のクリーチャーは攻撃することができない。'
  ].includes(text)){
   return {g34Attack:[{op:'OnlyAttacker677',own:true}]};
  }
 }
 if(phase>=720&&f.typeText==='クリーチャー'){
  const text=normalize(f.abilityText);
  if(text==='相手は火または自然のクリーチャーをバトルゾーンに出す時そのクリーチャーをタップして置く。'){
   return {g720TapEntry:{colors:['火','自然']}};
  }
  if([
   'このクリーチャーはタップしてバトルゾーンに置かれる。闇のクリーチャーはタップしてバトルゾーンに置かれる。',
   'このクリーチャーはタップして出る。闇のクリーチャーはタップして出る。'
  ].includes(text)){
   return {g295EnterTapped:true,g720TapEntry:{colors:['闇'],both:true}};
  }
  if(text==='自分のグランド・デビルが破壊される時墓地に置くかわりに自分の手札に戻してもよい。'){
   return {g720OptionalDestroyToHand:{creature:true,race:'グランド・デビル'}};
  }
  if(text==='自分のクリーチャーはクリーチャーを攻撃することができない。相手のクリーチャーはバトルゾーンに出す時タップして置く。'){
   return {opponentTapEntry:true,g720CreatureAttackLock:true};
  }
 }
 if(phase>=719&&f.typeText==='クリーチャー'){
  const text=normalize(f.abilityText);
  if(text==='このクリーチャーをバトルゾーンに出した時バトルゾーンにある相手のクロスギアを1枚選び持ち主の墓地に置いてもよい。'){
   return {effect:'sixPhoto',g34Tasks:[{op:'Target',element:true,filter:{g201Gear:true},to:'grave',optional:true,title:'墓地に置く相手のクロスギアを選ぶ'}]};
  }
  if(text==='自分の他のアーク・セラフィムをバトルゾーンに出した時バトルゾーンにある相手のクリーチャーを1体選びタップしてもよい。'){
   return {g314OtherEntry:{who:'self',filter:{race:'アーク・セラフィム'},defs:[{op:'Target',tap:true,optional:true,title:'タップする相手のクリーチャーを選ぶ'}]}};
  }
  if(text==='このクリーチャーが破壊される時バトルゾーンに自分のディープ・マリーンが1体でもあればこのクリーチャーを墓地に置くかわりに自分の手札に戻す。'){
   return {g260Self:{filter:{creature:true,race:'ディープ・マリーン'},grants:{destroyToHand:true}}};
  }
  if(text==='このクリーチャーをバトルゾーンに出した時クリーチャーにクロスしてあるクロスギアをすべてクリーチャーから外す。'){
   return {effect:'sixPhoto',g34Tasks:[{op:'Uncross719'}]};
  }
 }
 if(phase>=718&&f.typeText==='クリーチャー'){
  const text=normalize(f.abilityText);
  if(text==='W(ダブル)・ブレイカー(シールドを攻撃したときこのクリーチャーはシールドを2枚ブレイクする)このクリーチャーがバトルゾーンにある間相手は「S(シールド)・トリガー」を使えない。'){
   return {breaker:2,g718TriggerLock:true};
  }
  if(text==='他の闇のクリーチャーを召喚する時支払うコストは1多くなる。')return {g718DarkSummonTax:1};
  if(text==='このクリーチャーをバトルゾーンに出した時相手はコスト3以下のクリーチャーを1体自分自身の手札からバトルゾーンに出してもよい。'){
   return {effect:'sixPhoto',g34Tasks:[{op:'OpponentHandArmy716',n:1,max:3}]};
  }
  if(text==='自分のシールドが1枚ブレイクされる時かわりにこのクリーチャーを破壊してもよい。')return {g401ShieldSaver:true};
 }
 if(phase>=717&&f.typeText==='クリーチャー'){
  const text=normalize(f.abilityText);
  const shieldSaver='このクリーチャーがバトルゾーンにある間自分のシールドが1枚ブレイクされるときかわりにこのクリーチャーを自分の墓地に置いてもよい。';
  if(text===shieldSaver)return {g401ShieldSaver:true};
  if(text==='W(ダブル)・ブレイカー'+shieldSaver)return {breaker:2,g401ShieldSaver:true};
  if(text==='バトルゾーンにある自分の「サイレントスキル」を持つクリーチャーは「スピードアタッカー」を得る。(「スピードアタッカー」を持つクリーチャーは召喚酔いしない)'){
   return {g208Auras:[{filter:{g717Silent:true},grants:{speedAttacker:true}}]};
  }
 }
 if(phase>=716&&f.typeText==='クリーチャー'){
  const text=normalize(f.abilityText);
  if(text==='ドラゴン・ブロッカー(相手のドラゴンが攻撃するときこのクリーチャーをタップしてその攻撃を阻止してよい。その後そのドラゴンとバトルする)ドラゴンとバトルするときこのクリーチャーのパワーは+6000される。W(ダブル)・ブレイカー'){
   return {breaker:2,blocker:true,g716DragonBlock:true,g209BattlePower:{amount:6000,opponentDragon:true}};
  }
  if(text==='このクリーチャーがバトルゾーンに出たとき相手は自分自身の手札からクリーチャーを2体まで選びバトルゾーンに出してもよい。T・ブレイカー(シールドを攻撃したときこのクリーチャーはシールドを3枚ブレイクする)'){
   return {breaker:3,effect:'sixPhoto',g34Tasks:[{op:'OpponentHandArmy716',n:2}]};
  }
  if([
   'このクリーチャーがバトルゾーンに出たときバトルゾーンにある自分の他のクリーチャーすべてを自分の墓地に置く。T(トリプル)・ブレイカー(シールドを攻撃したときこのクリーチャーはシールドを3枚ブレイクする)',
   'このクリーチャーをバトルゾーンに出した時自分の他のクリーチャーをすべて破壊する。T・ブレイカー'
  ].includes(text)){
   return {breaker:3,effect:'sixPhoto',g34Tasks:[{op:'Sweep',owner:'self',g179Other:true,to:'grave',filter:{creature:true}}]};
  }
 }
 if(phase>=715&&f.typeText==='クリーチャー'){
  const text=normalize(f.abilityText);
  if(text==='このクリーチャーが攻撃するとき自分のシールドが1枚でもあればその中から裏向きのまま1枚選び自分の墓地に置く。ただしその「S・トリガー」は使えない。'){
   return {g34Attack:[{op:'ShieldGrave',g239ShieldGrave:true}]};
  }
  if(text==='ブロッカーこのクリーチャーは相手プレイヤーを攻撃できない。このクリーチャーがブロックする時バトルゾーンにある自分のクリーチャーを1体選んでもよい。このクリーチャーのバトルの後選んだクリーチャーをアンタップする。'){
   return {blocker:true,noPlayerAttack:true,g178Block:[{op:'BlockUntapPick715'}]};
  }
  if(text==='W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)闇以外のクリーチャーを召喚する時支払うコストは2多くなる。'){
   return {breaker:2,g715NonDarkSummonTax:2};
  }
 }
 if(phase>=714&&f.typeText==='クリーチャー'){
  const text=normalize(f.abilityText);
  const untappedAttack='このクリーチャーはタップされていないクリーチャーを攻撃できる。';
  const strongDefender='このクリーチャーがパワー6000以上のクリーチャーを攻撃する時';
  if(['そのターンの終わりまで','そのターン'].some(duration=>text===untappedAttack+strongDefender+duration+'このクリーチャーのパワーは+9000される。')){
   return {attackUntapped:true,g714AttackMinPower:6000,g691AttackCreature:[{op:'SelfBoost313',power:9000,g536Source:true}]};
  }
  if(text==='このクリーチャーが攻撃する時バトルゾーンにある相手のタップされているクリーチャーを1体選ぶ。相手は次の自分自身のターンのはじめにそのクリーチャーをアンタップできない。'){
   return {g34Attack:[{op:'Target',filter:{tapped:true},lock:true,title:'次の相手ターンのはじめにアンタップさせないクリーチャーを選ぶ'}]};
  }
  if(text==='このクリーチャーをバトルゾーンに出した時相手の手札を見る。その中から1枚選び持ち主のマナゾーンに置いてもよい。そうした場合相手のマナゾーンからカードを1枚選び持ち主の手札に戻す。'){
   const after=[{op:'Select',origin:'mana',owner:'opponent',to:'hand',n:1,title:'手札に戻す相手のマナを1枚選ぶ'}];
   return {effect:'sixPhoto',g34Tasks:[{op:'InspectHand',g223Inspect:true,chooseOne:true,g714ToMana:true,after}]};
  }
 }
 if(phase>=706&&f.typeText==='クリーチャー'){
  const text=normalize(f.abilityText);
  if(f.civilizations.length>1&&text==='マナゾーンに置く時このカードはタップして置く。自分のシールドが相手のシールドより多ければこのクリーチャーは攻撃することができない。'){
   return {g225AttackRequires:{kind:'shieldsAtMostOpponent'}};
  }
  if(text==='W(ダブル)・ブレイカー自分のシールドが1枚もなければこのクリーチャーは「ブロッカー」を得る。自分のターンが終わるとき自分のシールドが1枚もなければバトルゾーンにあるこのクリーチャーをアンタップしてもよい。'){
   const noShields={g265ShieldsMax:0};
   return {breaker:2,g260Self:{filter:noShields,grants:{blocker:true}},g174End:[
    {op:'IfOwn',filter:noShields,defs:[{op:'Offer',title:'このクリーチャーをアンタップする？',defs:[{op:'Untap',g191First:true}]}]}
   ]};
  }
  if(text==='このクリーチャーが攻撃するとき相手の手札からカードを1枚見ないで選び相手はそれを持ち主の墓地に置く。'){
   return {g34Attack:[{op:'Discard',n:1,random:true}]};
  }
  const unblocked=text.match(/^このクリーチャーが相手プレイヤーを攻撃してブロックされなかった(?:時|とき)(.+)$/);
  if(unblocked&&[
   '相手はバトルゾーンにある自分自身のクリーチャーを1体選び持ち主の墓地に置く。',
   '相手は自分自身のクリーチャーを1体選び破壊する。'
  ].includes(unblocked[1]))return {g482Unblocked:[{op:'OpponentSelect',n:1,to:'grave'}]};
 }
 if(phase>=663){
  const text=normalize(f.abilityText);
  if(creature&&text==='パワーアタッカー+3000(攻撃中このクリーチャーのパワーは+3000される)「シールド・ゴー」を持つカードが自分のシールドゾーンに表向きであればこのクリーチャーはタップされていないクリーチャーを攻撃できる。'){
   return {attackBonus:3000,g663ShieldGoAttackUntapped:true};
  }
  if(f.typeText==='呪文'&&text==='相手の手札を1枚見ないで選び捨てさせる。その後自分のシールドゾーンに表向きである「シールド・ゴー」を持つカード1枚につき相手の手札を1枚見ないで選び捨てさせる。'){
   return {effect:'sixPhoto',g34Tasks:[{op:'Discard',n:1,random:true},{op:'Discard',g584Count:'faceUpShieldGo',random:true}]};
  }
 }
 if(phase>=702){
  const text=normalize(f.abilityText);
  if(f.typeText==='クリーチャー'){
   const originalKirstein='ウェーブストライカー(バトルゾーンに「ウェーブストライカー」を持つクリーチャーが他に2体以上あればこのクリーチャーは次の能力を得る)バトルゾーンにある自分のクリーチャーすべてのパワーは+5000され「ブロッカー」と「W・ブレイカー」を得る。';
   if(text===originalKirstein||text===waveKirstein702||text===waveLameer702){
    const filter={creature:true},condition={g400Wave:3},lameer=text===waveLameer702;
    return {g400Wave:true,g260Self:{filter:condition,grants:{g205Aura:{filter,power:lameer?1000:5000}}},
     ...(lameer?{}:{g208Auras:[{filter,g557Condition:condition,grants:{blocker:true,breaker:2,g633DoubleBreaker:true}}]})};
   }
  }
  if(f.civilizations.length>1&&f.typeText.normalize('NFKC')==='進化クリーチャー(進化V)'&&text.replace('進化Vー','進化V-')==='マナゾーンに置く時このカードはタップして置く。進化V-自分のホーン・ビースト1体とエンジェル・コマンド1体を重ねた上に置く。このクリーチャーが攻撃した時またはバトルゾーンを離れた時自分の山札の上から1枚目を表向きにする。それが進化クリーチャー以外のクリーチャーであればバトルゾーンに出す。それ以外のカードであれば自分の手札に加える。T・ブレイカー(このクリーチャーはシールドを3枚ブレイクする)'){
   const reveal={op:'RevealTop514',filter:{creature:true,nonEvolution:true},to:'battle',elseTo:'hand'};
   return {evolution:{g31:true},g31Evolution:{zone:'battle',conditions:[{race:'ホーン・ビースト'},{race:'エンジェル・コマンド'}]},breaker:3,g34Attack:[reveal],g172Leave:[reveal]};
  }
 }
 if(phase>=701&&f.civilizations.length>1){
  const text=normalize(f.abilityText).replaceAll('進化ー','進化-').replaceAll('進化Vー','進化V-');
  const mana='マナゾーンに置く時このカードはタップして置く。';
  if(evolution&&text===mana+'進化-自分のゼノパーツまたはジャイアント・インセクト1体の上に置く。バトルゾーンにある自分の他のゼノパーツとジャイアント・インセクトすべてのパワーは+2000される。自分のゼノパーツまたはジャイアント・インセクトが相手を攻撃してブロックされなかった時相手は自分自身のマナゾーンからカードを1枚選び持ち主の墓地に置く。'){
   const races=['ゼノパーツ','ジャイアント・インセクト'];
   return {evolution:{any:races.map(race=>({race}))},g205Aura:{filter:{creature:true,raceAny:races},power:2000,other:true},g701UnblockedMana:races};
  }
  if(evolution&&text===mana+'進化-自分のワイルド・ベジーズまたはレインボー・ファントム1体の上に置く。バトルゾーンにある自分の他のワイルド・ベジーズとレインボー・ファントムすべてのパワーは+2000される。自分のターンの終わりにバトルゾーンにある自分のワイルド・ベジーズとレインボー・ファントムを好きな数アンタップしてもよい。'){
   const races=['ワイルド・ベジーズ','レインボー・ファントム'],filter={creature:true,raceAny:races};
   return {evolution:{any:races.map(race=>({race}))},g205Aura:{filter,power:2000,other:true},g174End:[{op:'Select',origin:'battle',n:'all',optional:true,filter,g173Targets:true,g193Select:true,g510Untap:true,title:'アンタップする自分のクリーチャーを好きな数選ぶ'}]};
  }
  if(f.typeText.normalize('NFKC')==='進化クリーチャー(進化V)'&&text===mana+'進化V-自分のマーフォーク1体とキマイラ1体を重ねた上に置く。このクリーチャーはブロックされない。W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)このクリーチャーがバトルゾーンを離れた時クリーチャーをすべて破壊する。'){
   return {evolution:{g31:true},g31Evolution:{zone:'battle',conditions:[{race:'マーフォーク'},{race:'キマイラ'}]},unblockable:true,breaker:2,g172Leave:[{op:'Sweep',both:true,to:'grave',filter:{creature:true}}]};
  }
 }
 if(phase>=700&&f.civilizations.length>1){
  const text=normalize(f.abilityText).replaceAll('進化ー','進化-').replaceAll('進化Vー','進化V-');
  const mana='マナゾーンに置く時このカードはタップして置く。';
  if(evolution&&text===mana+'進化-自分のグラディエーターまたはアースイーター1体の上に置く。バトルゾーンにある自分の他のグラディエーターとアースイーターすべてのパワーは+2000される。自分のグラディエーターまたはアースイーターがブロックした時カードを1枚引いてもよい。'){
   const races=['グラディエーター','アースイーター'];
   return {evolution:{any:races.map(race=>({race}))},g205Aura:{filter:{creature:true,raceAny:races},power:2000,other:true},g700BlockDraw:races};
  }
  if(evolution&&text===mana+'進化-自分のサイバーロードまたはヘドリアン1体の上に置く。バトルゾーンにある自分の他のサイバーロードとヘドリアンすべてのパワーは+2000される。自分のサイバーロードとヘドリアンはブロックされない。'){
   const races=['サイバーロード','ヘドリアン'],filter={creature:true,raceAny:races};
   return {evolution:{any:races.map(race=>({race}))},g205Aura:{filter,power:2000,other:true},g208Auras:[{filter,grants:{unblockable:true}}]};
  }
  if(f.typeText.normalize('NFKC')==='進化クリーチャー(進化V)'&&text.replace('裏向きのまま新しいシールドとして自分のシールドゾーンに加える','裏向きのまま自分のシールドに加える')===mana+'進化V-自分のライトブリンガー1体とサイバーロード1体を重ねた上に置く。このクリーチャーが攻撃した時またはバトルゾーンを離れた時自分の山札の上から1枚目を裏向きのまま自分のシールドに加える。W・ブレイカー'){
   return {evolution:{g31:true},g31Evolution:{zone:'battle',conditions:[{race:'ライトブリンガー'},{race:'サイバーロード'}]},breaker:2,g34Attack:[{op:'ShieldTop',n:1}],g172Leave:[{op:'ShieldTop',n:1}]};
  }
 }
 if(f.typeText.normalize('NFKC')==='進化クリーチャー(進化V)')throw Error('未対応の進化V能力');
 if(phase>=699){
  const text=normalize(f.abilityText);
  if(creature&&text==='ブロッカー(相手クリーチャーが攻撃する時このクリーチャーをタップしてその攻撃を阻止してもよい。その後その相手クリーチャーとバトルする)このクリーチャーがブロックした時バトルの後でこのクリーチャーを破壊する。W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)'){
   return {blocker:true,breaker:2,g699DestroyAfterBlock:true};
  }
  if(evolution&&text==='ブロッカー進化-自分のサイバーロード1体の上に置く。このクリーチャーがバトルゾーンにある間相手が「S(シールド)・トリガー」を使ったときカードを2枚まで引く。'){
   return {blocker:true,evolution:{race:'サイバーロード'},g699OpponentShieldTrigger:[{op:'DrawUpTo',n:2}]};
  }
  const turtleSearch='自分の山札を見る。その中からクリーチャーを1体選び相手に見せてから自分の手札に加えてもよい。その後山札をシャッフルする。';
  if(creature&&text==='相手が自分自身のシールドの「S・トリガー」を使った時'+turtleSearch)return {g699OpponentShieldTrigger:[search201(turtleSearch)]};
 }
 if(phase>=698&&creature){
  const text=normalize(f.abilityText);
  if(text==='このクリーチャーのパワーはすべての墓地にある《伝承するクローン・ホーン》1枚につき+3000される。このクリーチャーはパワーが6000以上の時「W・ブレイカー」を得る。(このクリーチャーはシールドを2枚ブレイクする)'){
   return {g207CountPower:{zone:'grave',both:true,graveName:'伝承するクローン・ホーン',amount:3000},g135PowerBreaker:true};
  }
  if(f.civilizations.length>1&&text==='マナゾーンに置く時このカードはタップして置く。このクリーチャーが攻撃する時自分のマナゾーンにあるタップされていない闇火自然のカードを1枚ずつタップしてもよい。そうした場合各プレイヤーは自分自身のシールドを1枚選び持ち主のマナゾーンに置く。'){
   return {g34Attack:[{op:'TapManaColors698',colors:['闇','火','自然']}]};
  }
  if(text==='相手プレイヤーはカードを2枚以上引いたターンの終わりに自分自身の手札をすべて捨てる。'){
   return {g698EndDrawDiscard:2};
  }
 }
 if(phase>=697){
  const text=normalize(f.abilityText);
  if(creature&&text==='このクリーチャーをバトルゾーンに出した時シールドを多く持っている方のプレイヤーは自分自身のシールドを1枚選び墓地に置く。両プレイヤーのシールドが同じ枚数であればそれぞれが自分自身のシールドを1枚ずつ選び持ち主の墓地に置く。'){
   return {effect:'sixPhoto',g34Tasks:[{op:'OwnShieldGraves697',moreOnly:true}]};
  }
  if(evolution&&text==='進化-自分のガーゴイル1体の上に置く。このクリーチャーをバトルゾーンに出した時各プレイヤーは自分自身のシールドを1枚ずつ選び持ち主の墓地に置く。'){
   return {evolution:{race:'ガーゴイル'},effect:'sixPhoto',g34Tasks:[{op:'OwnShieldGraves697'}]};
  }
  if(creature&&f.civilizations.length>1&&text==='マナゾーンに置く時このカードはタップして置く。W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)このクリーチャーが破壊された時自分の山札の上から1枚目を裏向きのままシールドに加える。その後相手のシールドを1枚選び持ち主の墓地に置く。'){
   return {breaker:2,g172Death:[{op:'ShieldTop'},{op:'ShieldGrave588',n:1,required:true}]};
  }
  if(f.typeText==='呪文'&&text==='バトルゾーンにある相手のパワー3000以下のクリーチャーを1体選ぶ。その後すべての墓地にある《クローン・クラッシュ》1枚につきバトルゾーンにある相手の他のパワー3000以下のクリーチャーを1体選んでもよい。選んだクリーチャーをすべて破壊する。'){
   return {effect:'sixPhoto',g34Tasks:[{op:'CloneCrush697',filter:{creature:true,maxPower:3000,g199Power:true}}]};
  }
 }
 if(phase>=696){
  const text=normalize(f.abilityText);
  const blocker='ブロッカー',manaTap='マナゾーンに置く時このカードはタップして置く。';
  const balhorus='相手のクリーチャーはすべて可能であれば毎ターン攻撃する。このクリーチャーは相手プレイヤーを攻撃できない。';
  if(creature&&f.name==='悪魔聖霊バルホルス'&&[
   blocker+manaTap+balhorus+'このクリーチャーがブロックした時バトルの後でこのクリーチャーをアンタップする。',
   manaTap+blocker+balhorus+'このクリーチャーがブロックした時バトルの後このクリーチャーをアンタップする。'
  ].includes(text)){
   return {blocker:true,noPlayerAttack:true,g224ForceAttack:{owner:'opponent'},g695UntapAfterBlock:true};
  }
  if(f.typeText==='呪文'&&text==='6000以下の数字をひとつ選ぶ。その数字と同じパワーを持つクリーチャーをすべて破壊する。'){
   return {effect:'sixPhoto',g34Tasks:[{op:'PowerSweep696',max:6000}]};
  }
  if(f.typeText==='呪文'&&text==='相手はバトルゾーンにある自分自身のパワー3000以下のクリーチャーすべてを持ち主の墓地に置く。自分のシールドが1枚でもあれば裏向きのまま1枚選び自分の墓地に置く。'){
   return {effect:'sixPhoto',g34Tasks:[{op:'Sweep',to:'grave',filter:{creature:true,maxPower:3000,g199Power:true}},{op:'ShieldGrave',g239ShieldGrave:true}]};
  }
 }
 if(phase>=695&&creature){
  const text=normalize(f.abilityText);
  if(text==='ブロッカー誰かが呪文を唱えた場合そのターンが終わるまでこのクリーチャーのパワーは+3000される。(呪文の効果を行ってからクリーチャーのパワーを増やす)'){
   return {blocker:true,g204SpellWatch:{who:'both',defs:[{op:'SelfBoost313',power:3000,g536Source:true,g694ClearOnSeal:true}]}};
  }
  if(text==='ブロッカー進化-自分のメカサンダー1体の上に置く。このクリーチャーは相手プレイヤーを攻撃できない。このクリーチャーがブロックしたときバトルの後でアンタップする。'){
   return {blocker:true,evolution:{race:'メカサンダー'},noPlayerAttack:true,g695UntapAfterBlock:true};
  }
  if(f.name==='風撃の求道者ラ・バイル'&&[
   'ブロッカー(相手クリーチャーが攻撃するときこのクリーチャーをタップしてその攻撃を阻止してよい。そのあとその相手クリーチャーとバトルする)このクリーチャーがブロックしたときバトルの後でアンタップする。',
   'ブロッカー(相手クリーチャーが攻撃する時このクリーチャーをタップしてその攻撃を阻止してもよい。その後その相手クリーチャーとバトルする)このクリーチャーがブロックした時バトルの後このクリーチャーをアンタップする。',
   'ブロッカー(相手クリーチャーが攻撃する時このクリーチャーをタップしてその攻撃を阻止してもよい。その後その相手クリーチャーとバトルする)このクリーチャーがブロックした時バトルの後でアンタップする。'
  ].includes(text)){
   return {blocker:true,g695UntapAfterBlock:true};
  }
 }
 if(phase>=694&&creature){
  const text=normalize(f.abilityText);
  if(text==='他のクリーチャーがバトルゾーンに置かれた場合そのターンが終わるまでこのクリーチャーのパワーは+3000される。'||
     text==='他のクリーチャーがバトルゾーンに出た時そのターンこのクリーチャーのパワーは+3000される。'&&f.name==='怒髪の豪腕'){
   return {g314OtherEntry:{who:'both',defs:[{op:'SelfBoost313',power:3000,g536Source:true,g694ClearOnSeal:true}]}};
  }
  if(text==='自分のクリーチャーが攻撃された時そのクリーチャーのパワーは+2000される。'){
   return {g694DefenderWatch:[{op:'DefenderBoost694',power:2000,persistent:true}]};
  }
  if(text==='自分のクリーチャーが攻撃された時自分の手札を1枚捨ててもよい。そうした場合そのターンの終わりまでそのクリーチャーのパワーは+3000される。'){
   return {g694DefenderWatch:[{op:'DiscardFor248',defs:[{op:'DefenderBoost694',power:3000}]}]};
  }
  if(text==='ブロッカーこのクリーチャーが攻撃をブロックしたときバトルは行われない。ただし両クリーチャーはタップしたままである。このクリーチャーは攻撃することができない。'){
   return {blocker:true,noAttack:true,g178Block:[{op:'SkipBlockedBattle694'}]};
  }
 }
 if(phase>=693&&creature){
  const text=normalize(f.abilityText);
  if(text==='このクリーチャーがクリーチャーを攻撃する時そのターンの終わりまでこのクリーチャーのパワーは+3000される。'){
   return {g691AttackCreature:[{op:'SelfBoost313',power:3000,g536Source:true}]};
  }
  if(text==='ブロッカーこのクリーチャーがバトルゾーンにある間自分の他のクリーチャーがバトルゾーンに出たときこのクリーチャーをバトルゾーンから自分の手札に戻す。'){
   return {blocker:true,g250EntryDraw:{filter:{creature:true},self:false,defs:[{op:'SelfHand299'}]}};
  }
  if(text==='ブロッカーこのクリーチャーは相手プレイヤーを攻撃できない。相手のクリーチャーが攻撃する時このクリーチャーは可能ならブロックする。'){
   return {blocker:true,noPlayerAttack:true,mustBlock:true};
  }
  if(text==='このクリーチャーがバトルゾーンにある間他のクリーチャーがバトルゾーンから墓地に置かれるたびにカードを1枚引いてもよい。'||
     text==='他のクリーチャーが破壊された時カードを1枚引いてもよい。'&&f.name==='屑男'){
   return {g693OtherCreatureGraveDraw:true};
  }
 }
 if(phase>=692&&creature){
  const text=normalize(f.abilityText);
  if(text==='このクリーチャーが攻撃するとき自分の山札から呪文を1枚さがして相手に見せ自分の手札に加えてよい。そのあと山札をシャッフルする。'){
   return {g34Attack:[search201('自分の山札を見る。その中から呪文を1枚選び相手に見せ自分の手札に加えてよい。その後山札をシャッフルする。')]};
  }
  if(text==='このクリーチャーは「ブロッカー」を持つクリーチャーだけを攻撃できる。このクリーチャーは相手プレイヤーを攻撃できない。'){
   return {g692AttackOnlyBlockers:true,noPlayerAttack:true};
  }
  if(text==='このクリーチャーが攻撃する時バトルゾーンにあるパワーがこのクリーチャーより小さい相手のクリーチャーを1体選び持ち主の手札に戻してもよい。'){
   return {g34Attack:[{op:'TargetBelowSource692',to:'hand',optional:true}]};
  }
  if(text==='このクリーチャーが攻撃する時パワーがこのクリーチャーより小さい相手のクリーチャーを1体破壊する。'){
   return {g34Attack:[{op:'TargetBelowSource692',to:'grave'}]};
  }
 }
 if(phase>=691&&creature){
  const text=normalize(f.abilityText);
  if(text==='このクリーチャーがクリーチャーを攻撃する時そのターンこのクリーチャーのパワーは+4000される。'){
   return {g691AttackCreature:[{op:'SelfBoost313',power:4000,g536Source:true}]};
  }
  if(text==='ブロッカーこのクリーチャーは攻撃することができない。自分の他のクリーチャーがバトルゾーンに出たときこのクリーチャーを自分の墓地に置く。'){
   return {blocker:true,noAttack:true,g250EntryDraw:{filter:{creature:true},self:false,defs:[{op:'SelfDestroy'}]}};
  }
  if(text==='自分のブレイブ・スピリットが1体でもバトルゾーンにある時自分のティラノ・ドレイクとブレイブ・スピリットは攻撃されない。'){
   return {g691AttackProtection:{requires:'ブレイブ・スピリット',races:['ティラノ・ドレイク','ブレイブ・スピリット']}};
  }
 }
 if(phase>=690&&creature){
  const text=normalize(f.abilityText);
  if(/^このクリーチャーが攻撃するとき相手のシールドを1枚見て(?:も)?よい。その後そのシールドを元の場所に戻す。$/.test(text)){
   return {g34Attack:[{op:'Peek585',who:'opponent',optional:true}]};
  }
  if(text==='このクリーチャーをバトルゾーンに出した時相手の山札の上から1枚目を見る。その後それを元に戻す。'){
   return {effect:'sixPhoto',g34Tasks:[{op:'Peek585',opponentDeckTop:true}]};
  }
 }
 if(phase>=689){
  const text=normalize(f.abilityText);
  if(creature&&text==='相手がバトルゾーンのクリーチャーを選ぶ時自分のドラゴンを選ぶことはできない。(ただし自分のドラゴンを攻撃またはブロックしてもよい)'){
   return {g608Protect:{race:'ドラゴン'}};
  }
  if(creature&&text==='このクリーチャーがバトルゾーンに出たとき自分の山札から呪文を1枚さがして相手に見せ自分の手札に加える。そのあと山札をシャッフルする。'){
   return {effect:'sixPhoto',g34Tasks:[{
    op:'Look',g201Search:true,g200Search:true,n:'all',rest:'shuffle',
    stages:[{n:1,to:'hand',filter:{spell:true},reveal:true}]
   }]};
  }
  if(f.typeText==='呪文'&&text==='相手のクリーチャーを1体破壊する。バトルゾーンに自分の名前に《死神》とあるクリーチャーがあれば相手は自身の手札を1枚選び捨てる。'){
   return {effect:'sixPhoto',g34Tasks:[
    {op:'Target',to:'grave'},
    {op:'IfOwn',filter:{creature:true,g228Face:{type:'creature',nameAny:['死神']}},defs:[{op:'Discard',n:1}]}
   ]};
  }
 }
 if(phase>=688&&creature){
  const text=normalize(f.abilityText);
  if(text==='バトルゾーンに自分の光のクリーチャーと火のクリーチャーが少なくとも1体ずつある時このクリーチャーのパワーは+5000される。'){
   return {g260Self:{filter:{g688DistinctCreaturePair:['光','火']},grants:{power:5000}}};
  }
  if(text==='相手のクリーチャーがこのクリーチャーを攻撃した時このクリーチャーを破壊する。'){
   return {g447Attacked:[{op:'SelfDestroy'}]};
  }
  if(text==='相手がバトルゾーンに自身のクリーチャーを出した時このクリーチャーを自分のマナゾーンに置く。'){
   return {g314OtherEntry:{who:'opponent',defs:[{op:'SelfMana297',g536Source:true}]}};
  }
 }
 if(phase>=687&&creature){
  const text=normalize(f.abilityText);
  if(text==='自分の光と自然を両方持つクリーチャーがバトルゾーンに出た時自分の山札の上から1枚目をマナゾーンに置いてもよい。'){
   return {g251EntryDraw:{
    filter:{creature:true,colorsAll:['光','自然']},
    defs:[{op:'Ramp',n:1,optional:true}]
   }};
  }
  if(text==='自分のクリーチャーの数が自分のシールドの数以上ならこのクリーチャーに「スピードアタッカー」を与える。(「スピードアタッカー」を持つクリーチャーは召喚酔いしない)'){
   return {g260Self:{filter:{g687CreatureCountAtLeastShields:true},grants:{speedAttacker:true}}};
  }
  if(text==='ブロッカーブロッカーT・ブレイカー相手のシールドが2つ以下なら誰も光以外の呪文を唱えられない。'){
   return {blocker:true,breaker:3,g687OnlyLightSpells:2};
  }
 }
 if(phase>=686){
  const text=normalize(f.abilityText);
  const trigger='S・トリガーS・トリガー(この呪文をシールドゾーンから手札に加える時コストを支払わずにすぐ唱えてもよい)';
  if(creature&&text==='このクリーチャーがバトルゾーンに出た時そのターン自分の他のクリーチャー1体のパワーを+1000しターンの終わりにアンタップする。'){
   return {effect:'sixPhoto',g34Tasks:[{op:'ChooseEndUntap501',other:true,power:1000,thisTurn:true,creatureSource:true}]};
  }
  if(f.typeText==='呪文'&&text===trigger+'このターンクリーチャーはプレイヤーを攻撃できない。このターンバトルゾーンにある自分のクリーチャーすべてのパワーは+2000される。'){
   return {trigger:true,effect:'sixPhoto',g34Tasks:[
    {op:'PlayerStop567',owner:'self',g567PlayerStop:'end',spell:true},
    {op:'PlayerStop567',owner:'opponent',g567PlayerStop:'end',spell:true},
    {op:'GroupPower',owner:'self',power:2000,spell:true}
   ]};
  }
  if(f.typeText==='呪文'&&text===trigger+'相手のコスト3以下のクリーチャーを1体破壊する。マナ武装4:自分のマナゾーンに多色カードが4枚以上あればさらに相手のコスト9以下のクリーチャーを1体破壊する。'){
   return {trigger:true,effect:'sixPhoto',g34Tasks:[
    {op:'Target',to:'grave',filter:{max:3}},
    {op:'IfMana',n:4,multi:true,defs:[{op:'Target',to:'grave',filter:{max:9}}]}
   ]};
  }
 }
 if(phase>=685&&creature){
  const text=normalize(f.abilityText);
  const match=text.match(/^Q・ブレイカー(?:\(このクリーチャーはシールドを4つブレイクする\))?(相手は呪文を唱えたりフィールドを展開できない。|相手は呪文またはフィールドを実行できない。)このクリーチャーがバトルに勝った時相手のシールドを3つまで選び持ち主のマナゾーンに置く。$/);
  if(match)return {breaker:4,g473OpponentSpellLock:true,g685OpponentFieldLock:true,g189BattleWin:[{op:'ShieldMove685',n:3,to:'mana'}]};
 }
 if(phase>=684&&creature&&/^このクリーチャーが攻撃する時多色カードを1枚自分の手札から捨ててもよい。そうした(?:場合|ら)このクリーチャーをアンタップする。$/.test(normalize(f.abilityText))){
  return {g34Attack:[{op:'DiscardFor248',g488DiscardFilter:{g223Multicolor:true},title:'多色カードを1枚捨てて、このクリーチャーをアンタップする？',defs:[{op:'Untap',g191First:true}]}]};
 }
 if(phase>=683&&f.typeText==='呪文'){
  const text=normalize(f.abilityText);
  const trigger='S・トリガーS・トリガー(この呪文をシールドゾーンから手札に加える時コストを支払わずにすぐ唱えてもよい)';
  // The artwork confirms the minus sign missing from the official HTML.
  if(d.id==='dmr18-061'&&d.name==='ポイズン・ティー'&&text===trigger+'相手のクリーチャーを1体選ぶ。このターンそのクリーチャーのパワーを?4000する。(パワー0以下のクリーチャーは破壊される)'){
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'Target',power:-4000,g242PowerMinus:true,spell:true}]};
  }
  if(text===trigger+'相手のクリーチャーを1体選び持ち主の手札に戻す。その後クリーチャーを1体自分の手札に戻す。'){
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'Target',to:'hand'},{op:'Target',owner:'self',to:'hand'}]};
  }
 }
 // The official artwork confirms the minus sign missing from this print's HTML.
 if(phase>=682&&d.id==='dmr20-059'&&d.name==='カミカミ・カーニバル'&&f.typeText==='呪文'&&
  normalize(f.abilityText)==='S・トリガーS・トリガー(この呪文をシールドゾーンから手札に加える時コストを支払わずにすぐ唱えてもよい)相手のクリーチャーを1体選ぶ。このターンそのクリーチャーのパワーを_5000する。(パワー0以下のクリーチャーは破壊される)'){
  return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'Target',power:-5000,g242PowerMinus:true,spell:true}]};
 }
 if(phase>=681){
  const text=normalize(f.abilityText);
  if(f.typeText==='呪文'&&text==='S・トリガー(この呪文をシールドゾーンから手札に加える時コストを支払わずにすぐ唱えてもよい)次の自分のターンのはじめまでバトルゾーンにある自分のクリーチャーはすべて「ブロッカー」を得る。'){
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'GroupGrant364',owner:'self',filter:{creature:true},grant:{blocker:true},g521UntilStart:true,spell:true}]};
  }
  if(creature&&[
   'バトルゾーンにある相手のクリーチャーがタップされた時バトルゾーンにある自分のクリーチャーを1体アンタップしてもよい。W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)',
   'W・ブレイカー(このクリーチャーはシールドを2つブレイクする)相手のクリーチャーがタップした時自分のクリーチャーを1体アンタップしてもよい。'
  ].includes(text)){
   return {breaker:2,g681OpponentTapAnyTurn:true,g678OpponentTap:[{op:'Target',owner:'self',untap:true,optional:true}]};
  }
  if(f.typeText==='呪文'&&text==='S・トリガー(この呪文をシールドゾーンから手札に加える時コストを支払わずにすぐ唱えてもよい)自分の山札の上から5枚を見る。その中からハンターを1体選んで相手に見せ自分の手札に加えてもよい。その後残りを好きな順序で山札の一番下に置く。'){
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'Look',g185Search:true,n:5,rest:'bottom',stages:[{n:1,to:'hand',filter:{creature:true,race:'ハンター'},reveal:true,optional:true}]}]};
  }
 }
 if(phase>=680){
  const text=normalize(f.abilityText);
  if(f.typeText==='呪文'&&text==='このターン自分のクリーチャーが攻撃する時カードを1枚引いてもよい。'){
   return {effect:'sixPhoto',g34Tasks:[{op:'TurnAttackDraw613',optional:true}]};
  }
  if(creature&&text==='このクリーチャーをバトルゾーンに出した時クリーチャーを好きな数自分の墓地から好きな順序で山札の一番上に置いてもよい。'){
   return {effect:'sixPhoto',g34Tasks:[{op:'Select',origin:'grave',to:'deckTop',n:'all',optional:true,g183Return:true,filter:{creature:true},title:'山札の上に戻すクリーチャーを上から順に選ぶ'}]};
  }
  if(f.typeText==='呪文'&&text==='自分の手札にあるコスト7以上のカードを好きな数相手に見せる。このようにして見せたカード1枚につき自分の山札の上から1枚目をタップしてマナゾーンに置く。'){
   return {effect:'sixPhoto',g34Tasks:[{op:'HandReveal462',filter:{anyFaceMinCost:7},rampEach:true}]};
  }
 }
 if(phase>=679){
  const text=normalize(f.abilityText);
  if(creature&&text==='クリーチャーが破壊された時そのターンこのクリーチャーのパワーは+2000される。このクリーチャーはパワーが6000以上の時「W・ブレイカー」を得る。'){
   return {g303DeathWatch:{both:true,self:true,defs:[{op:'SelfBoost313',power:2000,g536Source:true}]},g207Breakers:[{power:6000,breaker:2}]};
  }
  if(creature&&text==='他のクリーチャーが破壊された時そのターンこのクリーチャーのパワーは+4000され「W・ブレイカー」を得る。'){
   return {g303DeathWatch:{both:true,defs:[{op:'SelfBoost313',power:4000,breaker:2,g536Source:true}]}};
  }
  if(f.typeText==='呪文'&&text==='このターンバトルゾーンにある自分のクリーチャー1体のパワーは+2000される。このターンの終わりにそのクリーチャーをアンタップする。'){
   return {effect:'sixPhoto',g34Tasks:[{op:'ChooseEndUntap501',power:2000,thisTurn:true}]};
  }
 }
 if(phase>=678&&creature){
  const text=normalize(f.abilityText);
  if(text==='自分のターン中相手のクリーチャーがタップされた時カードを1枚引いてもよい。'){
   return {g678OpponentTap:[{op:'Draw',n:1,optional:true}]};
  }
  if(text==='相手のターン中相手がカードを引いた時それがそのターン1枚目のドローでなければ自分もカードを1枚引いてもよい。'){
   return {g678LaterOppDraw:[{op:'Draw',n:1,optional:true}]};
  }
  if(/^このクリーチャー(?:をバトルゾーンに出した|が出た)時自分の山札を見る。その中からハンターを1体(?:選び相手に見せてから|相手に見せ)手札に加えてもよい。その後山札をシャッフルする。$/.test(text)){
   return {effect:'sixPhoto',g34Tasks:[{op:'Look',g201Search:true,g200Search:true,n:'all',stages:[{n:1,to:'hand',optional:true,reveal:true,filter:{creature:true,race:'ハンター'}}],rest:'shuffle'}]};
  }
 }
 if(phase>=677){
  const text=normalize(f.abilityText);
  if(creature&&text==='自分の他のクリーチャーがどこからでも墓地に置かれた時そのターンこのクリーチャーは「パワーアタッカー+5000」と「W・ブレイカー」を得る。'){
   return {g677AllyGrave:[{op:'SelfBoost313',power:5000,breaker:2,g337PowerAttacker:true,g536Source:true}]};
  }
  if(creature&&text==='相手のクリーチャーが攻撃する時そのターン相手の他のクリーチャーは攻撃できない。'){
   return {g252AttackWatch:{who:'opponent',g399Attacker:true,g677Layers:true,defs:[{op:'OnlyAttacker677'}]}};
  }
  if(f.typeText==='呪文'&&/^自分の山札の上から2枚を見て好きな順序で戻(?:す|してもよい)。この呪文を唱えた後墓地に置くかわりに自分の手札に戻す。$/.test(text)){
   return {effect:'sixPhoto',g34Tasks:[
    {op:'Offer',title:'山札の上から2枚を見て好きな順序で戻す？',defs:[{op:'Look',n:2,stages:[],rest:'top',g259OrderTop:true}]},
    {op:'SpellFinish416',to:'hand'}
   ]};
  }
 }
 if(phase>=676){
  const text=normalize(f.abilityText);
  if(creature&&text==='相手がバトルゾーンにあるクリーチャーを選ぶ時自分の無色クリーチャーを選ぶことはできない。(ただしそのクリーチャーを攻撃またはブロックしてもよい)'){
   return {g608Protect:{noColor:true}};
  }
  if(f.typeText==='呪文'&&text==='S・トリガーS・トリガー(この呪文をシールドゾーンから手札に加える時コストを支払わずにすぐ唱えてもよい)バトルゾーンにある相手のクリーチャーを1体選ぶ。そのクリーチャーとバトルゾーンにある同じ名前を持つクリーチャーをすべてタップする。'){
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'Target',spell:true,g676TapNames:true,title:'同名のクリーチャーと一緒にタップする相手のクリーチャーを選ぶ'}]};
  }
  if(creature&&text==='マナゾーンに置く時このカードはタップして置く。相手がカードを引いた時自分の山札の上から1枚目をマナゾーンに置いてもよい。'){
   return {g676OppDraw:[{op:'Ramp',n:1,optional:true}]};
  }
 }
 if(phase>=675&&creature){
  const text=normalize(f.abilityText);
  if(text==='∞ブレイカー(このクリーチャーは相手のシールドを好きな数ブレイクする)')return {breaker:'∞'};
  if(text==='このクリーチャーがどこからでも自分の墓地に置かれた時相手のパワー1000以下のクリーチャーを1体破壊する。'){
   return {g675GraveEntry:[{op:'Target',to:'grave',filter:{maxPower:1000,g199Power:true},title:'破壊するパワー1000以下の相手クリーチャーを選ぶ'}]};
  }
  if(text==='マナゾーンに置く時このカードはタップして置く。このクリーチャーが攻撃する時相手の手札を1枚見ないで選び持ち主のマナゾーンに置く。W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)'){
   return {breaker:2,g34Attack:[{op:'BlindHandMana675'}]};
  }
 }
 if(phase>=674&&creature){
  const text=normalize(f.abilityText);
  if(text==='このクリーチャーをバトルゾーンに出した時自分の山札を見る。その中から《絆のファミリアコブル》を1枚バトルゾーンに出してもよい。その後山札をシャッフルする。W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)'){
   return {effect:'sixPhoto',breaker:2,g34Tasks:[{op:'LookDeploy530',g201Search:true,limit:1,rest:'shuffle',filter:{creature:true,g201ExactName:'絆のファミリア コブル'}}]};
  }
  if(text==='バトルゾーンに自分の《絆のイザナイデカブル》があればこのクリーチャーのパワーは+3000され「W・ブレイカー」を得る。'){
   return {g260Self:{filter:{creature:true,g201ExactName:'絆のイザナイ デカブル'},grants:{power:3000,breaker:2}}};
  }
  if(text==='このクリーチャーをバトルゾーンに出した時相手は自身の手札を見せる。その中にある呪文1枚につきカードを1枚引いてもよい。このクリーチャーはブロックされない。'){
   return {effect:'sixPhoto',unblockable:true,g34Tasks:[{op:'InspectHand',g223Inspect:true,reveal:true,after:[{op:'CountDraw',owner:'opponent',zone:'hand',filter:{spell:true},optional:'each'}]}]};
  }
 }
 if(phase>=673&&creature){
  const text=normalize(f.abilityText);
  if(text==='ブロッカーブロッカー(相手クリーチャーが攻撃する時このクリーチャーをタップしてその攻撃を阻止してもよい。その後その相手クリーチャーとバトルする)相手のクリーチャーはタップしてバトルゾーンに置かれる。W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)'){
   return {blocker:true,opponentTapEntry:true,breaker:2};
  }
  if(text==='このクリーチャーをバトルゾーンに出した時バトルゾーンにある相手のクリーチャーを2体まで選ぶ。相手はそのクリーチャーを自身の山札に加えてシャッフルする。このクリーチャーはブロックされない。W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)'){
   return {effect:'sixPhoto',unblockable:true,breaker:2,g34Tasks:[{op:'Select',origin:'battle',owner:'opponent',n:2,optional:true,filter:{creature:true},g173Targets:true,g193Select:true,to:'deck',g673ShuffleOnMove:true,title:'山札に戻す相手のクリーチャーを2体まで選ぶ'}]};
  }
  if(text==='マナゾーンに置く時このカードはタップして置く。このクリーチャーが破壊された時次のうちいずれかひとつを選ぶ。▼バトルゾーンにある相手のクリーチャーを1体選び持ち主の手札に戻す。▼自分の手札を1枚捨てその後カードを1枚引く。'){
   return {g172Death:[{op:'Choose',g184Modes:true,modes:[
    {label:'相手のクリーチャーを1体手札に戻す',defs:[{op:'Target',to:'hand'}]},
    {label:'自分の手札を1枚捨て、その後1枚引く',defs:[{op:'Discard',owner:'self',n:1},{op:'Draw',n:1}]}
   ]}]};
  }
 }
 if(phase>=672){
  const text=normalize(f.abilityText);
  if(creature&&text==='W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)自分の無色クリーチャーをバトルゾーンに出した時自分の山札の上から1枚目をマナゾーンに置く。'){
   return {breaker:2,g251EntryDraw:{filter:{creature:true,noColor:true},defs:[{op:'Ramp',n:1}]}};
  }
  if(creature&&text==='バトルゾーンにある自分のオラクルはすべて「スピードアタッカー」を得る。(「スピードアタッカー」を得たクリーチャーは召喚酔いしない)W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)'){
   return {breaker:2,g208Auras:[{filter:{creature:true,race:'オラクル'},grants:{speedAttacker:true}}]};
  }
  if(f.typeText==='呪文'&&text==='バトルゾーンにあるクリーチャーを1体選ぶ。次の自分のターンのはじめまでそのクリーチャーは「ブロッカー」を得る。'){
   return {effect:'sixPhoto',g34Tasks:[{op:'Target',anyOwner:true,grant:{blocker:true},g521UntilStart:true,spell:true,title:'次の自分のターンまでブロッカーを与えるクリーチャーを1体選ぶ'}]};
  }
 }
 if(phase>=671){
  const text=normalize(f.abilityText);
  if(creature&&text==='このクリーチャーをバトルゾーンに出した時相手はバトルゾーンにある自身の無色ではないクリーチャーを1体選び持ち主のマナゾーンに置く。'){
   return {effect:'sixPhoto',g34Tasks:[{op:'OpponentSelect',n:1,to:'mana',filter:{g218Colored:true},title:'マナに置く自分の無色ではないクリーチャーを1体選ぶ'}]};
  }
  if(evolution&&text==='進化-自分のイニシエート1体の上に置く。W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)誰も自身のターン中コスト4以上の呪文を唱えることはできない。'){
   return {evolution:{race:'イニシエート'},breaker:2,g671OwnTurnSpellMin:4};
  }
  if(f.typeText==='呪文'&&text==='S・トリガーS・トリガー(この呪文をシールドゾーンから手札に加える時コストを支払わずにすぐ唱えてもよい)バトルゾーンにあるクリーチャーを2体まで選ぶ。このターンそのクリーチャーのパワーは+2000され相手プレイヤーを攻撃できない。'){
   return {trigger:true,effect:'sixPhoto',g34Tasks:[{op:'Select',origin:'battle',anyOwner:true,n:2,optional:true,filter:{creature:true},g173Targets:true,g193Select:true,g671PlayerLockPower:2000,spell:true,title:'パワーを+2000し、プレイヤーへの攻撃を止めるクリーチャーを2体まで選ぶ'}]};
  }
 }
 if(phase>=670){
  const text=normalize(f.abilityText);
  if(f.typeText==='呪文'&&text==='相手はバトルゾーンにある自身の進化ではないクリーチャーを2体選び新しいシールドとして自身のシールドゾーンに裏向きにして加える。'){
   return {effect:'sixPhoto',g34Tasks:[{op:'OpponentSelect',n:2,to:'shields',filter:{nonEvolution:true},title:'裏向きのシールドにする自分の進化ではないクリーチャーを2体選ぶ'}]};
  }
  if(creature&&text==='このクリーチャーをバトルゾーンに出した時自分の他のクリーチャーを1体バトルゾーンから手札に戻してもよい。そうした場合バトルゾーンにある相手のクリーチャーを1体選び持ち主の手札に戻す。'){
   return {effect:'sixPhoto',g34Tasks:[{op:'MarshalTouch558',title:'手札に戻す自分の他のクリーチャーを1体選ぶ（任意）',defs:[{op:'Target',to:'hand'}]}]};
  }
  if(creature&&text==='このクリーチャーが攻撃する時「ガードマン」を持つクリーチャーを1体自分の手札またはマナゾーンからバトルゾーンに出してもよい。W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)'){
   return {breaker:2,g34Attack:[{op:'Select',zones:['hand','mana'],filter:{creature:true,g670Guardman:true},n:1,optional:true,deploy:true,title:'手札かマナから出すガードマンを1体選ぶ（任意）'}]};
  }
 }
 if(phase>=668&&creature&&normalize(f.abilityText)==='このクリーチャーをバトルゾーンに出した時自分の山札の上から6枚を見る。その中から「シールド・ゴー」を持つカードを1枚表向きにして新しいシールドとして自分のシールドゾーンに加えてもよい。残りを好きな順序で自分の山札の一番下に戻す。W・ブレイカー「シールド・ゴー」を持つカードが自分のシールドゾーンに表向きであればバトルゾーンにある自分のアウトレイジはすべて「ブロッカー」を得る。'){
  return {breaker:2,g668OutrageBlockers:true,effect:'sixPhoto',g34Tasks:[{op:'Look',n:6,stages:[{to:'shields',n:1,optional:true,filter:{g661ShieldGo:true},g657FaceUp:true}]}]};
 }
 if(phase>=667&&evolution&&normalize(f.abilityText)==='進化-自分のアウトレイジ1体の上に置く。このクリーチャーが攻撃する時「シールド・ゴー」を持つクリーチャーを1体自分の墓地から表向きのまま新しいシールドとして自分のシールドゾーンに加えてもよい。W・ブレイカー(このクリーチャーはシールドを2枚ブレイクする)'){
  return {evolution:{race:'アウトレイジ'},breaker:2,g34Attack:[{op:'Select',origin:'grave',to:'shields',filter:{creature:true,g661ShieldGo:true},n:1,optional:true,g657FaceUp:true}]};
 }
 if(phase>=666&&creature){
  const text=normalize(f.abilityText),hasShieldGo='「シールド・ゴー」を持つカードが自分のシールドゾーンに表向きであれば';
  if(text===hasShieldGo+'このクリーチャーは「ブロッカー」を得る。自分のターンの終わりにこのクリーチャーをアンタップする。'){
   return {g666ShieldGoGrants:{blocker:true},g166EndUntap:true};
  }
  if(text==='このクリーチャーはこのクリーチャーよりパワーが小さいクリーチャーにブロックされない。'+hasShieldGo+'このクリーチャーのパワーは+4000され「W・ブレイカー」を得る。'){
   return {g408LessPowerBlock:true,g666ShieldGoGrants:{power:4000,breaker:2}};
  }
  if(text===hasShieldGo+'このクリーチャーが攻撃する時バトルゾーンにあるコスト4以下のクリーチャーを1体選び持ち主の手札に戻してもよい。このクリーチャーが破壊される時墓地に置くかわりに手札に戻す。'){
   return {g34Attack:[{op:'IfOwn',filter:{g666FaceUpShieldGo:true},defs:[{op:'Target',anyOwner:true,filter:{max:4},to:'hand',optional:true}]}],destroyToHand:true};
  }
 }
 if(phase>=662&&creature&&normalize(f.abilityText)==='自分のシールドゾーンにある「シールド・ゴー」を持つ表向きのカード1枚につきこのクリーチャーのパワーは+5000されシールドをさらに1枚ブレイクする。'){
  return {g662ShieldGoStats:5000};
 }
 if(phase>=660&&creature){
  const keyword='{SG}シールド・ゴー(このクリーチャーが破壊された時新しいシールドとして自分のシールドゾーンに表向きのまま加える。このクリーチャーが表向きでシールドゾーンを離れる時かわりに自分の墓地に置く)';
  const text=normalize(f.abilityText);
  const trigger='このクリーチャーを表向きにして自分のシールドゾーンに加えた時';
  const shieldEntry={
   'カードを1枚引いてもよい。':{op:'Draw',n:1,optional:true},
   'バトルゾーンにある相手のクリーチャーを1体選びタップしてもよい。':{op:'Target',tap:true,optional:true},
   '相手のパワー2000以下のクリーチャーを1体破壊する。':{op:'Target',to:'grave',filter:{maxPower:2000,g199Power:true}},
   'バトルゾーンにある相手のコスト4以下のクリーチャーを1体選び持ち主のマナゾーンに置く。':{op:'Target',to:'mana',filter:{max:4}},
   ...(phase>=661?{
    '相手は自身の手札を1枚選んで捨てる。':{op:'Discard',n:1},
    'このターンの残りをとばす。':{op:'Custom',name:'endTurn'}
   }:{})
  };
  const base={shieldGo:true,g172Death:[{op:'SelfGraveShield659'}]};
  if(text==='このクリーチャーはブロックされない。'+keyword)return {...base,unblockable:true};
  if(phase>=666&&text==='このクリーチャーが各ターンはじめて攻撃する時このクリーチャーをアンタップする。'+keyword+'このクリーチャーが自分のシールドゾーンに表向きであればバトルゾーンにある自分のクリーチャーはすべて「スピードアタッカー」を得る。'){
   return {...base,g540FirstAttack:[{op:'Untap',g191First:true}],g666ShieldSpeed:true};
  }
  if(phase>=669&&text==='ガードマンW・ブレイカー'+keyword+'このカードが自分のシールドゾーンに表向きであれば相手のパワー6000以下のクリーチャーはすべて可能であればクリーチャーを攻撃する。'){
   return {...base,guardman:true,breaker:2,g669ShieldForceCreatureAttack:true};
  }
  if(phase>=668){
   const shield='このカードが自分のシールドゾーンに表向きであれば';
   if(text==='W・ブレイカー'+keyword+shield+'自分のクリーチャーを召喚した時または呪文を唱えた時カードを1枚引いてもよい。'){
    return {...base,breaker:2,g668ShieldExecutionDraw:true};
   }
   const power='相手のクリーチャーすべてのパワーは-3000される。(パワー0以下のクリーチャーは破壊される)';
   const currentKeyword='{SG}シールド・ゴー(このクリーチャーが破壊された時表向きにシールド化する。このクリーチャーが表向きでシールドゾーンを離れる時かわりに自分の墓地に置く)';
   if(text==='W・ブレイカー'+keyword+shield+'バトルゾーンにある'+power||text==='W・ブレイカー'+currentKeyword+shield+power){
    return {...base,breaker:2,g668ShieldEnemyPower:-3000};
   }
  }
  if(phase>=667){
   if(text==='ガードマン(自分の他のクリーチャーが攻撃される時このクリーチャーをタップしてもよい。そうした場合攻撃クリーチャーはかわりにこのクリーチャーを攻撃する)'+keyword)return {...base,guardman:true};
   if(text==='このクリーチャーをバトルゾーンに出した時バトルゾーンにあるクリーチャーを1体選び持ち主の手札に戻してもよい。'+keyword+'このクリーチャーが自分のシールドゾーンに表向きであれば自分のクリーチャーが攻撃する時カードを1枚引いてもよい。'){
    return {...base,effect:'sixPhoto',g34Tasks:[{op:'Target',anyOwner:true,to:'hand',optional:true}],g662ShieldAttack:[{op:'Draw',n:1,optional:true}]};
   }
  }
  if(phase>=665){
   if(text==='このクリーチャーをバトルゾーンに出した時バトルゾーンにある相手のクリーチャーを1体選びタップしてもよい。'+keyword){
    return {...base,effect:'sixPhoto',g34Tasks:[{op:'Target',tap:true,optional:true}]};
   }
   if(text==='スレイヤー(このクリーチャーがバトルする時バトルの後相手クリーチャーを破壊する)'+keyword)return {...base,slayer:true};
   if(text==='パワーアタッカー+1000(攻撃中このクリーチャーのパワーは+1000される)'+keyword)return {...base,attackBonus:1000};
  }
  const sacrifice='このクリーチャーをバトルゾーンに出した時このクリーチャーを破壊してもよい。そうした場合';
  if(phase>=664&&text.startsWith(sacrifice)&&text.endsWith(keyword)){
   const body=text.slice(sacrifice.length,-keyword.length);
   const defs={
    'バトルゾーンにある相手のクリーチャーをすべてタップする。':[{op:'TapAll'}],
    'カードを1枚引く。':[{op:'Draw',n:1}],
    '相手の手札を1枚見ないで選び捨てさせる。':[{op:'Discard',n:1,random:true}],
    'パワー4000以下の相手のクリーチャーを1体破壊する。':[{op:'Target',to:'grave',filter:{maxPower:4000,g199Power:true}}],
    '自分の山札の上から1枚目をマナゾーンに置く。':[{op:'Ramp',n:1}]
   }[body];
   if(defs)return {...base,effect:'sixPhoto',g34Tasks:[{op:'SelfSacrifice407',defs}]};
  }
  if(phase>=663&&text==='ブロッカーブロッカーW・ブレイカー'+keyword+'このカードが自分のシールドゾーンに表向きであればバトルゾーンにある自分のクリーチャーはすべて「シールド・セイバー」を得る。(自分のシールドがブレイクされる時かわりに「シールド・セイバー」を持つクリーチャーを破壊してもよい)'){
   return {...base,blocker:true,breaker:2,g663ShieldSaver:true};
  }
  if(phase>=662){
   const shield='このカードが自分のシールドゾーンに表向きであれば';
   if(text==='ブロッカーブロッカーW・ブレイカー'+keyword+shield+'自分のターンのはじめにバトルゾーンにある相手のクリーチャーを1体選びタップしてもよい。'){
    return {...base,blocker:true,breaker:2,g662ShieldStart:[{op:'Target',tap:true,optional:true}]};
   }
   if(text==='W・ブレイカー'+keyword+shield+'自分のクリーチャーが攻撃する時バトルゾーンにある相手のクリーチャーすべてのパワーは-1000される。'){
    return {...base,breaker:2,g662ShieldAttack:[{op:'GroupPower',owner:'opponent',filter:{creature:true},power:-1000}]};
   }
  }
  if(text.startsWith(keyword+trigger)){
   const effect=shieldEntry[text.slice((keyword+trigger).length)];
   if(effect)return {...base,g660ShieldEntry:[effect]};
  }
 }
 if(phase>=659&&creature){
  const keyword='{SG}シールド・ゴー(このクリーチャーが破壊された時自分の墓地から表向きでシールド化する。このクリーチャーが表向きでシールドゾーンを離れる時かわりに墓地に置く)';
  if(lines.some(line=>normalize(line)===keyword)){
   const base=structuredClone(d);
   base.faces[0].abilityText=lines.filter(line=>normalize(line)!==keyword).join('\n');
   const inca=normalize(base.faces[0].abilityText)==='このクリーチャーをタップして出してもよい。相手のクリーチャーが攻撃するなら可能ならこのクリーチャーを攻撃する。';
   const forceTarget=phase>=669&&normalize(base.faces[0].abilityText)==='相手がクリーチャーを選ぶなら可能ならこのクリーチャーを選ぶ。';
   const rest=forceTarget?{forceTarget:true}:inca?{g432EntryTap:true,g431AttackMe:true}:standardCardSpec(base,{phase:658});
   return {...rest,shieldGo:true,g172Death:[...(rest.g172Death||[]),{op:'SelfGraveShield659'}]};
  }
 }
 if(phase>=527&&creature){
  const extras=[
   'マナ武装4:このクリーチャーが出た時自分のマナゾーンに多色カードが4枚以上あればカードを1枚自分の墓地から手札に戻してもよい。',
   'マナ武装4:このクリーチャーが出た時自分のマナゾーンに多色カードが4枚以上あればカードを2枚引く。'
  ],at=lines.findIndex(l=>extras.includes(normalize(l)));
  if(at>=0&&lines.filter(l=>extras.includes(normalize(l))).length===1){
   const prefix=structuredClone(d);prefix.faces[0].abilityText=lines.filter((_,i)=>i!==at).join('\n');
   const base=standardCardSpec(prefix,{phase:526}),extra=mana197(normalize(lines[at]),phase);
   if(base.effect==='sixPhoto'&&base.g34Tasks?.length&&!base.summonedEntryOnly&&!base.evolvedEntryOnly&&!base.stackOnlyEntry&&!base.nonEvolutionBase)return{...base,g527ExtraEntry:[{label:'マナ武装4',defs:[extra.task]}]};
  }
 }
 if(phase>=558&&creature){
  const headers=[
   'マーシャル・タッチ(このクリーチャーをバトルゾーンに出した時自分の他のクリーチャーを1体バトルゾーンから手札に戻してもよい。そうした場合このクリーチャーの能力を使う)',
   'マーシャル・タッチ(このクリーチャーがバトルゾーンに出た時自分の他のクリーチャーを1体バトルゾーンから手札に戻してもよい。そうしたらこのクリーチャーのg能力を使う)'
  ],at=lines.findIndex(l=>headers.some(h=>normalize(l).startsWith(h)));
  if(at>=0){
   if(lines.filter(l=>normalize(l).startsWith('マーシャル・タッチ')).length!==1)throw Error('重複するマーシャル・タッチ');
   const line=normalize(lines[at]),head=headers.find(h=>line.startsWith(h)),inline=line.slice(head.length),body=inline||normalize(lines[at+1]||''),text=head.includes('g能力')?body.replace(/^g/,''):body;
   const defs={
    'このターン自分のクリーチャーすべてに「スピードアタッカー」を与える。(「スピードアタッカー」を持つクリーチャーは召喚酔いしない)':[{op:'GroupGrant364',owner:'self',filter:{creature:true},grant:{speedAttacker:true}}],
    'パワー4000以下のクリーチャーをすべて破壊する。':[{op:'Sweep',both:true,to:'grave',filter:{creature:true,maxPower:4000,g199Power:true}}],
    '自分の山札の上から1枚目をマナゾーンに置く。':[{op:'Ramp',n:1}],
    'この「マーシャル・タッチ」能力で手札に戻すために選んだ自分のクリーチャー以下のコストを持つ相手のクリーチャーを1体破壊する。':[{op:'Target',to:'grave',g558ReturnedCost:true,filter:{creature:true}}],
    'このターンこのクリーチャーは「スピードアタッカー」を得る。(「スピードアタッカー」を得たクリーチャーは召喚酔いしない)':[{op:'ShinkaGrant397',grant:{speedAttacker:true}}],
    'このターンバトルゾーンにある自分の他のクリーチャー1体はタップされていないクリーチャーを攻撃できる。':[{op:'Target',owner:'self',g179Other:true,grant:{attackUntapped:true}}],
    '相手の「ブロッカー」を持つクリーチャーを1体破壊する。':[{op:'Target',to:'grave',filter:{blocker:true}}],
    '相手のパワー2000以下のクリーチャーを1体破壊する。':[{op:'Target',to:'grave',filter:{maxPower:2000,g199Power:true}}],
    'このターンこのクリーチャーのパワーは+3000され「スピードアタッカー」を得る。(「スピードアタッカー」を得たクリーチャーは召喚酔いしない)':[{op:'ShinkaGrant397',power:3000,grant:{speedAttacker:true}}],
    'パワー5000以下の光または水のクリーチャーを1体破壊する。':[{op:'Target',anyOwner:true,to:'grave',filter:{creature:true,maxPower:5000,g199Power:true,any:[{color:'光'},{color:'水'}]}}]
   }[text];
   if(!defs)throw Error('未対応のマーシャル・タッチの効果');
   const prefix=structuredClone(d),souls=[];prefix.faces[0].abilityText=lines.filter((l,i)=>{if(i===at||!inline&&i===at+1)return false;const text=normalize(l);if(/^(?:【[HMEKWBU]・ソウル】)+$/.test(text)){souls.push(...text.matchAll(/([HMEKWBU])・ソウル/g));return false;}return true;}).join('\n');prefix.faces[0].powerText=f.powerText.replace(/\+$/,'');const base=standardCardSpec(prefix,{phase:557});
   if(base.g34Tasks||base.effect)throw Error('独立した登場能力の順序対応が必要');return{...base,...(souls.length?{g558Souls:souls.map(m=>m[1])}:{}),effect:'sixPhoto',g34Tasks:[{op:'MarshalTouch558',defs}]};
  }
 }
 if(phase>=704&&f.typeText==='呪文'&&lines.length===1&&(normalize(lines[0])===phantomVeil704||phase>=705&&normalize(lines[0])==='相手の次のターンに相手の攻撃できるクリーチャーはすべて攻撃しなければならない。'))return{effect:'sixPhoto',g34Tasks:[{op:'ForceGroup546',when:'nextOpponent',spell:true}]};
 if(phase>=546&&!creature&&!seed&&lines.length===2&&normalize(lines[0])==='相手のクリーチャーを1体選ぶ。次の相手のターンそのクリーチャーは可能なら攻撃する。'&&normalize(lines[1])==='G・G・G:自分の手札が1枚以下なら相手のクリーチャーは1体のかわりにすべて次の相手のターンに可能なら攻撃する。')return{effect:'sixPhoto',g34Tasks:[{op:'IfOwn',filter:{g334ZoneCount:{zone:'hand',max:1}},defs:[{op:'ForceGroup546',when:'nextOpponent',spell:true}],elseDefs:[{op:'Target',g546Force:'nextOpponent',spell:true}]}]};
 if(phase>=445&&creature){
  const at=lines.findIndex(line=>normalize(line)==='シンカパワー:このクリーチャーが進化する時次のうちいずれか1つを選ぶ。');
  if(at>=0){
   const choices=lines.slice(at+1);if(choices.length!==2||choices.some(line=>!/^\s*▶/.test(line)))throw Error('未対応の選択式シンカパワー構成');
   const bodies=choices.map(line=>normalize(line.replace(/^\s*▶/,''))),defs=bodies.map(body=>shinkaMode445(body,phase));
   if(new Set(bodies).size!==bodies.length||defs.some(d=>!d))throw Error('未対応の選択式シンカパワー効果');
   const prefix=structuredClone(d);prefix.faces[0].abilityText=lines.slice(0,at).join('\n');const prior=standardCardSpec(prefix,{phase:444});
   if(prior.g397Shinka)throw Error('重複するシンカパワー');
   return{...prior,g397Shinka:[{op:'Choose',g184Modes:true,modes:choices.map((line,i)=>({label:line.replace(/^\s*▶/,'').trim(),defs:defs[i]}))}]};
  }
 }
 if(phase>=454&&creature&&lines.some(l=>normalize(l).startsWith('スペース・チャージ'))){
  const heads=lines.filter(l=>normalize(l).startsWith('スペース・チャージ'));if(heads.length!==1)throw Error('未対応のスペース・チャージ構成');const head=normalize(heads[0]),modern=head==='スペース・チャージ(自分のマナゾーンにカードが置かれた時そのカードの文明に合うq能力を使ってもよい)',old=head.match(/^スペース・チャージ:([光水闇火自然]+)(?:\/([光水闇火自然]+))?\((.+)\)$/);
  if(!modern&&!old)throw Error('未対応のスペース・チャージ条件');const cs=old?[old[1],...(old[2]?[old[2]]:[])]:null;
  if(cs&&(cs.some(c=>!colors.includes(c))||new Set(cs).size!==cs.length||old[3]!=='自分のマナゾーンに'+(cs.length===1?cs[0]+'の':cs.join('')+'のいずれかまたは両方を持つ')+'カードが置かれた時このクリーチャーのq能力を使ってもよい'))throw Error('未対応のスペース・チャージ条件');
  const qs=lines.filter(l=>/^q/.test(normalize(l)));if(!qs.length||cs&&qs.length!==cs.length)throw Error('未対応のスペース・チャージ能力');const rules=qs.map((line,i)=>{const text=normalize(line),tag=text.match(/^q(光|水|闇|火|自然):(.+)$/),color=tag?.[1]||(cs?.length===1&&cs[0]),body=tag?.[2]||text.slice(1);if(!color||cs&&color!==cs[i]||!tag&&cs?.length!==1)throw Error('未対応のスペース・チャージ文明');const force=phase>=546&&instruction546(body),defs=force?[force]:clauses(body,Math.min(phase,456)).map(t=>instruction(t,Math.min(phase,456)));if(!defs.length||defs.some(d=>!d))throw Error('未対応のスペース・チャージ効果');const battlePower=xs=>{for(const d of xs){if((d.op==='Target'||d.op==='Select'&&d.origin==='battle')&&d.filter&&(d.filter.maxPower!==undefined||d.filter.minPower!==undefined))d.filter.g199Power=true;if(d.defs)battlePower(d.defs);for(const m of d.modes||[])battlePower(m.defs);}};battlePower(defs);return{color,defs};});
  if(new Set(rules.map(r=>r.color)).size!==rules.length)throw Error('重複するスペース・チャージ文明');const base=structuredClone(d);base.faces[0].abilityText=lines.filter(l=>l!==heads[0]&&!qs.includes(l)).join('\n');const prior=standardCardSpec(base,{phase:phase>=455?Math.min(phase,456):453});if(prior.g454Space)throw Error('重複するスペース・チャージ能力');return{...prior,g454Space:rules};
 }
 if(phase>=452&&creature){
  const marker='連鎖(このクリーチャーをバトルゾーンに出した時自分の山札の上から1枚目を見る。そのカードがこのクリーチャーよりコストが小さいクリーチャーであればバトルゾーンに出してもよい)',at=lines.findIndex(l=>normalize(l)===marker);
  if(at>=0){
   if(lines.filter(l=>normalize(l)===marker).length!==1)throw Error('重複する連鎖能力');const prefix=structuredClone(d);prefix.faces[0].abilityText=lines.filter((_,i)=>i!==at).join('\n');const base=standardCardSpec(prefix,{phase:452});
   if(base.effect||base.g84Effect||base.g34Tasks)throw Error('独立した連鎖能力の順序対応が必要');return{...base,effect:'champion',g84Effect:'Chain'};
  }
 }
 if(phase>=451&&(creature||f.typeText==='呪文')){
  const header=normalize(lines[0]||'').match(/^\{STP\}S・トリガー・プラス\(この(クリーチャー|呪文)を自分のシールドゾーンから手札に加える時コストを支払わずにすぐ(召喚し|唱え)てもよい。それが相手のターンでそのターン中に自分のシールドが2つ以上ブレイクされていればこの\1に\{x\+\}能力を与える\)$/);
  if(header){
   if((creature?header[1]!=='クリーチャー'||header[2]!=='召喚し':header[1]!=='呪文'||header[2]!=='唱え')||f.powerText?.endsWith('+'))throw Error('未対応のS・トリガー・プラス構成');
   const body=lines.slice(1),marked=body.filter(l=>/^\s*\{x\+\}/.test(l));if(marked.length!==1||body.join('').split('{x+}').length!==2)throw Error('未対応のS・トリガー・プラス構成');
   if(creature){
    const base=structuredClone(d),bonus=structuredClone(d);base.faces[0].abilityText=body.filter(l=>l!==marked[0]).join('\n');bonus.faces[0].abilityText=marked[0].replace(/^\s*\{x\+\}/,'');
    const nestedPhase=phase>=553?phase:451,prior=standardCardSpec(base,{phase:nestedPhase}),extra=standardCardSpec(bonus,{phase:nestedPhase});if(Object.keys(extra).some(k=>!['effect','g34Tasks'].includes(k))||extra.effect!=='sixPhoto'||!extra.g34Tasks?.length||prior.trigger||prior.triggerPlus||prior.superTrigger)throw Error('未対応のS・トリガー・プラス能力');
    return{...prior,triggerPlus:true,g34Plus:extra.g34Tasks};
   }
   const at=body.indexOf(marked[0]);if(at!==body.length-1)throw Error('未対応のS・トリガー・プラス呪文構成');
   const compile=xs=>xs.flatMap(l=>clauses(normalize(l),phase)).map(l=>instruction(l,phase)),base=compile(body.slice(0,at)),bonus=compile([marked[0].replace(/^\s*\{x\+\}/,'')]);
   if(!bonus.length||[...base,...bonus].some(d=>!d))throw Error('未対応のS・トリガー・プラス能力');const mark=defs=>{for(const d of defs||[]){if(d.g190Freeze||d.g210TapLock||d.power||d.grant||d.g335Grant)d.spell=true;mark(d.defs);for(const m of d.modes||[])mark(m.defs);}};mark(base);mark(bonus);return{triggerPlus:true,effect:'sixPhoto',g34Tasks:base,g34Plus:bonus,g451PlusAfter:true};
  }
 }
 if(phase>=493&&f.typeText==='クリーチャー'){
  const header=normalize(lines[0]||'').match(/^(?:スーパー・S・トリガー){1,2}\(このクリーチャーを自分のシールドゾーンから手札に加える時コストを支払わずにすぐ召喚してもよい。その時自分のシールドが1つもなければこのクリーチャーに([xo]B)能力を与える\)(.*)$/);
  if(header){
   const marker=header[1],body=[header[2],...lines.slice(1)].filter(Boolean).join('\n'),parts=body.split(marker);if(parts.length!==2)throw Error('未対応のクリーチャー・スーパー・S・トリガー構成');
   const compile=text=>{const row=structuredClone(d);row.faces[0].abilityText=text.trim();return standardCardSpec(row,{phase});},base=compile(parts[0]),bonus=compile(parts[1]);
   if(base.trigger||base.triggerPlus||base.superTrigger||bonus.effect!=='sixPhoto'||!bonus.g34Tasks?.length||Object.keys(bonus).some(k=>!['effect','g34Tasks'].includes(k)))throw Error('未対応のクリーチャー・スーパー・S・トリガー能力');
   const livePower=defs=>{for(const d of defs){if(d.filter&&(d.filter.maxPower!==undefined||d.filter.minPower!==undefined))d.filter.g199Power=true;if(d.defs)livePower(d.defs);for(const m of d.modes||[])livePower(m.defs||[]);}};livePower(bonus.g34Tasks);
   return{...base,superTrigger:true,g493SuperEntry:bonus.g34Tasks};
  }
 }
 if(phase>=437&&f.typeText==='呪文'){
  const text=normalize(lines[0]||'');
  const header=text.match(/^(?:スーパー・S・トリガー){1,2}\(この呪文を自分のシールドゾーンから手札に加える時コストを支払わずにすぐ唱えてもよい。その時自分のシールドが1つもなければこの呪文に([xo]B)能力を与える\)$/)
   ||(phase>=594&&text.match(/^(?:スーパー・S・トリガー){1,2}\(このカードを自分のシールドゾーンから手札に加える時コストを支払わずにすぐ実行してもよい。その時自分のシールドが1つもなければこのカードに(\{[xo]B\})能力を与える\)$/));
  if(header){
   const marker=header[1],body=lines.slice(1).join('\n');if(body.split(marker).length!==2)throw Error('未対応のスーパー・S・トリガー構成');const at=body.indexOf(marker);
   const compile=text=>text.split('\n').filter(s=>s.trim()).flatMap(s=>{
    const line=normalize(s);
    if(phase>=594&&line===graveSpellBottom594)return [{op:'GraveSpell594',max:9}];
    return clauses(line,phase).map(s=>superInstructions437(s,phase));
   });
   const base=compile(body.slice(0,at)),bonus=compile(body.slice(at+marker.length));if(!bonus.length||[...base,...bonus].some(d=>!d))throw Error('未対応のスーパー・S・トリガー能力');
   return{superTrigger:true,effect:'sixPhoto',g34Tasks:base,g437Super:bonus};
  }
 }
 if(phase>=432&&creature&&lines.some(l=>/^このクリーチャーをタップして(?:バトルゾーンに)?出してもよい。$/.test(normalize(l)))){
  const match=l=>/^このクリーチャーをタップして(?:バトルゾーンに)?出してもよい。$/.test(normalize(l));
  if(lines.filter(match).length!==1)throw Error('重複する任意のタップ登場');
  const base=structuredClone(d);base.faces[0].abilityText=lines.filter(l=>!match(l)).join('\n');
  const spec=standardCardSpec(base,{phase:431});if(spec.g295EnterTapped)throw Error('競合する登場状態定義');
  return{...spec,g432EntryTap:true};
 }
 if(phase>=431&&creature&&lines.some(l=>normalize(l)==='相手のクリーチャーが攻撃する時可能ならこのクリーチャーを攻撃する。')){
  const match=l=>normalize(l)==='相手のクリーチャーが攻撃する時可能ならこのクリーチャーを攻撃する。';
  if(lines.filter(match).length!==1)throw Error('重複する攻撃先指定能力');
  const base=structuredClone(d);base.faces[0].abilityText=lines.filter(l=>!match(l)).join('\n');
  return{...standardCardSpec(base,{phase:430}),g431AttackMe:true};
 }
 if(phase>=430&&creature&&lines.some(l=>normalize(l)==='相手のクリーチャーが攻撃する時そのクリーチャーとこのクリーチャーを破壊する。')){
  const match=l=>normalize(l)==='相手のクリーチャーが攻撃する時そのクリーチャーとこのクリーチャーを破壊する。';
  if(lines.filter(match).length!==1)throw Error('重複する相互破壊能力');
  const base=structuredClone(d);base.faces[0].abilityText=lines.filter(l=>!match(l)).join('\n');
  const spec=standardCardSpec(base,{phase:429});
  return{...spec,g253AttackWatches:[...(spec.g253AttackWatches||[]),{who:'opponent',filter:{creature:true},g399Attacker:true,defs:[{op:'MutualDestroy430'}]}]};
 }
 if(phase>=422&&creature){
  const marker='ホーリー・フィールド(自分のシールドの数が相手以上であればこのクリーチャーは次の能力を得る)',at=lines.findIndex(l=>normalize(l).startsWith(marker));
  if(at>=0){
   if(lines.filter(l=>normalize(l).includes('ホーリー・フィールド')).length!==1)throw Error('重複するホーリー・フィールド');
   const prefix=structuredClone(d),suffix=structuredClone(d);prefix.faces[0].abilityText=lines.slice(0,at).join('\n');suffix.faces[0].abilityText=[normalize(lines[at]).slice(marker.length),...lines.slice(at+1)].join('\n');
   prefix.faces[0].powerText=suffix.faces[0].powerText=f.powerText.replace(/\+$/,'');
   const base=standardCardSpec(prefix,{phase:421}),grants={
    ...(phase>=452?{'このクリーチャーは「ブロッカー」を得る。':{blocker:true}}:{}),
    'このクリーチャーのパワーは+3000され「W・ブレイカー」を得る。(「W・ブレイカー」を得たクリーチャーはシールドを2枚ブレイクする)':{power:3000,breaker:2},
    'このクリーチャーは「ブロッカー」を得る。(相手クリーチャーが攻撃する時「ブロッカー」を得たクリーチャーをタップしてその攻撃を阻止してもよい。その後その相手クリーチャーとバトルする)':{blocker:true}
   }[normalize(suffix.faces[0].abilityText)]||standardCardSpec(suffix,{phase:421}),allowed=new Set(['power','breaker','blocker','g172Death','effect','g34Tasks',...(phase>=452?['destroyToHand']:[])]);
   if(base.g260Self||!Object.keys(grants).length||Object.keys(grants).some(k=>!allowed.has(k))||Object.keys(grants).some(k=>k in base))throw Error('未対応のホーリー・フィールド能力');
   return{...base,g422Holy:true,g260Self:{filter:{g334ZoneCount:{zone:'shields',atLeastOpponent:true}},grants}};
  }
 }
 if(phase>=406&&creature){
  const marker='サバイバー(このクリーチャーがバトルゾーンにある間自分の他のサバイバーも上の能力を得る)';
  const reprintMarker='サバイバー(自分のサバイバーはすべて上のoS能力を持つ)';
  if(phase>=710&&lines.length===2&&!evolution&&String(f.race).split('/').includes('サバイバー')){
   const [ability,sharing]=lines.map(normalize);
   const earlyDiscard='このクリーチャーが攻撃するとき相手の手札が1枚でもあれば相手はその中から1枚選んで持ち主の墓地に置く。';
   const promoMarker='サバイバー(このクリーチャーがバトルゾーンにある間自分の他のサバイバーも上のoS能力を得る)';
   const laterMarker='サバイバー(自分のサバイバーすべてに上のoS能力を与える)';
   if(phase>=713&&(
    ability==='このクリーチャーがバトルゾーンにある間自分のターンの終わりにこれをアンタップする。'&&sharing===marker||
    ability==='oSこのクリーチャーがバトルゾーンにある間自分の各ターンの終わりにこれをアンタップする。'&&sharing===promoMarker)){
    const grants={g174End:[{op:'Untap',g191First:true}]};
    return{...grants,g406Survivor:structuredClone(grants)};
   }
   if(ability===earlyDiscard&&sharing===marker||
    ability==='oS'+earlyDiscard&&sharing===promoMarker||
    ability==='oSこのクリーチャーが攻撃する時相手は自身の手札を1枚選び捨てる。'&&sharing===laterMarker){
    const grants={g34Attack:[{op:'Discard',n:1}]};
    return{...grants,g406Survivor:structuredClone(grants)};
   }
  }
  const at=lines.findIndex(l=>normalize(l)===marker||phase>=709&&normalize(l)===reprintMarker);
  if(at>=0){
   if(evolution||lines.length!==2||at!==1||!String(f.race).split('/').includes('サバイバー'))throw Error('未対応のサバイバー構成');
   if(phase>=709){
    const reprint=normalize(lines[at])===reprintMarker;
    const prefix=reprint?/^oSこのクリーチャーがバトルゾーンに出た時(.+)$/:/^このクリーチャーがバトルゾーンに出たとき(.+)$/;
    const body=normalize(lines[0]).match(prefix)?.[1];
    const filter={creature:true,race:'サバイバー'};
    const task={
     '自分の墓地からサバイバーを1体選び自分の手札に戻してもよい。':{op:'Select',origin:'grave',to:'hand',n:1,optional:true,filter},
     '自分の山札を見る。その中からサバイバーを1体選び相手に見せてから自分の手札に加えてもよい。その後山札をシャッフルする。':{op:'Look',g201Search:true,g200Search:true,n:'all',rest:'shuffle',stages:[{n:1,to:'hand',reveal:true,optional:true,filter}]}
    }[body];
    if(task){
     const grants={effect:'sixPhoto',g34Tasks:[task]};
     return{...grants,g406Survivor:structuredClone(grants)};
    }
    if(reprint)throw Error('再録サバイバーの共有処理が未対応');
   }
   if(phase>=708&&normalize(lines[0])==='バトルゾーンにある間このクリーチャーのパワーは+1000される。')return{g406OwnPower:1000,g406Survivor:{power:1000}};
   const shared=structuredClone(d);shared.faces[0].abilityText=lines[0];const grants=standardCardSpec(shared,{phase:405}),allowed=new Set(['slayer','speedAttacker','attackBonus','breaker','blocker','unblockable','effect','g34Tasks','g34Attack']);
   if(!Object.keys(grants).length||Object.keys(grants).some(k=>!allowed.has(k))||grants.effect&&grants.effect!=='sixPhoto')throw Error('サバイバーの共有処理が未対応');
   return{...grants,g406Survivor:structuredClone(grants)};
  }
 }
 if(phase>=444&&creature){
  const header=/^スリリング・スリー:([^()]+)\(このクリーチャーをバトルゾーンに出した時自分の山札の上から3枚をすべてのプレイヤーに見せる。表向きにした([^()]+)1体につき次のh能力を1回行ってもよい。その後表向きにしたカードをすべて好きな順序で山札の一番下に戻す\)h(.+)$/,at=lines.findIndex(l=>header.test(normalize(l)));
  if(at>=0){const m=normalize(lines[at]).match(header),copy=structuredClone(d);copy.faces[0].abilityText=lines.flatMap((line,i)=>i===at?['スリリング・スリー:'+m[1]+'(このクリーチャーをバトルゾーンに出した時自分の山札の上から3枚を表向きにする。表向きにした'+m[2]+'1体につき次の能力を1回行ってもよい。その後表向きにしたカードをすべて好きな順序で山札の一番下に戻す)',m[3]]:[line]).join('\n');return standardCardSpec(copy,{phase});}
 }
 if(phase>=443&&creature){
  const header=/^スリリング・スリー:([^()]+)\(このクリーチャーをバトルゾーンに出した時自分の山札の上から3枚を表向きにする。表向きにした([^()]+)1体につき次の能力を1回行ってもよい。その後表向きにしたカードをすべて好きな順序で山札の一番下に戻す\)$/,at=lines.findIndex(l=>header.test(normalize(l)));
  if(at>=0){
   const m=normalize(lines[at]).match(header),races=m[1].split('と');if(lines.filter(l=>header.test(normalize(l))).length!==1||at===lines.length-1||races.some(r=>!r)||m[2]!==races.join('または'))throw Error('未対応のスリリング・スリー構成');
   const defs={
    ...(phase>=444?{
     'このターンこのクリーチャーはシールドをもう1枚ブレイクする。':[{op:'SelfExtraBreak444',amount:1}],
     'このターンこのクリーチャーはシールドをさらに1枚ブレイクする。':[{op:'SelfExtraBreak444',amount:1}]
    }:{}),
    'バトルゾーンにある相手のクリーチャーを1体選びタップする。':[{op:'Target',tap:true}],
    '相手の「ブロッカー」を持つクリーチャーを1体破壊する。':[{op:'Target',to:'grave',filter:{blocker:true}}],
    'バトルゾーンにある相手のクリーチャーを1体選ぶ。このターンの終わりまでそのクリーチャーのパワーは-3000される。(パワーが0以下のクリーチャーは破壊される)':[{op:'Target',power:-3000,g242PowerMinus:true}],
    '自分の手札またはマナゾーンのカードを1枚裏向きにして自分のシールドゾーンに加える。':[{op:'Select',zones:['hand','mana'],to:'shields',n:1,optional:false}],
    '呪文を1枚自分の墓地から手札に戻す。':[{op:'Select',origin:'grave',to:'hand',n:1,filter:{spell:true},optional:false}],
    '自分の山札を見る。その中から好きなカードを1枚自分の手札に加えてもよい。その後山札をシャッフルする。':[{op:'Look',g201Search:true,g200Search:true,n:'all',stages:[{n:1,to:'hand',optional:true}],rest:'shuffle'}],
    'このターンの終わりまでバトルゾーンにある自分のクリーチャーすべてのパワーは+1000される。':[{op:'GroupPower',owner:'self',power:1000,filter:{creature:true},g214GroupPower:true}],
    '相手のクリーチャーを1体破壊する。':[{op:'Target',to:'grave'}],
    '他のクリーチャーを1体バトルゾーンから持ち主の手札に戻す。':[{op:'Target',anyOwner:true,to:'hand',g179Other:true}],
    'クリーチャーを1体自分の墓地から手札に戻す。':[{op:'Select',origin:'grave',to:'hand',n:1,filter:{creature:true},optional:false}],
    '進化ではないアーク・セラフィムまたはセイント・ヘッドを1体自分の手札からバトルゾーンに出す。':[{op:'Select',origin:'hand',n:1,deploy:true,optional:false,filter:{creature:true,nonEvolution:true,raceAny:['アーク・セラフィム','セイント・ヘッド']}}]
   }[normalize(lines[at+1])];
   if(!defs)throw Error('未対応のスリリング・スリー効果');const prefix=structuredClone(d);prefix.faces[0].abilityText=lines.filter((_,i)=>i!==at&&i!==at+1).join('\n');const base=standardCardSpec(prefix,{phase:442});if(base.effect||base.g34Tasks)throw Error('独立した登場時能力の順序対応が必要');return{...base,effect:'sixPhoto',g34Tasks:[{op:'Thrill443',races,defs}]};
  }
 }
 if(phase>=439&&creature){
  const marker=/^このクリーチャーで攻撃する(?:かわり|代わり)にタップして次の能力を使ってもよい。$/;
  const header='このクリーチャーで攻撃するかわりにタップして次の能力を使ってもよい。';
  const tHeader='このクリーチャーで攻撃するかわりにタップして次のt能力を使ってもよい。';
  const tDragon='t自分のドラゴン・クリーチャーを1体アンタップする。';
  // These prints place the tap marker and its effect on the same line or mark the effect with t.
  const tapLines=phase>=710?lines.flatMap((line,i)=>{
   const text=normalize(line),suffix=text.slice(header.length);
   if(text.startsWith(header)&&/^バトルゾーンにある自分の(?:ドラゴン|フレイム・コマンド)を1体アンタップする。$/.test(suffix))return[header,suffix];
   if(text===tHeader&&normalize(lines[i+1]||'')===tDragon)return[header];
   if(text===tDragon&&normalize(lines[i-1]||'')===tHeader)return['バトルゾーンにある自分のドラゴンを1体アンタップする。'];
   return[line];
  }):lines;
  const at=tapLines.findIndex(l=>marker.test(normalize(l)));
  if(at>=0){
   if(tapLines.filter(l=>marker.test(normalize(l))).length!==1||at===tapLines.length-1)throw Error('未対応のタップ能力構成');
   const prefix=structuredClone(d),body=structuredClone(d);prefix.faces[0].abilityText=tapLines.slice(0,at).join('\n');body.faces[0].typeText='クリーチャー';body.faces[0].abilityText='このクリーチャーが出た時、'+tapLines.slice(at+1).join('\n');
   const prefixPhase=phase>=712&&tapLines.slice(0,at).some(line=>normalize(line)===tappedPowerAttacker712)?712:438;
   const base=standardCardSpec(prefix,{phase:prefixPhase}),bodyText=normalize(tapLines.slice(at+1).join('')),mappedBody=(phase>=586?instruction586(bodyText):null)||(phase>=585?instruction585(bodyText):null)||(phase>=583?instruction583(bodyText):null)||(phase>=582?instruction582(bodyText):null);
   const mapped=mappedBody?[mappedBody]:phase>=440?tap440(bodyText,phase):null;
   if(mapped)return{...base,g439Tap:structuredClone(mapped)};
   const compiled=standardCardSpec(body,{phase:438});
   if(!compiled.g34Tasks?.length||Object.keys(compiled).some(k=>!['effect','g34Tasks'].includes(k)))throw Error('未対応のタップ能力の効果');
   return{...base,g439Tap:compiled.g34Tasks};
  }
 }
 if(phase>=496&&creature){
  const marker='サイレントスキル(自分のターンのはじめにこのクリーチャーがタップされていたらアンタップするかわりに次の能力を使ってもよい)',at=lines.findIndex(l=>normalize(l)===marker);
  if(at>=0){
   if(evolution||lines.filter(l=>normalize(l)===marker).length!==1||at===lines.length-1)throw Error('未対応のサイレントスキル構成');
   const prefix=structuredClone(d),tail=structuredClone(d);prefix.faces[0].abilityText=lines.slice(0,at).join('\n');tail.faces[0].typeText='呪文';tail.faces[0].abilityText=lines.slice(at+1).join('\n');
   if(normalize(tail.faces[0].abilityText)==='自分の山札の上から1枚目を自分のマナゾーンに加える。')tail.faces[0].abilityText='自分の山札の上から1枚目をマナゾーンに置く。';
   const additions=phase>=497?{
    'このクリーチャーは相手のシールドを1枚ブレイクする。':[{op:'Break497',n:1}],
    'このクリーチャーは相手のシールドを2枚ブレイクする。':[{op:'Break497',n:2}],
    '自分の手札を1枚選び裏向きにして自分のシールドに加えてもよい。そうした場合自分のシールドを1枚選び自分の手札に加える。(その「S・トリガー」能力は使えない)':[{op:'ShieldExchange446',optional:true}],
    '相手の手札を見てその中から1枚選び捨てさせる。':[{op:'InspectOne258'}],
    'このターンの終わりまで自分の火のクリーチャーはすべて「W・ブレイカー」を得る。':[{op:'GroupGrant364',owner:'self',filter:{creature:true,color:'火'},grant:{g313Breaker:2}}],
    'このターンバトルゾーンにある自分の他のクリーチャーはタップされていないクリーチャーを攻撃できる。':[{op:'GroupGrant364',owner:'self',other:true,filter:{creature:true},grant:{attackUntapped:true}}],
    'このターン自分の光のクリーチャーはブロックされない。':[{op:'GroupGrant364',owner:'self',filter:{creature:true,color:'光'},grant:{unblockable:true}}],
    ...(phase>=707?{'このターン自分のクリーチャーが攻撃する時カードを1枚引いてもよい。':[{op:'TurnAttackDraw613',optional:true,spell:false}]}:{}),
    '自分のマナゾーンからドラゴンを1体バトルゾーンに出す。':[{op:'Select',origin:'mana',n:1,deploy:true,optional:false,filter:{creature:true,race:'ドラゴン'}}]
   }[normalize(tail.faces[0].abilityText)]:null;
   const crossZone=phase>=581?instruction581(normalize(tail.faces[0].abilityText)):null;
   const base=standardCardSpec(prefix,{phase:495}),bonus=additions||crossZone?{effect:'sixPhoto',g34Tasks:structuredClone(additions||[crossZone])}:standardCardSpec(tail,{phase:495});
   if(bonus.effect!=='sixPhoto'||!bonus.g34Tasks?.length||Object.keys(bonus).some(k=>!['effect','g34Tasks'].includes(k)))throw Error('未対応のサイレントスキル能力');
   return{...base,g496Silent:bonus.g34Tasks};
  }
 }
 if(phase>=651&&seed){
  const marker='超魂X(これがクリーチャーの下にあればそのクリーチャーにも以下の能力を与える)',at=lines.findIndex(l=>normalize(l)===marker);
  if(at>=0&&at===lines.length-2&&normalize(lines[at+1])==='このクリーチャーは攻撃されない。'){
   const prefix=structuredClone(d);
   prefix.faces[0].abilityText=lines.slice(0,at).join('\n');
   return {...standardCardSpec(prefix,{phase}),g404Soul:{cannotBeAttacked:true}};
  }
 }
 if(phase>=404&&creature){
  const marker='超魂X(これがクリーチャーの下にあればそのクリーチャーにも以下の能力を与える)',at=lines.findIndex(l=>normalize(l)===marker);
  if(at>=0){
   if(evolution||lines.filter(l=>normalize(l)===marker).length!==1||at===lines.length-1)throw Error('未対応の超魂X構成');
   const whole=structuredClone(d),tail=structuredClone(d);whole.faces[0].abilityText=lines.filter((_,i)=>i!==at).join('\n');tail.faces[0].abilityText=lines.slice(at+1).join('\n');tail.faces[0].powerText=f.powerText.replace(/\+$/,'');
   if(phase>=438&&normalize(tail.faces[0].abilityText)==='このクリーチャーが攻撃する時このターン自分のクリーチャーすべてのパワーを+4000し「パワード・ブレイカー」を与える。')whole.faces[0].powerText=tail.faces[0].powerText;
   const extended607=phase>=607&&['dm25rp2-022','dm25rp4-072'].includes(d.id);
   const tailText=normalize(tail.faces[0].abilityText);
   const extended650=phase>=650&&(tailText==='このクリーチャーの攻撃中相手は「G・ストライク」を使えない。'||tailText.startsWith('このクリーチャーが攻撃する時このクリーチャーにカードが3枚以上含まれていれば'));
   const extended651=phase>=651&&(
    tailText==='このクリーチャーが攻撃する時このクリーチャーの下にあるカードを1枚墓地に置いてもよい。そうしたら相手のシールドを1つ選び持ち主の墓地に置く。'||
    lines.some(l=>normalize(l)==='このクリーチャーの召喚コストを自分の墓地にあるカード1枚につき1少なくする。ただしコストは0以下にはならない。')
   );
   const subphase=extended607||extended650||extended651?phase:phase>=438?438:403,base=standardCardSpec(whole,{phase:subphase}),grants=standardCardSpec(tail,{phase:subphase}),allowed=new Set(['blocker','slayer','unblockable','g38BattleBonus','g38EnemyTurnBonus','g34Attack','g174End','g166EndUntap',...(phase>=438?['spellUntargetable']:[]),...(extended607?['g607StackPower']:[]),...(extended650?['attackNoGS']:[])]);
   if(!Object.keys(grants).length||Object.keys(grants).some(k=>!allowed.has(k)))throw Error('超魂Xの付与処理が未対応');
   return{...base,g404Soul:grants};
  }
 }
 if(phase>=436&&creature){
  const marker='アクセル(このクリーチャーにクロスギアがクロスされている時このクリーチャーは次の能力を得る)',modern='アクセル(このクリーチャーにクロスギアがクロスされている時このクリーチャーに次のa能力を与える)',superMarker='スーパー・アクセル(バトルゾーンにある自分のクリーチャーにクロスギアがクロスされている時このクリーチャーは次の能力を得る)',isMarker=l=>normalize(l)===marker||phase>=442&&[modern,superMarker].includes(normalize(l)),at=lines.findIndex(isMarker);
  if(at>=0){
   if(lines.filter(isMarker).length!==1||at===lines.length-1)throw Error('未対応のアクセル構成');
   const rawBody=normalize(lines.slice(at+1).join('')),body=normalize(lines[at])===modern?rawBody.replace(/^a(?=このクリーチャー)/,''):rawBody,race=body.match(/^このクリーチャーのパワーは\+3000され種族に(サイバー・ムーン|デーモン・コマンド|アース・ドラゴン|エンジェル・コマンド|ボルケーノ・ドラゴン)を追加する。$/),grants=race?{power:3000,raceAdd:[race[1]]}:{
    ...(phase>=729?{
     'このクリーチャーはブロックされない。このクリーチャーが破壊される時かわりにこのクリーチャーにクロスしてあるクロスギアを1枚墓地に置いてもよい。':{unblockable:true,g729CrossSaver:true}
    }:{}),
    ...(phase>=728?{
     'このクリーチャーが攻撃する時自分の山札を見る。その中から「S・トリガー」付き呪文を1枚選び山札をシャッフルした後その呪文をコストを支払わずに唱えてもよい。':{g34Attack:[{op:'Marianna728'}]},
     'このクリーチャーが破壊された時このクリーチャーにクロスされていたクロスギアの数と同じ枚数カードを引いてもよい。':{g172Death:[{op:'CrossedDeathDraw728'}]}
    }:{}),
    ...(phase>=727?{
     'このクリーチャーが相手プレイヤーを攻撃してブロックされなかった時このクリーチャーよりパワーの小さいクリーチャーを1体バトルゾーンから持ち主の手札に戻してもよい。':{g482Unblocked:[{op:'TargetBelowSource692',to:'hand',optional:true,anyOwner:true,g179Other:true}]}
    }:{}),
    ...(phase>=542?{'このクリーチャーがこのターンはじめて攻撃する時攻撃の後このクリーチャーをアンタップする。':{g540FirstAttack:[{op:'AfterAttack542',defs:[{op:'Untap',g191First:true}]}]}}:{}),
    ...(phase>=442?{
     'このクリーチャーが攻撃する時カードを1枚引く。':{g34Attack:[{op:'Draw',n:1}]},
     'このクリーチャーが攻撃する時自分の山札を見る。その中からクリーチャー1体またはクロスギア1枚を選び相手に見せてから自分の手札に加えてもよい。その後山札をシャッフルする。':{g34Attack:[{op:'Look',g201Search:true,g200Search:true,n:'all',stages:[{n:1,to:'hand',optional:true,reveal:true,filter:{any:[{creature:true},{g228Face:{type:'gear'}}]}}],rest:'shuffle'}]},
     'このクリーチャーが攻撃する時自分の山札を見る。その中からサムライを1枚選び相手に見せてから手札に加えてもよい。その後山札をシャッフルする。':{g34Attack:[{op:'Look',g201Search:true,g200Search:true,n:'all',stages:[{n:1,to:'hand',optional:true,reveal:true,filter:{race:'サムライ'}}],rest:'shuffle'}]},
     'このクリーチャーのパワーは+4000され「W・ブレイカー」を得る。':{power:4000,breaker:2},
     'このクリーチャーのパワーは+3000され「W・ブレイカー」を得る。':{power:3000,breaker:2}
    }:{}),
    'このクリーチャーのパワーは+2000される。':{power:2000},
    'このクリーチャーのパワーは+3000され「スピードアタッカー」を得る。':{power:3000,speedAttacker:true},
    'このクリーチャーが破壊された時相手は自分自身の手札を2枚選び捨てる。':{g172Death:[{op:'Discard',n:2}]}
   }[body];
   if(!grants)throw Error('未対応のアクセル能力');const prefix=structuredClone(d);prefix.faces[0].abilityText=lines.slice(0,at).join('\n');prefix.faces[0].powerText=f.powerText.replace(/\+$/,'');
   const base=standardCardSpec(prefix,{phase:phase>=442?442:435});if(base.g260Self)throw Error('重複するアクセル条件');return{...base,g260Self:{filter:normalize(lines[at])===superMarker?{g442CrossedAlly:true}:{g436Crossed:true},grants}};
  }
 }
 if(phase>=705&&f.typeText==='クリーチャー'&&normalize(lines.at(-2)||'')===waveMarker702){
  const grants=waveGrants705[normalize(lines.at(-1))];
  if(grants){
   const base=standardCardSpec({...d,faces:[{...f,abilityText:lines.slice(0,-2).join('\n'),powerText:f.powerText.replace(/\+$/,'')}]},{phase});
   if(base.g400Wave||base.g260Self||Object.keys(grants).some(k=>Object.hasOwn(base,k)))throw Error('重複するウェーブストライカー能力');
   return{...base,g400Wave:true,g260Self:{filter:{g400Wave:3},grants}};
  }
 }
 if(phase>=400&&creature){
  const marker=legacyWaveMarker,at=lines.findIndex(l=>normalize(l)===marker);
  if(at>=0){
   if(lines.filter(l=>normalize(l)===marker).length!==1||at===lines.length-1)throw Error('未対応のウェーブストライカー構成');
   const prefix=structuredClone(d),suffix=structuredClone(d);prefix.faces[0].abilityText=lines.slice(0,at).join('\n');suffix.faces[0].abilityText=lines.slice(at+1).join('\n');
   prefix.faces[0].powerText=f.powerText.replace(/\+$/,'');suffix.faces[0].powerText=prefix.faces[0].powerText;
   const base=standardCardSpec(prefix,{phase:399}),grants={
    'このクリーチャーのパワーは+4000されパワー5000以下のクリーチャーにブロックされない。':{power:4000,g206NoBlock:{maxPower:5000}},
    'このクリーチャーのパワーは+4000される。このクリーチャーが破壊される時墓地に置くかわりに自分の手札に戻す。':{power:4000,destroyToHand:true},
    'このクリーチャーのパワーは+4000されタップされていないクリーチャーを攻撃できる。':{power:4000,attackUntapped:true},
    'このクリーチャーのパワーは+4000され「ブロッカー」を得る。':{power:4000,blocker:true},
    'このクリーチャーのパワーは+4000され「闇ステルス」を得る。(相手のマナゾーンに闇のカードが1枚でもあれば「闇ステルス」を持つクリーチャーはブロックされない)':{power:4000,g226Stealth:'闇'}
   }[normalize(suffix.faces[0].abilityText)]||standardCardSpec(suffix,{phase:400});
   if(base.g260Self||grants.g260Self||Object.keys(grants).some(k=>k in base))throw Error('重複するウェーブストライカー能力');
   return{...base,g400Wave:true,g260Self:{filter:{g400Wave:3},grants}};
  }
 }
 if(phase>=292&&f.typeText==='呪文'&&normalize(f.abilityText)==='相手のパワー5000以下のクリーチャーを1体破壊する。G・G・G:自分の手札が1枚以下なら相手のパワー5000以下のクリーチャーを1体のかわりにすべて破壊する。')return{effect:'sixPhoto',g34Tasks:[{op:'IfHand246',max:1,defs:[{op:'Sweep',to:'grave',filter:{creature:true,maxPower:5000}}],elseDefs:[{op:'Target',to:'grave',filter:{maxPower:5000}}]}]};
 if(phase>=288&&f.typeText==='呪文'&&normalize(f.abilityText)==='コスト3以下のクリーチャーを1体自分の墓地から出す。水晶武装4:自分のマナゾーンに裏向きのカードが4枚以上あればかわりにコスト8以下のクリーチャーを1体自分の墓地から出す。'){
  const revive=max=>({op:'Select',origin:'grave',n:1,deploy:true,g236GraveDeploy:true,filter:{creature:true,max},title:'墓地からコスト'+max+'以下のクリーチャーを1体選ぶ'});
  return{effect:'sixPhoto',g34Tasks:[{op:'IfOwn',filter:{g286FaceDownMana:4},defs:[revive(8)],elseDefs:[revive(3)]}]};
 }
 if(phase>=272&&creature){
  const marker='メタモーフ(自分のマナゾーンに7枚以上カードがあればこのクリーチャーは次の能力を得る)',at=lines.findIndex(l=>normalize(l)===marker);
  if(at>=0){
   if(!/^\d+$/.test(f.powerText)||lines.slice(at+1).some(l=>normalize(l)===marker))throw Error('未対応のメタモーフ構成');
   const body=normalize(lines.slice(at+1).join(''));
   if(phase>=633&&at===0&&body==='このクリーチャーがタップされている時バトルゾーンにある自分のクリーチャーはすべて「パワーアタッカー+3000」と「W・ブレイカー」を得る。'){
    return{g208Auras:[{filter:{creature:true},g557Condition:{all:[{g272ManaCount:7},{g590SourceTapped:true}]},
     grants:{attackBonus:3000,breaker:2,g633DoubleBreaker:true}}]};
   }
   const grants={
    ...(phase>=435?{
     'このクリーチャーをバトルゾーンに出した時カードを1枚引いてもよい。':{g34Tasks:[{op:'Offer',defs:[{op:'Draw',n:1}]}]},
     'どんな種族の進化クリーチャーをこのクリーチャーの上に置いてもよい。':{g293AnyEvolutionRace:true},
     'このクリーチャーが攻撃する時光の呪文をすべて自分の墓地から自分の手札に戻してもよい。':{g34Attack:[{op:'Offer',defs:[{op:'RecoverAll326',zones:['grave'],filter:{g228Face:{type:'spell',color:'光'}}}]}]},
     'このクリーチャーまたは自分の他のクリーチャーをバトルゾーンに出した時バトルゾーンにある相手のクリーチャーを1体選びタップする。':{g251EntryDraw:{filter:{creature:true},selfAlways:true,defs:[{op:'Target',tap:true}]}},
     'このクリーチャーは攻撃されない。このクリーチャーは「パワーアタッカー+3000」を得る。':{cannotBeAttacked:true,attackBonus:3000}
    }:{}),
    'このクリーチャーはブロックされない。':{unblockable:true},
    'このクリーチャーが破壊される時墓地に置くかわりに自分の手札に戻す。':{destroyToHand:true},
    'このクリーチャーのパワーは+2000される。このクリーチャーの「このクリーチャーは攻撃することができない」という効果を無効にする。':{power:2000,noAttack:false},
    'このクリーチャーのパワーは+7000され「W・ブレイカー」を得る。(「W・ブレイカー」を得たクリーチャーはシールドを2枚ブレイクする)':{power:7000,breaker:2},
    'このクリーチャーのパワーは+2000され「スレイヤー」を得る。(「スレイヤー」を得たクリーチャーがバトルする時バトルの後相手クリーチャーを破壊する)':{power:2000,slayer:true},
    'このクリーチャーが破壊された時他のクリーチャーを2体まで自分の墓地から手札に戻す。':{g172Death:[{op:'Select',origin:'grave',to:'hand',n:2,optional:true,filter:{creature:true},g186Other:true}]}
   }[body];
   if(!grants)throw Error('未対応のメタモーフ能力');const prefix=structuredClone(d);prefix.faces[0].abilityText=lines.slice(0,at).join('\n');const prior=standardCardSpec(prefix,{phase:271});if(prior.g260Self)throw Error('重複するメタモーフ条件');
   return{...prior,g260Self:{filter:{g272ManaCount:7},grants}};
  }
 }
 for(let i=0;i<lines.length;i++){
  const raw=lines[i],line=normalize(phase>=231?raw.replace(/^このクリーチャーがブロックしたとき/,phase>=360?'このクリーチャーがブロックした時':'このクリーチャーがブロックしたとき').replace(/^このクリーチャーがバトルゾーンに出たとき/,'このクリーチャーがバトルゾーンに出た時').replace(/^このクリーチャーが攻撃するとき/,'このクリーチャーが攻撃する時'):phase>=228?raw.replace(/^このクリーチャーが攻撃するとき/,'このクリーチャーが攻撃する時'):raw);let m,known=false;
  if(phase>=542&&creature){
   const end={op:'AfterAttack542',defs:[{op:'Untap',g191First:true}]},first={
    '各ターンこのクリーチャーがはじめて攻撃する時その攻撃の後このクリーチャーをアンタップする。':[end],
    '各ターンこのクリーチャーがはじめて攻撃する時自分のD2フィールドがバトルゾーンにあれば攻撃の後このクリーチャーをアンタップする。':[{op:'IfOwn',filter:{g228Face:{type:'field',d2:true}},defs:[end]}],
    '水晶武装2:各ターンこのクリーチャーがはじめて攻撃する時自分のマナゾーンに裏向きのカードが2枚以上あればその攻撃の後このクリーチャーをアンタップする。':[{op:'IfOwn',filter:{g286FaceDownMana:2},defs:[end]}],
    'このクリーチャーが各ターンはじめて攻撃する時自分の他のクリーチャーを1体破壊してもよい。そうした場合このクリーチャーをアンタップする。':[{op:'SacrificeAlly413',other:true,defs:[{op:'Untap',g191First:true}]}]
   }[line];if(first){if(spec.g540FirstAttack)throw Error('重複する最初の攻撃誘発');spec.g540FirstAttack=first;continue;}
  }
  if(phase>=541&&creature){
   const untap={op:'Untap',g191First:true},first={
    '各ターンこのクリーチャーがはじめて攻撃する時アンタップする。':[untap],
    '各ターンこのクリーチャーがはじめて攻撃する時このクリーチャーをアンタップする。':[untap],
    'このクリーチャーは各ターンはじめて攻撃する時アンタップする。':[untap],
    '各ターンこのクリーチャーがはじめて攻撃する時自分の手札を1枚捨ててもよい。そうしたらこのクリーチャーをアンタップする。':[{op:'DiscardFor248',defs:[untap]}],
    'レインボーナス:各ターンこのクリーチャーがはじめて攻撃する時バトルゾーンに自分の多色クリーチャーがあればこのクリーチャーをアンタップする。':[{op:'IfOwn',filter:{creature:true,multi:true},defs:[untap]}],
    '各ターンこのクリーチャーがはじめて攻撃する時自分のクリーチャーの数が自分のシールドの数以上ならこのクリーチャーをアンタップする。':[{op:'IfOwn',filter:{g541CreaturesAtLeastShields:true},defs:[untap]}],
    '各ターンこのクリーチャーがはじめて攻撃する時これが進化クリーチャーならアンタップする。':[{op:'IfSource541',evolution:true,defs:[untap]}]
   }[line];if(first){if(spec.g540FirstAttack)throw Error('重複する最初の攻撃誘発');spec.g540FirstAttack=first;continue;}
   if(line==='鬼タイム:このクリーチャーが破壊された時自分と相手のシールドの数が合計6つ以下なら相手のパワー8000以下のクリーチャーを1体破壊する。'){if(death.length)throw Error('独立した破壊時能力の順序対応が必要');death.push({op:'IfOwn',filter:{g334ZoneCount:{zone:'shields',sumBoth:true,max:6}},defs:[{op:'Target',to:'grave',filter:{maxPower:8000,g199Power:true}}]});continue;}
  }
  if(phase>=653&&creature&&line==='手札から召喚するならこのクリーチャーの召喚コストを3多くする。'){
   if(spec.g653HandSummonTax)throw Error('重複する手札召喚コスト増加');
   spec.g653HandSummonTax=3;continue;
  }
  if(phase>=652&&creature&&line==='自分のクリーチャーが3体以上あればこのクリーチャーのパワーを+6000する。'){
   if(spec.g260Self)throw Error('重複する自己強化条件');
   spec.g260Self={filter:{g370BattleCount:{filter:{creature:true},min:3}},grants:{power:6000}};
   powerBonus=true;continue;
  }
  if(phase>=651&&creature){
   if(line==='このクリーチャーの召喚コストを自分の墓地にあるカード1枚につき1少なくする。ただしコストは0以下にはならない。'){
    if(spec.g212CountDiscount)throw Error('重複する墓地の枚数軽減');
    spec.g212CountDiscount={zone:'grave',filter:{},amount:1,excludeExecutingCard:true};continue;
   }
   if(line==='このクリーチャーが攻撃する時このクリーチャーの下にあるカードを1枚墓地に置いてもよい。そうしたら相手のシールドを1つ選び持ち主の墓地に置く。'){
    attack.push({op:'StackShieldGrave651'});continue;
   }
  }
  if(phase>=650&&creature){
   if(line==='このクリーチャーの攻撃中相手は「G・ストライク」を使えない。'){spec.attackNoGS=true;continue;}
   const stackedAttack='このクリーチャーが攻撃する時このクリーチャーにカードが3枚以上含まれていれば';
   const effect={
    '相手のコスト6以下のエレメントを1つ選び破壊する。':{op:'Target',to:'grave',element:true,filter:{max:6}},
    '相手のクリーチャーを1体選ぶ。このターンそのクリーチャーのパワーを-9000する。':{op:'Target',power:-9000,g242PowerMinus:true}
   }[line.startsWith(stackedAttack)?line.slice(stackedAttack.length):''];
   if(effect){attack.push({op:'IfOwn',filter:{g650SourceCards:3},defs:[effect]});continue;}
  }
  if(phase>=649&&creature){
   if(line==='各ターンに1度カードが自分のシールドゾーンを離れた時相手のクリーチャーを1体選びタップしてもよい。'){
    if(spec.g536ShieldLeft)throw Error('重複するシールド離脱能力');
    spec.g536ShieldLeft=[{op:'Target',tap:true,optional:true,title:'タップする相手のクリーチャーを1体選ぶ（任意）'}];
    spec.g536Once=true;continue;
   }
   if(line==='このクリーチャーが出た時相手のエレメントを1つ選びシールド化してもよい。'){
    entry.push({op:'Target',element:true,to:'shields',optional:true,title:'シールド化する相手のエレメントを1つ選ぶ（任意）'});continue;
   }
  }
  if(phase>=648&&creature){
   if(line==='相手のターン中自分のディスタス・クリーチャーすべてに「エスケープ」を与える。(「エスケープ」を持つクリーチャーが破壊される時かわりに自分のシールドを1つ手札に加えてもよい。その「S・トリガー」は使えない)'){
    (spec.g208Auras??=[]).push({filter:{race:'ディスタス'},grants:{escape:true},opponentTurn:true});continue;
   }
   if(line==='鬼タイム:自分と相手のシールドが合計6つ以下ならこのクリーチャーに「ササゲール4」を与える。(自分のディスペクター・クリーチャーの召喚コストを4少なくしてもよい。そうしたらこのエレメントを破壊する。ただしコストは0以下にならない)'){
    spec.g260Self={filter:{g334ZoneCount:{zone:'shields',sumBoth:true,max:6}},grants:{sasage:4}};continue;
   }
   if(line==='このクリーチャーが出た時このクリーチャーはシールドを1つブレイクする。'){
    entry.push({op:'Break278',requiresCreature:true});continue;
   }
  }
  if(phase>=647&&creature){
   if(line==='スーパーガードマン(自分の他のクリーチャーがバトルする時かわりにこのクリーチャーをタップしてバトルさせてもよい)'){spec.superGuardman=true;continue;}
   if(line==='このクリーチャーが破壊される時墓地のかわりにマナゾーンに置く。'){spec.destroyToMana=true;continue;}
   if(line==='このクリーチャーが離れた時このターン自分のクリーチャー1体に「マッハファイター」を与える。'){
    leave.push({op:'Target',owner:'self',grant:{machFighter:true},title:'マッハファイターを与える自分のクリーチャーを選ぶ'});continue;
   }
   if(line==='このクリーチャーが攻撃する時自分の山札の上から1枚をシールド化してもよい。'){
    attack.push({op:'Offer',defs:[{op:'ShieldTop',n:1}]});continue;
   }
   if(line==='オシオキムーン:カードが自分のシールドゾーンを離れた時相手は自身のアンタップしているクリーチャーを1体選び破壊する。'){
    if(spec.g536ShieldLeft)throw Error('重複するオシオキムーン');
    spec.g536ShieldLeft=[{op:'OpponentSelect',n:1,to:'grave',filter:{untapped:true}}];continue;
   }
  }
  if(phase>=646&&creature){
   if(line==='レインボーナス:自分のターン中にこのクリーチャーが破壊された時バトルゾーンに自分の多色クリーチャーがあればそのターンの終わりにこのクリーチャーを墓地からバトルゾーンに出す。'){
    death.push({op:'ScheduleGraveReturn644',condition:{creature:true,multi:true}});continue;
   }
   if(line==='このクリーチャーが出た時水のクリーチャーと火のクリーチャーを最大1体ずつ自分の墓地から手札に戻してもよい。'){
    const g646CivilizationPair=['水','火'];
    entry.push({op:'Select',origin:'grave',to:'hand',n:2,optional:true,g646CivilizationPair,
     filter:{any:g646CivilizationPair.map(color=>({g228Face:{type:'creature',color}}))},
     title:'墓地から手札に戻す水と火のクリーチャーを各1体まで選ぶ'});
    continue;
   }
  }
  if(phase>=644&&creature){
   const delayedRevival='このクリーチャーが破壊された時そのターンの終わりに';
   if(line==='自分のターンに'+delayedRevival+'このクリーチャーを自分の墓地から出す。'||phase>=645&&line.startsWith('自分のターン中に'+delayedRevival)&&['墓地からバトルゾーンに出す。','このクリーチャーを自分の墓地からバトルゾーンに出す。','このクリーチャーを自分の墓地から出す。'].includes(line.slice(('自分のターン中に'+delayedRevival).length))){
    death.push({op:'ScheduleGraveReturn644'});continue;
   }
   if(phase>=645&&line===delayedRevival+'このクリーチャーを自分の墓地から出す。'){
    death.push({op:'ScheduleGraveReturn644',anyTurn:true});continue;
   }
  }
  if(phase>=643&&creature){
   if(line==='自分のジョーカーズとマナゾーンにあるジョーカーズ・カードが合計8つ以上ならこのクリーチャーのパワーを+5000し「W・ブレイカー」を与える。(「W・ブレイカー」を持つクリーチャーはシールドを2つブレイクする)'){
    if(spec.g260Self)throw Error('重複するジョーカーズ数条件');
    spec.g260Self={filter:{g539Jokers:8},grants:{power:5000,breaker:2}};
    powerBonus=true;
    continue;
   }
   if(line==='自分のジョーカーズとマナゾーンにあるジョーカーズ・カードが合計5つ以上なければこのクリーチャーは攻撃できない。'){
    if(spec.g260Self||spec.noAttack)throw Error('重複するジョーカーズ数条件');
    spec.noAttack=true;
    spec.g260Self={filter:{g539Jokers:5},grants:{noAttack:false}};
    continue;
   }
  }
  if(phase>=540){
   if(f.typeText==='呪文'&&line==='バトルゾーンまたはマナゾーンに自分のジョーカーズが合計5枚以上あればこの呪文を唱えるコストは5少なくなる。'){if(spec.g261Discount)throw Error('重複するジョーカーズ軽減');spec.g261Discount={filter:{g539Jokers:5},amount:5};continue;}
   if(creature){
    if(line==='このクリーチャーはバトルゾーンに出たターン相手プレイヤーを攻撃できる。'){if(spec.entryPlayerAttack)throw Error('重複する登場時プレイヤー攻撃');spec.entryPlayerAttack=true;continue;}
    if(line==='このクリーチャーは可能なら毎ターン相手プレイヤーを攻撃する。'){if(spec.g540MustPlayer)throw Error('重複するプレイヤー攻撃義務');spec.g540MustPlayer=true;continue;}
    if(line==='バトルゾーンまたはマナゾーンに自分のジョーカーズが合計2枚以上あればこのクリーチャーのパワーを+3000し「W・ブレイカー」を与える。(「W・ブレイカー」を持つクリーチャーはシールドを2つブレイクする)'){if(spec.g260Self)throw Error('重複するジョーカーズ数条件');spec.g260Self={filter:{g539Jokers:2},grants:{power:3000,breaker:2}};powerBonus=true;continue;}
    if(line==='バトルゾーンまたはマナゾーンに自分のジョーカーズが合計4枚以上あれば自分のジョーカーズすべてのバトル中のパワーを+3000する。'){if(spec.g466BattleAura)throw Error('重複するジョーカーズのバトル修整');spec.g466BattleAura={filter:{creature:true,race:'ジョーカーズ'},condition:{g539Jokers:4},power:3000};continue;}
    if(line==='各ターンこのクリーチャーがはじめて攻撃する時バトルゾーンまたはマナゾーンに自分のジョーカーズが合計4枚以上あればこのクリーチャーをアンタップする。'){if(spec.g540FirstAttack)throw Error('重複する最初の攻撃誘発');spec.g540FirstAttack=[{op:'IfOwn',filter:{g539Jokers:4},defs:[{op:'Untap',g191First:true}]}];continue;}
   }
  }
  if(phase>=539&&creature){
   const joker={
    'バトルゾーンまたはマナゾーンに自分のジョーカーズが合計10枚以上あればこのクリーチャーのパワーを+8000し「T・ブレイカー」を与える。':{n:10,grants:{power:8000,breaker:3}},
    'バトルゾーンまたはマナゾーンに自分のジョーカーズが合計4枚以上あればこのクリーチャーに「パワーアタッカー+6000」と「W・ブレイカー」を与える。(「パワーアタッカー+6000」と「W・ブレイカー」を持つクリーチャーは攻撃中パワーを+6000されシールドを2つブレイクする)':{n:4,grants:{attackBonus:6000,breaker:2}}
   }[line];if(joker){if(spec.g260Self)throw Error('重複するジョーカーズ数条件');spec.g260Self={filter:{g539Jokers:joker.n},grants:joker.grants};powerBonus=true;continue;}
   if(line==='バトルゾーンまたはマナゾーンに自分のジョーカーズが合計6枚以上あればこのクリーチャーを自分のマナゾーンから召喚してもよい。'){if(spec.g539SelfMana)throw Error('重複する自己マナ召喚');spec.g539SelfMana=6;continue;}
  }
  if(phase>=536&&creature){
   const moon={
    ...(phase>=605?{'オシオキムーン:カードが自分のシールドゾーンを離れた時コスト7以下の「ブロッカー」を持つクリーチャーを1体自分の手札からバトルゾーンに出してもよい。':[instruction('コスト7以下の「ブロッカー」を持つクリーチャーを1体自分の手札からバトルゾーンに出してもよい。',phase)]}:{}),
    'オシオキムーン:カードが自分のシールドゾーンを離れた時相手のクリーチャーを1体選びタップする。':[{op:'Target',tap:true}],
    'オシオキムーン:カードが自分のシールドゾーンを離れた時相手のクリーチャーを1体選ぶ。このターンそのクリーチャーのパワーを-3000する。(パワー0以下のクリーチャーは破壊される)':[{op:'Target',power:-3000,g242PowerMinus:true}]
   }[line];
   if(moon){if(spec.g536ShieldLeft)throw Error('重複するオシオキムーン');spec.g536ShieldLeft=moon;continue;}
   if(line==='バトルゾーンにある自分のクリーチャーの数が相手より多ければこのクリーチャーは「ブロッカー」を得自分のターンの終わりにアンタップする。(「ブロッカー」を持つクリーチャーをタップして相手クリーチャーの攻撃先をこのクリーチャーに変更してもよい)'){if(spec.g260Self)throw Error('重複するクリーチャー数条件');spec.g260Self={filter:{g413MoreCreatures:true},grants:{blocker:true,g166EndUntap:true}};continue;}
  }
  if(phase>=534&&creature){
   const reduction={
    '自分のマナゾーンにあるクリーチャー1体につきこのクリーチャーの召喚コストを1少なくする。ただしコストは0より少なくならない。':{zone:'mana',filter:{creature:true},amount:1,minimum:0},
    '自分のマナゾーンにあるクリーチャー1体につきこのクリーチャーの召喚コストは1少なくなる。ただしコストは2より少なくならない。':{zone:'mana',filter:{creature:true},amount:1,minimum:2}
   }[line];
   if(reduction){if(spec.g212CountDiscount)throw Error('重複する枚数軽減');spec.g212CountDiscount=reduction;continue;}
   if(line==='マナ武装3:自分のマナゾーンに火のカードが3枚以上あればこのクリーチャーに「スピードアタッカー」を与える。(「スピードアタッカー」を持つクリーチャーは召喚酔いしない)'){if(spec.g260Self)throw Error('重複するマナ武装条件');spec.g260Self={filter:{g267Mana:{n:3,color:'火'}},grants:{speedAttacker:true}};continue;}
   if(line==='自然・光スレイヤー(このクリーチャーとバトルした相手の自然または光のクリーチャーは勝っても持ち主の墓地に置かれる)'){if(spec.g534SlayerColors)throw Error('重複する文明指定スレイヤー');spec.g534SlayerColors=['自然','光'];continue;}
  }
  if(phase>=528&&creature){
   if(line==='ラビリンス:このクリーチャーがバトルゾーンに出た時自分のシールドの数が相手より多ければ相手のクリーチャーを1体選びタップする。'){if(entry.length||nativeEntry)throw Error('独立した誘発能力の順序対応が必要');entry.push({op:'IfOwn',filter:{g334ZoneCount:{zone:'shields',moreThanOpponent:true}},defs:[{op:'Target',tap:true}]});continue;}
   if(line==='G・G・G:このクリーチャーが攻撃する時自分の手札が1枚以下ならこのクリーチャーをアンタップしカードを2枚引く。'){if(attack.length)throw Error('独立した誘発能力の順序対応が必要');attack.push({op:'IfHand246',max:1,defs:[{op:'Untap',g191First:true},{op:'Draw',n:2}]});continue;}
  }
  if(phase>=527&&creature&&(m=line.match(/^鬼タイム:このクリーチャーがバトルゾーンに出た時自分と相手のシールドの数が合計6つ以下なら相手のクリーチャーを1体選ぶ。そのターンそのクリーチャーのパワーを-(5000|7000)する。\(パワー0以下のクリーチャーは破壊される\)$/))){if(entry.length||nativeEntry)throw Error('独立した誘発能力の順序対応が必要');entry.push({op:'IfOwn',filter:{g334ZoneCount:{zone:'shields',sumBoth:true,max:6}},defs:[{op:'Target',power:-Number(m[1]),g242PowerMinus:true,title:'パワーを-'+m[1]+'する相手のクリーチャーを1体選ぶ'}]});continue;}
  if(phase>=525&&creature&&line==='このクリーチャーがバトルした時バトルの後このクリーチャーを破壊する。'){if(spec.afterBattleDie)throw Error('重複するバトル後の破壊');spec.afterBattleDie=true;continue;}
  if(phase>=524&&creature&&useBlocker524(line)){if(spec.g524OpponentUseBlocker)throw Error('重複する相手の召喚・詠唱監視');spec.g524OpponentUseBlocker=true;continue;}
  if(phase>=492&&creature){
   const inv=line.match(/^侵略[:―-](.+)\(自分の(.+)が攻撃する時自分の手札にあるこのクリーチャーをその上に重ねてもよい\)$/),alternatives=inv&&{
    '火の侵略者または火のヒューマノイド':{colors:['火'],categories:['侵略者','ヒューマノイド']},
    '自然の侵略者または自然のビーストフォーク':{colors:['自然'],categories:['侵略者','ビーストフォーク']},
    '水の侵略者または水のリキッド・ピープル':{colors:['水'],categories:['侵略者','リキッド・ピープル']},
    'コスト3以上のジョーカーズ':{colors:[...colors],anyColor:true,categories:['ジョーカーズ'],min:3}
   }[inv[1]];
   if(alternatives){if(spec.invasion||inv[1]!==inv[2])throw Error('重複または条件が一致しない種族指定の侵略');spec.invasion={...alternatives,origins:['hand']};continue;}
   if(line==='S級侵略[不死]-闇のコマンド(自分の闇のコマンドが攻撃する時自分の手札または墓地にあるこのクリーチャーをその上に重ねてもよい)'||line==='S級侵略[不死]―闇のコマンド(自分の闇のコマンドが攻撃する時自分の手札または墓地にあるこのクリーチャーをその上に重ねてもよい)'){if(spec.invasion)throw Error('重複するS級侵略');spec.invasion={colors:['闇'],categories:['コマンド'],origins:['hand','grave']};continue;}
   if(line==='このクリーチャーはコマンドにしかブロックされない。'){if(spec.g206NoBlock)throw Error('重複するブロック制限');spec.g206NoBlock={exceptRace:'コマンド'};continue;}
  }
  if(phase>=491&&creature){
   const end=line.match(/^このクリーチャーの攻撃の終わりに(.+)$/),defs=end&&{
    'カードを1枚引いてもよい。':[{op:'Offer',defs:[{op:'Draw',n:1}]}],
    '自分の山札の上から1枚目を裏向きのまま新しいシールドとして自分のシールドゾーンに置く。':[{op:'ShieldTop',n:1}],
    '自分の山札の上から1枚目をマナゾーンに置く。':[{op:'Ramp',n:1}],
    '相手のパワー3000以下のクリーチャーを1体破壊する。':[{op:'Target',to:'grave',filter:{maxPower:3000,g199Power:true}}],
    '自分の手札をすべて捨ててもよい。そうしたらカードを3枚引く。':[{op:'DiscardAll244',draw:3,optional:true}],
    ...(phase>=734?{
     'このクリーチャーを山札の下に置く。':[{op:'SelfBottom734'}],
     'このクリーチャーを自分のマナゾーンに置く。':[{op:'SelfMana297',g536Source:true}],
     '自分のクリーチャーを2体破壊する。':[{op:'Select',origin:'battle',owner:'self',to:'grave',n:2,filter:{creature:true},g187OwnPick:true,g173Targets:true,g193Select:true,title:'破壊する自分のクリーチャーを2体選ぶ'}],
     'このクリーチャーを破壊する。その後カードを2枚引く。':[{op:'SelfDestroy'},{op:'Draw',n:2}]
    }:{})
   }[end[1]];
   if(defs){if(spec.g474AttackEnd)throw Error('重複する攻撃終了時能力');spec.g474AttackEnd=defs;continue;}
   if(line==='このクリーチャーが破壊された時墓地から手札に戻す。'){if(death.length)throw Error('独立した誘発能力の順序対応が必要');death.push({op:'SelfGraveHand476'});continue;}
  }
  if(phase>=491&&evolution){
   const invade=line.match(/^侵略[:―-](光|水|闇|火|自然)の(?:コスト([1-9]\d*)以上の)?(クリーチャー|コマンド)$/);
   if(invade){if(spec.invasion)throw Error('重複する侵略');spec.invasion={colors:[invade[1]],origins:['hand'],...(invade[3]==='クリーチャー'?{anyCreature:true}:{categories:['コマンド']}),...(invade[2]?{min:+invade[2]}:{})};continue;}
  }
  if(phase>=490&&evolution){
   const invade=line.match(/^侵略[:―-](.+)\(自分の(.+)が攻撃する時自分の手札にあるこのクリーチャーをその上に(?:重ね|置い)てもよい\)$/),head=invade?.[1],civil=head?.match(/^(光|水|闇|火|自然)の(?:コスト([1-9]\d*)以上の)?(クリーチャー|コマンド|レクスターズ)$/),costFirst=head?.match(/^コスト([1-9]\d*)以上の(光|水|闇|火|自然)の(クリーチャー)$/),condition=civil?{color:civil[1],min:civil[2],kind:civil[3]}:costFirst?{color:costFirst[2],min:costFirst[1],kind:costFirst[3]}:null;
   if(invade&&condition){if(spec.invasion||head!==invade[2]&&invade[2]!=='指定のクリーチャー')throw Error('重複または条件が一致しない侵略');spec.invasion={colors:[condition.color],origins:['hand'],...(condition.kind==='クリーチャー'?{anyCreature:true}:{categories:[condition.kind]}),...(condition.min?{min:+condition.min}:{})};continue;}
  }
  if(phase>=488&&creature&&line==='自分の墓地にクリーチャーが5体以上あればこのクリーチャーはバトル中破壊されない。'){if(spec.g260Self)throw Error('重複する墓地条件のバトル破壊防止');spec.g260Self={filter:{g273Grave:{filter:{creature:true},n:5}},grants:{g34BattleSafe:true}};continue;}
  if(phase>=487&&creature){
   const change=line.match(/^革命チェンジ[:―-](.+)\(自分の(.+)が攻撃する時そのクリーチャーと手札にあるこのクリーチャーを入れ替えても(?:よい|良い)\)$/),condition=change?.[1].match(/^(光|水|闇|火|自然)(?:または(光|水|闇|火|自然))?の(?:コスト(5)以上の)?(クリーチャー|ドラゴン)$/);
   if(change&&condition){if(spec.rev||condition[1]===condition[2]||change[1]!==change[2]&&change[2]!=='指定のクリーチャー')throw Error('重複または条件が一致しない文明別革命チェンジ');spec.rev={...(condition[4]==='クリーチャー'?{any:true}:{race:'ドラゴン'}),colors:condition.slice(1,3).filter(Boolean),...(condition[3]?{min:+condition[3]}:{}),g486Current:true};continue;}
  }
  if(phase>=486&&creature){
   const change=line.match(/^革命チェンジ:((?:コスト5以上の)?(?:アビス|マジック|メカ|ジャイアント|アーマード))\(自分の(.+)が攻撃する時そのクリーチャーと手札にあるこのクリーチャーを入れ替えてもよい\)$/);
   if(change){if(spec.rev||change[1]!==change[2])throw Error('重複または条件が一致しない革命チェンジ');const min=change[1].startsWith('コスト5以上の')?5:0;spec.rev={race:change[1].replace(/^コスト5以上の/,''),...(min?{min}:{}),g486Current:true};continue;}
  }
  if(phase>=512&&creature){
   if(line==='相手の光以外の呪文を唱えるコストを4多くする。'){if(spec.g222SpellTax)throw Error('重複する呪文コスト増加');spec.g222SpellTax={opponent:true,exceptColor:'光',amount:4};continue;}
   if(line==='相手は多色ではない呪文を唱えることができない。'){if(spec.g512MultiSpellOnly)throw Error('重複する文明数による呪文制限');spec.g512MultiSpellOnly=true;continue;}
   if(line==='自分の進化クリーチャーは攻撃されない。'){const aura={filter:{creature:true,evolution:true},grants:{cannotBeAttacked:true}};if((spec.g208Auras||[]).some(a=>JSON.stringify(a)===JSON.stringify(aura)))throw Error('重複する進化クリーチャーの攻撃耐性');(spec.g208Auras??=[]).push(aura);continue;}
   if(line==='このカードは4枚以上デッキに入れることができる。'){if(spec.g314Unlimited)throw Error('重複するデッキ枚数能力');spec.g314Unlimited=true;continue;}
  }
  if(phase>=511&&creature){
   const first=line.match(/^自分のクリーチャーが攻撃する時それがそのターンはじめての攻撃であれば(.+)$/);
   if(first){
    const body=first[1],power=body.match(/^そのターンそのクリーチャーのパワーを\+([1-9]\d*)する。$/),defs=power?[{op:'AttackGrant399',power:+power[1]}]:{
     'このターンそのクリーチャーはブロックされない。':[{op:'AttackGrant399',grant:{unblockable:true}}],
     'そのターンそのクリーチャーはパワーを+5000されシールドをさらにひとつブレイクする。':[{op:'AttackGrant399',power:5000},{op:'AttackExtraBreak511',amount:1}],
     '自分のクリーチャーを1体選ぶ。そのターンそのクリーチャーに「スレイヤー」を与える。(「スレイヤー」を持つクリーチャーがバトルする時バトルの後相手クリーチャーを破壊する)':[{op:'Target',owner:'self',grant:{slayer:true}}],
     '自分の山札の上から1枚目を表向きにしてもよい。それがクリーチャーなら自分の手札に加えそれ以外ならマナゾーンに置く。':[{op:'Offer',g359RevealAll:true,defs:[{op:'Look',g255Search:true,n:1,public:true,stages:[{n:'all',to:'hand',filter:{creature:true}}],rest:'mana'}]}],
     '自分の山札の上から1枚目をマナゾーンに置いてもよい。':[{op:'Offer',defs:[{op:'Ramp',n:1}]}],
     ...(phase>=528?{
      '相手のクリーチャーを1体選びタップする。そのクリーチャーは次の相手のターンのはじめにアンタップしない。':[{op:'Target',tap:true,lock:true,g210TapLock:true}],
      '相手は自身の手札を1枚選び捨てる。':[{op:'Discard',n:1}]
     }:{})
    }[body];
    if(defs){const watch={who:'self',first:true,filter:{creature:true},g399Attacker:true,defs};if((spec.g253AttackWatches||[]).some(w=>JSON.stringify(w)===JSON.stringify(watch)))throw Error('重複する最初の攻撃の監視能力');(spec.g253AttackWatches??=[]).push(watch);continue;}
   }
  }
  if(phase>=616&&creature){
   if(line==='各ターン相手はクリーチャーを2体までしか出せない。'||line==='相手は自身のクリーチャーを各ターン2体しかバトルゾーンに出せない。'){
    spec.g616EntryLimit='eachTurn';
    continue;
   }
   if(line==='相手のターン中相手はクリーチャーを2体までしか出せない。'){
    spec.g616EntryLimit='opponentTurn';
    continue;
   }
  }
  if(phase>=615&&creature){
   if(spec.neoEvolution&&line==='侵略:火のクリーチャー(自分の火のクリーチャーが攻撃する時自分の手札にあるこのクリーチャーをその上に置いてもよい)'){
    if(spec.invasion)throw Error('重複する侵略');
    spec.invasion={colors:['火'],anyCreature:true,origins:['hand']};
    continue;
   }
   if(line==='自分の他の火のクリーチャーが攻撃する時自分の手札を1枚捨ててもよい。そうしたらカードを1枚引く。'){
    if(spec.g253AttackWatches)throw Error('重複する攻撃監視能力');
    spec.g253AttackWatches=[{who:'self',other:true,filter:{creature:true,color:'火'},defs:[{op:'DiscardDraw',n:1}]}];
    continue;
   }
   if(line==='相手のシールドが2つ以下なら自分の火のクリーチャーすべてに「スピードアタッカー」を与える。(「スピードアタッカー」を持つクリーチャーは召喚酔いしない)'){
    (spec.g208Auras??=[]).push({filter:{creature:true,color:'火'},g557Condition:{g465OpponentShieldsMax:2},grants:{speedAttacker:true}});
    continue;
   }
  }
  if(phase>=614&&creature){
   if(line==='このクリーチャーをバトルゾーンに出した時またはこのクリーチャーがバトルゾーンを離れた時バトルゾーンにある相手の「ブロッカー」を持つクリーチャー1体と相手の墓地からカードを2枚選ぶ。相手は選ばれたカードを好きな順序で自身の山札の一番下に置く。'){
    entry.push({op:'Scorpion614'});
    leave.push({op:'Scorpion614'});
    continue;
   }
   if(line==='相手は自分自身の墓地にある自然または光の呪文と同じ名前の呪文を唱えることはできない。'){
    spec.g614GraveNameSpellLock=true;
    continue;
   }
  }
  if(phase>=618&&creature&&[
   'このクリーチャーがシールドをブレイクする時相手はそのシールドを手札に加えるかわりに墓地に置く。',
   'このクリーチャーがシールドをブレイクする時相手はかわりにそのシールドを墓地に置く。'
  ].includes(line)){
   spec.shieldBurn=true;
   continue;
  }
  if(phase>=617&&creature&&line==='相手のエレメントが離れた時カードを1枚引いてもよい。'){
   spec.g617OpponentElementLeaves=true;
   continue;
  }
  const evolvingBlockerRemoval=phase>=613&&line==='このクリーチャーが進化して出た時または進化元になる時相手の「ブロッカー」を持つクリーチャーを1体選び破壊する。';
  const evolvingElementRemoval=phase>=617&&line==='このクリーチャーが進化して出た時または進化元になる時相手のコスト3以下のエレメントを1つ選び破壊する。';
  if(creature&&(evolvingBlockerRemoval||evolvingElementRemoval)){
   if(entry.length||nativeEntry||spec.g397Shinka)throw Error('重複する進化誘発能力');
   const defs=[evolvingElementRemoval?{op:'Target',to:'grave',element:true,filter:{max:3}}:{op:'Target',to:'grave',filter:{blocker:true}}];
   entry.push(...defs);
   spec.evolvedEntryOnly=true;
   spec.g397Shinka=defs;
   continue;
  }
  if(phase>=612&&creature){
   if(line==='自分のパワー6000以上のクリーチャーを召喚するコストは1少なくなる。ただしコストは0以下にならない。'){
    if(spec.g349SummonAuras)throw Error('重複する召喚軽減');
    spec.g349SummonAuras=[{filter:{minPower:6000},amount:1}];
    continue;
   }
   if(line==='各ターンはじめてクリーチャーが破壊された時カードを1枚引いてもよい。'){
    if(spec.g303DeathWatch)throw Error('重複する破壊監視能力');
    spec.g303DeathWatch={both:true,self:true,firstCreatureDeath:true,defs:[{op:'Draw',n:1,optional:true}]};
    continue;
   }
  }
  if(phase>=611&&creature){
   if(line==='シールド・セイバー(自分のシールドがブレイクされる時かわりにこれを破壊してもよい)'){
    if(spec.g401ShieldSaver)throw Error('重複するシールド・セイバー');
    spec.g401ShieldSaver=true;
    continue;
   }
   if(line==='これがバトルゾーンを離れた時相手のアンタップしているクリーチャーを1体破壊する。'){
    if(leave.length)throw Error('重複する離れた時の能力');
    leave.push({op:'Target',to:'grave',filter:{untapped:true}});
    continue;
   }
   if(line==='このクリーチャーを墓地から召喚してもよい。'){
    if(spec.graveSummon)throw Error('重複する墓地召喚');
    spec.graveSummon=true;
    continue;
   }
  }
  if(phase>=610&&creature){
   if(line==='このクリーチャーがバトルゾーンにある間相手は呪文を唱えたとき自分自身の手札を1枚選び持ち主の墓地に置く。その後相手は自分自身のマナゾーンからカードを1枚選び持ち主の墓地に置く。'){
    if(spec.g204SpellWatch)throw Error('重複する呪文監視');
    spec.g204SpellWatch={who:'opponent',defs:[{op:'Discard',n:1},{op:'ManaChoose582',who:'opponent',n:1,to:'grave'}]};
    continue;
   }
   if(line==='相手のターン中に相手が呪文を唱えた時自分の山札を見る。その中から《鏡面の翼リブラミラ》を1体バトルゾーンに出してもよい。その後山札をシャッフルする。'){
    if(spec.g204SpellWatch)throw Error('重複する呪文監視');
    spec.g204SpellWatch={who:'opponent',opponentTurn:true,defs:[{op:'LookDeploy530',g201Search:true,n:'all',limit:1,rest:'shuffle',filter:{creature:true,g201ExactName:'鏡面の翼 リブラミラ'}}]};
    continue;
   }
   if(line==='自分のターンの終わりに相手の手札が自分のより多ければカードを1枚引いてもよい。'){
    if(turnEnd.length)throw Error('重複する終了時能力');
    turnEnd.push({op:'IfOwn',filter:{g334ZoneCount:{zone:'hand',lessThanOpponent:true}},defs:[{op:'Draw',n:1,optional:true}]});
    continue;
   }
   if(line==='このクリーチャーがバトルゾーンに出た時相手のマナゾーンにあるカードの数が自分のより多ければ自分の山札の上から2枚をマナゾーンに置く。'){
    if(entry.length||nativeEntry)throw Error('独立した誘発能力の順序対応が必要');
    entry.push({op:'IfOwn',filter:{g334ZoneCount:{zone:'mana',lessThanOpponent:true}},defs:[{op:'Ramp',n:2}]});
    continue;
   }
  }
  if(phase>=609&&creature){
   const speedFilter={
    '自分のコスト4以上のクリーチャーすべてに「スピードアタッカー」を与える。':{min:4},
    'バトルゾーンにある自分のコスト3以下のクリーチャーはすべて「スピードアタッカー」を得る。':{g562MaxCost:3}
   }[line];
   if(speedFilter){
    (spec.g208Auras??=[]).push({filter:{creature:true,...speedFilter},grants:{speedAttacker:true}});
    continue;
   }
   if(line==='相手の進化クリーチャーと「スピードアタッカー」または「マッハファイター」を持つ相手のクリーチャーはタップしてバトルゾーンに出る。'){
    spec.g609TapEntry={mach:true};
    continue;
   }
   if(line==='相手の進化クリーチャーと相手の「スピードアタッカー」を持つクリーチャーはすべてバトルゾーンに出す時タップして置く。'){
    spec.g609TapEntry={mach:false};
    continue;
   }
  }
  if(phase>=632&&creature&&line==='自分の他のパワー12000以上のクリーチャーが破壊される時かわりにこのクリーチャーをマナゾーンに置いてもよい。'){
   if(spec.g571Saver)throw Error('重複する破壊置換');
   spec.g571Saver={filter:{creature:true,minPower:12000,g199Power:true},other:true,to:'mana'};
   continue;
  }
  if(phase>=608&&creature){
   const protection={
    'バトルゾーンにあるクリーチャーを相手が選ぶ時自分のコスト7以上のクリーチャーを選ぶことはできない。(ただしそのクリーチャーを攻撃またはブロックしてもよい)':{min:7},
    '相手がバトルゾーンにある自分のクリーチャーを選ぶ時パワー6000以上のクリーチャーを選ぶことはできない。(ただしそのクリーチャーを攻撃またはブロックしてもよい)':{minPower:6000,g199Power:true}
   }[line];
   if(protection){
    if(spec.g608Protect)throw Error('重複する味方保護能力');
    spec.g608Protect=protection;
    continue;
   }
  }
  if(phase>=607&&creature){
   if(line==='相手のエレメントは相手の手札以外から出ない。'){spec.g607HandOnly=true;continue;}
   if(line==='相手のエレメントの能力または呪文によって自分の手札にあるこのクリーチャーが捨てられる時墓地に置くかわりに出す。'){
    spec.g591Discard='opponentEffect607';
    continue;
   }
   if(line==='このクリーチャーにカードが3枚以上含まれていればこのクリーチャーのパワーを+6000し「パワード・ブレイカー」を与える。(「パワード・ブレイカー」を持つクリーチャーはそのパワー6000ごとにシールドをさらに1つブレイクする)'){
    spec.g607StackPower=6000;
    powerBonus=true;
    continue;
   }
  }
  if(phase>=605&&evolution){
   if(line==='自分のターンのはじめに自分のクリーチャーの中に闇と火があり自分のマナゾーンにカードが5枚以上あればこのクリーチャーを自分の墓地から出してもよい。'){
    spec.g31ZeroRise=true;
    continue;
   }
   if(line==='超無限進化:進化元のカードが2枚以上になるように自分のクリーチャー1体以上の上に置く。'){
    if(spec.evolution)throw Error('重複する進化条件');
    spec.evolution={g31:true};
    spec.g31Evolution={zone:'battle',conditions:[{creature:true}],variable:true,minCards:2};
    continue;
   }
   if(line==='このクリーチャー出た時または離れた時相手のクリーチャー1体選び破壊する。'){
    if(entry.length||leave.length||nativeEntry)throw Error('独立した誘発能力の順序対応が必要');
    entry.push({op:'Target',to:'grave'});
    leave.push({op:'Target',to:'grave'});
    continue;
   }
   if(line==='このクリーチャーがシールドをブレイクする時相手はそのシールドを手札に加えるかわりに墓地に置く。'){
    spec.shieldBurn=true;
    continue;
   }
  }
  if(phase>=604&&creature){
   if(line==='相手が自身の手札を1枚捨てた時相手のクリーチャーを1体選びタップする。次の相手のターンのはじめにそのクリーチャーはアンタップしない。'){
    if(spec.g472OpponentDiscard)throw Error('重複する相手の捨て札監視');
    spec.g472OpponentDiscard=[{op:'Target',tap:true,lock:true,g210TapLock:true}];
    continue;
   }
   if(line==='マナ武装5:自分のターンの終わりに自分のマナゾーンに闇のカードが5枚以上あれば相手は自身の手札から1枚選び残りを捨てる。'){
    if(turnEnd.length)throw Error('独立した終了時能力の順序対応が必要');
    turnEnd.push({op:'IfOwn',filter:{g267Mana:{n:5,color:'闇'}},defs:[{op:'KeepOne604',zone:'hand'}]});
    continue;
   }
  }
  if(phase>=601&&creature){
   if(line==='相手がコストを支払わずにクリーチャーをバトルゾーンに出した時そのクリーチャーを破壊する。'){spec.g601UnpaidDestroy=true;continue;}
   if(line==='バトルゾーンに自分の他のクリーチャーがあればこのクリーチャーは攻撃されない。'){
    spec.g260Self={filter:{creature:true,g334Other:true},grants:{cannotBeAttacked:true}};continue;
   }
   if(line==='相手のクリーチャーが手札以外から出た時それを持ち主のマナゾーンに置く。'){spec.g601OffHandMana=true;continue;}
   if(line==='相手のターン中にこのクリーチャーが離れた時自分の山札の上から2枚をマナゾーンに置く。その後カードを1枚自分のマナゾーンから手札に戻してもよい。'){
    if(leave.length)throw Error('独立した離れた時の能力の順序対応が必要');
    spec.g601OpponentLeave=true;
    leave.push({op:'Ramp',n:2},{op:'Select',origin:'mana',to:'hand',n:1,optional:true,g232ManaReturn:true});
    continue;
   }
  }
  if(phase>=600&&creature&&line==='相手のクリーチャーが出た時それが相手のマナゾーンにあるカードの枚数よりコストが大きいクリーチャーなら持ち主の手札に戻してもよい。'){
   spec.g600OverManaEntry=true;
   continue;
  }
  if(phase>=599&&creature&&line==='相手のクリーチャーが召喚以外の方法で出た時そのクリーチャーを破壊する。'){
   if(spec.g403Bloom)throw Error('重複する召喚以外の登場監視');
   spec.g403Bloom='eitherTurn';
   continue;
  }
  if(phase>=598&&creature){
   if(line==='相手のターン中に相手がコストを支払わずにクリーチャーをバトルゾーンに出した時相手はそれを自身の山札の一番下に置く。'){spec.g598UnpaidBottom=true;continue;}
   if(line==='ブロッカーこのクリーチャーは攻撃することができない。このクリーチャーをバトルゾーンに出した時いずれかのプレイヤーの墓地からカードを1枚選んでもよい。そのプレイヤーはそのカードを自身の山札に加えてシャッフルする。'){
    spec.blocker=true;
    spec.noAttack=true;
    entry.push({op:'GravePick598',mode:'shuffle',n:1});
    continue;
   }
  }
  if(phase>=597&&creature){
   const lock={
    'このクリーチャーがタップされている時相手は呪文の「S・トリガー」を使えない。':{tapped:true,type:'spell'},
    'このクリーチャーがタップされている時相手はクリーチャーの「S・トリガー」能力を使えない。':{tapped:true,type:'creature'},
    '相手のシールドが4枚以上の時相手は自分自身の「S・トリガー」を使えない。':{minShields:4},
    'バトルゾーンにある自分のクリーチャーですべての文明が揃っている時相手は自分自身の「S・トリガー」を使えない。':{allColors:true},
    '相手はこのクリーチャーがブレイクするシールドの「S・トリガー」を使えない。':{ownBreak:true}
   }[line];
   if(lock){if(spec.g597TriggerLock)throw Error('重複するS・トリガー制限');spec.g597TriggerLock=lock;continue;}
  }
  if(phase>=596&&creature&&line==='他のクリーチャーが破壊された時そのターンバトルゾーンにある相手のクリーチャーすべてのパワーは-1000される。'){
   if(spec.g303DeathWatch)throw Error('重複する破壊監視能力');
   spec.g303DeathWatch={both:true,defs:[{op:'GroupPower',power:-1000}]};
   continue;
  }
  if(phase>=595&&creature){
   const watches={
    '相手が自身のターン中に呪文を唱えた時相手のクリーチャーを1体選び持ち主の手札に戻してもよい。':{opponentTurn:true,defs:[{op:'Target',to:'hand',optional:true}]},
    '相手が火または自然の呪文を唱えた時相手のマナゾーンからカードを2枚まで選び持ち主の手札に戻す。':{colorsAny:['火','自然'],defs:[{op:'Select',owner:'opponent',origin:'mana',to:'hand',n:2,optional:true}]},
    '相手が光または水の呪文を唱えた時相手の光または水のパワー5000以下のクリーチャーを1体破壊する。':{colorsAny:['光','水'],defs:[{op:'Target',to:'grave',filter:{any:[{color:'光'},{color:'水'}],maxPower:5000,g199Power:true}}]},
    '相手が呪文を唱えた時その呪文と同じコストを持つ進化ではないクリーチャーを1体自分の手札からバトルゾーンに出してもよい。':{defs:[{op:'CastCostDeploy595'}]}
   }[line];
   if(watches){
    if(spec.g204SpellWatch)throw Error('重複する呪文監視');
    spec.g204SpellWatch={who:'opponent',...watches};
    continue;
   }
   if(line==='自分の他のクリーチャー1体につき相手の呪文を唱えるコストを1多くする。'){
    if(spec.g222SpellTax)throw Error('重複する呪文コスト増加');
    spec.g222SpellTax={opponent:true,perOtherCreature:true};
    continue;
   }
   if(line==='革命2―自分のシールドが2つ以下なら相手は光以外の呪文を唱えられない。'){
    if(spec.g260Self)throw Error('重複するシールド条件');
    spec.g260Self={filter:{g265ShieldsMax:2},grants:{g595NonLightSpellLock:true}};
    continue;
   }
  }
  if(phase>=593){
   if(creature&&/^相手のクリーチャーが出た時(?:この|その)ターンそのクリーチャーは攻撃できない。$/.test(line)){
    if(spec.g593EntryStop)throw Error('重複する登場時攻撃制限');
    spec.g593EntryStop=true;
    continue;
   }
   if(creature&&line==='相手がこのクリーチャーを選んだ時相手のクリーチャーを1体選ぶ。このターンそのクリーチャーのパワーを-3000する。'){
    if(spec.g447Selected)throw Error('重複する被選択時能力');
    spec.g447Selected=[{op:'Target',power:-3000,g242PowerMinus:true}];
    continue;
   }
   if(f.typeText==='呪文'&&line==='水晶チャージャー(この呪文を唱えた後墓地に置くかわりに裏向きにしてマナゾーンに置く)'){
    if(spec.crystalCharger)throw Error('重複する水晶チャージャー');
    spec.crystalCharger=true;
    continue;
   }
  }
  if(phase>=592&&creature&&line==='カードは墓地を離れない。'){
   if(spec.g592GravesStay)throw Error('重複する墓地移動禁止');
   spec.g592GravesStay=true;
   continue;
  }
  if(phase>=592&&creature&&line==='墓地から呪文を唱えられない。'){
   if(spec.g592GraveSpellLock)throw Error('重複する墓地呪文禁止');
   spec.g592GraveSpellLock=true;
   continue;
  }
  if(phase>=591&&creature){
   const optionalDiscard=line.match(/^相手の呪文の効果または(?:相手の)?クリーチャーの能力によってこのクリーチャーが自分の手札から捨てられる時墓地に置くかわりにバトルゾーンに(?:出して|置いて|出しカードを2枚引いて)もよい。$/);
   const mandatoryDiscard=/^相手のターン中(?:に)?このクリーチャーが(?:自分の)?手札から捨てられる時墓地に置くかわりに(?:バトルゾーンに)?(?:出す|置く)。$/.test(line);
   if(optionalDiscard||mandatoryDiscard){
    if(spec.g591Discard||spec.discardDeploy||spec.enemyDiscardDeploy)throw Error('重複する手札破壊の置換');
    spec.g591Discard=mandatoryDiscard?'opponentTurn':line.includes('カードを2枚')?'drawTwo':'opponentEffect';
    continue;
   }
   const abilities={
    '相手が自身のマナゾーンにあるカードの枚数よりコストが大きいクリーチャーをバトルゾーンに出した時相手はそれを山札の一番下に置く。':{recommendRole:'mixel'},
    '相手の呪文の効果またはクリーチャーの能力によって自分の手札は捨てられない。':{g591HandShield:true},
    ...(phase>=625?{'相手の呪文またはクリーチャーの能力によって自分の手札は捨てられない。':{g591HandShield:true}}:{}),
    '自分の手札が5枚以上あればこのクリーチャーのパワーは+4000され「W・ブレイカー」を得る。':{g247HandStats:{min:5,power:4000,breaker:2}}
   }[line];
   if(abilities){
    if(Object.keys(abilities).some(k=>k in spec))throw Error('重複する手札破壊の対策能力');
    Object.assign(spec,abilities);
    if(abilities.g247HandStats)powerBonus=true;
    continue;
   }
  }
  if(phase>=590&&creature){
   const abilities={
    '相手は自身のマナゾーンにあるカードの枚数よりコストが大きいクリーチャーをバトルゾーンに出す時かわりにそのクリーチャーをマナゾーンに置く。':{g26Queen:true},
    '相手が自身のマナゾーンにあるカードの枚数より大きいコストを持つクリーチャーをバトルゾーンに出す時相手はかわりにそのクリーチャーをマナゾーンに置く。':{g26Queen:true},
    'ストライク・バックS・バック:闇または火(闇または火のカードを自分のシールドゾーンから手札に加える時そのカードを捨ててもよい。そうしたらコストを支払わずにこのクリーチャーを召喚する)':{strikeBack:true,strikeBackColors:['闇','火']},
    '鬼エンド:シールドが1つもないプレイヤーがいればこのクリーチャーに「ブロッカー」と「スレイヤー」を与える。':{g260Self:{filter:{g590AnyEmptyShields:true},grants:{blocker:true,slayer:true}}},
    '相手は各ターンに一度しか呪文を唱えられない。':{g590SpellOnce:true},
    'このクリーチャーがどこからでも自分の墓地に置かれた時墓地をシャッフルし自分の山札の一番下に置く。':{g590SelfGraveBottom:true}
   }[line];
   if(abilities){
    if(Object.keys(abilities).some(k=>k in spec))throw Error('重複する対策能力');
    Object.assign(spec,abilities);
    continue;
   }
   if(line==='マスター・ブラスター(このクリーチャーが攻撃する時バトルゾーンまたはマナゾーンに自分のジョーカーズが合計4枚以上あればバトルゾーンにある相手のカードを1枚選ぶ。相手はそれを自身の山札の一番下に置く)'){
    if(attack.length)throw Error('重複する攻撃時能力');
    attack.push({op:'IfOwn',filter:{g539Jokers:4},defs:[{op:'Target',to:'deck',element:true}]});
    continue;
   }
   if(line==='自分のターンの終わりにこのクリーチャーがタップしていたらカードを1枚引いてもよい。'){
    if(turnEnd.length)throw Error('重複するターン終了時能力');
    turnEnd.push({op:'IfOwn',filter:{g590SourceTapped:true},defs:[{op:'Offer',title:'カードを1枚引く？',defs:[{op:'Draw',n:1}]}]});
    continue;
   }
  }
  if(phase>=589&&creature){
   if(/^相手のターン中に相手(?:が|のクリーチャーが)召喚以外の方法で(?:クリーチャーを)?(?:バトルゾーンに)?出(?:した|た)時そのクリーチャーを破壊する。$/.test(line)){
    if(spec.g403Bloom)throw Error('重複する召喚以外の登場監視');
    spec.g403Bloom=true;
    continue;
   }
   if(line==='相手のターン中に相手のクリーチャーが召喚以外の方法で出る時相手はかわりにそのクリーチャーを墓地に置く。'){
    if(spec.noNonsummonEntry)throw Error('重複する召喚以外の登場置換');
    spec.noNonsummonEntry=true;
    continue;
   }
  }
  if(phase>=588&&creature){
   const hand=line.match(/^自分の(クリーチャー|火のドラゴン|《GF隊少尉飛剣のエース》|《GF隊中佐爆音のジャック》)がバトルに勝った時このクリーチャーを自分の手札からバトルゾーンに出してもよい。$/);
   if(hand){
    if(spec.g588HandWin)throw Error('重複するバトル勝利時の手札宣言');
    const filters={
     'クリーチャー':{},
     '火のドラゴン':{race:'ドラゴン',color:'火'},
     '《GF隊少尉飛剣のエース》':{g201ExactName:'GF隊少尉 飛剣のエース'},
     '《GF隊中佐爆音のジャック》':{g201ExactName:'GF隊中佐 爆音のジャック'}
    };
    const filter=filters[hand[1]];
    spec.g588HandWin={creature:true,...filter};
    continue;
   }
   if(line==='自分の他の火のクリーチャーが相手クリーチャーとバトルする時かわりにこのクリーチャーにバトルさせてもよい。'){
    if(spec.g588FireBattleReplace)throw Error('重複するバトル置換');
    spec.g588FireBattleReplace=true;
    continue;
   }
   if(line==='各ターンこのクリーチャーがはじめてバトルに勝った時アンタップする。'){
    if(battleWin.length||spec.g588FirstSelfWin)throw Error('重複するバトル勝利時能力');
    spec.g588FirstSelfWin=true;
    battleWin.push({op:'Untap'});
    continue;
   }
   const watches={
    '自分のクリーチャーがバトルに勝った時カードを1枚引く。':{defs:[{op:'Draw',n:1}]},
    '自分のハンターがバトルに勝った時自分の山札の上から2枚を見てもよい。そうした場合そのうちの1枚を自分の手札に加えもう1枚を山札の一番下に置く。':{filter:{race:'ハンター'},defs:[instruction588(line.slice('自分のハンターがバトルに勝った時'.length))]},
    '自分のクリーチャーがバトルに勝った時自分の山札の上から1枚目を見る。それを自分の手札またはマナゾーンに加えてもよい。':{defs:[instruction588(line.slice('自分のクリーチャーがバトルに勝った時'.length))]},
    '自分のクリーチャーがこのターンはじめてバトルに勝った時このターンこのクリーチャーのパワーを+8000し「T・ブレイカー」を与える。(「T・ブレイカー」を持つクリーチャーはシールドを3つブレイクする)':{first:true,defs:[{op:'SelfBoost313',power:8000,breaker:3}]},
    '自分の他のクリーチャーがバトルに勝った時そのターンこのクリーチャーのパワーを+3000する。':{other:true,defs:[{op:'SelfBoost313',power:3000}]},
    '自分のドリームメイトがバトルに勝った時バトルゾーンにある自分のクリーチャー1体はそのターンの終わりまで「スピードアタッカー」と「W・ブレイカー」を得る。(「スピードアタッカー」と「W・ブレイカー」を得たクリーチャーは召喚酔いせずシールドを2枚ブレイクする)':{filter:{race:'ドリームメイト'},defs:[{op:'Target',owner:'self',grant:{speedAttacker:true,g313Breaker:2},title:'スピードアタッカーとW・ブレイカーを与えるクリーチャーを選ぶ'}]},
    '自分の他のクリーチャーがバトルに勝った時バトルゾーンにある相手のクリーチャーを1体選んでもよい。そのクリーチャーと選んだクリーチャーをバトルさせる。':{other:true,winner:true,defs:[{op:'AttackFight408'}]}
   },watch=watches[line];
   if(watch){
    if(spec.g252WinWatch)throw Error('重複するバトル勝利監視能力');
    spec.g252WinWatch={...watch,filter:{creature:true,...watch.filter}};
    continue;
   }
  }
  if(phase>=587&&creature){
   const abilities={
    '自分の光のコスト6以下のクリーチャーはすべてのバトルに勝つ。':{g466BattleAura:{filter:{creature:true,color:'光',max:6},win:true}},
    '呪文の効果によって相手がクリーチャーを選ぶ時このクリーチャーは選べない。':{spellUntargetable:true},
    '攻撃中このクリーチャーはすべてのバトルに勝つ。':{g587AttackWins:true},
    'このクリーチャーがアンタップしていればこのクリーチャーはすべてのバトルに勝つ。':{g587UntappedWins:true},
    '自分の他のクリーチャーがバトルゾーンに出た時このターンこのクリーチャーはすべてのバトルに勝つ。':{g314OtherEntry:{who:'self',defs:[{op:'ShinkaGrant397',grant:{g34AlwaysWin:true}}]}},
    '自分のクリーチャーがこのターンはじめてバトルに勝った時このターンこのクリーチャーのパワーを+3000する。':{g252WinWatch:{filter:{creature:true},first:true,defs:[{op:'SelfBoost313',power:3000}]}},
    'このターン自分のクリーチャーがバトルに勝った後でしかこのクリーチャーは攻撃できない。':{g225AttackRequires:{kind:'ownBattleWin'}}
   }[line];
   if(abilities){
    if(Object.keys(abilities).some(k=>k in spec))throw Error('重複するバトル関連能力');
    Object.assign(spec,abilities);
    continue;
   }
   const wins={
    'このクリーチャーがバトルに勝った時このクリーチャーをアンタップしてもよい。':[{op:'Offer',title:'このクリーチャーをアンタップする？',defs:[{op:'Untap'}]}],
    'このクリーチャーがバトルに勝った時このクリーチャーをアンタップし相手のシールドを2枚ブレイクする。':[{op:'Untap'},{op:'Break497',n:2}],
    '破天九語:このクリーチャーがバトルに勝った時相手のシールドを9つブレイクする。':[{op:'Break497',n:9}]
   }[line];
   if(wins){
    if(battleWin.length)throw Error('重複するバトル勝利時能力');
    battleWin.push(...wins);
    continue;
   }
   if(evolution&&line==='進化ー自分のドラゴン1体の上に置く。'){
    if(spec.evolution)throw Error('重複する進化条件');
    spec.evolution={category:'ドラゴン'};
    continue;
   }
  }
  if(phase>=586&&creature){
   const auras={
    '自分の火のクリーチャーがバトルする時そのバトルの終わりまでそのクリーチャーのパワーは+3000される。':{filter:{creature:true,color:'火'},power:3000},
    '自分のドラゴンがバトルする時そのバトル中そのドラゴンのパワーは+7000される。':{filter:{creature:true,race:'ドラゴン'},power:7000}
   };
   if(auras[line]){
    if(spec.g466BattleAura)throw Error('重複するバトル中の強化');
    spec.g466BattleAura=auras[line];
    continue;
   }
   const watches={
    '自分のアーク・セラフィムがバトルに勝った時自分の山札の上から2枚を自分のマナゾーンに加える。':{filter:{creature:true,race:'アーク・セラフィム'},defs:[{op:'Ramp',n:2}]},
    '自分の他のクリーチャーがバトルに勝った時そのターンこのクリーチャーのパワーを+4000する。':{filter:{creature:true},other:true,defs:[{op:'SelfBoost313',power:4000}]}
   };
   if(watches[line]){
    if(spec.g252WinWatch)throw Error('重複するバトル勝利監視能力');
    spec.g252WinWatch=watches[line];
    continue;
   }
   if(line==='自分の進化クリーチャーが攻撃する時相手のクリーチャーを1体選んでもよい。その2体をバトルさせる。'){
    if(spec.g253AttackWatches)throw Error('重複する進化クリーチャーの攻撃監視');
    spec.g253AttackWatches=[{who:'self',filter:{creature:true,evolution:true},g399Attacker:true,defs:[{op:'AttackFight408'}]}];
    continue;
   }
   if(line==='相手のクリーチャーが破壊された時カードを1枚引く。'){
    if(spec.g303DeathWatch)throw Error('重複する破壊監視能力');
    spec.g303DeathWatch={opponent:true,defs:[{op:'Draw',n:1}]};
    continue;
   }
   if(line==='このクリーチャーがバトルゾーンに出たとき各プレイヤーはバトルゾーンにあるパワー3000以下のクリーチャーすべてをそれぞれの墓地に置く。'){
    if(entry.length||nativeEntry)throw Error('重複する登場時能力');
    entry.push(instruction586(line.slice('このクリーチャーがバトルゾーンに出たとき'.length)));
    continue;
   }
  }
  if(phase>=585&&creature){
   if(line==='自分のターンのはじめに自分のシールドをひとつ手札に加えてもよい。ただしその「S・トリガー」は使えない。'){
    if(turnStart.length)throw Error('重複するターン開始時能力');
    turnStart.push(shieldHand585);
    spec.g461TurnPlayer=true;
    continue;
   }
   if(line==='自分のクリーチャーが攻撃する時それがそのターンはじめての攻撃であればいずれかのシールドゾーンからシールドをひとつ選んで見る。'){
    if(spec.g253AttackWatches)throw Error('重複する攻撃監視能力');
    spec.g253AttackWatches=[{who:'self',first:true,filter:{creature:true},defs:[{op:'Peek585',who:'both'}]}];
    continue;
   }
   const oldEntry=line.match(/^このクリーチャーがバトルゾーンに出たとき(.+)$/);
   const peek=oldEntry&&instruction585(oldEntry[1]);
   if(peek){
    if(entry.length||nativeEntry)throw Error('重複する登場時能力');
    entry.push(peek);
    continue;
   }
  }
  if(phase>=584&&creature&&line==='相手のクリーチャーが破壊された時相手の手札を1枚見ないで選び捨てさせる。'){
   if(spec.g303DeathWatch)throw Error('重複する破壊監視能力');
   spec.g303DeathWatch={opponent:true,defs:[{op:'Discard',n:1,random:true}]};
   continue;
  }
  if(phase>=583&&creature){
   const old=line.match(/^このクリーチャーが(?:バトルゾーンに出たとき|バトルゾーンから自分の墓地に置かれるとき)(.+)$/);
   const def=old&&instruction583(old[1]);
   if(def){
    const dest=line.startsWith('このクリーチャーがバトルゾーンに')?entry:death;
    if(dest.length||dest===entry&&nativeEntry)throw Error('重複するマナ移動能力');
    dest.push(def);
    continue;
   }
   const watch=line.match(/^自分のドラゴンが攻撃する時(.+)$/),returnMana=watch&&instruction583(watch[1]);
   if(returnMana?.g583OnMove){
    if(spec.g253AttackWatches)throw Error('重複するドラゴンの攻撃監視');
    spec.g253AttackWatches=[{who:'self',filter:{creature:true,race:'ドラゴン'},defs:[returnMana]}];
    continue;
   }
  }
  if(phase>=582&&creature){
   if(['相手は自身のマナゾーンにカードを置く時タップして置く。','相手のカードはタップしてマナゾーンに置く。'].includes(line)){
    spec.opponentManaTap=true;
    continue;
   }
   const oldTrigger=line.match(/^このクリーチャーが(?:バトルゾーンに出たとき|バトルゾーンから(?:自分の)?墓地に置かれるとき|攻撃するとき)(.+)$/);
   const choice=oldTrigger&&instruction582(oldTrigger[1]);
   if(choice){
    const dest=line.startsWith('このクリーチャーがバトルゾーンに')?entry:line.startsWith('このクリーチャーが攻撃')?attack:death;
    if(dest.length||dest===entry&&nativeEntry)throw Error('重複するマナ選択能力');
    dest.push(choice);
    continue;
   }
   const selected=line.match(/^相手がこのクリーチャーを選んだ時(.+)$/),keep=selected&&manaKeep582(selected[1]);
   if(keep){
    if(spec.g447Selected)throw Error('重複する被選択時能力');
    spec.g447Selected=[keep];
    continue;
   }
  }
  if(phase>=581&&creature&&line==='各プレイヤーのターンのはじめにそのプレイヤーは手札またはバトルゾーンにある自身のカードを1枚選び持ち主の墓地に置く。'){
   if(turnStart.length||opponentStart.length)throw Error('重複するターン開始時能力');
   const def={op:'OwnCard581',who:'active',zones:['hand','battle'],to:'grave'};
   turnStart.push(def);opponentStart.push(structuredClone(def));
   continue;
  }
  if(phase>=581&&f.typeText==='呪文'&&line==='S(シールド)・トリガー(この呪文をシールドゾーンから手札に加えるときコストを支払わずにすぐ唱えてよい)'){
   spec.trigger=true;
   continue;
  }
  if(phase>=580&&creature){
   if(line==='自分の水のコマンドはブロックされない。'){
    (spec.g208Auras??=[]).push({filter:{creature:true,color:'水',race:'コマンド'},grants:{unblockable:true}});
    continue;
   }
   if(line==='相手のターン中このクリーチャーが破壊される時墓地に置くかわりに手札に戻す。'){
    if(spec.g260Self)throw Error('重複する自己条件');
    spec.g260Self={filter:{creature:true},turn:'opponent',grants:{destroyToHand:true}};
    continue;
   }
   const attacked=line.match(/^このクリーチャーが攻撃した時(.+)$/),move=attacked&&battleCard579(attacked[1]);
   if(move){
    if(attack.length)throw Error('独立した誘発能力の順序対応が必要');
    attack.push(move);
    continue;
   }
  }
  if(phase>=579&&creature&&line==='シビルカウント3:自分の水のクリーチャーまたは水のタマシードが合計3つ以上あればこのクリーチャーのパワーは+6000され「W・ブレイカー」を得相手に選ばれない。(ただしこのクリーチャーを攻撃またはブロックしてもよい)'){
   if(spec.g260Self||powerBonus)throw Error('重複するシビルカウント条件');
   spec.g260Self={filter:{creatureOrSeed:true,color:'水',g258Civil:3},grants:{power:6000,breaker:2,untargetable:true}};
   powerBonus=true;
   continue;
  }
  if(phase>=627&&creature){
   if(line==='このクリーチャーが出た時または攻撃する時次のうちいずれか1つを選ぶ。'&&
    normalize(lines[i+1]||'')==='▶自分の山札の上から1枚目をシールド化する。'&&
    normalize(lines[i+2]||'')==='▶次の自分のターンのはじめまでこのクリーチャーは離れない。'){
    if(entry.length||attack.length||nativeEntry)throw Error('独立する登場・攻撃時能力の順序対応が必要');
    const def={op:'Choose',g184Modes:true,modes:[
     {label:'山札の上から1枚シールド化する',defs:[{op:'ShieldTop',n:1}]},
     {label:'次の自分のターンのはじめまでバトルゾーンを離れない',defs:[{op:'Stay627'}]}
    ]};
    entry.push(def);attack.push(structuredClone(def));
    i+=2;continue;
   }
   if(line==='カードが自分のシールドゾーンから離れた時このクリーチャーをアンタップする。'){
    if(spec.g536ShieldLeft)throw Error('重複するシールド離脱能力');
    spec.g536ShieldLeft=[{op:'Untap',g191First:true}];
    continue;
   }
  }
  if(phase>=626&&creature&&line==='シビルカウント3:このクリーチャーが出た時自分の火のクリーチャーまたは火のタマシードが合計3つ以上なければこのクリーチャーを破壊する。'){
   if(spec.g527ExtraEntry)throw Error('重複する追加の登場能力');
   spec.g527ExtraEntry=[{label:'シビルカウント3',defs:[{op:'IfOwn',filter:{creatureOrSeed:true,color:'火',g258Civil:3},defs:[],elseDefs:[{op:'SelfDestroy'}]}]}];
   continue;
  }
  if(phase>=624&&creature){
   const response={
    '相手の多色クリーチャーが出た時このクリーチャーとバトルさせてもよい。':'multicolorFight',
    '相手のクリーチャーが相手のマナゾーンのカードをタップせずに出た時それをシールド化してもよい。':'untappedManaShield'
   }[line];
   if(response){
    if(spec.g624EntryResponse)throw Error('重複する相手の登場監視');
    spec.g624EntryResponse=response;
    continue;
   }
  }
  if(phase>=623&&creature){
   const entryOrSpell='このクリーチャーが出た時または自分が呪文を唱えた時';
   if(line===entryOrSpell+'相手のクリーチャーを1体選びタップする。そのクリーチャーは次の相手のターンのはじめにアンタップしない。'){
    if(entry.length||nativeEntry||spec.g204SpellWatch)throw Error('重複する登場・呪文誘発能力');
    const def=instruction(line.slice(entryOrSpell.length),phase);
    entry.push(def);
    spec.g204SpellWatch={who:'self',defs:[def]};
    continue;
   }
   if(line==='自分の呪文を唱えるコストを最大3少なくする。ただしコストは0以下にはならない。'){
    if(spec.g485SpellReduction)throw Error('重複する任意呪文軽減');
    spec.g485SpellReduction=3;
    continue;
   }
   if(line==='自分のクリーチャーが出た時または自分が呪文を唱えた時次のうちいずれか1つを選ぶ。'){
    if(spec.g250EntryDraw||spec.g204SpellWatch)throw Error('重複する登場・呪文誘発能力');
    const modes=[];
    while(i+1<lines.length&&normalize(lines[i+1]).startsWith('▶')){
     const label=lines[++i].replace(/^\s*▶/,'').trim(),def=instruction(normalize(label),phase);
     if(!def)throw Error('未対応の選択能力: '+label);
     modes.push({label,defs:[def]});
    }
    if(modes.length<2)throw Error('選択能力の不足');
    const defs=[{op:'Choose',g184Modes:true,modes}];
    spec.g250EntryDraw={self:true,filter:{creature:true},defs};
    spec.g204SpellWatch={who:'self',defs};
    continue;
   }
  }
  if(phase>=622&&creature){
   if(line==='自分のクリーチャーがバトルに勝った時自分の山札の上から1枚を見て手札に加えるかマナゾーンに置く。その後自分のマナゾーンにあるカードをすべてアンタップする。'){
    if(spec.g252WinWatch)throw Error('重複するバトル勝利監視能力');
    spec.g252WinWatch={filter:{creature:true},defs:[
     {op:'Look',n:1,stages:[{n:1,g467Destinations:['hand','mana']}],rest:'top'},
     {op:'UntapMana',g216UntapMana:true}
    ]};
    continue;
   }
   if(line==='このクリーチャーがバトルに勝った時バトルの後このクリーチャーをアンタップしてもよい。'){
    if(battleWin.length)throw Error('重複するバトル勝利時能力');
    battleWin.push({op:'Offer',title:'このクリーチャーをアンタップする？',defs:[{op:'Untap'}]});
    continue;
   }
  }
  if(phase>=621&&creature){
   const nonSummon={
    '相手のクリーチャーが召喚以外の方法で出た時ターンの残りをとばしてもよい。':'skip',
    '相手のクリーチャーが召喚以外の方法で出た時それを持ち主の山札の下に置く。':'bottom'
   }[line];
   if(nonSummon){
    if(spec.g621NonSummon)throw Error('重複する召喚以外の登場監視');
    spec.g621NonSummon=nonSummon;continue;
   }
   if(line==='相手のクリーチャーが出た時自分はカードを1枚引いてもよい。'){
    if(spec.g314OtherEntry)throw Error('重複する登場監視');
    spec.g314OtherEntry={who:'opponent',defs:[{op:'Draw',n:1,optional:true}]};continue;
   }
   if(line==='各ターンの終わりに自分の進化クリーチャーをすべてアンタップする。'){
    if(spec.g474AnyEnd)throw Error('重複するターン終了時能力');
    spec.g474AnyEnd=[{op:'GroupUntap',filter:{creature:true,evolution:true}}];continue;
   }
  }
  if(phase>=619&&creature){
   if(phase>=635&&line==='自分のクリーチャーがこのクリーチャーだけならこのクリーチャーは離れない。'){
    if(spec.g619Stay)throw Error('重複する離れない条件');
    spec.g619Stay={g479OnlyCreature:true};continue;
   }
   const tax={
    '相手の多色カードを使うコストを2多くする。':{kind:'multicolor',amount:2},
    '相手の呪文またはクリーチャーではないタマシードを使うコストを1多くする。':{kind:'spellOrSeed',amount:1},
    '相手のクリーチャーではないカードを実行するコストを1多くする。':{kind:'noncreature',amount:1}
   }[line];
   if(tax){
    if(spec.g619Tax)throw Error('重複する実行コスト増加');
    spec.g619Tax=tax;continue;
   }
   if(line==='シビルカウント3:自分の光のクリーチャーまたは光のタマシードが合計3つ以上あればこのクリーチャーは離れない。'){
    if(spec.g619Stay)throw Error('重複するシビルカウント条件');
    spec.g619Stay={creatureOrSeed:true,color:'光',g258Civil:3};continue;
   }
   if(f.typeText==='G-NEOクリーチャー'){
    const gneo=line.match(/^G-NEO進化:(?:((?:光|水|闇|火|自然){1,2}(?:または(?:光|水|闇|火|自然))?)の)?クリーチャー1体の上に置いてもよい。(?:\(カードが下にあればNEO進化クリーチャーとして扱い離れる時かわりに下のカードすべてが離れる\))?$/);
    const prior=line==='G-NEO進化:水闇または火のクリーチャー1体の上に置いてもよい。(カードが下にあればNEO進化クリーチャーとして扱い離れる時かわりに下のカードすべてが離れる)';
    if(gneo&&(phase>=620||prior)){
     const colors=gneo[1]?.match(/光|水|闇|火|自然/g)||[];
     if(spec.neoEvolution||new Set(colors).size!==colors.length)throw Error('重複するG-NEO進化条件');
     spec.gNeo=true;spec.neoEvolution={any:colors.length?colors.map(civilization=>({civilization})):[{creature:true}]};continue;
    }
   }
  }
  if(phase>=577&&creature){
   if(line==='相手のクリーチャーが攻撃する時このクリーチャーは可能であればブロックする。'){
    spec.mustBlock=true;
    continue;
   }
   const stay={
    'このクリーチャーがバトルゾーンを離れる時そのパワーが0より大きければ離れるかわりにとどまる。':{},
    '相手のターン中にこのクリーチャーがバトルゾーンを離れる時そのパワーが0より大きければ離れるかわりにバトルゾーンにとどまる。':{opponentTurn:true},
    'マナ武装5:このクリーチャーがバトルゾーンを離れる時そのパワーが0より大きく自分のマナゾーンに光のカードが5枚以上あればこのクリーチャーはバトルゾーンを離れるかわりにとどまる。':{lightMana:5}
   }[line];
   if(stay){
    if(spec.g577Stay)throw Error('重複するバトルゾーン残留能力');
    spec.g577Stay=stay;
    continue;
   }
  }
  if(phase>=576&&creature){
   if(line==='革命チェンジ:コスト7以上のアンノウンまたはゼニス(自分のコスト7以上のアンノウンまたはゼニスが攻撃する時そのクリーチャーと手札にあるこのクリーチャーを入れ替えてもよい)'){
    if(spec.rev)throw Error('重複する革命チェンジ');
    spec.rev={categories:['アンノウン','ゼニス'],min:7,g486Current:true};
    continue;
   }
   const optionalMana={
    '自分のエレメントが破壊される時墓地に置くかわりにマナゾーンに置いてもよい。':{filter:{element:true}},
    '自分のクリーチャーが破壊される時墓地のかわりにマナゾーンに置いてもよい。':{filter:{creature:true}},
    'このクリーチャーまたは自分の他のドラゴンが破壊される時墓地に置くかわりに自分のマナゾーンに置いてもよい。':{filter:{race:'ドラゴン'},self:true},
    '自分のアーク・セラフィムまたはセイント・ヘッドが破壊される時墓地に置くかわりに自分のマナゾーンに置いてもよい。':{filter:{raceAny:['アーク・セラフィム','セイント・ヘッド']}},
    '自分の光水闇または火のクリーチャーが破壊される時そのクリーチャーを墓地に置くかわりにマナゾーンに置いてもよい。':{filter:{creature:true,any:['光','水','闇','火'].map(color=>({color}))}}
   }[line];
   if(optionalMana){
    if(spec.g575ManaAura)throw Error('重複する破壊時のマナ置換');
    spec.g575ManaAura={...optionalMana,optional:true};
    continue;
   }
  }
  if(phase>=852&&creature){
   if(line==='このクリーチャーが攻撃する時自分の山札の上から1枚目を見る。そのカードがクロスギアならバトルゾーンに出しこのクリーチャーをアンタップしてもよい。'){
    attack.push({op:'Unryu852'});
    continue;
   }
   if(line==='自分のティラノ・ドレイクまたはブレイブ・スピリットが攻撃してブロックされなかった時相手は自分自身の手札を1枚選んで捨てる。'){
    spec.g852UnblockedDiscard=['ティラノ・ドレイク','ブレイブ・スピリット'];
    continue;
   }
   if(line==='このクリーチャーが破壊された時自分の山札を見る。その中からクロスギアを1枚選びバトルゾーンに出してもよい。その後山札をシャッフルする。'){
    death.push({op:'LookDeploy530',g201Search:true,g841DeckPeek:true,limit:1,rest:'shuffle',filter:{g201Gear:true},
     title:'確認したカードから出すクロスギアを選ぶ'});
    continue;
   }
  }
  if(phase>=851&&creature){
   if(line==='自分の進化クリーチャーを他のクリーチャーの上に置いた時相手の「ブロッカー」を持つクリーチャーを1体破壊する。'){
    spec.g849EvolutionPlaced='destroyBlocker';
    continue;
   }
   if(/^このクリーチャー(?:をバトルゾーンに出した|がバトルゾーンに出た)時自分の墓地に《爆走戦鬼レッド・ライダーズ》が(?:1枚でも)?あれば相手のマナゾーンからカードを1枚選び持ち主の墓地に置く。$/.test(line)){
    entry.push({op:'IfOwn',filter:{g273Grave:{n:1,filter:{g201ExactName:'爆走戦鬼レッド・ライダーズ'}}},
     defs:[{op:'Select',origin:'mana',owner:'opponent',to:'grave',n:1}]});
    continue;
   }
   if(line==='このクリーチャーがバトルゾーンに出た時相手は自身の山札の上から1枚目を見せその後山札の一番下に置く。そのカードのコストが5以上ならカードを3枚引く。'){
    entry.push({op:'Vegas851'});
    continue;
   }
  }
  if(phase>=850){
   if(creature&&line==='このクリーチャーが攻撃する時相手のシールドを1枚選んで見てよい。そのあとそれを元に戻す。'){
    attack.push({op:'Peek585',optional:true});
    continue;
   }
   if(!creature&&!seed&&line==='バトルゾーンにあるクリーチャーを1体選び持ち主の手札に戻す。それが自分のクリーチャーであればカードを1枚引いてもよい。'){
    entry.push({op:'Target',anyOwner:true,to:'hand',g850OwnBounceDraw:true});
    continue;
   }
   if(creature&&line==='自分の進化クリーチャーを他のクリーチャーの上に置いた時自分の山札の上から1枚目をマナゾーンに置く。'){
    spec.g849EvolutionPlaced='ramp';
    continue;
   }
   if(creature&&line==='自分の進化クリーチャーを他のクリーチャーの上に置いた時自分の山札の上から1枚目を裏向きのまま新しいシールドとして自分のシールドゾーンに置く。'){
    spec.g849EvolutionPlaced='shield';
    continue;
   }
  }
  if(phase>=849&&creature){
   if(line==='このクリーチャーが攻撃する時相手の山札の上から1枚目と手札を見てもよい。'){
    attack.push({op:'Offer',title:'相手の山札の上と手札を確認する？',defs:[{op:'Peek585',opponentDeckTop:true,hand:true}]});
    continue;
   }
   if(line==='自分の進化クリーチャーを他のクリーチャーの上に置いた時カードを1枚引く。'){
    spec.g849EvolutionPlaced='draw';
    continue;
   }
   if(line==='自分の進化クリーチャーを他のクリーチャーの上に置いた時相手は自身の手札を1枚選んで捨てる。'){
    spec.g849EvolutionPlaced='discard';
    continue;
   }
  }
  if(phase>=848&&creature){
   if(line==='自分の手札を捨てた時相手にも自身の手札を1枚選んで捨てさせる。'){
    spec.g848DiscardWatch='opponentDiscard';
    continue;
   }
   if(line==='相手のターン中自分の手札を捨てた時捨てた枚数と同じ数のカードを引く。'){
    spec.g848DiscardWatch='draw';
    continue;
   }
   if(line==='グランド・デビルが攻撃する時各プレイヤーは自分自身の手札を1枚選び捨てる。'){
    spec.g252AttackWatch={who:'both',filter:{creature:true,race:'グランド・デビル'},
     defs:[{op:'EachPlayer459',origin:'hand',to:'grave',discard:true}]};
    continue;
   }
  }
  if(phase>=847&&creature){
   if(line==='自分が呪文を唱えた時このクリーチャーを自分の墓地から手札に戻してもよい。'){
    spec.g847SpellGraveReturn=true;
    continue;
   }
   if(line==='「スピードアタッカー」を持つクリーチャーはバトルゾーンにタップして出る。'){
    spec.g847SpeedTap=true;
    continue;
   }
   if(line==='このクリーチャーは可能なら毎ターンクリーチャーを攻撃する。'){
    spec.g847MustAttackCreature=true;
    continue;
   }
  }
  if(phase>=846&&creature){
   if(line==='このクリーチャーが破壊される時このクリーチャーを墓地に置くかわりに自分の手札から呪文を1枚捨ててもよい。'){
    spec.g846SpellDiscard=true;
    continue;
   }
   if(line==='このクリーチャーが破壊される時このクリーチャーを墓地に置くかわりに山札の一番上に置いてもよい。'){
    spec.g846DestroyToTop=true;
    continue;
   }
   if(line==='自分のマナゾーンにカードを置いた時自分の山札の上から1枚目を墓地に置いてもよい。'){
    spec.g807ManaEntry=[{op:'Mill',n:1,optional:true}];
    continue;
   }
  }
  if(phase>=845&&creature){
   if(line==='このクリーチャーが破壊される時墓地に置くかわりに光のクリーチャーを1体自分の手札から捨ててもよい。'){
    spec.g845LightDiscard=true;
    continue;
   }
   if(line==='このクリーチャーは可能なら各ターン2度攻撃する。'){
    spec.g845RequiredAttacks=2;
    continue;
   }
  }
  if(phase>=575&&creature){
   if(/^このクリーチャーが破壊される時墓地(?:のかわり|に置くかわり)に(?:自分の)?マナゾーンに置いてもよい。$/.test(line)){
    spec.g575OptionalMana=true;
    continue;
   }
   if(line==='このクリーチャーが破壊される時墓地のかわりにマナゾーンに置く。'){
    spec.destroyToMana=true;
    continue;
   }
   const mana={
    ...(phase>=845?{'自分のハンターが破壊される時墓地に置くかわりにマナゾーンに置く。':{filter:{race:'ハンター'}}}:{}),
    '自分のジョーカーズが破壊される時墓地に置くかわりにマナゾーンに置く。':{filter:{race:'ジョーカーズ'}},
    'このクリーチャーまたは自分の他のコマンド・ドラゴンが破壊される時墓地に置くかわりに自分のマナゾーンに置く。':{filter:{race:'コマンド・ドラゴン'},self:true},
    '自分の水または自然のクリーチャーが破壊される時墓地に置くかわりにタップしてマナゾーンに置く。':{filter:{creature:true,any:[{color:'水'},{color:'自然'}]},tapped:true},
    '自分の他のドリームメイトが破壊される時そのクリーチャーを墓地に置くかわりに自分のマナゾーンに置く。':{filter:{race:'ドリームメイト'},other:true}
   }[line];
   if(mana){
    if(spec.g575ManaAura)throw Error('重複する破壊時のマナ置換');
    spec.g575ManaAura=mana;
    continue;
   }
   const hand={
    '名前に《NEX》とある自分のクリーチャーが破壊される時そのクリーチャーを墓地に置くかわりに手札に戻す。':{creature:true,g220NameAny:['NEX']},
    '自分の無色クリーチャーが破壊される時墓地に置くかわりに手札に戻す。':{creature:true,noColor:true}
   }[line];
   if(hand){
    if(spec.g390DestroyToHand)throw Error('重複する破壊時の手札置換');
    spec.g390DestroyToHand={filter:hand};
    continue;
   }
   if(line==='このクリーチャーが破壊される時バトルゾーンに自分のパワー6000以上のクリーチャーがあればこのクリーチャーを墓地に置くかわりに手札に戻す。'){
    if(spec.g260Self)throw Error('重複する自己条件');
    spec.g260Self={filter:{creature:true,minPower:6000,g199Power:true},grants:{destroyToHand:true}};
    continue;
   }
   if(line==='自分の水または自然のクリーチャーすべてに「ブロッカー」を与える。(「ブロッカー」を持つクリーチャーをタップして相手クリーチャーの攻撃先をそのクリーチャーに変更してもよい)'){
    (spec.g208Auras??=[]).push({filter:{creature:true,colorsAny:['水','自然']},grants:{blocker:true}});
    continue;
   }
  }
  if(phase>=574&&creature){
   if(line==='誰も自身のターンを続けて行うことはできない。'){
    spec.g574NoConsecutiveTurns=true;
    continue;
   }
   if(line==='マナ武装3―このクリーチャーが破壊される時自分のマナゾーンに水のカードが3枚以上あればカードを1枚引いてもよい。'){
    if(death.length)throw Error('独立した誘発能力の順序対応が必要');
    death.push({op:'IfMana',n:3,color:'水',defs:[{op:'Offer',defs:[{op:'Draw',n:1}]}]});
    continue;
   }
   const oldSaver={
    'セイバー:全種族(自分の他のクリーチャーが破壊される時そのクリーチャー1体のかわりにこのクリーチャーを破壊してもよい)':{filter:{creature:true},other:true},
    'セイバー:クロスギア(自分のクロスギア1枚がバトルゾーンから墓地に置かれる時このクリーチャーをかわりに破壊してもよい)':{filter:{g201Gear:true},graveMove:true},
    'セイバー:アーマード・ドラゴン(このクリーチャーがバトルゾーンにある間バトルゾーンにある自分のアーマード・ドラゴンが自分の墓地に置かれるときそのアーマード・ドラゴンの代わりにこのクリーチャーを自分の墓地に置いてもよい)':{filter:{race:'アーマード・ドラゴン'},graveMove:true}
   }[line];
   if(oldSaver){
    if(spec.g571Saver)throw Error('重複するセイバー');
    spec.g571Saver=oldSaver;
    continue;
   }
  }
  if(phase>=573&&creature){
   const colors=line.match(/^自分の(光|水|闇|火|自然)または(光|水|闇|火|自然)のカードを実行するコストを1少なくする。ただしコストは0以下にはならない。$/);
   const useRace={
    '自分のマジックを使うコストを1少なくする。ただしコストは0以下にはならない。':'マジック',
    '自分のアビスを使うコストを1少なくする。ただしコストは0以下にはならない。':'アビス',
    '自分のロスト・クルセイダー・カードを実行するコストを1少なくする。ただしコストは0以下にならない。':'ロスト・クルセイダー'
   }[line];
   if(colors||useRace){
    if(spec.g468UseReduction)throw Error('重複するカード使用軽減');
    spec.g468UseReduction=colors?{colorsAny:colors.slice(1),amount:1}:{race:useRace,amount:1};
    continue;
   }
   const summon={
    '自分のドラゴンを召喚するコストを1少なくする。ただしコストは0以下にはならない。':{race:'ドラゴン',amount:1},
    '自分のドラゴンの召喚コストを最大2少なくしてもよい。ただしコストは0以下にはならない。':{race:'ドラゴン',amount:2,g560Optional:true},
    '自分のジャイアントの召喚コストを最大2まで少なくしてもよい。ただしコストは1より少なくならない。':{race:'ジャイアント',amount:2,g560Optional:true}
   }[line];
   if(summon){
    if(spec.g349SummonAuras)throw Error('重複する召喚軽減');
    spec.g349SummonAuras=[summon];
    continue;
   }
  }
  if(phase>=571&&(creature||seed)){
   const filters={
    '進化クリーチャー':{creature:true,evolution:true},'水のクリーチャー':{creature:true,color:'水'},
    'ビートジョッキー':{race:'ビートジョッキー'},'グレートメカオー':{race:'グレートメカオー'},'サイバー・ムーン':{race:'サイバー・ムーン'},
    'タマシード':{g295Tamaseed:true},'ドラゴン':{race:'ドラゴン'},'パワー12000以上':{creature:true,minPower:12000,g199Power:true},
    'ドラゴンまたはサムライ・クリーチャー':{any:[{race:'ドラゴン'},{creature:true,race:'サムライ'}]},
    'フェニックスまたはドラゴン':{raceAny:['フェニックス','ドラゴン']},'アーマード・ドラゴン':{race:'アーマード・ドラゴン'},'ゴッド':{race:'ゴッド'}
   };
   if(phase>=572)Object.assign(filters,{
    '進化クリーチャーまたはタマシード':{any:[filters['進化クリーチャー'],filters['タマシード']]},
    '進化クリーチャーまたはゴッド':{any:[filters['進化クリーチャー'],filters['ゴッド']]},
    '光または火のクリーチャー':{creature:true,any:[{color:'光'},{color:'火'}]},
    '光のクリーチャー':{creature:true,color:'光'},
    '火のドラゴン':{race:'ドラゴン',color:'火'},
    '無色クリーチャー':{creature:true,noColor:true},
    '多色クリーチャー':{creature:true,multi:true},
    'コスト3以下のクリーチャー':{creature:true,max:3},
    'コスト6以上のクリーチャー':{creature:true,min:6},
    'コスト9のクリーチャー':{creature:true,min:9,max:9},
    'パワー6000以上':{creature:true,minPower:6000,g199Power:true},
    'ガーディアンまたはアンノウン':{raceAny:['ガーディアン','アンノウン']},
    'メカまたはアーマード':{raceAny:['メカ','アーマード']},
    ...Object.fromEntries(['ジョーカーズ','ガーディアン','マフィ・ギャング','超化獣','エンジェル・コマンド','デーモン・コマンド','メタリカ','アース・ドラゴン','アウトレイジ'].map(race=>[race,{race}]))
   });
   if(phase>=573)Object.assign(filters,{
    '多色エレメント':{multi:true},
    ...Object.fromEntries(['マジック','アビス','ロスト・クルセイダー','ジャイアント'].map(race=>[race,{race}]))
   });
   if(phase>=574)filters['???']={race:'???'};
   const match=line.match(/^(ウルトラ・)?セイバー[:-]([^()]+)\((.*)\)$/);
   if(match&&(!match[1]||phase>=572)){
    const [,ultra,category,body]=match;
    const filter=filters[category],who=seed?'タマシード':'クリーチャー';
    const target=category.startsWith('パワー')?category+'のクリーチャー':category;
    const events=ultra?['離れる時','バトルゾーンを離れる時']:['破壊される時'];
    const payments=[`この${who}をかわりに破壊してもよい`,`かわりにこの${who}を破壊してもよい`];
    const reminders=events.flatMap(event=>['','1体'].flatMap(unit=>payments.map(payment=>`自分の${target}${unit}が${event}${payment}`)));
    if(filter&&reminders.includes(body)){
     if(spec.g571Saver)throw Error('重複するセイバー');
     spec.g571Saver={filter,...(ultra?{ultra:true}:{})};
     continue;
    }
   }
  }
  if(phase>=570&&creature){
   const rule={
    '進化ではないクリーチャーをブロックしている時このクリーチャーのパワーは+2000される。':{amount:2000,opponentNonEvolution:true},
    '革命2―自分のシールドが2つ以下でこのクリーチャーがブロックしていればこのクリーチャーのパワーを+4000する。':{amount:4000,shieldsMax:2},
    'これが進化クリーチャーならブロック中このクリーチャーのパワーを+10000する。':{amount:10000,evolution:true},
    'このクリーチャーがブロックしている時このクリーチャーのパワーは+2000される。':{amount:2000}
   }[line];
   if(rule){if(spec.g570BlockPower)throw Error('重複する条件付きブロック強化');spec.g570BlockPower=rule;powerBonus=true;continue;}
  }
  if(phase>=569&&creature){
   if(line==='このクリーチャーはこのクリーチャーよりパワーの小さいクリーチャーにブロックされない。'){if(spec.g206NoBlock)throw Error('重複するブロック制限');spec.g206NoBlock={lessPower:true};continue;}
   if(line==='自分の自然のクリーチャーはそれよりパワーの小さいクリーチャーにブロックされない。'){if(spec.g569Aura)throw Error('重複する比較ブロック制限');spec.g569Aura={filter:{creature:true,color:'自然'}};continue;}
   if(line==='マナ武装3-自分のマナゾーンに自然のカードが3枚以上あれば自分の自然のクリーチャーはそれよりパワーが小さいクリーチャーにブロックされない。'){if(spec.g569Aura)throw Error('重複する比較ブロック制限');spec.g569Aura={filter:{creature:true,color:'自然'},mana:{color:'自然',n:3}};continue;}
  }
  if(phase>=568&&creature){
   const m=line.match(/^自分のマナゾーンに(光|水|闇|火|自然)(光|水|闇|火|自然)(光|水|闇|火|自然)の各文明があればこのクリーチャーを\[cc02\]支払って召喚してもよい。$/);
   const condition=m?{g568ManaColors:[m[1],m[2],m[3]]}:line==='自分の墓地にカードが5枚以上あればこのクリーチャーを[dd02]支払って召喚してもよい。'?{g334ZoneCount:{zone:'grave',min:5}}:line==='自分のタップしているクリーチャーがあればこのクリーチャーを[ww01]支払って召喚してもよい。'?{creature:true,tapped:true}:null;
   if(condition){if(spec.g568Alt)throw Error('重複する条件付き代替コスト');spec.g568Alt={condition,cost:m?2:line.includes('[dd02]')?2:1,paymentColors:m?[]:line.includes('[dd02]')?['闇']:['水']};continue;}
  }
  if(phase>=567){
   if(creature){const rules={
    'バトルゾーンに自分のパワー6000以上のクリーチャーがいなければこのクリーチャーはプレイヤーを攻撃できない。':{noPlayerAttack:true,filter:{creature:true,minPower:6000,g199Power:true},grants:{noPlayerAttack:false}},
    '自分のマナゾーンにタップしているカードがあればこのクリーチャーは相手プレイヤーを攻撃できない。':{noPlayerAttack:true,filter:{g567NoTappedMana:true},grants:{noPlayerAttack:false}},
    '自分の他のコマンドがなければこのクリーチャーは攻撃できない。':{noAttack:true,filter:{creature:true,race:'コマンド',g334Other:true},grants:{noAttack:false}},
    'バトルゾーンに自分の他のドラゴンがなければこのクリーチャーは攻撃できない。':{noAttack:true,filter:{creature:true,race:'ドラゴン',g334Other:true},grants:{noAttack:false}},
    'レインボーナス:バトルゾーンに自分の多色クリーチャーがあればこのクリーチャーが攻撃できない能力を無視する。':{filter:{creature:true,multi:true},grants:{noPlayerAttack:false}}
   },r=rules[line];if(r){if(spec.g260Self)throw Error('重複する攻撃条件');if(r.noAttack)spec.noAttack=true;if(r.noPlayerAttack)spec.noPlayerAttack=true;spec.g260Self={filter:r.filter,grants:r.grants};continue;}}
   if(f.typeText==='呪文'&&instruction567(line)){entry.push(instruction567(line));continue;}
   if(f.typeText==='呪文'&&line==='革命2―自分のシールドが2つ以下なら次の自分のターンのはじめまで相手のクリーチャーはプレイヤーを攻撃できない。'){entry.push({op:'IfOwn',filter:{g265ShieldsMax:2},defs:[{op:'PlayerStop567',owner:'opponent',g567PlayerStop:'start',spell:true}]});continue;}
  }
  if(phase>=566&&f.typeText==='呪文'&&instruction566(line)?.op==='Bind566'){entry.push(instruction566(line));continue;}
  if(phase>=566&&f.typeText==='呪文'&&line==='Evoチャージャー(この呪文を唱えた後墓地に置くかわりに自分のマナゾーンに置く。その後クリーチャーを1体自分のマナゾーンからバトルゾーンにある自分の進化クリーチャー1体の下に重ねて置いてもよい)'){spec.normalCharger=true;spec.g566EvoCharger=true;continue;}
  if(phase>=565){
   if(creature){const rule=bara565(line);if(rule){if(spec.g260Self)throw Error('重複するバラバラエティ条件');spec.g260Self=rule;continue;}
    if(line==='自分のシールドゾーンに表向きのカードがあればこのクリーチャーに「ブロッカー」を与える。(「ブロッカー」を持つクリーチャーをタップして相手クリーチャーの攻撃先をそのクリーチャーに変更してもよい)'){if(spec.g260Self)throw Error('重複する表向きシールド条件');spec.g260Self={filter:{g565FaceUpShields:true},grants:{blocker:true}};continue;}
   }
   if(f.typeText==='呪文'&&line==='自分のシールドゾーンに表向きのカードがあればこの呪文を唱えるコストを3少なくする。'){if(spec.g261Discount)throw Error('重複する表向きシールド軽減');spec.g261Discount={filter:{g565FaceUpShields:true},amount:3};continue;}
  }
  if(phase>=564&&creature){const r=bara564(line);if(r){if(r.aura)(spec.g208Auras??=[]).push({filter:{creature:true},g557Condition:{g466DistinctCosts:3},grants:r.aura});else{if(spec.g260Self)throw Error('重複するバラバラエティ条件');spec.g260Self={filter:{g466DistinctCosts:3},grants:r.grants,...(r.turn?{turn:r.turn}:{})};if(r.grants.power)powerBonus=true;}continue;}}
  if(phase>=563&&creature){
   const boosts={
    'これがNEO進化クリーチャーなら「パワーアタッカー+7000」と「T・ブレイカー」を与える。(攻撃中このクリーチャーのパワーは+7000されシールドを3つブレイクする)':{attackBonus:7000,breaker:3},
    'これがNEO進化クリーチャーならこのクリーチャーに「パワーアタッカー+3000」と「W・ブレイカー」を与える。(攻撃中このクリーチャーのパワーは+3000されシールドをさらに1つブレイクする)':{attackBonus:3000,breaker:2},
    'このクリーチャーが進化クリーチャーの時そのパワーを+3000し「W・ブレイカー」を与える。':{power:3000,breaker:2}
   }[line];
   if(boosts){if(spec.g260Self)throw Error('重複する進化条件');spec.g260Self={filter:{g563Neo:true},grants:boosts};powerBonus=true;continue;}
  }
  if(phase>=562&&creature&&line==='自分のコスト4以下のクリーチャーはすべて「ブロッカー」を得自分のターンの終わりにアンタップする。'){
   (spec.g208Auras??=[]).push({filter:{creature:true,g562MaxCost:4},grants:{blocker:true,g166EndUntap:true}});continue;
  }
  if(phase>=561&&creature){
   const civilizations=line.match(/^このクリーチャーのパワーはバトルゾーンにある自分のカードの文明ひとつにつき\+([1-9]\d*)される。$/);
   if(civilizations){if(spec.g207CountPower)throw Error('重複する文明数パワー');spec.g207CountPower={zone:'battle',civilizations:true,g561Battle:true,amount:+civilizations[1]};powerBonus=true;continue;}
   if(line==='自分の墓地にあるファンキー・ナイトメア1体につきこのクリーチャーのパワーは+1000される。'){if(spec.g207CountPower)throw Error('重複する墓地パワー');spec.g207CountPower={zone:'grave',filter:{g561CreatureRace:'ファンキー・ナイトメア'},amount:1000};powerBonus=true;continue;}
   if(line==='攻撃中このクリーチャーのパワーを自分のタマシード1枚につき+3000する。'){if(spec.g207CountPower)throw Error('重複するタマシード数パワー');spec.g207CountPower={zone:'battle',g561Elements:true,filter:{seed:true},amount:3000,attackOnly:true};powerBonus=true;continue;}
  }
  if(phase>=560&&(creature||seed)){
   const rule=aura560(line);if(rule){if((spec.g349SummonAuras||[]).some(r=>JSON.stringify(r)===JSON.stringify(rule)))throw Error('重複する召喚軽減');(spec.g349SummonAuras??=[]).push({...rule,...(seed?{g560Element:true}:{})});continue;}
   if(creature&&line==='自分の他のビートジョッキーがバトルゾーンに出た時カードを1枚引いてもよい。'){if(spec.g250EntryDraw)throw Error('重複するビートジョッキー登場監視');spec.g250EntryDraw={filter:{creature:true,race:'ビートジョッキー'},self:false,defs:[{op:'Offer',defs:[{op:'Draw',n:1}]}]};continue;}
  }
  if(phase>=559&&creature){
   const blocked=line.match(/^このクリーチャーがブロック(?:された(?:時|とき)|されるとき)(.+)$/),defs=blocked&&{
    '相手のシールドが1枚でもあればそのうちの1枚をブレイクする。':[{op:'Break497',n:1}],
    '相手のシールドを1枚ブレイクする。':[{op:'Break497',n:1}],
    'このクリーチャーは相手のシールドを2つブレイクする。':[{op:'Break497',n:2}],
    '自分の山札の上から1枚目を自分のマナゾーンに加えてもよい。':[{op:'Offer',defs:[{op:'Ramp',n:1}]}],
    '自分の山札の上から1枚目を自分のマナゾーンに置いてもよい。':[{op:'Offer',defs:[{op:'Ramp',n:1}]}],
    'このクリーチャーをアンタップする。':[{op:'Untap',g191First:true}],
    '「ブロッカー」を持つ相手のクリーチャーをすべて破壊する。':[{op:'Sweep',to:'grave',filter:{creature:true,blocker:true}}]
   }[blocked[1]];
   if(defs){if(spec.g559Blocked)throw Error('重複するブロックされた時の能力');spec.g559Blocked=defs;continue;}
  }
  if(phase>=557){
   if(phase>=638&&creature&&line==='自分の多色クリーチャーはシールドをさらに1枚ブレイクする。'){
    if(spec.g557BreakAura)throw Error('重複する追加ブレイク');
    spec.g557BreakAura={multi:true,amount:1};
    continue;
   }
   if(creature&&line==='自分のドラゴンはすべてシールドをさらに1枚ブレイクする。'){if(spec.g557BreakAura)throw Error('重複する追加ブレイク');spec.g557BreakAura={race:'ドラゴン',amount:1};continue;}
   if(creature&&line==='バラバラエティ3:自分のクリーチャーすべてに「スピードアタッカー」を与える。(コストが異なる自分のエレメントが3つ以上あればこのクリーチャーにこの能力を与える)'){(spec.g208Auras??=[]).push({filter:{creature:true},g557Condition:{g466DistinctCosts:3},grants:{speedAttacker:true}});continue;}
   if(!creature&&line==='この呪文を唱えるコストを自分のコスト3以下のエレメント1つにつき3少なくする。ただしコストは0以下にならない。'){if(spec.g212CountDiscount)throw Error('重複するエレメント軽減');spec.g212CountDiscount={zone:'battle',g557Elements:true,filter:{max:3},amount:3};continue;}
  }
  if(phase>=556&&creature&&line==='自分のNEOクリーチャーが攻撃する時コスト5以下の呪文を1枚自分の墓地または手札からコストを支払わずに唱えてもよい。唱えた後墓地に置くかわりに自分の山札の一番下に置く。'){if(spec.g253AttackWatches)throw Error('重複するNEO攻撃監視');spec.g253AttackWatches=[{who:'self',filter:{creature:true,g556Neo:true},defs:[instruction556(line.replace('自分のNEOクリーチャーが攻撃する時',''))]}];continue;}
  if(phase>=554&&creature&&line==='鬼タイム:自分と相手のシールドの数が合計6つ以下ならこのクリーチャーに「パワーアタッカー+7000」と「T・ブレイカー」を与える。'){if(spec.g260Self)throw Error('重複する鬼タイムの自己強化');spec.g260Self={filter:{g334ZoneCount:{zone:'shields',sumBoth:true,max:6}},grants:{attackBonus:7000,breaker:3}};powerBonus=true;continue;}
  if(phase>=509&&creature){
   const oni={
    '鬼タイム:自分と相手のシールドの数が合計6つ以下ならこのクリーチャーのパワーを+2000する。':{power:2000},
    '鬼タイム:自分と相手のシールドの数が合計6つ以下ならこのクリーチャーのパワーを+6000し「W・ブレイカー」を与える。':{power:6000,breaker:2}
   }[line];if(oni){if(spec.g260Self)throw Error('重複する鬼タイムの自己強化');spec.g260Self={filter:{g334ZoneCount:{zone:'shields',sumBoth:true,max:6}},grants:oni};powerBonus=true;continue;}
  }
  if(phase>=508&&creature){
   const grants={
    'バトルゾーンに自分の進化クリーチャーまたはリンクしているゴッドがある時このクリーチャーは「スレイヤー」を得る。(「スレイヤー」を得たクリーチャーがバトルする時バトルの後相手クリーチャーを破壊する)':{slayer:true},
    'バトルゾーンに自分の進化クリーチャーまたはリンクしているゴッドがある時このクリーチャーは「スピードアタッカー」を得る。(「スピードアタッカー」を得たクリーチャーは召喚酔いしない)':{speedAttacker:true},
    'バトルゾーンに自分の進化クリーチャーまたはリンクしているゴッドがある時このクリーチャーは「パワーアタッカー+4000」と「W・ブレイカー」を得る。':{attackBonus:4000,breaker:2}
   }[line];
   if(grants){if(spec.g260Self)throw Error('重複する進化・リンク条件');spec.g260Self={filter:{g508EvolutionOrLink:true},grants};if(grants.attackBonus)powerBonus=true;continue;}
   const end={
    '自分のターンの終わりに自分のタップしているクリーチャーが3体以上あれば相手は自身のクリーチャーを1体選び破壊する。その後相手は自身の手札を1枚選び捨てる。':[{op:'OpponentSelect',n:1,to:'grave'},{op:'Discard',n:1}],
    '自分のターンの終わりに自分のタップしているクリーチャーが3体以上あればこのクリーチャーはシールドを1つブレイクしてもよい。':[{op:'Offer',defs:[{op:'Break278'}]}],
    '自分のターンの終わりに自分のタップしているクリーチャーが3体以上あれば自分の山札の上から2枚をシールド化してもよい。':[{op:'Offer',defs:[{op:'ShieldTop'},{op:'ShieldTop'}]}]
   }[line];
   if(end){if(turnEnd.length)throw Error('独立したターン終了時能力の順序対応が必要');turnEnd.push({op:'IfOwn',filter:{g370BattleCount:{filter:{creature:true,tapped:true},min:3}},defs:end});continue;}
  }
  if(phase>=505&&creature){
   const tax=line.match(/^このクリーチャーがバトルゾーンにある間(光|水|闇|火|自然)のクリーチャーを召喚するコストと\1の呪文を唱えるコストはそれぞれ\+([12])される。$/);
   if(tax){if(spec.g505ExecutionTax)throw Error('重複するクリーチャーと呪文のコスト増加');spec.g505ExecutionTax={color:tax[1],amount:+tax[2]};continue;}
  }
  if(phase>=502&&creature){
   const requirement={
    'コストが異なる自分のエレメントが3つ以上なければこのクリーチャーは攻撃できない。':{kind:'distinctCosts',min:3},
    'バトルゾーンにタップされていないクリーチャーが他に1体でもあればこのクリーチャーは攻撃することができない。':{kind:'noOtherUntapped'},
    'このターン中に自分のクリーチャーが2体以上バトルゾーンに出ていなければこのクリーチャーは攻撃できない。':{kind:'entries',min:2},
    'バトルゾーンに自分の他のパワー12000以上のクリーチャーがなければこのクリーチャーは攻撃できない。':{kind:'ally',other:true,filter:{creature:true,minPower:12000}},
    'このターン自分が呪文を唱えていなければこのクリーチャーは攻撃できない。':{kind:'spells',min:1},
    'このターンに自分がカードを2枚以上引いていなければこのクリーチャーは攻撃できない。':{kind:'draws',min:2},
    'このターンに自分がクリーチャーではないカードを実行していなければこのクリーチャーは攻撃できない。':{kind:'noncreatureUses',min:1},
    'バトルゾーンに相手のクリーチャーが1体もなければこのクリーチャーは攻撃することができない。':{kind:'opponentCreatures',min:1}
   }[line];
   if(requirement){if(spec.g225AttackRequires)throw Error('重複する攻撃条件');spec.g225AttackRequires=requirement;continue;}
   if(line==='このクリーチャーにクロスギアが1枚もクロスされていなければこのクリーチャーは相手プレイヤーを攻撃できない。'){if(spec.g260Self)throw Error('重複するクロス条件');spec.noPlayerAttack=true;spec.g260Self={filter:{g436Crossed:true},grants:{noPlayerAttack:false}};continue;}
   if(line==='このクリーチャーは可能であれば毎ターンクリーチャーを攻撃する。'&&lines.some(l=>normalize(l)==='このクリーチャーは相手プレイヤーを攻撃できない。')){if(spec.mustAttack)throw Error('重複する攻撃義務');spec.mustAttack=true;continue;}
  }
  if(phase>=501&&creature){
   if(line==='飛行(このクリーチャーは飛行を持たないクリーチャーから攻撃もブロックもされない)'){if(spec.flying)throw Error('重複する飛行');spec.flying=true;continue;}
   if(line==='このクリーチャーがバトルゾーンにある間自分のターンの終わりにこのクリーチャーをアンタップしてもよい。'){if(spec.endUntap||spec.g166EndUntap)throw Error('重複するターン終了時アンタップ');spec.endUntap=true;continue;}
  }
  if(phase>=500&&creature){
   const aura={
    '自分のドラゴンの召喚コストを2少なくしてもよい。ただしコストは1以下にならない。':{filter:{race:'ドラゴン'},amount:2,exact:true},
    '自分の多色クリーチャーの召喚コストを最大2少なくする。ただしコストは1以下にならない。':{filter:{multi:true},amount:2}
   }[line];
   if(aura){if(spec.g500SummonAura)throw Error('重複する最低2マナの召喚軽減');spec.g500SummonAura=aura;continue;}
   const count={
    '自分の墓地にあるクリーチャー1体につきこのクリーチャーの召喚コストを1少なくする。ただしコストは1以下にはならない。':{zone:'grave',filter:{creature:true},amount:1,minimum:2},
    'このクリーチャーの召喚コストをこのターン自分が引いたカード1枚につき1少なくする。ただしコストは1以下にならない。':{zone:'draws',amount:1,minimum:2}
   }[line];
   if(count){if(spec.g212CountDiscount)throw Error('重複する枚数軽減');spec.g212CountDiscount=count;continue;}
   if(line==='シンパシー:エンジェル・コマンドおよびデーモン・コマンド(このクリーチャーを召喚する時支払うコストはバトルゾーンにある自分のエンジェル・コマンドまたはデーモン・コマンド1体につき1少なくなる。ただしコストは2より少なくならない)'){if(spec.g211Sympathy)throw Error('重複するシンパシー');spec.g211Sympathy={amount:1,minimum:2,filter:{creature:true,raceAny:['エンジェル・コマンド','デーモン・コマンド']}};continue;}
   if(line==='自分のエンジェル・コマンドまたはデーモン・コマンドが攻撃する時相手のタップされているクリーチャーを1体破壊する。'){if(spec.g253AttackWatches)throw Error('重複する攻撃監視');spec.g253AttackWatches=[{who:'self',filter:{creature:true,raceAny:['エンジェル・コマンド','デーモン・コマンド']},defs:[{op:'Target',to:'grave',filter:{tapped:true}}]}];continue;}
  }
  if(phase>=499&&creature){
   const reduction={
    '自分の墓地にある闇のカード1枚につきこのクリーチャーの召喚コストを1少なくしてもよい。ただしコストは0以下にならない。':{zone:'grave',filter:{anyFaceColor:'闇'},amount:1,optional:true},
    'このクリーチャーの召喚コストを自分のマナゾーンにある呪文1枚につき1少なくしてもよい。ただしコストは1より少なくならない。':{zone:'mana',filter:{spell:true},amount:1,optional:true},
    'このクリーチャーの召喚コストを自分のマナゾーンにあるクリーチャー1体につき1少なくしてもよい。ただしコストは0以下にならない。':{zone:'mana',filter:{creature:true},amount:1,optional:true},
    'このクリーチャーの召喚コストをこのターン自分が引いたカード1枚につき1少なくしてもよい。ただしコストは0以下にならない。':{zone:'draws',amount:1,optional:true}
   }[line];
   if(reduction){if(spec.g212CountDiscount)throw Error('重複する枚数軽減');spec.g212CountDiscount=reduction;continue;}
   if(line==='自分の水の呪文を唱えるコストを最大2少なくしてもよい。ただしコストは1より少なくならない。'){if(spec.g485SpellReduction)throw Error('重複する任意呪文軽減');spec.g485SpellReduction={amount:2,color:'水'};continue;}
   if(line==='このクリーチャーがバトルゾーンにある間自分の呪文を唱えるとき支払うコストは1少なくなる。ただしコストが1のときは少なくならない。'){if(spec.g467SpellReduction)throw Error('重複する呪文軽減');spec.g467SpellReduction=1;continue;}
   if(line==='このクリーチャーがバトルゾーンにある間自分のクリーチャーを召喚するとき支払うコストは1少なくなる。ただしコストが1のときは少なくならない。'){if(spec.g349SummonAuras)throw Error('重複する召喚軽減');spec.g349SummonAuras=[{filter:{},amount:1}];continue;}
  }
  if(phase>=485&&creature&&line==='自分の呪文を唱えるコストを1少なくしてもよい。ただしコストは1より少なくならない。'){if(spec.g485SpellReduction)throw Error('重複する任意呪文軽減');spec.g485SpellReduction=1;continue;}
  if(phase>=484&&creature){
   if(line==='このクリーチャーがシールドをブレイクした時そのターンの終わりにこのクリーチャーをバトルゾーンから自分の手札に戻す。'){if(spec.g484BreakEndReturn)throw Error('重複するブレイク後の帰還');spec.g484BreakEndReturn=true;continue;}
   if(line==='このクリーチャーの攻撃がブロックされた場合バトルは行われない。ただし両クリーチャーはタップしたままである。'){if(spec.g484NoBlockedBattle)throw Error('重複するブロック後の非バトル');spec.g484NoBlockedBattle=true;continue;}
  }
  if(phase>=483&&creature){
   const untapped=line.match(/^このクリーチャーはタップされていない(光|水|闇|火|自然)(?:と(光|水|闇|火|自然))?のクリーチャーを攻撃できる。$/);
   if(untapped){if(spec.g483AttackUntappedColors||untapped[2]===untapped[1])throw Error('重複する文明別アンタップ攻撃');spec.g483AttackUntappedColors=untapped.slice(1).filter(Boolean);continue;}
   if(line==='このクリーチャーは光以外のクリーチャーを攻撃できない。'){if(spec.g483AttackCreatureColors)throw Error('重複する攻撃対象の文明制限');spec.g483AttackCreatureColors=['光'];continue;}
   if(line==='このクリーチャーはアンタップされているクリーチャーを攻撃できる。'){if(spec.attackUntapped)throw Error('重複するアンタップ攻撃');spec.attackUntapped=true;continue;}
  }
  if(phase>=707&&creature){
   const graveRecovery=[
    'このクリーチャーがバトルゾーンから自分の墓地に置かれたとき自分の墓地から他のクリーチャーを1体選び自分の手札に加えてもよい。',
    'このクリーチャーが破壊された時他のクリーチャーを1体自分の墓地から手札に戻してもよい。',
    'このクリーチャーが破壊された時自分の他のクリーチャーを1体自分の墓地から手札に戻してもよい。'
   ];
   if(graveRecovery.includes(line)){
    if(death.length)throw Error('重複する破壊時能力');
    death.push({op:'Select',origin:'grave',to:'hand',n:1,optional:true,g186Other:true,filter:{g228Face:{type:'creature'}},title:'墓地から手札に戻す他のクリーチャーを選ぶ'});
    continue;
   }
   if(line==='このクリーチャーが破壊された時進化ではないデーモン・コマンドをすべて自分の墓地からバトルゾーンに出してもよい。'){
    if(death.length)throw Error('重複する破壊時能力');
    death.push({op:'Offer',title:'墓地から進化ではないデーモン・コマンドをすべて出す？',defs:[
     {op:'Select',origin:'grave',n:'all',deploy:true,filter:{creature:true,nonEvolution:true,race:'デーモン・コマンド'},title:'墓地から出すデーモン・コマンドをすべて選ぶ'}
    ]});
    continue;
   }
  }
  if(phase>=482&&creature){
   const unblocked=line.match(/^このクリーチャーが相手プレイヤーを攻撃してブロックされなかった(?:時|とき)(.+)$/);
   if(unblocked){if(spec.g482Unblocked)throw Error('独立した非ブロック時能力の順序対応が必要');const defs=clauses(unblocked[1],phase).map(q=>instruction(q,phase));if(!defs.length||defs.some(d=>!d))throw Error('未対応の非ブロック時能力');spec.g482Unblocked=defs;continue;}
   const freeze='フリーズ(このクリーチャーが相手プレイヤーを攻撃してブロックされなかった時バトルゾーンにある相手のクリーチャーを1体選びタップしてもよい。そのクリーチャーは次の相手のターンのはじめにアンタップされない)';
   const doubleFreeze='ダブル・フリーズ(このクリーチャーが相手プレイヤーを攻撃してブロックされなかった時バトルゾーンにある相手のクリーチャーを2体まで選びタップしてもよい。そのクリーチャーは次の相手のターンのはじめにアンタップされない)';
   if(line===freeze||line===doubleFreeze){if(spec.g482Unblocked)throw Error('重複する非ブロック時能力');spec.g482Unblocked=line===freeze?[{op:'Target',tap:true,optional:true,lock:true,g210TapLock:true}]:[{op:'Select',origin:'battle',owner:'opponent',n:2,filter:{creature:true},g173Targets:true,g193Select:true,g193Tap:true,g210TapLock:true,optional:true}];continue;}
  }
  if(phase>=481&&creature){
   const restriction={
    'このクリーチャーは進化クリーチャーである時しか攻撃できない。':{kind:'selfEvolution'},
    'このターン他のクリーチャーが攻撃していなければこのクリーチャーは攻撃できない。':{kind:'otherAttack'},
    ...(phase>=652?{'このターンに他のクリーチャーが攻撃していなければこのクリーチャーは攻撃できない。':{kind:'otherAttack'}}:{}),
    'このターン中に自分の他のクリーチャーが攻撃していなければこのクリーチャーは攻撃できない。':{kind:'otherAttack',own:true},
    'このクリーチャーはバトルゾーンに自分のディスペクターがなければ攻撃できない。':{kind:'ally',filter:{race:'ディスペクター'}},
    '自分の火のクリーチャーがバトルゾーンになければこのクリーチャーは攻撃できない。':{kind:'ally',filter:{color:'火'}},
    'バトルゾーンに自分のタップしているクリーチャーが2体以上なければこのクリーチャーは攻撃できない。':{kind:'tappedCreatures',min:2}
   }[line];if(restriction){if(spec.g225AttackRequires)throw Error('重複する攻撃条件');spec.g225AttackRequires=restriction;continue;}
  }
  if(phase>=479&&creature){
   if(line==='自分のターンが終わるときバトルゾーンにある自分のクリーチャーがこのクリーチャーだけであれば自分の墓地に置く。'){if(turnEnd.length)throw Error('独立したターン終了時能力の順序対応が必要');turnEnd.push({op:'IfOwn',filter:{g479OnlyCreature:true},defs:[{op:'SelfDestroy'}]});continue;}
   if(line==='自分のターンの終わりにこのクリーチャーをアンタップしてよい。'){if(spec.endUntap||spec.g166EndUntap)throw Error('重複するターン終了時アンタップ');spec.endUntap=true;continue;}
  }
  if(phase>=477&&creature){
   if(['相手のクリーチャーが攻撃する時そのクリーチャーは可能であればこのクリーチャーを攻撃する。','相手のクリーチャーが攻撃する場合可能であればこのクリーチャーを攻撃する。'].includes(line)){if(spec.g431AttackMe)throw Error('重複する攻撃先指定能力');spec.g431AttackMe=true;continue;}
   if(line==='このクリーチャーがタップされていて相手のクリーチャーが攻撃する時そのクリーチャーは可能であればこのクリーチャーを攻撃する。'){if(spec.g477AttackMeTapped)throw Error('重複するタップ時の攻撃先指定');spec.g477AttackMeTapped=true;continue;}
   if(line==='革命2―相手のクリーチャーが攻撃する時自分のシールドが2つ以下ならそのクリーチャーは可能ならこのクリーチャーを攻撃する。'){if(spec.g260Self)throw Error('重複するシールド条件');spec.g260Self={filter:{g265ShieldsMax:2},grants:{g431AttackMe:true}};continue;}
   if(line==='このクリーチャーがバトルゾーンにある間相手の攻撃クリーチャーは可能であればミステリー・トーテムを攻撃する。'){if(spec.g477TotemLure)throw Error('重複する種族への攻撃先指定');spec.g477TotemLure=true;continue;}
  }
  if(phase>=476&&creature&&line==='このクリーチャーが破壊された時自分の墓地から手札に戻す。'){if(death.length)throw Error('独立した誘発能力の順序対応が必要');death.push({op:'SelfGraveHand476'});continue;}
  if(phase>=475&&creature){
   const restriction={
    '相手のクリーチャーは出たターン攻撃できない。':'stopEntryAttack',
    '相手のクリーチャーは出たターンに攻撃できない。':'stopEntryAttack',
    '相手の進化ではないクリーチャーは出たターン攻撃できない。':'g475StopNonEvolutionEntryAttack',
    '相手のクリーチャーは出たターン自分を攻撃できない。':'g40EntryPlayerStop',
    'このクリーチャーは召喚できない。':'g475NoSummon',
    'このクリーチャーを召喚することはできない。':'g475NoSummon',
    'このクリーチャーは自分のターンのはじめにアンタップしない。':'g40StartNoUntap'
   }[line];if(restriction){if(spec[restriction])throw Error('重複する登場・攻撃制限');spec[restriction]=true;continue;}
  }
  if(phase>=474&&creature){
   if(line==='このクリーチャーの攻撃の終わりにこのクリーチャーを破壊する。'){if(spec.g474AttackEnd)throw Error('重複する攻撃終了時能力');spec.g474AttackEnd=[{op:'SelfDestroy'}];continue;}
   const end={
    'ターンの終わりにこのクリーチャーを破壊する。':[{op:'SelfDestroy'}],
    ...(phase>=652?{'各ターンの終わりにこのクリーチャーがタップしていればこのクリーチャーを破壊する。':[{op:'IfOwn',filter:{g590SourceTapped:true},defs:[{op:'SelfDestroy'}]}]}:{}),
    'ターンの終わりにこのクリーチャーをアンタップしてもよい。':[{op:'Offer',title:'このクリーチャーをアンタップする？',defs:[{op:'Untap'}]}]
   }[line];if(end){if(spec.g474AnyEnd)throw Error('重複する両ターン終了時能力');spec.g474AnyEnd=end;continue;}
  }
  if(phase>=473&&creature){
   if(['相手は呪文を唱えられない。','相手は呪文を唱えることができない。'].includes(line)){if(spec.g473OpponentSpellLock)throw Error('重複する呪文封鎖');spec.g473OpponentSpellLock=true;continue;}
   if(line==='このクリーチャーは攻撃もブロックもされない。'){if(spec.cannotBeAttacked||spec.unblockable)throw Error('重複する攻撃・ブロック制限');spec.cannotBeAttacked=true;spec.unblockable=true;continue;}
   if(m=line.match(/^ブロック中このクリーチャーのパワーを\+([1-9]\d*)する。$/)){if(spec.g209PoweredBlocker)throw Error('重複するブロック中のパワー能力');spec.g209PoweredBlocker=+m[1];powerBonus=true;continue;}
  }
  if(phase>=472&&creature){
   if(line==='このターンアンタップしたクリーチャー1体につきこのクリーチャーの召喚コストを2少なくする。ただしコストは0以下にはならない。'){if(spec.g472UntapReduction)throw Error('重複するアンタップ軽減');spec.g472UntapReduction=2;continue;}
   if(line==='相手が自身の手札を1枚捨てた時相手のクリーチャーを1体選ぶ。このターンそのクリーチャーのパワーを-3000する。(パワー0以下のクリーチャーは破壊される)'){if(spec.g472OpponentDiscard)throw Error('重複する相手の捨て札監視');spec.g472OpponentDiscard=[{op:'Target',power:-3000}];continue;}
  }
  if(phase>=471&&creature&&line==='ヌル・ブレイカー(このクリーチャーはシールドを0ブレイクする)'){if(spec.breaker!==undefined||spec.g471NullBreaker)throw Error('重複するヌル・ブレイカー');spec.breaker=0;spec.g471NullBreaker=true;continue;}
  if(phase>=470&&creature&&line==='このクリーチャーを召喚する時自分の手札からコスト7以上のカードを1枚相手に見せてもよい。そうした場合このクリーチャーの召喚コストは最大2少なくなる。ただしコストは1より少なくならない。'){if(spec.g470RevealReduction)throw Error('重複する公開軽減');spec.g470RevealReduction={min:7,amount:2};continue;}
  if(phase>=469&&creature){
   const powers={
    'バトルゾーンにある自分の他のキマイラとアーマロイドすべてのパワーは+2000される。':['キマイラ','アーマロイド'],
    'バトルゾーンにある自分の他のゼノパーツとジャイアント・インセクトすべてのパワーは+2000される。':['ゼノパーツ','ジャイアント・インセクト']
   }[line];if(powers){if(spec.g205Aura)throw Error('重複する味方強化');spec.g205Aura={power:2000,filter:{creature:true,raceAny:powers},other:true};continue;}
   if(line==='バトルゾーンにある自分のキマイラとアーマロイドはすべて「W・ブレイカー」を得る。'){if(spec.g208Auras)throw Error('重複する種族付与');spec.g208Auras=[{filter:{creature:true,raceAny:['キマイラ','アーマロイド']},grants:{breaker:2}}];continue;}
  }
  if(phase>=468&&creature){
   if(line==='自分のコスト6以上のカードを使うコストを1少なくする。ただしコストは0以下にはならない。'){if(spec.g468UseReduction)throw Error('重複するカード使用軽減');spec.g468UseReduction={min:6,amount:1};continue;}
   const entry={
    '自分のコスト6以上のクリーチャーが出た時カードを1枚引いてもよい。':'draw',
    '自分のコスト6以上のクリーチャーが出た時このターンそのクリーチャーは相手プレイヤーを攻撃できる。このターン中に攻撃したらターンの終わりにそのクリーチャーを山札の下に置く。':'rush',
    '自分のコスト6以上のクリーチャーが出た時相手のクリーチャーを1体選んでもよい。その2体をバトルさせる。':'fight',
    '自分のコスト6以上のクリーチャーが出た時相手のクリーチャーを1体選びタップする。次の相手のターンのはじめにそのクリーチャーはアンタップしない。':'freeze',
    '自分のコスト6以上のクリーチャーが出た時このターンそのクリーチャーに「マッハファイター」を与える。(「マッハファイター」を持つクリーチャーは出たターンの間タップまたはアンタップしているクリーチャーを攻撃できる)':'mach'
   }[line];if(entry){if(spec.g468EntryWatch)throw Error('重複する大型登場監視');spec.g468EntryWatch={filter:{creature:true,min:6},mode:entry};continue;}
  }
  if(phase>=467&&creature){
   if(line==='自分の呪文を唱えるコストを1少なくする。ただしコストは0以下にならない。'){if(spec.g467SpellReduction)throw Error('重複する呪文軽減');spec.g467SpellReduction=1;continue;}
   if(m=line.match(/^自分がナイト呪文を唱えた時(.+)$/)){const def=look467(m[1]);if(!def||spec.g204SpellWatch)throw Error('未対応のナイト呪文誘発');spec.g204SpellWatch={who:'self',race:'ナイト',defs:[def]};continue;}
  }
  if(phase>=466&&creature){
   const battleAura={
    'このクリーチャーがタップしていれば自分の他のジョーカーズはバトルによって破壊されない。':{filter:{creature:true,race:'ジョーカーズ'},other:true,sourceTapped:true,protect:true},
    '自分のクリーチャーすべてのバトル中のパワーを+2000する。':{filter:{creature:true},power:2000},
    '相手のシールドが2つ以下なら自分の自然のクリーチャーすべてのパワーをバトル中+5000する。':{filter:{creature:true,color:'自然'},condition:{g465OpponentShieldsMax:2},power:5000},
    'バトル中自分の他のレクスターズすべてのパワーを+2000する。':{filter:{creature:true,race:'レクスターズ'},other:true,power:2000}
   }[line];if(battleAura){if(spec.g466BattleAura)throw Error('重複するバトル中の常在効果');spec.g466BattleAura=battleAura;continue;}
   if(line==='このクリーチャーのバトル中バトルしている相手クリーチャーは破壊されない。'){if(spec.g466ProtectOpponent)throw Error('重複する相手のバトル破壊防止');spec.g466ProtectOpponent=true;continue;}
   if(line==='このクリーチャーはパワー5500以下のクリーチャーとのバトル中破壊されない。'){if(spec.g466BattleSafe)throw Error('重複するパワー別のバトル破壊防止');spec.g466BattleSafe={maxOpponentPower:5500};continue;}
   if(line==='バラバラエティ3:バトル中このクリーチャーは破壊されない。(コストが異なる自分のエレメントが3つ以上あればこのクリーチャーにこの能力を与える)'){if(spec.g260Self)throw Error('重複するコスト種類条件');spec.g260Self={filter:{g466DistinctCosts:3},grants:{g34BattleSafe:true}};continue;}
  }
  if(phase>=465&&creature){
   const shieldProtection={
    '自分の光のクリーチャーがバトルゾーンにあればこのクリーチャーは破壊されない。':{creature:true,color:'光'},
    '自分の墓地にカードが10枚以上あればこのクリーチャーは破壊されない。':{g273Grave:{n:10,filter:{}}},
    '鬼タイム:自分のターン中自分と相手のシールドの数が合計6つ以下ならこのクリーチャーは破壊されない。':{g465OwnTurn:true,g334ZoneCount:{zone:'shields',sumBoth:true,max:6}},
    '相手のシールドが2つ以下ならこのクリーチャーは破壊されない。':{g465OpponentShieldsMax:2}
   }[line];if(shieldProtection){if(spec.g260Self)throw Error('重複する破壊防止条件');spec.g260Self={filter:shieldProtection,grants:{g465DestroySafe:true}};continue;}
   if(line==='バトル中このクリーチャーは破壊されない。'){if(spec.g34BattleSafe)throw Error('重複するバトル中の破壊防止');spec.g34BattleSafe=true;continue;}
   if(line==='このクリーチャーはすべてのバトルに勝つ。(相手クリーチャーのパワーの方が大きくても相手クリーチャーはバトルに負ける。バトルしているクリーチャー両方がこの能力を持っている場合はどちらも破壊されない)'){if(spec.g34AlwaysWin)throw Error('重複するバトル勝利');spec.g34AlwaysWin=true;continue;}
  }
  if(phase>=464&&creature){
   if(m=line.match(/^各ターンに(?:一度|1度)自分の(光水または自然|水闇または火|闇火または自然|光水または闇|光火または自然|超化獣)の?(?:クリーチャーの)召喚コストを1少なくしてもよい。ただしコストは0以下にはならない。$/)){if(spec.g464OnceSummon)throw Error('重複するターン1度の召喚軽減');const q=m[1];spec.g464OnceSummon={amount:1,...(q==='超化獣'?{race:q}:{colors:colors.filter(c=>q.includes(c))})};continue;}
  }
  if(phase>=463&&creature){
   if(m=line.match(/^各ターン自分の(?:(光|水|闇|火|自然)(?:または(光|水|闇|火|自然))?の)?クリーチャー1体目の召喚コストを1少なくしてもよい。ただしコストは(?:1より少なくならない|0以下には?ならない)。$/)){if(spec.g463FirstSummon||m[1]&&m[1]===m[2])throw Error('重複する最初の召喚軽減');spec.g463FirstSummon={colors:[m[1],m[2]].filter(Boolean),amount:1};continue;}
   if(line==='相手がクリーチャーを選ぶ時このクリーチャーは選べない。(ただしこのクリーチャーを攻撃またはブロックしてもよい)'){if(spec.untargetable)throw Error('重複する選択禁止');spec.untargetable=true;continue;}
  }
  if(phase>=461&&(creature||seed)){
   const turn={
    '各プレイヤーのターンのはじめにそのプレイヤーはカードを1枚引いてもよい。':{n:1,optional:true},
    '各プレイヤーは自分自身のターンのはじめにカードを1枚引いてもよい。そうした場合そのプレイヤーは手札を1枚捨てる。':{n:1,optional:true,discard:1},
    '各プレイヤーは自分自身のターンのはじめにカードを1枚引く。':{n:1}
   }[line];if(turn){if(turnStart.length||opponentStart.length)throw Error('重複するターン開始時能力');const def={op:'PlayersDraw461',activeOnly:true,...turn};turnStart.push(def);opponentStart.push(structuredClone(def));if(seed)spec.g461TurnPlayer=true;continue;}
   if(creature&&line==='相手がバトルゾーンからクリーチャーを選ぶ時このクリーチャーを選ぶことはできない。(ただしこのクリーチャーを攻撃またはブロックしてもよい)'){if(spec.untargetable)throw Error('重複する選択禁止');spec.untargetable=true;continue;}
  }
  if(phase>=458&&creature){
   if(/^このクリーチャーはバトルに勝ってもバトルの(?:あと|後)持ち主の墓地に置かれる。$/.test(line)){if(spec.afterBattleDie)throw Error('重複するバトル後の墓地移動');spec.afterBattleDie=true;continue;}
   if(m=line.match(/^(光|水|闇|火|自然)(?:または(光|水|闇|火|自然))?のクリーチャーとバトル(?:中|する時)このクリーチャーのパワーは\+([1-9]\d*)される。$/)){if(spec.g209BattlePower||m[1]===m[2])throw Error('重複する文明別バトル強化');spec.g209BattlePower={amount:+m[3],opponentColors:[m[1],...(m[2]?[m[2]]:[])]};powerBonus=true;continue;}
   if(line==='攻撃されている間このクリーチャーのパワーは+4000される。'){if(spec.g260Self)throw Error('重複する被攻撃条件');spec.g260Self={filter:{g458Defending:true},grants:{power:4000}};powerBonus=true;continue;}
   if(line==='このクリーチャーの上にどの種族の進化クリーチャーを置いてもよい。'){if(spec.g293AnyEvolutionRace)throw Error('重複する進化種族許可');spec.g293AnyEvolutionRace=true;continue;}
  }
  if(phase>=457&&creature){
   const presence=line.match(/^バトルゾーンに自分の(エンジェル・コマンド|ドラゴン|ディープ・マリーン)が(?:ある間|1体でもあれば)このクリーチャーのパワーは\+([1-9]\d*)される。$/);
   if(presence){if(spec.g260Self)throw Error('重複する種族条件');spec.g260Self={filter:{creature:true,race:presence[1]},grants:{power:+presence[2]}};powerBonus=true;continue;}
   const shields={
    '自分のシールドが5つ以上あればこのクリーチャーのパワーは+5000され「W・ブレイカー」を得る。(「W・ブレイカー」を得たクリーチャーはシールドを2枚ブレイクする)':{filter:{g334ZoneCount:{zone:'shields',min:5}},grants:{power:5000,breaker:2}},
    '自分のシールドが2枚以下の時このクリーチャーのパワーは+4000され「ブロッカー」を得る。':{filter:{g265ShieldsMax:2},grants:{power:4000,blocker:true}},
    '自分のシールドが1枚もなければこのクリーチャーは「ブロッカー」を得る。(相手クリーチャーが攻撃するときこのクリーチャーをタップしてその攻撃を阻止してよい。その後その相手クリーチャーとバトルする)':{filter:{g265ShieldsMax:0},grants:{blocker:true}},
    '自分のシールドが1枚もなければこのクリーチャーのパワーは+4000され「W(ダブル)・ブレイカー」を得る。':{filter:{g265ShieldsMax:0},grants:{power:4000,breaker:2}},
    '革命2―自分のシールドが2つ以下ならこのクリーチャーに「ブロッカー」を与える。(「ブロッカー」を持つクリーチャーをタップして相手クリーチャーの攻撃先をそのクリーチャーに変更してもよい)':{filter:{g265ShieldsMax:2},grants:{blocker:true}}
   }[line];if(shields){if(spec.g260Self)throw Error('重複するシールド条件');spec.g260Self=shields;if(shields.grants.power)powerBonus=true;continue;}
   if(line==='このクリーチャーを召喚するコストは自分のシールド1枚につき1少なくなる。ただしコストは1より少なくならない。'){if(spec.g212CountDiscount)throw Error('重複するシールド軽減');spec.g212CountDiscount={zone:'shields',filter:{},amount:1};continue;}
   const disp={
    'バトルゾーンに自分のディスペクターがなければこのクリーチャーは相手プレイヤーを攻撃できない。':{noPlayerAttack:false},
    'バトルゾーンに自分のディスペクターがあればこのクリーチャーのパワーを+5000し「W・ブレイカー」を与える。(「W・ブレイカー」を持つクリーチャーはシールドを2つブレイクする)':{power:5000,breaker:2}
   }[line];if(disp){const filter={creature:true,race:'ディスペクター'};if(spec.g260Self&&(JSON.stringify(spec.g260Self.filter)!==JSON.stringify(filter)||Object.keys(disp).some(k=>k in spec.g260Self.grants)))throw Error('重複するディスペクター条件');if(disp.noPlayerAttack===false)spec.noPlayerAttack=true;spec.g260Self={filter,grants:{...spec.g260Self?.grants,...disp}};if(disp.power)powerBonus=true;continue;}
  }
  if(phase>=453&&creature&&/^ロスト・プリズム\(このクリーチャーをバトルゾーンに出した時自分の山札の上から1枚目を表向きにしてもよい。それが多色カード(?:であれば|なら)手札に加える\)$/.test(line)){if(entry.length||nativeEntry)throw Error('独立したロスト・プリズム能力の順序対応が必要');entry.push({op:'Offer',g359RevealAll:true,title:'山札の一番上を公開する？',defs:[{op:'Look',n:1,public:true,stages:[{n:1,to:'hand',filter:{g223Multicolor:true}}],rest:'top'}]});continue;}
  if(phase>=450&&creature){
   const summon=line.match(/^自分のターン中(?:に一度)?(クリーチャー|進化クリーチャー|ディスペクター)を1体自分の(マナゾーン|墓地)から召喚してもよい。(?:\(コストは支払う\))?$/);
   if(summon){if(spec.g450ZoneSummon)throw Error('重複する制限つきゾーン召喚');spec.g450ZoneSummon={origin:summon[2]==='墓地'?'grave':'mana',filter:summon[1]==='進化クリーチャー'?{evolution:true}:summon[1]==='ディスペクター'?{race:'ディスペクター'}:{creature:true}};continue;}
   if(line==='いずれかのプレイヤーのシールドが2つ以下なら自分のターン中にクリーチャーを1体自分のマナゾーンから召喚してもよい。'){if(spec.g450ZoneSummon)throw Error('重複する制限つきゾーン召喚');spec.g450ZoneSummon={origin:'mana',filter:{creature:true},anyShieldsMax:2};continue;}
  }
  if(phase>=449&&line==='このカードを自分のマナゾーンに置いた時自分の手札にある多色カードを1枚相手に見せてもよい。そうしたらこのカードをアンタップする。'){if(spec.g449ManaReveal)throw Error('重複するマナ公開能力');spec.g449ManaReveal=true;continue;}
  if(phase>=448&&creature&&line==='このクリーチャーはパワーがこのクリーチャーより小さいクリーチャーにブロックされない。'){if(spec.g408LessPowerBlock)throw Error('重複するブロック制限');spec.g408LessPowerBlock=true;continue;}
  if(phase>=447&&creature&&(m=line.match(/^このクリーチャーが攻撃された(?:時|とき)(または相手(?:に|によって)選ばれた時)?(.+)$/))){
   if(spec.g447Attacked||m[1]&&spec.g447Selected)throw Error('重複する被攻撃・被選択能力');const defs=defense447(m[2],phase);if(!defs)throw Error('未対応の被攻撃・被選択能力');spec.g447Attacked=defs;if(m[1])spec.g447Selected=structuredClone(defs);continue;
  }
  if(phase>=444&&creature){
   const crew={
    'クルー・ブレイカー:ドラゴン(このクリーチャーはバトルゾーンにある自分の他のドラゴン1体につきシールドをさらにもう1枚ブレイクする)':{filter:{race:'ドラゴン'},other:true},
    'クルー・ブレイカー:サバイバー(シールドを攻撃したときバトルゾーンにある自分の他のサバイバー1体につきシールドをさらにもう1枚ブレイクする)':{filter:{race:'サバイバー'},other:true},
    'クルー・ブレイカー:ハンター(このクリーチャーはバトルゾーンにある自分の他のハンター1体につきシールドをさらにもう1枚ブレイクする)':{filter:{race:'ハンター'},other:true},
    'クルー・ブレイカー:多色クリーチャー(このクリーチャーはバトルゾーンにある自分の多色クリーチャー1体につきシールドをさらに1枚ブレイクする)':{filter:{multi:true}},
    'クルー・ブレイカー:ブロッカー(このクリーチャーはバトルゾーンにある自分の他の「ブロッカー」を持つクリーチャー1体につきシールドをさらにもう1枚ブレイクする)':{filter:{blocker:true},other:true}
   }[line];if(crew){if(spec.g444Crew)throw Error('重複するクルー・ブレイカー');spec.g444Crew=crew;continue;}
   if(line==='このクリーチャーはバトルゾーンにある自分の多色クリーチャー1体につき「パワーアタッカー+5000」を得る。'){if(spec.g207CountPower)throw Error('重複する枚数パワー');spec.g207CountPower={zone:'battle',filter:{creature:true,multi:true},amount:5000,attackOnly:true};powerBonus=true;continue;}
  }
  if(phase>=442&&creature&&line==='侍流ジェネレート(このクリーチャーをバトルゾーンに出した時自分の手札にあるクロスギアを1枚コストを支払わずにジェネレートしてもよい)'){if(spec.samuraiGenerate)throw Error('重複する侍流ジェネレート');spec.samuraiGenerate=true;continue;}
  if(phase>=434&&creature&&line==='水晶ソウル2(このクリーチャーを召喚する時自分のマナゾーンにある裏向きのカードのマナの数字は2になる)'){
   if(spec.g434CrystalSoul)throw Error('重複する水晶ソウル');spec.g434CrystalSoul=2;continue;
  }
  if(phase>=438&&creature&&line==='相手は呪文によってこのクリーチャーを選べない。'){if(spec.spellUntargetable)throw Error('重複する呪文への耐性');spec.spellUntargetable=true;continue;}
  if(phase>=427&&creature&&line==='自分のアンノウン・クリーチャーとゼニス・クリーチャーの召喚コストを2少なくする。ただしコストは0以下にはならない。'){if(spec.g349SummonAuras)throw Error('重複する種族軽減');spec.g349SummonAuras=[{filter:{raceAny:['アンノウン','ゼニス']},amount:2}];continue;}
  if(phase>=425&&creature&&(m=line.match(/^このクリーチャーがバトルゾーンから自分の墓地に置かれるとき墓地に置くかわりに自分の(手札に戻す|マナゾーンに置く)。$/))){const k=m[1]==='手札に戻す'?'graveToHand':'graveToMana';if(spec[k])throw Error('重複する墓地移動の置換');spec[k]=true;continue;}
  if(phase>=423&&creature&&line==='このクリーチャーを召喚する時自分のマナゾーンにあるオリジンのマナの数字は1のかわりに2になる。'){if(spec.g423OriginMana)throw Error('重複するマナ数字変更');spec.g423OriginMana=true;continue;}
  if(phase>=433&&creature&&line==='自分のタマシードがありこのクリーチャーが自分のシールドゾーンにあればこのクリーチャーに「S・トリガー」を与える。'){
   if(spec.g433SeedTrigger)throw Error('重複するタマシード条件のS・トリガー');spec.g433SeedTrigger=true;continue;
  }
  if(phase>=421&&creature){
   const oni={
    '鬼タイム:自分と相手のシールドの数が合計6つ以下ならこのクリーチャーに「スピードアタッカー」を与える。(「スピードアタッカー」を持つクリーチャーは召喚酔いしない)':{speedAttacker:true},
    '鬼タイム:自分と相手のシールドの数が合計6つ以下ならこのクリーチャーに「ブロッカー」を与える。(「ブロッカー」を持つクリーチャーをタップして相手クリーチャーの攻撃先をそのクリーチャーに変更してもよい)':{blocker:true},
    '鬼タイム:自分と相手のシールドの数が合計6つ以下ならこのクリーチャーに「パワーアタッカー+5000」と「W・ブレイカー」を与える。(「パワーアタッカー+5000」と「W・ブレイカー」を持つクリーチャーは攻撃中パワーを+5000されシールドを2つブレイクする)':{attackBonus:5000,breaker:2},
    '鬼タイム:自分と相手のシールドの数が合計6つ以下ならこのクリーチャーに「スレイヤー」を与える。(「スレイヤー」を持つクリーチャーがバトルする時バトルの後相手クリーチャーを破壊する)':{slayer:true}
   }[line];
   if(oni){if(spec.g260Self)throw Error('重複する鬼タイム条件');spec.g260Self={filter:{g334ZoneCount:{zone:'shields',sumBoth:true,max:6}},grants:oni};if(oni.attackBonus)powerBonus=true;continue;}
   if(m=line.match(/^このクリーチャーまたは自分の他のコスト([1-9]\d*)以上のクリーチャーをバトルゾーンに出した時(.+)$/)){
    const def=instruction(m[2],phase);if(def&&(def.op==='Target'||def.op==='Offer'&&def.defs.length===1&&def.defs[0].op==='Ramp')){if(spec.g251EntryDraw)throw Error('重複する条件付き登場能力');spec.g251EntryDraw={filter:{creature:true,min:+m[1]},selfAlways:true,defs:[def]};continue;}
   }
  }
  if(phase>=495&&(m=line.match(/^D・D・D\[([lwdfn]{2,5})(\d{2})\](?:\(自分のクリーチャーが攻撃する時このカードを\[\1\2\]支払って自分の手札から実行してもよい\))?$/))){
   const cs=[...m[1]],unique=[...new Set(cs)],names={l:'光',w:'水',d:'闇',f:'火',n:'自然'},valid=unique.length===1?cs.length===2:unique.length===cs.length&&cs.join('')===['l','w','d','f','n'].filter(c=>unique.includes(c)).join('');
   if(spec.ddd||evolution||!valid||+m[2]<unique.length)throw Error('未対応のD・D・D支払い');spec.ddd={cost:+m[2],civilizations:unique.map(c=>names[c])};continue;
  }
  if(phase>=420&&f.typeText==='呪文'&&/^サイクロン\(このターンこの呪文を唱える(?:直)?前にクリーチャーを召喚していればこの呪文を唱えた後墓地に置くかわりに自分の手札に戻す\)$/.test(line)){if(spec.g420Cyclone)throw Error('重複するサイクロン');spec.g420Cyclone=true;continue;}
  if(phase>=419&&f.typeText==='呪文'&&chance419(line)){if(spec.g417Chance)throw Error('重複するアタック・チャンス');spec.g417Chance=chance419(line);continue;}
  if(phase>=418&&f.typeText==='呪文'&&chance418(line)){if(spec.g417Chance)throw Error('重複するアタック・チャンス');spec.g417Chance=chance418(line);continue;}
  if(phase>=417&&f.typeText==='呪文'&&(m=line.match(/^アタック・チャンス:(光|水|闇|火|自然)のパワー([1-9]\d*)以上のクリーチャー\(自分の指定のクリーチャーが攻撃する時このカードをコストを支払わずに実行してもよい\)$/))){if(spec.g417Chance)throw Error('重複するアタック・チャンス');spec.g417Chance={color:m[1],minPower:+m[2]};continue;}
  if(phase>=417&&f.typeText==='呪文'&&(m=line.match(/^リサイクル\[([a-z]{2}\d{2})\]\(この呪文を(?:自分の)?墓地から「リサイクル」コストを支払って唱えてもよい。こうして唱えた後墓地のかわりに(?:自分の)?山札の下に置く\)$/))){const payment=mana402(m[1]);if(spec.graveCast||!payment||JSON.stringify(payment.civilizations)!==JSON.stringify(f.civilizations))throw Error('未対応のリサイクル支払い');spec.graveCast=true;spec.g416RecycleCost=payment.cost;continue;}
  if(phase>=416&&f.typeText==='呪文'&&(m=line.match(/^リサイクル:\(この呪文を墓地からコスト([1-9]\d*)を支払って唱えてもよい。そうして唱えた後墓地に置くかわりに自分の山札の一番下に置く\)$/))){if(spec.graveCast)throw Error('重複する墓地からの詠唱');spec.graveCast=true;spec.g416RecycleCost=+m[1];continue;}
  if(phase>=415&&creature&&(m=line.match(/^「ムゲンクライム」能力を使ってこのクリーチャーをタップした時(.+)$/))){const defs=clauses(m[1],phase).map(q=>instruction(q,phase));if(spec.g415MugenTapped||!defs.length||defs.some(q=>!q))throw Error('未対応のムゲンクライム使用時能力');spec.g415MugenTapped=defs;continue;}
  if(phase>=415&&creature&&(m=line.match(/^ムゲンクライム([1-5])\(自分のクリーチャーを\1体タップし\[([a-z]{2}\d{2})\]支払ってこのクリーチャーを自分の手札または墓地から召喚してもよい\)$/))){
   const payment=mana402(m[2]);if(!payment||payment.cost!==+m[1]||JSON.stringify([...payment.civilizations].sort())!==JSON.stringify([...f.civilizations].sort())||spec.mugenCrime)throw Error('未対応のムゲンクライム支払い');spec.mugenCrime=+m[1];continue;
  }
  if(phase>=414&&creature&&(line==='シールド・プラス-このクリーチャーをバトルゾーンに出した時自分の山札の上から1枚目を裏向きのまま自分のシールドいずれかの下に置いてもよい。(こうして重ねたカードの束を1枚のシールドとみなす)'||phase>=638&&line==='シールド・プラス:このクリーチャーが出た時自分の山札の上から1枚を裏向きで自分のシールド1つの下に置いてもよい。(そのシールドの束は1つと数える)')){if(spec.g414ShieldPlus)throw Error('重複するシールド・プラス');spec.g414ShieldPlus=true;continue;}
  if(phase>=407&&creature&&/^(?:このクリーチャーが(?:バトルゾーンに)?出た時|このクリーチャーをバトルゾーンに出した時)このクリーチャーを破壊してもよい。そうした(?:場合|ら)次のうちいずれか(?:1つ|ひとつ)を選ぶ。$/.test(line)){
   if(entry.length||nativeEntry)throw Error('独立した誘発能力の順序対応が必要');const modes=[];while(i+1<lines.length&&normalize(lines[i+1]).startsWith('▶')){const text=normalize(lines[++i]).slice(1),defs=clauses(text,phase).map(q=>instruction(q,phase));if(!defs.length||defs.some(t=>!t))throw Error('未対応の自壊後の選択能力');modes.push({label:lines[i].replace(/^\s*▶/,'').trim(),defs});}if(modes.length<2)throw Error('選択能力の不足');entry.push({op:'SelfSacrifice407',defs:[{op:'Choose',g184Modes:true,modes}]});continue;
  }
  if(phase>=405&&creature&&(m=line.match(/^(マナ|墓地)?光臨[-―−–—]自分のターンの終わりにこのクリーチャーがタップされて(?:いれば|いた場合)(.+)$/))){
   if(spec.g405Kourin)throw Error('重複する光臨');
   const body=m[2];let rule;
   if(!m[1]){const q=body.match(/^自分の山札を見る。その中からコスト([1-9]\d*)以下の(.+?)を1体(?:選び)?バトルゾーンに出してもよい。その後山札をシャッフルする。$/),races=new Set(['オラクル','メカ・デル・ソル','グレートメカオー','ゴッド','ドラゴン・ゾンビ','アーマード・ドラゴン','アースイーター','フレイム・コマンド','グランド・デビル','スノーフェアリー','アーク・セラフィム']);if(q){const names=q[2].split('または');if(q[2]==='無色クリーチャー')rule={origin:'deck',filter:{creature:true,max:+q[1],noColor:true}};else if(phase>=661&&q[2]==='「シールド・ゴー」を持つクリーチャー')rule={origin:'deck',filter:{creature:true,max:+q[1],g661ShieldGo:true}};else if(names.every(n=>races.has(n)))rule={origin:'deck',filter:{creature:true,max:+q[1],...(names.length===1?{race:names[0]}:{raceAny:names})}};}}
   else if(m[1]==='マナ'){const q=body.match(/^自分のマナゾーンからコスト([1-9]\d*)以下の進化ではないクリーチャーを1体バトルゾーンに出してもよい。$/);if(q)rule={origin:'mana',filter:{creature:true,max:+q[1],nonEvolution:true}};}
   else{const q=body.match(/^コスト([1-9]\d*)以下のデスパペットを1体自分の墓地からバトルゾーンに出してもよい。$/);if(q)rule={origin:'grave',filter:{creature:true,max:+q[1],race:'デスパペット'}};}
   if(!rule)throw Error('未対応の光臨条件');spec.g405Kourin=rule;continue;
  }
  if(phase>=402){
   if(m=line.match(/^キリフダッシュ\[([a-z]{2}\d{2})\]\(自分のクリーチャーの攻撃の終わりにそのクリーチャーがその攻撃中にシールドをブレイクしていればこの(クリーチャー|呪文)を\[\1\]支払って(召喚し|唱え)てもよい\)$/)){const pay=mana402(m[1]);if(!pay||spec.kirifudaDash||(m[2]==='クリーチャー'?!creature||m[3]!=='召喚し':creature||seed||m[3]!=='唱え'))throw Error('未対応のキリフダッシュ');spec.kirifudaDash=pay.cost;spec.g402DashColors=pay.civilizations;continue;}
   if(creature&&(m=line.match(/^フシギバース\[([a-z]{2})(\d{2})\]\(自分のクリーチャーを1体タップしてマナゾーンに置き\[\1\2\]からそのクリーチャーのコストを引いた数のコストを支払ってこのクリーチャーを自分の墓地から召喚してもよい。ただしコストは\[\1(\d{2})\]より少なく(?:は)?ならない\)$/))){const pay=mana402(m[1]+m[2]),min=mana402(m[1]+m[3]);if(!pay||!min||min.cost>pay.cost||spec.fushigibirth)throw Error('未対応のフシギバース');spec.fushigibirth=pay.cost;spec.fushiMin=min.cost;spec.g402FushiColors=pay.civilizations;continue;}
  }
  if(phase>=401&&(creature||seed)&&line===`シールド・セイバー(自分のシールドがブレイクされる時かわりにこの${seed?'タマシード':'クリーチャー'}を破壊してもよい)`){if(spec.g401ShieldSaver)throw Error('重複するシールド・セイバー');spec.g401ShieldSaver=true;continue;}
  if(phase>=399&&creature){
   if(phase>=643&&(m=line.match(/^Jチェンジ([1-9]\d*)\(このクリーチャーが攻撃する時これと自分のマナゾーンにあるコスト\1以下のジョーカーズ・クリーチャー1体を入れ替えてもよい\)$/))){
    if(spec.g393Change)throw Error('重複するJチェンジ');
    spec.g393Change={mana:+m[1]};
    continue;
   }
   if(phase>=642&&(m=line.match(/^Jクライム([1-9]\d*)\(このクリーチャーが攻撃する時これと自分の墓地にあるコスト\1以下のジョーカーズ・クリーチャー1体を入れ替えてもよい\)$/))){
    if(spec.g393Change)throw Error('重複するJクライム');
    spec.g393Change={grave:+m[1]};
    continue;
   }
   if(m=line.match(/^Jチェンジ([1-9]\d*)\(このクリーチャーが攻撃する時このクリーチャーと自分のマナゾーンにあるコスト\1以下のジョーカーズ1体を入れ替えてもよい\)$/)){if(spec.g393Change)throw Error('重複するJチェンジ');spec.g393Change={mana:+m[1]};continue;}
   if(m=line.match(/^アバレチェーン:自分のクリーチャーが攻撃する時それがこのターン最初の攻撃なら(.+)$/)){if(spec.g252AttackWatch)throw Error('重複する攻撃監視');const defs=abare399(m[1],phase);if(!defs)throw Error('未対応のアバレチェーン');spec.g252AttackWatch={who:'self',first:true,filter:{creature:true},g399Attacker:true,defs};continue;}
  }
  if(phase>=398&&creature){
   if(line==='ヨビニオン(このクリーチャーが召喚によって出た時自分の山札の上からこれよりコストが小さいクリーチャーが出るまで表向きにしてもよい。そのクリーチャーを出す。残りをシャッフルし山札の下に置く)'){if(spec.yobinion)throw Error('重複するヨビニオン');spec.yobinion=true;continue;}
   if(m=line.match(/^ニンジャ・ストライク([1-9]\d*)\(相手のクリーチャーが攻撃またはブロックした時自分のマナゾーンにカードが\1枚以上ありその攻撃中に「ニンジャ・ストライク」能力を使っていな(?:かった場合|ければ|かったら)このシノビをコストを支払わずに召喚してもよい。そのターンの終わりにこのシノビを(?:自分の)?山札の(?:一番)?下に置く\)$/)){if(spec.ninjaStrike)throw Error('重複するニンジャ・ストライク');spec.ninjaStrike=true;spec.ninjaMin=+m[1];spec.ninjaColors=[];continue;}
  }
  if(phase>=397&&(creature||seed)&&(m=line.match(/^シンカパワー:この(?:クリーチャー|タマシード)が(?:進化する時|進化元になる時)(.+)$/))){
   if(spec.g397Shinka)throw Error('重複するシンカパワー');const defs=shinka397(m[1],phase);if(!defs)throw Error('未対応のシンカパワー');spec.g397Shinka=defs;continue;
  }
  if(phase>=396&&line.startsWith('G・ゼロ')){const zero=zero396(line,phase);if(!zero||spec.g396Zero)throw Error('未対応のG・ゼロ条件');spec.g396Zero=zero;continue;}
  if(phase>=391&&creature){
   if(line==='バトルゾーンに他に自分のクリーチャーがなければこのクリーチャーは「パワーアタッカー+4000」と「W・ブレイカー」を得る。(攻撃中そのクリーチャーのパワーは+4000されシールドを攻撃したときシールドを2枚ブレイクする。)'){if(spec.g260Self)throw Error('重複する自己強化条件');spec.g260Self={filter:{g370BattleCount:{filter:{creature:true},max:1}},grants:{attackBonus:4000,breaker:2}};powerBonus=true;continue;}
   if(line==='自分のアンノウンをバトルゾーンに出した時自分のマナゾーンのクリーチャーを1体新しいシールドとしてシールドゾーンに裏向きにして加えてもよい。'){if(spec.g251EntryDraw)throw Error('重複する登場監視能力');spec.g251EntryDraw={filter:{race:'アンノウン'},defs:[{op:'Select',origin:'mana',to:'shields',n:1,filter:{creature:true},optional:true,title:'シールドに置く自分のマナのクリーチャーを1体まで選ぶ'}]};continue;}
  }
  if(phase>=390&&creature){
   if(line==='自分のコマンド・ドラゴンの召喚コストを1少なくしてもよい。ただしコストは1より少なくならない。'){if(spec.g349SummonAuras)throw Error('重複する召喚軽減');spec.g349SummonAuras=[{race:'コマンド・ドラゴン',amount:1}];continue;}
   if(line==='自分のドラゴンが破壊される時墓地に置くかわりに自分の手札に戻す。'){if(spec.g390DestroyToHand)throw Error('重複する破壊置換');spec.g390DestroyToHand={filter:{race:'ドラゴン'}};continue;}
   if(line==='鬼タイム:自分と相手のシールドの数が合計6つ以下なら真上の▪️能力を無視する。'){if(!spec.noAttack||normalize(lines[i-1]||'')!=='このクリーチャーは攻撃できない。')throw Error('鬼タイムで無視する直前の能力が未対応');if(spec.g260Self)throw Error('重複する自己条件');spec.g260Self={filter:{g334ZoneCount:{zone:'shields',sumBoth:true,max:6}},grants:{noAttack:false}};continue;}
  }
  if(phase>=389&&creature){
   if(line==='自分の手札が3枚以上あればこのクリーチャーのパワーを+3000する。'){if(spec.g260Self)throw Error('重複する自己強化条件');spec.g260Self={filter:{g334ZoneCount:{zone:'hand',min:3}},grants:{power:3000}};powerBonus=true;continue;}
   if(line==='鬼タイム:このクリーチャーが攻撃する時自分と相手のシールドの数が合計6つ以下なら相手のクリーチャーを1体選ぶ。このターンそのクリーチャーのパワーを-4000する。(パワー0以下のクリーチャーは破壊される)'){if(attack.length)throw Error('独立した誘発能力の順序対応が必要');attack.push({op:'IfOwn',filter:{g334ZoneCount:{zone:'shields',sumBoth:true,max:6}},defs:[{op:'Target',power:-4000,g242PowerMinus:true,title:'パワーを-4000する相手のクリーチャーを1体選ぶ'}]});continue;}
  }
  if(phase>=363){
   const modal=!creature&&!seed&&modal363(line);if(modal){if(entry.length||nativeEntry)throw Error('独立した誘発能力の順序対応が必要');entry.push(modal);continue;}
   if(creature&&line==='自分の水と闇を両方持つクリーチャーがバトルゾーンに出た時次のうちいずれか1つを選ぶ。▼カードを1枚引く。▼相手は自身の手札を1枚選び捨てる。'){if(spec.g251EntryDraw)throw Error('重複する登場監視能力');spec.g251EntryDraw={filter:{creature:true,colorsAll:['水','闇']},defs:[{op:'Choose',g184Modes:true,modes:[{label:'カードを1枚引く',defs:[{op:'Draw',n:1}]},{label:'相手が自身の手札1枚を選んで捨てる',defs:[{op:'Discard',n:1}]}]}]};continue;}
  }
  if(phase>=357&&creature&&line==='自分のクリーチャーをバトルゾーンに出した時アーク・セラフィムまたはワイルド・ベジーズを1体自分のマナゾーンから手札に戻してもよい。'){if(spec.g251EntryDraw)throw Error('重複する登場監視能力');spec.g251EntryDraw={filter:{creature:true},defs:[{op:'Select',origin:'mana',to:'hand',n:1,optional:true,filter:{creature:true,raceAny:['アーク・セラフィム','ワイルド・ベジーズ']},g232ManaReturn:true,title:'手札に戻すアーク・セラフィムかワイルド・ベジーズを選ぶ'}]};continue;}
  if(phase>=355&&creature){
   const watch={
    '自分のアンノウンをバトルゾーンに出した時相手のパワー4000以下のクリーチャーを1体破壊する。':{filter:{creature:true,race:'アンノウン'},defs:[instruction('相手のパワー4000以下のクリーチャーを1体破壊する。',phase)]},
    '自分のパワー6000以上のクリーチャーをバトルゾーンに出した時相手は自身の手札を1枚選び捨てる。':{filter:{creature:true,minPower:6000,g199Power:true},defs:[{op:'Discard',n:1}]},
    '自分の多色クリーチャーをバトルゾーンに出した時相手のクリーチャーを1体バトルゾーンから選びタップする。そのクリーチャーは次の相手のターンのはじめにアンタップされない。':{filter:{creature:true,multi:true},defs:[instruction('相手のクリーチャーを1体選びタップする。次の相手のターンのはじめにそのクリーチャーはアンタップしない。',phase)]},
    '自分のコマンド・ドラゴンをバトルゾーンに出した時自分の山札の上から1枚目をマナゾーンに置いてもよい。':{filter:{creature:true,race:'コマンド・ドラゴン'},defs:[{op:'Offer',title:'山札の上1枚をマナに置く？',defs:[{op:'Ramp',n:1}]}]}
   }[line];
   if(watch){if(spec.g251EntryDraw)throw Error('重複する登場監視能力');if(watch.defs.some(d=>!d))throw Error('未対応の登場監視効果');spec.g251EntryDraw=watch;continue;}
   if(line==='バトルゾーンにある自分のコマンド・ドラゴンの召喚コストを1少なくしてもよい。ただしコストは1より少なくならない。'){if(spec.g290SummonAura)throw Error('重複する召喚コスト軽減');spec.g290SummonAura={race:'コマンド・ドラゴン',amount:1};continue;}
  }
  if(phase>=354&&creature){
   const condition={
    'バトルゾーンに自分のビートジョッキーが2体以上あればこのクリーチャーに「スピードアタッカー」を与える。(「スピードアタッカー」を持つクリーチャーは召喚酔いしない)':{filter:{creature:true,race:'ビートジョッキー',g258Civil:2},grants:{speedAttacker:true}},
    'バトルゾーンに自分の進化クリーチャーがある時このクリーチャーは「ブロッカー」を得る。':{filter:{creature:true,evolution:true},grants:{blocker:true}},
    'バトルゾーンに自分のガーディアンが他に1体でもあればこのクリーチャーは「ブロッカー」を得る。':{filter:{creature:true,race:'ガーディアン',g334Other:true},grants:{blocker:true}},
    'バトルゾーンに自分の無色クリーチャーがあればこのクリーチャーのパワーは+6000され「T・ブレイカー」を得る。':{filter:{creature:true,noColor:true},grants:{power:6000,breaker:3}}
   }[line];
   if(condition){if(spec.g260Self)throw Error('重複する味方条件');spec.g260Self=condition;if(condition.grants.power)powerBonus=true;continue;}
  }
  if(phase>=352&&creature){
   const tribal=line.match(/^自分の(ハンター|ドラゴン|ティラノ・ドレイクまたはブレイブ・スピリット)が攻撃する時(相手の「ブロッカー」を持つクリーチャーを1体破壊する。)$/),first=line.match(/^自分のクリーチャーが攻撃する時それがそのターンはじめての攻撃であれば(相手の「ブロッカー」を持つクリーチャーを1体破壊する。|相手のパワー3000以下のクリーチャーを1体破壊する。)$/);
   if(tribal||first){const filter={creature:true,...(tribal?tribal[1].includes('または')?{raceAny:tribal[1].split('または')}:{race:tribal[1]}:{})},def=instruction(tribal?tribal[2]:first[1],phase),watch={who:'self',...(first?{first:true}:{}),filter,defs:[def]};if(!def)throw Error('未対応の攻撃監視効果');if((spec.g253AttackWatches||[]).some(w=>JSON.stringify(w)===JSON.stringify(watch)))throw Error('重複する条件付き攻撃監視能力');(spec.g253AttackWatches??=[]).push(watch);continue;}
  }
  if(phase>=351&&creature&&line==='自分の《漢》と名前にあるクリーチャーすべてに「スピードアタッカー」を与える。(「スピードアタッカー」を持つクリーチャーは召喚酔いしない)'){const aura={filter:{creature:true,g227NameIncludes:'漢'},grants:{speedAttacker:true}};if((spec.g208Auras||[]).some(a=>JSON.stringify(a)===JSON.stringify(aura)))throw Error('重複する常在付与');(spec.g208Auras??=[]).push(aura);continue;}
  if(phase>=351&&creature&&line==='自分の他のハンターは攻撃されない。'){const aura={filter:{creature:true,race:'ハンター'},other:true,grants:{cannotBeAttacked:true}};if((spec.g208Auras||[]).some(a=>JSON.stringify(a)===JSON.stringify(aura)))throw Error('重複する常在付与');(spec.g208Auras??=[]).push(aura);continue;}
  if(phase>=350&&creature){
   const rules={
    '自分のハンターの召喚コストを1少なくしてもよい。ただしコストは1より少なくならない。':[{race:'ハンター',amount:1}],
    '種族に「コマンド」とある自分のクリーチャーの召喚コストを1少なくしてもよい。ただしコストは1より少なくならない。':[{race:'コマンド',amount:1}],
    '自分のドラゴンの召喚コストを1コマンドの召喚コストを1少なくしてもよい。ただしコストは1より少なくならない。':[{race:'ドラゴン',amount:1},{race:'コマンド',amount:1}],
    '自分のティラノ・ドレイクを召喚するコストを1少なくしてもよい。ただしコストは1より少なくならない。':[{race:'ティラノ・ドレイク',amount:1}]
   }[line];
   if(rules){for(const rule of rules){if((spec.g349SummonAuras||[]).some(r=>JSON.stringify(r)===JSON.stringify(rule)))throw Error('重複する召喚軽減');(spec.g349SummonAuras??=[]).push(rule);}continue;}
  }
  if(phase>=383&&creature&&line==='自分の火のドラゴンをバトルゾーンに出した時相手の「ブロッカー」を持つクリーチャーを1体破壊する。'){if(spec.g251EntryDraw)throw Error('重複する登場監視');spec.g251EntryDraw={filter:{creature:true,color:'火',race:'ドラゴン'},defs:[{op:'Target',to:'grave',filter:{blocker:true}}]};continue;}
  if(phase>=384&&creature){
   const color={'自分の闇の進化クリーチャーを召喚するコストを1少なくしてもよい。ただしコストは1より少なくならない。':'闇','自分の火の進化クリーチャーを召喚するコストを1少なくしてもよい。ただしコストは1より少なくならない。':'火'}[line];
   if(color){if(spec.g349SummonAuras)throw Error('重複する召喚軽減');spec.g349SummonAuras=[{filter:{color,evolution:true},amount:1}];continue;}
  }
  if(phase>=382&&creature){
   if(line==='自分の多色クリーチャーをバトルゾーンに出した時相手はカードを1枚自身の手札から選んで捨てる。'){if(spec.g251EntryDraw)throw Error('重複する登場監視');spec.g251EntryDraw={filter:{creature:true,multi:true},defs:[{op:'Discard',n:1}]};continue;}
   if(line==='自分のグレートメカオーの召喚コストを最大2少なくしてもよい。ただしコストは1より少なくならない。'){if(spec.g349SummonAuras)throw Error('重複する召喚軽減');spec.g349SummonAuras=[{race:'グレートメカオー',amount:2}];continue;}
  }
  if(phase>=378&&creature){
   if(line==='このクリーチャーはコスト6以下のクリーチャーに攻撃されない。'){if(spec.g206AttackProtection)throw Error('重複する攻撃制限');spec.g206AttackProtection={maxCost:6};continue;}
   if(line==='このクリーチャーがバトルゾーンにある間自分の他の「サイバー」と付く種族がバトルゾーンに出たときカードを1枚引いてもよい。'){if(spec.g250EntryDraw)throw Error('重複する登場監視');spec.g250EntryDraw={filter:{creature:true,race:'サイバー'},self:false,defs:[{op:'Offer',defs:[{op:'Draw',n:1}]}]};continue;}
  }
  if(phase>=376&&creature){
   if(line==='自分のコマンド・ドラゴンの召喚コストを最大3少なくしてもよい。ただしコストは1より少なくならない。'){if(spec.g349SummonAuras)throw Error('重複する召喚軽減');spec.g349SummonAuras=[{race:'コマンド・ドラゴン',amount:3}];continue;}
   if(line==='自分のコマンド・ドラゴンをバトルゾーンに出した時このクリーチャーを破壊する。'){if(spec.g251EntryDraw)throw Error('重複する登場監視');spec.g251EntryDraw={filter:{creature:true,race:'コマンド・ドラゴン'},defs:[{op:'SelfDestroy'}]};continue;}
  }
  if(phase>=375&&creature&&line==='鬼タイム:自分と相手のシールドの数が合計6つ以下ならこのクリーチャーのパワーを+3000し「W・ブレイカー」を与える。(「W・ブレイカー」を持つクリーチャーはシールドを2つブレイクする)'){
   if(spec.g260Self)throw Error('重複する自己強化条件');spec.g260Self={filter:{g334ZoneCount:{zone:'shields',sumBoth:true,max:6}},grants:{power:3000,breaker:2}};powerBonus=true;continue;
  }
  if(phase>=370&&creature){
   const discount={
    'バトルゾーンに自分のクリーチャーが1体もなければこのクリーチャーの召喚コストを2少なくする。':{filter:{g370BattleCount:{max:0}},amount:2},
    'バトルゾーンに自分のビートジョッキーが3体以上あればこのクリーチャーの召喚コストを最大5少なくしてもよい。ただしコストは0以下にならない。':{filter:{g370BattleCount:{filter:{race:'ビートジョッキー'},min:3}},amount:5}
   }[line];
   if(discount){if(spec.g261Discount)throw Error('重複する条件付き軽減');spec.g261Discount=discount;continue;}
   if(line==='G・G・G:自分の手札が1枚以下なら自分のビートジョッキーの召喚コストは2少なくなる。ただしコストは0以下にならない。'){if(spec.g349SummonAuras)throw Error('重複する召喚軽減');spec.g349SummonAuras=[{filter:{race:'ビートジョッキー'},condition:{g334ZoneCount:{zone:'hand',max:1}},amount:2}];continue;}
  }
  if(phase>=498&&creature){
   const pair=line.match(/^自分の(光|水|闇|火|自然)のクリーチャーと(光|水|闇|火|自然)のクリーチャーを召喚するコストを1少なくしてもよい。ただしコストは1より少なくならない。$/);
   const rule=pair?{filter:{any:[{color:pair[1]},{color:pair[2]}]},amount:1}:{
    '自分の自然のパワー6000以上のクリーチャーの召喚コストを最大2少なくする。ただしコストは0以下にならない。':{filter:{color:'自然',minPower:6000},amount:2},
    '自分の火の進化クリーチャーの召喚コストを最大2少なくする。ただしコストは0以下にならない。':{filter:{color:'火',evolution:true},amount:2},
    '進化クリーチャーを召喚する時支払うコストは最大2少なくなる。ただしコストは1より少なくならない。':{filter:{evolution:true},both:true,amount:2}
   }[line];
   if(rule){if(spec.g349SummonAuras)throw Error('重複する召喚軽減');spec.g349SummonAuras=[rule];continue;}
  }
  if(phase>=369&&creature){
   const rule={
    '自分の自然の進化クリーチャーを召喚するコストを1少なくしてもよい。ただしコストは1より少なくならない。':{filter:{color:'自然',evolution:true},amount:1},
    '自分のパワー12000以上のクリーチャーの召喚コストを最大2少なくする。ただしコストは0以下にはならない。':{filter:{minPower:12000},amount:2},
    '各プレイヤーはクリーチャーを召喚する時支払うコストが1少なくなる。ただしコストが1の時は少なくならない。':{filter:{},both:true,amount:1}
   }[line];
   if(rule){if(spec.g349SummonAuras)throw Error('重複する召喚軽減');spec.g349SummonAuras=[rule];continue;}
  }
  if(phase>=349&&creature){
   const reductions={
    '自分のドラゴンを召喚するコストを1少なくしてもよい。ただしコストは1より少なくならない。':[{race:'ドラゴン',amount:1}],
    '自分の種族に「コマンド」とあるクリーチャーを召喚するコストを1少なくしてもよい。ただしコストは1より少なくならない。':[{race:'コマンド',amount:1}],
    '自分の光のクリーチャーの召喚コストを1火のクリーチャーの召喚コストを1少なくしてもよい。ただしコストは1より少なくならない。':[{color:'光',amount:1},{color:'火',amount:1}],
    '自分のアンノウンの召喚コストを1ゼニスの召喚コストを1少なくしてもよい。ただしコストは1より少なくならない。':[{race:'アンノウン',amount:1},{race:'ゼニス',amount:1}]
   },rules=reductions[line];
   if(rules){for(const rule of rules){if((spec.g349SummonAuras||[]).some(r=>JSON.stringify(r)===JSON.stringify(rule)))throw Error('重複する召喚軽減');(spec.g349SummonAuras??=[]).push(rule);}continue;}
   if(line==='バトルゾーンにある自分のアンノウンはすべて「スピードアタッカー」を得る。'){const aura={filter:{creature:true,race:'アンノウン'},grants:{speedAttacker:true}};if((spec.g208Auras||[]).some(a=>JSON.stringify(a)===JSON.stringify(aura)))throw Error('重複する常在付与');(spec.g208Auras??=[]).push(aura);continue;}
  }
  if(phase>=347&&creature){
   if(['自分のターンのはじめにアンタップする時このクリーチャーはアンタップされない。','自分のターンのはじめにこのクリーチャーはアンタップしない。'].includes(line)){if(spec.g40StartNoUntap)throw Error('重複するターン開始時アンタップ制限');spec.g40StartNoUntap=true;continue;}
   if(line==='このクリーチャーはタップして出る。'){if(spec.g295EnterTapped)throw Error('重複するタップイン');spec.g295EnterTapped=true;continue;}
   if(line==='相手がバトルゾーンにクリーチャーを出した時このクリーチャーをアンタップする。'){if(spec.g314OtherEntry)throw Error('重複する登場監視');spec.g314OtherEntry={who:'opponent',defs:[{op:'Untap'}]};continue;}
   if(line==='自分の進化クリーチャーが攻撃する時このクリーチャーをアンタップする。'){if(spec.g252AttackWatch)throw Error('重複する攻撃監視');spec.g252AttackWatch={who:'self',filter:{creature:true,evolution:true},defs:[{op:'Untap'}]};continue;}
  }
  if(phase>=278&&creature&&line==='自分のクリーチャーがバトルに勝った時相手のシールドを1つブレイクしてもよい。'){if(spec.g252WinWatch)throw Error('重複するバトル勝利監視能力');spec.g252WinWatch={filter:{creature:true},defs:[{op:'Offer',defs:[{op:'Break278'}]}]};continue;}
  if(phase>=343&&creature&&line==='自分のティラノ・ドレイクがバトルに勝った時クリーチャーを1体自分の墓地から手札に戻してもよい。'){if(spec.g252WinWatch)throw Error('重複するバトル勝利監視能力');spec.g252WinWatch={filter:{creature:true,race:'ティラノ・ドレイク'},defs:[instruction('クリーチャーを1体自分の墓地から手札に戻してもよい。',phase)]};continue;}
  if(phase>=346&&creature&&line==='自分のハンターがバトルに勝った時自分の山札の上から1枚目をマナゾーンに置いてもよい。'){if(spec.g252WinWatch)throw Error('重複するバトル勝利監視能力');spec.g252WinWatch={filter:{creature:true,race:'ハンター'},defs:[{op:'Offer',defs:[{op:'Ramp',n:1}]}]};continue;}
  if(phase>=341&&creature){
   const aura=line.match(/^(?:バトルゾーンにある)?自分のクリーチャーはすべて種族に(ジョーカーズ|アウトレイジ)を追加する。$/);
   if(aura){if(spec.g208Auras)throw Error('重複する種族付与能力');spec.g208Auras=[{filter:{creature:true},grants:{raceAdd:[aura[1]]}}];continue;}
   let filter,grants;
   if(line==='バトルゾーンに自分の水のクリーチャーがあればこのクリーチャーはブロックされず種族にエンジェル・ドラゴンを追加する。'){filter={creature:true,color:'水'};grants={unblockable:true,raceAdd:['エンジェル・ドラゴン']};}
   else if(m=line.match(/^自分の光のクリーチャーがバトルゾーンに([1-9]\d*)体以上あればこのクリーチャーのパワーを\+([1-9]\d*)し種族にエンジェル・コマンドを追加する。$/)){filter={creature:true,color:'光',g258Civil:+m[1]};grants={power:+m[2],raceAdd:['エンジェル・コマンド']};}
   else if(m=line.match(/^バトルゾーンに自分のビートジョッキーが([1-9]\d*)体以上あればこのクリーチャーのパワーを\+([1-9]\d*)する。$/)){filter={creature:true,race:'ビートジョッキー',g258Civil:+m[1]};grants={power:+m[2]};}
   if(filter){if(spec.g260Self)throw Error('重複する味方条件');spec.g260Self={filter,grants};if(grants.power)powerBonus=true;continue;}
  }
  if(phase>=337&&creature){
   const head=line.match(/^バトルゾーンに自分の(.+?)(が他に1体でもあれば|が1体でもあれば|があれば)(.+)$/);
   if(head){const filters={'火のクリーチャー':{creature:true,color:'火'},'無色クリーチャー':{creature:true,noColor:true},'ドラゴンまたは自分のコスト7以上のクリーチャー':{creature:true,any:[{race:'ドラゴン'},{min:7}]},'光水闇または火のクリーチャー':{creature:true,any:['光','水','闇','火'].map(color=>({color}))}},filter=filters[head[1]],body=head[3];let grants;
    const pa=body.match(/^このクリーチャーは「パワーアタッカー\+([1-9]\d*)」(と「W・ブレイカー」)?を得る。(\([^()]*\))?$/);
    if(pa&&(!pa[3]||['(攻撃中そのクリーチャーのパワーは+'+pa[1]+'される)','(攻撃中「パワーアタッカー+'+pa[1]+'」を得たクリーチャーのパワーは+'+pa[1]+'される)'].includes(pa[3])))grants={attackBonus:+pa[1],...(pa[2]?{breaker:2}:{})};
    if(body==='このクリーチャーはタップしていないクリーチャーを攻撃できる。')grants={attackUntapped:true};
    const p=body.match(/^このクリーチャーのパワーは\+([1-9]\d*)され「W・ブレイカー」を得る。$/);if(p)grants={power:+p[1],breaker:2};
    if(filter&&grants){if(spec.g260Self)throw Error('重複する味方条件');spec.g260Self={filter:{...filter,...(head[2].includes('他に')?{g334Other:true}:{})},grants};if(grants.power||grants.attackBonus)powerBonus=true;continue;}
   }
  }
  if(phase>=334&&creature){
   let filter,body;
   if(m=line.match(/^自分のマナゾーンに(光|水|闇|火|自然)のカードがあれば(.+)$/)){filter={g267Mana:{n:1,color:m[1]}};body=m[2];}
   else if(line.startsWith('ラビリンス:自分のシールドの数が相手より多ければ')){filter={g334ZoneCount:{zone:'shields',moreThanOpponent:true}};body=line.slice('ラビリンス:自分のシールドの数が相手より多ければ'.length);}
   else if(line.startsWith('バトルゾーンに進化クリーチャーが1体でもあれば')){filter={creature:true,evolution:true,g334Both:true};body=line.slice('バトルゾーンに進化クリーチャーが1体でもあれば'.length);}
   else if(line.startsWith('バトルゾーンに自分のグランド・デビルが他に1体でもあれば')){filter={creature:true,race:'グランド・デビル',g334Other:true};body=line.slice('バトルゾーンに自分のグランド・デビルが他に1体でもあれば'.length);}
   else if(m=line.match(/^相手の墓地にカードが([1-9]\d*)枚以上ある時(.+)$/)){filter={g334ZoneCount:{zone:'grave',opponent:true,min:+m[1]}};body=m[2];}
   else if(m=line.match(/^相手のシールドが([0-9]+)つ以下なら(.+)$/)){filter={g334ZoneCount:{zone:'shields',opponent:true,max:+m[1]}};body=m[2];}
   if(filter){let grants;if(m=body.match(/^このクリーチャーのパワー(?:を|は)\+([1-9]\d*)(?:する|される)。$/))grants={power:+m[1]};else if(m=body.match(/^このクリーチャーのパワーは\+([1-9]\d*)され「W・ブレイカー」を得る。$/))grants={power:+m[1],breaker:2};else if(m=body.match(/^このクリーチャーのパワーを\+([1-9]\d*)し種族にソニック・コマンドを追加する。$/))grants={power:+m[1],raceAdd:['ソニック・コマンド']};if(grants){if(spec.g260Self)throw Error('重複する常在条件');spec.g260Self={filter,grants};powerBonus=true;continue;}}
  }
  if(phase>=332&&creature){
   const condition=line.replace(/^自分の進化クリーチャーがバトルゾーンにある時/,'バトルゾーンに自分の進化クリーチャーがあれば'),m=condition.match(/^バトルゾーンに自分の(.+?)が(?:ある間|1体でもあれば|あれば)(攻撃中)?このクリーチャーのパワーは\+([1-9]\d*)される。$/);
   if(m){const filters={'進化クリーチャー':{evolution:true}};for(const color of colors)filters[color+'のクリーチャー']={color};for(const r of['ドリームメイト','グレートメカオー','グランド・デビル','アーク・セラフィム','アーマロイド','ヒューマノイド'])filters[r]={race:r};if(filters[m[1]]){if(spec.g260Self)throw Error('重複する味方条件');spec.g260Self={filter:{creature:true,...filters[m[1]]},grants:{[m[2]?'attackBonus':'power']:+m[3]}};powerBonus=true;continue;}}
  }
  if(phase>=331&&creature&&line==='バトルゾーンにある自分の他のクリーチャーすべてのパワーは+500され種族に「ヒーロー」を追加する。'){if(spec.g205Aura||spec.g208Auras)throw Error('重複する常在付与能力');spec.g205Aura={power:500,filter:{creature:true},other:true};spec.g208Auras=[{filter:{creature:true},other:true,grants:{raceAdd:['ヒーロー']}}];continue;}
  if(phase>=330&&creature){
   if(m=line.match(/^このクリーチャーはパワーが6000以上の(?:時|とき)「W・ブレイカー」を得る。\(このクリーチャーはシールドを2枚ブレイクする\)$/)){if((spec.g207Breakers||[]).some(r=>r.power===6000))throw Error('重複するパワー別ブレイカー');(spec.g207Breakers??=[]).push({power:6000,breaker:2});continue;}
   if(line==='バトルゾーンに自分のファイアー・バードが1体でもあればこのクリーチャーは「W・ブレイカー」を得る。(「W・ブレイカー」を得たクリーチャーはシールドを2枚ブレイクする)'){if(spec.g260Self)throw Error('重複する味方条件');spec.g260Self={filter:{creature:true,race:'ファイアー・バード'},grants:{breaker:2}};continue;}
   if(line==='進化ー自分のヒューマノイド1体の上に置く。'){if(spec.evolution)throw Error('重複する進化条件');spec.evolution={race:'ヒューマノイド'};continue;}
  }
  if(phase>=328&&creature){
   if(line==='このクリーチャーはプレイヤーを攻撃できない。'){spec.noPlayerAttack=true;continue;}
   if(m=line.match(/^(自分のターン中)?自分の(他の)?クリーチャー(?:が(?:バトルゾーンに)?出た時|をバトルゾーンに出した時)(.+)$/)){
    const def=instruction(m[3],phase),allowed=def&&(def.op==='SelfBoost313'||def.op==='DiscardDraw'||def.op==='Look'&&def.g200Search&&def.n===2&&def.rest==='top'||def.op==='Target'&&def.tap&&!def.optional||def.op==='Offer'&&def.g299ShieldHand);
    if(allowed){const key=m[1]?'g249OtherEntry':m[2]?'g250EntryDraw':'g251EntryDraw';if(m[1]&&!m[2])throw Error('未対応の自分自身を含む自ターン登場監視');if(spec[key])throw Error('重複する登場監視能力');spec[key]={filter:{creature:true},...(key==='g250EntryDraw'?{self:false}:{}),defs:[def]};continue;}
   }
  }
  if(phase>=323&&creature){
   if(m=line.match(/^自分のクリーチャーがバトルゾーンに出た時(.+)$/)){
    const def=instruction(m[1],phase);
    if(def?.g323Scry){if(spec.g251EntryDraw)throw Error('重複する登場監視能力');spec.g251EntryDraw={filter:{creature:true},defs:[def]};continue;}
   }
   if(m=line.match(/^バトルゾーンに自分のクリーチャーが([1-9]\d*)体以上なければこのクリーチャーは攻撃できない。$/)){
    if(spec.g260Self)throw Error('重複する味方条件');spec.noAttack=true;spec.g260Self={filter:{creature:true,g258Civil:+m[1]},grants:{noAttack:false}};continue;
   }
   if(m=line.match(/^自分の手札が(0|[1-9]\d*)枚以下でなければこのクリーチャーは攻撃できない。$/)){
    if(spec.g225AttackRequires)throw Error('重複する攻撃条件');spec.g225AttackRequires={kind:'handCount',max:+m[1]};continue;
   }
  }
  if(phase>=277&&creature){
   const flag={
    '相手の墓地にあるカードは墓地を離れない。':'g277GraveLock',
    '自分のターン中相手はクリーチャーを召喚できない。':'g277OwnTurnSummonLock',
    'このクリーチャーの攻撃中相手は呪文を唱えられない。':'g277AttackSpellLock'
   }[line];
   if(flag){if(spec[flag])throw Error('重複する行動制限');spec[flag]=true;continue;}
  }
  if(phase>=276&&creature){
   if(line==='自分のクリーチャーが攻撃する時自分の山札の上から1枚目をシールド化してもよい。'){if(spec.g253AttackWatches)throw Error('重複する攻撃監視能力');spec.g253AttackWatches=[{who:'self',filter:{creature:true},defs:[{op:'Offer',defs:[{op:'ShieldTop',n:1}]}]}];continue;}
   if(line==='相手は自分のコスト3以上の進化クリーチャーを選べない。(ただしそのクリーチャーを攻撃またはブロックしてもよい)'){if(spec.g208Auras)throw Error('重複する進化保護能力');spec.g208Auras=[{filter:{creature:true,evolution:true,min:3},grants:{untargetable:true}}];continue;}
  }
  if(phase>=261){
   const civil=line.match(/^シビルカウント([1-9]\d*):自分の(光|水|闇|火|自然)のクリーチャーまたは\2のタマシードが合計([1-9]\d*)つ以上あれば(.+)$/),rainbow=line.match(/^レインボーナス:バトルゾーンに自分の多色クリーチャーがあれば(.+)$/);
   if(civil&&+civil[1]!==+civil[3])throw Error('シビルカウントの枚数不一致');
   if(civil||rainbow){const body=civil?civil[4]:rainbow[1],filter=civil?{creatureOrSeed:true,color:civil[2],g258Civil:+civil[1]}:{creature:true,multi:true},discount=body.match(/^(?:このクリーチャーを召喚するコストは|このクリーチャーの召喚コストを)([1-9]\d*)少なく(?:なる|する)。$/);
    if(creature&&discount){if(spec.g261Discount)throw Error('重複する条件付き軽減');spec.g261Discount={filter,amount:+discount[1]};continue;}
    if(!creature&&!seed&&body==='この呪文をコストを支払わずに唱えてもよい。'){if(spec.g261Free)throw Error('重複する条件付き無料詠唱');spec.g261Free={filter,label:civil?'シビルカウント'+civil[1]:'レインボーナス'};continue;}
   }
  }
  if(phase>=275&&creature&&f.typeText==='スター進化クリーチャー'){
   if(line==='バトルゾーンに自分のビートジョッキーまたはレクスターズが3体以上あればこのクリーチャーの召喚コストを5少なくする。'){if(spec.g261Discount)throw Error('重複する条件付き軽減');spec.g261Discount={filter:{creature:true,raceAny:['ビートジョッキー','レクスターズ'],g258Civil:3},amount:5};continue;}
   const star=line.match(/^スター進化:レクスターズ(?:または(光|水|闇|火|自然)のクリーチャー|(光|水|闇|火|自然)のクリーチャーまたは(光|水|闇|火|自然)のクリーチャー)1体の上に置く。(?:\(このクリーチャーが離れる時かわりに一番上のカードが離れる\))?$/);
   if(star){if(spec.evolution||star[2]&&star[2]===star[3])throw Error('重複進化条件');spec.evolution={any:[{race:'レクスターズ'},...[star[1],star[2],star[3]].filter(Boolean).map(civilization=>({civilization}))]};spec.starEvolution=true;continue;}
  }
  if(phase>=274&&creature&&f.typeText==='スター進化クリーチャー'){
   const star=line.match(/^スター進化:レクスターズまたは(光|水|闇|火|自然)のクリーチャー1体の上に置く。\(このクリーチャーが離れる時かわりに一番上のカードが離れる\)$/);
   if(star){if(spec.evolution)throw Error('重複進化条件');spec.evolution={any:[{race:'レクスターズ'},{civilization:star[1]}]};spec.starEvolution=true;continue;}
  }
  if(phase>=273&&creature){
   if(f.typeText==='スター進化クリーチャー'&&line==='スター進化:レクスターズまたは闇のクリーチャー1体の上に置く。(このクリーチャーが離れる時かわりに一番上のカードが離れる)'){if(spec.evolution)throw Error('重複進化条件');spec.evolution={any:[{race:'レクスターズ'},{civilization:'闇'}]};spec.starEvolution=true;continue;}
   const grave={
    '自分の墓地に火のクリーチャーが5体以上あればこのクリーチャーは攻撃されない。':{n:5,filter:{g228Face:{type:'creature',color:'火'}},grants:{cannotBeAttacked:true}},
    '自分の墓地に呪文が3枚以上あればこのクリーチャーのパワーを+4000し「W・ブレイカー」を与える。(「W・ブレイカー」を持つクリーチャーはシールドを2つブレイクする)':{n:3,filter:{g228Face:{type:'spell'}},grants:{power:4000,breaker:2}},
    '自分の墓地に闇のクリーチャーが2体以上あればこのクリーチャーのパワーを+2000し種族にデーモン・コマンドを追加する。':{n:2,filter:{g228Face:{type:'creature',color:'闇'}},grants:{power:2000,raceAdd:['デーモン・コマンド']}}
   }[line];
   if(grave){if(spec.g260Self)throw Error('重複する墓地条件');spec.g260Self={filter:{g273Grave:{n:grave.n,filter:grave.filter}},grants:grave.grants};if(grave.grants.power)powerBonus=true;continue;}
   const discount=line.match(/^自分の墓地に(?:カードが([1-9]\d*)枚以上|([1-9]\d*)枚以上カードが)あればこのクリーチャーの召喚コストを([1-9]\d*)少なくする。$/);
   if(discount){if(spec.g261Discount)throw Error('重複する条件付き軽減');spec.g261Discount={filter:{g273Grave:{n:+(discount[1]||discount[2]),filter:{}}},amount:+discount[3]};continue;}
  }
  if(phase>=271&&creature){
   const own={
    'バトルゾーンに自分の自然のクリーチャーがあればこのクリーチャーのパワーを+2000し「W・ブレイカー」を与え種族にメガ・ドラゴンを追加する。(「W・ブレイカー」を持つクリーチャーはシールドを2つブレイクする)':{color:'自然',grants:{power:2000,breaker:2,raceAdd:['メガ・ドラゴン']}},
    'バトルゾーンに自分の火のクリーチャーがあればこのクリーチャーは種族にデーモン・ドラゴンを追加しバトル中破壊されない。':{color:'火',grants:{raceAdd:['デーモン・ドラゴン'],g34BattleSafe:true}},
    'バトルゾーンに自分の光のクリーチャーがあればこのクリーチャーは種族にジュラシック・ドラゴンを追加し自分のターンの終わりにアンタップする。':{color:'光',grants:{raceAdd:['ジュラシック・ドラゴン'],g166EndUntap:true}},
    'バトルゾーンに自分の火のクリーチャーがあればこのクリーチャーに「パワーアタッカー+4000」と「W・ブレイカー」を与える。(「パワーアタッカー+4000」と「W・ブレイカー」を持つクリーチャーは攻撃中パワーを+4000されシールドを2つブレイクする)':{color:'火',grants:{attackBonus:4000,breaker:2}}
   }[line];
   if(own){if(spec.g260Self)throw Error('重複する味方文明条件');spec.g260Self={filter:{creature:true,color:own.color},grants:own.grants};if(own.grants.power||own.grants.attackBonus)powerBonus=true;continue;}
   if(line==='革命2―自分のシールドが2つ以下ならこのクリーチャーのパワーを+3000し種族にメガ・コマンド・ドラゴンを追加し「W・ブレイカー」を与える。'){if(spec.g260Self)throw Error('重複する革命条件');spec.g260Self={filter:{g265ShieldsMax:2},grants:{power:3000,breaker:2,raceAdd:['メガ・コマンド・ドラゴン']}};powerBonus=true;continue;}
  }
  if(phase>=269&&creature){
   const grants={
    '自分の超化獣クリーチャーがあればこのクリーチャーに「スピードアタッカー」を与える。(「スピードアタッカー」を持つクリーチャーは召喚酔いしない)':{speedAttacker:true},
    '自分の超化獣クリーチャーがあればこのクリーチャーのパワーを+4000する。':{power:4000},
    '自分の超化獣クリーチャーがあればこのクリーチャーのパワーを+3000する。':{power:3000},
    '自分の超化獣クリーチャーがあればこのクリーチャーはバトル中破壊されない。':{g34BattleSafe:true},
    '自分の超化獣クリーチャーがあればこのクリーチャーに「スレイヤー」を与える。(「スレイヤー」を持つクリーチャーがバトルする時バトルの後相手クリーチャーを破壊する)':{slayer:true}
   }[line];
   if(grants){if(spec.g260Self)throw Error('重複する超化獣条件');spec.g260Self={filter:{creature:true,race:'超化獣'},grants};if(grants.power)powerBonus=true;continue;}
   if(line==='このクリーチャーが攻撃する時その攻撃の後このクリーチャーを破壊する。'){if(attack.length)throw Error('独立した誘発能力の順序対応が必要');attack.push({op:'AfterAttackDestroy'});continue;}
  }
  if(phase>=268&&creature&&(m=line.match(/^マナ武装([1-9]\d*)[:―-]自分のマナゾーンに(光|水|闇|火|自然)のカードが([1-9]\d*)枚以上あれば(.+)$/))){
   if(+m[1]!==+m[3])throw Error('マナ武装の枚数不一致');
   const grants={
    'このクリーチャーは攻撃またはブロックされない。':{cannotBeAttacked:true,unblockable:true},
    'このクリーチャーはコスト4以下のクリーチャーに攻撃されない。':{g206AttackProtection:{maxCost:4}},
    'このクリーチャーは「パワーアタッカー+4000」と「W・ブレイカー」を得る。':{attackBonus:4000,breaker:2},
    'このクリーチャーのパワーは+4000され「W・ブレイカー」を得る。':{power:4000,breaker:2},
    'このクリーチャーのパワーを+5000し「T・ブレイカー」を与える。':{power:5000,breaker:3}
   }[m[4]];
   if(grants){const filter={g267Mana:{n:+m[3],color:m[2]}};if((spec.g268ManaGrants||[]).some(q=>JSON.stringify(q.filter)===JSON.stringify(filter)))throw Error('重複するマナ武装条件');(spec.g268ManaGrants??=[]).push({filter,grants});if(grants.power||grants.attackBonus)powerBonus=true;continue;}
  }
  if(phase>=267&&creature&&(m=line.match(/^マナ武装([1-9]\d*)[:―-]自分のマナゾーンに(?:(光|水|闇|火|自然)のカード|(多色カード))が([1-9]\d*)枚以上あれば(.+)$/))){
   if(+m[1]!==+m[4])throw Error('マナ武装の枚数不一致');
   const grants={
    'このクリーチャーのパワーを+4000し「W・ブレイカー」を与える。(「W・ブレイカー」を持つクリーチャーはシールドを2つブレイクする)':{power:4000,breaker:2},
    'このクリーチャーのパワーは+7000され「W・ブレイカー」を得る。':{power:7000,breaker:2},
    'このクリーチャーに「パワーアタッカー+5000」と「W・ブレイカー」を与える。(攻撃中このクリーチャーのパワーは+5000されシールドを2つブレイクする)':{attackBonus:5000,breaker:2},
    'このクリーチャーに「パワーアタッカー+4000」と「W・ブレイカー」を与える。(「パワーアタッカー+4000」を持つクリーチャーは攻撃中パワーを+4000される。「W・ブレイカー」を持つクリーチャーはシールドを2つブレイクする)':{attackBonus:4000,breaker:2}
   }[m[5]];
   if(grants){if(spec.g260Self)throw Error('重複するマナ武装条件');spec.g260Self={filter:{g267Mana:{n:+m[4],...(m[2]?{color:m[2]}:{multi:true})}},grants};powerBonus=true;continue;}
  }
  if(phase>=266&&creature&&(m=line.match(/^革命([1-9]\d*)[―:-](このクリーチャーが(?:バトルゾーンに)?出た時|このクリーチャーが攻撃する時|このクリーチャーがブロックした時)自分のシールドが([1-9]\d*)つ以下なら(.+)$/))){
   if(+m[1]!==+m[3])throw Error('革命のシールド数不一致');
   const dest=m[2].includes('攻撃する')?attack:m[2].includes('ブロックした')?block:entry,defs=clauses(m[4],phase).map(text=>instruction(text,phase));
   if(dest.length||dest===entry&&nativeEntry||!defs.length||defs.some(d=>!d))throw Error('未対応の革命誘発効果');
   dest.push({op:'IfOwn',filter:{g265ShieldsMax:+m[1]},defs});continue;
  }
  if(phase>=265&&creature){
   const shieldGrants={
    '自分のシールドが3枚以下の時このクリーチャーのパワーは+3000され「W・ブレイカー」を得る。':{max:3,grants:{power:3000,breaker:2}},
    '革命2―自分のシールドが2つ以下ならこのクリーチャーのパワーを+4000する。':{max:2,grants:{power:4000}},
    '革命2-自分のシールドが2つ以下ならこのクリーチャーのパワーを+8000し「T・ブレイカー」を与える。(「T・ブレイカー」を持つクリーチャーはシールドを3つブレイクする)':{max:2,grants:{power:8000,breaker:3}},
    '自分のシールドが1枚もなければこのクリーチャーは「パワーアタッカー+3000」を得タップされていないクリーチャーを攻撃することができる。':{max:0,grants:{attackBonus:3000,attackUntapped:true}},
    '革命2―自分のシールドが2つ以下ならこのクリーチャーはパワーを+1000されアンタップしているクリーチャーを攻撃できる。':{max:2,grants:{power:1000,attackUntapped:true}}
   }[line];
   if(shieldGrants){if(spec.g260Self)throw Error('重複するシールド条件');spec.g260Self={filter:{g265ShieldsMax:shieldGrants.max},grants:shieldGrants.grants};powerBonus=true;continue;}
  }
  if(phase>=264&&creature){
   const seedGrants={
    '自分のタマシードがあればこのクリーチャーに「パワーアタッカー+7000」と「T・ブレイカー」を与える。(「パワーアタッカー+7000」と「T・ブレイカー」を持つクリーチャーは攻撃中パワーを+7000されシールドを3つブレイクする)':{attackBonus:7000,breaker:3},
    '自分のタマシードがあればこのクリーチャーに「スピードアタッカー」を与える。(「スピードアタッカー」を持つクリーチャーは召喚酔いしない)':{speedAttacker:true},
    '自分のタマシードがあればこのクリーチャーに「ブロッカー」を与える。(「ブロッカー」を持つクリーチャーをタップして相手クリーチャーの攻撃先をそのクリーチャーに変更してもよい)':{blocker:true}
   }[line];
   if(seedGrants){if(spec.g260Self)throw Error('重複するタマシード条件');spec.g260Self={filter:{seed:true},grants:seedGrants};if(seedGrants.attackBonus)powerBonus=true;continue;}
  }
  if(phase>=260&&creature){
   const civil=line.match(/^シビルカウント([1-9]\d*):自分の(光|水|闇|火|自然)のクリーチャーまたは\2のタマシードが合計([1-9]\d*)つ以上あれば(.+)$/),rainbow=line.match(/^レインボーナス:バトルゾーンに自分の多色クリーチャーがあれば(.+)$/);
   if(civil&&+civil[1]!==+civil[3])throw Error('シビルカウントの枚数不一致');
   if(civil||rainbow){let body=civil?civil[4]:rainbow[1],turn;if(body.startsWith('相手のターン中')){turn='opponent';body=body.slice('相手のターン中'.length);}
    const bare=body.replace(/\((?:「スピードアタッカー」を持つクリーチャーは召喚酔いしない|「W・ブレイカー」を持つクリーチャーはシールドを2つブレイクする|「パワーアタッカー\+6000」と「W・ブレイカー」を持つクリーチャーは攻撃中パワーを\+6000されシールドを2つブレイクする)\)$/,''),grants={
     'このクリーチャーに「スピードアタッカー」を与える。':{speedAttacker:true},
     'このクリーチャーのパワーを+4000し「W・ブレイカー」を与える。':{power:4000,breaker:2},
     'このクリーチャーに「パワーアタッカー+6000」と「W・ブレイカー」を与える。':{attackBonus:6000,breaker:2},
     'このクリーチャーのパワーを+10000する。':{power:10000}
    }[bare];
    if(grants){if(spec.g260Self)throw Error('重複する常在条件');spec.g260Self={filter:civil?{creatureOrSeed:true,color:civil[2],g258Civil:+civil[1]}:{creature:true,multi:true},grants,...(turn?{turn}:{})};if(grants.power||grants.attackBonus)powerBonus=true;continue;}
   }
  }
  if(phase>=247&&creature){
   const handStats={
    '自分の手札が1枚もない時このクリーチャーのパワーは+3000される。':{max:0,power:3000},
    '自分の手札が5枚以上ならこのクリーチャーのパワーを+4000し「W・ブレイカー」を与える。(「W・ブレイカー」を持つクリーチャーはシールドを2つブレイクする)':{min:5,power:4000,breaker:2},
    '自分の手札の枚数が相手より多い場合このクリーチャーのパワーは+6000され「W・ブレイカー」を得る。(「W・ブレイカー」を得たクリーチャーはシールドを2枚ブレイクする)':{moreThanOpponent:true,power:6000,breaker:2}
   },handAttack={
    'G・G・G:自分の手札が1枚以下でなければこのクリーチャーは攻撃できない。':{kind:'handCount',max:1}
   };
   if(handStats[line]){if(spec.g247HandStats)throw Error('重複する手札条件');spec.g247HandStats=handStats[line];powerBonus=true;continue;}
   if(handAttack[line]){if(spec.g225AttackRequires)throw Error('重複する攻撃条件');spec.g225AttackRequires=handAttack[line];continue;}
  }
  if(phase>=246&&creature){
   if(spec.g246LowHand?.grants.breaker===2&&line==='(「W・ブレイカー」を持つクリーチャーはシールドを2つブレイクする)')continue;
   const low=line.replace(/\((?:「スピードアタッカー」を持つクリーチャーは召喚酔いしない|「パワー・アタッカー\+5000」と「W・ブレイカー」を持つクリーチャーは攻撃中パワーを\+5000されシールドを2つブレイクする)\)$/,'').match(/^G・G・G:自分の手札が1枚以下(?:なら|であれば)(.+)$/),grants={
    'このクリーチャーに「パワー・アタッカー+5000」と「W・ブレイカー」を与える。':{attackBonus:5000,breaker:2},
    'このクリーチャーのパワーを+3000し「W・ブレイカー」を与える。':{power:3000,breaker:2},
    'このクリーチャーはバトルで破壊されない。':{g34BattleSafe:true},
    'このクリーチャーに「スピードアタッカー」を与える。':{speedAttacker:true},
    'このクリーチャーに「スピードアタッカー」と「マッハファイター」を与える。':{speedAttacker:true,machFighter:true}
   };
   if(low&&grants[low[1]]){if(spec.g246LowHand)throw Error('重複するG・G・G');spec.g246LowHand={max:1,grants:grants[low[1]]};if(grants[low[1]].power||grants[low[1]].attackBonus)powerBonus=true;continue;}
   const lowAttack=line.match(/^G・G・G:このクリーチャーが攻撃する時自分の手札が1枚以下なら(.+)$/);
   if(lowAttack){const defs=clauses(lowAttack[1],phase).map(q=>instruction(q,phase));if(attack.length||!defs.length||defs.some(d=>!d))throw Error('未対応のG・G・G攻撃時能力');attack.push({op:'IfHand246',max:1,defs});continue;}
  }
  if(phase>=258&&(m=line.match(/^シビルカウント([1-9]\d*):(このクリーチャーが出た時|このクリーチャーが攻撃する時|このクリーチャーをタップした時)?自分の(光|水|闇|火|自然)のクリーチャーまたは\3のタマシードが合計([1-9]\d*)つ以上あれば(.+)$/))){
   if(+m[1]!==+m[4]||phase<259&&m[2]==='このクリーチャーをタップした時'||(creature?!m[2]:seed||!!m[2]))throw Error('未対応のシビルカウント種別');
   const dest=m[2]==='このクリーチャーが攻撃する時'?attack:m[2]==='このクリーチャーをタップした時'?tapped:entry,defs=clauses(m[5],phase).map(q=>instruction(q,phase));
   if(!defs.length||defs.some(d=>!d)||creature&&(dest.length||dest===entry&&nativeEntry))throw Error('未対応のシビルカウント効果');
   if(nativeEntry){if(creature||seed||nativeEntry!=='inspectDiscard'||entry.length)throw Error('未対応のシビルカウント複合効果');entry.push({op:'InspectOne258'});nativeEntry=null;}
   dest.push({op:'IfOwn',filter:{creatureOrSeed:true,color:m[3],g258Civil:+m[1]},defs});continue;
  }
  if(phase>=257&&(m=line.match(/^レインボーナス:(このクリーチャーがバトルゾーンに出た時|このクリーチャーが攻撃する時|自分のターンの終わりに)?バトルゾーンに自分の多色クリーチャーがあれば(.+)$/))){
   if(phase<259&&m[1]==='自分のターンの終わりに'||(creature?!m[1]:seed||!!m[1]))throw Error('未対応のレインボーナス種別');
   const dest=m[1]==='このクリーチャーが攻撃する時'?attack:m[1]==='自分のターンの終わりに'?turnEnd:entry,defs=clauses(m[2],phase).map(q=>instruction(q,phase));
   if(!defs.length||defs.some(d=>!d)||creature&&(dest.length||dest===entry&&nativeEntry))throw Error('未対応のレインボーナス効果');
   dest.push({op:'IfOwn',g257Rainbow:true,filter:{creature:true,multi:true},defs});continue;
  }
  if(phase>=256&&(m=line.match(/^S・バック-(光|水|闇|火|自然|ハンター)\(\1(のカード)?を自分のシールドゾーンから手札に加える時そのカードを捨ててもよい。そうした場合コストを支払わずにこの(クリーチャーを召喚する|呪文を唱える)\)$/))){
   if(spec.strikeBack||(m[1]==='ハンター'?!!m[2]:!m[2])||(creature?m[3]!=='クリーチャーを召喚する':seed||m[3]!=='呪文を唱える'))throw Error('未対応のS・バック条件');
   spec.strikeBack=true;spec[m[1]==='ハンター'?'strikeBackRace':'strikeBackColor']=m[1];continue;
  }
  if(phase>=254&&creature){
   if(keyword(line,'エターナル・Ω')){if(spec.g34Omega)throw Error('重複するエターナル・Ω');spec.g34Omega=true;continue;}
   if(line==='自分のクリーチャーが攻撃する時カードを2枚引いてもよい。そうしたら自分の手札を1枚捨てる。'){
    if(spec.g253AttackWatches)throw Error('重複する攻撃監視能力');spec.g253AttackWatches=[{who:'self',filter:{creature:true},defs:[instruction('カードを2枚引いてもよい。そうしたら自分の手札を1枚捨てる。',phase)]}];continue;
   }
  }
  if(phase>=253&&creature){
   const offer=n=>({op:'Offer',title:'カードを'+n+'枚引く？',defs:[{op:'Draw',n}]}),watches={
    '自分のクリーチャーが攻撃する時それがそのターンはじめての攻撃であればカードを1枚引いてもよい。':{who:'self',first:true,filter:{creature:true},defs:[offer(1)]},
    '自分のクリーチャーが攻撃する時それがそのターンはじめての攻撃であれば自分の手札を1枚捨ててもよい。そうしたらカードを2枚引く。':{who:'self',first:true,filter:{creature:true},defs:[{op:'DiscardDraw',g216DiscardDraw:true,n:2}]},
    '相手のクリーチャーがバトルゾーンに出たターンに攻撃する時自分はカードを2枚引いてもよい。':{who:'opponent',entryTurn:true,filter:{creature:true},defs:[offer(2)]},
    '自分のパワー6000以上のクリーチャーが相手プレイヤーを攻撃する時カードを1枚引いてもよい。':{who:'self',playerAttack:true,filter:{creature:true,minPower:6000,g199Power:true},defs:[offer(1)]},
    '自分のアウトレイジが攻撃する時カードを1枚引いてもよい。':{who:'self',filter:{creature:true,race:'アウトレイジ'},defs:[offer(1)]},
    '自分のコスト7以上のクリーチャーが攻撃する時カードを1枚引いてもよい。そうした場合自分の手札を1枚山札の一番上に置く。':{who:'self',filter:{creature:true,min:7},defs:[{op:'Offer',title:'カードを1枚引き、手札を1枚山札の上に置く？',defs:[{op:'Draw',n:1},{op:'Select',origin:'hand',to:'deckTop',n:1,g183Return:true,title:'山札の上に戻す手札を選ぶ'}]}]},
    '自分のドラゴンが攻撃する時カードを1枚引いてもよい。その後光のコスト9以下の「ブロッカー」を持つ進化ではないクリーチャーを1体自分の手札から出してもよい。':{who:'self',filter:{creature:true,race:'ドラゴン'},defs:[offer(1),{op:'Select',origin:'hand',n:1,deploy:true,g195HandDeploy:true,filter:{creature:true,color:'光',max:9,blocker:true,nonEvolution:true},optional:true}]}
   },watch=watches[line];
   if(watch){if((spec.g253AttackWatches||[]).some(w=>JSON.stringify(w)===JSON.stringify(watch)))throw Error('重複する条件付き攻撃監視能力');(spec.g253AttackWatches??=[]).push(watch);continue;}
   if(line==='相手が自分のクリーチャーを選ぶ時このクリーチャーは選べない。(ただしこのクリーチャーを攻撃またはブロックしてもよい)'){if(spec.untargetable)throw Error('重複する選択不可能力');spec.untargetable=true;continue;}
  }
  if(phase>=252&&(creature||seed)){
   const attacks={
    '自分のクリーチャーが攻撃する時カードを1枚引いてもよい。':{who:'self',filter:{creature:true},defs:[{op:'Draw',n:1}]},
    '相手のクリーチャーが攻撃する時カードを1枚引いてもよい。':{who:'opponent',filter:{creature:true},defs:[{op:'Draw',n:1}]},
    '相手の火または自然のクリーチャーが攻撃する時カードを1枚引いてもよい。':{who:'opponent',filter:{creature:true,any:[{color:'火'},{color:'自然'}]},defs:[{op:'Draw',n:1}]},
    '相手のクリーチャーが攻撃する時カードを1枚引いてもよい。そうした場合自分の手札を1枚捨てる。':{who:'opponent',filter:{creature:true},defs:[{op:'Draw',n:1},{op:'Discard',n:1,owner:'self'}]}
   },wins={
    '自分のグランド・デビルがバトルに勝った時カードを1枚引いてもよい。':{filter:{creature:true,race:'グランド・デビル'}},
    '自分の火のクリーチャーがバトルに勝った時カードを1枚引いてもよい。':{filter:{creature:true,color:'火'}}
   };
   if(attacks[line]){if(spec.g252AttackWatch)throw Error('重複する攻撃監視能力');const{defs,...watch}=attacks[line];spec.g252AttackWatch={...watch,defs:[{op:'Offer',title:'カードを1枚引く？',...(defs.some(d=>d.op==='Discard')?{g204DrawDiscard:true}:{}),defs}]};continue;}
   if(creature&&wins[line]){if(spec.g252WinWatch)throw Error('重複するバトル勝利監視能力');spec.g252WinWatch={...wins[line],defs:[{op:'Offer',title:'カードを1枚引く？',defs:[{op:'Draw',n:1}]}]};continue;}
  }
  if(phase>=291&&creature&&(m=line.match(/^このクリーチャーまたは自分のコスト6以上のクリーチャーが出た時(.+)$/))){
   const def=m[1]==='相手のクリーチャーを1体選びタップする。次の自分のターンのはじめまでそのクリーチャーはアンタップしない。'?{op:'Target',tap:true,g291UntapUntilSelf:true}:instruction(m[1],phase);
   if(def&&(def.op==='Target'||def.op==='Offer'&&def.defs.length===1&&def.defs[0].op==='Ramp')){if(spec.g251EntryDraw)throw Error('重複する条件付き登場能力');spec.g251EntryDraw={filter:{creature:true,min:6},selfAlways:true,defs:[def]};continue;}
  }
  if(phase>=309&&creature){
   if(line==='このクリーチャーがバトルゾーンに出た時または破壊された時自分の山札の上から3枚を墓地に置く。'){if(entry.length||nativeEntry||death.length)throw Error('独立した登場・破壊時能力の順序対応が必要');entry.push({op:'Mill',n:3});death.push({op:'Mill',n:3});continue;}
   if(line==='自分のグランド・デビルをバトルゾーンに出した時カードを1枚引いてもよい。'){if(spec.g251EntryDraw)throw Error('重複する登場監視能力');spec.g251EntryDraw={filter:{creature:true,race:'グランド・デビル'},defs:[{op:'Offer',title:'カードを1枚引く？',defs:[{op:'Draw',n:1}]}]};continue;}
   const watches={
    '自分のディープ・マリーンが破壊された時相手は自分自身のクリーチャーを1体選び破壊する。':{race:'ディープ・マリーン',self:true,selfFilter:true,defs:[{op:'OpponentSelect',n:1,to:'grave'}]},
    '自分のグランド・デビルが破壊された時自分の手札を1枚捨てる。':{race:'グランド・デビル',self:true,selfFilter:true,defs:[{op:'Discard',owner:'self',n:1}]}
   };
   if(watches[line]){if(spec.g303DeathWatch)throw Error('重複する破壊監視能力');spec.g303DeathWatch=watches[line];continue;}
  }
  if(phase>=307&&creature&&line==='このクリーチャーはタップしてバトルゾーンに出る。'){if(spec.g295EnterTapped)throw Error('重複するタップイン');spec.g295EnterTapped=true;continue;}
  if(phase>=306&&creature){
   const watches={
    '自分のドラゴンが破壊された時相手のクリーチャーを1体破壊してもよい。':{race:'ドラゴン',self:true,selfFilter:true,defs:[{op:'Target',to:'grave',optional:true}]},
    '自分のドラゴンが破壊された時カードを2枚まで引いてもよい。':{race:'ドラゴン',self:true,selfFilter:true,defs:[{op:'DrawUpTo',n:2,g203Draw:true}]},
    'このクリーチャーまたは自分の他のファンキー・ナイトメアが破壊された時カードを1枚引いてもよい。':{race:'ファンキー・ナイトメア',self:true,defs:[{op:'Offer',title:'カードを1枚引く？',defs:[{op:'Draw',n:1}]}]}
   };
   if(watches[line]){if(spec.g303DeathWatch)throw Error('重複する破壊監視能力');spec.g303DeathWatch=watches[line];continue;}
  }
  if(phase>=305&&creature){
   const auras={
    '自分の光または水のクリーチャーすべてに「ブロッカー」を与える。(「ブロッカー」を持つクリーチャーをタップして相手クリーチャーの攻撃先をそのクリーチャーに変更してもよい)':{filter:{creature:true,colorsAny:['光','水']},grants:{blocker:true}},
    '自分のタップしているクリーチャーすべてに「スレイヤー」を与える。(「スレイヤー」を持つクリーチャーがバトルする時バトルの後相手クリーチャーを破壊する)':{filter:{creature:true,tapped:true},grants:{slayer:true}}
   };
   if(auras[line]){if(spec.g208Auras)throw Error('重複する常在付与能力');spec.g208Auras=[auras[line]];continue;}
   const draw=[{op:'Offer',title:'カードを1枚引く？',defs:[{op:'Draw',n:1}]}],watches={
    '自分の光または水のクリーチャーが破壊された時カードを1枚引いてもよい。':{self:true,colorsAny:['光','水'],defs:draw},
    '自分のクリーチャーが破壊された時カードを1枚引いてもよい。':{self:true,defs:draw},
    '自分のターン中に自分のクリーチャーが破壊された時相手のクリーチャーを1体破壊する。':{self:true,ownTurn:true,defs:[{op:'Target',to:'grave'}]}
   };
   if(watches[line]){if(spec.g303DeathWatch)throw Error('重複する破壊監視能力');spec.g303DeathWatch=watches[line];continue;}
  }
  if(phase>=304&&creature){
   const watches={
    'このクリーチャーまたは自分の他のクリーチャーが破壊された時相手は自身の手札を1枚選び捨てる。':{self:true,defs:[{op:'Discard',n:1}]},
    '自分の他の名前に《死神》とあるクリーチャーが破壊された時カードを1枚引いてもよい。':{self:false,name:'死神',defs:[{op:'Offer',title:'カードを1枚引く？',defs:[{op:'Draw',n:1}]}]},
    '自分のクリーチャーが破壊された時相手のクリーチャーを1体選びタップする。次の相手のターンのはじめにそのクリーチャーはアンタップしない。':{self:true,defs:[{op:'Target',tap:true,lock:true,g210TapLock:true,title:'タップして次のターンまで止めるクリーチャーを1体選ぶ'}]}
   };
   if(watches[line]){if(spec.g303DeathWatch)throw Error('重複する破壊監視能力');spec.g303DeathWatch=watches[line];continue;}
  }
  if(phase>=303&&creature){
   const watches={
    '自分の他のマフィ・ギャングが破壊された時カードを1枚引く。':{race:'マフィ・ギャング',self:false,optional:false},
    '自分の他のエイリアンが破壊された時カードを1枚引いてもよい。':{race:'エイリアン',self:false,optional:true},
    'このクリーチャーまたは自分の他のドラゴン・ゾンビが破壊された時カードを1枚引いてもよい。':{race:'ドラゴン・ゾンビ',self:true,optional:true}
   };
   if(watches[line]){if(spec.g303DeathWatch)throw Error('重複する破壊監視能力');const{optional,...watch}=watches[line];spec.g303DeathWatch={...watch,defs:optional?[{op:'Offer',title:'カードを1枚引く？',defs:[{op:'Draw',n:1}]}]:[{op:'Draw',n:1}]};continue;}
  }
  if(phase>=317&&creature){
   const win=line.match(/^自分の(ハンター|火のクリーチャー)がバトルに勝った時(相手は自身の手札を1枚選び捨てる。|相手のシールドをひとつブレイクする。)$/);
   if(win){if(spec.g252WinWatch)throw Error('重複するバトル勝利監視能力');spec.g252WinWatch={filter:{creature:true,...(win[1]==='ハンター'?{race:'ハンター'}:{color:'火'})},defs:[instruction(win[2],phase)]};continue;}
   if(line==='自分の他のクリーチャーをバトルゾーンに出した時このクリーチャーを破壊する。'){if(spec.g250EntryDraw)throw Error('重複する登場監視');spec.g250EntryDraw={filter:{creature:true},self:false,defs:[{op:'SelfDestroy'}]};continue;}
  }
  if(phase>=316&&creature){
   if(line==='このカードは4枚より多くデッキに入れることができる。'){if(spec.g314Unlimited)throw Error('重複するデッキ枚数能力');spec.g314Unlimited=true;continue;}
   const draw=line.match(/^自分の(エンジェル・コマンドまたはドラゴン|スプラッシュ・クイーン)が(?:バトルゾーンに)?出た時カードを1枚引いてもよい。$/);
   if(draw){if(spec.g251EntryDraw)throw Error('重複する登場監視');spec.g251EntryDraw={filter:{creature:true,...(draw[1]==='スプラッシュ・クイーン'?{race:draw[1]}:{raceAny:['エンジェル・コマンド','ドラゴン']})},defs:[{op:'Offer',title:'カードを1枚引く？',defs:[{op:'Draw',n:1}]}]};continue;}
  }
  if(phase>=314&&creature){
   if(line==='《'+normalize(f.name)+'》は4枚より多くデッキに入れることができる。'){if(spec.g314Unlimited)throw Error('重複するデッキ枚数能力');spec.g314Unlimited=true;continue;}
   if(line==='自分の名前に《遊撃師団》を持つクリーチャーが5体以上バトルゾーンにあればこのクリーチャーのパワーは+5000され「W・ブレイカー」を得る。'){if(spec.g260Self)throw Error('重複する味方条件');spec.g260Self={filter:{creature:true,name:'遊撃師団',g258Civil:5},grants:{power:5000,breaker:2}};powerBonus=true;continue;}
   const other=line.match(/^(自分の)?他のクリーチャーが(?:バトルゾーンに)?出た時このクリーチャーを(タップする|アンタップする|アンタップしてもよい)。$/);
   if(other){if(spec.g314OtherEntry)throw Error('重複する他の登場監視');const def={op:other[2]==='タップする'?'SelfTap314':'Untap'};spec.g314OtherEntry={who:other[1]?'self':'both',defs:other[2]==='アンタップしてもよい'?[{op:'Offer',title:'このクリーチャーをアンタップする？',defs:[def]}]:[def]};continue;}
   const draw=line.match(/^自分の(多色クリーチャー|パワー([1-9]\d*)以上のクリーチャー|超化獣クリーチャー|名前に《遊撃師団》を持つクリーチャー)(?:をバトルゾーンに出した時|が(?:バトルゾーンに)?出た時)カードを1枚引いてもよい。$/);
   if(draw){if(spec.g251EntryDraw)throw Error('重複する登場監視');const filter=draw[2]?{minPower:+draw[2],g199Power:true}:draw[1]==='多色クリーチャー'?{multi:true}:draw[1]==='超化獣クリーチャー'?{race:'超化獣'}:{name:'遊撃師団'};spec.g251EntryDraw={filter:{creature:true,...filter},defs:[{op:'Offer',title:'カードを1枚引く？',defs:[{op:'Draw',n:1}]}]};continue;}
  }
  if(phase>=251&&creature){
   const watches={
    'このクリーチャーまたは自分のコスト6以上のクリーチャーが出た時カードを1枚引いてもよい。':{filter:{creature:true,min:6},selfAlways:true},
    '自分のスノーフェアリーがバトルゾーンに出た時カードを1枚引いてもよい。':{filter:{creature:true,race:'スノーフェアリー'}},
    '自分の進化クリーチャーまたはタマシードが出た時カードを1枚引いてもよい。':{filter:{any:[{creature:true,evolution:true},{seed:true}]}},
    '自分のコスト4以下のクリーチャーがバトルゾーンに出た時カードを1枚引いてもよい。':{filter:{creature:true,max:4}},
    '自分のアンノウンをバトルゾーンに出した時カードを1枚引いてもよい。':{filter:{creature:true,race:'アンノウン'}},
    '自分の多色クリーチャーがバトルゾーンに出た時カードを1枚引いてもよい。':{filter:{creature:true,multi:true}},
    '自分のパワー5000以上のクリーチャーをバトルゾーンに出した時カードを1枚引いてもよい。':{filter:{creature:true,minPower:5000,g199Power:true}},
    'バトルゾーンに自分の進化クリーチャーまたはゴッドを出した時カードを1枚引いてもよい。':{filter:{creature:true,any:[{evolution:true},{race:'ゴッド'}]}}
   };
   if(watches[line]){if(spec.g251EntryDraw)throw Error('重複する条件付き登場ドロー');spec.g251EntryDraw={...watches[line],defs:[{op:'Offer',title:'カードを1枚引く？',defs:[{op:'Draw',n:1}]}]};continue;}
  }
  if(phase>=250&&creature&&(m=line.match(/^(このクリーチャーまたは)?自分の他の(.+?)(?:をバトルゾーンに出した時|がバトルゾーンに出た時)カードを([13])枚引いてもよい。$/))){
   const filters={'エンジェル・コマンド':{creature:true,race:'エンジェル・コマンド'},'コスト7以上のクリーチャー':{creature:true,min:7},'無色クリーチャー':{creature:true,noColor:true},'メタリカ':{creature:true,race:'メタリカ'},'サイバー・ウイルス':{creature:true,race:'サイバー・ウイルス'}};
   if(filters[m[2]]){if(spec.g250EntryDraw)throw Error('重複する登場ドロー');spec.g250EntryDraw={filter:filters[m[2]],self:!!m[1],defs:[{op:'Offer',title:'カードを'+m[3]+'枚引く？',defs:[{op:'Draw',n:Number(m[3])}]}]};continue;}
  }
  if(phase>=249&&creature&&(m=line.match(/^自分のターン中に自分の他のアビスが出た時(.+)$/))){
   const defs=clauses(m[1],phase).map(q=>instruction(q,phase));if(spec.g249OtherEntry||!defs.length||defs.some(d=>!d))throw Error('未対応の他のアビス登場能力');
   spec.g249OtherEntry={filter:{race:'アビス'},defs};continue;
  }
  if(phase>=230&&creature){
   if(line==='このクリーチャーをマナゾーンから召喚してもよい。'||phase>=809&&line==='このクリーチャーは自分のマナゾーンから召喚してもよい。'){spec.manaSummon=true;continue;}
   if(line==='自分のマナゾーンにあるカードをすべての文明のカードとして扱う。'){spec.g51Courtney=true;continue;}
  }
  if(phase>=223&&creature&&(m=line.match(/^このクリーチャーがバトルゾーンに出たとき(相手の手札を見る。)$/))){if(entry.length||nativeEntry)throw Error('独立した誘発能力の順序対応が必要');entry.push(instruction(m[1],phase));continue;}
  if(phase>=299&&creature){
   const both=line.match(/^このクリーチャーが(?:バトルゾーンに)?出た時またはアンタップした時(.+)$/),untap=line.match(/^このクリーチャーがアンタップした時(.+)$/);
   if(both||untap){if(spec.g299Untapped||both&&(entry.length||nativeEntry))throw Error('独立した誘発能力の順序対応が必要');const defs=clauses((both||untap)[1],phase).map(q=>instruction(q,phase));if(!defs.length||defs.some(d=>!d))throw Error('未対応のアンタップ能力');spec.g299Untapped=defs;if(both)entry.push(...structuredClone(defs));continue;}
  }
  if(phase>=298&&creature&&line==='このクリーチャーは自分の手札から召喚できない。'){if(spec.g298NoHandSummon)throw Error('重複する手札からの召喚禁止');spec.g298NoHandSummon=true;continue;}
  if(phase>=297&&creature){
   const aura={'無色クリーチャーを自分のマナゾーンから召喚してもよい。':{colorless:true},'自分のマナゾーンにある多色クリーチャーを召喚してもよい。':{multi:true}}[line];
   if(aura){if(spec.g297ManaAura)throw Error('重複するマナ召喚許可');spec.g297ManaAura=aura;continue;}
  }
  if(phase>=296&&creature&&(m=line.match(/^マナ爆誕([1-9]\d*)\(このクリーチャーを自分のマナゾーンからコスト\1を支払って召喚してもよい\)$/))){if(spec.g296ManaBirth)throw Error('重複するマナ爆誕');spec.g296ManaBirth=+m[1];continue;}
  if(phase>=295&&creature){
   if(['このクリーチャーはタップしてバトルゾーンに置かれる。','バトルゾーンに出す時このクリーチャーはタップして置く。'].includes(line)){if(spec.g295EnterTapped)throw Error('重複するタップイン');spec.g295EnterTapped=true;continue;}
   if(line==='このクリーチャーはタップして出て自分のターンのはじめにアンタップしない。'){if(spec.g295EnterTapped||spec.g40StartNoUntap)throw Error('重複するタップインとアンタップ制限');spec.g295EnterTapped=true;spec.g40StartNoUntap=true;continue;}
   if(line==='自分のタマシードが出た時このクリーチャーをアンタップする。'){if(spec.g251EntryDraw)throw Error('重複する登場監視');spec.g251EntryDraw={filter:{g295Tamaseed:true},defs:[{op:'Untap'}]};continue;}
  }
  if(phase>=294&&creature){
   if(line==='このクリーチャーを自分の墓地から召喚してもよい。(コストは支払う)'){if(spec.graveSummon)throw Error('重複する墓地召喚');spec.graveSummon=true;continue;}
   const aura={'超化獣クリーチャーを自分の墓地から召喚してもよい。(コストは支払う)':{race:'超化獣'},'闇の進化クリーチャーを自分の墓地から召喚してもよい。':{darkEvolution:true}}[line];
   if(aura){if(spec.g294GraveAura)throw Error('重複する墓地召喚許可');spec.g294GraveAura=aura;continue;}
  }
  if(phase>=293&&creature&&line==='どんな種族の進化クリーチャーをこのクリーチャーの上に置いてもよい。'){if(spec.g293AnyEvolutionRace)throw Error('重複する進化元能力');spec.g293AnyEvolutionRace=true;continue;}
  if(phase>=292){
   if(creature&&line==='自分の手札が1枚もない時このクリーチャーは「スピードアタッカー」を得る。(「スピードアタッカー」を得たクリーチャーは召喚酔いしない)'){if(spec.g246LowHand)throw Error('重複する手札条件');spec.g246LowHand={max:0,grants:{speedAttacker:true}};continue;}
   if(seed&&line==='自分のターンの終わりに自分の手札が1枚もなければカードを1枚引く。'){if(turnEnd.length)throw Error('重複する終了時能力');turnEnd.push(instruction('自分の手札が1枚もなければカードを1枚引く。',phase));continue;}
  }
  if(phase>=322&&creature&&(m=line.match(/^マジボンバー([1-9]\d*)\(このクリーチャーが攻撃する時自分の山札の上から1枚(?:目)?を見る。その後コスト\1以下のクリーチャーを1体自分の手札または山札の上から(?:バトルゾーンに)?出してもよい\)$/))){
   if(attack.length)throw Error('独立した誘発能力の順序対応が必要');attack.push({op:'Magibomber321',n:+m[1]});continue;
  }
  if(phase>=319&&creature){
   const tribe=line.match(/^自分の(ゴッド|ドラゴン|コマンド・ドラゴン|エイリアン|ドリームメイト|ジョーカーズ)(?:・クリーチャー)?の召喚コストを1少なく(?:する|してもよい)。ただしコストは(?:0以下(?:には|に)?ならない|1より(?:少なく|小さく)ならない)。$/);
   if(tribe){if(spec.g290SummonAura)throw Error('重複する召喚コスト軽減');spec.g290SummonAura={race:tribe[1],amount:1};continue;}
  }
  if(phase>=290&&creature){
   const tribe=line.match(/^自分の(メタリカ|ムートピア|マフィ・ギャング|グランセクト)(?:を召喚するコスト|の召喚コスト)を1少なくする。ただしコストは0以下(?:には|に)?ならない。$/);
   if(tribe||line==='自分のNEOクリーチャーの召喚コストを2少なくする。ただしコストは0以下にならない。'){if(spec.g290SummonAura)throw Error('重複する召喚コスト軽減');spec.g290SummonAura=tribe?{race:tribe[1],amount:1}:{neo:true,amount:2};continue;}
  }
  if(phase>=289&&creature){
   const filter={
    'バトルゾーンに自分の水のクリーチャーがなければこのクリーチャーは相手プレイヤーを攻撃できない。':{creature:true,color:'水'},
    'バトルゾーンに自分のディスペクターがなければこのクリーチャーは相手プレイヤーを攻撃できない。':{creature:true,race:'ディスペクター'},
    '自分のタマシードがなければこのクリーチャーは相手プレイヤーを攻撃できない。':{seed:true},
    'バトルゾーンに自分のコスト7以上のクリーチャーがなければこのクリーチャーは相手プレイヤーを攻撃できない。':{creature:true,min:7},
    'バトルゾーンに自分の無色クリーチャーがなければこのクリーチャーは相手プレイヤーを攻撃できない。':{creature:true,noColor:true},
    'バトルゾーンに自分の多色クリーチャーがなければこのクリーチャーは相手プレイヤーを攻撃できない。':{creature:true,multi:true}
   }[line];if(filter){if(spec.g260Self)throw Error('重複するプレイヤー攻撃条件');spec.noPlayerAttack=true;spec.g260Self={filter,grants:{noPlayerAttack:false}};continue;}
  }
  if(phase>=287&&creature){
   if(line==='水晶武装2:自分のマナゾーンに裏向きのカードが2枚以上あればこのクリーチャーの召喚コストを2少なくする。'){if(spec.g261Discount)throw Error('重複する条件付き軽減');spec.g261Discount={filter:{g286FaceDownMana:2},amount:2};continue;}
   const grants={
    '水晶武装2:自分のマナゾーンに裏向きのカードが2枚以上あればこのクリーチャーのパワーを+6000し「W・ブレイカー」を与える。(「W・ブレイカー」を持つクリーチャーはシールドを2つブレイクする)':{power:6000,breaker:2},
    '水晶武装2:自分のマナゾーンに裏向きのカードが2枚以上あればブロック中のこのクリーチャーのパワーを+9000する。':{g209PoweredBlocker:9000}
   }[line];if(grants){if(spec.g260Self)throw Error('重複する水晶武装条件');spec.g260Self={filter:{g286FaceDownMana:2},grants};powerBonus=true;continue;}
  }
  if(phase>=286&&f.typeText==='呪文'&&line==='水晶武装2:自分のマナゾーンに裏向きのカードが2枚以上あればこの呪文を唱えるコストを2少なくする。'){if(spec.g261Discount)throw Error('重複する条件付き軽減');spec.g261Discount={filter:{g286FaceDownMana:2},amount:2};continue;}
  if(phase>=285&&creature){
   if(line==='マナ武装5:自分のマナゾーンに水のカードが5枚以上あれば各ターンに自分が唱える最初の呪文のコストを3少なくしてもよい。ただしコストは1より少なくならない。'){if(spec.g279FirstSpellDiscount)throw Error('重複する最初の呪文軽減');spec.g279FirstSpellDiscount=3;spec.g285FirstSpellMana={color:'水',n:5};continue;}
   if(line==='自分のマナゾーンのカードがすべてタップされている時このクリーチャーのパワーは+2000される。'){if(spec.g260Self)throw Error('重複する全マナ条件');spec.g260Self={filter:{g285AllManaTapped:true},grants:{power:2000}};powerBonus=true;continue;}
  }
  if(phase>=282&&creature&&(m=line.match(/^自分のマナゾーン(?:にある|の)カードがすべて(光|水|闇|火|自然)(または無色)?(?:のカード)?(?:であれば|である間)(.+)$/))){
   const plain=m[3].match(/^このクリーチャーのパワーは\+([1-9]\d*)される。$/),special={
    'このクリーチャーのパワーは+1000され「スピードアタッカー」を得る。(「スピードアタッカー」を得たクリーチャーは召喚酔いしない)':{power:1000,speedAttacker:true},
    'このクリーチャーのパワーは+4000され「W・ブレイカー」を得パワー5000以下のクリーチャーにブロックされない。':{power:4000,breaker:2,g206NoBlock:{maxPower:5000}},
    ...(phase>=283?{
     'このクリーチャーのパワーは+3000され「スピードアタッカー」を得る。':{power:3000,speedAttacker:true},
     'このクリーチャーのパワーは+3000され「W(ダブル)・ブレイカー」を得る。(シールドを攻撃したときこのクリーチャーはシールドを2枚ブレイクする)':{power:3000,breaker:2},
     'このクリーチャーのパワーは+2000され「ブロッカー」を得る。':{power:2000,blocker:true},
     'このクリーチャーのパワーは+4000され「W・ブレイカー」を得る。':{power:4000,breaker:2},
     'このクリーチャーのパワーは+2500され「ブロッカー」を得る。(相手クリーチャーが攻撃する時「ブロッカー」を得たクリーチャーをタップしてその攻撃を阻止してもよい。その後その相手クリーチャーとバトルする)':{power:2500,blocker:true},
     'このクリーチャーは「ブロッカー」を得る。(相手クリーチャーが攻撃するときこのクリーチャーをタップしてその攻撃を阻止してよい。そのあとその相手クリーチャーとバトルする)':{blocker:true}
    }:{})
   }[m[3]],grants=plain?{power:+plain[1]}:special;
   if(!grants)throw Error('未対応の全マナ文明条件');if(spec.g260Self)throw Error('重複する全マナ文明条件');spec.g260Self={filter:{g282AllMana:{color:m[1],...(m[2]?{colorless:true}:{})}},grants};powerBonus=true;continue;
  }
  if(phase>=281&&creature&&(m=line.match(/^ブロック中このクリーチャーのパワーは\+([1-9]\d*)される。$/))){if(spec.g209PoweredBlocker)throw Error('重複するブロック中のパワー能力');spec.g209PoweredBlocker=+m[1];powerBonus=true;continue;}
  if(phase>=280&&creature&&/^呪文を唱えたターンのみこのクリーチャーを召喚(?:することができる|できる)。$/.test(line)){if(spec.g280NeedsSpell)throw Error('重複する呪文詠唱後の召喚条件');spec.g280NeedsSpell=true;continue;}
  if(phase>=279&&creature){
   if(line==='各ターン相手が唱える1枚目の呪文のコストを1多くする。'){if(spec.g222SpellTax)throw Error('重複する呪文コスト増加');spec.g222SpellTax={opponent:true,first:true,amount:1};continue;}
   if(/^各ターン(?:に)?自分が唱える1枚目の呪文のコストを1少なくする。ただしコストは0以下にならない。$/.test(line)){if(spec.g279FirstSpellDiscount)throw Error('重複する最初の呪文軽減');spec.g279FirstSpellDiscount=1;continue;}
  }
  if(phase>=222&&creature){
   const fixed=line.match(/^相手の呪文を唱えるコスト(?:は(?:すべて)?|を)([1-9]\d*)(?:多くなる|多くする)。$/),nonLight=line.match(/^光以外の呪文を唱えるコストは([1-9]\d*)多くなる。$/),colored=line.match(/^(光|水|闇|火|自然)または(光|水|闇|火|自然)の呪文を唱える時支払うコストは([1-9]\d*)多くなる。$/),grave=line==='相手の呪文を唱えるコストは相手の墓地にある呪文1枚につき1多くなる。';
   if(fixed||nonLight||colored||grave){if(spec.g222SpellTax)throw Error('重複する呪文コスト増加');spec.g222SpellTax=grave?{opponent:true,graveSpells:true}:fixed?{opponent:true,amount:+fixed[1]}:nonLight?{exceptColor:'光',amount:+nonLight[1]}:{colors:[colored[1],colored[2]],amount:+colored[3]};continue;}
  }
  if(phase>=608&&!creature&&!seed){
   const first=normalize(lines[i+1]||''),second=normalize(lines[i+2]||'');
   const condition=line.match(/^次のうちいずれか1つを選ぶ。バトルゾーンに自分の光のクリーチャーと(闇|自然)のクリーチャーがそれぞれ1体以上あれば両方選んでもよい。$/);
   const moon=condition?.[1]==='闇'&&first==='▶自分の山札の上から1枚目を裏向きのまま新しいシールドとしてシールドゾーンに置く。'&&second==='▶相手のクリーチャーを1体破壊する。その後自分のシールドを1つ手札に加える。ただしその「S・トリガー」は使えない。';
   const fist=condition?.[1]==='自然'&&first==='▶相手のパワー2000以下のクリーチャーをすべて持ち主のマナゾーンに置く。'&&second==='▶相手の進化ではないクリーチャーを1体選び表向きのまま新しいシールドとして持ち主のシールドゾーンに置く。';
   if(moon||fist){
    if(entry.length||nativeEntry)throw Error('独立した選択効果の順序対応が必要');
    const modes=moon?[
     {label:'山札の上からシールドを1つ追加',defs:[{op:'ShieldTop',n:1}]},
     {label:'相手クリーチャー1体を破壊し、自分のシールド1つを手札に',defs:[{op:'Target',to:'grave'},{op:'ShieldHand',g238ShieldHand:true}]}
    ]:[
     {label:'パワー2000以下の相手クリーチャーをすべてマナに',defs:[{op:'Sweep',to:'mana',filter:{creature:true,maxPower:2000,g199Power:true}}]},
     {label:'相手の進化ではないクリーチャー1体を表向きでシールド化',defs:[{op:'Target',to:'shields',faceUp:true,filter:{nonEvolution:true}}]}
    ];
    entry.push({op:'Choose',g184Modes:true,modes:[...modes,{
     label:'両方を選ぶ',condition:{all:['光',condition[1]].map(color=>({creature:true,color}))},defs:modes.flatMap(m=>m.defs)
    }]});
    i+=2;
    continue;
   }
  }
  if(phase>=607&&!creature&&!seed&&line==='次のうちいずれかひとつを選ぶ。自分のアビスがあれば両方選んでもよい。'&&
    normalize(lines[i+1]||'')==='▶相手のエレメントを1つ選び持ち主の山札の下に置く。'&&normalize(lines[i+2]||'')==='▶相手のクリーチャーをすべてタップする。'){
   if(entry.length||nativeEntry)throw Error('独立した選択効果の順序対応が必要');
   const bottom={op:'Target',element:true,to:'deck'},tap={op:'TapAll'};
   entry.push({op:'Choose',g184Modes:true,modes:[
    {label:'相手のエレメント1つを山札の下に置く',defs:[bottom]},
    {label:'相手のクリーチャーをすべてタップ',defs:[tap]},
    {label:'両方を選ぶ',condition:{race:'アビス'},defs:[bottom,tap]}
   ]});
   i+=2;
   continue;
  }
  if(phase>=606&&!creature&&!seed&&line==='次のうちいずれかひとつを選ぶ。名前に《ボルメテウス》とある自分のクリーチャーがバトルゾーンにあれば両方選んでもよい。'&&
    normalize(lines[i+1]||'')==='▶相手のパワー6000以下のクリーチャーを1体破壊する。'&&normalize(lines[i+2]||'')==='▶相手のクリーチャーをすべてタップする。'){
   if(entry.length||nativeEntry)throw Error('独立した選択効果の順序対応が必要');
   const kill={op:'Target',to:'grave',filter:{maxPower:6000,g199Power:true}},tap={op:'TapAll'};
   entry.push({op:'Choose',g184Modes:true,modes:[
    {label:'パワー6000以下の相手クリーチャー1体を破壊',defs:[kill]},
    {label:'相手のクリーチャーをすべてタップ',defs:[tap]},
    {label:'両方を選ぶ',condition:{creature:true,name:'ボルメテウス'},defs:[kill,tap]}
   ]});
   i+=2;
   continue;
  }
  if(phase>=604&&!creature&&!seed&&line==='次のうちいずれか1つを選ぶ。バトルゾーンに自分の闇のクリーチャーと火のクリーチャーがそれぞれ1体以上あれば両方選んでもよい。'&&
    normalize(lines[i+1]||'')==='▶相手のパワー3000以下のクリーチャーを1体破壊する。'&&normalize(lines[i+2]||'')==='▶相手の手札を1枚見ないで選び捨てさせる。'){
   if(entry.length||nativeEntry)throw Error('独立した選択効果の順序対応が必要');
   const kill={op:'Target',to:'grave',filter:{maxPower:3000,g199Power:true}},discard={op:'Discard',n:1,random:true};
   entry.push({op:'Choose',g184Modes:true,modes:[
    {label:'パワー3000以下の相手クリーチャー1体を破壊',defs:[kill]},
    {label:'相手の手札を見ないで1枚捨てさせる',defs:[discard]},
    {label:'両方を選ぶ',condition:{all:[{creature:true,color:'闇'},{creature:true,color:'火'}]},defs:[kill,discard]}
   ]});
   i+=2;
   continue;
  }
  if(phase>=602&&!creature&&!seed&&line==='次のうちいずれか1つを選ぶ。バトルゾーンに自分のドラゴンがあれば両方を選んでもよい。'&&
    normalize(lines[i+1]||'')==='▶相手のクリーチャーを1体選び持ち主のマナゾーンに置く。'&&normalize(lines[i+2]||'')==='▶相手のクリーチャーをすべてタップする。'){
   if(entry.length||nativeEntry)throw Error('独立した選択効果の順序対応が必要');
   const mana={op:'Target',to:'mana'},tap={op:'TapAll'};
   entry.push({op:'Choose',g184Modes:true,modes:[
    {label:'相手のクリーチャー1体をマナに置く',defs:[mana]},
    {label:'相手のクリーチャーをすべてタップする',defs:[tap]},
    {label:'両方を選ぶ',condition:{race:'ドラゴン'},defs:[mana,tap]}
   ]});
   i+=2;
   continue;
  }
  if(phase>=184){
   const modal=phase>=549&&seed?line.match(/^(?:このタマシードが出た時)?次のうちいずれか(?:1つ|ひとつ)を選ぶ。$/):line.match(/^(?:(?:このクリーチャーが(?:バトルゾーンに)?出た時|このクリーチャーをバトルゾーンに出した時))?次のうちいずれか(?:1つ|ひとつ)を選ぶ。$/);
   if(modal||phase>=607&&creature&&line==='このクリーチャーが出た時次の中から1回選ぶ。'){if(entry.length||nativeEntry||((creature||seed)&&line.startsWith('次の'))||(!creature&&line.startsWith('このクリーチャー')))throw Error('独立した誘発能力の順序対応が必要');const modes=[];while(i+1<lines.length&&normalize(lines[i+1]).startsWith('▶')){const text=normalize(lines[++i]).slice(1),defs=clauses(text,phase).map(q=>instruction(q,phase));if(!defs.length||defs.some(t=>!t))throw Error('未対応の選択能力: '+text);modes.push({label:lines[i].replace(/^\s*▶/,'').trim(),defs});}if(modes.length<2)throw Error('選択能力の不足');entry.push({op:'Choose',g184Modes:true,modes});continue;}
  }
  if(phase>=212&&creature){const reduction=countDiscount212(line);if(reduction){if(spec.g212CountDiscount)throw Error("重複する枚数軽減");spec.g212CountDiscount=reduction;continue;}}
  if(phase>=211){const sympathy=sympathy211(line);if(sympathy){if(spec.g211Sympathy)throw Error("重複するシンパシー");spec.g211Sympathy=sympathy;continue;}}
  if(phase>=209&&creature){
   if(phase>=367&&line==='このクリーチャーが「ブロッカー」を持つクリーチャーとバトルする時このクリーチャーのパワーは+4000される。'){if(spec.g209BattlePower)throw Error('重複バトル強化');spec.g209BattlePower={amount:4000,vsBlocker:true};powerBonus=true;continue;}
   if(/^このクリーチャーはバトル中破壊されない。$/.test(line)){spec.g34BattleSafe=true;continue;}
   if(m=line.match(/^パワード・ブロッカー\+([1-9]\d*)\(ブロック中このクリーチャーのパワーを\+\1する\)$/)){spec.g209PoweredBlocker=+m[1];powerBonus=true;continue;}
   if(m=line.match(/^(?:このクリーチャーは)?「ブロッカー」を持つクリーチャーとの?バトル中(?:このクリーチャーの)?パワー(?:を|は)\+([1-9]\d*)(?:する|される)。$/)){spec.g209BattlePower={amount:+m[1],vsBlocker:true};powerBonus=true;continue;}
   if(m=line.match(/^コスト([1-9]\d*)以下のクリーチャーとバトル中このクリーチャーのパワーは\+([1-9]\d*)される。$/)){spec.g209BattlePower={amount:+m[2],opponentMaxCost:+m[1]};powerBonus=true;continue;}
   if(m=line.match(/^G・G・G:このクリーチャーがバトル中自分の手札が([1-9]\d*)枚以下ならこのクリーチャーのパワーを\+([1-9]\d*)する。$/)){spec.g209BattlePower={amount:+m[2],handMax:+m[1]};powerBonus=true;continue;}
   if(m=line.match(/^バトル中このクリーチャーのパワーを自分の墓地にある火のカード1枚につき\+([1-9]\d*)する。$/)){spec.g209BattlePower={amount:+m[1],graveFire:true};powerBonus=true;continue;}
   if(m=line.match(/^相手のターンバトル中このクリーチャーのパワーは\+([1-9]\d*)される。$/)){spec.g209BattlePower={amount:+m[1],opponentTurn:true};powerBonus=true;continue;}
  }
  if(phase>=227&&creature){
   if(m=line.match(/^このクリーチャーはパワー([1-9]\d*)以上のクリーチャーにブロックされない。$/)){if(spec.g206NoBlock)throw Error('重複するブロック制限');spec.g206NoBlock={minPower:+m[1]};continue;}
   if(line==='相手のシールドが1枚もない時このクリーチャーはブロックされない。'){spec.g227EmptyShieldUnblockable=true;continue;}
   if(line==='自分の名前に《XX》とあるクリーチャーは攻撃されない。'){(spec.g208Auras??=[]).push({filter:{creature:true,g227NameIncludes:'XX'},grants:{cannotBeAttacked:true}});continue;}
   if(line==='バトルゾーンにある自分のグランド・デビルすべてのパワーは+2000されブロックされない。'){if(spec.g205Aura)throw Error('重複する常在パワー能力');spec.g205Aura={filter:{creature:true,race:'グランド・デビル'},power:2000};(spec.g208Auras??=[]).push({filter:{creature:true,race:'グランド・デビル'},grants:{unblockable:true}});continue;}
  }
  if(phase>=226&&creature){
   if(phase>=708&&line==='水ステルス(相手のマナゾーンに水のカードがあればこのクリーチャーはブロックされない)'){if(spec.g226Stealth)throw Error('重複するステルス');spec.g226Stealth='水';continue;}
   if(m=line.match(/^(光|水|闇|火|自然)ステルス\(相手のマナゾーンに\1のカードが1枚でもあればこのクリーチャーはブロックされない\)$/)){if(spec.g226Stealth)throw Error('重複するステルス');spec.g226Stealth=m[1];continue;}
  }
  if(phase>=225&&creature){
   const requirements={
    'このクリーチャーは自分のタマシードがなければ攻撃できない。':{kind:'seed'},
    '自分の墓地にクリーチャーが5体以上なければこのクリーチャーは攻撃できない。':{kind:'graveCreatures',min:5},
    '自分のコスト6以上のクリーチャーがなければこのクリーチャーは攻撃できない。':{kind:'bigCreature',minCost:6},
    '自分のマナゾーンにタップしているカードがあればこのクリーチャーは攻撃できない。':{kind:'untappedMana'},
    '相手にシールドが1枚もなければこのクリーチャーは攻撃することができない。':{kind:'enemyShield'},
    '自分の進化クリーチャーがなければこのクリーチャーは攻撃できない。':{kind:'evolution'},
    '自分のマナゾーンに裏向きのカードが2枚以上なければこのクリーチャーは攻撃できない。':{kind:'faceDownMana',min:2},
    '自分のタップしているクリーチャーが3体以上なければこのクリーチャーは攻撃できない。':{kind:'tappedCreatures',min:3}
   };
   if(requirements[line]){if(spec.g225AttackRequires)throw Error('重複する攻撃条件');spec.g225AttackRequires=requirements[line];continue;}
  }
  if(phase>=224&&creature){
   if(['クリーチャーはすべて可能なら攻撃する。','すべてのクリーチャーは可能であれば攻撃する。','このクリーチャーがバトルゾーンにある間すべてのクリーチャーは可能なら毎ターン攻撃する。'].includes(line)){if(spec.g224ForceAttack)throw Error('重複する攻撃義務');spec.g224ForceAttack={owner:'both'};continue;}
   if(['相手のターン中このクリーチャーがタップされていたら相手のクリーチャーはすべて可能なら攻撃する。','相手のターンにこのクリーチャーがタップされていれば相手のクリーチャーはすべて可能であれば攻撃する。'].includes(line)){if(spec.g224ForceAttack)throw Error('重複する攻撃義務');spec.g224ForceAttack={owner:'opponent',tapped:true,opponentTurn:true};continue;}
  }
  if(phase>=712&&creature&&line===tappedPowerAttacker712){
   (spec.g208Auras??=[]).push({filter:{creature:true},other:true,g557Condition:{g590SourceTapped:true},grants:{attackBonus:1500}});
   continue;
  }
  if(phase>=208&&creature){const aura=grantAura208(line,phase);if(aura){(spec.g208Auras??=[]).push(aura);continue;}}
  if(phase>=207&&creature){
   const counted=countPower207(line,phase);if(counted){if(spec.g207CountPower)throw Error('重複する枚数パワー');spec.g207CountPower=counted;powerBonus=true;continue;}
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
  if(phase>=243&&creature){
   const aura=line.match(/^(?:バトルゾーンにある)?(タップされている)?相手のクリーチャーすべてのパワーは-([1-9]\d*)される。(?:\(パワー0以下のクリーチャーは破壊される\))?$/);
   if(aura){if(spec.g205Aura)throw Error('重複する常在パワー能力');spec.g205Aura={opponent:true,power:-Number(aura[2]),filter:{creature:true,...(aura[1]?{tapped:true}:{})}};continue;}
   if(m=line.match(/^自分のシールド1つにつきこのクリーチャーのパワーを-([1-9]\d*)する。$/)){if(spec.g207CountPower)throw Error('重複する枚数パワー');spec.g207CountPower={zone:'shields',amount:-Number(m[1])};powerBonus=true;continue;}
  }
  if(phase>=205&&creature){const aura=aura205(line,phase);if(aura){if(spec.g205Aura)throw Error('重複する常在パワー能力');spec.g205Aura=aura;continue;}const bonus=line.match(/^(自分|相手)のターン中このクリーチャーのパワー(?:を|は)\+([1-9]\d*)(?:する|される)。$/);if(bonus){const key=bonus[1]==='自分'?'ownTurnBonus':'g38EnemyTurnBonus';if(spec[key])throw Error('重複するターン中のパワー能力');spec[key]=+bonus[2];powerBonus=true;continue;}}
  if(phase>=204&&creature){const watch=line.match(/^(相手のターン中に)?(自分|相手)が呪文を唱えた時(.+)$/),colored=line.match(/^自分の(光|水|闇|火|自然)の呪文を唱える時(.+)$/);if(watch||colored){if(spec.g204SpellWatch)throw Error('独立した呪文誘発能力の順序対応が必要');const body=watch?watch[3]:colored[2],single=instruction(body,phase),defs=single?[single]:clauses(body,phase).map(text=>instruction(text,phase));if(!defs.length||defs.some(d=>!d))throw Error('未対応の能力文: '+raw);spec.g204SpellWatch={who:watch&&watch[2]==='相手'?'opponent':'self',...(watch?.[1]?{opponentTurn:true}:{}),...(colored?{color:colored[1]}:{}),defs};if(phase>=313&&defs.some(d=>d.op==='SelfBoost313'))powerBonus=true;continue;}}
  if(phase>=201&&creature&&(m=line.match(/^このクリーチャーが(?:バトルゾーンに)?出たとき(.+)$/))){const search=search201(m[1]);if(search){if(entry.length||nativeEntry)throw Error('独立した誘発能力の順序対応が必要');entry.push(search);continue;}}
  if(phase>=203&&creature&&(m=line.match(/^このクリーチャーが(?:バトルゾーンに出たとき|攻撃するとき)(.+)$/))){const count=count203(m[1],phase);if(count){const dest=line.startsWith('このクリーチャーが攻撃')?attack:entry;if(dest.length||dest===entry&&nativeEntry)throw Error('独立した誘発能力の順序対応が必要');dest.push(count);continue;}}
  if(phase>=197&&creature){const mana=mana197(line,phase);if(mana?.event){const dest=mana.event==='entry'?entry:mana.event==='attack'?attack:death;if(dest.length||dest===entry&&nativeEntry)throw Error('独立した誘発能力の順序対応が必要');dest.push(mana.task);continue;}}
  if(phase>=219&&creature&&(m=line.match(/^各ターンこのクリーチャーがはじめてタップした時(.+)$/))){const d=instruction(m[1],phase);if(d?.op==='GroupUntap'){if(spec.g219FirstTap||spec.g191FirstTapUntap)throw Error('重複する最初のタップ能力');spec.g219FirstTap=[d];continue;}}
  if(phase>=191&&creature&&/^各ターンこのクリーチャーがはじめてタップした時アンタップする。$/.test(line)){if(spec.g191FirstTapUntap)throw Error('重複する最初のタップ能力');spec.g191FirstTapUntap=true;continue;}
  if(phase>=189&&creature&&(m=line.match(/^このクリーチャーがバトルに勝った時(.+)$/))){if(battleWin.length)throw Error('独立した誘発能力の順序対応が必要');const defs=phase>=192&&m[1]==='破壊する。'?[{op:'SelfDestroy'}]:clauses(m[1],phase).map(text=>instruction(text,phase));if(!defs.length||defs.some(t=>!t))throw Error('未対応の能力文: '+raw);battleWin.push(...defs);continue;}
  if(phase>=301&&creature&&(m=line.match(/^このクリーチャーをタップした時(.+)$/))){if(tapped.length)throw Error('独立した誘発能力の順序対応が必要');const defs=clauses(m[1],phase).map(q=>instruction(q,phase));if(!defs.length||defs.some(d=>!d))throw Error('未対応のタップ能力');tapped.push(...defs);continue;}
  if(phase>=301&&creature&&line==='各ターンはじめてこのクリーチャーがタップした時アンタップする。'){if(spec.g191FirstTapUntap)throw Error('重複する最初のタップ能力');spec.g191FirstTapUntap=true;continue;}
  if(phase>=300&&creature&&(m=line.match(/^このクリーチャーがタップされた時(.+)$/))){if(tapped.length)throw Error('独立した誘発能力の順序対応が必要');const defs=clauses(m[1],phase).map(q=>instruction(q,phase));if(!defs.length||defs.some(d=>!d))throw Error('未対応のタップ能力');tapped.push(...defs);continue;}
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
   if(creature&&(['このクリーチャーは可能であれば毎ターン攻撃する。','このクリーチャーは可能なら毎ターン攻撃する。'].includes(line)||phase>=385&&line==='このクリーチャーは攻撃可能であれば必ず攻撃しなければならない。')){spec.mustAttack=true;continue;}
   if(phase>=708&&creature&&[
    'このクリーチャーがバトルゾーンから自分の墓地に置かれるとき墓地に置くかわりに自分の手札に戻してもよい。',
    'このクリーチャーが破壊される時墓地に置くかわりに手札に戻してもよい。'
   ].includes(line)){spec.g708OptionalGraveToHand=true;continue;}
   if(creature&&['このクリーチャーが破壊される時墓地に置くかわりに手札に戻す。','このクリーチャーが破壊される時墓地に置くかわりにマナゾーンに置く。'].includes(line)){spec[line.includes('マナゾーン')?'destroyToMana':'destroyToHand']=true;continue;}
   if(creature&&/^このクリーチャーは相手に選ばれない。(?:\(ただしこのクリーチャーを攻撃またはブロックしてもよい\))?$/.test(line)){spec.untargetable=true;continue;}
   if(f.typeText==='NEOクリーチャー'&&(m=line.match(/^NEO進化:(?:自分の)?((?:光|水|闇|火|自然)(?:(?:または)?(?:光|水|闇|火|自然)){0,2})のクリーチャー1体の上に置いてもよい。(?:\([^()]*\))?$/))){const cs=m[1].match(/光|水|闇|火|自然/g);if(new Set(cs).size!==cs.length||spec.neoEvolution)throw Error('NEO進化条件の重複');spec.neoEvolution={any:cs.map(civilization=>({civilization}))};continue;}
   if(f.typeText==='NEOクリーチャー'&&/^NEO進化:自分のジョーカーズ(?:・クリーチャー)?1体の上に置いてもよい。(?:\([^()]*\))?$/.test(line)){if(spec.neoEvolution)throw Error('NEO進化条件の重複');spec.neoEvolution={any:[{race:'ジョーカーズ'}]};continue;}
   if(f.typeText==='NEOクリーチャー'&&/^NEO進化:自分のクリーチャー1体の上に置いてもよい。(?:\([^()]*\))?$/.test(line)){if(spec.neoEvolution)throw Error('NEO進化条件の重複');spec.neoEvolution={any:[{creature:true}]};continue;}
  }
  for(const [word,flag]of Object.entries(flags))if(keyword(line,word)){spec[flag]=true;known=true;break;}
  if(known)continue;
  if(phase>=551&&line==='シンパシー:自分の墓地にあるクリーチャー(このカードの実行コストを自分の墓地にあるクリーチャー1体につき1少なくする。ただしコストは0以下にならない)'){if(spec.g212CountDiscount||spec.g211Sympathy)throw Error('重複するシンパシー');spec.g212CountDiscount={zone:'grave',amount:1,filter:{creature:true}};continue;}
  if(phase>=548&&seed){
   const watch=line.match(/^このタマシードまたは名前に《([^》]+)》とある自分の他のタマシードが出た時(.+)$/),named=line.match(/^自分の《([^》]+)》が出た時(.+)$/);
   if(watch||named){if(spec.g548SeedEntry||entry.length||nativeEntry)throw Error('重複する同名タマシード登場能力');const m=watch||named,special={
    '相手のクリーチャーを1体選んでタップする。次の相手のターンのはじめにそのクリーチャーはアンタップしない。':[{op:'Target',tap:true,lock:true}],
    '相手のクリーチャーを1体選び持ち主の手札に戻す。':[{op:'Target',to:'hand'}]
   },defs=special[m[2]]||clauses(m[2],phase).map(q=>instruction(q,phase));if(!defs.length||defs.some(d=>!d)||defs.some(d=>!['Draw','Ramp','Target'].includes(d.op)))throw Error('未対応の同名タマシード登場能力');spec.g548SeedEntry={filter:watch?{g295Tamaseed:true,name:m[1]}:{g295Tamaseed:true,g201ExactName:m[1]},selfAlways:!!watch,defs};continue;}
  }
  if(phase>=547&&seed){
   if(line==='自分のターンの終わりに自分のシールドが相手よりも少なければ自分の山札の上から1枚目をシールド化してもよい。'){if(turnEnd.length)throw Error('重複する終了時能力');turnEnd.push({op:'IfOwn',filter:{g334ZoneCount:{zone:'shields',lessThanOpponent:true}},defs:[{op:'Offer',defs:[{op:'ShieldTop',n:1}]}]});continue;}
   if(line==='自分のターンのはじめに自分のシールドを1つ手札に加える。その「S・トリガー」は使えない。'){if(turnStart.length)throw Error('重複する開始時能力');turnStart.push({op:'ShieldHand',g238ShieldHand:true});spec.g461TurnPlayer=true;continue;}
  }
  if(phase>=546&&creature&&line==='このクリーチャーが攻撃したターン自分の他のクリーチャーも可能であれば攻撃する。'){if(spec.g546AttackForceOthers)throw Error('重複する攻撃済みクリーチャーの攻撃義務');spec.g546AttackForceOthers=true;continue;}
  if(phase>=545&&creature){const gs={
   'このクリーチャーを「G・ストライク」能力で相手に見せた時相手のクリーチャーを1体選びタップする。':{op:'Target',tap:true},
   'このクリーチャーが出た時または「G・ストライク」能力で相手に見せた時相手の「ブロッカー」を持つクリーチャーを1体破壊する。':{op:'Target',to:'grave',filter:{blocker:true}}
  }[line];if(gs){if(spec.g545GS)throw Error('重複するG・ストライク公開時能力');spec.g545GS=[structuredClone(gs)];if(line.startsWith('このクリーチャーが出た時')){if(entry.length||nativeEntry)throw Error('独立した登場時能力の順序対応が必要');entry.push(structuredClone(gs));}continue;}}
  if(keyword(line,'\\{GS\\}G・ストライク')){spec.gStrike=true;continue;}
  if(line==='マナゾーンに置く時このカードはタップして置く。'&&f.civilizations.length>1)continue;
  if(phase>=605&&line==='{2W}W・ブレイカー'||keyword(line,'W・ブレイカー')||keyword(line,'W\\(ダブル\\)・ブレイカー')){if(spec.breaker)throw Error('重複ブレイカー');spec.breaker=2;continue;}
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
  const evoLine=phase>=656?line.replace(/^進化:((?:光|水|闇|火|自然)または(?:光|水|闇|火|自然)のクリーチャー1体の上に置く。)$/,'進化:自分の$1'):line;
  if(phase>=469&&evolution&&(m=evoLine.match(/^進化[-―−:]自分の(.+)1体の上に置く。$/))){
   const q=m[1],fixed={
    'クリーチャー':{creature:true},'多色クリーチャー':{multicolor:true},'「ブロッカー」を持つクリーチャー':{blocker:true},
    '「サイバー」と種族にあるクリーチャー':{category:'サイバー'},'「コマンド」と種族にあるクリーチャー':{category:'コマンド'},
    '「サイバー」と種族にあるクリーチャーまたはオリジン':{any:[{category:'サイバー'},{race:'オリジン'}]}
   }[q],dual=q.match(/^(光|水|闇|火|自然)または(光|水|闇|火|自然)のクリーチャー$/),tribes=['ドラゴン・ゾンビ','ティラノ・ドレイク','ライトブリンガー','オリジン','エンジェル・コマンド','ドラゴン','ドリームメイト','キマイラ','アーマロイド','ゼノパーツ','ジャイアント・インセクト'],parts=q.split('または'),either=parts.length===2&&parts[0]!==parts[1]&&parts.every(x=>tribes.includes(x));
   const rule=fixed||(dual&&dual[1]!==dual[2]?{any:[{civilization:dual[1]},{civilization:dual[2]}]}:either?{any:parts.map(race=>({race}))}:null);if(rule){if(spec.evolution)throw Error('重複進化条件');spec.evolution=rule;continue;}
  }
  // Single-body alternatives reuse the native evolution matcher, never multiple bases.
  if(phase>=312&&evolution){
   const simple=line.match(/^進化[-―−:]自分の(ナイト|サムライ|ハンター)・クリーチャー1体の上に置く。$/),either=line.match(/^進化[-―−:]自分の(パラサイトワーム|ゴースト|オリジン|アーマード・ドラゴン|ファイアー・バード|エンジェル・コマンド|デーモン・コマンド)または(パラサイトワーム|ゴースト|オリジン|アーマード・ドラゴン|ファイアー・バード|エンジェル・コマンド|デーモン・コマンド)1体の上に置く。$/);
   if(simple||either){if(spec.evolution||either&&either[1]===either[2])throw Error('重複進化条件');spec.evolution=simple?{race:simple[1]}:{any:[{race:either[1]},{race:either[2]}]};continue;}
  }
  if(phase>=444&&evolution&&line==='進化ー自分のサバイバー1体の上に置く。'){if(spec.evolution)throw Error('重複進化条件');spec.evolution={race:'サバイバー'};continue;}
  if(phase>=444&&evolution&&line==='進化-自分の多色クリーチャー1体の上に置く。'){if(spec.evolution)throw Error('重複進化条件');spec.evolution={multicolor:true};continue;}
  // Other complex evolution rules stay pending.
  if(phase>=400&&evolution&&(m=line.match(/^進化[-―−:]自分の(光|水|闇|火|自然)のドラゴン1体の上に置く。$/))){if(spec.evolution)throw Error('重複進化条件');spec.evolution={category:'ドラゴン',civilization:m[1]};continue;}
  if(evolution&&(m=line.match(/^進化[-―−:]自分の([^。/]+)1体の上に置く。$/))){if(spec.evolution)throw Error('重複進化条件');const q=m[1];if(q.endsWith('のクリーチャー')&&colors.includes(q.slice(0,-7)))spec.evolution={civilization:q.slice(0,-7)};else if(!/[、または以上以下枚体]|クリーチャー/.test(q))spec.evolution={race:phase>=226&&q==='ツリー・フォーク'?'ツリーフォーク':q};else throw Error('複雑な進化条件');continue;}
  if(phase>=169){
   const trigger=creature&&line.match(/^(?:このクリーチャーが(?:バトルゾーンに)?出た時|このクリーチャーをバトルゾーンに出した時)(.+)$/),body=trigger?trigger[1]:!creature&&!seed?line:null;
   const effect=phase<643&&body==='相手のクリーチャーを1体選んでもよい。その選んだクリーチャーとこのクリーチャーをバトルさせる。'&&creature?'fightOptional':body==='相手の手札を見て1枚選び捨てさせる。'?'inspectDiscard':null;
   if(effect){if(nativeEntry||entry.length)throw Error('独立した誘発能力の順序対応が必要');nativeEntry=effect;continue;}
  }
  if(phase>=388&&creature&&line==='このクリーチャーをバトルゾーンに出した時またはこのクリーチャーが攻撃する時バトルゾーンにある相手のクリーチャーを1体選ぶ。次の自分のターンのはじめまでそのクリーチャーは攻撃もブロックもできない。'){
   if(entry.length||attack.length||nativeEntry)throw Error('独立した誘発能力の順序対応が必要');
   const def={op:'Target',g190Freeze:'self',title:'次の自分のターンまで攻撃とブロックを止める相手のクリーチャーを選ぶ'};entry.push(def);attack.push(structuredClone(def));continue;
  }
  if(phase>=515&&creature&&(m=line.match(/^このクリーチャーをバトルゾーンに出した時またはこのクリーチャーがバトルゾーンを離れた時(.+)$/))){
   if(entry.length||leave.length||nativeEntry)throw Error('独立した誘発能力の順序対応が必要');
   const defs=clauses(m[1],phase).map(text=>instruction(text,phase));if(!defs.length||defs.some(d=>!d))throw Error('未対応の能力文: '+raw);
   entry.push(...defs);leave.push(...structuredClone(defs));continue;
  }
  if(phase>=516&&creature&&(m=line.match(/^このクリーチャーをバトルゾーンに出した時またはこのクリーチャーが破壊された時(.+)$/))){
   if(entry.length||death.length||nativeEntry)throw Error('独立した誘発能力の順序対応が必要');
   const defs=clauses(m[1],phase).map(text=>instruction(text,phase));if(!defs.length||defs.some(d=>!d))throw Error('未対応の能力文: '+raw);
   entry.push(...defs);death.push(...structuredClone(defs));continue;
  }
  if(phase>=388&&creature&&line==='このクリーチャーがバトルゾーンに出た時またはバトルゾーンを離れた時相手のクリーチャーを1体選びタップする。'){
   if(entry.length||leave.length||nativeEntry)throw Error('独立した誘発能力の順序対応が必要');
   entry.push({op:'Target',tap:true});leave.push({op:'Target',tap:true});continue;
  }
  if(creature&&(phase>=400&&(m=line.match(/^このクリーチャーをバトルゾーンに出した時またはこのクリーチャーが攻撃する時(.+)$/))||phase>=237&&(m=line.match(/^このクリーチャーが(?:バトルゾーンに)?出た時または攻撃する時(.+)$/)))){
   if(entry.length||attack.length||nativeEntry)throw Error('独立した誘発能力の順序対応が必要');
   const defs=clauses(m[1],phase).map(text=>instruction(text,phase));if(!defs.length||defs.some(d=>!d))throw Error('未対応の能力文: '+raw);
   entry.push(...defs);attack.push(...structuredClone(defs));continue;
  }
  if(phase>=234&&creature&&(m=line.match(/^このクリーチャーが(?:バトルゾーンに)?出た時または自分のターンのはじめに(.+)$/))){
   if(entry.length||turnStart.length||nativeEntry)throw Error('独立した誘発能力の順序対応が必要');
   const defs=clauses(m[1],phase).map(text=>instruction(text,phase));if(!defs.length||defs.some(d=>!d))throw Error('未対応の能力文: '+raw);
   entry.push(...defs);turnStart.push(...structuredClone(defs));continue;
  }
  if(phase>=374&&creature&&line==='このクリーチャーをバトルゾーンに出した時またはこのクリーチャーがバトルゾーンを離れた時カードを1枚引いてもよい。'){
   if(entry.length||leave.length||nativeEntry)throw Error('独立した誘発能力の順序対応が必要');
   entry.push({op:'Draw',n:1,optional:true});leave.push({op:'Draw',n:1,optional:true});continue;
  }
  if(phase>=371&&creature&&line==='このクリーチャーがバトルゾーンに出た時またはバトルゾーンを離れた時相手は自身の手札を1枚選び捨てる。'){
   if(entry.length||leave.length||nativeEntry)throw Error('独立した誘発能力の順序対応が必要');
   entry.push({op:'Discard',n:1});leave.push({op:'Discard',n:1});continue;
  }
  if(phase>=656&&creature&&(m=line.match(/^このクリーチャーが攻撃する時または離れた時(.+)$/))){
   if(attack.length||leave.length)throw Error('独立した誘発能力の順序対応が必要');
   const defs={
    '相手のクリーチャーを1体選ぶ。相手はそのクリーチャーを破壊するか山札の上に置く。':[{op:'Target',g467Destinations:['grave','deckTop'],g472OwnerDestination:true}],
    '各プレイヤーは自身の手札を1枚選び捨てる。その後自分はカードを1枚引く。':[{op:'EachPlayer459',origin:'hand',to:'grave',discard:true},{op:'Draw',n:1}],
    '自分と相手のクリーチャーを1体ずつ選ぶ。その2体をバトルさせる。':[{op:'Fight240'}],
    ...(phase>=657?{'カードを1枚引く。その後自分の手札を1枚表向きまたは裏向きでシールド化してもよい。':[{op:'Draw',n:1},{op:'HandShield657'}]}:{}),
    ...(phase>=658?{'自分の山札の上から1枚を表向きにする。それがコスト3以下のクリーチャーなら出してもよい。こうして出さなければそれを山札の下に置く。':[{op:'LookDeploy530',n:1,public:true,limit:1,rest:'bottom',filter:{creature:true,max:3}}]}:{})
   }[m[1]];
   if(!defs)throw Error('未対応の能力文: '+raw);
   attack.push(...defs);leave.push(...structuredClone(defs));continue;
  }
  if(phase>=233&&creature&&(m=line.match(/^このクリーチャーが出た時または離れた時(.+)$/))){
   if(entry.length||leave.length||nativeEntry)throw Error('独立した誘発能力の順序対応が必要');
   const defs=clauses(m[1],phase).map(text=>instruction(text,phase));if(!defs.length||defs.some(d=>!d))throw Error('未対応の能力文: '+raw);
   entry.push(...defs);leave.push(...structuredClone(defs));continue;
  }
  if(phase>=284&&creature&&(m=line.match(/^(?:このクリーチャーを召喚してバトルゾーンに出した時|このクリーチャーが召喚によって(?:バトルゾーンに)?出た時)(.+)$/))){
   if(entry.length||nativeEntry||spec.summonedEntryOnly)throw Error('独立した召喚時能力の順序対応が必要');
   const text=m[1].replace(/^カードを([1-9]\d*)枚まで引き(?:その後)?/,'カードを$1枚まで引く。その後'),defs=clauses(text,phase).map(q=>instruction(q,phase));
   if(!defs.length||defs.some(d=>!d))throw Error('未対応の召喚時能力');spec.summonedEntryOnly=true;entry.push(...defs.map(d=>d.op==='DrawUpTo'?{...d,g203Draw:true}:d));continue;
  }
  if(phase>=504&&creature&&(m=line.match(/^このクリーチャーが攻撃する時相手がブロックする前に(.+)$/))){
   if(attack.length)throw Error('独立した攻撃時能力の順序対応が必要');
   const defs=clauses(m[1],phase).map(text=>instruction(text,phase));if(!defs.length||defs.some(d=>!d))throw Error('未対応の攻撃時能力');attack.push(...defs);continue;
  }
  let body=line,dest=entry;
  if(creature||seed){const trigger=line.match(/^(?:このクリーチャー|このタマシード)(?:が(?:バトルゾーンに)?出た時|をバトルゾーンに出した時)(.+)$/);const atk=creature&&line.match(/^このクリーチャーが攻撃する時(.+)$/);const dies=phase>=172&&creature&&line.match(/^このクリーチャーが破壊された時(.+)$/),leaves=phase>=172&&creature&&line.match(/^このクリーチャーがバトルゾーンを離れた時(.+)$/);if(trigger)body=trigger[1];else if(atk){body=atk[1];dest=attack;}else if(phase>=507&&creature&&(m=line.match(/^このクリーチャーがバトルゾーンから自分の墓地に置かれたとき(.+)$/))){body=m[1];dest=death;}else if(dies){body=dies[1];dest=death;}else if(leaves){body=leaves[1];dest=leave;}else if(phase>=182&&creature&&(m=line.match(/^このクリーチャーが離れた時(.+)$/))){body=m[1];dest=leave;}else if(phase>=179&&creature&&(m=line.match(/^相手のターンの(?:はじめ|始め)に(.+)$/))){body=m[1];dest=opponentStart;}else if(phase>=174&&creature&&(m=line.match(/^自分のターンの(?:はじめ|始め)に(.+)$/))){body=m[1];dest=turnStart;}else if(phase>=565&&(m=line.match(/^相手のターンの終わりに(.+)$/))){body=m[1];dest=opponentEnd;}else if(phase>=174&&creature&&(m=line.match(/^自分のターンの終わりに(.+)$/))){body=m[1];dest=turnEnd;}else throw Error('未対応の能力文: '+raw);if(dest.length||dest===entry&&nativeEntry)throw Error('独立した誘発能力の順序対応が必要');}
  if(nativeEntry&&dest===entry)throw Error('未対応の複合効果');
  if(phase>=629&&spec.neoEvolution&&body==='カードを1枚引く。これが進化クリーチャーならカードをもう1枚引き自分の手札を1枚シールド化し自分のシールドを1つ手札に加える。ただしその「S・トリガー」は使えない。'){
   dest.push({op:'Draw',n:1},{op:'IfNeo563',defs:[{op:'Draw',n:1},{op:'ShieldExchange446'}]});
   continue;
  }
  const parts=clauses(body,phase),tasks=parts.map(text=>instruction(text,phase));if(tasks.some(t=>!t)||!tasks.length)throw Error('未対応の能力文: '+raw);dest.push(...tasks.map(t=>!creature&&!seed&&(t.power||phase>=170&&t.lock)?{...t,spell:true}:t));
 }
 if(phase>=190&&!creature&&!seed){const mark=defs=>{for(const d of defs||[]){if(d.g190Freeze||phase>=546&&d.g546Force||phase>=210&&d.g210TapLock||phase>=214&&d.power||phase>=335&&(d.grant||d.g335Grant))d.spell=true;mark(d.defs);for(const m of d.modes||[])mark(m.defs);}};mark(entry);}
 if(f.typeText==='スター進化クリーチャー'&&!spec.starEvolution)throw Error('スター進化条件の不足');
 if(phase>=492&&spec.invasion&&!spec.evolution&&!spec.neoEvolution)throw Error('侵略に必要な進化条件がありません');
 if(f.typeText==='G-NEOクリーチャー'&&!spec.gNeo)throw Error('未対応のG-NEO進化条件');
 if(f.typeText==='NEOクリーチャー'&&(!spec.neoEvolution||spec.exLife))throw Error('未対応のNEO進化条件');
 if(evolution&&(!spec.evolution||spec.exLife||spec.trigger))throw Error('特殊進化または進化条件の不足');
 if(phase>=402&&evolution&&(spec.kirifudaDash||spec.fushigibirth))throw Error('代替召喚と進化元の選択を組み合わせる対応が必要');
 if(creature&&f.powerText.endsWith('+')&&!powerBonus)throw Error('未実装の可変パワー');
 if(creature&&f.powerText.endsWith('-')&&!(spec.g207CountPower?.amount<0))throw Error('未実装の可変パワー');
 if(phase>=427&&!creature&&!seed&&!entry.length&&!nativeEntry&&spec.normalCharger)nativeEntry='sixPhoto';
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
 if(opponentEnd.length)spec.g565OpponentEnd=opponentEnd;
 if(tapped.length)spec.g188Tapped=tapped;
 if(battleWin.length)spec.g189BattleWin=battleWin;
 if(f.civilizations.length===5&&!(phase>=583&&d.id==='dm26ex3-040'))spec.manaValue=0;
 return spec;
}
