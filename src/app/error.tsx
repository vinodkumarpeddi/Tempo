"use client";

import ServiceDown from "@/components/ServiceDown";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ServiceDown
      title="Something went wrong"
      detail="The server hit an error handling this page. Nothing you collected is lost — try again in a moment."
      onRetry={reset}
    />
  );
}
