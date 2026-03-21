export type CalEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  color: string;
  colorIndex?: number;
  location?: string;
  description?: string;
};

export type ViewMode = 'three' | 'day';