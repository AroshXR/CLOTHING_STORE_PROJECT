export const productionStates = ['pending', 'in_progress', 'completed', 'delivered', 'cancelled'];
export const nextProductionState = { pending: 'in_progress', in_progress: 'completed', completed: 'delivered' };
const labels = { pending: 'Pending', in_progress: 'In progress', completed: 'Completed', delivered: 'Delivered', cancelled: 'Cancelled' };
const actions = { in_progress: 'Start production', completed: 'Mark completed', delivered: 'Mark delivered' };
export const productionLabel = (status, action = false) => (action ? actions[status] : labels[status]) || status || '—';
