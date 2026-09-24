import { describe, expect, test, tier } from 'claude-code/testing'

tier('user')

describe('register', () => {
  test('a Read whose content holds a GitHub token reaches the model masked', async ($, on) => {
    on('tool.call', () => ({
      result: { type: 'text', file: { filePath: '/r/config.txt', content: 'token=ghp_' + 'Z'.repeat(36), numLines: 1, startLine: 1, totalLines: 1 } },
    }))
    const r = await $.tool.call({ tool: 'Read', file_path: '/r/config.txt' })
    expect(r.result.file.content).toBe('token=[REDACTED:github]')
  })

  test('a Read with nothing to mask comes back as the engine answered it', async ($, on) => {
    const answered = { result: { type: 'text', file: { filePath: '/r/a.txt', content: 'plain', numLines: 1, startLine: 1, totalLines: 1 } } }
    on('tool.call', () => answered)
    const r = await $.tool.call({ tool: 'Read', file_path: '/r/a.txt' })
    expect(r.result.file.content).toBe('plain')
  })
})
