const cards = [
  'dmr20-030','dm05-050','dm13-027','dmr19-016','dm15-021',
  'dm01-075','dm01-083','dm01-090','dm01-097','dm28-033'
];

export const STANDARD574_DECK = {
  id:'standard574',
  name:'旧表記のセイバーと追加ターン',
  format:'original',
  cards:cards.map(id=>({id,count:4}))
};
