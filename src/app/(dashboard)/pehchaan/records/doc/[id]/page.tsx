"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Link2, Bell, Edit3, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";
import { IdentityStore, calcSealStrength, IdentityDoc, ContactPoint, LinkMapping } from "@/lib/identityStore";
import { OnboardingStore } from "@/lib/onboardingStore";
import { SealStrengthRing } from "@/components/identity/SealStrengthRing";
import { FileUploader } from "@/components/vault/FileUploader";
import { validateControlledEmail, validateIndianMobile } from "@/lib/contactValidation";
import { Vault } from "@/lib/vault";
import { FileText, ExternalLink } from "lucide-react";

const VERIFICATION_OPTIONS = [
    { value: "not_verified", label: "Not Verified" },
    { value: "self", label: "Self" },
    { value: "govt", label: "Govt" },
    { value: "ca", label: "CA" },
    { value: "agent", label: "Agent" },
    { value: "family", label: "Family" },
];

export default function DocDetail() {
    const router = useRouter();
    const params = useParams();
    const docId = params.id as string;

    const [doc, setDoc] = useState<IdentityDoc | undefined>(undefined);
    const [contacts, setContacts] = useState<ContactPoint[]>([]);
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(true);

    const [formState, setFormState] = useState({
        docType: "",
        docNumber: "",
        nameOnDoc: "",
        dobOnDoc: "",
        expiryDate: "",
        issueDate: "",
        placeOfIssue: "",
        linkedMobileId: "",
        linkedEmailId: "",
        notes: "",
        verification: "not_verified",
        vaultFileId: ""
    });

    const [fileUrl, setFileUrl] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);

    const [newMobile, setNewMobile] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [saved, setSaved] = useState(false);
    const [contactError, setContactError] = useState("");
    const [dateError, setDateError] = useState("");
    const [dateWarning, setDateWarning] = useState("");
    const [acknowledgedDateWarning, setAcknowledgedDateWarning] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    useEffect(() => {
        const fetchDoc = async () => {
            try {
                const response = await fetch(`/api/identity/${docId}`);
                if (response.ok) {
                    const data = await response.json();
                    const apiDoc = data.data;
                    setDoc({
                        id: apiDoc.id,
                        docType: (apiDoc.idType?.toLowerCase() as any) || 'other',
                        docNumber: apiDoc.numberMasked || '',
                        normalizedDocNumber: apiDoc.numberMasked || '',
                        nameOnDoc: apiDoc.nameOnDoc || '',
                        expiryDate: apiDoc.expiryDate || undefined,
                        issueDate: apiDoc.issuedDate || undefined,
                        verificationStatus: 'not_verified',
                        storageMode: 'local',
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                        customDocName: undefined,
                        dobOnDoc: apiDoc.dobOnDoc ? apiDoc.dobOnDoc.split('T')[0] : undefined,
                        placeOfIssue: apiDoc.placeOfIssue || undefined,
                        linkedMobileId: undefined,
                        linkedEmailId: undefined,
                        notes: undefined,
                        vaultFileId: apiDoc.vaultFileId || undefined,
                    });
                    setContacts([]);
                    setFormState({
                        docType: apiDoc.idType || "",
                        docNumber: apiDoc.numberMasked || "",
                        nameOnDoc: apiDoc.nameOnDoc || "",
                        dobOnDoc: apiDoc.dobOnDoc ? apiDoc.dobOnDoc.split('T')[0] : "",
                        expiryDate: apiDoc.expiryDate ? apiDoc.expiryDate.split('T')[0] : "",
                        issueDate: apiDoc.issuedDate ? apiDoc.issuedDate.split('T')[0] : "",
                        placeOfIssue: apiDoc.placeOfIssue || "",
                        linkedMobileId: "",
                        linkedEmailId: "",
                        notes: "",
                        verification: 'not_verified',
                        vaultFileId: apiDoc.vaultFileId || ""
                    });
                } else {
                    console.error('Failed to fetch document:', response.status, response.statusText);
                    try {
                        const errorData = await response.json();
                        console.error('Error details:', errorData);
                    } catch (e) {
                        console.error('Could not parse error response');
                    }
                }
            } catch (error) {
                console.error('Error fetching document:', error);
            } finally {
                setLoading(false);
            }
        };
        
        fetchDoc();
    }, [docId]);

    useEffect(() => {
        if (formState.vaultFileId) {
            const fileId = formState.vaultFileId;
            
            // Detect if it's a Google Drive file ID (alphanumeric, length > 20, not starting with timestamp)
            const isGoogleDriveId = !fileId.startsWith('http') && fileId.length > 20 && !fileId.startsWith('opfs');
            
            if (isGoogleDriveId) {
                // Direct Google Drive file URL
                setFileUrl(`https://drive.google.com/file/d/${fileId}/view`);
                setFileName("Google Drive Document");
            } else {
                // Local OPFS file — use vault preview
                Vault.getPreviewUrl(fileId).then(setFileUrl);
                Vault.getFile(fileId).then(file => {
                    if (file) {
                        setFileName(file.name);
                    } else {
                        setFileName("Secure Document Scan");
                    }
                });
            }
        }
    }, [formState.vaultFileId]);

    const links: LinkMapping[] = [];

    if (loading) return null;
    if (!doc) return <div className="text-white p-10">Record not found.</div>;

    const strength = doc ? calcSealStrength(doc, links) : 0;
    const foundationDob = OnboardingStore.get().dob;

    const handleAddContact = (type: 'mobile' | 'email') => {
        const value = type === 'mobile' ? newMobile : newEmail;
        const result = type === 'mobile' ? validateIndianMobile(value) : validateControlledEmail(value);

        if (!result.valid) {
            setContactError(result.message || `Invalid format.`);
            return;
        }

        try {
            const cp = IdentityStore.addContact(type, result.normalized);
            setFormState(prev => ({ 
                ...prev, 
                [type === 'mobile' ? 'linkedMobileId' : 'linkedEmailId']: cp.id 
            }));
            type === 'mobile' ? setNewMobile("") : setNewEmail("");
            setContactError("");
            setContacts(IdentityStore.getContacts());
        } catch (e) {
            setContactError("Error adding contact.");
        }
    };

    const handleSave = async () => {
        let errorMsg = "";
        let warningMsg = "";
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (formState.issueDate) {
            const iDate = new Date(formState.issueDate);
            if (iDate > today) errorMsg = "Issue date is in the future.";
            else if (foundationDob && iDate < new Date(foundationDob)) errorMsg = "Issue date is before birth.";
        }

        if (formState.expiryDate && !errorMsg) {
            if (new Date(formState.expiryDate) < today) warningMsg = "Document is expired.";
        }

        if (errorMsg) { setDateError(errorMsg); return; }
        if (warningMsg && !acknowledgedDateWarning) {
            setDateWarning(warningMsg);
            setAcknowledgedDateWarning(true);
            return;
        }

        try {
            const response = await fetch(`/api/identity/${docId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    expiryDate: formState.expiryDate || null,
                    issuedDate: formState.issueDate || null,
                    placeOfIssue: formState.placeOfIssue || null,
                    dobOnDoc: formState.dobOnDoc || null,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.data) {
                    setDoc(prev => prev ? {
                        ...prev,
                        expiryDate: data.data.expiryDate,
                        issueDate: data.data.issuedDate,
                        dobOnDoc: data.data.dobOnDoc,
                        placeOfIssue: data.data.placeOfIssue,
                    } : prev);
                }
                setSaved(true);
                setEditing(false);
                setTimeout(() => setSaved(false), 3000);
            } else {
                console.error('Failed to update document:', response.status, response.statusText);
                try {
                    const errorData = await response.json();
                    console.error('Error response:', errorData);
                } catch (e) {
                    console.error('Could not parse error response');
                }
            }
        } catch (error) {
            console.error('Error updating document:', error);
        }
    };

    return (
        <div className="flex flex-col min-h-screen p-6 pb-24 relative bg-slate-950">
            <div className="relative z-10">
                <header className="flex items-center gap-3 pt-8 mb-6">
                    <button onClick={() => router.back()} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                        <ArrowLeft className="w-5 h-5 text-white/60" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-lg font-bold text-white">{doc.customDocName || (doc.docType?.toUpperCase() || 'DOCUMENT')}</h1>
                    </div>
                    <SealStrengthRing percentage={strength} size={52} label="Seal" />
                </header>

                {/* <div className="grid grid-cols-3 gap-3 mb-8">
                    <ActionButton icon={<Link2 />} label="Link" onClick={() => {}} />
                    <ActionButton icon={<Bell />} label="Remind" onClick={() => {}} />
                    <div className="col-start-3">
                        <ActionButton icon={<Edit3 />} label={editing ? "Cancel" : "Edit"} onClick={() => setEditing(!editing)} active={editing} />
                    </div>
                </div> */}

                <div className="space-y-6">
                    <section className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <DisplayField label="Name on Document" value={formState.nameOnDoc} />
                        </div>
                        <DisplayField label="Document Type" value={formState.docType} />
                        <DisplayField label="Document Number" value={formState.docNumber ? `• ${formState.docNumber}` : null} />
                        <DisplayField label="DOB on Doc" value={formatDate(formState.dobOnDoc)} />
                        <DisplayField label="Expiry" value={formatDate(formState.expiryDate)} />
                        <DisplayField label="Issue Date" value={formatDate(formState.issueDate)} />
                        <DisplayField label="Place of Issue" value={formState.placeOfIssue} />
                    </section>

                    <section className="space-y-4">
                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em]">Attached Document</label>
                        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <FileText className="w-5 h-5 text-amber-400 shrink-0" />
                                {formState.vaultFileId ? (
                                    <span className="text-sm text-white/70 truncate">{fileName || "Loading..."}</span>
                                ) : (
                                    <span className="text-sm text-white/40 italic">No file attached</span>
                                )}
                            </div>
                            {fileUrl && (
                                <a 
                                    href={fileUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-amber-400 text-xs font-bold shrink-0 ml-4"
                                >
                                    VIEW <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                            )}
                        </div>
                    </section>

                    {/* <ContactSelect 
                        label="Linked Mobile" 
                        value={formState.linkedMobileId} 
                        options={contacts.filter(c => c.type === "mobile")} 
                        editing={editing}
                        newValue={newMobile}
                        onNewValueChange={(v: string) => setNewMobile(v)}
                        onAdd={() => handleAddContact('mobile')}
                        onSelect={(v: string) => setFormState(s => ({...s, linkedMobileId: v}))}
                    />

                    <ContactSelect 
                        label="Linked Email" 
                        value={formState.linkedEmailId} 
                        options={contacts.filter(c => c.type === "email")} 
                        editing={editing}
                        newValue={newEmail}
                        onNewValueChange={(v: string) => setNewEmail(v)}
                        onAdd={() => handleAddContact('email')}
                        onSelect={(v: string) => setFormState(s => ({...s, linkedEmailId: v}))}
                    /> */}
                </div>
            </div>
        </div>
    );
}

const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    return `${day}-${month}-${year}`;
};

function DisplayField({ label, value }: { label: string; value: string | undefined | null }) {
    return (
        <div className="space-y-1">
            <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.1em]">{label}</label>
            <div className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/80 min-h-[44px] flex items-center">
                {value || <span className="text-white/20 italic text-[11px]">Not provided</span>}
            </div>
        </div>
    );
}

interface ActionBtnProps { icon: React.ReactNode; label: string; onClick: () => void; active?: boolean; }
function ActionButton({ icon, label, onClick, active }: ActionBtnProps) {
    return (
        <button onClick={onClick} className={`flex flex-col items-center gap-2 p-3 rounded-2xl border ${active ? 'border-amber-400 bg-amber-400/10' : 'border-white/10'}`}>
            <span className={active ? 'text-amber-400' : 'text-white/40'}>{icon}</span>
            <span className="text-[10px] font-bold text-white/40">{label}</span>
        </button>
    );
}

interface ContactProps { 
    label: string; 
    value: string; 
    options: ContactPoint[]; 
    editing: boolean; 
    newValue: string; 
    onNewValueChange: (v: string) => void; 
    onAdd: () => void; 
    onSelect: (v: string) => void; 
}
function ContactSelect({ label, value, options, editing, newValue, onNewValueChange, onAdd, onSelect }: ContactProps) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-bold text-white/30 uppercase">{label}</label>
            <select 
                value={value} 
                onChange={e => onSelect(e.target.value)} 
                disabled={!editing}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-sm text-white disabled:opacity-50"
            >
                <option value="">Select...</option>
                {options.map(c => <option key={c.id} value={c.id}>{c.value}</option>)}
            </select>
            {editing && (
                <div className="flex gap-2">
                    <input 
                        value={newValue} 
                        onChange={e => onNewValueChange(e.target.value)} 
                        placeholder="Add new..."
                        className="flex-1 bg-transparent border-b border-white/10 text-xs text-white placeholder-white/30"
                    />
                    <button onClick={onAdd} className="text-amber-400 text-[10px] font-bold">LINK</button>
                </div>
            )}
        </div>
    );
}