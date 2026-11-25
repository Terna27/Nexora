'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { cryptiqApi } from '@cryptiq/api-client';
import { AdminUserSummary } from '@cryptiq/types';
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Shield,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Eye,
} from 'lucide-react';

export default function AdminUserDirectoryPage() {
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [verifiedFilter, setVerifiedFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: {
        page: number;
        pageSize: number;
        search?: string;
        role?: string;
        isActive?: boolean;
        isVerified?: boolean;
      } = { page, pageSize };

      if (search.trim()) params.search = search.trim();
      if (roleFilter) params.role = roleFilter;
      if (activeFilter === 'active') params.isActive = true;
      if (activeFilter === 'inactive') params.isActive = false;
      if (verifiedFilter === 'verified') params.isVerified = true;
      if (verifiedFilter === 'unverified') params.isVerified = false;

      const res = await cryptiqApi.getAdminUsers(params);
      setUsers(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error('Failed to fetch admin users:', err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, roleFilter, activeFilter, verifiedFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">User Directory</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Authoritative identity records, verification status, and subledger linkage.
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-[#0D1117] border border-zinc-800 rounded-2xl p-4 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by full name or email address..."
              className="w-full pl-10 pr-4 py-2 bg-[#090C10] border border-zinc-800 focus:border-amber-500 rounded-xl text-xs text-white placeholder-zinc-500 outline-none transition"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold rounded-xl transition"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-zinc-800/60 text-xs">
          <div className="flex items-center gap-1.5 text-zinc-400 mr-2">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="bg-[#090C10] border border-zinc-800 text-zinc-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-amber-500"
          >
            <option value="">All Roles</option>
            <option value="investor">Investor</option>
            <option value="admin">Staff Admin</option>
            <option value="auditor">Auditor</option>
          </select>

          {/* Active Filter */}
          <select
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value);
              setPage(1);
            }}
            className="bg-[#090C10] border border-zinc-800 text-zinc-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-amber-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          {/* Verification Filter */}
          <select
            value={verifiedFilter}
            onChange={(e) => {
              setVerifiedFilter(e.target.value);
              setPage(1);
            }}
            className="bg-[#090C10] border border-zinc-800 text-zinc-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-amber-500"
          >
            <option value="all">All Verification</option>
            <option value="verified">Verified Only</option>
            <option value="unverified">Unverified Only</option>
          </select>

          {(search || roleFilter || activeFilter !== 'all' || verifiedFilter !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setSearchInput('');
                setRoleFilter('');
                setActiveFilter('all');
                setVerifiedFilter('all');
                setPage(1);
              }}
              className="text-xs text-amber-400 hover:text-amber-300 underline ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#0D1117] border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 text-center space-y-2">
            <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto" />
            <p className="text-xs font-mono text-zinc-400">Loading user directory...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Users className="w-10 h-10 text-zinc-600 mx-auto" />
            <h3 className="text-sm font-semibold text-white">No Users Found</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              No matching user records were returned for the selected filter and query parameters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#090C10] text-[11px] font-mono uppercase text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4 font-medium">User / Identity</th>
                  <th className="py-3 px-4 font-medium">Role</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium">Verification</th>
                  <th className="py-3 px-4 font-medium">Registered</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-800/30 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-white">{u.fullName}</div>
                      <div className="text-[11px] font-mono text-zinc-400">{u.email}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          u.role === 'admin'
                            ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                            : u.role === 'auditor'
                            ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-300'
                            : 'bg-zinc-800 border border-zinc-700 text-zinc-300'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500 font-medium">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Suspended</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {u.isVerified ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-cyan-400 font-medium">
                          <Shield className="w-3.5 h-3.5" />
                          <span>Verified</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-amber-400/80 font-mono">
                          Unverified
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-400 font-mono text-[11px]">
                      {new Date(u.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-400 text-[11px] font-medium transition"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="bg-[#090C10] border-t border-zinc-800 px-4 py-3 flex items-center justify-between text-xs text-zinc-400">
          <div>
            Showing <span className="font-semibold text-white">{users.length}</span> of{' '}
            <span className="font-semibold text-white">{total}</span> records
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-transparent transition text-zinc-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs px-2">
              Page {page} of {Math.max(1, totalPages)}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="p-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-transparent transition text-zinc-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
