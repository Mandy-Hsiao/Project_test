import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 1. 安全檢查：如果未登入，導向登入頁
  if (!user) {
    redirect('/login')
  }

  // 2. 權限檢查：檢查是否為管理員
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // 3. 若非 admin，強制踢回首頁（防止一般員工直接打網址 /admin 偷看）
  if (profile?.role !== 'admin') {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* 後台頂部導覽列 */}
      <header className="h-16 border-b border-slate-800 bg-slate-950 px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-amber-500 flex items-center justify-center font-bold text-slate-950">
            📊
          </div>
          <div>
            <h1 className="text-base font-bold text-white">SOP 知識庫管理與數據分析後台</h1>
            <p className="text-xs text-slate-400">系統管理員專屬視圖</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-400">管理員：{user.email}</span>
          <Link
            href="/"
            className="rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs text-slate-200 transition border border-slate-700"
          >
            ← 返回聊天主介面
          </Link>
        </div>
      </header>

      {/* 後台主數據展示區（吳負責接手實作數據分析圖表） */}
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* 頂部數據卡片 */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-slate-800/60 border border-slate-700 p-5 rounded-2xl shadow-sm">
            <span className="text-xs text-slate-400">全系統總提問次數</span>
            <div className="text-2xl font-bold text-white mt-1">1,248 次</div>
            <span className="text-[11px] text-emerald-400 mt-2 block">↑ 本週成長 12%</span>
          </div>
          <div className="bg-slate-800/60 border border-slate-700 p-5 rounded-2xl shadow-sm">
            <span className="text-xs text-slate-400">累計 Token 消耗</span>
            <div className="text-2xl font-bold text-amber-400 mt-1">384,520</div>
            <span className="text-[11px] text-slate-400 mt-2 block">約合 $0.76 USD</span>
          </div>
          <div className="bg-slate-800/60 border border-slate-700 p-5 rounded-2xl shadow-sm">
            <span className="text-xs text-slate-400">Guard AI 阻擋次數</span>
            <div className="text-2xl font-bold text-red-400 mt-1">86 次</div>
            <span className="text-[11px] text-slate-400 mt-2 block">敏感詞 62 / 注入 24</span>
          </div>
          <div className="bg-slate-800/60 border border-slate-700 p-5 rounded-2xl shadow-sm">
            <span className="text-xs text-slate-400">SOP 知識庫覆蓋率</span>
            <div className="text-2xl font-bold text-blue-400 mt-1">94.2%</div>
            <span className="text-[11px] text-emerald-400 mt-2 block">已向量化 42 份文件</span>
          </div>
        </div>

        {/* 數據分析圖表與分析說明區塊 */}
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 bg-slate-800/60 border border-slate-700 p-6 rounded-2xl">
            <h2 className="text-sm font-bold text-white mb-4">全域高頻提問 SOP 領域分析</h2>
            <div className="h-64 flex flex-col items-center justify-center border border-dashed border-slate-700 rounded-xl text-slate-500 text-sm">
              <span>📈 [此區塊後續由吳同學串接圖表套件，如 Recharts 或 Chart.js]</span>
              <span className="text-xs mt-1 text-slate-400">可分析同仁常問的 SOP 弱點</span>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700 p-6 rounded-2xl">
            <h2 className="text-sm font-bold text-white mb-4">權限與角色分佈</h2>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-300">系統管理員 (Admin)</span>
                <span className="font-bold text-amber-400">2 人</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-300">部門主管 (Manager)</span>
                <span className="font-bold text-blue-400">8 人</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-300">一般同仁 (User)</span>
                <span className="font-bold text-slate-400">120 人</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}