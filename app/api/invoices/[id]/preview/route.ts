import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { invoiceBackend } from "@/lib/backend/invoices";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get token from header or query parameter (for iframe access)
    const { searchParams } = new URL(request.url);
    const authHeader = request.headers.get("authorization");
    let token = authHeader?.replace("Bearer ", "");

    // Fallback to query parameter for iframe access
    if (!token) {
      token = searchParams.get("token") || "";
    }

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient(token);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = searchParams.get("workspace_id");

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspace_id required" },
        { status: 400 }
      );
    }

    // Get invoice to verify access
    const invoice = await invoiceBackend.getInvoice(params.id, workspaceId);

    // Try to get file from Supabase Storage
    // Files are stored at: {workspace_id}/{invoice_id}.{extension}
    const possibleExtensions = ["pdf", "jpg", "jpeg", "png", "webp"];
    let fileData = null;
    let fileExtension = "pdf";
    let contentType = "application/pdf";

    // Try to find the file with different extensions
    for (const ext of possibleExtensions) {
      const filePath = `${workspaceId}/${params.id}.${ext}`;

      try {
        const { data, error: storageError } = await supabase.storage
          .from("invoices")
          .download(filePath);

        if (!storageError && data) {
          fileData = data;
          fileExtension = ext;
          // Determine content type
          if (ext === "pdf") {
            contentType = "application/pdf";
          } else if (ext === "jpg" || ext === "jpeg") {
            contentType = "image/jpeg";
          } else if (ext === "png") {
            contentType = "image/png";
          } else if (ext === "webp") {
            contentType = "image/webp";
          }
          break;
        }
      } catch (err) {
        // Continue to next extension
        continue;
      }
    }

    if (fileData) {
      // Return the file
      return new NextResponse(fileData, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `inline; filename="invoice-${invoice.invoice_no}.${fileExtension}"`,
        },
      });
    }

    // If file is not in storage, return a placeholder HTML page
    const placeholderHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Invoice Preview - ${invoice.invoice_no}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: #f5f5f5;
              color: #333;
            }
            .container {
              text-align: center;
              padding: 2rem;
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              max-width: 500px;
            }
            h1 {
              margin: 0 0 1rem 0;
              font-size: 1.5rem;
              color: #1890ff;
            }
            p {
              margin: 0.5rem 0;
              color: #666;
            }
            .invoice-info {
              margin-top: 1.5rem;
              padding-top: 1.5rem;
              border-top: 1px solid #e8e8e8;
            }
            .info-item {
              display: flex;
              justify-content: space-between;
              padding: 0.5rem 0;
              border-bottom: 1px solid #f0f0f0;
            }
            .info-label {
              font-weight: 500;
              color: #666;
            }
            .info-value {
              color: #333;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>📄 Invoice Document</h1>
            <p><strong>Invoice #${invoice.invoice_no}</strong></p>
            <p style="color: #999; font-size: 0.9rem; margin-top: 1rem;">
              The original invoice file is not available for preview.
            </p>
            <p style="color: #999; font-size: 0.85rem;">
              The invoice data has been extracted and is available in the form on the right.
            </p>
            <div class="invoice-info">
              <div class="info-item">
                <span class="info-label">Vendor:</span>
                <span class="info-value">${invoice.vendor?.name || "N/A"}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Amount:</span>
                <span class="info-value">${
                  invoice.currency
                } ${invoice.total.toFixed(2)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Status:</span>
                <span class="info-value">${invoice.status}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Issue Date:</span>
                <span class="info-value">${new Date(
                  invoice.issue_date
                ).toLocaleDateString()}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Due Date:</span>
                <span class="info-value">${new Date(
                  invoice.due_date
                ).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    return new NextResponse(placeholderHtml, {
      headers: {
        "Content-Type": "text/html",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
