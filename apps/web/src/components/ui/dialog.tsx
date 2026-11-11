// Adapted from shadcn/ui's Radix Dialog. Radix owns focus, Escape and inert content.
import type { ComponentProps } from 'react';
import * as Primitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

export const Dialog = Primitive.Root;
export const DialogTrigger = Primitive.Trigger;
export const DialogClose = Primitive.Close;
export const DialogTitle = Primitive.Title;
export const DialogDescription = Primitive.Description;

export function DialogContent({
  children,
  className,
  ...props
}: ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Overlay className="dialog-overlay" />
      <Primitive.Content
        className={clsx('dialog-content', className)}
        {...props}
      >
        {children}
        <Primitive.Close
          className="button button-ghost button-icon dialog-close"
          aria-label="Close dialog"
        >
          <X size={20} />
        </Primitive.Close>
      </Primitive.Content>
    </Primitive.Portal>
  );
}
