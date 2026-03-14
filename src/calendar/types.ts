export type CalEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  color: string;
  location?: string;
  description?: string;
};

export type ViewMode = 'three' | 'day';