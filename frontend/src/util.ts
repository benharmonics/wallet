export function formatZodError(err: string): string {
  const json: { message: string }[] = JSON.parse(err)
  const messages = json.map((e) => e.message)
  return messages.join(', ')
}
