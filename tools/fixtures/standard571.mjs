const first=['dm25rp1-056','dmr19-064','dmrp03-084','dm20-038','dm14-083','dm22rp2-029','dmrp02-092','dm28-100'],second=['dm22rp1-046','dm22-049','dm14-100','dm25-030','dmx16-037','dm32-074','dmr11-035'];
const deck=(i,ids)=>({id:'standard571-'+i,name:['進化・文明・種族を守るセイバー','ドラゴン・ゴッドを守るセイバー'][i],format:'original',cards:ids.map(id=>({id,count:4}))});
export const STANDARD571_DECKS=[deck(0,[...first,'dm01-097','dm01-108']),deck(1,[...second,'dm01-097','dm01-083','dm05-s04'])];
