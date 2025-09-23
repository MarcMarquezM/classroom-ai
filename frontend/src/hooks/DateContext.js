import React, { createContext, useContext, useState } from 'react';

const DateContext = createContext();

export function DateProvider({ children }) {
  const [dateContext, setDateContext] = useState();

  return (
    <DateContext.Provider value={{ dateContext, setDateContext}}>
      {children}
    </DateContext.Provider>
  );
}

export function useDate() {
  return useContext(DateContext);
}