import { Router } from 'express'
import { listProjects, createProject, deleteProject } from '../controllers/projectController'
import { authMiddleware } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { noStore } from '../middleware/cache'
import { CreateProjectSchema } from '../types/qr'

export const router = Router()

router.use(authMiddleware)

router.get('/', noStore, listProjects)
router.post('/', noStore, validate(CreateProjectSchema), createProject)
router.delete('/:id', noStore, deleteProject)
