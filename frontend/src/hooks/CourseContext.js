import React, { createContext, useContext, useState } from 'react';

const CourseContext = createContext();

export function CourseProvider({ children }) {
  const [courseData, setCourseData] = useState({
    courseID: null,
  });

  return (
    <CourseContext.Provider value={{ courseData, setCourseData}}>
      {children}
    </CourseContext.Provider>
  );
}

export function useCourse() {
  return useContext(CourseContext);
}