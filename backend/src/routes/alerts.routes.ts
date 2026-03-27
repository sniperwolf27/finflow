import { Router } from 'express'
import { AlertPeriod, AlertType } from '@prisma/client'
import { requireAuth } from '../middleware/auth.middleware'
import { prisma } from '../config/prisma'

const router = Router()
router.use(requireAuth)

router.get('/', async (req, res) => {
  const alerts = await prisma.alert.findMany({
    where: { userId: req.user!.id },
    include: { category: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json(alerts)
})

router.post('/', async (req, res) => {
  const { name, type, categoryId, threshold, period } = req.body
  const alert = await prisma.alert.create({
    data: {
      userId: req.user!.id,
      name,
      type: type as AlertType,
      categoryId: categoryId || null,
      threshold: threshold ? Number(threshold) : null,
      period: period as AlertPeriod || null,
    },
    include: { category: true },
  })
  res.status(201).json(alert)
})

router.patch('/:id', async (req, res) => {
  const { name, threshold, period, isActive, categoryId } = req.body
  const alert = await prisma.alert.update({
    where: { id: req.params.id, userId: req.user!.id },
    data: {
      ...(name !== undefined && { name }),
      ...(threshold !== undefined && { threshold: Number(threshold) }),
      ...(period !== undefined && { period }),
      ...(isActive !== undefined && { isActive }),
      ...(categoryId !== undefined && { categoryId }),
    },
    include: { category: true },
  })
  res.json(alert)
})

router.delete('/:id', async (req, res) => {
  await prisma.alert.delete({ where: { id: req.params.id, userId: req.user!.id } })
  res.json({ ok: true })
})

export default router
