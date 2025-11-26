import { NextRequest, NextResponse } from "next/server";
import { createServerClient, supabaseAdmin } from "@/lib/supabase/server";

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB in bytes
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

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

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size (3MB limit)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size must be less than 3MB" },
        { status: 400 }
      );
    }

    // Validate file type
    const mimeType = file.type.toLowerCase();
    const normalizedMimeType =
      mimeType === "image/jpg" ? "image/jpeg" : mimeType;

    if (!ALLOWED_TYPES.includes(normalizedMimeType)) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Only JPG, PNG, and WEBP images are allowed.",
        },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Generate file path: {user_id}.{extension} (without bucket name)
    const fileExtension =
      normalizedMimeType === "image/jpeg"
        ? "jpg"
        : normalizedMimeType.split("/")[1] || "jpg";
    const fileName = `${user.id}.${fileExtension}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from("avatars")
      .upload(fileName, fileBuffer, {
        contentType: normalizedMimeType,
        upsert: true, // Replace existing file if it exists
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload profile picture" },
        { status: 500 }
      );
    }

    // Get public URL for the uploaded image
    // getPublicUrl expects just the file name, not the full path
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from("avatars").getPublicUrl(fileName);

    console.log("fileName", fileName);
    console.log("publicUrl", publicUrl);

    // Update user_profiles table with the profile picture URL
    const { error: updateError } = await supabaseAdmin
      .from("user_profiles")
      .update({ profile_picture: publicUrl })
      .eq("id", user.id);

    if (updateError) {
      console.error("Database update error:", updateError);
      // Try to delete the uploaded file if database update fails
      await supabaseAdmin.storage.from("avatars").remove([fileName]);
      return NextResponse.json(
        { error: "Failed to update profile picture" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      profile_picture: publicUrl,
      message: "Profile picture updated successfully",
    });
  } catch (error: any) {
    console.error("Profile picture upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload profile picture" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    // Get current profile picture path from database
    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("profile_picture")
      .eq("id", user.id)
      .single();

    // Remove profile_picture from database
    const { error: updateError } = await supabaseAdmin
      .from("user_profiles")
      .update({ profile_picture: null })
      .eq("id", user.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to remove profile picture" },
        { status: 500 }
      );
    }

    // Try to delete the file from storage if it exists
    if (profile?.profile_picture) {
      // Extract file name from URL (last part after the last slash)
      const urlParts = profile.profile_picture.split("/");
      const fileName = urlParts[urlParts.length - 1]; // Get "{user_id}.{ext}"

      await supabaseAdmin.storage.from("avatars").remove([fileName]);
    }

    return NextResponse.json({
      message: "Profile picture removed successfully",
    });
  } catch (error: any) {
    console.error("Profile picture delete error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to remove profile picture" },
      { status: 500 }
    );
  }
}
