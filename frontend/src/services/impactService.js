import { api, USE_MOCK } from './api';
import { mockPickups } from '../mock/pickups';

export const impactService = {
  points: () => (USE_MOCK ? mockPickups.points() : api.getPoints()),
  impact: () => (USE_MOCK ? mockPickups.impact() : api.getImpact()),
};
