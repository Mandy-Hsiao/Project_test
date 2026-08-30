'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import Sidebar, { HistoryItem } from './Sidebar'

interface ChatDashboardProps {
  userEmail?: string
  userId?: string
  userRole?: 'admin' | 'manager' | 'user'
  department?: string
  isAdmin?: boolean
  onSignOut: () => void
}

export default function ChatDashboard({
  userEmail,
  userId,
  userRole = 'user',
  department = '',
  isAdmin,
  onSignOut,
}: ChatDashboardProps) {
  const supabase = createClient()
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<string>('')
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // 1. 初始化時載入此使用者的歷史提問紀錄
  useEffect(() => {
    async function loadHistory() {
      if (!userId) return
      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setHistory(data)
      }
    }
    loadHistory()
  }, [userId, supabase])

  // 2. 使用者送出新提問
  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const questionText = input.trim()
    setInput('')
    setCurrentQuestion(questionText)
    setActiveHistoryId(null)
    setIsLoading(true)

    // 寫入 Supabase chat_history 資料表
    if (userId) {
      const { data, error } = await supabase
        .from('chat_history')
        .insert([{ user_id: userId, question: questionText }])
        .select()
        .single()

      if (!error && data) {
        // 即時將新問題加到左側列表的最上方
        setHistory((prev) => [data, ...prev])
        setActiveHistoryId(data.id)
      }
    }

    // 目前暫無 AI 模型回答，直接結束 loading
    setIsLoading(false)
  }

  // 3. 點選左側歷史紀錄
  const handleSelectHistory = (item: HistoryItem) => {
    setActiveHistoryId(item.id)
    setCurrentQuestion(item.question)
  }

  // 4. 點選開啟新對話
  const handleNewChat = () => {
    setActiveHistoryId(null)
    setCurrentQuestion('')
    setInput('')
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* 左側邊欄：即時顯示歷史提問紀錄與身分資訊 */}
      <Sidebar
        userEmail={userEmail}
        userRole={userRole}
        department={department}
        isAdmin={isAdmin}
        onSignOut={onSignOut}
        history={history}
        activeHistoryId={activeHistoryId}
        onSelectHistory={handleSelectHistory}
        onNewChat={handleNewChat}
      />

      {/* 右側主對話區 */}
      <main className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
        {/* 頂部狀態列 */}
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span>SOP 企業知識庫對話系統</span>
          </div>
          <div className="text-xs text-slate-400">
            <span>模式：提問檢索中</span>
          </div>
        </header>

        {/* 聊天與問題呈現區 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!currentQuestion ? (
            /* 空白歡迎狀態 */
            <div className="max-w-xl mx-auto mt-24 text-center">
              <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl mx-auto mb-4 shadow-lg shadow-blue-500/20">
                SOP
              </div>
              <h2 className="text-xl font-bold text-slate-800">歡迎使用 SOP 智能知識庫</h2>
              <p className="mt-2 text-sm text-slate-500">
                請在下方輸入框輸入欲查詢的內部 SOP 或規章問題。
              </p>
            </div>
          ) : (
            /* 提問氣泡展示 */
            <div className="max-w-3xl mx-auto space-y-4">
              {/* 使用者提問 */}
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-tr-none px-4 py-3 text-sm leading-relaxed bg-blue-600 text-white shadow-sm">
                  <p className="whitespace-pre-wrap">{currentQuestion}</p>
                </div>
              </div>

              {/* 系統提示（待模型串接） */}
              <div className="flex justify-start items-center gap-2 text-xs text-slate-400 py-2">
                <div className="h-2 w-2 rounded-full bg-slate-400"></div>
                <span>提問已儲存至歷史紀錄。待 RAG 模型與向量資料庫串接後將自動回覆。</span>
              </div>
            </div>
          )}
        </div>

        {/* 底部輸入框 */}
        <div className="p-4 bg-white border-t border-slate-200">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="請輸入您想查詢的內部規章或 SOP 流程..."
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 py-3.5 pl-4 pr-24 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="absolute right-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:bg-slate-300 transition shadow-sm active:scale-95"
              >
                發送
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}