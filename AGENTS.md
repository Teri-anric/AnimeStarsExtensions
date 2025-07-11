# Agents Instructions

## Template steps

Please use the following steps to create a release.

### Create release 

- change version in manifest.base.json
- Run `make build-chrome` to prepare the Chrome extension
- Review git diff to understand changes between versions (git diff vy.y.y  y.y.y is previous version)
- Create comprehensive release description in RELEASE.md:
  - Read RELEASE.md and understand the structure
  - First, write a technical description of changes
  - Then, translate technical changes into user-friendly language
  - Modify the "Changes" section with specific updates
  - Focus on key improvements that directly impact user experience
- Commit and push all changes
- Create and push git tag: `git tag vx.x.x && git push origin vx.x.x`

Key tips for release description:
- Be specific about actual changes users will notice
- Describe concrete improvements or new features
- Use clear, simple language
- Explain how the changes benefit the user directly

Example translation:
- Technical: "Added API statistics loading"
- User-friendly: "Introduced new tracking features to enhance our understanding of how users interact with the extension"

## Memory

Please usage commands by step by step.