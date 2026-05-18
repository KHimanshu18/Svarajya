"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
    ArrowLeft, 
    Pencil, 
    Trash2, 
    Calendar, 
    CreditCard, 
    TrendingUp, 
    X, 
    Check, 
    Info, 
    Search, 
    Filter, 
    Clock, 
    Smartphone, 
    Wallet, 
    Landmark, 
    CircleDollarSign,
    Loader2,
    PieChart,
    AlertCircle
} from "lucide-react";
import { 
    ExpenseStore, 
    ExpenseEntry, 
    ExpenseCategoryDef, 
    PAYMENT_MODES, 
    PaymentMode, 
    ExpenseFrequency, 
    formatRupee 
} from "@/lib/expenseStore";
import { useToast } from "@/components/providers/ToastProvider";

export default function VyayaAnalyticsPage() {
    const router = useRouter();
    const toast = useToast();

    // Data State
    const [loading, setLoading] = useState(true);
    const [entries, setEntries] = useState<ExpenseEntry[]>([]);
    const [categories, setCategories] = useState<ExpenseCategoryDef[]>([]);
    const [breakdown, setBreakdown] = useState<any[]>([]);

    // Search and Filter State
    const [searchQuery, setSearchQuery] = useState("");
    const [filterCategory, setFilterCategory] = useState("");
    const [filterMode, setFilterMode] = useState("");

    // Modal Edit State
    const [editEntry, setEditEntry] = useState<ExpenseEntry | null>(null);
    const [editDate, setEditDate] = useState("");
    const [editAmount, setEditAmount] = useState("");
    const [editCategory, setEditCategory] = useState("");
    const [editMode, setEditMode] = useState<PaymentMode>("UPI");
    const [editRecurring, setEditRecurring] = useState(false);
    const [editFrequency, setEditFrequency] = useState<ExpenseFrequency>("MONTHLY");
    const [editDescription, setEditDescription] = useState("");
    const [editCategorySearch, setEditCategorySearch] = useState("");

    // Modal Delete State
    const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);

    // Refresh Local State from Store
    const refreshData = () => {
        setEntries(ExpenseStore.getEntries());
        setCategories(ExpenseStore.getCategories());
        setBreakdown(ExpenseStore.getCategoryBreakdown());
    };

    // Hydrate Store on Mount
    useEffect(() => {
        ExpenseStore.hydrate().then(() => {
            refreshData();
            setLoading(false);
        });
    }, []);

    // Filter Logic
    const filteredEntries = entries.filter(e => {
        const matchesSearch = searchQuery.trim() === "" || 
            (e.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (ExpenseStore.getCategory(e.category)?.name || "").toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesCategory = filterCategory === "" || e.category === filterCategory;
        const matchesMode = filterMode === "" || e.mode === filterMode;

        return matchesSearch && matchesCategory && matchesMode;
    });

    // Helper: Start editing an entry
    const startEdit = (entry: ExpenseEntry) => {
        setEditEntry(entry);
        setEditDate(entry.date);
        setEditAmount(entry.amount.toString());
        setEditCategory(entry.category);
        setEditMode(entry.mode);
        setEditRecurring(entry.recurring);
        setEditFrequency(entry.frequency || "MONTHLY");
        setEditDescription(entry.description || "");
        setEditCategorySearch("");
    };

    // Helper: Save the updated entry
    const handleUpdate = async () => {
        if (!editEntry) return;
        const amt = parseFloat(editAmount);
        if (isNaN(amt) || amt <= 0) {
            toast("Amount must be greater than 0.", "error");
            return;
        }

        try {
            const success = ExpenseStore.updateEntry(editEntry.id, {
                date: editDate,
                amount: amt,
                category: editCategory || "other",
                mode: editMode,
                recurring: editRecurring,
                frequency: editRecurring ? editFrequency : undefined,
                description: editDescription.trim() || undefined,
            });

            if (success) {
                toast("Expense updated successfully!", "success");
                refreshData();
                setEditEntry(null);
            } else {
                toast("Failed to update expense.", "error");
            }
        } catch (err) {
            toast("An error occurred during update.", "error");
        }
    };

    // Helper: Delete entry
    const handleDelete = async () => {
        if (!deleteEntryId) return;
        try {
            const success = ExpenseStore.deleteEntry(deleteEntryId);
            if (success) {
                toast("Expense record removed.", "success");
                refreshData();
                setDeleteEntryId(null);
            } else {
                toast("Failed to delete expense.", "error");
            }
        } catch (err) {
            toast("An error occurred during deletion.", "error");
        }
    };

    // Metrics Calculations
    const totalRecordedSpent = filteredEntries.reduce((sum, e) => sum + e.amount, 0);
    const monthlyTotalSpent = ExpenseStore.getMonthlyTotal();
    const expenseRatio = ExpenseStore.getExpenseToIncomeRatio();
    
    // Category chips for edit modal search
    const filteredModalCategories = editCategorySearch
        ? categories.filter(c => c.active && c.name.toLowerCase().includes(editCategorySearch.toLowerCase()))
        : categories.filter(c => c.active);

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--color-rajya-bg)] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen p-6 pb-24 relative bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 selection:bg-amber-500/30">
            <div className="relative z-10 max-w-6xl mx-auto w-full">
                
                {/* Header */}
                <header className="pt-8 mb-8 flex items-center gap-3">
                    <button 
                        onClick={() => router.push("/vyaya")} 
                        className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center shrink-0 hover:bg-white/10 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 text-white/60" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-amber-300 to-orange-300 bg-clip-text text-transparent">
                            Vyaya Analytics
                        </h1>
                        <p className="text-xs text-white/35 mt-0.5">Explore your kingdom&apos;s expenditures. Spot structural leaks.</p>
                    </div>
                </header>

                {/* Dashboard Metrics */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <CircleDollarSign className="w-16 h-16 text-white" />
                        </div>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">Total Recorded Spent</p>
                        <h3 className="text-2xl font-bold text-white tracking-tight">{formatRupee(totalRecordedSpent)}</h3>
                        <p className="text-[10px] text-white/30 mt-1">Sum of currently filtered entries</p>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <Clock className="w-16 h-16 text-white" />
                        </div>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">Current Month Spend</p>
                        <h3 className="text-2xl font-bold text-amber-400 tracking-tight">{formatRupee(monthlyTotalSpent)}</h3>
                        <p className="text-[10px] text-white/30 mt-1">Includes active recurring spends</p>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <TrendingUp className="w-16 h-16 text-white" />
                        </div>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">Expense to Income Ratio</p>
                        {expenseRatio ? (
                            <>
                                <h3 className="text-2xl font-bold text-white tracking-tight">
                                    {expenseRatio.ratio}%
                                    <span className={`text-[10px] ml-2 px-1.5 py-0.5 rounded uppercase font-bold tracking-widest border ${
                                        expenseRatio.color === 'red' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                        expenseRatio.color === 'amber' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                        'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    }`}>
                                        {expenseRatio.label}
                                    </span>
                                </h3>
                                <p className="text-[10px] text-white/30 mt-1">Relative to monthly net income</p>
                            </>
                        ) : (
                            <>
                                <h3 className="text-sm font-bold text-white/40 tracking-tight mt-1">Income not recorded</h3>
                                <p className="text-[10px] text-amber-400/60 mt-1 underline cursor-pointer" onClick={() => router.push("/kosh")}>
                                    Set income in Kosh
                                </p>
                            </>
                        )}
                    </div>
                </section>

                {/* Main Two-Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* LEFT COLUMN: Analytics & Breakdown */}
                    <div className="space-y-6">
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 relative overflow-hidden">
                            <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-[60px] pointer-events-none" />
                            
                            <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                                <PieChart className="w-4 h-4 text-amber-400" />
                                Category Breakdown
                            </h3>

                            {breakdown.length === 0 ? (
                                <div className="text-center py-8 text-white/35 text-xs">
                                    No spends recorded to analyze yet.
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    {breakdown.map(item => (
                                        <div key={item.categoryId} className="space-y-2">
                                            <div className="flex justify-between items-center text-xs text-white/60">
                                                <span className="flex items-center gap-1.5 font-medium text-white/80">
                                                    <span className="text-sm shrink-0">{item.emoji}</span>
                                                    <span>{item.name}</span>
                                                </span>
                                                <span className="font-semibold text-white/90">
                                                    {formatRupee(item.amount)} <span className="text-[10px] text-white/40 font-normal">({item.percentage}%)</span>
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.3)] transition-all duration-1000" 
                                                    style={{ width: `${item.percentage}%` }} 
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Ledger List & Filters */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* Filters Panel */}
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                            <div className="flex flex-col md:flex-row gap-3">
                                {/* Search */}
                                <div className="relative flex-1">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                    <input 
                                        type="text" 
                                        placeholder="Search ledger entries..." 
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3.5 text-sm text-white focus:outline-none focus:border-amber-500/50 placeholder-white/20 transition-all"
                                    />
                                </div>

                                {/* Filters Dropdowns */}
                                <div className="flex gap-2">
                                    {/* Category Filter */}
                                    <div className="relative">
                                        <select
                                            value={filterCategory}
                                            onChange={e => setFilterCategory(e.target.value)}
                                            className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-xs text-white/80 focus:outline-none appearance-none cursor-pointer pr-8"
                                        >
                                            <option value="" className="bg-slate-900 text-white">All Categories</option>
                                            {categories.map(c => (
                                                <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                                                    {c.emoji} {c.name}
                                                </option>
                                            ))}
                                        </select>
                                        <Filter className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 pointer-events-none" />
                                    </div>

                                    {/* Mode Filter */}
                                    <div className="relative">
                                        <select
                                            value={filterMode}
                                            onChange={e => setFilterMode(e.target.value)}
                                            className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-xs text-white/80 focus:outline-none appearance-none cursor-pointer pr-8"
                                        >
                                            <option value="" className="bg-slate-900 text-white">All Payment Modes</option>
                                            {PAYMENT_MODES.map(m => (
                                                <option key={m.id} value={m.id} className="bg-slate-900 text-white">
                                                    {m.emoji} {m.label}
                                                </option>
                                            ))}
                                        </select>
                                        <Filter className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Ledger List */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest px-1">
                                Recorded Spends ({filteredEntries.length})
                            </h3>

                            {filteredEntries.length === 0 ? (
                                <div className="text-center py-20 bg-white/5 border border-white/10 border-dashed rounded-3xl">
                                    <AlertCircle className="w-12 h-12 text-white/10 mx-auto mb-4" />
                                    <p className="text-sm text-white/40 font-medium px-8 leading-relaxed">
                                        No transactions recorded matching filters.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                                    {filteredEntries.map(entry => {
                                        const catDef = ExpenseStore.getCategory(entry.category);
                                        const modeDef = PAYMENT_MODES.find(m => m.id === entry.mode);

                                        return (
                                            <div 
                                                key={entry.id}
                                                className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between group hover:bg-white/8 transition-all"
                                            >
                                                <div className="flex items-center gap-4">
                                                    {/* Category Emoji Box */}
                                                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl shrink-0">
                                                        {catDef?.emoji || "📎"}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <p className="font-bold text-white text-sm">
                                                                {entry.description || catDef?.name || entry.category}
                                                            </p>
                                                            {entry.recurring && (
                                                                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 uppercase tracking-wider">
                                                                    Recurring • {entry.frequency}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1 flex items-center gap-1.5 flex-wrap">
                                                            <span>{catDef?.name}</span>
                                                            <span>•</span>
                                                            <span>{modeDef?.emoji} {modeDef?.label}</span>
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="text-right flex items-center gap-5">
                                                    <div>
                                                        <p className="text-sm font-bold text-white">{formatRupee(entry.amount)}</p>
                                                        <p className="text-[10px] text-white/40 mt-0.5">
                                                            {new Date(entry.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                        </p>
                                                    </div>
                                                    
                                                    {/* Action Buttons */}
                                                    <div className="flex gap-2 opacity-80 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button 
                                                            onClick={() => startEdit(entry)}
                                                            className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/15 transition-all text-white/60 hover:text-amber-400"
                                                            title="Edit Expense"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button 
                                                            onClick={() => setDeleteEntryId(entry.id)}
                                                            className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center hover:bg-red-500/20 transition-all text-red-400"
                                                            title="Delete Expense"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* EDIT MODAL DIALOG */}
                {editEntry && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-md w-full animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                            
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-white">Edit Expense</h3>
                                <button 
                                    onClick={() => setEditEntry(null)}
                                    className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 text-white/50"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Date */}
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-white/60">Date</label>
                                    <input 
                                        type="date" 
                                        value={editDate} 
                                        onChange={e => setEditDate(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-amber-500/50" 
                                    />
                                </div>

                                {/* Amount */}
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-white/60">Amount *</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-white/60 font-semibold">₹</span>
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            value={editAmount}
                                            onChange={e => setEditAmount(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-7 pr-3 py-3 text-sm text-white focus:outline-none focus:border-amber-500/50 font-bold" 
                                        />
                                    </div>
                                </div>

                                {/* Category Selection */}
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-white/60">Category</label>
                                    <input 
                                        type="text" 
                                        placeholder="Search categories..." 
                                        value={editCategorySearch}
                                        onChange={e => setEditCategorySearch(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-500/50" 
                                    />
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {filteredModalCategories.map(c => (
                                            <button 
                                                key={c.id} 
                                                type="button"
                                                onClick={() => { setEditCategory(c.id); setEditCategorySearch(""); }}
                                                className={`px-2 py-1.5 rounded-lg border text-[10px] font-medium transition-all ${editCategory === c.id
                                                    ? "bg-amber-500/20 border-amber-500 text-amber-400"
                                                    : "bg-white/5 border-white/10 text-white/40"}`}
                                            >
                                                {c.emoji} {c.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Payment Mode */}
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-white/60">Payment Mode</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {PAYMENT_MODES.map(m => (
                                            <button 
                                                key={m.id} 
                                                type="button"
                                                onClick={() => setEditMode(m.id)}
                                                className={`px-2 py-1.5 rounded-lg border text-[10px] font-medium transition-all ${editMode === m.id
                                                    ? "bg-amber-500/20 border-amber-500 text-amber-400"
                                                    : "bg-white/5 border-white/10 text-white/40"}`}
                                            >
                                                {m.emoji} {m.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-white/60">Description</label>
                                    <input 
                                        type="text" 
                                        placeholder="Add notes..." 
                                        value={editDescription}
                                        onChange={e => setEditDescription(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-500/50" 
                                    />
                                </div>

                                {/* Recurring Toggle */}
                                <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3">
                                    <div>
                                        <p className="text-xs text-white">Repeat this expense?</p>
                                        <p className="text-[9px] text-white/30">Auto-tracks periodically.</p>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => setEditRecurring(!editRecurring)}
                                        className={`w-10 h-6 rounded-full border transition-colors flex items-center px-0.5 ${editRecurring ? "bg-emerald-500 border-emerald-500" : "bg-white/10 border-white/20"}`}
                                    >
                                        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${editRecurring ? "translate-x-4" : "translate-x-0"}`} />
                                    </button>
                                </div>

                                {editRecurring && (
                                    <div className="space-y-2 animate-in slide-in-from-top-2">
                                        <label className="text-xs font-semibold text-white/60">Frequency</label>
                                        <div className="flex gap-2">
                                            {(["MONTHLY", "QUARTERLY", "ANNUAL"] as ExpenseFrequency[]).map(f => (
                                                <button 
                                                    key={f} 
                                                    type="button"
                                                    onClick={() => setEditFrequency(f)}
                                                    className={`flex-1 py-2 rounded-xl border text-[10px] font-bold tracking-wider transition-all capitalize ${editFrequency === f
                                                        ? "bg-amber-500/20 border-amber-500 text-amber-400"
                                                        : "bg-white/5 border-white/10 text-white/40"}`}
                                                >
                                                    {f.toLowerCase()}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Save Button */}
                                <div className="pt-4">
                                    <button 
                                        onClick={handleUpdate}
                                        className="w-full bg-amber-500 text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 hover:bg-amber-400 transition-colors"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* DELETE CONFIRMATION DIALOG */}
                {deleteEntryId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-sm w-full animate-in zoom-in-95">
                            
                            <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center mb-4">
                                <AlertCircle className="w-6 h-6 text-red-500" />
                            </div>
                            
                            <h3 className="text-lg font-bold text-white mb-2">Delete Expense?</h3>
                            <p className="text-xs text-white/50 mb-6 leading-relaxed">
                                Are you sure you want to delete this expense record? This action will permanently remove it from your Rajya record and cannot be undone.
                            </p>

                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setDeleteEntryId(null)}
                                    className="flex-1 py-3 rounded-xl bg-white/5 text-white text-xs font-bold border border-white/10 hover:bg-white/10 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleDelete}
                                    className="flex-1 py-3 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
