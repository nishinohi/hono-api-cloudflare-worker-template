import { exec, execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { promisify } from 'util'

const execAsync = promisify(exec)

// git rev-parse --show-toplevel でworktreeにも対応したプロジェクトルートを取得
function getProjectRoot() {
  try {
    return execSync('git rev-parse --show-toplevel', {
      stdio: 'pipe',
      encoding: 'utf8',
      cwd: process.cwd(),
    }).trim()
  } catch {
    // フォールバック: hookファイルの場所から計算
    return path.join(path.dirname(fileURLToPath(import.meta.url)), '../..')
  }
}

const projectRoot = getProjectRoot()

// Read stdin (required for hooks)
async function readInput() {
  const chunks = []
  for await (const chunk of process.stdin) {
    chunks.push(chunk)
  }
  return JSON.parse(Buffer.concat(chunks).toString())
}

// Get modified files using git
function getModifiedFiles() {
  try {
    const staged = execSync('git diff --cached --name-only', {
      stdio: 'pipe',
      encoding: 'utf8',
      cwd: projectRoot,
    }).trim()

    const unstaged = execSync('git diff --name-only', {
      stdio: 'pipe',
      encoding: 'utf8',
      cwd: projectRoot,
    }).trim()

    const files = [...new Set([...staged.split('\n'), ...unstaged.split('\n')])]
      .filter((f) => f.length > 0)
      .filter((f) => fs.existsSync(path.join(projectRoot, f)))

    return files
  } catch {
    return []
  }
}

async function runTypeCheck() {
  try {
    await execAsync('pnpm -r typecheck', {
      encoding: 'utf8',
      cwd: projectRoot,
    })
    return null
  } catch (error) {
    return error.stdout || error.stderr || error.message
  }
}

async function runESLintCheck() {
  try {
    await execAsync('pnpm -r lint', {
      encoding: 'utf8',
      cwd: projectRoot,
    })
    return null
  } catch (error) {
    return error.stdout || error.stderr || error.message
  }
}

async function main() {
  try {
    await readInput() // Consume stdin (required)

    const modifiedFiles = getModifiedFiles()

    // Check if any JS/TS files were modified
    const jstsFiles = modifiedFiles.filter((f) => /\.(ts|tsx|js|jsx)$/.test(f))
    if (jstsFiles.length === 0) {
      process.exit(0)
    }

    const hasTypeScriptFiles = jstsFiles.some((f) => /\.(ts|tsx)$/.test(f))

    // Run type check and ESLint check in parallel
    const checks = [runESLintCheck()]
    if (hasTypeScriptFiles) {
      checks.push(runTypeCheck())
    }

    const results = await Promise.all(checks)
    const errors = results.filter((error) => error !== null)

    if (errors.length > 0) {
      console.error(errors.join('\n\n'))
      process.exit(2)
    }
  } catch (error) {
    console.error(`Hook error: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(`Hook error: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
