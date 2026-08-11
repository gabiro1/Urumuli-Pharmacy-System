export function parsePagination(query, options = {}) {
  const {
    allowedSortColumns = ['created_at'],
    defaultSortBy = 'created_at',
    defaultSortOrder = 'DESC',
  } = options;
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const offset = (page - 1) * limit;
  const requestedSortBy = query.sortBy || defaultSortBy;
  const sortBy = allowedSortColumns.includes(requestedSortBy) ? requestedSortBy : defaultSortBy;
  const requestedSortOrder = String(query.sortOrder || defaultSortOrder).toUpperCase();
  const sortOrder = requestedSortOrder === 'ASC' ? 'ASC' : 'DESC';
  return { page, limit, offset, sortBy, sortOrder };
}

export function parseCursorPagination(query, options = {}) {
  const {
    defaultSortBy: _defaultSortBy,
    defaultSortOrder = 'DESC',
  } = options;
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const cursor = query.cursor || null;
  const direction = String(query.direction || defaultSortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  return { limit, cursor, direction };
}

export function buildPaginationMeta(total, page, limit) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export function buildCursorPaginationMeta(rows, limit, hasMore) {
  const lastRow = rows[rows.length - 1];
  return {
    limit,
    nextCursor: hasMore ? lastRow?.id || lastRow?.created_at || null : null,
    hasMore,
  };
}
