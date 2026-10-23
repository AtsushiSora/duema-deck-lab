// Shared presentation policy. Only supplied legal moves can become direct actions.
export function battlePrimaryAction({actions=[],human=false,finished=false,decision=false,phase,
 selected=false,selectedMoves=[],selectedType,attacker=false,attackChoice=null,endReview=false}={}){
 const open=(label,command,disabled=false)=>({label,command,disabled,move:null});
 const move=(a,label)=>a?{label,command:'move',move:a,disabled:false}:null;
 if(finished)return open('対戦結果','result');
 if(!human)return open('相手のターン','wait',true);
 if(endReview)return open('終了を確認','review');
 if(decision)return open('効果を選ぶ','choices');
 if(attackChoice)return open('攻撃する','confirmAttack');
 if(phase==='charge')return selected?move(selectedMoves.find(a=>a.kind==='charge'),'マナに置く')||open('使用条件を確認','card'):move(actions.find(a=>a.kind==='skipCharge'),'マナを置かずに進む')||open('マナを選ぶ','choices');
 if(phase==='main'){
  if(selected){
   if(selectedMoves.length===1){
    const a=selectedMoves[0],type=a.playType||selectedType;
    // Alternate costs and execution methods need their full explanation first.
    if(a.kind==='play'&&!a.requiresMethod&&!a.alternative&&!a.freeSummon&&!a.g7Payment&&!a.g18Reducers)
     return move(a,type==='spell'?'呪文を唱える':type==='creature'?'召喚する':type==='gear'?'ジェネレートする':'カードを使う');
   }
   return open(selectedMoves.length?'使う方法を選ぶ':'使用条件を確認','card');
  }
  return move(actions.find(a=>a.kind==='toAttack'),'攻撃へ進む')||open('使い方を選ぶ','choices');
 }
 if(phase==='attack')return attacker?open('攻撃先を選ぶ','targets'):move(actions.find(a=>a.kind==='endTurn'),'ターン終了')||open('攻撃するクリーチャーを選ぶ','choices');
 return open('効果を選ぶ','choices');
}
