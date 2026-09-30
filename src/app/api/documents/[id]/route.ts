import { NextResponse } from "next/server";
import { getSessionUser, isStaff } from "@/lib/auth";
import { queryOne } from "@/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Not found", { status: 404 });

  const doc = await queryOne<{ filename: string; content_type: string; content_b64: string; applicant_id: string }>(
    `SELECT d.filename, d.content_type, encode(d.content, 'base64') AS content_b64, a.applicant_id
       FROM documents d JOIN applications a ON a.id = d.application_id WHERE d.id = $1`,
    [id],
  );
  if (!doc || (!isStaff(user) && doc.applicant_id !== user.id)) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(Buffer.from(doc.content_b64, "base64"), {
    headers: {
      "Content-Type": doc.content_type,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(doc.filename)}"; filename*=UTF-8''${encodeURIComponent(doc.filename)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
