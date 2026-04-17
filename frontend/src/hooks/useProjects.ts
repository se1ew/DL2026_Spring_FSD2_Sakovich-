import { useCallback, useEffect, useState } from 'react'
import { type Project } from '../types/qr'
import { API_BASE_URL } from '../config'

export const useProjects = (token: string | null) => {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)

  const fetch_ = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/projects`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setProjects(data)
      }
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetch_() }, [fetch_])

  const create = useCallback(async (name: string): Promise<Project | null> => {
    if (!token) return null
    const res = await fetch(`${API_BASE_URL}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name }),
    })
    if (!res.ok) return null
    const project = await res.json() as Project
    setProjects(prev => [project, ...prev])
    return project
  }, [token])

  const remove = useCallback(async (id: string) => {
    if (!token) return
    const res = await fetch(`${API_BASE_URL}/api/projects/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) setProjects(prev => prev.filter(p => p.id !== id))
  }, [token])

  return { projects, loading, create, remove, reload: fetch_ }
}
