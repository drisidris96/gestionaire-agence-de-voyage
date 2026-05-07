import { createContext, useContext, ReactNode, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface AgencySettings {
  agencyName: string;
  agencyNameEn: string;
  agencyLogoUrl: string | null;
  agencyPhone: string | null;
  agencyEmail: string | null;
  agencyAddress: string | null;
}

const DEFAULTS: AgencySettings = {
  agencyName: "شويعر للسياحة والأسفار",
  agencyNameEn: "CHOUIAAR TRAVEL AGENCY",
  agencyLogoUrl: "/logo.jpg",
  agencyPhone: "",
  agencyEmail: "",
  agencyAddress: "",
};

const QUERY_KEY = ["agency-settings"];

interface AgencyContextType {
  settings: AgencySettings;
  isLoading: boolean;
  refetch: () => void;
}

const AgencyContext = createContext<AgencyContextType>({
  settings: DEFAULTS,
  isLoading: false,
  refetch: () => {},
});

export function AgencyProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<AgencySettings>({
    queryKey: QUERY_KEY,
    queryFn: () => fetch("/api/settings").then(r => r.json()),
    staleTime: 60_000,
    placeholderData: DEFAULTS,
  });

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  }, [queryClient]);

  return (
    <AgencyContext.Provider value={{ settings: data ?? DEFAULTS, isLoading, refetch }}>
      {children}
    </AgencyContext.Provider>
  );
}

export function useAgency() {
  return useContext(AgencyContext);
}

export const AGENCY_QUERY_KEY = QUERY_KEY;
