import { MongoClient } from 'mongodb';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Routes } from 'discord.js';
import { classifyReceipts, moveBalance, remainingSlice } from './donationRecipientReview.js';
import { syncVipConfig } from './vip-creater.js';
import { donationMongoOptions } from './fetchJson.js';

const collection = 'donationRecipientReviews';
const button = (id,label,style=ButtonStyle.Secondary) => new ButtonBuilder().setCustomId('dpreview:'+id).setLabel(label).setStyle(style);
const bar = (...buttons) => new ActionRowBuilder().addComponents(buttons);
const duration = ms => Math.floor(ms/86400000)+' д. '+Math.floor(ms/3600000)%24+' ч. '+Math.floor(ms/60000)%60+' мин.';
const mentions={parse:[]};
function card(row) {
  const history=row.evidence==='issued';
  const people=row.candidates.slice(0,5).map(c=>'<@'+c.discordId+'> · `'+c.steamId+'` · <t:'+Math.floor(+c.selectedAt/1000)+':T>').join('\n');
  const fixed=row.status==='corrected';
  const embed={title:fixed?'Получатель доната исправлен':'Проверить SteamID доната',color:fixed?0x338855:0xdba93e,
    fields:[{name:'Донат №'+row._id,value:row.amount+' ₽ · <t:'+Math.floor(+row.at/1000)+':T>'},
      {name:'SteamID в платеже',value:row.source},
      {name:history?'Получили ссылку до платежа (старый журнал)':'Нажали DonatePay перед платежом',value:people+(row.candidates.length>5?'\nЕщё: '+(row.candidates.length-5):'')}],
    footer:{text:'DonatePay · '+row._id}};
  if(fixed) embed.fields.push({name:'Исправил',value:'<@'+row.admin+'> → `'+row.target+'` · '+duration(row.movedMs)});
  else embed.description=row.status==='expired'?'Срок платежа истёк, перенос не выполнен.':
    row.status==='moving'?'Перенос подтверждён администратором.':'Сверьте чек с игроком перед переносом VIP.';
  return {embeds:[embed],components:row.status==='open'?[bar(button('open:'+row._id,'Заменить SteamID доната')).toJSON()]:[],allowed_mentions:mentions};
}

async function notify(client,options,db,row) {
  const cases=db.collection(collection);
  const channelId=String(options.vipLogChannelId), route=Routes.channelMessages(channelId);
  let msg=row.messageId;
  if(!msg && row.attemptAt) {
    let before;
    for (;;) {
      const query=new URLSearchParams({limit:'100'}); if(before) query.set('before',before);
      const page=await client.rest.get(route,{query});
      msg=page.find(m=>m.author.id===client.user.id && m.embeds.some(e=>e.footer?.text==='DonatePay · '+row._id))?.id;
      if(msg || page.length<100 || Date.parse(page.at(-1).timestamp)< +row.attemptAt-5000) break;
      before=page.at(-1).id;
    }
  }
  const body=card(row);
  if(msg) await client.rest.patch(Routes.channelMessage(channelId,msg),{body});
  else {
    await cases.updateOne({_id:row._id},{$set:{attemptAt:new Date()}});
    const delivered=await client.rest.post(route,{body:{...body,nonce:'dp-review-'+row._id,enforce_nonce:true}});
    msg=delivered.id;
  }
  await cases.updateOne({_id:row._id,status:row.status},{$set:{notify:false,messageId:msg,channelId}});
}

async function syncMember(guild,stats,discordId,contents,roleId) {
  if (!discordId) return;
  const accounts=await stats.find({discordid:discordId},{projection:{_id:1}}).toArray();
  const ids=new Set(accounts.map(a=>String(a._id)));
  const active=contents.split(/\r?\n/).some(line=>ids.has(/^Admin=(\d+):/.exec(line)?.[1]));
  const member=await guild.members.fetch(discordId).catch(e=>{if(e.code===10007)return null;throw e;});
  if (!member || member.roles.cache.has(roleId)===active) return;
  if(active) await member.roles.add(roleId,'Исправление получателя DonatePay');
  else await member.roles.remove(roleId,'Исправление получателя DonatePay');
}

async function finishTransfer(client,options,db,row) {
  const {ms}=await moveBalance(db,row);
  if(ms) {
    const stats=db.collection('mainstats');
    let contents;
    for(const id of [row.source,row.target]) {
      contents=await syncVipConfig(id,async()=>!!await stats.findOne({_id:id,vipEndDate:{$gt:new Date()}},{projection:{_id:1}}));
    }
    const guild=await client.guilds.fetch(options.discordServerId);
    const users=await stats.find({_id:{$in:[row.source,row.target]}},{projection:{discordid:1}}).toArray();
    for(const actor of new Set(users.map(u=>u.discordid))) await syncMember(guild,stats,actor,contents,options.vipRoleID);
    await stats.updateOne({_id:row.target,vipDeliveryPending:'review-'+row._id},{$unset:{vipDeliveryPending:''}});
  }
  await db.collection(collection).updateOne({_id:row._id,status:'moving'},{$set:{status:ms?'corrected':'expired',movedMs:ms,completedAt:new Date(),notify:true}});
}

export function createRecipientMonitor(client,uri,options) {
  const mongo=new MongoClient(uri,donationMongoOptions), db=mongo.db('SquadJS');
  let ready;
  return async()=>{
    ready ||= Promise.all([
      db.collection('donationLinkAudit').createIndex({selectedAt:1},{sparse:true}),
      db.collection('mainstats').createIndex({'vipReviewPending.id':1},{sparse:true}),
      db.collection(collection).createIndex({source:1,at:1}),
      db.collection(collection).createIndex({status:1}),
      db.collection(collection).createIndex({notify:1},{partialFilterExpression:{notify:true}}),
    ]).catch(e=>{ready=null;throw e;});
    await ready;
    await classifyReceipts(db);
    for(const row of await db.collection(collection).find({status:'moving'}).limit(20).toArray()) {
      try{await finishTransfer(client,options,db,row);}catch(e){console.warn('[DonatePay] transfer pending',row._id,e.message);}
    }
    for(const row of await db.collection(collection).find({notify:true}).limit(20).toArray()) {
      try{await notify(client,options,db,row);}catch(e){console.warn('[DonatePay] notification pending',row._id,e.code||e.name);}
    }
  };
}

export async function handleRecipientReview(i,options) {
  if(i.channelId!==String(options.vipLogChannelId)||i.guildId!==String(options.discordServerId)||
     (i.user.id!==String(options.vipAdminUserId)&&i.user.id!==i.guild?.ownerId)) {
    await i.reply({content:'Перенос доступен ответственному за VIP и владельцу сервера.',ephemeral:true});return;
  }
  await i.deferReply({ephemeral:true});
  const mongo=new MongoClient(process.env.DATABASE_URL,donationMongoOptions);
  try{
    const [,act,id,arg]=i.customId.split(':');
    if(!/^\d+$/.test(id)) return await i.editReply('Некорректный номер платежа.');
    const db=mongo.db('SquadJS'),cases=db.collection(collection),row=await cases.findOne({_id:id});
    if(!row || row.channelId!==i.channelId || (act==='open' && row.messageId!==i.message.id))
      return await i.editReply('Карточка ещё не готова или недоступна.');
    if(row.status!=='open') return await i.editReply(row.status==='corrected'?'Уже перенесено на '+row.target:row.status==='expired'?'Срок этого доната истёк.':'Перенос уже подтверждён.');
    if(act==='open'||act==='page'){
      const page=act==='open'?0:Number(arg), pages=Math.ceil(row.candidates.length/5);
      if(!Number.isInteger(page)||page<0||page>=pages) return await i.editReply('Страница недоступна.');
      const items=row.candidates.slice(5*page,5*page+5);
      const controls=[bar(...items.map((c,n)=>button('pick:'+id+':'+(5*page+n),c.steamId)))];
      const nav=[];if(page)nav.push(button('page:'+id+':'+(page-1),'Назад'));if(page+1<pages)nav.push(button('page:'+id+':'+(page+1),'Дальше'));
      if(nav.length)controls.push(bar(...nav));
      return await i.editReply({content:'Сверьте чек и выберите получателя:\n'+items.map(c=>'<@'+c.discordId+'> · '+c.steamId).join('\n'),components:controls,allowedMentions:mentions});
    }
    const candidate=/^\d+$/.test(arg||'') && row.candidates[Number(arg)];
    if(!candidate||!['pick','confirm'].includes(act)) return await i.editReply('Получатель не найден.');
    const stats=db.collection('mainstats');
    const bound=await stats.find({discordid:candidate.discordId},{projection:{_id:1}}).limit(2).toArray();
    if(bound.length!==1||bound[0]._id!==candidate.steamId) return await i.editReply('Привязка игрока изменилась. Проверьте SteamID.');
    const original=await stats.findOne({_id:row.source},{projection:{vipDonationIds:1,vipEndDate:1,vipDebits:1}});
    if(!original?.vipDonationIds?.includes(id)) return await i.editReply('Исходное начисление не найдено.');
    const ms=remainingSlice(row,original,new Date());
    if(!ms) return await i.editReply('У этого платежа не осталось времени VIP.');
    if(act==='pick') return await i.editReply({content:'Донат №'+id+' · '+row.amount+' ₽\nСнять остаток '+duration(ms)+' с '+row.source+' и перенести на '+candidate.steamId+'?',components:[bar(button('confirm:'+id+':'+arg,'Подтвердить перенос',ButtonStyle.Danger))]});
    const claimed=await cases.updateOne({_id:id,status:'open'},{$set:{status:'moving',admin:i.user.id,target:candidate.steamId,confirmedAt:new Date(),notify:true}});
    await i.editReply(claimed.modifiedCount?'Перенос подтверждён. Результат появится в канале донатов.':'Перенос уже подтверждён.');
  }catch(e){console.warn('[DonatePay] review',e.message);await i.editReply('Не удалось выполнить действие. Проверьте состояние карточки.');}
  finally{await mongo.close();}
}
