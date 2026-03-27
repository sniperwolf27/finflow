import { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/prisma'

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const userId = req.session?.userId
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    req.session.destroy(() => {})
    res.status(401).json({ error: 'User not found' })
    return
  }

  req.user = user
  next()
}
