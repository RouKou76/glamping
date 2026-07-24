import { useState, useRef, useEffect, useMemo, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

interface City {
  id: string
  name: string
  km: number
  price: number
}

interface CityAutocompleteProps {
  cities: City[]
  value: string
  onChange: (city: City | null) => void
}

export function CityAutocomplete({ cities, value, onChange }: CityAutocompleteProps) {
  const { t } = useTranslation()
  const [query, setQuery] = useState(value)
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})

  const sortedCities = useMemo(() => [...cities].sort((a, b) => a.km - b.km), [cities])

  const filtered = query.length > 0
    ? cities.filter(c => c.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : []

  const showAll = isOpen && query.length === 0
  const showFiltered = isOpen && query.length > 0 && filtered.length > 0
  const showDropdown = showAll || showFiltered

  const updatePosition = () => {
    const rect = inputRef.current?.getBoundingClientRect()
    if (!rect) return
    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    })
  }

  useLayoutEffect(() => {
    if (!showDropdown) {
      setDropdownStyle({ display: 'none' })
      return
    }
    updatePosition()
  }, [showDropdown])

  useEffect(() => {
    if (!showDropdown) return
    const vp = window.visualViewport
    if (!vp) return
    const onResize = () => updatePosition()
    const onScroll = () => updatePosition()
    vp.addEventListener('resize', onResize)
    vp.addEventListener('scroll', onScroll)
    return () => {
      vp.removeEventListener('resize', onResize)
      vp.removeEventListener('scroll', onScroll)
    }
  }, [showDropdown])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(city: City) {
    setQuery(city.name)
    setIsOpen(false)
    onChange(city)
  }

  function handleChange(v: string) {
    setQuery(v)
    setIsOpen(true)
    onChange(null)
  }

  return (
    <>
      <div ref={wrapperRef} className="relative">
        <input
          ref={inputRef}
          type="text"
          inputMode="search"
          value={query}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={t('transfer.searchCity')}
          className="w-full p-3 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-800 dark:text-white bg-white dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-glamp-500"
        />
      </div>
      {showDropdown && createPortal(
        <div
          style={dropdownStyle}
          className="bg-white dark:bg-[#1a1d27] border border-gray-200 dark:border-white/10 rounded-xl shadow-lg max-h-60 overflow-y-auto"
        >
          {showAll && (
            <div className="px-4 py-2 text-[10px] text-gray-400 dark:text-white/30 border-b border-gray-100 dark:border-white/5 sticky top-0 bg-white dark:bg-[#1a1d27]">
              {t('transfer.priceHint')}
            </div>
          )}
          {(showAll ? sortedCities : filtered).map(city => (
            <button
              key={city.id}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(city) }}
              className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex justify-between items-center"
            >
              <span className="text-gray-800 dark:text-white">{city.name}</span>
              <span className="text-xs text-gray-500 dark:text-white/50 shrink-0 ml-2">{city.km} км · {city.price} ₽</span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}
