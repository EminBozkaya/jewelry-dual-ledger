# Skill: React Frontend Development

## Overview
A modern web application using React 19, TypeScript, and Vite.

## Tech Stack Details
- **React**: 19.x
- **Build**: Vite 8.x
- **Styling**: Tailwind CSS v4 & Shadcn UI (`lucide-react`, `class-variance-authority`, `tailwind-merge`, `clsx`, `radix-ui`)
- **State/Data Fetching**: `axios` for HTTP requests.
- **Routing**: `react-router-dom` 7.x
- **Utilities**: `i18next`, `date-fns`, `numeral`, `react-hook-form`, `zod`

## Guidelines
- Use Functional Components and React Hooks exclusively.
- All new components must use TypeScript interfaces (`.tsx` extension).
- Use Tailwind classes for all styling. If complex logic is needed, use `clsx` and `twMerge`.
- Shadcn UI components are placed in the components structure and can be modified.
- Keep network calls isolated in `api/` utility files (e.g., `customers.ts`).
