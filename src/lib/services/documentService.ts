import { openDB, DBSchema, IDBPDatabase } from "idb";

export type VaultFolder =
    | "profile"
    | "family"
    | "education"
    | "insurance"
    | "identity"
    | "loans"
    | "property"
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
    /** Save a file to OPFS, record metadata to IndexedDB. Returns the new file's ID. */
    async saveFile(folder: VaultFolder, file: File, tags?: string[], linkedFamilyMemberId?: string): Promise<string> {
        const { LocalVaultEngine } = await import("@/lib/engines/localVaultEngine");
        
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
        return id;
    },

    /** Get all files in a folder. */
    async getFiles(folder: VaultFolder): Promise<VaultFile[]> {
        const db = await getDB();
        return db.getAllFromIndex("vault", "by-folder", folder);
    },

    /** Get all files across all folders. */
    async getAllFiles(): Promise<VaultFile[]> {
        const db = await getDB();
        return db.getAll("vault");
    },

    /** Delete a file by its ID within metadata mapping AND OPFS physical filesystem. */
    async deleteFile(id: string): Promise<void> {
        const db = await getDB();
        const file = await db.get("vault", id);
        if (file && file.vaultFileId) {
            const { LocalVaultEngine } = await import("@/lib/engines/localVaultEngine");
            await LocalVaultEngine.deleteDocument(file.vaultFileId);
        }
        await db.delete("vault", id);
    },

    /** Update a file metadata (name, notes). */
    async updateFile(id: string, updates: Partial<Pick<VaultFile, "name" | "notes" | "tags">>): Promise<void> {
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

    /** Generate a data URL for previewing image blobs. */
    async getPreviewUrl(id: string): Promise<string | null> {
        const db = await getDB();
        const file = await db.get("vault", id);
        if (!file || !file.vaultFileId) return null;
        
        const { LocalVaultEngine } = await import("@/lib/engines/localVaultEngine");
        return await LocalVaultEngine.getDocumentBlobUrl(file.vaultFileId);
    },
};
