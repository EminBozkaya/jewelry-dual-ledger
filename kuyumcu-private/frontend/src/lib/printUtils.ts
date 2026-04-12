import type { Balance, Customer } from "@/types";
import { formatAmount } from "./formatters";

export function printReceipt(customer: Customer, groups: { title: string; items: Balance[] }[]) {
  // Create an iframe to hold the print document
  const iframe = document.createElement("iframe");
  iframe.style.position = "absolute";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }

  const currentDate = new Date().toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Build the items HTML string explicitly to avoid nested template literal issues with some compilers
  let groupsHtml = "";
  for (const g of groups) {
    groupsHtml += `<div class="group-title">${g.title}</div>`;
    for (const b of g.items) {
      const isPos = b.amount >= 0;
      const sign = isPos ? "+" : "";
      const formattedAmt = formatAmount(b.amount, b.unitType);
      groupsHtml += `
        <div class="item-row">
          <span class="item-name">${b.assetTypeName}</span>
          <span class="item-value">${sign}${formattedAmt}</span>
        </div>
      `;
    }
  }

  // Generate the HTML for the receipt
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Müşteri Portföy Özeti</title>
        <style>
          @page {
            margin: 0;
            size: 80mm 297mm;
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            color: #000;
            margin: 0;
            padding: 10px;
            width: 80mm;
            box-sizing: border-box;
          }
          .text-center { text-align: center; }
          .font-bold { font-weight: bold; }
          .border-b { border-bottom: 1px dashed #000; margin-bottom: 5px; padding-bottom: 5px; }
          .border-t { border-top: 1px dashed #000; margin-top: 5px; padding-top: 5px; }
          .mb-2 { margin-bottom: 15px; }
          .mb-4 { margin-bottom: 25px; }
          h2 { margin: 0 0 5px 0; font-size: 16px; text-transform: uppercase; }
          .group-title { font-weight: bold; margin-top: 10px; margin-bottom: 3px; text-decoration: underline; text-transform: uppercase; font-size: 11px; }
          .item-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
          .item-name { flex: 1; padding-right: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .item-value { white-space: nowrap; }
          .header-info { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 11px; }
          .footer-spacer { color: transparent; font-size: 1px; }
        </style>
      </head>
      <body>
        <div class="text-center font-bold mb-2">
          <h2>CARİ ÖZEL</h2>
          <div>PORTFÖY ÖZETİ</div>
        </div>
        
        <div class="border-b mb-2">
          <div class="header-info">
            <span>Tarih:</span>
            <span>${currentDate}</span>
          </div>
          <div class="header-info">
            <span>Müşteri:</span>
            <span>${customer.firstName} ${customer.lastName}</span>
          </div>
        </div>

        <div class="mb-4">
          ${groupsHtml}
        </div>

        <div class="border-t text-center pt-2 mb-4">
          Bizi tercih ettiğiniz için teşekkür ederiz.
        </div>

        <div class="footer-spacer">
          <br><br><br><br>
          .
        </div>
      </body>
    </html>
  `;

  doc.open();
  doc.write(html);
  doc.close();

  // Wait for the iframe to load its contents before printing
  iframe.onload = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    
    // Remove the iframe after printing
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 1000);
  };
}
