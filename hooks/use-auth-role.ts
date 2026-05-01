/**
 * Placeholder auth role hook.
 * TODO: Wire to actual auth when Clerk is integrated.
 * For now, always returns isManager: true so the dashboard renders.
 */
export function useAuthRole() {
  return {
    user: null,
    isLoading: false,
    role: "admin" as const,
    isManager: true,
  };
}
