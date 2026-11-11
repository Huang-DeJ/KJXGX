import assert from "node:assert/strict"
import test from "node:test"

async function loadConfig(githubActions) {
  const previousValue = process.env.GITHUB_ACTIONS

  if (githubActions === undefined) {
    delete process.env.GITHUB_ACTIONS
  } else {
    process.env.GITHUB_ACTIONS = githubActions
  }

  try {
    const cacheKey = `${githubActions ?? "local"}-${Date.now()}-${Math.random()}`
    return (await import(`../next.config.ts?environment=${cacheKey}`)).default
  } finally {
    if (previousValue === undefined) {
      delete process.env.GITHUB_ACTIONS
    } else {
      process.env.GITHUB_ACTIONS = previousValue
    }
  }
}

test("GitHub Actions exports the site beneath the repository path", async () => {
  const config = await loadConfig("true")

  assert.equal(config.output, "export")
  assert.equal(config.basePath, "/KJXGX")
  assert.equal(config.trailingSlash, true)
  assert.equal(config.images?.unoptimized, true)
})

test("local development remains available at the root path", async () => {
  const config = await loadConfig(undefined)

  assert.equal(config.output, "standalone")
  assert.equal(config.basePath, "")
})
