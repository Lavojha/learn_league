export interface PersonalStudySessionSummary {
  id: string;
  userId: string;
  personalMaterialId: string | null;
  startedAt: Date;
  endedAt: Date | null;
  durationSeconds: number;
}

export interface PersonalTaskSummary {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  completed: boolean;
  dueAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
