# Skill: .NET 10 API & Clean Architecture

## Overview
The backend is built with .NET 10 Web API adhering to Clean Architecture principles.

## Structure
- **KuyumcuPrivate.Domain**: Contains enterprise logic, Enums, Entities, Interfaces. No external dependencies.
- **KuyumcuPrivate.Application**: Contains business logic, DTOs, and Service Interfaces.
- **KuyumcuPrivate.Infrastructure**: Contains external concerns. EF Core Database Context, PostgreSQL integration `Npgsql`, authentication implementations (JwtBearer, BCrypt).
- **KuyumcuPrivate.API**: The presentation layer. Minimal APIs / Controllers, Program.cs, and Dependency Injection configurations.

## Key Technologies
- `net10.0`
- `Microsoft.AspNetCore.Authentication.JwtBearer`
- `Swashbuckle.AspNetCore` for Swagger/OpenAPI documentation.

## Guidelines
- Always use Dependency Injection (DI).
- Register new Application/Infrastructure services in `Program.cs`.
- Separate specific features into distinct Endpoints or Controllers rather than a monolithic structure.
