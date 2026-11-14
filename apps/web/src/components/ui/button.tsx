// shadcn/ui Button structure, adapted to CipherQuiz's CSS token system.
import type { ComponentProps } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';

const buttonVariants = cva('button', {
  variants: {
    variant: {
      default: 'button-primary',
      outline: 'button-outline',
      ghost: 'button-ghost',
      dark: 'button-dark',
    },
    size: {
      default: '',
      small: 'button-small',
      large: 'button-large',
      icon: 'button-icon',
    },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Component = asChild ? Slot : 'button';
  return (
    <Component
      className={clsx(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
