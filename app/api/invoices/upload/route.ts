import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
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
    // Extract invoice data using Gemini
    const result = await extractInvoiceFromImage(file, normalizedMimeType);

    console.log("result", result);

    return NextResponse.json({
      extraction: result.extraction,
      confidence: result.confidence,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process invoice" },
      { status: 500 }
    );
  }
}
