import { convert } from 'html-to-text'
import { RawEmail } from './gmail.service'

const MAX_CONTENT_LENGTH = 3000

export interface ParsedEmailContent {
  subject: string
  from: string
  date: Date
  textContent: string
  snippet: string
}

export function parseEmailContent(email: RawEmail): ParsedEmailContent {
  let textContent = email.textBody

  if (!textContent.trim() && email.htmlBody) {
    textContent = convert(email.htmlBody, {
      wordwrap: 130,
      selectors: [
        { selector: 'a', options: { ignoreHref: true } },
        { selector: 'img', format: 'skip' },
        { selector: 'head', format: 'skip' },
        { selector: 'script', format: 'skip' },
        { selector: 'style', format: 'skip' },
      ],
    })
  }

  // Normalize whitespace and truncate
  textContent = textContent
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim()
    .slice(0, MAX_CONTENT_LENGTH)

  return {
    subject: email.subject,
    from: email.from,
    date: email.date,
    textContent,
    snippet: email.snippet.slice(0, 300),
  }
}
