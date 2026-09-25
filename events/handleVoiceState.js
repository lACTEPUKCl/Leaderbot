import fs from 'node:fs';
import path from 'node:path';

export function createTemporaryVoiceManager(client, options, {stateFile=path.resolve('transaction/temp-voice-channels.json'), logger=console, now=()=>Date.now()}={}) {
  const records=new Map(); const creating=new Set(); const deleting=new Set();
  if (fs.existsSync(stateFile)) {
    const saved=JSON.parse(fs.readFileSync(stateFile,'utf8'));
    if(saved.version!==1 || !Array.isArray(saved.channels)) throw new Error('Invalid temporary voice registry');
    for(const record of saved.channels) {
      if(record.kind!=='leaderbot-temp-v1' || !/^\d+$/.test(record.id) || !/^\d+$/.test(record.guildId)) throw new Error('Invalid temporary voice record');
      records.set(record.id,record);
    }
  }
  function save() {
    fs.mkdirSync(path.dirname(stateFile),{recursive:true});
    const temporary=stateFile+'.tmp';
    fs.writeFileSync(temporary,JSON.stringify({version:1,channels:[...records.values()]},null,2),{mode:0o600});
    fs.renameSync(temporary,stateFile);
  }
  async function cleanup(id) {
    const record=records.get(id);
    if(!record || deleting.has(id) || now()-record.createdAt<30000 || id===options.channelIdToCreateChannel) return;
    const guild=client.guilds.cache.get(record.guildId);
    if(!client.isReady() || !guild?.available) return;
    deleting.add(id);
    try {
      const channel=await guild.channels.fetch(id);
      if(!channel) {records.delete(id);save();return;}
      // A moved or permanent channel must never be swept by category alone.
      if(channel.type!==2 || channel.parentId!==record.parentId || channel.parentId!==options.categoryIdForCreateChannel) return;
      if(channel.members.size || guild.voiceStates.cache.some(state=>state.channelId===id)) return;
      await channel.delete('Empty Leaderbot temporary voice channel');
      records.delete(id);save();
    } catch(error) {
      if(error.code===10003) {records.delete(id);save();}
      else logger.error(`[voice] cleanup failed: ${error.code || error.name}`);
    } finally {deleting.delete(id);}
  }
  async function handle(oldState,newState) {
    if(oldState.channelId===newState.channelId) return;
    const memberKey=newState.guild.id+':'+newState.id;
    if(newState.channelId===options.channelIdToCreateChannel && !creating.has(memberKey)) {
      creating.add(memberKey);
      try {
        const overwrites=[{id:newState.guild.roles.everyone.id,deny:['ViewChannel']}];
        const squad=newState.guild.roles.cache.find(role=>role.name==='SQUAD');
        if(squad)overwrites.push({id:squad.id,deny:['ViewChannel']});
        overwrites.push({id:newState.id,allow:['ViewChannel','AddReactions','Stream','SendMessages','AttachFiles','Connect','Speak']});
        const channel=await newState.guild.channels.create({name:newState.member.displayName,type:2,parent:options.categoryIdForCreateChannel,permissionOverwrites:overwrites});
        records.set(channel.id,{kind:'leaderbot-temp-v1',id:channel.id,guildId:newState.guild.id,parentId:options.categoryIdForCreateChannel,createdAt:now()});
        save(); // Persist before moving: restart cannot orphan a channel.
        if(newState.member.voice.channelId===options.channelIdToCreateChannel) await newState.setChannel(channel);
      } catch(error) {logger.error(`[voice] create/move failed: ${error.code || error.name}`);}
      finally {creating.delete(memberKey);}
    }
    if(oldState.channelId)await cleanup(oldState.channelId);
  }
  async function sweep() {for(const id of [...records.keys()]) await cleanup(id);}
  let timer;
  return {handle,sweep,records,start(){if(!timer){timer=setInterval(()=>{void sweep().catch(error=>logger.error(`[voice] sweep failed: ${error.code || error.name}`));},30000);timer.unref?.();}},stop(){clearInterval(timer);timer=null;}};
}
