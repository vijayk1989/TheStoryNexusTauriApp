# Contributing Guide

This project tracks two upstreams: StoryNexus (app) and Memori (memory engine). Work happens on `develop`; `main` is reserved for releases; `storynexus` tracks upstream StoryNexus.

## Remotes
- `origin`: fork at https://github.com/proton4444/TheStoryNexusTauriApp
- `upstream-storynexus`: https://github.com/vijayk1989/TheStoryNexusTauriApp
- `memori`: https://github.com/MemoriLabs/Memori

## Branches
- `main`: release branch; keep in sync with upstream after validation.
- `develop`: default branch for integration work and PRs.
- `storynexus`: tracking branch for upstream StoryNexus (`upstream-storynexus/main`); do not develop directly here.
- `src/memori`: git subtree of `memori/main` (squashed) for reference.

## Weekly upstream sync
1) `git checkout storynexus`
2) `git fetch upstream-storynexus`
3) `git pull --ff-only upstream-storynexus main`
4) `git checkout develop`
5) `git merge storynexus` (resolve conflicts; prefer adapter layers over upstream changes)
6) `git subtree pull --prefix=src/memori memori main --squash`
7) Run the full test suite (Rust, Python, React) before pushing.

## Working on features
1) `git checkout develop && git pull`
2) `git checkout -b feature/<short-name>`
3) Develop and add tests (FastAPI endpoints, Rust commands, React hooks/components).
4) Open PR into `develop`.

## PR expectations
- Fill out the PR template.
- Include relevant tests; avoid regressions in the sandwich loop.
- Do not edit `src/memori` by hand; use `git subtree pull` for updates.
- Keep commits scoped and readable.

## Releases
- Release PRs merge `develop` into `main` after passing CI and smoke tests.
- Tag releases with semantic versions.

## Branch protection
- Enable protection on `main` and `develop` (required reviews, status checks) in the repo settings when available.
