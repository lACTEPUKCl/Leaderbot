// Seed invitations in Discord DMs are disabled by operator request.
// Keep scheduler/startup exports compatible. Target selection and bonus
// accrual belong to the site and SquadJS and are not changed here.
async function seedingServers() {}
async function endSeeding() {}
function startSeedingMonitor() {}

export { seedingServers, endSeeding, startSeedingMonitor };
