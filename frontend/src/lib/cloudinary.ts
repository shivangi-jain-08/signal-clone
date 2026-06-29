export interface UploadedAttachment {
  url: string;
  name: string;
  size: number;
  kind: "image" | "file";
}

export async function uploadToCloudinary(file: File): Promise<UploadedAttachment> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !preset) {
    throw new Error(
      "Cloudinary is not configured. Add NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and " +
        "NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET to your .env.local file.",
    );
  }

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", preset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(body.error?.message ?? "Upload failed");
  }

  const data = await res.json() as { secure_url: string };
  return {
    url: data.secure_url,
    name: file.name,
    size: file.size,
    kind: file.type.startsWith("image/") ? "image" : "file",
  };
}
