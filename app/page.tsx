import { createClient } from '@/utils/supabase/server'
import { signout } from './login/actions'
import ChatDashboard from '@/components/ChatDashboard'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let isAdmin = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    isAdmin = profile?.role === 'admin'
  }

  return (
    <ChatDashboard
      userEmail={user?.email}
      userId={user?.id}
      isAdmin={isAdmin}
      onSignOut={signout}
    />
  )
}