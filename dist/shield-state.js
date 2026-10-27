// A shield is a group of physical cards; its stable group identity survives a partial move.
export const shieldCards=x=>x?[x,...(x.shieldStack||[])]:[];
export const shieldGroup=x=>x.shieldGroup||x.uid;
export const findShield=(own,uid)=>own.shields.find(x=>x.uid===uid||shieldGroup(x)===uid);
export function attachShield(own,uid,x,{faceUp=true}={}){const root=findShield(own,uid);if(!root)return false;root.shieldGroup=shieldGroup(root);x.faceUp=faceUp;if(faceUp)x.shieldCardOnly=true;else delete x.shieldCardOnly;(root.shieldStack??=[]).push(x);return true;}
export function detachShieldCard(own,uid){
 const root=own.shields.find(x=>shieldCards(x).some(y=>y.uid===uid));if(!root)return null;
 const group=shieldGroup(root),index=own.shields.indexOf(root);let x;
 if(root.uid===uid){x=root;const rest=root.shieldStack||[];delete root.shieldStack;if(rest.length){const next=rest.shift();next.shieldGroup=group;if(rest.length)next.shieldStack=rest;own.shields[index]=next;}else own.shields.splice(index,1);}
 else{x=root.shieldStack.splice(root.shieldStack.findIndex(x=>x.uid===uid),1)[0];}
 return {card:x,group,removedGroup:!own.shields.some(x=>shieldGroup(x)===group)};
}
