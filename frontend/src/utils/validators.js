import { UPLOAD_RULES } from './constants';

export function validateImage(file) {
  if (!file) return 'Choose an image to analyze.';
  if (!UPLOAD_RULES.types.includes(file.type)) return `That file type isn’t supported. Use ${UPLOAD_RULES.hint}.`;
  if (file.size > UPLOAD_RULES.maxBytes) return 'That image is larger than 5 MB. Choose a smaller photo.';
  if (file.size === 0) return 'That file is empty. Choose another image.';
  return null;
}

export function validatePickup(v) {
  const e = {};
  if (!v.waste_item.trim()) e.waste_item = 'Describe the waste item.';
  if (!v.category) e.category = 'Select a waste category.';
  const q = Number(v.quantity);
  if (!Number.isInteger(q) || q < 1) e.quantity = 'Enter a whole number of 1 or more.';
  if (v.address.trim().length < 8) e.address = 'Enter an address or a location description (at least 8 characters).';
  if (v.preferred_date && v.preferred_date < new Date().toISOString().slice(0, 10)) e.preferred_date = 'Choose today or a later date.';
  return e;
}

export const validateOtp = (otp) => (/^\d{6}$/.test(otp) ? null : 'Enter the 6-digit code.');
