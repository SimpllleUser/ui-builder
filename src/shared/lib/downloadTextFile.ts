/** Hands content to the browser as a file to save. */
export function downloadFile(fileName: string, content: BlobPart, mimeType: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  // The browser needs a moment to start the download before the address stops working.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const downloadTextFile = (fileName: string, text: string, mimeType: string) =>
  downloadFile(fileName, text, mimeType)
