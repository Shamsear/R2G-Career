"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// This page has been moved to /solo-tour/admin/auction
export default function TransfersRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/solo-tour/admin/auction");
  }, [router]);
  return null;
}
