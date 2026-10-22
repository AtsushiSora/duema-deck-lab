import {getApps,initializeApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {createDuelService} from '../../server/duel-core.mjs';
import {createFirestoreStore} from '../../server/duel-store.mjs';
import {createDuelHandler} from '../../server/duel-handler.mjs';
let handler;
export default async request=>{
 if(!handler){const key=Netlify.env.get('DUEL_STATE_KEY');if(!key)return Response.json({error:'room/setup',message:'オンライン対戦の準備中です。しばらくしてからお試しください。'},{status:503,headers:{'Cache-Control':'no-store'}});const app=getApps().find(x=>x.name==='duel-auth')||initializeApp({projectId:'duema-deck-lab'},'duel-auth');handler=createDuelHandler({service:createDuelService({store:createFirestoreStore(),key}),verifyToken:token=>getAuth(app).verifyIdToken(token)});}
 return handler(request);
};
export const config={path:'/api/duel',rateLimit:{action:'rate_limit',aggregateBy:'ip',windowSize:60,windowLimit:180}};
