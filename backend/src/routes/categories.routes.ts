import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware'
import { prisma } from '../config/prisma'

const router = Router()
router.use(requireAuth)

router.get('/', async (req, res) => {
  const categories = await prisma.category.findMany({
    where: { OR: [{ userId: req.user!.id }, { userId: null }] },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  })
  res.json(categories)
})

router.post('/', async (req, res) => {
  const { name, color, icon } = req.body
  const cat = await prisma.category.create({
    data: { name, color: color || '#6366f1', icon: icon || 'tag', userId: req.user!.id },
  })
  res.status(201).json(cat)
})

router.patch('/:id', async (req, res) => {
  const cat = await prisma.category.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  })
  if (!cat) { res.status(404).json({ error: 'Not found or not editable' }); return }

  const { name, color, icon } = req.body
  const updated = await prisma.category.update({
    where: { id: req.params.id },
    data: { ...(name && { name }), ...(color && { color }), ...(icon && { icon }) },
  })
  res.json(updated)
})

router.delete('/:id', async (req, res) => {
  const cat = await prisma.category.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  })
  if (!cat) { res.status(404).json({ error: 'Not found or not deletable' }); return }

  // Reassign transactions to 'Other'
  const other = await prisma.category.findFirst({
    where: { name: 'Other', userId: null },
  })
  if (other) {
    await prisma.transaction.updateMany({
      where: { categoryId: req.params.id, userId: req.user!.id },
      data: { categoryId: other.id },
    })
  }

  await prisma.category.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

export default router
