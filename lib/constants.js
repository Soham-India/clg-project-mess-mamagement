// Shared constants used by both the API (server) and the pages (browser).

export const MEALS = [
  { key: 'breakfast', label: 'Breakfast', start: '07:00', end: '09:00' },
  { key: 'lunch', label: 'Lunch', start: '12:00', end: '14:00' },
  { key: 'dinner', label: 'Dinner', start: '19:00', end: '21:00' },
];
export const MEAL_KEYS = MEALS.map((m) => m.key);
export const mealLabel = (key) => MEALS.find((m) => m.key === key)?.label ?? key;

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Default coupon settings. Stored in the settings table so the admin can change them.
export const DEFAULT_PRICES = { breakfast: 20, lunch: 55, dinner: 44 };
export const DEFAULT_MIN_DAYS = 4;

export const MESS_UNITS = [
  { code: 'FY', name: 'First-Year Mess', short: 'First-Year', gender: 'mixed', plan: 'fixed' },
  { code: 'MAIN-B', name: 'Main Mess (Boys)', short: 'Main · Boys', gender: 'M', plan: 'fixed' },
  { code: 'MAIN-G', name: 'Main Mess (Girls)', short: 'Main · Girls', gender: 'F', plan: 'fixed' },
  { code: 'CPN-B', name: 'Coupon Mess (Boys)', short: 'Coupon · Boys', gender: 'M', plan: 'coupon' },
  { code: 'CPN-G', name: 'Coupon Mess (Girls)', short: 'Coupon · Girls', gender: 'F', plan: 'coupon' },
];
export const unitName = (code) => MESS_UNITS.find((u) => u.code === code)?.name ?? code;

export const COMPLAINT_CATEGORIES = [
  { key: 'hygiene', label: 'Hygiene' },
  { key: 'quality', label: 'Food quality' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'staff', label: 'Staff behaviour' },
  { key: 'other', label: 'Other' },
];
export const COMPLAINT_STATUS = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  escalated: 'Escalated',
};

export const ROLE_LABEL = {
  student: 'Student',
  staff: 'Mess staff',
  society: 'Mess society',
  admin: 'Admin',
};

// Where each role lands after login.
export const ROLE_HOME = {
  student: '/home',
  staff: '/staff/screen',
  society: '/society',
  admin: '/admin/students',
};
