import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const scope = (searchParams.get('scope') as 'global' | 'department' | 'personal') || 'personal'
    const department = searchParams.get('department') || ''

    // 用一般（受 RLS 保護）的 client 讀取「自己」的角色/部門，
    // 這一步一定讀得到，因為 RLS 通常允許使用者讀取自己的那一列
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, department')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.warn('[Analytics API] Profile error:', profileError.message)
    }

    const userRole = (profile?.role as 'admin' | 'manager' | 'user') || 'user'
    const userDept = profile?.department || ''

    // 權限檢查（維持原本邏輯）
    if (scope === 'global' && userRole !== 'admin') {
      return NextResponse.json({ error: '無全域權限' }, { status: 403 })
    }
    if (scope === 'department' && userRole !== 'admin' && userRole !== 'manager') {
      return NextResponse.json({ error: '無部門權限' }, { status: 403 })
    }
    if (scope === 'department' && userRole === 'manager' && department && department !== userDept) {
      return NextResponse.json({ error: '只能查看自己部門' }, { status: 403 })
    }

    // 個人數據：用一般 client 即可（本來就只查自己的資料，最安全）
    // 部門 / 全域數據：改用 service role client 繞過 RLS
    // → 因為權限已經在上面用程式碼檢查過了，這裡才允許讀取「其他人」的資料，
    //   這也是修正「主管後台數據沒有同步」的關鍵：以前用一般 client 查詢，
    //   RLS 會擋掉主管對部門同仁 profiles / chat_history 的讀取，導致查回來永遠是空的或只有自己。
    const db: any = scope === 'personal' ? supabase : createAdminClient()

    let query = db.from('chat_history').select('*')

    if (scope === 'personal') {
      query = query.eq('user_id', user.id)
    } else if (scope === 'department') {
      const deptToQuery = department || userDept
      if (deptToQuery) {
        const { data: deptUsers, error: deptUsersError } = await db
          .from('profiles')
          .select('id')
          .eq('department', deptToQuery)

        if (deptUsersError) {
          console.error('[Analytics API] Department users query error:', deptUsersError)
        }

        const userIds = deptUsers?.map((u: any) => u.id) || []
        if (userIds.length > 0) {
          query = query.in('user_id', userIds)
        } else {
          return NextResponse.json({
            totalQuestions: 0,
            uniqueUsers: 0,
            questionsPerDay: {},
            departmentBreakdown: undefined,
            topQuestions: [],
          })
        }
      }
    }
    // scope === 'global' 無額外篩選

    const { data: chats, error: chatsError } = await query.order('created_at', {
      ascending: false,
    })

    if (chatsError) {
      console.error('[Analytics API] Chats query error:', chatsError)
      return NextResponse.json({
        totalQuestions: 0,
        uniqueUsers: 0,
        questionsPerDay: {},
        departmentBreakdown: scope === 'global' ? {} : undefined,
        topQuestions: [],
      })
    }

    console.log(`[Analytics API] Found ${chats?.length || 0} chats for scope: ${scope}`)

    return NextResponse.json({
      totalQuestions: chats?.length || 0,
      uniqueUsers: new Set(chats?.map((c: any) => c.user_id)).size,
      questionsPerDay: calculateDailyBreakdown(chats || []),
      departmentBreakdown:
        scope === 'global' ? await calculateDepartmentBreakdown(chats || [], db) : undefined,
      topQuestions: getTopQuestions(chats || [], 10),
    })
  } catch (error) {
    console.error('[Analytics API] Unexpected error:', error)
    return NextResponse.json(
      { error: '伺服器錯誤', details: String(error) },
      { status: 500 },
    )
  }
}

const calculateDailyBreakdown = (chats: any[]) => {
  const breakdown: Record<string, number> = {}
  chats.forEach((chat) => {
    const date = new Date(chat.created_at).toISOString().split('T')[0]
    breakdown[date] = (breakdown[date] || 0) + 1
  })
  return breakdown
}

const calculateDepartmentBreakdown = async (chats: any[], supabase: any) => {
  const breakdown: Record<string, number> = {}

  // 批量查詢所有用戶的部門信息
  const userIds = [...new Set(chats.map((c: any) => c.user_id))]
  const { data: users } = await supabase
    .from('profiles')
    .select('id, department')
    .in('id', userIds)

  const userDeptMap = new Map<string, string>(
    users?.map((u: any) => [u.id, u.department || '未知']) || [],
  )

  chats.forEach((chat: any) => {
    const dept = userDeptMap.get(chat.user_id) || '未知'
    breakdown[dept] = (breakdown[dept] || 0) + 1
  })

  const total = chats.length
  return Object.fromEntries(
    Object.entries(breakdown).map(([dept, count]) => [
      dept,
      { count, percentage: total > 0 ? ((Number(count) / total) * 100).toFixed(1) : '0' },
    ]),
  )
}

const getTopQuestions = (chats: any[], limit: number) => {
  const map = new Map<string, number>()

  chats.forEach((chat) => {
    const q = chat.question?.trim() || ''
    if (q.length === 0) return

    // 歸一化問題（移除尾部的標點、空格）
    const normalized = q.replace(/[？?。，、\s]+$/g, '').toLowerCase()
    if (normalized.length === 0) return

    map.set(q, (map.get(q) || 0) + 1)
  })

  console.log(`[Analytics API] Found ${map.size} unique questions`)

  return Array.from(map.entries())
    .map(([question, count]) => ({ question, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}