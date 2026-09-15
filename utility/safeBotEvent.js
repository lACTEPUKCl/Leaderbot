export function safeBotEvent(label, handler, logger = console) {
  return (...args) => Promise.resolve().then(() => handler(...args)).catch(error => {
    // Discord errors can contain interaction tokens in URLs/request bodies.
    logger.error(`[BOT] ${label} failed: ${error?.code || error?.name || 'Error'}`);
  });
}
