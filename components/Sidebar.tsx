'use client'

import React from 'react'
import Link from 'next/link'

interface SidebarProps {
  userEmail?: string
  onSignOut: () => void
  isAdmin?: boolean
}

export default function Sidebar({ userEmail, onSignOut, isAdmin }: SidebarProps) {
  const popularPrompts = [
    '📌 差旅費報支規範與審核流程',
    '📌 特休與事病假扣薪標準',
    '📌 資訊資安與外接設備管理規章',
  ]

  const mockHistory = [
    { id: '1', title: '婚假天數與證明文件規定', time: '今天' },
    { id: '2', title: '採購合約審核流程', time: '昨天' },
    { id: '3', title: '遠端辦公 VPN 連線申請 SOP', time: '過去 7 天' },
  ]

  return (
    <aside className="w-72 bg-slate-900 text-slate-200 flex flex-col justify-between border-r border-slate-800 select-none">
      <div className="p-4 flex flex-col h-full overflow-hidden">
        <div className="flex items-center gap-2 mb-4 px-2">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-md">
            SOP
          </div>
          <div>
            <h1 className="font-semibold text-sm text-white tracking-wide">企業智能知識庫</h1>
            <p className="text-[11px] text-slate-400">RAG AI 檢索系統</p>
          </div>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition active:scale-[0.98]"
        >
          <span>+</span> 開啟新對話
        </button>

        <div className="mt-5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
            熱門 SOP 快捷引導
          </span>
          <div className="mt-2 space-y-1">
            {popularPrompts.map((prompt, idx) => (
              <button
                key={idx}
                className="w-full text-left truncate rounded-lg px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 flex-1 flex flex-col overflow-hidden">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">
            歷史提問紀錄
          </span>
          <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {mockHistory.map((item) => (
              <div
                key={item.id}
                className="group flex items-center justify-between rounded-lg px-2.5 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer transition"
              >
                <span className="truncate"> {item.title}</span>
                <span className="text-[10px] text-slate-400 group-hover:text-slate-300">
                  {item.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex flex-col gap-2">
        {isAdmin && (
          <Link
            href="/admin"
            className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-amber-300 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition shadow-sm"
          >
            <span className="flex items-center gap-2">
              <span>📊</span>
              <span>管理端數據分析後台</span>
            </span>
            <span className="text-[10px] bg-amber-500/30 text-amber-200 px-1.5 py-0.5 rounded font-mono">
              Admin
            </span>
          </Link>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 px-1">
          <div className="flex items-center gap-2 truncate max-w-[170px]">
            <div
              className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                isAdmin ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
              }`}
            >
              {isAdmin ? 'A' : 'U'}
            </div>
            <span className="text-xs text-slate-300 truncate">{userEmail || '使用者'}</span>
          </div>
          <button
            onClick={onSignOut}
            className="text-[11px] text-red-400 hover:text-red-300 font-medium px-2 py-1 rounded hover:bg-red-500/10 transition"
          >
            登出
          </button>
        </div>
      </div>
    </aside>
  )
}