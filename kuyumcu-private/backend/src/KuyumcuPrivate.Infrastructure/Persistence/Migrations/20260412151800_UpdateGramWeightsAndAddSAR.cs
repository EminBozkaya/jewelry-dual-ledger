using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KuyumcuPrivate.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class UpdateGramWeightsAndAddSAR : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "AssetTypes",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000005"),
                column: "SortOrder",
                value: 6);

            migrationBuilder.UpdateData(
                table: "AssetTypes",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000006"),
                column: "SortOrder",
                value: 7);

            migrationBuilder.UpdateData(
                table: "AssetTypes",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000007"),
                columns: new[] { "GramWeight", "SortOrder" },
                values: new object[] { 1.7540m, 8 });

            migrationBuilder.UpdateData(
                table: "AssetTypes",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000008"),
                columns: new[] { "GramWeight", "SortOrder" },
                values: new object[] { 3.5080m, 9 });

            migrationBuilder.UpdateData(
                table: "AssetTypes",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000009"),
                columns: new[] { "GramWeight", "SortOrder" },
                values: new object[] { 7.0160m, 10 });

            migrationBuilder.UpdateData(
                table: "AssetTypes",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000010"),
                columns: new[] { "GramWeight", "SortOrder" },
                values: new object[] { 7.2160m, 11 });

            migrationBuilder.UpdateData(
                table: "AssetTypes",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000011"),
                column: "SortOrder",
                value: 12);

            migrationBuilder.UpdateData(
                table: "AssetTypes",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000012"),
                column: "SortOrder",
                value: 13);

            migrationBuilder.UpdateData(
                table: "AssetTypes",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000013"),
                column: "SortOrder",
                value: 14);

            migrationBuilder.InsertData(
                table: "AssetTypes",
                columns: new[] { "Id", "Code", "GramWeight", "IsActive", "Karat", "Name", "SortOrder", "UnitType" },
                values: new object[] { new Guid("00000000-0000-0000-0000-000000000014"), "SAR", null, true, null, "Suudi Riyali", 5, "Currency" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "AssetTypes",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000014"));

            migrationBuilder.UpdateData(
                table: "AssetTypes",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000005"),
                column: "SortOrder",
                value: 5);

            migrationBuilder.UpdateData(
                table: "AssetTypes",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000006"),
                column: "SortOrder",
                value: 6);

            migrationBuilder.UpdateData(
                table: "AssetTypes",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000007"),
                columns: new[] { "GramWeight", "SortOrder" },
                values: new object[] { 1.75m, 7 });

            migrationBuilder.UpdateData(
                table: "AssetTypes",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000008"),
                columns: new[] { "GramWeight", "SortOrder" },
                values: new object[] { 3.50m, 8 });

            migrationBuilder.UpdateData(
                table: "AssetTypes",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000009"),
                columns: new[] { "GramWeight", "SortOrder" },
                values: new object[] { 7.02m, 9 });

            migrationBuilder.UpdateData(
                table: "AssetTypes",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000010"),
                columns: new[] { "GramWeight", "SortOrder" },
                values: new object[] { 7.21m, 10 });

            migrationBuilder.UpdateData(
                table: "AssetTypes",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000011"),
                column: "SortOrder",
                value: 11);

            migrationBuilder.UpdateData(
                table: "AssetTypes",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000012"),
                column: "SortOrder",
                value: 12);

            migrationBuilder.UpdateData(
                table: "AssetTypes",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000013"),
                column: "SortOrder",
                value: 13);
        }
    }
}
