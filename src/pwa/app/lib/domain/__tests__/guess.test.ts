import { describe, expect, it } from 'vitest'
import { findRetroactiveCandidates, guessEnvelopeForTransaction } from '../guess'

describe('guessEnvelopeForTransaction', () => {
  it('returns null when the counterparty was never categorized before', () => {
    const guess = guessEnvelopeForTransaction({ counterparty: 'Nieuwe Winkel' }, [])
    expect(guess).toBeNull()
  })

  it('picks the most frequent envelope for that counterparty, case-insensitively', () => {
    const history = [
      { counterparty: 'Albert Heijn 1354', envelopeId: 'boodschappen' },
      { counterparty: 'albert heijn 1354', envelopeId: 'boodschappen' },
      { counterparty: 'Albert Heijn 1354', envelopeId: 'uit-eten' },
    ]
    const guess = guessEnvelopeForTransaction({ counterparty: 'ALBERT HEIJN 1354' }, history)
    expect(guess).toEqual({ envelopeId: 'boodschappen', confidencePercent: 67 })
  })

  it('ignores still-unassigned historical transactions', () => {
    const history = [{ counterparty: 'Shell', envelopeId: null }]
    expect(guessEnvelopeForTransaction({ counterparty: 'Shell' }, history)).toBeNull()
  })
})

describe('findRetroactiveCandidates', () => {
  it('finds other unassigned transactions with the same counterparty, excluding itself', () => {
    const current = { id: 'tx-1', counterparty: 'Shell' }
    const queue = [
      { id: 'tx-1', counterparty: 'Shell' },
      { id: 'tx-2', counterparty: 'shell' },
      { id: 'tx-3', counterparty: 'Albert Heijn' },
    ]
    const candidates = findRetroactiveCandidates(current, queue)
    expect(candidates.map((c) => c.id)).toEqual(['tx-2'])
  })
})
