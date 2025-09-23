import React, { createContext, useContext, useState } from 'react';

const StudentContext = createContext();

export function StudentProvider({ children }) {
  const [studentDataContext, setStudentDataContext] = useState({
    StudentID: null,
    FirstName: null,
    LastName: null,
    Email: null,
  });

  return (
    <StudentContext.Provider value={{ studentDataContext, setStudentDataContext}}>
      {children}
    </StudentContext.Provider>
  );
}

export function useStudent() {
  return useContext(StudentContext);
}