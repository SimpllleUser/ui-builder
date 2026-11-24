/** Hands a text to the browser as a file to save. */
export function downloadTextFile(fileName: string, text: string, mimeType: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mimeType }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  // The browser needs a moment to start the download before the address stops working.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
