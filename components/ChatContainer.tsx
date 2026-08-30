'use client'

import React, { useState } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  source?: string
  tokens?: number
}

export default function ChatContainer() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // 快捷卡片點擊
  const handleQuickPrompt = (text: string) => {
    setInput(text)
  }

  // 送出提問
  const handleSend = () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = { role: 'user', content: input }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // 模擬 AI 檢索與回覆（後續串接蕭的 RAG API）
    setTimeout(() => {
      const aiMessage: Message = {
        role: 'assistant',
        content: `依據內部人事規章《員工差勤管理辦法》第 4 條規定：\n1. 婚假給予有給薪假 8 日。\n2. 應於結婚登記之日起 3 個月內請畢，必要時得經主管同意延長至 6 個月內核銷完畢。`,
        source: '來源規章：內部人事規章_2026年修訂版.pdf (第 12 頁)',
        tokens: 142,
      }
      setMessages((prev) => [...prev, aiMessage])
      setIsLoading(false)
    }, 1000)
  }

  return (
    <main className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
      {/* 頂部狀態列 */}
      <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>RAG 檢索就緒 (Azure OpenAI + Supabase)</span>
        </div>
      </header>

      {/* 聊天對話區 */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          /* 空白歡迎狀態與推薦引導卡片 */
          <div className="max-w-2xl mx-auto mt-12 text-center">
            <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl mx-auto mb-4 shadow-lg shadow-blue-500/20">
              AI
            </div>
            <h2 className="text-xl font-bold text-slate-800">歡迎使用 SOP 企業智能助理</h2>
            <p className="mt-1 text-sm text-slate-500">
              您可以直接輸入問題，或點選下方常見業務場景進行查詢：
            </p>

            <div className="grid grid-cols-2 gap-3 mt-8 text-left">
              {[
                { title: '💼 差假申請規範', desc: '查詢產假、育嬰留停或婚假規定與所需附件' },
                { title: '✈️ 差旅與公出報支', desc: '查詢國內外出差住宿標準與交通津貼計算' },
                { title: '🔒 資訊設備安全規程', desc: '查詢外接硬碟存取權限與 VPN 連線作業 SOP' },
                { title: '📄 採購與合約簽核', desc: '查詢單筆金額超過 10 萬元之用印核決權限' },
              ].map((card, i) => (
                <div
                  key={i}
                  onClick={() => handleQuickPrompt(`我想查詢：${card.title.slice(2)}`)}
                  className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-500 hover:shadow-sm cursor-pointer transition"
                >
                  <div className="text-sm font-semibold text-slate-800">{card.title}</div>
                  <div className="text-xs text-slate-400 mt-1">{card.desc}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* 訊息列表 */
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="h-8 w-8 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    AI
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {/* SOP 引用來源標籤與 Token 資訊 */}
                  {msg.source && (
                    <div className="mt-3 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                        {msg.source}
                      </span>
                      {msg.tokens && <span>Token 消耗: {msg.tokens}</span>}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 items-center text-xs text-slate-400">
                <div className="h-2 w-2 rounded-full bg-blue-600 animate-ping"></div>
                正在比對 SOP 向量知識庫並重組回答...
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
          <div className="text-center mt-2">
            <span className="text-[11px] text-slate-400">
              回答內容均由 Azure OpenAI 檢索企業內部 SOP 生成，請依正式法規公文為準。
            </span>
          </div>
        </div>
      </div>
    </main>
  )
}