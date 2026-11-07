const batch=[
  'dmx09-009','dm03-046','dmrp04m-061','dm36-110','dm04-049',
  'dm20-020','dmx16-064','dm06-066','dm05-037','dm26ex3-040',
  'dm24bd4-009','dmd13-002','dmr13-035','dmpcd01-r13','dm29-005'
];
const support=['dm26ex3-057','dm26ex3-033','dm25ex1-SP5','dm36-098','dm01-083'];

export const STANDARD583_DECK={
  id:'standard583',name:'墓地回収とマナの追加',format:'original',
  cards:[...batch.map(id=>({id,count:2})),...support.map(id=>({id,count:2}))]
};
