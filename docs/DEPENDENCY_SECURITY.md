# Dependency security maintenance

## October 2026 dependency updates

The high-severity alerts in `package-lock.json` and `src-tauri/Cargo.lock` were addressed by updating dependencies and removing unused build plugins. Alerts are not suppressed, and no advisory ignores or package forks were added.

The npm lockfile now resolves React Router 7.18.4, PostCSS 8.5.30, source-map-js 1.2.2, Browserslist 4.29.3, nanoid 3.3.20, and brace-expansion 2.1.7. Vitest is updated within its existing major version to 4.1.11.

The `braces` advisory [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) has no patched version. Tailwind 3 and the unused `rollup-plugin-copy` pulled in this package, so Tailwind was migrated to 4.3.3 and the unused copy, Babel, and CommonJS Rollup plugins were removed. `braces` is absent from the resulting dependency tree.

### CSS build integration

Vite uses the official `@tailwindcss/vite` plugin. `src/index.css` imports Tailwind and explicitly loads the existing `tailwind.config.js`, preserving the app's theme and animation plugin. The configuration uses an ES module import for `tailwindcss-animate`. Tailwind handles imports and vendor prefixes; the old PostCSS configuration and standalone Autoprefixer dependency were removed. PostCSS remains a patched direct build dependency.

Follow the [official Tailwind upgrade guide](https://tailwindcss.com/docs/upgrade-guide) when changing this integration. Editor regression tests cover the CSS migration alongside layout checks for the editor, accepted prose controls, and generation details.

### Desktop dependencies

The Cargo lockfile resolves `quinn-proto` 0.11.19, `rustls` 0.23.45, and `rustls-webpki` 0.103.15, including their required supporting dependency updates. The desktop manifest and app version are unchanged.

## Verification

```powershell
npm.cmd audit
npm.cmd run build
npm.cmd run test:unit
npm.cmd run test:e2e:editor
cargo check --manifest-path src-tauri/Cargo.toml --locked
```

The security update passed the production build, all 102 unit tests, all 20 editor tests, and the locked desktop compile check. Sampled editor styles matched the pre-migration baseline. The local LLM lane could not run because LM Studio was unavailable; its preflight aborted without sending paid-provider requests.

After updating either lockfile, also review the repository's open GitHub Dependabot alerts. npm audit covers npm dependencies only; the desktop compile check verifies compatibility but does not replace a Rust vulnerability scan.

The resulting npm audit has no high, critical, or moderate findings. One low-severity [KaTeX advisory](https://github.com/advisories/GHSA-238p-pmpm-9mq7) remains in the existing 0.16 release line. Its fix requires a separate upgrade outside the current declared version range. `npm audit` therefore still exits with status 1; do not use `npm audit fix --force` without reviewing and testing that upgrade.
