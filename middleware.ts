import { runEdgePipeline } from "@/lib/server/edge-pipeline";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return runEdgePipeline(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
