import { useEffect, useMemo, useState } from 'react'
import { ArrowDownUp, Copy, ExternalLink, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Badge, IconButton } from './ui'
import { useApp } from '../context/AppContext'

function statusTone(status) {
  return status === 'Active' ? 'positive' : status === 'Expiring soon' ? 'warning' : status === 'Expired' || status === 'Disabled' ? 'muted' : 'neutral'
}

export default function LinkTable({ rows, compact = false, onDelete, sortMode = 'clicks' }) {
  const [menu, setMenu] = useState(null)
  const [page, setPage] = useState(1)
  const [sortDescending, setSortDescending] = useState(true)
  const { notify, updateLink, deleteLink } = useApp()
  const navigate = useNavigate()
  const sorted = useMemo(() => [...rows].sort((a, b) => {
    if (sortMode === 'newest') return new Date(b.created) - new Date(a.created)
    if (sortMode === 'alphabetical') return a.alias.localeCompare(b.alias)
    return sortDescending ? b.clicks - a.clicks : a.clicks - b.clicks
  }), [rows, sortDescending, sortMode])
  const visibleRows = compact ? sorted.slice(0, 5) : sorted.slice((page - 1) * 6, page * 6)
  useEffect(() => { setPage(1) }, [rows, sortMode])

  async function copyLink(url) {
    try { await navigator.clipboard.writeText(url); notify('Short link copied to clipboard.') }
    catch { notify(`Copy this link: ${url}`, 'error') }
  }
  async function toggleStatus(link) {
    try {
      const status = link.status === 'Disabled' ? 'Active' : 'Disabled'
      await updateLink(link.id, { status })
      notify(`Link ${status === 'Active' ? 'enabled' : 'disabled'}.`)
    } catch (error) { notify(error.message, 'error') }
    setMenu(null)
  }
  async function removeLink(link) {
    if (!window.confirm(`Disable "${link.alias}"? Historical analytics will be retained.`)) return
    try { await deleteLink(link.id); onDelete?.(link.id); notify('Link disabled. Historical analytics were retained.') }
    catch (error) { notify(error.message, 'error') }
    setMenu(null)
  }

  return <div className="table-scroll"><table className="data-table">
    <thead><tr><th>Short link</th><th>Destination</th><th><button className="th-sort" onClick={() => setSortDescending((value) => !value)}>Clicks <ArrowDownUp size={12} /></button></th><th>Status</th>{!compact && <th>Created</th>}<th aria-label="Actions" /></tr></thead>
    <tbody>{visibleRows.map((link) => <tr key={link.id}>
      <td><div className="link-cell"><span className="link-favicon"><ExternalLink size={14} /></span><div><Link to={`/app/links/${link.id}`} className="short-link">{link.shortUrl}</Link><small>{link.campaign}</small></div></div></td>
      <td><span className="destination" title={link.destination}>{link.destination}</span></td>
      <td><strong className="click-count">{link.clicks.toLocaleString()}</strong></td><td><Badge tone={statusTone(link.status)}>{link.status}</Badge></td>
      {!compact && <td className="muted-cell">{link.created}</td>}
      <td><div className="row-actions"><IconButton label={`Copy ${link.alias}`} onClick={() => copyLink(link.shortUrl)}><Copy size={15} /></IconButton><div className="row-menu-wrap"><IconButton label={`More actions for ${link.alias}`} onClick={() => setMenu(menu === link.id ? null : link.id)}><MoreHorizontal size={17} /></IconButton>{menu === link.id && <div className="row-menu"><button onClick={() => { navigate(`/app/links/${link.id}`); setMenu(null) }}><Pencil size={14} /> Edit link</button><button onClick={() => toggleStatus(link)}>{link.status === 'Disabled' ? 'Enable link' : 'Disable link'}</button><button className="danger-action" onClick={() => removeLink(link)}><Trash2 size={14} /> Delete link</button></div>}</div></div></td>
    </tr>)}</tbody>
  </table>{!compact && <div className="table-pagination"><span>Showing {sorted.length ? (page - 1) * 6 + 1 : 0}–{Math.min(page * 6, sorted.length)} of {sorted.length} links</span><div><IconButton label="Previous page" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>‹</IconButton><span className="page-number">{page}</span><IconButton label="Next page" disabled={page * 6 >= sorted.length} onClick={() => setPage((value) => value + 1)}>›</IconButton></div></div>}</div>
}
