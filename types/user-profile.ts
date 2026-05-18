export type UserRole = "student" | "faculty" | "admin" | "hod";

export interface UserProfileBase {
  name: string;
  role: UserRole;
  // optional shared fields
  department?: string;
  year?: string;
  attendance?: number;
  cgpa?: number;
}

export interface StudentProfile extends UserProfileBase {
  role: "student";
  // required for students
  department: string;
  year: string;
  attendance: number;
  cgpa: number;
}

export interface FacultyProfile extends UserProfileBase {
  role: "faculty";
  // faculty may have department, designation, assignedSubjects
  designation?: string;
  assignedSubjects?: string[];
}

export interface HodProfile extends UserProfileBase {
  role: "hod";
  // HODs can be scoped to one or more departments
  departments: string[];
  // optional delegation flag
  delegatedTo?: string[];
}

export interface AdminProfile extends UserProfileBase {
  role: "admin";
  // admin may omit department/year
  permissions?: string[];
}

export type UserProfile =
  | StudentProfile
  | FacultyProfile
  | AdminProfile
  | HodProfile;

export type UserProfileFirestore = {
  name?: unknown;
  role?: unknown;
  department?: unknown;
  year?: unknown;
  attendance?: unknown;
  cgpa?: unknown;
  designation?: unknown;
  assignedSubjects?: unknown;
  permissions?: unknown;
  departments?: unknown;
};
