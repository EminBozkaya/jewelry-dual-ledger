using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KuyumcuPrivate.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomerType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Type",
                table: "Customers",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Type",
                table: "Customers");
        }
    }
}
