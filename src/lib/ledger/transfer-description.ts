const PREFIX_RE =
  /^Transferencia desde (.+?) hacia (.+?):\s*([\s\S]*)$/;

/** Descripción fija de transferencia entre fondos. */
export function formatFundTransferDescription(
  sourceFundName: string,
  destinationFundName: string,
  userComment?: string | null,
): string {
  const base = `Transferencia desde ${sourceFundName.trim()} hacia ${destinationFundName.trim()}:`;
  const comment = userComment?.trim();
  return comment ? `${base} ${comment}` : base;
}

/** Extrae el comentario editable del usuario (parte después del prefijo). */
export function parseFundTransferUserComment(description: string): string {
  const match = description.match(PREFIX_RE);
  return match?.[3]?.trim() ?? "";
}

export function isFundTransferDescription(description: string): boolean {
  return PREFIX_RE.test(description.trim());
}
