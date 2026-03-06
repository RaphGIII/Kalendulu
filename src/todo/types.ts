export type Category = {
  id: string;
  name: string;
  color: string; // Akzentfarbe
};

export type Task = {
  id: string;
  title: string;
  categoryId: string;
  done: boolean;
  createdAt: number;

  // Reminder
  reminderEnabled?: boolean;
  reminderId?: string | null; // expo notification id
};

export type TodoState = {
  name: string;
  categories: Category[];
  tasks: Task[];
};