import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { selectIsAuthenticated } from "@/redux/features/auth-slice";
import { setLoginPromptOpen } from "@/redux/features/ui-slice";

// Gate an action behind sign-in. Returns a wrapper: run it with your action and
// it only fires when the user is authenticated — otherwise it opens the global
// "please sign in" prompt (see LoginPromptDialog). Used for guest-blocked
// actions like add-to-bag and save-to-wishlist.
export function useRequireAuth() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  return useCallback(
    (action: () => void) => {
      if (isAuthenticated) {
        action();
      } else {
        dispatch(setLoginPromptOpen(true));
      }
    },
    [isAuthenticated, dispatch],
  );
}
