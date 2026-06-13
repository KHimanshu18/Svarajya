import { openDB, DBSchema, IDBPDatabase } from "idb";

export type VaultFolder =
    | "profile"
    | "family"
    | "education"
    | "insurance"
    | "identity"
    | "loans"
    | "property"
    | "tax"
    | "will"
    | "other";

export interface VaultFile {
    id: string;
    vaultFileId?: string; // Reference to the secure OPFS Blob URL id
    folder: VaultFolder;
    name: string;
    type: string; // MIME type
    size: number; // bytes
    createdAt: number; // timestamp
    tags?: string[]; // e.g. family member name
    notes?: string; // custom notes
    cloudId?: string; // Reference to Google Drive or Supabase file ID
    storageType?: 'local' | 'googledrive' | 'supabase'; // primary storage type
    linkedFamilyMemberId?: string; // Associated family member's unique database ID
}

interface KallyaniiDB extends DBSchema {
    vault: {
        key: string;
        value: VaultFile;
        indexes: { "by-folder": string };
    };
}

const DB_NAME = "kallyanii-vault";
const DB_VERSION = 1;

let _db: IDBPDatabase<KallyaniiDB> | null = null;

async function getDB() {
    if (_db) return _db;
    _db = await openDB<KallyaniiDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
            const store = db.createObjectStore("vault", { keyPath: "id" });
            store.createIndex("by-folder", "folder");
        },
    });
    return _db;
}

export const Vault = {
    /** Save a file to OPFS, record metadata to IndexedDB. Returns localId and optional cloudId. */
    async saveFile(
        folder: VaultFolder,
        file: File,
        tags?: string[],
        backupToCloud: boolean = true,
        linkedFamilyMemberId?: string,
        familyMemberName?: string
    ): Promise<{ localId: string; cloudId?: string }> {
        const { LocalVaultEngine } = await import("./localVaultEngine");
        
        const db = await getDB();
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // 1. Physically store the file in origin-private file system sandbox
        const vaultFileId = await LocalVaultEngine.storeDocument(file, folder);

        // 2. Write the metadata mapping into IndexedDB
        const record: VaultFile = {
            id,
            vaultFileId,
            folder,
            name: file.name,
            type: file.type,
            size: file.size,
            createdAt: Date.now(),
            tags,
            linkedFamilyMemberId,
        };
        await db.put("vault", record);

        let uploadedCloudId: string | undefined;

        // 3. Optionally backup to Google Drive
        if (backupToCloud) {
            try {
                const form = new FormData();
                form.append('file', file);
                form.append('fileName', file.name);
                form.append('folderName', 'Svarajya_Nidhi');
                
                if (familyMemberName) {
                    form.append('familyMemberName', familyMemberName);
                } else {
                    form.append('familyMemberName', 'Myself');
                }

                // Map folder to category name
                let category = 'Other';
                if (folder === 'identity') category = 'Identity';
                else if (folder === 'insurance') category = 'Insurance';
                else if (folder === 'loans') category = 'Loans';
                else if (folder === 'education') category = 'Education';
                else if (folder === 'property') category = 'Property';
                else if (folder === 'family') category = 'Family';
                else if (folder === 'profile') category = 'Profile';
                else if (folder === 'tax') category = 'Tax';
                else if (folder === 'will') category = 'Will';
                form.append('category', category);

                const uploadRes = await fetch('/api/google-drive/upload', {
                    method: 'POST',
                    body: form,
                });
                const uploadJson = await uploadRes.json();
                if (uploadRes.ok && uploadJson.success && uploadJson.data?.fileId) {
                    uploadedCloudId = uploadJson.data.fileId;
                    await Vault.updateFile(id, { 
                        cloudId: uploadedCloudId, 
                        storageType: 'googledrive' 
                    });
                }
            } catch (err) {
                console.error("Cloud backup failed during save:", err);
                alert("Cloud upload failed. Check console.");
            }
        }

        return { localId: id, cloudId: uploadedCloudId };
    },

    /** Get all files in a folder. */
    async getFiles(folder: VaultFolder): Promise<VaultFile[]> {
        const db = await getDB();
        return db.getAllFromIndex("vault", "by-folder", folder);
    },

    /** Get a single file by ID. */
    async getFile(id: string): Promise<VaultFile | undefined> {
        const db = await getDB();
        return db.get("vault", id);
    },

    /** Get all files across all folders. */
    async getAllFiles(): Promise<VaultFile[]> {
        const db = await getDB();
        return db.getAll("vault");
    },

    /** Manually backup an existing local file to Google Drive. */
    async backupToDrive(id: string): Promise<boolean> {
        const fileRecord = await Vault.getFile(id);
        if (!fileRecord || !fileRecord.vaultFileId) return false;
        
        try {
            const { LocalVaultEngine } = await import("./localVaultEngine");
            const file = await LocalVaultEngine.getDocumentFile(fileRecord.vaultFileId, fileRecord.name, fileRecord.type);
            if (!file) return false;

            const form = new FormData();
            form.append('file', file);
            form.append('fileName', file.name);
            form.append('folderName', 'Svarajya_Nidhi');

            const uploadRes = await fetch('/api/google-drive/upload', {
                method: 'POST',
                body: form,
            });
            const uploadJson = await uploadRes.json();

            if (uploadRes.ok && uploadJson.success && uploadJson.data?.fileId) {
                await Vault.updateFile(id, { 
                    cloudId: uploadJson.data.fileId, 
                    storageType: 'googledrive' 
                });
                return true;
            }
        } catch (err) {
            console.error("Manual cloud backup failed:", err);
        }
        return false;
    },

    /** Delete a file by its ID within metadata mapping AND OPFS physical filesystem. */
    async deleteFile(id: string): Promise<void> {
        const db = await getDB();
        const file = await db.get("vault", id);
        if (file && file.vaultFileId) {
            const { LocalVaultEngine } = await import("./localVaultEngine");
            await LocalVaultEngine.deleteDocument(file.vaultFileId);
        }
        await db.delete("vault", id);
    },

    /** Update a file metadata (name, notes). */
    async updateFile(id: string, updates: Partial<Pick<VaultFile, "name" | "notes" | "tags" | "cloudId" | "storageType">>): Promise<void> {
        const db = await getDB();
        const file = await db.get("vault", id);
        if (!file) return;
        await db.put("vault", { ...file, ...updates });
    },

    /** Get total size (in KB) for a given folder. */
    async getFolderSizeKB(folder: VaultFolder): Promise<number> {
        const files = await Vault.getFiles(folder);
        const bytes = files.reduce((sum, f) => sum + f.size, 0);
        return Math.round(bytes / 1024);
    },

    /** Get file count per folder as a map. */
    async getFolderCounts(): Promise<Record<VaultFolder, number>> {
        const all = await Vault.getAllFiles();
        const counts: Record<string, number> = {};
        for (const f of all) {
            counts[f.folder] = (counts[f.folder] || 0) + 1;
        }
        return counts as Record<VaultFolder, number>;
    },

    /** Generate a data URL for previewing image blobs or return remote URL directly. */
    async getPreviewUrl(id: string): Promise<string | null> {
        if (!id) return null;
        if (id.startsWith("http")) return id;
        if (id.startsWith("opfs")) {
            const { LocalVaultEngine } = await import("./localVaultEngine");
            return await LocalVaultEngine.getDocumentBlobUrl(id);
        }
        // Look up our metadata record for this id
        const db = await getDB();
        const file = await db.get("vault", id);

        // If a cloud copy exists, prefer its web view link for cross-device preview
        if (file && file.cloudId) {
            try {
                const res = await fetch(`/api/google-drive/download?fileId=${file.cloudId}`);
                const data = await res.json();
                if (res.ok && data?.success) return data.data.webViewLink || data.data.webContentLink || null;
            } catch (e) {
                // fall through to local preview on error
            }
        }

        // If we have an OPFS-local blob id, return its blob URL
        if (file && file.vaultFileId) {
            const { LocalVaultEngine } = await import("./localVaultEngine");
            return await LocalVaultEngine.getDocumentBlobUrl(file.vaultFileId);
        }

        // As a last resort, treat the incoming id as a direct cloud file id (older behaviour)
        if (id.length > 20) {
            try {
                const res = await fetch(`/api/google-drive/download?fileId=${id}`);
                const data = await res.json();
                return res.ok && data?.success ? data.data.webViewLink || data.data.webContentLink : null;
            } catch (e) {
                return null;
            }
        }

        return null;
    },
};
