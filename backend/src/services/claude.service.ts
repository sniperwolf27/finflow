import Anthropic from '@anthropic-ai/sdk'
import { env } from '../config/env'
import { ParsedEmailContent } from './email-parser.service'

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

export interface ExtractedTransaction {
  found: boolean
  amount?: number
  currency?: string
  type?: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  date?: string
  description?: string
  merchant?: string
  category?: string
  confidence?: number
}

const EXTRACTION_TOOL: Anthropic.Tool = {
  name: 'extract_transaction',
  description: 'Extract financial transaction data from an email. Return found=false if this is not a financial email (newsletter, promotion without purchase, etc).',
  input_schema: {
    type: 'object' as const,
    properties: {
      found: {
        type: 'boolean',
        description: 'true if this email contains a real financial transaction',
      },
      amount: {
        type: 'number',
        description: 'Transaction amount as a positive number',
      },
      currency: {
        type: 'string',
        description: 'ISO 4217 currency code (USD, MXN, EUR, COP, ARS, BRL, etc.)',
      },
      type: {
        type: 'string',
        enum: ['INCOME', 'EXPENSE', 'TRANSFER'],
        description: 'INCOME for money received, EXPENSE for money spent, TRANSFER between own accounts',
      },
      date: {
        type: 'string',
        description: 'Transaction date in ISO 8601 format YYYY-MM-DD. Use email date if not explicit.',
      },
      description: {
        type: 'string',
        description: 'Short description of the transaction (max 100 chars)',
      },
      merchant: {
        type: 'string',
        description: 'Name of the merchant, store, or service provider',
      },
      category: {
        type: 'string',
        enum: [
          'Food & Dining',
          'Transport',
          'Shopping',
          'Utilities',
          'Entertainment',
          'Health',
          'Travel',
          'Subscriptions',
          'Income',
          'Other',
        ],
        description: 'Best matching category for this transaction',
      },
      confidence: {
        type: 'number',
        description: 'Confidence score from 0.0 to 1.0',
      },
    },
    required: ['found'],
  },
}

export async function extractTransaction(
  email: ParsedEmailContent
): Promise<ExtractedTransaction> {
  const prompt = `Analyze this email and extract any financial transaction information.

Subject: ${email.subject}
From: ${email.from}
Date: ${email.date.toISOString()}

Email content:
${email.textContent}

Use the extract_transaction tool to return the data.`

  try {
    const response = await client.messages.create({
      model: env.CLAUDE_MODEL,
      max_tokens: 1024,
      tools: [EXTRACTION_TOOL],
      tool_choice: { type: 'any' },
      messages: [{ role: 'user', content: prompt }],
    })

    const toolUse = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
    if (!toolUse) {
      console.log('[Claude] No tool use block returned for:', email.subject)
      return { found: false }
    }

    const result = toolUse.input as ExtractedTransaction
    console.log(`[Claude] "${email.subject}" → found=${result.found}${result.found ? ` amount=${result.amount} ${result.currency}` : ''}`)
    return result
  } catch (err) {
    console.error('[Claude] Extraction failed:', err)
    return { found: false }
  }
}

export const CATEGORY_NAMES = [
  'Food & Dining', 'Transport', 'Shopping', 'Utilities',
  'Entertainment', 'Health', 'Travel', 'Subscriptions', 'Income', 'Other',
] as const

export type CategoryName = (typeof CATEGORY_NAMES)[number]

const BATCH_CATEGORIZE_TOOL: Anthropic.Tool = {
  name: 'categorize_transactions',
  description: 'Assign the best-matching category to each transaction.',
  input_schema: {
    type: 'object' as const,
    properties: {
      results: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id:       { type: 'string' },
            category: { type: 'string', enum: CATEGORY_NAMES as unknown as string[] },
          },
          required: ['id', 'category'],
        },
      },
    },
    required: ['results'],
  },
}

/** One API call to categorize up to N transactions at once. Returns a map of id → category name. */
export async function categorizeTransactionsBatch(
  transactions: { id: string; description: string; merchant: string | null }[]
): Promise<Record<string, string>> {
  if (transactions.length === 0) return {}

  const list = transactions
    .map((t, i) => `${i + 1}. [${t.id}] merchant="${t.merchant || ''}" desc="${t.description}"`)
    .join('\n')

  const prompt = `Categorize each transaction using one of: ${CATEGORY_NAMES.join(', ')}.

${list}

Use the categorize_transactions tool and return one result per transaction.`

  try {
    const response = await client.messages.create({
      model: env.CLAUDE_MODEL,
      max_tokens: 1024,
      tools: [BATCH_CATEGORIZE_TOOL],
      tool_choice: { type: 'any' },
      messages: [{ role: 'user', content: prompt }],
    })

    const toolUse = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
    if (!toolUse) return {}

    const input = toolUse.input as Record<string, unknown>
    const results = Array.isArray(input.results) ? input.results : []
    const map: Record<string, string> = {}
    for (const r of results as { id: string; category: string }[]) {
      if (r?.id && CATEGORY_NAMES.includes(r.category as CategoryName)) {
        map[r.id] = r.category
      }
    }
    console.log(`[Claude] Batch categorized ${Object.keys(map).length}/${transactions.length} transactions`)
    return map
  } catch (err) {
    console.error('[Claude] Batch categorize failed:', err)
    return {}
  }
}

export async function parseTransactionFromText(
  text: string,
  currentDate: string
): Promise<ExtractedTransaction> {
  const prompt = `The user described a financial transaction. Extract the data.

Today's date: ${currentDate}

User input: "${text}"

Instructions:
- Set found=true if this describes a real financial transaction.
- Infer the currency from context clues (e.g. "pesos" → MXN, "$" alone → USD, "€" → EUR).
- If the user says "hoy" or "today", use today's date.
- Set type=EXPENSE for purchases, type=INCOME for money received.
- Choose the most accurate category from the list.
- Set confidence based on how clear the description is.

Use the extract_transaction tool to return the data.`

  try {
    const response = await client.messages.create({
      model: env.CLAUDE_MODEL,
      max_tokens: 1024,
      tools: [EXTRACTION_TOOL],
      tool_choice: { type: 'any' },
      messages: [{ role: 'user', content: prompt }],
    })

    const toolUse = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
    if (!toolUse) return { found: false }

    const result = toolUse.input as ExtractedTransaction
    console.log(`[Claude] AI parse: found=${result.found}${result.found ? ` amount=${result.amount} ${result.currency} cat=${result.category}` : ''}`)
    return result
  } catch (err) {
    console.error('[Claude] AI parse failed:', err)
    return { found: false }
  }
}
