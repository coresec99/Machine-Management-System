import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
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
import { breakdownSchema, BreakdownFormData } from '@/lib/validations';
import { useMachines } from '@/hooks/useMachines';
import { useCreateBreakdown } from '@/hooks/useBreakdowns';

const breakdownCategories = [
  { value: 'mechanical', label: 'Mechanical' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'hydraulic', label: 'Hydraulic' },
  { value: 'pneumatic', label: 'Pneumatic' },
  { value: 'software', label: 'Software' },
  { value: 'other', label: 'Other' },
];

interface BreakdownFormProps {
  onClose: () => void;
}

export const BreakdownForm = ({ onClose }: BreakdownFormProps) => {
  const { data: machines = [], isLoading: machinesLoading } = useMachines();
  const createBreakdown = useCreateBreakdown();

  const form = useForm<BreakdownFormData>({
    resolver: zodResolver(breakdownSchema),
    defaultValues: {
      breakdown_id: `BRK${Date.now().toString().slice(-8)}`,
      machine_id: '',
      title: '',
      description: '',
      category: undefined,
      priority: undefined,
      start_time: new Date().toISOString(),
    },
  });

  const onSubmit = async (data: BreakdownFormData) => {
    try {
      await createBreakdown.mutateAsync({
        breakdown_id: data.breakdown_id,
        machine_id: data.machine_id,
        title: data.title,
        description: data.description,
        category: data.category,
        priority: data.priority,
        start_time: data.start_time,
      });
      onClose();
    } catch (error) {
      // Error handled in hook
    }
  };

  const isLoading = machinesLoading;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="machine_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Machine</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoading ? 'Loading...' : 'Select machine'} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {machines.map((machine) => (
                      <SelectItem key={machine.id} value={machine.id}>
                        {machine.name} (#{machine.machine_id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {breakdownCategories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input
                  placeholder="Brief title for the breakdown"
                  maxLength={200}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Issue Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the issue in detail..."
                  className="min-h-[100px]"
                  maxLength={1000}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createBreakdown.isPending}>
            {createBreakdown.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Logging...
              </>
            ) : (
              'Log Breakdown'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};
