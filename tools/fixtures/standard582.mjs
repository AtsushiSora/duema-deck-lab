const batch=[
  'dm15-s02','dm16-015','dm38-023','dm02-016','dm02-050','dm07-s04',
  'dm03-031','dmex16-047','dmx17-008','dm01-029','dmx15-s06'
];
const support=['dm01-083','dm01-090','dm01-097','dm24bd3-009'];

export const STANDARD582_DECK={
  id:'standard582',name:'マナゾーンのカード選択',format:'original',
  cards:[...batch.map(id=>({id,count:2})),...support.map(id=>({id,count:4})),{id:'dm19-022',count:2}]
};
