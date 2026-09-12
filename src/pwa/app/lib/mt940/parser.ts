/**
 * MT940 / .sta parser for Dutch bank exports (ING, Rabobank, ABN AMRO).
 *
 * Only the tags Ruim needs are read: :25: (account), :28C: (statement
 * sequence number, used for de-dup), :61: (transaction line) and :86:
 * (structured SEPA description — /NAME//REMI/... subfields).
 * Balance tags (:60x:/:62x:) are ignored: Ruim never trusts a bank balance,
 * only the transactions that build up to it.
 */

export interface ParsedMt940Transaction {
  /** Stable id for de-duplication: bank reference, else statement-seq + line index. */
  sequenceNumber: string
  bookedAt: string // YYYY-MM-DD
  amountCents: number // signed: negative = money out, positive = money in
  counterparty: string
  description: string
}

export interface ParsedMt940Statement {
  iban: string | null
  statementSequenceNumber: string | null
  transactions: ParsedMt940Transaction[]
}

interface RawTag {
  tag: string
  value: string
}

function unwrapTags(content: string): RawTag[] {
  const lines = content.split(/\r?\n/)
  const tags: RawTag[] = []

  for (const line of lines) {
    const match = line.match(/^:(\d{2}[A-Z]?):(.*)$/)
    if (match) {
      const [, tagPart, valuePart] = match
      tags.push({ tag: tagPart!, value: valuePart! })
    } else if (tags.length > 0 && line.trim() !== '' && line.trim() !== '-') {
      tags[tags.length - 1]!.value += `\n${line}`
    }
  }

  return tags
}

function parseAccountIdentification(value: string): string {
  // ":25:" value is typically "NL21INGB0001234567" or "NL21INGB0001234567EUR" —
  // stop at the last digit so a trailing currency code isn't swallowed.
  const match = value.match(/^[A-Z]{2}\d{2}[A-Z0-9]*\d/)
  return match ? match[0] : value.trim()
}

function toIsoDate(yymmdd: string): string {
  const yy = Number(yymmdd.slice(0, 2))
  const mm = yymmdd.slice(2, 4)
  const dd = yymmdd.slice(4, 6)
  const year = yy <= 69 ? 2000 + yy : 1900 + yy
  return `${year}-${mm}-${dd}`
}

interface ParsedStatementLine {
  bookedAt: string
  amountCents: number
  customerReference: string
  bankReference: string | null
}

function parseStatementLine(value: string): ParsedStatementLine | null {
  // YYMMDD [MMDD] (D|C|RD|RC) amount(comma decimal) type-code(1 letter + 3) ref [//bankref]
  const match = value.match(
    /^(\d{6})(\d{4})?(RD|RC|D|C)(\d+,\d{1,2})[A-Z][A-Z0-9]{3}([^\n]*)/,
  )
  if (!match) return null

  // valueDate, mark, amountStr and rest are guaranteed present by the regex above
  const [, valueDate, , mark, amountStr, rest] = match
  const sign = mark === 'C' || mark === 'RD' ? 1 : -1
  const amountCents = Math.round(Number(amountStr!.replace(',', '.')) * 100) * sign

  const [customerReference, bankReference] = rest!.split('//')
  return {
    bookedAt: toIsoDate(valueDate!),
    amountCents,
    customerReference: customerReference!.trim(),
    bankReference: bankReference ? bankReference.trim() : null,
  }
}

function parseDescription(value: string | undefined): { counterparty: string; description: string } {
  if (!value) return { counterparty: 'Onbekend', description: '' }

  if (!value.trimStart().startsWith('/')) {
    return { counterparty: 'Onbekend', description: value.replace(/\n/g, ' ').trim() }
  }

  const parts = value.replace(/\n/g, '').split('/').filter((part) => part !== '')
  const fields: Record<string, string> = {}
  for (let i = 0; i < parts.length - 1; i += 2) {
    fields[parts[i]!] = parts[i + 1]!
  }

  const counterparty = fields.NAME || fields.ORDP || fields.BENM || fields.IBAN || 'Onbekend'
  const description = fields.REMI || value.replace(/\n/g, ' ').trim()
  return { counterparty, description }
}

const PLACEHOLDER_REFERENCES = new Set(['NONREF', 'NOTPROVIDED', ''])

export function parseMt940(content: string): ParsedMt940Statement {
  const tags = unwrapTags(content)

  let iban: string | null = null
  let statementSequenceNumber: string | null = null
  const transactions: ParsedMt940Transaction[] = []

  let pendingLine: ParsedStatementLine | null = null
  let lineIndex = 0

  const flushPending = (descriptionValue?: string) => {
    if (!pendingLine) return
    const { counterparty, description } = parseDescription(descriptionValue)

    const bankRef = pendingLine.bankReference
    const customerRef = pendingLine.customerReference
    const sequenceNumber =
      bankRef && !PLACEHOLDER_REFERENCES.has(bankRef)
        ? bankRef
        : !PLACEHOLDER_REFERENCES.has(customerRef)
          ? customerRef
          : `${statementSequenceNumber ?? 'onbekend'}-${lineIndex}`

    transactions.push({
      sequenceNumber,
      bookedAt: pendingLine.bookedAt,
      amountCents: pendingLine.amountCents,
      counterparty,
      description,
    })
    pendingLine = null
  }

  for (const { tag, value } of tags) {
    switch (tag) {
      case '25':
        iban = parseAccountIdentification(value)
        break
      case '28C':
        statementSequenceNumber = value.trim()
        break
      case '61':
        flushPending() // a :61: without a following :86: still counts as a transaction
        pendingLine = parseStatementLine(value)
        lineIndex += 1
        break
      case '86':
        flushPending(value)
        break
      default:
        break
    }
  }
  flushPending()

  return { iban, statementSequenceNumber, transactions }
}
