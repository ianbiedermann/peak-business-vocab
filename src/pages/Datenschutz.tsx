import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Datenschutz = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
          <h1 className="text-3xl font-bold text-foreground">
            Datenschutzerklärung
          </h1>
        </div>
        
        <Card className="p-6">
          <div className="prose prose-slate dark:prose-invert max-w-none">
            {/* Hier können Sie Ihren Datenschutz-Inhalt hinzufügen */}
            <p className="text-muted-foreground">
              Hier können Sie den Inhalt Ihrer Datenschutzerklärung hinzufügen.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Datenschutz;