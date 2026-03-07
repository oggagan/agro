import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, Trash2, FileText, Download } from "lucide-react";
import { useUploadDocuments, useDeleteDocument } from "@/hooks/useManufacturers";
import { manufacturersApi } from "@/api/manufacturers.api";
import type { ManufacturerDocument } from "@/types/manufacturer";

const DOC_TYPES: { value: string; label: string }[] = [
  { value: "license", label: "Company License" },
  { value: "gst", label: "GST Certificate" },
  { value: "udyog_aadhaar", label: "Udyog Aadhaar" },
  { value: "pan_front", label: "PAN Card" },
  { value: "aadhaar_front", label: "Aadhaar Front" },
  { value: "aadhaar_back", label: "Aadhaar Back" },
  { value: "govt_registration", label: "Govt Registration Certificate" },
  { value: "declaration", label: "Declaration Document" },
  { value: "cancelled_cheque", label: "Cancelled Cheque" },
];

function docTypeLabel(docType: string): string {
  return DOC_TYPES.find((d) => d.value === docType)?.label || docType;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface DocumentsSectionProps {
  manufacturerId: string;
  documents: ManufacturerDocument[];
}

export default function DocumentsSection({ manufacturerId, documents }: DocumentsSectionProps) {
  const uploadMutation = useUploadDocuments();
  const deleteMutation = useDeleteDocument();

  const [docType, setDocType] = useState("license");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = () => {
    if (selectedFiles.length === 0) return;
    uploadMutation.mutate(
      { mfgId: manufacturerId, files: selectedFiles, docType },
      {
        onSuccess: () => {
          setSelectedFiles([]);
          if (fileInputRef.current) fileInputRef.current.value = "";
        },
      },
    );
  };

  const handleDelete = (docId: string) => {
    deleteMutation.mutate({ mfgId: manufacturerId, docId });
  };

  const grouped = documents.reduce<Record<string, ManufacturerDocument[]>>((acc, doc) => {
    const key = doc.docType;
    if (!acc[key]) acc[key] = [];
    acc[key].push(doc);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
          <h4 className="text-sm font-medium">Upload New Document</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Document Type *</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((dt) => (
                    <SelectItem key={dt.value} value={dt.value}>
                      {dt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Files *</Label>
              <Input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
              />
            </div>
          </div>
          {selectedFiles.length > 0 && (
            <div className="text-xs text-muted-foreground">
              {selectedFiles.length} file(s) selected: {selectedFiles.map((f) => f.name).join(", ")}
            </div>
          )}
          <Button
            size="sm"
            onClick={handleUpload}
            disabled={uploadMutation.isPending || selectedFiles.length === 0}
          >
            {uploadMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Upload className="h-3 w-3 mr-1" />
            )}
            Upload
          </Button>
        </div>

        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No documents uploaded yet</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([type, docs]) => (
              <div key={type} className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">{docTypeLabel(type)}</h4>
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between border rounded-md px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm truncate">{doc.fileName}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(doc.fileSize)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        asChild
                      >
                        <a
                          href={manufacturersApi.getDocumentUrl(doc.filePath)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download className="h-3 w-3" />
                        </a>
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleDelete(doc.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
