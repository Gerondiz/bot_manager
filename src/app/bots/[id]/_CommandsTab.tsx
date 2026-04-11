'use client'

import { useEffect, useState } from 'react'

interface BotCommand {
  command: string
  description: string
}

export default function CommandsTab({ botId, token }: { botId: string; token: string }) {
  const [commands, setCommands] = useState<BotCommand[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editCmd, setEditCmd] = useState('')
  const [editDesc, setEditDesc] = useState('')

  const fetchCommands = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/bots/${botId}/commands`)
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setCommands(data.commands || [])
    } catch {
      setCommands([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCommands() }, [botId])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/bots/${botId}/commands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commands }),
      })
      if (!res.ok) throw new Error('Failed')
      setEditingIdx(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (idx: number) => {
    const newCmds = [...commands]
    newCmds.splice(idx, 1)
    setCommands(newCmds)
  }

  const handleAdd = () => {
    setCommands([...commands, { command: '', description: '' }])
    setEditingIdx(commands.length)
  }

  const handleDeleteAll = async () => {
    if (!confirm('Удалить все команды?')) return
    try {
      const res = await fetch(`/api/bots/${botId}/commands`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      setCommands([])
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed')
    }
  }

  const startEdit = (idx: number) => {
    setEditingIdx(idx)
    setEditCmd(commands[idx].command)
    setEditDesc(commands[idx].description)
  }

  const saveEdit = () => {
    let cmd = editCmd
    if (!cmd.startsWith('/')) cmd = '/' + cmd
    const newCmds = [...commands]
    newCmds[editingIdx!] = { command: cmd.replace('/', ''), description: editDesc }
    setCommands(newCmds)
    setEditingIdx(null)
  }

  if (loading) return (
    <div className="card p-8 flex items-center justify-center">
      <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Команды бота — что отображается при вводе / в Telegram</p>
        <div className="flex items-center gap-2">
          <button onClick={handleAdd} className="btn btn-secondary text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Добавить
          </button>
          {commands.length > 0 && (
            <button onClick={handleDeleteAll} className="btn btn-ghost text-sm text-red-600 hover:text-red-700">
              Удалить все
            </button>
          )}
        </div>
      </div>

      {commands.length === 0 ? (
        <div className="card p-8 text-center">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
          </svg>
          <h3 className="text-sm font-medium text-gray-600">Команды не настроены</h3>
          <p className="text-xs text-gray-400 mt-1">Нажмите «Добавить» чтобы создать команду</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {/* Header */}
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center gap-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <span className="w-8">#</span>
            <span className="w-40">Команда</span>
            <span className="flex-1">Описание</span>
            <span className="w-20">Действия</span>
          </div>

          <div className="divide-y divide-gray-100">
            {commands.map((cmd, idx) => (
              <div key={idx} className="px-4 py-3 flex items-center gap-3">
                <span className="text-xs text-gray-400 w-8">{idx + 1}</span>

                {editingIdx === idx ? (
                  <>
                    <input
                      type="text"
                      value={editCmd}
                      onChange={(e) => setEditCmd(e.target.value)}
                      placeholder="command"
                      className="input w-40 text-sm"
                    />
                    <input
                      type="text"
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      placeholder="Описание команды"
                      className="input flex-1 text-sm"
                    />
                    <button onClick={saveEdit} className="text-emerald-600 hover:text-emerald-700 text-sm font-medium">
                      ✓
                    </button>
                    <button onClick={() => setEditingIdx(null)} className="text-gray-400 hover:text-gray-600 text-sm font-medium">
                      ✕
                    </button>
                  </>
                ) : (
                  <>
                    <code className="w-40 text-sm font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">/{cmd.command}</code>
                    <span className="flex-1 text-sm text-gray-600">{cmd.description}</span>
                    <div className="flex items-center gap-1 w-20">
                      <button onClick={() => startEdit(idx)} className="text-gray-400 hover:text-blue-600 p-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(idx)} className="text-gray-400 hover:text-red-600 p-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving || commands.length === 0}
              className="btn btn-primary text-sm disabled:opacity-50"
            >
              {saving ? 'Сохранение...' : 'Сохранить команды'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
