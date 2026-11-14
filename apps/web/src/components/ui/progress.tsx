import * as Primitive from '@radix-ui/react-progress';

// Animate UI's translated-indicator pattern, using a lightweight CSS transition.
export function Progress({ value, label }: { value: number; label: string }) {
  return (
    <Primitive.Root className="progress" value={value} aria-label={label}>
      <Primitive.Indicator
        className="progress-indicator"
        style={{
          transform: `translateX(-${100 - Math.max(0, Math.min(100, value))}%)`,
        }}
      />
    </Primitive.Root>
  );
}
