export interface TimelineEvent {
  start: number;
  end: number;
  [key: string]: unknown;
}
