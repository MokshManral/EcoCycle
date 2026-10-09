import { api, USE_MOCK } from './api';
import { mockAnalyze } from '../mock/waste';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export const wasteService = {
  async analyze(file) {
    if (USE_MOCK) { await delay(1600); return mockAnalyze(file); }
    return api.analyzeWaste(file);
  },
  health: () => (USE_MOCK ? Promise.resolve({ status: 'mock' }) : api.health()),
};
