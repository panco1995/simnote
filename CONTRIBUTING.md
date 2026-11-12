# Contributing

Thanks for your interest in SimNote!

## Reporting issues

- **Bugs**: include your OS and version, the SimNote version, steps to reproduce, and what you expected versus what happened.
- **Feature requests**: describe the use case. SimNote aims to stay minimal, so new features are weighed against whether they are truly necessary.

## Submitting a pull request

1. Fork the repository and create a branch from `main`, e.g. `feat/export-markdown` or `fix/search-crash`.
2. Set up your environment as described in the README's "Building from source" section, and verify your change locally with `npm run tauri dev`.
3. Make sure these commands pass before committing:
   ```bash
   npm run build                                  # TypeScript type-check + frontend build
   cargo fmt --manifest-path src-tauri/Cargo.toml --check
   cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
   ```
4. Commit messages should follow [Conventional Commits](https://www.conventionalcommits.org/), e.g. `feat: export notes as Markdown`.
5. Include screenshots in the PR for any UI changes.

## Design principles

- **Keep it simple**: avoid adding dependencies. The frontend currently uses no UI framework.
- **Keep it retro**: new UI elements should follow the 90s desktop style. Reuse the CSS variables in `src/style.css` (`--face`, `--raised`, `--sunken`, etc.) for colors and beveled borders.
- **Data safety first**: no change may ever cause user notes to be lost or overwritten.
