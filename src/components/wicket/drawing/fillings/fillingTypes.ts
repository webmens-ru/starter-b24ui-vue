export type FillingType = 'none' | 'c8' | 'c20' | 'mp10' | 'mp20' | 'logSiding'

export function resolveFillingType(materialGroup: string, materialName: string): FillingType {
  const value = `${materialGroup} ${materialName}`.trim()
  if (/сайдинг[\s«"]*бревно/i.test(value)) return 'logSiding'
  if (/мп\s*[-–]?\s*20|mp\s*[-–]?\s*20/i.test(value)) return 'mp20'
  if (/мп\s*[-–]?\s*10|mp\s*[-–]?\s*10/i.test(value)) return 'mp10'
  if (/с\s*[-–]?\s*20|c\s*[-–]?\s*20/i.test(value)) return 'c20'
  if (/с\s*[-–]?\s*8|c\s*[-–]?\s*8/i.test(value)) return 'c8'
  return 'none'
}
