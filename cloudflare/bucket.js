export const bucketOf = (id, n) => { let h = 2166136261; for (const ch of id) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h % n; };
