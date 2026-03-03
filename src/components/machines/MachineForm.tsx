import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCreateMachine, useUpdateMachine, DbMachine } from '@/hooks/useMachines';
import { machineSchema, MachineFormData } from '@/lib/validations';
import { toast } from 'sonner';

const machineTypes = [
  'Drilling', 'Drilling & Tapping', 'Blasting', 'Coating', 'Testing',
  'Milling', 'CNC Lathe', 'Compressor', 'Crane', 'Lathe',
];

const locations = ['Factory 1', 'Factory 2', 'Factory 3', 'Warehouse'];

const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];

interface MachineFormProps {
  machine?: DbMachine;
  onClose: () => void;
}

const MachineForm = ({ machine, onClose }: MachineFormProps) => {
  const createMachine = useCreateMachine();
  const updateMachine = useUpdateMachine();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(machine?.image_url || null);
  const [uploading, setUploading] = useState(false);

  const form = useForm<MachineFormData>({
    resolver: zodResolver(machineSchema),
    defaultValues: {
      machine_id: machine?.machine_id || '',
      name: machine?.name || '',
      type: machine?.type || '',
      location: machine?.location || '',
      serial_number: machine?.serial_number || '',
      status: (machine?.status as 'running' | 'down' | 'maintenance') || 'running',
      health: (machine?.health as 'good' | 'warning' | 'critical') || 'good',
      installation_date: machine?.installation_date || '',
      maintenance_frequency: machine?.maintenance_frequency || 'monthly',
      description: machine?.description || '',
      fuel_type: (machine?.fuel_type as 'electric' | 'diesel' | 'petrol' | 'gas' | 'hybrid') || 'electric',
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Only image files are allowed (PNG, JPEG, WebP, GIF)');
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      e.target.value = '';
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const uploadImage = async (machineId: string): Promise<string | null> => {
    if (!imageFile) return imagePreview; // keep existing if no new file

    setUploading(true);
    const fileExt = imageFile.name.split('.').pop();
    const filePath = `${machineId}.${fileExt}`;

    // Mock upload
    await new Promise(resolve => setTimeout(resolve, 1000));
    setUploading(false);
    return imagePreview;
  };

  const onSubmit = async (data: MachineFormData) => {
    try {
      if (machine) {
        const imageUrl = await uploadImage(machine.id);
        await updateMachine.mutateAsync({
          id: machine.id,
          machine_id: data.machine_id,
          name: data.name,
          type: data.type,
          location: data.location,
          serial_number: data.serial_number || null,
          status: data.status,
          health: data.health,
          installation_date: data.installation_date || null,
          maintenance_frequency: data.maintenance_frequency || null,
          description: data.description || null,
          fuel_type: data.fuel_type || 'electric',
          image_url: imageUrl,
        });
      } else {
        const result = await createMachine.mutateAsync({
          machine_id: data.machine_id,
          name: data.name,
          type: data.type,
          location: data.location,
          serial_number: data.serial_number || null,
          status: data.status,
          health: data.health,
          installation_date: data.installation_date || null,
          maintenance_frequency: data.maintenance_frequency || null,
          description: data.description || null,
          is_active: true,
          last_maintenance: null,
          next_maintenance: null,
          fuel_type: data.fuel_type || 'electric',
          fuel_consumption_monthly: 0,
          image_url: null,
        });
        // Upload image after creation
        if (imageFile && result?.id) {
          const imageUrl = await uploadImage(result.id);
          if (imageUrl) {
            await updateMachine.mutateAsync({ id: result.id, image_url: imageUrl });
          }
        }
      }
      onClose();
    } catch (error) {
      // Error handled in hook
    }
  };

  const isPending = createMachine.isPending || updateMachine.isPending || uploading;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="machine_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Machine No.</FormLabel>
                <FormControl><Input placeholder="e.g., 101" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField control={form.control} name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Machine Name</FormLabel>
                <FormControl><Input placeholder="Enter machine name" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {machineTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField control={form.control} name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="serial_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Serial Number</FormLabel>
                <FormControl>
                  <Input placeholder="Enter serial number" {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField control={form.control} name="fuel_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fuel Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value || 'electric'}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select fuel type" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="electric">Electric</SelectItem>
                    <SelectItem value="diesel">Diesel</SelectItem>
                    <SelectItem value="petrol">Petrol</SelectItem>
                    <SelectItem value="gas">Gas</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="installation_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Installation Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField control={form.control} name="maintenance_frequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Maintenance Frequency</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value || 'monthly'}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Image Upload */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Machine Image</label>
          {imagePreview ? (
            <div className="relative w-full h-40 rounded-lg border border-border overflow-hidden">
              <img src={imagePreview} alt="Machine preview" className="w-full h-full object-cover" />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7"
                onClick={removeImage}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">Click to upload image</span>
              <span className="text-xs text-muted-foreground mt-1">PNG, JPEG, WebP, GIF (max 5MB)</span>
              <input
                type="file"
                className="hidden"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                onChange={handleImageChange}
              />
            </label>
          )}
        </div>

        <FormField control={form.control} name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <textarea
                  className="form-input min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Enter machine description"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{machine ? 'Updating...' : 'Adding...'}</>
            ) : (
              machine ? 'Update Machine' : 'Add Machine'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default MachineForm;
