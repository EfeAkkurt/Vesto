# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development server**: `npm run dev` - Starts Next.js development server on http://localhost:3000
- **Build**: `npm run build` - Creates production build
- **Start production**: `npm start` - Starts production server
- **Lint**: `npm run lint` - Runs ESLint for code quality checks

## Project Architecture

This is a Next.js 15 project using the App Router pattern with the following key characteristics:

### Tech Stack
- **Framework**: Next.js 15.5.5 with App Router
- **Language**: TypeScript 5 with strict mode enabled
- **Styling**: Tailwind CSS v4 with custom CSS variables for theming
- **Fonts**: Geist Sans and Geist Mono from Google Fonts
- **Data Fetching**: TanStack React Query v5 for server state management
- **Animations**: Framer Motion v12
- **Blockchain**: Stellar SDK v13.3.0 (suggests this is a blockchain-related application)

### Project Structure
- Uses Next.js App Router with all application code in the `app/` directory
- No separate components, lib, utils, or hooks directories yet - project appears to be in early stages
- Path aliasing configured with `@/*` pointing to the root directory
- TypeScript configuration includes strict mode and Next.js plugin

### Styling System
- Tailwind CSS v4 with custom theme configuration
- CSS custom properties for background and foreground colors
- Dark mode support via `prefers-color-scheme`
- Custom font variables integrated with Tailwind theme

### Code Quality
- ESLint configured with Next.js core web vitals and TypeScript rules
- Ignores build artifacts, node_modules, and Next.js generated files
- No testing framework currently configured

## Development Notes

This appears to be a fresh Next.js project with minimal customization beyond the default template. The inclusion of Stellar SDK suggests this may be intended for blockchain/financial applications, likely related to the Stellar network. The project uses modern React patterns and is set up for TypeScript development with strict type checking.