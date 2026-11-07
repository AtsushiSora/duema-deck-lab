const newCards = [
  'dm23rp4-035','dm23rp4-039','dm23rp2-043','dmex16-004','dm26ex2-054',
  'dm25rp4-057','dm25rp4-065','dm25rp4-071','dm25rp4-061','dm25rp4-075','dm31-034'
];
const support = ['dm01-075','dm01-083','dm01-090','dm01-097','dm01-104','dm08-049'];

export const STANDARD573_DECK = {
  id:'standard573',
  name:'セイバーと文明・種族のコスト軽減',
  format:'original',
  cards:[
    ...newCards.map(id=>({id,count:2})),
    ...support.map(id=>({id,count:3}))
  ]
};
