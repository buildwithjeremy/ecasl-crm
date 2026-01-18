interface RecordCountProps {
  count: number;
  label: string;
  isLoading?: boolean;
}

export function RecordCount({ count, label, isLoading }: RecordCountProps) {
  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">Loading...</p>
    );
  }

  const pluralLabel = count === 1 ? label : `${label}s`;

  return (
    <p className="text-sm text-muted-foreground">
      Showing {count} {pluralLabel}
    </p>
  );
}
