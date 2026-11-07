const batch=[
  'dmrp09-092','dm22rp2-049','dmrp01-025','dmrp14-078','promoy15-064','dmrp12-056',
  'dmrp16-019','dm22rp1-003','dmrp21-010','dmr14-023','dmr15-041'
];
const support=['dm01-075','dm01-083','dm01-090','dm01-097','dm01-108','dm01-s01'];

export const STANDARD579_DECK={
  id:'standard579',
  name:'進化元と封印を選ぶカード指定',
  format:'original',
  cards:[...batch.map(id=>({id,count:2})),...support.map(id=>({id,count:3}))]
};
