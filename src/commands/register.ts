import { Command } from './base.js'

/**
 * Register command stub for Git tag-based versioning
 */
export class RegisterCommand extends Command {
  async execute(args: string[]): Promise<void> {
    if (this.shouldShowHelp(args)) {
      console.log(this.getHelp())
      return
    }

    console.log('📝 Component registration is now automatic.')
    console.log('')
    console.log('🔍 To manage components:')
    console.log('   edgit init --force                   # Scan and register components')
    console.log('   edgit components                     # List registered components')
    console.log('   edgit tag create <component> <version> # Create version')
    console.log('')
    console.log('💡 Components are automatically discovered by file patterns.')
  }

  getHelp(): string {
    return `
📝 edgit register - DEPRECATED - Automatic discovery

ALTERNATIVES:
   edgit init                           # Initialize and discover components
   edgit components                     # View discovered components
   edgit tag create <component> <version>  # Create version
`
  }
}
