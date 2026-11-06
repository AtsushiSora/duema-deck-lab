const groups=[
 ['dmd30-005','dmr21-048','dmr22-040','promoy15-013','dmx23-013','dmd30-001','dmr23-021','dmr21-050','dmr09-080','dmr23-060'],
 ['dmd29-001','promoy15-sp2d01','promoy15-001','promoy15-020','promoy15-056','dmd29-007','promoy15-025','dm23rp1-066','dmr17-089','dm06-110'],
 ['dmr22-043','dmr21-052','dm26rp2-059','dm26rp2-063','dmr22-044','dmr23-025','dm22ex2-S08','dm36-087','dm01-083','dm01-097']
];
export const STANDARD487_DECKS=groups.map((ids,i)=>({id:'standard487-'+i,name:'Civilization revolution change '+i,format:'original',cards:ids.map(id=>({id,count:4}))}));
