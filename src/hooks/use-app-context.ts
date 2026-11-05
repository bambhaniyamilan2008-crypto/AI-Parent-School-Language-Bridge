"use client";

import { AppContext } from "@/context/app-context";
import { useContext } from "react";

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};
