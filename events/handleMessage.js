import getBansFromBattlemetrics from "../utility/getBansFromBattlemetrics.js";
import getDonate from "../utility/getDonate.js";

export async function handleMessageCreate(message, options, client) {
  if (message.author.bot) return;

  const {
    vipManualChannelId,
    allowedChannelId,
    allowedChannelId2,
    bansChannelId,
    memeChannelId,
  } = options;

  const allowedCommandChannels = [
    vipManualChannelId,
    allowedChannelId,
    allowedChannelId2,
  ];

  if (allowedCommandChannels.includes(message.channel.id)) {
    if (!message.interaction) {
      try {
        await message.delete();
      } catch (error) {
        console.error("Error deleting message:", error);
      }
    }
  }

  if (message.channelId === options.donateListChannelID) {
    await getDonate(
      process.env.DONATE_URL,
      client.channels.cache.get(options.donateListChannelID)
    );
  }

  if (bansChannelId.includes(message.channelId)) {
    await getBansFromBattlemetrics(message);
  }

  if (memeChannelId.includes(message.channelId)) {
    if (message.attachments.size > 0) {
      const isImage = message.attachments.every(
        (attachment) =>
          /\.(jpg|jpeg|png|gif|mp4|mov|avi)$/.test(attachment.url) ||
          /\.(jpg|jpeg|png|gif|mp4|mov|avi)(\?.*)?$/.test(attachment.url)
      );

      if (!isImage) {
        message.delete();
      }
    } else if (
      !/\.(jpg|jpeg|png|gif|mp4|mov|avi)$/.test(message.content) &&
      !/\.(jpg|jpeg|png|gif|mp4|mov|avi)(\?.*)?$/.test(message.content)
    ) {
      message.delete();
    }
  }
}
