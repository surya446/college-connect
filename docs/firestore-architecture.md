# CollegeConnect Firestore Architecture (Production)

This document describes a normalized, scalable Firestore data model tailored for CollegeConnect (ERP).
It aims for realtime queries, low duplication of academic truth, and TypeScript-first safety.

Overview

- Collections (top-level): `users`, `departments`, `classes`, `sections`, `subjects`, `faculty_assignments`, `attendance_sessions`, `attendance` (aggregates), `announcements`, `results`, `complaints`, `notes`, `timetable`, `analytics`
- Design goals: normalized references (IDs), denormalized display fields only when necessary (subjectName, teacherName), per-session detailed collections for high-write volumes (`attendance_sessions`), aggregated collections for quick reads (`attendance`, `analytics`).
- Authentication: Firebase Auth remains the auth provider. Use `users/{uid}` documents to store profile metadata (role, roll/employee ids, permissions).

Principles

- Single source of truth: authoritative academic data (subject catalog, class->section mapping, faculty assignments) live in their own collections.
- Small denormalization: store human-friendly display fields (e.g., `subjectName`, `displayName`) to avoid extra joins in hot paths, but always reference by ID for authoritative operations.
- Scalable writes: detailed per-student attendance uses `attendance_sessions/{sessionId}` with an embedded `students[]` array for modest class sizes; for very large classes, switch to a `students/{sessionId}/entries/{uid}` subcollection.
- Security & permissions: enforce role + assignment checks in Firestore rules and optionally Cloud Functions for cross-collection validation.

Collections & Example Documents

1. `users/{uid}` (Auth-linked)

- Purpose: profile and role metadata, login IDs (roll/employee), preferences
- Key fields:
  - `uid` (doc id)
  - `email`, `displayName`, `role` (`student|faculty|admin`)
  - `rollNumber` (for students), `employeeId` (for faculty)
  - `departmentId`, `classId`, `sectionId` (student placement)
  - `assignedSubjects` (faculty cached list)
  - `permissions` (admin overrides)

Example:

```
users/uid_abc {
  displayName: "Alice Kumar",
  email: "alice@example.edu",
  role: "student",
  rollNumber: "CSE2026-1234",
  departmentId: "cse",
  classId: "cse-y3",
  sectionId: "A",
  cgpa: 8.3,
}
```

Indexes: single-field indexes on `role`, `rollNumber`, `employeeId`, `departmentId`, `classId`

2. `departments/{deptId}`

- Purpose: authoritative departments catalog
- Fields: `name`, `code`, `campusId`, `parentDeptId`

3. `classes/{classId}`

- Purpose: academic cohorts (programme+year)
- Fields: `code` (CSE-Y3), `departmentId`, `year`, `programme`, `sectionIds`

4. `sections/{sectionId}`

- Purpose: section metadata (A/B)
- Fields: `classId`, `name`, `capacity`

5. `subjects/{subjectId}`

- Purpose: curriculum catalog
- Fields: `code`, `name`, `departmentId`, `credits`, `term`, `facultyUids` (list)

6. `faculty_assignments/{assignmentId}`

- Purpose: explicit assignment docs linking faculty -> subject/class/section
- Fields: `facultyUid`, `subjectId`, `departmentId`, `classId?`, `sectionId?`, `role` (instructor/coordinator), `permissions[]`, `term`

Example:

```
faculty_assignments/assg_001 {
  facultyUid: "uid_fac_1",
  subjectId: "cs301",
  classId: "cse-y3",
  role: "instructor",
  permissions: ["manage_attendance"]
}
```

Recommended index: composite on `(facultyUid, term)` for admin queries.

7. `attendance_sessions/{sessionId}` (detailed)

- Purpose: record a single attendance-taking event (class meeting)
- Fields:
  - `subjectId`, `subjectName` (denorm), `classId`, `sectionId`, `departmentId`
  - `date` (timestamp), `facultyUid` (who took it)
  - `students[]` array: `{ uid, status: 'present'|'absent'|'late'|'excused', recordedAt }`
  - `presentCount`, `absentCount`, `notes`

Notes:

- For classes with >200 students, consider storing entries as subcollection `attendance_sessions/{sessionId}/entries/{uid}` to avoid large arrays.
- Create aggregated `attendance/{subjectId}/{date}` docs for quick dashboard queries (presentCount/absentCount).

Indexes: composite index on `(classId, date)`, `(subjectId, date)`, `(facultyUid, date)`.

8. `announcements/{id}`

- Purpose: time-sensitive notices
- Fields: `title`, `body`, `authorUid`, `scope` (global/department/class/subject), `targetIds[]`, `pinned`, `expiresAt`

9. `results/{resultId}`

- Purpose: student assessment records
- Fields: `studentUid`, `subjectId`, `classId`, `term`, `marks`, `grade`, `publishedAt`

Indexes: `(studentUid, term)`, `(subjectId, term)`

10. `complaints/{id}`

- Purpose: student/staff grievances
- Fields: `submittedBy`, `targetUid?`, `relatedClassId?`, `relatedSubjectId?`, `title`, `body`, `status`, `assignedTo?`

11. `notes/{id}`

- Purpose: uploaded learning materials (pdfs stored in Supabase)
- Fields: `title`, `pdfUrl`, `storagePath`, `uploadedBy`, `uploadedAt`, `subjectId?`, `classId?`, `visibility`

Indexes & Query patterns

- Frequent queries:
  - Students in class/section: `users` query by `classId` + `sectionId`
  - Faculty assignments for user: `faculty_assignments` query by `facultyUid`
  - Today's attendance sessions for class: `attendance_sessions` by `classId` + `date`
  - Announcements scoped to student: query `announcements` where `scope` in [global, department] and `targetIds` contains departmentId/classId

Recommended composite indexes (example):

- `attendance_sessions` (classId, date)
- `attendance_sessions` (subjectId, date)
- `faculty_assignments` (facultyUid, term)
- `results` (studentUid, term)
- `notes` (classId, uploadedAt)

Security considerations

- Use `users/{uid}` to map Firebase Auth user UIDs to application profiles (`rollNumber`, `employeeId`).
- Firestore rules should enforce:
  - Authenticated requests only; validate `request.auth.uid` exists.
  - Profile writes: users can update only limited fields; admin/HOD can change roles/department.
  - Attendance creation: only faculty assigned to the subject/class (check `faculty_assignments`) can add `attendance_sessions` and must set `facultyUid == request.auth.uid`.
  - Announcements: scoped writes allowed by role + department membership.
  - Results: only faculty or assigned exam staff can create/update `results` for subjects they are assigned to.
  - Notes delete: check that `uploadedBy == request.auth.uid` or user has manage_notes permission.

Example Firestore Rule snippet (conceptual):

```
match /attendance_sessions/{sessionId} {
  allow create: if isFaculty() && request.resource.data.facultyUid == request.auth.uid && canManageSubject(request.resource.data.subjectId);
  allow read: if isMemberOfClassOrFacultyForSubject();
}
```

Performance & Scaling

- For hot lists (e.g., students in a class), keep the `users` collection indexed on `classId` and `sectionId` and paginate in UI.
- For very large classes or frequent attendance writes, use a subcollection per session for entries to avoid array growth limits.
- Aggregate heavy metrics (attendance % per student) in a separate collection updated via Cloud Functions on write.

Migration notes (compatibility)

- Existing `notes` and `attendance_sessions` in the app map naturally to these collections; preserve field names where possible (`uploadedBy`, `storagePath`, `subjectId`).
- Keep Auth UIDs as primary user id; add `rollNumber`/`employeeId` as indexed fields for login flows. Use a small server-side mapping if you need roll-to-uid lookup for login assistance.

Operational recommendations

- Use Cloud Functions to:
  - Validate cross-collection invariants when creating assignments (e.g., subject exists, faculty exists).
  - Maintain aggregated attendance snapshots and analytics.
  - Send notifications when announcements are created (via FCM) — store notification records in `notifications/`.

Monitoring

- Track slow queries and index needs from Firestore console.
- Add monitoring around Cloud Functions that update aggregates to avoid eventual consistency surprises.

Backups & Data Retention

- Regularly export collections with scheduled backups (Firestore managed export) and set retention policies for logs/complaints/analytics.

This document should serve as the baseline schema and operational guide for implementing a production-grade Firestore backend for CollegeConnect. Adjustments may be required based on actual scale, query hotspots, and specific enterprise constraints.

\*\*\* End of document
