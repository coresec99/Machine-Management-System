import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Settings2 } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import MachineOnboardingWizard from '@/components/machines/MachineOnboardingWizard';
import { useMachine } from '@/hooks/useMachines';

const MachineEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: machine, isLoading } = useMachine(id || '');

  if (isLoading) {
    return (
      <MainLayout title="Loading..." subtitle="">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!machine) {
    return (
      <MainLayout title="Machine Not Found" subtitle="">
        <div className="text-center py-12">
          <Settings2 className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Machine not found</h2>
          <Button onClick={() => navigate('/machines')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Machines
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={`Edit ${machine.name}`} subtitle={`Machine #${machine.machine_id}`}>
      <div className="max-w-4xl mx-auto w-full">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card className="overflow-hidden shadow-lg border-2 border-primary/10">
          <CardHeader className="bg-muted/30 pb-4 mb-4">
            <CardTitle className="text-xl">Edit Machine: {machine.name}</CardTitle>
          </CardHeader>
          <CardContent className="h-[75vh]">
            <MachineOnboardingWizard machine={machine} onClose={() => navigate(`/machines/${id}`)} />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default MachineEdit;
