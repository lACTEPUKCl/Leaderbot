export async function handleVoiceStateUpdate(
  oldState,
  newState,
  userVoiceChannels,
  options
) {
  const { channelIdToCreateChannel, categoryIdForCreateChannel } = options;

  if (
    newState.channelId === channelIdToCreateChannel &&
    !userVoiceChannels.has(newState.channelId)
  ) {
    try {
      const channel = await newState.guild.channels.create({
        name: newState.member.displayName,
        type: 2,
        parent: categoryIdForCreateChannel,
      });
      userVoiceChannels.set(channel.id, channel);
      await newState.setChannel(channel);

      const everyoneRole = newState.guild.roles.everyone;
      await channel.permissionOverwrites.create(everyoneRole, {
        ViewChannel: false,
      });

      const squadRole = newState.guild.roles.cache.find(
        (role) => role.name === "SQUAD"
      );
      if (squadRole) {
        await channel.permissionOverwrites.create(squadRole, {
          ViewChannel: false,
        });
      }

      await channel.permissionOverwrites.create(newState.member, {
        ViewChannel: true,
        AddReactions: true,
        Stream: true,
        SendMessages: true,
        AttachFiles: true,
        Connect: true,
        Speak: true,
      });
    } catch (error) {
      console.error("Error creating channel or setting permissions:", error);
    }
  }

  if (
    oldState.channelId &&
    userVoiceChannels.has(oldState.channelId) &&
    oldState.channel.members.size === 0
  ) {
    try {
      const channel = userVoiceChannels.get(oldState.channelId);
      await channel.delete();
      userVoiceChannels.delete(oldState.channelId);
    } catch (error) {
      console.error("Error deleting channel:", error);
    }
  }
}
