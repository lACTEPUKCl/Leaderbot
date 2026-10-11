export function isConnectTimeout(error) {
  return error?.code === 'UND_ERR_CONNECT_TIMEOUT' || error?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT';
}

export async function retryConnection(task, { attempts = 3, delay = ms => new Promise(resolve => setTimeout(resolve, ms)), logger = console } = {}) {
  for (let attempt = 1; ; attempt++) {
    try { return await task(); }
    catch (error) {
      // Only connection establishment failed: no request reached Discord.
      // Never retry a response timeout, which could duplicate a delivered message.
      if (!isConnectTimeout(error) || attempt >= attempts) throw error;
      logger.warn(`[Discord] connect timeout; retry ${attempt}/${attempts - 1}`);
      await delay(250 * attempt);
    }
  }
}
