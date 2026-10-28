export const GUARDIAN_RELATIONS = ['father', 'mother', 'guardian'] as const;
export type GuardianRelation = (typeof GUARDIAN_RELATIONS)[number];

export interface Guardian {
  name: string;
  phone: string;
  relation: GuardianRelation;
}

export interface Student {
  id: number;
  rollNo: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  className: string;
  section: string;
  guardian: Guardian;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentRow {
  id: number;
  roll_no: string;
  first_name: string;
  last_name: string;
  date_of_birth: Date | string;
  class_name: string;
  section: string;
  guardian_name: string;
  guardian_phone: string;
  guardian_relation: string;
  created_at: Date;
  updated_at: Date;
}

export interface StudentChanges {
  rollNo?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: Date;
  className?: string;
  section?: string;
  guardian?: Guardian;
}

export interface StudentWritableColumns {
  roll_no?: string;
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  class_name?: string;
  section?: string;
  guardian_name?: string;
  guardian_phone?: string;
  guardian_relation?: GuardianRelation;
}

export interface ClassScope {
  className: string;
  section: string;
}

export interface StudentListFilter {
  className?: string;
  section?: string;
  search?: string;
  limit: number;
  offset: number;
  classes?: ClassScope[];
  ids?: number[];
}
