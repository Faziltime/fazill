"use client";

import React, { createContext, useContext, useState } from "react";

type SearchContextValue = {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
};

const Ctx = createContext<SearchContextValue>({ searchTerm: "", setSearchTerm: () => {} });

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [searchTerm, setSearchTerm] = useState("");
  return <Ctx.Provider value={{ searchTerm, setSearchTerm }}>{children}</Ctx.Provider>;
}

export function useSearch() {
  return useContext(Ctx);
}


