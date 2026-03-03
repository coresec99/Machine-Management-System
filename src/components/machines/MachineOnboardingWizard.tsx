import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Upload, X, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { useCreateMachine, useUpdateMachine, DbMachine } from '@/hooks/useMachines';
import { useProfiles } from '@/hooks/useProfiles';
import { machineSchema, MachineFormData } from '@/lib/validations';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const machineTypes = [
    'Drilling', 'Drilling & Tapping', 'Blasting', 'Coating', 'Testing',
    'Milling', 'CNC Lathe', 'Compressor', 'Crane', 'Lathe', 'Other'
];
const locations = ['Factory 1', 'Factory 2', 'Factory 3', 'Warehouse'];
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];

const STEPS = [
    { id: 'basic', title: 'Basic Details' },
    { id: 'ownership', title: 'Ownership' },
    { id: 'vendor', title: 'Vendor & Warranty' },
    { id: 'config', title: 'Maintenance Config' },
    { id: 'docs', title: 'Documentation' }
];

interface MachineOnboardingWizardProps {
    machine?: DbMachine;
    onClose: () => void;
}

const MachineOnboardingWizard = ({ machine, onClose }: MachineOnboardingWizardProps) => {
    const [currentStep, setCurrentStep] = useState(0);
    const createMachine = useCreateMachine();
    const updateMachine = useUpdateMachine();
    const { data: users } = useProfiles();

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(machine?.image_url || null);
    const [uploading, setUploading] = useState(false);

    // Filter users by role for dropdowns
    const managers = users?.filter(u => u.role === 'manager' || u.role === 'admin') || [];
    const supervisors = users?.filter(u => u.role === 'supervisor' || u.role === 'admin') || [];
    const technicians = users?.filter(u => u.role === 'technician' || u.role === 'admin' || u.role === 'supervisor') || [];

    const [docFiles, setDocFiles] = useState<Record<string, File | null>>({
        user_manual_url: null,
        service_manual_url: null,
        sop_url: null,
        compliance_cert_url: null
    });

    const form = useForm<MachineFormData>({
        resolver: zodResolver(machineSchema),
        defaultValues: {
            machine_id: machine?.machine_id || '',
            name: machine?.name || '',
            type: machine?.type || '',
            location: machine?.location || '',
            serial_number: machine?.serial_number || '',
            status: (machine?.status as any) || 'running',
            health: (machine?.health as any) || 'good',
            installation_date: machine?.installation_date ? machine.installation_date.split('T')[0] : '',
            maintenance_frequency: machine?.maintenance_frequency || 'monthly',
            description: machine?.description || '',
            fuel_type: (machine?.fuel_type as any) || 'electric',

            // New Fields Defaulting
            assigned_manager_id: machine?.assigned_manager_id || '',
            default_technician_id: machine?.default_technician_id || '',
            backup_supervisor_id: machine?.backup_supervisor_id || '',
            vendor_name: machine?.vendor_name || '',
            vendor_contact: machine?.vendor_contact || '',
            vendor_email: machine?.vendor_email || '',
            warranty_start: machine?.warranty_start ? machine.warranty_start.split('T')[0] : '',
            warranty_end: machine?.warranty_end ? machine.warranty_end.split('T')[0] : '',
            amc_status: machine?.amc_status || false,
            support_contact: machine?.support_contact || '',
            pm_cycle_days: machine?.pm_cycle_days || 30,
            sla_hours: machine?.sla_hours || 24,
            user_manual_url: machine?.user_manual_url || '',
            service_manual_url: machine?.service_manual_url || '',
            sop_url: machine?.sop_url || '',
            compliance_cert_url: machine?.compliance_cert_url || '',
        },
    });

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
            toast.error('Only image files are allowed');
            e.target.value = '';
            return;
        }
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const uploadImage = async (machineId: string): Promise<string | null> => {
        if (!imageFile) return imagePreview;
        setUploading(true);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Mock upload
        setUploading(false);
        return imagePreview;
    };

    const uploadDocument = async (machineId: string, docType: string, file: File) => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('docType', docType);

            const token = localStorage.getItem('mms_token');
            const res = await fetch(`${API_URL}/machines/${machineId}/upload`, {
                method: 'POST',
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: formData
            });

            if (!res.ok) throw new Error('Failed to upload doc');
        } catch (error) {
            console.error(error);
            toast.error(`Failed to upload ${docType}`);
        }
    };

    const nextStep = async () => {
        // Determine which fields to validate based on the current step
        let fieldsToValidate: any[] = [];
        if (currentStep === 0) {
            fieldsToValidate = ['machine_id', 'name', 'type', 'location', 'status', 'health'];
        } else if (currentStep === 1) {
            fieldsToValidate = ['assigned_manager_id'];
        } else if (currentStep === 2) {
            fieldsToValidate = ['vendor_email']; // validate email format if present
        } else if (currentStep === 3) {
            fieldsToValidate = ['pm_cycle_days', 'sla_hours'];
        } else if (currentStep === 4) {
            fieldsToValidate = []; // documents handled as file uploads
        }

        const isStepValid = await form.trigger(fieldsToValidate as any);
        if (isStepValid) {
            setCurrentStep(s => Math.min(s + 1, STEPS.length - 1));
        }
    };

    const prevStep = () => {
        setCurrentStep(s => Math.max(s - 1, 0));
    };

    const onSubmit = async (data: MachineFormData) => {
        try {
            if (machine) {
                const imageUrl = await uploadImage(machine.id);
                await updateMachine.mutateAsync({
                    id: machine.id,
                    ...data,
                    image_url: imageUrl,
                });

                // Upload attached documents
                setUploading(true);
                for (const [docType, file] of Object.entries(docFiles)) {
                    if (file) await uploadDocument(machine.id, docType, file);
                }
                setUploading(false);
            } else {
                const result = await createMachine.mutateAsync({
                    ...data,
                    is_active: true,
                    last_maintenance: null,
                    next_maintenance: null,
                    fuel_consumption_monthly: 0,
                    image_url: null,
                } as any);

                if (imageFile && result?.id) {
                    const imageUrl = await uploadImage(result.id);
                    if (imageUrl) {
                        await updateMachine.mutateAsync({ id: result.id, image_url: imageUrl });
                    }
                }

                if (result?.id) {
                    setUploading(true);
                    for (const [docType, file] of Object.entries(docFiles)) {
                        if (file) await uploadDocument(result.id, docType, file);
                    }
                    setUploading(false);
                }
            }
            onClose();
        } catch (error) {
            // Handled globally
        }
    };

    const isPending = createMachine.isPending || updateMachine.isPending || uploading;

    return (
        <div className="flex flex-col h-full max-h-[80vh]">
            {/* Wizard Header Progress */}
            <div className="flex justify-between mb-8 overflow-x-auto gap-2 pb-2 hide-scrollbar">
                {STEPS.map((step, idx) => {
                    const isActive = idx === currentStep;
                    const isCompleted = idx < currentStep;

                    return (
                        <div key={step.id} className={`flex flex-col items-center justify-center gap-3 flex-1 min-w-[120px] p-4 rounded-xl transition-all
                            ${isActive ? 'bg-primary/5 shadow-sm border border-primary/10' : 'bg-transparent border border-transparent'}`}>

                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors
                                ${isActive ? 'bg-background border-primary text-primary border' :
                                    isCompleted ? 'bg-primary border-primary text-primary-foreground border' :
                                        'bg-background border-muted/60 text-muted-foreground border'}`}
                            >
                                {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                            </div>

                            <span className={`text-xs text-center font-medium ${isActive || isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {step.title}
                            </span>
                        </div>
                    );
                })}
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-1 pb-4">

                    {/* STEP 1: Basic Details */}
                    <div className={currentStep === 0 ? 'space-y-4 animate-in fade-in slide-in-from-right-4' : 'hidden'}>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="machine_id" render={({ field }) => (
                                <FormItem><FormLabel>Machine No.</FormLabel><FormControl><Input placeholder="e.g. LATHE-001" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem><FormLabel>Machine Name</FormLabel><FormControl><Input placeholder="Enter machine name" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="type" render={({ field }) => (
                                <FormItem><FormLabel>Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value || ''} value={field.value || ''}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {machineTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                        </SelectContent>
                                    </Select><FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="location" render={({ field }) => (
                                <FormItem><FormLabel>Location</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value || ''} value={field.value || ''}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {locations.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                                        </SelectContent>
                                    </Select><FormMessage />
                                </FormItem>
                            )} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="serial_number" render={({ field }) => (
                                <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input placeholder="Manufacturer serial" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="installation_date" render={({ field }) => (
                                <FormItem><FormLabel>Installation Date</FormLabel><FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>

                        <div className="space-y-2 mt-4">
                            <FormLabel>Machine Image</FormLabel>
                            {imagePreview ? (
                                <div className="relative w-full h-40 rounded-lg border border-border overflow-hidden group">
                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                    <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => { setImageFile(null); setImagePreview(null); }}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                                    <span className="text-sm">Click to upload image</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                                </label>
                            )}
                        </div>
                    </div>

                    {/* STEP 2: Ownership */}
                    <div className={currentStep === 1 ? 'space-y-4 animate-in fade-in slide-in-from-right-4' : 'hidden'}>
                        <div className="rounded-lg border bg-blue-50/50 p-4 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900 mb-6">
                            <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">Asset Ownership Routing</h4>
                            <p className="text-xs text-blue-600 dark:text-blue-400">Selecting an Assigned Manager ensures that all new breakdowns for this machine are automatically routed to them without manual intervention.</p>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            <FormField control={form.control} name="assigned_manager_id" render={({ field }) => (
                                <FormItem><FormLabel>Assigned Manager (Owner)</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value || ''} value={field.value || ''}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select Manager" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {managers.map(m => (
                                                <SelectItem key={m.user_id} value={m.user_id}>{m.name} ({m.department || 'No Dept'})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="default_technician_id" render={({ field }) => (
                                <FormItem><FormLabel>Default Technician</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value || ''} value={field.value || ''}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select Default Technician" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {technicians.map(t => (
                                                <SelectItem key={t.user_id} value={t.user_id}>{t.name} ({t.department || 'No Dept'})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="backup_supervisor_id" render={({ field }) => (
                                <FormItem><FormLabel>Backup Supervisor</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value || ''} value={field.value || ''}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select Supervisor (Optional)" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {supervisors.map(s => (
                                                <SelectItem key={s.user_id} value={s.user_id}>{s.name} ({s.department || 'No Dept'})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                    </div>

                    {/* STEP 3: Vendor & Warranty */}
                    <div className={currentStep === 2 ? 'space-y-4 animate-in fade-in slide-in-from-right-4' : 'hidden'}>
                        <FormField control={form.control} name="vendor_name" render={({ field }) => (
                            <FormItem><FormLabel>Vendor / Manufacturer Name</FormLabel><FormControl><Input placeholder="e.g. Siemens" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="vendor_contact" render={({ field }) => (
                                <FormItem><FormLabel>Vendor Phone</FormLabel><FormControl><Input placeholder="Phone number" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="vendor_email" render={({ field }) => (
                                <FormItem><FormLabel>Vendor Email</FormLabel><FormControl><Input placeholder="Email address" type="email" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="warranty_start" render={({ field }) => (
                                <FormItem><FormLabel>Warranty Start</FormLabel><FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="warranty_end" render={({ field }) => (
                                <FormItem><FormLabel>Warranty End</FormLabel><FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                        <FormField control={form.control} name="amc_status" render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <FormLabel className="text-base">Active AMC Contract</FormLabel>
                                    <FormDescription>Does this machine have an Annual Maintenance Contract?</FormDescription>
                                </div>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                        )} />
                    </div>

                    {/* STEP 4: Maintenance Config */}
                    <div className={currentStep === 3 ? 'space-y-4 animate-in fade-in slide-in-from-right-4' : 'hidden'}>
                        <FormField control={form.control} name="pm_cycle_days" render={({ field }) => (
                            <FormItem><FormLabel>Preventive Maintenance Cycle (Days)</FormLabel>
                                <div className="flex items-center gap-4">
                                    <FormControl><Input type="number" min="1" max="3650" {...field} value={field.value || ''} className="w-32" /></FormControl>
                                    <span className="text-sm text-muted-foreground">Days between scheduled maintenance</span>
                                </div>
                                <FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="sla_hours" render={({ field }) => (
                            <FormItem><FormLabel>SLA Critical Downtime Rule (Hours)</FormLabel>
                                <div className="flex items-center gap-4">
                                    <FormControl><Input type="number" min="1" {...field} value={field.value || ''} className="w-32" /></FormControl>
                                    <span className="text-sm text-muted-foreground">Maximum downtime allowed before SLA breach</span>
                                </div>
                                <FormMessage /></FormItem>
                        )} />
                    </div>

                    {/* STEP 5: Documents */}
                    <div className={currentStep === 4 ? 'space-y-4 animate-in fade-in slide-in-from-right-4' : 'hidden'}>
                        <p className="text-sm text-muted-foreground mb-4">Upload PDF or Document files for machine documentation.</p>

                        {['user_manual_url', 'service_manual_url', 'sop_url', 'compliance_cert_url'].map(docKey => (
                            <div key={docKey} className="space-y-2">
                                <FormLabel>{docKey.replace('_url', '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</FormLabel>
                                <div className="flex items-center gap-4">
                                    <Input
                                        type="file"
                                        accept=".pdf,.doc,.docx"
                                        onChange={(e) => {
                                            if (e.target.files?.[0]) {
                                                setDocFiles(prev => ({ ...prev, [docKey]: e.target.files![0] }));
                                            }
                                        }}
                                    />
                                    {(machine as any)?.[docKey] && !docFiles[docKey] && (
                                        <span className="text-xs text-muted-foreground line-clamp-1">Current file uploaded</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                </form>

                {/* Wizard Footer Controls */}
                <div className="flex justify-between items-center pt-4 border-t mt-auto">
                    <Button variant="outline" type="button" onClick={currentStep === 0 ? onClose : prevStep}>
                        {currentStep === 0 ? 'Cancel' : <><ChevronLeft className="w-4 h-4 mr-1" /> Back</>}
                    </Button>

                    {currentStep < STEPS.length - 1 ? (
                        <Button type="button" onClick={nextStep}>
                            Next Step <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    ) : (
                        <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={isPending}>
                            {isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving Asset...</> : <><CheckCircle2 className="w-4 h-4 mr-2" /> {machine ? 'Update Machine' : 'Complete Onboarding'}</>}
                        </Button>
                    )}
                </div>
            </Form>
        </div>
    );
};

export default MachineOnboardingWizard;
