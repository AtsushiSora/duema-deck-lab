const rows=ids=>ids.map(n=>({id:`dm01-${String(n).padStart(3,'0')}`,count:4}));
export const PRESETS=[
 {id:'practice-rg',name:'火自然ビート',category:'定番',format:'original',description:'小型の展開と青銅の鎧のマナ加速。対応カードで組んだ練習用デッキです。',cards:rows([100,97,98,95,101,108,103,104,106,110]),colors:['火','自然']},
 {id:'practice-wu',name:'光水ブロッカー',category:'定番',format:'original',description:'ブロッカーで守り、ブロックされないクリーチャーで攻撃する練習用デッキです。',cards:rows([75,76,78,79,80,81,83,84,86,49]),colors:['光','水']},
 {id:'practice-bu',name:'水闇コントロール',category:'定番',format:'original',description:'手札補充と除去を使う練習用デッキです。大会・環境デッキの転載ではありません。',cards:rows([80,81,83,86,52,90,89,93,94,88]),colors:['水','闇']}
];
