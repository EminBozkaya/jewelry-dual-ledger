using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace KuyumcuPrivate.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class PendingChanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CustomerTypeConfigs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Value = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    ColorHex = table.Column<string>(type: "text", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CustomerTypeConfigs", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "CustomerTypeConfigs",
                columns: new[] { "Id", "ColorHex", "IsActive", "Name", "SortOrder", "Value" },
                values: new object[,]
                {
                    { new Guid("10000000-0000-0000-0000-000000000001"), "#3b82f6", true, "Özel Müşteri", 1, 0 },
                    { new Guid("10000000-0000-0000-0000-000000000002"), "#8b5cf6", true, "Kuyumcu", 2, 1 },
                    { new Guid("10000000-0000-0000-0000-000000000003"), "#f59e0b", true, "Tedarikçi", 3, 2 }
                });

            migrationBuilder.CreateIndex(
                name: "IX_CustomerTypeConfigs_Value",
                table: "CustomerTypeConfigs",
                column: "Value",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CustomerTypeConfigs");
        }
    }
}
