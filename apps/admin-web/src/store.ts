import create from "zustand";

type FilterState = {
  from: string;
  to: string;
  departmentId: string;
  vendorId: string;
  paymentStatus: string;
  minAmount: string;
  maxAmount: string;
  set: (patch: Partial<Omit<FilterState, "set" | "toParams">>) => void;
  toParams: () => URLSearchParams;
};

export const useFilters = create<FilterState>((set, get) => ({
  from: "",
  to: "",
  departmentId: "",
  vendorId: "",
  paymentStatus: "",
  minAmount: "",
  maxAmount: "",
  set: (patch) => set((state) => ({ ...state, ...patch })),
  toParams: () => {
    const params = new URLSearchParams();
    Object.entries(get()).forEach(([key, value]) => {
      if (typeof value === "string" && value) params.set(key, value);
    });
    return params;
  }
}));
