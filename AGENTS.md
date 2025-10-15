# Repository Guidelines

## Project Structure & Module Organization
- Source lives in `app/` (App Router). Add routes via folders under `app/`; `page.tsx` renders the route and `layout.tsx` defines shared UI.
- Global styles: `app/globals.css` (Tailwind v4). Static assets: `public/`.
- Config: `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`.

## Build, Test, and Development Commands
- `npm run dev` — start Next.js dev server at `http://localhost:3000`.
- `npm run build` — production build (`.next/`).
- `npm start` — run the production build locally.
- `npm run lint` — ESLint (Next core-web-vitals + TypeScript).

Example: after changes, lint and build before pushing
```bash
npm run lint && npm run build
```

## Coding Style & Naming Conventions
- Language: TypeScript (strict). Prefer functional React components.
- Indentation: 2 spaces. Filenames: `kebab-case` for files, `PascalCase` for components if extracted.
- Imports: use `@/*` alias for workspace-rooted imports when appropriate.
- Styling: Tailwind utility classes in JSX; keep minimal global CSS.
- Linting: fix warnings before PRs; no `any` unless justified.

## Testing Guidelines
- No unit test framework is configured yet. If adding tests, prefer Vitest or Jest with React Testing Library; place under `__tests__/` mirroring `app/` structure.
- Ensure routes render without runtime errors and basic interactions work.

## Commit & Pull Request Guidelines
- Commits: concise, imperative. Prefer Conventional Commits (e.g., `feat:`, `fix:`, `chore:`).
- PRs: include scope/summary, linked issues, and screenshots for UI changes.
- Verify locally: `npm run lint && npm run build`. Address ESLint errors before requesting review.

## Security & Configuration Tips
- Node ≥ 18.17 recommended (Next 15). Do not commit secrets; use `.env.local` for runtime env and reference via `process.env`. Never export secrets to the client.
- Keep dependencies minimal; discuss adding new ones in the PR description.

## Agent-Specific Instructions
- Prioritize dashboard build-out per `todo.md` before tackling ancillary tasks.
- Make smallest viable changes; avoid restructuring without clear rationale.
- Follow the conventions above for files under `app/` and configs.
- When creating new UI, colocate components near their route folder or in `app/components/` if shared.
- Always run `npm run lint` before finishing a change, and attempt `npm run build` to verify type safety.
- Document sandbox limitations (e.g., `npm run dev` restrictions) in the final handoff.
