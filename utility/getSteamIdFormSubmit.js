import getSteamIdModal from './getSteamIdModal.js';

// Redirect already-open legacy forms to the verified Steam linking flow.
export default async function steamIdFormSubmit(interaction) {
  return getSteamIdModal(interaction);
}
