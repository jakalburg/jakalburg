import {
  LayoutDashboard,
  LayoutGrid,
  Users,
  Settings,
  Layout,
  ClipboardList,
  Mail,
  Package,
  Award,
  Ticket,
  ShoppingCart,
  Truck,
  Bell,
  UserCheck,
  FileText,
  Users2,
  Store,
  CreditCard,
  HardDrive,
  Star,
  Timer,
  Layers,
  Bug,
  BadgePercent,
  Shirt,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  subItems?: NavItem[];
}

export const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  {
    href: "/catalog",
    label: "Catalog",
    icon: LayoutGrid,
    subItems: [
      { href: "/products", label: "Products", icon: Package },
      { href: "/categories", label: "Categories", icon: LayoutGrid },
      { href: "/fabrics", label: "Fabrics", icon: Shirt },
      { href: "/brands", label: "Brands", icon: Award },
      { href: "/collections", label: "Collections", icon: Layers },
      { href: "/coupons", label: "Coupons", icon: Ticket },
      { href: "/catalog/reviews", label: "Reviews", icon: Star },
    ],
  },
  {
    href: "/logistics",
    label: "Logistics",
    icon: ClipboardList,
    subItems: [
      { href: "/orders", label: "Orders", icon: ShoppingCart },
      { href: "/delivery", label: "Delivery", icon: Truck },
      { href: "/logistics/alerts", label: "Alerts", icon: Bell },
    ],
  },
  {
    href: "/users",
    label: "Users",
    icon: Users,
    subItems: [
      { href: "/customers", label: "Customers", icon: Users },
      { href: "/admin-staff", label: "Admin Staff", icon: UserCheck },
    ],
  },
  {
    href: "/website",
    label: "Website",
    icon: Layout,
    subItems: [
      { href: "/website/header", label: "Header Menu", icon: Layout },
      { href: "/website/home", label: "Home Setup", icon: LayoutGrid },
      { href: "/website/contact", label: "Contact Page", icon: Mail },
      { href: "/website/pages", label: "Static Pages", icon: FileText },
    ],
  },
  {
    href: "/contact",
    label: "Inbox",
    icon: Mail,
    subItems: [
      { href: "/contact/contact-us", label: "Contact Us", icon: Mail },
      { href: "/contact/get-in-touch", label: "Get In Touch", icon: Mail },
      { href: "/contact/newsletter", label: "Newsletter", icon: Users2 },
    ],
  },
  { href: "/logs", label: "System Logs", icon: Bug },
  { href: "/steal-deals", label: "It's a Steal Deal", icon: BadgePercent },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    subItems: [
      { href: "/settings/profile", label: "Profile", icon: Users },
      { href: "/settings/store", label: "Store", icon: Store },
      { href: "/settings/payments", label: "Payments", icon: CreditCard },
      { href: "/settings/delivery", label: "Delivery", icon: Truck },
      { href: "/settings/media", label: "Storage", icon: HardDrive },
      { href: "/settings/notifications", label: "Alerts", icon: Bell },
      { href: "/settings/email", label: "Email", icon: Mail },
      { href: "/settings/countdown", label: "Countdown", icon: Timer },
    ],
  },
];
