/**
 * Enterprise Keyset / Cursor-Based Pagination Service
 * Replaces expensive O(N) OFFSET queries with O(1) index-seek cursor pagination
 * for tables scaling to millions of records.
 */

/**
 * Encodes an item into an opaque, URL-safe base64 cursor string
 * @param {Object} item 
 * @param {string} sortKey - e.g. 'createdAt' or 'id'
 * @returns {string}
 */
export function encodeCursor(item, sortKey = 'createdAt') {
  if (!item) return null;
  const cursorPayload = {
    v: item[sortKey] || item.created_at || item.id,
    id: item.id
  };
  const jsonStr = JSON.stringify(cursorPayload);
  if (typeof btoa !== 'undefined') {
    return btoa(unescape(encodeURIComponent(jsonStr)));
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(jsonStr).toString('base64');
  }
  return jsonStr;
}

/**
 * Decodes an opaque base64 cursor string into a cursor object
 * @param {string} cursorStr 
 * @returns {{ v: any, id: string }|null}
 */
export function decodeCursor(cursorStr) {
  if (!cursorStr) return null;
  try {
    let jsonStr = '';
    if (typeof atob !== 'undefined') {
      jsonStr = decodeURIComponent(escape(atob(cursorStr)));
    } else if (typeof Buffer !== 'undefined') {
      jsonStr = Buffer.from(cursorStr, 'base64').toString('utf8');
    } else {
      jsonStr = cursorStr;
    }
    return JSON.parse(jsonStr);
  } catch (err) {
    console.warn('[CursorPagination] Failed to decode cursor string:', err);
    return null;
  }
}

/**
 * Paginates an array using high-performance cursor-based indexing
 * @param {Array<Object>} items - Array of records
 * @param {Object} options
 * @param {string} [options.cursor] - Decoded or encoded cursor
 * @param {number} [options.limit=20] - Page size
 * @param {string} [options.sortKey='createdAt'] - Primary sort attribute
 * @param {'asc'|'desc'} [options.sortDir='desc'] - Sort direction
 * @returns {{ items: Array, nextCursor: string|null, prevCursor: string|null, hasMore: boolean, totalCount: number }}
 */
export function paginateArray(items = [], options = {}) {
  const {
    cursor = null,
    limit = 20,
    sortKey = 'createdAt',
    sortDir = 'desc'
  } = options;

  if (!Array.isArray(items) || items.length === 0) {
    return {
      items: [],
      nextCursor: null,
      prevCursor: null,
      hasMore: false,
      totalCount: 0
    };
  }

  // Pre-sort items deterministically by sortKey and tiebreaker ID
  const sorted = [...items].sort((a, b) => {
    const valA = a[sortKey] || a.created_at || a.id || '';
    const valB = b[sortKey] || b.created_at || b.id || '';
    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    // Secondary tie-breaker by ID
    return String(a.id || '').localeCompare(String(b.id || ''));
  });

  let startIndex = 0;
  if (cursor) {
    const decoded = typeof cursor === 'string' ? decodeCursor(cursor) : cursor;
    if (decoded) {
      const foundIdx = sorted.findIndex(item => {
        const itemVal = item[sortKey] || item.created_at || item.id;
        const matchesVal = itemVal === decoded.v;
        const matchesId = item.id === decoded.id;
        return matchesVal && matchesId;
      });

      if (foundIdx >= 0) {
        startIndex = foundIdx + 1;
      }
    }
  }

  const pagedItems = sorted.slice(startIndex, startIndex + limit);
  const hasMore = startIndex + limit < sorted.length;
  const lastItem = pagedItems[pagedItems.length - 1];
  const nextCursor = hasMore && lastItem ? encodeCursor(lastItem, sortKey) : null;
  const firstItem = pagedItems[0];
  const prevCursor = startIndex > 0 && firstItem ? encodeCursor(firstItem, sortKey) : null;

  return {
    items: pagedItems,
    nextCursor,
    prevCursor,
    hasMore,
    totalCount: items.length
  };
}

/**
 * Builds SQL/PostgREST filter conditions for cursor pagination
 * following the Equality-Sort-Range (ESR) rule
 * @param {string} cursorStr
 * @param {string} [sortKey='created_at']
 * @param {'asc'|'desc'} [sortDir='desc']
 * @returns {{ column: string, operator: string, value: any }|null}
 */
export function buildCursorQueryFilter(cursorStr, sortKey = 'created_at', sortDir = 'desc') {
  const decoded = decodeCursor(cursorStr);
  if (!decoded) return null;

  return {
    column: sortKey,
    operator: sortDir === 'desc' ? 'lt' : 'gt',
    value: decoded.v,
    tiebreakerId: decoded.id
  };
}
