import React, { createContext, useContext, useState, ReactNode } from "react";

export type Timeframe = "24h" | "7d" | "30d" | "365d" | "all";

interface GlobalContextType {
  timeframe: Timeframe;
  setTimeframe: (t: Timeframe) => void;
  workspaceId: string;
  setWorkspaceId: (w: string) => void;
  profilePicture: string | null;
  setProfilePicture: (pic: string | null) => void;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const GlobalProvider = ({ children }: { children: ReactNode }) => {
  const [timeframe, setTimeframe] = useState<Timeframe>("30d");
  const [workspaceId, setWorkspaceId] = useState<string>(
    localStorage.getItem("company_id") || "default_co"
  );
  const [profilePicture, setProfilePictureState] = useState<string | null>(
    localStorage.getItem("profile_picture") || null
  );

  const handleSetWorkspace = (id: string) => {
    localStorage.setItem("company_id", id);
    setWorkspaceId(id);
  };

  const handleSetProfilePicture = (pic: string | null) => {
    if (pic) {
      localStorage.setItem("profile_picture", pic);
    } else {
      localStorage.removeItem("profile_picture");
    }
    setProfilePictureState(pic);
  };

  return (
    <GlobalContext.Provider
      value={{
        timeframe,
        setTimeframe,
        workspaceId,
        setWorkspaceId: handleSetWorkspace,
        profilePicture,
        setProfilePicture: handleSetProfilePicture,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobalContext = () => {
  const context = useContext(GlobalContext);
  if (context === undefined) {
    throw new Error("useGlobalContext must be used within a GlobalProvider");
  }
  return context;
};
