export function parsePagination(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20))
  return { page, limit, skip: (page - 1) * limit }
}

export function parseDateRange(query, maximumDays = 366) {
  const end = query.to ? new Date(query.to) : new Date()
  const start = query.from ? new Date(query.from) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return { error: 'Date range is invalid.' }
  }
  if ((end - start) / 86_400_000 > maximumDays) return { error: `Date range may not exceed ${maximumDays} days.` }
  return { start, end }
}
