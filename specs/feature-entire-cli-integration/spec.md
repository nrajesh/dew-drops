# Feature Specification: Entire CLI Integration

## 1. Problem Statement
The Entire CLI needs to be installed, the system path updated, and Git hooks modified to use the absolute path of the `entire` command, ensuring that Git GUI clients like VSCode can correctly execute the hooks.

## 2. Goals
- Successfully install Entire CLI on the user's mac system.
- Ensure the `entire` executable is in the user's PATH (`~/.zshrc`).
- Replace relative `entire` commands in Git hooks (`commit-msg`, `prepare-commit-msg`, `post-commit`, `pre-push`) with the absolute path `/Users/nrajesh/.local/bin/entire`.
- Provide a seamless commit and push experience for the developer regardless of their terminal/IDE environment.

## 3. Non-Goals
- Modifying the core functionality of the Entire CLI.
- Changing the hooks for other tools besides Entire CLI.

## 4. User Stories
- As a developer, I want to use the VSCode Source Control tab to commit code without encountering `entire: command not found` errors.

## 5. Functional Requirements
- `~/.local/bin/entire` must exist and be executable.
- `.git/hooks/commit-msg`, `.git/hooks/prepare-commit-msg`, `.git/hooks/post-commit`, and `.git/hooks/pre-push` must use `/Users/nrajesh/.local/bin/entire` instead of `entire`.

## 6. Non-Functional Requirements
- Git hook execution must be fast and suppress unnecessary errors (`2>/dev/null || true` where applicable).
