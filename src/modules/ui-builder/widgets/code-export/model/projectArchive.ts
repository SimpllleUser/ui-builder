import { strToU8, zipSync } from 'fflate'
import type { ExportedProject } from './vueProject'

/** The project as a ZIP archive with one folder in it. */
export const zipProject = ({ name, files }: ExportedProject) =>
  zipSync(Object.fromEntries(Object.entries(files).map(([path, text]) => [`${name}/${path}`, strToU8(text)])))
