import { ShadowProfile } from './enums'

const ON_SURFACE = 'rgb(var(--v-theme-on-surface))'
const SOFT_BORDER = '1px solid rgba(var(--v-theme-on-surface), 0.1)'

/** Only raised (elevated) cards and buttons take a profile; outlined and flat ones have no shadow to change. */
const PROFILE_RULES: Record<Exclude<ShadowProfile, ShadowProfile.Default>, string> = {
  [ShadowProfile.Soft]: `.v-card--variant-elevated { box-shadow: 0 15px 35px -5px rgba(0, 0, 0, 0.05), 0 0 3px rgba(0, 0, 0, 0.05) !important; }
.v-btn--variant-elevated { box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05) !important; }`,
  [ShadowProfile.Crisp]: `.v-card--variant-elevated { box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1) !important; border: ${SOFT_BORDER}; }
.v-btn--variant-elevated { box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important; border: ${SOFT_BORDER}; }`,
  [ShadowProfile.NeoBrutal]: `.v-card--variant-elevated { box-shadow: 4px 4px 0 ${ON_SURFACE} !important; border: 2px solid ${ON_SURFACE}; }
.v-btn--variant-elevated { box-shadow: 3px 3px 0 ${ON_SURFACE} !important; border: 2px solid ${ON_SURFACE}; }
.v-btn--variant-elevated:active { box-shadow: none !important; transform: translate(3px, 3px); }`,
}

const isStyledProfile = (profile: ShadowProfile): profile is Exclude<ShadowProfile, ShadowProfile.Default> =>
  profile in PROFILE_RULES

export const buildShadowCss = (profile: ShadowProfile) =>
  isStyledProfile(profile) ? `${PROFILE_RULES[profile]}\n` : ''
