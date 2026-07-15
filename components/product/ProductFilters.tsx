'use client'

import { useState, useCallback, useTransition, useEffect, memo, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { ChevronDown, X, SlidersHorizontal } from 'lucide-react'
import type { ProductFilters, Gender, FrameType, FrameShape } from '@/types'

// ── Constants ─────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'eyeglasses', label: 'Eyeglasses' },
  { value: 'sunglasses', label: 'Sunglasses' },
  { value: 'contact-lenses', label: 'Contact Lenses' },
  { value: 'accessories', label: 'Accessories' },
] as const

const BRANDS = [
  'Ray-Ban', 'Titan', 'Tommy Hilfiger', 'Fastrack', 'French Connection',
  'Scott', 'Idee', 'Voyage', 'Laurel Dale', 'Galore Bay', 'Feather',
  'John Karter', 'Caron', 'Kidstar', 'Red Grapes', 'Grey Jack',
  'Roberto Gabriel', 'Para+', 'Tom Hardy', 'Daniel Hunter', 'Xpress',
  'Qual', 'RK Parkens',
] as const

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
  { value: 'kids', label: 'Kids' },
  { value: 'unisex', label: 'Unisex' },
]

const FRAME_TYPES: { value: FrameType; label: string }[] = [
  { value: 'full-rim', label: 'Full Rim' },
  { value: 'half-rim', label: 'Half Rim' },
  { value: 'rimless', label: 'Rimless' },
]

const SHAPES: { value: FrameShape; label: string }[] = [
  { value: 'rectangle', label: 'Rectangle' },
  { value: 'round', label: 'Round' },
  { value: 'square', label: 'Square' },
  { value: 'wayfarer', label: 'Wayfarer' },
  { value: 'aviator', label: 'Aviator' },
  { value: 'cat-eye', label: 'Cat Eye' },
  { value: 'oval', label: 'Oval' },
]

const PRICE_RANGES = [
  { label: 'Under ₹1,000', min: 0, max: 1000 },
  { label: '₹1,000 – ₹2,500', min: 1000, max: 2500 },
  { label: '₹2,500 – ₹5,000', min: 2500, max: 5000 },
  { label: '₹5,000 – ₹10,000', min: 5000, max: 10000 },
  { label: 'Above ₹10,000', min: 10000, max: 99999 },
] as const

// ── Sub-components ─────────────────────────────────────────────────────────

const DropdownWrapper = memo(({
  label, isActive, onToggle, activeCount, children
}: {
  label: string; isActive: boolean; onToggle: () => void; activeCount: number; children: React.ReactNode;
}) => (
  <div className="relative">
    <button
      onClick={onToggle}
      aria-expanded={isActive}
      aria-haspopup="menu"
      className={`flex items-center gap-2 px-4 py-2 border transition-colors text-[11px] uppercase tracking-[0.15em] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ${
        isActive || activeCount > 0
          ? 'border-slate-900 text-slate-900 bg-slate-50'
          : 'border-slate-200 text-slate-600 hover:border-slate-400 hover:text-slate-900'
      }`}
    >
      {label}
      {activeCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-slate-900 ml-1" aria-hidden="true" />}
      <ChevronDown
        size={12}
        strokeWidth={2}
        className={`transition-transform duration-200 ${isActive ? 'rotate-180' : ''}`}
        aria-hidden="true"
      />
    </button>
    
    <div
      role="menu"
      className={`absolute top-full left-0 mt-2 w-64 bg-white border border-slate-200 shadow-xl z-50 p-5 transition-all duration-200 origin-top-left ${
        isActive ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible'
      }`}
    >
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  </div>
))
DropdownWrapper.displayName = 'DropdownWrapper'

const FilterRow = memo(({
  filterKey, label, value, selected, onToggle
}: { 
  filterKey: keyof ProductFilters | 'price'; label: string; value: string | { min: number, max: number }; selected: boolean; onToggle: (key: any, val: any, isSelected: boolean) => void 
}) => (
  <button
    role="menuitem"
    onClick={(e) => {
      e.preventDefault()
      onToggle(filterKey, value, selected)
    }}
    className={`w-full flex items-center justify-between py-2.5 text-sm transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded-sm px-1 ${
      selected ? 'text-slate-900 font-medium' : 'text-slate-500 hover:text-slate-900'
    }`}
  >
    <span>{label}</span>
    <div className={`w-3.5 h-3.5 rounded-full border transition-colors flex items-center justify-center ${
      selected ? 'border-slate-900' : 'border-slate-300 group-hover:border-slate-400'
    }`}>
      {selected && <div className="w-2 h-2 bg-slate-900 rounded-full" />}
    </div>
  </button>
))
FilterRow.displayName = 'FilterRow'

const FilterPill = memo(({
  filterKey, label, value, selected, onToggle
}: {
  filterKey: keyof ProductFilters; label: string; value: string; selected: boolean; onToggle: (key: any, val: any, isSelected: boolean) => void
}) => (
  <button
    role="menuitem"
    onClick={(e) => {
      e.preventDefault()
      onToggle(filterKey, value, selected)
    }}
    className={`px-3 py-2.5 text-xs text-center border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 ${
      selected 
        ? 'border-slate-900 bg-slate-900 text-white font-medium' 
        : 'border-slate-200 text-slate-600 hover:border-slate-400 hover:text-slate-900'
    }`}
  >
    {label}
  </button>
))
FilterPill.displayName = 'FilterPill'

// ── Brand dropdown with search ────────────────────────────────────────────

const BrandDropdown = memo(({
  isActive, onToggle, selected, onSelect
}: {
  isActive: boolean
  onToggle: () => void
  selected: string | undefined
  onSelect: (brand: string, isSelected: boolean) => void
}) => {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = query
    ? BRANDS.filter(b => b.toLowerCase().includes(query.toLowerCase()))
    : BRANDS

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isActive) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
    }
  }, [isActive])

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        aria-expanded={isActive}
        aria-haspopup="menu"
        className={`flex items-center gap-2 px-4 py-2 border transition-colors text-[11px] uppercase tracking-[0.15em] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ${
          isActive || selected
            ? 'border-slate-900 text-slate-900 bg-slate-50'
            : 'border-slate-200 text-slate-600 hover:border-slate-400 hover:text-slate-900'
        }`}
      >
        {selected ? selected : 'Brand'}
        {selected && <span className="w-1.5 h-1.5 rounded-full bg-slate-900 ml-1" aria-hidden="true" />}
        <ChevronDown
          size={12}
          strokeWidth={2}
          className={`transition-transform duration-200 ${isActive ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      <div
        role="menu"
        className={`absolute top-full left-0 mt-2 w-64 bg-white border border-slate-200 shadow-xl z-50 transition-all duration-200 origin-top-left ${
          isActive ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible'
        }`}
      >
        {/* Search input */}
        <div className="px-3 pt-3 pb-2 border-b border-slate-100">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search brand…"
            className="w-full text-[11px] text-slate-700 placeholder-slate-300 border border-slate-200 px-3 py-2 focus:outline-none focus:border-slate-900 transition-colors"
          />
        </div>

        {/* Brand list */}
        <div className="max-h-52 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="px-4 py-3 text-[10px] text-slate-400 uppercase tracking-widest">No results</p>
          ) : (
            filtered.map(b => (
              <button
                key={b}
                role="menuitem"
                onClick={() => onSelect(b, selected === b)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors group focus-visible:outline-none ${
                  selected === b ? 'text-slate-900 font-medium' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <span>{b}</span>
                <div className={`w-3.5 h-3.5 rounded-full border transition-colors flex items-center justify-center flex-shrink-0 ${
                  selected === b ? 'border-slate-900' : 'border-slate-300 group-hover:border-slate-400'
                }`}>
                  {selected === b && <div className="w-2 h-2 bg-slate-900 rounded-full" />}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
})
BrandDropdown.displayName = 'BrandDropdown'

// ── Main Component ────────────────────────────────────────────────────────

interface FiltersProps {
  initial: ProductFilters
  totalCount: number
}

const FILTER_KEYS: (keyof ProductFilters)[] = [
  'category', 'gender', 'brand', 'frame_type', 'frame_shape', 'min_price', 'max_price', 'sort'
]

export default function ProductFilters({ initial, totalCount }: FiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [localFilters, setLocalFilters] = useState<ProductFilters>(initial)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLocalFilters(initial)
  }, [initial])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setActiveDropdown(null)
      }
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveDropdown(null)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const activeCount = Object.keys(localFilters).filter(k => 
    k !== 'sort' && localFilters[k as keyof ProductFilters] !== undefined && localFilters[k as keyof ProductFilters] !== ''
  ).length

  const createQueryString = useCallback((filters: ProductFilters) => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('page')

    FILTER_KEYS.forEach(key => {
      const val = filters[key]
      if (val !== undefined && val !== '') {
        params.set(key, String(val))
      } else {
        params.delete(key)
      }
    })
    return params.toString()
  }, [searchParams])

  const applyFilters = useCallback((filters: ProductFilters) => {
    startTransition(() => {
      const queryString = createQueryString(filters)
      router.push(`${pathname}${queryString ? `?${queryString}` : ''}`, { scroll: false })
    })
  }, [router, pathname, createQueryString])

  const handleToggle = useCallback((key: keyof ProductFilters | 'price', value: any, isSelected: boolean) => {
    const next = { ...localFilters }
    
    if (key === 'price') {
      if (isSelected) {
        delete next.min_price
        delete next.max_price
      } else {
        next.min_price = value.min
        next.max_price = value.max
      }
    } else {
      if (isSelected) {
        delete next[key]
      } else {
        next[key] = value
      }
    }

    setLocalFilters(next)
    applyFilters(next)
  }, [localFilters, applyFilters])

  const handleBrandSelect = useCallback((brand: string, isSelected: boolean) => {
    const next = { ...localFilters }
    if (isSelected) {
      delete next.brand
    } else {
      next.brand = brand
    }
    setLocalFilters(next)
    applyFilters(next)
    setActiveDropdown(null)
  }, [localFilters, applyFilters])

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = { ...localFilters, sort: e.target.value as ProductFilters['sort'] || undefined }
    if (!e.target.value) delete next.sort
    setLocalFilters(next)
    applyFilters(next)
  }

  const clearAll = () => {
    const currentCategory = localFilters.category
    const next: ProductFilters = currentCategory ? { category: currentCategory } : {}
    setLocalFilters(next)
    applyFilters(next)
    setActiveDropdown(null)
  }

  const toggleDropdown = useCallback((id: string) => {
    setActiveDropdown(prev => prev === id ? null : id)
  }, [])

  return (
    <div 
      ref={containerRef}
      className={`w-full flex flex-col gap-5 pb-6 mb-8 border-b border-slate-200 transition-opacity duration-300 ${isPending ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}
    >
      
      {/* ── Top Row ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl text-slate-900 tracking-tight mb-1" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
            Refine Selection
          </h2>
          <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500 flex items-center gap-2">
            <SlidersHorizontal size={12} aria-hidden="true" />
            {totalCount.toLocaleString('en-IN')} Results
          </p>
        </div>

        <div className="relative group min-w-[200px]">
          <select
            aria-label="Sort By"
            value={localFilters.sort || ''}
            onChange={handleSortChange}
            className="w-full appearance-none bg-transparent border-b border-slate-300 text-sm font-medium text-slate-900 py-2 pl-0 pr-8 hover:border-slate-900 focus:border-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 transition-colors rounded-none cursor-pointer"
          >
            <option value="">Sort by: Relevance</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="rating">Best Rated</option>
            <option value="newest">Newest First</option>
            <option value="featured">Featured</option>
          </select>
          <ChevronDown size={14} strokeWidth={1.5} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-slate-900 transition-colors pointer-events-none" aria-hidden="true" />
        </div>
      </div>

      {/* ── Filter Dropdowns ──────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        
        <DropdownWrapper 
          label="Category" 
          isActive={activeDropdown === 'category'} 
          onToggle={() => toggleDropdown('category')}
          activeCount={localFilters.category ? 1 : 0}
        >
          {CATEGORIES.map(c => (
            <FilterRow key={c.value} filterKey="category" label={c.label} value={c.value} selected={localFilters.category === c.value} onToggle={handleToggle} />
          ))}
        </DropdownWrapper>

        <DropdownWrapper 
          label="Gender" 
          isActive={activeDropdown === 'gender'} 
          onToggle={() => toggleDropdown('gender')}
          activeCount={localFilters.gender ? 1 : 0}
        >
          {GENDERS.map(g => (
            <FilterRow key={g.value} filterKey="gender" label={g.label} value={g.value} selected={localFilters.gender === g.value} onToggle={handleToggle} />
          ))}
        </DropdownWrapper>

        <DropdownWrapper 
          label="Price" 
          isActive={activeDropdown === 'price'} 
          onToggle={() => toggleDropdown('price')}
          activeCount={localFilters.min_price !== undefined ? 1 : 0}
        >
          {PRICE_RANGES.map(range => {
            const selected = localFilters.min_price === range.min && localFilters.max_price === range.max
            return (
              <FilterRow key={range.label} filterKey="price" label={range.label} value={{ min: range.min, max: range.max }} selected={selected} onToggle={handleToggle} />
            )
          })}
        </DropdownWrapper>

        {/* Brand — searchable */}
        <BrandDropdown
          isActive={activeDropdown === 'brand'}
          onToggle={() => toggleDropdown('brand')}
          selected={localFilters.brand}
          onSelect={handleBrandSelect}
        />

        <DropdownWrapper 
          label="Frame Type" 
          isActive={activeDropdown === 'frame_type'} 
          onToggle={() => toggleDropdown('frame_type')}
          activeCount={localFilters.frame_type ? 1 : 0}
        >
          {FRAME_TYPES.map(ft => (
            <FilterRow key={ft.value} filterKey="frame_type" label={ft.label} value={ft.value} selected={localFilters.frame_type === ft.value} onToggle={handleToggle} />
          ))}
        </DropdownWrapper>

        <DropdownWrapper 
          label="Shape" 
          isActive={activeDropdown === 'shape'} 
          onToggle={() => toggleDropdown('shape')}
          activeCount={localFilters.frame_shape ? 1 : 0}
        >
          <div className="grid grid-cols-2 gap-2 mt-1">
            {SHAPES.map(s => (
              <FilterPill key={s.value} filterKey="frame_shape" label={s.label} value={s.value} selected={localFilters.frame_shape === s.value} onToggle={handleToggle} />
            ))}
          </div>
        </DropdownWrapper>

        {activeCount > 0 && (
          <button
            onClick={clearAll}
            className="group flex items-center gap-1.5 ml-2 px-3 py-2 text-[10px] uppercase tracking-[0.1em] font-medium text-red-500 hover:text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 transition-colors border border-transparent hover:border-red-100 rounded-sm"
          >
            <X size={12} aria-hidden="true" />
            Clear Filters ({activeCount})
          </button>
        )}

      </div>
    </div>
  )
}