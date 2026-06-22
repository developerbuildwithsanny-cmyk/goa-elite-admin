'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/app/lib/supabase'
import { useRouter } from 'next/navigation'
import { MessageCircle, Phone, Download, LogOut, RefreshCw, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Lead } from '@/app/types'

const STATUS_OPTIONS = [
  { value: 'new', label: 'New', color: 'bg-blue-900 text-blue-300' },
  { value: 'hot_lead', label: '🔥 Hot Lead', color: 'bg-green-900 text-green-300' },
  { value: 'time_waste', label: 'Time Waste', color: 'bg-gray-700 text-gray-300' },
  { value: 'dnp', label: 'DNP', color: 'bg-yellow-900 text-yellow-300' },
  { value: 'irrelevant', label: 'Irrelevant', color: 'bg-orange-900 text-orange-300' },
  { value: 'wrong_contact', label: 'Wrong Contact', color: 'bg-red-900 text-red-300' },
]

export default function AdminDashboard() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [serviceFilter, setServiceFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const router = useRouter()

  console.log('[AdminDashboard] Rendering component...')

  const fetchLeads = useCallback(async () => {
    console.log('[AdminDashboard] fetchLeads started')
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
      
      console.log('[AdminDashboard] fetchLeads completed', {
        success: !error,
        count: data?.length ?? 0,
        error: error,
      })
      if (!error) setLeads(data ?? [])
    } catch (err) {
      console.error('[AdminDashboard] fetchLeads exception:', err)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    console.log('[AdminDashboard] mounted, fetching leads & setting up realtime channel')
    fetchLeads()

    const channel = supabase
      .channel('leads_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads' }, (payload) => {
        console.log('[AdminDashboard] Realtime INSERT payload received:', payload)
        setLeads((prev) => [payload.new as Lead, ...prev])
      })
      .subscribe((status) => {
        console.log('[AdminDashboard] Realtime channel status:', status)
      })

    return () => {
      console.log('[AdminDashboard] cleanup, removing realtime channel')
      supabase.removeChannel(channel)
    }
  }, [fetchLeads])

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, serviceFilter, search])

  const filtered = leads.filter((l) => {
    if (statusFilter !== 'all' && l.status !== statusFilter) return false
    if (serviceFilter !== 'all' && l.service !== serviceFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!l.name.toLowerCase().includes(q) && !l.phone.includes(q)) return false
    }
    return true
  })

  const totalPages = Math.ceil(filtered.length / pageSize) || 1
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(currentPage * pageSize, filtered.length)
  const paginatedLeads = filtered.slice(startIndex, endIndex)

  // Ensure current page is within valid range
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const delta = 1
    const left = currentPage - delta
    const right = currentPage + delta

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= left && i <= right)) {
        pages.push(i)
      } else if (i === left - 1 || i === right + 1) {
        pages.push('...')
      }
    }

    const uniquePages: (number | string)[] = []
    pages.forEach((p) => {
      if (p !== '...' || uniquePages[uniquePages.length - 1] !== '...') {
        uniquePages.push(p)
      }
    })
    return uniquePages
  }

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('leads').update({ status }).eq('id', id)
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: status as Lead['status'] } : l)))
  }

  const exportCSV = () => {
    const headers = ['Name', 'Phone', 'Alt Phone', 'Service', 'Message', 'Status', 'Date']
    const rows = filtered.map((l) => [
      l.name, l.phone, l.alt_phone ?? '', l.service,
      (l.message ?? '').replace(/,/g, ';'), l.status,
      new Date(l.created_at).toLocaleDateString('en-IN'),
    ])
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `goa-leads-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const services = [...new Set(leads.map((l) => l.service))]

  const stats = {
    total: leads.length,
    hot: leads.filter((l) => l.status === 'hot_lead').length,
    today: leads.filter((l) => new Date(l.created_at).toDateString() === new Date().toDateString()).length,
    newCount: leads.filter((l) => l.status === 'new').length,
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="bg-[#111] border-b border-[#c9a84c]/20 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <h1 className="font-playfair text-xl font-bold text-[#c9a84c]">
          Goa Elite — Lead Dashboard
        </h1>
        <div className="flex items-center gap-3">
          <button onClick={fetchLeads} className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors">
            <RefreshCw size={15} /> Refresh
          </button>
          <button onClick={exportCSV} className="flex items-center gap-1.5 bg-[#c9a84c] text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#e8c97a] transition-colors">
            <Download size={15} /> Export CSV
          </button>
          <button onClick={logout} className="flex items-center gap-1.5 text-gray-400 hover:text-red-400 text-sm transition-colors">
            <LogOut size={15} /> Logout
          </button>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Leads', value: stats.total, color: 'text-white' },
            { label: '🔥 Hot Leads', value: stats.hot, color: 'text-green-400' },
            { label: 'New Today', value: stats.today, color: 'text-[#c9a84c]' },
            { label: 'Unworked', value: stats.newCount, color: 'text-blue-400' },
          ].map((s) => (
            <div key={s.label} className="bg-[#111] border border-white/10 rounded-xl p-5">
              <p className="text-gray-500 text-xs mb-1">{s.label}</p>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              id="admin-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or phone…"
              className="input-dark pl-9"
            />
          </div>
          <select
            id="admin-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="select-dark w-auto min-w-40"
          >
            <option value="all">All Status</option>
            {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select
            id="admin-service-filter"
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="select-dark w-auto min-w-40"
          >
            <option value="all">All Services</option>
            {services.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="bg-[#111] border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 text-xs">
                  <th className="text-left px-4 py-3 w-16">S.No.</th>
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Phone</th>
                  <th className="text-left px-4 py-3">Service</th>
                  <th className="text-left px-4 py-3 max-w-xs">Message</th>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-16 text-gray-500">Loading leads…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-16 text-gray-500">No leads found</td></tr>
                ) : paginatedLeads.map((lead, index) => (
                  <tr key={lead.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                      {startIndex + index + 1}
                    </td>
                    <td className="px-4 py-3 font-medium">{lead.name}</td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <a
                          href={`https://wa.me/91${lead.phone}?text=${encodeURIComponent(`Hello ${lead.name}, regarding your inquiry for ${lead.service} with Goa Elite Experience.`)}`}
                          target="_blank"
                          className="text-green-400 hover:text-green-300 flex items-center gap-1 text-xs font-medium"
                        >
                          <MessageCircle size={11} /> {lead.phone}
                        </a>
                        {lead.alt_phone && (
                          <a href={`tel:+91${lead.alt_phone}`} className="text-gray-400 hover:text-white flex items-center gap-1 text-xs">
                            <Phone size={10} /> {lead.alt_phone}
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#c9a84c] text-xs font-medium">{lead.service}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-xs">
                      <span title={lead.message ?? ''} className="truncate block max-w-[180px]">
                        {lead.message || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(lead.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={lead.status}
                        onChange={(e) => updateStatus(lead.id, e.target.value)}
                        className={`text-xs rounded-lg px-2 py-1.5 border-0 cursor-pointer font-medium
                          ${STATUS_OPTIONS.find((s) => s.value === lead.status)?.color ?? 'bg-gray-700 text-gray-300'}`}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value} className="bg-[#111] text-white">{s.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <a
                          href={`https://wa.me/91${lead.phone}?text=${encodeURIComponent(`Hello ${lead.name}, regarding your ${lead.service} inquiry with Goa Elite Experience.`)}`}
                          target="_blank"
                          className="bg-green-900 text-green-300 px-2.5 py-1 rounded text-xs hover:bg-green-800 transition-colors font-medium"
                        >
                          WA
                        </a>
                        <a
                          href={`tel:+91${lead.phone}`}
                          className="bg-blue-900 text-blue-300 px-2.5 py-1 rounded text-xs hover:bg-blue-800 transition-colors font-medium"
                        >
                          Call
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-white/10 bg-white/[0.01]">
            <div className="text-xs text-gray-400">
              Showing <span className="font-semibold text-white">{filtered.length > 0 ? startIndex + 1 : 0}</span> to{' '}
              <span className="font-semibold text-white">{endIndex}</span> of{' '}
              <span className="font-semibold text-[#c9a84c]">{filtered.length}</span> leads
              {leads.length !== filtered.length && (
                <span className="text-gray-500 font-normal"> (filtered from {leads.length})</span>
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/5 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>

                {getPageNumbers().map((pageNum, idx) =>
                  pageNum === '...' ? (
                    <span key={`dots-${idx}`} className="px-2 text-gray-500 text-sm">
                      ...
                    </span>
                  ) : (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(Number(pageNum))}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-200 ${
                        currentPage === pageNum
                          ? 'bg-[#c9a84c] border-[#c9a84c] text-black font-bold shadow-md shadow-[#c9a84c]/20'
                          : 'border-white/10 text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                )}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/5 transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Show:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="bg-transparent border border-white/10 text-white rounded-lg py-1.5 px-3 text-xs focus:border-[#c9a84c] outline-none cursor-pointer"
              >
                {[10, 20, 50, 100].map((size) => (
                  <option key={size} value={size} className="bg-[#111] text-white">
                    {size} leads
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
