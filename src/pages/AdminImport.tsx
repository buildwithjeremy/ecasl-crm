import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, CheckCircle, AlertCircle } from "lucide-react";

export default function AdminImport() {
  const [isImportingInterpreters, setIsImportingInterpreters] = useState(false);
  const [isImportingFacilities, setIsImportingFacilities] = useState(false);
  const [interpretersResult, setInterpretersResult] = useState<{ success: boolean; message: string } | null>(null);
  const [facilitiesResult, setFacilitiesResult] = useState<{ success: boolean; message: string } | null>(null);

  const importInterpreters = async () => {
    setIsImportingInterpreters(true);
    setInterpretersResult(null);
    
    try {
      // Fetch the CSV file
      const response = await fetch('/data/interpreters-import.csv');
      const csvData = await response.text();
      
      // Call the edge function
      const { data, error } = await supabase.functions.invoke('import-csv-data', {
        body: { type: 'interpreters', csvData }
      });
      
      if (error) throw error;
      
      setInterpretersResult({ success: true, message: data.message });
      toast.success(data.message);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setInterpretersResult({ success: false, message: errorMessage });
      toast.error(`Import failed: ${errorMessage}`);
    } finally {
      setIsImportingInterpreters(false);
    }
  };

  const importFacilities = async () => {
    setIsImportingFacilities(true);
    setFacilitiesResult(null);
    
    try {
      // Fetch the CSV file
      const response = await fetch('/data/facilities-import.csv');
      const csvData = await response.text();
      
      // Call the edge function
      const { data, error } = await supabase.functions.invoke('import-csv-data', {
        body: { type: 'facilities', csvData }
      });
      
      if (error) throw error;
      
      setFacilitiesResult({ success: true, message: data.message });
      toast.success(data.message);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setFacilitiesResult({ success: false, message: errorMessage });
      toast.error(`Import failed: ${errorMessage}`);
    } finally {
      setIsImportingFacilities(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <h1 className="text-3xl font-bold mb-8">Data Import</h1>
      
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Import Interpreters</CardTitle>
            <CardDescription>
              Replace all existing interpreters with data from the uploaded CSV file.
              This will delete all current interpreter records first.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={importInterpreters} 
              disabled={isImportingInterpreters}
              variant="destructive"
              className="w-full"
            >
              {isImportingInterpreters ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing Interpreters...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import Interpreters (Replace All)
                </>
              )}
            </Button>
            
            {interpretersResult && (
              <div className={`flex items-start gap-2 p-3 rounded-md ${
                interpretersResult.success 
                  ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-200' 
                  : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-200'
              }`}>
                {interpretersResult.success ? (
                  <CheckCircle className="h-5 w-5 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 mt-0.5" />
                )}
                <span>{interpretersResult.message}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Import Facilities</CardTitle>
            <CardDescription>
              Replace all existing facilities with data from the uploaded CSV file.
              This will delete all current facility records first.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={importFacilities} 
              disabled={isImportingFacilities}
              variant="destructive"
              className="w-full"
            >
              {isImportingFacilities ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing Facilities...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import Facilities (Replace All)
                </>
              )}
            </Button>
            
            {facilitiesResult && (
              <div className={`flex items-start gap-2 p-3 rounded-md ${
                facilitiesResult.success 
                  ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-200' 
                  : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-200'
              }`}>
                {facilitiesResult.success ? (
                  <CheckCircle className="h-5 w-5 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 mt-0.5" />
                )}
                <span>{facilitiesResult.message}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
