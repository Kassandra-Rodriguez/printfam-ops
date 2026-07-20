import { CheckSquare } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { AddTaskForm } from "@/components/tasks/add-task-form";
import { TaskRow } from "@/components/tasks/task-row";
import { requireOrgContext } from "@/server/authz/session";
import { listOpenTasks, type TaskRow as TaskRowData } from "@/server/data/tasks";

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

function isToday(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate).toDateString() === new Date().toDateString();
}

export default async function TasksPage() {
  const ctx = await requireOrgContext();
  const tasks = await listOpenTasks(ctx.supabase, ctx.activeMembership.organization_id);

  const overdue = tasks.filter((t) => isOverdue(t.due_date));
  const today = tasks.filter((t) => isToday(t.due_date));
  const upcoming = tasks.filter((t) => !isOverdue(t.due_date) && !isToday(t.due_date));

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-lg font-semibold">Tasks</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Follow-ups and to-dos, across every order and customer.
      </p>

      <div className="mt-4">
        <AddTaskForm />
      </div>

      {tasks.length === 0 ? (
        <div className="mt-6 rounded-lg border">
          <EmptyState
            icon={CheckSquare}
            title="No open tasks"
            description="Tasks you create — or that get suggested from orders — will show up here."
          />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          <TaskGroup title="Overdue" tasks={overdue} />
          <TaskGroup title="Today" tasks={today} />
          <TaskGroup title="Upcoming" tasks={upcoming} />
        </div>
      )}
    </div>
  );
}

function TaskGroup({ title, tasks }: { title: string; tasks: TaskRowData[] }) {
  if (tasks.length === 0) return null;
  return (
    <div>
      <h2 className="mb-2 text-xs font-medium text-muted-foreground uppercase">
        {title} ({tasks.length})
      </h2>
      <div className="rounded-lg border">
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}
