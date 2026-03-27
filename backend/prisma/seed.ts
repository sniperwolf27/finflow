import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const defaultCategories = [
  { name: 'Food & Dining',   color: '#f97316', icon: 'utensils',     isDefault: true },
  { name: 'Transport',       color: '#3b82f6', icon: 'car',          isDefault: true },
  { name: 'Shopping',        color: '#ec4899', icon: 'shopping-bag', isDefault: true },
  { name: 'Utilities',       color: '#8b5cf6', icon: 'zap',          isDefault: true },
  { name: 'Entertainment',   color: '#f59e0b', icon: 'tv',           isDefault: true },
  { name: 'Health',          color: '#10b981', icon: 'heart',        isDefault: true },
  { name: 'Travel',          color: '#06b6d4', icon: 'plane',        isDefault: true },
  { name: 'Subscriptions',   color: '#6366f1', icon: 'repeat',       isDefault: true },
  { name: 'Income',          color: '#22c55e', icon: 'trending-up',  isDefault: true },
  { name: 'Other',           color: '#94a3b8', icon: 'tag',          isDefault: true },
]

async function main() {
  console.log('Seeding default categories...')
  for (const cat of defaultCategories) {
    await prisma.category.upsert({
      where: { name_userId: { name: cat.name, userId: null as unknown as string } },
      update: cat,
      create: { ...cat, userId: null },
    })
  }
  console.log(`Seeded ${defaultCategories.length} categories.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
