'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'

interface ManagerReviewCenterProps {
  managerDepartment: string
  managerId: string
  managerRole?: string
}

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

export default function ManagerReviewCenter({
  managerDepartment,
  managerId,
  managerRole,
}: ManagerReviewCenterProps) {
  const supabase = createClient()

  // 狀態管理
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<'pending' | 'approved' | 'rejected'>('pending')

  // 駁回彈窗狀態
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  // 1. 載入該部門的所有知識庫文件
  const fetchDepartmentDocs = useCallback(async () => {
    setIsLoading(true)
    let query = supabase.from('knowledge_documents').select('*')

    // 若不是最高總管理員 (Admin)，強制只撈取該主管所屬部門的文件
    if (managerRole !== 'admin') {
      query = query.eq('department', managerDepartment)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('撈取審核文件失敗:', error.message)
    } else {
      setDocuments((data as DocumentItem[]) || [])
    }
    setIsLoading(false)
  }, [managerDepartment, managerRole, supabase])

  useEffect(() => {
    fetchDepartmentDocs()
  }, [fetchDepartmentDocs])

  // 2. 下載檢視原始文件 (透過 Supabase Storage 產生 60 秒安全 Signed URL)
  const handleDownloadOriginal = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('kb_documents')
        .createSignedUrl(filePath, 60)

      if (error || !data?.signedUrl) {
        throw new Error(error?.message || '無法產生下載連結')
      }

      window.open(data.signedUrl, '_blank')
    } catch (err: any) {
      alert(`下載失敗：${err.message}`)
    }
  }

  // 3. 核准通過 (Approve)
  const handleApprove = async (docId: string) => {
    if (!confirm('確定要核准此份 SOP 文件嗎？核准後將正式生效並納入 AI 知識庫供同仁檢索。')) return

    setIsProcessing(true)
    const { error } = await supabase
      .from('knowledge_documents')
      .update({
        status: 'approved',
        reviewed_by: managerId,
        reviewed_at: new Date().toISOString(),
        review_comment: null,
      })
      .eq('id', docId)

    if (error) {
      alert(`核准失敗：${error.message}`)
    } else {
      setDocuments((prev) =>
        prev.map((d) => (d.id === docId ? { ...d, status: 'approved' } : d))
      )
    }
    setIsProcessing(false)
  }

  // 4. 開啟駁回對話框
  const openRejectModal = (docId: string) => {
    setSelectedDocId(docId)
    setRejectReason('')
    setRejectModalOpen(true)
  }

  // 5. 確認駁回 (Reject)
  const handleConfirmReject = async () => {
    if (!selectedDocId || !rejectReason.trim()) {
      alert('請填寫具體的退件原因，以利同仁修正！')
      return
    }

    setIsProcessing(true)
    const { error } = await supabase
      .from('knowledge_documents')
      .update({
        status: 'rejected',
        review_comment: rejectReason.trim(),
        reviewed_by: managerId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', selectedDocId)

    if (error) {
      alert(`駁回操作失敗：${error.message}`)
    } else {
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === selectedDocId
            ? { ...d, status: 'rejected', review_comment: rejectReason.trim() }
            : d
        )
      )
      setRejectModalOpen(false)
    }
    setIsProcessing(false)
  }

  // 篩選當前選取分頁的文件
  const displayedDocs = documents.filter((doc) => doc.status === filterStatus)
  const pendingCount = documents.filter((d) => d.status === 'pending').length

  return (
    <div className="space-y-6">
      {/* 頂部資訊看板 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span>🛡️</span>
            <span>【{managerDepartment}】SOP 知識規章審核中心</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            負責把關本部同仁送審的 SOP 與作業規範，核准後即刻進入企業 AI 檢索庫。
          </p>
        </div>

        {/* 狀態切換分頁 */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-medium">
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              filterStatus === 'pending'
                ? 'bg-white text-blue-600 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>待主管審核</span>
            {pendingCount > 0 && (
              <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilterStatus('approved')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filterStatus === 'approved'
                ? 'bg-white text-emerald-600 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            已生效規章
          </button>
          <button
            onClick={() => setFilterStatus('rejected')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filterStatus === 'rejected'
                ? 'bg-white text-rose-600 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            已駁回紀錄
          </button>
        </div>
      </div>

      {/* 文件審核清單列表 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-slate-400">正在載入部門文件清單...</div>
        ) : displayedDocs.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            {filterStatus === 'pending'
              ? '目前沒有待審核的文件，所有送審皆已處置完畢。'
              : filterStatus === 'approved'
              ? '目前尚無已核准的生效規章。'
              : '目前沒有被駁回的文件紀錄。'}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {displayedDocs.map((doc) => (
              <div
                key={doc.id}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 transition"
              >
                {/* 左側：文件核心屬性 */}
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-bold text-sm text-slate-800">{doc.title}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        doc.scope === 'public'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}
                    >
                      {doc.scope === 'public' ? '🌐 全公司公開' : '🏢 僅限部門內部'}
                    </span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      {(doc.file_size / 1024).toFixed(1)} KB
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>檔名：{doc.file_name}</span>
                    <span>·</span>
                    <span>送審日期：{new Date(doc.created_at).toLocaleDateString()}</span>
                  </div>

                  {/* 若是駁回狀態，列出當初的駁回理由 */}
                  {doc.status === 'rejected' && doc.review_comment && (
                    <div className="mt-2 text-xs p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700">
                      <strong>退件說明：</strong>
                      {doc.review_comment}
                    </div>
                  )}
                </div>

                {/* 右側：主管操作動作列 */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* 下載調閱原文件 */}
                  <button
                    onClick={() => handleDownloadOriginal(doc.file_path)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                    title="下載原始檔案檢閱內容"
                  >
                    <span>📥</span>
                    <span>調閱原檔</span>
                  </button>

                  {/* 待審核時出現「核准」與「駁回」按鈕 */}
                  {filterStatus === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(doc.id)}
                        disabled={isProcessing}
                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-sm transition disabled:opacity-50"
                      >
                        ✓ 核准生效
                      </button>
                      <button
                        onClick={() => openRejectModal(doc.id)}
                        disabled={isProcessing}
                        className="px-3.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition disabled:opacity-50"
                      >
                        ✕ 駁回退件
                      </button>
                    </>
                  )}

                  {/* 已核准規章提供重新撤回權限 */}
                  {filterStatus === 'approved' && (
                    <button
                      onClick={() => openRejectModal(doc.id)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                      title="若流程異動或過期，可將此規章撤銷下架"
                    >
                      撤銷下架
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 駁回退件填寫原因彈窗 (Modal) */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <span>⚠️</span>
              <span>退回送審文件</span>
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              請輸入退件或需要修正的具體原因，系統將傳達給上傳同仁以利重新修正內容。
            </p>

            <textarea
              required
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="例如：請補充第 2 節關於雙因子驗證的設定步驟後再送審。"
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                取消
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={isProcessing || !rejectReason.trim()}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition disabled:opacity-50"
              >
                {isProcessing ? '處理中...' : '確認駁回'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}