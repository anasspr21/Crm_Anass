export type DivisionKey =
  | 'agencement'
  | 'developpement'
  | 'divers'
  | 'importation'
  | 'etude_technique';

export interface Division {
  key: DivisionKey;
  label: string;
  color: string;
  colorRgb: string; // for rgba() usage
}

export const DIVISIONS: Division[] = [
  { key: 'agencement',       label: 'Agencement',       color: '#1D9E75', colorRgb: '29,158,117'  },
  { key: 'developpement',    label: 'Développement',    color: '#378ADD', colorRgb: '55,138,221'  },
  { key: 'divers',           label: 'Divers',           color: '#888780', colorRgb: '136,135,128' },
  { key: 'importation',      label: 'Importation',      color: '#D85A30', colorRgb: '216,90,48'   },
  { key: 'etude_technique',  label: 'Étude Technique',  color: '#7F77DD', colorRgb: '127,119,221' },
];

export const DIVISION_MAP: Record<DivisionKey, Division> = Object.fromEntries(
  DIVISIONS.map((d) => [d.key, d])
) as Record<DivisionKey, Division>;

export function getDivisionColor(key: string): string {
  return DIVISION_MAP[key as DivisionKey]?.color ?? '#888780';
}

export function getDivisionLabel(key: string): string {
  return DIVISION_MAP[key as DivisionKey]?.label ?? key;
}
