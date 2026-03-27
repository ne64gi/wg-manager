import { useQuery } from "@tanstack/react-query";

import { getGuiSettings } from "../../lib/api";
import { useAuth } from "../../core/auth/AuthContext";
import { queryKeys } from "../queryKeys";

export function useGuiSettingsQuery() {
  const auth = useAuth();

  return useQuery({
    queryKey: queryKeys.guiSettings,
    queryFn: async () => getGuiSettings((await auth.getValidAccessToken()) ?? ""),
    enabled: auth.isAuthenticated,
  });
}
