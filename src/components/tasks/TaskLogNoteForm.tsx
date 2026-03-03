import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Send, Loader2, Play, CheckCircle2, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { taskLogNoteSchema, TaskLogNoteFormData } from '@/lib/validations';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface TaskLogNoteFormProps {
  breakdownId: string;
  taskTitle: string;
  taskDescription: string;
  onSuccess?: () => void;
}

export const TaskLogNoteForm = ({
  breakdownId,
  taskTitle,
  taskDescription,
  onSuccess
}: TaskLogNoteFormProps) => {
  const queryClient = useQueryClient();

  const form = useForm<TaskLogNoteFormData>({
    resolver: zodResolver(taskLogNoteSchema),
    defaultValues: {
      note: '',
      work_duration: null,
      work_status: undefined,
    },
  });

  const createLogNote = useMutation({
    mutationFn: async (data: TaskLogNoteFormData) => {
      const user = { id: 'mock-user-id' };
      if (!user) throw new Error('Not authenticated');

      // Mocked insert task log note
      await new Promise(resolve => setTimeout(resolve, 500));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['breakdowns'] });
      toast.success('Log note added successfully');
      form.reset();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error('Failed to add log note: ' + error.message);
    },
  });

  const onSubmit = (data: TaskLogNoteFormData) => {
    createLogNote.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="p-4 bg-muted/50 rounded-lg">
          <p className="text-sm font-medium mb-1">Task: {taskTitle}</p>
          <p className="text-xs text-muted-foreground line-clamp-2">{taskDescription}</p>
        </div>

        <FormField
          control={form.control}
          name="work_status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Work Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="working">
                    <div className="flex items-center gap-2">
                      <Play className="h-4 w-4 text-status-warning" />
                      Still Working
                    </div>
                  </SelectItem>
                  <SelectItem value="completed">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-status-success" />
                      Task Completed
                    </div>
                  </SelectItem>
                  <SelectItem value="blocked">
                    <div className="flex items-center gap-2">
                      <Pause className="h-4 w-4 text-status-critical" />
                      Blocked / Need Help
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="work_duration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Work Duration (minutes)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="e.g., 30"
                  min={0}
                  max={1440}
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Log Note</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe what you did, observations, issues encountered..."
                  className="min-h-[120px]"
                  maxLength={1000}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={createLogNote.isPending}>
          {createLogNote.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Submit Log Note
            </>
          )}
        </Button>
      </form>
    </Form>
  );
};
