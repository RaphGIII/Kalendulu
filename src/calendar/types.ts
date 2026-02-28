export type CalEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  color: string; // pastel / theme
};

export type ViewMode = 'three' | 'day';