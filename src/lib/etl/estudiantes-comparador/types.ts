export interface ComparableStudent {
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  courses: Set<string>;
}

export interface ModifiedStudent {
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  addedCourses: string[];
  removedCourses: string[];
}

export interface StudentsDiffResult {
  addedStudents: ComparableStudent[];
  removedStudents: ComparableStudent[];
  modifiedStudents: ModifiedStudent[];
  unchangedCount: number;
}
