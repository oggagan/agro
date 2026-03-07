import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, FileText, Download, X } from "lucide-react";

export interface InlineDocItem {
  id: string;
  fileName: string;
  filePath: string;
}

interface InlineDocUploadProps {
  label: string;
  documents: InlineDocItem[];
  onUpload: (files: File[]) => void;
  onDelete: (docId: string) => void;
  getDocumentUrl: (filePath: string) => string;
  uploading?: boolean;
  deleting?: boolean;
  accept?: string;
  multiple?: boolean;
}

export default function InlineDocUpload({
  label,
  documents,
  onUpload,
  onDelete,
  getDocumentUrl,
  uploading = false,
  deleting = false,
  accept = ".pdf,.jpg,.jpeg,.png",
  multiple = false,
}: InlineDocUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(Array.from(e.target.files));
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">{label}</Label>

      {documents.length > 0 && (
        <div className="space-y-1">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm bg-muted/30"
            >
              <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate max-w-[180px]">{doc.fileName}</span>
              <div className="ml-auto flex items-center gap-0.5 shrink-0">
                <Button size="icon" variant="ghost" className="h-6 w-6" asChild>
                  <a
                    href={getDocumentUrl(doc.filePath)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="h-3 w-3" />
                  </a>
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-destructive"
                  onClick={() => onDelete(doc.id)}
                  disabled={deleting}
                >
                  {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="relative">
        <Input
          ref={fileRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileChange}
          className="hidden"
          id={`upload-${label.replace(/\s+/g, "-").toLowerCase()}`}
          disabled={uploading}
        />
        <label
          htmlFor={`upload-${label.replace(/\s+/g, "-").toLowerCase()}`}
          className={`flex items-center justify-center gap-2 px-3 py-2 text-xs border border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition-colors ${
            uploading ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          {uploading ? "Uploading..." : `Upload ${label}`}
        </label>
      </div>
    </div>
  );
}
