/**
 * Origin Private File System (OPFS) Local Vault Engine
 * 
 * This engine intercepts sensitive user files (Aadhaar, PAN, Passports)
 * and writes them directly into the Chrome/Safari secure browser sandbox.
 * These files NEVER touch the cloud/backend. They exist solely within the
 * local OPFS directory structure: `Svarajya/Nidhi/[filename]`.
 */

const NIDHI_DIR_NAME = "Svarajya_Nidhi";

export const LocalVaultEngine = {
    /**
     * Initializes the OPFS directory for the Vault.
     */
    async initVaultDir(): Promise<FileSystemDirectoryHandle | null> {
        try {
            const root = await navigator.storage.getDirectory();
            const vaultDir = await root.getDirectoryHandle(NIDHI_DIR_NAME, { create: true });
            return vaultDir;
        } catch (err) {
            console.error("OPFS Initialization Failed:", err);
            return null;
        }
    },

    /**
     * Writes a given File or Blob to the local OPFS Vault.
     * Generates a unique secure filename based on timestamp to avoid accidental overwrites.
     * 
     * @returns The generated `vaultFileId` string (e.g., "opfs://1709404040-aadhaar.pdf")
     */
    async storeDocument(file: File, prefix: string = "doc"): Promise<string> {
        const vaultDir = await this.initVaultDir();
        if (!vaultDir) throw new Error("Could not access local secure storage.");

        // Clean filename, append timestamp to guarantee uniqueness
        const safeName = file.name.replace(/[^a-zA-Z0-9.\-]/g, "_");
        const uniqueName = `${Date.now()}-${prefix}-${safeName}`;

        const fileHandle = await vaultDir.getFileHandle(uniqueName, { create: true });
        
        // Use FileSystemWritableFileStream to write the blob data securely
        const writable = await fileHandle.createWritable();
        await writable.write(file);
        await writable.close();

        return `opfs://${uniqueName}`;
    },

    /**
     * Retrieves an ephemeral Blob URL for viewing/rendering a document stored in OPFS.
     * IMPORTANT: Blob URLs must be revoked using URL.revokeObjectURL() when unmounted
     * to prevent memory leaks in the browser.
     */
    async getDocumentBlobUrl(vaultFileId: string): Promise<string | null> {
        if (!vaultFileId.startsWith("opfs://")) return null;
        
        const fileName = vaultFileId.replace("opfs://", "");
        const vaultDir = await this.initVaultDir();
        if (!vaultDir) return null;

        try {
            const fileHandle = await vaultDir.getFileHandle(fileName);
            const file = await fileHandle.getFile();
            return URL.createObjectURL(file);
        } catch (err) {
            console.error(`Failed to locate OPFS file: ${fileName}`, err);
            return null;
        }
    },

    /**
     * Retrieves the actual File object stored in OPFS.
     */
    async getDocumentFile(vaultFileId: string, name: string, type: string): Promise<File | null> {
        if (!vaultFileId.startsWith("opfs://")) return null;
        
        const fileName = vaultFileId.replace("opfs://", "");
        const vaultDir = await this.initVaultDir();
        if (!vaultDir) return null;

        try {
            const fileHandle = await vaultDir.getFileHandle(fileName);
            const file = await fileHandle.getFile();
            // Create a new File object to override name and type
            return new File([file], name, { type });
        } catch (err) {
            console.error(`Failed to locate OPFS file: ${fileName}`, err);
            return null;
        }
    },

    /**
     * Deletes a document from the local OPFS Vault.
     */
    async deleteDocument(vaultFileId: string): Promise<boolean> {
        if (!vaultFileId.startsWith("opfs://")) return false;
        
        const fileName = vaultFileId.replace("opfs://", "");
        const vaultDir = await this.initVaultDir();
        if (!vaultDir) return false;

        try {
            await vaultDir.removeEntry(fileName);
            return true;
        } catch (err) {
            console.error(`Failed to delete OPFS file: ${fileName}`, err);
            return false;
        }
    }
};
