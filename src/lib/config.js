// Data mode. Set in .env.local (see .env.example).
//  demo  = fake seed data in browser localStorage (default)
//  empty = no fake records; start clean and enter/import real data (still browser-local until a backend exists)
export const DATA_MODE = import.meta.env.VITE_DATA_MODE || 'empty'
export const IS_DEMO = DATA_MODE === 'demo'
// Real backend base URL. Not wired yet: api.js function bodies must be replaced with fetch() to this.
export const API_URL = import.meta.env.VITE_API_URL || ''
