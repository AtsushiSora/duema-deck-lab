import {setCards,chooseAI} from './engine.js?v=0.157.0';
self.onmessage=({data})=>{
 try{
  if(data.type==='init'){setCards(data.cards);return;}
  if(data.type==='choose')postMessage({type:'choice',id:data.id,action:chooseAI(data.state)});
 }catch(error){postMessage({type:'error',id:data.id,message:String(error.message||error)});}
};
