using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace KuyumcuPrivate.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SplitGoldCoinsCumhuriyetResat : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "AssetTypes",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000007"),
                columns: new[] { "Code", "Name" },
                values: new object[] { "C_CEYREK", "Cumhuriyet Çeyrek" });

            migrationBuilder.UpdateData(
                table: "AssetTypes",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000008"),
                columns: new[] { "Code", "Name" },
                values: new object[] { "C_YARIM", "Cumhuriyet Yarım" });

            migrationBuilder.UpdateData(
                table: "AssetTypes",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000009"),
                columns: new[] { "Code", "Name" },
                values: new object[] { "C_TAM", "Cumhuriyet Tam" });

            migrationBuilder.UpdateData(
                table: "AssetTypes",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000010"),
                columns: new[] { "Code", "Name", "SortOrder" },
                values: new object[] { "R_TAM", "Reşat Tam", 15 });

            migrationBuilder.UpdateData(
                table: "AssetTypes",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000011"),
                columns: new[] { "Code", "Name", "SortOrder" },
                values: new object[] { "C_GREMSE", "Cumhuriyet Gremse", 11 });

            migrationBuilder.UpdateData(
                table: "AssetTypes",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000012"),
                columns: new[] { "Code", "Name", "SortOrder" },
                values: new object[] { "C_BESLI", "Cumhuriyet Beşli", 12 });

            migrationBuilder.UpdateData(
                table: "AssetTypes",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000013"),
                column: "SortOrder",
                value: 18);

            migrationBuilder.InsertData(
                table: "AssetTypes",
                columns: new[] { "Id", "Code", "GramWeight", "IsActive", "Karat", "Name", "SortOrder", "UnitType" },
                values: new object[,]
                {
                    { new Guid("00000000-0000-0000-0000-000000000015"), "R_CEYREK", 1.8040m, true, 22, "Reşat Çeyrek", 13, "Piece" },
                    { new Guid("00000000-0000-0000-0000-000000000016"), "R_YARIM", 3.6080m, true, 22, "Reşat Yarım", 14, "Piece" },
                    { new Guid("00000000-0000-0000-0000-000000000017"), "R_GREMSE", 18.0400m, true, 22, "Reşat Gremse", 16, "Piece" },
                    { new Guid("00000000-0000-0000-0000-000000000018"), "R_BESLI", 36.0800m, true, 22, "Reşat Beşli", 17, "Piece" }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "AssetTypes",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000015"));

            migrationBuilder.DeleteData(
                table: "AssetTypes",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000016"));

            migrationBuilder.DeleteData(
                table: "AssetTypes",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000017"));

            migrationBuilder.DeleteData(
                table: "AssetTypes",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000018"));

            migrationBuilder.UpdateData(
                table: "AssetTypes",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000007"),
                columns: new[] { "Code", "Name" },
                values: new object[] { "CEYREK", "Çeyrek Altın" });

            migrationBuilder.UpdateData(
                table: "AssetTypes",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000008"),
                columns: new[] { "Code", "Name" },
                values: new object[] { "YARIM", "Yarım Altın" });

            migrationBuilder.UpdateData(
                table: "AssetTypes",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000009"),
                columns: new[] { "Code", "Name" },
                values: new object[] { "LIRA", "Tam Altın" });

            migrationBuilder.UpdateData(
                table: "AssetTypes",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000010"),
                columns: new[] { "Code", "Name", "SortOrder" },
                values: new object[] { "ATA", "Ata Altın", 11 });

            migrationBuilder.UpdateData(
                table: "AssetTypes",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000011"),
                columns: new[] { "Code", "Name", "SortOrder" },
                values: new object[] { "GREMSE", "Gremse Altın", 12 });

            migrationBuilder.UpdateData(
                table: "AssetTypes",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000012"),
                columns: new[] { "Code", "Name", "SortOrder" },
                values: new object[] { "BESLI", "Beşli Altın", 13 });

            migrationBuilder.UpdateData(
                table: "AssetTypes",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000013"),
                column: "SortOrder",
                value: 14);
        }
    }
}
