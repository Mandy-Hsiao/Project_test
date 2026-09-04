import { createClient } from '@/utils/supabase/server'
import { signout } from './login/actions'
import ChatDashboard from '@/components/ChatDashboard'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let userRole: 'admin' | 'manager' | 'user' = 'user'
  let department = ''

  if (user) {
    // 同時查詢角色與部門資訊
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, department, em_name')
      .eq('id', user.id)
      .single()

    if (profile) {
      userRole = (profile.role as 'admin' | 'manager' | 'user') || 'user'
      department = profile.department || '一般部門'
    }
  }

  return (
    <ChatDashboard
      userEmail={user?.email}
      userId={user?.id}
      userRole={userRole}
      department={department}
      isAdmin={userRole === 'admin'}
      onSignOut={signout}
    />
  )
}