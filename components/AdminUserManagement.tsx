'use client'

import React, { useState, useEffect } from 'react'

interface User {
  id: string
  role: 'admin' | 'manager' | 'user'
  department: string
  created_at: string
}

interface RoleStats {
  admin: number
  manager: number
  user: number
}

export default function AdminUserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<RoleStats>({ admin: 0, manager: 0, user: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingRole, setEditingRole] = useState<'admin' | 'manager' | 'user'>('user')
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setError(null)
      console.log('[AdminUserManagement] Fetching users...')

      const res = await fetch('/api/admin/users')
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`)
      }

      console.log('[AdminUserManagement] Users loaded:', data)
      setUsers(data.users || [])
      setStats(data.roleStats || { admin: 0, manager: 0, user: 0 })
    } catch (err) {
      const errorMsg = String(err)
      console.error('[AdminUserManagement] Error:', errorMsg)
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'manager' | 'user') => {
    try {
      setActionError(null)
      console.log('[AdminUserManagement] Changing role for', userId, 'to', newRole)

      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newRole }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`)
      }

      const oldUser = users.find((u) => u.id === userId)
      if (oldUser) {
        setStats((prev) => ({
          ...prev,
          [oldUser.role]: Math.max(0, prev[oldUser.role] - 1),
          [newRole]: prev[newRole] + 1,
        }))
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
      )
      setEditingId(null)
    } catch (err) {
      const errorMsg = String(err)
      console.error('[AdminUserManagement] Change error:', errorMsg)
      setActionError(errorMsg)
    }
  }

  if (loading)
    return (
      <div className="text-slate-400 text-center py-8 bg-slate-800/40 rounded-lg border border-slate-700">
        ⏳ 載入用戶列表...
      </div>
    )

  if (error)
    return (
      <div className="text-center py-8 bg-red-900/20 border border-red-700 rounded-lg p-4">
        <div className="text-red-400 font-bold mb-2">⚠️ 無法載入用戶</div>
        <div className="text-red-300 text-sm">{error}</div>
        <div className="text-slate-400 text-xs mt-3">
          請確認您有管理員權限
        </div>
        <button
          onClick={fetchUsers}
          className="mt-3 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-200 transition"
        >
          重新載入
        </button>
      </div>
    )

  const roleColors: Record<string, string> = {
    admin: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    manager: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    user: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  }

  return (
    <div className="space-y-4">
      {/* 統計卡片 */}
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(stats).map(([role, count]) => (
          <div key={role} className="bg-slate-800/60 border border-slate-700 p-3 rounded-lg">
            <span className="text-xs text-slate-400 capitalize">{role}</span>
            <div className="text-xl font-bold text-white mt-1">{count}</div>
          </div>
        ))}
      </div>

      {/* 操作錯誤提示 */}
      {actionError && (
        <div className="bg-red-900/20 border border-red-700 p-3 rounded-lg">
          <div className="text-red-400 text-sm">⚠️ {actionError}</div>
        </div>
      )}

      {/* 用戶列表 */}
      {users.length === 0 ? (
        <div className="bg-slate-800/60 border border-slate-700 p-6 rounded-lg text-center text-slate-400">
          暫無用戶數據
        </div>
      ) : (
        <div className="bg-slate-800/60 border border-slate-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-900/80 border-b border-slate-700">
                <tr>
                  <th className="px-3 py-2 text-left text-slate-400">Email</th>
                  <th className="px-3 py-2 text-left text-slate-400">部門</th>
                  <th className="px-3 py-2 text-left text-slate-400">角色</th>
                  <th className="px-3 py-2 text-left text-slate-400">建立日期</th>
                  <th className="px-3 py-2 text-left text-slate-400">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-700/30 transition">
                    <td className="px-3 py-2 text-slate-300 truncate">{user.id}</td>
                    <td className="px-3 py-2 text-slate-400">{user.department || '未分配'}</td>
                    <td className="px-3 py-2">
                      {editingId === user.id ? (
                        <select
                          value={editingRole}
                          onChange={(e) =>
                            setEditingRole(e.target.value as 'admin' | 'manager' | 'user')
                          }
                          className="px-2 py-1 bg-slate-900 border border-slate-600 rounded text-slate-200 text-xs"
                        >
                          <option value="user">user</option>
                          <option value="manager">manager</option>
                          <option value="admin">admin</option>
                        </select>
                      ) : (
                        <span
                          className={`inline-block px-2 py-0.5 rounded border capitalize ${roleColors[user.role]}`}
                        >
                          {user.role}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-400 text-xs">
                      {new Date(user.created_at).toLocaleDateString('zh-TW')}
                    </td>
                    <td className="px-3 py-2 flex gap-1">
                      {editingId === user.id ? (
                        <>
                          <button
                            onClick={() => handleRoleChange(user.id, editingRole)}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 rounded text-xs text-white transition"
                          >
                            保存
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-2 py-1 bg-slate-600 hover:bg-slate-500 rounded text-xs text-white transition"
                          >
                            取消
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingId(user.id)
                            setEditingRole(user.role)
                            setActionError(null)
                          }}
                          className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-200 transition"
                        >
                          編輯
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
