using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KuyumcuPrivate.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddUserSeed : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "Users",
                columns: new[] { "Id", "FullName", "IsActive", "PasswordHash", "Role", "Username" },
                values: new object[] { new Guid("00000000-0000-0000-0000-000000000001"), "Sistem Yöneticisi", true, "$2a$11$Hlu3yqAS8.BJeHGwZmW06eSSS7dZnaVQNyHwgbN.AbW9G0ly4waj2", "Admin", "admin" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000001"));
        }
    }
}
