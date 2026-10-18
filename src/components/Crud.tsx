import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface Field { key: string; label: string; area?: boolean; num?: boolean; readOnlyOnEdit?: boolean }
interface Props { table: string; fields: Field[]; cols: string[]; filter?: Record<string, string | number>; order?: string; newId?: (f: Record<string, string>) => string | undefined }
const inp = 'w-full rounded-xl border border-rose-100 bg-white px-3 py-2'

export default function Crud({ table, fields, cols, filter = {}, order = 'position', newId }: Props) {
  const [rows, setRows] = useState<any[]>([])
  const [form, setForm] = useState<Record<string, string> | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [err, setErr] = useState('')
  const fk = JSON.stringify(filter)
  const load = useCallback(async () => {
    const { data, error } = await supabase!.from(table).select('*').match(filter).order(order, { ascending: true })
    setErr(error?.message ?? ''); setRows(data ?? [])
  }, [table, fk, order])
  useEffect(() => { load(); setForm(null) }, [load])

  const open = (r?: any) => {
    setEditing(r ? r.id : null)
    setForm(Object.fromEntries(fields.map(f => [f.key, String(r?.[f.key] ?? filter[f.key] ?? '')])))
  }
  const save = async () => {
    if (!form) return
    const body: Record<string, any> = {}
    fields.forEach(f => { const v = form[f.key]; body[f.key] = v === '' ? null : f.num ? Number(v) : v })
    Object.assign(body, filter)
    let res
    if (editing) { delete body.id; res = await supabase!.from(table).update(body).eq('id', editing) }
    else { const id = newId?.(form); if (id) body.id = id; res = await supabase!.from(table).insert(body) }
    if (res.error) return setErr(res.error.message)
    setForm(null); load()
  }
  const del = async (id: string) => {
    if (!confirm('Xóa mục này? Hành động không thể hoàn tác.')) return
    const { error } = await supabase!.from(table).delete().eq('id', id)
    setErr(error?.message ?? ''); load()
  }
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center"><span className="text-sm text-ink/60">{rows.length} mục</span><button className="btn-primary !py-1.5" onClick={() => open()}>＋ Thêm</button></div>
      {err && <div className="rounded-xl bg-red-100 px-3 py-2 text-sm text-red-700">{err}</div>}
      {form && (
        <div className="card p-4 grid sm:grid-cols-2 gap-3">
          {fields.map(f => (
            <label key={f.key} className={`text-sm ${f.area ? 'sm:col-span-2' : ''}`}>{f.label}
              {f.area ? <textarea className={inp} rows={2} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
                : <input className={inp} disabled={!!editing && f.readOnlyOnEdit} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />}
            </label>))}
          <div className="sm:col-span-2 flex gap-2"><button className="btn-primary" onClick={save}>Lưu</button><button className="btn-ghost" onClick={() => setForm(null)}>Hủy</button></div>
        </div>)}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm"><thead><tr className="text-left bg-rose-50">{cols.map(c => <th key={c} className="p-2">{fields.find(f => f.key === c)?.label ?? c}</th>)}<th /></tr></thead>
          <tbody>{rows.map(r => (
            <tr key={r.id} className="border-t border-rose-100">
              {cols.map(c => <td key={c} className="p-2 max-w-[14rem] truncate font-han">{String(r[c] ?? '')}</td>)}
              <td className="p-2 whitespace-nowrap text-right"><button className="text-sky-600 mr-3" onClick={() => open(r)}>Sửa</button><button className="text-red-600" onClick={() => del(r.id)}>Xóa</button></td>
            </tr>))}</tbody></table>
      </div>
    </div>
  )
}
