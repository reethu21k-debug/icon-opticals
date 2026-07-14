'use client'
// app/admin/products/page.tsx — extended with Virtual Try-On fields

import { useState, useEffect, useRef, type DragEvent } from 'react'
import { createClient } from '@/lib/supabase'
import VariantGroupManager from '@/components/admin/VariantGroupManager'
import {
  Plus, Pencil, Trash2, X, Loader2, ImagePlus, Save,
  AlertCircle, ChevronLeft, ChevronRight, Check, Package, Camera, Ruler, Palette,
  Archive, RotateCcw, XCircle,
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

// --- Shared Premium UI Classes ---
const inputClasses = "w-full text-[12px] font-medium text-slate-900 bg-white/60 border border-slate-200/50 rounded-2xl px-5 py-4 focus:outline-none focus:border-slate-800 focus:ring-4 focus:ring-slate-900/5 transition-all duration-300 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.02)] placeholder-slate-400 hover:bg-white/80"
const labelClasses = "text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] block mb-2.5 ml-1"
const sectionClasses = "bg-white/40 backdrop-blur-2xl p-8 sm:p-10 rounded-[2rem] border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden"

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
        className={`${inputClasses} uppercase tracking-widest text-[11px] font-bold`} />
      {open&&(
        <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-3xl border border-white shadow-2xl rounded-2xl max-h-56 overflow-y-auto py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
          {list.length===0?<div className="px-5 py-4 text-[10px] text-slate-400 uppercase tracking-widest text-center">No match</div>
            :list.map(b=><button key={b} type="button" onClick={()=>{onChange(b);setOpen(false);setQ('')}}
              className={`w-full text-left px-5 py-3 text-[11px] font-bold uppercase tracking-widest transition-colors ${value===b?'bg-slate-900 text-white':'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>{b}</button>)}
        </div>
      )}
    </div>
  )
}

const FRAME_COLORS = [
  { label: 'Black',   hex: '#1a1a1a' }, { label: 'White',   hex: '#f5f5f5' },
  { label: 'Blue',    hex: '#2563eb' }, { label: 'Red',     hex: '#dc2626' },
  { label: 'Green',   hex: '#16a34a' }, { label: 'Yellow',  hex: '#eab308' },
  { label: 'Orange',  hex: '#ea580c' }, { label: 'Purple',  hex: '#9333ea' },
  { label: 'Pink',    hex: '#ec4899' }, { label: 'Brown',   hex: '#92400e' },
  { label: 'Gray',    hex: '#6b7280' }, { label: 'Beige',   hex: '#d4b896' },
  { label: 'Navy',    hex: '#1e3a5f' }, { label: 'Gold',    hex: '#b8860b' },
  { label: 'Silver',  hex: '#a8a9ad' }, { label: 'Lavender',hex: '#b57bee' },
  { label: 'Violet',  hex: '#7c3aed' },
]

function ColorCombobox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const filtered = q ? FRAME_COLORS.filter(c => c.label.toLowerCase().includes(q.toLowerCase())) : FRAME_COLORS
  const matchedColor = FRAME_COLORS.find(c => c.label.toLowerCase() === value.toLowerCase())

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQ('') } }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const select = (label: string) => { onChange(label); setOpen(false); setQ('') }

  return (
    <div ref={ref} className="relative z-40">
      <div className="relative group">
        {value && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-slate-200 shadow-sm flex-shrink-0 transition-transform group-hover:scale-110"
            style={{ backgroundColor: matchedColor?.hex ?? '#e2e8f0' }} />
        )}
        <input type="text" value={open ? q : value} placeholder="SELECT COLOR..." onFocus={() => { setOpen(true); setQ('') }}
          onChange={e => { setQ(e.target.value); onChange(e.target.value); }}
          className={`${inputClasses} uppercase tracking-widest text-[11px] font-bold pr-10 ${value ? 'pl-11' : 'pl-5'}`} />
        <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-3xl border border-white shadow-2xl rounded-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="max-h-60 overflow-y-auto py-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
            {filtered.length === 0 ? (
              <div className="px-5 py-4 text-[10px] text-slate-400 uppercase tracking-widest text-center">No match — press Enter to use &ldquo;{q}&rdquo;</div>
            ) : (
              filtered.map(c => (
                <button key={c.label} type="button" onClick={() => select(c.label)}
                  className={`w-full flex items-center gap-3 px-5 py-3 transition-all duration-200 ${value.toLowerCase() === c.label.toLowerCase() ? 'bg-slate-900 text-white pl-6' : 'text-slate-600 hover:bg-slate-50 hover:pl-6'}`}>
                  <span className="w-4 h-4 rounded-full border border-slate-200/80 flex-shrink-0 shadow-sm" style={{ backgroundColor: c.hex }} />
                  <span className="text-[11px] font-bold uppercase tracking-widest">{c.label}</span>
                </button>
              ))
            )}
          </div>
          <div className="border-t border-slate-100 px-5 py-3 bg-slate-50/50">
            <p className="text-[9px] text-slate-400 uppercase tracking-widest text-center">Not listed? Type any color above</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminProductsPage() {
  const [products,setProducts]=useState<any[]>([])
  const [total,setTotal]=useState(0)
  const [activeCount,setActiveCount]=useState(0)
  const [archivedCount,setArchivedCount]=useState(0)
  const [statusTab,setStatusTab]=useState<'active'|'archived'>('active')
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
  const [imgDragOver,setImgDragOver]=useState(false)
  const [tryOnDragOver,setTryOnDragOver]=useState(false)
  const PER=20
  const sb=createClient()

  const load=async()=>{
    setLoading(true)
    const{data,count}=await sb.from('products').select('*',{count:'exact'})
      .eq('is_active',statusTab==='active')
      .order('created_at',{ascending:false}).range(page*PER,page*PER+PER-1)
    setProducts(data||[]);setTotal(count||0)
    const[{count:activeN},{count:archivedN}]=await Promise.all([
      sb.from('products').select('*',{count:'exact',head:true}).eq('is_active',true),
      sb.from('products').select('*',{count:'exact',head:true}).eq('is_active',false),
    ])
    setActiveCount(activeN||0);setArchivedCount(archivedN||0)
    setLoading(false)
  }
  useEffect(()=>{load()},[page,statusTab]) // eslint-disable-line
  useEffect(()=>{setPage(0)},[statusTab])

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

  const onImgDragOver=(e:DragEvent)=>{e.preventDefault();e.stopPropagation();if(!uploading)setImgDragOver(true)}
  const onImgDragLeave=(e:DragEvent)=>{e.preventDefault();e.stopPropagation();setImgDragOver(false)}
  const onImgDrop=(e:DragEvent)=>{ e.preventDefault();e.stopPropagation();setImgDragOver(false); if(uploading)return; handleImages(e.dataTransfer.files) }

  const onTryOnDragOver=(e:DragEvent)=>{e.preventDefault();e.stopPropagation();if(!tryOnUploading)setTryOnDragOver(true)}
  const onTryOnDragLeave=(e:DragEvent)=>{e.preventDefault();e.stopPropagation();setTryOnDragOver(false)}
  const onTryOnDrop=(e:DragEvent)=>{ e.preventDefault();e.stopPropagation();setTryOnDragOver(false); if(tryOnUploading)return; handleTryOnUpload(e.dataTransfer.files) }

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
      try_on_image_url:      tryOnImg?.url      ??null,
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
    <div className="max-w-[1400px] mx-auto w-full relative z-10 selection:bg-slate-200">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-6 pb-8">
        <div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-2.5 bg-white/60 backdrop-blur-xl rounded-2xl shadow-sm border border-white"><Package size={18} strokeWidth={1.5} className="text-slate-900"/></div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500 font-bold">Inventory Management</p>
          </div>
          <h1 className="text-4xl md:text-5xl font-light text-slate-900 tracking-tight mb-3" style={{fontFamily:'Didot,"Bodoni MT","Playfair Display",Times,serif'}}>
            Boutique Catalog
          </h1>
          <p className="text-[11px] uppercase tracking-[0.25em] font-bold text-slate-400">{total} {statusTab==='active'?'Registered':'Archived'} Items</p>
        </div>
        <button onClick={()=>{setEditing(null);setForm(empty);setImages([]);setTryOnImg(null);setUploadErr(null);setSaveErr(null);setShowForm(true)}}
          className="group flex items-center gap-3 px-7 py-4 rounded-2xl bg-slate-900 text-white text-[10px] uppercase tracking-[0.25em] font-bold hover:bg-slate-800 hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300">
          <Plus size={16} strokeWidth={2} className="transition-transform group-hover:rotate-90 duration-500"/>
          New Entry
        </button>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={()=>setStatusTab('active')}
          className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] border transition-all duration-300 ${
            statusTab==='active'?'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20':'bg-white/50 text-slate-500 border-slate-200 hover:bg-white hover:text-slate-800'}`}>
          <Package size={13} strokeWidth={2}/> Active <span className={`px-2 py-0.5 rounded-lg text-[9px] ${statusTab==='active'?'bg-white/20':'bg-slate-100'}`}>{activeCount}</span>
        </button>
        <button onClick={()=>setStatusTab('archived')}
          className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] border transition-all duration-300 ${
            statusTab==='archived'?'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20':'bg-white/50 text-slate-500 border-slate-200 hover:bg-white hover:text-slate-800'}`}>
          <Archive size={13} strokeWidth={2}/> Archived <span className={`px-2 py-0.5 rounded-lg text-[9px] ${statusTab==='archived'?'bg-white/20':'bg-slate-100'}`}>{archivedCount}</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white/40 backdrop-blur-2xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] overflow-hidden">
        <div className="overflow-x-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
          <table className="w-full text-sm text-left min-w-[1000px]">
            <thead className="border-b border-slate-200/50 bg-white/40 backdrop-blur-md">
              <tr>{['Item','Classification','Price','Stock','Try-On','Status','Actions'].map((h,i)=>(
                <th key={h} className={`py-6 text-[9px] font-bold uppercase tracking-[0.25em] text-slate-400 ${i===0?'px-10':'px-6'}`}>{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60">
              {loading?Array.from({length:5}).map((_,i)=>(
                <tr key={i} className="animate-pulse">{Array.from({length:7}).map((_,j)=>(
                  <td key={j} className={`py-7 ${j===0?'px-10':'px-6'}`}><div className="h-2 bg-slate-200/60 rounded-full w-2/3"/></td>
                ))}</tr>
              )):products.length===0?(
                <tr><td colSpan={7} className="px-6 py-32 text-center">
                  <AlertCircle size={32} strokeWidth={1} className="text-slate-300 mx-auto mb-5"/>
                  <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-slate-400">{statusTab==='active'?'No active products':'No archived products'}</p>
                </td></tr>
              ):products.map(p=>(
                <tr key={p.id} className="hover:bg-white/80 transition-colors duration-300 group">
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-5">
                      {p.images?.[0]
                        ?<div className="w-16 h-16 rounded-2xl border border-slate-200/60 bg-white p-2 shadow-sm flex-shrink-0 transition-transform duration-500 group-hover:scale-105"><img src={p.images[0].url} alt="" className="w-full h-full object-contain"/></div>
                        :<div className="w-16 h-16 rounded-2xl border border-slate-200/60 bg-slate-50/50 flex-shrink-0"/>
                      }
                      <div>
                        <p className="font-bold text-[13px] text-slate-900 uppercase tracking-widest line-clamp-1 mb-1">{p.name}</p>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{p.brand}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{p.category.replace(/-/g,' ')}</td>
                  <td className="px-6 py-6 font-bold text-slate-900 text-[13px] tracking-wide">₹{p.final_price?.toLocaleString('en-IN')}</td>
                  <td className="px-6 py-6">
                    <span className={`inline-flex items-center gap-1.5 text-[9px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-xl border ${p.stock<=5?'bg-rose-50/50 border-rose-200 text-rose-600':'bg-white/50 border-slate-200 text-slate-500'}`}>
                      {p.stock<=5&&<AlertCircle size={10} strokeWidth={2.5}/>}{p.stock} units
                    </span>
                  </td>
                  <td className="px-6 py-6">
                    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[9px] font-bold uppercase tracking-[0.15em] ${
                      p.try_on_image_url?'bg-emerald-50/50 border-emerald-200 text-emerald-700':p.frame_width_mm?'bg-amber-50/50 border-amber-200 text-amber-700':'bg-slate-50/50 border-slate-200 text-slate-400'}`}>
                      <Camera size={10} strokeWidth={2}/>
                      {p.try_on_image_url?'Ready':p.frame_width_mm?'Dims':'None'}
                    </span>
                  </td>
                  <td className="px-6 py-6">
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-xl border text-[9px] font-bold uppercase tracking-[0.15em] ${p.is_active?'bg-emerald-50/50 border-emerald-200 text-emerald-700':'bg-slate-50/50 border-slate-200 text-slate-500'}`}>
                      {p.is_active?'Active':'Archived'}
                    </span>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button onClick={()=>openEdit(p)} className="p-3 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-900 hover:shadow-md hover:border-slate-300 transition-all duration-300"><Pencil size={14} strokeWidth={2}/></button>
                      {statusTab==='active'?(
                        <button onClick={async()=>{if(!confirm('Archive this entry? It will be hidden from the storefront immediately.'))return;await fetch(`/api/admin/products?id=${p.id}`,{method:'DELETE'});load()}}
                          className="p-3 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-all duration-300" title="Archive"><Trash2 size={14} strokeWidth={2}/></button>
                      ):(
                        <>
                          <button onClick={async()=>{if(!confirm('Restore this entry? It will become visible on the storefront again.'))return;await fetch(`/api/admin/products?id=${p.id}`,{method:'PATCH'});load()}}
                            className="p-3 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-all duration-300" title="Restore"><RotateCcw size={14} strokeWidth={2}/></button>
                          <button onClick={async()=>{if(!confirm('Permanently delete this entry? This cannot be undone.'))return;await fetch(`/api/admin/products?id=${p.id}&permanent=true`,{method:'DELETE'});load()}}
                            className="p-3 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-all duration-300" title="Delete permanently"><XCircle size={14} strokeWidth={2}/></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total>PER&&(
          <div className="px-10 py-6 border-t border-slate-200/50 flex items-center justify-between bg-white/40 backdrop-blur-md">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Showing {page*PER+1}–{Math.min((page+1)*PER,total)} of {total}</p>
            <div className="flex gap-3">
              <button disabled={page===0} onClick={()=>setPage(p=>p-1)} className="p-3 rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-30 hover:border-slate-300 hover:shadow-sm transition-all"><ChevronLeft size={16} strokeWidth={2}/></button>
              <button disabled={(page+1)*PER>=total} onClick={()=>setPage(p=>p+1)} className="p-3 rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-30 hover:border-slate-300 hover:shadow-sm transition-all"><ChevronRight size={16} strokeWidth={2}/></button>
            </div>
          </div>
        )}
      </div>

      {/* ── Form Drawer ────────────────────────────────────────── */}
      {showForm&&(
        <div className="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-300">
          <div className="bg-slate-50/95 backdrop-blur-3xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col shadow-2xl shadow-slate-900/10 border border-white sm:rounded-[2.5rem] animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-4 duration-500 ease-out overflow-hidden">

            {/* Drawer header */}
            <div className="bg-white/80 border-b border-slate-200/50 px-8 sm:px-10 py-8 flex items-start justify-between flex-shrink-0 relative z-10">
              <div>
                <p className="text-[9px] uppercase tracking-[0.3em] text-slate-400 mb-3 font-bold">Item Configuration</p>
                <h2 className="text-3xl text-slate-900 tracking-tight" style={{fontFamily:'Didot,"Bodoni MT","Playfair Display",Times,serif'}}>
                  {editing?'Modify Entry':'New Entry'}
                </h2>
              </div>
              <button onClick={()=>setShowForm(false)} className="text-slate-400 hover:text-slate-900 p-3 bg-white rounded-full shadow-sm border border-slate-100 hover:bg-slate-50 transition-all hover:rotate-90 duration-300">
                <X size={18} strokeWidth={1.5}/>
              </button>
            </div>

            {/* Scrollable body */}
            <div className="p-6 sm:p-10 overflow-y-auto space-y-8 flex-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full relative">

              {saveErr&&(
                <div className="p-5 bg-rose-50/80 backdrop-blur-md border border-rose-200 rounded-2xl flex items-start justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-start gap-4"><AlertCircle size={16} strokeWidth={2} className="text-rose-600 mt-0.5 flex-shrink-0"/><p className="text-[11px] font-medium text-rose-800 leading-relaxed">{saveErr}</p></div>
                  <button onClick={()=>setSaveErr(null)} className="p-1 hover:bg-rose-100 rounded-lg transition-colors"><X size={14} strokeWidth={2} className="text-rose-500"/></button>
                </div>
              )}

              {/* Images */}
              <section className={sectionClasses}>
                <div className="flex items-center justify-between mb-8">
                  <label className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3">
                    <div className="p-2 bg-white shadow-sm border border-slate-100 rounded-xl"><ImagePlus size={14} strokeWidth={1.5} className="text-slate-900"/></div>
                    Visual Assets
                  </label>
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400 bg-white/60 px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm">Max 6 · WebP/JPG · &lt;1MB</span>
                </div>
                
                {uploadErr&&<div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start justify-between"><div className="flex gap-3"><AlertCircle size={13} className="text-rose-600 mt-0.5 flex-shrink-0"/><span className="text-[10px] text-rose-800 font-medium">{uploadErr}</span></div><button onClick={()=>setUploadErr(null)}><X size={13} className="text-rose-400"/></button></div>}
                
                <div onDragOver={onImgDragOver} onDragLeave={onImgDragLeave} onDrop={onImgDrop}
                  className={`flex flex-wrap gap-5 rounded-3xl transition-all duration-300 ${imgDragOver?'ring-2 ring-slate-400 ring-offset-4 bg-slate-50 p-4 -m-4':''}`}>
                  {images.map((img,i)=>(
                    <div key={i} className="relative w-28 h-28 rounded-2xl border border-slate-200/80 bg-white group shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                      <img src={img.url} alt="" className="w-full h-full object-contain p-3 rounded-2xl"/>
                      {i===0&&<span className="absolute top-2 left-2 text-[8px] bg-slate-900/95 text-white px-2 py-1 rounded-lg font-bold uppercase tracking-[0.2em] shadow-sm backdrop-blur-md">Primary</span>}
                      <button onClick={()=>setImages(p=>p.filter((_,j)=>j!==i))} className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-md z-10"><X size={14} strokeWidth={2}/></button>
                    </div>
                  ))}
                  {images.length<6&&(
                    <button onClick={()=>fileRef.current?.click()} disabled={uploading}
                      className={`w-28 h-28 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all duration-300 ${imgDragOver?'border-slate-500 bg-white text-slate-700 scale-105':'border-slate-300/80 bg-white/40 text-slate-400 hover:border-slate-400 hover:bg-white hover:shadow-md'}`}>
                      {uploading?<Loader2 size={20} strokeWidth={2} className="animate-spin text-slate-600"/>:<><Plus size={20} strokeWidth={1.5}/><span className="text-[9px] font-bold uppercase tracking-[0.2em] mt-3">{imgDragOver?'Drop':'Upload'}</span></>}
                    </button>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/webp,image/jpeg,image/jpg,image/png" multiple className="hidden" onChange={e=>handleImages(e.target.files)}/>
              </section>

              {/* Basic details */}
              <section className={sectionClasses}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-7">
                  <div className="sm:col-span-2">
                    <label className={labelClasses}>Nomenclature</label>
                    <input type="text" value={form.name} onChange={e=>sf('name',e.target.value)} className={`${inputClasses} text-[14px]`} placeholder="e.g. Classic Aviator 500"/>
                  </div>
                  <div>
                    <label className={labelClasses}>URL Slug</label>
                    <input type="text" value={form.slug} onChange={e=>sf('slug',e.target.value)} className={`${inputClasses} font-mono text-[11px] text-slate-500`}/>
                  </div>
                  <div>
                    <label className={labelClasses}>Brand/Designer</label>
                    <BrandCombobox value={form.brand} onChange={v=>sf('brand',v)}/>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClasses}>Description & Detail</label>
                    <textarea value={form.description} onChange={e=>sf('description',e.target.value)} rows={4}
                      className={`${inputClasses} resize-none leading-relaxed text-[13px]`} placeholder="Describe the aesthetic and material qualities..."/>
                  </div>
                </div>
              </section>

              {/* Specifications */}
              <section className={sectionClasses}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-7">
                  {([
                    {k:'category' as const,label:'Category',opts:CATEGORIES},
                    {k:'gender'   as const,label:'Gender',  opts:GENDERS},
                    {k:'frame_type' as const, label:'Frame Architecture', opts:FRAME_TYPES},
                    {k:'frame_shape' as const,label:'Silhouette',opts:SHAPES},
                  ]).map(f=>(
                    <div key={f.k}>
                      <label className={labelClasses}>{f.label}</label>
                      <div className="relative group">
                        <select value={form[f.k]} onChange={e=>sf(f.k,e.target.value)}
                          className={`${inputClasses} uppercase tracking-[0.15em] text-[11px] appearance-none cursor-pointer pr-10`}>
                          <option value="">SELECT...</option>
                          {f.opts.map(o=><option key={o} value={o}>{o.replace(/-/g,' ')}</option>)}
                        </select>
                        <div className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 transition-transform group-hover:translate-y-[1px]">
                          <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div>
                    <label className={labelClasses}>Primary Colorway</label>
                    <ColorCombobox value={form.frame_color} onChange={v=>sf('frame_color',v)}/>
                  </div>
                  <div>
                    <label className={labelClasses}>Material Composition</label>
                    <input type="text" value={form.frame_material} onChange={e=>sf('frame_material',e.target.value)} className={inputClasses} placeholder="e.g. Acetate, Titanium"/>
                  </div>
                </div>
              </section>

              {/* Pricing */}
              <section className={sectionClasses}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-7">
                  {([{k:'base_price' as const,l:'Retail Price (₹)'},{k:'discount_percent' as const,l:'Discount %'},{k:'stock' as const,l:'Inventory Level'}]).map(f=>(
                    <div key={f.k}>
                      <label className={labelClasses}>{f.l}</label>
                      <input type="number" min="0" value={form[f.k]} onChange={e=>sf(f.k,e.target.value)} className={`${inputClasses} font-mono text-[14px]`}/>
                    </div>
                  ))}
                </div>
                <div className="mt-7">
                  <label className={labelClasses}>Tags / Keywords</label>
                  <input type="text" value={form.tags} onChange={e=>sf('tags',e.target.value)} placeholder="TRENDING, SUMMER, EDITORIAL" className={`${inputClasses} uppercase tracking-widest text-[11px]`}/>
                </div>
                <div className="flex flex-col sm:flex-row gap-5 pt-8 mt-8 border-t border-slate-200/50">
                  {([{k:'is_active' as const,l:'Publicly Available'},{k:'is_featured' as const,l:'Feature on Homepage'}]).map(f=>(
                    <label key={f.k} className="flex-1 flex items-center gap-4 cursor-pointer bg-white/60 px-6 py-5 rounded-2xl border border-slate-200/80 hover:bg-white hover:border-slate-300 hover:shadow-lg transition-all duration-300">
                      <div className={`relative flex items-center justify-center w-6 h-6 rounded-lg border transition-all duration-300 shadow-sm ${form[f.k]?'bg-slate-900 border-slate-900':'bg-slate-50 border-slate-300'}`}>
                        <input type="checkbox" checked={form[f.k] as boolean} onChange={e=>sf(f.k,e.target.checked)} className="absolute opacity-0 cursor-pointer w-full h-full"/>
                        <Check size={14} strokeWidth={3} className={`transition-all duration-300 ${form[f.k]?'text-white scale-100':'text-transparent scale-50'}`}/>
                      </div>
                      <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-700">{f.l}</span>
                    </label>
                  ))}
                </div>
              </section>

              {/* ── Virtual Try-On Section ─────────────────────── */}
              {showTryOn&&(
                <section className={sectionClasses}>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-white shadow-sm border border-slate-100 rounded-xl"><Camera size={16} strokeWidth={1.5} className="text-slate-900"/></div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em]">Augmented Reality / Try-On</p>
                        <p className="text-[10px] text-slate-500 font-medium mt-1 tracking-wide">Dimensions drive precise scaling · Transparent PNG enables facial overlay</p>
                      </div>
                    </div>
                    <span className="flex-shrink-0 text-[9px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 shadow-sm">Optional</span>
                  </div>
                  
                  <div className="mb-8 mt-6 p-5 bg-slate-50/80 border border-slate-200/60 rounded-2xl">
                    <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                      <span className="font-bold text-slate-900">Fields below govern the AR experience.</span> Populate to activate the <span className="font-bold border-b border-slate-300 pb-0.5">Virtual Try-On</span> module on the product detail page. Empty fields will gracefully hide the feature.
                    </p>
                  </div>

                  {/* Dimension inputs */}
                  <div className="mb-10">
                    <div className="flex items-center gap-3 mb-5">
                      <Ruler size={12} strokeWidth={1.5} className="text-slate-400"/>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Physical Dimensions <span className="text-slate-400/70 normal-case font-medium tracking-normal">(mm)</span></p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                      {([
                        {k:'frame_width_mm'   as const,l:'Frame',      hint:'130-148'},
                        {k:'lens_width_mm'    as const,l:'Lens',       hint:'46-56'},
                        {k:'bridge_width_mm'  as const,l:'Bridge',     hint:'14-22'},
                        {k:'temple_length_mm' as const,l:'Temple',     hint:'135-150'},
                        {k:'frame_height_mm'  as const,l:'Height',     hint:'32-54'},
                      ]).map(f=>(
                        <div key={f.k}>
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em] block mb-2 ml-1">{f.l}</label>
                          <div className="relative">
                            <input type="number" min="0" step="0.1" value={form[f.k]} onChange={e=>sf(f.k,e.target.value)} placeholder={f.hint}
                              className={`${inputClasses} font-mono text-[13px] px-4 py-3.5 pr-10 bg-white/70`} />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-300">mm</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-4 font-medium tracking-wide">
                      Guidance: Check the inner temple arm. Format is typically <b>52□18-145</b> (Lens □ Bridge - Temple).
                    </p>
                  </div>

                  {/* Try-on image */}
                  <div className="border-t border-slate-200/50 pt-8">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Overlay Asset</p>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium mb-6">
                      Front-facing transparent PNG or WebP. Centered horizontally. Max 3MB.
                    </p>
                    
                    {tryOnUploadErr&&(
                      <div className="mb-5 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start justify-between">
                        <div className="flex gap-3"><AlertCircle size={13} className="text-rose-600 mt-0.5 flex-shrink-0"/><span className="text-[10px] text-rose-800 font-medium">{tryOnUploadErr}</span></div>
                        <button onClick={()=>setTryOnUploadErr(null)}><X size={13} className="text-rose-400"/></button>
                      </div>
                    )}
                    
                    <div onDragOver={onTryOnDragOver} onDragLeave={onTryOnDragLeave} onDrop={onTryOnDrop}
                      className={`flex items-start gap-6 flex-wrap rounded-3xl transition-all duration-300 ${tryOnDragOver?'ring-2 ring-slate-400 ring-offset-4 bg-slate-50/80 p-4 -m-4':''}`}>
                      {tryOnImg&&(
                        <div className="relative group w-48 h-32 rounded-2xl border border-slate-200 bg-[repeating-conic-gradient(#f8fafc_0%_25%,transparent_0%_50%)] bg-[size:16px_16px] shadow-sm overflow-hidden flex-shrink-0 hover:shadow-lg transition-all duration-300">
                          <img src={tryOnImg.url} alt="" className="w-full h-full object-contain p-3"/>
                          <span className="absolute top-2 left-2 text-[8px] bg-slate-900/90 text-white px-2.5 py-1 rounded-lg font-bold uppercase tracking-[0.2em] shadow-sm backdrop-blur-md">Active</span>
                          <button onClick={()=>setTryOnImg(null)}
                            className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-md"><X size={13} strokeWidth={2}/></button>
                        </div>
                      )}
                      <button onClick={()=>tryOnRef.current?.click()} disabled={tryOnUploading}
                        className={`h-32 px-10 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all duration-300 shadow-sm min-w-[140px] ${tryOnDragOver?'border-slate-600 bg-white text-slate-800 scale-105':'border-slate-300/80 bg-white/40 text-slate-400 hover:border-slate-400 hover:bg-white hover:text-slate-600 hover:shadow-md'}`}>
                        {tryOnUploading?<Loader2 size={20} strokeWidth={2} className="animate-spin"/>:<>
                          <ImagePlus size={20} strokeWidth={1.5}/>
                          <span className="text-[9px] font-bold uppercase tracking-[0.2em] mt-3">{tryOnDragOver?'Drop Asset':tryOnImg?'Replace':'Upload Asset'}</span>
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
                <section className={sectionClasses}>
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-white shadow-sm border border-slate-100 rounded-xl"><Palette size={16} strokeWidth={1.5} className="text-slate-400"/></div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em]">Variant Management</p>
                      <p className="text-[10px] text-slate-500 font-medium mt-1 tracking-wide">Publish this entry first to unlock colorway linking capabilities.</p>
                    </div>
                  </div>
                </section>
              )}

              {/* Submit */}
              <div className="pt-4 pb-8 sticky bottom-0 bg-gradient-to-t from-slate-50 via-slate-50/90 to-transparent z-20">
                <button onClick={save} disabled={saving}
                  className="w-full py-5 rounded-2xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-[11px] uppercase tracking-[0.3em] font-bold transition-all duration-300 shadow-xl shadow-slate-900/20 hover:shadow-2xl hover:shadow-slate-900/30 hover:-translate-y-0.5 flex items-center justify-center gap-3">
                  {saving?<><Loader2 size={18} strokeWidth={2} className="animate-spin"/>Processing...</>:<><Save size={18} strokeWidth={2}/>{editing?'Commit Changes':'Publish Entry'}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}