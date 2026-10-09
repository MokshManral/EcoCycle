import { api, USE_MOCK } from './api';
import { mockPickups } from '../mock/pickups';

// `viewer` only matters in mock mode (to hide the OTP from collectors).
// In production the backend alone decides who may see the OTP.
export const pickupService = {
  list: (viewer) => (USE_MOCK ? mockPickups.list(viewer) : api.listPickups()),
  get: (id, viewer) => (USE_MOCK ? mockPickups.get(id, viewer) : api.getPickup(id)),
  create: (payload) => (USE_MOCK ? mockPickups.create(payload) : api.createPickup(payload)),
  accept: (id) => (USE_MOCK ? mockPickups.accept(id) : api.acceptPickup(id)),
  verify: (id, otp) => (USE_MOCK ? mockPickups.verify(id, otp) : api.verifyPickup(id, otp)),
};
