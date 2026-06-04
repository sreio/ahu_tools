import { readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const version = readFileSync(resolve(rootDir, 'VERSION'), 'utf8').trim()
const checkOnly = process.argv.includes('--check')

if (!/^\d+\.\d+\.\d+$/.test(version)) {
  throw new Error(`VERSION must use x.y.z format, got "${version}"`)
}

function writeJson(filePath, update) {
  const absolutePath = resolve(rootDir, filePath)
  const original = readFileSync(absolutePath, 'utf8')
  const data = JSON.parse(original)
  update(data)
  const next = `${JSON.stringify(data, null, 2)}\n`

  if (next === original) return false
  if (checkOnly) {
    console.error(`${filePath} is not synced to VERSION ${version}`)
    process.exitCode = 1
    return true
  }

  writeFileSync(absolutePath, next)
  return true
}

const changed = [
  writeJson('wails.json', (data) => {
    data.info.productVersion = version
  }),
  writeJson('frontend/package.json', (data) => {
    data.version = version
  }),
  writeJson('frontend/package-lock.json', (data) => {
    data.version = version
    if (data.packages?.['']) {
      data.packages[''].version = version
    }
  }),
].some(Boolean)

if (!checkOnly && changed) {
  console.log(`Synced release metadata to ${version}`)
}
