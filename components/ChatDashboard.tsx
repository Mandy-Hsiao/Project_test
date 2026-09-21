'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import Sidebar, { HistoryItem } from './Sidebar'
import UploadDocumentModal from './UploadDocumentModal'

interface ChatDashboardProps {
  userEmail?: string
  employeeName?: string
  userId?: string
  userRole?: 'admin' | 'manager' | 'user'
  department?: string
  isAdmin?: boolean
  onSignOut: () => void
}

// 定義討論串內的訊息結構
interface MessageItem {
  id?: string
  role: 'user' | 'assistant'
  content: string
  rating?: number | null
  created_at?: string
}

export default function ChatDashboard({
  userEmail,
  employeeName,
  userId,
  userRole = 'user',
  department = '',
  isAdmin,
  onSignOut,
}: ChatDashboardProps) {
  const supabase = createClient()

  // 討論串與訊息狀態管理
  const [threads, setThreads] = useState<HistoryItem[]>([])
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // 👈 新增：控制「員工 SOP 文件上傳彈窗」開關狀態
  const [isUploadOpen, setIsUploadOpen] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 自動捲動到最底部訊息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  // 1. 初始化時載入此使用者的所有討論串 (threads)
  useEffect(() => {
    async function loadThreads() {
      if (!userId) return

      const { data, error } = await supabase
        .from('threads')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })

      if (!error && data) {
        // 將 threads 映射至 Sidebar 相容的結構 (title -> question)
        const formatted: HistoryItem[] = data.map((t) => ({
          id: t.id,
          question: t.title,
          created_at: t.created_at,
        }))
        setThreads(formatted)
      }
    }

    loadThreads()
  }, [userId, supabase])

  // 2. 切換左側討論串時，載入該討論串的所有歷史訊息
  const handleSelectHistory = async (item: HistoryItem) => {
    setActiveThreadId(item.id)
    setErrorMessage('')
    setIsLoading(true)

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('thread_id', item.id)
      .order('created_at', { ascending: true })

    if (!error && data) {
      setMessages(data)
    } else {
      console.error('載入對話失敗:', error?.message)
    }
    setIsLoading(false)
  }

  // 3. 送出訊息（支援首問建串與連續追問）
  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const questionText = input.trim()
    setInput('')
    setErrorMessage('')

    // A. 樂觀更新：立即將使用者的提問推上畫面
    const userMsg: MessageItem = { role: 'user', content: questionText }
    setMessages((prev) => [...prev, userMsg])
    setIsLoading(true)

    try {
      let currentThreadId = activeThreadId

      // B. 如果是「新對話」（尚未有 thread_id），先在 Supabase 建立討論串
      if (!currentThreadId && userId) {
        const defaultTitle =
          questionText.length > 15 ? questionText.slice(0, 15) + '...' : questionText
        const { data: threadData, error: threadErr } = await supabase
          .from('threads')
          .insert([
            {
              user_id: userId,
              department: department || '未分配部門',
              title: defaultTitle,
            },
          ])
          .select()
          .single()

        if (threadErr || !threadData) {
          console.error('Supabase 建立 thread 失敗原因:', threadErr)
          throw new Error(threadErr?.message || '建立討論串失敗，請稍後再試')
        }

        currentThreadId = threadData.id
        setActiveThreadId(currentThreadId)

        // 同步更新側邊欄討論串清單
        setThreads((prev) => [
          { id: threadData.id, question: threadData.title, created_at: threadData.created_at },
          ...prev,
        ])
      }

      // C. 將使用者提問寫入 chat_messages 資料表
      if (currentThreadId) {
        await supabase.from('chat_messages').insert([
          {
            thread_id: currentThreadId,
            role: 'user',
            content: questionText,
          },
        ])
      }

      // D. 提取最近 6 則歷史對話作為 Context 送給後端
      const contextHistory = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }))

      // E. 呼叫 /api/chat 取得 AI 回答
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: questionText,
          history: contextHistory,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || '取得回答失敗')
      }

      const generatedAnswer = data.answer || '未取得有效回覆'

      // F. 將 AI 回覆寫入 chat_messages 資料表
      let assistantMsgId: string | undefined = undefined
      if (currentThreadId) {
        const { data: savedMsg } = await supabase
          .from('chat_messages')
          .insert([
            {
              thread_id: currentThreadId,
              role: 'assistant',
              content: generatedAnswer,
            },
          ])
          .select()
          .single()

        assistantMsgId = savedMsg?.id

        // 更新討論串最後更新時間
        await supabase
          .from('threads')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', currentThreadId)
      }

      // G. 畫面加入 AI 回覆氣泡
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: 'assistant',
          content: generatedAnswer,
          rating: null,
        },
      ])
    } catch (error: any) {
      console.error('對話失敗:', error)
      setErrorMessage(error.message || '無法取得回答，請稍後再試。')
    } finally {
      setIsLoading(false)
    }
  }

  // 4. 訊息評分（Rating 👍 / 👎）
  const handleRate = async (messageId: string, ratingValue: number) => {
    const target = messages.find((m) => m.id === messageId)
    const newRating = target?.rating === ratingValue ? null : ratingValue

    // 樂觀更新畫面
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, rating: newRating } : m))
    )

    const { error } = await supabase
      .from('chat_messages')
      .update({ rating: newRating })
      .eq('id', messageId)

    if (error) {
      console.error('評分失敗:', error.message)
    }
  }

  // 5. 開啟新對話
  const handleNewChat = () => {
    setActiveThreadId(null)
    setMessages([])
    setErrorMessage('')
    setInput('')
  }

  // 6. 刪除整個討論串
  const handleDeleteHistory = async (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation()

    const { error } = await supabase.from('threads').delete().eq('id', threadId)
    if (!error) {
      setThreads((prev) => prev.filter((t) => t.id !== threadId))
      if (activeThreadId === threadId) {
        handleNewChat()
      }
    }
  }

  // 7. 編輯討論串名稱（Rename）
  const handleRenameHistory = async (threadId: string, newTitle: string) => {
    const { error } = await supabase
      .from('threads')
      .update({ title: newTitle })
      .eq('id', threadId)

    if (error) {
      console.error('更名失敗:', error.message)
      alert('更新討論串名稱失敗')
      return
    }

    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, question: newTitle } : t))
    )
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-900">
      {/* 左側討論串清單 */}
      <Sidebar
        userEmail={userEmail}
        employeeName={employeeName}
        userRole={userRole}
        department={department}
        isAdmin={isAdmin}
        onSignOut={onSignOut}
        history={threads}
        activeHistoryId={activeThreadId}
        onSelectHistory={handleSelectHistory}
        onDeleteHistory={handleDeleteHistory}
        onRenameHistory={handleRenameHistory}
        onNewChat={handleNewChat}
        onOpenUploadModal={() => setIsUploadOpen(true)} // 👈 綁定開啟員工上傳 SOP 彈窗
      />

      {/* 右側主對話區 */}
      <main className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
        {/* 頂部導航列 */}
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>SOP 企業知識庫對話系統</span>
            {activeThreadId && (
              <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                多輪討論串模式
              </span>
            )}
          </div>
          <div className="text-xs text-slate-400">
            <span>兆豐證券資訊部助教</span>
          </div>
        </header>

        {/* 訊息流呈現區（支援滾動與連續追問） */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="max-w-xl mx-auto mt-24 text-center">
              <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl mx-auto mb-4 shadow-lg shadow-blue-500/20">
                SOP
              </div>
              <h2 className="text-xl font-bold text-slate-800">歡迎使用 SOP 智能知識庫</h2>
              <p className="mt-2 text-sm text-slate-500">
                請在下方輸入問題，系統將自動為您開啟討論串並保留上下文記憶。
              </p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg, index) => (
                <div key={msg.id || index}>
                  {msg.role === 'user' ? (
                    /* 使用者訊息氣泡（靠右） */
                    <div className="flex justify-end">
                      <div className="max-w-[80%] rounded-2xl rounded-tr-none px-4 py-3 text-sm leading-relaxed bg-blue-600 text-white shadow-sm">
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ) : (
                    /* AI 回覆氣泡（靠左） */
                    <div className="flex gap-3 justify-start items-start">
                      <div className="h-8 w-8 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-1 shadow-sm">
                        SOP
                      </div>
                      <div className="max-w-[85%] space-y-2">
                        <div className="rounded-2xl rounded-tl-none px-5 py-4 text-sm leading-relaxed shadow-sm bg-white text-slate-800 border border-slate-200">
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>

                        {/* Rating 評分按鈕（綁定該訊息 ID）*/}
                        {msg.id && (
                          <div className="flex items-center gap-3 px-1">
                            <span className="text-[11px] text-slate-400">這個回答有幫助嗎？</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleRate(msg.id!, 1)}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition ${
                                  msg.rating === 1
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-300 shadow-sm'
                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                <span>👍</span>
                                <span>滿意</span>
                              </button>

                              <button
                                onClick={() => handleRate(msg.id!, -1)}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition ${
                                  msg.rating === -1
                                    ? 'bg-rose-50 text-rose-600 border-rose-300 shadow-sm'
                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                <span>👎</span>
                                <span>待改進</span>
                              </button>
                            </div>
                            {msg.rating !== null && msg.rating !== undefined && (
                              <span className="text-[11px] text-emerald-600 font-medium">
                                ✓ 已記錄回饋
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* AI 思考等待狀態 */}
              {isLoading && (
                <div className="flex gap-3 items-center text-xs text-slate-400">
                  <div className="h-2 w-2 rounded-full bg-blue-600 animate-ping"></div>
                  <span>正在接續上下文並思考回答中...</span>
                </div>
              )}

              {/* 錯誤提示 */}
              {errorMessage && (
                <div className="rounded-xl p-3 text-xs bg-red-50 text-red-600 border border-red-200">
                  {errorMessage}
                </div>
              )}

              <div ref={messagesEndRef} />
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
                placeholder={
                  activeThreadId
                    ? '接續此話題繼續追問...'
                    : '請輸入您想查詢的內部規章或 SOP 流程...'
                }
                disabled={isLoading}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 py-3.5 pl-4 pr-24 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
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

      {/* 👈 新增：一般員工 SOP 知識文件上傳與管理彈窗 */}
      <UploadDocumentModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        userId={userId}
        department={department}
        employeeName={employeeName}
      />
    </div>
  )
}