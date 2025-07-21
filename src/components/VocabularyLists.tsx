import { useState } from 'react';
import { Upload, FileText, Trash2, Eye, EyeOff, Plus } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { useToast } from '../hooks/use-toast';
import { VocabularyList } from '../types/vocabulary';

interface VocabularyListsProps {
  lists: VocabularyList[];
  onUploadList: (name: string, vocabularies: Array<{english: string, german: string}>) => void;
  onToggleList: (listId: string, isActive: boolean) => void;
  onDeleteList: (listId: string) => void;
  onBack: () => void;
}

export function VocabularyLists({ lists, onUploadList, onToggleList, onDeleteList, onBack }: VocabularyListsProps) {
  const [uploadName, setUploadName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!uploadName.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte gib einen Namen für die Liste ein.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: ['english', 'german'] });

      // Filter out header row and empty rows
      const vocabularies = jsonData
        .slice(1) // Skip header
        .filter((row: any) => row.english && row.german && 
                 typeof row.english === 'string' && 
                 typeof row.german === 'string')
        .map((row: any) => ({
          english: row.english.trim(),
          german: row.german.trim()
        }));

      if (vocabularies.length === 0) {
        toast({
          title: "Fehler",
          description: "Keine gültigen Vokabeln in der Datei gefunden. Überprüfe das Format.",
          variant: "destructive"
        });
        return;
      }

      onUploadList(uploadName.trim(), vocabularies);
      setUploadName('');
      event.target.value = ''; // Reset file input
      
      toast({
        title: "Erfolg",
        description: `${vocabularies.length} Vokabeln erfolgreich hochgeladen.`,
      });
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Fehler beim Lesen der Excel-Datei. Überprüfe das Format.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack}>
            ← Zurück
          </Button>
          <h1 className="text-2xl font-bold">Vokabellisten verwalten</h1>
        </div>

        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Neue Liste hochladen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="list-name">Name der Liste</Label>
              <Input
                id="list-name"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="z.B. Business Englisch Level 1"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="excel-file">Excel-Datei auswählen</Label>
              <Input
                id="excel-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
              <p className="text-sm text-muted-foreground">
                Format: Spalte A = Englisch, Spalte B = Deutsch
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Lists Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Deine Listen ({lists.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lists.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Plus className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Noch keine Listen hochgeladen</p>
                <p className="text-sm">Lade deine erste Excel-Liste hoch, um zu beginnen.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lists.map((list) => (
                  <div
                    key={list.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium">{list.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {list.vocabularyCount} Vokabeln • 
                        Hochgeladen am {new Date(list.uploadedAt).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {list.isActive ? (
                          <Eye className="h-4 w-4 text-primary" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        )}
                        <Switch
                          checked={list.isActive}
                          onCheckedChange={(checked) => onToggleList(list.id, checked)}
                        />
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDeleteList(list.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}