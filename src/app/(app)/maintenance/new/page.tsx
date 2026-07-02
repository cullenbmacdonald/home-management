import { createMaintenanceItem } from "../actions";
import { IntervalField } from "@/components/interval-field";

export default function NewMaintenancePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">New upkeep item</h1>
      <form
        action={createMaintenanceItem}
        className="space-y-4 rounded-xl bg-white p-4 shadow-sm"
      >
        <label className="block">
          <span className="text-sm font-medium text-stone-600">Name</span>
          <input
            name="name"
            required
            placeholder="e.g. Clean mini-split filters"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2.5 focus:border-emerald-600 focus:outline-none"
          />
        </label>
        <IntervalField />
        <label className="block">
          <span className="text-sm font-medium text-stone-600">
            Start counting from
          </span>
          <input
            name="startDate"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2.5 focus:border-emerald-600 focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-stone-600">Notes</span>
          <textarea
            name="notes"
            rows={3}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2.5 focus:border-emerald-600 focus:outline-none"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-lg bg-emerald-700 py-3 font-semibold text-white active:bg-emerald-800"
        >
          Create
        </button>
      </form>
    </div>
  );
}
