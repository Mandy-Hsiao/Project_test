import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // 接收使用者的新問題 (question) 與該討論串的前文歷史 (history)
    const { question, history = [] } = await request.json()

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: '缺少 question 參數' }, { status: 400 })
    }

    const apiUrl = process.env.CHAT_API_URL

    if (!apiUrl) {
      return NextResponse.json(
        { error: '缺少 CHAT_API_URL 環境變數' },
        { status: 500 }
      )
    }

    // 去除結尾斜線，確保路徑組合正常
    const cleanUrl = apiUrl.replace(/\/$/, '')

    // 轉發給獨立部署的 Python FastAPI（將問題與歷史紀錄一併送出）
    const response = await fetch(`${cleanUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        history, // 傳遞格式範例：[{ role: 'user', content: '...' }, { role: 'assistant', content: '...' }]
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error('Python API 回應失敗:', response.status, text)
      return NextResponse.json({ error: 'Python API 呼叫失敗' }, { status: 502 })
    }

    const data = await response.json()

    // 回傳 AI 回答，若未來 Python 端有回傳標題與分類也會一併回傳
    return NextResponse.json({
      answer: data.answer,
      title: data.title,
      main_category: data.main_category,
      sub_category: data.sub_category,
    })
  } catch (error: any) {
    console.error('Chat API 錯誤:', error)
    return NextResponse.json({ error: error.message || '伺服器錯誤' }, { status: 500 })
  }
}