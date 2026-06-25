# Contributing to FlowSync

First off, thank you for taking the time to contribute!

This document outlines the workflow and standards for developing and contributing to FlowSync.

## Branching Strategy

We follow a structured branching model:
* **`main`**: Production release branch. Stable code only.
* **`dev`**: Integration branch for upcoming releases. All feature branches merge here.
* **`feature/<name>`**: Feature development branches. Spawned from `dev` and merged back into `dev`.
* **`hotfix/<name>`**: Quick patches for bugs on `main`. Spawned from `main` and merged to both `main` and `dev`.

## Conventional Commits

We enforce the [Conventional Commits](https://www.conventionalcommits.org/) specification for clear git histories:

* `feat: ...` for new features (e.g. `feat: add task priorities`)
* `fix: ...` for bug fixes (e.g. `fix: handle expired refresh token`)
* `docs: ...` for documentation updates
* `style: ...` for styling changes (CSS, layout adjustments, linting)
* `refactor: ...` for structural code rewrites without logic changes
* `chore: ...` for maintenance task and package updates

## Development Workflow

1. Clone the repository and checkout the `dev` branch.
2. Create a new branch: `git checkout -b feature/my-cool-feature`
3. Install dependencies in both folders:
   ```bash
   # Backend
   cd backend && npm install
   
   # Frontend
   cd ../frontend && npm install
   ```
4. Setup your environmental variables:
   * Copy `backend/.env.example` to `backend/.env` and update the values.
5. Launch development servers:
   * Backend: `npm run dev` in `backend` directory (runs on port 5000)
   * Frontend: `npm run dev` in `frontend` directory (runs Vite on port 5173)
6. Ensure your changes compile and pass checks:
   ```bash
   # Run type checks
   cd backend && npx tsc --noEmit
   cd ../frontend && npx tsc -b
   ```

## Pull Request Guidelines

* Always target the `dev` branch when creating a PR.
* Provide a descriptive title and summary of changes.
* Link any related issues.
* Ensure all CI checks (TypeScript compiler checks) are green before requesting a review.
