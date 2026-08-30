'use client'

import React from 'react'
import Link from 'next/link'

export interface HistoryItem {
  id: string
  question: string
  created_at: string
}

interface SidebarProps {
  userEmail?: string
  onSignOut: () => void
  isAdmin?: boolean
  history: HistoryItem[]
  activeHistoryId?: string | null
  onSelectHistory: (item: HistoryItem) => void
  onNewChat: () => void
}

export default function Sidebar({
  userEmail,
  onSignOut,
  isAdmin,
  history,
  activeHistoryId,
  onSelectHistory,
  onNewChat,
}: SidebarProps) {
  // 格式化時間（例如：今天 14:30 或 08/30）
  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      const now = new Date()
      if (d.toDateString() === now.toDateString()) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      return `${d.getMonth() + 1}/${d.getDate()}`
    } catch {
      return ''
    }
  }

  return (
    <aside className="w-72 bg-slate-900 text-slate-200 flex flex-col justify-between border-r border-slate-800 select-none">
      {/* 上半部：Logo 與歷史清單 */}
      <div className="p-4 flex flex-col h-full overflow-hidden">
        {/* 系統標題 */}
        <div className="flex items-center gap-2 mb-4 px-2">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-md">
            SOP
          </div>
          <div>
            <h1 className="font-semibold text-sm text-white tracking-wide">企業智能知識庫</h1>
            <p className="text-[11px] text-slate-400">RAG AI 檢索系統</p>
          </div>
        </div>

        {/* 開啟新對話按鈕 */}
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition active:scale-[0.98]"
        >
          <span>+</span> 開啟新對話
        </button>

        {/* 歷史提問紀錄清單 */}
        <div className="mt-5 flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              提問歷史紀錄
            </span>
            <span className="text-[10px] text-slate-500">{history.length} 則</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {history.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-500">
                尚無提問紀錄<br />
                <span className="text-[10px] text-slate-600">在右側發問後將自動儲存</span>
              </div>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectHistory(item)}
                  className={`group flex items-center justify-between rounded-lg px-2.5 py-2.5 text-xs cursor-pointer transition ${
                    activeHistoryId === item.id
                      ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 font-medium'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="truncate pr-2">💬 {item.question}</span>
                  <span className="text-[10px] text-slate-500 shrink-0">
                    {formatTime(item.created_at)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 下半部：管理員入口 + 個人資訊與登出 */}
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