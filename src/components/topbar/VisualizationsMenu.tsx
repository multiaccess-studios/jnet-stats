import { VisualizationKey } from "../../lib/store";

export interface VisualizationOption {
  key: VisualizationKey;
  label: string;
  description: string;
}

interface VisualizationsMenuProps {
  options: VisualizationOption[];
  visualizations: Record<VisualizationKey, boolean>;
  onToggle: (key: VisualizationKey, checked: boolean) => void;
}

export function VisualizationsMenu({ options, visualizations, onToggle }: VisualizationsMenuProps) {
  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Visualizations</p>
      <div className="mt-3 space-y-2">
        {options.map((option) => (
          <label
            key={option.key}
            className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-sm text-slate-200 transition hover:border-emerald-500/60"
          >
            <input
              type="checkbox"
              checked={visualizations[option.key]}
              onChange={(event) => onToggle(option.key, event.target.checked)}
              className="mt-1"
            />
            <span>
              <span className="font-semibold text-white">{option.label}</span>
              <br />
              <span className="text-xs text-slate-400">{option.description}</span>
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}
