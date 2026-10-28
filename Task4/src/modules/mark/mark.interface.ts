export const EXAMS = ['unit-1', 'midterm', 'unit-2', 'final'] as const;
export type Exam = (typeof EXAMS)[number];

export interface Mark {
  id: number;
  studentId: number;
  exam: Exam;
  subject: string;
  score: number;
  maxScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MarkRow {
  id: number;
  student_id: number;
  exam: string;
  subject: string;
  score: number | string;
  max_score: number | string;
  created_at: Date;
  updated_at: Date;
}

export interface MarkChanges {
  studentId?: number;
  exam?: Exam;
  subject?: string;
  score?: number;
  maxScore?: number;
}

export interface MarkWritableColumns {
  student_id?: number;
  exam?: Exam;
  subject?: string;
  score?: number;
  max_score?: number;
}

export interface NewMark {
  subject: string;
  score: number;
  maxScore: number;
}

export interface SubjectAverage {
  subject: string;
  averagePercentage: number;
  students: number;
}

export interface AverageFilter {
  className: string;
  exam?: Exam;
  section?: string;
  sections?: string[];
}
