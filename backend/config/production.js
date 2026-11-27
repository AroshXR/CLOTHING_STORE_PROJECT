const statuses = ['pending', 'in_progress', 'completed', 'delivered', 'cancelled'];
// Existing orders awaiting production remain actionable without a data migration.
const pendingStatuses = ['pending', 'assigned', 'accepted'];
const normalizeStatus = status => pendingStatuses.includes(status) ? 'pending' : status;
const nextStates = { pending: ['in_progress'], in_progress: ['completed'], completed: ['delivered'] };

module.exports = { statuses, pendingStatuses, normalizeStatus, nextStates };
