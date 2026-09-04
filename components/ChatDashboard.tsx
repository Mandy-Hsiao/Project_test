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
  const [currentAnswer, setCurrentAnswer] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // 1. 初始化時載入此使用者的歷史提問紀錄
  useEffect(() => {
    async function loadHistory() {
      if (!userId) {
        console.warn('ChatDashboard: 尚未取得 userId，稍後重試')
        return
      }

      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('載入歷史紀錄失敗 (請檢查 RLS 政策):', error.message)
      } else if (data) {
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
    setCurrentAnswer('')
    setErrorMessage('')
    setActiveHistoryId(null)
    setIsLoading(true)

    // 寫入 Supabase chat_history 資料表
    if (userId) {
      const { data, error } = await supabase
        .from('chat_history')
        .insert([{ user_id: userId, question: questionText }])
        .select()
        .single()

      if (error) {
        console.error('寫入提問紀錄失敗:', error.message)
      } else if (data) {
        setHistory((prev) => [data, ...prev])
        setActiveHistoryId(data.id)
      }
    } else {
      console.error('無法儲存紀錄：userId 不存在')
    }

    // 呼叫後端 Chat API 取得回答
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: questionText }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '取得回答失敗')
      }

      setCurrentAnswer(data.answer)
    } catch (error: any) {
      console.error('呼叫 Chat API 失敗:', error)
      setErrorMessage(error.message || '無法取得回答，請稍後再試。')
    } finally {
      setIsLoading(false)
    }
  }

  // 3. 點選左側歷史紀錄
  const handleSelectHistory = (item: HistoryItem) => {
    setActiveHistoryId(item.id)
    setCurrentQuestion(item.question)
    setCurrentAnswer('')
    setErrorMessage('')
  }

  // 4. 刪除提問歷史紀錄
  const handleDeleteHistory = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()

    const { error } = await supabase.from('chat_history').delete().eq('id', id)

    if (error) {
      console.error('刪除紀錄失敗:', error.message)
    } else {
      setHistory((prev) => prev.filter((item) => item.id !== id))
      if (activeHistoryId === id) {
        setActiveHistoryId(null)
        setCurrentQuestion('')
        setCurrentAnswer('')
      }
    }
  }

  // 5. 點選開啟新對話
  const handleNewChat = () => {
    setActiveHistoryId(null)
    setCurrentQuestion('')
    setCurrentAnswer('')
    setErrorMessage('')
    setInput('')
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-900">
      {/* 左側邊欄 */}
      <Sidebar
        userEmail={userEmail}
        userRole={userRole}
        department={department}
        isAdmin={isAdmin}
        onSignOut={onSignOut}
        history={history}
        activeHistoryId={activeHistoryId}
        onSelectHistory={handleSelectHistory}
        onDeleteHistory={handleDeleteHistory}
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
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-tr-none px-4 py-3 text-sm leading-relaxed bg-blue-600 text-white shadow-sm">
                  <p className="whitespace-pre-wrap">{currentQuestion}</p>
                </div>
              </div>

              {isLoading && (
                <div className="flex gap-3 items-center text-xs text-slate-400">
                  <div className="h-2 w-2 rounded-full bg-blue-600 animate-ping"></div>
                  正在思考中...
                </div>
              )}

              {!isLoading && currentAnswer && (
                <div className="flex gap-3 justify-start">
                  <div className="h-8 w-8 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    SOP
                  </div>
                  <div className="max-w-[80%] rounded-2xl rounded-tl-none px-4 py-3 text-sm leading-relaxed shadow-sm bg-white text-slate-800 border border-slate-200">
                    <p className="whitespace-pre-wrap">{currentAnswer}</p>
                  </div>
                </div>
              )}

              {!isLoading && errorMessage && (
                <div className="flex gap-3 justify-start">
                  <div className="max-w-[80%] rounded-2xl rounded-tl-none px-4 py-3 text-sm leading-relaxed shadow-sm bg-red-50 text-red-600 border border-red-200">
                    <p>{errorMessage}</p>
                  </div>
                </div>
              )}
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