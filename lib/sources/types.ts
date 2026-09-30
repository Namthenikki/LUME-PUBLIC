export type Source = 'manipal' | 'nptel';
export type TaskType = 'assignment' | 'quiz' | 'other';

/** A deadline as a source reports it, before it is stored as a task. */
export interface RawTask {
  source: Source;
  /** Stable id of the item within its source, e.g. `quiz:18918:1380`. */
  externalId: string;
  course: string;
  title: string;
  type: TaskType;
  dueAt: Date;
  /** When a quiz window opens, if the source says. */
  opensAt: Date | null;
  url: string | null;
  /** The source says it has been submitted (NPTEL does); the task is then marked done. */
  submitted?: boolean;
}

export interface SourceAdapter {
  source: Source;
  /**
   * True if fetchTasks() returns every current item, so an item missing from it was removed
   * (the LMS feed). Email-based sources only see what's been mailed, so they set this to false.
   */
  authoritative: boolean;
  fetchTasks(): Promise<RawTask[]>;
}
