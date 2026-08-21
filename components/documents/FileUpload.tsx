"use client";

import { useState, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { toast } from "sonner";
import { auth, db, storage } from "@/lib/firebase/client";
import { UploadCloud, FileUp, Loader2, XCircle } from "lucide-react";

interface FileUploadProps {
  /** Module the file belongs to — e.g. "employee", "project", "expense" */
  relatedModule?: string;
  /** Related record ID */
  relatedId?: string;
  /** Optional callback after successful upload */
  onUploaded?: () => void;
}

const MAX_SIZE_MB = 10;

export default function FileUpload({ relatedModule, relatedId, onUploaded }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`File too large. Max size is ${MAX_SIZE_MB}MB.`);
      setFile(null);
      return;
    }

    setFile(selected);
  }

  async function handleUpload() {
    if (!file) return;

    const user = auth.currentUser;
    if (!user) {
      toast.error("You must be signed in to upload files.");
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `documents/${user.uid}/${timestamp}-${safeName}`;
      const storageRef = ref(storage, storagePath);

      const uploadTask = uploadBytesResumable(storageRef, file);

      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snap) => {
            const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
            setProgress(pct);
          },
          (err) => reject(err),
          () => resolve()
        );
      });

      const downloadURL = await getDownloadURL(storageRef);

      await addDoc(collection(db, "documents"), {
        name: file.name,
        fileName: `${timestamp}-${safeName}`,
        storagePath,
        downloadURL,
        mimeType: file.type,
        size: file.size,
        uploadedBy: user.uid,
        uploadedByName: user.displayName || user.email || "Unknown",
        relatedModule: relatedModule || null,
        relatedId: relatedId || null,
        created_at: serverTimestamp(),
      });

      toast.success("File uploaded successfully");
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      onUploaded?.();
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <input
            ref={inputRef}
            type="file"
            onChange={handleSelect}
            disabled={uploading}
            className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-700 hover:file:bg-zinc-200 dark:text-zinc-400 dark:file:bg-zinc-800 dark:file:text-zinc-200 dark:hover:file:bg-zinc-700"
          />
        </div>
        <button
          type="button"
          onClick={handleUpload}
          disabled={!file || uploading}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-950"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> {progress}%
            </>
          ) : (
            <>
              <UploadCloud className="h-4 w-4" /> Upload
            </>
          )}
        </button>
      </div>

      {file && !uploading && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-900">
          <FileUp className="h-4 w-4 text-zinc-400" />
          <span className="flex-1 truncate text-zinc-700 dark:text-zinc-300">{file.name}</span>
          <button
            type="button"
            onClick={() => {
              setFile(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            aria-label="Remove file"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}