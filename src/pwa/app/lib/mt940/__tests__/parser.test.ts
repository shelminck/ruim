import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parseMt940 } from '../parser'

function loadFixture(name: string): string {
  const path = fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url))
  return readFileSync(path, 'utf-8')
}

describe('parseMt940', () => {
  it('extracts the account IBAN and statement sequence number', () => {
    const result = parseMt940(loadFixture('ing-sample.sta'))
    expect(result.iban).toBe('NL21INGB0001234567')
    expect(result.statementSequenceNumber).toBe('00123/00001')
  })

  it('parses a debit line with structured SEPA description', () => {
    const result = parseMt940(loadFixture('ing-sample.sta'))
    const debit = result.transactions[0]!

    expect(debit.bookedAt).toBe('2026-09-02')
    expect(debit.amountCents).toBe(-6250)
    expect(debit.counterparty).toBe('Albert Heijn 1354')
    expect(debit.description).toBe('Boodschappen week 36')
  })

  it('parses a credit line and prefers the bank reference for de-dup', () => {
    const result = parseMt940(loadFixture('ing-sample.sta'))
    const credit = result.transactions[1]!

    expect(credit.bookedAt).toBe('2026-09-03')
    expect(credit.amountCents).toBe(265000)
    expect(credit.counterparty).toBe('Werkgever B.V.')
    expect(credit.description).toBe('Salaris september 2026')
    expect(credit.sequenceNumber).toBe('1102260900012345')
  })

  it('falls back to a statement+line composite key when no usable reference exists', () => {
    const result = parseMt940(loadFixture('ing-sample.sta'))
    const debit = result.transactions[0]!

    // NONREF is a placeholder, not a real reference -> composite fallback
    expect(debit.sequenceNumber).toBe('00123/00001-1')
  })

  it('produces two distinct transactions', () => {
    const result = parseMt940(loadFixture('ing-sample.sta'))
    expect(result.transactions).toHaveLength(2)

    const sequenceNumbers = new Set(result.transactions.map((tx) => tx.sequenceNumber))
    expect(sequenceNumbers.size).toBe(2)
  })
})
