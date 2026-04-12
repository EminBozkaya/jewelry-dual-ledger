using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KuyumcuPrivate.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomerPhotoContentType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PhotoContentType",
                table: "Customers",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PhotoContentType",
                table: "Customers");
        }
    }
}
