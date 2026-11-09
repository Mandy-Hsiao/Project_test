'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'

export interface ProfileItem {
  id: string
  email: string
  em_name: string | null
  role: 'admin' | 'manager' | 'user' | 'resigned'
  department: string | null
  created_at: string
}

interface AdminUserManagementProps {
  isAdmin: boolean
  isManager: boolean
  currentDepartment: string
  initialMembers?: ProfileItem[]
}

const supabase = createClient()

export default function AdminUserManagement({
  initialMembers = [],
}: AdminUserManagementProps) {
  const infoDepartmentMembers = initialMembers.filter((member) => member.department === '資訊部')
  const [members, setMembers] = useState<ProfileItem[]>(infoDepartmentMembers)
  const [loading, setLoading] = useState<boolean>(infoDepartmentMembers.length === 0)

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    const query = supabase
      .from('profiles')
      .select('*')
      .eq('department', '資訊部')
      .order('created_at', { ascending: true })

    const { data, error } = await query
    if (!error && data) {
      setMembers(data as ProfileItem[])
    }
    setLoading(false)
  }, [])

  // 1. 若伺服器端未帶入資料，由前端客戶端補抓
  useEffect(() => {
    if (infoDepartmentMembers.length === 0) {
      // The initial empty state requires an immediate client-side refresh.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchMembers()
    }
  }, [fetchMembers, infoDepartmentMembers.length])

  return (
    <div className="admin-user-management space-y-6">
      {/* 頂部說明 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white">資訊部同仁名冊與在職狀態</h2>
        </div>

      </div>

      {/* 同仁清單表格 */}
      <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">資料讀取中...</div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">目前尚無同仁資料</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 uppercase text-[11px]">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">同仁姓名</th>
                  <th className="py-3.5 px-4 font-semibold">電子信箱 (帳號)</th>
                  <th className="py-3.5 px-4 font-semibold">所屬部門</th>
                  <th className="py-3.5 px-4 font-semibold">系統身分 / 在職狀態</th>
                  <th className="py-3.5 px-4 font-semibold text-center">狀態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {members.map((member) => (
                  <tr
                    key={member.id}
                    className={`hover:bg-slate-900/50 transition ${
                      member.role === 'resigned' ? 'opacity-60 bg-red-950/10' : ''
                    }`}
                  >
                    {/* 員工姓名 */}
                    <td className="py-3 px-4">
                      <span className="text-slate-200">{member.em_name || '未設定姓名'}</span>
                    </td>

                    {/* Email 帳號 */}
                    <td className="py-3 px-4 font-mono text-slate-400">{member.email}</td>

                    {/* 所屬部門 */}
                    <td className="py-3 px-4">
                      <span className="inline-block px-2.5 py-1 text-xs rounded border border-slate-700 bg-slate-800 text-slate-300">
                        {member.department || '一般部門'}
                      </span>
                    </td>

                    {/* 系統身分 */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block rounded px-2.5 py-1 text-xs font-medium border ${
                          member.role === 'admin'
                            ? 'bg-purple-900/30 text-purple-300 border-purple-700'
                            : member.role === 'manager'
                              ? 'bg-blue-900/30 text-blue-300 border-blue-700'
                              : member.role === 'resigned'
                                ? 'bg-red-900/30 text-red-300 border-red-700 font-bold'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {member.role === 'admin'
                          ? '最高管理員 (Admin)'
                          : member.role === 'manager'
                            ? '部門主管 (Manager)'
                            : member.role === 'resigned'
                              ? '🚫 已離職 (Resigned)'
                              : '一般同仁 (User)'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      {member.role === 'resigned' ? (
                        <span className="inline-block px-2 py-0.5 text-[10px] rounded bg-red-500/10 text-red-400 border border-red-500/20">
                          已停用
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 text-[10px] rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          在職中
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}