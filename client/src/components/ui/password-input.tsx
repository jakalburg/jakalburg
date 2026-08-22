import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "./input";
import { cn } from "@/lib/utils";

// Password field with a show/hide toggle. Drop-in for <Input type="password">;
// works with react-hook-form's register() (ref + props are forwarded through).
const PasswordInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.ComponentProps<"input">, "type">
>(({ className, ...props }, ref) => {
  const [show, setShow] = React.useState(false);
  return (
    <div className="relative">
      <Input
        ref={ref}
        type={show ? "text" : "password"}
        className={cn("pr-10", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-mute-text transition-colors hover:text-foreground"
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
});
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
