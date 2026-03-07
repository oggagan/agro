import InlineDocUploadShared, { type InlineDocItem } from "@/components/shared/InlineDocUpload";
import { manufacturersApi } from "@/api/manufacturers.api";
import type { ManufacturerDocument } from "@/types/manufacturer";

interface InlineDocUploadProps {
  label: string;
  documents: ManufacturerDocument[];
  onUpload: (files: File[]) => void;
  onDelete: (docId: string) => void;
  uploading?: boolean;
  deleting?: boolean;
  accept?: string;
  multiple?: boolean;
  getDocumentUrl?: (filePath: string) => string;
}

export default function InlineDocUpload(props: InlineDocUploadProps) {
  const { documents, getDocumentUrl = manufacturersApi.getDocumentUrl, ...rest } = props;
  return (
    <InlineDocUploadShared
      documents={documents as InlineDocItem[]}
      getDocumentUrl={getDocumentUrl}
      {...rest}
    />
  );
}
