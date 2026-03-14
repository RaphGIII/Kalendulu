export type Category = {
  id: string;
  name: string;
  color: string;
};

export type TaskPriority = 'low' | 'medium' | 'high';

export type Task = {
  id: string;
  title: string;
  categoryId: string;
  done: boolean;
  createdAt: number;

  reminderEnabled?: boolean;
  reminderId?: string | null;

  doneAt?: number | null;
  note?: string;
  subcategory?: string | null;
  linkedGoalId?: string | null;
  priority?: TaskPriority;
};

export type TodoState = {
  name: string;
  categories: Category[];
  tasks: Task[];
};