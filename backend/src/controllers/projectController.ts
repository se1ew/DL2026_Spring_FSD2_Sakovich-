import { Request, Response, NextFunction } from 'express'
import { projectService } from '../services/projectService'
import { CreateProjectRequest } from '../types/qr'

export const listProjects = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) { res.status(401).json({ error: 'Не авторизован' }); return }
    const projects = await projectService.list(userId)
    res.json(projects)
  } catch (err) { next(err) }
}

export const createProject = async (
  req: Request<object, unknown, CreateProjectRequest>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) { res.status(401).json({ error: 'Не авторизован' }); return }
    const project = await projectService.create(userId, req.body.name)
    res.status(201).json(project)
  } catch (err) { next(err) }
}

export const deleteProject = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) { res.status(401).json({ error: 'Не авторизован' }); return }
    const deleted = await projectService.deleteById(req.params.id, userId)
    if (!deleted) { res.status(404).json({ error: 'Project not found' }); return }
    res.json({ id: deleted.id })
  } catch (err) { next(err) }
}
