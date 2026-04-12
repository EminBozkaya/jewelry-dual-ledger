using KuyumcuPrivate.Application.DTOs.Transactions;
using KuyumcuPrivate.Application.Interfaces;
using KuyumcuPrivate.Domain.Entities;
using KuyumcuPrivate.Domain.Enums;
using KuyumcuPrivate.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace KuyumcuPrivate.Infrastructure.Services;

public class TransactionService(AppDbContext db) : ITransactionService
{
    // ── Yatırma ──────────────────────────────────────────────────────────────
    public async Task<TransactionResponse> DepositAsync(DepositRequest request, Guid userId)
    {
        var transaction = new Transaction
        {
            CustomerId   = request.CustomerId,
            Type         = TransactionType.Deposit,
            AssetTypeId  = request.AssetTypeId,
            Amount       = request.Amount,
            Description  = request.Description,
            CreatedBy    = userId
        };

        db.Transactions.Add(transaction);
        await UpdateBalanceAsync(request.CustomerId, request.AssetTypeId, request.Amount);
        await db.SaveChangesAsync();

        return await BuildResponseAsync(transaction.Id);
    }

    // ── Çekme ────────────────────────────────────────────────────────────────
    public async Task<TransactionResponse> WithdrawAsync(WithdrawalRequest request, Guid userId)
    {
        // Bakiye kontrolü yok — negatif bakiye (borç) izinlidir
        var transaction = new Transaction
        {
            CustomerId  = request.CustomerId,
            Type        = TransactionType.Withdrawal,
            AssetTypeId = request.AssetTypeId,
            Amount      = request.Amount,
            Description = request.Description,
            CreatedBy   = userId
        };

        db.Transactions.Add(transaction);
        await UpdateBalanceAsync(request.CustomerId, request.AssetTypeId, -request.Amount);
        await db.SaveChangesAsync();

        return await BuildResponseAsync(transaction.Id);
    }

    // ── Dönüşüm (Virman) ─────────────────────────────────────────────────────
    public async Task<TransactionResponse> ConvertAsync(ConversionRequest request, Guid userId)
    {
        // Kaynak bakiye kontrolü
        var fromBalance = await db.Balances.FirstOrDefaultAsync(b =>
            b.CustomerId == request.CustomerId &&
            b.AssetTypeId == request.FromAssetTypeId);

        if (fromBalance is null || fromBalance.Amount < request.FromAmount)
            throw new InvalidOperationException(
                $"Yetersiz bakiye. Mevcut: {fromBalance?.Amount ?? 0}, İstenen: {request.FromAmount}");

        // TL üzerinden hesaplama
        var tryEquivalent = request.FromAmount * request.FromRateTry;
        var toAmount      = Math.Round(tryEquivalent / request.ToRateTry, 6);

        var transaction = new Transaction
        {
            CustomerId  = request.CustomerId,
            Type        = TransactionType.Conversion,
            Description = request.Description,
            CreatedBy   = userId
        };

        db.Transactions.Add(transaction);
        await db.SaveChangesAsync(); // Id oluşsun

        var conversion = new Conversion
        {
            TransactionId  = transaction.Id,
            FromAssetId    = request.FromAssetTypeId,
            FromAmount     = request.FromAmount,
            FromRateTry    = request.FromRateTry,
            TryEquivalent  = tryEquivalent,
            ToAssetId      = request.ToAssetTypeId,
            ToAmount       = toAmount,
            ToRateTry      = request.ToRateTry,
            RateSource     = RateSource.Manual,
            RateNote       = request.RateNote
        };

        db.Conversions.Add(conversion);

        // Bakiyeleri güncelle — kaynak azalır, hedef artar
        await UpdateBalanceAsync(request.CustomerId, request.FromAssetTypeId, -request.FromAmount);
        await UpdateBalanceAsync(request.CustomerId, request.ToAssetTypeId, toAmount);

        await db.SaveChangesAsync();

        return await BuildResponseAsync(transaction.Id);
    }

    // ── Müşteri Hareket Geçmişi ───────────────────────────────────────────────
    public async Task<List<TransactionResponse>> GetByCustomerAsync(Guid customerId)
    {
        var ids = await db.Transactions
            .Where(t => t.CustomerId == customerId)
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => t.Id)
            .ToListAsync();

        var result = new List<TransactionResponse>();
        foreach (var id in ids)
            result.Add(await BuildResponseAsync(id));

        return result;
    }

    // ── İptal ─────────────────────────────────────────────────────────────────
    public async Task<bool> CancelAsync(Guid transactionId, string reason, Guid userId)
    {
        var transaction = await db.Transactions
            .Include(t => t.Conversion)
            .FirstOrDefaultAsync(t => t.Id == transactionId);

        if (transaction is null || transaction.IsCancelled) return false;

        // Bakiyeleri geri al
        if (transaction.Type == TransactionType.Deposit)
            await UpdateBalanceAsync(transaction.CustomerId, transaction.AssetTypeId!.Value, -transaction.Amount!.Value);
        else if (transaction.Type == TransactionType.Withdrawal)
            await UpdateBalanceAsync(transaction.CustomerId, transaction.AssetTypeId!.Value, transaction.Amount!.Value);
        else if (transaction.Type == TransactionType.Conversion && transaction.Conversion is not null)
        {
            await UpdateBalanceAsync(transaction.CustomerId, transaction.Conversion.FromAssetId, transaction.Conversion.FromAmount);
            await UpdateBalanceAsync(transaction.CustomerId, transaction.Conversion.ToAssetId, -transaction.Conversion.ToAmount);
        }

        transaction.IsCancelled  = true;
        transaction.CancelReason = reason;
        await db.SaveChangesAsync();
        return true;
    }

    // ── Yardımcı: Bakiye Güncelle ─────────────────────────────────────────────
    private async Task UpdateBalanceAsync(Guid customerId, Guid assetTypeId, decimal delta)
    {
        var balance = await db.Balances.FirstOrDefaultAsync(b =>
            b.CustomerId == customerId &&
            b.AssetTypeId == assetTypeId);

        if (balance is null)
        {
            balance = new Balance
            {
                CustomerId  = customerId,
                AssetTypeId = assetTypeId,
                Amount      = 0
            };
            db.Balances.Add(balance);
        }

        balance.Amount    += delta;
        balance.UpdatedAt  = DateTime.UtcNow;
    }

    // ── Yardımcı: Response Oluştur ────────────────────────────────────────────
    private async Task<TransactionResponse> BuildResponseAsync(Guid id)
    {
        var t = await db.Transactions
            .Include(x => x.Customer)
            .Include(x => x.AssetType)
            .Include(x => x.CreatedByUser)
            .Include(x => x.Conversion)
                .ThenInclude(c => c!.FromAsset)
            .Include(x => x.Conversion)
                .ThenInclude(c => c!.ToAsset)
            .FirstAsync(x => x.Id == id);

        ConversionDetail? convDetail = null;
        if (t.Conversion is not null)
        {
            convDetail = new ConversionDetail(
                FromAssetCode: t.Conversion.FromAsset.Code,
                FromAssetName: t.Conversion.FromAsset.Name,
                FromAmount:    t.Conversion.FromAmount,
                FromRateTry:   t.Conversion.FromRateTry,
                TryEquivalent: t.Conversion.TryEquivalent,
                ToAssetCode:   t.Conversion.ToAsset.Code,
                ToAssetName:   t.Conversion.ToAsset.Name,
                ToAmount:      t.Conversion.ToAmount,
                ToRateTry:     t.Conversion.ToRateTry,
                RateSource:    t.Conversion.RateSource.ToString(),
                RateNote:      t.Conversion.RateNote
            );
        }

        return new TransactionResponse(
            Id:                 t.Id,
            CustomerId:         t.CustomerId,
            CustomerFullName:   $"{t.Customer.FirstName} {t.Customer.LastName}",
            CustomerType:       t.Customer.Type,
            Type:               t.Type,
            AssetTypeCode:      t.AssetType?.Code,
            AssetTypeName:      t.AssetType?.Name,
            Amount:             t.Amount,
            Description:        t.Description,
            CreatedByFullName:  t.CreatedByUser.FullName,
            CreatedAt:          t.CreatedAt,
            IsCancelled:        t.IsCancelled,
            CancelReason:       t.CancelReason,
            Conversion:         convDetail
        );
    }
}
