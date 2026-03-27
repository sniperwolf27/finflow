import { prisma } from '../config/prisma'

export async function listSavingsGoals(userId: string) {
  return prisma.savingsGoal.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  })
}

export async function createSavingsGoal(
  userId: string,
  data: {
    name: string
    emoji?: string
    color?: string
    targetAmount: number
    currentAmount?: number
    currency?: string
    deadline?: string | null
  },
) {
  return prisma.savingsGoal.create({
    data: {
      userId,
      name: data.name,
      emoji: data.emoji ?? '🎯',
      color: data.color ?? '#6366f1',
      targetAmount: data.targetAmount,
      currentAmount: data.currentAmount ?? 0,
      currency: data.currency ?? 'USD',
      deadline: data.deadline ? new Date(data.deadline) : null,
    },
  })
}

export async function updateSavingsGoal(
  userId: string,
  goalId: string,
  data: Partial<{
    name: string
    emoji: string
    color: string
    targetAmount: number
    currentAmount: number
    currency: string
    deadline: string | null
  }>,
) {
  const goal = await prisma.savingsGoal.findFirst({ where: { id: goalId, userId } })
  if (!goal) return null

  return prisma.savingsGoal.update({
    where: { id: goalId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.emoji !== undefined && { emoji: data.emoji }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.targetAmount !== undefined && { targetAmount: data.targetAmount }),
      ...(data.currentAmount !== undefined && { currentAmount: data.currentAmount }),
      ...(data.currency !== undefined && { currency: data.currency }),
      ...(data.deadline !== undefined && { deadline: data.deadline ? new Date(data.deadline) : null }),
    },
  })
}

export async function deleteSavingsGoal(userId: string, goalId: string) {
  const goal = await prisma.savingsGoal.findFirst({ where: { id: goalId, userId } })
  if (!goal) return null
  return prisma.savingsGoal.delete({ where: { id: goalId } })
}
