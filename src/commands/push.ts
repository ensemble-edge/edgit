import { Command } from './base.js'
import { EdgitError } from '../errors/index.js'

/**
 * Push command - thin wrapper around `git push`
 *
 * This command embodies the "thin git wrapper" philosophy:
 * - Edgit's job ends at `git push`
 * - Everything after (KV sync, Worker rebuild) is GitHub Actions
 * - No Cloudflare communication, no KV knowledge
 *
 * Usage:
 *   edgit push                    # Push commits only
 *   edgit push --tags             # Push commits + all tags
 *   edgit push --tags --force     # Push with force (for moved env tags)
 *   edgit push --remote upstream  # Push to specific remote
 */
export class PushCommand extends Command {
  async execute(args: string[]): Promise<void> {
    if (this.shouldShowHelp(args)) {
      console.log(this.getHelp())
      return
    }

    await this.validateGitRepo()

    const { flags, options } = this.parseArgs(args)

    const includeTags = flags['tags'] || false
    const force = flags['force'] || flags['f'] || false
    const remote = options['remote'] || 'origin'

    await this.push({ includeTags, force, remote })
  }

  /**
   * Execute the push operation
   */
  private async push(options: {
    includeTags: boolean
    force: boolean
    remote: string
  }): Promise<void> {
    const { includeTags, force, remote } = options

    // Push commits
    console.log('Pushing commits...')
    const commitResult = await this.git.exec(['push', remote])

    if (commitResult.exitCode !== 0) {
      // Check for common errors
      if (commitResult.stderr.includes('no upstream branch')) {
        this.showError('No upstream branch configured.', [
          `Run: git push -u ${remote} <branch-name>`,
          'Or: git branch --set-upstream-to=origin/<branch>',
        ])
        throw new EdgitError('GIT_ERROR', 'No upstream branch configured')
      }

      this.showError(`Failed to push commits: ${commitResult.stderr}`)
      throw new EdgitError('GIT_ERROR', `Failed to push commits: ${commitResult.stderr}`)
    }

    this.showSuccess('Commits pushed')

    // Push tags if requested
    if (includeTags) {
      console.log('Pushing tags...')

      const tagArgs = ['push', remote, '--tags']
      if (force) {
        tagArgs.push('--force')
      }

      const tagResult = await this.git.exec(tagArgs)

      if (tagResult.exitCode !== 0) {
        // Check for common tag push errors
        if (tagResult.stderr.includes('rejected') && !force) {
          this.showError('Tag push rejected. Tags may already exist on remote.', [
            'For environment tags (staging, production), use: edgit push --tags --force',
            'Version tags (v1.0.0) should not need --force unless correcting a mistake',
          ])
          throw new EdgitError('GIT_ERROR', 'Tag push rejected - use --force for environment tags')
        }

        this.showError(`Failed to push tags: ${tagResult.stderr}`)
        throw new EdgitError('GIT_ERROR', `Failed to push tags: ${tagResult.stderr}`)
      }

      this.showSuccess('Tags pushed')
      console.log('')
      console.log('GitHub Actions will process any component/logic tags.')
      console.log('')
      this.showInfo('Tag format: {prefix}/{type}/{name}/{slot}')
      console.log('  • components/* → Syncs to KV (hot-swappable)')
      console.log('  • logic/*      → Triggers Worker rebuild')
    }
  }

  getHelp(): string {
    return `
edgit push - Push commits and tags to remote

USAGE:
  edgit push [options]

OPTIONS:
  --tags           Push all tags (triggers GitHub Actions for deployment)
  --force, -f      Force push (required for moved environment tags)
  --remote <name>  Remote name (default: origin)
  --help, -h       Show this help message

PHILOSOPHY:
  Edgit is a thin git wrapper. This command wraps 'git push'.

  Edgit's job ends at 'git push'. Everything after that is GitHub Actions:
  • GitHub Actions detect tag pushes
  • Actions parse tags and sync content to KV
  • Actions trigger Worker rebuilds for logic changes

WHEN TO USE --force:
  • Version tags (v1.0.0) are immutable - no --force needed
  • Environment tags (staging, production) are mutable - --force required

  First deployment to an environment:
    edgit push --tags              # OK (tag doesn't exist yet)

  Subsequent deployments (moving the tag):
    edgit push --tags --force      # Required (tag already exists)

EXAMPLES:
  edgit push                       # Push commits only
  edgit push --tags                # Push commits + all tags
  edgit push --tags --force        # Push with force (for moved tags)
  edgit push --remote upstream     # Push to 'upstream' remote

TAG FORMAT:
  Tags use 4-level hierarchy: {prefix}/{type}/{name}/{slot}

  Examples:
    components/prompts/extraction/v1.0.0      # Version tag
    components/prompts/extraction/production  # Environment tag
    logic/agents/classifier/staging           # Logic tag (triggers rebuild)

WORKFLOW:
  1. Create version tag:    edgit tag create prompts/extraction v1.0.0
  2. Push (new tag):        edgit push --tags
  3. Deploy to staging:     edgit tag set prompts/extraction staging v1.0.0
  4. Push (move tag):       edgit push --tags --force
`
  }
}
