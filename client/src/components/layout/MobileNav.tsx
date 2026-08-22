import Link from "next/link";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { setMobileNavOpen, selectUI } from "@/redux/features/ui-slice";
import { womenCategories, menCategories } from "@/data/categories";
import { collections } from "@/data/collections";

export function MobileNav() {
  const dispatch = useAppDispatch();
  const open = useAppSelector(selectUI).mobileNavOpen;
  const setOpen = (v: boolean) => dispatch(setMobileNavOpen(v));
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" className="w-full sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription className="sr-only">Site navigation</SheetDescription>
        </SheetHeader>
        <div className="mt-4 overflow-y-auto px-1">
          <Accordion type="single" collapsible>
            <AccordionItem value="women">
              <AccordionTrigger>Women</AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link href="/women" onClick={close}>All women</Link>
                  </li>
                  {womenCategories.map((c) => (
                    <li key={c.slug}>
                      <Link href={`/category/${c.slug}`} onClick={close}>
                        {c.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="men">
              <AccordionTrigger>Men</AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link href="/men" onClick={close}>All men</Link>
                  </li>
                  {menCategories.map((c) => (
                    <li key={c.slug}>
                      <Link href={`/category/${c.slug}`} onClick={close}>
                        {c.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="collections">
              <AccordionTrigger>Collections</AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link href="/collections" onClick={close}>All collections</Link>
                  </li>
                  {collections.map((c) => (
                    <li key={c.slug}>
                      <Link href={`/collections/${c.slug}`} onClick={close}>
                        {c.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <ul className="mt-6 space-y-3 border-t pt-6 text-sm">
            <li><Link href="/new-arrivals" onClick={close}>New arrivals</Link></li>
            <li><Link href="/essentials" onClick={close}>Essentials</Link></li>
            <li><Link href="/sale" onClick={close}>Sale</Link></li>
            <li><Link href="/account" onClick={close}>Account</Link></li>
            <li><Link href="/wishlist" onClick={close}>Wishlist</Link></li>
            <li><Link href="/about" onClick={close}>About</Link></li>
            <li><Link href="/contact" onClick={close}>Contact</Link></li>
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
}
