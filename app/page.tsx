import { createClient } from '@/utils/supabase/server'
import { signout } from './login/actions'
import Sidebar from '@/components/Sidebar'
import ChatContainer from '@/components/ChatContainer'

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
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar userEmail={user?.email} onSignOut={signout} isAdmin={isAdmin} />
      <ChatContainer />
    </div>
  )
}