'use client'
// app/admin/products/page.tsx — extended with Virtual Try-On fields

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import VariantGroupManager from '@/components/admin/VariantGroupManager'
import {
  Plus, Pencil, Trash2, X, Loader2, ImagePlus, Save,
  AlertCircle, ChevronLeft, ChevronRight, Check, Package, Camera, Ruler, Palette,
} from 'lucide-react'

type Category   = 'eyeglasses'|'sunglasses'|'contact-lenses'|'accessories'
type Gender     = 'men'|'women'|'kids'|'unisex'
type FrameType  = 'full-rim'|'half-rim'|'rimless'
type FrameShape = 'rectangle'|'round'|'square'|'oval'|'wayfarer'|'aviator'|'cat-eye'|'geometric'

const CATEGORIES:['eyeglasses','sunglasses','contact-lenses','accessories'] = ['eyeglasses','sunglasses','contact-lenses','accessories']
const GENDERS:['men','women','kids','unisex'] = ['men','women','kids','unisex']
const FRAME_TYPES:['full-rim','half-rim','rimless'] = ['full-rim','half-rim','rimless']
const SHAPES:FrameShape[] = ['rectangle','round','square','oval','wayfarer','aviator','cat-eye','geometric']
const BRANDS = ['Ray-Ban','Titan','Tommy Hilfiger','Fastrack','French Connection','Scott','Idee','Voyage','Laurel Dale','Galore Bay','Feather','John Karter','Caron','Kidstar','Red Grapes','Grey Jack','Roberto Gabriel','Para+','Tom Hardy','Daniel Hunter','Xpress','Qual','RK Parkens']
const TRYON_CATS: Category[] = ['eyeglasses','sunglasses']

interface F {
  name:string; slug:string; description:string; brand:string
  category:Category; gender:Gender; frame_type:FrameType; frame_shape:string
  frame_color:string; frame_material:string; base_price:string
  discount_percent:string; stock:string; is_active:boolean; is_featured:boolean; tags:string
  frame_width_mm:string; lens_width_mm:string; bridge_width_mm:string
  temple_length_mm:string; frame_height_mm:string
}
const empty:F = {
  name:'',slug:'',description:'',brand:'',category:'eyeglasses',gender:'unisex',
  frame_type:'full-rim',frame_shape:'',frame_color:'',frame_material:'',
  base_price:'',discount_percent:'0',stock:'10',is_active:true,is_featured:false,tags:'',
  frame_width_mm:'',lens_width_mm:'',bridge_width_mm:'',temple_length_mm:'',frame_height_mm:'',
}
const slug = (n:string) => n.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')

function BrandCombobox({value,onChange}:{value:string;onChange:(v:string)=>void}) {
  const [open,setOpen]=useState(false)
  const [q,setQ]=useState('')
  const ref=useRef<HTMLDivElement>(null)
  const list = q ? BRANDS.filter(b=>b.toLowerCase().includes(q.toLowerCase())) : BRANDS
  useEffect(()=>{
    const h=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node)){setOpen(false);setQ('')}}
    document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h)
  },[])
  return(
    <div ref={ref} className="relative z-50">
      <input type="text" value={open?q:value} placeholder={value||'SELECT BRAND...'} onFocus={()=>{setOpen(true);setQ('')}}
        onChange={e=>{setQ(e.target.value);onChange(e.target.value)}}
        className="w-full text-[11px] font-bold text-slate-900 bg-white/60 border border-slate-200/60 rounded-xl px-4 py-3.5 focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-400/10 transition-all shadow-sm uppercase tracking-widest placeholder-slate-400"/>
      {open&&(
        <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-2xl border border-white/60 shadow-xl rounded-2xl max-h-56 overflow-y-auto py-2 z-50">
          {list.length===0?<div className="px-5 py-4 text-[10px] text-slate-400 uppercase tracking-widest text-center">No match</div>
            :list.map(b=><button key={b} type="button" onClick={()=>{onChange(b);setOpen(false);setQ('')}}
              className={`w-full text-left px-5 py-3 text-[11px] font-bold uppercase tracking-widest ${value===b?'bg-slate-900 text-white':'text-slate-600 hover:bg-slate-100'}`}>{b}</button>)}
        </div>
      )}
    </div>
  )
}

const FRAME_COLORS = [
  { label: 'Black',   hex: '#1a1a1a' },
  { label: 'White',   hex: '#f5f5f5' },
  { label: 'Blue',    hex: '#2563eb' },
  { label: 'Red',     hex: '#dc2626' },
  { label: 'Green',   hex: '#16a34a' },
  { label: 'Yellow',  hex: '#eab308' },
  { label: 'Orange',  hex: '#ea580c' },
  { label: 'Purple',  hex: '#9333ea' },
  { label: 'Pink',    hex: '#ec4899' },
  { label: 'Brown',   hex: '#92400e' },
  { label: 'Gray',    hex: '#6b7280' },
  { label: 'Beige',   hex: '#d4b896' },
  { label: 'Navy',    hex: '#1e3a5f' },
  { label: 'Gold',    hex: '#b8860b' },
  { label: 'Silver',  hex: '#a8a9ad' },
  { label: 'Lavender',hex: '#b57bee' },
  { label: 'Violet',  hex: '#7c3aed' },
]

function ColorCombobox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = q
    ? FRAME_COLORS.filter(c => c.label.toLowerCase().includes(q.toLowerCase()))
    : FRAME_COLORS

  const matchedColor = FRAME_COLORS.find(c => c.label.toLowerCase() === value.toLowerCase())

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setQ('')
      }
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const select = (label: string) => {
    onChange(label)
    setOpen(false)
    setQ('')
  }

  return (
    <div ref={ref} className="relative z-40">
      <div className="relative">
        {/* Color swatch preview inside input */}
        {value && (
          <span
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-slate-200 shadow-sm flex-shrink-0"
            style={{ backgroundColor: matchedColor?.hex ?? '#e2e8f0' }}
          />
        )}
        <input
          ref={inputRef}
          type="text"
          value={open ? q : value}
          placeholder="SELECT COLOR..."
          onFocus={() => { setOpen(true); setQ('') }}
          onChange={e => { setQ(e.target.value); onChange(e.target.value); }}
          className={`w-full text-[11px] font-bold text-slate-900 bg-white/60 border border-slate-200/60 rounded-xl py-3.5 pr-10 focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-400/10 transition-all shadow-sm uppercase tracking-widest placeholder-slate-400 ${value ? 'pl-10' : 'pl-5'}`}
        />
        {/* Chevron */}
        <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-2xl border border-white/60 shadow-xl rounded-2xl overflow-hidden z-50">
          <div className="max-h-60 overflow-y-auto py-2">
            {filtered.length === 0 ? (
              <div className="px-5 py-4 text-[10px] text-slate-400 uppercase tracking-widest text-center">
                No match — press Enter to use &ldquo;{q}&rdquo;
              </div>
            ) : (
              filtered.map(c => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => select(c.label)}
                  className={`w-full flex items-center gap-3 px-5 py-3 transition-colors ${
                    value.toLowerCase() === c.label.toLowerCase()
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-slate-200/80 flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span className="text-[11px] font-bold uppercase tracking-widest">{c.label}</span>
                </button>
              ))
            )}
          </div>
          {/* Custom entry hint */}
          <div className="border-t border-slate-100 px-5 py-2.5">
            <p className="text-[9px] text-slate-400 uppercase tracking-widest">
              Not listed? Type any color name above
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminProductsPage() {
  const [products,setProducts]=useState<any[]>([])
  const [total,setTotal]=useState(0)
  const [page,setPage]=useState(0)
  const [loading,setLoading]=useState(true)
  const [showForm,setShowForm]=useState(false)
  const [editing,setEditing]=useState<any|null>(null)
  const [form,setForm]=useState<F>(empty)
  const [images,setImages]=useState<{url:string;public_id:string}[]>([])
  const [tryOnImg,setTryOnImg]=useState<{url:string;public_id:string}|null>(null)
  const [uploading,setUploading]=useState(false)
  const [uploadErr,setUploadErr]=useState<string|null>(null)
  const [tryOnUploading,setTryOnUploading]=useState(false)
  const [tryOnUploadErr,setTryOnUploadErr]=useState<string|null>(null)
  const [saving,setSaving]=useState(false)
  const [saveErr,setSaveErr]=useState<string|null>(null)
  const fileRef=useRef<HTMLInputElement>(null)
  const tryOnRef=useRef<HTMLInputElement>(null)
  const PER=20
  const sb=createClient()

  const load=async()=>{
    setLoading(true)
    const{data,count}=await sb.from('products').select('*',{count:'exact'}).order('created_at',{ascending:false}).range(page*PER,page*PER+PER-1)
    setProducts(data||[]);setTotal(count||0);setLoading(false)
  }
  useEffect(()=>{load()},[page]) // eslint-disable-line

  const openEdit=(p:any)=>{
    setEditing(p)
    setForm({
      name:p.name,slug:p.slug,description:p.description||'',brand:p.brand,
      category:p.category,gender:p.gender,frame_type:p.frame_type||'full-rim',
      frame_shape:p.frame_shape||'',frame_color:p.frame_color||'',frame_material:p.frame_material||'',
      base_price:String(p.base_price),discount_percent:String(p.discount_percent),stock:String(p.stock),
      is_active:p.is_active,is_featured:p.is_featured,tags:(p.tags||[]).join(', '),
      frame_width_mm:  p.frame_width_mm  !=null?String(p.frame_width_mm):'',
      lens_width_mm:   p.lens_width_mm   !=null?String(p.lens_width_mm):'',
      bridge_width_mm: p.bridge_width_mm !=null?String(p.bridge_width_mm):'',
      temple_length_mm:p.temple_length_mm!=null?String(p.temple_length_mm):'',
      frame_height_mm: p.frame_height_mm !=null?String(p.frame_height_mm):'',
    })
    setImages(p.images||[])
    setTryOnImg(p.try_on_image_url?{url:p.try_on_image_url,public_id:p.try_on_image_public_id||''}:null)
    setUploadErr(null);setSaveErr(null);setTryOnUploadErr(null);setShowForm(true)
  }

  const handleImages=async(files:FileList|null)=>{
    if(!files?.length)return
    if(images.length+files.length>6){alert('Max 6 images');return}
    setUploading(true);setUploadErr(null)
    const pid=editing?.id||`new_${Date.now()}`
    for(const[i,file]of Array.from(files).entries()){
      if(file.size>1_000_000){alert(`${file.name} exceeds 1MB`);continue}
      const fd=new FormData();fd.append('file',file);fd.append('productId',pid);fd.append('index',String(images.length+i))
      const res=await fetch('/api/admin/upload-image',{method:'POST',body:fd})
      if(res.ok){const d=await res.json();setImages(p=>[...p,{url:d.url,public_id:d.public_id}])}
      else{const e=await res.json().catch(()=>({}));setUploadErr(e.error||'Upload failed')}
    }
    setUploading(false);if(fileRef.current)fileRef.current.value=''
  }

  const handleTryOnUpload=async(files:FileList|null)=>{
    const file=files?.[0];if(!file)return
    if(!['image/png','image/webp'].includes(file.type)){setTryOnUploadErr('Only PNG or WebP accepted');return}
    if(file.size>3_000_000){setTryOnUploadErr('Must be under 3MB');return}
    setTryOnUploading(true);setTryOnUploadErr(null)
    const fd=new FormData();fd.append('file',file);fd.append('productId',editing?.id||`new_${Date.now()}`)
    const res=await fetch('/api/admin/upload-tryon-image',{method:'POST',body:fd})
    if(res.ok){const d=await res.json();setTryOnImg({url:d.url,public_id:d.public_id})}
    else{const e=await res.json().catch(()=>({}));setTryOnUploadErr(e.error||'Upload failed')}
    setTryOnUploading(false);if(tryOnRef.current)tryOnRef.current.value=''
  }

  const save=async()=>{
    if(!form.name||!form.brand||!form.base_price){alert('Name, Brand and Price required');return}
    setSaving(true);setSaveErr(null)
    const payload:Record<string,unknown>={
      name:form.name.trim(),slug:form.slug||slug(form.name),description:form.description||null,
      brand:form.brand.trim(),category:form.category,gender:form.gender,
      frame_type:form.frame_type||null,frame_shape:form.frame_shape||null,
      frame_color:form.frame_color||null,frame_material:form.frame_material||null,
      base_price:parseFloat(form.base_price),discount_percent:parseFloat(form.discount_percent)||0,
      stock:parseInt(form.stock)||0,is_active:form.is_active,is_featured:form.is_featured,
      tags:form.tags?form.tags.split(',').map(t=>t.trim()).filter(Boolean):[],
      images:images.map((img,i)=>({url:img.url,public_id:img.public_id,is_primary:i===0})),
      frame_width_mm:  form.frame_width_mm  ?parseFloat(form.frame_width_mm)  :null,
      lens_width_mm:   form.lens_width_mm   ?parseFloat(form.lens_width_mm)   :null,
      bridge_width_mm: form.bridge_width_mm ?parseFloat(form.bridge_width_mm) :null,
      temple_length_mm:form.temple_length_mm?parseFloat(form.temple_length_mm):null,
      frame_height_mm: form.frame_height_mm ?parseFloat(form.frame_height_mm) :null,
      try_on_image_url:      tryOnImg?.url       ??null,
      try_on_image_public_id:tryOnImg?.public_id ??null,
    }
    try{
      const res=editing
        ?await fetch('/api/admin/products',{method:'PUT', headers:{'Content-Type':'application/json'},body:JSON.stringify({id:editing.id,...payload})})
        :await fetch('/api/admin/products',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
      if(!res.ok){const b=await res.json().catch(()=>({}));setSaveErr(b.error||`Error ${res.status}`);setSaving(false);return}
    }catch(e){setSaveErr(e instanceof Error?e.message:'Network error');setSaving(false);return}
    setSaving(false);setShowForm(false);setEditing(null);setForm(empty);setImages([]);setTryOnImg(null);load()
  }

  const sf=(k:keyof F,v:string|boolean)=>setForm(f=>({...f,[k]:v,...(k==='name'&&!editing?{slug:slug(v as string)}:{})}))
  const showTryOn=TRYON_CATS.includes(form.category)

  return(
    <div className="max-w-[1400px] mx-auto w-full relative z-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-6 border-b border-slate-200/50 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-white/60 backdrop-blur-md rounded-xl shadow-sm border border-white"><Package size={18} strokeWidth={2} className="text-slate-500"/></div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400 font-bold">Inventory Management</p>
          </div>
          <h1 className="text-4xl md:text-5xl font-light text-slate-900 tracking-tight mb-3" style={{fontFamily:'Didot,"Bodoni MT","Playfair Display",Times,serif'}}>Boutique Catalog</h1>
          <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-slate-500">{total} Registered Items</p>
        </div>
        <button onClick={()=>{setEditing(null);setForm(empty);setImages([]);setTryOnImg(null);setUploadErr(null);setSaveErr(null);setShowForm(true)}}
          className="flex items-center gap-2.5 px-6 py-4 rounded-xl bg-slate-900 text-white text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-slate-800 transition-all shadow-lg">
          <Plus size={16} strokeWidth={2.5}/>New Entry
        </button>
      </div>

      {/* Table */}
      <div className="bg-white/60 backdrop-blur-3xl border border-white/80 shadow-sm rounded-[2.5rem] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left min-w-[900px]">
            <thead className="border-b border-slate-200/50 bg-white/40">
              <tr>{['Item','Classification','Price','Stock','Try-On','Status','Actions'].map((h,i)=>(
                <th key={h} className={`py-5 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 ${i===0?'px-8':'px-6'}`}>{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60">
              {loading?Array.from({length:5}).map((_,i)=>(
                <tr key={i} className="animate-pulse">{Array.from({length:7}).map((_,j)=>(
                  <td key={j} className={`py-6 ${j===0?'px-8':'px-6'}`}><div className="h-3 bg-slate-200/60 rounded-full"/></td>
                ))}</tr>
              )):products.length===0?(
                <tr><td colSpan={7} className="px-6 py-24 text-center">
                  <AlertCircle size={32} strokeWidth={1.5} className="text-slate-300 mx-auto mb-4"/>
                  <p className="text-[11px] uppercase tracking-widest text-slate-400">No products yet</p>
                </td></tr>
              ):products.map(p=>(
                <tr key={p.id} className="hover:bg-white/80 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      {p.images?.[0]
                        ?<div className="w-14 h-14 rounded-2xl border border-slate-200/60 bg-white p-1.5 shadow-sm flex-shrink-0"><img src={p.images[0].url} alt="" className="w-full h-full object-contain"/></div>
                        :<div className="w-14 h-14 rounded-2xl border border-slate-200/60 bg-slate-50 flex-shrink-0"/>
                      }
                      <div><p className="font-bold text-xs text-slate-900 uppercase tracking-wide line-clamp-1">{p.name}</p><p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mt-0.5">{p.brand}</p></div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-500">{p.category.replace(/-/g,' ')}</td>
                  <td className="px-6 py-5 font-bold text-slate-900">₹{p.final_price?.toLocaleString('en-IN')}</td>
                  <td className="px-6 py-5">
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg border ${p.stock<=5?'bg-rose-50 border-rose-200 text-rose-600':'bg-white border-slate-200 text-slate-600'}`}>
                      {p.stock<=5&&<AlertCircle size={11} strokeWidth={2.5}/>}{p.stock} units
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[9px] font-bold uppercase tracking-widest ${
                      p.try_on_image_url?'bg-emerald-50 border-emerald-200 text-emerald-700':p.frame_width_mm?'bg-amber-50 border-amber-200 text-amber-700':'bg-slate-50 border-slate-200 text-slate-400'}`}>
                      <Camera size={10} strokeWidth={2.5}/>
                      {p.try_on_image_url?'Ready':p.frame_width_mm?'Dims':'None'}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-lg border text-[9px] font-bold uppercase tracking-widest ${p.is_active?'bg-emerald-50 border-emerald-200 text-emerald-700':'bg-slate-50 border-slate-200 text-slate-500'}`}>
                      {p.is_active?'Active':'Archived'}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex gap-2">
                      <button onClick={()=>openEdit(p)} className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-900 hover:shadow-md transition-all"><Pencil size={14} strokeWidth={2.5}/></button>
                      <button onClick={async()=>{if(!confirm('Archive?'))return;await sb.from('products').update({is_active:false}).eq('id',p.id);load()}}
                        className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-all"><Trash2 size={14} strokeWidth={2.5}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total>PER&&(
          <div className="px-8 py-5 border-t border-slate-200/50 flex items-center justify-between bg-white/40">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Showing {page*PER+1}–{Math.min((page+1)*PER,total)} of {total}</p>
            <div className="flex gap-2">
              <button disabled={page===0} onClick={()=>setPage(p=>p-1)} className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-30 hover:border-slate-300 transition-all"><ChevronLeft size={16} strokeWidth={2.5}/></button>
              <button disabled={(page+1)*PER>=total} onClick={()=>setPage(p=>p+1)} className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-30 hover:border-slate-300 transition-all"><ChevronRight size={16} strokeWidth={2.5}/></button>
            </div>
          </div>
        )}
      </div>

      {/* ── Form Drawer ────────────────────────────────────────── */}
      {showForm&&(
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white/95 backdrop-blur-3xl w-full max-w-4xl max-h-[95vh] overflow-hidden shadow-2xl border border-white sm:rounded-[2.5rem] flex flex-col animate-in slide-in-from-bottom-8 duration-500">

            {/* Drawer header */}
            <div className="bg-white/60 border-b border-slate-200/50 px-8 py-7 flex items-start justify-between flex-shrink-0">
              <div>
                <p className="text-[9px] uppercase tracking-[0.25em] text-slate-500 mb-2 font-bold">Item Configuration</p>
                <h2 className="text-3xl text-slate-900 tracking-tight" style={{fontFamily:'Didot,"Bodoni MT","Playfair Display",Times,serif'}}>
                  {editing?'Modify Entry':'New Entry'}
                </h2>
              </div>
              <button onClick={()=>setShowForm(false)} className="text-slate-400 hover:text-slate-900 p-2.5 bg-white rounded-full shadow-sm border border-slate-100 hover:bg-slate-50 transition-all">
                <X size={18} strokeWidth={2}/>
              </button>
            </div>

            {/* Scrollable body */}
            <div className="p-6 md:p-10 overflow-y-auto space-y-8 flex-1">

              {saveErr&&(
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start justify-between">
                  <div className="flex items-start gap-3"><AlertCircle size={16} strokeWidth={2.5} className="text-rose-600 mt-0.5 flex-shrink-0"/><p className="text-[11px] text-rose-800">{saveErr}</p></div>
                  <button onClick={()=>setSaveErr(null)}><X size={14} strokeWidth={2} className="text-rose-400"/></button>
                </div>
              )}

              {/* Images */}
              <section className="bg-white/50 p-7 rounded-3xl border border-white shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <label className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                    <div className="p-1.5 bg-white shadow-sm border border-slate-100 rounded-lg"><ImagePlus size={14} strokeWidth={2} className="text-slate-500"/></div>
                    Product Images
                  </label>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 bg-white/60 px-3 py-1.5 rounded-lg border border-slate-100">Max 6 · WebP/JPG · &lt;1MB</span>
                </div>
                {uploadErr&&<div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start justify-between"><div className="flex gap-3"><AlertCircle size={13} className="text-rose-600 mt-0.5 flex-shrink-0"/><span className="text-[10px] text-rose-800">{uploadErr}</span></div><button onClick={()=>setUploadErr(null)}><X size={13} className="text-rose-400"/></button></div>}
                <div className="flex flex-wrap gap-4">
                  {images.map((img,i)=>(
                    <div key={i} className="relative w-24 h-24 rounded-2xl border border-slate-200 bg-white group shadow-sm hover:shadow-md transition-all">
                      <img src={img.url} alt="" className="w-full h-full object-contain p-2 rounded-2xl"/>
                      {i===0&&<span className="absolute top-1.5 left-1.5 text-[7px] bg-slate-900/90 text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-widest">Primary</span>}
                      <button onClick={()=>setImages(p=>p.filter((_,j)=>j!==i))} className="absolute -top-2.5 -right-2.5 w-7 h-7 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm z-10"><X size={13} strokeWidth={2.5}/></button>
                    </div>
                  ))}
                  {images.length<6&&(
                    <button onClick={()=>fileRef.current?.click()} disabled={uploading}
                      className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 bg-white/40 flex flex-col items-center justify-center text-slate-400 hover:border-slate-500 hover:bg-white transition-all">
                      {uploading?<Loader2 size={18} strokeWidth={2.5} className="animate-spin"/>:<><Plus size={18} strokeWidth={2.5}/><span className="text-[9px] font-bold uppercase tracking-widest mt-2">Upload</span></>}
                    </button>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/webp,image/jpeg,image/jpg,image/png" multiple className="hidden" onChange={e=>handleImages(e.target.files)}/>
              </section>

              {/* Basic details */}
              <section className="bg-white/50 p-7 rounded-3xl border border-white shadow-sm space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="sm:col-span-2">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Name</label>
                    <input type="text" value={form.name} onChange={e=>sf('name',e.target.value)} className={cls}/>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-2">URL Slug</label>
                    <input type="text" value={form.slug} onChange={e=>sf('slug',e.target.value)} className={cls.replace('font-medium','font-mono text-[11px]')}/>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Brand</label>
                    <BrandCombobox value={form.brand} onChange={v=>sf('brand',v)}/>
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Description</label>
                  <textarea value={form.description} onChange={e=>sf('description',e.target.value)} rows={3}
                    className={`${cls} resize-none leading-relaxed`}/>
                </div>
              </section>

              {/* Specifications */}
              <section className="bg-white/50 p-7 rounded-3xl border border-white shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {([
                    {k:'category' as const,label:'Category',opts:CATEGORIES},
                    {k:'gender'   as const,label:'Gender',  opts:GENDERS},
                    {k:'frame_type' as const, label:'Frame Type', opts:FRAME_TYPES},
                    {k:'frame_shape' as const,label:'Frame Shape',opts:SHAPES},
                  ]).map(f=>(
                    <div key={f.k}>
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-2">{f.label}</label>
                      <div className="relative">
                        <select value={form[f.k]} onChange={e=>sf(f.k,e.target.value)}
                          className="w-full text-[11px] font-bold uppercase tracking-widest text-slate-900 bg-white/60 border border-slate-200/60 rounded-xl px-5 py-4 pr-10 focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-400/10 transition-all shadow-sm appearance-none cursor-pointer">
                          <option value="">SELECT...</option>
                          {f.opts.map(o=><option key={o} value={o}>{o.replace(/-/g,' ')}</option>)}
                        </select>
                        <div className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2">
                          <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Frame Color</label>
                    <ColorCombobox value={form.frame_color} onChange={v=>sf('frame_color',v)}/>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Frame Material</label>
                    <input type="text" value={form.frame_material} onChange={e=>sf('frame_material',e.target.value)} className={cls}/>
                  </div>
                </div>
              </section>

              {/* Pricing */}
              <section className="bg-white/50 p-7 rounded-3xl border border-white shadow-sm space-y-6">
                <div className="grid grid-cols-3 gap-5">
                  {([{k:'base_price' as const,l:'Price (₹)'},{k:'discount_percent' as const,l:'Discount %'},{k:'stock' as const,l:'Stock'}]).map(f=>(
                    <div key={f.k}>
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-2">{f.l}</label>
                      <input type="number" min="0" value={form[f.k]} onChange={e=>sf(f.k,e.target.value)} className="w-full text-[13px] font-mono font-bold text-slate-900 bg-white/60 border border-slate-200/60 rounded-xl px-5 py-4 focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-400/10 transition-all shadow-sm"/>
                    </div>
                  ))}
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Tags (comma separated)</label>
                  <input type="text" value={form.tags} onChange={e=>sf('tags',e.target.value)} placeholder="TRENDING, SUMMER, BESTSELLER" className={`${cls} uppercase tracking-widest`}/>
                </div>
                <div className="flex gap-4 pt-2 border-t border-slate-200/50">
                  {([{k:'is_active' as const,l:'Active (Publicly Visible)'},{k:'is_featured' as const,l:'Featured on Homepage'}]).map(f=>(
                    <label key={f.k} className="flex-1 flex items-center gap-3 cursor-pointer bg-white/60 px-5 py-4 rounded-xl border border-slate-200 hover:bg-white hover:shadow-md transition-all">
                      <div className={`relative flex items-center justify-center w-6 h-6 rounded-md border transition-all ${form[f.k]?'bg-slate-900 border-slate-900':'bg-white border-slate-300'}`}>
                        <input type="checkbox" checked={form[f.k] as boolean} onChange={e=>sf(f.k,e.target.checked)} className="absolute opacity-0 cursor-pointer w-full h-full"/>
                        {form[f.k]&&<Check size={14} strokeWidth={3} className="text-white"/>}
                      </div>
                      <span className="text-[10px] uppercase tracking-widest font-bold text-slate-700">{f.l}</span>
                    </label>
                  ))}
                </div>
              </section>

              {/* ── Virtual Try-On Section ─────────────────────── */}
              {showTryOn&&(
                <section className="bg-white/50 p-7 rounded-3xl border border-white shadow-sm">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white shadow-sm border border-slate-100 rounded-xl"><Camera size={16} strokeWidth={2} className="text-slate-500"/></div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em]">Virtual Try-On</p>
                        <p className="text-[9px] text-slate-400 font-light mt-0.5">Dimensions drive accurate scaling · transparent PNG enables overlay</p>
                      </div>
                    </div>
                    <span className="flex-shrink-0 text-[8px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700">Optional</span>
                  </div>
                  <div className="mb-7 mt-4 p-4 bg-slate-50/80 border border-slate-200/60 rounded-2xl">
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      <span className="font-bold text-slate-700">These fields are optional.</span> Fill them only if you want this product to display the <span className="font-bold">Virtual Try-On</span> button on the storefront. Products without any try-on data will not show the Try-On button.
                    </p>
                  </div>

                  {/* Dimension inputs */}
                  <div className="mb-7">
                    <div className="flex items-center gap-2 mb-4">
                      <Ruler size={11} strokeWidth={2} className="text-slate-400"/>
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">Frame Dimensions (mm) <span className="text-slate-300 normal-case font-normal tracking-normal">— optional, improves scaling accuracy</span></p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                      {([
                        {k:'frame_width_mm'   as const,l:'Frame Width',   hint:'130–148'},
                        {k:'lens_width_mm'    as const,l:'Lens Width',    hint:'46–56'},
                        {k:'bridge_width_mm'  as const,l:'Bridge',        hint:'14–22'},
                        {k:'temple_length_mm' as const,l:'Temple',        hint:'135–150'},
                        {k:'frame_height_mm'  as const,l:'Height',        hint:'32–54'},
                      ]).map(f=>(
                        <div key={f.k}>
                          <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">{f.l}</label>
                          <div className="relative">
                            <input type="number" min="0" step="0.1" value={form[f.k]} onChange={e=>sf(f.k,e.target.value)} placeholder={f.hint}
                              className="w-full text-[12px] font-mono font-bold text-slate-900 bg-white/70 border border-slate-200/60 rounded-xl px-4 py-3.5 pr-9 focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-400/10 transition-all shadow-sm placeholder-slate-300"/>
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-300">mm</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[9px] text-slate-400 mt-3 font-light leading-relaxed">
                      Tip: measurements printed on inner temple arm e.g. &ldquo;52□18-145&rdquo; = lens width □ bridge - temple length.
                    </p>
                  </div>

                  {/* Try-on image */}
                  <div className="border-t border-slate-200/50 pt-7">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">Try-On Overlay Image</p>
                      <span className="text-[8px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-700">Optional</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-light mb-5 leading-relaxed">
                      Transparent PNG or WebP, front-facing, horizontally centred. Max 3 MB.
                    </p>
                    {tryOnUploadErr&&(
                      <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start justify-between">
                        <div className="flex gap-3"><AlertCircle size={13} className="text-rose-600 mt-0.5 flex-shrink-0"/><span className="text-[10px] text-rose-800">{tryOnUploadErr}</span></div>
                        <button onClick={()=>setTryOnUploadErr(null)}><X size={13} className="text-rose-400"/></button>
                      </div>
                    )}
                    <div className="flex items-start gap-5 flex-wrap">
                      {tryOnImg&&(
                        <div className="relative group w-40 h-28 rounded-2xl border border-slate-200 bg-[repeating-conic-gradient(#f1f5f9_0%_25%,transparent_0%_50%)] bg-[size:16px_16px] shadow-sm overflow-hidden flex-shrink-0">
                          <img src={tryOnImg.url} alt="" className="w-full h-full object-contain p-2"/>
                          <span className="absolute top-2 left-2 text-[8px] bg-emerald-600/90 text-white px-2 py-0.5 rounded font-bold uppercase tracking-widest">Set</span>
                          <button onClick={()=>setTryOnImg(null)}
                            className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm"><X size={12} strokeWidth={2.5}/></button>
                        </div>
                      )}
                      <button onClick={()=>tryOnRef.current?.click()} disabled={tryOnUploading}
                        className="h-28 px-8 rounded-2xl border-2 border-dashed border-slate-300 bg-white/40 flex flex-col items-center justify-center text-slate-400 hover:border-slate-500 hover:bg-white hover:text-slate-700 transition-all shadow-sm min-w-[110px]">
                        {tryOnUploading?<Loader2 size={18} strokeWidth={2.5} className="animate-spin"/>:<>
                          <Camera size={18} strokeWidth={1.75}/>
                          <span className="text-[9px] font-bold uppercase tracking-widest mt-2">{tryOnImg?'Replace':'Upload PNG'}</span>
                        </>}
                      </button>
                    </div>
                    <input ref={tryOnRef} type="file" accept="image/png,image/webp" className="hidden" onChange={e=>handleTryOnUpload(e.target.files)}/>
                  </div>
                </section>
              )}

              {/* ── Product Variant Linking Section (Optional) ─── */}
              {editing ? (
                <VariantGroupManager productId={editing.id} productName={form.name || editing.name} />
              ) : (
                <section className="bg-white/50 p-7 rounded-3xl border border-white shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-white shadow-sm border border-slate-100 rounded-xl"><Palette size={16} strokeWidth={2} className="text-slate-400"/></div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em]">Product Variant Linking</p>
                      <p className="text-[9px] text-slate-400 font-light mt-0.5">Save this product first, then reopen it to link color variants.</p>
                    </div>
                  </div>
                </section>
              )}

              {/* Submit */}
              <div className="pb-4">
                <button onClick={save} disabled={saving}
                  className="w-full py-5 rounded-2xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-[11px] uppercase tracking-[0.25em] font-bold transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5 flex items-center justify-center gap-3">
                  {saving?<><Loader2 size={18} strokeWidth={2.5} className="animate-spin"/>Saving...</>:<><Save size={18} strokeWidth={2.5}/>{editing?'Update Entry':'Publish Entry'}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const cls = "w-full text-[12px] font-medium text-slate-900 bg-white/60 border border-slate-200/60 rounded-xl px-5 py-4 focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-400/10 transition-all shadow-sm placeholder-slate-400"