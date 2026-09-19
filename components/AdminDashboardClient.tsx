'use client'

import React, { useState } from 'react'
import AnalyticsPanel from '@/components/AnalyticsPanel'
import AdminUserManagement from '@/components/AdminUserManagement'
import ManagerReviewCenter from '@/components/ManagerReviewCenter'
import AdminDocumentRepository from '@/components/AdminDocumentRepository'
import Link from 'next/link'

interface AdminDashboardClientProps {
  user: { id?: string; email?: string }
  isAdmin: boolean
  isManager?: boolean
  department: string
  userRole: 'admin' | 'manager' | 'user'
  employeeName?: string
  initialMembers?: any[] // 接收伺服器端傳來的同仁名單
}

export default function AdminDashboardClient({
  user,
  isAdmin,
  isManager = false,
  department,
  userRole,
  employeeName = '',
  initialMembers = [],
}: AdminDashboardClientProps) {
  // 依身分決定預設呈現的分頁
  const [activeTab, setActiveTab] = useState<'global' | 'department' | 'personal' | 'users' | 'review'>(
    isAdmin ? 'global' : isManager ? 'department' : 'personal',
  )

  // 角色分級頁籤：整合數據分析、同仁名單與 SOP 審核中心
  const tabs: Array<{
    id: 'global' | 'department' | 'personal' | 'users' | 'review'
    label: string
    visible: boolean
  }> = [
    { id: 'global', label: '全域數據', visible: isAdmin },
    { id: 'department', label: '部門分析', visible: isManager },
    { id: 'personal', label: '個人歷史', visible: true },
    {
      id: 'users',
      label: isAdmin ? '全域用戶管理' : '部門同仁名單',
      visible: isAdmin || isManager,
    },
    // 主管與管理員專屬的知識庫文件審核/原文件庫分頁
    {
      id: 'review',
      label: isAdmin ? ' 知識庫原文件庫' : ' 部門 SOP 審核中心',
      visible: isAdmin || isManager,
    },
  ]

  const visibleTabs = tabs.filter((t) => t.visible)

  const roleLabel = isAdmin ? '最高管理員' : isManager ? '部門主管' : '一般同仁'

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* 頂部導航 */}
      <header className="h-14 border-b border-slate-800 bg-slate-950 px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-xl">📊</div>
          <div>
            <h1 className="text-sm font-bold text-white">
              {isAdmin
                ? 'SOP 知識庫全域監控'
                : isManager
                  ? `【${department}】部門數據分析`
                  : '我的提問歷史後台'}
            </h1>
            <p className="text-xs text-slate-400">
              {roleLabel}視圖 {employeeName ? `· ${employeeName}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-400">{user.email}</span>
          <Link
            href="/"
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition text-slate-200"
          >
            ← 返回對話
          </Link>
        </div>
      </header>

      {/* Tab 導航列 */}
      <div className="border-b border-slate-800 bg-slate-900 px-6">
        <div className="flex gap-1 overflow-x-auto">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium transition border-b-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 內容區域 */}
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
        {activeTab === 'users' ? (
          <AdminUserManagement
            isAdmin={isAdmin}
            isManager={isManager}
            currentDepartment={department}
            initialMembers={initialMembers}
          />
        ) : activeTab === 'review' ? (
          /* 判斷：總管理員渲染全公司原文件庫；部門主管渲染審核中心 */
          isAdmin ? (
            <AdminDocumentRepository adminId={user.id || ''} />
          ) : (
            <ManagerReviewCenter
              managerDepartment={department}
              managerId={user.id || ''}
              managerRole={userRole}
            />
          )
        ) : (
          <AnalyticsPanel
            scope={activeTab as 'global' | 'department' | 'personal'}
            department={activeTab === 'department' ? department : undefined}
            userRole={userRole}
          />
        )}
      </main>
    </div>
  )
}