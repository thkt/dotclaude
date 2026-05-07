import { useState } from "react";

export function useUserId() {
  const [userId, setUserId] = useState<string | null>(null);
  return { userId, setUserId };
}

export function useFlag(initial = false) {
  const [flag, setFlag] = useState(initial);
  return { flag, setFlag };
}
