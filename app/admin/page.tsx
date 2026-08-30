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

  // 2. 權限檢查：取得使用者角色與所屬部門
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, department')
    .eq('id', user.id)
    .single()

  const role = profile?.role || 'user'
  const department = profile?.department || '一般部門'
  const isAdmin = role === 'admin'
  const isManager = role === 'manager'

  // 3. 若非 admin 且非 manager（即一般同仁），強制踢回首頁
  if (!isAdmin && !isManager) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* 後台頂部導覽列 */}
      <header className="h-16 border-b border-slate-800 bg-slate-950 px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-slate-950 ${
              isAdmin ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
          >
            📊
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white">
                {isAdmin ? 'SOP 全系統知識庫數據監控後台' : `【${department}】數據分析與提問監控`}
              </h1>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold ${
                  isAdmin
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {isAdmin ? 'System Admin' : `${department} Manager`}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {isAdmin ? '最高管理員視圖（全域權限）' : `主管專屬視圖（僅監控 ${department} 數據）`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-400">
            登入帳號：<span className="text-slate-200">{user.email}</span>
          </span>
          <Link
            href="/"
            className="rounded-lg bg-slate-800 hover:bg-slate-700 px-3.5 py-1.5 text-xs text-slate-200 transition border border-slate-700 active:scale-95"
          >
            ← 返回提問介面
          </Link>
        </div>
      </header>

      {/* 後台主數據展示區（後續由吳同學串接真實圖表） */}
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* 頂部 4 張核心指標卡片 */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-slate-800/60 border border-slate-700 p-5 rounded-2xl shadow-sm">
            <span className="text-xs text-slate-400">
              {isAdmin ? '全系統總提問次數' : `${department} 總提問次數`}
            </span>
            <div className="text-2xl font-bold text-white mt-1">
              {isAdmin ? '1,248 次' : '312 次'}
            </div>
            <span className="text-[11px] text-emerald-400 mt-2 block">↑ 本週成長 12%</span>
          </div>

          <div className="bg-slate-800/60 border border-slate-700 p-5 rounded-2xl shadow-sm">
            <span className="text-xs text-slate-400">
              {isAdmin ? '累計 Token 消耗' : `${department} Token 消耗`}
            </span>
            <div className="text-2xl font-bold text-amber-400 mt-1">
              {isAdmin ? '384,520' : '96,130'}
            </div>
            <span className="text-[11px] text-slate-400 mt-2 block">
              {isAdmin ? '約合 $0.76 USD' : '約合 $0.19 USD'}
            </span>
          </div>

          <div className="bg-slate-800/60 border border-slate-700 p-5 rounded-2xl shadow-sm">
            <span className="text-xs text-slate-400">
              {isAdmin ? 'Guard AI 阻擋次數' : `${department} 敏感阻擋`}
            </span>
            <div className="text-2xl font-bold text-red-400 mt-1">
              {isAdmin ? '86 次' : '14 次'}
            </div>
            <span className="text-[11px] text-slate-400 mt-2 block">
              {isAdmin ? '敏感詞 62 / 注入 24' : '敏感詞 10 / 越權 4'}
            </span>
          </div>

          <div className="bg-slate-800/60 border border-slate-700 p-5 rounded-2xl shadow-sm">
            <span className="text-xs text-slate-400">
              {isAdmin ? 'SOP 知識庫覆蓋率' : `${department} 適用規章覆蓋率`}
            </span>
            <div className="text-2xl font-bold text-blue-400 mt-1">
              {isAdmin ? '94.2%' : '98.0%'}
            </div>
            <span className="text-[11px] text-emerald-400 mt-2 block">
              {isAdmin ? '已向量化 42 份文件' : '已向量化 12 份部門規章'}
            </span>
          </div>
        </div>

        {/* 數據分析圖表與分析說明區塊 */}
        <div className="grid grid-cols-3 gap-6">
          {/* 左側圖表預留區 */}
          <div className="col-span-2 bg-slate-800/60 border border-slate-700 p-6 rounded-2xl">
            <h2 className="text-sm font-bold text-white mb-4">
              {isAdmin
                ? '全域高頻提問 SOP 領域分析'
                : `【${department}】高頻提問 SOP 痛點分析`}
            </h2>
            <div className="h-64 flex flex-col items-center justify-center border border-dashed border-slate-700 rounded-xl text-slate-500 text-sm">
              <span>📈 [此區塊後續由吳同學串接圖表套件，如 Recharts 或 Chart.js]</span>
              <span className="text-xs mt-1 text-slate-400">
                {isAdmin
                  ? '可分析跨部門常問的 SOP 盲點'
                  : `可分析 ${department} 同仁常遭遇的規章疑慮`}
              </span>
            </div>
          </div>

          {/* 右側組織或角色分佈 */}
          <div className="bg-slate-800/60 border border-slate-700 p-6 rounded-2xl">
            <h2 className="text-sm font-bold text-white mb-4">
              {isAdmin ? '權限與角色分佈' : `${department} 成員監控`}
            </h2>
            <div className="space-y-3 text-xs">
              {isAdmin ? (
                <>
                  <div className="flex justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-300">系統管理員 (Admin)</span>
                    <span className="font-bold text-amber-400">2 人</span>
                  </div>
                  <div className="flex justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-300">部門主管 (Manager)</span>
                    <span className="font-bold text-emerald-400">8 人</span>
                  </div>
                  <div className="flex justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-300">一般同仁 (User)</span>
                    <span className="font-bold text-slate-400">120 人</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-300">主管帳號</span>
                    <span className="font-bold text-emerald-400">{user.email}</span>
                  </div>
                  <div className="flex justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-300">部門成員數</span>
                    <span className="font-bold text-blue-400">18 位同仁</span>
                  </div>
                  <div className="flex justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-300">本月異常提問率</span>
                    <span className="font-bold text-slate-400">0.8% (極低)</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}