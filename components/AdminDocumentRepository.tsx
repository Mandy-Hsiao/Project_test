'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'

interface DocumentItem {
  id: string
  title: string
  file_name: string
  file_path: string
  file_size: number
  file_type: string
  scope: 'public' | 'department'
  department: string
  status: 'pending' | 'approved' | 'rejected'
  review_comment?: string
  uploader_id: string
  created_at: string
}

interface AdminDocumentRepositoryProps {
  adminId: string
}

export default function AdminDocumentRepository({ adminId }: AdminDocumentRepositoryProps) {
  const supabase = createClient()

  // 核心資料狀態
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 篩選器狀態
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedDept, setSelectedDept] = useState<string>('all')
  const [selectedScope, setSelectedScope] = useState<'all' | 'public' | 'department'>('all')
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all')

  // 1. 撈取全公司所有知識庫文件
  const fetchAllDocuments = useCallback(async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('knowledge_documents')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('調閱知識庫全量文件失敗:', error.message)
    } else {
      setDocuments((data as DocumentItem[]) || [])
    }
    setIsLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchAllDocuments()
  }, [fetchAllDocuments])

  // 2. 下載檢視原始文件 (透過 Supabase Storage 產生安全 Signed URL)
  const handleDownloadOriginal = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('kb_documents')
        .createSignedUrl(filePath, 60)

      if (error || !data?.signedUrl) {
        throw new Error(error?.message || '無法產生原檔下載連結')
      }

      window.open(data.signedUrl, '_blank')
    } catch (err: any) {
      alert(`下載原文件失敗：${err.message}`)
    }
  }

  // 3. 管理員覆寫文件範圍（公開 ⇄ 部門內部）
  const handleToggleScope = async (docId: string, currentScope: 'public' | 'department') => {
    const newScope = currentScope === 'public' ? 'department' : 'public'
    const confirmText =
      newScope === 'public'
        ? '確定要將此文件改為【全公司公開】嗎？所有部門同仁皆可於 AI 檢索時存取。'
        : '確定要將此文件改為【僅限部門內部】嗎？僅有該歸屬部門同仁可存取。'

    if (!confirm(confirmText)) return

    const { error } = await supabase
      .from('knowledge_documents')
      .update({ scope: newScope })
      .eq('id', docId)

    if (error) {
      alert(`修改失敗：${error.message}`)
    } else {
      setDocuments((prev) =>
        prev.map((d) => (d.id === docId ? { ...d, scope: newScope } : d))
      )
    }
  }

  // 4. 管理員強制變更審核狀態
  const handleStatusChange = async (docId: string, newStatus: 'approved' | 'rejected') => {
    const actionName = newStatus === 'approved' ? '核准生效' : '強制下架'
    if (!confirm(`確定要將此文件${actionName}嗎？`)) return

    const { error } = await supabase
      .from('knowledge_documents')
      .update({
        status: newStatus,
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', docId)

    if (error) {
      alert(`操作失敗：${error.message}`)
    } else {
      setDocuments((prev) =>
        prev.map((d) => (d.id === docId ? { ...d, status: newStatus } : d))
      )
    }
  }

  // 5. 管理員強制刪除（包含實體檔案與資料庫紀錄）
  const handleDeleteDocument = async (docId: string, filePath: string) => {
    if (!confirm('【危險操作】確定要從知識庫永久刪除此份文件及其原始檔嗎？此動作無法復原！')) return

    try {
      await supabase.storage.from('kb_documents').remove([filePath])
      const { error } = await supabase.from('knowledge_documents').delete().eq('id', docId)
      if (error) throw error
      setDocuments((prev) => prev.filter((d) => d.id !== docId))
    } catch (err: any) {
      alert(`刪除失敗：${err.message}`)
    }
  }

  // 提取現有所有部門列表供篩選
  const departmentOptions = Array.from(new Set(documents.map((d) => d.department))).filter(Boolean)

  // 執行即時複合篩選
  const filteredDocs = documents.filter((doc) => {
    const matchKeyword =
      doc.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      doc.file_name.toLowerCase().includes(searchKeyword.toLowerCase())
    const matchDept = selectedDept === 'all' || doc.department === selectedDept
    const matchScope = selectedScope === 'all' || doc.scope === selectedScope
    const matchStatus = selectedStatus === 'all' || doc.status === selectedStatus
    return matchKeyword && matchDept && matchScope && matchStatus
  })

  return (
    <div className="space-y-6">
      {/* 頂部資訊看板與總覽統計 */}
      <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>📁</span>
            <span>全公司知識庫原文件庫與權限管控</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            總管理員視圖：監控全體知識庫檔案、調閱原文件、調度公開/部門範圍與管理文件狀態。
          </p>
        </div>

        {/* 核心指標小卡 */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl text-center">
            <span className="text-[10px] text-slate-400 block">總建檔數</span>
            <span className="text-sm font-bold text-white">{documents.length}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl text-center">
            <span className="text-[10px] text-emerald-400 block">已生效納庫</span>
            <span className="text-sm font-bold text-emerald-400">
              {documents.filter((d) => d.status === 'approved').length}
            </span>
          </div>
          <div className="bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl text-center">
            <span className="text-[10px] text-amber-400 block">待審核文件</span>
            <span className="text-sm font-bold text-amber-400">
              {documents.filter((d) => d.status === 'pending').length}
            </span>
          </div>
        </div>
      </div>

      {/* 多功能複合篩選器 */}
      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        {/* 關鍵字搜尋 */}
        <div className="flex-1 min-w-[240px]">
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="搜尋文件標題或原始檔名..."
            className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded-xl px-3.5 py-2 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* 下拉篩選選單群 */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 部門篩選 */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
          >
            <option value="all">所有部門</option>
            {departmentOptions.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          {/* 範圍篩選 */}
          <select
            value={selectedScope}
            onChange={(e) => setSelectedScope(e.target.value as any)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
          >
            <option value="all">全部範圍</option>
            <option value="public">全公司公開</option>
            <option value="department">僅限部門內部</option>
          </select>

          {/* 審核狀態篩選 */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
          >
            <option value="all">所有狀態</option>
            <option value="approved">已核准 (生效中)</option>
            <option value="pending">待審核</option>
            <option value="rejected">已駁回</option>
          </select>

          {/* 重置按鈕 */}
          {(searchKeyword || selectedDept !== 'all' || selectedScope !== 'all' || selectedStatus !== 'all') && (
            <button
              onClick={() => {
                setSearchKeyword('')
                setSelectedDept('all')
                setSelectedScope('all')
                setSelectedStatus('all')
              }}
              className="text-xs text-slate-400 hover:text-white px-2 py-1"
            >
              重設篩選
            </button>
          )}
        </div>
      </div>

      {/* 原文件數據表格 */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="py-20 text-center text-xs text-slate-500">正在調閱全量知識庫原文件...</div>
        ) : filteredDocs.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-500">
            查無符合條件的知識庫文件。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 uppercase text-[11px] border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3 font-semibold">文件名稱 / 原檔名</th>
                  <th className="px-4 py-3 font-semibold">歸屬部門</th>
                  <th className="px-4 py-3 font-semibold">可見範圍</th>
                  <th className="px-4 py-3 font-semibold">審核狀態</th>
                  <th className="px-4 py-3 font-semibold">檔案大小</th>
                  <th className="px-4 py-3 font-semibold">建檔時間</th>
                  <th className="px-5 py-3 font-semibold text-right">管理操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-900/40 transition">
                    {/* 文件名稱與檔名 */}
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-white truncate max-w-xs">{doc.title}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">
                        {doc.file_name}
                      </div>
                    </td>

                    {/* 歸屬部門 */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[11px]">
                        {doc.department}
                      </span>
                    </td>

                    {/* 可見範圍 (可直接點擊切換) */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleScope(doc.id, doc.scope)}
                        title="點擊可直接切換公開或部門專屬"
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium border transition hover:scale-105 active:scale-95 ${
                          doc.scope === 'public'
                            ? 'bg-blue-500/10 text-blue-300 border-blue-500/30 hover:bg-blue-500/20'
                            : 'bg-purple-500/10 text-purple-300 border-purple-500/30 hover:bg-purple-500/20'
                        }`}
                      >
                        {doc.scope === 'public' ? ' 全公司公開' : ' 僅限部門'} ⇄
                      </button>
                    </td>

                    {/* 審核狀態 */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {doc.status === 'approved' && (
                        <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                          <span>●</span> 已生效
                        </span>
                      )}
                      {doc.status === 'pending' && (
                        <span className="text-[11px] text-amber-400 flex items-center gap-1 font-medium">
                          <span>●</span> 待審核
                        </span>
                      )}
                      {doc.status === 'rejected' && (
                        <span className="text-[11px] text-rose-400 flex items-center gap-1 font-medium">
                          <span>●</span> 已駁回
                        </span>
                      )}
                    </td>

                    {/* 檔案大小 */}
                    <td className="px-4 py-3.5 whitespace-nowrap text-slate-400 text-[11px]">
                      {(doc.file_size / 1024).toFixed(1)} KB
                    </td>

                    {/* 上傳時間 */}
                    <td className="px-4 py-3.5 whitespace-nowrap text-slate-400 text-[11px]">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>

                    {/* 管理操作按鈕群 */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* 1. 下載調閱原文件 */}
                        <button
                          onClick={() => handleDownloadOriginal(doc.file_path)}
                          className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition"
                          title="下載調閱原始檔案"
                        >
                          下載原檔
                        </button>

                        {/* 2. 管理員直接核准或強制下架 */}
                        {doc.status !== 'approved' ? (
                          <button
                            onClick={() => handleStatusChange(doc.id, 'approved')}
                            className="px-2.5 py-1 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg transition"
                            title="管理員強制核准納庫"
                          >
                            ✓ 核准
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStatusChange(doc.id, 'rejected')}
                            className="px-2.5 py-1 text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg transition"
                            title="強制將文件下架"
                          >
                            下架
                          </button>
                        )}

                        {/* 3. 永久刪除 */}
                        <button
                          onClick={() => handleDeleteDocument(doc.id, doc.file_path)}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded transition"
                          title="永久刪除文件與原檔"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}