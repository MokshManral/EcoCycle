// Centralized API client. All paths/fields follow the shared contract; do not rename them silently.
const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');
export const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true';

export class ApiError extends Error {
  constructor(message, { status = 0, details = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function request(path, { method = 'GET', json, formData, signal } = {}) {
  const options = { method, signal, headers: { Accept: 'application/json' } };
  if (json !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(json);
  }
  // FormData: the browser sets the multipart boundary itself. Never set Content-Type manually.
  if (formData) options.body = formData;

  let res;
  try {
    res = await fetch(`${BASE}${path}`, options);
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError('Can’t reach the EcoCycle server. Check your connection and try again.');
  }

  let data = null;
  const text = await res.text();
  if (text) {
    try { data = JSON.parse(text); } catch { data = null; }
  }
  if (!res.ok) {
    const detail = data?.detail;
    const message =
      typeof detail === 'string' ? detail
      : Array.isArray(detail) ? detail.map((d) => d.msg).join(', ')
      : data?.message || `Request failed (${res.status}).`;
    throw new ApiError(message, { status: res.status, details: data });
  }
  return data;
}

const id = encodeURIComponent;

export const api = {
  health: (o) => request('/api/health', o),
  analyzeWaste: (file, o) => {
    const formData = new FormData();
    formData.append('file', file); // field name `file` is an assumption — confirm with backend owner
    return request('/api/waste/analyze', { method: 'POST', formData, ...o });
  },
  createPickup: (payload, o) => request('/api/pickup/request', { method: 'POST', json: payload, ...o }),
  listPickups: (o) => request('/api/pickup', o),
  getPickup: (pickupId, o) => request(`/api/pickup/${id(pickupId)}`, o),
  acceptPickup: (pickupId, o) => request(`/api/pickup/${id(pickupId)}/accept`, { method: 'PATCH', ...o }),
  verifyPickup: (pickupId, otp, o) => request(`/api/pickup/${id(pickupId)}/verify`, { method: 'POST', json: { otp }, ...o }),
  getPoints: (o) => request('/api/user/points', o),
  getImpact: (o) => request('/api/impact', o),
};
