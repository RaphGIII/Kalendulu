export type FontPreset = 'system' | 'inter' | 'serif' | 'mono';

export type ThemeColors = {
  background: string;
  backgroundSecondary: string;
  card: string;
  cardSecondary: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  primaryText: string;
  success: string;
  warning: string;
  danger: string;
  tabBar: string;
  tabIconDefault: string;
  tabIconSelected: string;
};

export type ThemeDefinition = {
  id: string;
  name: string;
  colors: ThemeColors;
  accentPalette: string[];
  eventPalette: string[];
  habitPalette: string[];
};

export const presetThemes: ThemeDefinition[] = [
  {
    id: 'original',
    name: 'Original',
    colors: {
      background: '#2E437A',
      backgroundSecondary: '#233A73',
      card: '#314A86',
      cardSecondary: '#162E63',
      text: '#FFFFFF',
      textMuted: 'rgba(255,255,255,0.72)',
      border: 'rgba(255,255,255,0.10)',
      primary: '#D4AF37',
      primaryText: '#0B1636',
      success: '#39D98A',
      warning: '#F6C453',
      danger: '#FF6B6B',
      tabBar: '#1B2E5B',
      tabIconDefault: 'rgba(255,255,255,0.65)',
      tabIconSelected: '#D4AF37',
    },
    accentPalette: ['#D4AF37', '#58A6FF', '#39D98A', '#FF9F68', '#A78BFA'],
    eventPalette: ['#D4AF37', '#58A6FF', '#39D98A', '#FF9F68', '#A78BFA', '#FF6B6B'],
    habitPalette: ['#D4AF37', '#7C5CFF', '#58A6FF', '#39D98A', '#FF9F68', '#FF6B6B'],
  },

  {
    id: 'ice',
    name: 'Ice White',
    colors: {
      background: '#EEF4FF',
      backgroundSecondary: '#DCE8FF',
      card: '#FFFFFF',
      cardSecondary: '#E8F0FF',
      text: '#14213D',
      textMuted: 'rgba(20,33,61,0.66)',
      border: 'rgba(20,33,61,0.10)',
      primary: '#3A86FF',
      primaryText: '#FFFFFF',
      success: '#2CB67D',
      warning: '#F4B942',
      danger: '#E63946',
      tabBar: '#FFFFFF',
      tabIconDefault: 'rgba(20,33,61,0.52)',
      tabIconSelected: '#3A86FF',
    },
    accentPalette: ['#3A86FF', '#6C9EFF', '#2CB67D', '#A56BFF', '#FF8C42'],
    eventPalette: ['#3A86FF', '#6C9EFF', '#2CB67D', '#A56BFF', '#FF8C42', '#E63946'],
    habitPalette: ['#3A86FF', '#6C9EFF', '#2CB67D', '#A56BFF', '#FF8C42', '#E63946'],
  },

  {
    id: 'cloud',
    name: 'Cloud Light',
    colors: {
      background: '#F7F9FC',
      backgroundSecondary: '#EDF2F7',
      card: '#FFFFFF',
      cardSecondary: '#F1F5F9',
      text: '#1F2937',
      textMuted: 'rgba(31,41,55,0.62)',
      border: 'rgba(31,41,55,0.10)',
      primary: '#5B8DEF',
      primaryText: '#FFFFFF',
      success: '#2CB67D',
      warning: '#E9A23B',
      danger: '#E05252',
      tabBar: '#FFFFFF',
      tabIconDefault: 'rgba(31,41,55,0.48)',
      tabIconSelected: '#5B8DEF',
    },
    accentPalette: ['#5B8DEF', '#7A9EFA', '#48B2A8', '#F29E4C', '#8A6BEA'],
    eventPalette: ['#5B8DEF', '#7A9EFA', '#48B2A8', '#F29E4C', '#8A6BEA', '#E05252'],
    habitPalette: ['#5B8DEF', '#7A9EFA', '#48B2A8', '#F29E4C', '#8A6BEA', '#E05252'],
  },

  {
    id: 'vanilla',
    name: 'Vanilla Sand',
    colors: {
      background: '#FAF6EF',
      backgroundSecondary: '#F4EBDD',
      card: '#FFFDF8',
      cardSecondary: '#F7F0E4',
      text: '#3A2F2A',
      textMuted: 'rgba(58,47,42,0.62)',
      border: 'rgba(58,47,42,0.10)',
      primary: '#C98A3D',
      primaryText: '#FFFFFF',
      success: '#5DA271',
      warning: '#D9A441',
      danger: '#C85C5C',
      tabBar: '#FFFDF8',
      tabIconDefault: 'rgba(58,47,42,0.48)',
      tabIconSelected: '#C98A3D',
    },
    accentPalette: ['#C98A3D', '#A56B3F', '#6BAA75', '#7E8ED6', '#B56FA8'],
    eventPalette: ['#C98A3D', '#A56B3F', '#6BAA75', '#7E8ED6', '#B56FA8', '#C85C5C'],
    habitPalette: ['#C98A3D', '#A56B3F', '#6BAA75', '#7E8ED6', '#B56FA8', '#C85C5C'],
  },

  {
    id: 'luxury',
    name: 'Luxury Noir',
    colors: {
      background: '#121212',
      backgroundSecondary: '#1A1A1A',
      card: '#1F1F1F',
      cardSecondary: '#181818',
      text: '#F8F5EF',
      textMuted: 'rgba(248,245,239,0.68)',
      border: 'rgba(212,175,55,0.18)',
      primary: '#D4AF37',
      primaryText: '#0E0E0E',
      success: '#4FBF8F',
      warning: '#E3B23C',
      danger: '#E06C75',
      tabBar: '#181818',
      tabIconDefault: 'rgba(248,245,239,0.50)',
      tabIconSelected: '#D4AF37',
    },
    accentPalette: ['#D4AF37', '#C58BFF', '#4FBF8F', '#7DA8FF', '#E3B23C'],
    eventPalette: ['#D4AF37', '#C58BFF', '#4FBF8F', '#7DA8FF', '#E3B23C', '#E06C75'],
    habitPalette: ['#D4AF37', '#C58BFF', '#4FBF8F', '#7DA8FF', '#E3B23C', '#E06C75'],
  },

  {
    id: 'relax',
    name: 'Relax Sage',
    colors: {
      background: '#EAF4EF',
      backgroundSecondary: '#DDEBE3',
      card: '#F7FBF8',
      cardSecondary: '#E7F2EB',
      text: '#244034',
      textMuted: 'rgba(36,64,52,0.62)',
      border: 'rgba(36,64,52,0.10)',
      primary: '#6FAF8F',
      primaryText: '#FFFFFF',
      success: '#63B37C',
      warning: '#D9B15A',
      danger: '#C46B6B',
      tabBar: '#F7FBF8',
      tabIconDefault: 'rgba(36,64,52,0.48)',
      tabIconSelected: '#6FAF8F',
    },
    accentPalette: ['#6FAF8F', '#7EB6C9', '#9A8FD8', '#D9B15A', '#D48787'],
    eventPalette: ['#6FAF8F', '#7EB6C9', '#9A8FD8', '#D9B15A', '#D48787', '#C46B6B'],
    habitPalette: ['#6FAF8F', '#7EB6C9', '#9A8FD8', '#D9B15A', '#D48787', '#C46B6B'],
  },

  {
    id: 'professional',
    name: 'Professional Slate',
    colors: {
      background: '#F3F6FA',
      backgroundSecondary: '#E7EDF5',
      card: '#FFFFFF',
      cardSecondary: '#EDF2F7',
      text: '#1C2733',
      textMuted: 'rgba(28,39,51,0.60)',
      border: 'rgba(28,39,51,0.10)',
      primary: '#1F4E79',
      primaryText: '#FFFFFF',
      success: '#2E8B57',
      warning: '#C9972E',
      danger: '#C04F4F',
      tabBar: '#FFFFFF',
      tabIconDefault: 'rgba(28,39,51,0.48)',
      tabIconSelected: '#1F4E79',
    },
    accentPalette: ['#1F4E79', '#5B7FA3', '#2E8B57', '#8B6FB8', '#C9972E'],
    eventPalette: ['#1F4E79', '#5B7FA3', '#2E8B57', '#8B6FB8', '#C9972E', '#C04F4F'],
    habitPalette: ['#1F4E79', '#5B7FA3', '#2E8B57', '#8B6FB8', '#C9972E', '#C04F4F'],
  },

  {
    id: 'midnight',
    name: 'Midnight Black',
    colors: {
      background: '#0D1117',
      backgroundSecondary: '#161B22',
      card: '#1C2128',
      cardSecondary: '#11161C',
      text: '#F5F7FA',
      textMuted: 'rgba(245,247,250,0.70)',
      border: 'rgba(255,255,255,0.08)',
      primary: '#58A6FF',
      primaryText: '#08131F',
      success: '#3FB950',
      warning: '#D29922',
      danger: '#F85149',
      tabBar: '#11161C',
      tabIconDefault: 'rgba(245,247,250,0.60)',
      tabIconSelected: '#58A6FF',
    },
    accentPalette: ['#58A6FF', '#3FB950', '#D29922', '#A371F7', '#F78166'],
    eventPalette: ['#58A6FF', '#3FB950', '#D29922', '#A371F7', '#F78166', '#F85149'],
    habitPalette: ['#58A6FF', '#3FB950', '#D29922', '#A371F7', '#F78166', '#F85149'],
  },

  {
    id: 'forest',
    name: 'Forest Green',
    colors: {
      background: '#0F2E24',
      backgroundSecondary: '#16392E',
      card: '#184537',
      cardSecondary: '#112E25',
      text: '#F3FFF8',
      textMuted: 'rgba(243,255,248,0.72)',
      border: 'rgba(255,255,255,0.08)',
      primary: '#7DDE92',
      primaryText: '#0D2119',
      success: '#7DDE92',
      warning: '#F2C14E',
      danger: '#FF7A7A',
      tabBar: '#112E25',
      tabIconDefault: 'rgba(243,255,248,0.60)',
      tabIconSelected: '#7DDE92',
    },
    accentPalette: ['#7DDE92', '#5BC0BE', '#A78BFA', '#F2C14E', '#FF9F68'],
    eventPalette: ['#7DDE92', '#5BC0BE', '#A78BFA', '#F2C14E', '#FF9F68', '#FF7A7A'],
    habitPalette: ['#7DDE92', '#5BC0BE', '#A78BFA', '#F2C14E', '#FF9F68', '#FF7A7A'],
  },

  {
    id: 'sunset',
    name: 'Sunset Orange',
    colors: {
      background: '#3B1F2B',
      backgroundSecondary: '#51273A',
      card: '#67324A',
      cardSecondary: '#452234',
      text: '#FFF7F5',
      textMuted: 'rgba(255,247,245,0.72)',
      border: 'rgba(255,255,255,0.08)',
      primary: '#FF9F68',
      primaryText: '#3B1F2B',
      success: '#7DDE92',
      warning: '#FFD166',
      danger: '#FF6B6B',
      tabBar: '#452234',
      tabIconDefault: 'rgba(255,247,245,0.60)',
      tabIconSelected: '#FF9F68',
    },
    accentPalette: ['#FF9F68', '#FFD166', '#A78BFA', '#7DDE92', '#FF6B6B'],
    eventPalette: ['#FF9F68', '#FFD166', '#A78BFA', '#7DDE92', '#FF6B6B', '#58A6FF'],
    habitPalette: ['#FF9F68', '#FFD166', '#A78BFA', '#7DDE92', '#FF6B6B', '#58A6FF'],
  },
];

export type CustomThemeDraft = {
  name: string;
  colors: ThemeColors;
};

export const defaultCustomTheme: CustomThemeDraft = {
  name: 'Mein Design',
  colors: {
    ...presetThemes[0].colors,
  },
};

export function getThemeById(themeId: string): ThemeDefinition {
  return presetThemes.find((theme) => theme.id === themeId) ?? presetThemes[0];
}