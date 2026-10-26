import type { CalcBlock } from '../stores/wicket/types'
import { adaptLegacySummaryBlock } from './api/legacySummaryCodes'

export function normalizeSummaryBlocks(blocks: CalcBlock[]): CalcBlock[] {
  return blocks.map(adaptLegacySummaryBlock)
}

export function findSummaryBlock(blocks: CalcBlock[], blockCode: string): CalcBlock | undefined {
  return normalizeSummaryBlocks(blocks).find(block => block.blockCode === blockCode)
}

export function withoutSummaryBlock(blocks: CalcBlock[], blockCode: string): CalcBlock[] {
  return normalizeSummaryBlocks(blocks).filter(block => block.blockCode !== blockCode)
}
