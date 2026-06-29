"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { findTool } from "@/lib/tools";

/**
 * Old links used the hash (e.g. /#tdee). Now each tool has a real route, so
 * forward any legacy hash to /t/<id> on load.
 */
export default function LegacyHashRedirect() {
  const router = useRouter();
  useEffect(() => {
    const id = window.location.hash.replace(/^#/, "");
    if (id && findTool(id)) router.replace(`/t/${id}`);
  }, [router]);
  return null;
}
