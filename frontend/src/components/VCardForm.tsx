import { useState, type ChangeEvent } from 'react'

type VCardFields = {
  name: string
  org: string
  phone: string
  email: string
  url: string
  note: string
}

export const buildVCard = (f: VCardFields): string => {
  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${f.name}`]
  if (f.org)   lines.push(`ORG:${f.org}`)
  if (f.phone) lines.push(`TEL;TYPE=WORK,VOICE:${f.phone}`)
  if (f.email) lines.push(`EMAIL:${f.email}`)
  if (f.url)   lines.push(`URL:${f.url}`)
  if (f.note)  lines.push(`NOTE:${f.note}`)
  lines.push('END:VCARD')
  return lines.join('\r\n')
}

type Props = {
  onChange: (vcard: string) => void
}

const ROWS: { key: keyof VCardFields; label: string; placeholder: string }[] = [
  { key: 'name',  label: 'Full name *', placeholder: 'John Doe' },
  { key: 'org',   label: 'Organization', placeholder: 'Company Ltd.' },
  { key: 'phone', label: 'Phone',        placeholder: '+1 555 000 1234' },
  { key: 'email', label: 'Email',        placeholder: 'john@example.com' },
  { key: 'url',   label: 'Website',      placeholder: 'https://example.com' },
  { key: 'note',  label: 'Note',         placeholder: 'Any extra info' },
]

export const VCardForm = ({ onChange }: Props) => {
  const [fields, setFields] = useState<VCardFields>({
    name: '', org: '', phone: '', email: '', url: '', note: '',
  })

  const handle = (key: keyof VCardFields) => (e: ChangeEvent<HTMLInputElement>) => {
    const next = { ...fields, [key]: e.target.value }
    setFields(next)
    onChange(buildVCard(next))
  }

  return (
    <div className="vcard-form">
      {ROWS.map(({ key, label, placeholder }) => (
        <div key={key} className="vcard-row">
          <label className="field-label" htmlFor={`vc-${key}`}>{label}</label>
          <input
            id={`vc-${key}`}
            className="lum-input"
            type={key === 'email' ? 'email' : 'text'}
            placeholder={placeholder}
            value={fields[key]}
            onChange={handle(key)}
          />
        </div>
      ))}
    </div>
  )
}
