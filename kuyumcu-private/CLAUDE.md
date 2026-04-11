# Kuyumcu Özel Cari Sistemi

## Proje Özeti
Kuyumcu işletmesi için lokal çalışan özel cari (müşteri hesap) takip sistemi.
Müşterilerin altın, döviz ve diğer varlık bakiyelerini takip eder.

## Teknik Yığın
- **Backend:** .NET 10 Minimal API, Clean Architecture, EF Core, PostgreSQL (Docker)
- **Frontend:** React 19 + Vite + TypeScript + Shadcn/ui + Tailwind CSS
- **Auth:** JWT, role-based (Admin / Staff)
- **ORM:** Entity Framework Core 10 + Npgsql

## Dizin Yapısı
```
kuyumcu-private/
├── CLAUDE.md                    ← Bu dosya
├── IMPLEMENTATION_STATUS.md     ← Faz durumu — her faz sonunda güncelle
├── docker-compose.yml
├── backend/
│   ├── KuyumcuPrivate.sln
│   └── src/
│       ├── KuyumcuPrivate.Domain/          # Entity, Enum
│       ├── KuyumcuPrivate.Application/     # DTO, Interface
│       ├── KuyumcuPrivate.Infrastructure/  # DbContext, Services
│       └── KuyumcuPrivate.API/             # Endpoints, Program.cs
└── frontend/                               # React + Vite
    └── src/
        ├── api/          # Axios servisleri
        ├── components/   # layout/, shared/, ui/
        ├── contexts/     # AuthContext
        ├── hooks/
        ├── lib/          # formatters, constants
        ├── pages/
        └── types/
```

## Kodlama Kuralları
- Kod İngilizce, yorumlar Türkçe olabilir
- UI dili tamamen Türkçe
- Renk kuralı: yeşil = alacak (pozitif bakiye), kırmızı = borç (negatif bakiye)
- Font büyük ve okunabilir (yaşlı kullanıcılar için, min 17px)
- Tüm ekranlar tam responsive
- Tüm tablolarda: arama, sıralama, sayfalama, Excel/PDF export

## Faz Direktifleri
Sırasıyla uygulanacak direktif dosyaları `docs/` klasöründe:
1. `docs/faz1-backend-start.md` ✅
2. `docs/faz1-backend-continue.md` ✅
3. `docs/faz2-frontend-scaffold.md`
4. `docs/faz3-customer-management.md`
5. `docs/faz4-transaction-forms.md`
6. `docs/faz5-reports-users-final.md`

## Önemli Komutlar
```bash
# PostgreSQL başlat
docker compose up postgres -d

# Backend çalıştır
cd backend && dotnet run --project src/KuyumcuPrivate.API/KuyumcuPrivate.API.csproj

# Frontend çalıştır
cd frontend && npm run dev

# Migration oluştur
cd backend && dotnet ef migrations add <Name> \
  --project src/KuyumcuPrivate.Infrastructure/KuyumcuPrivate.Infrastructure.csproj \
  --startup-project src/KuyumcuPrivate.API/KuyumcuPrivate.API.csproj \
  --output-dir Persistence/Migrations
```

## Her Faz Sonunda Yapılacak
1. `IMPLEMENTATION_STATUS.md` dosyasını güncelle
2. Tamamlanan adımları işaretle
3. Bilinen sorunları not et
