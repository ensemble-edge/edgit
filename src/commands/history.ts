import { Command } from './base.js'

/**
 * History command stub for Git tag-based versioning
 */
export class HistoryCommand extends Command {
  async execute(args: string[]): Promise<void> {
    if (this.shouldShowHelp(args)) {
      console.log(this.getHelp())
      return
    }

    console.log('📈 Component version history is now managed via Git tags.')
    console.log('')
    console.log('🔍 To view version history:')
    console.log('   edgit tag list <component>           # List all versions')
    console.log('   edgit tag show <component> <version> # Show version details')
    console.log('')
    console.log('💡 All version history is stored as Git tags for better workflow.')
  }

  getHelp(): string {
    return `
📈 edgit history - DEPRECATED - Use Git tag commands

ALTERNATIVES:
   edgit tag list <component>           # List component versions
   edgit tag show <component> <version> # Show version details
   edgit deploy status <component>      # Show deployment history
`
  }
}
