import { useRouter } from "next/router";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { selectUI, setLoginPromptOpen } from "@/redux/features/ui-slice";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Global "please sign in" prompt shown when a guest tries a member-only action
// (add to bag / save to wishlist). Opened via setLoginPromptOpen; the CTAs send
// the user to auth with a redirect back to where they were.
export function LoginPromptDialog() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const open = useAppSelector(selectUI).loginPromptOpen;

  const close = () => dispatch(setLoginPromptOpen(false));

  const go = (path: string) => {
    close();
    void router.push(`${path}?redirect=${encodeURIComponent(router.asPath)}`);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Please sign in</DialogTitle>
          <DialogDescription>
            You need an account to add items to your bag or save them to your
            wishlist.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 flex flex-col gap-2">
          <Button className="w-full" onClick={() => go("/login")}>
            Sign in
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => go("/signup")}
          >
            Create account
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
