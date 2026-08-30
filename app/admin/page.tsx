import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import AdminDashboardClient from '@/components/AdminDashboardClient'

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, department')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('[Admin] Profile query error:', profileError)
  }

  // 查詢失敗時安全預設為權限最低的「一般同仁」，
  // 避免像先前那樣把查詢失敗的使用者當成 manager 處理而外洩部門數據
  const role = (profile?.role as 'admin' | 'manager' | 'user') || 'user'
  const department = profile?.department || '未分配部門'

  // 所有登入使用者（admin / manager / user）都可以進入後台頁面，
  // 實際能看到哪些頁籤（全域 / 部門 / 個人歷史 / 用戶管理）由 AdminDashboardClient 依角色控制
  return (
    <AdminDashboardClient
      user={user}
      isAdmin={role === 'admin'}
      isManager={role === 'manager'}
      department={department}
      userRole={role}
    />
  )
}