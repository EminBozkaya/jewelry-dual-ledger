# Workflow: Adding a New Backend Feature

When developing a new API endpoint or business module in the backend, follow these steps:

### Step 1: Domain Layer
- Open `KuyumcuPrivate.Domain`.
- Add any required `Entities` and `Enums`.
- Define Repository `Interfaces` if new database access is needed.

### Step 2: Application Layer
- Open `KuyumcuPrivate.Application`.
- Define Input/Output Data Transfer Objects (`DTO`s).
- Create Service Interfaces (`ICustomerService`) and implement business logic here. Do not access the database context directly; use Repository interfaces.

### Step 3: Infrastructure Layer
- Open `KuyumcuPrivate.Infrastructure`.
- Implement new Repository interfaces.
- Add `DbSet` to `AppDbContext`.
- Run EF Core Migration: Create a migration describing the semantic change and update the database structure.

### Step 4: API Layer
- Open `KuyumcuPrivate.API`.
- Create new endpoints (Minimal APIs) or Controllers.
- Inject Application layer services.
- Ensure appropriate HTTP Status codes (`200 OK`, `201 Created`, `400 BadRequest`, `404 NotFound`).
- Add Swagger metadata if appropriate.
