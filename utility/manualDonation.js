import { randomUUID } from 'node:crypto';
import { MongoClient } from 'mongodb';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { donationCandidates, claimManualGrant, isSuccessfulDonation } from './donationCandidates.js';
import creater from './vip-creater.js';

const prefix='donationgrant:';
const button=(id,label,style=ButtonStyle.Secondary)=>new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style);
export async function prepareManualDonation(dbUrl,payment,history) {
  if (!isSuccessfulDonation(payment)) return null;
  const client=new MongoClient(dbUrl);
  try {
    await client.connect();const db=client.db('SquadJS');
    const candidates=await donationCandidates(db,payment,history);
    const row={_id:randomUUID(),transactionId:String(payment.id),amount:Number(payment.sum),name:String(payment.what||''),createdAt:new Date(),paymentAt:payment.created_at,candidates,status:'pending'};
    if (!(row.amount>0) || !Number.isFinite(row.amount) || (payment.currency && !['RUB','RUR','₽'].includes(payment.currency.toUpperCase()))) return null;
    await db.collection('donationManualGrants').insertOne(row);
    return {row,fields:[{name:'Возможные донатеры — совпадение не подтверждено',value:candidates.length?candidates.map((c,i)=>`${i+1}. ${c.discordId?`<@${c.discordId}>`:'Discord не найден'} · \`${c.steamId}\`\n${c.reason}`).join('\n').slice(0,1024):'Кандидатов нет. SteamID можно указать вручную.'}],components:[new ActionRowBuilder().addComponents(button(prefix+'open:'+row._id,'Выдать VIP',ButtonStyle.Success))]};
  } finally {await client.close();}
}
export async function bindManualNotification(dbUrl,id,message) {
  const client=new MongoClient(dbUrl);try {await client.connect();await client.db('SquadJS').collection('donationManualGrants').updateOne({_id:id},{$set:{channelId:message.channelId,messageId:message.id,guildId:message.guildId}});}finally{await client.close();}
}
export async function handleManualDonation(interaction,dbUrl,options) {
  if (!interaction.customId?.startsWith(prefix)) return false;
  const [,action,id,value]=interaction.customId.split(':');
  if (!['open','manual','choose','input','confirm'].includes(action) || !/^[0-9a-f-]{36}$/.test(id||'')) {await interaction.reply({content:'Кнопка доната недействительна.',ephemeral:true});return true;}
  if (interaction.user.id!==String(options.vipAdminUserId) && interaction.user.id!==interaction.guild?.ownerId) {await interaction.reply({content:'Выдача по донату доступна ответственному за VIP и владельцу сервера Discord.',ephemeral:true});return true;}
    if (action==='manual') {
      const modal=new ModalBuilder().setCustomId(`${prefix}input:${id}`).setTitle('Получатель VIP');modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('steamid').setLabel('SteamID64').setStyle(TextInputStyle.Short).setRequired(true).setMinLength(17).setMaxLength(17)));await interaction.showModal(modal);return true;
    }
  await interaction.deferReply({ephemeral:true});
  const respond=payload=>interaction.editReply(payload);
  const client=new MongoClient(dbUrl);let col,row;
  try {
    await client.connect();col=client.db('SquadJS').collection('donationManualGrants');row=await col.findOne({_id:id});
    if (!row || row.guildId!==interaction.guildId || row.channelId!==interaction.channelId || (action==='open' && row.messageId!==interaction.message?.id)) {await respond({content:'Запись доната не найдена или сообщение ещё не готово. Повторите позже.',ephemeral:true});return true;}
    if (row.status!=='pending') {await respond({content:row.status==='issued'?`VIP уже выдан на SteamID ${row.selectedSteamId}.`:'Выдача уже запущена или требует проверки. Повторное начисление заблокировано.',ephemeral:true});return true;}
    if (action==='open') {
      const buttons=row.candidates.map((c,i)=>button(`${prefix}choose:${id}:${i}`,`Получатель ${i+1}`));buttons.push(button(`${prefix}manual:${id}`,'Указать SteamID'));
      const components=[];for(let i=0;i<buttons.length;i+=5) components.push(new ActionRowBuilder().addComponents(buttons.slice(i,i+5)));
      const details=row.candidates.map((c,i)=>`${i+1}. ${c.discordId?`<@${c.discordId}>`:'Discord не найден'} · ${c.steamId}\n${c.reason}`).join('\n');
      await respond({content:`Донат №${row.transactionId}, ${row.amount} ₽. Выберите получателя или укажите SteamID. Совпадения предположительные.\n${details}`.slice(0,2000),components,allowedMentions:{parse:[]},ephemeral:true});return true;
    }
    const steamId=action==='choose'?row.candidates[Number(value)]?.steamId:action==='input'?interaction.fields.getTextInputValue('steamid').trim():value;
    if (!/^7656119\d{10}$/.test(steamId||'')) {await respond({content:'Укажите корректный SteamID64.',ephemeral:true});return true;}
    if (action==='choose' || action==='input') {
      await respond({content:`Подтвердить выдачу по донату №${row.transactionId}: **${row.amount} ₽**, SteamID **${steamId}**, срок **${(row.amount/9.863).toFixed(2)} дня**?`,components:[new ActionRowBuilder().addComponents(button(`${prefix}confirm:${id}:${steamId}`,'Подтвердить выдачу VIP',ButtonStyle.Success))],ephemeral:true});return true;
    }
    if (action!=='confirm') return true;
    const claimed=await claimManualGrant(col,id,interaction.user.id,steamId);
    if (!claimed) {await interaction.editReply('Донат уже обрабатывается. Повторное начисление заблокировано.');return true;}
    try {
      const result=await creater.vipCreater(steamId,row.name,row.amount);
      await col.updateOne({_id:id,status:'issuing'},{$set:{status:'issued',issuedAt:new Date(),vipEndDate:result.newVipEndDate}});
      let roleWarning='';
      try {const user=await client.db('SquadJS').collection('mainstats').findOne({_id:steamId},{projection:{discordid:1}});
      if (user?.discordid) {const member=await interaction.guild.members.fetch(user.discordid);const role=interaction.guild.roles.cache.find(r=>r.name==='VIP');if(role)await member.roles.add(role);else roleWarning=' Роль VIP в Discord не найдена; доступ VIP начислен.';}}catch{roleWarning=' Роль Discord не выдана; доступ VIP начислен.';}
      await interaction.editReply(`VIP выдан: ${steamId}, до ${result.newVipEndDate.toLocaleDateString('ru-RU')}.${roleWarning}`);
      try {const message=await interaction.channel.messages.fetch(row.messageId);await message.edit({components:[],embeds:message.embeds});await message.reply({content:`Донат №${row.transactionId}: <@${interaction.user.id}> выдал VIP на SteamID \`${steamId}\`, до ${result.newVipEndDate.toLocaleDateString('ru-RU')}.${roleWarning}`,allowedMentions:{parse:[]}});}catch{console.error('[manualDonation] grant completed; notification update failed');}
    } catch {
      await col.updateOne({_id:id,status:'issuing'},{$set:{status:'needs-review',failedAt:new Date()}});
      await interaction.editReply('Выдача не завершена. Возможно, срок уже начислен, но синхронизация не прошла. Повторное начисление заблокировано — нужна проверка.');
    }
    return true;
  } catch(e) {console.error('[manualDonation]',e.name);const payload={content:'Не удалось обработать донат. Проверьте журнал бота.',ephemeral:true};if(interaction.deferred||interaction.replied)await interaction.editReply(payload).catch(()=>{});else await respond(payload).catch(()=>{});return true;}finally {await client.close();}
}
