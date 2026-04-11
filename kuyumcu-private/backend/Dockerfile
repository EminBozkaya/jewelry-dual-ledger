FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["src/KuyumcuPrivate.API/KuyumcuPrivate.API.csproj", "src/KuyumcuPrivate.API/"]
COPY ["src/KuyumcuPrivate.Infrastructure/KuyumcuPrivate.Infrastructure.csproj", "src/KuyumcuPrivate.Infrastructure/"]
COPY ["src/KuyumcuPrivate.Application/KuyumcuPrivate.Application.csproj", "src/KuyumcuPrivate.Application/"]
COPY ["src/KuyumcuPrivate.Domain/KuyumcuPrivate.Domain.csproj", "src/KuyumcuPrivate.Domain/"]
RUN dotnet restore "src/KuyumcuPrivate.API/KuyumcuPrivate.API.csproj"
COPY . .
RUN dotnet publish "src/KuyumcuPrivate.API/KuyumcuPrivate.API.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "KuyumcuPrivate.API.dll"]
