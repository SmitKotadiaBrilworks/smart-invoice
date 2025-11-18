import { NextRequest, NextResponse } from "next/server";
import { createServerClient, supabaseAdmin } from "@/lib/supabase/server";
import { extractInvoiceFromImage } from "@/lib/ai/gemini";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

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

    const body = await request.json();
    const { file, mimeType, workspace_id } = body;

    if (!file || !mimeType || !workspace_id) {
      return NextResponse.json(
        { error: "file, mimeType, and workspace_id are required" },
        { status: 400 }
      );
    }

    // Validate and normalize file type
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];

    // Normalize mimeType
    let normalizedMimeType = mimeType.toLowerCase();
    if (normalizedMimeType === "image/jpg") {
      normalizedMimeType = "image/jpeg";
    }

    if (!allowedTypes.includes(normalizedMimeType)) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Only images (JPG, PNG, WEBP) and PDFs are supported.",
        },
        { status: 400 }
      );
    }

    console.log("normalizedMimeType", normalizedMimeType);

    // Convert base64 to buffer for storage
    const fileBuffer = Buffer.from(file, "base64");

    // Generate a temporary file path (will be updated when invoice is created)
    // For now, use a timestamp-based path
    const tempFileName = `temp_${Date.now()}_${Math.random()
      .toString(36)
      .substring(7)}`;
    const fileExtension =
      normalizedMimeType === "application/pdf"
        ? "pdf"
        : normalizedMimeType.split("/")[1] || "jpg";
    const tempFilePath = `${workspace_id}/temp/${tempFileName}.${fileExtension}`;

    // Store file in Supabase Storage (temporary location)
    // Note: The file will be moved to the final location when invoice is created
    // Use admin client for storage operations to ensure proper permissions
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from("invoices")
      .upload(tempFilePath, fileBuffer, {
        contentType: normalizedMimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      // Continue with extraction even if storage fails
    }

    // Extract invoice data using Gemini
    const result = await extractInvoiceFromImage(file, normalizedMimeType);

    console.log("result", result);

    return NextResponse.json({
      extraction: result.extraction,
      confidence: result.confidence,
      filePath: uploadData?.path || null, // Return the storage path
      mimeType: normalizedMimeType,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process invoice" },
      { status: 500 }
    );
  }
}
