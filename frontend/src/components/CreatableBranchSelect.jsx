import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'

const STORAGE_KEY = 'btc_custom_branches'
const BRANCHES_UPDATED_EVENT = 'btc-custom-branches-updated'

const DEFAULT_BRANCHES = [
  { code: 'RAJ', name: 'Rajgarh', label: 'RAJ - Rajgarh' },
  { code: 'DEL', name: 'Delhi', label: 'DEL - Delhi' },
  { code: 'MUM', name: 'Mumbai', label: 'MUM - Mumbai' },
  { code: 'JAI', name: 'Jaipur', label: 'JAI - Jaipur' },
  { code: 'AHM', name: 'Ahmedabad', label: 'AHM - Ahmedabad' }
]

function readCustomBranches() {
  try {
    const storedBranches = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]')
    if (!Array.isArray(storedBranches)) return []
    return storedBranches.filter(branch =>
      branch &&
      typeof branch.code === 'string' &&
      typeof branch.name === 'string' &&
      typeof branch.label === 'string'
    )
  } catch (error) {
    console.error('Unable to load saved custom branches:', error)
    toast.error('Unable to load saved branches from this browser.')
    return []
  }
}

function titleCase(value) {
  return value.toLowerCase().replace(/\b\w/g, character => character.toUpperCase())
}

function parseBranchInput(input) {
  const value = input.trim()
  const codeAndName = value.match(/^([a-z0-9]{2,10})\s*-\s*(.+)$/i)
  if (codeAndName) {
    return { code: codeAndName[1].toUpperCase(), name: titleCase(codeAndName[2].trim()) }
  }
  const name = titleCase(value)
  const code = value.replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase() || 'BRN'
  return { code, name }
}

export default function CreatableBranchSelect({
  value,
  onChange,
  label,
  placeholder = 'Type or Select Branch',
  required = false
}) {
  const [customBranches, setCustomBranches] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    const loadBranches = () => setCustomBranches(readCustomBranches())
    const closeWhenOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) setIsOpen(false)
    }

    loadBranches()
    window.addEventListener(BRANCHES_UPDATED_EVENT, loadBranches)
    window.addEventListener('storage', loadBranches)
    document.addEventListener('mousedown', closeWhenOutside)
    return () => {
      window.removeEventListener(BRANCHES_UPDATED_EVENT, loadBranches)
      window.removeEventListener('storage', loadBranches)
      document.removeEventListener('mousedown', closeWhenOutside)
    }
  }, [])

  const branches = useMemo(() => [...DEFAULT_BRANCHES, ...customBranches], [customBranches])
  const selectedBranch = branches.find(branch => branch.code === value)
  const searchText = inputValue.trim().toLowerCase()
  const filteredBranches = branches.filter(branch =>
    !searchText ||
    branch.label.toLowerCase().includes(searchText) ||
    branch.name.toLowerCase().includes(searchText) ||
    branch.code.toLowerCase().includes(searchText)
  )
  const parsedInput = searchText ? parseBranchInput(inputValue) : null
  const matchingBranchExists = parsedInput && branches.some(branch =>
    branch.name.toLowerCase() === parsedInput.name.toLowerCase()
  )

  const selectBranch = (branch) => {
    onChange(branch)
    setInputValue('')
    setIsOpen(false)
  }

  const addBranch = () => {
    if (!parsedInput) return
    const existingBranch = branches.find(branch =>
      branch.name.toLowerCase() === parsedInput.name.toLowerCase()
    )
    if (existingBranch) {
      selectBranch(existingBranch)
      return
    }

    const usedCodes = new Set(branches.map(branch => branch.code.toUpperCase()))
    const baseCode = parsedInput.code.slice(0, 3).padEnd(3, 'X')
    let code = baseCode
    let suffix = 1
    while (usedCodes.has(code)) {
      code = `${baseCode.slice(0, 3 - String(suffix).length)}${suffix}`
      suffix += 1
    }

    const newBranch = {
      code,
      name: parsedInput.name,
      label: `${code} - ${parsedInput.name}`
    }
    const nextBranches = [...customBranches, newBranch]
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextBranches))
      setCustomBranches(nextBranches)
      window.dispatchEvent(new Event(BRANCHES_UPDATED_EVENT))
      selectBranch(newBranch)
    } catch (error) {
      console.error('Unable to save custom branch:', error)
      toast.error('Unable to save this branch in your browser storage.')
    }
  }

  return (
    <div className="relative" ref={rootRef}>
      <label className="block text-gray-300 text-sm font-medium mb-1">{label}{required && ' *'}</label>
      <input
        type="text"
        value={isOpen && inputValue ? inputValue : selectedBranch?.label || ''}
        onChange={(event) => {
          setInputValue(event.target.value)
          setIsOpen(true)
        }}
        onFocus={(event) => {
          setInputValue('')
          setIsOpen(true)
          event.currentTarget.select()
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setIsOpen(false)
          if (event.key === 'Enter' && isOpen && parsedInput && !matchingBranchExists) {
            event.preventDefault()
            addBranch()
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
        required={required}
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
      />
      {isOpen && (
        <div
          role="listbox"
          className="absolute z-50 w-full mt-1 bg-slate-800 border border-white/10 rounded-lg shadow-xl max-h-60 overflow-auto"
        >
          {filteredBranches.map(branch => (
            <button
              key={branch.code}
              type="button"
              role="option"
              aria-selected={branch.code === value}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectBranch(branch)}
              className="block w-full px-4 py-2 text-left text-white hover:bg-white/10"
            >
              {branch.label}
            </button>
          ))}
          {parsedInput && !matchingBranchExists && (
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={addBranch}
              className="block w-full px-4 py-2 text-left text-cyan-300 hover:bg-white/10"
            >
              + Add new city &apos;{parsedInput.name}&apos;
            </button>
          )}
        </div>
      )}
    </div>
  )
}
