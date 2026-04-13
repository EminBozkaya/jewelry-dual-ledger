# Workflow: Adding a New UI Feature

When adding a new UI feature (component, page, or modal) to the React application, follow these steps strictly:

### Step 1: Component Structure & UI
- Define the `.tsx` file inside the appropriate `src/components/` or `src/pages/` folder.
- Use Tailwind CSS and existing Shadcn UI components for styling and structure.

### Step 2: Multi-Language Support (CRITICAL)
- Do NOT use hardcoded strings (e.g., `<div>Hesapla</div>`).
- **Update i18n files**: Add your new strings to both English (`en.json`) and Turkish (`tr.json`) translation files.
- Inject the translation using the `useTranslation` hook: `const { t } = useTranslation();` -> `<div>{t('new_feature.calculate')}</div>`.

### Step 3: Type Definitions
- Create specific TypeScript interfaces/types for the component Props and State.
- If using external data, map them with `zod` schemas or proper TS types in `src/types/` or adjacent to the API files.

### Step 4: Logic & Routing
- Connect the component to state/API using `useEffect` or dedicated custom hooks.
- If it's a new page, add it to the routing configuration (`react-router-dom` in `App.tsx` or `routes.tsx`).
- Ensure responsive design (`sm:`, `md:`, `lg:` Tailwind directives) works correctly.

### Step 5: Test Build
- Verify the build via `npm run build` to ensure no strict TypeScript compilation errors exist.
