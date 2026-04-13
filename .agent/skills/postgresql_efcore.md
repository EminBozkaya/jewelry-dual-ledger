# Skill: PostgreSQL & EF Core 10

## Overview
The project uses PostgreSQL as the primary database, interfaced via Entity Framework Core 10.

## Key Technologies
- `Microsoft.EntityFrameworkCore` v10.x
- `Npgsql.EntityFrameworkCore.PostgreSQL` v10.x
- Database Migrations

## Schema Management
- **Context**: `AppDbContext` (located in `.Infrastructure`)
- **Migrations**: Always generate migrations in the `.Infrastructure` layer and target the `.API` or `.Infrastructure` project as appropriate via `dotnet ef` CLI.
- Keep domain entities clean and apply EF mapping configurations via `IEntityTypeConfiguration` or Fluent API in `OnModelCreating`.
- Handle decimal precisions carefully, especially for jewelry assets (e.g., gold gram units may require 3-4 decimal precision).
