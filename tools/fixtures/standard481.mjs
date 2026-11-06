const additions=['dmrp20-045','dmrp14-s04','dmrp16-084','dmrp04s-048','dmsd03-007','dmrp02-066','dmrp08-039','dmrp14-089'];
export const STANDARD481_DECKS=[['dm01-083','dm01-090'],['dm01-083','dmrp19-036']].map((fillers,i)=>({id:'standard481-'+i,name:'Conditional attacks '+i,format:'original',cards:[...additions,...fillers].map(id=>({id,count:4}))}));
