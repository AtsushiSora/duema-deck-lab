import {nameKey} from './catalogue.js';

// Fixed tournament snapshots, not a live ranking or generated card combinations.
const event='DMGP2026-1st Day2（オリジナル）';
const checkedAt='2026-10-20';
const finalSource='https://dm.takaratomy.co.jp/coverage/dmgp2026b_final/';
const listSource='https://dm.takaratomy.co.jp/coverage/dmgp2026b_decklist/';
const rows=list=>list.map(([count,name])=>({count,name}));
export const GOLGY_TARGET='env-nationals2025-denne';
export const ENVIRONMENT_LISTS=[
 {id:'env-gp2026-grimoire',name:'バイケン',player:'Grimoire',result:'優勝',source:finalSource,
  cards:rows([[4,'カクラリコ'],[4,'裏斬隠 テンサイ・ハート'],[1,'コッコ・武・ルピア'],[4,'斬隠将撃龍ニバイケン'],[4,'斬隠蒼頭龍バイケン'],[2,'轟く邪道 レッドゾーン'],[1,'聖カオスマントラ'],[2,'紅き団長 ドギラゴン悪'],[2,'飛翔龍 5000VT'],[1,'時の法皇 ミラダンテXII'],[2,'音卿の精霊龍 ラフルル・ラブ / 「未来から来る、だからミラクル」'],[4,'虚ト成リシ古ノ蛇神ノ咆哮'],[3,'我竜塔第八層 バルザーク'],[4,'氷柱と炎弧の決断'],[2,'真気楼と誠偽感の決断']])},
 {id:'env-gp2026-pinky',name:'ドギラゴン王道',player:'ピンキ→',result:'準優勝',source:finalSource,
  cards:rows([[2,'友情地龍 ルピア・ターン'],[2,'世界のY チャクラ・デル・フィン'],[4,'宿禰マロン'],[4,'偽りの希望 鬼丸「終斗」'],[4,'～輝きは奇跡そのもの～'],[4,'頂上連結 ロッド・ゾージア5th'],[4,'ボルシャック・ドリーム・ドラゴン'],[4,'剣轟の団長 ドギラゴン王道'],[1,'暴龍のT ミリオンベジータ'],[1,'超竜バジュラズテラ'],[1,'「GG」-001'],[1,'∞龍 ゲンムエンペラー'],[4,'R.S.F.K. / オールイン・チャージャー'],[4,'メンデルスゾーン']])},
 {id:'env-gp2026-sara',name:'光水闇邪眼帝',player:'サラー',result:'TOP8',source:listSource,
  cards:rows([[4,'改竄の炎 ボルメテウス・ハック'],[4,'煌ノ裁徒 ダイヤモン星'],[2,'旋略のS アドミラル・アレグル'],[4,'終止の時計 ザ・ミュート'],[4,'冥土人形ヴァミリア・バレル'],[3,'「大蛇」の鬼 ジャドク丸'],[3,'世界のY チャクラ・デル・フィン'],[4,'～世紀末の善悪～'],[3,'アーテル・ゴルギーニ'],[1,'切札竜 ボルメテウス・リバース・ドラゴン'],[4,'～邪眼帝～'],[4,'ウルの天宝']])},
 {id:'env-nationals2025-dotto',name:'ドギラゴン王道',player:'dotto',event:'全国大会2025 日本一決定戦（オリジナル）',result:'出場',checkedAt:'2026-10-21',source:'https://dm.takaratomy.co.jp/coverage/dmnt25_deck1/',
  cards:rows([[2,'友情地龍 ルピア・ターン'],[4,'宿禰マロン'],[4,'偽りの希望 鬼丸「終斗」'],[2,'流星のガイアッシュ・カイザー'],[4,'頂上連結 ロッド・ゾージア5th'],[4,'ボルシャック・ドリーム・ドラゴン'],[3,'～輝きは奇跡そのもの～'],[4,'剣轟の団長 ドギラゴン王道'],[2,'超竜バジュラズテラ'],[1,'∞龍 ゲンムエンペラー'],[2,'ボルシャック・スーパーヒーロー / 超英雄タイム'],[4,'R.S.F.K. / オールイン・チャージャー'],[4,'メンデルスゾーン']])},
 {id:'env-viride-practice',name:'白緑ウィリデ',player:'練習用調整',event:'超CSⅨ新潟 公式構成参考',result:'練習用',practice:true,checkedAt:'2026-10-24',source:'https://dm.takaratomy.co.jp/coverage/dmscs09a_top4-1/',regulation:'https://dm.takaratomy.co.jp/rule/regulation/',adjustments:'セイント・キャッスルを4→1枚に変更。一音の妖精を2→3枚、クイーン&かぼちゃうちゃうを3→4枚、とこしえの超人を1→2枚に調整。',
  cards:rows([[2,'とこしえの超人'],[4,'楯教の求道者 ザゼ・ゼーン'],[4,'クイーン&かぼちゃうちゃう'],[3,'一音の妖精'],[4,'世界のY チャクラ・デル・フィン'],[2,'ポッピ・冠・ラッキー'],[4,'ウィリデ・ゴル・ゲルス'],[4,'天V王 エバーラスト'],[4,'烈しき切札 ドギラゴン逆'],[1,'我竜塔第一層 セイント・キャッスル'],[4,'魂が休む庭園 グリーン・グランドクロス'],[4,'我竜塔第七層 ハッスル・キャッスル']])},
 {id:GOLGY_TARGET,name:'光水自然ゴルギーオージャー',player:'デンネ',result:'TOP8',event:'全国大会2025 日本一決定戦（オリジナル）',checkedAt:'2026-10-24',source:'https://dm.takaratomy.co.jp/coverage/dmnt25_bd4/',cards:rows([[2,'ベイB セガーレ'],[4,'ソウルサンライト コハク'],[4,'一音の妖精'],[4,'大集合！アカネ&アサギ&コハク'],[1,'吟弾の妖精'],[4,'華謡の精霊カンツォーネ'],[4,'観覧！ホールインランド・ヘラクレス'],[3,'巨魔天 アオフェシー'],[4,'～西方より来る激流の竜騎公～'],[1,'飛翔龍 5000VT'],[4,'轟䡛合体 ゴルギーオージャー'],[4,'ジャスミンの地版'],[1,'超魂設計図']])},
 {"id":"env-scs9-niigata-rose","name":"墓地ソース","player":"ろーず","event":"超CSⅨ新潟（オリジナル）","result":"TOP4","checkedAt":"2026-10-24","source":"https://dm.takaratomy.co.jp/coverage/dmscs09a_deck/",cards:rows([[4,"百万超邪 クロスファイア"],[1,"樹食の超人"],[1,"暴龍のT ミリオンベジータ"],[3,"超神星DOOM・ドラゲリオン"],[2,"大樹王 ギガンディダノス"],[4,"「業流」の頂 ゾロ・ア・スタート"],[4,"ハニー＝マーガニー / 「こっちは甘いぞー」"],[4,"雷撃の冥将クーゼン / ダーク・ライフ"],[4,"超時空罠 デンジャデオン / 「トラップ？ちがうわ、お願いしてるだけ！」"],[4,"レレディ・バ・グーバ / ツインパクト・マップ"],[4,"大長老 アプル / 「わたしが自然文明のプリンセス？」"],[4,"龍装鬼 オブザ08号 / 終焉の開闢"],[1,"超七極 Gio / 巨大設計図"]])},
 {"id":"env-nationals2025-kikurage","name":"4色アルファディオス","player":"きくらげ","event":"全国大会2025 日本一決定戦（オリジナル）","result":"出場","checkedAt":"2026-10-24","source":"https://dm.takaratomy.co.jp/coverage/dmnt25_deck1/",cards:rows([[4,"大集合！アカネ&アサギ&コハク"],[4,"天彩の精霊ミルディアス"],[3,"天革の騎令嬢 ミラクルステラ"],[2,"偽りの希望 鬼丸「終斗」"],[4,"王導聖霊 アルファディオス"],[4,"頂上連結 ロッド・ゾージア5th"],[4,"剣轟の団長 ドギラゴン王道"],[3,"滝川るる＆ラフルル ー閃光のヒロインー"],[3,"ボルシャック・スーパーヒーロー / 超英雄タイム"],[4,"支配の精霊ペルフェクト / ギャラクシー・チャージャー"],[1,"音卿の精霊龍 ラフルル・ラブ / 「未来から来る、だからミラクル」"],[4,"ジャスミンの地版"]])},
 {"id":"env-gp2026-yoshikawa","name":"ゴルギーオージャー・シャコガイル","player":"いんふぃにてぃ吉川","event":"DMGP2026-1st Day2（オリジナル）","result":"TOP8","checkedAt":"2026-10-24","source":"https://dm.takaratomy.co.jp/coverage/dmgp2026b_decklist/",cards:rows([[4,"ソウルサンライト コハク"],[4,"一音の妖精"],[4,"大集合！アカネ&アサギ&コハク"],[2,"TAKASUGI-死合乱闘3000"],[4,"華謡の精霊カンツォーネ"],[4,"観覧！ホールインランド・ヘラクレス"],[3,"～進封せし大悪魔～"],[2,"巨魔天 アオフェシー"],[4,"～西方より来る激流の竜騎公～"],[4,"轟䡛合体 ゴルギーオージャー"],[1,"水上第九院 シャコガイル"],[4,"ジャスミンの地版"]])},
 {"id":"env-complex-practice","name":"青黒COMPLEX","player":"練習用調整","event":"DMGP2025-1st Day2（オリジナル）公式構成参考","result":"練習用","checkedAt":"2026-10-24","source":"https://dm.takaratomy.co.jp/coverage/dmgp2025b_decklist/","practice":true,"regulation":"https://dm.takaratomy.co.jp/rule/regulation/","adjustments":"カルマ選手の構成を参考に、奇天烈 シャッフ2枚を洗脳センノー2枚へ変更。",cards:rows([[1,"DARK MATERIAL COMPLEX"],[4,"異端流し オニカマス"],[1,"貴布人 テブルカッケ＝エディ"],[4,"終止の時計 ザ・ミュート"],[4,"冥土人形ヴァミリア・バレル"],[2,"洗脳センノー"],[4,"アーテル・ゴルギーニ"],[4,"忍蛇の聖沌 c0br4"],[3,"飛翔龍 5000VT"],[1,"∞龍 ゲンムエンペラー"],[3,"ボン・キゴマイム / ♪やせ蛙 ラッキーナンバー ここにあり"],[4,"修羅の死神フミシュナ / 「この先は修羅の道ぞ」"],[3,"カレイコの黒像"],[2,"絶望と反魂と滅殺の決断"]])},
 {"id":"env-heavens-practice","name":"4色天門","player":"練習用調整","event":"全国大会2025 日本一決定戦（オリジナル）公式構成参考","result":"練習用","checkedAt":"2026-10-24","source":"https://dm.takaratomy.co.jp/coverage/dmnt25_deck1/","practice":true,"regulation":"https://dm.takaratomy.co.jp/rule/regulation/","adjustments":"さくやま選手の構成を参考に、S級宇宙 アダムスキー1枚をロスト・Re:ソウル1枚、ブルー・インパルス1枚をDNA・スパーク1枚、ホーガン・ブラスター1枚を絶望と反魂と滅殺の決断1枚へ変更。",cards:rows([[4,"天災 デドダム"],[4,"天彩の精霊ミルディアス"],[4,"～世紀末の善悪～"],[4,"流星のガイアッシュ・カイザー"],[1,"ロスト・Re:ソウル"],[1,"CRYMAX ジャオウガ"],[3,"砕慄接続 グレイトフル・ベン"],[2,"飛翔龍 5000VT"],[1,"ブラキオ龍樹"],[2,"大樹王 ギガンディダノス"],[1,"DNA・スパーク"],[4,"♪立ち上がる 悪魔に天使 堕ちるかな"],[4,"真気楼と誠偽感の決断"],[1,"絶望と反魂と滅殺の決断"],[4,"ヘブンズ・ゲート"]])},
 {"id":"env-gospel-practice","name":"水晶ゴスペル","player":"練習用調整","event":"DMGP2024-2nd Day2（オリジナル）公式構成参考","result":"練習用","checkedAt":"2026-10-24","source":"https://dm.takaratomy.co.jp/coverage/dmgp2024-2ndb_decklist/","practice":true,"regulation":"https://dm.takaratomy.co.jp/rule/regulation/","adjustments":"無視無視ノンノン選手の構成を参考に、ブルー・インパルス2枚をDNA・スパーク2枚、バッドドッグ・マニアクス1枚をドンドン吸い込むナウ1枚、ラッキー・ダーツ1枚をクリスタル・メモリー1枚、ロスト・ウォーターゲイト2枚をスラスラ吸い込むナウ2枚へ変更。",cards:rows([[1,"時の法皇 ミラダンテXII"],[4,"水晶の王 ゴスペル"],[1,"音卿の精霊龍 ラフルル・ラブ / 「未来から来る、だからミラクル」"],[2,"DNA・スパーク"],[4,"キリモミ・ヤマアラシ"],[1,"セイレーン・コンチェルト"],[4,"最期の竜炎"],[1,"ドンドン吸い込むナウ"],[1,"クリスタル・メモリー"],[2,"スラスラ吸い込むナウ"],[1,"オリオティス・ジャッジ"],[3,"バーニング・フィンガー"],[4,"勇愛の天秤"],[1,"♪なぜ離れ どこへ行くのか 君は今"],[4,"氷柱と炎弧の決断"],[2,"ファイナル・ストップ"],[1,"エンドレス・フローズン・カーニバル"],[3,"月下卍壊 ガ・リュミーズ 卍"]])},
];

export const VIRIDE_TARGET='env-viride-practice';
export const ENVIRONMENT_TARGET='env-gp2026-pinky';
// Count both physical copies and distinct card names; partial support never enables a battle.
export function environmentSupport(deck,registry){
 const rows=registry.resolveRows(deck.cards),supported=rows.filter(r=>registry.get(r.id).supported),unsupported=rows.filter(r=>!registry.get(r.id).supported);
 return {supportedCopies:supported.reduce((n,r)=>n+r.count,0),totalCopies:rows.reduce((n,r)=>n+r.count,0),supportedTypes:supported.length,totalTypes:rows.length,unsupported};
}

export function resolveEnvironmentDecks(registry,lists=ENVIRONMENT_LISTS){
 return lists.map(list=>{
  const seen=new Set();
  const cards=list.cards.map(row=>{
   const c=registry.byName.get(nameKey(row.name));
   if(!c)throw Error('大会リストのカードが未登録です：'+row.name);
   if(seen.has(c.id)||!Number.isSafeInteger(row.count)||row.count<1||row.count>4)throw Error('大会リストの枚数が正しくありません：'+row.name);
   seen.add(c.id);return {id:c.id,count:row.count};
  });
  const deck={id:list.id,name:list.name+'（'+list.player+'）',cards,format:'original',category:'環境',description:(list.event||event)+' / '+list.result+' / '+list.player+(list.practice?'。使用制限を反映した練習用の40枚です。':'。大会当時の40枚です。'),tournament:{event:list.event||event,player:list.player,result:list.result,source:list.source,checkedAt:list.checkedAt||checkedAt,...(list.practice?{practice:true,adjustments:list.adjustments,regulation:list.regulation}:{})}};
  const errors=registry.validate(deck);if(errors.length)throw Error(errors.join(' / '));
  if(!/^https:\/\/dm\.takaratomy\.co\.jp\/coverage\//.test(list.source))throw Error('大会リストの出典が正しくありません');
  return deck;
 });
}

export {prepareDeckCopy as prepareEnvironmentCopy} from './deck-copy.js';
