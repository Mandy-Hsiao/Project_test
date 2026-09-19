'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'

interface UploadDocumentModalProps {
  isOpen: boolean
  onClose: () => void
  userId?: string
  department?: string
  employeeName?: string
}

interface DocumentItem {
  id: string
  title: string
  file_name: string
  file_path: string
  scope: 'public' | 'department'
  status: 'pending' | 'approved' | 'rejected'
  review_comment?: string
  created_at: string
}

export default function UploadDocumentModal({
  isOpen,
  onClose,
  userId,
  department = '資訊部',
  employeeName,
}: UploadDocumentModalProps) {
  const supabase = createClient()

  // 分頁切換：'upload' (上傳新文件) 或 'list' (我的上傳清單)
  const [activeTab, setActiveTab] = useState<'upload' | 'list'>('upload')

  // 表單狀態
  const [title, setTitle] = useState('')
  const [scope, setScope] = useState<'department' | 'public'>('department')
  const [file, setFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // 個人文件列表狀態
  const [myDocuments, setMyDocuments] = useState<DocumentItem[]>([])
  const [isLoadingList, setIsLoadingList] = useState(false)

  // 1. 撈取目前登入員工自己上傳的文件
  const fetchMyDocuments = useCallback(async () => {
    if (!userId) return
    setIsLoadingList(true)
    const { data, error } = await supabase
      .from('knowledge_documents')
      .select('*')
      .eq('uploader_id', userId)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setMyDocuments(data as DocumentItem[])
    }
    setIsLoadingList(false)
  }, [userId, supabase])

  useEffect(() => {
    if (isOpen && activeTab === 'list') {
      fetchMyDocuments()
    }
  }, [isOpen, activeTab, fetchMyDocuments])

  if (!isOpen) return null

  // 2. 執行上傳送審
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !file || !title.trim()) {
      setUploadMessage({ type: 'error', text: '請完整填寫標題並選擇檔案' })
      return
    }

    setIsSubmitting(true)
    setUploadMessage(null)

    try {
      // 💡 部門對應英文字夾對照表，避免 Storage Key 出現中文導致 Invalid key 報錯
      const deptFolderMap: Record<string, string> = {
        '資訊部': 'it',
        '人力資源部': 'hr',
        '財務部': 'finance',
        '業務部': 'sales',
        '總務部': 'admin',
        '風控部': 'risk',
        '數位金融部': 'digital',
      }
      const safeDeptFolder = deptFolderMap[department] || 'general'

      // A. 上傳檔案到 Supabase Storage (kb_documents)
      const fileExt = file.name.split('.').pop()
      const sanitizedFileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${safeDeptFolder}/${sanitizedFileName}`

      const { error: storageError } = await supabase.storage
        .from('kb_documents')
        .upload(filePath, file)

      if (storageError) {
        throw new Error(`檔案上傳失敗：${storageError.message}`)
      }

      // B. 寫入 knowledge_documents 資料表 (預設狀態為 pending 待審核，部門保留中文以供篩選)
      const { error: dbError } = await supabase.from('knowledge_documents').insert([
        {
          title: title.trim(),
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type || 'application/octet-stream',
          scope,
          department: department || '資訊部',
          uploader_id: userId,
          status: 'pending',
        },
      ])

      if (dbError) {
        throw new Error(`資料庫寫入失敗：${dbError.message}`)
      }

      // 上傳成功
      setUploadMessage({ type: 'success', text: '文件送審成功！已通知主管進行審核。' })
      setTitle('')
      setFile(null)

      // 1.2 秒後自動跳轉至清單頁面查看進度
      setTimeout(() => {
        setActiveTab('list')
        fetchMyDocuments()
      }, 1200)
    } catch (err: any) {
      console.error(err)
      setUploadMessage({ type: 'error', text: err.message || '上傳過程發生錯誤' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 3. 刪除自己上傳的文件
  const handleDeleteDoc = async (docId: string, filePath: string) => {
    if (!confirm('確定要刪除這筆文件嗎？若已核准將自知識庫中移除。')) return

    try {
      // 刪除 storage 檔案
      await supabase.storage.from('kb_documents').remove([filePath])
      // 刪除資料庫紀錄
      const { error } = await supabase.from('knowledge_documents').delete().eq('id', docId)

      if (error) throw error
      setMyDocuments((prev) => prev.filter((d) => d.id !== docId))
    } catch (err: any) {
      alert(`刪除失敗：${err.message}`)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[85vh]">
        {/* Modal 頂部 Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-600 rounded-lg text-sm">📤</span>
            <div>
              <h3 className="font-semibold text-sm">SOP 知識文件管理中心</h3>
              <p className="text-[11px] text-slate-400">
                部門：{department} · 操作同仁：{employeeName || '一般同仁'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* 分頁按鈕 Tab 列 */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-6 text-xs font-semibold">
          <button
            onClick={() => {
              setActiveTab('upload')
              setUploadMessage(null)
            }}
            className={`pb-3 border-b-2 transition ${
              activeTab === 'upload'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            ＋ 上傳新文件送審
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`pb-3 border-b-2 transition ${
              activeTab === 'list'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            📋 我上傳的文件與進度 ({myDocuments.length})
          </button>
        </div>

        {/* Modal 內容主體 */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'upload' ? (
            /* Tab 1：上傳表單 */
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {uploadMessage && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium ${
                    uploadMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {uploadMessage.text}
                </div>
              )}

              {/* 文件標題 */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  文件名稱 / SOP 標題 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例如：勞工法定可請假別一覽表"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* 知識庫可見範圍 (單選 Radio) */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  可見範圍設定 <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-start gap-2 p-3 rounded-xl border cursor-pointer transition ${
                      scope === 'department'
                        ? 'border-blue-500 bg-blue-50/50 text-blue-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="scope"
                      value="department"
                      checked={scope === 'department'}
                      onChange={() => setScope('department')}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="text-xs font-semibold">僅限部門內部</div>
                      <div className="text-[10px] text-slate-500">僅限【{department}】同仁於 AI 檢索時調閱</div>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2 p-3 rounded-xl border cursor-pointer transition ${
                      scope === 'public'
                        ? 'border-blue-500 bg-blue-50/50 text-blue-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="scope"
                      value="public"
                      checked={scope === 'public'}
                      onChange={() => setScope('public')}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="text-xs font-semibold">全公司公開</div>
                      <div className="text-[10px] text-slate-500">經主管核准後，全公司跨部門同仁皆可查詢</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* 檔案選擇區 */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  原始文件檔案 (PDF, DOCX, TXT) <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  required
                  accept=".pdf,.docx,.doc,.txt"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-slate-300 rounded-xl p-2"
                />
              </div>

              {/* 說明提示 */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800 leading-relaxed">
                💡 <strong>審核機制提示：</strong>文件送出後將處於「待審核」狀態，需由部門主管在後台確認內容合規並核准後，AI 方可檢索此 SOP。送審期間您隨時可在「我的文件」中撤回或刪除。
              </div>

              {/* 送出按鈕 */}
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !file}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition disabled:opacity-50 shadow-sm"
                >
                  {isSubmitting ? '正在上傳送審中...' : '確認送審文件'}
                </button>
              </div>
            </form>
          ) : (
            /* Tab 2：個人已上傳文件清單 */
            <div className="space-y-3">
              {isLoadingList ? (
                <div className="text-center py-10 text-xs text-slate-400">正在讀取文件清單...</div>
              ) : myDocuments.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-400">
                  您目前尚未上傳過任何 SOP 文件。<br />
                  點選上方「＋ 上傳新文件送審」即可建立第一份知識規章。
                </div>
              ) : (
                myDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 flex items-center justify-between gap-4 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-xs text-slate-800 truncate">
                          {doc.title}
                        </span>
                        {/* 狀態標籤 Badge */}
                        {doc.status === 'pending' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
                            待主管審核
                          </span>
                        )}
                        {doc.status === 'approved' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                            已生效納入知識庫
                          </span>
                        )}
                        {doc.status === 'rejected' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-medium">
                            已駁回
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500">
                        <span>原始檔：{doc.file_name}</span>
                        <span>·</span>
                        <span>範圍：{doc.scope === 'public' ? '全公司公開' : '僅限部門'}</span>
                        <span>·</span>
                        <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                      </div>

                      {/* 若被主管駁回，顯示主管原因 */}
                      {doc.status === 'rejected' && doc.review_comment && (
                        <div className="mt-2 text-[11px] p-2 bg-rose-50 text-rose-700 rounded-lg border border-rose-200">
                          <strong>主管退件原因：</strong>{doc.review_comment}
                        </div>
                      )}
                    </div>

                    {/* 刪除撤回按鈕 */}
                    <button
                      onClick={() => handleDeleteDoc(doc.id, doc.file_path)}
                      className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition shrink-0"
                      title="刪除此文件"
                    >
                      刪除
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}