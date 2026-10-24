import ts from 'typescript'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative, resolve } from 'node:path'

// Exact reviewed compatibility boundaries, not a blanket "legacy*" exemption.
const compatibility = new Map([
  ['src/app/api/legacyFrameSubtypes.ts', 'Historical subtype decoding'],
  ['src/app/api/legacyFillingMaterialGroups.ts', 'Historical group decoding'],
  ['src/app/api/legacyFillingOrientations.ts', 'Historical orientation decoding'],
  ['src/app/api/legacyOptionPresence.ts', 'Historical presence decoding'],
  ['src/app/api/legacyGrilleSides.ts', 'Historical side decoding'],
  ['src/app/api/legacySummaryCodes.ts', 'Missing-key historical summary decoding'],
  ['src/app/api/legacyFillingSideCounts.ts', 'Historical side-count decoding'],
  ['src/app/api/legacyParticipantRoles.ts', 'Historical role decoding'],
])
const displayFields = new Set(['name', 'title', 'label', 'blockName'])
// FK-authoritative display-shadow refresh, not material/role classification.
const displayRefreshFunctions = new Map([
  ['src/components/wicket/shared/FillingAppearanceFields.vue', new Set(['setManufacturer', 'setColor'])],
])
const dictionaryRoles = new Set(['openingOptionId', 'peremichkaPolozheniyeId', 'paintCategoryId', 'materialItemId'])
const comparisons = new Set([ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken,
  ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken])

function unwrap(node) {
  while (ts.isParenthesizedExpression(node) || ts.isAsExpression(node)
    || ts.isTypeAssertionExpression(node) || ts.isNonNullExpression(node)) node = node.expression
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) return unwrap(node.left)
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)
    && ['Number', 'String'].includes(node.expression.text) && node.arguments[0]) return unwrap(node.arguments[0])
  if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
    && ['trim', 'toLowerCase', 'toUpperCase'].includes(node.expression.name.text)) return unwrap(node.expression.expression)
  return node
}

function field(node) {
  node = unwrap(node)
  if (ts.isPropertyAccessExpression(node)) return node.name.text
  if (ts.isElementAccessExpression(node) && node.argumentExpression && ts.isStringLiteralLike(node.argumentExpression)) return node.argumentExpression.text
  return null
}

function empty(node) {
  node = unwrap(node)
  return node.kind === ts.SyntaxKind.NullKeyword || (ts.isIdentifier(node) && node.text === 'undefined')
    || (ts.isStringLiteralLike(node) && node.text.trim() === '')
}

function roleId(node) {
  node = unwrap(node)
  if (ts.isPropertyAccessExpression(node) && node.name.text === 'value') return roleId(node.expression)
  return dictionaryRoles.has(field(node)) || (ts.isIdentifier(node) && dictionaryRoles.has(node.text))
}

function positiveInteger(node) {
  return node && ts.isNumericLiteral(node) && Number.isSafeInteger(Number(node.text)) && Number(node.text) > 0
}

function cyrillic(node) {
  node = unwrap(node)
  return ts.isStringLiteralLike(node) && /[А-Яа-яЁё]/u.test(node.text)
}

function literalCriterion(node, onlyCyrillic) {
  if (!node) return false
  node = unwrap(node)
  if (ts.isStringLiteralLike(node)) return onlyCyrillic ? cyrillic(node) : node.text.trim() !== ''
  return ts.isArrayLiteralExpression(node) && node.elements.some(item => literalCriterion(item, onlyCyrillic))
}

function rule(node) {
  if (ts.isBinaryExpression(node) && comparisons.has(node.operatorToken.kind)) {
    const left = unwrap(node.left), right = unwrap(node.right)
    if (empty(left) || empty(right)) return null
    if (cyrillic(left) || cyrillic(right)) return 'caption-predicate'
    if (displayFields.has(field(left)) || displayFields.has(field(right))) return 'display-comparison'
    if ((roleId(left) && positiveInteger(right)) || (roleId(right) && positiveInteger(left))) return 'dictionary-id-role'
  }
  if (ts.isSwitchStatement(node)) {
    if (displayFields.has(field(node.expression))) return 'display-discriminant'
    if (node.caseBlock.clauses.some(item => ts.isCaseClause(item) && cyrillic(item.expression))) return 'caption-case'
    if (roleId(node.expression) && node.caseBlock.clauses.some(item => ts.isCaseClause(item) && positiveInteger(item.expression))) return 'dictionary-id-role'
  }
  if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
    && ['includes', 'startsWith', 'endsWith', 'indexOf'].includes(node.expression.name.text)) {
    const subject = node.expression.expression, criterion = node.arguments[0]
    if (ts.isArrayLiteralExpression(subject) && criterion) {
      if (literalCriterion(subject, true)) return 'caption-predicate'
      if (displayFields.has(field(criterion)) && literalCriterion(subject, false)) return 'display-predicate'
    }
    if (ts.isArrayLiteralExpression(subject) && criterion && roleId(criterion)
      && subject.elements.some(positiveInteger)) return 'dictionary-id-role'
    if (literalCriterion(criterion, true)) return 'caption-predicate'
    if (displayFields.has(field(subject)) && literalCriterion(criterion, false)) return 'display-predicate'
  }
  return null
}

function fragments(source, path) {
  if (!path.endsWith('.vue')) return [{ code: source, offset: 0, expression: false }]
  const result = []
  for (const match of source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
    result.push({ code: match[1], offset: match.index + match[0].indexOf('>') + 1, expression: false })
  }
  for (const match of source.matchAll(/(?:v-if|v-else-if|v-show|v-bind:[\w.-]+|:[\w.-]+)\s*=\s*(["'])([\s\S]*?)\1/g)) {
    result.push({ code: match[2], offset: match.index, expression: true })
  }
  return result
}

export function inspectSource(source, path) {
  if (compatibility.has(path)) return []
  const problems = []
  for (const fragment of fragments(source, path)) {
    const code = fragment.expression ? '(' + fragment.code + ')' : fragment.code
    const file = ts.createSourceFile(path + '.ts', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
    const baseLine = source.slice(0, fragment.offset).split('\n').length
    function visit(node) {
      if (ts.isFunctionDeclaration(node) && node.name
        && displayRefreshFunctions.get(path)?.has(node.name.text)) return
      const finding = rule(node)
      if (finding) problems.push({ path, line: baseLine + file.getLineAndCharacterOfPosition(node.getStart(file)).line, rule: finding })
      ts.forEachChild(node, visit)
    }
    visit(file)
  }
  return problems
}

export function scanRepository(root) {
  root = root instanceof URL ? fileURLToPath(root) : root
  const problems = []
  function scan(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) scan(path)
      else if (/\.(?:ts|vue|js)$/.test(entry.name) && !/\.(?:spec|test)\./.test(entry.name)) {
        problems.push(...inspectSource(readFileSync(path, 'utf8'), relative(root, path).replaceAll('\\', '/')))
      }
    }
  }
  scan(join(root, 'src'))
  return problems.sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const problems = scanRepository(resolve(process.argv[2] ?? dirname(dirname(fileURLToPath(import.meta.url)))))
  for (const problem of problems) console.error(problem.path + ':' + problem.line + ' ' + problem.rule)
  if (problems.length) process.exitCode = 1
  else console.log('Editable-name policy passed. Rename tests and human review remain required.')
}
