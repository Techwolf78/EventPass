import { useRouter as useExpoRouter } from "expo-router";
import { useCallback } from "react";

type NavigatePath = string | { pathname: string; params?: Record<string, any> };

export function useSafeRouter() {
  const router = useExpoRouter();

  const safeReplace = useCallback(
    (path: NavigatePath) => {
      try {
        router.replace(path as any);
      } catch (error) {
        console.error("Navigation replace error:", error);
      }
    },
    [router],
  );

  const safePush = useCallback(
    (path: NavigatePath) => {
      try {
        router.push(path as any);
      } catch (error) {
        console.error("Navigation push error:", error);
      }
    },
    [router],
  );

  return {
    replace: safeReplace,
    push: safePush,
  };
}
